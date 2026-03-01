/**
 * EvidencePortfolioPanel - Accreditation evidence collection & upload
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Self-contained demo data — GA-organized artifacts, status tracking,
 * upload simulation, portfolio completeness dashboard.
 *
 * Usage:
 *   const panel = new EvidencePortfolioPanel();
 *   panel.render(controlEl, stageEl);
 */
class EvidencePortfolioPanel {

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

    static DEMO_GAS = [
        { key: 'GA1',  name: 'Problem Solving', required: 3, icon: 'fa-puzzle-piece' },
        { key: 'GA2',  name: 'Application of Scientific & Engineering Knowledge', required: 3, icon: 'fa-flask' },
        { key: 'GA3',  name: 'Engineering Design', required: 2, icon: 'fa-drafting-compass' },
        { key: 'GA4',  name: 'Investigations & Experiments', required: 2, icon: 'fa-microscope' },
        { key: 'GA5',  name: 'Engineering Methods & Tools', required: 3, icon: 'fa-tools' },
        { key: 'GA6',  name: 'Professional & Technical Communication', required: 2, icon: 'fa-comments' },
        { key: 'GA7',  name: 'Impact & Sustainability', required: 1, icon: 'fa-leaf' },
        { key: 'GA8',  name: 'Individual & Team Work', required: 2, icon: 'fa-users' },
        { key: 'GA9',  name: 'Independent Learning', required: 2, icon: 'fa-book-reader' },
        { key: 'GA10', name: 'Engineering Professionalism', required: 1, icon: 'fa-user-tie' }
    ];

