/**
 * GatekeeperPanel — Rank courses by gatekeeper score (DFW × downstream impact)
 *
 * Surfaces bottleneck courses with actionable recommendations.
 * Uses ProgAnalystData for shared course and prerequisite data.
 */
class GatekeeperPanel {

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._selectedProg = config.programme || 'NDIT';
        this._dfwThreshold = config.dfwThreshold || 20;
        this._dataLoaded = false;
        this._gatekeepers = [];
        this._data = config.bridge || ProgAnalystData;
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderEmptyStage();
    }

    // ══════════════════════════════════════════════════════════════════════
    // CONTROL PANEL
    // ══════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        while (el.firstChild) el.removeChild(el.firstChild);
        var self = this;

        var accordion = new uiAccordion({
            exclusive: true,
            content: {
                params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
                summary: { label: '<i class="fas fa-door-closed" style="margin-right:0.3rem;"></i>Gatekeeper Summary' }
            },
            parent: el
        });

        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._summaryEl = accordion.el.querySelector('.ui-accordion-item[data-key="summary"] .ui-accordion-content');

        // Programme selector
        this._addLabel(paramsEl, 'Programme');
        var progSelect = this._addSelect(paramsEl, this._data.PROGRAMMES.map(function(p) { return { value: p.code, label: p.name }; }), this._selectedProg);
        progSelect.addEventListener('change', function() { self._selectedProg = progSelect.value; });

        // DFW threshold slider
        var sliderLabel = this._addLabel(paramsEl, 'DFW Threshold: ' + this._dfwThreshold + '%');
        var sliderWrap = document.createElement('div');
        sliderWrap.className = 'as-an-ctrl-wrap';
        paramsEl.appendChild(sliderWrap);
        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '5';
        slider.max = '50';
        slider.value = String(this._dfwThreshold);
        slider.className = 'as-an-ctrl-slider';
        slider.addEventListener('input', function() {
            self._dfwThreshold = parseInt(slider.value, 10);
            sliderLabel.textContent = 'DFW Threshold: ' + self._dfwThreshold + '%';
        });
        sliderWrap.appendChild(slider);

        // Detect button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        paramsEl.appendChild(btnWrap);
        new uiButton({
            label: 'Detect Gatekeepers', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-search"></i>',
            parent: btnWrap,
            onClick: function() {
                self._detect();
                self._renderDashboard();
                self._renderSummary();
            }
        });

        this._renderSummary();
    }

    _renderSummary() {
        var el = this._summaryEl;
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
        if (!this._dataLoaded) {
            var hint = document.createElement('div');
            hint.className = 'as-an-ctrl-hint';
            hint.textContent = 'Run detection to see summary';
            el.appendChild(hint);
            return;
        }
        var totalAffected = this._gatekeepers.reduce(function(s, g) { return s + g.course.enrolled; }, 0);
        var summaryDiv = document.createElement('div');
        summaryDiv.className = 'as-an-ctrl-stats';

        var gkRow = document.createElement('div');
        gkRow.appendChild(document.createTextNode('Gatekeepers: '));
        var gkStrong = document.createElement('strong');
        gkStrong.className = 'as-an-ctrl-stats-danger';
        gkStrong.textContent = this._gatekeepers.length;
        gkRow.appendChild(gkStrong);
        summaryDiv.appendChild(gkRow);

        var saRow = document.createElement('div');
        saRow.appendChild(document.createTextNode('Students Affected: '));
        var saStrong = document.createElement('strong');
        saStrong.style.color = 'var(--ui-amber-400, #fbbf24)';
        saStrong.textContent = totalAffected;
        saRow.appendChild(saStrong);
        summaryDiv.appendChild(saRow);

        var thRow = document.createElement('div');
        thRow.appendChild(document.createTextNode('Threshold: '));
        var thStrong = document.createElement('strong');
        thStrong.className = 'as-an-ctrl-stats-value';
        thStrong.textContent = this._dfwThreshold + '% DFW';
        thRow.appendChild(thStrong);
        summaryDiv.appendChild(thRow);

        el.appendChild(summaryDiv);
    }

    // ══════════════════════════════════════════════════════════════════════
    // DATA
    // ══════════════════════════════════════════════════════════════════════

    _detect() {
        var self = this;
        var threshold = this._dfwThreshold;
        var courses = this._data.COURSES;
        this._gatekeepers = courses
            .filter(function(c) { return c.dfw >= threshold; })
            .map(function(c) {
                var downstream = self._data.getAllDownstream(c.code);
                var score = c.dfw * downstream.length;
                return { course: c, downstream: downstream, score: score };
            })
            .sort(function(a, b) { return b.score - a.score; });
        this._dataLoaded = true;
    }

    // ══════════════════════════════════════════════════════════════════════
    // STAGE
    // ══════════════════════════════════════════════════════════════════════

    _renderEmptyStage() {
        while (this._stageEl.firstChild) this._stageEl.removeChild(this._stageEl.firstChild);
        this._stageEl.className = 'as-an-stage-scroll';
        new uiAlert({
            color: 'info',
            title: 'Gatekeeper Detection',
            message: 'Set a DFW threshold and click "Detect Gatekeepers" to identify bottleneck courses with high failure rates and downstream impact.',
            parent: this._stageEl
        });
    }

    _renderDashboard() {
        var stage = this._stageEl;
        while (stage.firstChild) stage.removeChild(stage.firstChild);
        stage.className = 'as-an-stage';

        var wrap = document.createElement('div');
        wrap.className = 'as-an-stage-inner';
        stage.appendChild(wrap);

        // Header
        var prog = this._data.PROGRAMMES.find(function(p) { return p.code === this._selectedProg; }.bind(this));
        var header = document.createElement('div');
        header.className = 'as-an-panel-header';
        var headerBadge = document.createElement('span');
        headerBadge.className = 'as-an-panel-badge as-an-panel-badge-gatekeeper';
        var headerIcon = document.createElement('i');
        headerIcon.className = 'fas fa-door-closed';
        headerBadge.appendChild(headerIcon);
        headerBadge.appendChild(document.createTextNode('Gatekeeper Detection'));
        header.appendChild(headerBadge);

        var headerMeta = document.createElement('span');
        headerMeta.className = 'as-an-panel-subtitle';
        headerMeta.textContent = (prog ? prog.name : this._selectedProg) + ' | DFW \u2265 ' + this._dfwThreshold + '%';
        header.appendChild(headerMeta);
        wrap.appendChild(header);

        this._renderKPIs(wrap);
        this._renderTable(wrap);
    }

    _renderKPIs(parent) {
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        parent.appendChild(row);

        var totalAffected = this._gatekeepers.reduce(function(s, g) { return s + g.course.enrolled; }, 0);
        var avgDfw = this._gatekeepers.length > 0 ? (this._gatekeepers.reduce(function(s, g) { return s + g.course.dfw; }, 0) / this._gatekeepers.length).toFixed(1) : '0';
        var worst = this._gatekeepers.length > 0 ? this._gatekeepers[0].course.code : '\u2014';

        var kpis = [
            { label: 'Gatekeepers', value: String(this._gatekeepers.length), icon: 'door-closed', variant: 'red' },
            { label: 'Avg DFW', value: avgDfw + '%', icon: 'chart-line', variant: 'amber' },
            { label: 'Students Affected', value: String(totalAffected), icon: 'users', variant: 'blue' },
            { label: 'Worst Course', value: worst, icon: 'exclamation-triangle', variant: 'red' }
        ];

        kpis.forEach(function(k) {
            var card = document.createElement('div');
            card.className = 'as-an-kpi-card as-an-kpi-card-' + k.variant;
            var cardHeader = document.createElement('div');
            cardHeader.className = 'as-an-kpi-card-header';
            var cardIcon = document.createElement('i');
            cardIcon.className = 'fas fa-' + k.icon + ' as-an-kpi-icon';
            cardHeader.appendChild(cardIcon);
            var cardLabel = document.createElement('span');
            cardLabel.className = 'as-an-kpi-label';
            cardLabel.textContent = k.label;
            cardHeader.appendChild(cardLabel);
            card.appendChild(cardHeader);

            var cardValue = document.createElement('div');
            cardValue.className = 'as-an-kpi-value';
            cardValue.textContent = k.value;
            card.appendChild(cardValue);
            row.appendChild(card);
        });
    }

    _renderTable(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var hdrIcon = document.createElement('i');
        hdrIcon.className = 'fas fa-sort-amount-down as-an-card-header-icon';
        hdr.appendChild(hdrIcon);
        var hdrTitle = document.createElement('span');
        hdrTitle.className = 'as-an-card-header-title';
        hdrTitle.textContent = 'Ranked Gatekeepers';
        hdr.appendChild(hdrTitle);
        var hdrCount = document.createElement('span');
        hdrCount.className = 'as-an-card-header-meta';
        hdrCount.textContent = this._gatekeepers.length + ' courses';
        hdr.appendChild(hdrCount);
        card.appendChild(hdr);

        var tableWrap = document.createElement('div');
        tableWrap.className = 'as-an-table-wrap';
        card.appendChild(tableWrap);

        var table = document.createElement('table');
        table.className = 'as-an-data-table';
        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        headRow.className = 'as-an-thead-row';
        ['Code', 'Course', 'DFW%', 'Pass%', 'Enrolled', 'Blocked', 'Score', 'Trend'].forEach(function(text, i) {
            var th = document.createElement('th');
            if (i >= 2) th.className = 'as-an-td-center';
            th.textContent = text;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        tableWrap.appendChild(table);

        var self = this;

        this._gatekeepers.forEach(function(g) {
            var c = g.course;
            var passRate = c.enrolled > 0 ? ((c.passed / c.enrolled) * 100).toFixed(1) : '0';
            // DFW badge uses hex + alpha suffix for background, so raw hex is needed here
            var dfwHex = c.dfw >= 35 ? '#dc2626' : c.dfw >= 25 ? '#d97706' : '#059669';
            var passColor = parseFloat(passRate) >= 70 ? 'var(--ui-green-600, #059669)' : parseFloat(passRate) >= 55 ? 'var(--ui-blue-700, #1d4ed8)' : 'var(--ui-red-600, #dc2626)';

            var tr = document.createElement('tr');
            tr.className = 'as-an-clickable-row';

            // Code cell
            var tdCode = document.createElement('td');
            tdCode.className = 'as-an-td-code';
            var codeIcon = document.createElement('i');
            codeIcon.className = 'fas fa-door-closed as-an-gk-icon-sm-mr';
            tdCode.appendChild(codeIcon);
            tdCode.appendChild(document.createTextNode(c.code));
            tr.appendChild(tdCode);

            // Name cell
            var tdName = document.createElement('td');
            tdName.textContent = c.name;
            tr.appendChild(tdName);

            // DFW% cell — badge color is dynamic (threshold-based)
            var tdDfw = document.createElement('td');
            tdDfw.className = 'as-an-td-center';
            var dfwBadge = document.createElement('span');
            dfwBadge.className = 'as-an-badge-sm';
            dfwBadge.style.background = dfwHex + '15';
            dfwBadge.style.color = dfwHex;
            dfwBadge.textContent = c.dfw.toFixed(1) + '%';
            tdDfw.appendChild(dfwBadge);
            tr.appendChild(tdDfw);

            // Pass% cell — color is dynamic (threshold-based)
            var tdPass = document.createElement('td');
            tdPass.className = 'as-an-td-center';
            var passSpan = document.createElement('span');
            passSpan.style.color = passColor;
            passSpan.style.fontWeight = '600';
            passSpan.textContent = passRate + '%';
            tdPass.appendChild(passSpan);
            tr.appendChild(tdPass);

            // Enrolled cell
            var tdEnrolled = document.createElement('td');
            tdEnrolled.className = 'as-an-td-center';
            tdEnrolled.textContent = c.enrolled;
            tr.appendChild(tdEnrolled);

            // Blocked cell
            var tdBlocked = document.createElement('td');
            tdBlocked.className = 'as-an-td-center';
            tdBlocked.style.fontWeight = '600';
            tdBlocked.style.color = 'var(--ui-secondary, #7c3aed)';
            tdBlocked.textContent = g.downstream.length;
            tr.appendChild(tdBlocked);

            // Score cell
            var tdScore = document.createElement('td');
            tdScore.className = 'as-an-td-center';
            var scoreBadge = document.createElement('span');
            scoreBadge.className = 'as-an-badge-sm as-an-badge-red';
            scoreBadge.textContent = g.score.toFixed(0);
            tdScore.appendChild(scoreBadge);
            tr.appendChild(tdScore);

            // Trend cell (sparkline SVG — kept as innerHTML)
            var tdTrend = document.createElement('td');
            tdTrend.className = 'as-an-td-center';
            tdTrend.innerHTML = self._sparkline(c.dfwHistory);
            tr.appendChild(tdTrend);

            tr.addEventListener('click', function() { self._showDetail(g); });
            tbody.appendChild(tr);
        });

        if (!this._gatekeepers.length) {
            var emptyRow = document.createElement('tr');
            var emptyTd = document.createElement('td');
            emptyTd.colSpan = 8;
            emptyTd.className = 'as-an-empty-td';
            emptyTd.textContent = 'No courses exceed the DFW threshold';
            emptyRow.appendChild(emptyTd);
            tbody.appendChild(emptyRow);
        }
    }

    _sparkline(history) {
        if (!history || !history.length) return '\u2014';
        var max = Math.max.apply(null, history);
        var min = Math.min.apply(null, history);
        var range = max - min || 1;
        var w = 48, h = 16;
        var step = w / (history.length - 1);
        var points = history.map(function(v, i) {
            return (i * step).toFixed(1) + ',' + (h - ((v - min) / range) * h).toFixed(1);
        }).join(' ');
        var trend = history[history.length - 1] <= history[0] ? 'var(--ui-green-600, #059669)' : 'var(--ui-red-600, #dc2626)';
        return '<svg width="' + w + '" height="' + h + '" style="vertical-align:middle;">' +
            '<polyline points="' + points + '" fill="none" stroke="' + trend + '" stroke-width="1.5" stroke-linecap="round"/>' +
            '</svg>';
    }

    _showDetail(gatekeeper) {
        var c = gatekeeper.course;
        var passRate = c.enrolled > 0 ? ((c.passed / c.enrolled) * 100).toFixed(1) : '0';

        var content = document.createElement('div');
        content.className = 'as-an-modal-content';

        // Header
        var detailHeader = document.createElement('div');
        detailHeader.className = 'as-an-panel-header';
        var detailIcon = document.createElement('i');
        detailIcon.className = 'fas fa-door-closed';
        detailIcon.style.color = 'var(--ui-red-600, #dc2626)';
        detailHeader.appendChild(detailIcon);
        var detailCode = document.createElement('code');
        detailCode.className = 'as-text-sm as-text-bold';
        detailCode.textContent = c.code;
        detailHeader.appendChild(detailCode);
        var detailName = document.createElement('span');
        detailName.className = 'as-an-card-header-title';
        detailName.textContent = c.name;
        detailHeader.appendChild(detailName);
        content.appendChild(detailHeader);

        // Metrics
        var metricsGrid = document.createElement('div');
        metricsGrid.className = 'as-an-metrics-grid';
        [
            { label: 'DFW Rate', value: c.dfw.toFixed(1) + '%', color: 'var(--ui-red-600, #dc2626)' },
            { label: 'Pass Rate', value: passRate + '%', color: parseFloat(passRate) >= 70 ? 'var(--ui-green-600, #059669)' : 'var(--ui-amber-600, #d97706)' },
            { label: 'Enrolled', value: String(c.enrolled), color: 'var(--ui-blue-700, #1d4ed8)' },
            { label: 'Blocked Courses', value: String(gatekeeper.downstream.length), color: 'var(--ui-secondary, #7c3aed)' },
            { label: 'Gatekeeper Score', value: gatekeeper.score.toFixed(0), color: 'var(--ui-red-600, #dc2626)' },
            { label: 'At-Risk', value: String(c.atRisk), color: c.atRisk > 30 ? 'var(--ui-red-600, #dc2626)' : 'var(--ui-green-600, #059669)' }
        ].forEach(function(m) {
            var cell = document.createElement('div');
            cell.className = 'as-an-metric-cell';
            var cellLabel = document.createElement('div');
            cellLabel.className = 'as-an-metric-label';
            cellLabel.textContent = m.label;
            cell.appendChild(cellLabel);
            var cellValue = document.createElement('div');
            cellValue.className = 'as-an-metric-value';
            cellValue.style.color = m.color;
            cellValue.textContent = m.value;
            cell.appendChild(cellValue);
            metricsGrid.appendChild(cell);
        });
        content.appendChild(metricsGrid);

        // Downstream impact list
        if (gatekeeper.downstream.length) {
            var downTitle = document.createElement('div');
            downTitle.className = 'as-an-rec-title';
            downTitle.style.color = 'var(--ui-gray-600)';
            downTitle.textContent = 'Downstream Impact (' + gatekeeper.downstream.length + ' courses blocked)';
            content.appendChild(downTitle);

            var downList = document.createElement('div');
            downList.className = 'as-an-info-wrap';
            downList.style.marginBottom = '0.75rem';
            gatekeeper.downstream.forEach(function(code) {
                var badge = document.createElement('span');
                badge.className = 'as-an-badge-sm as-an-badge-purple';
                badge.textContent = code;
                downList.appendChild(badge);
            });
            content.appendChild(downList);
        }

        // Recommendation
        var recWrap = document.createElement('div');
        recWrap.className = 'as-an-rec-wrap';
        var rec = c.dfw >= 35
            ? 'Critical gatekeeper. Consider: supplemental instruction, split-level tutorials, prerequisite readiness checks, or curriculum restructuring.'
            : 'Moderate gatekeeper. Consider: peer tutoring, early warning monitoring, or additional tutorial sessions.';
        var recTitle = document.createElement('div');
        recTitle.className = 'as-an-rec-title';
        var recIcon = document.createElement('i');
        recIcon.className = 'fas fa-lightbulb';
        recIcon.style.marginRight = '0.2rem';
        recTitle.appendChild(recIcon);
        recTitle.appendChild(document.createTextNode('Recommendation'));
        recWrap.appendChild(recTitle);
        var recBody = document.createElement('div');
        recBody.className = 'as-an-rec-body';
        recBody.textContent = rec;
        recWrap.appendChild(recBody);
        content.appendChild(recWrap);

        new uiModal({
            title: c.code + ' \u2014 Gatekeeper Detail',
            size: 'md',
            body: content,
            buttons: [{ label: 'Close', variant: 'ghost', onClick: function(modal) { modal.close(); } }]
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    _addLabel(parent, text) {
        var label = document.createElement('label');
        label.className = 'as-an-ctrl-label';
        label.textContent = text;
        parent.appendChild(label);
        return label;
    }

    _addSelect(parent, options, value) {
        var wrap = document.createElement('div');
        wrap.className = 'ui-input-wrapper as-an-ctrl-wrap';
        parent.appendChild(wrap);
        var select = document.createElement('select');
        select.className = 'ui-input as-an-ctrl-select';
        options.forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            select.appendChild(opt);
        });
        select.value = value;
        wrap.appendChild(select);
        return select;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) { module.exports = GatekeeperPanel; }
if (typeof window !== 'undefined') { window.GatekeeperPanel = GatekeeperPanel; }
