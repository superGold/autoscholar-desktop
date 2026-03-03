/**
 * ExecPerformancePanel — Pass rates, means, comparisons at all entity levels
 *
 * Layout: uiControlStage — filters in control, charts/tables in stage
 * Stage sub-tabs: Overview | Faculty Breakdown | Programme Breakdown | Trends
 *
 * Usage:
 *   const panel = new ExecPerformancePanel({ publome, engine, year: 2025 });
 *   panel.render(container);
 */
class ExecPerformancePanel {

    constructor(config = {}) {
        this.publome = config.publome;
        this.engine  = config.engine;
        this.year    = config.year || 2025;
        this._container = null;
        this._controlEl = null;
        this._stageEl = null;
        this._entityIdx = null;
        this._subView = 'overview';
    }

    connectBus(bus) {
        this._bus = bus;
        bus.on('entity:selected', (data) => {
            this._entityIdx = data.idx;
            this._refreshStage();
        });
        bus.on('year:changed', (data) => {
            this.year = data.year;
            this.engine.clearCache();
            this._refreshStage();
        });
        return this;
    }

    render(container) {
        this._container = container;
        container.innerHTML = '';

        const cs = new uiControlStage({
            controlSize: 'md',
            template: 'unified',
            parent: container
        });

        this._controlEl = cs.getControlPanel();
        this._stageEl = cs.getStage();

        this._renderControl();
        this._entityIdx = this._entityIdx || this._getInstitutionIdx();
        this._refreshStage();
    }

    // ── Control Panel ────────────────────────────────────────────────

    _renderControl() {
        const el = this._controlEl;
        el.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'ui-control-stage-header';
        header.innerHTML = '<i class="fas fa-chart-bar"></i> Performance';
        el.appendChild(header);

        // Entity label (updates on selection)
        this._entityLabel = document.createElement('div');
        this._entityLabel.className = 'ex-ctrl-entity-label';
        this._entityLabel.textContent = 'Institution';
        el.appendChild(this._entityLabel);

        // Sub-view buttons
        const views = [
            { key: 'overview',   label: 'Overview',    icon: 'th-large' },
            { key: 'faculty',    label: 'Faculties',    icon: 'building' },
            { key: 'programme',  label: 'Programmes',   icon: 'book' },
            { key: 'trends',     label: 'Trends',       icon: 'chart-line' },
            { key: 'cohort',     label: 'Cohort',       icon: 'layer-group' }
        ];

        const nav = document.createElement('div');
        nav.className = 'ex-col-stack';
        for (const v of views) {
            const btn = document.createElement('div');
            btn.className = 'ex-ctrl-nav-btn' + (this._subView === v.key ? ' active' : '');
            btn.innerHTML = `<i class="fas fa-${v.icon}"></i>${v.label}`;
            btn.addEventListener('click', () => {
                this._subView = v.key;
                this._renderControl();
                this._refreshStage();
            });
            nav.appendChild(btn);
        }
        el.appendChild(nav);

        // Update entity label
        if (this._entityIdx) {
            const entity = this.publome.table('entity').read(this._entityIdx);
            if (entity) this._entityLabel.textContent = entity.get('name');
        }
    }

    // ── Stage ────────────────────────────────────────────────────────

    _refreshStage() {
        if (!this._stageEl) return;
        this._stageEl.innerHTML = '';

        const entityIdx = this._entityIdx || this._getInstitutionIdx();
        if (!entityIdx) return;

        // Update control entity label
        const entity = this.publome.table('entity').read(entityIdx);
        if (entity && this._entityLabel) {
            this._entityLabel.textContent = entity.get('name');
        }

        switch (this._subView) {
            case 'overview':   this._renderOverview(entityIdx); break;
            case 'faculty':    this._renderBreakdown(entityIdx, 'faculty'); break;
            case 'programme':  this._renderBreakdown(entityIdx, 'programme'); break;
            case 'trends':     this._renderTrends(entityIdx); break;
            case 'cohort':     this._renderCohort(entityIdx); break;
        }
    }

