/**
 * StudentResultsPanel - Academic Results View
 *
 * Provides a detailed view of academic results:
 * - Year/Semester selector dropdown
 * - Responsive card grid with marks, grades, progress bars
 * - Course detail modal with assessment breakdown
 * - GPA summary section
 */
class StudentResultsPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
        this._selectedFilter = 'all';
    }

    render(container) {
        if (!this.currentUser) {
            container.add({ css: 'text-center py-8 text-muted', script: 'Please log in to view your results.' });
            return;
        }

        this._container = container;

        // Header
        const header = container.add({ css: 'flex items-center justify-between mb-4' });
        const titleArea = header.add({ css: 'flex items-center gap-3' });
        titleArea.add({ tag: 'i', css: 'fas fa-poll text-primary text-xl' });
        titleArea.add({ tag: 'h2', css: 'text-xl font-bold', script: 'Academic Results' });

        // GPA display in header
        const gpa = this._calculateGPA();
        const gpaValue = parseFloat(gpa);
        const gpaCls = gpaValue >= 3.0 ? 'bg-green-100 text-green-700' : gpaValue >= 2.0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
        header.add({ css: `px-3 py-1 rounded-lg font-bold text-sm ${gpaCls}`, script: `GPA: ${gpa}` });

        // Year/Semester selector
        this._renderFilterBar(container);

        // Course grid
        this._renderCourseGrid(container);

        // GPA section
        this._renderGPASection(container);
    }

    // ── Filter Bar ──────────────────────────────────────────────────

    _renderFilterBar(container) {
        const { semesters } = this._organizeBySemester();
        const filterBar = container.add({ css: 'flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg' });

        filterBar.add({ css: 'text-sm font-medium text-gray-600 mr-2', script: 'Filter:' });

        // All results
        const allBtn = filterBar.add({
            css: `px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${this._selectedFilter === 'all' ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-100'}`,
            script: 'All'
        });
        allBtn.domElement.onclick = () => {
            this._selectedFilter = 'all';
            this._container.clear();
            this.render(this._container);
        };

        // Per-semester buttons
        semesters.forEach(sem => {
            const label = `${sem.year} S${sem.semester}`;
            const isActive = this._selectedFilter === sem.key;
            const btn = filterBar.add({
                css: `px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${isActive ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-100'}`,
                script: label
            });
            btn.domElement.onclick = () => {
                this._selectedFilter = sem.key;
                this._container.clear();
                this.render(this._container);
            };
        });
    }

    // ── Course Grid ─────────────────────────────────────────────────

    _renderCourseGrid(container) {
        const { semesters } = this._organizeBySemester();

        // Gather all courses based on filter
        let courses = [];
        if (this._selectedFilter === 'all') {
            semesters.forEach(sem => {
                sem.courses.forEach(c => courses.push({ ...c, semLabel: `${sem.year} S${sem.semester}` }));
            });
        } else {
            const sem = semesters.find(s => s.key === this._selectedFilter);
            if (sem) {
                courses = sem.courses.map(c => ({ ...c, semLabel: `${sem.year} S${sem.semester}` }));
            }
        }

        if (courses.length === 0) {
            const empty = container.add({ css: 'text-center py-8 text-muted' });
            empty.add({ tag: 'i', css: 'fas fa-folder-open text-3xl mb-2 opacity-50' });
            empty.add({ tag: 'p', script: 'No results found' });
            return;
        }

        const grid = container.add({ css: 'flex flex-wrap gap-4 mb-5' });

        courses.forEach(courseData => {
            this._renderResultCard(grid, courseData);
        });
    }

    _renderResultCard(grid, { course, result, mark, grade, enrol, offering, semLabel }) {
        const markNum = parseFloat(mark) || 0;
        const code = course?.code || '??';
        const initials = code.replace(/[0-9]/g, '').substring(0, 2).toUpperCase();
        const courseName = course?.label || course?.name || code;
        const credits = course?.credits || 0;

        const card = grid.add({ css: 'card p-4 cursor-pointer hover:shadow-md transition-shadow as-flex-card-md' });

        // Top row: Avatar + Title
        const topRow = card.add({ css: 'flex items-start gap-3 mb-3' });

        // Avatar with initials
        const avatarEl = topRow.add({
            css: `w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${this._gradeColorClass(mark)}`
        });
        avatarEl.add({ script: initials });

        const nameArea = topRow.add({ css: 'flex-1 min-w-0' });
        nameArea.add({ css: 'font-semibold text-sm truncate', script: courseName, attr: { title: courseName } });
        nameArea.add({ css: 'text-xs text-muted', script: code });
        if (semLabel) {
            nameArea.add({ css: 'text-xs text-gray-400', script: semLabel });
        }

        // Grade badge
        if (grade) {
            const badgeCls = this._gradeBadgeColor(grade);
            if (typeof uiBadge !== 'undefined') {
                const badgeVariant = grade === 'A' ? 'success' : (grade === 'B+' || grade === 'B') ? 'primary' : grade === 'C' ? 'warning' : 'danger';
                new uiBadge({ parent: topRow, label: grade, color: badgeVariant });
            } else {
                topRow.add({ css: `px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${badgeCls}`, script: grade });
            }
        } else {
            if (typeof uiBadge !== 'undefined') {
                new uiBadge({ parent: topRow, label: 'Pending', color: 'secondary' });
            } else {
                topRow.add({ css: 'px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 flex-shrink-0', script: 'Pending' });
            }
        }

        // Mark and progress bar
        if (mark !== null && mark !== undefined) {
            const progressRow = card.add({ css: 'mb-3' });
            const progressLabel = progressRow.add({ css: 'flex justify-between text-xs mb-1' });
            progressLabel.add({ script: 'Mark' });
            progressLabel.add({ css: 'font-bold', script: `${mark}%` });

            AutoScholarConfig.renderProgress(progressRow, markNum, { thresholdKey: 'pass' });
        } else {
            card.add({ css: 'text-xs text-muted italic mb-3', script: 'Awaiting results' });
        }

        // Credits display
        const statsRow = card.add({ css: 'flex justify-between items-center border-t pt-2 text-xs text-gray-500' });
        const creditsEl = statsRow.add({ css: 'flex items-center gap-1' });
        creditsEl.add({ tag: 'i', css: 'fas fa-coins' });
        creditsEl.add({ script: ' ' + credits + ' credits' });

        if (mark !== null && mark !== undefined) {
            const status = markNum >= 50 ? 'Passed' : 'Failed';
            const statusCls = AutoScholarConfig.getThresholdClass(markNum, 'pass', 'text');
            statsRow.add({ css: `font-medium ${statusCls}`, script: status });
        }

        // Click handler for detail modal
        card.domElement.onclick = () => {
            this._showCourseDetailModal({ course, result, mark, grade, enrol, offering });
        };
    }

    // ── Course Detail Modal ─────────────────────────────────────────

    _showCourseDetailModal({ course, result, mark, grade, enrol, offering }) {
        const courseName = course?.label || course?.name || course?.code || 'Course';
        const code = course?.code || '';

        // Create modal overlay — safe DOM construction (no innerHTML with user data)
        const overlay = document.createElement('div');
        overlay.className = 'ui-modal-backdrop ui-active';
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.className = 'ui-modal ui-modal-sm ui-active';
        overlay.appendChild(modal);

        const modalBody = document.createElement('div');
        modalBody.className = 'ui-modal-body';
        modal.appendChild(modalBody);

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'ui-modal-header';
        modal.insertBefore(headerDiv, modalBody);

        const titleDiv = document.createElement('div');
        const h3 = document.createElement('h3');
        h3.className = 'ui-modal-title';
        h3.textContent = courseName;
        titleDiv.appendChild(h3);
        const codeSpan = document.createElement('span');
        codeSpan.className = 'text-sm text-muted';
        codeSpan.textContent = code;
        titleDiv.appendChild(codeSpan);
        headerDiv.appendChild(titleDiv);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ui-modal-close';
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', () => overlay.remove());
        headerDiv.appendChild(closeBtn);

        // Result summary
        if (mark !== null && mark !== undefined) {
            const markNum = parseFloat(mark);

            const resultDiv = document.createElement('div');
            resultDiv.className = 'p-4 bg-gray-50 rounded-lg mb-4';

            const markRow = document.createElement('div');
            markRow.className = 'flex justify-between items-center mb-2';
            const markLabel = document.createElement('span');
            markLabel.className = 'font-semibold';
            markLabel.textContent = 'Final Mark';
            markRow.appendChild(markLabel);
            const markValue = document.createElement('span');
            markValue.className = 'text-2xl font-bold';
            markValue.textContent = mark + '%';
            markRow.appendChild(markValue);
            resultDiv.appendChild(markRow);

            AutoScholarConfig.renderProgress(resultDiv, markNum, { thresholdKey: 'pass' });

            const metaRow = document.createElement('div');
            metaRow.className = 'flex justify-between mt-2 text-sm text-muted';
            const gradeSpan = document.createElement('span');
            gradeSpan.textContent = 'Grade: ' + (grade || '-');
            metaRow.appendChild(gradeSpan);
            const creditsSpan = document.createElement('span');
            creditsSpan.textContent = 'Credits: ' + (course?.credits || '-');
            metaRow.appendChild(creditsSpan);
            const statusSpan = document.createElement('span');
            statusSpan.textContent = markNum >= 50 ? 'Passed' : 'Failed';
            metaRow.appendChild(statusSpan);
            resultDiv.appendChild(metaRow);

            modalBody.appendChild(resultDiv);
        }

        // Assessment breakdown
        const assessments = this.services?.assessment?.getOfferingAssessments?.(offering?.idx) || [];
        if (assessments.length > 0) {
            const assessDiv = document.createElement('div');
            assessDiv.className = 'mb-4';
            const assessH4 = document.createElement('h4');
            assessH4.className = 'font-semibold mb-2';
            assessH4.textContent = 'Assessment Breakdown';
            assessDiv.appendChild(assessH4);

            const table = document.createElement('table');
            table.className = 'w-full text-sm';
            const thead = document.createElement('thead');
            const headTr = document.createElement('tr');
            headTr.className = 'border-b-2';
            ['Assessment', 'Weight', 'Mark'].forEach((h, i) => {
                const th = document.createElement('th');
                th.className = i === 0 ? 'text-left p-1.5' : 'text-center p-1.5';
                th.textContent = h;
                headTr.appendChild(th);
            });
            thead.appendChild(headTr);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            assessments.forEach(a => {
                const tr = document.createElement('tr');
                tr.className = 'border-b';
                const tdName = document.createElement('td');
                tdName.className = 'p-1.5';
                tdName.textContent = a.name || a.type || 'Assessment';
                tr.appendChild(tdName);
                const tdWeight = document.createElement('td');
                tdWeight.className = 'text-center p-1.5';
                tdWeight.textContent = (a.weight || '-') + '%';
                tr.appendChild(tdWeight);
                const tdMark = document.createElement('td');
                tdMark.className = 'text-center p-1.5 font-semibold';
                tdMark.textContent = a.mark !== null && a.mark !== undefined ? a.mark + '%' : '-';
                tr.appendChild(tdMark);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            assessDiv.appendChild(table);
            modalBody.appendChild(assessDiv);
        }

        // Notes section
        const notesDiv = document.createElement('div');
        const notesH4 = document.createElement('h4');
        notesH4.className = 'font-semibold mb-2';
        notesH4.textContent = 'Notes';
        notesDiv.appendChild(notesH4);
        const notesP = document.createElement('p');
        notesP.className = 'text-sm text-muted';
        notesP.textContent = result?.notes || enrol?.notes || 'No notes recorded.';
        notesDiv.appendChild(notesP);
        modalBody.appendChild(notesDiv);

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // Close on Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);
    }

    // ── GPA Section ─────────────────────────────────────────────────

    _renderGPASection(container) {
        const results = this._getStudentResults();
        if (results.length === 0) return;

        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-trophy text-yellow-500' });
        header.add({ css: 'font-semibold', script: 'GPA Summary' });

        const gpa = this._calculateGPA();
        const gpaValue = parseFloat(gpa);
        const avgMark = this._calculateAverageMark();
        const creditsEarned = this._calculateCreditsEarned();
        const passed = results.filter(r => r.mark >= 50).length;
        const failed = results.filter(r => r.mark !== null && r.mark !== undefined && r.mark < 50).length;
        const distinctions = results.filter(r => r.mark >= 75).length;

        const statsGrid = card.add({ css: 'flex flex-wrap gap-3' });

        const stats = [
            { label: 'GPA', value: gpa, color: gpaValue >= 3.0 ? 'green' : gpaValue >= 2.0 ? 'blue' : 'amber' },
            { label: 'Average', value: `${avgMark}%`, color: avgMark >= 75 ? 'green' : avgMark >= 60 ? 'blue' : avgMark >= 50 ? 'amber' : 'red' },
            { label: 'Credits', value: String(creditsEarned), color: 'blue' },
            { label: 'Passed', value: String(passed), color: 'green' },
            { label: 'Failed', value: String(failed), color: failed > 0 ? 'red' : 'green' },
            { label: 'Distinctions', value: String(distinctions), color: distinctions > 0 ? 'green' : 'blue' }
        ];

        stats.forEach(stat => {
            const colorMap = {
                green: 'bg-green-50 border-green-200',
                blue: 'bg-blue-50 border-blue-200',
                amber: 'bg-amber-50 border-amber-200',
                red: 'bg-red-50 border-red-200'
            };
            const cls = colorMap[stat.color] || colorMap.blue;

            const box = statsGrid.add({ css: `p-3 rounded-lg border text-center as-flex-stat ${cls}` });
            box.add({ css: 'text-xl font-bold text-gray-800', script: stat.value });
            box.add({ css: 'text-xs text-gray-500', script: stat.label });
        });
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
