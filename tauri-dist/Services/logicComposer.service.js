/**
 * LogicComposerService — General-purpose hierarchical rule tree composition and evaluation engine
 *
 * Composes logic trees from connector nodes (AND, OR, anyNof, atLeastTotal) and
 * criterion leaf nodes. Recursively evaluates entity data against the tree,
 * collecting positive/negative evidence at each level, and produces structured
 * natural-language pass/fail reports.
 *
 * Tables:
 * - lcComposition: Named rule compositions (e.g. "ECSA GA1 Exit Level")
 * - lcNode: Tree nodes — connectors and criteria with self-referential parentId
 * - lcTemplate: Reusable subtree patterns stored as JSON
 * - lcVersion: Versioned snapshots of composition trees
 * - lcRun: Evaluation run records (single or batch)
 * - lcResult: Per-node evaluation results linked to a run
 *
 * @example
 * const svc = new LogicComposerService();
 * ServiceRegistry.register('logicComposer', svc, { alias: 'LogicComposerService' });
 * svc.seedDefaults();
 * const result = svc.evaluate(1, { courseResult: { MATH101: { finalMark: 65 } } });
 */

// Schema Definition
const LogicComposerServiceSchema = {
    name: 'logicComposer',
    prefix: 'lc',
    alias: 'LogicComposerService',
    version: '2.0.0',

    tables: [
        {
            name: 'lcComposition',
            alias: 'Logic Compositions',
            primaryKey: 'idx',
            labeller: '{code}',
            columns: [
                { name: 'idx', label: 'Idx', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'category', label: 'Category', type: 'string' },
                { name: 'isActive', label: 'Is Active', type: 'boolean', default: true },
                { name: 'createdBy', label: 'Created By', type: 'integer', ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created At', type: 'datetime' },
                { name: 'updatedAt', label: 'Updated At', type: 'datetime' }
            ]
        },
        {
            name: 'lcNode',
            alias: 'Logic Nodes',
            primaryKey: 'idx',
            labeller: '{label}',
            columns: [
                { name: 'idx', label: 'Idx', type: 'integer', auto: true },
                { name: 'compositionId', label: 'Composition', type: 'integer', required: true, ref: { table: 'lcComposition', field: 'idx' } },
                { name: 'parentId', label: 'Parent Node', type: 'integer', ref: { table: 'lcNode', field: 'idx' } },
                { name: 'nodeType', label: 'Node Type', type: 'string', required: true, options: ['AND', 'OR', 'anyNof', 'minTotal', 'maxTotal', 'criterion'] },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'sortOrder', label: 'Sort Order', type: 'integer', default: 0 },
                { name: 'nRequired', label: 'N Required', type: 'integer' },
                { name: 'metric', label: 'Metric', type: 'string', options: ['credits', 'count', 'sum', 'average'] },
                { name: 'threshold', label: 'Threshold', type: 'number' },
                { name: 'attrPath', label: 'Attr Path', type: 'string' },
                { name: 'operator', label: 'Operator', type: 'string', options: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'isTrue', 'isFalse'] },
                { name: 'value', label: 'Value', type: 'string' },
                { name: 'courseCode', label: 'Course Code', type: 'string' },
                { name: 'credits', label: 'Credits', type: 'number' }
            ]
        },
        {
            name: 'lcTemplate',
            alias: 'Logic Templates',
            primaryKey: 'idx',
            labeller: '{code}',
            columns: [
                { name: 'idx', label: 'Idx', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'category', label: 'Category', type: 'string' },
                { name: 'treeJson', label: 'Tree Json', type: 'json' },
                { name: 'createdAt', label: 'Created At', type: 'datetime' }
            ]
        },
        {
            name: 'lcVersion',
            alias: 'Logic Versions',
            primaryKey: 'idx',
            labeller: '{label}',
            columns: [
                { name: 'idx', label: 'Idx', type: 'integer', auto: true },
                { name: 'compositionId', label: 'Composition', type: 'integer', required: true, ref: { table: 'lcComposition', field: 'idx' } },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'versionNumber', label: 'Version Number', type: 'integer', required: true },
                { name: 'treeJson', label: 'Tree Json', type: 'json' },
                { name: 'nodeCount', label: 'Node Count', type: 'integer' },
                { name: 'createdBy', label: 'Created By', type: 'integer', ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created At', type: 'datetime' }
            ]
        },
        {
            name: 'lcRun',
            alias: 'Evaluation Runs',
            primaryKey: 'idx',
            labeller: '{targetLabel}',
            columns: [
                { name: 'idx', label: 'Idx', type: 'integer', auto: true },
                { name: 'compositionId', label: 'Composition', type: 'integer', required: true, ref: { table: 'lcComposition', field: 'idx' } },
                { name: 'mode', label: 'Mode', type: 'string', options: ['single', 'batch'] },
                { name: 'targetId', label: 'Target Id', type: 'string' },
                { name: 'targetLabel', label: 'Target Label', type: 'string' },
                { name: 'passed', label: 'Passed', type: 'boolean' },
                { name: 'score', label: 'Score', type: 'number' },
                { name: 'reportPositive', label: 'Report Positive', type: 'text' },
                { name: 'reportNegative', label: 'Report Negative', type: 'text' },
                { name: 'reportSummary', label: 'Report Summary', type: 'text' },
                { name: 'runAt', label: 'Run At', type: 'datetime' }
            ]
        },
        {
            name: 'lcResult',
            alias: 'Evaluation Results',
            primaryKey: 'idx',
            labeller: '{actual}',
            columns: [
                { name: 'idx', label: 'Idx', type: 'integer', auto: true },
                { name: 'runId', label: 'Run', type: 'integer', required: true, ref: { table: 'lcRun', field: 'idx' } },
                { name: 'nodeId', label: 'Node', type: 'integer', required: true, ref: { table: 'lcNode', field: 'idx' } },
                { name: 'passed', label: 'Passed', type: 'boolean' },
                { name: 'score', label: 'Score', type: 'number' },
                { name: 'actual', label: 'Actual', type: 'string' },
                { name: 'expected', label: 'Expected', type: 'string' },
                { name: 'positiveNotes', label: 'Positive Notes', type: 'json' },
                { name: 'negativeNotes', label: 'Negative Notes', type: 'json' }
            ]
        }
    ]
};

class LogicComposerService extends Publome {

    constructor(config) {
        super(LogicComposerServiceSchema, config);
    }

    // ── Field Mappings ────────────────────────────────────────────────────
    // Domain knowledge: which fields each node type needs in an editor form.
    // Consumed by UIBinding's fieldMapping option.

