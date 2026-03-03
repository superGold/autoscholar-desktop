/**
 * ExecSummaryPanel — KPI dashboard + executive summary
 *
 * Full-width dashboard with:
 *   - Top row: 6 KPI stat boxes using bindMetric
 *   - Middle: Category metrics overview with status badges
 *   - Bottom: Quick action buttons and recent notes
 *
 * Usage:
 *   const panel = new ExecSummaryPanel({ publome, engine, year: 2025 });
 *   panel.render(container);
 */
class ExecSummaryPanel {

    // Map KPI codes to their detail tabs for drill-through navigation
    static KPI_TAB_MAP = {
        'course-pass-rate': 'hierarchy', 'course-mean': 'performance',
        'graduation-rate': 'students', 'retention-rate': 'students',
        'student-staff-ratio': 'counts', 'stakeholder-satisfaction': 'strategy',
        'programme-accreditation': 'strategy', 'audit-completion': 'strategy',
        'teaching-evaluation': 'performance', 'curriculum-currency': 'strategy',
        'research-output': 'strategy', 'grant-success': 'strategy'
    };

    constructor(config = {}) {
        this.publome    = config.publome;
        this.engine     = config.engine;  // ExecMetrics instance
        this.year       = config.year || 2025;
        this.bridge     = config.bridge || null;  // ExecServiceBridge
        this.exception  = config.exceptionEngine || null;  // ExecExceptionEngine
        this.narrative  = config.narrativeEngine || null;  // ExecNarrativeEngine
        this._container = null;
        this._entityIdx = null;  // current entity (null = institution root)
        this._bindings  = [];
    }

    /** Listen for entity selection from hierarchy panel */
    connectBus(bus) {
        this._bus = bus;
        bus.on('entity:selected', (data) => {
            this._entityIdx = data.idx;
            this._refresh();
        });
        bus.on('year:changed', (data) => {
            this.year = data.year;
            this.engine.clearCache();
            if (this.exception) this.exception.clearCache();
            this._refresh();
        });
        bus.on('exec:loaded', () => {
            this.engine.clearCache();
            if (this.exception) this.exception.clearCache();
            this._refresh();
        });
        return this;
    }

    render(container) {
        this._container = container;
        // Default to institution root (idx=1)
        this._entityIdx = this._entityIdx || this._getInstitutionIdx();
        this._refresh();
    }

    // ── Rendering ────────────────────────────────────────────────────

    _refresh() {
        if (!this._container) return;
        this._container.innerHTML = '';
        this._bindings = [];

        const entityIdx = this._entityIdx || this._getInstitutionIdx();
        if (!entityIdx) {
            this._container.innerHTML = '<div class="ex-empty"><i class="fas fa-database"></i><div class="ex-empty-msg">No entity data available</div></div>';
            return;
        }

        const kpis = this.engine.getKPIs(entityIdx, this.year);
        const entity = kpis._entity;

        // ── Header ───────────────────────────────────────────────
        const header = document.createElement('div');
        header.className = 'ex-summary-header';
        header.innerHTML = `
            <div class="ex-summary-header-row">
                <i class="fas fa-chart-line ex-summary-header-icon"></i>
                <div>
                    <div class="ex-summary-header-title">${entity ? entity.name : 'Executive Summary'}</div>
                    <div class="ex-summary-header-sub">Academic Year ${this.year} ${entity ? '| ' + entity.type.charAt(0).toUpperCase() + entity.type.slice(1) : ''}</div>
                </div>
            </div>
        `;
        // Tag badges for current entity
        if (this.bridge && entityIdx) {
            var tagRow = document.createElement('div');
            tagRow.className = 'ex-tag-row';
            this.bridge.renderTagPicker(tagRow, 'entity', entityIdx, ['Priority', 'Status']);
            header.appendChild(tagRow);
        }

        this._container.appendChild(header);

        // ── Data Freshness Indicator ───────────────────────────────
        this._renderDataFreshness(entityIdx);

        // ── Algorithmic Narrative One-Liner ─────────────────────────
        this._renderNarrativeSentence(entityIdx);

        // ── Exception Feed ─────────────────────────────────────────
        this._renderExceptionFeed(entityIdx);

        // ── KPI Row (with bullet charts) ───────────────────────────
        this._renderKPIRow(kpis);

        // ── Category Overview ────────────────────────────────────
        this._renderCategoryOverview(entityIdx);

        // ── Recent Activity ────────────────────────────────────────
        this._renderRecentActivity();

        // ── Recent Notes ─────────────────────────────────────────
        this._renderRecentNotes(entityIdx);
    }

