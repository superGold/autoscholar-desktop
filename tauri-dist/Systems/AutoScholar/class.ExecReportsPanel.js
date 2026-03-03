/**
 * ExecReportsPanel — Downloadable Assessment Reports
 *
 * Generates hierarchical assessment reports (institution → faculty → programme → course)
 * with progress feedback for API-intensive operations and Excel export.
 *
 * Report types:
 *   1. Institution Summary — single row, all key metrics
 *   2. Faculty Breakdown — one row per faculty
 *   3. Programme Breakdown — all programmes grouped by faculty
 *   4. Course Report — per-course stats grouped by faculty → programme
 *
 * Data sources:
 *   - Default filters (Final/Completed): engine.getKPIs / getChildrenSummary (instant, from Publome)
 *   - Non-default filters (TM_1, etc.): loader.getCourseStats per programme (API calls with progress)
 */
class ExecReportsPanel {

    static REPORT_TYPES = [
        { value: 'institution', label: 'Institution Summary', icon: 'fa-university' },
        { value: 'faculty',     label: 'Faculty Breakdown',   icon: 'fa-building' },
        { value: 'programme',   label: 'Programme Breakdown', icon: 'fa-graduation-cap' },
        { value: 'course',      label: 'Course Report',       icon: 'fa-book' }
    ];

    static ASSESSMENT_TYPES = [
        { value: 'final',  label: 'Final Mark' },
        { value: 'TM_1',   label: 'TM 1' },
        { value: 'TM_2',   label: 'TM 2' },
        { value: 'TM_3',   label: 'TM 3' },
        { value: 'FINAL',  label: 'Final Exam' },
        { value: 'PRAC',   label: 'Practical' },
        { value: 'PROJ',   label: 'Project' }
    ];

    static DENOMINATOR_OPTIONS = [
        { value: 'completed',  label: 'Completed' },
        { value: 'registered', label: 'Registered' }
    ];

    constructor(config = {}) {
        this.publome = config.publome;
        this.engine  = config.engine;
        this.year    = config.year || 2025;
        this.loader  = config.loader || null;
        this.bridge  = config.bridge || null;

        this._container = null;
        this._controlEl = null;
        this._stageEl = null;
        this._entityIdx = null;
        this._generating = false;
        this._cancelled = false;
    }

    connectBus(bus) {
        this._bus = bus;
        bus.on('entity:selected', (data) => {
            this._entityIdx = data.idx;
        });
        bus.on('year:changed', (data) => {
            this.year = data.year;
        });
        return this;
    }

    render(container) {
        this._container = container;
        this._entityIdx = this._entityIdx || this._getInstitutionIdx();
        this._buildLayout();
    }

    // ── Layout ──────────────────────────────────────────────────────

    _buildLayout() {
        this._container.innerHTML = '';

        const cs = new uiControlStage({
            controlSize: 'md',
            template: 'unified',
            parent: this._container
        });

        this._controlEl = cs.getControlPanel();
        this._stageEl = cs.getStage();

        this._renderControl();
        this._renderEmptyStage();
    }

    // ── Control Panel ───────────────────────────────────────────────

    _renderControl() {
        const el = this._controlEl;
        el.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'ui-control-stage-header';
        header.innerHTML = '<i class="fas fa-file-alt"></i>Assessment Reports';
        el.appendChild(header);

        // Report type selector
        this._reportTypeEl = this._buildSelect(el, 'Report Type', ExecReportsPanel.REPORT_TYPES);

        // Assessment type selector
        this._assessTypeEl = this._buildSelect(el, 'Assessment Type', ExecReportsPanel.ASSESSMENT_TYPES);

        // Denominator selector
        this._denomEl = this._buildSelect(el, 'Denominator', ExecReportsPanel.DENOMINATOR_OPTIONS);

        // Generate button
        const btnWrap = document.createElement('div');
        btnWrap.className = 'ex-mt-xl';
        const btn = document.createElement('button');
        btn.className = 'ui-btn ui-btn-primary ex-full-width';
        btn.innerHTML = '<i class="fas fa-play"></i> Generate Report';
        btn.addEventListener('click', () => this._onGenerate());
        btnWrap.appendChild(btn);
        el.appendChild(btnWrap);
        this._generateBtn = btn;

        // Progress area (hidden initially)
        this._progressWrap = document.createElement('div');
        this._progressWrap.className = 'ex-mt-lg';
        this._progressWrap.style.display = 'none';
        el.appendChild(this._progressWrap);

        // Info note
        const info = document.createElement('div');
        info.className = 'ex-ctrl-info';
        info.innerHTML = '<i class="fas fa-info-circle" style="margin-right:0.25rem;"></i>' +
            'Institutional "departments" correspond to faculties in this system. ' +
            'Course reports require API calls per programme and may take a moment.';
        el.appendChild(info);
    }

