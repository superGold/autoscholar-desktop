/**
 * CohortComparePanel — Side-by-side comparison of two cohort years
 *
 * Delta highlighting for throughput, retention, DFW, average marks.
 * Parallel funnel bars for visual comparison.
 */
class CohortComparePanel {

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._selectedProg = config.programme || 'NDIT';
        this._yearA = config.yearA || 2024;
        this._yearB = config.yearB || 2023;
        this._dataLoaded = false;
        this._cohortA = null;
        this._cohortB = null;
        this._data = config.bridge || ProgAnalystData;
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderEmptyStage();
    }

    // ══════════════════════════════════════════════════════════════════════
    // CONTROL
    // ══════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        while (el.firstChild) el.removeChild(el.firstChild);
        var self = this;

        var accordion = new uiAccordion({
            exclusive: true,
            content: {
                params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
                delta: { label: '<i class="fas fa-exchange-alt" style="margin-right:0.3rem;"></i>Delta Summary' }
            },
            parent: el
        });

        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._deltaEl = accordion.el.querySelector('.ui-accordion-item[data-key="delta"] .ui-accordion-content');

        // Programme
        this._addLabel(paramsEl, 'Programme');
        var progSelect = this._addSelect(paramsEl, this._data.PROGRAMMES.map(function(p) { return { value: p.code, label: p.name }; }), this._selectedProg);
        progSelect.addEventListener('change', function() { self._selectedProg = progSelect.value; });

        // Cohort A
        var years = this._data.COHORTS.map(function(c) { return { value: String(c.year), label: String(c.year) }; });
        this._addLabel(paramsEl, 'Cohort A');
        var selA = this._addSelect(paramsEl, years, String(this._yearA));
        selA.addEventListener('change', function() { self._yearA = parseInt(selA.value, 10); });

        // Cohort B
        this._addLabel(paramsEl, 'Cohort B');
        var selB = this._addSelect(paramsEl, years, String(this._yearB));
        selB.addEventListener('change', function() { self._yearB = parseInt(selB.value, 10); });

        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        paramsEl.appendChild(btnWrap);
        new uiButton({
            label: 'Compare', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-columns"></i>',
            parent: btnWrap,
            onClick: function() {
                self._loadData();
                self._renderDashboard();
                self._renderDeltaSummary();
            }
        });

        this._renderDeltaSummary();
    }

    _renderDeltaSummary() {
        var el = this._deltaEl;
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
        if (!this._dataLoaded) {
            var emptyMsg = document.createElement('div');
            emptyMsg.className = 'as-an-ctrl-hint';
            emptyMsg.textContent = 'Run comparison to see deltas';
            el.appendChild(emptyMsg);
            return;
        }
        var a = this._cohortA, b = this._cohortB;
        if (!a || !b) return;
        var tpA = ((a.graduated / a.intake) * 100).toFixed(1);
        var tpB = ((b.graduated / b.intake) * 100).toFixed(1);
        var delta = (parseFloat(tpA) - parseFloat(tpB)).toFixed(1);
        var deltaClass = parseFloat(delta) >= 0 ? 'as-color-positive' : 'as-color-negative';

        var wrap = document.createElement('div');
        wrap.className = 'as-an-ctrl-stats';

        var line1 = document.createElement('div');
        line1.appendChild(document.createTextNode('Throughput \u0394: '));
        var strong1 = document.createElement('strong');
        strong1.className = deltaClass;
        strong1.textContent = (parseFloat(delta) >= 0 ? '+' : '') + delta + '%';
        line1.appendChild(strong1);
        wrap.appendChild(line1);

        var line2 = document.createElement('div');
        line2.appendChild(document.createTextNode('A: '));
        var strongA = document.createElement('strong');
        strongA.textContent = tpA + '%';
        line2.appendChild(strongA);
        line2.appendChild(document.createTextNode(' vs B: '));
        var strongB = document.createElement('strong');
        strongB.textContent = tpB + '%';
        line2.appendChild(strongB);
        wrap.appendChild(line2);

        el.appendChild(wrap);
    }

    _loadData() {
        var self = this;
        this._cohortA = this._data.COHORTS.find(function(c) { return c.year === self._yearA; });
        this._cohortB = this._data.COHORTS.find(function(c) { return c.year === self._yearB; });
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
            title: 'Cohort Comparison',
            message: 'Select two cohort years and click "Compare" to see side-by-side metrics with delta highlighting.',
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

        if (!this._cohortA || !this._cohortB) {
            var noData = document.createElement('div');
            noData.className = 'as-an-empty-msg';
            noData.textContent = 'Select two different cohort years with available data.';
            wrap.appendChild(noData);
            return;
        }

        // Header
        var header = document.createElement('div');
        header.className = 'as-an-panel-header';

        var badge = document.createElement('span');
        badge.className = 'as-an-panel-badge as-an-panel-badge-compare';
        var badgeIcon = document.createElement('i');
        badgeIcon.className = 'fas fa-columns';
        badge.appendChild(badgeIcon);
        badge.appendChild(document.createTextNode('Cohort Comparison'));
        header.appendChild(badge);

        var yearSpan = document.createElement('span');
        yearSpan.className = 'as-an-panel-subtitle';
        yearSpan.textContent = this._yearA + ' vs ' + this._yearB;
        header.appendChild(yearSpan);

        wrap.appendChild(header);

        this._renderKPIs(wrap);
        this._renderComparisonTable(wrap);
        this._renderFunnelOverlay(wrap);
    }

    _renderKPIs(parent) {
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        parent.appendChild(row);

        var a = this._cohortA, b = this._cohortB;
        var tpA = (a.graduated / a.intake * 100).toFixed(1);
        var tpB = (b.graduated / b.intake * 100).toFixed(1);
        var retA = (a.y1End / a.intake * 100).toFixed(1);
        var retB = (b.y1End / b.intake * 100).toFixed(1);

        var retPositive = parseFloat(retA) >= parseFloat(retB);
        var tpPositive = parseFloat(tpA) >= parseFloat(tpB);

        var kpis = [
            { label: 'Throughput A', value: tpA + '%', icon: 'filter', variant: 'as-an-kpi-card-cohort-a' },
            { label: 'Throughput B', value: tpB + '%', icon: 'filter', variant: 'as-an-kpi-card-cohort-b' },
            { label: 'Retention \u0394', value: this._delta(retA, retB), icon: 'user-check', variant: retPositive ? 'as-an-kpi-card-positive' : 'as-an-kpi-card-negative' },
            { label: 'Throughput \u0394', value: this._delta(tpA, tpB), icon: 'exchange-alt', variant: tpPositive ? 'as-an-kpi-card-positive' : 'as-an-kpi-card-negative' }
        ];

        kpis.forEach(function(k) {
            var card = document.createElement('div');
            card.className = 'as-an-kpi-card ' + k.variant;

            var topRow = document.createElement('div');
            topRow.className = 'as-an-kpi-card-header';
            var icon = document.createElement('i');
            icon.className = 'fas fa-' + k.icon + ' as-an-kpi-icon';
            topRow.appendChild(icon);
            var labelSpan = document.createElement('span');
            labelSpan.className = 'as-an-kpi-label';
            labelSpan.textContent = k.label;
            topRow.appendChild(labelSpan);
            card.appendChild(topRow);

            var valueDiv = document.createElement('div');
            valueDiv.className = 'as-an-kpi-value';
            valueDiv.textContent = k.value;
            card.appendChild(valueDiv);

            row.appendChild(card);
        });
    }

    _renderComparisonTable(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var hdrIcon = document.createElement('i');
        hdrIcon.className = 'fas fa-table as-an-card-header-icon';
        hdr.appendChild(hdrIcon);
        var hdrLabel = document.createElement('span');
        hdrLabel.className = 'as-an-card-header-title';
        hdrLabel.textContent = 'Metric Comparison';
        hdr.appendChild(hdrLabel);
        card.appendChild(hdr);

        var a = this._cohortA, b = this._cohortB;
        var self = this;

        var metrics = [
            { label: 'Intake', valA: a.intake, valB: b.intake, fmt: 'num' },
            { label: 'Y1 Retention', valA: (a.y1End / a.intake * 100).toFixed(1), valB: (b.y1End / b.intake * 100).toFixed(1), fmt: 'pct' },
            { label: 'Y2 Retention', valA: (a.y2End / a.intake * 100).toFixed(1), valB: (b.y2End / b.intake * 100).toFixed(1), fmt: 'pct' },
            { label: 'Y3 Retention', valA: (a.y3End / a.intake * 100).toFixed(1), valB: (b.y3End / b.intake * 100).toFixed(1), fmt: 'pct' },
            { label: 'Graduated', valA: a.graduated, valB: b.graduated, fmt: 'num' },
            { label: 'Throughput', valA: (a.graduated / a.intake * 100).toFixed(1), valB: (b.graduated / b.intake * 100).toFixed(1), fmt: 'pct' },
            { label: 'Dropouts', valA: a.dropouts, valB: b.dropouts, fmt: 'num', invert: true },
            { label: 'Repeaters', valA: a.repeat, valB: b.repeat, fmt: 'num', invert: true },
            { label: 'AYOS', valA: a.avgYearsToComplete, valB: b.avgYearsToComplete, fmt: 'num', invert: true }
        ];

        var table = document.createElement('table');
        table.className = 'as-an-data-table';

        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        headRow.className = 'as-an-thead-row';

        var headers = [
            { text: 'Metric', css: 'as-an-th-left' },
            { text: String(this._yearA), css: 'as-an-th-center as-color-cohort-a' },
            { text: String(this._yearB), css: 'as-an-th-center as-color-cohort-b' },
            { text: 'Delta', css: 'as-an-th-center' },
            { text: 'Trend', css: 'as-an-th-center' }
        ];
        headers.forEach(function(h) {
            var th = document.createElement('th');
            th.className = h.css;
            th.textContent = h.text;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        card.appendChild(table);

        metrics.forEach(function(m) {
            var numA = parseFloat(m.valA);
            var numB = parseFloat(m.valB);
            var diff = numA - numB;
            var improved = m.invert ? diff <= 0 : diff >= 0;
            var deltaStr = (diff >= 0 ? '+' : '') + (m.fmt === 'pct' ? diff.toFixed(1) + '%' : diff.toFixed(1));
            var deltaClass = improved ? 'as-an-delta-positive' : 'as-an-delta-negative';
            var trendClass = improved ? 'as-an-trend-positive' : 'as-an-trend-negative';
            var arrow = improved ? '\u25B2' : '\u25BC';

            var tr = document.createElement('tr');

            var tdLabel = document.createElement('td');
            tdLabel.className = 'as-an-td-base-bold';
            tdLabel.textContent = m.label;
            tr.appendChild(tdLabel);

            var tdA = document.createElement('td');
            tdA.className = 'as-an-td-center-bold-blue';
            tdA.textContent = m.valA + (m.fmt === 'pct' ? '%' : '');
            tr.appendChild(tdA);

            var tdB = document.createElement('td');
            tdB.className = 'as-an-td-center-bold-purple';
            tdB.textContent = m.valB + (m.fmt === 'pct' ? '%' : '');
            tr.appendChild(tdB);

            var tdDelta = document.createElement('td');
            tdDelta.className = 'as-an-td-center-base';
            var deltaSpan = document.createElement('span');
            deltaSpan.className = deltaClass;
            deltaSpan.textContent = deltaStr;
            tdDelta.appendChild(deltaSpan);
            tr.appendChild(tdDelta);

            var tdTrend = document.createElement('td');
            tdTrend.className = 'as-an-td-center-base ' + trendClass;
            tdTrend.textContent = arrow;
            tr.appendChild(tdTrend);

            tbody.appendChild(tr);
        });
    }

    _renderFunnelOverlay(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var hdrIcon = document.createElement('i');
        hdrIcon.className = 'fas fa-chart-bar as-an-card-header-icon';
        hdr.appendChild(hdrIcon);
        var hdrLabel = document.createElement('span');
        hdrLabel.className = 'as-an-card-header-title';
        hdrLabel.textContent = 'Parallel Funnel';
        hdr.appendChild(hdrLabel);
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        var a = this._cohortA, b = this._cohortB;
        var stages = ['Intake', 'End Y1', 'End Y2', 'End Y3', 'Graduated'];
        var valsA = [a.intake, a.y1End, a.y2End, a.y3End, a.graduated];
        var valsB = [b.intake, b.y1End, b.y2End, b.y3End, b.graduated];
        var maxVal = Math.max(a.intake, b.intake);

        stages.forEach(function(label, i) {
            var pctA = (valsA[i] / maxVal * 100).toFixed(0);
            var pctB = (valsB[i] / maxVal * 100).toFixed(0);

            var row = document.createElement('div');
            row.className = 'as-mb-2';

            // Stage label
            var stageLabel = document.createElement('div');
            stageLabel.className = 'as-an-dist-label';
            stageLabel.textContent = label;
            row.appendChild(stageLabel);

            // Bar A
            var barRowA = document.createElement('div');
            barRowA.className = 'as-an-dist-row';
            var valLabelA = document.createElement('span');
            valLabelA.className = 'as-an-dist-summary as-color-cohort-a';
            valLabelA.textContent = String(valsA[i]);
            barRowA.appendChild(valLabelA);
            var barTrackA = document.createElement('div');
            barTrackA.className = 'as-an-bar-container';
            var barFillA = document.createElement('div');
            barFillA.className = 'as-bar-fill as-bar-fill-cohort-a';
            barFillA.style.width = pctA + '%';
            barTrackA.appendChild(barFillA);
            barRowA.appendChild(barTrackA);
            row.appendChild(barRowA);

            // Bar B
            var barRowB = document.createElement('div');
            barRowB.className = 'as-an-dist-row';
            var valLabelB = document.createElement('span');
            valLabelB.className = 'as-an-dist-summary as-color-cohort-b';
            valLabelB.textContent = String(valsB[i]);
            barRowB.appendChild(valLabelB);
            var barTrackB = document.createElement('div');
            barTrackB.className = 'as-an-bar-container';
            var barFillB = document.createElement('div');
            barFillB.className = 'as-bar-fill as-bar-fill-cohort-b';
            barFillB.style.width = pctB + '%';
            barTrackB.appendChild(barFillB);
            barRowB.appendChild(barTrackB);
            row.appendChild(barRowB);

            body.appendChild(row);
        });

        // Legend
        var legend = document.createElement('div');
        legend.className = 'as-an-legend-compact';

        var legendA = document.createElement('div');
        var swatchA = document.createElement('span');
        swatchA.className = 'as-an-swatch as-bg-cohort-a';
        legendA.appendChild(swatchA);
        legendA.appendChild(document.createTextNode(String(this._yearA)));
        legend.appendChild(legendA);

        var legendB = document.createElement('div');
        var swatchB = document.createElement('span');
        swatchB.className = 'as-an-swatch as-bg-cohort-b';
        legendB.appendChild(swatchB);
        legendB.appendChild(document.createTextNode(String(this._yearB)));
        legend.appendChild(legendB);

        body.appendChild(legend);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    _delta(a, b) {
        var d = (parseFloat(a) - parseFloat(b)).toFixed(1);
        return (parseFloat(d) >= 0 ? '+' : '') + d + '%';
    }

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
if (typeof module !== 'undefined' && module.exports) { module.exports = CohortComparePanel; }
if (typeof window !== 'undefined') { window.CohortComparePanel = CohortComparePanel; }
