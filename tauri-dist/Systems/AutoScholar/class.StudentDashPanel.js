/**
 * StudentDashPanel - Personal academic overview for students
 *
 * Standalone panel following the compound pattern.
 * Shows KPIs (GPA, credits, at-risk status), degree progress,
 * current semester courses, upcoming deadlines, quick links to
 * other Student Central services, and engagement streak/achievements.
 *
 * Usage:
 *   const panel = new StudentDashPanel();
 *   panel.render(controlEl, stageEl);
 */
class StudentDashPanel {

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._apiData = config.studentData || null;
        this._year = config.year || 2026;
        this._semester = config.semester || 'current';
        this._hasRealIdentity = !!(this._apiData && this._apiData.studentNumber);
        this._hasRealData = !!(this._apiData && this._apiData.results && this._apiData.results.length > 0);

        // ── Student Profile: API identity → API results → bridge → fallback ─────────────
        this._student = this._hasRealData ? this._studentFromApi() :
                        this._hasRealIdentity ? this._studentFromIdentity() :
                        (this._bridge && this._studentFromBridge()) || this._defaultStudent();

        // ── Current Semester Courses ─────────────────────────────────────
        this._courses = this._hasRealData ? this._coursesFromApi() :
                        this._hasRealIdentity ? this._coursesFromRegistrations() :
                        this._defaultCourses();

        // ── Upcoming Deadlines ───────────────────────────────────────────
        this._deadlines = [
            { type: 'assessment', title: 'Lab Test 2', course: 'ITNW201', date: '2026-02-20', icon: 'flask', color: 'var(--ex-clr-danger)' },
            { type: 'assessment', title: 'Practical Test', course: 'ITDB201', date: '2026-02-26', icon: 'laptop-code', color: 'var(--ex-clr-warning)' },
            { type: 'submission', title: 'Assignment 2 Due', course: 'ITSD201', date: '2026-02-28', icon: 'file-upload', color: 'var(--ui-blue-700)' },
            { type: 'assessment', title: 'Test 3', course: 'ITDA201', date: '2026-03-05', icon: 'pen', color: 'var(--ex-clr-purple)' },
            { type: 'assessment', title: 'Project Demo', course: 'ITSD201', date: '2026-03-12', icon: 'desktop', color: 'var(--ex-clr-success)' },
            { type: 'assessment', title: 'Semester Test 2', course: 'MATH201', date: '2026-03-18', icon: 'calculator', color: 'var(--ex-clr-warning)' },
            { type: 'admin', title: 'Bursary Application Deadline', course: null, date: '2026-03-31', icon: 'graduation-cap', color: 'var(--ex-clr-success)' },
            { type: 'admin', title: 'Course Registration Closes', course: null, date: '2026-04-15', icon: 'calendar-check', color: 'var(--ui-gray-500)' }
        ];

        // ── Notifications / Alerts ───────────────────────────────────────
        this._alerts = [
            { type: 'warning', title: 'At-risk: MATH201', message: 'Your current mark (48%) is below the pass threshold. Consider attending extra tutorials.', icon: 'exclamation-triangle', action: 'View Support Options' },
            { type: 'warning', title: 'At-risk: ITNW201', message: 'Your mark (54%) puts you in the at-risk zone. Book a consultation with your lecturer.', icon: 'exclamation-triangle', action: 'Book Consultation' },
            { type: 'info', title: 'New Bursary Match', message: 'MTN Foundation ICT Scholarship matches your profile (88% match). Deadline: 30 Apr.', icon: 'gift', action: 'View in Career Hub' },
            { type: 'success', title: 'Study Streak', message: "You've maintained a 7-day study streak! Keep it up to earn the \"Consistent\" badge.", icon: 'fire', action: null }
        ];

        // ── Weekly Schedule ──────────────────────────────────────────────
        this._schedule = [
            { day: 'Sun', slots: [] },
            { day: 'Mon', slots: [
                { time: '08:00', course: 'ITDA201', venue: 'Lab 3-201', type: 'lecture' },
                { time: '10:00', course: 'MATH201', venue: 'LH 1-105', type: 'lecture' },
                { time: '14:00', course: 'ITSD201', venue: 'Lab 3-205', type: 'practical' }
            ]},
            { day: 'Tue', slots: [
                { time: '08:00', course: 'ITNW201', venue: 'Lab 4-101', type: 'lecture' },
                { time: '10:00', course: 'ITDB201', venue: 'LH 2-301', type: 'lecture' },
                { time: '13:00', course: 'ITDA201', venue: 'Tut 2-108', type: 'tutorial' }
            ]},
            { day: 'Wed', slots: [
                { time: '09:00', course: 'ITSD201', venue: 'LH 1-105', type: 'lecture' },
                { time: '11:00', course: 'MATH201', venue: 'Tut 1-204', type: 'tutorial' },
                { time: '14:00', course: 'ITNW201', venue: 'Lab 4-101', type: 'practical' }
            ]},
            { day: 'Thu', slots: [
                { time: '08:00', course: 'ITDB201', venue: 'Lab 3-201', type: 'practical' },
                { time: '10:00', course: 'ITDA201', venue: 'LH 1-105', type: 'lecture' },
                { time: '14:00', course: 'MATH201', venue: 'LH 2-301', type: 'lecture' }
            ]},
            { day: 'Fri', slots: [
                { time: '08:00', course: 'ITNW201', venue: 'Tut 2-108', type: 'tutorial' },
                { time: '10:00', course: 'ITSD201', venue: 'Lab 3-205', type: 'practical' }
            ]},
            { day: 'Sat', slots: [] }
        ];

