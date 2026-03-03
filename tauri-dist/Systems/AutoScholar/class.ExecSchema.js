/**
 * ExecSchema — Publome schema + seed data for Executive Insight
 *
 * Defines 7 tables:
 *   entity, metricCategory, metric, metricObservation,
 *   intervention, pdsaCycle, note
 *
 * Usage:
 *   const publome = ExecSchema.create();           // empty
 *   ExecSchema.seed(publome);                      // with demo data
 *   ExecSchema.seedFromApi(publome, apiData);       // from DUT API
 */
class ExecSchema {

    static schema() {
        return {
            tables: [
                // ── Entity hierarchy ─────────────────────────────────────
                {
                    name: 'entity',
                    columns: {
                        idx:       { type: 'number', primaryKey: true },
                        code:      { type: 'string', required: true, label: 'Code' },
                        name:      { type: 'string', required: true, label: 'Name' },
                        type:      { type: 'string', label: 'Type', enum: ['institution', 'faculty', 'programme'] },
                        parentId:  { type: 'number', label: 'Parent', refTable: 'entity' },
                        icon:      { type: 'string', label: 'Icon' },
                        students:  { type: 'number', label: 'Students' }
                    },
                    labeller: '{name}',
                    selectionMode: 'single'
                },
                // ── ISO 21001 metric categories ─────────────────────────
                {
                    name: 'metricCategory',
                    columns: {
                        idx:   { type: 'number', primaryKey: true },
                        name:  { type: 'string', required: true, label: 'Category' },
                        icon:  { type: 'string', label: 'Icon' },
                        color: { type: 'string', label: 'Color' }
                    },
                    labeller: '{name}'
                },
                // ── Metric definitions ───────────────────────────────────
                {
                    name: 'metric',
                    columns: {
                        idx:              { type: 'number', primaryKey: true },
                        code:             { type: 'string', required: true, label: 'Code' },
                        name:             { type: 'string', required: true, label: 'Metric' },
                        metricCategoryId: { type: 'number', label: 'Category', refTable: 'metricCategory' },
                        unit:             { type: 'string', label: 'Unit', enum: ['%', 'count', 'ratio', 'score'] },
                        target:           { type: 'number', label: 'Target' },
                        benchmark:        { type: 'number', label: 'Benchmark' },
                        description:      { type: 'text', label: 'Description' }
                    },
                    labeller: '{name}',
                    uiSpec: { subtitleColumn: 'code' }
                },
                // ── Metric observations (values per entity per year) ────
                {
                    name: 'metricObservation',
                    columns: {
                        idx:       { type: 'number', primaryKey: true },
                        metricId:  { type: 'number', label: 'Metric', refTable: 'metric' },
                        entityId:  { type: 'number', label: 'Entity', refTable: 'entity' },
                        year:      { type: 'number', label: 'Year' },
                        value:     { type: 'number', label: 'Value' },
                        note:      { type: 'text', label: 'Notes' }
                    },
                    labeller: '{value}'
                },
                // ── Interventions catalog ────────────────────────────────
                {
                    name: 'intervention',
                    columns: {
                        idx:              { type: 'number', primaryKey: true },
                        metricId:         { type: 'number', label: 'Target Metric', refTable: 'metric' },
                        name:             { type: 'string', required: true, label: 'Intervention' },
                        category:         { type: 'string', label: 'Category', enum: ['academic', 'support', 'curriculum', 'assessment', 'technology'] },
                        evidenceLevel:    { type: 'string', label: 'Evidence', enum: ['strong', 'moderate', 'emerging'] },
                        description:      { type: 'text', label: 'Description' },
                        status:           { type: 'string', label: 'Status', enum: ['proposed', 'active', 'completed', 'paused'] }
                    },
                    labeller: '{name}'
                },
                // ── PDSA cycles ──────────────────────────────────────────
                {
                    name: 'pdsaCycle',
                    columns: {
                        idx:              { type: 'number', primaryKey: true },
                        interventionId:   { type: 'number', label: 'Intervention', refTable: 'intervention' },
                        entityId:         { type: 'number', label: 'Entity', refTable: 'entity' },
                        phase:            { type: 'string', label: 'Phase', enum: ['Plan', 'Do', 'Study', 'Act'] },
                        plan:             { type: 'text', label: 'Plan' },
                        doNotes:          { type: 'text', label: 'Do Notes' },
                        studyFindings:    { type: 'text', label: 'Study Findings' },
                        actDecision:      { type: 'text', label: 'Act Decision' },
                        startDate:        { type: 'date', label: 'Start Date' },
                        endDate:          { type: 'date', label: 'End Date' },
                        evidence:         { type: 'text', label: 'Evidence' },
                        status:           { type: 'string', label: 'Status', enum: ['active', 'completed', 'abandoned'] }
                    },
                    labeller: '{phase}: {plan}'
                },
                // ── Sector benchmarks ────────────────────────────────────
                {
                    name: 'sectorBenchmark',
                    columns: {
                        idx:       { type: 'number', primaryKey: true },
                        metricId:  { type: 'number', label: 'Metric', refTable: 'metric' },
                        year:      { type: 'number', label: 'Year' },
                        value:     { type: 'number', label: 'Value' },
                        source:    { type: 'string', label: 'Source', enum: ['HEMIS', 'CHE', 'institutional'] }
                    },
                    labeller: '{value}'
                },
                // ── Notes / observations ─────────────────────────────────
                {
                    name: 'note',
                    columns: {
                        idx:       { type: 'number', primaryKey: true },
                        entityId:  { type: 'number', label: 'Entity', refTable: 'entity' },
                        metricId:  { type: 'number', label: 'Metric', refTable: 'metric' },
                        content:   { type: 'text', required: true, label: 'Content' },
                        author:    { type: 'string', label: 'Author' },
                        createdAt: { type: 'date', label: 'Created' }
                    },
                    labeller: '{content}'
                }
            ]
        };
    }

