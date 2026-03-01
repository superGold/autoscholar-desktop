/**
 * AccreditationService - Accreditation AutoMate
 *
 * Manages accreditation bodies, attributes, bands, criterion sets, evaluations,
 * documents, rule versioning, and scenario planning. Uses LogicComposerService
 * for criterion evaluation and report generation.
 *
 * Tables:
 * - accredBody: Accreditation body (ECSA, CHE, HPCSA)
 * - accredAttribute: High-level attributes defined by body (GA1-GA11 for ECSA)
 * - accredBand: Achievement bands/levels per body (Emerging, Developed, Exit Level)
 * - accredCriterionSet: Links attribute + band to a Logic Composer composition
 * - accredEvaluation: Evaluation of an entity against a body's full criteria
 * - accredEvalDetail: Per-criterion-set result within an evaluation
 * - accredDocument: Evidence documents (PDFs/images) linked to courses/individuals
 * - accredRuleVersion: Rule change records with effective dates and transition rules
 *
 * @example
 * const accredService = new AccreditationService();
 * ServiceRegistry.register('accreditation', accredService, { alias: 'Accreditation AutoMate' });
 *
 * // Evaluate a student against ECSA
 * const result = accredService.evaluateEntity('ECSA', studentData, logicComposerService);
 * console.log(result.summary); // { total: 33, passed: 28, failed: 5 }
 * console.log(result.report);  // Natural language assessment
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const AccreditationServiceSchema = {
    name: 'accreditation',
    prefix: 'accred',
    alias: 'Accreditation AutoMate',
    version: '1.0.0',

    tables: [
        {
            name: 'accredBody',
            alias: 'Accreditation Bodies',
            primaryKey: 'idx',
            labeller: '{label}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true, unique: true },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'country', label: 'Country', type: 'string', default: 'ZA' },
                { name: 'website', label: 'Website', type: 'string' },
                { name: 'isActive', label: 'Active', type: 'boolean', default: true },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'accredAttribute',
            alias: 'Accreditation Attributes',
            primaryKey: 'idx',
            labeller: '{code} — {label}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'bodyId', label: 'Body', type: 'integer', required: true,
                    ref: { table: 'accredBody', field: 'idx' } },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'category', label: 'Category', type: 'string' },
                { name: 'sortOrder', label: 'Sort Order', type: 'integer', default: 0 },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'accredBand',
            alias: 'Achievement Bands',
            primaryKey: 'idx',
            labeller: '{label}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'bodyId', label: 'Body', type: 'integer', required: true,
                    ref: { table: 'accredBody', field: 'idx' } },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'sortOrder', label: 'Sort Order', type: 'integer', default: 0 },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'accredCriterionSet',
            alias: 'Criterion Sets',
            primaryKey: 'idx',
            labeller: '{label}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'bodyId', label: 'Body', type: 'integer', required: true,
                    ref: { table: 'accredBody', field: 'idx' } },
                { name: 'attributeId', label: 'Attribute', type: 'integer', required: true,
                    ref: { table: 'accredAttribute', field: 'idx' } },
                { name: 'bandId', label: 'Band', type: 'integer', required: true,
                    ref: { table: 'accredBand', field: 'idx' } },
                { name: 'composerCode', label: 'Logic Composer Code', type: 'string', required: true },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'weight', label: 'Weight', type: 'number', default: 1 },
                { name: 'isActive', label: 'Active', type: 'boolean', default: true },
                { name: 'ruleVersionId', label: 'Rule Version', type: 'integer',
                    ref: { table: 'accredRuleVersion', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'accredEvaluation',
            alias: 'Evaluations',
            primaryKey: 'idx',
            labeller: '{entityLabel} — {status}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'bodyId', label: 'Body', type: 'integer', required: true,
                    ref: { table: 'accredBody', field: 'idx' } },
                { name: 'entityId', label: 'Entity ID', type: 'string', required: true },
                { name: 'entityLabel', label: 'Entity Label', type: 'string' },
                { name: 'entityType', label: 'Entity Type', type: 'string',
                    options: ['student', 'programme'] },
                { name: 'status', label: 'Status', type: 'string',
                    options: ['pass', 'fail', 'partial'] },
                { name: 'totalSets', label: 'Total Sets', type: 'integer' },
                { name: 'passedSets', label: 'Passed Sets', type: 'integer' },
                { name: 'failedSets', label: 'Failed Sets', type: 'integer' },
                { name: 'overallScore', label: 'Overall Score', type: 'number' },
                { name: 'reportSummary', label: 'Report Summary', type: 'text' },
                { name: 'reportPositive', label: 'Positive Report', type: 'text' },
                { name: 'reportNegative', label: 'Negative Report', type: 'text' },
                { name: 'ruleVersionId', label: 'Rule Version', type: 'integer',
                    ref: { table: 'accredRuleVersion', field: 'idx' } },
                { name: 'evaluatedAt', label: 'Evaluated At', type: 'datetime' },
                { name: 'evaluatedBy', label: 'Evaluated By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } }
            ]
        },
        {
            name: 'accredEvalDetail',
            alias: 'Evaluation Details',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'evaluationId', label: 'Evaluation', type: 'integer', required: true,
                    ref: { table: 'accredEvaluation', field: 'idx' } },
                { name: 'criterionSetId', label: 'Criterion Set', type: 'integer', required: true,
                    ref: { table: 'accredCriterionSet', field: 'idx' } },
                { name: 'attributeCode', label: 'Attribute Code', type: 'string' },
                { name: 'bandCode', label: 'Band Code', type: 'string' },
                { name: 'passed', label: 'Passed', type: 'boolean' },
                { name: 'score', label: 'Score', type: 'number' },
                { name: 'reportPositive', label: 'Positive Notes', type: 'text' },
                { name: 'reportNegative', label: 'Negative Notes', type: 'text' },
                { name: 'detail', label: 'Detail', type: 'json' }
            ]
        },
        {
            name: 'accredDocument',
            alias: 'Evidence Documents',
            primaryKey: 'idx',
            labeller: '{label}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'bodyId', label: 'Body', type: 'integer',
                    ref: { table: 'accredBody', field: 'idx' } },
                { name: 'targetType', label: 'Target Type', type: 'string', required: true,
                    options: ['course', 'student', 'programme', 'criterionSet', 'general'] },
                { name: 'targetId', label: 'Target ID', type: 'string' },
                { name: 'targetLabel', label: 'Target Label', type: 'string' },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'fileType', label: 'File Type', type: 'string',
                    options: ['pdf', 'image', 'spreadsheet', 'document', 'other'] },
                { name: 'filePath', label: 'File Path', type: 'string' },
                { name: 'fileUrl', label: 'File URL', type: 'string' },
                { name: 'fileSize', label: 'File Size (bytes)', type: 'integer' },
                { name: 'uploadedBy', label: 'Uploaded By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'uploadedAt', label: 'Uploaded At', type: 'datetime' }
            ]
        },
        {
            name: 'accredRuleVersion',
            alias: 'Rule Versions',
            primaryKey: 'idx',
            labeller: '{label} ({effectiveDate})',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'bodyId', label: 'Body', type: 'integer', required: true,
                    ref: { table: 'accredBody', field: 'idx' } },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'versionNumber', label: 'Version', type: 'integer', required: true },
                { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
                { name: 'transitionPolicy', label: 'Transition Policy', type: 'string',
                    options: ['grandfathered', 'phaseOut', 'immediate'] },
                { name: 'phaseOutDate', label: 'Phase Out Date', type: 'date' },
                { name: 'notes', label: 'Notes', type: 'text' },
                { name: 'snapshotJson', label: 'Criterion Snapshot', type: 'json' },
                { name: 'isActive', label: 'Active', type: 'boolean', default: true },
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class AccreditationService extends Publome {
    constructor(config = {}) {
        super(AccreditationServiceSchema, config);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Body CRUD
    // ─────────────────────────────────────────────────────────────────────────

    createBody(data) {
        return this.table('accredBody').create({
            ...data,
            createdAt: new Date().toISOString()
        });
    }

    getBody(code) {
        return this.table('accredBody').all().find(b => b.get('code') === code) || null;
    }

    listBodies() {
        return this.table('accredBody').all().filter(b => b.get('isActive'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Attribute CRUD
    // ─────────────────────────────────────────────────────────────────────────

    createAttribute(bodyId, data) {
        return this.table('accredAttribute').create({
            ...data,
            bodyId,
            createdAt: new Date().toISOString()
        });
    }

    getAttributes(bodyId) {
        return this.table('accredAttribute').all()
            .filter(a => a.get('bodyId') === bodyId)
            .sort((a, b) => (a.get('sortOrder') || 0) - (b.get('sortOrder') || 0));
    }

    getAttribute(bodyId, code) {
        return this.table('accredAttribute').all().find(a =>
            a.get('bodyId') === bodyId && a.get('code') === code
        ) || null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Band CRUD
    // ─────────────────────────────────────────────────────────────────────────

    createBand(bodyId, data) {
        return this.table('accredBand').create({
            ...data,
            bodyId,
            createdAt: new Date().toISOString()
        });
    }

    getBands(bodyId) {
        return this.table('accredBand').all()
            .filter(b => b.get('bodyId') === bodyId)
            .sort((a, b) => (a.get('sortOrder') || 0) - (b.get('sortOrder') || 0));
    }

    getBand(bodyId, code) {
        return this.table('accredBand').all().find(b =>
            b.get('bodyId') === bodyId && b.get('code') === code
        ) || null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Criterion Set CRUD
    // ─────────────────────────────────────────────────────────────────────────

    createCriterionSet(data) {
        return this.table('accredCriterionSet').create({
            isActive: true,
            ...data,
            createdAt: new Date().toISOString()
        });
    }

    getCriterionSets(bodyId) {
        return this.table('accredCriterionSet').all()
            .filter(cs => cs.get('bodyId') === bodyId && cs.get('isActive'));
    }

    getCriterionSetsForAttribute(attributeId) {
        return this.table('accredCriterionSet').all()
            .filter(cs => cs.get('attributeId') === attributeId && cs.get('isActive'));
    }

    /**
     * Get the attribute x band matrix for a body.
     * Returns a 2D structure: attributes as rows, bands as columns, each cell is a criterion set (or null).
     */
    getCriterionMatrix(bodyId) {
        const attributes = this.getAttributes(bodyId);
        const bands = this.getBands(bodyId);
        const sets = this.getCriterionSets(bodyId);

        return attributes.map(attr => ({
            attribute: { idx: attr.idx, code: attr.get('code'), label: attr.get('label') },
            bands: bands.map(band => {
                const cs = sets.find(s =>
                    s.get('attributeId') === attr.idx && s.get('bandId') === band.idx
                );
                return {
                    band: { idx: band.idx, code: band.get('code'), label: band.get('label') },
                    criterionSet: cs ? {
                        idx: cs.idx,
                        composerCode: cs.get('composerCode'),
                        label: cs.get('label'),
                        weight: cs.get('weight')
                    } : null
                };
            })
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Entity Evaluation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Evaluate an entity against ALL criterion sets of a body.
     * @param {string} bodyCode - Accreditation body code (e.g. 'ECSA')
     * @param {Object} entityData - Entity data object (passed to Logic Composer)
     * @param {LogicComposerService} logicComposer - The Logic Composer service instance
     * @param {Object} [options={}] - { entityId, entityLabel, entityType, evaluatedBy, ruleVersionId }
     * @returns {{ passed: boolean, summary: Object, details: Object[], report: Object, evaluation: Publon }}
     */
    evaluateEntity(bodyCode, entityData, logicComposer, options = {}) {
        const body = this.getBody(bodyCode);
        if (!body) return { passed: false, summary: { total: 0, passed: 0, failed: 0 }, details: [], report: { summary: `Unknown body: ${bodyCode}` } };

        const criterionSets = this.getCriterionSets(body.idx);
        const attributes = this.getAttributes(body.idx);
        const bands = this.getBands(body.idx);

        const details = [];
        let totalScore = 0;

        for (const cs of criterionSets) {
            const composerCode = cs.get('composerCode');
            const composer = logicComposer.getComposition(composerCode);
            if (!composer) {
                details.push({
                    criterionSetIdx: cs.idx,
                    attributeCode: this._lookupCode(attributes, cs.get('attributeId')),
                    bandCode: this._lookupCode(bands, cs.get('bandId')),
                    label: cs.get('label'),
                    passed: false,
                    score: 0,
                    reportPositive: '',
                    reportNegative: `Logic composition "${composerCode}" not found`,
                    detail: null
                });
                continue;
            }

            const evalResult = logicComposer.evaluate(composer.idx, entityData, {
                mode: options.entityType || 'student'
            });

            details.push({
                criterionSetIdx: cs.idx,
                attributeCode: this._lookupCode(attributes, cs.get('attributeId')),
                bandCode: this._lookupCode(bands, cs.get('bandId')),
                label: cs.get('label'),
                passed: evalResult.passed,
                score: evalResult.score,
                reportPositive: (evalResult.positive || []).join('; '),
                reportNegative: (evalResult.negative || []).join('; '),
                detail: evalResult.nodeResults
            });

            totalScore += evalResult.score;
        }

        const passedCount = details.filter(d => d.passed).length;
        const totalCount = details.length;
        const allPassed = passedCount === totalCount && totalCount > 0;
        const overallScore = totalCount > 0 ? totalScore / totalCount : 0;

        // Compose overall report
        const report = this._composeEntityReport(body, details, attributes, bands, allPassed);

        // Persist evaluation
        const evaluation = this.table('accredEvaluation').create({
            bodyId: body.idx,
            entityId: options.entityId || 'unknown',
            entityLabel: options.entityLabel || '',
            entityType: options.entityType || 'student',
            status: allPassed ? 'pass' : (passedCount > 0 ? 'partial' : 'fail'),
            totalSets: totalCount,
            passedSets: passedCount,
            failedSets: totalCount - passedCount,
            overallScore: Math.round(overallScore * 100) / 100,
            reportSummary: report.summary,
            reportPositive: report.positive,
            reportNegative: report.negative,
            ruleVersionId: options.ruleVersionId || null,
            evaluatedAt: new Date().toISOString(),
            evaluatedBy: options.evaluatedBy || null
        });

        // Persist per-criterion-set details
        for (const d of details) {
            this.table('accredEvalDetail').create({
                evaluationId: evaluation.idx,
                criterionSetId: d.criterionSetIdx,
                attributeCode: d.attributeCode,
                bandCode: d.bandCode,
                passed: d.passed,
                score: d.score,
                reportPositive: d.reportPositive,
                reportNegative: d.reportNegative,
                detail: d.detail
            });
        }

        return {
            passed: allPassed,
            summary: { total: totalCount, passed: passedCount, failed: totalCount - passedCount, score: overallScore },
            details,
            report,
            evaluation
        };
    }

    /**
     * Evaluate a cohort (batch of entities) against a body's criteria.
     */
    evaluateCohort(bodyCode, entities, logicComposer, options = {}) {
        const results = entities.map(entity => {
            const result = this.evaluateEntity(bodyCode, entity.data, logicComposer, {
                entityId: entity.id,
                entityLabel: entity.label,
                entityType: options.entityType || 'student',
                evaluatedBy: options.evaluatedBy,
                ruleVersionId: options.ruleVersionId
            });
            return {
                entityId: entity.id,
                entityLabel: entity.label,
                ...result
            };
        });

        const totalEntities = results.length;
        const passedEntities = results.filter(r => r.passed).length;

        // Per-attribute breakdown
        const body = this.getBody(bodyCode);
        const attributes = body ? this.getAttributes(body.idx) : [];
        const bands = body ? this.getBands(body.idx) : [];

        const attributeBreakdown = attributes.map(attr => {
            const attrCode = attr.get('code');
            const bandResults = bands.map(band => {
                const bandCode = band.get('code');
                const relevant = results.map(r => {
                    const detail = r.details.find(d =>
                        d.attributeCode === attrCode && d.bandCode === bandCode
                    );
                    return detail ? detail.passed : null;
                }).filter(v => v !== null);

                return {
                    bandCode,
                    bandLabel: band.get('label'),
                    total: relevant.length,
                    passed: relevant.filter(v => v).length,
                    passRate: relevant.length > 0 ? Math.round((relevant.filter(v => v).length / relevant.length) * 100) : 0
                };
            });

            return {
                attributeCode: attrCode,
                attributeLabel: attr.get('label'),
                bands: bandResults
            };
        });

        const cohortReport = this._composeCohortReport(bodyCode, totalEntities, passedEntities, attributeBreakdown);

        return {
            summary: {
                totalEntities,
                passedEntities,
                failedEntities: totalEntities - passedEntities,
                passRate: totalEntities > 0 ? Math.round((passedEntities / totalEntities) * 100) : 0
            },
            attributeBreakdown,
            results,
            report: cohortReport
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Report Composition
    // ─────────────────────────────────────────────────────────────────────────

    _composeEntityReport(body, details, attributes, bands, allPassed) {
        const positiveLines = [];
        const negativeLines = [];

        // Group by attribute
        const grouped = {};
        for (const d of details) {
            if (!grouped[d.attributeCode]) grouped[d.attributeCode] = [];
            grouped[d.attributeCode].push(d);
        }

        for (const attrCode of Object.keys(grouped)) {
            const attrDetails = grouped[attrCode];
            const attr = attributes.find(a => a.get('code') === attrCode);
            const attrLabel = attr ? `${attrCode} — ${attr.get('label')}` : attrCode;

            const attrPassed = attrDetails.filter(d => d.passed);
            const attrFailed = attrDetails.filter(d => !d.passed);

            if (attrPassed.length > 0) {
                const bandLabels = attrPassed.map(d => {
                    const band = bands.find(b => b.get('code') === d.bandCode);
                    return band ? band.get('label') : d.bandCode;
                });
                positiveLines.push(`${attrLabel}: met at ${bandLabels.join(', ')} level(s)`);
            }

            if (attrFailed.length > 0) {
                const bandLabels = attrFailed.map(d => {
                    const band = bands.find(b => b.get('code') === d.bandCode);
                    return band ? band.get('label') : d.bandCode;
                });
                negativeLines.push(`${attrLabel}: NOT met at ${bandLabels.join(', ')} level(s)`);
                // Include specific failure reasons
                for (const d of attrFailed) {
                    if (d.reportNegative) {
                        negativeLines.push(`  Reason: ${d.reportNegative}`);
                    }
                }
            }
        }

        const positive = positiveLines.join('\n');
        const negative = negativeLines.join('\n');

        const bodyLabel = body.get('label');
        const passCount = details.filter(d => d.passed).length;
        const total = details.length;

        let summary;
        if (allPassed) {
            summary = `PASSED all ${total} ${bodyLabel} criterion sets.\n\n${positive}`;
        } else if (positiveLines.length > 0) {
            summary = `FAILED ${bodyLabel} evaluation (${passCount}/${total} criterion sets passed).\n\nStrengths:\n${positive}\n\nDeficiencies:\n${negative}`;
        } else {
            summary = `FAILED ${bodyLabel} evaluation (0/${total} criterion sets passed).\n\nDeficiencies:\n${negative}`;
        }

        return { positive, negative, summary };
    }

    _composeCohortReport(bodyCode, totalEntities, passedEntities, attributeBreakdown) {
        const lines = [];
        lines.push(`${bodyCode} Cohort Report — ${totalEntities} entities evaluated`);
        lines.push(`Overall pass rate: ${passedEntities}/${totalEntities} (${totalEntities > 0 ? Math.round((passedEntities / totalEntities) * 100) : 0}%)`);
        lines.push('');

        // Identify weakest attributes
        const weakest = [];
        for (const attr of attributeBreakdown) {
            for (const band of attr.bands) {
                if (band.passRate < 70 && band.total > 0) {
                    weakest.push({ attribute: attr.attributeLabel, band: band.bandLabel, passRate: band.passRate });
                }
            }
        }

        if (weakest.length > 0) {
            lines.push('Areas of concern (< 70% pass rate):');
            weakest.sort((a, b) => a.passRate - b.passRate);
            for (const w of weakest) {
                lines.push(`  ${w.attribute} at ${w.band}: ${w.passRate}% pass rate`);
            }
        } else {
            lines.push('All attribute-band combinations have >= 70% pass rate.');
        }

        return lines.join('\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Document Management
    // ─────────────────────────────────────────────────────────────────────────

    attachDocument(data) {
        return this.table('accredDocument').create({
            ...data,
            uploadedAt: new Date().toISOString()
        });
    }

    getDocumentsFor(targetType, targetId) {
        return this.table('accredDocument').all()
            .filter(d => d.get('targetType') === targetType && d.get('targetId') === String(targetId));
    }

    getDocumentsByBody(bodyId) {
        return this.table('accredDocument').all()
            .filter(d => d.get('bodyId') === bodyId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Rule Versioning
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a new rule version. Snapshots all current criterion sets for the body.
     * @param {string} bodyCode - Body code
     * @param {Object} data - { label, effectiveDate, transitionPolicy, phaseOutDate, notes }
     * @param {number} [createdBy]
     */
    createRuleVersion(bodyCode, data, createdBy = null) {
        const body = this.getBody(bodyCode);
        if (!body) return null;

        const sets = this.getCriterionSets(body.idx);
        const existing = this.table('accredRuleVersion').all()
            .filter(v => v.get('bodyId') === body.idx);
        const nextVersion = existing.length > 0
            ? Math.max(...existing.map(v => v.get('versionNumber'))) + 1
            : 1;

        // Snapshot current criterion sets
        const snapshot = sets.map(cs => ({
            idx: cs.idx,
            attributeId: cs.get('attributeId'),
            bandId: cs.get('bandId'),
            composerCode: cs.get('composerCode'),
            label: cs.get('label'),
            weight: cs.get('weight')
        }));

        return this.table('accredRuleVersion').create({
            bodyId: body.idx,
            label: data.label || `Version ${nextVersion}`,
            description: data.description,
            versionNumber: nextVersion,
            effectiveDate: data.effectiveDate,
            transitionPolicy: data.transitionPolicy || 'grandfathered',
            phaseOutDate: data.phaseOutDate,
            notes: data.notes,
            snapshotJson: snapshot,
            isActive: true,
            createdBy,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Determine which rule version applies to an entity based on its enrolment date.
     * If grandfathered, entities enrolled before a rule change use the older rules.
     */
    getApplicableRuleVersion(bodyCode, enrolmentDate) {
        const body = this.getBody(bodyCode);
        if (!body) return null;

        const versions = this.table('accredRuleVersion').all()
            .filter(v => v.get('bodyId') === body.idx && v.get('isActive'))
            .sort((a, b) => b.get('versionNumber') - a.get('versionNumber'));

        if (!versions.length) return null;

        for (const version of versions) {
            const effectiveDate = version.get('effectiveDate');
            const policy = version.get('transitionPolicy');

            if (policy === 'immediate') {
                // Latest version always applies
                return version;
            }

            if (policy === 'grandfathered') {
                // Entity enrolled before this version's effective date uses the prior version
                if (enrolmentDate && enrolmentDate < effectiveDate) {
                    continue; // Check older version
                }
                return version;
            }

            if (policy === 'phaseOut') {
                const phaseOutDate = version.get('phaseOutDate');
                if (enrolmentDate && enrolmentDate < effectiveDate && (!phaseOutDate || new Date() < new Date(phaseOutDate))) {
                    continue; // Still in phase-out, use older version
                }
                return version;
            }
        }

        // Fall back to oldest version
        return versions[versions.length - 1];
    }

    getRuleVersionHistory(bodyCode) {
        const body = this.getBody(bodyCode);
        if (!body) return [];
        return this.table('accredRuleVersion').all()
            .filter(v => v.get('bodyId') === body.idx)
            .sort((a, b) => b.get('versionNumber') - a.get('versionNumber'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario Planning
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Run a scenario: evaluate a cohort under modified criteria and compare to current.
     * @param {string} bodyCode
     * @param {Array<{criterionSetIdx: number, newComposerCode: string}>} proposedChanges
     * @param {Array<{id, label, data}>} entities
     * @param {LogicComposerService} logicComposer
     * @returns {{ current: Object, proposed: Object, comparison: Object }}
     */
    runScenario(bodyCode, proposedChanges, entities, logicComposer) {
        // Run current evaluation
        const current = this.evaluateCohort(bodyCode, entities, logicComposer);

        // Apply proposed changes temporarily
        const body = this.getBody(bodyCode);
        if (!body) return { current, proposed: null, comparison: null };

        const originalCodes = {};
        for (const change of proposedChanges) {
            const cs = this.table('accredCriterionSet').read(change.criterionSetIdx);
            if (cs) {
                originalCodes[change.criterionSetIdx] = cs.get('composerCode');
                cs.set('composerCode', change.newComposerCode);
            }
        }

        // Run proposed evaluation
        const proposed = this.evaluateCohort(bodyCode, entities, logicComposer);

        // Restore original codes
        for (const [idx, code] of Object.entries(originalCodes)) {
            const cs = this.table('accredCriterionSet').read(parseInt(idx));
            if (cs) cs.set('composerCode', code);
        }

        // Compare
        const comparison = {
            currentPassRate: current.summary.passRate,
            proposedPassRate: proposed.summary.passRate,
            delta: proposed.summary.passRate - current.summary.passRate,
            entityChanges: entities.map((entity, i) => {
                const wasPass = current.results[i]?.passed || false;
                const nowPass = proposed.results[i]?.passed || false;
                let change = 'unchanged';
                if (!wasPass && nowPass) change = 'improved';
                if (wasPass && !nowPass) change = 'regressed';
                return { entityId: entity.id, entityLabel: entity.label, was: wasPass, now: nowPass, change };
            }).filter(c => c.change !== 'unchanged')
        };

        return { current, proposed, comparison };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    _lookupCode(collection, idx) {
        const item = collection.find(c => c.idx === idx);
        return item ? item.get('code') : String(idx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Connectivity
    // ─────────────────────────────────────────────────────────────────────────

    connectApi(config = {}) {
        if (!config.apiUrl) throw new Error('apiUrl is required');
        const baseEndpoint = config.apiEndpoint || '/api/v1/accreditation';
        const bindings = {};
        ['accredBody', 'accredAttribute', 'accredBand', 'accredCriterionSet', 'accredEvaluation', 'accredEvalDetail', 'accredDocument', 'accredRuleVersion'].forEach(tableName => {
            bindings[tableName] = new ApiBinding(this.table(tableName), {
                apiUrl: config.apiUrl,
                endpoint: `${baseEndpoint}/${tableName}`,
                apiToken: config.apiToken
            });
        });
        return bindings;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Binding Registry & Capability Discovery
    // ─────────────────────────────────────────────────────────────────────────

    getBindingRegistry() {
        return [
            {
                key: 'bodies',
                label: 'Accreditation Bodies',
                description: 'Browse/create accreditation bodies (ECSA, CHE, HPCSA).',
                type: 'selectEditor',
                tables: ['accredBody'],
                methods: ['bindSelectEditor'],
                tags: ['browse', 'crud', 'organization'],
                intent: 'Manage accreditation bodies'
            },
            {
                key: 'bodyAttributes',
                label: 'Body Attributes',
                description: 'Parent-child: select body, view/edit its attributes (GA1-GA11).',
                type: 'composite',
                tables: ['accredBody', 'accredAttribute'],
                methods: ['bindSelectEditor', 'bindChildTable'],
                tags: ['browse', 'crud', 'parent-child', 'hierarchy'],
                intent: 'Manage attributes per accreditation body'
            },
            {
                key: 'bodyBands',
                label: 'Achievement Bands',
                description: 'Parent-child: select body, view/edit its achievement bands.',
                type: 'composite',
                tables: ['accredBody', 'accredBand'],
                methods: ['bindSelectEditor', 'bindChildTable'],
                tags: ['browse', 'crud', 'parent-child', 'levels'],
                intent: 'Manage achievement bands per accreditation body'
            },
            {
                key: 'criterionSets',
                label: 'Criterion Sets',
                description: 'Browse criterion sets linking attributes, bands, and logic compositions.',
                type: 'selectEditor',
                tables: ['accredCriterionSet'],
                methods: ['bindSelectEditor'],
                tags: ['browse', 'crud', 'logic', 'rules'],
                intent: 'Manage criterion sets with logic composer linkage'
            },
            {
                key: 'criterionMatrix',
                label: 'Criterion Matrix',
                description: 'Attribute x band matrix showing criterion coverage for a body.',
                type: 'composite',
                tables: ['accredBody', 'accredAttribute', 'accredBand', 'accredCriterionSet'],
                methods: ['bindSelector', 'bindCollection'],
                tags: ['matrix', 'overview', 'analysis', 'coverage'],
                intent: 'Visualize attribute-band criterion coverage'
            },
            {
                key: 'evaluations',
                label: 'Evaluations',
                description: 'Browse and review entity evaluations with pass/fail status.',
                type: 'selectEditor',
                tables: ['accredEvaluation'],
                methods: ['bindSelectEditor', 'bindView'],
                tags: ['browse', 'review', 'assessment', 'results'],
                intent: 'Review evaluation results for entities'
            },
            {
                key: 'evalDetails',
                label: 'Evaluation Details',
                description: 'Parent-child: select evaluation, view per-criterion-set results.',
                type: 'composite',
                tables: ['accredEvaluation', 'accredEvalDetail'],
                methods: ['bindSelectEditor', 'bindChildTable', 'bindCollection'],
                tags: ['browse', 'detail', 'parent-child', 'drill-down'],
                intent: 'Drill into per-criterion evaluation results'
            },
            {
                key: 'documents',
                label: 'Evidence Documents',
                description: 'Browse/attach evidence documents linked to accreditation targets.',
                type: 'selectEditor',
                tables: ['accredDocument'],
                methods: ['bindSelectEditor'],
                tags: ['browse', 'crud', 'files', 'evidence'],
                intent: 'Manage evidence documents for accreditation'
            },
            {
                key: 'ruleVersions',
                label: 'Rule Versions',
                description: 'Browse rule version history with transition policies and snapshots.',
                type: 'selectEditor',
                tables: ['accredRuleVersion'],
                methods: ['bindSelectEditor', 'bindView'],
                tags: ['browse', 'versioning', 'history', 'policy'],
                intent: 'Track rule version changes and transition policies'
            }
        ];
    }

    getCapabilities() {
        return {
            name: 'accreditation',
            alias: 'Accreditation AutoMate',
            icon: 'fa-certificate',
            intent: 'Manages accreditation bodies, attributes, bands, criterion evaluation via logic compositions, evidence documents, rule versioning, and scenario planning.',
            keywords: ['accreditation', 'compliance', 'criteria', 'evaluation', 'ECSA', 'CHE', 'graduate-attributes', 'rule-versioning', 'evidence'],
            capabilities: ['criterion-matrix', 'entity-evaluation', 'cohort-evaluation', 'scenario-planning', 'rule-versioning', 'evidence-management', 'logic-composer-integration'],
            useCases: [
                'Evaluate students against ECSA graduate attribute criteria across multiple bands',
                'Run cohort evaluations and identify weak attributes/bands',
                'Compare current vs proposed criterion changes via scenario planning',
                'Track rule version history with grandfathering and phase-out policies',
                'Attach and organize evidence documents for accreditation submissions'
            ],
            consumers: ['AutoScholar'],
            domainMethods: [
                { name: 'createBody', signature: '(data)', description: 'Create an accreditation body' },
                { name: 'getBody', signature: '(code)', description: 'Get body by code (e.g. ECSA)' },
                { name: 'listBodies', signature: '()', description: 'List all active accreditation bodies' },
                { name: 'createAttribute', signature: '(bodyId, data)', description: 'Create an attribute for a body' },
                { name: 'getAttributes', signature: '(bodyId)', description: 'Get attributes for a body, sorted' },
                { name: 'getAttribute', signature: '(bodyId, code)', description: 'Get specific attribute by body and code' },
                { name: 'createBand', signature: '(bodyId, data)', description: 'Create an achievement band for a body' },
                { name: 'getBands', signature: '(bodyId)', description: 'Get bands for a body, sorted' },
                { name: 'getBand', signature: '(bodyId, code)', description: 'Get specific band by body and code' },
                { name: 'createCriterionSet', signature: '(data)', description: 'Create a criterion set linking attribute + band + logic composition' },
                { name: 'getCriterionSets', signature: '(bodyId)', description: 'Get active criterion sets for a body' },
                { name: 'getCriterionSetsForAttribute', signature: '(attributeId)', description: 'Get criterion sets for a specific attribute' },
                { name: 'getCriterionMatrix', signature: '(bodyId)', description: 'Get attribute x band matrix with criterion sets' },
                { name: 'evaluateEntity', signature: '(bodyCode, entityData, logicComposer, options?)', description: 'Evaluate an entity against all criteria of a body' },
                { name: 'evaluateCohort', signature: '(bodyCode, entities, logicComposer, options?)', description: 'Batch-evaluate a cohort and produce attribute breakdown' },
                { name: 'attachDocument', signature: '(data)', description: 'Attach an evidence document to an accreditation target' },
                { name: 'getDocumentsFor', signature: '(targetType, targetId)', description: 'Get documents for a specific target' },
                { name: 'getDocumentsByBody', signature: '(bodyId)', description: 'Get all documents for a body' },
                { name: 'createRuleVersion', signature: '(bodyCode, data, createdBy?)', description: 'Create a rule version with criterion snapshot' },
                { name: 'getApplicableRuleVersion', signature: '(bodyCode, enrolmentDate)', description: 'Determine applicable rule version based on enrolment date and transition policy' },
                { name: 'getRuleVersionHistory', signature: '(bodyCode)', description: 'Get rule version history for a body' },
                { name: 'runScenario', signature: '(bodyCode, proposedChanges, entities, logicComposer)', description: 'Compare current vs proposed criteria on a cohort' },
                { name: 'connectApi', signature: '(config)', description: 'Wire REST API sync on all tables' }
            ],
            tables: ['accredBody', 'accredAttribute', 'accredBand', 'accredCriterionSet', 'accredEvaluation', 'accredEvalDetail', 'accredDocument', 'accredRuleVersion'],
            events: ['created', 'updated', 'deleted', 'selected'],
            fkDependencies: ['member'],
            bindings: this.getBindingRegistry()
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Data
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Seed accreditation bodies, attributes, bands, criterion sets, and
     * their corresponding Logic Composer compositions.
     * @param {LogicComposerService} logicComposer - required to create ECSA criterion compositions
     */
    seedDefaults(logicComposer) {
        if (this.table('accredBody').all().length > 0) return;

        // ── ECSA ──
        const ecsa = this.createBody({
            code: 'ECSA',
            label: 'ECSA Graduate Attributes',
            description: 'Engineering Council of South Africa — 11 graduate attributes for engineering programme accreditation',
            country: 'ZA',
            website: 'https://www.ecsa.co.za'
        });

        // Bands
        const emerging = this.createBand(ecsa.idx, { code: 'EMERGING', label: 'Emerging', description: 'Introductory — student exposed through foundational coursework', sortOrder: 1 });
        const developed = this.createBand(ecsa.idx, { code: 'DEVELOPED', label: 'Developed', description: 'Reinforced — student practiced across multiple courses', sortOrder: 2 });
        const exitLevel = this.createBand(ecsa.idx, { code: 'EXIT_LEVEL', label: 'Exit Level', description: 'Demonstrated/Assessed — student independently demonstrates at professional standard', sortOrder: 3 });

        // Attributes (GA1-GA11)
        const gaData = [
            { code: 'GA1',  label: 'Problem Solving', description: 'Identify, formulate, analyse and solve complex engineering problems', category: 'academic' },
            { code: 'GA2',  label: 'Application of Scientific and Engineering Knowledge', description: 'Apply knowledge of mathematics, natural science and engineering sciences', category: 'academic' },
            { code: 'GA3',  label: 'Engineering Design', description: 'Perform creative, procedural and non-procedural design and synthesis', category: 'academic' },
            { code: 'GA4',  label: 'Investigations, Experiments and Data Analysis', description: 'Conduct investigations and experiments, and analyse and interpret data', category: 'academic' },
            { code: 'GA5',  label: 'Engineering Methods, Skills and Tools', description: 'Use appropriate engineering methods, skills and tools', category: 'academic' },
            { code: 'GA6',  label: 'Professional and Technical Communication', description: 'Communicate effectively, both orally and in writing', category: 'professional' },
            { code: 'GA7',  label: 'Sustainability and Impact of Engineering Activity', description: 'Demonstrate critical awareness of the impact of engineering activity', category: 'professional' },
            { code: 'GA8',  label: 'Individual Work', description: 'Work effectively as an individual', category: 'professional' },
            { code: 'GA9',  label: 'Team Work', description: 'Work effectively as a member of a team', category: 'professional' },
            { code: 'GA10', label: 'Engineering Professionalism', description: 'Demonstrate understanding of professional development needs', category: 'professional' },
            { code: 'GA11', label: 'Engineering Management', description: 'Demonstrate knowledge of engineering management principles', category: 'professional' }
        ];

        const gaRecords = gaData.map((ga, i) =>
            this.createAttribute(ecsa.idx, { ...ga, sortOrder: i + 1 })
        );

        // Create ECSA Logic Composer compositions (33 = 11 GAs x 3 bands)
        const bandRecords = [emerging, developed, exitLevel];
        const bandCodes = ['EMERGING', 'DEVELOPED', 'EXIT_LEVEL'];
        const levelLabels = { EMERGING: 'Emerging', DEVELOPED: 'Developed', EXIT_LEVEL: 'Exit Level' };

        if (logicComposer) {
            const templates = this._getEcsaTemplates();
            for (const tmpl of templates) {
                for (const [levelCode, tree] of Object.entries(tmpl.levels)) {
                    const code = `ECSA_${tmpl.code}_${levelCode}`;
                    const composer = logicComposer.createComposition({
                        code,
                        label: `${tmpl.code} — ${tmpl.label} (${levelLabels[levelCode]})`,
                        description: tmpl.description,
                        category: 'ECSA',
                        version: '2019-2025'
                    });
                    logicComposer.importTree(composer.idx, tree);
                }
            }
        }

        // Criterion sets — link each GA x band to the Logic Composer code
        for (let gi = 0; gi < gaRecords.length; gi++) {
            const ga = gaRecords[gi];
            const gaCode = gaData[gi].code;
            for (let bi = 0; bi < bandRecords.length; bi++) {
                const band = bandRecords[bi];
                const composerCode = `ECSA_${gaCode}_${bandCodes[bi]}`;
                this.createCriterionSet({
                    bodyId: ecsa.idx,
                    attributeId: ga.idx,
                    bandId: band.idx,
                    composerCode,
                    label: `${gaCode} — ${gaData[gi].label} (${band.get('label')})`,
                    weight: 1
                });
            }
        }

        // ── CHE (minimal) ──
        const che = this.createBody({
            code: 'CHE',
            label: 'CHE Quality Framework',
            description: 'Council on Higher Education quality assurance framework',
            country: 'ZA',
            website: 'https://www.che.ac.za'
        });

        this.createBand(che.idx, { code: 'BASIC', label: 'Basic', sortOrder: 1 });
        this.createBand(che.idx, { code: 'PROFICIENT', label: 'Proficient', sortOrder: 2 });
        this.createBand(che.idx, { code: 'ADVANCED', label: 'Advanced', sortOrder: 3 });

        ['Teaching & Learning', 'Research', 'Community Engagement', 'Programme Design'].forEach((label, i) => {
            this.createAttribute(che.idx, { code: `CHE${i + 1}`, label, sortOrder: i + 1 });
        });

        // Initial rule version
        this.createRuleVersion('ECSA', {
            label: 'ECSA 2019 Standards',
            effectiveDate: '2019-01-01',
            transitionPolicy: 'grandfathered',
            notes: 'Initial ECSA graduate attribute standards for engineering programmes'
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ECSA Criterion Templates (domain-specific to accreditation)
    // ─────────────────────────────────────────────────────────────────────────

    /** Shorthand for building a criterion node */
    static _c(code, assessment, minMark, label) {
        const attrPath = assessment
            ? `courseResult.${code}.${assessment}`
            : `courseResult.${code}.finalMark`;
        return {
            nodeType: 'criterion', attrPath, operator: 'gte', value: String(minMark), context: 'student',
            label: label || (assessment ? `${code}.${assessment} (>=${minMark}%)` : `${code} (>=${minMark}%)`)
        };
    }

    _getEcsaTemplates() {
        const c = AccreditationService._c;
        return [
            { code: 'GA1', label: 'Problem Solving', description: 'Identify, formulate, analyse and solve complex engineering problems',
              levels: {
                EMERGING: { nodeType: 'AND', label: 'GA1 Emerging', children: [
                    c('ENEL1CA', null, 50, 'Pass Circuit Analysis'), c('MATH1AB', null, 50, 'Pass Engineering Maths I') ]},
                DEVELOPED: { nodeType: 'AND', label: 'GA1 Developed', children: [
                    c('ENEL2CA', null, 50, 'Pass Adv Circuit Analysis'), c('MATH2AB', null, 50, 'Pass Engineering Maths II'),
                    { nodeType: 'OR', label: 'Applied problem solving', children: [
                        { nodeType: 'AND', label: 'Design route', children: [ c('ENEL2TD', null, 50, 'Pass Technical Design'), c('ENEL2TD', 'assignment1', 50, 'Design assignment (>=50%)') ]},
                        { nodeType: 'AND', label: 'Lab route', children: [ c('ENEL2EL', null, 50, 'Pass Electronics Lab'), c('ENEL2EL', 'practical', 50, 'Lab practical (>=50%)') ]}
                    ]}
                ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA1 Exit Level', children: [
                    c('ENEL4DP', 'problemAnalysis', 50, 'Capstone problem analysis (>=50%)'),
                    { nodeType: 'anyNof', nRequired: 1, label: 'Senior problem-solving course', children: [
                        c('ENEL3PS', null, 50, 'Pass Power Systems'), c('ENEL3RT', null, 50, 'Pass Research & Testing') ]},
                    c('ENEL4DP', null, 50, 'Pass Capstone Design') ]}
              }},
            { code: 'GA2', label: 'Application of Scientific and Engineering Knowledge', description: 'Apply knowledge of mathematics, natural science and engineering sciences',
              levels: {
                EMERGING: { nodeType: 'anyNof', nRequired: 3, label: 'GA2 Emerging — pass 3 of 4 science foundations', children: [
                    c('MATH1AB', null, 50, 'Pass Engineering Maths I'), c('PHYS1AA', null, 50, 'Pass Physics'),
                    c('CHEM1AB', null, 50, 'Pass Chemistry'), c('ENEL1CA', null, 50, 'Pass Circuit Analysis') ]},
                DEVELOPED: { nodeType: 'AND', label: 'GA2 Developed', children: [
                    c('MATH2AB', null, 50, 'Pass Engineering Maths II'), c('ENEL2CA', null, 50, 'Pass Adv Circuit Analysis'),
                    { nodeType: 'OR', label: 'Lab or design application', children: [
                        c('ENEL2EL', null, 50, 'Pass Electronics Lab'),
                        { nodeType: 'AND', label: 'Design application', children: [
                            c('ENEL2TD', null, 50, 'Pass Technical Design'), c('ENEL2TD', 'designProject', 50, 'Design project (>=50%)') ]}
                    ]}
                ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA2 Exit Level', children: [
                    c('ENEL3PS', null, 50, 'Pass Power Systems'), c('ENEL4DP', null, 50, 'Pass Capstone Design'),
                    c('MATH2AB', null, 60, 'Strong maths foundation (>=60%)') ]}
              }},
            { code: 'GA3', label: 'Engineering Design', description: 'Perform creative, procedural and non-procedural design and synthesis',
              levels: {
                EMERGING: { nodeType: 'AND', label: 'GA3 Emerging', children: [
                    c('ENEL1CS', null, 50, 'Pass Computing & Programming'), c('ENEL1CS', 'project', 50, 'Programming project (>=50%)') ]},
                DEVELOPED: { nodeType: 'AND', label: 'GA3 Developed', children: [
                    c('ENEL2TD', null, 50, 'Pass Technical Design'), c('ENEL2TD', 'designProject', 50, 'Design project (>=50%)'),
                    c('ENEL2TD', 'presentation', 40, 'Design presentation (>=40%)') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA3 Exit Level', children: [
                    c('ENEL4DP', null, 50, 'Pass Capstone Design'), c('ENEL4DP', 'designReport', 50, 'Capstone design report (>=50%)'),
                    c('ENEL3GP', null, 50, 'Pass Group Design Project'),
                    { nodeType: 'OR', label: 'Design synthesis evidence', children: [
                        c('ENEL3GP', 'designReport', 60, 'Group design report (>=60%)'),
                        { nodeType: 'AND', label: 'Capstone synthesis', children: [
                            c('ENEL4DP', 'problemAnalysis', 50, 'Problem analysis (>=50%)'), c('ENEL4DP', 'impactAssessment', 40, 'Impact assessment (>=40%)') ]}
                    ]}
                ]}
              }},
            { code: 'GA4', label: 'Investigations, Experiments and Data Analysis', description: 'Conduct investigations and experiments, and analyse and interpret data',
              levels: {
                EMERGING: { nodeType: 'AND', label: 'GA4 Emerging', children: [
                    c('PHYS1AA', null, 50, 'Pass Physics'),
                    { nodeType: 'OR', label: 'Lab report from any science', children: [
                        c('CHEM1AB', 'labReport', 50, 'Chemistry lab report (>=50%)'), c('PHYS1AA', 'labReport', 50, 'Physics lab report (>=50%)') ]}
                ]},
                DEVELOPED: { nodeType: 'AND', label: 'GA4 Developed', children: [
                    c('ENEL2EL', null, 50, 'Pass Electronics Lab'), c('ENEL2EL', 'labReport', 50, 'Lab report (>=50%)'),
                    c('ENEL2EL', 'groupExperiment', 40, 'Group experiment (>=40%)') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA4 Exit Level', children: [
                    c('ENEL3RT', null, 50, 'Pass Research & Testing'), c('ENEL3RT', 'labReport', 50, 'Research lab report (>=50%)'),
                    c('ENEL4DP', 'investigation', 50, 'Capstone investigation (>=50%)'),
                    { nodeType: 'OR', label: 'Advanced lab evidence', children: [
                        c('ENEL3RT', 'investigation', 60, 'Research investigation (>=60%)'),
                        { nodeType: 'AND', label: 'Multi-source evidence', children: [
                            c('ENEL3RT', 'test1', 50, 'Research test (>=50%)'), c('ENEL2EL', 'practical', 60, 'Electronics practical (>=60%)') ]}
                    ]}
                ]}
              }},
            { code: 'GA5', label: 'Engineering Methods, Skills and Tools', description: 'Use appropriate engineering methods, skills and tools',
              levels: {
                EMERGING: { nodeType: 'AND', label: 'GA5 Emerging', children: [
                    c('ENEL1CS', null, 50, 'Pass Computing & Programming'), c('ENEL1CS', 'project', 50, 'Programming project (>=50%)') ]},
                DEVELOPED: { nodeType: 'anyNof', nRequired: 2, label: 'GA5 Developed — pass 2 of 3 applied-tools courses', children: [
                    c('ENEL2TD', null, 50, 'Pass Technical Design'), c('ENEL2EL', null, 50, 'Pass Electronics Lab'), c('ENEL2CA', null, 50, 'Pass Adv Circuit Analysis') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA5 Exit Level', children: [
                    c('ENEL4DP', null, 50, 'Pass Capstone Design'),
                    { nodeType: 'anyNof', nRequired: 1, label: 'Senior tools application', children: [
                        c('ENEL3GP', null, 50, 'Pass Group Design Project'), c('ENEL3PS', null, 50, 'Pass Power Systems') ]}
                ]}
              }},
            { code: 'GA6', label: 'Professional and Technical Communication', description: 'Communicate effectively, both orally and in writing',
              levels: {
                EMERGING: { nodeType: 'AND', label: 'GA6 Emerging', children: [
                    c('ENGL1TC', null, 50, 'Pass Technical Communication'), c('ENGL1TC', 'oral', 50, 'Oral presentation (>=50%)') ]},
                DEVELOPED: { nodeType: 'anyNof', nRequired: 2, label: 'GA6 Developed — 2 of 3 communication assessments', children: [
                    c('ENEL2EL', 'labReport', 50, 'Electronics lab report (>=50%)'), c('ENEL2TD', 'presentation', 50, 'Design presentation (>=50%)'),
                    c('ENEL3EM', 'test1', 40, 'Management test (>=40%)') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA6 Exit Level', children: [
                    c('ENEL4DP', 'presentation', 50, 'Capstone presentation (>=50%)'), c('ENEL3RT', 'labReport', 50, 'Research lab report (>=50%)'),
                    { nodeType: 'OR', label: 'Oral communication at senior level', children: [
                        c('ENEL3GP', 'presentation', 50, 'Group project presentation (>=50%)'), c('ENEL4WL', 'finalPresentation', 50, 'WIL presentation (>=50%)') ]}
                ]}
              }},
            { code: 'GA7', label: 'Sustainability and Impact of Engineering Activity', description: 'Demonstrate critical awareness of the impact of engineering activity',
              levels: {
                EMERGING: { nodeType: 'criterion', attrPath: 'courseResult.ENGL1TC.writtenReport', operator: 'gte', value: '40', context: 'student', label: 'Written report on impact (>=40%)' },
                DEVELOPED: { nodeType: 'AND', label: 'GA7 Developed', children: [
                    c('ENEL3EM', null, 50, 'Pass Engineering Management'), c('ENEL3EM', 'ethics', 50, 'Ethics assessment (>=50%)') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA7 Exit Level', children: [
                    c('ENEL4DP', 'impactAssessment', 50, 'Capstone impact assessment (>=50%)'), c('ENEL3EM', null, 50, 'Pass Engineering Management') ]}
              }},
            { code: 'GA8', label: 'Individual Work', description: 'Work effectively as an individual',
              levels: {
                EMERGING: { nodeType: 'AND', label: 'GA8 Emerging', children: [
                    c('MATH1AB', 'exam', 50, 'Maths exam (>=50%)'), c('ENEL1CA', 'exam', 50, 'Circuits exam (>=50%)') ]},
                DEVELOPED: { nodeType: 'AND', label: 'GA8 Developed', children: [
                    c('ENEL2TD', 'assignment1', 50, 'Individual design assignment (>=50%)'), c('ENEL2CA', 'exam', 50, 'Adv circuits exam (>=50%)') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA8 Exit Level', children: [
                    c('ENEL4DP', null, 50, 'Pass Capstone Design (individual)'), c('ENEL4WL', null, 50, 'Pass WIL (individual)') ]}
              }},
            { code: 'GA9', label: 'Team Work', description: 'Work effectively as a member of a team',
              levels: {
                EMERGING: { nodeType: 'criterion', attrPath: 'courseResult.ENGL1TC.groupProject', operator: 'gte', value: '50', context: 'student', label: 'Group project (>=50%)' },
                DEVELOPED: { nodeType: 'AND', label: 'GA9 Developed', children: [
                    c('ENEL2EL', 'groupExperiment', 50, 'Group experiment (>=50%)'), c('ENGL1TC', 'groupProject', 50, 'Group project (>=50%)') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA9 Exit Level', children: [
                    c('ENEL3GP', null, 50, 'Pass Group Design Project'), c('ENEL3GP', 'peerReview', 50, 'Peer review (>=50%)') ]}
              }},
            { code: 'GA10', label: 'Engineering Professionalism', description: 'Demonstrate understanding of professional development needs',
              levels: {
                EMERGING: { nodeType: 'criterion', attrPath: 'courseResult.ENGL1TC.finalMark', operator: 'gte', value: '50', context: 'student', label: 'Pass Technical Communication' },
                DEVELOPED: { nodeType: 'AND', label: 'GA10 Developed', children: [
                    c('ENEL3EM', 'ethics', 50, 'Ethics assessment (>=50%)'), c('ENEL3EM', null, 50, 'Pass Engineering Management') ]},
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA10 Exit Level', children: [
                    c('ENEL4WL', null, 50, 'Pass WIL'), c('ENEL4WL', 'supervisorReport', 50, 'WIL supervisor report (>=50%)'),
                    c('ENEL3EM', null, 50, 'Pass Engineering Management') ]}
              }},
            { code: 'GA11', label: 'Engineering Management', description: 'Demonstrate knowledge of engineering management principles',
              levels: {
                EMERGING: { nodeType: 'criterion', attrPath: 'courseResult.MATH1AB.finalMark', operator: 'gte', value: '50', context: 'student', label: 'Pass Engineering Maths I' },
                DEVELOPED: { nodeType: 'criterion', attrPath: 'courseResult.ENEL3EM.finalMark', operator: 'gte', value: '50', context: 'student', label: 'Pass Engineering Management' },
                EXIT_LEVEL: { nodeType: 'AND', label: 'GA11 Exit Level', children: [
                    c('ENEL3EM', null, 50, 'Pass Engineering Management'), c('ENEL4DP', 'projectPlan', 50, 'Capstone project plan (>=50%)'),
                    c('ENEL4WL', 'reflectiveJournal', 40, 'WIL reflective journal (>=40%)') ]}
              }}
        ];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample Data (domain knowledge on the service, not in HTML)
// ─────────────────────────────────────────────────────────────────────────────

AccreditationService.sampleStudents = [
    { id: 'S001', label: 'Thabo Mkhize', data: { courseResult: {
        ENEL1CA: { finalMark: 72, exam: 68 }, MATH1AB: { finalMark: 65, exam: 62 },
        PHYS1AA: { finalMark: 58, labReport: 62 }, CHEM1AB: { finalMark: 55, labReport: 58 },
        ENEL1CS: { finalMark: 78, project: 82 }, ENGL1TC: { finalMark: 70, oral: 65, groupProject: 72, writtenReport: 55 },
        ENEL2CA: { finalMark: 58, exam: 55 }, MATH2AB: { finalMark: 52 },
        ENEL2TD: { finalMark: 65, designProject: 70, assignment1: 62, presentation: 58 },
        ENEL2EL: { finalMark: 68, labReport: 72, practical: 65, groupExperiment: 60 },
        ENEL3EM: { finalMark: 55, ethics: 60, test1: 52 }, ENEL3PS: { finalMark: 52 },
        ENEL3RT: { finalMark: 58, labReport: 55, investigation: 62, test1: 50 },
        ENEL3GP: { finalMark: 65, designReport: 62, presentation: 58, peerReview: 70 },
        ENEL4DP: { finalMark: 72, problemAnalysis: 68, designReport: 70, investigation: 65, presentation: 72, impactAssessment: 55, projectPlan: 60 },
        ENEL4WL: { finalMark: 68, supervisorReport: 72, finalPresentation: 65, reflectiveJournal: 55 }
    }}},
    { id: 'S002', label: 'Priya Naidoo', data: { courseResult: {
        ENEL1CA: { finalMark: 85, exam: 82 }, MATH1AB: { finalMark: 78, exam: 80 },
        PHYS1AA: { finalMark: 72, labReport: 75 }, CHEM1AB: { finalMark: 68, labReport: 70 },
        ENEL1CS: { finalMark: 90, project: 92 }, ENGL1TC: { finalMark: 82, oral: 78, groupProject: 85, writtenReport: 72 },
        ENEL2CA: { finalMark: 75, exam: 72 }, MATH2AB: { finalMark: 70 },
        ENEL2TD: { finalMark: 82, designProject: 85, assignment1: 78, presentation: 75 },
        ENEL2EL: { finalMark: 78, labReport: 80, practical: 75, groupExperiment: 72 },
        ENEL3EM: { finalMark: 72, ethics: 78, test1: 65 }, ENEL3PS: { finalMark: 68 },
        ENEL3RT: { finalMark: 75, labReport: 72, investigation: 78, test1: 68 },
        ENEL3GP: { finalMark: 80, designReport: 78, presentation: 75, peerReview: 82 },
        ENEL4DP: { finalMark: 85, problemAnalysis: 82, designReport: 85, investigation: 80, presentation: 88, impactAssessment: 72, projectPlan: 75 },
        ENEL4WL: { finalMark: 80, supervisorReport: 85, finalPresentation: 78, reflectiveJournal: 72 }
    }}},
    { id: 'S003', label: 'Sipho Dlamini', data: { courseResult: {
        ENEL1CA: { finalMark: 52, exam: 48 }, MATH1AB: { finalMark: 48, exam: 45 },
        PHYS1AA: { finalMark: 42, labReport: 45 }, CHEM1AB: { finalMark: 40, labReport: 42 },
        ENEL1CS: { finalMark: 55, project: 58 }, ENGL1TC: { finalMark: 50, oral: 48, groupProject: 52, writtenReport: 38 },
        ENEL2CA: { finalMark: 38, exam: 35 }, MATH2AB: { finalMark: 32 },
        ENEL2TD: { finalMark: 42, designProject: 40, assignment1: 45, presentation: 35 },
        ENEL2EL: { finalMark: 48, labReport: 50, practical: 45, groupExperiment: 42 },
        ENEL3EM: { finalMark: 0 }, ENEL3PS: { finalMark: 0 },
        ENEL3RT: { finalMark: 0 }, ENEL3GP: { finalMark: 0 },
        ENEL4DP: { finalMark: 0 }, ENEL4WL: { finalMark: 0 }
    }}}
];

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AccreditationService, AccreditationServiceSchema };
}