    _renderKPIRow(kpis) {
        const row = document.createElement('div');
        row.className = 'ex-kpi-row ex-section';

        const entityIdx = this._entityIdx || this._getInstitutionIdx();
        const highlights = [
            { code: 'course-pass-rate', icon: 'check-circle',    color: 'var(--ex-clr-success)' },
            { code: 'course-mean',      icon: 'chart-bar',       color: 'var(--ex-clr-primary)' },
            { code: 'graduation-rate',  icon: 'graduation-cap',  color: 'var(--ex-clr-purple)' },
            { code: 'retention-rate',   icon: 'user-check',      color: 'var(--ex-clr-warning)' },
            { code: 'student-staff-ratio', icon: 'users',        color: 'var(--ex-clr-indigo)' },
            { code: 'stakeholder-satisfaction', icon: 'star',     color: 'var(--ex-clr-pink)' }
        ];

        const years = this.engine.getYears();

        for (const h of highlights) {
            const kpi = kpis[h.code];
            if (!kpi) continue;

            const card = document.createElement('div');
            card.className = 'ex-kpi-card ex-kpi-card-clickable';

            // Drill-through: click navigates to the relevant tab
            const tabKey = ExecSummaryPanel.KPI_TAB_MAP[h.code];
            if (tabKey && this._bus) {
                card.addEventListener('click', () => this._bus.emit('tab:navigate', { tab: tabKey }));
            }

            const statusCls = kpi.status === 'success' ? 'ex-status-dot-success' :
                              kpi.status === 'warning' ? 'ex-status-dot-warning' : 'ex-status-dot-danger';
            const statusDot = kpi.status !== 'unknown' ?
                `<span class="ex-status-dot ${statusCls}"></span>` : '';

            const displayValue = kpi.value !== null ?
                (kpi.unit === 'score' ? kpi.value.toFixed(1) :
                 kpi.unit === 'ratio' ? kpi.value.toFixed(1) :
                 Math.round(kpi.value)) : '—';
            const unitLabel = kpi.unit === 'ratio' ? ':1' : kpi.unit === 'score' ? '/5' : kpi.unit || '';

            // YoY alert badge: >5% decline
            let alertHtml = '';
            if (kpi.value !== null && years.length >= 2) {
                const prevVal = this.engine.getValue(kpi.metricId, entityIdx, years[1]);
                if (prevVal !== null && prevVal !== 0) {
                    const lowerIsBetter = kpi.unit === 'ratio';
                    const pctChange = ((kpi.value - prevVal) / Math.abs(prevVal)) * 100;
                    const declining = lowerIsBetter ? pctChange > 5 : pctChange < -5;
                    if (declining) {
                        const displayPct = Math.abs(Math.round(pctChange));
                        alertHtml = `<span class="ex-alert-badge">\u2193 ${displayPct}%</span>`;
                    }
                }
            }

            // Sparkline: 3-year trend
            const sparkHtml = this._renderSparkline(
                this.engine.getTrend(kpi.metricId, entityIdx, years),
                kpi.target, kpi.unit === 'ratio'
            );

            // Bullet chart: Stephen Few pattern with qualitative ranges
            const bulletHtml = this._renderBulletChart(kpi);

            card.innerHTML = `
                <div class="ex-kpi-card-label">
                    <i class="fas fa-${h.icon}" style="color:${h.color};"></i>
                    <span>${kpi.name}</span>
                    ${statusDot}${alertHtml}
                </div>
                <div class="ex-kpi-value">${displayValue}<span class="ex-kpi-unit">${unitLabel}</span></div>
                ${bulletHtml}
                ${sparkHtml}
            `;
            row.appendChild(card);
        }

        this._container.appendChild(row);
    }

    /** Inline SVG sparkline from trend data */
    _renderSparkline(trend, target, invertColor = false) {
        const vals = trend.map(t => t.value).filter(v => v !== null);
        if (vals.length < 2) return '';
        const min = Math.min(...vals, target || Infinity) - 2;
        const max = Math.max(...vals, target || -Infinity) + 2;
        const range = max - min || 1;
        const w = 60, h = 20;
        const points = vals.map((v, i) => {
            const x = (i / (vals.length - 1)) * w;
            const y = h - ((v - min) / range) * h;
            return `${x},${y}`;
        }).join(' ');

        // Color: green if improving, red if declining
        const first = vals[0], last = vals[vals.length - 1];
        const improving = invertColor ? last < first : last > first;
        const color = improving ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)';