    /** Create an empty Publome with the exec schema */
    static create() {
        return new Publome(ExecSchema.schema());
    }

    /** Populate publome with demo data */
    static seed(publome) {
        const data = ExecSchema._seedData();
        publome.loadSeedData(data);
        return publome;
    }

    /**
     * Populate entity table from DUT API data.
     * apiData = { faculties: [...], programmes: [...] }
     */
    static seedFromApi(publome, apiData) {
        const entities = [];
        let idx = 1;

        // Institution root
        const instName = window.AS_INSTITUTION?.institution?.name || 'Durban University of Technology';
        entities.push({ idx: idx++, code: 'DUT', name: instName, type: 'institution', parentId: null, icon: 'university', students: 0 });
        const instIdx = 1;

        // Faculties
        const facMap = new Map();
        if (apiData.faculties) {
            for (const f of apiData.faculties) {
                const fIdx = idx++;
                facMap.set(f.facultyCode, fIdx);
                entities.push({
                    idx: fIdx, code: f.facultyCode, name: f.facultyName,
                    type: 'faculty', parentId: instIdx,
                    icon: ExecSchema._facultyIcon(f.facultyName), students: 0
                });
            }
        }

        // Programmes
        let totalStudents = 0;
        if (apiData.programmes) {
            for (const p of apiData.programmes) {
                const parentFac = facMap.get(p.facultyCode) || instIdx;
                const stu = p.students || 0;
                totalStudents += stu;
                entities.push({
                    idx: idx++, code: p.programmeCode, name: p.programmeLabel || p.programmeCode,
                    type: 'programme', parentId: parentFac,
                    icon: 'book', students: stu
                });
            }
        }

        // Update institution student count
        entities[0].students = totalStudents;

        // Update faculty student counts
        for (const e of entities) {
            if (e.type === 'faculty') {
                e.students = entities.filter(c => c.parentId === e.idx).reduce((s, c) => s + (c.students || 0), 0);
            }
        }

        publome.loadSeedData({ entity: entities });
        return publome;
    }

