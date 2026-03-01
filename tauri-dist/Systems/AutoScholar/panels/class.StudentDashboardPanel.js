/**
 * StudentDashboardPanel - Student Central Dashboard
 *
 * High-density at-a-glance overview:
 * - Welcome header with programme, student number, day context
 * - KPI row: GPA, Credits Earned, Credits Left, Attendance, Courses (bindMetric chips)
 * - Current semester course list with grade dots, marks, badges, click-to-expand progress
 * - Upcoming assessments sidebar with urgency indicators
 * - Study Progress: graduation credit tracker + passed/failed/pending counts
 * - Alerts: compact risk flags with badge count
 */
class StudentDashboardPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
    }

    render(container) {
        if (!this.currentUser) {
            container.add({ css: 'text-center py-8 text-muted', script: 'Please log in to view your dashboard.' });
            return;
        }

        const profile = this.services?.member?.getProfile?.(this.currentUser.idx);
        const firstName = profile?.firstName || this.currentUser?.username || 'Student';
        const greeting = this._getTimeBasedGreeting();
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const programme = this._getStudentProgramme();
        const studentNumber = this.currentUser?.studentNumber || this.currentUser?.username || '';

        // Welcome header with context
        const welcomeRow = container.add({ css: 'flex items-center justify-between mb-4' });
        const welcomeText = welcomeRow.add({});
        welcomeText.add({ tag: 'h2', css: 'text-xl font-bold text-gray-800', script: `${greeting}, ${firstName}` });
        const contextRow = welcomeText.add({ css: 'flex items-center gap-3 text-xs text-gray-500 mt-0.5' });
        contextRow.add({ script: today });
        if (studentNumber) {
            contextRow.add({ css: 'text-gray-300', script: '|' });
            contextRow.add({ script: studentNumber });
        }
        if (programme) {
            contextRow.add({ css: 'text-gray-300', script: '|' });
            contextRow.add({ css: 'truncate', script: programme, attr: { title: programme } });
        }

        // KPI Row
        this._renderKPIRow(container);

        // Two-column layout: Current Semester + Upcoming
        const mainGrid = container.add({ css: 'grid md:grid-cols-3 gap-3 mb-4' });

        // Current Semester (takes 2 cols)
        const semSection = mainGrid.add({ css: 'md:col-span-2' });
        this._renderCurrentSemester(semSection);

        // Upcoming deadlines (takes 1 col)
        this._renderUpcoming(mainGrid);

        // Bottom row: Study Progress + Alerts
        const bottomGrid = container.add({ css: 'grid md:grid-cols-2 gap-3' });
        this._renderStudyProgress(bottomGrid);
        this._renderAlerts(bottomGrid);
    }

    // ── KPI Row ─────────────────────────────────────────────────────

    _renderKPIRow(container) {
        const gpa = this._calculateGPA();
        const creditsEarned = this._calculateCreditsEarned();
        const totalCredits = 360;
        const creditsRemaining = Math.max(0, totalCredits - creditsEarned);
        const attendance = this._getAttendancePercent();
        const enrolments = this._getStudentEnrolments();

        // KPI metrics via UIBinding (mini-Publome pattern)
        const kpiPublome = new Publome();
        kpiPublome.loadSchema({ tables: [{ name: 'kpi', columns: {
            idx: { type: 'number', primaryKey: true },
            value: { type: 'string' }
        }}]});
        const kpiTable = kpiPublome.table('kpi');
        kpiTable.create({ idx: 1, value: gpa });
        kpiTable.create({ idx: 2, value: String(creditsEarned) });
        kpiTable.create({ idx: 3, value: String(creditsRemaining) });
        kpiTable.create({ idx: 4, value: `${attendance}%` });
        kpiTable.create({ idx: 5, value: String(enrolments.length) });

        const kpiRow = container.add({ css: 'flex flex-wrap gap-3 mb-4' });
        const kb = new UIBinding(kpiTable, { publome: kpiPublome });
        kb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 1); return r ? r.get('value') : '—'; },
            label: 'GPA', icon: 'fas fa-chart-line',
            color: parseFloat(gpa) >= 3.0 ? 'var(--ui-accent)' : 'var(--ui-primary)'
        });
        kb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 2); return r ? r.get('value') : '—'; },
            label: 'Credits Earned', icon: 'fas fa-graduation-cap', color: 'var(--ui-primary)'
        });
        kb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 3); return r ? r.get('value') : '—'; },
            label: 'Credits Left', icon: 'fas fa-hourglass-half',
            color: creditsRemaining <= 120 ? 'var(--ui-accent)' : 'var(--ui-primary)'
        });
        kb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 4); return r ? r.get('value') : '—'; },
            label: 'Attendance', icon: 'fas fa-user-check',
            color: attendance >= 75 ? 'var(--ui-accent)' : 'var(--ui-secondary)'
        });
        kb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 5); return r ? r.get('value') : '—'; },
            label: 'Courses', icon: 'fas fa-book-open', color: 'var(--ui-primary)'
        });
    }

    // ── Current Semester ────────────────────────────────────────────

    _renderCurrentSemester(container) {
        const card = container.add({ css: 'as-card-accent' });
        const header = card.add({ css: 'as-section-primary' });
        header.add({ tag: 'i', css: 'fas fa-calendar-alt' });
        header.add({ script: 'Current Semester' });

        const { semesters } = this._organizeBySemester();
        const currentSem = semesters.find(s => s.isCurrent) || semesters[0];

        if (!currentSem || currentSem.courses.length === 0) {
            card.add({ css: 'text-center py-3 text-xs text-muted', script: 'No courses enrolled this semester' });
            return;
        }

        // Semester summary
        const summary = card.add({ css: 'flex items-center gap-3 mb-3 text-xs text-gray-500' });
        summary.add({ script: `${currentSem.year} S${currentSem.semester}` });
        summary.add({ css: 'text-gray-300', script: '|' });
        summary.add({ script: `${currentSem.courses.length} courses` });
        if (currentSem.average) {
            summary.add({ css: 'text-gray-300', script: '|' });
            const avgColor = AutoScholarConfig.getThresholdColor(currentSem.average, 'pass');
            summary.add({ css: `font-semibold text-${avgColor === 'success' ? 'green' : avgColor === 'warning' ? 'amber' : 'red'}-600`, script: `${currentSem.average}% avg` });
        }

        // Compact course rows
        const courseList = card.add({ css: 'space-y-2' });

        currentSem.courses.forEach(({ course, result, mark, grade, offering }) => {
            const markNum = parseFloat(mark) || 0;
            const code = course?.code || '??';
            const courseName = course?.label || course?.name || code;
            const credits = course?.credits || '-';

            const row = courseList.add({ css: 'flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer' });

            // Grade indicator dot
            const dotColor = mark === null || mark === undefined ? 'bg-gray-300' :
                markNum >= 75 ? 'bg-green-500' : markNum >= 50 ? 'bg-blue-500' : 'bg-red-500';
            row.add({ css: `w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}` });

            // Course info
            const info = row.add({ css: 'flex-1 min-w-0' });
            const nameRow = info.add({ css: 'flex items-center gap-2' });
            nameRow.add({ css: 'font-medium text-sm truncate', script: courseName, attr: { title: courseName } });
            nameRow.add({ css: 'text-xs text-gray-400 flex-shrink-0', script: code });

            // Right side: mark + grade
            const rightSide = row.add({ css: 'flex items-center gap-2 flex-shrink-0' });
            if (mark !== null && mark !== undefined) {
                const markColor = AutoScholarConfig.getThresholdClass(markNum, 'pass', 'text');
                rightSide.add({ css: `text-sm font-bold ${markColor}`, script: `${mark}%` });
            } else {
                rightSide.add({ css: 'text-xs text-gray-400 italic', script: 'pending' });
            }
            if (grade) {
                const badgeColor = this._gradeBadgeColor(grade);
                rightSide.add({ css: `px-1.5 py-0.5 rounded text-xs font-bold ${badgeColor}`, script: grade });
            }
            rightSide.add({ css: 'text-xs text-gray-400', script: `${credits}cr` });

            // Click handler: toggle detail expansion
            let detailExpanded = false;
            row.domElement.onclick = () => {
                if (detailExpanded) {
                    // Collapse
                    const detail = row.domElement.querySelector('.course-detail');
                    if (detail) detail.remove();
                    detailExpanded = false;
                    return;
                }
                detailExpanded = true;
                const detail = info.add({ css: 'course-detail mt-1 text-xs text-gray-500 flex items-center gap-3' });
                if (mark !== null && mark !== undefined) {
                    // Inline progress bar
                    const barWrap = detail.add({ css: 'flex-1' });
                    AutoScholarConfig.renderProgress(barWrap, markNum, { thresholdKey: 'pass', size: 'xs' });
                }
                if (offering) detail.add({ script: `S${offering.semester || '?'} ${offering.year || ''}` });
                if (result?.status) detail.add({ script: result.status });
            };
        });
    }

    // ── Upcoming Assessments ────────────────────────────────────────

    _renderUpcoming(container) {
        const card = container.add({ css: 'as-card p-4' });
        const header = card.add({ css: 'as-section-secondary' });
        header.add({ tag: 'i', css: 'fas fa-clock' });
        header.add({ script: 'Upcoming' });

        const { semesters } = this._organizeBySemester();
        const currentSem = semesters.find(s => s.isCurrent) || semesters[0];
        const assessments = currentSem ? this._getUpcomingAssessments(currentSem) : [];

        if (assessments.length === 0) {
            card.add({ css: 'text-center py-3 text-xs text-green-600', script: 'No upcoming deadlines' });
            return;
        }

        const list = card.add({ css: 'space-y-1.5' });
        assessments.slice(0, 8).forEach(item => {
            const now = Date.now();
            const daysUntil = Math.ceil((item.timestamp - now) / (1000 * 60 * 60 * 24));
            const urgencyColor = daysUntil <= 2 ? 'text-red-600 font-bold' : daysUntil <= 7 ? 'text-orange-600 font-semibold' : 'text-blue-600';
            const urgencyText = daysUntil <= 0 ? 'TODAY' : daysUntil === 1 ? 'TMR' : `${daysUntil}d`;

            const row = list.add({ css: 'flex items-center gap-2 text-xs' });
            row.add({ css: `w-8 text-right flex-shrink-0 ${urgencyColor}`, script: urgencyText });
            row.add({ css: 'truncate text-gray-700', script: item.name, attr: { title: item.name } });
        });
    }

    // ── Study Progress (Graduation Tracker) ─────────────────────────

    _renderStudyProgress(container) {
        const card = container.add({ css: 'as-card-highlight' });
        const header = card.add({ css: 'as-section-primary' });
        header.add({ tag: 'i', css: 'fas fa-route' });
        header.add({ script: 'Study Progress' });

        const results = this._getStudentResults();
        const enrolments = this._getStudentEnrolments();
        const creditsEarned = this._calculateCreditsEarned();
        const totalCredits = 360;
        const pct = Math.min(100, Math.round((creditsEarned / totalCredits) * 100));
        const passed = results.filter(r => r.mark >= 50).length;
        const failed = results.filter(r => r.mark !== null && r.mark !== undefined && r.mark < 50).length;
        const pending = enrolments.length - results.filter(r => r.mark !== null && r.mark !== undefined).length;

        // Credits progress bar
        const progressLabel = card.add({ css: 'flex justify-between text-xs mb-1' });
        progressLabel.add({ script: 'Credits toward graduation' });
        progressLabel.add({ css: 'font-bold', script: `${creditsEarned} / ${totalCredits}` });
        AutoScholarConfig.renderProgress(card, pct, { thresholdKey: 'completion', size: 'sm' });

        // Stats row
        const statsRow = card.add({ css: 'flex gap-4 mt-3 text-xs' });
        const addStat = (label, value, color) => {
            const stat = statsRow.add({ css: 'flex-1 text-center' });
            stat.add({ css: `text-lg font-bold ${color}`, script: String(value) });
            stat.add({ css: 'text-gray-500', script: label });
        };
        addStat('Passed', passed, 'text-green-600');
        addStat('Failed', failed, failed > 0 ? 'text-red-600' : 'text-gray-400');
        addStat('In Progress', pending, 'text-blue-600');

        // Year estimate
        const yearOfStudy = this._estimateYearOfStudy();
        if (yearOfStudy) {
            card.add({ css: 'mt-3 pt-2 border-t text-xs text-gray-500 flex items-center gap-2' });
            card.add({ css: 'text-xs text-gray-500', script: `Estimated year ${yearOfStudy} of study` });
        }
    }

    // ── Alerts / Risk Flags ─────────────────────────────────────────

    _renderAlerts(container) {
        const card = container.add({ css: 'as-card' });
        const warnings = this._gatherWarnings();

        const header = card.add({ css: 'as-section-secondary' });
        header.add({ tag: 'i', css: 'fas fa-bell' });
        header.add({ script: 'Alerts' });
        if (warnings.length > 0) {
            header.add({ css: 'px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold', script: String(warnings.length) });
        }

        if (warnings.length === 0) {
            card.add({ css: 'text-center py-3 text-xs text-green-600', script: 'All clear — you\'re on track' });
            return;
        }

        const list = card.add({ css: 'space-y-1.5' });
        warnings.forEach(w => {
            const iconColor = w.color === 'red' ? 'text-red-500' : w.color === 'yellow' ? 'text-yellow-500' : 'text-orange-500';

            const item = list.add({ css: 'flex items-start gap-2 text-xs' });
            item.add({ tag: 'i', css: `fas fa-${w.icon} ${iconColor} mt-0.5 flex-shrink-0` });
            const text = item.add({ css: 'flex-1 min-w-0' });
            text.add({ css: 'font-medium text-gray-700', script: w.title });
            if (w.message) text.add({ css: 'text-gray-500 truncate', script: w.message, attr: { title: w.message } });
        });
    }

    _gatherWarnings() {
        const warnings = [];
        const results = this._getStudentResults();
        const avgMark = this._calculateAverageMark();

        // Risk service flags
        const riskFlags = this.services?.risk?.publon?.riskFlag?.rows?.filter(
            f => f && f.studentId === this.currentUser?.idx && f.status !== 'resolved'
        ) || [];
        riskFlags.forEach(flag => {
            warnings.push({
                icon: 'exclamation-triangle',
                color: flag.severity === 'high' ? 'red' : 'orange',
                title: flag.title || 'Risk Flag',
                message: flag.description || flag.message || ''
            });
        });

        // Failing courses
        const failing = results.filter(r => r.mark !== null && r.mark !== undefined && r.mark < 50);
        if (failing.length > 0) {
            const courses = failing.map(r => {
                const course = this._getCourseFromEnrolment(r.enrolmentId);
                return course?.code || 'Unknown';
            }).join(', ');
            warnings.push({
                icon: 'exclamation-circle',
                color: 'red',
                title: `${failing.length} course${failing.length > 1 ? 's' : ''} below pass mark`,
                message: courses
            });
        }

        // Low average
        if (avgMark > 0 && avgMark < 50 && results.length >= 3) {
            warnings.push({
                icon: 'chart-line',
                color: 'orange',
                title: 'Average below pass threshold',
                message: `Current average: ${avgMark}%. Consider scheduling an advisor meeting.`
            });
        }

        return warnings;
    }

    // ── Helper Methods ──────────────────────────────────────────────

    _getStudentEnrolments() {
        if (!this.services?.academic) return [];
        const studentId = this.currentUser?.idx;
        if (!studentId) return [];
        return (this.services.academic.publon.enrolment.rows || []).filter(e => e && e.studentId === studentId);
    }

    _getStudentResults() {
        const enrolments = this._getStudentEnrolments();
        const enrolmentIds = enrolments.map(e => e.idx);
        if (!this.services?.academic) return [];
        return (this.services.academic.publon.result?.rows || []).filter(r => r && enrolmentIds.includes(r.enrolmentId));
    }

    _getCourse(courseId) {
        return this.services?.academic?.publon?.course?.rows?.find(c => c?.idx === courseId);
    }

    _getOffering(offeringId) {
        return this.services?.academic?.publon?.offering?.rows?.find(o => o?.idx === offeringId);
    }

    _getCourseFromEnrolment(enrolmentId) {
        const enrol = this.services?.academic?.publon?.enrolment?.rows?.find(e => e?.idx === enrolmentId);
        if (!enrol) return null;
        const offering = this._getOffering(enrol.offeringId);
        return offering ? this._getCourse(offering.courseId) : null;
    }

    _markToGrade(mark) {
        if (mark === null || mark === undefined) return null;
        if (mark >= 75) return 'A';
        if (mark >= 70) return 'B+';
        if (mark >= 60) return 'B';
        if (mark >= 50) return 'C';
        return 'F';
    }

    _calculateGPA() {
        const results = this._getStudentResults();
        if (results.length === 0) return '0.0';
        const points = results.map(r => {
            if (r.mark >= 75) return 4.0;
            if (r.mark >= 70) return 3.5;
            if (r.mark >= 60) return 3.0;
            if (r.mark >= 50) return 2.0;
            return 0;
        });
        return (points.reduce((a, b) => a + b, 0) / points.length).toFixed(1);
    }

    _calculateAverageMark() {
        const results = this._getStudentResults();
        if (results.length === 0) return 0;
        const sum = results.reduce((acc, r) => acc + (r.mark || 0), 0);
        return Math.round(sum / results.length);
    }

    _calculateCreditsEarned() {
        const results = this._getStudentResults();
        return results.filter(r => r.mark >= 50).reduce((sum, r) => {
            const course = this._getCourseFromEnrolment(r.enrolmentId);
            return sum + (course?.credits || 0);
        }, 0);
    }

    _getAttendancePercent() {
        // Pull from attendance/audit service if available
        const attendance = this.services?.attendance;
        if (attendance?.getStudentAttendance) {
            const data = attendance.getStudentAttendance(this.currentUser?.idx);
            if (data?.percent !== undefined) return Math.round(data.percent);
        }
        // Fallback: check audit logs for attendance data
        const logs = this.services?.audit?.publon?.attendanceLog?.rows?.filter(
            l => l && l.studentId === this.currentUser?.idx
        ) || [];
        if (logs.length === 0) return 0;
        const present = logs.filter(l => l.status === 'present' || l.status === 'attended').length;
        return Math.round((present / logs.length) * 100);
    }

    _organizeBySemester() {
        const enrolments = this._getStudentEnrolments();
        const results = this._getStudentResults();
        const semesterData = {};

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentSemester = currentMonth < 6 ? 1 : 2;
        const currentKey = `${currentYear}-S${currentSemester}`;

        enrolments.forEach(enrol => {
            const offering = this._getOffering(enrol.offeringId);
            if (!offering) return;
            const course = this._getCourse(offering.courseId);
            const year = offering.year || currentYear;
            const semester = offering.semester || 1;
            const key = `${year}-S${semester}`;

            if (!semesterData[key]) {
                semesterData[key] = {
                    year, semester, key,
                    isCurrent: key === currentKey,
                    courses: [], totalMarks: 0, markCount: 0, pendingCount: 0
                };
            }

            const result = results.find(r => r.enrolmentId === enrol.idx);
            semesterData[key].courses.push({
                enrol, offering, course, result,
                mark: result?.mark,
                grade: result?.grade || this._markToGrade(result?.mark)
            });

            if (result?.mark) {
                semesterData[key].totalMarks += parseFloat(result.mark);
                semesterData[key].markCount++;
            } else {
                semesterData[key].pendingCount++;
            }
        });

        Object.values(semesterData).forEach(sd => {
            sd.average = sd.markCount > 0 ? Math.round(sd.totalMarks / sd.markCount) : null;
        });

        const sorted = Object.values(semesterData).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.semester - a.semester;
        });

        return { semesters: sorted, currentKey };
    }

    _getUpcomingAssessments(sem) {
        const assessments = [];
        const now = new Date();
        sem.courses.forEach(({ course, offering }) => {
            const courseAssessments = this.services?.assessment?.getOfferingAssessments?.(offering?.idx) || [];
            courseAssessments.forEach(assess => {
                if (assess.dueDate && new Date(assess.dueDate) > now) {
                    assessments.push({
                        name: `${course?.code || '??'}: ${assess.name || assess.type}`,
                        date: new Date(assess.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
                        timestamp: new Date(assess.dueDate).getTime()
                    });
                }
            });
        });
        return assessments.sort((a, b) => a.timestamp - b.timestamp);
    }

    _getStudentProgramme() {
        const enrolments = this._getStudentEnrolments();
        if (enrolments.length === 0) return null;
        // Find programme via offering → course → programme chain
        const offering = this._getOffering(enrolments[0]?.offeringId);
        const course = offering ? this._getCourse(offering.courseId) : null;
        if (course?.programmeId) {
            const programme = this.services?.academic?.publon?.programme?.rows?.find(p => p?.idx === course.programmeId);
            if (programme) return programme.label || programme.name || programme.code;
        }
        // Try direct programme lookup from student
        const studentProgramme = this.services?.academic?.publon?.programme?.rows?.find(
            p => p && (p.idx === this.currentUser?.programmeId)
        );
        return studentProgramme?.label || studentProgramme?.name || null;
    }

    _estimateYearOfStudy() {
        const enrolments = this._getStudentEnrolments();
        if (enrolments.length === 0) return null;
        const years = new Set();
        enrolments.forEach(e => {
            const offering = this._getOffering(e.offeringId);
            if (offering?.year) years.add(offering.year);
        });
        return years.size || null;
    }

    _getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    _gradeColorClass(mark) {
        if (mark === null || mark === undefined) return 'as-grade-bg-none';
        const m = parseFloat(mark);
        if (m >= 75) return 'as-grade-bg-excellent';
        if (m >= 60) return 'as-grade-bg-good';
        if (m >= 50) return 'as-grade-bg-pass';
        return 'as-grade-bg-fail';
    }

    _gradeBadgeColor(grade) {
        if (grade === 'A') return 'bg-green-100 text-green-700';
        if (grade === 'B+' || grade === 'B') return 'bg-blue-100 text-blue-700';
        if (grade === 'C') return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
    }

}