    _buildSelect(parent, label, options) {
        const wrap = document.createElement('div');
        wrap.className = 'ex-ctrl-select-wrap';

        const lbl = document.createElement('div');
        lbl.className = 'ex-ctrl-select-label';
        lbl.textContent = label;
        wrap.appendChild(lbl);

        const sel = document.createElement('select');
        sel.className = 'ui-input ex-full-width as-text-sm';
        for (const opt of options) {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            sel.appendChild(o);
        }
        wrap.appendChild(sel);
        parent.appendChild(wrap);
        return sel;
    }

    // ── Progress Feedback ───────────────────────────────────────────

    _showProgress(stepLabel, current, total) {
        this._progressWrap.style.display = 'block';
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        const elapsed = this._startTime ? Math.round((Date.now() - this._startTime) / 1000) : 0;

        this._progressWrap.innerHTML =
            `<div class="ex-entity-detail ex-mb-sm">${stepLabel} (${current}/${total})</div>` +
            `<div class="ex-progress ex-progress-lg ex-mb-sm">` +
                `<div class="ex-progress-fill" style="width:${pct}%;background:var(--ex-clr-primary);"></div>` +
            `</div>` +
            `<div class="ex-row-between ex-meta-text">` +
                `<span>${pct}%</span>` +
                `<span>${elapsed}s elapsed</span>` +
            `</div>`;
    }

    _hideProgress() {
        this._progressWrap.style.display = 'none';
        this._progressWrap.innerHTML = '';
    }

    // ── Generate ────────────────────────────────────────────────────

    async _onGenerate() {
        if (this._generating) {
            this._cancelled = true;
            return;
        }

        const instIdx = this._getInstitutionIdx();
        if (!instIdx) {
            uiToast.show({ message: 'No institution data loaded', color: 'warning' });
            return;
        }

        const reportType = this._reportTypeEl.value;
        const markType = this._assessTypeEl.value;
        const denominator = this._denomEl.value;

        this._generating = true;
        this._cancelled = false;
        this._startTime = Date.now();
        this._generateBtn.innerHTML = '<i class="fas fa-stop"></i> Cancel';
        this._generateBtn.classList.replace('ui-btn-primary', 'ui-btn-danger');

        try {
            const data = await this._fetchReportData(reportType, markType, denominator, instIdx);
            if (this._cancelled) return;
            this._renderReport(reportType, markType, denominator, data, instIdx);
        } catch (err) {
            if (!this._cancelled) {
                uiToast.show({ message: 'Report generation failed: ' + err.message, color: 'danger' });
                console.error('Report generation error:', err);
            }
        } finally {
            this._generating = false;
            this._cancelled = false;
            this._generateBtn.innerHTML = '<i class="fas fa-play"></i> Generate Report';
            this._generateBtn.classList.replace('ui-btn-danger', 'ui-btn-primary');
            this._hideProgress();
        }
    }

    // ── Data Fetching ───────────────────────────────────────────────

    async _fetchReportData(reportType, markType, denominator, instIdx) {
        const isDefault = markType === 'final' && denominator === 'completed';
        const opts = { markType, denominator };

        switch (reportType) {
            case 'institution':
                return this._fetchInstitution(instIdx, isDefault);

            case 'faculty':
                return isDefault
                    ? this._fetchFacultyFast(instIdx)
                    : this._fetchFacultyFiltered(instIdx, opts);

            case 'programme':
                return isDefault
                    ? this._fetchProgrammeFast(instIdx)
                    : this._fetchProgrammeFiltered(instIdx, opts);

            case 'course':
                return this._fetchCourse(instIdx, opts);

            default:
                throw new Error('Unknown report type: ' + reportType);
        }
    }

