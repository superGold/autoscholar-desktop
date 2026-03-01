/**
 * UserManagementPanel - Thin client of MemberService + GroupService
 *
 * Compound-pattern panel (render(controlEl, stageEl)) that provides:
 * - AutoScholar RBAC configuration (permissions, roles, scope rules)
 * - Demo seed data for testing all AutoScholar personas
 * - Delegates member CRUD, roles, overrides, effective, context to MemberService views
 * - Adds AutoScholar-specific views: Access Overview, Scope Map
 *
 * Architecture: all member/role/permission UI is handled by MemberService's built-in
 * views (which use UIBinding internally). This panel only adds the AutoScholar config
 * layer and system-specific visualizations.
 */
class UserManagementPanel {

    // ── AutoScholar RBAC Configuration ───────────────────────────────────────

    static RBAC_CONFIG = {
        permissions: {
            view: {
                // ClassView Connect
                'classroom:risk':           { label: 'Student Risk Analysis' },
                'classroom:roster':         { label: 'Class Roster' },
                'classroom:gradebook':      { label: 'Gradebook' },
                'classroom:attendance':     { label: 'Attendance & DP' },
                'classroom:historical':     { label: 'Historical Performance' },
                'classroom:peerCorr':       { label: 'Peer Correlation' },
                'classroom:classAnalytics': { label: 'Class Analytics' },
                'classroom:pollManager':    { label: 'Quick Polls' },
                // Student Central
                'student:studentDash':      { label: 'Student Dashboard' },
                'student:myResults':        { label: 'My Results' },
                'student:progressTracker':  { label: 'Degree Progress' },
                'student:cumLaude':         { label: 'Cum Laude Tracker' },
                'student:portfolio':        { label: 'Evidence Portfolio' },
                'student:careerHub':        { label: 'Career Hub' },
                'student:diary':            { label: 'Study Diary' },
                'student:achievements':     { label: 'Achievements' },
                // Programme Analyst
                'programme:progOverview':    { label: 'Programme Overview' },
                'programme:cohortTracker':   { label: 'Cohort Tracker' },
                'programme:progressionMap':  { label: 'Progression Map' },
                'programme:gatekeeper':      { label: 'Gatekeeper Detection' },
                'programme:curriculumEditor':{ label: 'Curriculum Editor' },
                'programme:outcomeMapping':  { label: 'GA-Outcome Mapping' },
                'programme:cohortCompare':   { label: 'Cohort Comparison' },
                // Casework Counsellor
                'casework:caseManager':     { label: 'Case Manager' },
                'casework:interventionLog': { label: 'Intervention Tracker' },
                'casework:atRiskQueue':     { label: 'At-Risk Queue' },
                'casework:referralTracker': { label: 'Referral Manager' },
                'casework:appointments':    { label: 'Appointments' },
                'casework:caseloadReport':  { label: 'Caseload Analytics' },
                // Accreditation AutoMate
                'accreditation:accredDash':       { label: 'Accreditation Dashboard' },
                'accreditation:gaMatrix':         { label: 'GA Matrix Editor' },
                'accreditation:portfolioReview':  { label: 'Portfolio Review' },
                'accreditation:evidenceLibrary':  { label: 'Evidence Library' },
                'accreditation:complianceReport': { label: 'Compliance Reporting' },
                // Executive Insight
                'executive:execDash':        { label: 'Executive Dashboard' },
                'executive:enrolmentTrends': { label: 'Enrolment Trends' },
                'executive:throughput':      { label: 'Throughput Analysis' },
                'executive:retentionReport': { label: 'Retention Analytics' },
                'executive:progComparison':  { label: 'Programme Benchmarking' },
                // System & Config
                'admin:userManager':   { label: 'User Management' },
                'admin:roles':         { label: 'Role Configuration' },
                'admin:integrations':  { label: 'System Integrations' },
                'admin:auditLog':      { label: 'Audit Log' },
                'admin:alertConfig':   { label: 'Alert Rules' },
                // Communication & Tools
                'tools:messaging':      { label: 'Student Messaging' },
                'tools:browser':        { label: 'Student Browser' },
                'tools:timetabling':    { label: 'Timetable Manager' },
                'tools:notifications':  { label: 'Notification Centre' },
                'tools:reporting':      { label: 'Report Builder' },
                // Advanced Analytics
                'advanced:aiCoach':           { label: 'AI Academic Coach' },
                'advanced:successPredictor':  { label: 'Success Predictor' },
                'advanced:learningAnalytics': { label: 'Learning Analytics' },
                'advanced:wellness':          { label: 'Wellness Monitor' },
                'advanced:integrity':         { label: 'Academic Integrity' },
                'advanced:financialAid':      { label: 'Financial Aid' }
            },
            action: {
                'export':            { label: 'Export Data (CSV/PDF)' },
                'poll:create':       { label: 'Create Polls' },
                'poll:simulate':     { label: 'Simulate Poll Responses' },
                'case:create':       { label: 'Create Support Cases' },
                'case:close':        { label: 'Close Support Cases' },
                'refer:create':      { label: 'Create Referrals' },
                'curriculum:edit':   { label: 'Edit Curriculum Structure' },
                'grade:enter':       { label: 'Enter/Modify Grades' },
                'alert:configure':   { label: 'Configure Alert Thresholds' },
                'user:manage':       { label: 'Manage User Accounts' },
                'role:manage':       { label: 'Manage Roles & Permissions' },
                'message:send':      { label: 'Send Messages to Students' },
                'report:generate':   { label: 'Generate Reports' }
            },
            data: {
                // Academic
                'academic.institution.read':  { label: 'View Institutions' },
                'academic.institution.write': { label: 'Manage Institutions' },
                'academic.programme.read':    { label: 'View Programmes' },
                'academic.programme.write':   { label: 'Manage Programmes' },
                'academic.course.read':       { label: 'View Courses' },
                'academic.course.write':      { label: 'Manage Courses' },
                'academic.offering.read':     { label: 'View Offerings' },
                'academic.offering.write':    { label: 'Manage Offerings' },
                // Enrolment
                'enrolment.own.read':   { label: 'View Own Enrolments' },
                'enrolment.class.read': { label: 'View Class Enrolments' },
                'enrolment.all.read':   { label: 'View All Enrolments' },
                'enrolment.write':      { label: 'Manage Enrolments' },
                // Result
                'result.own.read':    { label: 'View Own Results' },
                'result.class.read':  { label: 'View Class Results' },
                'result.class.write': { label: 'Enter Class Grades' },
                'result.all.read':    { label: 'View All Results' },
                'result.all.write':   { label: 'Manage All Grades' },
                // Attendance
                'attendance.own.read':    { label: 'View Own Attendance' },
                'attendance.class.read':  { label: 'View Class Attendance' },
                'attendance.class.write': { label: 'Record Class Attendance' },
                'attendance.all.read':    { label: 'View All Attendance' },
                // DP
                'dp.class.read':  { label: 'View Class DP Status' },
                'dp.class.write': { label: 'Manage Class DP' },
                'dp.all.read':    { label: 'View All DP Status' },
                'dp.all.write':   { label: 'Manage All DP' },
                // Registration
                'registration.advise':    { label: 'Use Registration Advisor' },
                'registration.rule.read': { label: 'View Registration Rules' },
                'registration.rule.write':{ label: 'Manage Registration Rules' },
                // Risk
                'risk.own.read':    { label: 'View Own Risk Status' },
                'risk.class.read':  { label: 'View Class Risk' },
                'risk.all.read':    { label: 'View All Risk' },
                'risk.flag':        { label: 'Flag At-Risk' },
                'risk.rule.write':  { label: 'Manage Risk Rules' },
                // Case
                'case.own.read':       { label: 'View Own Cases' },
                'case.assigned.read':  { label: 'View Assigned Cases' },
                'case.assigned.write': { label: 'Manage Assigned Cases' },
                'case.all.read':       { label: 'View All Cases' },
                'case.all.write':      { label: 'Manage All Cases' },
                'case.assign':         { label: 'Assign Cases' },
                // Assessment
                'assessment.own.read':    { label: 'View Own Assessments' },
                'assessment.own.take':    { label: 'Take Assessments' },
                'assessment.class.read':  { label: 'View Class Assessments' },
                'assessment.class.write': { label: 'Manage Class Assessments' },
                'assessment.all.read':    { label: 'View All Assessments' },
                'assessment.all.write':   { label: 'Manage All Assessments' },
                // Portfolio
                'portfolio.own.read':  { label: 'View Own Portfolio' },
                'portfolio.own.write': { label: 'Manage Own Portfolio' },
                'portfolio.all.read':  { label: 'View All Portfolios' },
                'portfolio.verify':    { label: 'Verify Evidence' },
                // GA
                'ga.read':  { label: 'View Graduate Attributes' },
                'ga.write': { label: 'Manage Graduate Attributes' },
                // Compliance
                'compliance.read':   { label: 'View Compliance' },
                'compliance.report': { label: 'Generate Compliance Reports' },
                // Analytics
                'analytics.own.read':         { label: 'View Own Analytics' },
                'analytics.class.read':       { label: 'View Class Analytics' },
                'analytics.programme.read':   { label: 'View Programme Analytics' },
                'analytics.institution.read': { label: 'View Institution Analytics' },
                'analytics.export':           { label: 'Export Analytics' },
                // Report
                'report.cohort':     { label: 'View Cohort Reports' },
                'report.throughput': { label: 'View Throughput Reports' },
                'report.hemis':      { label: 'View HEMIS Reports' },
                // Gamification
                'gamification.own.read':         { label: 'View Own Progress' },
                'gamification.leaderboard.read': { label: 'View Leaderboard' },
                'gamification.config':           { label: 'Configure Gamification' },
                // Message
                'message.send.class': { label: 'Message Class' },
                'message.send.all':   { label: 'Message Anyone' },
                'message.broadcast':  { label: 'Broadcast Messages' },
                // Admin
                'admin.user.read':    { label: 'View Users' },
                'admin.user.write':   { label: 'Manage Users' },
                'admin.role.read':    { label: 'View Roles' },
                'admin.role.write':   { label: 'Manage Roles' },
                'admin.config':       { label: 'System Configuration' },
                'admin.audit':        { label: 'View Audit Logs' },
                'admin.integration':  { label: 'Manage Integrations' }
            }
        },
        roles: {
            sysadmin: {
                label: 'System Administrator',
                description: 'Full unrestricted access to all components and actions',
                level: 1,
                permissions: ['*']
            },
            lecturer: {
                label: 'Lecturer',
                description: 'Classroom tools scoped to assigned course codes',
                level: 3,
                permissions: [
                    'view:classroom:*',
                    'view:tools:messaging',
                    'view:tools:timetabling',
                    'view:tools:notifications',
                    'action:export',
                    'action:poll:create',
                    'action:poll:simulate',
                    'action:grade:enter',
                    'action:message:send',
                    // Data: class-scoped
                    'data:enrolment.class.read',
                    'data:result.class.read',
                    'data:result.class.write',
                    'data:attendance.class.read',
                    'data:attendance.class.write',
                    'data:dp.class.read',
                    'data:dp.class.write',
                    'data:risk.class.read',
                    'data:risk.flag',
                    'data:assessment.class.read',
                    'data:assessment.class.write',
                    'data:analytics.class.read',
                    'data:message.send.class',
                    'data:academic.programme.read',
                    'data:academic.course.read',
                    'data:academic.offering.read',
                    'data:ga.read',
                    'data:gamification.leaderboard.read'
                ]
            },
            programmeCoordinator: {
                label: 'Programme Coordinator',
                description: 'Programme analytics + classroom, scoped to assigned programmes',
                level: 3,
                permissions: [
                    'view:programme:*',
                    'view:classroom:*',
                    'view:tools:*',
                    'action:export',
                    'action:curriculum:edit',
                    'action:report:generate',
                    // Data: programme + all read
                    'data:academic.programme.read',
                    'data:academic.programme.write',
                    'data:academic.course.read',
                    'data:academic.course.write',
                    'data:academic.offering.read',
                    'data:academic.offering.write',
                    'data:enrolment.all.read',
                    'data:result.all.read',
                    'data:attendance.all.read',
                    'data:dp.all.read',
                    'data:risk.all.read',
                    'data:analytics.programme.read',
                    'data:analytics.export',
                    'data:ga.read',
                    'data:ga.write',
                    'data:compliance.read',
                    'data:compliance.report',
                    'data:portfolio.all.read',
                    'data:portfolio.verify',
                    'data:report.cohort',
                    'data:report.throughput',
                    'data:message.send.all',
                    'data:registration.advise',
                    'data:registration.rule.read',
                    'data:registration.rule.write'
                ]
            },
            student: {
                label: 'Student',
                description: 'Student Central only, scoped to own data',
                level: 5,
                permissions: [
                    'view:student:*',
                    // Data: own-scoped
                    'data:enrolment.own.read',
                    'data:result.own.read',
                    'data:attendance.own.read',
                    'data:risk.own.read',
                    'data:case.own.read',
                    'data:assessment.own.read',
                    'data:assessment.own.take',
                    'data:portfolio.own.read',
                    'data:portfolio.own.write',
                    'data:analytics.own.read',
                    'data:gamification.own.read',
                    'data:gamification.leaderboard.read',
                    'data:academic.programme.read',
                    'data:academic.course.read',
                    'data:ga.read',
                    'data:registration.advise'
                ]
            },
            counsellor: {
                label: 'Student Counsellor',
                description: 'Casework tools + student lookup',
                level: 3,
                permissions: [
                    'view:casework:*',
                    'view:tools:browser',
                    'view:tools:messaging',
                    'view:tools:notifications',
                    'action:case:create',
                    'action:case:close',
                    'action:refer:create',
                    'action:message:send',
                    'action:export',
                    // Data: case management + read context
                    'data:case.assigned.read',
                    'data:case.assigned.write',
                    'data:case.all.read',
                    'data:case.all.write',
                    'data:enrolment.all.read',
                    'data:result.all.read',
                    'data:attendance.all.read',
                    'data:risk.all.read',
                    'data:risk.flag',
                    'data:analytics.own.read',
                    'data:message.send.all',
                    'data:portfolio.all.read',
                    'data:academic.programme.read',
                    'data:academic.course.read'
                ]
            },
            accreditationOfficer: {
                label: 'Accreditation Officer',
                description: 'Accreditation workflows + programme read access',
                level: 3,
                permissions: [
                    'view:accreditation:*',
                    'view:programme:progOverview',
                    'view:programme:outcomeMapping',
                    'action:export',
                    'action:report:generate',
                    // Data: GA + compliance + portfolio
                    'data:ga.read',
                    'data:ga.write',
                    'data:compliance.read',
                    'data:compliance.report',
                    'data:portfolio.all.read',
                    'data:portfolio.verify',
                    'data:academic.programme.read',
                    'data:academic.course.read'
                ]
            },
            executive: {
                label: 'Executive',
                description: 'Executive dashboards + programme-level read access',
                level: 2,
                permissions: [
                    'view:executive:*',
                    'view:programme:progOverview',
                    'view:programme:cohortCompare',
                    'action:export',
                    'action:report:generate',
                    // Data: institution-wide analytics + reports
                    'data:analytics.institution.read',
                    'data:analytics.programme.read',
                    'data:analytics.export',
                    'data:report.cohort',
                    'data:report.throughput',
                    'data:report.hemis',
                    'data:compliance.read',
                    'data:risk.all.read',
                    'data:case.all.read',
                    'data:academic.institution.read',
                    'data:academic.programme.read',
                    'data:academic.course.read',
                    'data:enrolment.all.read'
                ]
            },
            departmentAdmin: {
                label: 'Department Administrator',
                description: 'User/role management + system configuration',
                level: 2,
                permissions: [
                    'view:admin:*',
                    'view:tools:*',
                    'view:executive:*',
                    'action:user:manage',
                    'action:role:manage',
                    'action:alert:configure',
                    'action:export',
                    'action:report:generate',
                    // Data: admin + user management
                    'data:admin.user.read',
                    'data:admin.user.write',
                    'data:admin.role.read',
                    'data:admin.role.write',
                    'data:admin.config',
                    'data:admin.audit',
                    'data:admin.integration',
                    'data:analytics.institution.read',
                    'data:analytics.programme.read',
                    'data:analytics.export',
                    'data:report.cohort',
                    'data:report.throughput'
                ]
            }
        }
    };

