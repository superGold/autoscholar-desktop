/**
 * MyResultsPanel - Academic record, marks & GPA tracking
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Self-contained demo data — course results, per-assessment detail, GPA calculation.
 *
 * Usage:
 *   const panel = new MyResultsPanel();
 *   panel.render(controlEl, stageEl);
 */
class MyResultsPanel {

    // ── Static Data ─────────────────────────────────────────────────────────

    static DEMO_STUDENTS = [
        { id: '220101', name: 'Thabo', surname: 'Mokoena' },
        { id: '220102', name: 'Naledi', surname: 'Dlamini' },
        { id: '220103', name: 'Sipho', surname: 'Nkosi' },
        { id: '220104', name: 'Zanele', surname: 'Khumalo' },
        { id: '220105', name: 'Bongani', surname: 'Mthembu' },
        { id: '220106', name: 'Lindiwe', surname: 'Ngcobo' },
        { id: '220107', name: 'Mandla', surname: 'Zulu' },
        { id: '220108', name: 'Ayanda', surname: 'Mkhize' },
        { id: '220109', name: 'Nomvula', surname: 'Sithole' },
        { id: '220110', name: 'Sibusiso', surname: 'Ndlovu' },
        { id: '220111', name: 'Palesa', surname: 'Mahlangu' },
        { id: '220112', name: 'Kagiso', surname: 'Molefe' },
        { id: '220113', name: 'Dineo', surname: 'Maseko' },
        { id: '220114', name: 'Tshiamo', surname: 'Botha' },
        { id: '220115', name: 'Lerato', surname: 'Pretorius' },
        { id: '220116', name: 'Mpho', surname: 'Van der Merwe' },
        { id: '220117', name: 'Nompilo', surname: 'Shabalala' },
        { id: '220118', name: 'Lethabo', surname: 'Joubert' },
        { id: '220119', name: 'Keabetswe', surname: 'Tshabalala' },
        { id: '220120', name: 'Thandeka', surname: 'Radebe' },
        { id: '220121', name: 'Amahle', surname: 'Mbeki' },
        { id: '220122', name: 'Siyabonga', surname: 'Vilakazi' },
        { id: '220123', name: 'Nokuthula', surname: 'Cele' },
        { id: '220124', name: 'Lwazi', surname: 'Phiri' },
        { id: '220125', name: 'Busisiwe', surname: 'Ntuli' },
        { id: '220126', name: 'Thulani', surname: 'Mabaso' },
        { id: '220127', name: 'Refilwe', surname: 'Motaung' },
        { id: '220128', name: 'Andile', surname: 'Govender' }
    ];