    // ── Institution (always fast) ───────────────────────────────────

    _fetchInstitution(instIdx) {
        const kpis = this.engine.getKPIs(instIdx, this.year);
        const entity = kpis._entity || {};
        return {
            institution: {
                name: entity.name || 'Institution',
                code: entity.code || '',
                students: entity.students || 0,
                passRate: kpis['course-pass-rate']?.value,
                mean: kpis['course-mean']?.value,
                gradRate: kpis['graduation-rate']?.value,
                retentionRate: kpis['retention-rate']?.value,
                dropoutRate: kpis['dropout-rate']?.value
            }
        };
    }

    // ── Faculty (fast path from Publome) ─────────────────────────────

    _fetchFacultyFast(instIdx) {
        const rows = this.engine.getChildrenSummary(instIdx, this.year);
        return {
            faculties: rows.map(r => ({
                name: r.name, code: r.code, students: r.students,
                passRate: r['course-pass-rate'], mean: r['course-mean'],
                gradRate: r['graduation-rate'], retentionRate: r['retention-rate']
            }))
        };
    }

    // ── Faculty (filtered: aggregate per-programme API calls) ────────

    async _fetchFacultyFiltered(instIdx, opts) {
        const faculties = this.engine.getChildren(instIdx);
        const results = [];
        let step = 0;

        for (const fac of faculties) {
            if (this._cancelled) return { faculties: results };
            step++;
            const facName = fac.get('name');
            this._showProgress('Fetching ' + facName, step, faculties.length);

            const programmes = this.engine.getChildren(fac.get('idx'));
            let totalStudents = 0, passSum = 0, passDenom = 0, meanSum = 0, meanDenom = 0;

            for (const prog of programmes) {
                if (this._cancelled) return { faculties: results };
                const courseStats = await this.loader.getCourseStats(prog.get('code'), this.year, opts);
                for (const c of courseStats) {
                    totalStudents += c.students || 0;
                    if (c.passRate != null) { passSum += c.passRate * c.students; passDenom += c.students; }
                    if (c.mean != null) { meanSum += c.mean * c.students; meanDenom += c.students; }
                }
            }

            results.push({
                name: facName, code: fac.get('code'),
                students: totalStudents,
                passRate: passDenom > 0 ? Math.round((passSum / passDenom) * 10) / 10 : null,
                mean: meanDenom > 0 ? Math.round((meanSum / meanDenom) * 10) / 10 : null
            });
        }

        return { faculties: results };
    }

    // ── Programme (fast path from Publome) ───────────────────────────

    _fetchProgrammeFast(instIdx) {
        const faculties = this.engine.getChildren(instIdx);
        const programmes = [];

        for (const fac of faculties) {
            const children = this.engine.getChildrenSummary(fac.get('idx'), this.year);
            for (const r of children) {
                programmes.push({
                    faculty: fac.get('name'), facultyCode: fac.get('code'),
                    name: r.name, code: r.code, students: r.students,
                    passRate: r['course-pass-rate'], mean: r['course-mean'],
                    gradRate: r['graduation-rate']
                });
            }
        }

        return { programmes };
    }

    // ── Programme (filtered: API per programme) ──────────────────────

    async _fetchProgrammeFiltered(instIdx, opts) {
        const faculties = this.engine.getChildren(instIdx);
        const programmes = [];
        const allProgs = [];

        for (const fac of faculties) {
            const children = this.engine.getChildren(fac.get('idx'));
            for (const p of children) {
                allProgs.push({ fac, prog: p });
            }
        }

        let step = 0;
        for (const { fac, prog } of allProgs) {
            if (this._cancelled) return { programmes };
            step++;
            this._showProgress('Fetching ' + prog.get('name'), step, allProgs.length);

            const courseStats = await this.loader.getCourseStats(prog.get('code'), this.year, opts);
            let totalStudents = 0, passSum = 0, passDenom = 0, meanSum = 0, meanDenom = 0;

            for (const c of courseStats) {
                totalStudents += c.students || 0;
                if (c.passRate != null) { passSum += c.passRate * c.students; passDenom += c.students; }
                if (c.mean != null) { meanSum += c.mean * c.students; meanDenom += c.students; }
            }

            programmes.push({
                faculty: fac.get('name'), facultyCode: fac.get('code'),
                name: prog.get('name'), code: prog.get('code'),
                students: totalStudents,
                passRate: passDenom > 0 ? Math.round((passSum / passDenom) * 10) / 10 : null,
                mean: meanDenom > 0 ? Math.round((meanSum / meanDenom) * 10) / 10 : null
            });
        }

        return { programmes };
    }

