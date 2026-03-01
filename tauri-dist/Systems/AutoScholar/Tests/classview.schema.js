/**
 * ClassViewSchema — Publome schema for ClassView Connect
 *
 * Defines 4 tables:
 *   student, assessment, kpi, panelStatus
 *
 * Usage:
 *   const publome = ClassViewSchema.create();           // empty
 *   ClassViewSeed.seed(publome, data);                  // from API
 *   ClassViewSeed.seedDemo(publome);                    // demo data
 */
class ClassViewSchema {

    static schema() {
        return {
            tables: [
                // ── Students in current course ────────────────────────────
                {
                    name: 'student',
                    columns: {
                        idx:            { type: 'number', primaryKey: true },
                        studentNumber:  { type: 'string', required: true, label: 'Student Number' },
                        firstName:      { type: 'string', label: 'First Name' },
                        lastName:       { type: 'string', label: 'Last Name' },
                        programmeCode:  { type: 'string', label: 'Programme' },
                        finalMark:      { type: 'number', label: 'Final Mark' },
                        status:         { type: 'string', label: 'Status', enum: ['pass', 'fail', 'at-risk', 'incomplete'] }
                    },
                    labeller: '{firstName} {lastName}',
                    selectionMode: 'single'
                },
                // ── Assessment definitions ────────────────────────────────
                {
                    name: 'assessment',
                    columns: {
                        idx:    { type: 'number', primaryKey: true },
                        code:   { type: 'string', required: true, label: 'Code' },
                        name:   { type: 'string', label: 'Assessment' },
                        weight: { type: 'number', label: 'Weight (%)' },
                        mean:   { type: 'number', label: 'Mean' },
                        count:  { type: 'number', label: 'Submissions' }
                    },
                    labeller: '{name}'
                },
                // ── KPI metrics (6 persistent metrics) ────────────────────
                {
                    name: 'kpi',
                    columns: {
                        idx:   { type: 'number', primaryKey: true },
                        code:  { type: 'string', required: true, label: 'Code' },
                        label: { type: 'string', label: 'Label' },
                        value: { type: 'string', label: 'Value' },
                        icon:  { type: 'string', label: 'Icon' },
                        color: { type: 'string', label: 'Color' }
                    },
                    labeller: '{label}: {value}',
                    selectionMode: 'single'
                },
                // ── Panel status tracking ─────────────────────────────────
                {
                    name: 'panelStatus',
                    columns: {
                        idx:    { type: 'number', primaryKey: true },
                        key:    { type: 'string', required: true, label: 'Key' },
                        label:  { type: 'string', label: 'Panel' },
                        icon:   { type: 'string', label: 'Icon' },
                        loaded: { type: 'boolean', label: 'Class Loaded' },
                        active: { type: 'boolean', label: 'Active' },
                        status: { type: 'string', label: 'Status', enum: ['not-loaded', 'ready', 'active', 'error'] }
                    },
                    labeller: '{label}'
                }
            ]
        };
    }

    /** Create an empty Publome with the classview schema */
    static create() {
        return new Publome(ClassViewSchema.schema());
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassViewSchema;
}
if (typeof window !== 'undefined') {
    window.ClassViewSchema = ClassViewSchema;
}
