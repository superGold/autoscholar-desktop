/**
 * DegreeProgressPanel - Credit tracking & graduation requirements
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Self-contained demo data — course completion grid, credit progress bar,
 * prerequisite chain, AYOS.
 *
 * Usage:
 *   const panel = new DegreeProgressPanel();
 *   panel.render(controlEl, stageEl);
 */
class DegreeProgressPanel {

    // ── Static Data ─────────────────────────────────────────────────────────

    static DEMO_STUDENTS = [
        { id: '220101', name: 'Thabo', surname: 'Mokoena' }, { id: '220102', name: 'Naledi', surname: 'Dlamini' },
        { id: '220103', name: 'Sipho', surname: 'Nkosi' }, { id: '220104', name: 'Zanele', surname: 'Khumalo' },
        { id: '220105', name: 'Bongani', surname: 'Mthembu' }, { id: '220106', name: 'Lindiwe', surname: 'Ngcobo' },
        { id: '220107', name: 'Mandla', surname: 'Zulu' }, { id: '220108', name: 'Ayanda', surname: 'Mkhize' },
        { id: '220109', name: 'Nomvula', surname: 'Sithole' }, { id: '220110', name: 'Sibusiso', surname: 'Ndlovu' },
        { id: '220111', name: 'Palesa', surname: 'Mahlangu' }, { id: '220112', name: 'Kagiso', surname: 'Molefe' },
        { id: '220113', name: 'Dineo', surname: 'Maseko' }, { id: '220114', name: 'Tshiamo', surname: 'Botha' },
        { id: '220115', name: 'Lerato', surname: 'Pretorius' }, { id: '220116', name: 'Mpho', surname: 'Van der Merwe' },
        { id: '220117', name: 'Nompilo', surname: 'Shabalala' }, { id: '220118', name: 'Lethabo', surname: 'Joubert' },
        { id: '220119', name: 'Keabetswe', surname: 'Tshabalala' }, { id: '220120', name: 'Thandeka', surname: 'Radebe' },
        { id: '220121', name: 'Amahle', surname: 'Mbeki' }, { id: '220122', name: 'Siyabonga', surname: 'Vilakazi' },
        { id: '220123', name: 'Nokuthula', surname: 'Cele' }, { id: '220124', name: 'Lwazi', surname: 'Phiri' },
        { id: '220125', name: 'Busisiwe', surname: 'Ntuli' }, { id: '220126', name: 'Thulani', surname: 'Mabaso' },
        { id: '220127', name: 'Refilwe', surname: 'Motaung' }, { id: '220128', name: 'Andile', surname: 'Govender' }
    ];

    static DEMO_PROGRAMME = {
        name: 'ND: Information Technology',
        code: 'NDIP:IT',
        totalCredits: 360,
        durationYears: 3,
        variant: 'Mainstream',
        faculty: 'Applied Sciences'
    };