    // ── Icon mapping ─────────────────────────────────────────────────────

    static _facultyIcon(name) {
        const n = (name || '').toLowerCase();
        if (n.includes('engineer') || n.includes('built env'))  return 'cogs';
        if (n.includes('health') || n.includes('nurs'))         return 'heartbeat';
        if (n.includes('educat'))                               return 'chalkboard-teacher';
        if (n.includes('account') || n.includes('informat'))    return 'calculator';
        if (n.includes('art') || n.includes('design'))          return 'palette';
        if (n.includes('manage') || n.includes('business'))     return 'briefcase';
        if (n.includes('science') || n.includes('applied'))     return 'flask';
        if (n.includes('law'))                                  return 'balance-scale';
        if (n.includes('humanit'))                              return 'book';
        return 'building';
    }

    // ── Seed data factory ────────────────────────────────────────────────

    static _seedData() {
        // ── Entities ─────────────────────────────────────────────────
        const entity = [
            { idx: 1,  code: 'DUT',       name: 'Durban University of Technology', type: 'institution', parentId: null, icon: 'university', students: 2652 },
            { idx: 2,  code: 'FAC-ENG',   name: 'Faculty of Engineering & Built Environment', type: 'faculty', parentId: 1, icon: 'cogs', students: 1089 },
            { idx: 3,  code: 'FAC-SCI',   name: 'Faculty of Applied Sciences', type: 'faculty', parentId: 1, icon: 'flask', students: 663 },
            { idx: 4,  code: 'FAC-ART',   name: 'Faculty of Arts & Design', type: 'faculty', parentId: 1, icon: 'palette', students: 285 },
            { idx: 5,  code: 'FAC-MGT',   name: 'Faculty of Management Sciences', type: 'faculty', parentId: 1, icon: 'briefcase', students: 315 },
            { idx: 6,  code: 'BENG-CIVIL',  name: 'BEng Civil Engineering',       type: 'programme', parentId: 2, icon: 'book', students: 245 },
            { idx: 7,  code: 'BENG-MECH',   name: 'BEng Mechanical Engineering',  type: 'programme', parentId: 2, icon: 'book', students: 312 },
            { idx: 8,  code: 'BENG-ELEC',   name: 'BEng Electrical Engineering',  type: 'programme', parentId: 2, icon: 'book', students: 198 },
            { idx: 9,  code: 'BENG-CHEM',   name: 'BEng Chemical Engineering',    type: 'programme', parentId: 2, icon: 'book', students: 167 },
            { idx: 10, code: 'BENG-IND',    name: 'BEng Industrial Engineering',  type: 'programme', parentId: 2, icon: 'book', students: 167 },
            { idx: 11, code: 'BSC-BIOTECH', name: 'BSc Biotechnology',            type: 'programme', parentId: 3, icon: 'book', students: 198 },
            { idx: 12, code: 'BSC-CHEM',    name: 'BSc Chemistry',                type: 'programme', parentId: 3, icon: 'book', students: 178 },
            { idx: 13, code: 'BSC-FOOD',    name: 'BSc Food Technology',           type: 'programme', parentId: 3, icon: 'book', students: 287 },
            { idx: 14, code: 'BA-DESIGN',   name: 'BA Design',                     type: 'programme', parentId: 4, icon: 'book', students: 285 },
            { idx: 15, code: 'BCOM-MGT',    name: 'BCom Management',               type: 'programme', parentId: 5, icon: 'book', students: 315 }
        ];

        // ── Metric Categories (ISO 21001 aligned) ────────────────────
        const metricCategory = [
            { idx: 1, name: 'Student Success',     icon: 'graduation-cap',      color: 'success' },
            { idx: 2, name: 'Quality Assurance',    icon: 'clipboard-check',     color: 'info' },
            { idx: 3, name: 'Teaching & Learning',  icon: 'chalkboard-teacher',  color: 'warning' },
            { idx: 4, name: 'Research',             icon: 'flask',               color: 'primary' }
        ];

        // ── Metrics ──────────────────────────────────────────────────
        const metric = [
            { idx: 1,  code: 'graduation-rate',         name: 'Graduation Rate',         metricCategoryId: 1, unit: '%',     target: 75,   benchmark: 70,  description: 'Percentage of enrolled students completing their qualification within minimum time + 2 years' },
            { idx: 2,  code: 'retention-rate',           name: 'Retention Rate',           metricCategoryId: 1, unit: '%',     target: 85,   benchmark: 80,  description: 'Percentage of students continuing from one academic year to the next' },
            { idx: 3,  code: 'course-pass-rate',         name: 'Course Pass Rate',         metricCategoryId: 1, unit: '%',     target: 70,   benchmark: 65,  description: 'Percentage of assessed students achieving 50% or above' },
            { idx: 4,  code: 'course-mean',              name: 'Course Mean',              metricCategoryId: 1, unit: '%',     target: 60,   benchmark: 55,  description: 'Weighted average mark across all assessed courses' },
            { idx: 5,  code: 'programme-accreditation',  name: 'Programme Accreditation',  metricCategoryId: 2, unit: '%',     target: 100,  benchmark: 95,  description: 'Percentage of programmes with current professional body accreditation' },
            { idx: 6,  code: 'stakeholder-satisfaction',  name: 'Stakeholder Satisfaction', metricCategoryId: 2, unit: 'score', target: 4.0,  benchmark: 3.5, description: 'Average satisfaction rating from student, employer and staff surveys (1-5 scale)' },
            { idx: 7,  code: 'audit-completion',         name: 'Audit Completion',         metricCategoryId: 2, unit: '%',     target: 100,  benchmark: 90,  description: 'Percentage of scheduled internal quality audits completed' },
            { idx: 8,  code: 'student-staff-ratio',       name: 'Student:Staff Ratio',     metricCategoryId: 3, unit: 'ratio', target: 25,   benchmark: 28,  description: 'Number of FTE students per FTE academic staff member' },
            { idx: 9,  code: 'teaching-evaluation',       name: 'Teaching Evaluation',     metricCategoryId: 3, unit: 'score', target: 4.0,  benchmark: 3.5, description: 'Average score from student teaching evaluations (1-5 scale)' },
            { idx: 10, code: 'curriculum-currency',        name: 'Curriculum Currency',     metricCategoryId: 3, unit: '%',     target: 100,  benchmark: 85,  description: 'Percentage of programmes reviewed within the last 5-year cycle' },
            { idx: 11, code: 'research-output',            name: 'Research Output',         metricCategoryId: 4, unit: 'ratio', target: 1.0,  benchmark: 0.7, description: 'Accredited research publications per FTE academic staff' },
            { idx: 12, code: 'grant-success',              name: 'Grant Success Rate',      metricCategoryId: 4, unit: '%',     target: 30,   benchmark: 20,  description: 'Percentage of grant applications that are funded' }
        ];

        // ── Metric Observations (per entity per year) ────────────────
        const metricObservation = ExecSchema._generateObservations(entity, metric);

        // ── Interventions ────────────────────────────────────────────
        const intervention = [
            { idx: 1,  metricId: 1,  name: 'Enhanced Academic Advising',   category: 'academic',   evidenceLevel: 'strong',   description: 'Proactive advising sessions each semester for all students below 60% CAR', status: 'active' },
            { idx: 2,  metricId: 2,  name: 'Early Alert System',           category: 'technology', evidenceLevel: 'strong',   description: 'Automated alerts after TM_1 for students scoring below 40%', status: 'active' },
            { idx: 3,  metricId: 3,  name: 'Supplemental Instruction (SI)', category: 'academic',  evidenceLevel: 'strong',   description: 'Peer-led SI sessions for high-risk courses with pass rates below 60%', status: 'active' },
            { idx: 4,  metricId: 3,  name: 'Tutorial Support Programme',   category: 'academic',   evidenceLevel: 'moderate', description: 'Weekly tutorial sessions with postgraduate tutors for foundational courses', status: 'active' },
            { idx: 5,  metricId: 2,  name: 'Peer Mentoring',              category: 'support',    evidenceLevel: 'moderate', description: 'Senior student mentors paired with first-year students', status: 'active' },
            { idx: 6,  metricId: 5,  name: 'Quality Management System',   category: 'curriculum', evidenceLevel: 'strong',   description: 'ISO 21001-aligned QMS implementation across all programmes', status: 'active' },
            { idx: 7,  metricId: 10, name: 'Cyclical Curriculum Review',   category: 'curriculum', evidenceLevel: 'strong',   description: 'Five-year cycle of programme review with industry advisory input', status: 'active' },
            { idx: 8,  metricId: 9,  name: 'Teaching Development Programme', category: 'academic', evidenceLevel: 'moderate', description: 'Professional development workshops and peer observation for academic staff', status: 'proposed' }
        ];

        // ── PDSA Cycles ──────────────────────────────────────────────
        const pdsaCycle = [
            { idx: 1, interventionId: 2, entityId: 2, phase: 'Do',    plan: 'Deploy early alert for Engineering faculty TM_1 results',                       doNotes: 'System configured, 45 alerts sent after TM_1 2025', studyFindings: null, actDecision: null, startDate: '2025-03-01', endDate: null, status: 'active' },
            { idx: 2, interventionId: 3, entityId: 6, phase: 'Study', plan: 'Pilot SI sessions for Civil Engineering foundational courses',                   doNotes: 'SI leaders trained, 12 sessions held', studyFindings: 'Pass rate improved 8% in pilot group vs control', actDecision: null, startDate: '2025-02-15', endDate: null, status: 'active' },
            { idx: 3, interventionId: 6, entityId: 1, phase: 'Plan',  plan: 'Implement ISO 21001 QMS framework across institution',                           doNotes: null, studyFindings: null, actDecision: null, startDate: '2025-06-01', endDate: null, status: 'active' },
            { idx: 4, interventionId: 7, entityId: 3, phase: 'Act',   plan: 'Complete curriculum review for Applied Sciences programmes',                      doNotes: 'All 3 programmes reviewed with industry panels', studyFindings: 'Identified 12 curriculum gaps, 3 programmes updated', actDecision: 'Adopt updated curricula for 2026, schedule next review 2030', startDate: '2024-01-15', endDate: '2025-05-30', status: 'completed' }
        ];

        // ── Notes ────────────────────────────────────────────────────
        const note = [
            { idx: 1, entityId: 1, metricId: 3, content: 'Institution-wide pass rate trending downward over 3 years. Engineering and Applied Sciences most affected.', author: 'DVC Academic', createdAt: '2025-06-15' },
            { idx: 2, entityId: 2, metricId: 3, content: 'Engineering pass rate drop correlates with increased enrolment without proportional staff increase.', author: 'Dean of Engineering', createdAt: '2025-06-20' },
            { idx: 3, entityId: 6, metricId: 2, content: 'Civil Engineering retention improved after implementing peer mentoring in 2024.', author: 'Programme Coordinator', createdAt: '2025-04-10' }
        ];

        // ── Sector Benchmarks (published UoT averages) ──────────
        const sectorBenchmark = [];
        let sbIdx = 1;
        const benchmarks = {
            1: { 2023: 62, 2024: 63, 2025: 64 },       // graduation-rate
            2: { 2023: 78, 2024: 79, 2025: 80 },       // retention-rate
            3: { 2023: 63, 2024: 64, 2025: 65 },       // course-pass-rate
            4: { 2023: 53, 2024: 54, 2025: 55 },       // course-mean
            8: { 2023: 27, 2024: 27, 2025: 28 },       // student-staff-ratio
            11: { 2023: 0.6, 2024: 0.65, 2025: 0.7 }   // research-output
        };
        for (const [metricId, yearVals] of Object.entries(benchmarks)) {
            for (const [yr, val] of Object.entries(yearVals)) {
                sectorBenchmark.push({ idx: sbIdx++, metricId: parseInt(metricId), year: parseInt(yr), value: val, source: 'HEMIS' });
            }
        }

        return { entity, metricCategory, metric, metricObservation, intervention, pdsaCycle, note, sectorBenchmark };
    }

