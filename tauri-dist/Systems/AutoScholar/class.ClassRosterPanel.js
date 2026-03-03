/**
 * ClassRosterPanel — Student Browser
 *
 * Sidebar-driven navigation with stage drill-down:
 *   Summary: Class overview with KPIs, distribution chart, top/bottom performers
 *   Student Profile: Programme registrations + course results (via sidebar card click)
 *   Course Detail: Assessment results + Plotly distribution chart
 *
 * Usage:
 *   const panel = new ClassRosterPanel({ courseCode: 'MGAB401', year: 2020 });
 *   panel.render(controlEl, stageEl);
 */
class ClassRosterPanel {

    constructor(config = {}) {
        this._embedded = !!config.embedded;
        this.endpoint = config.endpoint || '/api-proxy';
        this.courseCode = config.courseCode || 'MGAB401';
        this.year = config.year || 2020;
        this.passThreshold = config.passThreshold || 50;

        // Auth
        this.sessionId = null;
        this.logToken = null;

        // UI refs
        this._controlEl = null;
        this._stageEl = null;
        this._inputs = {};
        this._statusBadge = null;
        this._accordion = null;

        // Student list state
        this._allStudents = [];
        this._filteredStudents = [];
        this._activeFilter = 'all';
        this._searchQuery = '';
        this._currentPage = 0;
        this._pageSize = 20;

        // Sort state
        this._sortField = 'lastName';
        this._sortAsc = true;

        // Drill-down state
        this._currentView = 'summary';  // 'summary' | 'student' | 'course'
        this._selectedStudent = null;
        this._selectedCourse = null;

        // Caches
        this._courseResultsCache = {};
        this._assessmentCache = {};
        this._busKey = 'roster';
    }

    // ── Service Bindings ─────────────────────────────────────────────────────

    setPublome(publome) {
        this._publome = publome;
    }

    // ── Component API ──────────────────────────────────────────────────

    connectBus(bus) {
        this._bus = bus;
        bus.on('load', params => this.load(params));
        return this;
    }