    static DEMO_ARTIFACTS = [
        { idx: 1, ga: 'GA1', title: 'Algorithm Analysis Report', type: 'pdf', status: 'verified', date: '2025-11-15', course: 'ITDA201', size: '2.4 MB' },
        { idx: 2, ga: 'GA1', title: 'Problem-Solving Portfolio — Test 2', type: 'pdf', status: 'verified', date: '2025-10-20', course: 'MATH101', size: '1.8 MB' },
        { idx: 3, ga: 'GA1', title: 'Data Structures Assignment 3', type: 'zip', status: 'submitted', date: '2026-01-28', course: 'ITDA201', size: '5.1 MB' },
        { idx: 4, ga: 'GA2', title: 'Database Design Document', type: 'pdf', status: 'verified', date: '2025-09-10', course: 'ITDB101', size: '3.2 MB' },
        { idx: 5, ga: 'GA2', title: 'Mathematics Application Paper', type: 'pdf', status: 'submitted', date: '2026-01-15', course: 'MATH201', size: '1.5 MB' },
        { idx: 6, ga: 'GA3', title: 'Web Application Mockup', type: 'pdf', status: 'verified', date: '2025-08-22', course: 'ITWB101', size: '4.7 MB' },
        { idx: 7, ga: 'GA3', title: 'Software Design Document', type: 'docx', status: 'draft', date: '2026-02-01', course: 'ITSD201', size: '2.1 MB' },
        { idx: 8, ga: 'GA5', title: 'Version Control Report (Git)', type: 'pdf', status: 'verified', date: '2025-07-15', course: 'ITPR102', size: '1.2 MB' },
        { idx: 9, ga: 'GA5', title: 'IDE Proficiency Screencast', type: 'mp4', status: 'submitted', date: '2026-01-20', course: 'ITSD201', size: '45 MB' },
        { idx: 10, ga: 'GA5', title: 'Testing Framework Demo', type: 'zip', status: 'draft', date: '2026-02-05', course: 'ITSD201', size: '8.3 MB' },
        { idx: 11, ga: 'GA6', title: 'Technical Presentation Slides', type: 'pptx', status: 'verified', date: '2025-10-05', course: 'COMM101', size: '6.2 MB' },
        { idx: 12, ga: 'GA6', title: 'Technical Writing Sample', type: 'pdf', status: 'submitted', date: '2025-11-30', course: 'COMM101', size: '1.1 MB' },
        { idx: 13, ga: 'GA8', title: 'Group Project Reflection', type: 'pdf', status: 'verified', date: '2025-06-20', course: 'LIFE101', size: '0.8 MB' },
        { idx: 14, ga: 'GA8', title: 'Team Sprint Retrospective', type: 'pdf', status: 'draft', date: '2026-02-08', course: 'ITSD201', size: '1.0 MB' },
        { idx: 15, ga: 'GA9', title: 'Self-Study Log (Semester 1)', type: 'pdf', status: 'verified', date: '2025-06-30', course: 'LIFE101', size: '0.5 MB' },
        { idx: 16, ga: 'GA9', title: 'Online Course Certificate — Python', type: 'pdf', status: 'submitted', date: '2025-12-15', course: 'Self-Study', size: '0.3 MB' }
    ];

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._apiData = config.studentData || null;
        this._hasRealIdentity = !!(this._apiData && this._apiData.studentNumber);
        this._dataLoaded = false;
        this._gaFilter = '-- All --';
        this._statusFilter = 'all';
        this._inputs = {};
        this._initPublome();
    }

    _getStudentLabel() {
        if (this._hasRealIdentity && this._apiData) {
            var name = ((this._apiData.firstName || '') + ' ' + (this._apiData.surname || this._apiData.lastName || '')).trim();
            return name + ' \u2014 ' + (this._apiData.studentNumber || '');
        }
        return 'Naledi Dlamini \u2014 220102';
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [{
                name: 'artifact',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    ga: { type: 'string', label: 'GA' },
                    title: { type: 'string', label: 'Title' },
                    type: { type: 'string', label: 'Type' },
                    status: { type: 'string', label: 'Status' },
                    date: { type: 'string', label: 'Date' },
                    course: { type: 'string', label: 'Course' },
                    size: { type: 'string', label: 'Size' }
                },
                labeller: '{title}',
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
        this._renderCoveragePane(this._coverageEl);
        this._renderStatsPane(this._statsEl);
    }

    // ── Control Accordion ───────────────────────────────────────────────────

    _buildAccordion() {
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
            coverage: { label: '<i class="fas fa-check-double" style="margin-right:0.3rem;"></i>GA Coverage' },
            stats: { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Quick Stats' }
        };

        const accordion = new uiAccordion({ exclusive: true, content, parent: el });

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsPane(paramsEl);

        this._coverageEl = accordion.el.querySelector('.ui-accordion-item[data-key="coverage"] .ui-accordion-content');
        this._renderCoveragePane(this._coverageEl);

        this._statsEl = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        this._renderStatsPane(this._statsEl);
    }

    _renderParamsPane(el) {
        el.innerHTML = '';

        new uiBadge({ label: this._getStudentLabel(), color: 'primary', size: 'sm', parent: el });

        const spacer = document.createElement('div');
        spacer.className = 'as-mb-2';
        el.appendChild(spacer);

        const gaOpts = ['-- All --', ...EvidencePortfolioPanel.DEMO_GAS.map(g => `${g.key}: ${g.name}`)];
        const gaWrap = document.createElement('div');
        gaWrap.className = 'ui-input-wrapper';
        gaWrap.classList.add('as-mb-2');
        el.appendChild(gaWrap);
        const gaLabel = document.createElement('label');
        gaLabel.className = 'as-ctrl-label';
        gaLabel.textContent = 'GA Category';
        gaWrap.appendChild(gaLabel);
        this._inputs.ga = document.createElement('select');
        this._inputs.ga.className = 'ui-input';
        this._inputs.ga.classList.add('as-text-sm');
        this._inputs.ga.style.cssText = 'width: 100%; padding: 5px 6px;';
        gaOpts.forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.ga.appendChild(option);
        });
        this._inputs.ga.value = '-- All --';
        gaWrap.appendChild(this._inputs.ga);

        const statusWrap = document.createElement('div');
        statusWrap.className = 'ui-input-wrapper';
        statusWrap.classList.add('as-mb-2');
        el.appendChild(statusWrap);
        const statusLabel = document.createElement('label');
        statusLabel.className = 'as-ctrl-label';
        statusLabel.textContent = 'Status';
        statusWrap.appendChild(statusLabel);
        this._inputs.status = document.createElement('select');
        this._inputs.status.className = 'ui-input';
        this._inputs.status.classList.add('as-text-sm');
        this._inputs.status.style.cssText = 'width: 100%; padding: 5px 6px;';
        ['all', 'draft', 'submitted', 'verified'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.status.appendChild(option);
        });
        this._inputs.status.value = 'all';
        statusWrap.appendChild(this._inputs.status);

        const btnWrap = document.createElement('div');
        btnWrap.className = 'as-mt-3';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Portfolio', variant: 'primary', size: 'sm', parent: btnWrap,
            icon: '<i class="fas fa-folder-open"></i>',
            onClick: () => {
                this._loadData();
                this._renderDashboard();
                this._renderCoveragePane(this._coverageEl);
                this._renderStatsPane(this._statsEl);
            }
        });
    }

    _renderCoveragePane(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div class="as-cw-student-card-empty">Load data to see coverage</div>';
            return;
        }
        EvidencePortfolioPanel.DEMO_GAS.forEach(ga => {
            const arts = EvidencePortfolioPanel.DEMO_ARTIFACTS.filter(a => a.ga === ga.key);
            const verified = arts.filter(a => a.status === 'verified').length;
            const pct = Math.min(100, Math.round((verified / ga.required) * 100));
            const color = pct >= 100 ? 'var(--ui-green-400)' : pct >= 50 ? 'var(--ui-amber-400)' : 'var(--ui-red-400)';
            const row = document.createElement('div');
            row.style.marginBottom = '0.4rem';
            row.innerHTML = `
                <div class="as-flex-row-between as-cw-student-detail" style="margin-bottom:2px;">
                    <span>${ga.key}</span><span>${verified}/${ga.required}</span>
                </div>
                <div class="as-progress-track as-progress-track-sm">
                    <div class="as-progress-fill" style="width:${pct}%;background:${color};"></div>
                </div>`;
            el.appendChild(row);
        });
    }

    _renderStatsPane(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div class="as-cw-student-card-empty">Load data to see stats</div>';
            return;
        }
        const all = EvidencePortfolioPanel.DEMO_ARTIFACTS;
        const verified = all.filter(a => a.status === 'verified').length;
        const submitted = all.filter(a => a.status === 'submitted').length;
        const draft = all.filter(a => a.status === 'draft').length;
        const totalReq = EvidencePortfolioPanel.DEMO_GAS.reduce((s, g) => s + g.required, 0);
        const completeness = Math.round((verified / totalReq) * 100);

        el.innerHTML = `
            <div class="as-cw-student-detail" style="line-height:1.8;">
                <div>Total Artifacts: <strong style="color:rgba(255,255,255,0.9);">${all.length}</strong></div>
                <div>Verified: <strong class="as-cw-stat-value-green">${verified}</strong></div>
                <div>Submitted: <strong class="as-cw-stat-value-blue">${submitted}</strong></div>
                <div>Draft: <strong class="as-cw-stat-value-orange">${draft}</strong></div>
                <div>Completeness: <strong style="color:${completeness >= 75 ? 'var(--ui-green-400)' : 'var(--ui-amber-400)'};">${completeness}%</strong></div>
            </div>`;
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    _loadData() {
        this._gaFilter = this._inputs.ga ? this._inputs.ga.value : '-- All --';
        this._statusFilter = this._inputs.status ? this._inputs.status.value : 'all';
        this._dataLoaded = true;
        // Populate Publome
        const t = this._publome.table('artifact');
        t.all().forEach(r => t.delete(r.idx));
        EvidencePortfolioPanel.DEMO_ARTIFACTS.forEach(a => {
            t.create({ idx: a.idx, ga: a.ga, title: a.title, type: a.type, status: a.status, date: a.date, course: a.course, size: a.size });
        });
    }

    // ── Stage: Empty ────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.classList.add('as-p-3');

        new uiAlert({
            color: 'info',
            title: 'Evidence Portfolio',
            message: 'Click "Load Portfolio" to view your GA-organized evidence artifacts, upload new evidence, and track portfolio completeness.',
            parent: this._stageEl
        });

        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        kpiRow.classList.add('as-mt-3');
        this._stageEl.appendChild(kpiRow);

        const b = this._binding('artifact');
        b.bindMetric(kpiRow, { compute: recs => recs.length || '\u2014', label: 'Artifacts', icon: 'fas fa-folder-open', color: 'var(--ui-gray-400)' });
        b.bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            return recs.filter(r => r.get('status') === 'verified').length;
        }, label: 'Verified', icon: 'fas fa-check-double', color: 'var(--ui-gray-400)' });
        b.bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            const verified = recs.filter(r => r.get('status') === 'verified').length;
            const totalReq = EvidencePortfolioPanel.DEMO_GAS.reduce((s, g) => s + g.required, 0);
            return Math.round((verified / totalReq) * 100) + '%';
        }, label: 'Complete', icon: 'fas fa-percentage', color: 'var(--ui-gray-400)' });
    }

    // ── Stage: Dashboard ────────────────────────────────────────────────────

    _renderDashboard() {
        const stage = this._stageEl;
        stage.innerHTML = '';
        stage.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-wrap';
        stage.appendChild(wrap);

        // Header
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML =
            '<span class="as-brand-badge">Evidence Portfolio</span>' +
            '<span class="as-panel-subtitle">' + this._getStudentLabel() + '</span>';
        wrap.appendChild(header);

        // Completeness KPIs
        this._renderKPIs(wrap);

        // Upload dropzone (simulated)
        this._renderDropzone(wrap);

        // GA-organized artifact sections
        this._renderArtifacts(wrap);
    }

    _renderKPIs(wrap) {
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        wrap.appendChild(kpiRow);

        const b = this._binding('artifact');
        b.bindMetric(kpiRow, { compute: recs => String(recs.length), label: 'Total Artifacts', icon: 'fas fa-folder', color: '#2563eb' });
        b.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => r.get('status') === 'verified').length), label: 'Verified', icon: 'fas fa-check-double', color: '#059669' });
        b.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => r.get('status') === 'submitted').length), label: 'Submitted', icon: 'fas fa-paper-plane', color: '#0891b2' });
        b.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => r.get('status') === 'draft').length), label: 'Draft', icon: 'fas fa-pen', color: '#d97706' });
        b.bindMetric(kpiRow, { compute: recs => {
            const verified = recs.filter(r => r.get('status') === 'verified').length;
            const totalReq = EvidencePortfolioPanel.DEMO_GAS.reduce((s, g) => s + g.required, 0);
            return Math.round((verified / totalReq) * 100) + '%';
        }, label: 'Portfolio Complete', icon: 'fas fa-percentage', color: '#059669' });
    }

    _renderDropzone(wrap) {
        const zone = document.createElement('div');
        zone.className = 'as-dropzone';
        zone.innerHTML = `
            <i class="fas fa-cloud-upload-alt" style="font-size:1.5rem;color:var(--ui-gray-400);"></i>
            <div class="as-text-sm as-text-bold" style="color:var(--ui-gray-600);margin-top:0.4rem;">Drop files here to upload evidence</div>
            <div class="as-text-xs as-text-muted">Supports PDF, DOCX, PPTX, ZIP, MP4 (max 50 MB)</div>`;
        zone.addEventListener('click', () => {
            zone.innerHTML = `
                <i class="fas fa-check-circle" style="font-size:1.5rem;color:var(--ui-green-600);"></i>
                <div class="as-text-sm as-text-bold" style="color:var(--ui-green-600);margin-top:0.4rem;">Upload simulated!</div>
                <div class="as-text-xs as-text-muted">In production, a file picker would open here.</div>`;
            setTimeout(() => {
                zone.innerHTML = `
                    <i class="fas fa-cloud-upload-alt" style="font-size:1.5rem;color:var(--ui-gray-400);"></i>
                    <div class="as-text-sm as-text-bold" style="color:var(--ui-gray-600);margin-top:0.4rem;">Drop files here to upload evidence</div>
                    <div class="as-text-xs as-text-muted">Supports PDF, DOCX, PPTX, ZIP, MP4 (max 50 MB)</div>`;
            }, 2000);
        });
        wrap.appendChild(zone);
    }

    _renderArtifacts(wrap) {
        // GA Coverage Matrix — central element
        const matrixTitle = document.createElement('div');
        matrixTitle.className = 'ep-section-title';
        matrixTitle.innerHTML = '<i class="fas fa-th" style="margin-right:0.4rem;color:var(--ui-primary-600);"></i>GA Coverage Matrix';
        wrap.appendChild(matrixTitle);

        const table = document.createElement('table');
        table.className = 'ep-ga-matrix';
        wrap.appendChild(table);

        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>GA</th><th>Attribute</th><th>Progress</th><th>Artifacts</th></tr>';
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        const arts = EvidencePortfolioPanel.DEMO_ARTIFACTS;
        EvidencePortfolioPanel.DEMO_GAS.forEach(ga => {
            const gaArts = arts.filter(a => a.ga === ga.key);
            const verified = gaArts.filter(a => a.status === 'verified').length;
            const pct = Math.min(100, Math.round((verified / ga.required) * 100));
            const barColor = pct >= 100 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';

            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td><span class="ep-ga-key">' + ga.key + '</span></td>' +
                '<td><span class="ep-ga-name">' + ga.name + '</span></td>' +
                '<td><div style="display:flex;align-items:center;gap:0.5rem;">' +
                '<div class="ep-ga-bar-track"><div class="ep-ga-bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
                '<span class="sc-meta-value">' + verified + '/' + ga.required + '</span></div></td>' +
                '<td><span class="sc-meta-value">' + gaArts.length + '</span></td>';
            tbody.appendChild(tr);
        });

        // Artifact list below matrix
        const listTitle = document.createElement('div');
        listTitle.className = 'ep-section-title';
        listTitle.innerHTML = '<i class="fas fa-folder-open" style="margin-right:0.4rem;color:var(--ui-primary-600);"></i>Evidence Artifacts';
        wrap.appendChild(listTitle);

        const collWrap = document.createElement('div');
        wrap.appendChild(collWrap);
        const gaFilter = this._gaFilter;
        const statusFilter = this._statusFilter;
        this._binding('artifact').bindCollection(collWrap, {
            component: 'card',
            filter: r => {
                if (gaFilter !== '-- All --' && gaFilter !== r.get('ga')) return false;
                if (statusFilter !== 'all' && r.get('status') !== statusFilter) return false;
                return true;
            },
            map: r => ({
                title: r.get('title'),
                subtitle: r.get('ga') + ' \u00b7 ' + r.get('course') + ' \u00b7 ' + r.get('date'),
                content: r.get('status') + ' \u00b7 ' + r.get('type').toUpperCase() + ' \u00b7 ' + r.get('size')
            })
        });
    }
}
