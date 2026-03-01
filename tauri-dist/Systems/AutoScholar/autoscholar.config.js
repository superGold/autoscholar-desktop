/**
 * AutoScholar Configuration
 *
 * Branding, sections, roles, permissions, status maps, service registry, sample data.
 * Pure data registries + initialization methods for MemberService.
 */

// =============================================================================
// DATA REGISTRIES (pure data, no logic)
// =============================================================================

const AutoScholarConfigData = {

    // ─────────────────────────────────────────────────────────────────────────
    // Branding
    // ─────────────────────────────────────────────────────────────────────────

    BRAND: {
        name: 'AutoScholar',
        tagline: 'Academic Management System',
        icon: 'fas fa-graduation-cap',
        poweredBy: 'Publon.Press',
        version: '2.0.0'
    },

    // ─────────────────────────────────────────────────────────────────────────
    // API Configuration (for ApiBinding wiring)
    // ─────────────────────────────────────────────────────────────────────────

    API_CONFIG: {
        apiUrl: null,            // Set per-institution via Implementations-*/config.json
        system: 'autoscholar',
        defaultImpl: 'dut',
        // ApiBinding wiring pattern (for standardized REST when backend is ready):
        //   const binding = new ApiBinding(publome.table('student'), {
        //       apiUrl: AutoScholarConfig.data.API_CONFIG.apiUrl,
        //       endpoint: '/students',
        //       apiToken: token,
        //       transformResponse: (row) => ({ ...row, idx: row.id })
        //   });
        //   await binding.read();
        endpoints: {
            student:    '/api/students',
            course:     '/api/courses',
            offering:   '/api/offerings',
            enrolment:  '/api/enrolments',
            result:     '/api/results',
            assessment: '/api/assessments',
            programme:  '/api/programmes',
            faculty:    '/api/faculties',
            department: '/api/departments'
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Navigation sections (role-based modules)
    // ─────────────────────────────────────────────────────────────────────────

    SECTIONS: {
        hub:           { label: 'Hub',                      icon: '<i class="fas fa-home"></i>',              description: 'Dashboard and quick access' },
        student:       { label: 'Student Central',          icon: '<i class="fas fa-user-graduate"></i>',     description: 'Your academic records, degree progress, results, and career planning tools' },
        lecturer:      { label: 'ClassView Connect',        icon: '<i class="fas fa-chalkboard-teacher"></i>', description: 'Classroom management, student risk monitoring, and assessment analytics' },
        analyst:       { label: 'Programme Analyst',        icon: '<i class="fas fa-chart-line"></i>',        description: 'Cohort tracking, curriculum health, throughput analysis, and programme benchmarking' },
        counsellor:    { label: 'Casework Counsellor',      icon: '<i class="fas fa-hands-helping"></i>',     description: 'Student support case management, interventions, and wellness tracking' },
        executive:     { label: 'Executive Insight',        icon: '<i class="fas fa-briefcase"></i>',         description: 'Institutional KPIs, strategic dashboards, programme health matrix, and decision rehearsal' },
        accreditation: { label: 'Accreditation Automate',   icon: '<i class="fas fa-certificate"></i>',       description: 'Criterion evaluation, compliance matrix, evidence collection, and accreditation reporting' },
        about:         { label: 'About',                    icon: '<i class="fas fa-info-circle"></i>',       description: 'System information and documentation' }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Tab visibility per role
    // ─────────────────────────────────────────────────────────────────────────

    ROLE_TABS: {
        as_admin:       ['hub', 'student', 'lecturer', 'analyst', 'counsellor', 'executive', 'accreditation', 'about'],
        as_lecturer:    ['hub', 'lecturer', 'about'],
        as_coordinator: ['hub', 'lecturer', 'analyst', 'accreditation', 'about'],
        as_student:     ['hub', 'student', 'about'],
        as_counsellor:  ['hub', 'counsellor', 'about'],
        as_executive:   ['hub', 'executive', 'about']
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Permissions
    // ─────────────────────────────────────────────────────────────────────────

    PERMISSIONS: {
        // Academic
        'academic.institution.read':  { label: 'View Institutions',        category: 'academic' },
        'academic.institution.write': { label: 'Manage Institutions',      category: 'academic' },
        'academic.programme.read':    { label: 'View Programmes',          category: 'academic' },
        'academic.programme.write':   { label: 'Manage Programmes',        category: 'academic' },
        'academic.course.read':       { label: 'View Courses',             category: 'academic' },
        'academic.course.write':      { label: 'Manage Courses',           category: 'academic' },
        'academic.offering.read':     { label: 'View Offerings',           category: 'academic' },
        'academic.offering.write':    { label: 'Manage Offerings',         category: 'academic' },

        // Enrolment & Results
        'enrolment.own.read':    { label: 'View Own Enrolments',     category: 'enrolment' },
        'enrolment.class.read':  { label: 'View Class Enrolments',   category: 'enrolment' },
        'enrolment.all.read':    { label: 'View All Enrolments',     category: 'enrolment' },
        'enrolment.write':       { label: 'Manage Enrolments',       category: 'enrolment' },
        'result.own.read':       { label: 'View Own Results',        category: 'result' },
        'result.class.read':     { label: 'View Class Results',      category: 'result' },
        'result.class.write':    { label: 'Enter Class Grades',      category: 'result' },
        'result.all.read':       { label: 'View All Results',        category: 'result' },
        'result.all.write':      { label: 'Manage All Grades',       category: 'result' },

        // Attendance & DP
        'attendance.own.read':   { label: 'View Own Attendance',     category: 'attendance' },
        'attendance.class.read': { label: 'View Class Attendance',   category: 'attendance' },
        'attendance.class.write':{ label: 'Record Class Attendance', category: 'attendance' },
        'attendance.all.read':   { label: 'View All Attendance',     category: 'attendance' },
        'dp.class.read':         { label: 'View Class DP Status',   category: 'dp' },
        'dp.class.write':        { label: 'Manage Class DP',        category: 'dp' },
        'dp.all.read':           { label: 'View All DP Status',     category: 'dp' },
        'dp.all.write':          { label: 'Manage All DP',          category: 'dp' },

        // Registration
        'registration.advise':    { label: 'Use Registration Advisor',   category: 'registration' },
        'registration.rule.read': { label: 'View Registration Rules',    category: 'registration' },
        'registration.rule.write':{ label: 'Manage Registration Rules',  category: 'registration' },

        // Risk & Support
        'risk.own.read':    { label: 'View Own Risk Status',   category: 'risk' },
        'risk.class.read':  { label: 'View Class Risk',        category: 'risk' },
        'risk.all.read':    { label: 'View All Risk',          category: 'risk' },
        'risk.flag':        { label: 'Flag At-Risk',           category: 'risk' },
        'risk.rule.write':  { label: 'Manage Risk Rules',      category: 'risk' },
        'case.own.read':       { label: 'View Own Cases',         category: 'case' },
        'case.assigned.read':  { label: 'View Assigned Cases',    category: 'case' },
        'case.assigned.write': { label: 'Manage Assigned Cases',  category: 'case' },
        'case.all.read':       { label: 'View All Cases',         category: 'case' },
        'case.all.write':      { label: 'Manage All Cases',       category: 'case' },
        'case.assign':         { label: 'Assign Cases',           category: 'case' },

        // Assessment
        'assessment.own.read':    { label: 'View Own Assessments',      category: 'assessment' },
        'assessment.own.take':    { label: 'Take Assessments',          category: 'assessment' },
        'assessment.class.read':  { label: 'View Class Assessments',    category: 'assessment' },
        'assessment.class.write': { label: 'Manage Class Assessments',  category: 'assessment' },
        'assessment.all.read':    { label: 'View All Assessments',      category: 'assessment' },
        'assessment.all.write':   { label: 'Manage All Assessments',    category: 'assessment' },

        // Portfolio & Accreditation
        'portfolio.own.read':  { label: 'View Own Portfolio',    category: 'portfolio' },
        'portfolio.own.write': { label: 'Manage Own Portfolio',  category: 'portfolio' },
        'portfolio.all.read':  { label: 'View All Portfolios',   category: 'portfolio' },
        'portfolio.verify':    { label: 'Verify Evidence',       category: 'portfolio' },
        'ga.read':             { label: 'View Graduate Attributes', category: 'ga' },
        'ga.write':            { label: 'Manage Graduate Attributes', category: 'ga' },
        'compliance.read':     { label: 'View Compliance',       category: 'compliance' },
        'compliance.report':   { label: 'Generate Compliance Reports', category: 'compliance' },

        // Analytics & Reporting
        'analytics.own.read':         { label: 'View Own Analytics',         category: 'analytics' },
        'analytics.class.read':       { label: 'View Class Analytics',       category: 'analytics' },
        'analytics.programme.read':   { label: 'View Programme Analytics',   category: 'analytics' },
        'analytics.institution.read': { label: 'View Institution Analytics', category: 'analytics' },
        'analytics.export':           { label: 'Export Analytics',           category: 'analytics' },
        'report.cohort':     { label: 'View Cohort Reports',     category: 'report' },
        'report.throughput': { label: 'View Throughput Reports',  category: 'report' },
        'report.hemis':      { label: 'View HEMIS Reports',      category: 'report' },

        // Gamification
        'gamification.own.read':        { label: 'View Own Progress',      category: 'gamification' },
        'gamification.leaderboard.read':{ label: 'View Leaderboard',       category: 'gamification' },
        'gamification.config':          { label: 'Configure Gamification', category: 'gamification' },

        // Communication
        'message.send.class': { label: 'Message Class',       category: 'message' },
        'message.send.all':   { label: 'Message Anyone',      category: 'message' },
        'message.broadcast':  { label: 'Broadcast Messages',  category: 'message' },

        // Admin
        'admin.user.read':    { label: 'View Users',             category: 'admin' },
        'admin.user.write':   { label: 'Manage Users',           category: 'admin' },
        'admin.role.read':    { label: 'View Roles',             category: 'admin' },
        'admin.role.write':   { label: 'Manage Roles',           category: 'admin' },
        'admin.config':       { label: 'System Configuration',   category: 'admin' },
        'admin.audit':        { label: 'View Audit Logs',        category: 'admin' },
        'admin.integration':  { label: 'Manage Integrations',    category: 'admin' }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────────────────

    ROLES: {
        as_student: {
            label: 'Student',
            level: 5,
            description: 'Registered student with access to own academic records, assessments, and support services.',
            permissions: [
                'enrolment.own.read', 'result.own.read', 'attendance.own.read',
                'risk.own.read', 'case.own.read', 'assessment.own.read', 'assessment.own.take',
                'portfolio.own.read', 'portfolio.own.write', 'analytics.own.read',
                'gamification.own.read', 'gamification.leaderboard.read',
                'academic.programme.read', 'academic.course.read', 'ga.read',
                'registration.advise'
            ]
        },
        as_lecturer: {
            label: 'Lecturer',
            level: 4,
            description: 'Academic staff member responsible for teaching, grading, and student support in assigned courses.',
            permissions: [
                'enrolment.class.read', 'result.class.read', 'result.class.write',
                'attendance.class.read', 'attendance.class.write',
                'dp.class.read', 'dp.class.write',
                'risk.class.read', 'risk.flag',
                'assessment.class.read', 'assessment.class.write',
                'analytics.class.read', 'message.send.class',
                'academic.programme.read', 'academic.course.read', 'academic.offering.read',
                'ga.read', 'gamification.leaderboard.read'
            ]
        },
        as_coordinator: {
            label: 'Programme Coordinator',
            level: 3,
            description: 'Academic staff responsible for programme management, curriculum design, and accreditation.',
            permissions: [
                'academic.programme.read', 'academic.programme.write',
                'academic.course.read', 'academic.course.write',
                'academic.offering.read', 'academic.offering.write',
                'enrolment.all.read', 'result.all.read', 'attendance.all.read', 'dp.all.read',
                'risk.all.read', 'analytics.programme.read', 'analytics.export',
                'ga.read', 'ga.write', 'compliance.read', 'compliance.report',
                'portfolio.all.read', 'portfolio.verify',
                'report.cohort', 'report.throughput',
                'message.send.all',
                'registration.advise', 'registration.rule.read', 'registration.rule.write'
            ]
        },
        as_counsellor: {
            label: 'Student Counsellor',
            level: 4,
            description: 'Student support professional managing cases, interventions, and referrals.',
            permissions: [
                'case.assigned.read', 'case.assigned.write', 'case.all.read', 'case.all.write',
                'enrolment.all.read', 'result.all.read', 'attendance.all.read',
                'risk.all.read', 'risk.flag', 'analytics.own.read',
                'message.send.all', 'portfolio.all.read',
                'academic.programme.read', 'academic.course.read'
            ]
        },
        as_executive: {
            label: 'Executive',
            level: 2,
            description: 'Senior management with access to institution-wide analytics, reports, and strategic dashboards.',
            permissions: [
                'analytics.institution.read', 'analytics.programme.read', 'analytics.export',
                'report.cohort', 'report.throughput', 'report.hemis',
                'compliance.read', 'risk.all.read', 'case.all.read',
                'academic.institution.read', 'academic.programme.read', 'academic.course.read',
                'enrolment.all.read'
            ]
        },
        as_admin: {
            label: 'System Administrator',
            level: 1,
            description: 'Full system access for configuration, user management, and maintenance.',
            permissions: ['*']
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Service Registry
    // ─────────────────────────────────────────────────────────────────────────

    SERVICE_REGISTRY: [
        { id: 'member',    name: 'Membership (IAA)',      category: 'Core Platform',  icon: 'fas fa-user-shield',     status: 'Ready', description: 'Users, roles, authentication & access control' },
        { id: 'audit',     name: 'Audit Trail',           category: 'Core Platform',  icon: 'fas fa-history',         status: 'Ready', description: 'Activity logging & compliance tracking' },
        { id: 'tag',       name: 'Tagging',               category: 'Core Platform',  icon: 'fas fa-tags',            status: 'Ready', description: 'Course/programme categorization' },
        { id: 'group',     name: 'Groups',                category: 'Core Platform',  icon: 'fas fa-layer-group',     status: 'Ready', description: 'Departments, faculties, committees' },
        { id: 'event',     name: 'Calendar/Events',       category: 'Core Platform',  icon: 'fas fa-calendar-alt',    status: 'Ready', description: 'Timetable, deadlines, scheduling' },
        { id: 'messages',  name: 'Messaging',             category: 'Core Platform',  icon: 'fas fa-envelope',        status: 'Ready', description: 'Notifications & message templates' },
        { id: 'logicComposer', name: 'Logic Composer',    category: 'Domain',         icon: 'fas fa-puzzle-piece',    status: 'Ready', description: 'Prerequisite rules, eligibility checks & visual rule builder' },
        { id: 'accreditation', name: 'Accreditation',     category: 'Domain',         icon: 'fas fa-certificate',     status: 'Ready', description: 'CHE/ECSA/HEQSF compliance framework' }
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // Status color maps (centralized — replaces scattered inline objects)
    // ─────────────────────────────────────────────────────────────────────────

    STATUS_COLORS: {
        student:     { active: 'success', suspended: 'warning', graduated: 'primary', dropped: 'danger', deregistered: 'danger' },
        enrolment:   { enrolled: 'primary', completed: 'success', failed: 'danger', withdrawn: 'warning', deregistered: 'danger' },
        result:      { provisional: 'warning', final: 'success', supplementary: 'info', special: 'secondary' },
        offering:    { active: 'success', completed: 'primary', cancelled: 'secondary' },
        programme:   { active: 'success', phasing_out: 'warning', suspended: 'danger', new: 'info' },
        case:        { open: 'danger', in_progress: 'warning', escalated: 'danger', resolved: 'success', closed: 'secondary' },
        riskFlag:    { active: 'danger', acknowledged: 'warning', mitigated: 'success', expired: 'secondary' },
        verification:{ verified: 'success', unverified: 'warning', estimated: 'secondary' },
        request:     { pending: 'warning', submitted: 'warning', under_review: 'info', approved: 'success', denied: 'danger', withdrawn: 'secondary' },
        user:        { active: 'success', inactive: 'secondary', suspended: 'warning', deleted: 'danger' },
        course:      { completed: 'success', in_progress: 'primary', failed: 'danger', not_started: 'secondary' }
    },

    PRIORITY_COLORS: { low: 'info', medium: 'warning', high: 'danger', urgent: 'danger' },

    SEVERITY_COLORS: { low: 'info', medium: 'warning', high: 'danger', critical: 'danger' },

    GRADE_COLORS: { A: 'success', B: 'success', C: 'primary', D: 'warning', E: 'warning', F: 'danger', DPR: 'danger', ABS: 'secondary', SUP: 'info' },

    // Semantic-to-hex lookup (for canvas/charts/SVG that need raw hex)
    HEX_COLORS: { success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', primary: '#3b82f6', info: '#06b6d4', secondary: '#6b7280' },

    // RAG (Red/Amber/Green) token map for status indicators
    RAG_TOKENS: {
        green:  { bg: 'var(--ui-green-50)',   text: 'var(--ui-green-700)',   border: 'var(--ui-green-200)' },
        amber:  { bg: 'var(--ui-amber-50)',   text: 'var(--ui-amber-700)',   border: 'var(--ui-amber-200)' },
        red:    { bg: 'var(--ui-red-50)',     text: 'var(--ui-red-700)',     border: 'var(--ui-red-200)' },
        blue:   { bg: 'var(--ui-blue-50)',    text: 'var(--ui-blue-700)',    border: 'var(--ui-blue-200)' },
        orange: { bg: 'var(--ui-orange-50)',  text: 'var(--ui-orange-700)',  border: 'var(--ui-orange-200)' },
        teal:   { bg: 'var(--ui-teal-50)',    text: 'var(--ui-teal-700)',    border: 'var(--ui-teal-200)' },
        gray:   { bg: 'var(--ui-gray-100)',   text: 'var(--ui-gray-600)',    border: 'var(--ui-gray-300)' }
    },

    // Course type colors (for prerequisite graphs, curriculum maps, SVG rendering)
    COURSE_TYPE_COLORS: { core: 'var(--ui-secondary-600)', core_elective: 'var(--ui-warning-500)', free_elective: 'var(--ui-secondary-400)' },

    // Semantic color tokens (CSS custom properties for UI elements)
    COLOR_TOKENS: {
        pass:       'var(--ui-green-500)',
        fail:       'var(--ui-red-500)',
        risk:       'var(--ui-amber-500)',
        info:       'var(--ui-blue-400)',
        neutral:    'var(--ui-gray-400)',
        active:     'var(--ui-primary)',
        muted:      'var(--ui-gray-500)',
        highlight:  'var(--ui-accent)',
        border:     'var(--ui-gray-200)',
        surface:    'var(--ui-gray-50)',
        onSurface:  'var(--ui-gray-900)',
        textLight:  'var(--ui-gray-300)',
        textDark:   'var(--ui-gray-800)',
        divider:    'var(--ui-gray-100)'
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Typography scale (design tokens for consistent sizing)
    // ─────────────────────────────────────────────────────────────────────────

    TYPOGRAPHY: {
        caption:  'var(--ui-text-2xs)',
        label:    'var(--ui-text-xs)',
        body:     'var(--ui-text-sm)',
        subhead:  'var(--ui-text-base)',
        heading:  'var(--ui-text-lg)',
        title:    'var(--ui-text-xl)',
        hero:     'var(--ui-text-2xl)'
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Academic thresholds
    // ─────────────────────────────────────────────────────────────────────────

    THRESHOLDS: {
        pass:       { success: 75, warning: 50 },
        attendance: { success: 80, warning: 60 },
        risk:       { success: 70, warning: 40 },
        gpa:        { success: 70, warning: 50 },
        completion: { success: 80, warning: 50 },
        confidence: { success: 80, warning: 60 },
        mark:       { success: 75, warning: 50 },
        passRate:   { success: 80, warning: 60 }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Message templates for notifications
    // ─────────────────────────────────────────────────────────────────────────

    MESSAGE_TEMPLATES: [
        { key: 'risk_flagged',       category: 'autoscholar', name: 'Risk Flag Raised',        subject: 'At-Risk Alert: {studentName}',              body: 'Dear {recipientName},\n\n{studentName} has been flagged as at-risk ({riskType}, {severity}).\n\nTitle: {title}\n{description}\n\nRecommendation: {recommendation}\n\nRegards,\nAutoScholar System' },
        { key: 'case_created',       category: 'autoscholar', name: 'Case Created',            subject: 'New Case: {title}',                         body: 'Dear {assigneeName},\n\nA new {category} case has been created for {studentName}.\n\nTitle: {title}\nPriority: {priority}\n\n{description}\n\nRegards,\nAutoScholar System' },
        { key: 'case_resolved',      category: 'autoscholar', name: 'Case Resolved',           subject: 'Case Resolved: {title}',                    body: 'Dear {studentName},\n\nYour support case "{title}" has been resolved.\n\nRegards,\nAutoScholar System' },
        { key: 'dp_warning',         category: 'autoscholar', name: 'DP Warning',              subject: 'DP Warning: {courseCode}',                   body: 'Dear {studentName},\n\nYour attendance for {courseCode} ({courseName}) is below the DP threshold. Current attendance: {attendance}%.\n\nPlease contact your lecturer.\n\nRegards,\nAutoScholar System' },
        { key: 'result_published',   category: 'autoscholar', name: 'Results Published',       subject: 'Results Available: {courseCode}',            body: 'Dear {studentName},\n\nResults for {courseCode} ({courseName}) are now available.\n\nRegards,\nAutoScholar System' },
        { key: 'assessment_due',     category: 'autoscholar', name: 'Assessment Due',          subject: 'Upcoming: {assessmentName} ({courseCode})',  body: 'Dear {studentName},\n\nReminder: {assessmentName} for {courseCode} is due on {dueDate}.\n\nWeight: {weight}%\n\nRegards,\nAutoScholar System' },
        { key: 'intervention_added', category: 'autoscholar', name: 'Intervention Logged',     subject: 'Intervention: {studentName}',                body: 'Dear {recipientName},\n\nAn intervention has been logged for {studentName}.\n\nType: {type}\nDetails: {details}\n\nRegards,\nAutoScholar System' }
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // Event types for calendar integration
    // ─────────────────────────────────────────────────────────────────────────

    EVENT_TYPES: [
        { name: 'Assessment Due',       color: 'var(--ui-danger)', icon: 'fas fa-file-alt',              defaultDuration: 0 },
        { name: 'Lecture',              color: 'var(--ui-primary)', icon: 'fas fa-chalkboard-teacher',    defaultDuration: 50 },
        { name: 'Tutorial',            color: 'var(--ui-info)', icon: 'fas fa-users',                 defaultDuration: 50 },
        { name: 'Practical',           color: 'var(--ui-success)', icon: 'fas fa-flask',                 defaultDuration: 120 },
        { name: 'Exam',                color: 'var(--ui-danger-600)', icon: 'fas fa-clock',                 defaultDuration: 180 },
        { name: 'Counselling Session', color: 'var(--ui-secondary)', icon: 'fas fa-hands-helping',         defaultDuration: 45 },
        { name: 'Committee Meeting',   color: 'var(--ui-warning)', icon: 'fas fa-users-cog',             defaultDuration: 60 }
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // Permission group icons (for RoleConfigurationPanel)
    // ─────────────────────────────────────────────────────────────────────────

    PERMISSION_GROUP_ICONS: {
        academic:     'fas fa-university',
        enrolment:    'fas fa-clipboard-list',
        result:       'fas fa-poll',
        attendance:   'fas fa-calendar-check',
        dp:           'fas fa-user-check',
        registration: 'fas fa-id-card',
        risk:         'fas fa-exclamation-triangle',
        case:         'fas fa-briefcase-medical',
        assessment:   'fas fa-file-alt',
        portfolio:    'fas fa-folder-open',
        ga:           'fas fa-certificate',
        compliance:   'fas fa-shield-alt',
        analytics:    'fas fa-chart-bar',
        report:       'fas fa-file-invoice',
        gamification: 'fas fa-trophy',
        message:      'fas fa-envelope',
        admin:        'fas fa-cogs'
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Sample members (seeded into member service)
    // ─────────────────────────────────────────────────────────────────────────

    SAMPLE_MEMBERS: [
        { username: 'student1',     email: 'student@autoscholar.test',     displayName: 'Sam Student',        role: 'as_student' },
        { username: 'lecturer1',    email: 'lecturer@autoscholar.test',    displayName: 'Lisa Lecturer',      role: 'as_lecturer' },
        { username: 'coordinator1', email: 'coordinator@autoscholar.test', displayName: 'Chris Coordinator',  role: 'as_coordinator' },
        { username: 'counsellor1',  email: 'counsellor@autoscholar.test',  displayName: 'Cara Counsellor',    role: 'as_counsellor' },
        { username: 'executive1',   email: 'executive@autoscholar.test',   displayName: 'Eric Executive',     role: 'as_executive' },
        { username: 'asadmin',      email: 'admin@autoscholar.test',       displayName: 'Amy Admin',          role: 'as_admin' }
    ]
};


// =============================================================================
// UTILITY METHODS
// =============================================================================

class AutoScholarConfig {

    /** Get the data registries */
    static get data() { return AutoScholarConfigData; }

    /** Shorthand accessors */
    static get PERMISSIONS() { return AutoScholarConfigData.PERMISSIONS; }
    static get ROLES() { return AutoScholarConfigData.ROLES; }
    static get SECTIONS() { return AutoScholarConfigData.SECTIONS; }
    static get ROLE_TABS() { return AutoScholarConfigData.ROLE_TABS; }
    static get STATUS_COLORS() { return AutoScholarConfigData.STATUS_COLORS; }
    static get HEX_COLORS() { return AutoScholarConfigData.HEX_COLORS; }
    static get THRESHOLDS() { return AutoScholarConfigData.THRESHOLDS; }

    // ─── Status color lookup ─────────────────────────────────────────────

    static getStatusColor(domain, status) {
        const map = AutoScholarConfigData.STATUS_COLORS[domain];
        return (map && map[status]) || 'secondary';
    }

    static getThresholdColor(value, key) {
        const t = AutoScholarConfigData.THRESHOLDS[key];
        if (!t) return 'secondary';
        if (value >= t.success) return 'success';
        if (value >= t.warning) return 'warning';
        return 'danger';
    }

    static getGradeColor(grade) {
        return AutoScholarConfigData.GRADE_COLORS[grade] || 'secondary';
    }

    /**
     * Get color for a positive/negative delta value.
     * @param {number} delta - The change value
     * @param {string} [format='variant'] - 'variant' | 'text' | 'bg'
     * @returns {string} Color class or variant name
     */
    static getDeltaColor(delta, format = 'variant') {
        const positive = delta >= 0;
        if (format === 'text') return positive ? 'text-green-600' : 'text-red-600';
        if (format === 'bg') return positive ? 'bg-green-500' : 'bg-red-500';
        return positive ? 'success' : 'danger';
    }

    /**
     * Get Tailwind CSS class for a threshold value.
     * @param {number} value - The value to evaluate
     * @param {string} key - Threshold key ('pass','confidence','mark', etc.)
     * @param {string} [type='text'] - 'text' | 'bg' | 'border'
     * @returns {string} Tailwind CSS class
     */
    static getThresholdClass(value, key, type = 'text') {
        const variant = AutoScholarConfig.getThresholdColor(value, key);
        const colorMap = { success: 'green', warning: 'yellow', danger: 'red', secondary: 'gray' };
        const shadeMap = { text: '600', bg: '500', border: '300' };
        return `${type}-${colorMap[variant] || 'gray'}-${shadeMap[type] || '500'}`;
    }

    /**
     * Render a uiProgress bar with automatic threshold-based coloring.
     * Replaces raw DOM progress bar patterns across all modules.
     *
     * @param {El|HTMLElement} parent - Container (El or DOM element)
     * @param {number} value - Progress value (0-100, clamped)
     * @param {Object} options
     * @param {string} options.thresholdKey - Key into THRESHOLDS ('pass','attendance','risk','gpa')
     * @param {string} options.color - Explicit color override ('primary','success','warning','danger','info')
     * @param {string} options.size - 'sm' (default), 'md', 'lg'
     * @param {boolean} options.showLabel - Show percentage overlay
     * @param {string} options.css - Additional CSS classes on the wrapper
     * @returns {uiProgress} The created component (for later setValue calls)
     */
    static renderProgress(parent, value, options = {}) {
        const { thresholdKey, color, size = 'sm', showLabel = false, css = '' } = options;
        const resolvedColor = color || (thresholdKey ? this.getThresholdColor(value, thresholdKey) : 'primary');
        const el = (parent && parent.domElement) ? parent.domElement : parent;
        return new uiProgress({ parent: el, value: Math.max(0, Math.min(100, value)), color: resolvedColor, size, showLabel, css });
    }

    // ─── API fetch helpers ─────────────────────────────────────────────

    /**
     * Fetch programme overview data with batched parallel API calls.
     * Shared by Analyst and v2.js _loadOverviewData to avoid DRY violation.
     *
     * @param {string} programmeCode - Programme code to fetch
     * @param {Object} options
     * @param {Function} options.api - API call function (e.g., window.dut.api)
     * @param {number} options.year - Academic year
     * @param {number} options.maxStudents - Max students to sample (default 50)
     * @param {number} options.chunkSize - Parallel batch size (default 10)
     * @param {Function} options.onProgress - Progress callback: (loaded, total) => void
     * @returns {Promise<Object>} { studentNumbers, sampleSize, courseStats, yearProgression, atRiskStudents, totalPassed, totalFailed }
     */
    static async fetchProgrammeOverview(programmeCode, options = {}) {
        const { api, year, maxStudents = 50, chunkSize = 10, onProgress } = options;
        if (!api) throw new Error('API function required');

        const studentsResp = await api('getProgrammeStudents', {
            programmeCode,
            year: year || new Date().getFullYear()
        });

        if (!studentsResp?.students?.data) return null;

        const fields = studentsResp.students.fields;
        const data = studentsResp.students.data;
        const studentNumIdx = fields.indexOf('studentNumber');
        const studentNumbers = [...new Set(data.map(row => row[studentNumIdx]))];
        const sampleStudents = studentNumbers.slice(0, maxStudents);

        const courseStats = {};
        const yearProgression = { 1: 0, 2: 0, 3: 0 };
        let totalPassed = 0;
        let totalFailed = 0;
        const atRiskStudents = [];

        // Batched parallel fetch
        let processed = 0;
        for (let i = 0; i < sampleStudents.length; i += chunkSize) {
            const chunk = sampleStudents.slice(i, i + chunkSize);
            const responses = await Promise.all(
                chunk.map(num => api('getCourseResults', { studentNumber: num }).catch(() => null))
            );

            responses.forEach((resultsResp, idx) => {
                if (!resultsResp?.results?.data) return;
                const studentNum = chunk[idx];
                const resFields = resultsResp.results.fields;
                const codeIdx = resFields.indexOf('courseCode');
                const resultCodeIdx = resFields.indexOf('resultCode');
                const markIdx = resFields.indexOf('finalMark');

                const passedCodes = [];
                const failedCodes = [];
                let totalMarks = 0;
                let markCount = 0;

                resultsResp.results.data.forEach(row => {
                    const code = row[codeIdx];
                    const result = row[resultCodeIdx];
                    const mark = row[markIdx];

                    if (!courseStats[code]) courseStats[code] = { passed: 0, failed: 0, total: 0, marks: [] };
                    courseStats[code].total++;

                    if (result === 'P' || result === 'P*') {
                        courseStats[code].passed++;
                        totalPassed++;
                        passedCodes.push(code);
                        if (mark) {
                            courseStats[code].marks.push(parseFloat(mark));
                            totalMarks += parseFloat(mark);
                            markCount++;
                        }
                    } else if (result === 'F' || result === 'F*' || result === 'DPR') {
                        courseStats[code].failed++;
                        totalFailed++;
                        failedCodes.push(code);
                    }
                });

                const yearLevel = passedCodes.length >= 24 ? 3 : passedCodes.length >= 12 ? 2 : 1;
                yearProgression[yearLevel]++;

                const studentPassRate = passedCodes.length + failedCodes.length > 0 ?
                    Math.round((passedCodes.length / (passedCodes.length + failedCodes.length)) * 100) : 0;
                const avgMark = markCount > 0 ? Math.round(totalMarks / markCount) : null;

                if (failedCodes.length >= 3 || studentPassRate < 50 || (avgMark && avgMark < 50)) {
                    atRiskStudents.push({
                        studentNumber: studentNum,
                        passedCount: passedCodes.length,
                        failedCount: failedCodes.length,
                        passRate: studentPassRate,
                        avgMark,
                        failedCourses: failedCodes.slice(0, 3),
                        riskLevel: failedCodes.length >= 5 || studentPassRate < 30 ? 'high' : 'medium'
                    });
                }
            });

            processed += chunk.length;
            if (onProgress) onProgress(processed, sampleStudents.length);
        }

        return { studentNumbers, sampleSize: sampleStudents.length, courseStats, yearProgression, atRiskStudents, totalPassed, totalFailed };
    }

    // ─── Permission helpers ──────────────────────────────────────────────

    static getPermissions() { return AutoScholarConfigData.PERMISSIONS; }

    static getRoleDefinitions() { return AutoScholarConfigData.ROLES; }

    static getRoleByCode(code) { return AutoScholarConfigData.ROLES[code] || null; }

    static getRolePermissions(code) {
        const role = AutoScholarConfigData.ROLES[code];
        return role ? role.permissions : [];
    }

    static hasPermission(permission) {
        return permission === '*' || AutoScholarConfigData.PERMISSIONS.hasOwnProperty(permission);
    }

    static getPermissionsByCategory(category) {
        const result = {};
        Object.entries(AutoScholarConfigData.PERMISSIONS).forEach(([key, def]) => {
            if (def.category === category) result[key] = def;
        });
        return result;
    }

    static getPermissionCategories() {
        const categories = new Set();
        Object.values(AutoScholarConfigData.PERMISSIONS).forEach(def => categories.add(def.category));
        return Array.from(categories).sort();
    }

    // ─── MemberService initialization ────────────────────────────────────

    /**
     * Initialize member service with AutoScholar roles.
     * @param {MemberService} memberService
     * @param {Object} options - { createSampleUsers: boolean }
     * @returns {{ roles: Object, users: Object }}
     */
    static initialize(memberService, options = {}) {
        console.log('[AutoScholar] Initializing member service configuration...');

        const roles = this.initializeRoles(memberService);
        console.log(`[AutoScholar] Configured ${Object.keys(roles).length} roles`);

        let users = {};
        if (options.createSampleUsers) {
            users = this._createSampleUsers(memberService, roles);
            console.log(`[AutoScholar] Created ${Object.keys(users).length} sample users`);
        }

        return { roles, users };
    }

    /**
     * Create roles in MemberService from ROLES registry.
     */
    static initializeRoles(memberService) {
        const createdRoles = {};
        const roleTable = memberService.table('memberRole');

        Object.entries(AutoScholarConfigData.ROLES).forEach(([code, roleDef]) => {
            const existing = roleTable.records.find(r => r.get('name') === roleDef.label);
            if (existing) {
                createdRoles[code] = existing;
                return;
            }

            const role = roleTable.create({
                name: roleDef.label,
                description: roleDef.description,
                permissions: JSON.stringify(roleDef.permissions),
                isSystem: true,
                createdAt: new Date().toISOString()
            });

            createdRoles[code] = role;
        });

        return createdRoles;
    }

    /**
     * Create sample users from SAMPLE_MEMBERS registry.
     */
    static _createSampleUsers(memberService, roles) {
        const users = {};

        AutoScholarConfigData.SAMPLE_MEMBERS.forEach(userData => {
            const existing = memberService.findMember(userData.email);
            if (existing) {
                users[userData.role] = existing;
                return;
            }

            const member = memberService.table('member').create({
                email: userData.email,
                username: userData.username,
                displayName: userData.displayName,
                passwordHash: this._hashPassword(userData.username + '123'),
                status: 'active',
                createdAt: new Date().toISOString()
            });

            if (member) {
                const role = roles[userData.role];
                if (role) memberService.assignRole(member.idx, role.idx);
                users[userData.role] = member;
            }
        });

        return users;
    }

    // ─── Progress bar helper (replaces scattered inline bars) ──────────

    /**
     * Render a progress bar into an El container.
     * @param {El} parent - El instance to add the bar into
     * @param {number} value - Percentage (0-100)
     * @param {Object} [opts]
     * @param {string} [opts.color] - Semantic color: 'success','warning','danger','primary','info'
     * @param {string} [opts.height] - CSS class for height (default 'h-3')
     * @param {boolean} [opts.showLabel] - Show percentage text to the right
     * @param {string} [opts.thresholdKey] - Auto-color from THRESHOLDS (e.g. 'pass','gpa')
     * @returns {El} The bar background element
     */
    static renderProgressBar(parent, value, opts = {}) {
        const pct = Math.max(0, Math.min(100, Math.round(value)));
        const h = opts.height || 'h-3';

        // Determine color
        let color = opts.color || 'primary';
        if (opts.thresholdKey) {
            color = this.getThresholdColor(pct, opts.thresholdKey);
        }

        // Map semantic to tailwind class
        const colorMap = {
            success: 'bg-green-500', warning: 'bg-yellow-500', danger: 'bg-red-500',
            primary: 'bg-blue-500', info: 'bg-cyan-500', secondary: 'bg-gray-400'
        };
        const barCls = colorMap[color] || `bg-${color}`;

        const row = opts.showLabel ? parent.add({ css: 'flex items-center gap-2' }) : parent;
        const barBg = row.add({ css: `flex-1 bg-gray-200 rounded ${h}` });
        barBg.add({ css: `${barCls} ${h} rounded transition-all`, attr: { style: `width: ${pct}%` } });

        if (opts.showLabel) {
            row.add({ css: 'w-12 text-xs text-right font-medium', script: `${pct}%` });
        }

        return barBg;
    }

    /** Simple password hash (matches HubApp._hashPassword) */
    static _hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutoScholarConfig, AutoScholarConfigData };
}