    // ── Course (always API) ─────────────────────────────────────────

    async _fetchCourse(instIdx, opts) {
        const faculties = this.engine.getChildren(instIdx);
        const courses = [];
        const allProgs = [];

        for (const fac of faculties) {
            const children = this.engine.getChildren(fac.get('idx'));
            for (const p of children) {
                allProgs.push({ fac, prog: p });
            }
        }

        let step = 0;
        for (const { fac, prog } of allProgs) {
            if (this._cancelled) return { courses };
            step++;
            this._showProgress('Fetching ' + prog.get('name'), step, allProgs.length);

            const courseStats = await this.loader.getCourseStats(prog.get('code'), this.year, opts);
            for (const c of courseStats) {
                courses.push({
                    faculty: fac.get('name'), facultyCode: fac.get('code'),
                    programme: prog.get('name'), programmeCode: prog.get('code'),
                    courseCode: c.courseCode, courseLabel: c.courseLabel,
                    students: c.students, passRate: c.passRate, mean: c.mean
                });
            }
        }

        return { courses };
    }

    // ── Report Rendering ────────────────────────────────────────────

    _renderReport(reportType, markType, denominator, data, instIdx) {
        const stage = this._stageEl;
        stage.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        // Report header
        const instName = this._getInstitutionName(instIdx);
        const assessLabel = ExecReportsPanel.ASSESSMENT_TYPES.find(a => a.value === markType)?.label || markType;
        const denomLabel = ExecReportsPanel.DENOMINATOR_OPTIONS.find(d => d.value === denominator)?.label || denominator;
        const typeLabel = ExecReportsPanel.REPORT_TYPES.find(r => r.value === reportType)?.label || reportType;
        const elapsed = this._startTime ? Math.round((Date.now() - this._startTime) / 1000) : 0;

        wrapper.innerHTML =
            `<div class="ex-mb-xl">` +
                `<h3 class="ex-view-title ex-mb-sm" style="margin-top:0;">` +
                    `<i class="fas fa-file-alt"></i>${typeLabel} — ${instName} (${this.year})` +
                `</h3>` +
                `<div class="ex-report-header-meta">` +
                    `<span><i class="fas fa-chart-bar"></i>${assessLabel}</span>` +
                    `<span><i class="fas fa-users"></i>${denomLabel}</span>` +
                    `<span><i class="fas fa-clock"></i>Generated in ${elapsed}s</span>` +
                    `<span><i class="fas fa-calendar"></i>${new Date().toLocaleDateString()}</span>` +
                `</div>` +
            `</div>`;

        stage.appendChild(wrapper);

        // Store report context for export
        this._lastReport = { reportType, markType, denominator, data, instName, assessLabel, denomLabel, typeLabel };

        // Render table(s)
        switch (reportType) {
            case 'institution':
                this._renderInstitutionTable(wrapper, data);
                break;
            case 'faculty':
                this._renderFacultyTable(wrapper, data);
                break;
            case 'programme':
                this._renderProgrammeTable(wrapper, data);
                break;
            case 'course':
                this._renderCourseTable(wrapper, data);
                break;
        }

        // Export button
        this._renderExportButton(wrapper);
    }

