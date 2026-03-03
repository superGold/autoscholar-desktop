/**
 * ProgOverviewPanel - Programme health dashboard & key metrics
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Shows programme KPIs, course pass-rate table, year-level breakdown,
 * cohort throughput funnel, at-risk distribution, and GA coverage matrix.
 *
 * Usage:
 *   const panel = new ProgOverviewPanel();
 *   panel.render(controlEl, stageEl);
 */
class ProgOverviewPanel {

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._selectedProg = config.programme || 'NDIT';
        this._selectedYear = config.year || 2026;
        this._dataLoaded = false;
        this._courses = [];
        this._cohorts = [];
        this._data = config.bridge || ProgAnalystData;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderEmptyStage();
    }

    // ── DOM Helpers ─────────────────────────────────────────────────────────

    /** Remove all children from an element (safe replacement for el.innerHTML = '') */
    _clearEl(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    /** Create an element with optional className, style, and textContent */
    _mkEl(tag, opts) {
        var el = document.createElement(tag);
        if (opts) {
            if (opts.cls) el.className = opts.cls;
            if (opts.css) el.style.cssText = opts.css;
            if (opts.text !== undefined) el.textContent = opts.text;
            if (opts.title) el.title = opts.title;
            if (opts.parent) opts.parent.appendChild(el);
        }
        return el;
    }

    /** Create a Font Awesome icon element */
    _mkIcon(iconClass, css) {
        var i = document.createElement('i');
        i.className = iconClass;
        if (css) i.style.cssText = css;
        return i;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTROL PANEL
    // ══════════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        this._clearEl(el);

        var accordion = new uiAccordion({
            exclusive: true,
            content: {
                params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
                health: { label: '<i class="fas fa-heartbeat" style="margin-right:0.3rem;"></i>Health Summary' },
                alerts: { label: '<i class="fas fa-exclamation-circle" style="margin-right:0.3rem;"></i>Alerts' }
            },
            parent: el
        });

        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParams(paramsEl);

        this._healthEl = accordion.el.querySelector('.ui-accordion-item[data-key="health"] .ui-accordion-content');
        this._renderHealthSummary(this._healthEl);

        this._alertsEl = accordion.el.querySelector('.ui-accordion-item[data-key="alerts"] .ui-accordion-content');
        this._renderAlertsSidebar(this._alertsEl);
    }

    _renderParams(el) {
        this._clearEl(el);
        var self = this;

        // Programme selector
        var progLabel = document.createElement('label');
        progLabel.className = 'as-an-ctrl-label';
        progLabel.textContent = 'Programme';
        el.appendChild(progLabel);

        var progWrap = document.createElement('div');
        progWrap.className = 'ui-input-wrapper as-an-ctrl-wrap';
        el.appendChild(progWrap);
        var progSelect = document.createElement('select');
        progSelect.className = 'ui-input as-an-ctrl-select';
        this._data.PROGRAMMES.forEach(function(p) {
            var opt = document.createElement('option');
            opt.value = p.code;
            opt.textContent = p.name;
            progSelect.appendChild(opt);
        });
        progSelect.value = self._selectedProg;
        progSelect.addEventListener('change', function() { self._selectedProg = progSelect.value; });
        progWrap.appendChild(progSelect);

        // Year selector
        var yearLabel = document.createElement('label');
        yearLabel.className = 'as-an-ctrl-label as-mt-2';
        yearLabel.textContent = 'Academic Year';
        el.appendChild(yearLabel);

        var yearWrap = document.createElement('div');
        yearWrap.className = 'ui-input-wrapper as-an-ctrl-wrap';
        el.appendChild(yearWrap);
        var yearSelect = document.createElement('select');
        yearSelect.className = 'ui-input as-an-ctrl-select';
        Array.from({ length: 10 }, function(_, i) { return new Date().getFullYear() - i; }).forEach(function(y) {
            var opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);
        });
        yearSelect.value = String(self._selectedYear);
        yearSelect.addEventListener('change', function() { self._selectedYear = parseInt(yearSelect.value, 10); });
        yearWrap.appendChild(yearSelect);

        // Programme info badge
        var prog = this._data.PROGRAMMES.find(function(p) { return p.code === self._selectedProg; });
        if (prog) {
            var infoWrap = document.createElement('div');
            infoWrap.className = 'as-an-info-wrap';
            el.appendChild(infoWrap);
            new uiBadge({ label: 'NQF ' + prog.nqf, color: 'gray', size: 'xs', parent: infoWrap });
            new uiBadge({ label: prog.years + '-year', color: 'gray', size: 'xs', parent: infoWrap });
            new uiBadge({ label: prog.department, color: 'primary', size: 'xs', parent: infoWrap });
        }

        // Load button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Dashboard', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-chart-line"></i>',
            parent: btnWrap,
            onClick: function() {
                self._loadData();
                self._renderDashboard();
                self._renderHealthSummary(self._healthEl);
                self._renderAlertsSidebar(self._alertsEl);
                if (typeof log === 'function') log('ProgOverview', 'Dashboard loaded for ' + self._selectedProg);
            }
        });
    }

    _renderHealthSummary(el) {
        if (!el) return;
        this._clearEl(el);
        if (!this._dataLoaded) {
            var msg = this._mkEl('div', {
                cls: 'as-an-ctrl-hint',
                text: 'Load data to see health summary',
                parent: el
            });
            return;
        }

        var totalEnrolled = this._courses.reduce(function(s, c) { return s + c.enrolled; }, 0);
        var totalPassed = this._courses.reduce(function(s, c) { return s + c.passed; }, 0);
        var overallPassRate = totalEnrolled > 0 ? ((totalPassed / totalEnrolled) * 100).toFixed(1) : '\u2014';
        var totalAtRisk = this._courses.reduce(function(s, c) { return s + c.atRisk; }, 0);
        var avgDfw = (this._courses.reduce(function(s, c) { return s + c.dfw; }, 0) / this._courses.length).toFixed(1);

        var latestCohort = this._cohorts[0];
        var throughput = latestCohort ? ((latestCohort.graduated / latestCohort.intake) * 100).toFixed(1) : '\u2014';

        var items = [
            { label: 'Pass Rate', value: overallPassRate + '%', color: parseFloat(overallPassRate) >= 70 ? '#34d399' : '#f87171' },
            { label: 'Avg DFW Rate', value: avgDfw + '%', color: parseFloat(avgDfw) <= 20 ? '#34d399' : '#f87171' },
            { label: 'At-Risk Students', value: String(totalAtRisk), color: totalAtRisk > 50 ? '#f87171' : '#34d399' },
            { label: 'Throughput', value: throughput + '%', color: parseFloat(throughput) >= 35 ? '#34d399' : '#f87171' },
            { label: 'Courses', value: String(this._courses.length), color: 'rgba(255,255,255,0.9)' }
        ];

        var wrap = this._mkEl('div', {
            cls: 'as-an-ctrl-stats',
            parent: el
        });

        var self = this;
        items.forEach(function(i) {
            var line = self._mkEl('div', { parent: wrap });
            line.appendChild(document.createTextNode(i.label + ': '));
            var strong = self._mkEl('strong', { text: i.value, parent: line });
            strong.style.color = i.color;
        });
    }

    _renderAlertsSidebar(el) {
        if (!el) return;
        this._clearEl(el);
        if (!this._dataLoaded) {
            this._mkEl('div', {
                cls: 'as-an-ctrl-hint',
                text: 'Load data to see alerts',
                parent: el
            });
            return;
        }

        var alerts = [];

        // Gatekeeper courses (DFW > 30%)
        var gatekeepers = this._courses.filter(function(c) { return c.dfw > 30; });
        if (gatekeepers.length) {
            alerts.push({ icon: 'door-closed', color: '#f87171', text: gatekeepers.length + ' gatekeeper course' + (gatekeepers.length > 1 ? 's' : '') + ' (DFW>30%)' });
        }

        // Courses below 50% avg
        var lowAvg = this._courses.filter(function(c) { return c.avgMark < 50; });
        if (lowAvg.length) {
            alerts.push({ icon: 'chart-line', color: '#fbbf24', text: lowAvg.length + ' course' + (lowAvg.length > 1 ? 's' : '') + ' below 50% avg' });
        }

        // High at-risk concentration
        var highRisk = this._courses.filter(function(c) { return c.enrolled > 0 && (c.atRisk / c.enrolled) > 0.3; });
        if (highRisk.length) {
            alerts.push({ icon: 'exclamation-triangle', color: '#f87171', text: highRisk.length + ' course' + (highRisk.length > 1 ? 's' : '') + ' with >30% at-risk' });
        }

        // Throughput check
        var latestCohort = this._cohorts[0];
        if (latestCohort && (latestCohort.graduated / latestCohort.intake) < 0.35) {
            alerts.push({ icon: 'filter', color: '#fbbf24', text: 'Throughput below 35% target' });
        }

        if (!alerts.length) {
            var noAlerts = this._mkEl('div', {
                cls: 'as-an-ctrl-hint as-an-no-alerts',
                parent: el
            });
            noAlerts.appendChild(this._mkIcon('fas fa-check-circle as-an-mr-xs'));
            noAlerts.appendChild(document.createTextNode('No critical alerts'));
            return;
        }

        var self = this;
        alerts.forEach(function(a) {
            var item = self._mkEl('div', {
                cls: 'as-an-ctrl-alert-item',
                parent: el
            });
            var icon = self._mkIcon('fas fa-' + a.icon);
            icon.className += ' as-an-ctrl-alert-icon';
            icon.style.color = a.color;
            item.appendChild(icon);
            self._mkEl('span', { cls: 'as-an-ctrl-alert-text', text: a.text, parent: item });
        });
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    _loadData() {
        this._courses = this._data.COURSES;
        this._cohorts = this._data.COHORTS;
        this._dataLoaded = true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EMPTY STAGE
    // ══════════════════════════════════════════════════════════════════════════

    _renderEmptyStage() {
        this._clearEl(this._stageEl);
        this._stageEl.className = 'as-an-stage-scroll';

        new uiAlert({
            color: 'info',
            title: 'Programme Overview',
            message: 'Select a programme and click "Load Dashboard" to view programme health metrics, course performance, cohort throughput, and curriculum coverage.',
            parent: this._stageEl
        });

        var kpiRow = document.createElement('div');
        kpiRow.className = 'as-an-kpi-row as-mt-3';
        this._stageEl.appendChild(kpiRow);

        var self = this;
        [
            { icon: 'fa-users', label: 'Enrolment', value: '\u2014' },
            { icon: 'fa-check-circle', label: 'Pass Rate', value: '\u2014' },
            { icon: 'fa-filter', label: 'Throughput', value: '\u2014' },
            { icon: 'fa-exclamation-triangle', label: 'At-Risk', value: '\u2014' }
        ].forEach(function(c) {
            var card = document.createElement('div');
            card.className = 'po-kpi-card';

            // Icon + label row
            var topRow = self._mkEl('div', { cls: 'as-an-kpi-card-header', parent: card });
            var emptyIcon = self._mkIcon('fas ' + c.icon);
            emptyIcon.className += ' as-an-kpi-icon as-an-placeholder';
            topRow.appendChild(emptyIcon);
            self._mkEl('span', { cls: 'as-an-kpi-label', text: c.label, parent: topRow });

            // Value
            self._mkEl('div', { cls: 'as-an-kpi-value as-an-placeholder', text: c.value, parent: card });

            kpiRow.appendChild(card);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DASHBOARD STAGE
    // ══════════════════════════════════════════════════════════════════════════

    _renderDashboard() {
        var stage = this._stageEl;
        this._clearEl(stage);
        stage.className = 'as-an-stage';

        var wrap = document.createElement('div');
        wrap.className = 'as-an-stage-inner';
        stage.appendChild(wrap);

        // Header
        var prog = this._data.PROGRAMMES.find(function(p) { return p.code === this._selectedProg; }.bind(this));
        var header = document.createElement('div');
        header.className = 'as-an-panel-header';

        var progBadge = this._mkEl('span', {
            cls: 'as-an-panel-badge as-an-panel-badge-overview',
            text: prog ? prog.name : this._selectedProg,
            parent: header
        });
        var progInfo = this._mkEl('span', {
            cls: 'as-an-panel-subtitle',
            text: this._selectedYear + ' | ' + (prog ? prog.faculty + ' \u2014 ' + prog.department : ''),
            parent: header
        });

        wrap.appendChild(header);

        // KPI row
        this._renderKPIs(wrap);

        // Alert banner
        this._renderAlertBanner(wrap);

        // 2-column grid
        var grid = document.createElement('div');
        grid.className = 'as-an-grid-main';
        wrap.appendChild(grid);

        var leftCol = document.createElement('div');
        leftCol.className = 'as-flex-col';
        grid.appendChild(leftCol);

        this._renderCoursePerformance(leftCol);
        this._renderYearLevelBreakdown(leftCol);

        var rightCol = document.createElement('div');
        rightCol.className = 'as-flex-col';
        grid.appendChild(rightCol);

        this._renderCohortThroughput(rightCol);
        this._renderAtRiskDistribution(rightCol);
        this._renderGACoverage(rightCol);
    }

    // ── KPIs ─────────────────────────────────────────────────────────────────

    _renderKPIs(parent) {
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        parent.appendChild(row);

        // Calculate metrics
        var y1Courses = this._courses.filter(function(c) { return c.year === 1 && c.semester === 'S1'; });
        var headcount = y1Courses.length > 0 ? y1Courses[0].enrolled : 0;
        var totalEnrolled = this._courses.reduce(function(s, c) { return s + c.enrolled; }, 0);
        var totalPassed = this._courses.reduce(function(s, c) { return s + c.passed; }, 0);
        var passRate = totalEnrolled > 0 ? ((totalPassed / totalEnrolled) * 100).toFixed(1) : 0;
        var latestCohort = this._cohorts[0];
        var throughput = latestCohort ? ((latestCohort.graduated / latestCohort.intake) * 100).toFixed(1) : 0;
        var retention = latestCohort ? ((latestCohort.y1End / latestCohort.intake) * 100).toFixed(1) : 0;
        var totalAtRisk = this._courses.reduce(function(s, c) { return s + c.atRisk; }, 0);
        var avgMark = totalEnrolled > 0 ? (this._courses.reduce(function(s, c) { return s + c.avgMark * c.enrolled; }, 0) / totalEnrolled).toFixed(1) : 0;

        var kpis = [
            { label: 'Headcount', value: String(headcount), sub: 'First-year intake', icon: 'users', color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Pass Rate', value: passRate + '%', sub: this._courses.length + ' courses', icon: 'check-circle', color: parseFloat(passRate) >= 70 ? '#059669' : '#d97706', bg: parseFloat(passRate) >= 70 ? '#f0fdf4' : '#fffbeb' },
            { label: 'Throughput', value: throughput + '%', sub: latestCohort ? latestCohort.graduated + '/' + latestCohort.intake + ' (' + latestCohort.year + ')' : '\u2014', icon: 'filter', color: parseFloat(throughput) >= 35 ? '#059669' : '#dc2626', bg: parseFloat(throughput) >= 35 ? '#f0fdf4' : '#fef2f2' },
            { label: 'Retention', value: retention + '%', sub: 'First-year retention', icon: 'user-check', color: parseFloat(retention) >= 75 ? '#059669' : '#d97706', bg: parseFloat(retention) >= 75 ? '#f0fdf4' : '#fffbeb' },
            { label: 'At-Risk', value: String(totalAtRisk), sub: 'Across all courses', icon: 'exclamation-triangle', color: totalAtRisk > 100 ? '#dc2626' : '#d97706', bg: totalAtRisk > 100 ? '#fef2f2' : '#fffbeb' },
            { label: 'Avg Mark', value: avgMark + '%', sub: 'Programme-wide', icon: 'chart-bar', color: parseFloat(avgMark) >= 55 ? '#059669' : '#d97706', bg: parseFloat(avgMark) >= 55 ? '#f0fdf4' : '#fffbeb' }
        ];

        var self = this;
        kpis.forEach(function(k) {
            var card = document.createElement('div');
            card.className = 'as-an-kpi-card';
            card.style.background = k.bg;
            card.style.borderColor = k.color + '18';

            // Icon + label row
            var topRow = self._mkEl('div', { cls: 'as-an-kpi-card-header', parent: card });
            var icon = self._mkIcon('fas fa-' + k.icon);
            icon.className += ' as-an-kpi-icon';
            icon.style.color = k.color;
            topRow.appendChild(icon);
            self._mkEl('span', {
                cls: 'as-an-kpi-label',
                text: k.label,
                parent: topRow
            });

            // Value
            var valueEl = self._mkEl('div', {
                cls: 'as-an-kpi-value',
                text: k.value,
                parent: card
            });
            valueEl.style.color = k.color;

            // Sub label
            self._mkEl('div', {
                cls: 'as-an-kpi-sub',
                text: k.sub,
                parent: card
            });

            row.appendChild(card);
        });
    }

    // ── Alert Banner ─────────────────────────────────────────────────────────

    _renderAlertBanner(parent) {
        var gatekeepers = this._courses.filter(function(c) { return c.dfw > 30; });
        if (!gatekeepers.length) return;

        var wrap = document.createElement('div');
        wrap.className = 'as-mt-3';
        parent.appendChild(wrap);

        var banner = document.createElement('div');
        banner.className = 'as-an-alert-warning';

        // Icon
        var bannerIcon = this._mkIcon('fas fa-door-closed as-flex-shrink-0 as-an-alert-icon-warn');
        banner.appendChild(bannerIcon);

        // Text content
        var textWrap = this._mkEl('div', { cls: 'as-flex-1', parent: banner });
        this._mkEl('div', {
            cls: 'as-an-rec-title',
            text: 'Gatekeeper Courses Detected',
            parent: textWrap
        });
        this._mkEl('div', {
            cls: 'as-an-rec-body',
            text: gatekeepers.map(function(c) { return c.code + ' (' + c.dfw.toFixed(1) + '% DFW)'; }).join(', '),
            parent: textWrap
        });

        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-flex-shrink-0';
        banner.appendChild(btnWrap);
        new uiButton({
            label: 'Investigate', variant: 'outline', size: 'xs',
            parent: btnWrap,
            onClick: function() {
                if (typeof log === 'function') log('ProgOverview', 'Investigate gatekeepers: ' + gatekeepers.map(function(c) { return c.code; }).join(', '));
            }
        });
        wrap.appendChild(banner);
    }

    // ── Course Performance Table ─────────────────────────────────────────────

    _renderCoursePerformance(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        hdr.appendChild(this._mkIcon('fas fa-table'));
        hdr.lastChild.className += ' as-an-card-header-icon';
        this._mkEl('span', { cls: 'as-an-card-header-title', text: 'Course Performance', parent: hdr });
        this._mkEl('span', { cls: 'as-an-card-header-meta', text: this._courses.length + ' courses', parent: hdr });
        card.appendChild(hdr);

        var tableWrap = document.createElement('div');
        tableWrap.className = 'as-an-table-wrap';
        card.appendChild(tableWrap);

        var table = document.createElement('table');
        table.className = 'as-an-data-table';

        // Build thead
        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        headerRow.className = 'as-an-thead-row';
        var headers = ['Code', 'Course', 'Yr', 'Enrol', 'Avg', 'Pass%', 'DFW%', 'Risk'];
        var self = this;
        headers.forEach(function(h) {
            var th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Build tbody
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        tableWrap.appendChild(table);

        this._courses.forEach(function(c) {
            var passRate = c.enrolled > 0 ? ((c.passed / c.enrolled) * 100).toFixed(1) : 0;
            var avgColor = c.avgMark >= 60 ? '#059669' : c.avgMark >= 50 ? '#1d4ed8' : '#dc2626';
            var passColor = parseFloat(passRate) >= 75 ? '#059669' : parseFloat(passRate) >= 60 ? '#1d4ed8' : '#dc2626';
            var dfwColor = c.dfw <= 15 ? '#059669' : c.dfw <= 25 ? '#d97706' : '#dc2626';
            var isGatekeeper = c.dfw > 30;

            var row = document.createElement('tr');
            row.className = 'as-an-clickable-row';

            // Code cell
            var tdCode = self._mkEl('td', { cls: 'as-an-td-code', parent: row });
            tdCode.appendChild(document.createTextNode(c.code));
            if (isGatekeeper) {
                var gkIcon = self._mkIcon('fas fa-door-closed as-an-gk-icon');
                gkIcon.title = 'Gatekeeper';
                tdCode.appendChild(gkIcon);
            }

            // Name cell
            self._mkEl('td', { text: c.name, parent: row });

            // Year cell
            self._mkEl('td', { cls: 'as-an-td-muted', text: String(c.year), parent: row });

            // Enrolled cell
            self._mkEl('td', { cls: 'as-an-td-center', text: String(c.enrolled), parent: row });

            // Avg mark cell
            var tdAvg = self._mkEl('td', { cls: 'as-an-td-center as-an-td-avg', text: c.avgMark.toFixed(1) + '%', parent: row });
            tdAvg.style.color = avgColor;

            // Pass rate cell with badge
            var tdPass = self._mkEl('td', { cls: 'as-an-td-center', parent: row });
            var passBadge = self._mkEl('span', {
                cls: 'as-an-badge-sm',
                text: passRate + '%',
                parent: tdPass
            });
            passBadge.style.background = passColor + '15';
            passBadge.style.color = passColor;

            // DFW rate cell with badge
            var tdDfw = self._mkEl('td', { cls: 'as-an-td-center', parent: row });
            var dfwBadge = self._mkEl('span', {
                cls: 'as-an-badge-sm',
                text: c.dfw.toFixed(1) + '%',
                parent: tdDfw
            });
            dfwBadge.style.background = dfwColor + '15';
            dfwBadge.style.color = dfwColor;

            // Risk cell
            var riskColor = c.atRisk > 30 ? '#dc2626' : c.atRisk > 15 ? '#d97706' : '#059669';
            var tdRisk = self._mkEl('td', { cls: 'as-an-td-center', parent: row });
            var riskSpan = self._mkEl('span', {
                cls: 'as-an-td-risk-value',
                text: String(c.atRisk),
                parent: tdRisk
            });
            riskSpan.style.color = riskColor;

            row.addEventListener('click', function() {
                self._showCourseDetail(c);
            });
            tbody.appendChild(row);
        });
    }

    // ── Year-Level Breakdown ─────────────────────────────────────────────────

    _renderYearLevelBreakdown(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        hdr.appendChild(this._mkIcon('fas fa-layer-group'));
        hdr.lastChild.className += ' as-an-card-header-icon';
        this._mkEl('span', { cls: 'as-an-card-header-title', text: 'Year-Level Breakdown', parent: hdr });
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        var self = this;
        var yearColors = ['#1d4ed8', '#7c3aed', '#059669'];

        [1, 2, 3].forEach(function(yr, idx) {
            var yrCourses = self._courses.filter(function(c) { return c.year === yr; });
            if (!yrCourses.length) return;

            var enrolled = yrCourses[0].enrolled;
            var avgPass = yrCourses.reduce(function(s, c) { return s + (c.passed / c.enrolled) * 100; }, 0) / yrCourses.length;
            var avgMark = yrCourses.reduce(function(s, c) { return s + c.avgMark; }, 0) / yrCourses.length;
            var totalRisk = yrCourses.reduce(function(s, c) { return s + c.atRisk; }, 0);
            var avgDfw = yrCourses.reduce(function(s, c) { return s + c.dfw; }, 0) / yrCourses.length;
            var col = yearColors[idx];

            var yearBlock = document.createElement('div');
            yearBlock.className = 'as-an-year-block';
            yearBlock.style.borderLeftColor = col;

            // Title row
            var titleRow = self._mkEl('div', { cls: 'as-flex-row-between as-mb-2', parent: yearBlock });
            self._mkEl('span', { cls: 'as-an-card-header-title', text: 'Year ' + yr, parent: titleRow });
            self._mkEl('span', { cls: 'as-an-kpi-sub', text: yrCourses.length + ' courses \u00b7 ' + enrolled + ' students', parent: titleRow });

            // Stats grid
            var statsGrid = self._mkEl('div', { cls: 'as-grid-4col', parent: yearBlock });
            statsGrid.appendChild(self._yearStatCell('Avg Mark', avgMark.toFixed(1) + '%', avgMark >= 55 ? '#059669' : '#d97706'));
            statsGrid.appendChild(self._yearStatCell('Pass Rate', avgPass.toFixed(1) + '%', avgPass >= 70 ? '#059669' : '#d97706'));
            statsGrid.appendChild(self._yearStatCell('DFW Rate', avgDfw.toFixed(1) + '%', avgDfw <= 20 ? '#059669' : '#dc2626'));
            statsGrid.appendChild(self._yearStatCell('At-Risk', String(totalRisk), totalRisk > 40 ? '#dc2626' : '#059669'));

            // Pass rate bar
            var barWrap = self._mkEl('div', { cls: 'as-mt-2', parent: yearBlock });
            var track = self._mkEl('div', { cls: 'as-progress-track as-progress-track-sm as-an-progress-full', parent: barWrap });
            var barFill = self._mkEl('div', { cls: 'as-progress-fill', parent: track });
            barFill.style.width = avgPass.toFixed(0) + '%';
            barFill.style.background = col;

            body.appendChild(yearBlock);
        });
    }

    /** Returns a DOM element (stat cell) instead of an HTML string */
    _yearStatCell(label, value, color) {
        var cell = document.createElement('div');
        cell.className = 'as-an-metric-cell';
        this._mkEl('div', { cls: 'as-an-metric-label', text: label, parent: cell });
        var valEl = this._mkEl('div', { cls: 'as-an-metric-value', text: value, parent: cell });
        valEl.style.color = color;
        return cell;
    }

    // ── Cohort Throughput ────────────────────────────────────────────────────

    _renderCohortThroughput(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        hdr.appendChild(this._mkIcon('fas fa-filter'));
        hdr.lastChild.className += ' as-an-card-header-icon';
        this._mkEl('span', { cls: 'as-an-card-header-title', text: 'Cohort Throughput', parent: hdr });
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        var self = this;

        this._cohorts.forEach(function(cohort) {
            var cohortEl = document.createElement('div');
            cohortEl.className = 'as-an-cohort-divider';

            var titleRow = document.createElement('div');
            titleRow.className = 'as-flex-row-between as-mb-2';
            var throughput = ((cohort.graduated / cohort.intake) * 100).toFixed(1);

            self._mkEl('span', { cls: 'as-an-card-header-title', text: cohort.year + ' Cohort', parent: titleRow });
            var tpSpan = self._mkEl('span', {
                cls: 'as-an-kpi-sub as-an-tp-value',
                text: throughput + '% throughput',
                parent: titleRow
            });
            tpSpan.style.color = parseFloat(throughput) >= 35 ? '#059669' : '#dc2626';
            cohortEl.appendChild(titleRow);

            // Funnel steps
            var steps = [
                { label: 'Intake', value: cohort.intake, pct: 100 },
                { label: 'End Y1', value: cohort.y1End, pct: ((cohort.y1End / cohort.intake) * 100) },
                { label: 'End Y2', value: cohort.y2End, pct: ((cohort.y2End / cohort.intake) * 100) },
                { label: 'End Y3', value: cohort.y3End, pct: ((cohort.y3End / cohort.intake) * 100) },
                { label: 'Graduated', value: cohort.graduated, pct: ((cohort.graduated / cohort.intake) * 100) }
            ];

            steps.forEach(function(step) {
                var stepRow = self._mkEl('div', { cls: 'as-an-dist-row' });
                var barColor = step.pct >= 75 ? '#059669' : step.pct >= 50 ? '#1d4ed8' : step.pct >= 35 ? '#d97706' : '#dc2626';

                // Label
                self._mkEl('span', { cls: 'as-an-funnel-label', text: step.label, parent: stepRow });

                // Progress bar
                var track = self._mkEl('div', { cls: 'as-progress-track as-progress-track-sm as-flex-1', parent: stepRow });
                var fill = self._mkEl('div', { cls: 'as-progress-fill', parent: track });
                fill.style.width = step.pct.toFixed(0) + '%';
                fill.style.background = barColor;

                // Value + percentage
                var valSpan = self._mkEl('span', { cls: 'as-an-funnel-value', parent: stepRow });
                valSpan.appendChild(document.createTextNode(step.value + ' '));
                self._mkEl('span', { cls: 'as-an-funnel-pct', text: '(' + step.pct.toFixed(0) + '%)', parent: valSpan });

                cohortEl.appendChild(stepRow);
            });

            body.appendChild(cohortEl);
        });
    }

    // ── At-Risk Distribution ─────────────────────────────────────────────────

    _renderAtRiskDistribution(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        hdr.appendChild(this._mkIcon('fas fa-exclamation-triangle'));
        hdr.lastChild.className += ' as-an-card-header-icon';
        this._mkEl('span', { cls: 'as-an-card-header-title', text: 'At-Risk Distribution', parent: hdr });
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        var self = this;

        // Group at-risk by year
        [1, 2, 3].forEach(function(yr) {
            var yrCourses = self._courses.filter(function(c) { return c.year === yr; });
            if (!yrCourses.length) return;

            var totalRisk = yrCourses.reduce(function(s, c) { return s + c.atRisk; }, 0);
            var enrolled = yrCourses[0].enrolled;
            var riskPct = enrolled > 0 ? ((totalRisk / enrolled) * 100).toFixed(1) : 0;
            var riskColor = parseFloat(riskPct) > 30 ? '#dc2626' : parseFloat(riskPct) > 20 ? '#d97706' : '#059669';

            var yrRow = self._mkEl('div', { cls: 'as-an-dist-row', parent: body });
            self._mkEl('span', { cls: 'as-an-dist-label', text: 'Year ' + yr, parent: yrRow });
            var track = self._mkEl('div', { cls: 'as-progress-track as-progress-track-md as-flex-1', parent: yrRow });
            var fill = self._mkEl('div', { cls: 'as-progress-fill', parent: track });
            fill.style.width = riskPct + '%';
            fill.style.background = riskColor;
            var pctSpan = self._mkEl('span', { cls: 'as-an-risk-item-value as-an-risk-pct-right', text: riskPct + '%', parent: yrRow });
            pctSpan.style.color = riskColor;
        });

        // Top at-risk courses
        var topRisk = this._courses.slice().sort(function(a, b) { return b.atRisk - a.atRisk; }).slice(0, 5);
        var topTitle = document.createElement('div');
        topTitle.className = 'as-an-upper-label as-mt-3 as-mb-2';
        topTitle.textContent = 'Highest Risk Courses';
        body.appendChild(topTitle);

        topRisk.forEach(function(c) {
            var riskColor = c.atRisk > 40 ? '#dc2626' : c.atRisk > 20 ? '#d97706' : '#059669';
            var item = self._mkEl('div', {
                cls: 'as-hover-row as-an-risk-item',
                parent: body
            });

            self._mkEl('code', { cls: 'as-an-risk-item-code', text: c.code, parent: item });
            self._mkEl('span', { cls: 'as-an-risk-item-name', text: c.name, parent: item });
            var riskSpan = self._mkEl('span', { cls: 'as-an-risk-item-value', text: String(c.atRisk), parent: item });
            riskSpan.style.color = riskColor;
        });
    }

    // ── GA Coverage ──────────────────────────────────────────────────────────

    _renderGACoverage(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        hdr.appendChild(this._mkIcon('fas fa-border-all'));
        hdr.lastChild.className += ' as-an-card-header-icon';
        this._mkEl('span', { cls: 'as-an-card-header-title', text: 'GA Coverage', parent: hdr });
        this._mkEl('span', { cls: 'as-an-card-header-meta', text: 'Graduate Attributes', parent: hdr });
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        // Overall coverage bar
        var totalMapped = this._data.GA_ATTRIBUTES.reduce(function(s, g) { return s + g.mapped; }, 0);
        var totalPossible = this._data.GA_ATTRIBUTES.reduce(function(s, g) { return s + g.courses; }, 0);
        var overallPct = ((totalMapped / totalPossible) * 100).toFixed(0);
        var overallColor = parseInt(overallPct, 10) >= 80 ? '#059669' : parseInt(overallPct, 10) >= 60 ? '#d97706' : '#dc2626';

        var overallRow = this._mkEl('div', { cls: 'as-an-metric-cell as-mb-3', parent: body });

        var overallTop = this._mkEl('div', { cls: 'as-flex-row-between as-mb-2', parent: overallRow });
        this._mkEl('span', { cls: 'as-an-upper-label', text: 'Overall Coverage', parent: overallTop });
        var overallPctSpan = this._mkEl('span', { cls: 'as-an-risk-item-value', text: overallPct + '%', parent: overallTop });
        overallPctSpan.style.color = overallColor;

        var overallTrack = this._mkEl('div', { cls: 'as-progress-track as-progress-track-md', parent: overallRow });
        var overallFill = this._mkEl('div', { cls: 'as-progress-fill', parent: overallTrack });
        overallFill.style.width = overallPct + '%';
        overallFill.style.background = overallColor;

        // Individual GA bars
        var self = this;
        this._data.GA_ATTRIBUTES.forEach(function(ga) {
            var pct = ((ga.mapped / ga.courses) * 100).toFixed(0);
            var color = parseInt(pct, 10) >= 80 ? '#059669' : parseInt(pct, 10) >= 60 ? '#d97706' : '#dc2626';

            var gaRow = self._mkEl('div', {
                cls: 'as-an-dist-row',
                title: ga.name,
                parent: body
            });

            self._mkEl('span', { cls: 'as-an-dist-label', text: ga.code, parent: gaRow });
            var gaTrack = self._mkEl('div', { cls: 'as-progress-track as-progress-track-sm as-flex-1', parent: gaRow });
            var gaFill = self._mkEl('div', { cls: 'as-progress-fill', parent: gaTrack });
            gaFill.style.width = pct + '%';
            gaFill.style.background = color;
            self._mkEl('span', { cls: 'as-an-dist-summary', text: ga.mapped + '/' + ga.courses, parent: gaRow });
        });
    }

    // ── Course Detail Modal ──────────────────────────────────────────────────

    _showCourseDetail(course) {
        var passRate = course.enrolled > 0 ? ((course.passed / course.enrolled) * 100).toFixed(1) : 0;
        var failCount = course.enrolled - course.passed;
        var riskPct = course.enrolled > 0 ? ((course.atRisk / course.enrolled) * 100).toFixed(1) : 0;

        var content = document.createElement('div');
        content.className = 'as-an-modal-content-sm';

        // Course header
        var headerRow = this._mkEl('div', { cls: 'as-flex-row-center as-mb-3', parent: content });
        this._mkEl('code', { cls: 'as-an-modal-code as-text-muted', text: course.code, parent: headerRow });
        this._mkEl('span', { cls: 'as-an-card-header-title', text: course.name, parent: headerRow });

        // Metrics grid
        var metricsGrid = document.createElement('div');
        metricsGrid.className = 'as-an-metrics-grid';

        var metrics = [
            { label: 'Enrolled', value: String(course.enrolled), color: '#1d4ed8' },
            { label: 'Passed', value: String(course.passed), color: '#059669' },
            { label: 'Failed/DW', value: String(failCount), color: '#dc2626' },
            { label: 'Avg Mark', value: course.avgMark.toFixed(1) + '%', color: course.avgMark >= 50 ? '#059669' : '#dc2626' },
            { label: 'Pass Rate', value: passRate + '%', color: parseFloat(passRate) >= 70 ? '#059669' : '#d97706' },
            { label: 'DFW Rate', value: course.dfw.toFixed(1) + '%', color: course.dfw <= 20 ? '#059669' : '#dc2626' },
            { label: 'At-Risk', value: String(course.atRisk), color: course.atRisk > 30 ? '#dc2626' : '#059669' },
            { label: 'Risk %', value: riskPct + '%', color: parseFloat(riskPct) > 30 ? '#dc2626' : '#059669' },
            { label: 'Credits', value: String(course.credits), color: '#6b7280' }
        ];

        var self = this;
        metrics.forEach(function(m) {
            var cell = self._mkEl('div', { cls: 'as-an-metric-cell', parent: metricsGrid });
            self._mkEl('div', { cls: 'as-an-metric-label', text: m.label, parent: cell });
            var valEl = self._mkEl('div', { cls: 'as-an-metric-value', text: m.value, parent: cell });
            valEl.style.color = m.color;
        });
        content.appendChild(metricsGrid);

        // Pass/Fail bar
        var barWrap = this._mkEl('div', { cls: 'as-mb-2', parent: content });
        this._mkEl('div', { cls: 'as-an-upper-label as-mb-2', text: 'Pass / Fail Distribution', parent: barWrap });

        var barContainer = this._mkEl('div', { cls: 'as-an-bar-container-lg', parent: barWrap });
        barContainer.style.height = '20px';

        // Pass segment
        var passSegment = document.createElement('div');
        passSegment.className = 'as-an-bar-segment as-an-bar-pass';
        passSegment.style.width = passRate + '%';
        barContainer.appendChild(passSegment);
        this._mkEl('span', { cls: 'as-an-bar-segment-label', text: course.passed + ' passed', parent: passSegment });

        // Fail segment
        var failSegment = document.createElement('div');
        failSegment.className = 'as-an-bar-segment as-flex-1 as-an-bar-fail';
        barContainer.appendChild(failSegment);
        this._mkEl('span', { cls: 'as-an-bar-segment-label', text: failCount + ' failed/DW', parent: failSegment });

        // Year & Semester info
        this._mkEl('div', {
            cls: 'as-an-kpi-sub as-mt-2',
            text: 'Year ' + course.year + ' \u00b7 Semester ' + course.semester + ' \u00b7 ' + course.credits + ' credits',
            parent: content
        });

        new uiModal({
            title: course.code + ' \u2014 Course Detail',
            size: 'md',
            body: content,
            buttons: [
                { label: 'Close', variant: 'ghost', onClick: function(modal) { modal.close(); } }
            ]
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgOverviewPanel;
}
if (typeof window !== 'undefined') {
    window.ProgOverviewPanel = ProgOverviewPanel;
}