    _renderOverview(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const kpis = this.engine.getKPIs(entityIdx, this.year);
        const entity = kpis._entity;

        // Title
        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-chart-bar"></i>Performance Overview — ${entity ? entity.name : ''}`;
        wrapper.appendChild(title);

        // KPI cards
        const cardRow = document.createElement('div');
        cardRow.className = 'ex-kpi-row';

        const perfMetrics = ['course-pass-rate', 'course-mean', 'graduation-rate', 'retention-rate'];
        for (const code of perfMetrics) {
            const kpi = kpis[code];
            if (!kpi) continue;

            // Compare against institution baseline
            const instIdx = this._getInstitutionIdx();
            const baseVal = entityIdx !== instIdx ? this.engine.getValue(kpi.metricId, instIdx, this.year) : null;
            const delta = baseVal !== null && kpi.value !== null ? kpi.value - baseVal : null;

            const card = document.createElement('div');
            card.className = 'ex-kpi-card';
            const statusClr = kpi.status === 'success' ? 'var(--ex-clr-success)' : kpi.status === 'warning' ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
            const val = kpi.value !== null ? Math.round(kpi.value) : '—';
            const unit = kpi.unit || '';
            const deltaCls = delta !== null && delta >= 0 ? 'ex-delta ex-delta-up' : 'ex-delta ex-delta-down';
            const deltaHtml = delta !== null ?
                `<span class="${deltaCls}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${unit}</span>` : '';

            card.innerHTML = `
                <div class="ex-kpi-card-label"><span>${kpi.name}</span></div>
                <div class="ex-row">
                    <span class="ex-kpi-value-md">${val}<span class="ex-kpi-unit">${unit}</span></span>
                    ${deltaHtml}
                </div>
                <div class="ex-progress">
                    <div class="ex-progress-fill" style="width:${Math.min(100, (kpi.value / kpi.target) * 100)}%;background:${statusClr};"></div>
                </div>
                <div class="ex-kpi-target">Target: ${kpi.target}${unit} | Benchmark: ${kpi.benchmark}${unit}</div>
            `;
            cardRow.appendChild(card);
        }
        wrapper.appendChild(cardRow);

        // Children summary table
        const children = this.engine.getChildrenSummary(entityIdx, this.year);
        if (children.length > 0) {
            this._renderSummaryTable(wrapper, children, entityIdx);
        }

        // Box plots
        const boxMetrics = ['course-pass-rate', 'course-mean', 'graduation-rate', 'retention-rate'];
        const distributions = boxMetrics.map(code => ({
            code, label: kpis[code]?.name || code,
            dist: this.engine.getDistribution(entityIdx, code, this.year),
            target: kpis[code]?.target, benchmark: kpis[code]?.benchmark
        })).filter(d => d.dist);
        if (distributions.length > 0) {
            const boxTitle = document.createElement('div');
            boxTitle.className = 'ex-section-title';
            boxTitle.textContent = 'Distribution Across Sub-entities';
            wrapper.appendChild(boxTitle);
            this._renderBoxPlot(wrapper, distributions);
        }

        stage.appendChild(wrapper);
    }

    _renderBreakdown(entityIdx, level) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entity = this.publome.table('entity').read(entityIdx);
        const entityType = entity ? entity.get('type') : 'institution';

        // If viewing faculty breakdown from institution, show faculties
        // If viewing programme breakdown, we need to go one level deeper
        let items;
        if (level === 'faculty') {
            // Get all faculties (children of institution)
            const instIdx = this._getInstitutionIdx();
            items = this.engine.getChildrenSummary(instIdx, this.year).filter(c => c.type === 'faculty');
        } else {
            // Get all programmes based on selected entity
            if (entityType === 'institution') {
                // Get faculties, then flatten their programme children
                const faculties = this.engine.getChildren(entityIdx);
                items = [];
                for (const f of faculties) {
                    const progs = this.engine.getChildrenSummary(f.get('idx'), this.year);
                    items.push(...progs);
                }
            } else if (entityType === 'faculty') {
                items = this.engine.getChildrenSummary(entityIdx, this.year);
            } else {
                items = []; // Programme has no children
            }
        }

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-${level === 'faculty' ? 'building' : 'book'}"></i>${level === 'faculty' ? 'Faculty' : 'Programme'} Breakdown`;
        wrapper.appendChild(title);