    _renderInstitutionTable(wrapper, data) {
        const inst = data.institution;
        const tableWrap = document.createElement('div');
        wrapper.appendChild(tableWrap);

        new uiTable({
            template: 'compact',
            paging: false, searching: false, info: false,
            columns: [
                { key: 'name', label: 'Institution' },
                { key: 'students', label: 'Students' },
                { key: 'passRate', label: 'Pass Rate', render: (d, t) => this._renderPct(d, t, 'pass') },
                { key: 'mean', label: 'Mean', render: (d, t) => this._renderPct(d, t, 'mean') },
                { key: 'gradRate', label: 'Graduation Rate', render: (d, t) => this._renderPct(d, t, 'pass') },
                { key: 'retentionRate', label: 'Retention Rate', render: (d, t) => this._renderPct(d, t, 'pass') },
                { key: 'dropoutRate', label: 'Dropout Rate', render: (d, t) => {
                    if (t !== 'display') return d != null ? d : -1;
                    if (d == null) return '—';
                    const color = d <= 15 ? 'var(--ex-clr-success)' : d <= 25 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
                    return `<span style="font-weight:600;color:${color};">${Math.round(d * 10) / 10}%</span>`;
                }}
            ],
            data: [inst],
            parent: tableWrap
        });
    }

    _renderFacultyTable(wrapper, data) {
        const rows = data.faculties || [];
        if (rows.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><i class="fas fa-inbox"></i><div class="ex-empty-msg">No faculty data available</div></div>';
            return;
        }

        const tableWrap = document.createElement('div');
        wrapper.appendChild(tableWrap);

        const columns = [
            { key: 'name', label: 'Faculty' },
            { key: 'students', label: 'Students' },
            { key: 'passRate', label: 'Pass Rate', render: (d, t) => this._renderPct(d, t, 'pass') },
            { key: 'mean', label: 'Mean', render: (d, t) => this._renderPct(d, t, 'mean') }
        ];

        // Add extra columns if available (fast path has more data)
        if (rows[0]?.gradRate !== undefined) {
            columns.push({ key: 'gradRate', label: 'Graduation', render: (d, t) => this._renderPct(d, t, 'pass') });
            columns.push({ key: 'retentionRate', label: 'Retention', render: (d, t) => this._renderPct(d, t, 'pass') });
        }

        new uiTable({
            template: 'compact',
            paging: rows.length > 25, pageLength: 25,
            searching: rows.length > 10, info: rows.length > 25,
            columns, data: rows,
            parent: tableWrap
        });
    }

    _renderProgrammeTable(wrapper, data) {
        const rows = data.programmes || [];
        if (rows.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><i class="fas fa-inbox"></i><div class="ex-empty-msg">No programme data available</div></div>';
            return;
        }

        const tableWrap = document.createElement('div');
        wrapper.appendChild(tableWrap);

        const columns = [
            { key: 'faculty', label: 'Faculty' },
            { key: 'name', label: 'Programme' },
            { key: 'code', label: 'Code' },
            { key: 'students', label: 'Students' },
            { key: 'passRate', label: 'Pass Rate', render: (d, t) => this._renderPct(d, t, 'pass') },
            { key: 'mean', label: 'Mean', render: (d, t) => this._renderPct(d, t, 'mean') }
        ];

        if (rows[0]?.gradRate !== undefined) {
            columns.push({ key: 'gradRate', label: 'Graduation', render: (d, t) => this._renderPct(d, t, 'pass') });
        }

        new uiTable({
            template: 'compact',
            paging: rows.length > 25, pageLength: 25,
            searching: rows.length > 10, info: rows.length > 25,
            columns, data: rows,
            parent: tableWrap
        });
    }

    _renderCourseTable(wrapper, data) {
        const rows = data.courses || [];
        if (rows.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><i class="fas fa-inbox"></i><div class="ex-empty-msg">No course data available</div></div>';
            return;
        }

        // Summary line
        const summary = document.createElement('div');
        summary.className = 'ex-summary-line';
        summary.textContent = `${rows.length} courses across ${new Set(rows.map(r => r.programmeCode)).size} programmes`;
        wrapper.appendChild(summary);

        const tableWrap = document.createElement('div');
        wrapper.appendChild(tableWrap);

        new uiTable({
            template: 'compact',
            paging: rows.length > 50, pageLength: 50,
            searching: true, info: rows.length > 50,
            columns: [
                { key: 'faculty', label: 'Faculty' },
                { key: 'programme', label: 'Programme' },
                { key: 'courseCode', label: 'Code' },
                { key: 'courseLabel', label: 'Course' },
                { key: 'students', label: 'Students' },
                { key: 'passRate', label: 'Pass Rate', render: (d, t) => this._renderPct(d, t, 'pass') },
                { key: 'mean', label: 'Mean', render: (d, t) => this._renderPct(d, t, 'mean') }
            ],
            data: rows,
            parent: tableWrap
        });
    }