    static DEMO_RESULTS = [
        // Year 2 — S1 2026 (in progress)
        { code: 'ITSD201', name: 'Software Development 2', credits: 20, year: 2026, semester: 'S1', mark: 67, status: 'In Progress',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 15, mark: 72 }, { code: 'A1', name: 'Assignment 1', weight: 10, mark: 65 }, { code: 'A2', name: 'Assignment 2', weight: 10, mark: 78 }] },
        { code: 'ITDA201', name: 'Data Structures', credits: 20, year: 2026, semester: 'S1', mark: 58, status: 'In Progress',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 20, mark: 55 }, { code: 'P1', name: 'Practical 1', weight: 15, mark: 62 }] },
        { code: 'MATH201', name: 'Mathematics 2', credits: 15, year: 2026, semester: 'S1', mark: 48, status: 'In Progress',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 25, mark: 45 }, { code: 'T2', name: 'Tutorial Work', weight: 10, mark: 58 }] },
        // Year 1 — S2 2025
        { code: 'ITPR102', name: 'Programming 1B', credits: 20, year: 2025, semester: 'S2', mark: 74, status: 'Passed',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 15, mark: 70 }, { code: 'T2', name: 'Test 2', weight: 15, mark: 68 }, { code: 'A1', name: 'Assignment', weight: 10, mark: 82 }, { code: 'EX', name: 'Exam', weight: 40, mark: 75 }, { code: 'P1', name: 'Practical', weight: 10, mark: 78 }] },
        { code: 'ITWB101', name: 'Web Development 1', credits: 20, year: 2025, semester: 'S2', mark: 82, status: 'Passed',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 15, mark: 80 }, { code: 'P1', name: 'Project', weight: 25, mark: 88 }, { code: 'EX', name: 'Exam', weight: 40, mark: 79 }, { code: 'A1', name: 'Assignment', weight: 10, mark: 85 }, { code: 'P2', name: 'Practical', weight: 10, mark: 78 }] },
        { code: 'ITDB101', name: 'Database Fundamentals', credits: 20, year: 2025, semester: 'S2', mark: 65, status: 'Passed',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 20, mark: 60 }, { code: 'T2', name: 'Test 2', weight: 20, mark: 62 }, { code: 'P1', name: 'Practical', weight: 20, mark: 72 }, { code: 'EX', name: 'Exam', weight: 40, mark: 65 }] },
        // Year 1 — S1 2025
        { code: 'ITPR101', name: 'Programming 1A', credits: 20, year: 2025, semester: 'S1', mark: 71, status: 'Passed',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 15, mark: 65 }, { code: 'T2', name: 'Test 2', weight: 15, mark: 72 }, { code: 'A1', name: 'Assignment', weight: 10, mark: 78 }, { code: 'EX', name: 'Exam', weight: 40, mark: 70 }, { code: 'P1', name: 'Practical', weight: 10, mark: 75 }] },
        { code: 'MATH101', name: 'Mathematics 1', credits: 15, year: 2025, semester: 'S1', mark: 55, status: 'Passed',
          assessments: [{ code: 'T1', name: 'Test 1', weight: 25, mark: 50 }, { code: 'T2', name: 'Test 2', weight: 25, mark: 52 }, { code: 'TUT', name: 'Tutorials', weight: 10, mark: 68 }, { code: 'EX', name: 'Exam', weight: 40, mark: 56 }] },
        { code: 'COMM101', name: 'Communication Skills', credits: 10, year: 2025, semester: 'S1', mark: 68, status: 'Passed',
          assessments: [{ code: 'A1', name: 'Essay', weight: 20, mark: 72 }, { code: 'A2', name: 'Presentation', weight: 20, mark: 75 }, { code: 'EX', name: 'Exam', weight: 40, mark: 62 }, { code: 'P1', name: 'Portfolio', weight: 20, mark: 68 }] },
        { code: 'LIFE101', name: 'Life Skills', credits: 5, year: 2025, semester: 'S1', mark: 72, status: 'Passed',
          assessments: [{ code: 'P1', name: 'Portfolio', weight: 50, mark: 75 }, { code: 'A1', name: 'Group Project', weight: 50, mark: 69 }] }
    ];

    static GRADE_SCALE = [
        { grade: 'A', min: 75, max: 100, color: '#059669', label: 'Distinction' },
        { grade: 'B', min: 60, max: 74,  color: '#0891b2', label: 'Merit' },
        { grade: 'C', min: 50, max: 59,  color: '#d4af37', label: 'Pass' },
        { grade: 'D', min: 40, max: 49,  color: '#d97706', label: 'Supplementary' },
        { grade: 'F', min: 0,  max: 39,  color: '#dc2626', label: 'Fail' }
    ];

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._apiData = config.studentData || null;
        this._hasRealIdentity = !!(this._apiData && this._apiData.studentNumber);
        this._hasRealData = !!(this._apiData && this._apiData.results && this._apiData.results.length > 0);
        this._dataLoaded = false;
        this._results = [];
        this._yearFilter = 'All';
        this._inputs = {};
        this._initPublome();
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [{
                name: 'courseResult',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    code: { type: 'string', label: 'Code' },
                    name: { type: 'string', label: 'Course' },
                    credits: { type: 'number', label: 'Credits' },
                    year: { type: 'number', label: 'Year' },
                    semester: { type: 'string', label: 'Semester' },
                    mark: { type: 'number', label: 'Mark' },
                    status: { type: 'string', label: 'Status' }
                },
                labeller: '{code} — {name}',
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

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildAccordion();
        this._loadData();
        this._renderDashboard();
        this._renderStatsPane(this._statsEl);
    }

    // ── Control Accordion ───────────────────────────────────────────────────

    _buildAccordion() {
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
            stats: { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Quick Stats' }
        };

        const accordion = new uiAccordion({
            exclusive: true,
            content,
            parent: el
        });

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsPane(paramsEl);

        this._statsEl = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        this._renderStatsPane(this._statsEl);
    }

    _renderParamsPane(el) {
        el.innerHTML = '';

        // Student badge
        const badge = document.createElement('div');
        badge.className = 'as-ctrl-wrap';
        el.appendChild(badge);
        new uiBadge({ label: this._getStudentLabel(), color: 'primary', size: 'sm', parent: badge });

        // Year filter
        const yearWrap = document.createElement('div');
        yearWrap.className = 'ui-input-wrapper as-ctrl-wrap';
        el.appendChild(yearWrap);
        const yearLabel = document.createElement('label');
        yearLabel.className = 'as-ctrl-inline-label';
        yearLabel.textContent = 'Year';
        yearWrap.appendChild(yearLabel);
        this._inputs.year = document.createElement('select');
        this._inputs.year.className = 'ui-input as-ctrl-select';
        ['All', '2026', '2025'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.year.appendChild(option);
        });
        this._inputs.year.value = 'All';
        yearWrap.appendChild(this._inputs.year);

        // GPA scale
        const scaleWrap = document.createElement('div');
        scaleWrap.className = 'ui-input-wrapper as-ctrl-wrap';
        el.appendChild(scaleWrap);
        const scaleLabel = document.createElement('label');
        scaleLabel.className = 'as-ctrl-inline-label';
        scaleLabel.textContent = 'GPA Scale';
        scaleWrap.appendChild(scaleLabel);
        this._inputs.scale = document.createElement('select');
        this._inputs.scale.className = 'ui-input as-ctrl-select';
        ['Percentage (SA)', 'GPA 4.0'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.scale.appendChild(option);
        });
        this._inputs.scale.value = 'Percentage (SA)';
        scaleWrap.appendChild(this._inputs.scale);

        // Load button
        const btnWrap = document.createElement('div');
        btnWrap.className = 'as-ctrl-btn-wrap';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Results', variant: 'primary', size: 'sm', parent: btnWrap,
            icon: '<i class="fas fa-graduation-cap"></i>',
            onClick: () => {
                this._loadData();
                this._renderDashboard();
                this._renderStatsPane(this._statsEl);
            }
        });
    }

    _renderStatsPane(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div class="as-ctrl-stats-hint">Load data to see stats</div>';
            return;
        }
        const passed = this._results.filter(r => r.status === 'Passed');
        const totalCredits = passed.reduce((s, r) => s + r.credits, 0);
        const wSum = passed.reduce((s, r) => s + r.mark * r.credits, 0);
        const cumGpa = totalCredits > 0 ? (wSum / totalCredits).toFixed(1) : '—';
        const gpaColorClass = parseFloat(cumGpa) >= 50 ? 'as-ctrl-stat-success' : 'as-ctrl-stat-warning';

        el.innerHTML = `
            <div class="as-ctrl-stats-text">
                <div>Total Courses: <strong>${this._results.length}</strong></div>
                <div>Passed: <strong class="as-ctrl-stat-success">${passed.length}</strong></div>
                <div>In Progress: <strong>${this._results.filter(r => r.status === 'In Progress').length}</strong></div>
                <div>Credits Earned: <strong>${totalCredits}</strong></div>
                <div>Cum. GPA: <strong class="${gpaColorClass}">${cumGpa}%</strong></div>
            </div>`;
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    _loadData() {
        this._yearFilter = this._inputs.year ? this._inputs.year.value : 'All';
        this._results = this._hasRealData ? this._resultsFromApi() : MyResultsPanel.DEMO_RESULTS;
        this._dataLoaded = true;
        // Populate Publome
        const t = this._publome.table('courseResult');
        t.all().forEach(r => t.delete(r.idx));
        this._results.forEach((r, i) => {
            t.create({ idx: i + 1, code: r.code, name: r.name, credits: r.credits, year: r.year, semester: r.semester, mark: r.mark, status: r.status });
        });
    }

    _getGrade(mark) {
        return MyResultsPanel.GRADE_SCALE.find(g => mark >= g.min && mark <= g.max) || MyResultsPanel.GRADE_SCALE[4];
    }

    _resultsFromApi() {
        var d = this._apiData;
        var results = d.results || [];
        return results.map(function(r) {
            var mark = parseFloat(r.result) || 0;
            var passed = (r.resultCode || '').toUpperCase() === 'P';
            var status = passed ? 'Passed' : (mark > 0 ? 'Failed' : 'In Progress');
            return {
                code: r.courseCode || '',
                name: r.courseCode || '', // API doesn't return course names
                credits: parseFloat(r.credits) || 16,
                year: parseInt(r.year) || 2019,
                semester: 'S' + (r.semester || '1'),
                mark: mark,
                status: status,
                assessments: [] // API doesn't return per-assessment detail
            };
        });
    }

    _getStudentLabel() {
        if (this._hasRealIdentity && this._apiData) {
            var name = (this._apiData.firstName || '') + ' ' + (this._apiData.surname || this._apiData.lastName || '');
            return (this._apiData.studentNumber || '') + ' — ' + name.trim();
        }
        return '220102 — Naledi Dlamini';
    }

    // ── Stage: Empty ────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-wrap';

        new uiAlert({
            color: 'info',
            title: 'My Results',
            message: 'Click "Load Results" to view your academic record with per-assessment detail, GPA calculation, and year/semester filtering.',
            parent: this._stageEl
        });

        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        this._stageEl.appendChild(kpiRow);

        const b = this._binding('courseResult');
        b.bindMetric(kpiRow, { compute: recs => recs.length || '\u2014', label: 'Courses', icon: 'fas fa-book', color: 'var(--ui-gray-400)' });
        b.bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            const passed = recs.filter(r => r.get('status') === 'Passed');
            const tc = passed.reduce((s, r) => s + r.get('credits'), 0);
            const ws = passed.reduce((s, r) => s + r.get('mark') * r.get('credits'), 0);
            return tc > 0 ? (ws / tc).toFixed(1) + '%' : '\u2014';
        }, label: 'GPA', icon: 'fas fa-graduation-cap', color: 'var(--ui-gray-400)' });
        b.bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            return recs.filter(r => r.get('status') === 'Passed').reduce((s, r) => s + r.get('credits'), 0);
        }, label: 'Credits', icon: 'fas fa-layer-group', color: 'var(--ui-gray-400)' });
    }

    // ── Stage: Dashboard ────────────────────────────────────────────────────

    _renderDashboard() {
        const stage = this._stageEl;
        stage.innerHTML = '';
        stage.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-wrap';
        stage.appendChild(wrap);

        // Header — use real student data when available
        var studentName = 'Naledi Dlamini';
        var studentId = '220102';
        var programme = 'ND: Information Technology';
        if (this._hasRealIdentity && this._apiData) {
            studentName = ((this._apiData.firstName || '') + ' ' + (this._apiData.surname || this._apiData.lastName || '')).trim();
            studentId = this._apiData.studentNumber || this._apiData.studentId || studentId;
            programme = this._apiData.programme || programme;
        }
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML =
            '<span class="as-brand-badge">' + studentName + '</span>' +
            '<span class="as-panel-subtitle">' + studentId + ' | ' + programme + '</span>';
        wrap.appendChild(header);

        // GPA Summary cards
        this._renderGPASummary(wrap);

        // Charts row: GPA trend + NSFAS credit progress (debate Phase 1E)
        var chartRow = document.createElement('div');
        chartRow.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:var(--ui-space-3); margin-bottom:var(--ui-space-4);';
        wrap.appendChild(chartRow);
        this._renderGPATrend(chartRow);
        this._renderCreditProgress(chartRow);

        // Results by year/semester
        const filtered = this._yearFilter === 'All' ? this._results : this._results.filter(r => String(r.year) === this._yearFilter);
        const groups = this._groupBySemester(filtered);

        groups.forEach(g => {
            const secTitle = document.createElement('div');
            secTitle.className = 'mr-section-title';
            secTitle.textContent = `${g.semester} ${g.year}`;
            wrap.appendChild(secTitle);
            this._renderResultsTable(wrap, g.results);
        });
    }

    _renderGPASummary(wrap) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        wrap.appendChild(row);

        const b = this._binding('courseResult');

        b.bindMetric(row, {
            compute: recs => {
                const passed = recs.filter(r => r.get('status') === 'Passed');
                const tc = passed.reduce((s, r) => s + r.get('credits'), 0);
                const ws = passed.reduce((s, r) => s + r.get('mark') * r.get('credits'), 0);
                return tc > 0 ? (ws / tc).toFixed(1) + '%' : '0%';
            },
            label: 'Cumulative GPA', icon: 'fas fa-chart-line', color: '#059669'
        });

        b.bindMetric(row, {
            compute: recs => {
                const current = recs.filter(r => r.get('status') === 'In Progress');
                const cc = current.reduce((s, r) => s + r.get('credits'), 0);
                const cw = current.reduce((s, r) => s + r.get('mark') * r.get('credits'), 0);
                return cc > 0 ? (cw / cc).toFixed(1) + '%' : '\u2014';
            },
            label: 'Semester GPA', icon: 'fas fa-calendar-alt', color: '#7c3aed'
        });

        b.bindMetric(row, {
            compute: recs => String(recs.filter(r => r.get('status') === 'Passed').reduce((s, r) => s + r.get('credits'), 0)),
            label: 'Credits Earned', icon: 'fas fa-layer-group', color: '#0891b2'
        });

        b.bindMetric(row, {
            compute: recs => String(recs.filter(r => r.get('status') === 'Passed').length),
            label: 'Courses Completed', icon: 'fas fa-check-circle', color: '#2563eb'
        });
    }

    _renderResultsTable(wrap, results) {
        const table = document.createElement('table');
        table.className = 'mr-results-table';
        wrap.appendChild(table);

        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Code</th><th>Course</th><th>Mark</th><th>Grade</th><th>Credits</th><th>RAG</th></tr>';
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        const self = this;
        results.forEach(r => {
            const g = self._getGrade(r.mark);
            const markClass = r.mark >= 75 ? 'sc-mark-pass' : r.mark >= 60 ? 'sc-mark-merit' : r.mark >= 50 ? 'sc-mark-warn' : 'sc-mark-fail';
            const barPct = Math.min(100, r.mark);

            // RAG indicator (debate: RAG on every module)
            var ragColor, ragBg, ragLabel;
            if (r.mark >= 75) { ragColor = 'var(--ui-success)'; ragBg = 'var(--ui-success-50)'; ragLabel = 'Green'; }
            else if (r.mark >= 50) { ragColor = 'var(--ui-warning-600)'; ragBg = 'var(--ui-warning-50)'; ragLabel = 'Amber'; }
            else { ragColor = 'var(--ui-danger)'; ragBg = 'var(--ui-danger-50)'; ragLabel = 'Red'; }

            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td><span class="mr-code">' + r.code + '</span></td>' +
                '<td>' + r.name + '</td>' +
                '<td><span class="mr-mark-value ' + markClass + '">' + r.mark + '%</span>' +
                '<div class="mr-grade-bar" style="width:' + barPct + '%;background:' + g.color + ';"></div></td>' +
                '<td><span style="color:' + g.color + ';font-weight:600;">' + g.grade + '</span></td>' +
                '<td><span class="mr-credits-badge">' + r.credits + ' cr</span></td>' +
                '<td><span style="font-size:var(--ui-text-2xs);padding:2px 8px;border-radius:var(--ui-radius-full);background:' + ragBg + ';color:' + ragColor + ';font-weight:var(--ui-font-semibold);">' + ragLabel + '</span></td>';
            tbody.appendChild(tr);
        });
    }

    // ── GPA Trend (ApexCharts area) ─────────────────────────────────────

    _renderGPATrend(parent) {
        var card = document.createElement('div');
        card.style.cssText = 'border:1px solid var(--ui-gray-200); border-radius:var(--ui-radius-lg); padding:var(--ui-space-3); background:white;';
        parent.appendChild(card);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:var(--ui-text-sm); font-weight:var(--ui-font-semibold); color:var(--ui-gray-700); margin-bottom:8px;';
        title.innerHTML = '<i class="fas fa-chart-area" style="color:var(--ui-primary); margin-right:6px;"></i>GPA Trend';
        card.appendChild(title);

        var chartEl = document.createElement('div');
        card.appendChild(chartEl);

        if (typeof ApexCharts !== 'undefined') {
            requestAnimationFrame(function() {
                var chart = new ApexCharts(chartEl, {
                    series: [{ name: 'GPA', data: [68, 71, 65, 74, 82, 65, 67, 58, 48] }],
                    chart: { type: 'area', height: 180, toolbar: { show: false }, sparkline: { enabled: false } },
                    stroke: { width: 2, curve: 'smooth' },
                    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] } },
                    colors: ['#3b82f6'],
                    xaxis: { categories: ['COMM101', 'ITPR101', 'MATH101', 'ITPR102', 'ITWB101', 'ITDB101', 'ITSD201', 'ITDA201', 'MATH201'], labels: { style: { fontSize: '9px' }, rotate: -45 } },
                    yaxis: { min: 0, max: 100, labels: { style: { fontSize: '10px' } } },
                    annotations: {
                        yaxis: [{ y: 50, borderColor: '#ef4444', strokeDashArray: 4, label: { text: 'Pass (50%)', style: { fontSize: '9px', color: '#ef4444', background: 'transparent' } } }]
                    },
                    grid: { strokeDashArray: 3 },
                    tooltip: { y: { formatter: function(v) { return v + '%'; } } }
                });
                chart.render();
            });
        } else {
            chartEl.innerHTML = '<div style="text-align:center; color:var(--ui-gray-400); padding:20px;">ApexCharts not loaded</div>';
        }
    }

    // ── NSFAS-Aware Credit Progress (stacked area) ────────────────────────

    _renderCreditProgress(parent) {
        var card = document.createElement('div');
        card.style.cssText = 'border:1px solid var(--ui-gray-200); border-radius:var(--ui-radius-lg); padding:var(--ui-space-3); background:white;';
        parent.appendChild(card);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:var(--ui-text-sm); font-weight:var(--ui-font-semibold); color:var(--ui-gray-700); margin-bottom:8px;';
        title.innerHTML = '<i class="fas fa-layer-group" style="color:var(--ui-success); margin-right:6px;"></i>Credit Progress (NSFAS Bands)';
        card.appendChild(title);

        var chartEl = document.createElement('div');
        card.appendChild(chartEl);

        if (typeof ApexCharts !== 'undefined') {
            // Stacked area: actual credits earned vs NSFAS thresholds
            requestAnimationFrame(function() {
                var chart = new ApexCharts(chartEl, {
                    series: [
                        { name: 'Credits Earned', data: [0, 30, 65, 95, 130, 145, 145] },
                        { name: 'NSFAS Minimum (60%)', data: [0, 24, 48, 72, 96, 120, 144] },
                        { name: 'On-Time (100%)', data: [0, 40, 80, 120, 160, 200, 240] },
                        { name: 'Distinction Track', data: [0, 44, 88, 132, 176, 220, 264] }
                    ],
                    chart: { type: 'area', height: 180, toolbar: { show: false }, stacked: false },
                    stroke: { width: [2.5, 1, 1, 1], curve: 'smooth', dashArray: [0, 5, 5, 5] },
                    fill: { type: ['gradient', 'solid', 'solid', 'solid'], opacity: [0.3, 0, 0, 0] },
                    colors: ['#22c55e', '#ef4444', '#3b82f6', '#a855f7'],
                    xaxis: { categories: ['Start', 'S1 Y1', 'S2 Y1', 'S1 Y2', 'S2 Y2', 'S1 Y3', 'S2 Y3'], labels: { style: { fontSize: '9px' } } },
                    yaxis: { max: 360, labels: { style: { fontSize: '10px' } } },
                    legend: { fontSize: '10px', position: 'bottom', horizontalAlign: 'center' },
                    grid: { strokeDashArray: 3 },
                    tooltip: { y: { formatter: function(v) { return v + ' credits'; } } }
                });
                chart.render();
            });
        } else {
            chartEl.innerHTML = '<div style="text-align:center; color:var(--ui-gray-400); padding:20px;">ApexCharts not loaded</div>';
        }
    }

    _groupBySemester(results) {
        const map = new Map();
        results.forEach(r => {
            const key = `${r.semester}|${r.year}`;
            if (!map.has(key)) map.set(key, { semester: r.semester, year: r.year, results: [] });
            map.get(key).results.push(r);
        });
        return [...map.values()].sort((a, b) => b.year - a.year || (b.semester > a.semester ? 1 : -1));
    }
}