    static DEMO_COURSES = [
        // Year 1 S1
        { code: 'ITPR101', name: 'Programming 1A', credits: 20, year: 1, semester: 'S1', status: 'passed', mark: 71, prereq: null },
        { code: 'MATH101', name: 'Mathematics 1', credits: 15, year: 1, semester: 'S1', status: 'passed', mark: 55, prereq: null },
        { code: 'COMM101', name: 'Communication Skills', credits: 10, year: 1, semester: 'S1', status: 'passed', mark: 68, prereq: null },
        { code: 'LIFE101', name: 'Life Skills', credits: 5, year: 1, semester: 'S1', status: 'passed', mark: 72, prereq: null },
        // Year 1 S2
        { code: 'ITPR102', name: 'Programming 1B', credits: 20, year: 1, semester: 'S2', status: 'passed', mark: 74, prereq: 'ITPR101' },
        { code: 'ITWB101', name: 'Web Development 1', credits: 20, year: 1, semester: 'S2', status: 'passed', mark: 82, prereq: null },
        { code: 'ITDB101', name: 'Database Fundamentals', credits: 20, year: 1, semester: 'S2', status: 'passed', mark: 65, prereq: null },
        { code: 'ITNT101', name: 'Networking 1', credits: 10, year: 1, semester: 'S2', status: 'passed', mark: 60, prereq: null },
        // Year 2 S1
        { code: 'ITSD201', name: 'Software Development 2', credits: 20, year: 2, semester: 'S1', status: 'in-progress', mark: 67, prereq: 'ITPR102' },
        { code: 'ITDA201', name: 'Data Structures', credits: 20, year: 2, semester: 'S1', status: 'in-progress', mark: 58, prereq: 'ITPR102' },
        { code: 'MATH201', name: 'Mathematics 2', credits: 15, year: 2, semester: 'S1', status: 'in-progress', mark: 48, prereq: 'MATH101' },
        // Year 2 S2
        { code: 'ITSD202', name: 'Software Development 2B', credits: 20, year: 2, semester: 'S2', status: 'remaining', mark: null, prereq: 'ITSD201' },
        { code: 'ITWB201', name: 'Web Development 2', credits: 20, year: 2, semester: 'S2', status: 'remaining', mark: null, prereq: 'ITWB101' },
        { code: 'ITDB201', name: 'Database Design', credits: 20, year: 2, semester: 'S2', status: 'remaining', mark: null, prereq: 'ITDB101' },
        // Year 3 S1
        { code: 'ITSD301', name: 'Software Dev 3A', credits: 20, year: 3, semester: 'S1', status: 'remaining', mark: null, prereq: 'ITSD202' },
        { code: 'ITPM301', name: 'Project Management', credits: 15, year: 3, semester: 'S1', status: 'remaining', mark: null, prereq: null },
        { code: 'ITEN301', name: 'Entrepreneurship', credits: 10, year: 3, semester: 'S1', status: 'remaining', mark: null, prereq: null },
        // Year 3 S2
        { code: 'ITSD302', name: 'Software Dev 3B', credits: 20, year: 3, semester: 'S2', status: 'remaining', mark: null, prereq: 'ITSD301' },
        { code: 'ITCP301', name: 'Capstone Project', credits: 30, year: 3, semester: 'S2', status: 'remaining', mark: null, prereq: 'ITSD301' },
        { code: 'ITWO301', name: 'WIL / Industry Placement', credits: 30, year: 3, semester: 'S2', status: 'remaining', mark: null, prereq: null }
    ];

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._dataLoaded = false;
        this._inputs = {};
        this._initPublome();
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [{
                name: 'degreeModule',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    code: { type: 'string', label: 'Code' },
                    name: { type: 'string', label: 'Course' },
                    credits: { type: 'number', label: 'Credits' },
                    year: { type: 'number', label: 'Year' },
                    semester: { type: 'string', label: 'Semester' },
                    status: { type: 'string', label: 'Status' },
                    mark: { type: 'number', label: 'Mark' },
                    prereq: { type: 'string', label: 'Prerequisite' }
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
        this._dataLoaded = true;
        this._renderDashboard();
        this._renderStatsPane(this._statsEl);
    }

    // ── Control Accordion ───────────────────────────────────────────────────

    _buildAccordion() {
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
            legend: { label: '<i class="fas fa-palette" style="margin-right:0.3rem;"></i>Legend' },
            stats: { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Quick Stats' }
        };

        const accordion = new uiAccordion({ exclusive: true, content, parent: el });

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsPane(paramsEl);

        const legendEl = accordion.el.querySelector('.ui-accordion-item[data-key="legend"] .ui-accordion-content');
        this._renderLegend(legendEl);

        this._statsEl = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        this._renderStatsPane(this._statsEl);
    }

    _renderParamsPane(el) {
        el.innerHTML = '';

        new uiBadge({ label: '220102 — Naledi Dlamini', color: 'primary', size: 'sm', parent: el });

        const spacer = document.createElement('div');
        spacer.className = 'as-ctrl-spacer-sm';
        el.appendChild(spacer);

        const progWrap = document.createElement('div');
        progWrap.className = 'ui-input-wrapper as-ctrl-wrap';
        el.appendChild(progWrap);
        const progLabel = document.createElement('label');
        progLabel.className = 'as-ctrl-inline-label';
        progLabel.textContent = 'Programme';
        progWrap.appendChild(progLabel);
        this._inputs.programme = document.createElement('select');
        this._inputs.programme.className = 'ui-input as-ctrl-select';
        ['ND: Information Technology', 'ND: Multimedia', 'ND: Computer Science'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.programme.appendChild(option);
        });
        this._inputs.programme.value = 'ND: Information Technology';
        progWrap.appendChild(this._inputs.programme);

        const varWrap = document.createElement('div');
        varWrap.className = 'ui-input-wrapper as-ctrl-wrap';
        el.appendChild(varWrap);
        const varLabel = document.createElement('label');
        varLabel.className = 'as-ctrl-inline-label';
        varLabel.textContent = 'Variant';
        varWrap.appendChild(varLabel);
        this._inputs.variant = document.createElement('select');
        this._inputs.variant.className = 'ui-input as-ctrl-select';
        ['Mainstream (3 years)', 'Extended (4 years)'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.variant.appendChild(option);
        });
        this._inputs.variant.value = 'Mainstream (3 years)';
        varWrap.appendChild(this._inputs.variant);

