/**
 * QualificationService - Qualification mapping microservice
 *
 * Manages the HEQSF qualification framework, programme-to-qualification
 * mappings, and job-to-qualification mappings. Seeds from registry data.
 *
 * Tables:
 * - qualification: HEQSF qualification types (Certificate through Doctorate)
 * - programmeQualificationMap: Programme → qualification mappings
 * - jobQualificationMap: Job type → qualification requirements
 *
 * @example
 * const qualService = new QualificationService();
 * qualService.loadFromRegistry(registryData);
 * const suggestion = qualService.suggestQualificationMapping('ND: Information Technology', 'NDIT');
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const QualificationServiceSchema = {
    name: 'qualification',
    prefix: 'qual',
    alias: 'Qualification Service',
    version: '1.0.0',

    tables: [
        {
            name: 'qualification',
            alias: 'Qualifications',
            primaryKey: 'idx',
            labeller: '{label}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'nqfLevel', label: 'NQF Level', type: 'integer' },
                { name: 'credits', label: 'Credits', type: 'string' },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'framework', label: 'Framework', type: 'string', default: 'HEQSF' }
            ]
        },
        {
            name: 'programmeQualificationMap',
            alias: 'Programme Mappings',
            primaryKey: 'idx',
            labeller: '{programmeName}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'institutionCode', label: 'Institution', type: 'string' },
                { name: 'programmeCode', label: 'Programme Code', type: 'string', required: true },
                { name: 'programmeName', label: 'Programme Name', type: 'string' },
                { name: 'qualificationId', label: 'Qualification', type: 'integer',
                    ref: { table: 'qualification', field: 'idx' } },
                { name: 'confidence', label: 'Confidence', type: 'number', default: 0 },
                { name: 'mappedBy', label: 'Mapped By', type: 'string' }
            ]
        },
        {
            name: 'jobQualificationMap',
            alias: 'Job Mappings',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'jobTypeId', label: 'Job Type', type: 'string' },
                { name: 'qualificationId', label: 'Qualification', type: 'integer',
                    ref: { table: 'qualification', field: 'idx' } },
                { name: 'nqfLevelMin', label: 'Min NQF Level', type: 'integer' },
                { name: 'cesmCodes', label: 'CESM Codes', type: 'string' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class QualificationService extends Publome {
    constructor(config = {}) {
        super(QualificationServiceSchema, config);
        this._seeded = false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Registry Loading
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Seed qualification table from registry data
     * @param {Object} registryData - Parsed registry.careerHub.json
     */
    loadFromRegistry(registryData) {
        if (this._seeded) return;
        const qualTypes = registryData.qualificationTypes || [];
        const nqfLevels = registryData.nqfLevels || [];

        // Build NQF lookup for credits/description
        const nqfMap = {};
        nqfLevels.forEach(n => { nqfMap[n.level] = n; });

        qualTypes.forEach(qt => {
            const nqf = nqfMap[qt.nqfLevel] || {};
            this.table('qualification').create({
                code: qt.id,
                label: qt.label,
                nqfLevel: qt.nqfLevel,
                credits: nqf.credits || '',
                description: nqf.description || '',
                framework: 'HEQSF'
            });
        });

        this._seeded = true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get service stats
     * @returns {Object} { qualifications, programmeMappings }
     */
    getStats() {
        return {
            qualifications: this.table('qualification').all().length,
            programmeMappings: this.table('programmeQualificationMap').all().length
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lookups
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get a programme-to-qualification mapping
     * @param {string} institutionCode - Institution code
     * @param {string} programmeCode - Programme code
     * @returns {Publon|null}
     */
    getProgrammeMapping(institutionCode, programmeCode) {
        return this.table('programmeQualificationMap').all().find(m =>
            m.get('institutionCode') === institutionCode &&
            m.get('programmeCode') === programmeCode
        ) || null;
    }

    /**
     * Get a qualification by idx
     * @param {number} idx - Qualification idx
     * @returns {Publon|null}
     */
    getQualification(idx) {
        return this.table('qualification').read(idx) || null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapping
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Suggest qualification mappings for a programme name
     * Uses keyword matching against qualification labels
     * @param {string} programmeName - Programme name
     * @param {string} programmeCode - Programme code
     * @returns {Array<Object>} Suggestions with { qualification, confidence }
     */
    suggestQualificationMapping(programmeName, programmeCode) {
        const name = (programmeName || '').toLowerCase();
        const code = (programmeCode || '').toLowerCase();
        const qualifications = this.table('qualification').all();

        const keywords = {
            'doctorate': ['phd', 'dtech', 'doctor'],
            'mastersDegree': ['master', 'msc', 'mtech', 'ma ', 'mcom'],
            'mTech': ['mtech'],
            'bacheloursHonours': ['honours', 'hons', 'bsc hon'],
            'pgDiploma': ['postgrad dip', 'pg dip', 'pgdip'],
            'bachelorsDegree': ['bachelor', 'bsc', 'ba ', 'bcom', 'beng'],
            'bTech': ['btech'],
            'advancedDiploma': ['advanced dip', 'adv dip'],
            'nationalDiploma': ['national dip', 'nd:', 'ndit', 'nd '],
            'diploma': ['diploma', 'dip '],
            'higherCertificate': ['higher cert'],
            'certificate': ['certificate', 'cert']
        };

        const suggestions = [];

        qualifications.forEach(qual => {
            const qualCode = qual.get('code');
            const kws = keywords[qualCode] || [];
            let confidence = 0;

            kws.forEach(kw => {
                if (name.includes(kw) || code.includes(kw)) {
                    confidence = Math.max(confidence, 80);
                }
            });

            // Partial label match
            if (confidence === 0) {
                const qualLabel = (qual.get('label') || '').toLowerCase();
                if (name.includes(qualLabel) || qualLabel.includes(name.split(':')[0]?.trim())) {
                    confidence = 50;
                }
            }

            if (confidence > 0) {
                suggestions.push({
                    qualification: qual.getData(),
                    confidence
                });
            }
        });

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Create a programme-to-qualification mapping
     * @param {Object} data - Mapping data
     * @returns {Publon}
     */
    mapProgrammeToQualification(data) {
        return this.table('programmeQualificationMap').create(data);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QualificationService, QualificationServiceSchema };
}
if (typeof window !== 'undefined') {
    window.QualificationService = QualificationService;
}