    static SCOPE_RULES = {
        classroom:     { groupType: 'course' },
        programme:     { groupType: 'programme' },
        faculty:       { groupType: 'faculty' },
        department:    { groupType: 'department' },
        student:       { identifierKey: 'studentNumber' },
        casework:      { unrestricted: true },
        accreditation: { unrestricted: true },
        executive:     { unrestricted: true },
        admin:         { unrestricted: true },
        tools:         { inherited: true, inheritFrom: 'classroom' },
        advanced:      { inherited: true, inheritFrom: 'classroom' }
    };

    static DEMO_COURSES = [
        { code: 'COMP101', name: 'Introduction to Computing' },
        { code: 'COMP201', name: 'Data Structures & Algorithms' },
        { code: 'COMP301', name: 'Software Engineering' },
        { code: 'MATH101', name: 'Calculus I' },
        { code: 'MATH201', name: 'Linear Algebra' },
        { code: 'PHYS101', name: 'Physics I' },
        { code: 'MGAB401', name: 'Management Accounting' },
        { code: 'ENGL101', name: 'Academic Literacy' }
    ];

    static DEMO_PROGRAMMES = [
        { code: 'BSc-CS',   name: 'BSc Computer Science' },
        { code: 'BSc-IT',   name: 'BSc Information Technology' },
        { code: 'BEng-EE',  name: 'BEng Electrical Engineering' },
        { code: 'BCom-ACC', name: 'BCom Accounting' }
    ];

