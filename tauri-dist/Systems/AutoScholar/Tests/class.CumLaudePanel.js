/**
 * CumLaudePanel - Class-of-pass projection & what-if scenarios
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Self-contained demo data — current weighted GPA, what-if calculator,
 * per-course targets for desired class of pass.
 *
 * Usage:
 *   const panel = new CumLaudePanel();
 *   panel.render(controlEl, stageEl);
 */
class CumLaudePanel {

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

    static COMPLETED_COURSES = [
        { code: 'ITPR101', name: 'Programming 1A', credits: 20, mark: 71 },
        { code: 'MATH101', name: 'Mathematics 1', credits: 15, mark: 55 },
        { code: 'COMM101', name: 'Communication Skills', credits: 10, mark: 68 },
        { code: 'LIFE101', name: 'Life Skills', credits: 5, mark: 72 },
        { code: 'ITPR102', name: 'Programming 1B', credits: 20, mark: 74 },
        { code: 'ITWB101', name: 'Web Development 1', credits: 20, mark: 82 },
        { code: 'ITDB101', name: 'Database Fundamentals', credits: 20, mark: 65 },
        { code: 'ITNT101', name: 'Networking 1', credits: 10, mark: 60 }
    ];

    static REMAINING_COURSES = [
        { code: 'ITSD201', name: 'Software Development 2', credits: 20, currentMark: 67 },
        { code: 'ITDA201', name: 'Data Structures', credits: 20, currentMark: 58 },
        { code: 'MATH201', name: 'Mathematics 2', credits: 15, currentMark: 48 },
        { code: 'ITSD202', name: 'Software Development 2B', credits: 20, currentMark: null },
        { code: 'ITWB201', name: 'Web Development 2', credits: 20, currentMark: null },
        { code: 'ITDB201', name: 'Database Design', credits: 20, currentMark: null },
        { code: 'ITSD301', name: 'Software Dev 3A', credits: 20, currentMark: null },
        { code: 'ITPM301', name: 'Project Management', credits: 15, currentMark: null },
        { code: 'ITEN301', name: 'Entrepreneurship', credits: 10, currentMark: null },
        { code: 'ITSD302', name: 'Software Dev 3B', credits: 20, currentMark: null },
        { code: 'ITCP301', name: 'Capstone Project', credits: 30, currentMark: null },
        { code: 'ITWO301', name: 'WIL / Industry', credits: 30, currentMark: null }
    ];

    static CLASS_OF_PASS = [
        { key: 'summa', label: 'Summa Cum Laude', min: 85, color: '#7c3aed', icon: 'fa-crown' },
        { key: 'magna', label: 'Magna Cum Laude', min: 75, color: '#059669', icon: 'fa-star' },
        { key: 'cum',   label: 'Cum Laude', min: 70, color: '#0891b2', icon: 'fa-award' },
        { key: 'merit', label: 'Merit Pass', min: 60, color: '#2563eb', icon: 'fa-medal' },
        { key: 'pass',  label: 'Pass', min: 50, color: '#d97706', icon: 'fa-check' },
        { key: 'fail',  label: 'Below Pass', min: 0, color: '#dc2626', icon: 'fa-times' }
    ];