    // ── Cell Renderer ───────────────────────────────────────────────

    _renderPct(d, type, mode) {
        if (type !== 'display') return d != null ? d : -1;
        if (d == null) return '—';
        const val = Math.round(d * 10) / 10;
        const cls = this._heatmapClass(val, mode);
        const color = this._valColor(val, mode === 'mean' ? 60 : 70, mode === 'mean' ? 50 : 60);
        return `<span class="${cls}" style="padding:0.1rem 0.3rem;border-radius:2px;font-weight:600;color:${color};">${val}%</span>`;
    }

    _valColor(val, good, ok) { return ExecMetrics.valColor(val, good, ok); }
    _heatmapClass(value, type) { return ExecMetrics.heatmapClass(value, type); }

    // ── Export ───────────────────────────────────────────────────────

    _renderExportButton(wrapper) {
        const btnRow = document.createElement('div');
        btnRow.className = 'ex-row ex-mt-xl as-gap-half';

        const btn = document.createElement('button');
        btn.className = 'ui-btn ui-btn-primary ui-btn-sm';
        btn.innerHTML = '<i class="fas fa-file-excel"></i> Export Excel';
        btn.addEventListener('click', () => this._exportExcel());
        btnRow.appendChild(btn);

        wrapper.appendChild(btnRow);
    }

    _exportExcel() {
        if (typeof XLSX === 'undefined') {
            uiToast.show({ message: 'SheetJS library not loaded', color: 'danger' });
            return;
        }

        const r = this._lastReport;
        if (!r) {
            uiToast.show({ message: 'No report to export', color: 'warning' });
            return;
        }

        const wb = XLSX.utils.book_new();

        // Sheet 1: Report Info
        const infoRows = [
            ['Assessment Report'],
            [''],
            ['Institution', r.instName],
            ['Year', this.year],
            ['Report Type', r.typeLabel],
            ['Assessment Type', r.assessLabel],
            ['Denominator', r.denomLabel],
            ['Generated', new Date().toLocaleString()]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoRows), 'Report Info');