    static DEMO_FACULTIES = [
        { code: 'FST', name: 'Faculty of Science & Technology' },
        { code: 'FBM', name: 'Faculty of Business & Management' }
    ];

    static DEMO_DEPARTMENTS = [
        { code: 'CS',   name: 'Computer Science',       faculty: 'FST' },
        { code: 'EE',   name: 'Electrical Engineering',  faculty: 'FST' },
        { code: 'ACC',  name: 'Accounting',              faculty: 'FBM' },
        { code: 'MGMT', name: 'Management Studies',      faculty: 'FBM' }
    ];

    static DEMO_USERS = [
        { username: 'admin',       displayName: 'System Admin',      email: 'admin@dut.ac.za',        role: 'sysadmin',              staffNo: 'ADM001' },
        { username: 'dr.smith',    displayName: 'Dr. R. Smith',      email: 'smithr@dut.ac.za',       role: 'lecturer',              staffNo: 'STF001', courses: ['COMP101', 'COMP201'] },
        { username: 'prof.zulu',   displayName: 'Prof. N. Zulu',     email: 'zulun@dut.ac.za',        role: 'programmeCoordinator',  staffNo: 'STF002', courses: ['COMP301', 'MATH201'], programmes: ['BSc-CS', 'BSc-IT'] },
        { username: 'dr.pillay',   displayName: 'Dr. S. Pillay',     email: 'pillays@dut.ac.za',      role: 'lecturer',              staffNo: 'STF003', courses: ['MATH101', 'PHYS101'] },
        { username: 'ms.dlamini',  displayName: 'Ms. T. Dlamini',    email: 'dlaminit@dut.ac.za',     role: 'counsellor',            staffNo: 'STF004' },
        { username: 'dr.naidoo',   displayName: 'Dr. P. Naidoo',     email: 'naidoop@dut.ac.za',      role: 'accreditationOfficer',  staffNo: 'STF005' },
        { username: 'prof.moyo',   displayName: 'Prof. L. Moyo',     email: 'moyol@dut.ac.za',        role: 'executive',             staffNo: 'STF006' },
        { username: 'mr.govender', displayName: 'Mr. K. Govender',   email: 'govenderk@dut.ac.za',    role: 'departmentAdmin',       staffNo: 'STF007' },
        { username: 'stu.220001',  displayName: 'Thabo Molefe',      email: '22000145@dut4life.ac.za', role: 'student',              studentNo: '22000145', programmes: ['BSc-CS'] },
        { username: 'stu.220002',  displayName: 'Ayanda Khumalo',    email: '22000298@dut4life.ac.za', role: 'student',              studentNo: '22000298', programmes: ['BEng-EE'] }
    ];

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._accordion = null;
        this._statusBadge = null;

