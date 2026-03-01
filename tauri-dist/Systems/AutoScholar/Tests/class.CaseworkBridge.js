/**
 * CaseworkBridge — connects CaseworkService to CaseworkCounsellorPanel
 *
 * Wraps CaseworkService with seed data and adds a student reference table
 * for UIBinding FK resolution. Allows the panel to render service-backed
 * views via UIBinding while keeping sample data as fallback.
 *
 * Usage:
 *   var bridge = new CaseworkBridge();
 *   var panel = new CaseworkCounsellorPanel({ bridge: bridge });
 */
class CaseworkBridge {

    // Sample students matching CaseworkSeed studentId references (1-10)
    static STUDENTS = [
        { idx: 1,  name: 'Sipho Nkosi',      studentId: '22001234', initials: 'SN', programme: 'ND: IT',          yearOfStudy: 2, gpa: '38%', credits: '120/360' },
        { idx: 2,  name: 'Priya Govender',    studentId: '22001456', initials: 'PG', programme: 'ND: Accounting',  yearOfStudy: 2, gpa: '52%', credits: '140/360' },
        { idx: 3,  name: 'Thabo Molefe',      studentId: '22001789', initials: 'TM', programme: 'ND: Electrical',  yearOfStudy: 2, gpa: '42%', credits: '140/360' },
        { idx: 4,  name: 'Zanele Mkhize',     studentId: '22002101', initials: 'ZM', programme: 'ND: Civil Eng',   yearOfStudy: 1, gpa: '48%', credits: '60/360' },
        { idx: 5,  name: 'Ayanda Dlamini',    studentId: '22002345', initials: 'AD', programme: 'ND: IT',          yearOfStudy: 2, gpa: '55%', credits: '150/360' },
        { idx: 6,  name: 'Fatima Moosa',      studentId: '22002567', initials: 'FM', programme: 'BTech: IT',       yearOfStudy: 4, gpa: '62%', credits: '420/480' },
        { idx: 7,  name: 'Lungile Ndaba',     studentId: '22002890', initials: 'LN', programme: 'ND: Mech Eng',    yearOfStudy: 2, gpa: '45%', credits: '110/360' },
        { idx: 8,  name: 'Nomsa Zulu',        studentId: '22003234', initials: 'NZ', programme: 'ND: Accounting',  yearOfStudy: 3, gpa: '53%', credits: '250/360' },
        { idx: 9,  name: 'Lerato Khumalo',    studentId: '22003678', initials: 'LK', programme: 'ND: IT',          yearOfStudy: 2, gpa: '62%', credits: '160/360' },
        { idx: 10, name: 'Mandla Sithole',    studentId: '22003890', initials: 'MS', programme: 'ND: Electrical',  yearOfStudy: 2, gpa: '50%', credits: '130/360' }
    ];

    constructor() {
        this._service = new CaseworkService();
        this._service.seedDefaults();
        this._addStudentTable();
    }

    get service() { return this._service; }

    table(name) { return this._service.table(name); }

    // ── Student lookup ────────────────────────────────────────────────────

    getStudent(idx) {
        var row = this._service.table('student').read(idx);
        return row ? row.getData() : null;
    }

    getStudentName(idx) {
        var row = this._service.table('student').read(idx);
        return row ? row.get('name') : 'Unknown';
    }

    getAllStudents() {
        return this._service.table('student').all().map(function(r) { return r.getData(); });
    }

    // ── Service query pass-through ────────────────────────────────────────

    getActiveCases()              { return this._service.getActiveCases(); }
    getAtRiskStudents()           { return this._service.getAtRiskStudents(); }
    getCaseloadAnalytics()        { return this._service.getCaseloadAnalytics(); }
    getCaseNotes(caseId)          { return this._service.getCaseNotes(caseId); }
    getInterventionsByCaseId(id)  { return this._service.getInterventionsByCaseId(id); }
    getReferralsByStudent(id)     { return this._service.getReferralsByStudent(id); }
    getAppointments()             { return this._service.getAppointments(); }
    getUpcomingAppointments()     { return this._service.getUpcomingAppointments(); }
    getAppointmentsByStudent(id)  { return this._service.getAppointmentsByStudent(id); }
    getRiskHistory(studentId)     { return this._service.getRiskHistory(studentId); }
    getLatestRiskScore(studentId) { return this._service.getLatestRiskScore(studentId); }

    // ── Internal ──────────────────────────────────────────────────────────

    /**
     * Add a student reference table so UIBinding can resolve studentId FKs.
     * The casework schema declares studentId → student.idx but the student
     * table lives in the member service. This bridge provides a local copy.
     */
    _addStudentTable() {
        this._service.tables['student'] = new PublonTable({
            name: 'student',
            schema: [
                { name: 'idx',         label: 'ID',             type: 'integer', auto: true },
                { name: 'name',        label: 'Name',           type: 'string' },
                { name: 'studentId',   label: 'Student Number', type: 'string' },
                { name: 'initials',    label: 'Initials',       type: 'string' },
                { name: 'programme',   label: 'Programme',      type: 'string' },
                { name: 'yearOfStudy', label: 'Year',           type: 'integer' },
                { name: 'gpa',         label: 'GPA',            type: 'string' },
                { name: 'credits',     label: 'Credits',        type: 'string' }
            ],
            primaryKey: 'idx',
            labeller: '{name}',
            selectionMode: 'single'
        });

        CaseworkBridge.STUDENTS.forEach(function(s) {
            this._service.table('student').create(s);
        }.bind(this));
    }
}
