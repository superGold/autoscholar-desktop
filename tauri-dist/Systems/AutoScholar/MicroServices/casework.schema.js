/**
 * CaseworkSchema - Casework Counsellor schema definition
 *
 * Defines the data model for student case management, counsellor
 * interventions, referrals, and case notes. Uses cw_ namespace prefix.
 *
 * Tables (7):
 *   caseCategory, case, intervention, referral, caseNote, appointment, riskSnapshot
 */

const CaseworkSchema = {
    name: 'casework',
    prefix: 'cw',
    alias: 'Casework Counsellor',
    version: '1.0.0',

    tables: [
        {
            name: 'caseCategory',
            alias: 'Case Categories',
            primaryKey: 'idx',
            labeller: '{name}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'name', label: 'Category', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'string' },
                { name: 'color', label: 'Color', type: 'string' },
                { name: 'icon', label: 'Icon', type: 'string' },
                { name: 'sortOrder', label: 'Sort Order', type: 'integer', default: 0 }
            ]
        },
        {
            name: 'case',
            alias: 'Cases',
            primaryKey: 'idx',
            labeller: '{title} ({status})',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'studentId', label: 'Student', type: 'integer', required: true,
                    ref: { table: 'student', field: 'idx' } },
                { name: 'categoryId', label: 'Category', type: 'integer', required: true,
                    ref: { table: 'caseCategory', field: 'idx' } },
                { name: 'status', label: 'Status', type: 'string', required: true,
                    enum: ['Open', 'In Progress', 'Pending Review', 'Resolved'] },
                { name: 'priority', label: 'Priority', type: 'string', required: true,
                    enum: ['Low', 'Medium', 'High', 'Critical'] },
                { name: 'title', label: 'Title', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'counsellorId', label: 'Counsellor', type: 'integer' },
                { name: 'dateOpened', label: 'Date Opened', type: 'string' },
                { name: 'dateClosed', label: 'Date Closed', type: 'string' },
                { name: 'daysOpen', label: 'Days Open', type: 'integer', default: 0 }
            ]
        },
        {
            name: 'intervention',
            alias: 'Interventions',
            primaryKey: 'idx',
            labeller: '{type} \u2014 {date}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'caseId', label: 'Case', type: 'integer', required: true,
                    ref: { table: 'case', field: 'idx' } },
                { name: 'studentId', label: 'Student', type: 'integer' },
                { name: 'type', label: 'Type', type: 'string', required: true,
                    enum: ['Meeting', 'Email', 'Phone Call', 'Referral', 'Workshop', 'Peer Tutoring'] },
                { name: 'outcome', label: 'Outcome', type: 'string',
                    enum: ['Improved', 'Unchanged', 'Declined', 'Pending'] },
                { name: 'date', label: 'Date', type: 'string', required: true },
                { name: 'counsellorId', label: 'Counsellor', type: 'integer' },
                { name: 'notes', label: 'Notes', type: 'text' }
            ]
        },
        {
            name: 'referral',
            alias: 'Referrals',
            primaryKey: 'idx',
            labeller: '{service} \u2014 {studentId}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'caseId', label: 'Case', type: 'integer', required: true,
                    ref: { table: 'case', field: 'idx' } },
                { name: 'studentId', label: 'Student', type: 'integer' },
                { name: 'service', label: 'Service', type: 'string', required: true },
                { name: 'reason', label: 'Reason', type: 'text' },
                { name: 'status', label: 'Status', type: 'string',
                    enum: ['Pending', 'Attended', 'No-Show', 'Ongoing'] },
                { name: 'priority', label: 'Priority', type: 'string',
                    enum: ['Low', 'Medium', 'High'] },
                { name: 'date', label: 'Date', type: 'string', required: true },
                { name: 'counsellorId', label: 'Counsellor', type: 'integer' },
                { name: 'notes', label: 'Notes', type: 'text' }
            ]
        },
        {
            name: 'caseNote',
            alias: 'Case Notes',
            primaryKey: 'idx',
            labeller: '{author} \u2014 {date}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'caseId', label: 'Case', type: 'integer', required: true,
                    ref: { table: 'case', field: 'idx' } },
                { name: 'author', label: 'Author', type: 'string', required: true },
                { name: 'text', label: 'Note', type: 'text', required: true },
                { name: 'date', label: 'Date', type: 'string', required: true }
            ]
        },
        {
            name: 'appointment',
            alias: 'Appointments',
            primaryKey: 'idx',
            labeller: '{type} — {date} {time}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'studentId', label: 'Student', type: 'integer', required: true,
                    ref: { table: 'student', field: 'idx' } },
                { name: 'caseId', label: 'Case', type: 'integer',
                    ref: { table: 'case', field: 'idx' } },
                { name: 'counsellorId', label: 'Counsellor', type: 'integer' },
                { name: 'type', label: 'Type', type: 'string', required: true,
                    enum: ['Initial Consultation', 'Follow-up', 'Emergency', 'Academic Review', 'Career Guidance', 'Group Session'] },
                { name: 'date', label: 'Date', type: 'string', required: true },
                { name: 'time', label: 'Time', type: 'string', required: true },
                { name: 'duration', label: 'Duration (min)', type: 'integer', default: 30 },
                { name: 'location', label: 'Location', type: 'string' },
                { name: 'status', label: 'Status', type: 'string',
                    enum: ['Scheduled', 'Confirmed', 'Completed', 'No-Show', 'Cancelled'] },
                { name: 'notes', label: 'Notes', type: 'text' }
            ]
        },
        {
            name: 'riskSnapshot',
            alias: 'Risk Snapshots',
            primaryKey: 'idx',
            labeller: 'Risk {riskScore} — {date}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'studentId', label: 'Student', type: 'integer', required: true,
                    ref: { table: 'student', field: 'idx' } },
                { name: 'date', label: 'Date', type: 'string', required: true },
                { name: 'riskScore', label: 'Risk Score', type: 'integer', required: true },
                { name: 'source', label: 'Source', type: 'string',
                    enum: ['Academic', 'Attendance', 'Financial', 'Composite', 'Manual'] }
            ]
        }
    ]
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CaseworkSchema };
}
if (typeof window !== 'undefined') {
    window.CaseworkSchema = CaseworkSchema;
}