    static HISTORICAL_DIST = [
        { classKey: 'summa', pct: 2 }, { classKey: 'magna', pct: 8 }, { classKey: 'cum', pct: 15 },
        { classKey: 'merit', pct: 30 }, { classKey: 'pass', pct: 35 }, { classKey: 'fail', pct: 10 }
    ];

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._dataLoaded = false;
        this._targetGpa = 75;
        this._whatIfMark = 65;
        this._inputs = {};
        this._initPublome();
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [{
                name: 'completedCourse',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    code: { type: 'string', label: 'Code' },
                    name: { type: 'string', label: 'Course' },
                    credits: { type: 'number', label: 'Credits' },
                    mark: { type: 'number', label: 'Mark' }
                },
                labeller: '{code}',
                selectionMode: 'single'
            }, {
                name: 'remainingCourse',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    code: { type: 'string', label: 'Code' },
                    name: { type: 'string', label: 'Course' },
                    credits: { type: 'number', label: 'Credits' },
                    currentMark: { type: 'number', label: 'Current Mark' }
                },
                labeller: '{code}',
                selectionMode: 'single'
            }, {
                name: 'historicalDist',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    classKey: { type: 'string', label: 'Class' },
                    pct: { type: 'number', label: 'Percentage' }
                },
                labeller: '{classKey}',
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
            classes: { label: '<i class="fas fa-award" style="margin-right:0.3rem;"></i>Class Thresholds' },
            stats: { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Quick Stats' }
        };

        const accordion = new uiAccordion({ exclusive: true, content, parent: el });

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsPane(paramsEl);

        const classesEl = accordion.el.querySelector('.ui-accordion-item[data-key="classes"] .ui-accordion-content');
        this._renderClassesPane(classesEl);

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
        ['ND: Information Technology'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.programme.appendChild(option);
        });
        this._inputs.programme.value = 'ND: Information Technology';
        progWrap.appendChild(this._inputs.programme);

        this._inputs.targetGpa = new uiInput({
            template: 'inline-label', label: 'Target GPA %', size: 'sm',
            value: '75', inputType: 'number', parent: el
        });

        const btnWrap = document.createElement('div');
        btnWrap.className = 'as-ctrl-btn-wrap';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Calculate', variant: 'primary', size: 'sm', parent: btnWrap,
            icon: '<i class="fas fa-calculator"></i>',
            onClick: () => {
                const inp = this._inputs.targetGpa?.el?.querySelector('input');
                if (inp) this._targetGpa = parseInt(inp.value, 10) || 75;
                this._dataLoaded = true;
                this._renderDashboard();
                this._renderStatsPane(this._statsEl);
            }
        });
    }

    _renderClassesPane(el) {
        el.innerHTML = '';
        CumLaudePanel.CLASS_OF_PASS.forEach(c => {
            if (c.key === 'fail') return;
            const row = document.createElement('div');
            row.className = 'cl-threshold-item';
            row.innerHTML = `<i class="fas ${c.icon} cl-threshold-icon" style="color:${c.color};"></i><span class="cl-threshold-label">${c.label}</span><span class="cl-threshold-value" style="color:${c.color};">${c.min}%+</span>`;
            el.appendChild(row);
        });
    }

    _renderStatsPane(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div class="as-ctrl-stats-hint">Click Calculate to see stats</div>';
            return;
        }
        const currentGpa = this._calcCurrentGpa();
        const classOf = this._getClassOfPass(currentGpa);
        el.innerHTML = `
            <div class="as-ctrl-stats-text">
                <div>Current GPA: <strong style="color:${classOf.color};">${currentGpa.toFixed(1)}%</strong></div>
                <div>Class: <strong style="color:${classOf.color};">${classOf.label}</strong></div>
                <div>Target: <strong>${this._targetGpa}%</strong></div>
                <div>Credits Done: <strong>${CumLaudePanel.COMPLETED_COURSES.reduce((s, c) => s + c.credits, 0)}</strong></div>
                <div>Credits Remaining: <strong>${CumLaudePanel.REMAINING_COURSES.reduce((s, c) => s + c.credits, 0)}</strong></div>
            </div>`;
    }

    // ── Calculations ────────────────────────────────────────────────────────

    _calcCurrentGpa() {
        const completed = CumLaudePanel.COMPLETED_COURSES;
        const totalCredits = completed.reduce((s, c) => s + c.credits, 0);
        const wSum = completed.reduce((s, c) => s + c.mark * c.credits, 0);
        return totalCredits > 0 ? wSum / totalCredits : 0;
    }

    _getClassOfPass(gpa) {
        return CumLaudePanel.CLASS_OF_PASS.find(c => gpa >= c.min) || CumLaudePanel.CLASS_OF_PASS[5];
    }

    _calcRequiredAvgForTarget(target) {
        const completed = CumLaudePanel.COMPLETED_COURSES;
        const doneCredits = completed.reduce((s, c) => s + c.credits, 0);
        const doneWSum = completed.reduce((s, c) => s + c.mark * c.credits, 0);
        const remCredits = CumLaudePanel.REMAINING_COURSES.reduce((s, c) => s + c.credits, 0);
        const totalCredits = doneCredits + remCredits;
        const needed = (target * totalCredits - doneWSum) / remCredits;
        return Math.max(0, Math.min(100, needed));
    }

    // ── Stage: Empty ────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        new uiAlert({
            color: 'info',
            title: 'Cum Laude Tracker',
            message: 'Set your target GPA and click "Calculate" to see your current class-of-pass projection, what-if scenarios, and per-course targets.',
            parent: this._stageEl
        });

        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        this._stageEl.appendChild(kpiRow);

        const b = this._binding('completedCourse');
        b.bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            const tc = recs.reduce((s, r) => s + r.get('credits'), 0);
            const ws = recs.reduce((s, r) => s + r.get('mark') * r.get('credits'), 0);
            return tc > 0 ? (ws / tc).toFixed(1) + '%' : '\u2014';
        }, label: 'Current GPA', icon: 'fas fa-graduation-cap', color: 'var(--ui-gray-400)' });
        b.bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            const tc = recs.reduce((s, r) => s + r.get('credits'), 0);
            const ws = recs.reduce((s, r) => s + r.get('mark') * r.get('credits'), 0);
            const gpa = tc > 0 ? ws / tc : 0;
            const classes = CumLaudePanel.CLASS_OF_PASS;
            const cls = classes.find(c => gpa >= c.min) || classes[5];
            return cls.label;
        }, label: 'Class of Pass', icon: 'fas fa-award', color: 'var(--ui-gray-400)' });
    }

    // ── Stage: Dashboard ────────────────────────────────────────────────────

    _renderDashboard() {
        const stage = this._stageEl;
        stage.innerHTML = '';
        stage.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-wrap';
        stage.appendChild(wrap);

        const currentGpa = this._calcCurrentGpa();
        const classOf = this._getClassOfPass(currentGpa);
        const requiredAvg = this._calcRequiredAvgForTarget(this._targetGpa);
        const targetClass = this._getClassOfPass(this._targetGpa);

        // Populate Publome
        const ct = this._publome.table('completedCourse');
        ct.all().forEach(r => ct.delete(r.idx));
        CumLaudePanel.COMPLETED_COURSES.forEach((c, i) => {
            ct.create({ idx: i + 1, code: c.code, name: c.name, credits: c.credits, mark: c.mark });
        });
        const rt = this._publome.table('remainingCourse');
        rt.all().forEach(r => rt.delete(r.idx));
        CumLaudePanel.REMAINING_COURSES.forEach((c, i) => {
            rt.create({ idx: i + 1, code: c.code, name: c.name, credits: c.credits, currentMark: c.currentMark || 0 });
        });
        const ht = this._publome.table('historicalDist');
        ht.all().forEach(r => ht.delete(r.idx));
        CumLaudePanel.HISTORICAL_DIST.forEach((d, i) => {
            ht.create({ idx: i + 1, classKey: d.classKey, pct: d.pct });
        });

        // Header
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML = `
            <span class="as-brand-badge">ND: Information Technology</span>
            <span class="as-panel-subtitle">Naledi Dlamini — 220102</span>`;
        wrap.appendChild(header);

        // GPA Gauge — semicircular arc as central element
        const gaugeWrap = document.createElement('div');
        gaugeWrap.className = 'cl-gauge-wrap';
        wrap.appendChild(gaugeWrap);

        const gaugeAngle = (currentGpa / 100) * 180;
        const arcRadius = 80;
        const arcCx = 110;
        const arcCy = 110;
        const startX = arcCx - arcRadius;
        const startY = arcCy;
        const endRad = (180 - gaugeAngle) * Math.PI / 180;
        const endX = arcCx + arcRadius * Math.cos(endRad);
        const endY = arcCy - arcRadius * Math.sin(endRad);
        const largeArc = gaugeAngle > 180 ? 1 : 0;

        // Needle endpoint
        const needleRad = (180 - gaugeAngle) * Math.PI / 180;
        const needleLen = arcRadius - 10;
        const needleX = arcCx + needleLen * Math.cos(needleRad);
        const needleY = arcCy - needleLen * Math.sin(needleRad);

        const gaugeSvg = document.createElement('div');
        gaugeSvg.className = 'cl-gauge-svg';
        gaugeSvg.innerHTML =
            '<svg viewBox="0 0 220 130" style="width:100%;height:100%;">' +
            '<path d="M ' + (arcCx - arcRadius) + ' ' + arcCy + ' A ' + arcRadius + ' ' + arcRadius + ' 0 0 1 ' + (arcCx + arcRadius) + ' ' + arcCy + '" fill="none" stroke="var(--ui-gray-200)" stroke-width="10" stroke-linecap="round"/>' +
            '<path d="M ' + startX + ' ' + startY + ' A ' + arcRadius + ' ' + arcRadius + ' 0 ' + largeArc + ' 1 ' + endX.toFixed(1) + ' ' + endY.toFixed(1) + '" fill="none" stroke="' + classOf.color + '" stroke-width="10" stroke-linecap="round"/>' +
            '<line x1="' + arcCx + '" y1="' + arcCy + '" x2="' + needleX.toFixed(1) + '" y2="' + needleY.toFixed(1) + '" stroke="var(--ui-gray-700)" stroke-width="2" stroke-linecap="round"/>' +
            '<circle cx="' + arcCx + '" cy="' + arcCy + '" r="4" fill="var(--ui-gray-700)"/>' +
            '<text x="' + arcCx + '" y="' + (arcCy - 15) + '" text-anchor="middle" style="font-size:22px;font-weight:800;fill:' + classOf.color + ';">' + currentGpa.toFixed(1) + '%</text>' +
            '<text x="' + arcCx + '" y="' + (arcCy - 1) + '" text-anchor="middle" style="font-size:11px;font-weight:600;fill:' + classOf.color + ';">' + classOf.label + '</text>' +
            '<text x="' + (arcCx - arcRadius + 5) + '" y="' + (arcCy + 16) + '" text-anchor="start" style="font-size:9px;fill:var(--ui-gray-400);">0%</text>' +
            '<text x="' + (arcCx + arcRadius - 5) + '" y="' + (arcCy + 16) + '" text-anchor="end" style="font-size:9px;fill:var(--ui-gray-400);">100%</text>' +
            '</svg>';
        gaugeWrap.appendChild(gaugeSvg);

        // Summary row below gauge
        const gpaCard = document.createElement('div');
        gpaCard.className = 'cl-gpa-card';
        gpaCard.style.cssText = 'background:' + classOf.color + '10;border:2px solid ' + classOf.color + '40;';
        gpaCard.innerHTML =
            '<div>' +
            '<div class="cl-gpa-value" style="color:' + classOf.color + ';">' + currentGpa.toFixed(1) + '%</div>' +
            '<div class="cl-gpa-label">Current Weighted GPA</div></div>' +
            '<div>' +
            '<div class="cl-class-badge" style="background:' + classOf.color + '20;"><i class="fas ' + classOf.icon + '" style="color:' + classOf.color + ';"></i><span class="cl-class-badge-label" style="color:' + classOf.color + ';">' + classOf.label + '</span></div>' +
            '<div class="as-kpi-sub">Current Projection</div></div>' +
            '<div class="cl-gpa-card-end">' +
            '<div class="cl-required-avg" style="color:' + targetClass.color + ';">' + requiredAvg.toFixed(1) + '%</div>' +
            '<div class="cl-required-avg-label">Avg needed for ' + targetClass.label + '</div></div>';
        wrap.appendChild(gpaCard);

        // What-if slider
        this._renderWhatIf(wrap);

        // Per-course target table
        this._renderTargetTable(wrap);

        // Historical distribution
        this._renderHistorical(wrap);
    }

    _renderWhatIf(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'cl-section-title';
        secTitle.innerHTML = '<i class="fas fa-sliders-h"></i>What-If Calculator';
        wrap.appendChild(secTitle);

        const container = document.createElement('div');
        container.className = 'cl-whatif-card';
        wrap.appendChild(container);

        const label = document.createElement('div');
        label.className = 'cl-whatif-label';
        label.textContent = 'If I average this mark on all remaining courses:';
        container.appendChild(label);

        const sliderRow = document.createElement('div');
        sliderRow.className = 'cl-whatif-slider-row';
        container.appendChild(sliderRow);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '30';
        slider.max = '100';
        slider.value = String(this._whatIfMark);
        slider.className = 'as-flex-1';
        sliderRow.appendChild(slider);

        const valLabel = document.createElement('span');
        valLabel.className = 'cl-whatif-value';
        valLabel.textContent = `${this._whatIfMark}%`;
        sliderRow.appendChild(valLabel);

        const resultEl = document.createElement('div');
        resultEl.className = 'cl-whatif-result';
        container.appendChild(resultEl);

        const updateResult = () => {
            const val = parseInt(slider.value, 10);
            valLabel.textContent = `${val}%`;

            const completed = CumLaudePanel.COMPLETED_COURSES;
            const doneCredits = completed.reduce((s, c) => s + c.credits, 0);
            const doneWSum = completed.reduce((s, c) => s + c.mark * c.credits, 0);
            const remCredits = CumLaudePanel.REMAINING_COURSES.reduce((s, c) => s + c.credits, 0);
            const projectedGpa = (doneWSum + val * remCredits) / (doneCredits + remCredits);
            const projClass = this._getClassOfPass(projectedGpa);

            resultEl.innerHTML = `
                <div class="cl-whatif-result-row">
                    <div class="cl-whatif-result-label">Projected GPA:</div>
                    <span class="cl-whatif-projected" style="color:${projClass.color};">${projectedGpa.toFixed(1)}%</span>
                    <span class="cl-whatif-badge" style="background:${projClass.color}20;color:${projClass.color};"><i class="fas ${projClass.icon}"></i>${projClass.label}</span>
                </div>`;
        };

        slider.addEventListener('input', updateResult);
        updateResult();
    }

    _renderTargetTable(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'cl-section-title';
        secTitle.innerHTML = '<i class="fas fa-bullseye"></i>Per-Course Targets for ' + this._getClassOfPass(this._targetGpa).label;
        wrap.appendChild(secTitle);

        const collWrap = document.createElement('div');
        wrap.appendChild(collWrap);
        const requiredAvg = this._calcRequiredAvgForTarget(this._targetGpa);
        this._binding('remainingCourse').bindCollection(collWrap, {
            component: 'card',
            map: r => {
                const target = Math.round(requiredAvg);
                const cm = r.get('currentMark');
                const gap = cm > 0 ? target - cm : null;
                const gapText = gap !== null ? (gap <= 0 ? 'On Track' : '+' + gap + '%') : '\u2014';
                return {
                    title: r.get('code') + ' \u2014 ' + r.get('name'),
                    subtitle: r.get('credits') + ' cr \u00b7 Current: ' + (cm > 0 ? cm + '%' : '\u2014') + ' \u00b7 Target: ' + target + '%',
                    content: 'Gap: ' + gapText
                };
            }
        });
    }

    _renderHistorical(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'cl-section-title';
        secTitle.innerHTML = '<i class="fas fa-chart-bar"></i>Historical Class-of-Pass Distribution';
        wrap.appendChild(secTitle);

        const collWrap = document.createElement('div');
        wrap.appendChild(collWrap);
        this._binding('historicalDist').bindCollection(collWrap, {
            component: 'card',
            map: r => {
                const classInfo = CumLaudePanel.CLASS_OF_PASS.find(c => c.key === r.get('classKey'));
                return {
                    title: classInfo ? classInfo.label : r.get('classKey'),
                    subtitle: r.get('pct') + '% of graduates',
                    content: ''
                };
            }
        });
    }
}