    // ── Generate realistic metric observations ───────────────────────

    static _generateObservations(entities, metrics) {
        const obs = [];
        let idx = 1;
        const years = [2023, 2024, 2025];

        // Base values per metric code (institution-level, will vary by entity)
        const bases = {
            'graduation-rate':        { base: 65, trend: 1.5, noise: 4 },
            'retention-rate':          { base: 80, trend: 0.8, noise: 3 },
            'course-pass-rate':        { base: 67, trend: 1.0, noise: 5 },
            'course-mean':             { base: 56, trend: 0.5, noise: 4 },
            'programme-accreditation': { base: 90, trend: 2.0, noise: 5 },
            'stakeholder-satisfaction': { base: 3.6, trend: 0.1, noise: 0.3 },
            'audit-completion':        { base: 85, trend: 3.0, noise: 5 },
            'student-staff-ratio':     { base: 26, trend: -0.5, noise: 2 },
            'teaching-evaluation':     { base: 3.5, trend: 0.1, noise: 0.2 },
            'curriculum-currency':     { base: 78, trend: 4.0, noise: 5 },
            'research-output':         { base: 0.6, trend: 0.05, noise: 0.15 },
            'grant-success':           { base: 22, trend: 1.5, noise: 4 }
        };

        // Entity-level offsets (how much better/worse than base)
        const entityOffsets = {
            'DUT': 0,
            'FAC-ENG': -2,   'FAC-SCI': 1,    'FAC-ART': 3,     'FAC-MGT': 2,
            'BENG-CIVIL': -3, 'BENG-MECH': -1, 'BENG-ELEC': -4, 'BENG-CHEM': 2,
            'BENG-IND': 1,   'BSC-BIOTECH': 3, 'BSC-CHEM': 0,   'BSC-FOOD': -1,
            'BA-DESIGN': 4,  'BCOM-MGT': 2
        };

        // Deterministic pseudo-random from seed
        const seededRand = (seed) => {
            let x = Math.sin(seed * 9301 + 49297) * 0.5 + 0.5;
            return x;
        };

        for (const m of metrics) {
            const cfg = bases[m.code];
            if (!cfg) continue;
            let seed = m.idx * 100;

            for (const year of years) {
                const yearOffset = (year - 2023) * cfg.trend;

                for (const e of entities) {
                    const entOffset = (entityOffsets[e.code] || 0);
                    // Scale offset to metric's range
                    const scaledOffset = m.unit === 'score' ? entOffset * 0.05 :
                                         m.unit === 'ratio' ? entOffset * 0.03 : entOffset;
                    const noise = (seededRand(seed++) - 0.5) * 2 * cfg.noise;
                    let value = cfg.base + yearOffset + scaledOffset + noise;

                    // Clamp to reasonable ranges
                    if (m.unit === '%')     value = Math.max(0, Math.min(100, value));
                    if (m.unit === 'score') value = Math.max(1, Math.min(5, value));
                    if (m.unit === 'ratio') value = Math.max(0, value);
                    if (m.unit === 'count') value = Math.max(0, Math.round(value));

                    // Round appropriately
                    value = m.unit === 'score' || m.unit === 'ratio'
                        ? Math.round(value * 10) / 10
                        : Math.round(value * 10) / 10;

                    obs.push({ idx, metricId: m.idx, entityId: e.idx, year, value });
                    idx++;
                }
            }
        }

        return obs;
    }
}