        if (items.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><div class="ex-empty-msg">No data at this level</div></div>';
        } else {
            this._renderSummaryTable(wrapper, items, entityIdx);
        }

        stage.appendChild(wrapper);
    }

    _renderTrends(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-chart-line"></i>Year-over-Year Trends';
        wrapper.appendChild(title);

        const years = this.engine.getYears();
        const metricTable = this.publome.table('metric');
        const trendMetrics = metricTable.all().filter(m =>
            ['course-pass-rate', 'course-mean', 'graduation-rate', 'retention-rate'].includes(m.get('code'))
        );

        for (const m of trendMetrics) {
            const trend = this.engine.getTrend(m.get('idx'), entityIdx, years);
            const card = document.createElement('div');
            card.className = 'ex-chart-card';

            const target = m.get('target');
            const maxVal = Math.max(target, ...trend.map(t => t.value || 0)) * 1.1;

            const benchmark = m.get('benchmark');
            const chartH = 80;
            const chartW = trend.length * 50;
            const vals = trend.map(t => t.value).filter(v => v != null);
            const minV = Math.min(...vals, target, benchmark || Infinity) * 0.9;
            const rangeV = maxVal - minV || 1;
            const yPos = (v) => chartH - ((v - minV) / rangeV) * chartH;

            // SVG line chart with target + benchmark reference lines
            const points = trend.map((t, i) => {
                if (t.value == null) return null;
                const x = (i + 0.5) * (chartW / trend.length);
                return { x, y: yPos(t.value), val: t.value };
            }).filter(Boolean);
            const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
            const dots = points.map(p => {
                const clr = p.val >= target ? 'var(--ex-clr-success)' : p.val >= benchmark ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
                return `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${clr}"/><text x="${p.x}" y="${p.y - 6}" text-anchor="middle" font-size="7" fill="var(--ui-gray-700)" font-weight="600">${Math.round(p.val)}</text>`;
            }).join('');
            const labels = trend.map((t, i) => `<text x="${(i + 0.5) * (chartW / trend.length)}" y="${chartH + 12}" text-anchor="middle" font-size="7" fill="var(--ui-gray-400)">${t.year}</text>`).join('');
            const targetY = yPos(target);
            const bmkY = yPos(benchmark);

            card.innerHTML = `
                <div class="ex-chart-header">
                    <span class="ex-chart-title">${m.get('name')}</span>
                    <div class="ex-row">
                        <span class="ex-chart-legend">
                            <span><span class="ex-legend-swatch-dashed" style="border-color:var(--ex-clr-success);"></span>Target: ${target}</span>
                            <span><span class="ex-legend-swatch-dashed" style="border-color:var(--ex-clr-warning);"></span>Bench: ${benchmark}</span>
                        </span>
                        <span class="ex-chart-export" title="Export as PNG"><i class="fas fa-camera"></i></span>
                    </div>
                </div>
                <svg width="${chartW}" height="${chartH + 16}" viewBox="0 0 ${chartW} ${chartH + 16}" style="width:100%;max-width:${chartW}px;">
                    <line x1="0" y1="${targetY}" x2="${chartW}" y2="${targetY}" stroke="var(--ex-clr-success)" stroke-width="0.7" stroke-dasharray="4,3"/>
                    <line x1="0" y1="${bmkY}" x2="${chartW}" y2="${bmkY}" stroke="var(--ex-clr-warning)" stroke-width="0.7" stroke-dasharray="2,2"/>
                    <polyline points="${polyline}" fill="none" stroke="var(--ex-clr-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    ${dots}${labels}
                </svg>
            `;
            // Bind export
            const exportBtn = card.querySelector('.ex-chart-export');
            if (exportBtn) {
                const svg = card.querySelector('svg');
                exportBtn.addEventListener('click', () => this._exportSvgAsPng(svg, `${m.get('code')}_trend.png`));
            }
            wrapper.appendChild(card);
        }

        stage.appendChild(wrapper);
    }

    // ── Shared Components ────────────────────────────────────────────

    _renderSummaryTable(parent, items, contextIdx) {
        const instIdx = this._getInstitutionIdx();
        const instKpis = this.engine.getKPIs(instIdx, this.year);

        const table = document.createElement('table');
        table.className = 'ex-table';

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th class="right">Students</th>
                    <th class="right">Pass Rate</th>
                    <th class="right">\u0394 Inst</th>
                    <th class="right">Mean</th>
                    <th class="right">\u0394 Inst</th>
                    <th class="right">Grad Rate</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(c => {
                    const pr = c['course-pass-rate'];
                    const mean = c['course-mean'];
                    const grad = c['graduation-rate'];
                    const instPr = instKpis['course-pass-rate']?.value;
                    const instMean = instKpis['course-mean']?.value;
                    const prDelta = pr != null && instPr != null ? pr - instPr : null;
                    const meanDelta = mean != null && instMean != null ? mean - instMean : null;

                    const sig = ExecMetrics.isSignificant(pr, instPr, c.students, instKpis._entity?.students || 100);
                    const sigHtml = sig.significant ? `<i class="fas fa-star ex-clr-warning ex-sig-star" title="z=${sig.zScore}"></i>` : '';
                    const prDeltaClr = prDelta != null && prDelta >= 0 ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)';
                    const mnDeltaClr = meanDelta != null && meanDelta >= 0 ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)';
                    return `<tr>
                        <td class="bold">${c.name}</td>
                        <td class="right">${c.students}</td>
                        <td class="right emphasis" style="color:${this._valColor(pr, 70, 60)};">${pr != null ? Math.round(pr) + '%' : '—'}</td>
                        <td class="right small" style="color:${prDeltaClr};">${prDelta != null ? (prDelta >= 0 ? '+' : '') + prDelta.toFixed(1) : '—'} ${sigHtml}</td>
                        <td class="right emphasis" style="color:${this._valColor(mean, 60, 50)};">${mean != null ? Math.round(mean) + '%' : '—'}</td>
                        <td class="right small" style="color:${mnDeltaClr};">${meanDelta != null ? (meanDelta >= 0 ? '+' : '') + meanDelta.toFixed(1) : '—'}</td>
                        <td class="right emphasis" style="color:${this._valColor(grad, 75, 65)};">${grad != null ? Math.round(grad) + '%' : '—'}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        `;

        parent.appendChild(table);
    }

    // ── Cohort View ──────────────────────────────────────────────────

    _renderCohort(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entity = this.publome.table('entity').read(entityIdx);
        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-layer-group"></i>Cohort Tracking — ${entity ? entity.get('name') : ''}`;
        wrapper.appendChild(title);

        const years = this.engine.getYears();
        const metricTable = this.publome.table('metric');
        const prMetric = metricTable.all().find(m => m.get('code') === 'course-pass-rate');
        const mnMetric = metricTable.all().find(m => m.get('code') === 'course-mean');
        if (!prMetric || !mnMetric) { stage.appendChild(wrapper); return; }

        const prTarget = prMetric.get('target'), prBench = prMetric.get('benchmark');
        const mnTarget = mnMetric.get('target'), mnBench = mnMetric.get('benchmark');

        // SVG line chart for pass rate and mean
        const chartW = 300, chartH = 140;
        const prTrend = this.engine.getTrend(prMetric.get('idx'), entityIdx, years);
        const mnTrend = this.engine.getTrend(mnMetric.get('idx'), entityIdx, years);
        const allVals = [...prTrend.map(t => t.value), ...mnTrend.map(t => t.value), prTarget, prBench, mnTarget, mnBench].filter(v => v != null);
        const minV = Math.min(...allVals) * 0.9, maxV = Math.max(...allVals) * 1.05;
        const range = maxV - minV || 1;
        const yPos = (v) => chartH - ((v - minV) / range) * chartH;

        const makePolyline = (trend) => trend.map((t, i) => {
            if (t.value == null) return null;
            return `${(i + 0.5) * (chartW / trend.length)},${yPos(t.value)}`;
        }).filter(Boolean).join(' ');

        const prPoly = makePolyline(prTrend);
        const mnPoly = makePolyline(mnTrend);

        const chartEl = document.createElement('div');
        chartEl.className = 'ex-chart-card';
        const labels = years.map((y, i) => `<text x="${(i + 0.5) * (chartW / years.length)}" y="${chartH + 14}" text-anchor="middle" font-size="8" fill="var(--ui-gray-400)">${y}</text>`).join('');
        chartEl.innerHTML = `
            <div class="ex-chart-header">
                <span class="ex-chart-subtitle">Pass Rate & Mean Trend</span>
                <span class="ex-chart-export" title="Export as PNG"><i class="fas fa-camera"></i></span>
            </div>
            <svg width="${chartW}" height="${chartH + 20}" viewBox="0 0 ${chartW} ${chartH + 20}" style="width:100%;">
                <line x1="0" y1="${yPos(prTarget)}" x2="${chartW}" y2="${yPos(prTarget)}" stroke="var(--ex-clr-success)" stroke-width="0.5" stroke-dasharray="4,3"/>
                <line x1="0" y1="${yPos(mnTarget)}" x2="${chartW}" y2="${yPos(mnTarget)}" stroke="var(--ex-clr-warning)" stroke-width="0.5" stroke-dasharray="2,2"/>
                <polyline points="${prPoly}" fill="none" stroke="var(--ex-clr-primary)" stroke-width="2" stroke-linecap="round"/>
                <polyline points="${mnPoly}" fill="none" stroke="var(--ex-clr-purple)" stroke-width="2" stroke-linecap="round"/>
                ${labels}
            </svg>
            <div class="ex-chart-legend">
                <span><span class="ex-legend-swatch-line" style="border-color:var(--ex-clr-primary);"></span>Pass Rate</span>
                <span><span class="ex-legend-swatch-line" style="border-color:var(--ex-clr-purple);"></span>Mean</span>
                <span><span class="ex-legend-swatch-dashed" style="border-color:var(--ex-clr-success);"></span>Target</span>
            </div>
        `;
        const exportBtn = chartEl.querySelector('.ex-chart-export');
        const svg = chartEl.querySelector('svg');
        if (exportBtn && svg) exportBtn.addEventListener('click', () => this._exportSvgAsPng(svg, 'cohort_trend.png'));
        wrapper.appendChild(chartEl);

        // Summary table
        const tableData = years.map(y => {
            const pr = this.engine.getValue(prMetric.get('idx'), entityIdx, y);
            const mn = this.engine.getValue(mnMetric.get('idx'), entityIdx, y);
            const oldestYear = years[years.length - 1];
            const prevPr = y > oldestYear ? this.engine.getValue(prMetric.get('idx'), entityIdx, y - 1) : null;
            const prevMn = y > oldestYear ? this.engine.getValue(mnMetric.get('idx'), entityIdx, y - 1) : null;
            return { year: y, pr, mn, deltaPr: prevPr != null && pr != null ? pr - prevPr : null, deltaMn: prevMn != null && mn != null ? mn - prevMn : null };
        });

        const table = document.createElement('table');
        table.className = 'ex-table';
        table.innerHTML = `
            <thead><tr>
                <th>Year</th>
                <th class="right">Pass Rate</th>
                <th class="right">\u0394 Prev</th>
                <th class="right">Mean</th>
                <th class="right">\u0394 Prev</th>
            </tr></thead>
            <tbody>${tableData.map(d => {
                const prDeltaClr = d.deltaPr != null && d.deltaPr >= 0 ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)';
                const mnDeltaClr = d.deltaMn != null && d.deltaMn >= 0 ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)';
                return `<tr>
                <td class="emphasis">${d.year}</td>
                <td class="right emphasis" style="color:${this._valColor(d.pr, 70, 60)};">${d.pr != null ? Math.round(d.pr) + '%' : '\u2014'}</td>
                <td class="right small" style="color:${prDeltaClr};">${d.deltaPr != null ? (d.deltaPr >= 0 ? '+' : '') + d.deltaPr.toFixed(1) : '\u2014'}</td>
                <td class="right emphasis" style="color:${this._valColor(d.mn, 60, 50)};">${d.mn != null ? Math.round(d.mn) + '%' : '\u2014'}</td>
                <td class="right small" style="color:${mnDeltaClr};">${d.deltaMn != null ? (d.deltaMn >= 0 ? '+' : '') + d.deltaMn.toFixed(1) : '\u2014'}</td>
            </tr>`}).join('')}</tbody>
        `;
        wrapper.appendChild(table);
        stage.appendChild(wrapper);
    }

    // ── Box Plot ───────────────────────────────────────────────────

    _renderBoxPlot(parent, datasets) {
        const w = 280, rowH = 30, pad = 80;
        const h = datasets.length * rowH + 10;
        const allVals = datasets.flatMap(d => [d.dist.min, d.dist.max, d.target, d.benchmark]).filter(v => v != null);
        const minV = Math.min(...allVals) * 0.9, maxV = Math.max(...allVals) * 1.05;
        const range = maxV - minV || 1;
        const xPos = (v) => pad + ((v - minV) / range) * (w - pad - 10);

        let svgContent = '';
        for (let i = 0; i < datasets.length; i++) {
            const d = datasets[i].dist;
            const y = i * rowH + rowH / 2 + 5;
            const x1 = xPos(d.min), xq1 = xPos(d.q1), xm = xPos(d.median), xq3 = xPos(d.q3), x2 = xPos(d.max);
            // Whiskers
            svgContent += `<line x1="${x1}" y1="${y}" x2="${xq1}" y2="${y}" stroke="var(--ui-gray-400)" stroke-width="1"/>`;
            svgContent += `<line x1="${xq3}" y1="${y}" x2="${x2}" y2="${y}" stroke="var(--ui-gray-400)" stroke-width="1"/>`;
            svgContent += `<line x1="${x1}" y1="${y - 5}" x2="${x1}" y2="${y + 5}" stroke="var(--ui-gray-400)" stroke-width="1"/>`;
            svgContent += `<line x1="${x2}" y1="${y - 5}" x2="${x2}" y2="${y + 5}" stroke="var(--ui-gray-400)" stroke-width="1"/>`;
            // Box
            svgContent += `<rect x="${xq1}" y="${y - 8}" width="${xq3 - xq1}" height="16" fill="var(--ex-clr-primary)" fill-opacity="0.12" stroke="var(--ex-clr-primary)" stroke-width="1" rx="2"/>`;
            // Median
            svgContent += `<line x1="${xm}" y1="${y - 8}" x2="${xm}" y2="${y + 8}" stroke="var(--ex-clr-primary)" stroke-width="2"/>`;
            // Target marker
            if (datasets[i].target != null) {
                const xt = xPos(datasets[i].target);
                svgContent += `<line x1="${xt}" y1="${y - 10}" x2="${xt}" y2="${y + 10}" stroke="var(--ex-clr-success)" stroke-width="1" stroke-dasharray="2,2"/>`;
            }
            // Label
            svgContent += `<text x="${pad - 5}" y="${y + 3}" text-anchor="end" font-size="8" fill="var(--ui-gray-700)">${datasets[i].label}</text>`;
        }

        const container = document.createElement('div');
        container.className = 'ex-chart-card';
        container.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;">${svgContent}</svg>`;
        parent.appendChild(container);
    }

    // ── Chart Export ────────────────────────────────────────────────

    _exportSvgAsPng(svgEl, filename) {
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svgEl);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = svgEl.viewBox.baseVal.width * 2;
            canvas.height = svgEl.viewBox.baseVal.height * 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    // ── Helpers ──────────────────────────────────────────────────────

    _getInstitutionIdx() {
        const inst = this.publome.table('entity').all().find(e => e.get('type') === 'institution');
        return inst ? inst.get('idx') : null;
    }

    _valColor(val, good, ok) { return ExecMetrics.valColor(val, good, ok); }
}