    async load(params = {}) {
        if (params.courseCode !== undefined) this.courseCode = params.courseCode;
        if (params.year !== undefined) this.year = parseInt(params.year, 10);
        if (params.studentNumber !== undefined) this._studentNumberFilter = params.studentNumber;
        if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'loading' });
        try {
            await this._loadData(true);
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'done' });
        } catch (err) {
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'error', detail: err.message });
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        if (controlEl) this._buildAccordion();
        if (stageEl) this._renderEmptyStage();
    }

    // ── Auto-open Students pane ──────────────────────────────────────────────

    openParams() {
        if (!this._accordion) return;
        var studentsItem = this._accordion.el.querySelector('.ui-accordion-item[data-key="students"]');
        if (!studentsItem) return;
        if (!studentsItem.classList.contains('ui-active')) {
            var trigger = studentsItem.querySelector('.ui-accordion-trigger');
            if (trigger) trigger.click();
        }
    }

    // ── Controls (Accordion) ────────────────────────────────────────────────

    _buildAccordion(showStudents = false) {
        if (!this._controlEl) return;
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: {
                label: '<i class="fas fa-sliders-h" class="cr-icon-mr"></i>Parameters',
                open: !showStudents
            }
        };
        if (showStudents) {
            content.students = {
                label: '<i class="fas fa-users" class="cr-icon-mr"></i>Students',
                open: true
            };
        }

        const accordion = new uiAccordion({
            exclusive: true, content, parent: el
        });
        this._accordion = accordion;

        const paramsEl = accordion.el.querySelector(
            '.ui-accordion-item[data-key="params"] .ui-accordion-content'
        );
        this._renderParamsContent(paramsEl);

        if (showStudents) {
            const studentsEl = accordion.el.querySelector(
                '.ui-accordion-item[data-key="students"] .ui-accordion-content'
            );
            this._renderStudentsPane(studentsEl);
        }
    }

    _renderParamsContent(el) {
        if (!this._embedded) {
            const connRow = document.createElement('div');
            connRow.className = 'cv-mb-md';
            el.appendChild(connRow);

            const connLabel = document.createElement('label');
            connLabel.className = 'cv-ctrl-label cv-font-medium';
            connLabel.textContent = 'Connection';
            connRow.appendChild(connLabel);

            this._statusBadge = new uiBadge({ label: 'Disconnected', color: 'gray', size: 'sm', parent: connRow });

            this._inputs.courseCode = new uiInput({
                template: 'inline-label', label: 'Course Code',
                value: this.courseCode, size: 'sm', parent: el
            });

            this._inputs.year = new uiInput({
                template: 'inline-label', label: 'Year',
                value: String(this.year), inputType: 'number', size: 'sm', parent: el
            });

            const btnWrap = document.createElement('div');
            btnWrap.className = 'cv-mt-md';
            el.appendChild(btnWrap);

            new uiButton({
                label: 'Load Roster', variant: 'primary', size: 'sm', parent: btnWrap,
                onClick: () => this._loadData()
            });
        }
    }

    // ── Students Pane (sidebar) ─────────────────────────────────────────────

    _renderStudentsPane(el) {
        const searchRow = document.createElement('div');
        searchRow.className = 'cv-mb-xs';
        el.appendChild(searchRow);

        this._sidebarSearch = new uiInput({
            template: 'inline-label', label: 'Search',
            placeholder: 'Name or student no...', size: 'sm', parent: searchRow
        });
        const searchEl = this._sidebarSearch.el.querySelector('input') || this._sidebarSearch.el;
        searchEl.addEventListener('input', () => this._applyFilterAndSearch());

        const filterRow = document.createElement('div');
        filterRow.className = 'cv-flex-row cv-flex-wrap cv-gap-sm cv-mb-xs';
        el.appendChild(filterRow);

        this._activeFilter = 'all';
        const passCount = this._allStudents.filter(s => s.status === 'pass').length;
        const failCount = this._allStudents.filter(s => s.status === 'fail').length;
        const filters = [
            { key: 'all', label: `All (${this._allStudents.length})` },
            { key: 'pass', label: `Pass (${passCount})`, color: 'success' },
            { key: 'fail', label: `Fail (${failCount})`, color: 'danger' }
        ];

        this._filterBadges = {};
        filters.forEach(f => {
            const badge = new uiBadge({
                label: f.label, color: f.key === 'all' ? 'primary' : (f.color || 'gray'),
                size: 'sm', parent: filterRow
            });
            badge.el.style.cursor = 'pointer';
            badge.el.style.opacity = f.key === 'all' ? '1' : '0.5';
            badge.el.addEventListener('click', () => this._setFilter(f.key));
            this._filterBadges[f.key] = badge;
        });

        this._sidebarCardList = document.createElement('div');
        this._sidebarCardList.className = 'cr-sidebar-list';
        el.appendChild(this._sidebarCardList);

        const pageRow = document.createElement('div');
        pageRow.className = 'cv-page-footer cv-text-md';
        el.appendChild(pageRow);

        this._sidebarPage = 0;
        this._sidebarPageSize = 12;

        this._sidebarPrevBtn = document.createElement('button');
        this._sidebarPrevBtn.className = 'ui-btn ui-btn-ghost ui-btn-xs';
        this._sidebarPrevBtn.textContent = 'Prev';
        this._sidebarPrevBtn.addEventListener('click', () => { this._sidebarPage--; this._renderSidebarCards(); });
        pageRow.appendChild(this._sidebarPrevBtn);

        this._sidebarPageLabel = document.createElement('span');
        this._sidebarPageLabel.className = 'as-text-muted';
        pageRow.appendChild(this._sidebarPageLabel);

        this._sidebarNextBtn = document.createElement('button');
        this._sidebarNextBtn.className = 'ui-btn ui-btn-ghost ui-btn-xs';
        this._sidebarNextBtn.textContent = 'Next';
        this._sidebarNextBtn.addEventListener('click', () => { this._sidebarPage++; this._renderSidebarCards(); });
        pageRow.appendChild(this._sidebarNextBtn);

        this._renderSidebarCards();
    }

    _setFilter(key) {
        this._activeFilter = key;
        Object.entries(this._filterBadges).forEach(([k, badge]) => {
            badge.el.style.opacity = k === key ? '1' : '0.5';
        });
        this._sidebarPage = 0;
        this._currentPage = 0;
        this._applyFilterAndSearch();
    }

    _applyFilterAndSearch() {
        var searchEl = null;
        if (this._sidebarSearch) searchEl = this._sidebarSearch.el.querySelector('input') || this._sidebarSearch.el;
        var query = searchEl ? searchEl.value.toLowerCase().trim() : '';

        this._filteredStudents = this._allStudents.filter(s => {
            if (this._activeFilter === 'pass' && s.status !== 'pass') return false;
            if (this._activeFilter === 'fail' && s.status !== 'fail') return false;
            if (query) {
                const name = `${s.firstName} ${s.lastName}`.toLowerCase();
                return name.includes(query) || String(s.studentNumber).includes(query);
            }
            return true;
        });

        this._sortStudents();
        this._sidebarPage = 0;
        this._currentPage = 0;
        this._renderSidebarCards();
    }

    _renderSidebarCards() {
        if (!this._sidebarCardList) return;
        this._sidebarCardList.innerHTML = '';
        const total = this._filteredStudents.length;
        const totalPages = Math.max(1, Math.ceil(total / this._sidebarPageSize));
        this._sidebarPage = Math.max(0, Math.min(this._sidebarPage, totalPages - 1));

        const start = this._sidebarPage * this._sidebarPageSize;
        const page = this._filteredStudents.slice(start, start + this._sidebarPageSize);

        if (page.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'cr-empty-state';
            empty.textContent = 'No students match.';
            this._sidebarCardList.appendChild(empty);
        }

        page.forEach(s => this._sidebarCardList.appendChild(this._buildSidebarCard(s)));

        this._sidebarPageLabel.textContent = total > 0
            ? `${start + 1}\u2013${Math.min(start + this._sidebarPageSize, total)} of ${total}`
            : '0 of 0';
        this._sidebarPrevBtn.disabled = this._sidebarPage === 0;
        this._sidebarNextBtn.disabled = this._sidebarPage >= totalPages - 1;
    }

    _buildSidebarCard(student) {
        const card = document.createElement('div');
        card.className = 'as-student-card as-card-compact';
        card.addEventListener('click', () => this._drillToStudent(student));

        const header = document.createElement('div');
        header.className = 'as-student-card-header';
        card.appendChild(header);

        const initials = ((student.firstName?.[0] || '') + (student.lastName?.[0] || '')).toUpperCase() || '?';
        const avatarClass = student.status === 'pass' ? 'as-student-avatar-good' : 'as-student-avatar-risk';
        const avatar = document.createElement('div');
        avatar.className = 'as-student-avatar ' + avatarClass;
        avatar.textContent = initials;
        header.appendChild(avatar);

        const nameBlock = document.createElement('div');
        nameBlock.className = 'as-student-name-block';
        nameBlock.innerHTML =
            `<div class="as-student-name as-text-xs">${(student.firstName + ' ' + student.lastName).trim() || student.studentNumber}</div>` +
            `<div class="as-student-id">${student.studentNumber}</div>`;
        header.appendChild(nameBlock);

        const pillClass = student.status === 'pass' ? 'as-status-pill-good' : 'as-status-pill-risk';
        const pill = document.createElement('span');
        pill.className = 'as-status-pill ' + pillClass;
        pill.textContent = `${this._r(student.mark)}%`;
        header.appendChild(pill);

        return card;
    }

    // ── Empty Stage ─────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'cv-p-lg';

        new uiAlert({
            color: 'info',
            title: 'Student Browser',
            message: 'Set course parameters and click Load Roster to browse students. Click a student to explore their programme registrations, course results, and assessment breakdown.',
            parent: this._stageEl
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SUMMARY STAGE (default view after load)
    // ══════════════════════════════════════════════════════════════════════════

    _drillToList() {
        this._currentView = 'summary';
        this._selectedStudent = null;
        this._selectedCourse = null;
        this._renderSummaryStage();
    }

    _renderSummaryStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-stage-scroll as-panel-inner';
        this._stageEl.appendChild(wrap);

        const students = this._allStudents;
        const marks = students.map(s => s.mark).filter(m => m > 0);
        const n = students.length;
        const passCount = students.filter(s => s.status === 'pass').length;
        const assessed = students.filter(s => s.status === 'pass' || s.status === 'fail').length;
        const failCount = assessed - passCount;
        const passRate = assessed > 0 ? (passCount / assessed * 100) : 0;
        const meanMark = marks.length > 0 ? this._mean(marks) : 0;
        const sd = marks.length > 1 ? this._stdDev(marks) : 0;

        // Course header
        const header = document.createElement('div');
        header.className = 'cr-stage-header';
        header.innerHTML = `<div class="cr-stage-title">${this.courseCode}</div><div class="cr-stage-subtitle">Academic Year ${this.year} \u2022 ${n} students enrolled</div>`;
        wrap.appendChild(header);

        // KPI row
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        wrap.appendChild(kpiRow);

        this._bindKPIs(kpiRow, [
            { code: 'enrolled', value: String(n), label: 'Enrolled', icon: 'fas fa-users', color: 'var(--ui-primary)' },
            { code: 'passRate', value: `${this._r(passRate)}%`, label: 'Pass Rate', icon: 'fas fa-check-circle', color: passRate >= 70 ? 'var(--ui-success)' : passRate >= 50 ? 'var(--ui-warning)' : 'var(--ui-danger)' },
            { code: 'mean', value: `${this._r(meanMark)}%`, label: 'Mean', icon: 'fas fa-chart-line', color: 'var(--ui-info)' },
            { code: 'sd', value: String(this._r(sd)), label: 'Std Dev', icon: 'fas fa-wave-square', color: 'var(--ui-secondary)' },
            { code: 'pass', value: String(passCount), label: 'Pass', icon: 'fas fa-thumbs-up', color: 'var(--ui-success)' },
            { code: 'fail', value: String(failCount), label: 'Fail', icon: 'fas fa-thumbs-down', color: 'var(--ui-danger)' }
        ]);

        // Distribution chart
        if (marks.length >= 2) {
            const chartTitle = document.createElement('div');
            chartTitle.className = 'cr-section-title';
            chartTitle.textContent = 'Mark Distribution';
            wrap.appendChild(chartTitle);

            const chartDiv = document.createElement('div');
            wrap.appendChild(chartDiv);

            Plotly.newPlot(chartDiv, [{
                x: marks,
                type: 'histogram',
                marker: { color: 'var(--ui-primary-200)', opacity: 0.75 },
                nbinsx: Math.min(15, Math.max(5, Math.ceil(Math.sqrt(marks.length))))
            }], {
                shapes: [
                    { type: 'line', x0: meanMark, x1: meanMark, y0: 0, y1: 1, yref: 'paper',
                      line: { color: 'var(--ui-info)', width: 2, dash: 'dash' } },
                    { type: 'line', x0: this.passThreshold, x1: this.passThreshold, y0: 0, y1: 1, yref: 'paper',
                      line: { color: 'var(--ui-danger)', width: 1, dash: 'dot' } },
                    { type: 'rect', x0: meanMark - sd, x1: meanMark + sd, y0: 0, y1: 1, yref: 'paper',
                      fillcolor: 'rgba(59,130,246,0.08)', line: { width: 0 } }
                ],
                annotations: [
                    { x: meanMark, y: 1, yref: 'paper', xanchor: 'left',
                      text: ` Mean: ${this._r(meanMark)}%`, showarrow: false,
                      font: { size: 10, color: 'var(--ui-info)' } },
                    { x: this.passThreshold, y: 0.92, yref: 'paper', xanchor: 'left',
                      text: ` Pass: ${this.passThreshold}%`, showarrow: false,
                      font: { size: 10, color: 'var(--ui-danger)' } }
                ],
                margin: { t: 15, r: 15, b: 35, l: 40 },
                height: 180,
                xaxis: { title: { text: 'Mark (%)', font: { size: 11 } } },
                yaxis: { title: { text: 'Count', font: { size: 11 } } },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { size: 10, color: 'var(--ui-gray-500)' }
            }, { displayModeBar: false, responsive: true });
        }

        // Top performers
        if (n > 0) {
            const sorted = [...students].sort((a, b) => b.mark - a.mark);
            const topCount = Math.min(5, n);
            const bottomCount = Math.min(5, failCount);

            this._renderPerformerList(wrap, 'Top Performers', sorted.slice(0, topCount), 'fas fa-trophy', 'var(--ui-success)');

            if (bottomCount > 0) {
                const bottom = sorted.slice(-bottomCount).reverse();
                this._renderPerformerList(wrap, 'At Risk', bottom, 'fas fa-exclamation-triangle', 'var(--ui-danger)');
            }
        }

        // Prompt
        const prompt = document.createElement('div');
        prompt.className = 'cr-prompt-text';
        prompt.innerHTML = '<i class="fas fa-arrow-left" class="cr-icon-mr"></i>Select a student from the sidebar to view their full profile';
        wrap.appendChild(prompt);
    }

    _renderPerformerList(container, title, students, icon, color) {
        const section = document.createElement('div');
        section.className = 'cr-section-mt';
        container.appendChild(section);

        const heading = document.createElement('div');
        heading.className = 'cr-section-title';
        heading.innerHTML = `<i class="${icon} cr-icon-mr" style="color: ${color};"></i>${title}`;
        section.appendChild(heading);

        students.forEach(s => {
            const row = document.createElement('div');
            row.className = 'as-hover-row cr-performer-row';
            row.addEventListener('click', () => this._drillToStudent(s));
            section.appendChild(row);

            const nameEl = document.createElement('span');
            nameEl.className = 'cr-performer-name as-truncate';
            nameEl.textContent = `${s.firstName} ${s.lastName}`.trim() || s.studentNumber;
            row.appendChild(nameEl);

            const numEl = document.createElement('span');
            numEl.className = 'cr-performer-number';
            numEl.textContent = s.studentNumber;
            row.appendChild(numEl);

            const badgeClass = s.status === 'pass' ? 'cr-mark-badge-pass' : 'cr-mark-badge-fail';
            const markEl = document.createElement('span');
            markEl.className = `cr-mark-badge ${badgeClass}`;
            markEl.textContent = `${this._r(s.mark)}%`;
            row.appendChild(markEl);
        });
    }

    _sortStudents() {
        const field = this._sortField;
        const asc = this._sortAsc;
        this._filteredStudents.sort((a, b) => {
            let va = a[field], vb = b[field];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return asc ? -1 : 1;
            if (va > vb) return asc ? 1 : -1;
            return 0;
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STUDENT PROFILE — Cascading panes (Registrations → Courses → Assessments)
    // ══════════════════════════════════════════════════════════════════════════

    async _drillToStudent(student) {
        this._currentView = 'student';
        this._selectedStudent = student;
        this._selectedCourse = null;
        this._selectedRegKey = null;
        this._selectedCourseKey = null;

        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-stage-scroll as-panel-inner';
        this._stageEl.appendChild(wrap);

        // Student header
        this._renderStudentHeader(wrap, student);

        // Loading
        const loadMsg = document.createElement('div');
        loadMsg.className = 'cr-loading-text';
        loadMsg.textContent = 'Loading student records...';
        wrap.appendChild(loadMsg);

        try {
            const [regData, courseData] = await Promise.all([
                this._apiCall('getProgrammeRegistrations', { studentNumber: student.studentNumber }),
                this._apiCall('getCourseResults', { studentNumber: student.studentNumber })
            ]);
            const registrations = this._parseResponse(regData) || [];
            const studentCourses = this._parseResponse(courseData) || [];

            loadMsg.remove();

            // Parse data into structured groups
            this._studentRegs = this._buildRegGroups(registrations, studentCourses);
            this._studentCourseItems = this._buildCourseItems(studentCourses);

            // Create the three panes
            this._renderCascadingPanes(wrap, student);
        } catch (err) {
            loadMsg.textContent = `Failed to load records: ${err.message}`;
            loadMsg.style.color = 'var(--ui-danger)';
        }
    }

    _renderStudentHeader(container, student) {
        const header = document.createElement('div');
        header.className = 'cr-profile-header';
        container.appendChild(header);

        const initials = ((student.firstName?.[0] || '') + (student.lastName?.[0] || '')).toUpperCase() || '?';
        const avatar = document.createElement('div');
        avatar.className = 'as-avatar as-avatar-lg';
        avatar.textContent = initials;
        header.appendChild(avatar);

        const info = document.createElement('div');
        info.className = 'cr-profile-info';
        const fullName = `${student.firstName} ${student.lastName}`.trim() || student.studentNumber;
        info.innerHTML = `
            <div class="cr-profile-name">${fullName}</div>
            <div class="cr-profile-id">${student.studentNumber}</div>
            <div class="cr-profile-email">${student.email || 'No email'}</div>
        `;
        header.appendChild(info);

        const markColor = student.status === 'pass' ? 'var(--ui-success)' : 'var(--ui-danger)';
        const markEl = document.createElement('div');
        markEl.className = 'cr-mark-lg';
        markEl.style.color = markColor;
        markEl.textContent = `${this._r(student.mark)}%`;
        header.appendChild(markEl);
    }

    // ── Data Parsing ─────────────────────────────────────────────────────────

    _buildRegGroups(registrations, studentCourses) {
        const groups = {};
        registrations.forEach(reg => {
            const progCode = reg.programmeCode || reg.programme_code || reg.qualification || '';
            const year = reg.year || reg.academicYear || this.year;
            const key = `${progCode}_${year}`;
            if (!groups[key]) {
                groups[key] = {
                    key, programmeCode: progCode, year,
                    label: reg.programmeLabel || reg.programme_label || progCode,
                    ayos: reg.ayos || reg.yearOfStudy || '',
                    courseCount: 0
                };
            }
        });

        // Count courses per year
        const coursesByYear = {};
        studentCourses.forEach(cr => {
            const yr = String(cr.year || this.year);
            if (!coursesByYear[yr]) coursesByYear[yr] = 0;
            coursesByYear[yr]++;
        });

        for (const group of Object.values(groups)) {
            group.courseCount = coursesByYear[String(group.year)] || 0;
        }

        // Add unmatched years as "Other" groups
        const regYears = new Set(Object.values(groups).map(g => String(g.year)));
        for (const [yr, count] of Object.entries(coursesByYear)) {
            if (!regYears.has(yr)) {
                const key = `_other_${yr}`;
                groups[key] = { key, programmeCode: 'Other', year: yr, label: 'Unmatched', ayos: '', courseCount: count };
            }
        }

        return Object.values(groups).sort((a, b) => Number(b.year) - Number(a.year));
    }

    _buildCourseItems(studentCourses) {
        return studentCourses.map(cr => {
            const cc = cr.courseCode || cr.course_code || cr.subjectCode || '';
            const yr = String(cr.year || this.year);
            const mark = parseFloat(cr.result || cr.mark || cr.finalMark || 0);
            return { courseCode: cc, year: yr, mark, key: `${cc}_${yr}` };
        }).filter(c => c.courseCode);
    }

    // ── Cascading Panes ──────────────────────────────────────────────────────

    _renderCascadingPanes(container, student) {
        // Registrations pane
        const regsTitle = document.createElement('div');
        regsTitle.className = 'cr-section-title';
        regsTitle.innerHTML = '<i class="fas fa-graduation-cap cr-icon-mr" style="color: var(--ui-primary);"></i>Programme Registrations';
        container.appendChild(regsTitle);

        this._regsPaneEl = document.createElement('div');
        this._regsPaneEl.className = 'cr-pane-flex';
        container.appendChild(this._regsPaneEl);

        // Courses pane
        const coursesTitle = document.createElement('div');
        coursesTitle.className = 'cr-section-title';
        coursesTitle.innerHTML = '<i class="fas fa-book cr-icon-mr" style="color: var(--ui-info);"></i>Courses';
        container.appendChild(coursesTitle);

        this._coursesPaneEl = document.createElement('div');
        this._coursesPaneEl.className = 'cr-pane-mb';
        container.appendChild(this._coursesPaneEl);

        // Assessments pane
        const assessTitle = document.createElement('div');
        assessTitle.className = 'cr-section-title';
        assessTitle.innerHTML = '<i class="fas fa-clipboard-check cr-icon-mr" style="color: var(--ui-secondary);"></i>Assessment Results';
        container.appendChild(assessTitle);

        this._assessPaneEl = document.createElement('div');
        container.appendChild(this._assessPaneEl);

        // Render initial state
        this._renderRegsPane();
        this._renderCoursesPane();
        this._renderAssessPane();
    }

    // ── Registrations Pane ───────────────────────────────────────────────────

    _renderRegsPane() {
        this._regsPaneEl.innerHTML = '';
        const regs = this._studentRegs;

        if (regs.length === 0) {
            this._regsPaneEl.innerHTML = '<div class="cr-hint-text">No registrations found.</div>';
            return;
        }

        // "All" chip
        const allChip = this._buildFilterChip('All', null, this._selectedRegKey === null);
        allChip.addEventListener('click', () => {
            this._selectedRegKey = null;
            this._selectedCourseKey = null;
            this._renderRegsPane();
            this._renderCoursesPane();
            this._renderAssessPane();
        });
        this._regsPaneEl.appendChild(allChip);

        regs.forEach(reg => {
            const label = `${reg.programmeCode} ${reg.year}${reg.ayos ? ' (Y' + reg.ayos + ')' : ''}`;
            const active = this._selectedRegKey === reg.key;
            const chip = this._buildFilterChip(label, `${reg.courseCount} courses`, active);
            chip.addEventListener('click', () => {
                this._selectedRegKey = active ? null : reg.key;
                this._selectedCourseKey = null;
                this._renderRegsPane();
                this._renderCoursesPane();
                this._renderAssessPane();
            });
            this._regsPaneEl.appendChild(chip);
        });
    }

    _buildFilterChip(label, sublabel, active) {
        const chip = document.createElement('div');
        chip.className = active ? 'cr-filter-chip cr-filter-chip-active' : 'cr-filter-chip';
        chip.textContent = label;
        if (sublabel) {
            const sub = document.createElement('span');
            sub.className = 'cr-filter-chip-sub';
            sub.textContent = sublabel;
            chip.appendChild(sub);
        }
        return chip;
    }

    // ── Courses Pane ─────────────────────────────────────────────────────────

    _renderCoursesPane() {
        this._coursesPaneEl.innerHTML = '';
        let courses = this._studentCourseItems;

        // Filter by selected registration year
        if (this._selectedRegKey) {
            const reg = this._studentRegs.find(r => r.key === this._selectedRegKey);
            if (reg) {
                courses = courses.filter(c => String(c.year) === String(reg.year));
            }
        }

        if (courses.length === 0) {
            this._coursesPaneEl.innerHTML = '<div class="cr-hint-text">No courses for this selection.</div>';
            return;
        }

        courses.forEach(item => {
            const active = this._selectedCourseKey === item.key;
            const row = document.createElement('div');
            row.className = active ? 'as-hover-row cr-course-row cr-course-row-active' : 'as-hover-row cr-course-row';
            this._coursesPaneEl.appendChild(row);

            const codeEl = document.createElement('span');
            codeEl.className = 'cr-course-code';
            codeEl.textContent = item.courseCode;
            row.appendChild(codeEl);

            const yearEl = document.createElement('span');
            yearEl.className = 'cr-course-year';
            yearEl.textContent = item.year;
            row.appendChild(yearEl);

            const spacer = document.createElement('span');
            spacer.className = 'as-flex-1';
            row.appendChild(spacer);

            const mark = item.mark;
            if (mark != null && !isNaN(mark)) {
                const badgeClass = item.status === 'pass' ? 'cr-mark-badge-pass' : 'cr-mark-badge-fail';
                const markEl = document.createElement('span');
                markEl.className = `cr-mark-badge ${badgeClass}`;
                markEl.textContent = `${this._r(mark)}%`;
                row.appendChild(markEl);
            }

            row.addEventListener('click', () => {
                const wasActive = this._selectedCourseKey === item.key;
                this._selectedCourseKey = wasActive ? null : item.key;
                this._renderCoursesPane();
                this._loadAndRenderAssessments(item.courseCode, item.year);
            });
        });
    }

    // ── Assessments Pane ─────────────────────────────────────────────────────

    _renderAssessPane() {
        this._assessPaneEl.innerHTML = '';
        if (!this._selectedCourseKey) {
            this._assessPaneEl.innerHTML = '<div class="cr-hint-text"><i class="fas fa-arrow-up" class="cr-icon-mr"></i>Select a course above to view assessments</div>';
            return;
        }
    }

    async _loadAndRenderAssessments(courseCode, year) {
        this._assessPaneEl.innerHTML = '';

        if (!this._selectedCourseKey) {
            this._renderAssessPane();
            return;
        }

        const student = this._selectedStudent;
        const loadMsg = document.createElement('div');
        loadMsg.className = 'cr-loading-text-sm';
        loadMsg.innerHTML = '<i class="fas fa-spinner fa-spin" class="cr-icon-mr"></i>Loading assessments...';
        this._assessPaneEl.appendChild(loadMsg);

        try {
            const cacheKey = `${courseCode}_${year}`;
            if (!this._assessmentCache[cacheKey]) {
                const data = await this._apiCall('getAssessmentResults', { courseCode, year });
                this._assessmentCache[cacheKey] = this._parseResponse(data) || [];
            }
            if (!this._courseResultsCache[cacheKey]) {
                const crData = await this._apiCall('getCourseResults', { courseCode, year });
                this._courseResultsCache[cacheKey] = this._parseResponse(crData) || [];
            }

            loadMsg.remove();
            const allAssessments = this._assessmentCache[cacheKey];
            const studentAssessments = allAssessments.filter(r => r.studentNumber === student.studentNumber);
            const courseResults = this._courseResultsCache[cacheKey];

            this._renderAssessmentTable(this._assessPaneEl, studentAssessments, allAssessments);
            this._renderDistributionChart(this._assessPaneEl, courseResults, student);

        } catch (err) {
            loadMsg.textContent = `Failed: ${err.message}`;
            loadMsg.style.color = 'var(--ui-danger)';
        }
    }

    _renderAssessmentTable(container, studentAssessments, allAssessments) {
        if (studentAssessments.length === 0) {
            container.innerHTML += '<div class="cr-hint-text">No assessment results found.</div>';
            return;
        }

        const assessByCode = {};
        allAssessments.forEach(row => {
            const code = row.assessmentCode || row.assessment_code || row.assessCode || '';
            const mark = parseFloat(row.result || row.mark || 0);
            if (!code || isNaN(mark)) return;
            if (!assessByCode[code]) assessByCode[code] = [];
            assessByCode[code].push(mark);
        });

        const table = document.createElement('table');
        table.className = 'as-an-data-table';
        table.innerHTML = `<thead><tr class="cr-thead-border">
            <th class="cr-an-cell">Assessment</th>
            <th class="cr-an-cell-right">Mark</th>
            <th class="cr-an-cell-right">Class Mean</th>
            <th class="cr-an-cell-right">z-Score</th>
        </tr></thead>`;

        const tbody = document.createElement('tbody');
        studentAssessments.forEach(row => {
            const code = row.assessmentCode || row.assessment_code || row.assessCode || '';
            const mark = parseFloat(row.result || row.mark || 0);
            const markColor = mark >= 75 ? 'var(--ui-success)' : mark >= this.passThreshold ? 'var(--ui-info)' : mark >= 40 ? 'var(--ui-warning)' : 'var(--ui-danger)';

            const classMarks = assessByCode[code] || [];
            const classMean = classMarks.length > 0 ? this._mean(classMarks) : null;
            const classSD = classMarks.length > 1 ? this._stdDev(classMarks) : null;
            const z = classMean !== null && classSD > 0 ? (mark - classMean) / classSD : null;
            const zColor = z !== null ? this._zCommentary(z).color : 'var(--ui-gray-400)';

            const tr = document.createElement('tr');
            tr.className = 'cr-tr-border';
            tr.innerHTML = `
                <td class="cr-td-name">${code}</td>
                <td class="cr-td-right" style="font-weight: 600; color: ${markColor};">${this._r(mark)}%</td>
                <td class="cr-td-right as-text-muted">${classMean !== null ? this._r(classMean) + '%' : '\u2014'}</td>
                <td class="cr-td-right" style="font-weight: 600; color: ${zColor};">${z !== null ? this._r(z) : '\u2014'}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    _renderDistributionChart(container, courseResults, student) {
        const allMarks = courseResults
            .map(r => parseFloat(r.result || r.mark || r.finalMark || 0))
            .filter(m => m > 0);

        if (allMarks.length < 2) return;

        const studentResult = courseResults.find(r => r.studentNumber === student.studentNumber);
        const studentMark = studentResult ? parseFloat(studentResult.result || studentResult.mark || studentResult.finalMark || 0) : student.mark;

        const chartDiv = document.createElement('div');
        chartDiv.className = 'cr-section-mt';
        container.appendChild(chartDiv);

        var shapes = [];
        if (studentMark > 0) {
            shapes.push({
                type: 'line', x0: studentMark, x1: studentMark, y0: 0, y1: 1, yref: 'paper',
                line: { color: 'var(--ui-primary-900)', width: 2.5, dash: 'dash' }
            });
        }
        shapes.push({
            type: 'line', x0: this.passThreshold, x1: this.passThreshold, y0: 0, y1: 1, yref: 'paper',
            line: { color: 'var(--ui-danger)', width: 1, dash: 'dot' }
        });

        var annotations = [];
        if (studentMark > 0) {
            annotations.push({
                x: studentMark, y: 1, yref: 'paper', xanchor: 'left',
                text: ' Student: ' + this._r(studentMark) + '%',
                showarrow: false, font: { size: 10, color: 'var(--ui-primary-900)' }
            });
        }

        Plotly.newPlot(chartDiv, [{
            x: allMarks,
            type: 'histogram',
            marker: { color: 'var(--ui-primary-200)', opacity: 0.75 },
            nbinsx: Math.min(15, Math.max(5, Math.ceil(Math.sqrt(allMarks.length))))
        }], {
            shapes: shapes,
            annotations: annotations,
            margin: { t: 15, r: 15, b: 35, l: 40 },
            height: 170,
            xaxis: { title: { text: 'Mark (%)', font: { size: 10 } } },
            yaxis: { title: { text: 'Count', font: { size: 10 } } },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { size: 10, color: 'var(--ui-gray-500)' }
        }, { displayModeBar: false, responsive: true });

        // KPI chips
        const classMean = this._mean(allMarks);
        const classSD = this._stdDev(allMarks);
        const overallZ = classSD > 0 ? (studentMark - classMean) / classSD : 0;
        const commentary = this._zCommentary(overallZ);

        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        container.appendChild(kpiRow);

        this._bindKPIs(kpiRow, [
            { code: 'classSize', value: String(allMarks.length), label: 'Class', icon: 'fas fa-users', color: 'var(--ui-primary)' },
            { code: 'classMean', value: `${this._r(classMean)}%`, label: 'Mean', icon: 'fas fa-chart-line', color: 'var(--ui-info)' },
            { code: 'studentMark', value: `${this._r(studentMark)}%`, label: 'Student', icon: 'fas fa-user', color: 'var(--ui-success)' },
            { code: 'zScore', value: `${this._r(overallZ)} (${commentary.text})`, label: 'z-Score', icon: 'fas fa-ruler-vertical', color: commentary.color }
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DATA LOADING
    // ══════════════════════════════════════════════════════════════════════════

    _showLoading(msg) {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'cv-p-lg';
        var el = document.createElement('div');
        el.className = 'as-loading-state';
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i><div class="as-loading-state-text">' + (msg || 'Loading...') + '</div><div class="cv-load-sub as-text-xs as-text-muted">Connecting</div>';
        this._stageEl.appendChild(el);
        this._loadingSubEl = el.querySelector('.cv-load-sub');
    }

    _updateLoadingStatus(text) {
        if (this._loadingSubEl && this._loadingSubEl.parentNode) this._loadingSubEl.textContent = text;
    }

    async _loadData(skipReadParams = false) {
        if (!skipReadParams) this._readParams();
        this._showLoading('Loading Student Roster...');

        try {
            this._setStatus('Authenticating...', 'warning');
            this._updateLoadingStatus('Authenticating...');
            await this._authenticate();
            this._setStatus('Connected', 'success');

            this._setStatus('Loading course results...', 'warning');
            this._updateLoadingStatus('Fetching course results...');
            const cacheKey = `${this.courseCode}_${this.year}`;
            const courseApiParams = { courseCode: this.courseCode, year: this.year };
            if (this._studentNumberFilter) courseApiParams.studentNumber = this._studentNumberFilter;
            const courseData = await this._apiCall('getCourseResults', courseApiParams);
            const courseResults = this._parseResponse(courseData);
            if (!courseResults || courseResults.length === 0) {
                throw new Error('No course results returned');
            }
            this._courseResultsCache[cacheKey] = courseResults;

            this._setStatus('Loading student data...', 'warning');
            this._updateLoadingStatus('Loading student data (' + courseResults.length + ' students)...');
            const studentNumbers = [...new Set(courseResults.map(r => r.studentNumber))];
            const bioIndex = await this._fetchBioData(studentNumbers);

            const students = courseResults.map(cr => {
                const sn = cr.studentNumber;
                const bio = bioIndex[sn] || {};
                const mark = parseFloat(cr.result || cr.mark || cr.finalMark || 0);
                const resultCode = (cr.resultCode || cr.result_code || '').toString().toUpperCase();
                const status = PassRateCalculator.classifyStudentResult(cr);
                return {
                    studentNumber: sn,
                    firstName: bio.firstName || bio.firstNames || '',
                    lastName: bio.lastName || bio.surname || bio.lastNames || '',
                    email: bio.email || '',
                    mark, resultCode, status
                };
            });

            students.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

            this._allStudents = students;
            this._filteredStudents = [...students];
            this._selectedStudent = null;
            this._selectedCourse = null;
            this._currentView = 'summary';

            this._setStatus('Done', 'success');
            this._buildAccordion(true);
            this._renderSummaryStage();

        } catch (err) {
            this._setStatus(`Error: ${err.message}`, 'danger');
            new uiAlert({
                color: 'danger',
                title: 'Roster Load Failed', message: err.message,
                parent: this._stageEl
            });
        }
    }

    _readParams() {
        this.courseCode = this._getInputValue(this._inputs.courseCode);
        this.year = parseInt(this._getInputValue(this._inputs.year), 10);
    }

    _getInputValue(inst) {
        const inputEl = inst.el ? (inst.el.querySelector('input') || inst.el) : inst;
        return inputEl.value;
    }

    // ── z-Score Commentary ───────────────────────────────────────────────────

    _zCommentary(z) {
        if (z <= -1.5) return { text: 'Unusually low', color: 'var(--ui-danger)', bg: 'var(--ui-danger-50)' };
        if (z <= -0.5) return { text: 'Below average', color: 'var(--ui-warning)', bg: 'var(--ui-warning-50)' };
        if (z <= 0.5)  return { text: 'Average', color: 'var(--ui-secondary)', bg: 'var(--ui-secondary-50)' };
        if (z <= 1.5)  return { text: 'Above average', color: 'var(--ui-info)', bg: 'var(--ui-info-50)' };
        return { text: 'Unusually high', color: 'var(--ui-success)', bg: 'var(--ui-success-50)' };
    }

    // ── API Methods ─────────────────────────────────────────────────────────

    async _authenticate() {
        if (window.AS_SESSION?.ready) {
            this.sessionId = window.AS_SESSION.sessionId;
            this.logToken = window.AS_SESSION.logToken;
            return;
        }
        const creds = window.AS_CREDENTIALS?.api?.sessionBypass || {};
        const data = await this._apiCall('logIn', { userId: creds.userId, pwd: creds.password });
        if (data && data.status !== false) {
            this.sessionId = data.sessionId || data.session_id;
            this.logToken = data.logToken || data.log_token;
            return;
        }
        throw new Error(data?.error || 'Authentication failed');
    }

    async _apiCall(action, params = {}) {
        const body = { action, ...params };
        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.logToken) body.logToken = this.logToken;

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
            throw new Error('Session expired');
        }
        return data;
    }

    // ── Response Parsing ────────────────────────────────────────────────────

    _parseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;

        if (data.fields && Array.isArray(data.data)) {
            return this._fieldsDataToRecords(data.fields, data.data);
        }
        if (data.results && data.results.fields && Array.isArray(data.results.data)) {
            return this._fieldsDataToRecords(data.results.fields, data.results.data);
        }
        if (Array.isArray(data.results)) return data.results;

        const wrapKeys = ['students', 'registrations', 'courseInfo', 'assessmentResults',
            'courseResults', 'studentBioData', 'courseMeta', 'courseCounts'];
        for (const key of wrapKeys) {
            if (data[key]) {
                const inner = data[key];
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data)) {
                    return this._fieldsDataToRecords(inner.fields, inner.data);
                }
            }
        }

        if (typeof data === 'object' && !Array.isArray(data)) return [data];
        return null;
    }

    _fieldsDataToRecords(fields, data) {
        const normalized = fields.map(f =>
            f === f.toUpperCase() && f.length > 1
                ? f.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())
                : f
        );
        return data.map(row => {
            const record = {};
            normalized.forEach((field, i) => { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }

    // ── Bio Data Fetching ───────────────────────────────────────────────────

    async _fetchBioData(studentNumbers) {
        const index = {};
        const batchSize = 20;
        for (let i = 0; i < studentNumbers.length; i += batchSize) {
            const batch = studentNumbers.slice(i, i + batchSize);
            const promises = batch.map(sn =>
                this._apiCall('getStudentBioData', { studentNumber: sn })
                    .then(d => {
                        const records = this._parseResponse(d);
                        if (records && records.length > 0) index[sn] = records[0];
                    })
                    .catch(() => {})
            );
            await Promise.all(promises);
        }
        return index;
    }

    // ── Math Helpers ────────────────────────────────────────────────────────

    _mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    _stdDev(arr) {
        if (arr.length < 2) return 0;
        const mean = this._mean(arr);
        return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length);
    }

    _r(v) { return Math.round(v * 10) / 10; }

    // ── Status Badge ────────────────────────────────────────────────────────

    _setStatus(label, color) {
        if (this._statusBadge) this._statusBadge.update({ label, color });
    }

    // ── UIBinding Methods ────────────────────────────────────────────────────

    _bindKPIs(container, stats) {
        var miniPublome = new Publome({
            tables: [{ name: 'metric', columns: {
                idx: { type: 'number', primaryKey: true },
                code: { type: 'string' },
                value: { type: 'string' },
                label: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' }
            }}]
        });
        stats.forEach(function(s, i) {
            miniPublome.table('metric').create({ idx: i + 1, code: s.code || s.label, value: String(s.value), label: s.label, icon: s.icon, color: s.color });
        });

        var self = this;
        stats.forEach(function(s) {
            var el = document.createElement('div');
            container.appendChild(el);
            var binding = new UIBinding(miniPublome.table('metric'), { publome: miniPublome });
            binding.bindMetric(el, {
                compute: function(records) {
                    var r = records.find(function(rec) { return rec.get('code') === (s.code || s.label); });
                    return r ? r.get('value') : '\u2014';
                },
                label: s.label,
                icon: s.icon || '',
                color: s.color || 'var(--ui-primary)'
            });
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassRosterPanel;
}
if (typeof window !== 'undefined') {
    window.ClassRosterPanel = ClassRosterPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('ClassRosterPanel', ClassRosterPanel);
}
