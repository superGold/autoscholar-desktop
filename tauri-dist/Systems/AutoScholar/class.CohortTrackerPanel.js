/**
 * CohortTrackerPanel — Sankey-style cohort flow + attrition analysis
 *
 * Shows cohort movement: Intake → Y1 → Y2 → Y3 → Graduated,
 * with branches for repeat/drop/excluded. SVG Sankey diagram.
 */
class CohortTrackerPanel {

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._selectedProg = config.programme || 'NDIT';
        this._selectedYear = config.year || 2024;
        this._dataLoaded = false;
        this._cohort = null;
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
                info: { label: '<i class="fas fa-info-circle" style="margin-right:0.3rem;"></i>Cohort Info' }
            },
            parent: el
        });

        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._infoEl = accordion.el.querySelector('.ui-accordion-item[data-key="info"] .ui-accordion-content');

        // Programme selector
        this._addLabel(paramsEl, 'Programme');
        var progSelect = this._addSelect(paramsEl, this._data.PROGRAMMES.map(function(p) { return { value: p.code, label: p.name }; }), this._selectedProg);
        progSelect.addEventListener('change', function() { self._selectedProg = progSelect.value; });

        // Entry year selector
        this._addLabel(paramsEl, 'Entry Year');
        var years = this._data.COHORTS.map(function(c) { return { value: String(c.year), label: String(c.year) }; });
        var yearSelect = this._addSelect(paramsEl, years, String(this._selectedYear));
        yearSelect.addEventListener('change', function() { self._selectedYear = parseInt(yearSelect.value, 10); });

        // Track button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        paramsEl.appendChild(btnWrap);
        new uiButton({
            label: 'Track Cohort', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-route"></i>',
            parent: btnWrap,
            onClick: function() {
                self._loadCohort();
                self._renderDashboard();
                self._renderInfo();
            }
        });

        this._renderInfo();
    }

    _renderInfo() {
        var el = this._infoEl;
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
        if (!this._dataLoaded || !this._cohort) {
            var placeholder = document.createElement('div');
            placeholder.className = 'as-an-ctrl-hint';
            placeholder.textContent = 'Track a cohort to see info';
            el.appendChild(placeholder);
            return;
        }
        var c = this._cohort;
        var throughput = ((c.graduated / c.intake) * 100).toFixed(1);
        var dropout = ((c.dropouts / c.intake) * 100).toFixed(1);
        var infoWrap = document.createElement('div');
        infoWrap.className = 'as-an-ctrl-stats';

        var items = [
            { label: 'Intake: ', value: String(c.intake), color: 'rgba(255,255,255,0.9)' },
            { label: 'Throughput: ', value: throughput + '%', color: (parseFloat(throughput) >= 35 ? '#34d399' : '#f87171') },
            { label: 'Dropout: ', value: dropout + '%', color: '#f87171' },
            { label: 'AYOS: ', value: String(c.avgYearsToComplete), color: 'rgba(255,255,255,0.9)' }
        ];
        items.forEach(function(item) {
            var line = document.createElement('div');
            line.appendChild(document.createTextNode(item.label));
            var strong = document.createElement('strong');
            strong.style.color = item.color;
            strong.textContent = item.value;
            line.appendChild(strong);
            infoWrap.appendChild(line);
        });
        el.appendChild(infoWrap);
    }

    _loadCohort() {
        this._cohort = this._data.COHORTS.find(function(c) { return c.year === this._selectedYear; }.bind(this));
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
            title: 'Cohort Tracker',
            message: 'Select a programme and entry year, then click "Track Cohort" to view the Sankey flow diagram showing cohort progression and attrition.',
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

        if (!this._cohort) {
            var noData = document.createElement('div');
            noData.className = 'as-an-empty-msg';
            noData.textContent = 'No cohort data for selected year.';
            wrap.appendChild(noData);
            return;
        }

        // Header
        var prog = this._data.PROGRAMMES.find(function(p) { return p.code === this._selectedProg; }.bind(this));
        var header = document.createElement('div');
        header.className = 'as-an-panel-header';
        var badge = document.createElement('span');
        badge.className = 'as-an-panel-badge as-an-panel-badge-cohort';
        var badgeIcon = document.createElement('i');
        badgeIcon.className = 'fas fa-layer-group as-an-mr-xs';
        badge.appendChild(badgeIcon);
        badge.appendChild(document.createTextNode('Cohort Tracker'));
        header.appendChild(badge);
        var subtitle = document.createElement('span');
        subtitle.className = 'as-an-panel-subtitle';
        subtitle.textContent = (prog ? prog.name : '') + ' | ' + this._cohort.year + ' Entry';
        header.appendChild(subtitle);
        wrap.appendChild(header);

        this._renderKPIs(wrap);
        this._renderSankey(wrap);
        this._renderAttritionTable(wrap);
        this._renderAYOS(wrap);
    }

    _renderKPIs(parent) {
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        parent.appendChild(row);

        var c = this._cohort;
        var throughput = ((c.graduated / c.intake) * 100).toFixed(1);
        var dropout = ((c.dropouts / c.intake) * 100).toFixed(1);
        var current = c.y3End;

        var kpis = [
            { label: 'Intake', value: String(c.intake), icon: 'sign-in-alt', color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Current', value: String(current), icon: 'users', color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Graduated', value: String(c.graduated), icon: 'graduation-cap', color: '#059669', bg: '#f0fdf4' },
            { label: 'Dropout Rate', value: dropout + '%', icon: 'user-minus', color: '#dc2626', bg: '#fef2f2' },
            { label: 'AYOS', value: String(c.avgYearsToComplete), icon: 'clock', color: '#d97706', bg: '#fffbeb' }
        ];

        kpis.forEach(function(k) {
            var card = document.createElement('div');
            card.className = 'as-an-kpi-card';
            card.style.background = k.bg;
            card.style.borderColor = k.color + '18';
            var labelRow = document.createElement('div');
            labelRow.className = 'as-an-kpi-card-header';
            var kIcon = document.createElement('i');
            kIcon.className = 'fas fa-' + k.icon + ' as-an-kpi-icon';
            kIcon.style.color = k.color;
            labelRow.appendChild(kIcon);
            var kLabel = document.createElement('span');
            kLabel.className = 'as-an-kpi-label';
            kLabel.textContent = k.label;
            labelRow.appendChild(kLabel);
            card.appendChild(labelRow);
            var kValue = document.createElement('div');
            kValue.className = 'as-an-kpi-value';
            kValue.style.color = k.color;
            kValue.textContent = k.value;
            card.appendChild(kValue);
            row.appendChild(card);
        });
    }

    _renderSankey(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var sankeyIcon = document.createElement('i');
        sankeyIcon.className = 'fas fa-stream as-an-card-header-icon';
        hdr.appendChild(sankeyIcon);
        var sankeyLabel = document.createElement('span');
        sankeyLabel.className = 'as-an-card-header-title';
        sankeyLabel.textContent = 'Cohort Flow';
        hdr.appendChild(sankeyLabel);
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        var c = this._cohort;
        var W = 700, H = 200;
        var stages = [
            { label: 'Intake', value: c.intake },
            { label: 'End Y1', value: c.y1End },
            { label: 'End Y2', value: c.y2End },
            { label: 'End Y3', value: c.y3End },
            { label: 'Graduated', value: c.graduated }
        ];
        var maxVal = stages[0].value;
        var stageW = 80;
        var gap = (W - stageW * stages.length) / (stages.length - 1);
        var colors = ['#1d4ed8', '#7c3aed', '#d97706', '#059669', '#059669'];

        var svg = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;">';

        // Draw flow paths between stages
        for (var i = 0; i < stages.length - 1; i++) {
            var x1 = i * (stageW + gap) + stageW;
            var x2 = (i + 1) * (stageW + gap);
            var h1 = (stages[i].value / maxVal) * 140;
            var h2 = (stages[i + 1].value / maxVal) * 140;
            var y1 = (H - h1) / 2;
            var y2 = (H - h2) / 2;

            // Main flow path
            svg += '<path d="M' + x1 + ',' + y1 + ' C' + (x1 + gap / 2) + ',' + y1 + ' ' + (x2 - gap / 2) + ',' + y2 + ' ' + x2 + ',' + y2 +
                ' L' + x2 + ',' + (y2 + h2) +
                ' C' + (x2 - gap / 2) + ',' + (y2 + h2) + ' ' + (x1 + gap / 2) + ',' + (y1 + h1) + ' ' + x1 + ',' + (y1 + h1) +
                ' Z" fill="' + colors[i] + '" opacity="0.2"/>';

            // Loss branch (red)
            var loss = stages[i].value - stages[i + 1].value;
            if (loss > 0) {
                var lossH = (loss / maxVal) * 140;
                var ly1 = y1 + h1 - lossH;
                svg += '<path d="M' + x1 + ',' + ly1 + ' C' + (x1 + gap / 3) + ',' + ly1 + ' ' + (x1 + gap / 2) + ',' + (H - 10) + ' ' + (x1 + gap / 1.5) + ',' + (H - 10) +
                    ' L' + (x1 + gap / 1.5) + ',' + H +
                    ' C' + (x1 + gap / 2) + ',' + H + ' ' + (x1 + gap / 3) + ',' + (y1 + h1) + ' ' + x1 + ',' + (y1 + h1) +
                    ' Z" fill="#dc2626" opacity="0.15"/>';
                // Loss label
                svg += '<text x="' + (x1 + gap / 2) + '" y="' + (H - 2) + '" text-anchor="middle" font-size="8" fill="#dc2626" font-weight="600">-' + loss + '</text>';
            }
        }

        // Draw stage bars with labels
        for (var j = 0; j < stages.length; j++) {
            var x = j * (stageW + gap);
            var barH = (stages[j].value / maxVal) * 140;
            var barY = (H - barH) / 2;
            svg += '<rect x="' + x + '" y="' + barY + '" width="' + stageW + '" height="' + barH + '" rx="4" fill="' + colors[j] + '" opacity="0.85"/>';
            svg += '<text x="' + (x + stageW / 2) + '" y="' + (barY + barH / 2 - 4) + '" text-anchor="middle" font-size="14" fill="white" font-weight="800">' + stages[j].value + '</text>';
            svg += '<text x="' + (x + stageW / 2) + '" y="' + (barY + barH / 2 + 10) + '" text-anchor="middle" font-size="8" fill="white" opacity="0.8">' + ((stages[j].value / maxVal) * 100).toFixed(0) + '%</text>';
            svg += '<text x="' + (x + stageW / 2) + '" y="' + (barY - 6) + '" text-anchor="middle" font-size="9" fill="var(--ui-gray-500)" font-weight="600">' + stages[j].label + '</text>';
        }

        svg += '</svg>';
        body.innerHTML = svg;
    }

    _renderAttritionTable(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var attrIcon = document.createElement('i');
        attrIcon.className = 'fas fa-table as-an-card-header-icon';
        hdr.appendChild(attrIcon);
        var attrLabel = document.createElement('span');
        attrLabel.className = 'as-an-card-header-title';
        attrLabel.textContent = 'Year-Level Attrition';
        hdr.appendChild(attrLabel);
        card.appendChild(hdr);

        var c = this._cohort;
        var yearData = [
            { year: 'Year 1', start: c.intake, end: c.y1End },
            { year: 'Year 2', start: c.y1End, end: c.y2End },
            { year: 'Year 3', start: c.y2End, end: c.y3End }
        ];

        var table = document.createElement('table');
        table.className = 'as-an-data-table';
        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        headRow.className = 'as-an-thead-row';
        ['Year', 'Start', 'Progress', 'Lost', 'Loss %'].forEach(function(txt, i) {
            var th = document.createElement('th');
            th.className = i === 0 ? 'as-an-th-left' : 'as-an-th-center';
            th.textContent = txt;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        card.appendChild(table);

        yearData.forEach(function(yd) {
            var lost = yd.start - yd.end;
            var lossPct = yd.start > 0 ? ((lost / yd.start) * 100).toFixed(1) : '0';
            var lossColor = parseFloat(lossPct) > 25 ? '#dc2626' : parseFloat(lossPct) > 15 ? '#d97706' : '#059669';
            var tr = document.createElement('tr');
            var tdYear = document.createElement('td');
            tdYear.className = 'as-an-td-base-bold';
            tdYear.textContent = yd.year;
            tr.appendChild(tdYear);
            var tdStart = document.createElement('td');
            tdStart.className = 'as-an-td-center-base';
            tdStart.textContent = String(yd.start);
            tr.appendChild(tdStart);
            var tdEnd = document.createElement('td');
            tdEnd.className = 'as-an-td-center-bold-green';
            tdEnd.textContent = String(yd.end);
            tr.appendChild(tdEnd);
            var tdLost = document.createElement('td');
            tdLost.className = 'as-an-td-center-bold-red';
            tdLost.textContent = String(lost);
            tr.appendChild(tdLost);
            var tdPct = document.createElement('td');
            tdPct.className = 'as-an-td-center-base';
            var pctBadge = document.createElement('span');
            pctBadge.className = 'as-an-badge-sm';
            pctBadge.style.background = lossColor + '15';
            pctBadge.style.color = lossColor;
            pctBadge.textContent = lossPct + '%';
            tdPct.appendChild(pctBadge);
            tr.appendChild(tdPct);
            tbody.appendChild(tr);
        });
    }

    _renderAYOS(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var ayosIcon = document.createElement('i');
        ayosIcon.className = 'fas fa-clock as-an-card-header-icon';
        hdr.appendChild(ayosIcon);
        var ayosLabel = document.createElement('span');
        ayosLabel.className = 'as-an-card-header-title';
        ayosLabel.textContent = 'AYOS Distribution (Average Years of Study)';
        hdr.appendChild(ayosLabel);
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        // Simulated AYOS distribution
        var buckets = [
            { label: '3 years', pct: 45, color: '#059669' },
            { label: '4 years', pct: 30, color: '#1d4ed8' },
            { label: '5 years', pct: 15, color: '#d97706' },
            { label: '6+ years', pct: 10, color: '#dc2626' }
        ];

        buckets.forEach(function(b) {
            var row = document.createElement('div');
            row.className = 'as-an-dist-row';
            var labelSpan = document.createElement('span');
            labelSpan.className = 'as-an-dist-label';
            labelSpan.style.minWidth = '4rem';
            labelSpan.textContent = b.label;
            row.appendChild(labelSpan);
            var track = document.createElement('div');
            track.className = 'as-progress-track as-progress-track-md as-flex-1';
            var fill = document.createElement('div');
            fill.className = 'as-progress-fill';
            fill.style.width = b.pct + '%';
            fill.style.background = b.color;
            track.appendChild(fill);
            row.appendChild(track);
            var pctSpan = document.createElement('span');
            pctSpan.className = 'as-an-dist-summary';
            pctSpan.style.color = b.color;
            pctSpan.textContent = b.pct + '%';
            row.appendChild(pctSpan);
            body.appendChild(row);
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
if (typeof module !== 'undefined' && module.exports) { module.exports = CohortTrackerPanel; }
if (typeof window !== 'undefined') { window.CohortTrackerPanel = CohortTrackerPanel; }
