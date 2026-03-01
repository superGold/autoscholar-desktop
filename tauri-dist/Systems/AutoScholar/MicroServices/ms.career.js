/**
 * CareerService - Student career management microservice
 *
 * Manages student profiles, CV building, skills, experience,
 * opportunities (jobs, bursaries, internships, learnerships),
 * and applications with matching engine.
 *
 * Tables:
 * - studentProfile: Student career profile
 * - studentProgrammeData: Programme enrolment snapshot
 * - cvBlock: CV section blocks with ordering
 * - skillEntry: Skills with proficiency
 * - experienceEntry: Work/volunteer/project experience
 * - verifiedResult: Academic results for CV
 * - opportunity: Jobs, bursaries, internships, learnerships
 * - opportunityRequirement: Requirements per opportunity
 * - application: Student applications to opportunities
 *
 * @example
 * const careerService = new CareerService();
 * const profile = careerService.getOrCreateProfile(memberId);
 * careerService.addSkill(memberId, 'Python', 'advanced', 'technical');
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const CareerServiceSchema = {
    name: 'career',
    prefix: 'car',
    alias: 'Career Service',
    version: '1.0.0',

    tables: [
        {
            name: 'studentProfile',
            alias: 'Student Profiles',
            primaryKey: 'idx',
            labeller: '{headline}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true },
                { name: 'headline', label: 'Headline', type: 'string' },
                { name: 'bio', label: 'Bio', type: 'text' },
                { name: 'gpa', label: 'GPA', type: 'number' },
                { name: 'fieldOfStudy', label: 'Field of Study', type: 'string' },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'studentProgrammeData',
            alias: 'Programme Data',
            primaryKey: 'idx',
            labeller: '{programmeName}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'profileId', label: 'Profile', type: 'integer', required: true,
                    ref: { table: 'studentProfile', field: 'idx' } },
                { name: 'programmeCode', label: 'Programme Code', type: 'string' },
                { name: 'programmeName', label: 'Programme', type: 'string' },
                { name: 'nqfLevel', label: 'NQF Level', type: 'integer' },
                { name: 'faculty', label: 'Faculty', type: 'string' },
                { name: 'department', label: 'Department', type: 'string' },
                { name: 'creditsRequired', label: 'Credits Required', type: 'integer' },
                { name: 'creditsCompleted', label: 'Credits Completed', type: 'integer' },
                { name: 'completionPercentage', label: 'Completion %', type: 'number' },
                { name: 'yearOfStudy', label: 'Year of Study', type: 'integer' },
                { name: 'expectedGraduation', label: 'Expected Graduation', type: 'string' }
            ]
        },
        {
            name: 'cvBlock',
            alias: 'CV Blocks',
            primaryKey: 'idx',
            labeller: '{title}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'profileId', label: 'Profile', type: 'integer', required: true,
                    ref: { table: 'studentProfile', field: 'idx' } },
                { name: 'blockType', label: 'Block Type', type: 'string', required: true },
                { name: 'title', label: 'Title', type: 'string' },
                { name: 'content', label: 'Content', type: 'text' },
                { name: 'sortOrder', label: 'Sort Order', type: 'integer', default: 0 },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'skillEntry',
            alias: 'Skills',
            primaryKey: 'idx',
            labeller: '{skillName}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true },
                { name: 'skillName', label: 'Skill', type: 'string', required: true },
                { name: 'proficiency', label: 'Proficiency', type: 'string' },
                { name: 'category', label: 'Category', type: 'string' }
            ]
        },
        {
            name: 'experienceEntry',
            alias: 'Experience',
            primaryKey: 'idx',
            labeller: '{title}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true },
                { name: 'title', label: 'Title', type: 'string', required: true },
                { name: 'organization', label: 'Organization', type: 'string' },
                { name: 'type', label: 'Type', type: 'string' },
                { name: 'startDate', label: 'Start Date', type: 'string' },
                { name: 'endDate', label: 'End Date', type: 'string' },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'isCurrent', label: 'Current', type: 'boolean', default: false }
            ]
        },
        {
            name: 'verifiedResult',
            alias: 'Verified Results',
            primaryKey: 'idx',
            labeller: '{courseCode} - {courseName}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'profileId', label: 'Profile', type: 'integer', required: true,
                    ref: { table: 'studentProfile', field: 'idx' } },
                { name: 'courseCode', label: 'Course Code', type: 'string' },
                { name: 'courseName', label: 'Course Name', type: 'string' },
                { name: 'year', label: 'Year', type: 'integer' },
                { name: 'semester', label: 'Semester', type: 'string' },
                { name: 'mark', label: 'Mark', type: 'number' },
                { name: 'credits', label: 'Credits', type: 'integer' },
                { name: 'status', label: 'Status', type: 'string' },
                { name: 'includeInCv', label: 'Include in CV', type: 'boolean', default: true }
            ]
        },
        {
            name: 'opportunity',
            alias: 'Opportunities',
            primaryKey: 'idx',
            labeller: '{title}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'type', label: 'Type', type: 'string', required: true },
                { name: 'providerName', label: 'Provider', type: 'string' },
                { name: 'title', label: 'Title', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'deadline', label: 'Deadline', type: 'string' },
                { name: 'location', label: 'Location', type: 'string' },
                { name: 'isRemote', label: 'Remote', type: 'boolean', default: false },
                { name: 'salaryMin', label: 'Salary Min', type: 'number' },
                { name: 'salaryMax', label: 'Salary Max', type: 'number' },
                { name: 'fundingAmount', label: 'Funding Amount', type: 'string' },
                { name: 'coverage', label: 'Coverage', type: 'string' },
                { name: 'status', label: 'Status', type: 'string', default: 'draft' },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'opportunityRequirement',
            alias: 'Requirements',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'opportunityId', label: 'Opportunity', type: 'integer', required: true,
                    ref: { table: 'opportunity', field: 'idx' } },
                { name: 'requirementType', label: 'Type', type: 'string', required: true },
                { name: 'value', label: 'Value', type: 'string' },
                { name: 'isRequired', label: 'Required', type: 'boolean', default: true },
                { name: 'minValue', label: 'Min Value', type: 'number' }
            ]
        },
        {
            name: 'application',
            alias: 'Applications',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true },
                { name: 'targetType', label: 'Target Type', type: 'string' },
                { name: 'targetId', label: 'Target ID', type: 'integer' },
                { name: 'coverLetter', label: 'Cover Letter', type: 'text' },
                { name: 'status', label: 'Status', type: 'string', default: 'pending' },
                { name: 'matchScore', label: 'Match Score', type: 'number' },
                { name: 'appliedAt', label: 'Applied', type: 'datetime' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class CareerService extends Publome {
    constructor(config = {}) {
        super(CareerServiceSchema, config);
        this._registry = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Registry
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load and cache the career hub registry
     * @param {Object} [registryData] - Pre-loaded registry object
     * @returns {Object} Registry data
     */
    getCareerHubRegistry(registryData) {
        if (registryData) this._registry = registryData;
        return this._registry;
    }

    /**
     * Load registry from a JSON file path (fetch-based)
     * @param {string} basePath - Base path to registry file
     */
    async loadRegistry(basePath) {
        if (this._registry) return this._registry;
        const resp = await fetch(basePath);
        this._registry = await resp.json();
        return this._registry;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Profile
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get or create a student career profile
     * @param {number} memberId - Member ID
     * @returns {Publon} Profile record
     */
    getOrCreateProfile(memberId) {
        const existing = this.table('studentProfile').all()
            .find(p => p.get('memberId') === memberId);
        if (existing) return existing;

        return this.table('studentProfile').create({
            memberId,
            createdAt: new Date().toISOString()
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CV Blocks
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get CV blocks for a profile, sorted by sortOrder
     * @param {number} profileId - Profile idx
     * @returns {Array<Publon>}
     */
    getCVBlocks(profileId) {
        return this.table('cvBlock').all()
            .filter(b => b.get('profileId') === profileId)
            .sort((a, b) => (a.get('sortOrder') || 0) - (b.get('sortOrder') || 0));
    }

    /**
     * Add a CV block
     * @param {number} profileId - Profile idx
     * @param {Object} data - Block data (blockType, title, content, sortOrder)
     * @returns {Publon}
     */
    addCVBlock(profileId, data) {
        return this.table('cvBlock').create({
            profileId,
            ...data,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Update a CV block
     * @param {number} idx - Block idx
     * @param {Object} data - Fields to update
     * @returns {Publon|null}
     */
    updateCVBlock(idx, data) {
        const block = this.table('cvBlock').read(idx);
        if (!block) return null;
        block.setData(data);
        return block;
    }

    /**
     * Delete a CV block
     * @param {number} idx - Block idx
     */
    deleteCVBlock(idx) {
        this.table('cvBlock').delete(idx);
    }

    /**
     * Reorder CV blocks
     * @param {number} profileId - Profile idx
     * @param {number[]} blockIds - Ordered array of block idx values
     */
    reorderCVBlocks(profileId, blockIds) {
        blockIds.forEach((id, i) => {
            const block = this.table('cvBlock').read(id);
            if (block && block.get('profileId') === profileId) {
                block.set('sortOrder', i);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Verified Data (Programme + Results)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get student programme data for a profile
     * @param {number} profileId - Profile idx
     * @returns {Publon|null}
     */
    getStudentProgrammeData(profileId) {
        return this.table('studentProgrammeData').all()
            .find(d => d.get('profileId') === profileId) || null;
    }

    /**
     * Get verified results for a profile
     * @param {number} profileId - Profile idx
     * @param {boolean} [includeFailed=false] - Include failed results
     * @returns {Array<Publon>}
     */
    getVerifiedResults(profileId, includeFailed = false) {
        return this.table('verifiedResult').all().filter(r => {
            if (r.get('profileId') !== profileId) return false;
            if (!includeFailed && r.get('status') === 'Failed') return false;
            return true;
        });
    }

    /**
     * Toggle whether a result is included in the CV
     * @param {number} idx - Result idx
     * @param {boolean} include - Include in CV
     * @returns {Publon|null}
     */
    toggleResultInCv(idx, include) {
        const result = this.table('verifiedResult').read(idx);
        if (!result) return null;
        result.set('includeInCv', include);
        return result;
    }

    /**
     * Sync programme data from academic service for a student
     * @param {number} profileId - Profile idx
     * @param {Object} academicService - Academic service adapter
     * @param {number} memberId - Member ID
     */
    syncStudentProgrammeData(profileId, academicService, memberId) {
        // Placeholder — real implementation calls academicService
        // and populates studentProgrammeData + verifiedResult tables
    }

    /**
     * Sync results from academic service data
     * @param {number} profileId - Profile idx
     * @param {Object} academicService - Academic service
     * @param {Array} enrolments - Enrolment records
     * @param {Object} courseLookup - Course code → course data map
     * @param {Object} offeringLookup - Offering data map
     */
    syncFromAcademicService(profileId, academicService, enrolments, courseLookup, offeringLookup) {
        // Placeholder for institutional integration
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Skills
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get skills for a member
     * @param {number} memberId - Member ID
     * @returns {Array<Publon>}
     */
    getSkills(memberId) {
        return this.table('skillEntry').all()
            .filter(s => s.get('memberId') === memberId);
    }

    /**
     * Add a skill
     * @param {number} memberId - Member ID
     * @param {string} name - Skill name
     * @param {string} level - Proficiency level
     * @param {string} category - Skill category (technical, soft)
     * @returns {Publon}
     */
    addSkill(memberId, name, level, category) {
        return this.table('skillEntry').create({
            memberId,
            skillName: name,
            proficiency: level,
            category
        });
    }

    /**
     * Delete a skill
     * @param {number} idx - Skill idx
     */
    deleteSkill(idx) {
        this.table('skillEntry').delete(idx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Experience
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get experience entries for a member
     * @param {number} memberId - Member ID
     * @returns {Array<Publon>}
     */
    getExperience(memberId) {
        return this.table('experienceEntry').all()
            .filter(e => e.get('memberId') === memberId);
    }

    /**
     * Add an experience entry
     * @param {number} memberId - Member ID
     * @param {Object} data - Experience data
     * @returns {Publon}
     */
    addExperience(memberId, data) {
        return this.table('experienceEntry').create({
            memberId,
            ...data
        });
    }

    /**
     * Delete an experience entry
     * @param {number} idx - Experience idx
     */
    deleteExperience(idx) {
        this.table('experienceEntry').delete(idx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Opportunities
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get opportunities with optional filters
     * @param {Object} [filters] - { type, status, search }
     * @returns {Array<Publon>}
     */
    getOpportunities(filters = {}) {
        return this.table('opportunity').all().filter(o => {
            if (filters.type && filters.type !== 'all' && o.get('type') !== filters.type) return false;
            if (filters.status && o.get('status') !== filters.status) return false;
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const title = (o.get('title') || '').toLowerCase();
                const provider = (o.get('providerName') || '').toLowerCase();
                if (!title.includes(q) && !provider.includes(q)) return false;
            }
            return true;
        });
    }

    /**
     * Create an opportunity
     * @param {Object} data - Opportunity data
     * @returns {Publon}
     */
    createOpportunity(data) {
        return this.table('opportunity').create({
            ...data,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Update an opportunity
     * @param {number} idx - Opportunity idx
     * @param {Object} data - Fields to update
     * @returns {Publon|null}
     */
    updateOpportunity(idx, data) {
        const opp = this.table('opportunity').read(idx);
        if (!opp) return null;
        opp.setData(data);
        return opp;
    }

    /**
     * Get requirements for an opportunity
     * @param {number} oppId - Opportunity idx
     * @returns {Array<Publon>}
     */
    getOpportunityRequirements(oppId) {
        return this.table('opportunityRequirement').all()
            .filter(r => r.get('opportunityId') === oppId);
    }

    /**
     * Add a requirement to an opportunity
     * @param {number} oppId - Opportunity idx
     * @param {Object} data - Requirement data
     * @returns {Publon}
     */
    addOpportunityRequirement(oppId, data) {
        return this.table('opportunityRequirement').create({
            opportunityId: oppId,
            ...data
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Matching Engine
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get opportunities with match scores for a student profile
     * @param {number} profileId - Profile idx
     * @returns {Array<Object>} Opportunities with matchScore property
     */
    getMatchingOpportunities(profileId) {
        const profile = this.table('studentProfile').read(profileId);
        if (!profile) return [];

        const memberId = profile.get('memberId');
        const progData = this.getStudentProgrammeData(profileId);
        const skills = this.getSkills(memberId);
        const skillNames = skills.map(s => (s.get('skillName') || '').toLowerCase());

        const weights = this._registry?.matchScoreWeights || {
            qualification: 25, field: 20, nqfLevel: 15,
            skill: 10, gpa: 15, yearOfStudy: 5, deadline: 10
        };
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

        const published = this.getOpportunities({ status: 'published' });

        return published.map(opp => {
            const reqs = this.getOpportunityRequirements(opp.idx);
            let score = 0;

            reqs.forEach(req => {
                const type = req.get('requirementType');
                const value = req.get('value');
                const minVal = req.get('minValue');
                const w = weights[type] || 0;

                switch (type) {
                    case 'field':
                        if (progData && (profile.get('fieldOfStudy') || '').toLowerCase().includes((value || '').toLowerCase())) {
                            score += w;
                        }
                        break;
                    case 'nqfLevel':
                        if (progData && (progData.get('nqfLevel') || 0) >= (minVal || 0)) {
                            score += w;
                        }
                        break;
                    case 'skill':
                        if (skillNames.includes((value || '').toLowerCase())) {
                            score += w;
                        }
                        break;
                    case 'gpa':
                        if ((profile.get('gpa') || 0) >= (minVal || 0)) {
                            score += w;
                        }
                        break;
                    case 'yearOfStudy':
                        if (progData && (progData.get('yearOfStudy') || 0) >= (minVal || 0)) {
                            score += w;
                        }
                        break;
                    case 'qualification':
                        // Qualification type match — award if student has matching NQF level
                        if (progData && (progData.get('nqfLevel') || 0) >= 5) {
                            score += w;
                        }
                        break;
                    case 'deadline':
                        // Deadline relevance — award if deadline is in future
                        if (opp.get('deadline') && new Date(opp.get('deadline')) > new Date()) {
                            score += w;
                        }
                        break;
                }
            });

            // If no requirements defined, give a baseline score
            if (reqs.length === 0) {
                score = Math.round(totalWeight * 0.5);
            }

            const matchScore = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 50;

            // Return plain object with opportunity data + matchScore
            const oppData = opp.getData();
            oppData.matchScore = matchScore;
            return oppData;
        }).sort((a, b) => b.matchScore - a.matchScore);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Applications
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get applications for a member
     * @param {number} memberId - Member ID
     * @returns {Array<Publon>}
     */
    getApplications(memberId) {
        return this.table('application').all()
            .filter(a => a.get('memberId') === memberId);
    }

    /**
     * Apply to an opportunity
     * @param {number} memberId - Member ID
     * @param {string} type - Target type (opportunity)
     * @param {number} targetId - Target idx
     * @param {string} coverLetter - Cover letter text
     * @returns {Publon}
     */
    applyTo(memberId, type, targetId, coverLetter) {
        return this.table('application').create({
            memberId,
            targetType: type,
            targetId,
            coverLetter,
            status: 'pending',
            appliedAt: new Date().toISOString()
        });
    }

    /**
     * Get applicants for an opportunity
     * @param {number} oppId - Opportunity idx
     * @returns {Array<Publon>}
     */
    getOpportunityApplicants(oppId) {
        return this.table('application').all()
            .filter(a => a.get('targetId') === oppId && a.get('targetType') === 'opportunity');
    }

    /**
     * Update application status
     * @param {number} appIdx - Application idx
     * @param {string} status - New status
     * @returns {Publon|null}
     */
    updateApplicationStatus(appIdx, status) {
        const app = this.table('application').read(appIdx);
        if (!app) return null;
        app.set('status', status);
        return app;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Data
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load demo seed data for testrig
     * @param {number} memberId - Member ID for the demo student
     */
    seedDemoData(memberId) {
        // Profile
        const profile = this.getOrCreateProfile(memberId);
        profile.setData({
            headline: 'Computer Science Student | Aspiring Software Developer',
            bio: 'Passionate about software development with a focus on web technologies and machine learning.',
            gpa: 68,
            fieldOfStudy: 'Computer & Information Sciences'
        });

        // Programme data
        this.table('studentProgrammeData').create({
            profileId: profile.idx,
            programmeCode: 'NDIT',
            programmeName: 'ND: Information Technology',
            nqfLevel: 6,
            faculty: 'Applied Sciences',
            department: 'IT',
            creditsRequired: 480,
            creditsCompleted: 240,
            completionPercentage: 50,
            yearOfStudy: 2,
            expectedGraduation: '2027-06'
        });

        // Skills
        const skillData = [
            { name: 'Python', proficiency: 'advanced', category: 'technical' },
            { name: 'JavaScript', proficiency: 'intermediate', category: 'technical' },
            { name: 'SQL', proficiency: 'intermediate', category: 'technical' },
            { name: 'React', proficiency: 'beginner', category: 'technical' },
            { name: 'Machine Learning', proficiency: 'beginner', category: 'technical' },
            { name: 'Communication', proficiency: 'advanced', category: 'soft' },
            { name: 'Problem Solving', proficiency: 'advanced', category: 'soft' },
            { name: 'Teamwork', proficiency: 'intermediate', category: 'soft' }
        ];
        skillData.forEach(s => this.addSkill(memberId, s.name, s.proficiency, s.category));

        // Experience
        this.addExperience(memberId, { title: 'IT Tutor', organization: 'Student Academic Support', type: 'work', startDate: '2026-02', endDate: null, description: 'Tutoring first-year students in programming fundamentals.', isCurrent: true });
        this.addExperience(memberId, { title: 'Web Developer Intern', organization: 'TechStartup SA', type: 'internship', startDate: '2025-06', endDate: '2025-08', description: 'Built responsive web applications using React and Node.js.' });
        this.addExperience(memberId, { title: 'Community Tech Workshop Facilitator', organization: 'Code4Change NPO', type: 'volunteer', startDate: '2025-01', endDate: '2025-12', description: 'Taught basic coding skills to high school learners.' });

        // Verified results
        const results = [
            { code: 'ITDA201', name: 'Data Structures', mark: 72, year: 2025, semester: 'S2' },
            { code: 'ITSD201', name: 'Software Development 2', mark: 78, year: 2025, semester: 'S2' },
            { code: 'ITDB201', name: 'Database Design', mark: 65, year: 2025, semester: 'S1' },
            { code: 'ITPR201', name: 'Programming 2', mark: 81, year: 2025, semester: 'S1' },
            { code: 'MATH201', name: 'Mathematics 2', mark: 55, year: 2025, semester: 'S1' },
            { code: 'ITPR101', name: 'Programming 1', mark: 74, year: 2024, semester: 'S2' },
            { code: 'ITWB101', name: 'Web Development 1', mark: 82, year: 2024, semester: 'S2' },
            { code: 'MATH101', name: 'Mathematics 1', mark: 58, year: 2024, semester: 'S1' }
        ];
        results.forEach(r => {
            this.table('verifiedResult').create({
                profileId: profile.idx,
                courseCode: r.code,
                courseName: r.name,
                year: r.year,
                semester: r.semester,
                mark: r.mark,
                credits: 16,
                status: r.mark >= 50 ? 'Passed' : 'Failed',
                includeInCv: true
            });
        });

        // Opportunities
        const opps = [
            { type: 'bursary', title: 'Sasol Bursary for IT Students', providerName: 'Sasol Ltd', deadline: '2026-03-31', location: 'Sasolburg', isRemote: false, fundingAmount: 'R85,000/year', coverage: 'Full', status: 'published' },
            { type: 'job', title: 'Junior Software Developer', providerName: 'Dimension Data', deadline: '2026-04-15', location: 'Johannesburg', isRemote: true, salaryMin: 18000, salaryMax: 25000, status: 'published' },
            { type: 'internship', title: 'Data Science Intern', providerName: 'Standard Bank', deadline: '2026-03-20', location: 'Johannesburg', isRemote: false, salaryMin: 12000, salaryMax: 12000, status: 'published' },
            { type: 'bursary', title: 'MTN Foundation ICT Scholarship', providerName: 'MTN Group', deadline: '2026-04-30', location: 'Nationwide', isRemote: false, fundingAmount: 'R70,000/year', coverage: 'Tuition + Books', status: 'published' },
            { type: 'learnership', title: 'AWS Cloud Practitioner Learnership', providerName: 'Altron', deadline: '2026-05-15', location: 'Midrand', isRemote: true, salaryMin: 8500, salaryMax: 8500, status: 'published' },
            { type: 'job', title: 'Graduate IT Support Analyst', providerName: 'Discovery', deadline: '2026-04-01', location: 'Sandton', isRemote: false, salaryMin: 15000, salaryMax: 20000, status: 'published' },
            { type: 'internship', title: 'UX Research Intern', providerName: 'Takealot', deadline: '2026-03-25', location: 'Cape Town', isRemote: true, salaryMin: 10000, salaryMax: 10000, status: 'published' },
            { type: 'bursary', title: 'CHIETA Bursary Programme', providerName: 'CHIETA SETA', deadline: '2026-06-30', location: 'Nationwide', isRemote: false, fundingAmount: 'R60,000/year', coverage: 'Tuition', status: 'published' }
        ];

        opps.forEach(o => {
            const opp = this.createOpportunity(o);

            // Add requirements based on type
            if (o.type === 'bursary') {
                this.addOpportunityRequirement(opp.idx, { requirementType: 'nqfLevel', minValue: 5 });
                this.addOpportunityRequirement(opp.idx, { requirementType: 'field', value: 'Computer & Information Sciences' });
                this.addOpportunityRequirement(opp.idx, { requirementType: 'gpa', minValue: 55 });
            } else if (o.type === 'job' || o.type === 'internship') {
                this.addOpportunityRequirement(opp.idx, { requirementType: 'qualification', value: 'nationalDiploma' });
                this.addOpportunityRequirement(opp.idx, { requirementType: 'skill', value: 'Python' });
                this.addOpportunityRequirement(opp.idx, { requirementType: 'nqfLevel', minValue: 6 });
            } else if (o.type === 'learnership') {
                this.addOpportunityRequirement(opp.idx, { requirementType: 'nqfLevel', minValue: 5 });
            }
        });

        // Applications (apply to first 3 opportunities)
        const firstOpp = this.table('opportunity').all();
        if (firstOpp.length >= 3) {
            const app1 = this.applyTo(memberId, 'opportunity', firstOpp[0].idx, 'I am a dedicated IT student with strong academic performance...');
            app1.set('status', 'shortlisted');
            const app2 = this.applyTo(memberId, 'opportunity', firstOpp[2].idx, 'My passion for data science and machine learning...');
            app2.set('status', 'reviewed');
            this.applyTo(memberId, 'opportunity', firstOpp[4].idx, 'I am eager to develop cloud computing skills...');
        }

        return profile;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CareerService, CareerServiceSchema };
}
if (typeof window !== 'undefined') {
    window.CareerService = CareerService;
}