        // ── Recent Activity ──────────────────────────────────────────────
        this._activity = [
            { action: 'Submitted Assignment 1', course: 'ITSD201', time: '2 hours ago', icon: 'check-circle', color: 'var(--ex-clr-success)' },
            { action: 'Viewed Test 2 Results', course: 'ITDA201', time: '5 hours ago', icon: 'eye', color: 'var(--ui-blue-700)' },
            { action: 'Logged 2h Study Session', course: 'MATH201', time: 'Yesterday', icon: 'book', color: 'var(--ex-clr-purple)' },
            { action: 'Earned "Early Bird" Badge', course: null, time: 'Yesterday', icon: 'trophy', color: 'var(--ex-clr-warning)' },
            { action: 'Applied to Sasol Bursary', course: null, time: '3 days ago', icon: 'paper-plane', color: 'var(--ex-clr-success)' }
        ];

        this._initPublome();
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [{
                name: 'dashCourse',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    code: { type: 'string', label: 'Code' },
                    name: { type: 'string', label: 'Course' },
                    mark: { type: 'number', label: 'Mark' },
                    completed: { type: 'number', label: 'Completed' },
                    total: { type: 'number', label: 'Total' },
                    nextAssessment: { type: 'string', label: 'Next Assessment' },
                    nextDate: { type: 'string', label: 'Next Date' },
                    status: { type: 'string', label: 'Status' }
                },
                labeller: '{code}',
                selectionMode: 'single'
            }, {
                name: 'deadline',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    type: { type: 'string', label: 'Type' },
                    title: { type: 'string', label: 'Title' },
                    course: { type: 'string', label: 'Course' },
                    date: { type: 'string', label: 'Date' },
                    icon: { type: 'string', label: 'Icon' },
                    color: { type: 'string', label: 'Color' }
                },
                labeller: '{title}',
                selectionMode: 'single'
            }, {
                name: 'alert',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    type: { type: 'string', label: 'Type' },
                    title: { type: 'string', label: 'Title' },
                    message: { type: 'string', label: 'Message' },
                    icon: { type: 'string', label: 'Icon' },
                    action: { type: 'string', label: 'Action' }
                },
                labeller: '{title}',
                selectionMode: 'single'
            }, {
                name: 'activityItem',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    action: { type: 'string', label: 'Action' },
                    course: { type: 'string', label: 'Course' },
                    time: { type: 'string', label: 'Time' },
                    icon: { type: 'string', label: 'Icon' },
                    color: { type: 'string', label: 'Color' }
                },
                labeller: '{action}',
                selectionMode: 'single'
            }]
        });
        this._bindings = {};
    }

    _binding(name) {
        if (!this._bindings[name]) {
            this._bindings[name] = new UIBinding(this._publome.table(name), { publome: this._publome });
        }
        return this._bindings[name];
    }

    _loadPublome() {
        // Courses
        var ct = this._publome.table('dashCourse');
        ct.all().forEach(function(r) { ct.delete(r.idx); });
        this._courses.forEach(function(c, i) {
            ct.create({ idx: i + 1, code: c.code, name: c.name, mark: c.mark, completed: c.completed, total: c.assessments, nextAssessment: c.nextAssessment || '', nextDate: c.nextDate || '', status: c.status });
        });
        // Deadlines
        var dt = this._publome.table('deadline');
        dt.all().forEach(function(r) { dt.delete(r.idx); });
        this._deadlines.forEach(function(d, i) {
            dt.create({ idx: i + 1, type: d.type, title: d.title, course: d.course || '', date: d.date, icon: d.icon, color: d.color });
        });
        // Alerts
        var at = this._publome.table('alert');
        at.all().forEach(function(r) { at.delete(r.idx); });
        this._alerts.forEach(function(a, i) {
            at.create({ idx: i + 1, type: a.type, title: a.title, message: a.message, icon: a.icon || '', action: a.action || '' });
        });
        // Activity
        var act = this._publome.table('activityItem');
        act.all().forEach(function(r) { act.delete(r.idx); });
        this._activity.forEach(function(a, i) {
            act.create({ idx: i + 1, action: a.action, course: a.course || '', time: a.time, icon: a.icon, color: a.color });
        });
    }

    _studentFromBridge() {
        var students = this._bridge.table('student') ? this._bridge.table('student').all() : [];
        var s = students.length > 0 ? students[0].getData() : null;
        if (!s) return null;
        var programmes = this._bridge.table('programme') ? this._bridge.table('programme').all() : [];
        var prog = s.programmeId ? programmes.find(function(p) { return p.getData().idx === s.programmeId; }) : null;
        var progData = prog ? prog.getData() : {};
        var faculties = this._bridge.table('faculty') ? this._bridge.table('faculty').all() : [];
        var fac = progData.facultyId ? faculties.find(function(f) { return f.getData().idx === progData.facultyId; }) : null;
        return {
            name: (s.firstName || '') + ' ' + (s.lastName || ''),
            studentId: s.studentNumber || '',
            email: s.email || '',
            programme: progData.name || '',
            faculty: fac ? fac.getData().name : '',
            department: progData.code || '',
            nqfLevel: progData.nqfLevel || 6,
            yearOfStudy: s.yearOfStudy || 1,
            creditsCompleted: 240,
            creditsRequired: progData.credits || 480,
            gpa: s.gpa || 0,
            semesterAvg: s.gpa || 0,
            riskStatus: 'none',
            streakDays: 7,
            totalPoints: 1240,
            level: 4,
            badges: 6
        };
    }

    _studentFromApi() {
        var d = this._apiData;
        var results = d.results || [];
        var marks = results.map(function(r) { return parseFloat(r.result) || 0; }).filter(function(m) { return m > 0; });
        var gpa = marks.length > 0 ? Math.round(marks.reduce(function(a, b) { return a + b; }, 0) / marks.length) : 0;
        var passed = results.filter(function(r) { return (r.resultCode || '').toUpperCase() === 'P'; }).length;
        var credits = passed * 16; // estimate 16 credits per passed course
        var riskStatus = gpa < 50 ? 'at-risk' : (gpa < 60 ? 'warning' : 'none');
        return {
            name: (d.firstName || '') + ' ' + (d.surname || d.lastName || ''),
            studentId: d.studentNumber || d.studentId || '',
            email: d.email || '',
            programme: d.programme || '',
            faculty: d.faculty || '',
            department: d.department || '',
            nqfLevel: 6,
            yearOfStudy: d.yearOfStudy || 1,
            creditsCompleted: credits,
            creditsRequired: 360, // typical 3-year diploma
            gpa: gpa,
            semesterAvg: gpa,
            riskStatus: riskStatus,
            streakDays: 0,
            totalPoints: 0,
            level: 1,
            badges: 0
        };
    }

    _coursesFromApi() {
        var d = this._apiData;
        var results = d.results || [];
        if (results.length === 0) return this._defaultCourses();
        return results.map(function(r) {
            var mark = parseFloat(r.result) || 0;
            var status = mark >= 75 ? 'good' : (mark >= 50 ? 'average' : 'at-risk');
            return {
                code: r.courseCode || '',
                name: r.courseCode || '', // API doesn't return course names
                mark: mark,
                assessments: 1,
                completed: 1,
                nextAssessment: '',
                nextDate: '',
                status: status
            };
        });
    }

    _coursesFromRegistrations() {
        var d = this._apiData;
        var regs = d.registrations || [];
        if (regs.length === 0) return this._defaultCourses();
        // Show registrations as programme-level entries
        return regs.map(function(r) {
            return {
                code: r.programmeCode || r.courseCode || '',
                name: r.programmeLabel || r.programmeName || r.programmeCode || '',
                mark: 0,
                assessments: 0,
                completed: 0,
                nextAssessment: '',
                nextDate: '',
                status: r.grad === 'Y' ? 'good' : 'average'
            };
        });
    }

    _studentFromIdentity() {
        var d = this._apiData;
        var regs = d.registrations || [];
        var latestReg = regs.length > 0 ? regs[regs.length - 1] : null;
        return {
            name: ((d.firstName || '') + ' ' + (d.surname || d.lastName || '')).trim(),
            studentId: d.studentNumber || d.studentId || '',
            email: d.email || '',
            programme: d.programme || (latestReg ? (latestReg.programmeLabel || latestReg.programmeCode || '') : ''),
            faculty: d.faculty || '',
            department: d.department || '',
            nqfLevel: 6,
            yearOfStudy: parseInt(d.yearOfStudy) || (latestReg ? (parseInt(latestReg.ayos) || 1) : 1),
            creditsCompleted: regs.length * 60, // rough estimate from registration count
            creditsRequired: 360,
            gpa: 0,
            semesterAvg: 0,
            riskStatus: 'none',
            streakDays: 0,
            totalPoints: 0,
            level: 1,
            badges: 0
        };
    }

    _defaultStudent() {
        return {
            name: 'Thabo Nkosi',
            studentId: '22001001',
            email: 'thabo.nkosi@student.ac.za',
            programme: 'ND: Information Technology',
            faculty: 'Applied Sciences',
            department: 'IT',
            nqfLevel: 6,
            yearOfStudy: 2,
            creditsCompleted: 240,
            creditsRequired: 480,
            gpa: 68,
            semesterAvg: 72,
            riskStatus: 'none',
            streakDays: 7,
            totalPoints: 1240,
            level: 4,
            badges: 6
        };
    }

    _defaultCourses() {
        return [
            { code: 'ITDA201', name: 'Data Structures & Algorithms', mark: 72, assessments: 4, completed: 3, nextAssessment: 'Test 3', nextDate: '2026-03-05', status: 'average' },
            { code: 'ITSD201', name: 'Software Development 2', mark: 78, assessments: 5, completed: 3, nextAssessment: 'Project Demo', nextDate: '2026-03-12', status: 'good' },
            { code: 'ITDB201', name: 'Database Design', mark: 65, assessments: 4, completed: 2, nextAssessment: 'Practical Test', nextDate: '2026-02-26', status: 'average' },
            { code: 'ITNW201', name: 'Networking 2', mark: 54, assessments: 4, completed: 2, nextAssessment: 'Lab Test 2', nextDate: '2026-02-20', status: 'at-risk' },
            { code: 'MATH201', name: 'Mathematics 2', mark: 48, assessments: 3, completed: 2, nextAssessment: 'Semester Test 2', nextDate: '2026-03-18', status: 'at-risk' }
        ];
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderDashboard();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTROL PANEL
    // ══════════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        el.innerHTML = '';

        // Student identity card
        var idCard = document.createElement('div');
        idCard.className = 'sd-profile-card';
        el.appendChild(idCard);

        var avatarRow = document.createElement('div');
        avatarRow.className = 'sc-avatar-row';

        var avatarEl = document.createElement('div');
        avatarEl.className = 'as-avatar as-avatar-md';
        var nameParts = (this._student.name || '').split(' ');
        avatarEl.textContent = (nameParts[0] || '?').charAt(0) + (nameParts[nameParts.length - 1] || '').charAt(0);
        avatarRow.appendChild(avatarEl);

        var infoEl = document.createElement('div');
        var nameEl = document.createElement('div');
        nameEl.className = 'sc-student-name';
        nameEl.textContent = this._student.name;
        infoEl.appendChild(nameEl);
        var idEl = document.createElement('div');
        idEl.className = 'sc-student-id';
        idEl.textContent = this._student.studentId;
        infoEl.appendChild(idEl);
        avatarRow.appendChild(infoEl);

        idCard.appendChild(avatarRow);

        var progRow = document.createElement('div');
        progRow.className = 'sc-prog-row';
        idCard.appendChild(progRow);
        new uiBadge({ label: this._student.programme, color: 'primary', size: 'xs', parent: progRow });

        var yearRow = document.createElement('div');
        yearRow.className = 'sc-detail-row';
        idCard.appendChild(yearRow);
        new uiBadge({ label: 'Year ' + this._student.yearOfStudy, color: 'gray', size: 'xs', parent: yearRow });
        new uiBadge({ label: 'NQF ' + this._student.nqfLevel, color: 'gray', size: 'xs', parent: yearRow });

        // Accordion
        var accordion = new uiAccordion({
            exclusive: true,
            content: {
                period:   { label: '<i class="fas fa-calendar" style="margin-right:0.3rem;"></i>Period', open: true },
                links:    { label: '<i class="fas fa-th-large" style="margin-right:0.3rem;"></i>Quick Links' },
                activity: { label: '<i class="fas fa-stream" style="margin-right:0.3rem;"></i>Recent Activity' }
            },
            parent: el
        });

        var periodEl = accordion.el.querySelector('.ui-accordion-item[data-key="period"] .ui-accordion-content');
        this._renderPeriodSelector(periodEl);

        var linksEl = accordion.el.querySelector('.ui-accordion-item[data-key="links"] .ui-accordion-content');
        this._renderQuickLinks(linksEl);

        var activityEl = accordion.el.querySelector('.ui-accordion-item[data-key="activity"] .ui-accordion-content');
        this._renderActivity(activityEl);
    }

    _renderPeriodSelector(el) {
        el.innerHTML = '';
        var self = this;

        var yearLabel = document.createElement('label');
        yearLabel.className = 'sd-ctrl-label';
        yearLabel.textContent = 'Year';
        el.appendChild(yearLabel);

        var yearWrapper = document.createElement('div');
        yearWrapper.className = 'ui-input-wrapper as-mb-half';
        el.appendChild(yearWrapper);
        var yearSelect = document.createElement('select');
        yearSelect.className = 'ui-input sd-ctrl-select';
        Array.from({ length: 10 }, function(_, i) { var y = new Date().getFullYear() - i; return { value: String(y), label: String(y) }; }).forEach(function(opt) {
            var option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            yearSelect.appendChild(option);
        });
        yearSelect.value = String(self._year);
        yearSelect.addEventListener('change', function() { self._year = parseInt(yearSelect.value, 10); self._renderDashboard(); });
        yearWrapper.appendChild(yearSelect);

        var semLabel = document.createElement('label');
        semLabel.className = 'sd-ctrl-label-mt';
        semLabel.textContent = 'Semester';
        el.appendChild(semLabel);

        var semWrapper = document.createElement('div');
        semWrapper.className = 'ui-input-wrapper as-mb-half';
        el.appendChild(semWrapper);
        var semSelect = document.createElement('select');
        semSelect.className = 'ui-input sd-ctrl-select';
        [{ value: 'current', label: 'Current' }, { value: 'S1', label: 'Semester 1' }, { value: 'S2', label: 'Semester 2' }].forEach(function(opt) {
            var option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            semSelect.appendChild(option);
        });
        semSelect.value = self._semester;
        semSelect.addEventListener('change', function() { self._semester = semSelect.value; self._renderDashboard(); });
        semWrapper.appendChild(semSelect);

        var btnWrap = document.createElement('div');
        btnWrap.className = 'sd-ctrl-btn-wrap';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Refresh', variant: 'ghost', size: 'xs',
            icon: '<i class="fas fa-sync-alt"></i>',
            parent: btnWrap,
            onClick: function() {
                self._renderDashboard();
                if (typeof log === 'function') log('StudentDash', 'Dashboard refreshed');
            }
        });
    }

    _renderQuickLinks(el) {
        el.innerHTML = '';

        var links = [
            { key: 'myResults', label: 'My Results', icon: 'fa-graduation-cap', desc: 'Marks & GPA' },
            { key: 'progressTracker', label: 'Degree Progress', icon: 'fa-tasks', desc: 'Credits & graduation' },
            { key: 'careerHub', label: 'Career Hub', icon: 'fa-briefcase', desc: 'CV & opportunities' },
            { key: 'diary', label: 'Study Diary', icon: 'fa-book', desc: 'Goals & sessions' },
            { key: 'achievements', label: 'Achievements', icon: 'fa-trophy', desc: 'Badges & streaks' },
            { key: 'cumLaude', label: 'Cum Laude', icon: 'fa-award', desc: 'Pass projection' }
        ];

        links.forEach(function(link) {
            var item = document.createElement('div');
            item.className = 'sd-quick-link';
            item.innerHTML =
                '<i class="fas ' + link.icon + ' sd-quick-link-icon"></i>' +
                '<div class="sd-quick-link-body">' +
                '<div class="sd-quick-link-label">' + link.label + '</div>' +
                '<div class="sd-quick-link-desc">' + link.desc + '</div>' +
                '</div>' +
                '<i class="fas fa-chevron-right sd-quick-link-chevron"></i>';
            item.addEventListener('click', function() {
                if (typeof log === 'function') log('StudentDash', 'Navigate \u2192 ' + link.label);
            });
            el.appendChild(item);
        });
    }

    _renderActivity(el) {
        el.innerHTML = '';
        this._binding('activityItem').bindCollection(el, {
            component: 'list',
            map: function(r) {
                return {
                    title: r.get('action'),
                    subtitle: (r.get('course') ? r.get('course') + ' \u00b7 ' : '') + r.get('time')
                };
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DASHBOARD STAGE
    // ══════════════════════════════════════════════════════════════════════════

    _renderDashboard() {
        var el = this._stageEl;
        el.innerHTML = '';
        el.className = 'sd-stage';

        this._loadPublome();

        this._renderKPIs(el);
        this._renderAlerts(el);

        var grid = document.createElement('div');
        grid.className = 'sd-two-col';
        el.appendChild(grid);

        var leftCol = document.createElement('div');
        leftCol.className = 'sd-col';
        grid.appendChild(leftCol);

        this._renderCourses(leftCol);
        this._renderDegreeProgress(leftCol);

        var rightCol = document.createElement('div');
        rightCol.className = 'sd-col';
        grid.appendChild(rightCol);

        this._renderDeadlines(rightCol);
        this._renderScheduleToday(rightCol);
        this._renderEngagement(rightCol);
    }

    // ── KPIs ─────────────────────────────────────────────────────────────────

    _renderKPIs(parent) {
        var student = this._student;

        // ── KPI chip row (debate: compact chips, no fat stat cards) ──
        var chipRow = document.createElement('div');
        chipRow.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-bottom:var(--ui-space-3);';
        parent.appendChild(chipRow);

        // GPA chip
        var gpaChip = document.createElement('div');
        gpaChip.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--ui-gray-200); border-radius:var(--ui-radius-lg); background:white; flex:1; min-width:140px;';
        gpaChip.innerHTML =
            '<i class="fas fa-chart-line" style="color:var(--ui-primary); font-size:var(--ui-text-sm);"></i>' +
            '<div style="flex:1;">' +
            '<div style="font-size:var(--ui-text-2xs); color:var(--ui-gray-400); text-transform:uppercase;">GPA</div>' +
            '<div style="font-size:var(--ui-text-lg); font-weight:var(--ui-font-bold); color:var(--ui-gray-800);">' + student.gpa + '%</div></div>';
        chipRow.appendChild(gpaChip);

        // Semester Avg chip
        var semChip = document.createElement('div');
        semChip.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--ui-gray-200); border-radius:var(--ui-radius-lg); background:white; flex:1; min-width:140px;';
        semChip.innerHTML =
            '<i class="fas fa-calendar-alt" style="color:var(--ui-warning-600); font-size:var(--ui-text-sm);"></i>' +
            '<div style="flex:1;">' +
            '<div style="font-size:var(--ui-text-2xs); color:var(--ui-gray-400); text-transform:uppercase;">Semester Avg</div>' +
            '<div style="font-size:var(--ui-text-lg); font-weight:var(--ui-font-bold); color:var(--ui-gray-800);">' + student.semesterAvg + '%</div></div>';
        chipRow.appendChild(semChip);

        // Credits chip
        var creditPct = Math.round((student.creditsCompleted / student.creditsRequired) * 100);
        var credChip = document.createElement('div');
        credChip.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--ui-gray-200); border-radius:var(--ui-radius-lg); background:white; flex:1; min-width:140px;';
        credChip.innerHTML =
            '<i class="fas fa-layer-group" style="color:var(--ui-success); font-size:var(--ui-text-sm);"></i>' +
            '<div style="flex:1;">' +
            '<div style="font-size:var(--ui-text-2xs); color:var(--ui-gray-400); text-transform:uppercase;">Credits</div>' +
            '<div style="font-size:var(--ui-text-lg); font-weight:var(--ui-font-bold); color:var(--ui-gray-800);">' + student.creditsCompleted + '/' + student.creditsRequired + '</div></div>';
        chipRow.appendChild(credChip);

        // ── Academic Momentum sparkline chip (debate: sparkline-in-chip) ──
        var momentumChip = document.createElement('div');
        momentumChip.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--ui-gray-200); border-radius:var(--ui-radius-lg); background:white; flex:1; min-width:180px;';
        var sparkId = 'sc-momentum-spark-' + Date.now();
        momentumChip.innerHTML =
            '<div style="flex:1;">' +
            '<div style="font-size:var(--ui-text-2xs); color:var(--ui-gray-400); text-transform:uppercase;">Academic Momentum</div>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
            '<span style="font-size:var(--ui-text-sm); font-weight:var(--ui-font-bold); color:var(--ui-success);"><i class="fas fa-arrow-up" style="font-size:9px;"></i> +4%</span>' +
            '<div id="' + sparkId + '" style="width:80px; height:24px;"></div></div></div>';
        chipRow.appendChild(momentumChip);

        // Render sparkline after layout settles (requestAnimationFrame + setTimeout)
        requestAnimationFrame(function() {
            setTimeout(function() {
                var sparkEl = document.getElementById(sparkId);
                if (sparkEl && sparkEl.offsetWidth > 0 && typeof ApexCharts !== 'undefined') {
                    var chart = new ApexCharts(sparkEl, {
                        series: [{ data: [58, 62, 60, 65, 64, 68, 72] }],
                        chart: { type: 'area', height: 24, width: 80, sparkline: { enabled: true } },
                        stroke: { width: 1.5, curve: 'smooth' },
                        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
                        colors: ['#22c55e'],
                        tooltip: { enabled: false }
                    });
                    chart.render();
                }
            }, 100);
        });

        // ── Small radial ring (80px) for semester completion ──
        var radialRow = document.createElement('div');
        radialRow.style.cssText = 'display:flex; align-items:center; gap:12px; margin-bottom:var(--ui-space-3);';
        parent.appendChild(radialRow);

        var ringSize = 60;
        var semPct = Math.round((3 / 14) * 100); // 3 weeks into 14-week semester
        var radialId = 'sc-semester-radial-' + Date.now();
        var ringWrap = document.createElement('div');
        ringWrap.id = radialId;
        ringWrap.style.cssText = 'width:' + ringSize + 'px; height:' + ringSize + 'px; flex-shrink:0;';
        radialRow.appendChild(ringWrap);

        requestAnimationFrame(function() {
            setTimeout(function() {
                var el = document.getElementById(radialId);
                if (el && el.offsetWidth > 0 && typeof ApexCharts !== 'undefined') {
                    var chart = new ApexCharts(el, {
                        series: [semPct],
                        chart: { type: 'radialBar', height: ringSize, width: ringSize, sparkline: { enabled: true } },
                        plotOptions: {
                            radialBar: {
                                hollow: { size: '55%' },
                                track: { background: '#e5e7eb' },
                                dataLabels: {
                                    name: { show: false },
                                    value: { fontSize: '12px', fontWeight: 700, offsetY: 4, color: '#1f2937' }
                                }
                            }
                        },
                        colors: ['#3b82f6']
                    });
                    chart.render();
                }
            }, 100);
        });

        var radialInfo = document.createElement('div');
        radialInfo.innerHTML =
            '<div style="font-size:var(--ui-text-xs); font-weight:var(--ui-font-semibold); color:var(--ui-gray-700);">Semester Progress</div>' +
            '<div style="font-size:var(--ui-text-2xs); color:var(--ui-gray-400);">Week 3 of 14 · Ends 14 June 2026</div>';
        radialRow.appendChild(radialInfo);

        // At-risk + streak metric chips
        var metricRow = document.createElement('div');
        metricRow.style.cssText = 'display:flex; gap:8px; margin-bottom:var(--ui-space-3);';
        parent.appendChild(metricRow);

        var b = this._binding('dashCourse');
        b.bindMetric(metricRow, {
            compute: function(recs) { return recs.filter(function(r) { return r.get('status') === 'at-risk'; }).length; },
            label: 'At-Risk', icon: 'fas fa-exclamation-triangle', color: 'var(--ui-danger)'
        });
        b.bindMetric(metricRow, {
            compute: function() { return student.streakDays + 'd'; },
            label: 'Study Streak', icon: 'fas fa-fire', color: 'var(--ui-warning-600)'
        });
    }

    // ── Alerts ───────────────────────────────────────────────────────────────

    _renderAlerts(parent) {
        var wrap = document.createElement('div');
        wrap.className = 'sd-alert-area';
        parent.appendChild(wrap);

        this._binding('alert').bindCollection(wrap, {
            component: 'card',
            filter: function(r) { return r.get('type') === 'warning' || r.get('type') === 'info'; },
            map: function(r) {
                return {
                    title: r.get('title'),
                    subtitle: r.get('type'),
                    content: r.get('message')
                };
            }
        });
    }

    // ── Current Courses ──────────────────────────────────────────────────────

    _renderCourses(parent) {
        var card = document.createElement('div');
        card.className = 'sd-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'sd-section-header';
        hdr.innerHTML =
            '<i class="fas fa-book-open sd-section-header-icon"></i>' +
            '<span class="sd-section-header-title">Current Semester Courses</span>' +
            '<span class="sd-section-header-info">' + this._courses.length + ' courses</span>';
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'sd-section-body';
        card.appendChild(body);

        // Custom course rows with mark circles, progress, and RAG indicators
        var self = this;
        this._courses.forEach(function(c) {
            var markColor = c.mark >= 75 ? '#059669' : c.mark >= 60 ? '#0891b2' : c.mark >= 50 ? '#d97706' : '#dc2626';
            var markBg = c.mark >= 75 ? '#ecfdf5' : c.mark >= 60 ? '#ecfeff' : c.mark >= 50 ? '#fffbeb' : '#fef2f2';
            var markBorder = c.mark >= 75 ? '#a7f3d0' : c.mark >= 60 ? '#a5f3fc' : c.mark >= 50 ? '#fde68a' : '#fecaca';

            // RAG indicator
            var ragColor, ragLabel;
            if (c.status === 'at-risk') { ragColor = 'var(--ui-danger)'; ragLabel = 'At Risk'; }
            else if (c.status === 'average') { ragColor = 'var(--ui-warning-600)'; ragLabel = 'Amber'; }
            else { ragColor = 'var(--ui-success)'; ragLabel = 'Green'; }

            var row = document.createElement('div');
            row.className = 'sd-course-row';
            row.innerHTML =
                '<div class="sd-course-mark" style="background:' + markBg + ';border-color:' + markBorder + ';">' +
                '<span class="sd-course-mark-value" style="color:' + markColor + ';">' + c.mark + '</span></div>' +
                '<div class="sd-course-info" style="flex:1;min-width:0;">' +
                '<div class="sd-course-title-row" style="display:flex;align-items:center;gap:6px;">' +
                '<span class="sc-course-code">' + c.code + '</span>' +
                '<span class="sd-course-name" style="flex:1;">' + c.name + '</span>' +
                '<span style="font-size:var(--ui-text-2xs);padding:1px 6px;border-radius:var(--ui-radius-full);background:' + ragColor + '15;color:' + ragColor + ';font-weight:var(--ui-font-semibold);">' + ragLabel + '</span>' +
                '</div>' +
                '<div class="sd-course-meta">' +
                '<span class="sd-assess-count">' + c.completed + '/' + c.assessments + ' assessments</span>' +
                (c.nextAssessment ? '<span class="sd-next-assess"><i class="fas fa-arrow-right sd-next-arrow"></i>' + c.nextAssessment + '</span>' : '') +
                '</div></div>';
            body.appendChild(row);
        });
    }

    // ── Degree Progress ──────────────────────────────────────────────────────

    _renderDegreeProgress(parent) {
        var card = document.createElement('div');
        card.className = 'sd-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'sd-section-header';
        hdr.innerHTML =
            '<i class="fas fa-tasks sd-section-header-icon"></i>' +
            '<span class="sd-section-header-title">Degree Progress</span>';
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'sd-section-body-wide';
        card.appendChild(body);

        var s = this._student;
        var pct = Math.round((s.creditsCompleted / s.creditsRequired) * 100);
        var strokeColor = pct >= 75 ? 'var(--ex-clr-success)' : pct >= 50 ? 'var(--ui-blue-700)' : 'var(--ex-clr-warning)';

        // Progress ring + details in hero section
        var ringWrap = document.createElement('div');
        ringWrap.className = 'sd-hero-ring-section';
        body.appendChild(ringWrap);

        var ring = document.createElement('div');
        ring.className = 'sd-ring-hero';
        ring.innerHTML =
            '<svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">' +
            '<circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ui-gray-200)" stroke-width="2.5"/>' +
            '<circle cx="18" cy="18" r="15.5" fill="none" stroke="' + strokeColor + '" stroke-width="2.5" stroke-dasharray="' + pct + ' ' + (100 - pct) + '" stroke-linecap="round"/>' +
            '<text x="18" y="19" text-anchor="middle" style="transform: rotate(90deg); transform-origin: center; font-size: 7px; font-weight: 800; fill: var(--ui-gray-800);">' + pct + '%</text>' +
            '<text x="18" y="24" text-anchor="middle" style="transform: rotate(90deg); transform-origin: center; font-size: 3px; fill: var(--ui-gray-400);">complete</text>' +
            '</svg>';
        ringWrap.appendChild(ring);

        var details = document.createElement('div');
        details.className = 'sd-progress-details';
        details.innerHTML =
            '<div class="sd-detail-grid">' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">Credits Done</div><div class="sd-detail-value">' + s.creditsCompleted + '</div></div>' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">Remaining</div><div class="sd-detail-value">' + (s.creditsRequired - s.creditsCompleted) + '</div></div>' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">Year</div><div class="sd-detail-value">' + s.yearOfStudy + ' of 3</div></div>' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">NQF Level</div><div class="sd-detail-value">' + s.nqfLevel + '</div></div>' +
            '</div>';
        ringWrap.appendChild(details);

        // Year-level progress bars
        var yearWrap = document.createElement('div');
        yearWrap.className = 'sd-year-progress';
        body.appendChild(yearWrap);

        var years = [
            { label: 'Year 1', credits: 160, total: 160, status: 'Complete' },
            { label: 'Year 2', credits: 80, total: 160, status: 'In Progress' },
            { label: 'Year 3', credits: 0, total: 160, status: 'Upcoming' }
        ];

        years.forEach(function(y) {
            var yPct = Math.round((y.credits / y.total) * 100);
            var yRow = document.createElement('div');
            yRow.className = 'sd-year-row';
            yRow.innerHTML =
                '<span class="sd-year-label">' + y.label + '</span>' +
                '<div class="as-progress-track as-progress-track-md" style="flex: 1;">' +
                '<div class="as-progress-fill" style="width: ' + yPct + '%; background: ' + (yPct === 100 ? 'var(--ex-clr-success)' : yPct > 0 ? 'var(--ui-blue-700)' : '#d1d5db') + ';"></div>' +
                '</div>' +
                '<span class="sd-year-credits">' + y.credits + '/' + y.total + '</span>';
            yearWrap.appendChild(yRow);
        });
    }

    // ── Deadlines ────────────────────────────────────────────────────────────

    _renderDeadlines(parent) {
        var card = document.createElement('div');
        card.className = 'sd-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'sd-section-header';
        hdr.innerHTML =
            '<i class="fas fa-clock sd-section-header-icon"></i>' +
            '<span class="sd-section-header-title">Upcoming Deadlines</span>';
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'sd-section-body';
        card.appendChild(body);

        // Activity stream with urgency badges (debate: activity-stream-first)
        var deadlines = this._deadlines.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
        deadlines.forEach(function(d) {
            var daysLeft = Math.ceil((new Date(d.date) - new Date()) / (1000 * 60 * 60 * 24));
            var urgencyColor, urgencyLabel;
            if (daysLeft <= 3) { urgencyColor = 'var(--ui-danger)'; urgencyLabel = 'Urgent'; }
            else if (daysLeft <= 7) { urgencyColor = 'var(--ui-warning-600)'; urgencyLabel = 'Soon'; }
            else { urgencyColor = 'var(--ui-gray-400)'; urgencyLabel = daysLeft + 'd'; }

            var row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--ui-gray-100);';
            row.innerHTML =
                '<div style="width:28px; height:28px; border-radius:var(--ui-radius-md); background:' + (d.color || 'var(--ui-gray-200)') + '15; display:flex; align-items:center; justify-content:center; flex-shrink:0;">' +
                '<i class="fas fa-' + d.icon + '" style="font-size:11px; color:' + (d.color || 'var(--ui-gray-500)') + ';"></i></div>' +
                '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:var(--ui-text-sm); font-weight:var(--ui-font-semibold); color:var(--ui-gray-700);">' + d.title + '</div>' +
                '<div style="font-size:var(--ui-text-xs); color:var(--ui-gray-400);">' + (d.course || 'Admin') + ' · ' + d.date.slice(5) + '</div></div>' +
                '<span style="font-size:var(--ui-text-2xs); padding:2px 8px; border-radius:var(--ui-radius-full); background:' + urgencyColor + '15; color:' + urgencyColor + '; font-weight:var(--ui-font-semibold); white-space:nowrap;">' + urgencyLabel + '</span>';
            body.appendChild(row);
        });
    }

    // ── Today's Schedule ─────────────────────────────────────────────────────

    _renderScheduleToday(parent) {
        var card = document.createElement('div');
        card.className = 'sd-section-card';
        parent.appendChild(card);

        var dayIdx = new Date().getDay(); // 0=Sun
        var todaySchedule = this._schedule[dayIdx] || this._schedule[1]; // fallback to Mon

        var hdr = document.createElement('div');
        hdr.className = 'sd-section-header';
        hdr.innerHTML =
            '<i class="fas fa-calendar-day sd-section-header-icon"></i>' +
            '<span class="sd-section-header-title">Today\'s Schedule</span>' +
            '<span class="sd-section-header-info">' + todaySchedule.day + '</span>';
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'sd-section-body';
        card.appendChild(body);

        if (!todaySchedule.slots.length) {
            body.innerHTML = '<div class="sd-schedule-empty"><i class="fas fa-couch sd-schedule-empty-icon"></i>No classes today</div>';
            return;
        }

        todaySchedule.slots.forEach(function(slot) {
            var slotClass = 'sd-schedule-slot-' + (slot.type || '');
            var typeClass = 'sd-schedule-type-' + (slot.type || '');

            var row = document.createElement('div');
            row.className = 'sd-schedule-slot ' + slotClass;
            row.innerHTML =
                '<span class="sd-schedule-time">' + slot.time + '</span>' +
                '<div class="sd-schedule-info">' +
                '<div class="sd-schedule-course">' + slot.course + '</div>' +
                '<div class="sd-schedule-venue">' + slot.venue + '</div>' +
                '</div>' +
                '<span class="sd-schedule-type ' + typeClass + '">' + slot.type + '</span>';
            body.appendChild(row);
        });
    }

    // ── Engagement / Achievements ────────────────────────────────────────────

    _renderEngagement(parent) {
        var card = document.createElement('div');
        card.className = 'sd-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'sd-section-header';
        hdr.innerHTML =
            '<i class="fas fa-trophy sd-section-header-icon"></i>' +
            '<span class="sd-section-header-title">Engagement</span>';
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'sd-section-body-wide';
        card.appendChild(body);

        var s = this._student;

        // Stats row
        var statsRow = document.createElement('div');
        statsRow.className = 'sd-engage-stats';
        body.appendChild(statsRow);

        var eb = this._binding('dashCourse');
        eb.bindMetric(statsRow, { compute: function() { return s.streakDays + 'd'; }, label: 'Streak', icon: 'fas fa-fire', color: 'var(--ex-clr-warning)' });
        eb.bindMetric(statsRow, { compute: function() { return s.totalPoints.toLocaleString(); }, label: 'Points', icon: 'fas fa-star', color: 'var(--ex-clr-purple)' });
        eb.bindMetric(statsRow, { compute: function() { return s.badges; }, label: 'Badges', icon: 'fas fa-medal', color: 'var(--ex-clr-success)' });

        // Level progress
        var levelPct = Math.round(((s.totalPoints % 500) / 500) * 100);
        var levelBar = document.createElement('div');
        levelBar.className = 'sd-level-progress';
        levelBar.innerHTML =
            '<div class="sd-level-labels">' +
            '<span>Level ' + s.level + '</span>' +
            '<span>Level ' + (s.level + 1) + '</span>' +
            '</div>' +
            '<div class="as-progress-track as-progress-track-md">' +
            '<div class="as-progress-fill" style="width: ' + levelPct + '%; background: linear-gradient(90deg, var(--ex-clr-purple), var(--ui-purple-400, #a855f7));"></div>' +
            '</div>' +
            '<div class="sd-level-next">' + (500 - (s.totalPoints % 500)) + ' points to next level</div>';
        body.appendChild(levelBar);

        // Study streak calendar (last 7 days)
        var streakWrap = document.createElement('div');
        streakWrap.className = 'sd-streak-row';
        body.appendChild(streakWrap);

        var dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        for (var i = 0; i < 7; i++) {
            var active = i < s.streakDays;
            var dot = document.createElement('div');
            dot.className = 'sd-streak-day';

            var box = document.createElement('div');
            box.className = 'sd-streak-box ' + (active ? 'sd-streak-active' : 'sd-streak-inactive');
            if (active) box.innerHTML = '<i class="fas fa-check sd-streak-check"></i>';
            dot.appendChild(box);

            var label = document.createElement('div');
            label.className = 'sd-streak-label';
            label.textContent = dayNames[i];
            dot.appendChild(label);

            streakWrap.appendChild(dot);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentDashPanel;
}
if (typeof window !== 'undefined') {
    window.StudentDashPanel = StudentDashPanel;
}