    // Sample entity for demo evaluation — exercises all seeded compositions
    // including deeply nested Full Graduate Assessment (5 levels, mixed connectors)
    static sampleEntityData = {
        courseResult: {
            MATH201: { finalMark: 65 },
            MATH301: { finalMark: 58 },
            STAT201: { finalMark: 62 },
            ENEL3DP: { finalMark: 72 },
            MECH3AB: { finalMark: 55 },
            CIVL201: { finalMark: 48 },
            MATH101: { finalMark: 68 },
            PHYS101: { finalMark: 45 }
        },
        workExperience: {
            internshipMonths: 4,
            projectCount: 5,
            industryHours: 280
        },
        portfolio: {
            hasCV: true,
            hasTranscript: true,
            evidenceCount: 7,
            hasReflection: true,
            hasPresentation: false,
            hasReport: true
        }
    };

    static nodeFieldMapping = {
        discriminator: 'nodeType',
        hidden: ['compositionId', 'parentId', 'sortOrder'],
        common: ['label'],
        profiles: {
            AND:       { fields: [] },
            OR:        { fields: [] },
            anyNof:    { fields: ['nRequired'] },
            minTotal:  { fields: ['metric', 'threshold'] },
            maxTotal:  { fields: ['metric', 'threshold'] },
            criterion: { fields: ['attrPath', 'operator', 'value', 'courseCode', 'credits'] }
        }
    };

    // ── API Connection ────────────────────────────────────────────────────

    connectApi(config = {}) {
        if (!config.apiUrl) throw new Error('apiUrl is required');
        const baseEndpoint = config.apiEndpoint || '/api/v1/logicComposer';
        const bindings = {};
        ['lcComposition', 'lcNode', 'lcTemplate', 'lcVersion', 'lcRun', 'lcResult'].forEach(tableName => {
            bindings[tableName] = new ApiBinding(this.table(tableName), {
                apiUrl: config.apiUrl,
                endpoint: `${baseEndpoint}/${tableName}`,
                apiToken: config.apiToken
            });
        });
        return bindings;
    }

    // ── Seed Data ────────────────────────────────────────────────────────