        // Sheet 2: Institution Summary (always present)
        const instData = this._getInstitutionExportData(r);
        if (instData.length > 1) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instData), 'Institution Summary');
        }

        // Sheet 3: Faculty Breakdown
        if (r.reportType !== 'institution') {
            const facData = this._getFacultyExportData(r);
            if (facData.length > 1) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(facData), 'Faculty Breakdown');
            }
        }

        // Sheet 4: Programme Breakdown
        if (r.reportType === 'programme' || r.reportType === 'course') {
            const progData = this._getProgrammeExportData(r);
            if (progData.length > 1) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(progData), 'Programme Breakdown');
            }
        }

        // Sheet 5: Course Detail
        if (r.reportType === 'course') {
            const courseData = this._getCourseExportData(r);
            if (courseData.length > 1) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(courseData), 'Course Detail');
            }
        }

        const safeInst = (r.instName || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
        const typeTag = r.reportType.charAt(0).toUpperCase() + r.reportType.slice(1);
        const filename = `Assessment_Report_${safeInst}_${this.year}_${typeTag}.xlsx`;

        XLSX.writeFile(wb, filename);
        uiToast.show({ message: 'Excel workbook exported', color: 'success' });
    }

    _getInstitutionExportData(r) {
        // Always build institution row from engine
        const instIdx = this._getInstitutionIdx();
        const kpis = this.engine.getKPIs(instIdx, this.year);
        const entity = kpis._entity || {};

        const headers = ['Institution', 'Students', 'Pass Rate', 'Mean', 'Graduation Rate', 'Retention Rate', 'Dropout Rate'];
        const row = [
            entity.name || r.instName,
            entity.students || 0,
            kpis['course-pass-rate']?.value ?? '',
            kpis['course-mean']?.value ?? '',
            kpis['graduation-rate']?.value ?? '',
            kpis['retention-rate']?.value ?? '',
            kpis['dropout-rate']?.value ?? ''
        ];
        return [headers, row];
    }

    _getFacultyExportData(r) {
        const headers = ['Faculty', 'Students', 'Pass Rate', 'Mean'];
        let rows;

        if (r.data.faculties) {
            rows = r.data.faculties.map(f => [f.name, f.students, f.passRate ?? '', f.mean ?? '']);
        } else {
            // Derive from programmes
            const facMap = {};
            const progs = r.data.programmes || r.data.courses || [];
            for (const p of progs) {
                const key = p.faculty || p.facultyCode;
                if (!key) continue;
                if (!facMap[key]) facMap[key] = { name: key, students: 0, passSum: 0, passDenom: 0, meanSum: 0, meanDenom: 0 };
                const fm = facMap[key];
                fm.students += p.students || 0;
                if (p.passRate != null) { fm.passSum += p.passRate * p.students; fm.passDenom += p.students; }
                if (p.mean != null) { fm.meanSum += p.mean * p.students; fm.meanDenom += p.students; }
            }
            rows = Object.values(facMap).map(f => [
                f.name, f.students,
                f.passDenom > 0 ? Math.round((f.passSum / f.passDenom) * 10) / 10 : '',
                f.meanDenom > 0 ? Math.round((f.meanSum / f.meanDenom) * 10) / 10 : ''
            ]);
        }

        return [headers, ...rows];
    }

    _getProgrammeExportData(r) {
        const headers = ['Faculty', 'Programme', 'Code', 'Students', 'Pass Rate', 'Mean'];
        let rows;

        if (r.data.programmes) {
            rows = r.data.programmes.map(p => [p.faculty, p.name, p.code, p.students, p.passRate ?? '', p.mean ?? '']);
        } else if (r.data.courses) {
            // Aggregate from courses
            const progMap = {};
            for (const c of r.data.courses) {
                const key = c.programmeCode;
                if (!progMap[key]) {
                    progMap[key] = { faculty: c.faculty, name: c.programme, code: c.programmeCode, students: 0, passSum: 0, passDenom: 0, meanSum: 0, meanDenom: 0 };
                }
                const pm = progMap[key];
                pm.students += c.students || 0;
                if (c.passRate != null) { pm.passSum += c.passRate * c.students; pm.passDenom += c.students; }
                if (c.mean != null) { pm.meanSum += c.mean * c.students; pm.meanDenom += c.students; }
            }
            rows = Object.values(progMap).map(p => [
                p.faculty, p.name, p.code, p.students,
                p.passDenom > 0 ? Math.round((p.passSum / p.passDenom) * 10) / 10 : '',
                p.meanDenom > 0 ? Math.round((p.meanSum / p.meanDenom) * 10) / 10 : ''
            ]);
        } else {
            rows = [];
        }

        return [headers, ...rows];
    }

    _getCourseExportData(r) {
        const headers = ['Faculty', 'Programme', 'Course Code', 'Course Name', 'Students', 'Pass Rate', 'Mean'];
        const rows = (r.data.courses || []).map(c => [
            c.faculty, c.programme, c.courseCode, c.courseLabel,
            c.students, c.passRate ?? '', c.mean ?? ''
        ]);
        return [headers, ...rows];
    }

    // ── Empty State ─────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML =
            '<div class="ex-empty">' +
                '<i class="fas fa-file-alt"></i>' +
                '<div class="ex-empty-msg">Select a report type and click Generate</div>' +
                '<div style="font-size:var(--ui-text-2xs,0.6rem);color:var(--ui-gray-400);margin-top:0.3rem;">' +
                    'Reports can be exported to Excel for distribution' +
                '</div>' +
            '</div>';
    }

    // ── Helpers ─────────────────────────────────────────────────────

    _getInstitutionIdx() {
        const entityTable = this.publome.table('entity');
        const inst = entityTable.all().find(e => e.get('type') === 'institution');
        return inst ? inst.get('idx') : null;
    }

    _getInstitutionName(instIdx) {
        const entity = this.publome.table('entity').read(instIdx);
        return entity ? entity.get('name') : 'Institution';
    }
}