        const btnWrap = document.createElement('div');
        btnWrap.className = 'as-ctrl-btn-wrap';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Progress', variant: 'primary', size: 'sm', parent: btnWrap,
            icon: '<i class="fas fa-tasks"></i>',
            onClick: () => {
                this._dataLoaded = true;
                this._renderDashboard();
                this._renderStatsPane(this._statsEl);
            }
        });
    }

    _renderLegend(el) {
        el.innerHTML = '';
        const items = [
            { color: '#059669', label: 'Passed' },
            { color: '#2563eb', label: 'In Progress' },
            { color: '#9ca3af', label: 'Remaining' },
            { color: '#dc2626', label: 'Failed' }
        ];
        items.forEach(i => {
            const row = document.createElement('div');
            row.className = 'as-legend-item';
            row.innerHTML = `<div class="as-legend-dot" style="background:${i.color};"></div><span class="as-legend-label">${i.label}</span>`;
            el.appendChild(row);
        });
    }

    _renderStatsPane(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div class="as-ctrl-stats-hint">Load data to see stats</div>';
            return;
        }
        const courses = DegreeProgressPanel.DEMO_COURSES;
        const passed = courses.filter(c => c.status === 'passed');
        const inProg = courses.filter(c => c.status === 'in-progress');
        const remaining = courses.filter(c => c.status === 'remaining');
        const creditsDone = passed.reduce((s, c) => s + c.credits, 0);

        el.innerHTML = `
            <div class="as-ctrl-stats-text">
                <div>Total Courses: <strong>${courses.length}</strong></div>
                <div>Passed: <strong class="as-ctrl-stat-success">${passed.length}</strong></div>
                <div>In Progress: <strong class="as-ctrl-stat-info">${inProg.length}</strong></div>
                <div>Remaining: <strong>${remaining.length}</strong></div>
                <div>Credits: <strong>${creditsDone}/${DegreeProgressPanel.DEMO_PROGRAMME.totalCredits}</strong></div>
                <div>AYOS: <strong>2</strong></div>
            </div>`;
    }

    // ── Stage: Empty ────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-wrap';

        new uiAlert({
            color: 'info',
            title: 'Degree Progress',
            message: 'Select a programme and click "Load Progress" to view your course completion grid, credit accumulation, and graduation timeline.',
            parent: this._stageEl
        });

        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        this._stageEl.appendChild(kpiRow);

        const b = this._binding('degreeModule');
        b.bindMetric(kpiRow, { compute: recs => recs.length || '\u2014', label: 'Courses', icon: 'fas fa-tasks', color: 'var(--ui-gray-400)' });
        b.bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            return recs.filter(r => r.get('status') === 'passed').reduce((s, r) => s + r.get('credits'), 0);
        }, label: 'Credits', icon: 'fas fa-layer-group', color: 'var(--ui-gray-400)' });
        b.bindMetric(kpiRow, { compute: recs => recs.length ? 'Dec 2027' : '\u2014', label: 'Est. Completion', icon: 'fas fa-calendar', color: 'var(--ui-gray-400)' });
    }

    // ── Stage: Dashboard ────────────────────────────────────────────────────

    _renderDashboard() {
        const stage = this._stageEl;
        stage.innerHTML = '';
        stage.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-wrap';
        stage.appendChild(wrap);

        const prog = DegreeProgressPanel.DEMO_PROGRAMME;
        const courses = DegreeProgressPanel.DEMO_COURSES;

        // Populate Publome
        const t = this._publome.table('degreeModule');
        t.all().forEach(r => t.delete(r.idx));
        courses.forEach((c, i) => {
            t.create({ idx: i + 1, code: c.code, name: c.name, credits: c.credits, year: c.year, semester: c.semester, status: c.status, mark: c.mark, prereq: c.prereq || '' });
        });
        const passed = courses.filter(c => c.status === 'passed');
        const creditsDone = passed.reduce((s, c) => s + c.credits, 0);
        const pct = Math.round((creditsDone / prog.totalCredits) * 100);

        // Header
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML = `
            <span class="as-brand-badge">${prog.name}</span>
            <span class="as-panel-subtitle">${prog.variant} | ${prog.durationYears} years | ${prog.totalCredits} credits</span>`;
        wrap.appendChild(header);

        // KPI Row
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        wrap.appendChild(kpiRow);

        const b = this._binding('degreeModule');
        b.bindMetric(kpiRow, {
            compute: recs => {
                const passed = recs.filter(r => r.get('status') === 'passed');
                const done = passed.reduce((s, r) => s + r.get('credits'), 0);
                return Math.round((done / prog.totalCredits) * 100) + '%';
            },
            label: 'Overall Progress', icon: 'fas fa-chart-pie', color: '#059669'
        });
        b.bindMetric(kpiRow, {
            compute: recs => {
                const done = recs.filter(r => r.get('status') === 'passed').reduce((s, r) => s + r.get('credits'), 0);
                return done + '/' + prog.totalCredits;
            },
            label: 'Credits Earned', icon: 'fas fa-layer-group', color: '#0891b2'
        });
        b.bindMetric(kpiRow, { compute: () => '2', label: 'AYOS', icon: 'fas fa-calendar-alt', color: '#7c3aed' });
        b.bindMetric(kpiRow, { compute: () => 'Dec 2027', label: 'Est. Completion', icon: 'fas fa-flag-checkered', color: '#2563eb' });

        // Overall progress bar
        const barWrap = document.createElement('div');
        barWrap.style.cssText = 'margin-bottom:1.5rem;';
        barWrap.innerHTML = `
            <div class="dp-progress-heading">Credit Progress</div>
            <div class="dp-progress-bar">
                <div class="dp-progress-fill" style="width:${pct}%;"></div>
                <span class="dp-progress-label">${creditsDone} / ${prog.totalCredits} credits (${pct}%)</span>
            </div>`;
        wrap.appendChild(barWrap);

        // Larger progress ring as central element
        const ringWrap = document.createElement('div');
        ringWrap.className = 'sd-hero-ring-section';
        wrap.appendChild(ringWrap);

        const ringEl = document.createElement('div');
        ringEl.className = 'sd-ring-hero';
        const ringColor = pct >= 75 ? 'var(--ex-clr-success)' : pct >= 50 ? 'var(--ui-blue-700)' : 'var(--ex-clr-warning)';
        ringEl.innerHTML =
            '<svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg);">' +
            '<circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ui-gray-200)" stroke-width="2.5"/>' +
            '<circle cx="18" cy="18" r="15.5" fill="none" stroke="' + ringColor + '" stroke-width="2.5" stroke-dasharray="' + pct + ' ' + (100 - pct) + '" stroke-linecap="round"/>' +
            '<text x="18" y="19" text-anchor="middle" style="transform:rotate(90deg);transform-origin:center;font-size:7px;font-weight:800;fill:var(--ui-gray-800);">' + pct + '%</text>' +
            '<text x="18" y="24" text-anchor="middle" style="transform:rotate(90deg);transform-origin:center;font-size:3px;fill:var(--ui-gray-400);">complete</text></svg>';
        ringWrap.appendChild(ringEl);

        const ringDetails = document.createElement('div');
        ringDetails.className = 'sd-progress-details';
        ringDetails.innerHTML =
            '<div class="sd-detail-grid">' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">Credits Done</div><div class="sd-detail-value">' + creditsDone + '</div></div>' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">Remaining</div><div class="sd-detail-value">' + (prog.totalCredits - creditsDone) + '</div></div>' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">Duration</div><div class="sd-detail-value">' + prog.durationYears + ' years</div></div>' +
            '<div class="sd-detail-cell"><div class="sd-detail-label">Est. Completion</div><div class="sd-detail-value">Dec 2027</div></div></div>';
        ringWrap.appendChild(ringDetails);

        // Course status grid using existing dp-course-* CSS
        const gridTitle = document.createElement('div');
        gridTitle.className = 'dp-progress-heading';
        gridTitle.textContent = 'Course Status Grid';
        wrap.appendChild(gridTitle);

        const grid = document.createElement('div');
        grid.className = 'dp-course-grid';
        wrap.appendChild(grid);

        courses.forEach(c => {
            const statusClass = 'dp-status-' + c.status;
            const card = document.createElement('div');
            card.className = 'dp-course-card ' + statusClass;
            card.innerHTML =
                '<div class="dp-course-header"><span class="dp-course-code">' + c.code + '</span>' +
                '<span class="dp-course-status">' + c.status.replace('-', ' ') + '</span></div>' +
                '<div class="dp-course-name">' + c.name + '</div>' +
                '<div class="dp-course-meta"><span>' + c.credits + ' cr</span>' +
                (c.mark ? '<span>' + c.mark + '%</span>' : '') + '</div>' +
                (c.prereq ? '<div class="dp-course-prereq">Prereq: ' + c.prereq + '</div>' : '');
            grid.appendChild(card);
        });
    }
}