    seedDefaults() {
        if (this.table('lcComposition').all().length > 0) return;

        // ── Composition 1: ECSA GA1 Problem Solving (Exit Level) ──
        const comp1 = this.table('lcComposition').create({
            code: 'ECSA-GA1-EXIT', label: 'GA1 Problem Solving — Exit Level',
            description: 'ECSA Graduate Attribute 1: Demonstrate competence to identify, assess, formulate and solve divergent engineering problems creatively and innovatively.',
            category: 'ECSA', isActive: true, createdBy: 1
        });

        // Root: AND — all sub-criteria must pass
        const ga1Root = this.table('lcNode').create({
            compositionId: comp1.idx, parentId: null, nodeType: 'AND',
            label: 'GA1 Exit Level Requirements', sortOrder: 0
        });

        // Sub-criterion 1: anyNof — at least 2 of 3 problem-solving courses passed
        const ga1Any = this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Root.idx, nodeType: 'anyNof',
            label: 'Problem Solving Courses (2 of 3)', sortOrder: 1, nRequired: 2
        });
        this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Any.idx, nodeType: 'criterion',
            label: 'MATH201 Final Mark >= 50', sortOrder: 1,
            attrPath: 'courseResult.MATH201.finalMark', operator: 'gte', value: '50',
            courseCode: 'MATH201', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Any.idx, nodeType: 'criterion',
            label: 'ENEL3DP Final Mark >= 50', sortOrder: 2,
            attrPath: 'courseResult.ENEL3DP.finalMark', operator: 'gte', value: '50',
            courseCode: 'ENEL3DP', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Any.idx, nodeType: 'criterion',
            label: 'MECH3AB Final Mark >= 50', sortOrder: 3,
            attrPath: 'courseResult.MECH3AB.finalMark', operator: 'gte', value: '50',
            courseCode: 'MECH3AB', credits: 16
        });

        // Sub-criterion 2: atLeastTotal — minimum 32 credits from problem-solving courses
        const ga1Credits = this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Root.idx, nodeType: 'minTotal',
            label: 'Minimum 32 Credits in Problem Solving', sortOrder: 2,
            metric: 'credits', threshold: 32
        });
        this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Credits.idx, nodeType: 'criterion',
            label: 'MATH201 Passed', sortOrder: 1,
            attrPath: 'courseResult.MATH201.finalMark', operator: 'gte', value: '50',
            courseCode: 'MATH201', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Credits.idx, nodeType: 'criterion',
            label: 'ENEL3DP Passed', sortOrder: 2,
            attrPath: 'courseResult.ENEL3DP.finalMark', operator: 'gte', value: '50',
            courseCode: 'ENEL3DP', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp1.idx, parentId: ga1Credits.idx, nodeType: 'criterion',
            label: 'MECH3AB Passed', sortOrder: 3,
            attrPath: 'courseResult.MECH3AB.finalMark', operator: 'gte', value: '50',
            courseCode: 'MECH3AB', credits: 16
        });

        // ── Composition 2: ECSA GA2 Application of Knowledge (Developed) ──
        const comp2 = this.table('lcComposition').create({
            code: 'ECSA-GA2-DEV', label: 'GA2 Application of Knowledge — Developed',
            description: 'ECSA Graduate Attribute 2: Demonstrate competence to apply knowledge of mathematics, basic science and engineering sciences from first principles to solve engineering problems.',
            category: 'ECSA', isActive: true, createdBy: 1
        });

        const ga2Root = this.table('lcNode').create({
            compositionId: comp2.idx, parentId: null, nodeType: 'OR',
            label: 'GA2 Developed Level (any path)', sortOrder: 0
        });
        this.table('lcNode').create({
            compositionId: comp2.idx, parentId: ga2Root.idx, nodeType: 'criterion',
            label: 'MATH101 Final Mark >= 60', sortOrder: 1,
            attrPath: 'courseResult.MATH101.finalMark', operator: 'gte', value: '60',
            courseCode: 'MATH101', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp2.idx, parentId: ga2Root.idx, nodeType: 'criterion',
            label: 'PHYS101 Final Mark >= 60', sortOrder: 2,
            attrPath: 'courseResult.PHYS101.finalMark', operator: 'gte', value: '60',
            courseCode: 'PHYS101', credits: 16
        });

        // ── Composition 3: Portfolio Evidence Check ──
        const comp3 = this.table('lcComposition').create({
            code: 'PORTFOLIO-CHECK', label: 'Portfolio Evidence Check',
            description: 'Verify that a student portfolio contains required evidence items.',
            category: 'Portfolio', isActive: true, createdBy: 1
        });

        const portRoot = this.table('lcNode').create({
            compositionId: comp3.idx, parentId: null, nodeType: 'AND',
            label: 'All Portfolio Items Required', sortOrder: 0
        });
        this.table('lcNode').create({
            compositionId: comp3.idx, parentId: portRoot.idx, nodeType: 'criterion',
            label: 'Has CV', sortOrder: 1,
            attrPath: 'portfolio.hasCV', operator: 'isTrue', value: 'true'
        });
        this.table('lcNode').create({
            compositionId: comp3.idx, parentId: portRoot.idx, nodeType: 'criterion',
            label: 'Has Transcript', sortOrder: 2,
            attrPath: 'portfolio.hasTranscript', operator: 'isTrue', value: 'true'
        });
        this.table('lcNode').create({
            compositionId: comp3.idx, parentId: portRoot.idx, nodeType: 'criterion',
            label: 'Evidence Count >= 5', sortOrder: 3,
            attrPath: 'portfolio.evidenceCount', operator: 'gte', value: '5'
        });

        // ── Composition 4: Full Graduate Assessment — deeply nested (5 levels) ──
        // Demonstrates true recursive evaluation with AND→OR→AND→criterion nesting
        const comp4 = this.table('lcComposition').create({
            code: 'GRAD-FULL', label: 'Full Graduate Assessment',
            description: 'Comprehensive 5-level assessment covering academic competence (with alternative mathematics tracks), professional practice (internship or alternative path), and portfolio evidence. Demonstrates deeply nested recursive composition.',
            category: 'ECSA', isActive: true, createdBy: 1
        });

        // Level 0: Root AND — all three pillars must pass
        const gradRoot = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: null, nodeType: 'AND',
            label: 'Full Graduate Assessment', sortOrder: 0
        });

        // ── Level 1: Academic Competence (AND) ──
        const academic = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: gradRoot.idx, nodeType: 'AND',
            label: 'Academic Competence', sortOrder: 1
        });

        // Level 2: Mathematics Pathway (OR — choose pure or applied track)
        const mathPathway = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: academic.idx, nodeType: 'OR',
            label: 'Mathematics Pathway (either track)', sortOrder: 1
        });

        // Level 3: Pure Mathematics Track (AND)
        const pureMath = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: mathPathway.idx, nodeType: 'AND',
            label: 'Pure Mathematics Track', sortOrder: 1
        });
        // Level 4: criteria (deepest nesting)
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: pureMath.idx, nodeType: 'criterion',
            label: 'MATH201 >= 60 (Pure)', sortOrder: 1,
            attrPath: 'courseResult.MATH201.finalMark', operator: 'gte', value: '60',
            courseCode: 'MATH201', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: pureMath.idx, nodeType: 'criterion',
            label: 'MATH301 >= 50', sortOrder: 2,
            attrPath: 'courseResult.MATH301.finalMark', operator: 'gte', value: '50',
            courseCode: 'MATH301', credits: 16
        });

        // Level 3: Applied Mathematics Track (AND)
        const appliedMath = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: mathPathway.idx, nodeType: 'AND',
            label: 'Applied Mathematics Track', sortOrder: 2
        });
        // Level 4: criteria
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: appliedMath.idx, nodeType: 'criterion',
            label: 'MATH201 >= 50 (Applied)', sortOrder: 1,
            attrPath: 'courseResult.MATH201.finalMark', operator: 'gte', value: '50',
            courseCode: 'MATH201', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: appliedMath.idx, nodeType: 'criterion',
            label: 'STAT201 >= 55', sortOrder: 2,
            attrPath: 'courseResult.STAT201.finalMark', operator: 'gte', value: '55',
            courseCode: 'STAT201', credits: 16
        });

        // Level 2: Engineering Sciences (anyNof 2 of 3)
        const engSci = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: academic.idx, nodeType: 'anyNof',
            label: 'Engineering Sciences (2 of 3)', sortOrder: 2, nRequired: 2
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: engSci.idx, nodeType: 'criterion',
            label: 'ENEL3DP >= 50', sortOrder: 1,
            attrPath: 'courseResult.ENEL3DP.finalMark', operator: 'gte', value: '50',
            courseCode: 'ENEL3DP', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: engSci.idx, nodeType: 'criterion',
            label: 'MECH3AB >= 50', sortOrder: 2,
            attrPath: 'courseResult.MECH3AB.finalMark', operator: 'gte', value: '50',
            courseCode: 'MECH3AB', credits: 16
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: engSci.idx, nodeType: 'criterion',
            label: 'CIVL201 >= 50', sortOrder: 3,
            attrPath: 'courseResult.CIVL201.finalMark', operator: 'gte', value: '50',
            courseCode: 'CIVL201', credits: 16
        });

        // ── Level 1: Professional Practice (AND) ──
        const professional = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: gradRoot.idx, nodeType: 'AND',
            label: 'Professional Practice', sortOrder: 2
        });

        // Level 2: Work Experience (OR — internship or alternative)
        const workExp = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: professional.idx, nodeType: 'OR',
            label: 'Work Experience (either path)', sortOrder: 1
        });
        // Level 3: Direct internship
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: workExp.idx, nodeType: 'criterion',
            label: 'Internship >= 6 months', sortOrder: 1,
            attrPath: 'workExperience.internshipMonths', operator: 'gte', value: '6'
        });
        // Level 3: Alternative path (AND)
        const altPath = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: workExp.idx, nodeType: 'AND',
            label: 'Alternative Practice Path', sortOrder: 2
        });
        // Level 4: criteria (deepest nesting)
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: altPath.idx, nodeType: 'criterion',
            label: 'Project Count >= 3', sortOrder: 1,
            attrPath: 'workExperience.projectCount', operator: 'gte', value: '3'
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: altPath.idx, nodeType: 'criterion',
            label: 'Industry Hours >= 200', sortOrder: 2,
            attrPath: 'workExperience.industryHours', operator: 'gte', value: '200'
        });

        // Level 2: Portfolio Evidence (anyNof 2 of 3)
        const evidence = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: professional.idx, nodeType: 'anyNof',
            label: 'Portfolio Evidence (2 of 3)', sortOrder: 2, nRequired: 2
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: evidence.idx, nodeType: 'criterion',
            label: 'Has Reflection Report', sortOrder: 1,
            attrPath: 'portfolio.hasReflection', operator: 'isTrue', value: 'true'
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: evidence.idx, nodeType: 'criterion',
            label: 'Has Presentation', sortOrder: 2,
            attrPath: 'portfolio.hasPresentation', operator: 'isTrue', value: 'true'
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: evidence.idx, nodeType: 'criterion',
            label: 'Has Technical Report', sortOrder: 3,
            attrPath: 'portfolio.hasReport', operator: 'isTrue', value: 'true'
        });

        // ── Level 1: Required Documents (AND) ──
        const docs = this.table('lcNode').create({
            compositionId: comp4.idx, parentId: gradRoot.idx, nodeType: 'AND',
            label: 'Required Documents', sortOrder: 3
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: docs.idx, nodeType: 'criterion',
            label: 'Has CV', sortOrder: 1,
            attrPath: 'portfolio.hasCV', operator: 'isTrue', value: 'true'
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: docs.idx, nodeType: 'criterion',
            label: 'Has Transcript', sortOrder: 2,
            attrPath: 'portfolio.hasTranscript', operator: 'isTrue', value: 'true'
        });
        this.table('lcNode').create({
            compositionId: comp4.idx, parentId: docs.idx, nodeType: 'criterion',
            label: 'Evidence Count >= 5', sortOrder: 3,
            attrPath: 'portfolio.evidenceCount', operator: 'gte', value: '5'
        });

        // ── Templates ──
        this.table('lcTemplate').create({
            code: 'PASS-COURSE', label: 'Single Course Pass',
            description: 'Template: criterion node checking a single course final mark >= threshold',
            category: 'Basic',
            treeJson: JSON.stringify({
                nodeType: 'criterion', label: '{courseCode} Pass',
                attrPath: 'courseResult.{courseCode}.finalMark', operator: 'gte', value: '50'
            })
        });
        this.table('lcTemplate').create({
            code: 'N-OF-M', label: 'N of M Selector',
            description: 'Template: anyNof connector requiring N of M child criteria to pass',
            category: 'Connector',
            treeJson: JSON.stringify({
                nodeType: 'anyNof', label: '{n} of {m} required', nRequired: 2,
                children: [
                    { nodeType: 'criterion', label: 'Criterion 1', attrPath: '', operator: 'gte', value: '' },
                    { nodeType: 'criterion', label: 'Criterion 2', attrPath: '', operator: 'gte', value: '' },
                    { nodeType: 'criterion', label: 'Criterion 3', attrPath: '', operator: 'gte', value: '' }
                ]
            })
        });

        // ── Versions ──
        this.table('lcVersion').create({
            compositionId: comp1.idx, label: 'Initial Version', versionNumber: 1,
            treeJson: JSON.stringify(this.getTree(comp1.idx)),
            nodeCount: this.table('lcNode').all().filter(n => n.get('compositionId') === comp1.idx).length,
            createdBy: 1
        });
    }

    // ── Composition Management ───────────────────────────────────────────

    createComposition(data) {
        const now = new Date().toISOString();
        return this.table('lcComposition').create({
            ...data,
            isActive: data.isActive !== undefined ? data.isActive : true,
            createdAt: now,
            updatedAt: now
        });
    }

    getComposition(code) {
        return this.table('lcComposition').find(c => c.get('code') === code);
    }

    // ── Node Management ──────────────────────────────────────────────────

    createNode(data) {
        if (data.parentId) {
            const parent = this.table('lcNode').read(data.parentId);
            if (parent && parent.get('nodeType') === 'criterion') {
                throw new Error('Cannot add children to a criterion node — criterion nodes are atomic leaves');
            }
        }
        return this.table('lcNode').create({
            ...data,
            sortOrder: data.sortOrder || 0
        });
    }

    getRootNodes(compositionId) {
        return this.table('lcNode').all()
            .filter(n => n.get('compositionId') === compositionId && !n.get('parentId'))
            .sort((a, b) => (a.get('sortOrder') || 0) - (b.get('sortOrder') || 0));
    }

    getChildren(nodeId) {
        return this.table('lcNode').all()
            .filter(n => n.get('parentId') === nodeId)
            .sort((a, b) => (a.get('sortOrder') || 0) - (b.get('sortOrder') || 0));
    }

    getTree(compositionId) {
        const roots = this.getRootNodes(compositionId);
        return roots.map(root => this._buildSubtree(root));
    }

    _buildSubtree(node) {
        const data = node.getData();
        const children = this.getChildren(node.idx);
        if (children.length > 0) {
            data.children = children.map(child => this._buildSubtree(child));
        }
        return data;
    }

    moveNode(nodeId, newParentId, sortOrder) {
        if (newParentId !== null && this._isAncestor(nodeId, newParentId)) {
            throw new Error('Cannot move node to its own descendant — cycle detected');
        }
        if (newParentId !== null) {
            const parent = this.table('lcNode').read(newParentId);
            if (parent && parent.get('nodeType') === 'criterion') {
                throw new Error('Cannot move node under a criterion — criterion nodes are atomic leaves');
            }
        }
        const updates = { parentId: newParentId };
        if (sortOrder !== undefined) updates.sortOrder = sortOrder;
        return this.table('lcNode').update(nodeId, updates);
    }

    _isAncestor(potentialAncestorId, nodeId) {
        let current = this.table('lcNode').read(nodeId);
        while (current) {
            if (current.idx === potentialAncestorId) return true;
            const pid = current.get('parentId');
            if (!pid) return false;
            current = this.table('lcNode').read(pid);
        }
        return false;
    }

    deleteNode(nodeId, recursive = false) {
        if (recursive) {
            const children = this.getChildren(nodeId);
            children.forEach(child => this.deleteNode(child.idx, true));
        } else {
            const children = this.getChildren(nodeId);
            const node = this.table('lcNode').read(nodeId);
            const parentId = node ? node.get('parentId') : null;
            children.forEach(child => {
                this.table('lcNode').update(child.idx, { parentId: parentId });
            });
        }
        return this.table('lcNode').delete(nodeId);
    }

    importTree(compositionId, treeJson, parentId = null) {
        const tree = typeof treeJson === 'string' ? JSON.parse(treeJson) : treeJson;
        return this._importNode(compositionId, tree, parentId);
    }

    _importNode(compositionId, nodeData, parentId) {
        const children = nodeData.children || [];
        const { children: _, idx: __, ...fields } = nodeData;
        const created = this.table('lcNode').create({
            ...fields,
            compositionId,
            parentId
        });
        children.forEach((child, i) => {
            this._importNode(compositionId, { ...child, sortOrder: child.sortOrder || i }, created.idx);
        });
        return created;
    }

    // ── Evaluation Engine ────────────────────────────────────────────────

    evaluate(compositionId, data) {
        const roots = this.getRootNodes(compositionId);
        if (roots.length === 0) {
            return { passed: false, score: 0, positive: [], negative: ['No rules defined'], nodeResults: [] };
        }
        const nodeResults = [];
        const rootResults = roots.map(root => this._evaluateNode(root, data, nodeResults));

        const allPassed = rootResults.every(r => r.passed);
        const totalScore = rootResults.reduce((s, r) => s + r.score, 0) / rootResults.length;
        const positive = rootResults.flatMap(r => r.positive);
        const negative = rootResults.flatMap(r => r.negative);

        return { passed: allPassed, score: Math.round(totalScore * 100) / 100, positive, negative, nodeResults };
    }

    _evaluateNode(node, data, nodeResults) {
        const nodeType = node.get('nodeType');
        const label = node.get('label');
        let result;

        switch (nodeType) {
            case 'criterion':
                result = this._evaluateCriterion(node, data);
                break;
            case 'AND':
                result = this._evaluateAND(node, data, nodeResults);
                break;
            case 'OR':
                result = this._evaluateOR(node, data, nodeResults);
                break;
            case 'anyNof':
                result = this._evaluateAnyNof(node, data, nodeResults);
                break;
            case 'minTotal':
                result = this._evaluateMinTotal(node, data, nodeResults);
                break;
            case 'maxTotal':
                result = this._evaluateMaxTotal(node, data, nodeResults);
                break;
            default:
                result = { passed: false, score: 0, positive: [], negative: [`Unknown node type: ${nodeType}`] };
        }

        nodeResults.push({ nodeId: node.idx, label, nodeType, ...result });
        return result;
    }

    _evaluateCriterion(node, data) {
        const attrPath = node.get('attrPath');
        const operator = node.get('operator');
        const expected = node.get('value');
        const label = node.get('label');

        const actual = this._resolvePath(data, attrPath);
        const passed = this._compareValues(actual, operator, expected);

        if (passed) {
            return { passed: true, score: 1, actual: String(actual), expected,
                positive: [`${label}: ${actual} ${operator} ${expected}`], negative: [] };
        } else {
            return { passed: false, score: 0, actual: String(actual), expected,
                positive: [], negative: [`${label}: ${actual} does not satisfy ${operator} ${expected}`] };
        }
    }

    _evaluateAND(node, data, nodeResults) {
        const children = this.getChildren(node.idx);
        if (children.length === 0) return { passed: true, score: 1, positive: ['No criteria (vacuously true)'], negative: [] };

        const childResults = children.map(c => this._evaluateNode(c, data, nodeResults));
        const allPassed = childResults.every(r => r.passed);
        const score = childResults.reduce((s, r) => s + r.score, 0) / childResults.length;
        const passCount = childResults.filter(r => r.passed).length;

        const positive = childResults.flatMap(r => r.positive);
        const negative = childResults.flatMap(r => r.negative);

        if (allPassed) {
            positive.unshift(`${node.get('label')}: All ${children.length} criteria satisfied`);
        } else {
            negative.unshift(`${node.get('label')}: ${passCount}/${children.length} criteria met — all required`);
        }

        return { passed: allPassed, score: Math.round(score * 100) / 100, positive, negative };
    }

    _evaluateOR(node, data, nodeResults) {
        const children = this.getChildren(node.idx);
        if (children.length === 0) return { passed: false, score: 0, positive: [], negative: ['No criteria defined'] };

        const childResults = children.map(c => this._evaluateNode(c, data, nodeResults));
        const anyPassed = childResults.some(r => r.passed);
        const score = anyPassed ? 1 : 0;

        const positive = childResults.flatMap(r => r.positive);
        const negative = childResults.flatMap(r => r.negative);

        if (anyPassed) {
            const passCount = childResults.filter(r => r.passed).length;
            positive.unshift(`${node.get('label')}: ${passCount}/${children.length} paths satisfied (1 required)`);
        } else {
            negative.unshift(`${node.get('label')}: None of ${children.length} paths satisfied`);
        }

        return { passed: anyPassed, score, positive, negative };
    }

    _evaluateAnyNof(node, data, nodeResults) {
        const children = this.getChildren(node.idx);
        const nRequired = node.get('nRequired') || 1;

        const childResults = children.map(c => this._evaluateNode(c, data, nodeResults));
        const passCount = childResults.filter(r => r.passed).length;
        const passed = passCount >= nRequired;
        const score = Math.min(passCount / nRequired, 1);

        const positive = childResults.flatMap(r => r.positive);
        const negative = childResults.flatMap(r => r.negative);

        if (passed) {
            positive.unshift(`${node.get('label')}: ${passCount}/${children.length} passed (${nRequired} required)`);
        } else {
            negative.unshift(`${node.get('label')}: Only ${passCount}/${children.length} passed (${nRequired} required)`);
        }

        return { passed, score: Math.round(score * 100) / 100, positive, negative };
    }

    _aggregateChildren(node, data, nodeResults) {
        const children = this.getChildren(node.idx);
        const metric = node.get('metric') || 'count';

        const childResults = children.map(c => {
            const evalResult = this._evaluateNode(c, data, nodeResults);
            return { node: c, result: evalResult };
        });

        let total = 0;
        childResults.forEach(({ node: childNode, result }) => {
            if (result.passed) {
                switch (metric) {
                    case 'credits': total += childNode.get('credits') || 0; break;
                    case 'count': total += 1; break;
                    case 'sum': total += parseFloat(result.actual) || 0; break;
                    case 'average': total += parseFloat(result.actual) || 0; break;
                }
            }
        });

        if (metric === 'average' && childResults.length > 0) {
            total = total / childResults.length;
        }

        const positive = childResults.flatMap(({ result }) => result.positive);
        const negative = childResults.flatMap(({ result }) => result.negative);

        return { total, metric, positive, negative };
    }

    _evaluateMinTotal(node, data, nodeResults) {
        const threshold = node.get('threshold') || 0;
        const { total, metric, positive, negative } = this._aggregateChildren(node, data, nodeResults);

        const passed = total >= threshold;
        const score = threshold > 0 ? Math.min(total / threshold, 1) : (passed ? 1 : 0);

        if (passed) {
            positive.unshift(`${node.get('label')}: ${total} ${metric} achieved (min ${threshold} required)`);
        } else {
            negative.unshift(`${node.get('label')}: Only ${total} ${metric} achieved (min ${threshold} required)`);
        }

        return { passed, score: Math.round(score * 100) / 100, positive, negative };
    }

    _evaluateMaxTotal(node, data, nodeResults) {
        const threshold = node.get('threshold') || 0;
        const { total, metric, positive, negative } = this._aggregateChildren(node, data, nodeResults);

        const passed = total <= threshold;
        const score = passed ? 1 : (threshold > 0 ? Math.max(0, 1 - (total - threshold) / threshold) : 0);

        if (passed) {
            positive.unshift(`${node.get('label')}: ${total} ${metric} within limit (max ${threshold})`);
        } else {
            negative.unshift(`${node.get('label')}: ${total} ${metric} exceeds limit (max ${threshold})`);
        }

        return { passed, score: Math.round(score * 100) / 100, positive, negative };
    }

    _resolvePath(data, path) {
        if (!path) return undefined;
        const parts = path.split('.');
        let current = data;
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        return current;
    }

    _compareValues(actual, operator, expected) {
        if (actual === undefined || actual === null) {
            return operator === 'isFalse';
        }
        const numActual = parseFloat(actual);
        const numExpected = parseFloat(expected);
        const useNum = !isNaN(numActual) && !isNaN(numExpected);

        switch (operator) {
            case 'eq': return useNum ? numActual === numExpected : String(actual) === String(expected);
            case 'neq': return useNum ? numActual !== numExpected : String(actual) !== String(expected);
            case 'gt': return useNum && numActual > numExpected;
            case 'gte': return useNum && numActual >= numExpected;
            case 'lt': return useNum && numActual < numExpected;
            case 'lte': return useNum && numActual <= numExpected;
            case 'contains': return String(actual).includes(String(expected));
            case 'in': {
                const list = String(expected).split(',').map(s => s.trim());
                return list.includes(String(actual));
            }
            case 'isTrue': return actual === true || actual === 'true' || actual === 1;
            case 'isFalse': return actual === false || actual === 'false' || actual === 0 || actual === null || actual === undefined;
            default: return false;
        }
    }

    // ── Batch Evaluation ─────────────────────────────────────────────────

    evaluateBatch(compositionId, entities) {
        const results = entities.map(entity => {
            const evalResult = this.evaluate(compositionId, entity.data);
            return { targetId: entity.id, targetLabel: entity.label, ...evalResult };
        });

        const passCount = results.filter(r => r.passed).length;
        const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;

        return {
            compositionId,
            totalEntities: entities.length,
            passCount,
            failCount: entities.length - passCount,
            passRate: Math.round((passCount / entities.length) * 100),
            avgScore: Math.round(avgScore * 100) / 100,
            results
        };
    }

    // ── Report Generation ────────────────────────────────────────────────

    generateReport(evalResult) {
        const { passed, score, positive, negative } = evalResult;
        const lines = [];

        lines.push(passed ? 'PASSED' : 'FAILED');
        lines.push(`Score: ${Math.round(score * 100)}%`);
        lines.push('');

        if (positive.length > 0) {
            lines.push('Satisfied:');
            positive.forEach(note => lines.push(`  + ${note}`));
            lines.push('');
        }

        if (negative.length > 0) {
            lines.push('Not Satisfied:');
            negative.forEach(note => lines.push(`  - ${note}`));
            lines.push('');
        }

        const summary = passed
            ? `Overall: PASSED with ${positive.length} criteria satisfied.`
            : `Overall: FAILED — ${negative.length} criteria not met. ${positive.length} criteria satisfied.`;
        lines.push(summary);

        return {
            reportPositive: positive.join('\n'),
            reportNegative: negative.join('\n'),
            reportSummary: lines.join('\n')
        };
    }

    // ── Versioning ───────────────────────────────────────────────────────

    snapshotVersion(compositionId, label, createdBy) {
        const tree = this.getTree(compositionId);
        const nodes = this.table('lcNode').all().filter(n => n.get('compositionId') === compositionId);
        const existing = this.table('lcVersion').all()
            .filter(v => v.get('compositionId') === compositionId);
        const nextVersion = existing.length > 0
            ? Math.max(...existing.map(v => v.get('versionNumber'))) + 1
            : 1;

        return this.table('lcVersion').create({
            compositionId,
            label: label || `Version ${nextVersion}`,
            versionNumber: nextVersion,
            treeJson: JSON.stringify(tree),
            nodeCount: nodes.length,
            createdBy,
            createdAt: new Date().toISOString()
        });
    }

    restoreVersion(versionId) {
        const version = this.table('lcVersion').read(versionId);
        if (!version) throw new Error(`Version ${versionId} not found`);

        const compositionId = version.get('compositionId');
        const treeJson = version.get('treeJson');
        const tree = typeof treeJson === 'string' ? JSON.parse(treeJson) : treeJson;

        // Remove existing nodes for this composition
        const existingNodes = this.table('lcNode').all()
            .filter(n => n.get('compositionId') === compositionId);
        existingNodes.forEach(n => this.table('lcNode').delete(n.idx));

        // Re-import from snapshot
        if (Array.isArray(tree)) {
            tree.forEach(root => this.importTree(compositionId, root, null));
        } else {
            this.importTree(compositionId, tree, null);
        }

        return version;
    }

    // ── Cloning ──────────────────────────────────────────────────────────

    cloneComposition(compositionId, overrides = {}) {
        const original = this.table('lcComposition').read(compositionId);
        if (!original) throw new Error(`Composition ${compositionId} not found`);

        const data = original.getData();
        delete data.idx;
        const cloned = this.table('lcComposition').create({
            ...data,
            code: overrides.code || `${data.code}-CLONE`,
            label: overrides.label || `${data.label} (Clone)`,
            ...overrides,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Clone all nodes with remapped parentIds
        const tree = this.getTree(compositionId);
        tree.forEach(root => this.importTree(cloned.idx, root, null));

        return cloned;
    }

    // ── Run Recording ────────────────────────────────────────────────────

    recordRun(compositionId, evalOutput, meta = {}) {
        const report = this.generateReport(evalOutput);
        const run = this.table('lcRun').create({
            compositionId,
            mode: meta.mode || 'single',
            targetId: meta.targetId || '',
            targetLabel: meta.targetLabel || '',
            passed: evalOutput.passed,
            score: evalOutput.score,
            reportPositive: report.reportPositive,
            reportNegative: report.reportNegative,
            reportSummary: report.reportSummary,
            runAt: new Date().toISOString()
        });

        if (evalOutput.nodeResults) {
            evalOutput.nodeResults.forEach(nr => {
                this.table('lcResult').create({
                    runId: run.idx,
                    nodeId: nr.nodeId,
                    passed: nr.passed,
                    score: nr.score,
                    actual: nr.actual || '',
                    expected: nr.expected || '',
                    positiveNotes: JSON.stringify(nr.positive || []),
                    negativeNotes: JSON.stringify(nr.negative || [])
                });
            });
        }

        return run;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 2: Attribution & Sensitivity Analysis
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Compute Shapley attribution values for each node in a composition.
     * AND nodes: phi_i = child_i.score / n
     * OR nodes: phi = 1/passingCount for passing children, 0 for failing
     * Threshold nodes: marginal contribution via _evaluateWithout helper
     * @returns {Map<nodeId, {phi}>} where phi is -1.0 to 1.0
     */
    computeShapley(compositionId, data) {
        const evalResult = this.evaluate(compositionId, data);
        const resultMap = {};
        if (evalResult.nodeResults) {
            evalResult.nodeResults.forEach(nr => { resultMap[nr.nodeId] = nr; });
        }

        const shapleyMap = {};
        const roots = this.getRootNodes(compositionId);
        roots.forEach(root => this._computeShapleyForNode(root, data, resultMap, shapleyMap));
        return shapleyMap;
    }

    _computeShapleyForNode(node, data, resultMap, shapleyMap) {
        const nodeType = node.get('nodeType');
        const children = this.getChildren(node.idx);

        if (nodeType === 'criterion') {
            // Leaf: phi is its own score contribution (1 if passed, -1 if failed)
            const nr = resultMap[node.idx];
            shapleyMap[node.idx] = { phi: nr && nr.passed ? 1.0 : -1.0 };
            return;
        }

        // Recurse into children first
        children.forEach(child => this._computeShapleyForNode(child, data, resultMap, shapleyMap));

        if (children.length === 0) {
            shapleyMap[node.idx] = { phi: 0 };
            return;
        }

        const n = children.length;

        if (nodeType === 'AND') {
            // AND: phi_i = child_i.score / n (equal contribution weight)
            children.forEach(child => {
                const nr = resultMap[child.idx];
                const childScore = nr ? nr.score : 0;
                shapleyMap[child.idx] = { phi: childScore / n };
            });
        } else if (nodeType === 'OR') {
            // OR: passing children share credit equally, failing get 0
            const passingCount = children.filter(c => resultMap[c.idx] && resultMap[c.idx].passed).length;
            children.forEach(child => {
                const nr = resultMap[child.idx];
                shapleyMap[child.idx] = { phi: nr && nr.passed ? (passingCount > 0 ? 1.0 / passingCount : 0) : 0 };
            });
        } else if (nodeType === 'anyNof' || nodeType === 'minTotal' || nodeType === 'maxTotal') {
            // Threshold nodes: marginal contribution
            const parentResult = resultMap[node.idx];
            const parentScore = parentResult ? parentResult.score : 0;
            children.forEach(child => {
                const withoutScore = this._evaluateWithout(node, child.idx, data);
                const marginal = parentScore - withoutScore;
                shapleyMap[child.idx] = { phi: Math.round(marginal * 1000) / 1000 };
            });
        }

        // Set phi for the connector node itself based on its result
        const nr = resultMap[node.idx];
        shapleyMap[node.idx] = { phi: nr ? nr.score : 0 };
    }

    /**
     * Re-evaluate a parent node without one specific child.
     * Returns the score the parent would get without that child.
     */
    _evaluateWithout(parentNode, excludeChildId, data) {
        const nodeType = parentNode.get('nodeType');
        const children = this.getChildren(parentNode.idx).filter(c => c.idx !== excludeChildId);

        if (children.length === 0) {
            if (nodeType === 'anyNof') return 0;
            if (nodeType === 'minTotal') return 0;
            if (nodeType === 'maxTotal') return 1;
            return 0;
        }

        const nodeResults = [];
        const childResults = children.map(c => this._evaluateNode(c, data, nodeResults));

        if (nodeType === 'anyNof') {
            const nRequired = parentNode.get('nRequired') || 1;
            const passCount = childResults.filter(r => r.passed).length;
            return Math.min(passCount / nRequired, 1);
        } else if (nodeType === 'minTotal') {
            const threshold = parentNode.get('threshold') || 0;
            const metric = parentNode.get('metric') || 'count';
            let total = 0;
            childResults.forEach((result, i) => {
                if (result.passed) {
                    switch (metric) {
                        case 'credits': total += children[i].get('credits') || 0; break;
                        case 'count': total += 1; break;
                        case 'sum': total += parseFloat(result.actual) || 0; break;
                        case 'average': total += parseFloat(result.actual) || 0; break;
                    }
                }
            });
            if (metric === 'average' && children.length > 0) total = total / children.length;
            return threshold > 0 ? Math.min(total / threshold, 1) : (total >= threshold ? 1 : 0);
        } else if (nodeType === 'maxTotal') {
            const threshold = parentNode.get('threshold') || 0;
            const metric = parentNode.get('metric') || 'count';
            let total = 0;
            childResults.forEach((result, i) => {
                if (result.passed) {
                    switch (metric) {
                        case 'credits': total += children[i].get('credits') || 0; break;
                        case 'count': total += 1; break;
                        case 'sum': total += parseFloat(result.actual) || 0; break;
                        case 'average': total += parseFloat(result.actual) || 0; break;
                    }
                }
            });
            if (metric === 'average' && children.length > 0) total = total / children.length;
            return total <= threshold ? 1 : (threshold > 0 ? Math.max(0, 1 - (total - threshold) / threshold) : 0);
        }
        return 0;
    }

    /**
     * Evaluate a composition with both original and modified data, returning deltas.
     * @param {number} compositionId
     * @param {object} baseData - original entity data
     * @param {object} modifications - dot-path keys to new values, e.g. {'courseResult.MATH201.finalMark': 75}
     */
    evaluateCounterfactual(compositionId, baseData, modifications) {
        const original = this.evaluate(compositionId, baseData);

        // Deep-clone and apply modifications
        const modifiedData = JSON.parse(JSON.stringify(baseData));
        for (const [path, value] of Object.entries(modifications)) {
            this._setPath(modifiedData, path, value);
        }

        const modified = this.evaluate(compositionId, modifiedData);

        // Build per-node deltas
        const origMap = {};
        const modMap = {};
        if (original.nodeResults) original.nodeResults.forEach(nr => { origMap[nr.nodeId] = nr; });
        if (modified.nodeResults) modified.nodeResults.forEach(nr => { modMap[nr.nodeId] = nr; });

        const deltas = [];
        const allNodeIds = new Set([...Object.keys(origMap), ...Object.keys(modMap)]);
        allNodeIds.forEach(nodeIdStr => {
            const nodeId = parseInt(nodeIdStr);
            const o = origMap[nodeId] || { score: 0, passed: false };
            const m = modMap[nodeId] || { score: 0, passed: false };
            const deltaScore = Math.round((m.score - o.score) * 1000) / 1000;
            if (deltaScore !== 0 || o.passed !== m.passed) {
                deltas.push({
                    nodeId,
                    label: o.label || m.label || '',
                    originalScore: o.score,
                    modifiedScore: m.score,
                    deltaScore,
                    flipped: o.passed !== m.passed
                });
            }
        });

        return {
            original,
            modified,
            deltas,
            overallFlipped: original.passed !== modified.passed,
            modifications
        };
    }

    _setPath(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] === undefined || current[parts[i]] === null) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    /**
     * Find criterion nodes with high |phi| whose attrPath was NOT modified.
     * These are the "sensitive inputs" — things the user didn't change that have high causal impact.
     */
    identifySensitiveInputs(compositionId, data, modifications, topN = 5) {
        const shapleyMap = this.computeShapley(compositionId, data);
        const modifiedPaths = new Set(Object.keys(modifications || {}));

        const criteria = this.table('lcNode').all()
            .filter(n => n.get('compositionId') === compositionId && n.get('nodeType') === 'criterion');

        const sensitive = criteria
            .filter(c => !modifiedPaths.has(c.get('attrPath')))
            .map(c => {
                const phi = shapleyMap[c.idx] ? shapleyMap[c.idx].phi : 0;
                return { nodeId: c.idx, label: c.get('label'), attrPath: c.get('attrPath'), phi, absPhi: Math.abs(phi) };
            })
            .sort((a, b) => b.absPhi - a.absPhi)
            .slice(0, topN);

        return sensitive;
    }

    /**
     * Extract tunable parameters from connector nodes (thresholds, nRequired).
     * Returns slider definitions for the sensitivity view.
     */
    getModifiableParameters(compositionId) {
        const nodes = this.table('lcNode').all()
            .filter(n => n.get('compositionId') === compositionId);

        const params = [];
        nodes.forEach(node => {
            const type = node.get('nodeType');
            if (type === 'anyNof') {
                const children = this.getChildren(node.idx);
                params.push({
                    nodeId: node.idx,
                    label: node.get('label'),
                    paramName: 'nRequired',
                    currentValue: node.get('nRequired') || 1,
                    min: 1,
                    max: Math.max(children.length, 1),
                    step: 1
                });
            } else if (type === 'minTotal' || type === 'maxTotal') {
                const current = node.get('threshold') || 0;
                params.push({
                    nodeId: node.idx,
                    label: node.get('label'),
                    paramName: 'threshold',
                    currentValue: current,
                    min: 0,
                    max: Math.max(current * 2, 10),
                    step: type === 'minTotal' && (node.get('metric') === 'count') ? 1 : 5
                });
            }
        });

        return params;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Binding Registry & Capability Discovery
    // ─────────────────────────────────────────────────────────────────────────

    getBindingRegistry() {
        return [];
    }

    getCapabilities() {
        return {
            name: 'logicComposer',
            alias: 'LogicComposerService',
            icon: 'fa-puzzle-piece',
            intent: 'General-purpose hierarchical rule tree composition and evaluation engine with versioning, cloning, batch evaluation, and natural-language report generation.',
            keywords: ['logic', 'composer', 'rules', 'tree', 'evaluation', 'versioning', 'cloning', 'batch', 'report', 'criteria'],
            capabilities: [
                'composition-management', 'node-tree', 'templates',
                'versioning', 'evaluation', 'batch-evaluation',
                'report-generation', 'cloning', 'run-recording',
                'shapley-attribution', 'counterfactual-analysis',
                'sensitivity-analysis', 'parameter-discovery'
            ],
            useCases: [
                'Compose hierarchical rule trees from connector and criterion nodes',
                'Evaluate entity data against rule trees with pass/fail scoring',
                'Generate structured natural-language pass/fail reports',
                'Batch-evaluate multiple entities against a composition',
                'Snapshot and restore composition versions',
                'Clone compositions with full node tree duplication',
                'Import reusable subtree templates',
                'Record evaluation runs with per-node results',
                'Compute Shapley attribution values per node for causal contribution analysis',
                'Counterfactual what-if analysis with modified inputs and delta tracking',
                'Identify sensitive inputs with high causal impact that were not modified',
                'Discover tunable parameters (thresholds, nRequired) for sensitivity exploration'
            ],
            consumers: [],
            domainMethods: [
                { name: 'createComposition', signature: '(data)', description: 'Create a named rule composition' },
                { name: 'getComposition', signature: '(code)', description: 'Get a composition by code' },
                { name: 'createNode', signature: '(data)', description: 'Create a logic node (validates criterion leaf constraint)' },
                { name: 'getRootNodes', signature: '(compositionId)', description: 'Get root nodes of a composition tree' },
                { name: 'getChildren', signature: '(nodeId)', description: 'Get children of a node sorted by sortOrder' },
                { name: 'getTree', signature: '(compositionId)', description: 'Build full tree structure for a composition' },
                { name: 'moveNode', signature: '(nodeId, newParentId, sortOrder)', description: 'Move a node with cycle detection and leaf constraint validation' },
                { name: 'deleteNode', signature: '(nodeId, recursive)', description: 'Delete a node, optionally recursing or reparenting children' },
                { name: 'importTree', signature: '(compositionId, treeJson, parentId)', description: 'Import a JSON tree into node rows' },
                { name: 'evaluate', signature: '(compositionId, data)', description: 'Evaluate entity data against a composition, returning passed/score/positive/negative/nodeResults' },
                { name: 'evaluateBatch', signature: '(compositionId, entities)', description: 'Batch-evaluate multiple entities with pass/fail rates and average scores' },
                { name: 'generateReport', signature: '(evalResult)', description: 'Generate natural-language report from evaluation results' },
                { name: 'snapshotVersion', signature: '(compositionId, label, createdBy)', description: 'Snapshot current composition tree as a version' },
                { name: 'restoreVersion', signature: '(versionId)', description: 'Restore a composition from a versioned snapshot' },
                { name: 'cloneComposition', signature: '(compositionId, overrides)', description: 'Clone a composition with full node tree duplication' },
                { name: 'recordRun', signature: '(compositionId, evalOutput, meta)', description: 'Record an evaluation run with per-node results and generated report' },
                { name: 'computeShapley', signature: '(compositionId, data)', description: 'Compute Shapley attribution values per node — causal contribution to pass/fail outcome' },
                { name: 'evaluateCounterfactual', signature: '(compositionId, baseData, modifications)', description: 'Evaluate with original and modified data, returning per-node deltas and flipped outcomes' },
                { name: 'identifySensitiveInputs', signature: '(compositionId, data, modifications, topN)', description: 'Find high-impact criterion nodes whose inputs were not modified' },
                { name: 'getModifiableParameters', signature: '(compositionId)', description: 'Extract tunable threshold/nRequired parameters for sensitivity sliders' }
            ],
            bindings: this.getBindingRegistry()
        };
    }
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LogicComposerService, LogicComposerServiceSchema };
}