        this._memberService = null;
        this._groupService = null;
        this._bound = false;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._initServices();
        this._buildControl();
        this._renderWelcome();
    }

    // ── Service Initialization ───────────────────────────────────────────────

    _initServices() {
        this._memberService = new MemberService();
        this._groupService = new GroupService();

        this._memberService.bindToSystem(UserManagementPanel.RBAC_CONFIG);
        this._memberService.bindGroupContext(
            this._groupService,
            UserManagementPanel.SCOPE_RULES
        );

        this._bound = true;
    }

    // ── Seed Demo Data ───────────────────────────────────────────────────────

    _seedDemoData() {
        const ms = this._memberService;
        const gs = this._groupService;

        // Clear existing
        ms.table('member').all().forEach(m => ms.table('member').delete(m.idx));
        ms.table('memberRoleLink').all().forEach(l => ms.table('memberRoleLink').delete(l.idx));
        ms.table('memberProfile').all().forEach(p => ms.table('memberProfile').delete(p.idx));
        gs.table('group').all().forEach(g => gs.table('group').delete(g.idx));
        gs.table('groupMember').all().forEach(gm => gs.table('groupMember').delete(gm.idx));

        // Re-bind to regenerate role records
        ms.bindToSystem(UserManagementPanel.RBAC_CONFIG);

        // Create course groups
        const courseGroupMap = {};
        UserManagementPanel.DEMO_COURSES.forEach(c => {
            const g = gs.createGroup({ name: c.name, type: 'course', code: c.code, visibility: 'public' });
            courseGroupMap[c.code] = g.idx;
        });

        // Create programme groups
        const progGroupMap = {};
        UserManagementPanel.DEMO_PROGRAMMES.forEach(p => {
            const g = gs.createGroup({ name: p.name, type: 'programme', code: p.code, visibility: 'public' });
            progGroupMap[p.code] = g.idx;
        });

        // Create faculty groups
        const facultyGroupMap = {};
        UserManagementPanel.DEMO_FACULTIES.forEach(f => {
            const g = gs.createGroup({ name: f.name, type: 'faculty', code: f.code, visibility: 'public' });
            facultyGroupMap[f.code] = g.idx;
        });

        // Create department groups
        const deptGroupMap = {};
        UserManagementPanel.DEMO_DEPARTMENTS.forEach(d => {
            const g = gs.createGroup({ name: d.name, type: 'department', code: d.code, visibility: 'public' });
            deptGroupMap[d.code] = g.idx;
        });

        // Create users
        const now = new Date().toISOString();
        const roleTable = ms.table('memberRole');
        const allRoles = roleTable.all();

        UserManagementPanel.DEMO_USERS.forEach(u => {
            const member = ms.table('member').create({
                username: u.username,
                email: u.email,
                displayName: u.displayName,
                status: 'active',
                createdAt: now
            });

            // Assign role
            const roleDef = UserManagementPanel.RBAC_CONFIG.roles[u.role];
            if (roleDef) {
                const roleRec = allRoles.find(r => r.get('name') === roleDef.label);
                if (roleRec) ms.assignRole(member.idx, roleRec.idx);
            }

            // Create profile with metadata
            const meta = {};
            if (u.staffNo) meta.staffNumber = u.staffNo;
            if (u.studentNo) meta.studentNumber = u.studentNo;
            meta.persona = u.role;
            ms.updateProfile(member.idx, { metadata: JSON.stringify(meta) });

            // Assign course groups
            if (u.courses) {
                u.courses.forEach(code => {
                    const gId = courseGroupMap[code];
                    if (gId) {
                        const role = (u.role === 'student') ? 'viewer' : 'admin';
                        gs.addMember(gId, member.idx, role);
                    }
                });
            }

            // Assign programme groups
            if (u.programmes) {
                u.programmes.forEach(code => {
                    const gId = progGroupMap[code];
                    if (gId) {
                        const role = (u.role === 'student') ? 'member' :
                                     (u.role === 'programmeCoordinator') ? 'owner' : 'member';
                        gs.addMember(gId, member.idx, role);
                    }
                });
            }

            // Students also get sample course groups
            if (u.role === 'student' && u.programmes) {
                const sampleCourses = (u.username === 'stu.220001')
                    ? ['COMP101', 'COMP201', 'MATH101']
                    : ['PHYS101', 'MATH101', 'ENGL101'];
                sampleCourses.forEach(code => {
                    const gId = courseGroupMap[code];
                    if (gId) gs.addMember(gId, member.idx, 'viewer');
                });
            }

            // Assign staff to faculty/department groups based on role
            if (u.role !== 'student') {
                // Most staff in FST, dept admin in CS
                const staffFaculty = (u.role === 'executive') ? 'FST' : 'FST';
                const fId = facultyGroupMap[staffFaculty];
                if (fId) gs.addMember(fId, member.idx, u.role === 'executive' ? 'owner' : 'member');

                if (u.role === 'departmentAdmin') {
                    const dId = deptGroupMap['CS'];
                    if (dId) gs.addMember(dId, member.idx, 'admin');
                } else if (u.role === 'lecturer' || u.role === 'programmeCoordinator') {
                    const dId = deptGroupMap['CS'];
                    if (dId) gs.addMember(dId, member.idx, 'member');
                }
            }
        });

        // Login as admin by default
        const admin = ms.table('member').all().find(m => m.get('username') === 'admin');
        if (admin) ms.login(admin.idx);
    }

    // ── Control Panel ────────────────────────────────────────────────────────

    _buildControl() {
        this._controlEl.innerHTML = '';

        // Status badge
        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'ump-badge-wrap';
        this._controlEl.appendChild(badgeWrap);
        this._statusBadge = new uiBadge({
            label: 'Not initialized',
            color: 'secondary',
            size: 'sm',
            parent: badgeWrap
        });

        // Accordion
        const accWrap = document.createElement('div');
        this._controlEl.appendChild(accWrap);
        this._accordion = new uiAccordion({
            parent: accWrap,
            exclusive: true,
            content: {
                actions:  { label: '<i class="fas fa-bolt" style="margin-right:0.3rem;"></i>Actions', open: true },
                switcher: { label: '<i class="fas fa-user-circle" style="margin-right:0.3rem;"></i>Active User' },
                groups:   { label: '<i class="fas fa-layer-group" style="margin-right:0.3rem;"></i>Scope Groups' },
                stats:    { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Statistics' }
            }
        });

        this._renderActionsPane();
        this._renderSwitcherPane();
        this._renderGroupsPane();
        this._renderStatsPane();
    }

    _renderActionsPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="actions"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        const btnWrap = document.createElement('div');
        btnWrap.className = 'ui-flex ui-flex-col ui-gap-1';
        el.appendChild(btnWrap);

        // Seed Demo Data
        const seedDiv = document.createElement('div');
        btnWrap.appendChild(seedDiv);
        new uiButtonGroup({
            parent: seedDiv,
            buttons: [{
                label: 'Seed Demo Data',
                icon: '<i class="fas fa-database"></i>',
                color: 'primary',
                size: 'sm',
                onClick: () => {
                    this._seedDemoData();
                    this._statusBadge.update({ label: `${this._memberService.table('member').all().length} users loaded`, color: 'green' });
                    this._refreshControlPanes();
                    this._renderDashboard();
                }
            }]
        });

        // New Scope Group
        const grpDiv = document.createElement('div');
        btnWrap.appendChild(grpDiv);
        new uiButtonGroup({
            parent: grpDiv,
            buttons: [{
                label: 'New Scope Group',
                icon: '<i class="fas fa-folder-plus"></i>',
                color: 'secondary',
                variant: 'outline',
                size: 'sm',
                onClick: () => this._showNewGroupForm()
            }]
        });

    }

    _renderSwitcherPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="switcher"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        // Delegate to MemberService's built-in user switcher view
        this._memberService.views.renderUserSwitcher(el, {
            onSwitch: () => {
                this._refreshControlPanes();
                this._renderDashboard();
            }
        });
    }

    _renderGroupsPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="groups"] .ui-accordion-content');
        if (!el) return;
        this._groupService.views.renderGroupSummary(el);
    }

    _renderStatsPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        if (!el) return;
        this._memberService.views.renderStats(el, { groupService: this._groupService });
    }

    _refreshControlPanes() {
        this._renderSwitcherPane();
        this._renderGroupsPane();
        this._renderStatsPane();
    }

    // ── Stage: Welcome ───────────────────────────────────────────────────────

    _renderWelcome() {
        this._stageEl.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'as-flex-col ump-welcome';
        wrap.innerHTML = `
            <i class="fas fa-users-cog ump-welcome-icon"></i>
            <h3 class="ump-welcome-title">User Management</h3>
            <p class="ump-welcome-desc">
                Manage users, roles, permissions, and context-scoped access for AutoScholar.
                Click <strong>Seed Demo Data</strong> in the control panel to populate the system
                with sample users, roles, course groups, and programme groups.
            </p>
            <div class="aa-metric-row as-flex-row-center">
                <span class="aa-metric-chip aa-chip-blue"><i class="fas fa-shield-alt"></i><span class="aa-metric-chip-value">8 Roles</span><span class="aa-metric-chip-label">Admin to Student</span></span>
                <span class="aa-metric-chip aa-chip-green"><i class="fas fa-layer-group"></i><span class="aa-metric-chip-value">Context Scoping</span><span class="aa-metric-chip-label">Course &amp; Programme</span></span>
                <span class="aa-metric-chip aa-chip-amber"><i class="fas fa-check-double"></i><span class="aa-metric-chip-value">Effective Perms</span><span class="aa-metric-chip-label">Audit any user</span></span>
            </div>
        `;
        this._stageEl.appendChild(wrap);
    }

    // ── Stage: Dashboard ─────────────────────────────────────────────────────

    _renderDashboard() {
        this._stageEl.innerHTML = '';
        const ms = this._memberService;

        if (!ms.isLoggedIn()) {
            this._renderWelcome();
            return;
        }

        const member = ms.getCurrentMember();
        const wrap = document.createElement('div');
        wrap.className = 'ump-dash-wrap';
        this._stageEl.appendChild(wrap);

        // Header
        const header = document.createElement('div');
        header.className = 'ui-flex ui-items-center ui-gap-3 ump-dash-header';
        const initials = (member.get('displayName') || '?').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
        header.innerHTML = `
            <div class="as-avatar as-avatar-lg">${initials}</div>
            <div class="as-flex-1">
                <div class="ui-font-bold ump-dash-name">${member.get('displayName')}</div>
                <div class="ump-dash-meta">${member.get('email')} &middot; ${ms.getCurrentRoleLabel()} &middot; Level ${ms.getRoleLevel()}</div>
            </div>
        `;
        wrap.appendChild(header);

        // Tabs — use content keyed format (uiTabs API)
        const tabWrap = document.createElement('div');
        tabWrap.className = 'ump-tab-wrap';
        wrap.appendChild(tabWrap);

        const tabs = new uiTabs({
            parent: tabWrap,
            content: {
                manager:  { label: '<i class="fas fa-users" style="margin-right:0.3rem;"></i>Member Manager' },
                perms:    { label: '<i class="fas fa-border-all" style="margin-right:0.3rem;"></i>Permission Matrix' },
                access:   { label: '<i class="fas fa-th-large" style="margin-right:0.3rem;"></i>Access Overview' },
                scopemap: { label: '<i class="fas fa-project-diagram" style="margin-right:0.3rem;"></i>Scope Map' },
                roleconfig: { label: '<i class="fas fa-user-shield" style="margin-right:0.3rem;"></i>Roles' }
            }
        });

        // Make tabs fill container and panels scroll
        tabs.el.classList.add('ump-tabs-fill');
        tabs.el.querySelectorAll('.ui-tabs-panel').forEach(p => {
            p.classList.add('ump-tab-panel');
        });

        // Grab panel elements
        const panels = {
            manager:  tabs.el.querySelector('.ui-tabs-panel[data-tab="manager"]'),
            perms:    tabs.el.querySelector('.ui-tabs-panel[data-tab="perms"]'),
            access:   tabs.el.querySelector('.ui-tabs-panel[data-tab="access"]'),
            scopemap: tabs.el.querySelector('.ui-tabs-panel[data-tab="scopemap"]'),
            roleconfig: tabs.el.querySelector('.ui-tabs-panel[data-tab="roleconfig"]')
        };

        // Render content into each panel
        const renderTab = (key) => {
            const panel = panels[key];
            if (!panel || panel.dataset.loaded) return;
            panel.dataset.loaded = '1';
            switch (key) {
                case 'manager':  ms.views.renderMemberManager(panel, {
                        groupPicker: (groupType, excludeIds, onResult) => {
                            new GroupPickerModal({
                                groupService: this._groupService,
                                groupType,
                                excludeIds,
                                showRoleSelect: true,
                                onSelect: onResult
                            }).open();
                        }
                    }); break;
                case 'perms':    ms.views.renderPermissionMatrix(panel); break;
                case 'access':   this._renderAccessOverview(panel); break;
                case 'scopemap': this._renderScopeMap(panel); break;
                case 'roleconfig': this._renderRolesTab(panel); break;
            }
        };

        // Render active tab immediately, others on click
        renderTab('manager');
        tabs.bus.on('tabChange', ({ tab }) => renderTab(tab));
    }

    // ── Stage Tab: Access Overview (delegates to MemberService view) ────────

    _renderAccessOverview(container) {
        this._memberService.views.renderAccessOverview(container, {
            groupLabels: {
                classroom: 'ClassView Connect', student: 'Student Central',
                programme: 'Programme Analyst', casework: 'Casework Counsellor',
                accreditation: 'Accreditation AutoMate', executive: 'Executive Insight',
                admin: 'System & Config', tools: 'Communication & Tools',
                advanced: 'Advanced Analytics'
            }
        });
    }

    // ── Stage Tab: Scope Map (delegates to MemberService view) ───────────────

    _renderScopeMap(container) {
        this._memberService.views.renderScopeMap(container);
    }

    // ── Stage Tab: Roles (embedded RoleConfigurationPanel) ─────────────────

    _renderRolesTab(container) {
        // Create a control-stage layout inside the tab for the RoleConfigurationPanel
        const cs = new uiControlStage({ controlSize: 'md', parent: container });
        const rolePanel = new RoleConfigurationPanel();
        rolePanel.render(cs.getControlPanel(), cs.getStage());
    }

    // ── Forms ────────────────────────────────────────────────────────────────

    _showNewGroupForm() {
        this._stageEl.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'ump-form-wrap';
        this._stageEl.appendChild(wrap);

        this._groupService.views.renderGroupCreator(wrap, {
            onCreated: () => { this._refreshControlPanes(); this._renderDashboard(); },
            onCancel:  () => this._renderDashboard()
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserManagementPanel };
}