        // Target dashed line
        let targetLine = '';
        if (target != null) {
            const ty = h - ((target - min) / range) * h;
            targetLine = `<line x1="0" y1="${ty}" x2="${w}" y2="${ty}" stroke="var(--ui-gray-400)" stroke-width="0.5" stroke-dasharray="2,2"/>`;
        }

        return `<svg width="${w}" height="${h}" class="ex-sparkline" viewBox="0 0 ${w} ${h}">
            ${targetLine}
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    _renderCategoryOverview(entityIdx) {
        const categories = this.engine.getMetricsByCategory(entityIdx, this.year);

        const section = document.createElement('div');
        section.className = 'ex-section';

        const title = document.createElement('div');
        title.className = 'ex-section-title';
        title.textContent = 'ISO 21001 Metrics Overview';
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'ex-grid';

        const colorVarMap = { success: 'var(--ex-clr-success)', info: 'var(--ex-clr-primary)', warning: 'var(--ex-clr-warning)', primary: 'var(--ex-clr-purple)' };
        const statusClsMap = { success: 'ex-clr-success', warning: 'ex-clr-warning', danger: 'ex-clr-danger' };

        for (const cat of categories) {
            const card = document.createElement('div');
            card.className = 'ex-category-card';

            const accent = colorVarMap[cat.color] || 'var(--ui-gray-500)';
            const accentCls = cat.color === 'success' ? 'ex-clr-success' :
                              cat.color === 'warning' ? 'ex-clr-warning' :
                              cat.color === 'primary' ? 'ex-clr-purple' : 'ex-clr-primary';

            let metricsHtml = '';
            for (const m of cat.metrics) {
                const statusIcon = m.status === 'success' ? 'check-circle' :
                                   m.status === 'warning' ? 'exclamation-triangle' : 'times-circle';
                const sCls = statusClsMap[m.status] || 'ex-clr-danger';
                const val = m.value !== null ?
                    (m.unit === 'score' || m.unit === 'ratio' ? m.value.toFixed(1) : Math.round(m.value)) : '—';
                const unitSuffix = m.unit === 'ratio' ? ':1' : m.unit === 'score' ? '/5' : m.unit || '';

                // Benchmark comparison bar — supports %, score, and ratio units
                let barHtml = '';
                if (m.value !== null && m.target != null && (m.unit === '%' || m.unit === 'score' || m.unit === 'ratio')) {
                    const isRatio = m.unit === 'ratio';
                    // For ratio (lower is better), invert direction
                    const maxBar = isRatio
                        ? Math.max(m.value, m.benchmark || m.target, m.target) * 1.5
                        : (Math.max(m.target, m.benchmark || 0, m.value) * 1.1 || 100);
                    const rnd = v => Math.round(v * 100) / 100;
                    const valPct = rnd(Math.min(100, (m.value / maxBar) * 100));
                    const tgtPct = rnd((m.target / maxBar) * 100);
                    const bmkPct = m.benchmark ? rnd((m.benchmark / maxBar) * 100) : 0;
                    const fillCls = m.status === 'success' ? 'ex-clr-success' :
                                    m.status === 'warning' ? 'ex-clr-warning' : 'ex-clr-danger';
                    barHtml = `<div class="ex-benchmark-bar">
                        <div class="ex-progress-fill ${fillCls}" style="width:${valPct}%;"></div>
                        <div class="ex-benchmark-marker ex-marker-target" style="left:${tgtPct}%;" title="Target: ${m.target}"></div>
                        ${bmkPct ? `<div class="ex-benchmark-marker ex-marker-benchmark" style="left:${bmkPct}%;" title="Benchmark: ${m.benchmark}"></div>` : ''}
                    </div>`;
                }

                metricsHtml += `
                    <div class="ex-metric-row">
                        <div class="ex-metric-row-inner">
                            <div class="ex-metric-name">
                                <i class="fas fa-${statusIcon} ${sCls}"></i>
                                <span>${m.name}</span>
                            </div>
                            <div class="ex-metric-value">${val}<span class="ex-kpi-unit">${unitSuffix}</span></div>
                        </div>
                        ${barHtml}
                    </div>
                `;
            }

            // Category score: average status
            const successCount = cat.metrics.filter(m => m.status === 'success').length;
            const total = cat.metrics.length;
            const score = total > 0 ? Math.round((successCount / total) * 100) : 0;

            card.innerHTML = `
                <div class="ex-cat-header">
                    <div class="ex-cat-name">
                        <i class="fas fa-${cat.icon}" style="color:${accent};"></i>
                        <span>${cat.name}</span>
                    </div>
                    <span class="ex-cat-score" style="color:${accent};">${score}% on target</span>
                </div>
                ${metricsHtml}
            `;

            grid.appendChild(card);
        }

        section.appendChild(grid);
        this._container.appendChild(section);
    }

    _renderRecentActivity() {
        if (!ServiceRegistry.has('audit')) {
            var infoSection = document.createElement('div');
            infoSection.className = 'ex-section';
            var infoTitle = document.createElement('div');
            infoTitle.className = 'ex-section-title';
            infoTitle.textContent = 'Recent Activity';
            infoSection.appendChild(infoTitle);
            new uiAlert({ variant: 'info', message: 'Audit service not connected', parent: infoSection, dismissible: false });
            this._container.appendChild(infoSection);
            return;
        }
        var audit = ServiceRegistry.get('audit');
        var execTables = ['intervention', 'pdsaCycle', 'note', 'sectorBenchmark', 'metricObservation'];
        var logs = audit.table('auditLog').all()
            .filter(function(l) {
                var et = l.get('entityType');
                var action = l.get('action');
                return execTables.indexOf(et) !== -1 || action === 'export';
            })
            .sort(function(a, b) {
                return new Date(b.get('createdAt') || 0) - new Date(a.get('createdAt') || 0);
            })
            .slice(0, 10);

        if (logs.length === 0) return;

        var section = document.createElement('div');
        section.className = 'ex-section';

        var title = document.createElement('div');
        title.className = 'ex-section-title';
        title.textContent = 'Recent Activity';
        section.appendChild(title);

        var list = document.createElement('div');
        list.className = 'ex-col-stack';

        var actionIcons = { create: 'plus-circle', update: 'edit', 'delete': 'trash-alt', export: 'download', view: 'eye' };
        var actionClasses = { create: 'ex-clr-success', update: 'ex-clr-primary', 'delete': 'ex-clr-danger', export: 'ex-clr-purple', view: 'ex-clr-muted' };

        for (var i = 0; i < logs.length; i++) {
            var log = logs[i];
            var action = log.get('action') || 'custom';
            var icon = actionIcons[action] || 'circle';
            var clr = actionClasses[action] || 'ex-clr-muted';
            var desc = log.get('description') || (action + ' ' + (log.get('entityType') || ''));
            var time = log.get('createdAt');
            var timeStr = time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            var item = document.createElement('div');
            item.className = 'ex-activity-item';
            item.innerHTML =
                '<i class="fas fa-' + icon + ' ex-activity-icon ' + clr + '"></i>' +
                '<span class="ex-activity-desc">' + desc + '</span>' +
                '<span class="ex-activity-time">' + timeStr + '</span>';
            list.appendChild(item);
        }

        section.appendChild(list);
        this._container.appendChild(section);

        // Auto-refresh when new audit entries arrive
        var self = this;
        audit.table('auditLog').on('created', function() {
            if (self._container) self._refresh();
        });
    }

    _renderRecentNotes(entityIdx) {
        const notes = this.engine.getNotes(entityIdx);
        if (notes.length === 0) return;

        const section = document.createElement('div');
        section.className = 'ex-section';

        const title = document.createElement('div');
        title.className = 'ex-section-title';
        title.textContent = 'Recent Observations';
        section.appendChild(title);

        const list = document.createElement('div');
        list.className = 'ex-col-stack';

        for (const n of notes.slice(0, 5)) {
            const metricTable = this.publome.table('metric');
            const metric = n.metricId ? metricTable.read(n.metricId) : null;
            const metricName = metric ? metric.get('name') : '';

            const item = document.createElement('div');
            item.className = 'ex-note-card';
            item.innerHTML = `
                <div class="ex-note-header">
                    <i class="fas fa-sticky-note"></i>
                    ${metricName ? `<span class="ex-note-metric">${metricName}</span>` : ''}
                    <span class="ex-note-meta">${n.author || ''} ${n.createdAt ? '| ' + n.createdAt : ''}</span>
                </div>
                <div class="ex-note-content">${n.content}</div>
            `;
            list.appendChild(item);
        }

        section.appendChild(list);
        this._container.appendChild(section);
    }

    // ── Command Centre Enhancements ───────────────────────────────────

    /** Data freshness indicator: shows most recent observation year + completeness */
    _renderDataFreshness(entityIdx) {
        const section = document.createElement('div');
        section.className = 'ex-data-freshness';

        const obsTable = this.publome.table('metricObservation');
        const entityObs = obsTable.all().filter(o => o.get('entityId') === entityIdx);
        const totalMetrics = this.publome.table('metric').all().length;
        const yearObs = entityObs.filter(o => o.get('year') === this.year);
        const observedMetrics = new Set(yearObs.map(o => o.get('metricId'))).size;
        const completeness = totalMetrics > 0 ? Math.round((observedMetrics / totalMetrics) * 100) : 0;

        // Find the most recent observation date from actual data
        const years = [...new Set(entityObs.map(o => o.get('year')))].sort((a, b) => b - a);
        const dataYear = years.length > 0 ? years[0] : this.year;

        // Freshness: compare selected year to most recent data year
        const isCurrentYear = this.year === dataYear;
        const freshnessColor = completeness === 100 ? 'var(--ex-clr-success)' :
                               completeness >= 50 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
        const freshnessIcon = completeness === 100 ? 'check-circle' :
                              completeness >= 50 ? 'exclamation-circle' : 'times-circle';

        section.innerHTML = `
            <i class="fas fa-${freshnessIcon}" style="color:${freshnessColor};"></i>
            <span>Data year: ${this.year}${isCurrentYear ? ' (most recent)' : ''}</span>
            <span class="ex-freshness-sep">|</span>
            <span>${completeness}% complete (${observedMetrics}/${totalMetrics} metrics)</span>
        `;

        this._container.appendChild(section);
    }

    /** One-sentence algorithmic narrative from ExecNarrativeEngine */
    _renderNarrativeSentence(entityIdx) {
        if (!this.narrative) return;

        const sentence = this.narrative.generateOneLiner(entityIdx, this.year);

        const section = document.createElement('div');
        section.className = 'ex-narrative-sentence';
        section.innerHTML = `
            <i class="fas fa-robot ex-clr-primary"></i>
            <span>${sentence}</span>
        `;

        this._container.appendChild(section);
    }

    /** Exception feed: ranked list of current concerns from ExecExceptionEngine */
    _renderExceptionFeed(entityIdx) {
        if (!this.exception) return;

        const exceptions = this.exception.getTopExceptions(entityIdx, this.year, 5);
        if (exceptions.length === 0) return;

        const summary = this.exception.getSummary(entityIdx, this.year);
        const rhythmContext = this.exception.getRhythmContext();

        const section = document.createElement('div');
        section.className = 'ex-section ex-exception-feed';

        const titleRow = document.createElement('div');
        titleRow.className = 'ex-section-title';
        titleRow.innerHTML = `Exceptions <span class="ex-exception-count ex-badge-${summary.level}">${summary.count}</span>`;
        if (rhythmContext) {
            titleRow.innerHTML += `<span class="ex-rhythm-badge" title="${rhythmContext.description}"><i class="fas fa-${rhythmContext.icon}"></i> ${rhythmContext.name}</span>`;
        }
        section.appendChild(titleRow);

        const list = document.createElement('div');
        list.className = 'ex-col-stack';

        for (const ex of exceptions) {
            const item = document.createElement('div');
            item.className = 'ex-exception-item ex-exception-' + ex.level;

            const levelIcon = ex.level === 'critical' ? 'exclamation-circle' :
                              ex.level === 'warning' ? 'exclamation-triangle' : 'info-circle';
            const levelCls = ex.level === 'critical' ? 'ex-clr-danger' :
                             ex.level === 'warning' ? 'ex-clr-warning' : 'ex-clr-primary';

            const typeLabel = ex.type === 'threshold_breach' ? 'Below Target' :
                              ex.type === 'trend_decline' ? 'Declining' :
                              ex.type === 'benchmark_gap' ? 'Below Benchmark' : 'Stale Data';

            // Click to navigate to relevant tab
            const tabKey = ExecSummaryPanel.KPI_TAB_MAP[ex.code];

            item.innerHTML = `
                <div class="ex-exception-icon">
                    <i class="fas fa-${levelIcon} ${levelCls}"></i>
                </div>
                <div class="ex-exception-body">
                    <div class="ex-exception-desc">${ex.description}</div>
                    <div class="ex-exception-meta">
                        <span class="ex-exception-type">${typeLabel}</span>
                        <span class="ex-exception-category"><i class="fas fa-${ex.categoryIcon}"></i> ${ex.categoryName}</span>
                        ${ex.rhythmReason ? `<span class="ex-exception-rhythm" title="${ex.rhythmReason.reason}"><i class="fas fa-calendar"></i> ${ex.rhythmReason.direction} ${ex.rhythmReason.percentage}%</span>` : ''}
                    </div>
                </div>
                <div class="ex-exception-score" title="Priority score: ${ex.score.toFixed(3)}">
                    <div class="ex-exception-score-bar" style="height:${Math.round(ex.score * 100)}%;"></div>
                    <span class="ex-exception-score-num">${(ex.score * 100).toFixed(0)}</span>
                </div>
            `;

            if (tabKey && this._bus) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', () => this._bus.emit('tab:navigate', { tab: tabKey }));
            }

            list.appendChild(item);
        }

        section.appendChild(list);
        this._container.appendChild(section);
    }

    /** Stephen Few bullet chart: qualitative ranges + actual bar + target marker */
    _renderBulletChart(kpi) {
        if (kpi.value === null || kpi.target == null) {
            return `<div class="ex-kpi-target">Target: ${kpi.target || '—'}</div>`;
        }

        const lowerIsBetter = kpi.unit === 'ratio';
        const isScore = kpi.unit === 'score';

        // Set maxVal based on metric unit type
        let value, target, benchmark, maxVal;
        if (lowerIsBetter) {
            maxVal = Math.max(kpi.value, kpi.target, kpi.benchmark || kpi.target) * 1.5;
            value = kpi.value;
            target = kpi.target;
            benchmark = kpi.benchmark || target;
        } else if (isScore) {
            // Score metrics (e.g. 3.7/5): use 5 as max, not 100
            maxVal = 5;
            value = kpi.value;
            target = kpi.target;
            benchmark = kpi.benchmark || target * 0.9;
        } else {
            // Percentage metrics: 0-100 scale
            maxVal = Math.max(100, kpi.target * 1.2, kpi.value * 1.1);
            value = kpi.value;
            target = kpi.target;
            benchmark = kpi.benchmark || target * 0.9;
        }

        // Qualitative ranges: poor (0-benchmark), fair (benchmark-target), good (target-max)
        const _r = v => Math.round(v * 100) / 100; // round to 2dp
        const poorPct = _r(lowerIsBetter
            ? 100 - (benchmark / maxVal * 100)
            : (benchmark / maxVal * 100));
        const fairPct = _r(lowerIsBetter
            ? (benchmark / maxVal * 100) - (target / maxVal * 100)
            : (target / maxVal * 100) - (benchmark / maxVal * 100));
        const goodPct = _r(100 - poorPct - fairPct);

        const valPct = _r(value / maxVal * 100);
        const tgtPct = _r(target / maxVal * 100);

        const unitSuffix = kpi.unit === 'ratio' ? ':1' : kpi.unit === 'score' ? '/5' : '';

        return `
            <div class="ex-bullet-chart" title="Value: ${value}${unitSuffix} | Target: ${target}${unitSuffix} | Benchmark: ${benchmark}${unitSuffix}">
                <div class="ex-bullet-ranges">
                    <div class="ex-bullet-poor" style="width:${poorPct}%;"></div>
                    <div class="ex-bullet-fair" style="width:${fairPct}%;"></div>
                    <div class="ex-bullet-good" style="width:${goodPct}%;"></div>
                </div>
                <div class="ex-bullet-bar" style="width:${Math.min(100, valPct)}%;"></div>
                <div class="ex-bullet-target" style="left:${tgtPct}%;"></div>
            </div>
        `;
    }

    // ── Helpers ──────────────────────────────────────────────────────

    _getInstitutionIdx() {
        const entityTable = this.publome.table('entity');
        const inst = entityTable.all().find(e => e.get('type') === 'institution');
        return inst ? inst.get('idx') : null;
    }
}
