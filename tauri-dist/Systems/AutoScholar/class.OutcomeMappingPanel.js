/**
 * OutcomeMappingPanel — NxM matrix mapping Graduate Attributes to Courses
 *
 * Cells show I (Introduced), R (Reinforced), A (Assessed) levels.
 * Click cells to cycle I→R→A→empty. Coverage gap alerts.
 */
class OutcomeMappingPanel {

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._selectedProg = config.programme || 'NDIT';
        this._accBody = config.accBody || 'ECSA';
        this._dataLoaded = false;
        this._matrix = {};
        this._yearFilter = 0; // 0 = all
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
                coverage: { label: '<i class="fas fa-chart-pie" style="margin-right:0.3rem;"></i>Coverage Stats' }
            },
            parent: el
        });

        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._coverageEl = accordion.el.querySelector('.ui-accordion-item[data-key="coverage"] .ui-accordion-content');

        // Programme
        this._addLabel(paramsEl, 'Programme');
        var progSelect = this._addSelect(paramsEl, this._data.PROGRAMMES.map(function(p) { return { value: p.code, label: p.name }; }), this._selectedProg);
        progSelect.addEventListener('change', function() { self._selectedProg = progSelect.value; });

        // Accreditation body
        this._addLabel(paramsEl, 'Accreditation Body');
        var accSelect = this._addSelect(paramsEl, [
            { value: 'ECSA', label: 'ECSA' },
            { value: 'CHE', label: 'CHE' },
            { value: 'SAQA', label: 'SAQA' }
        ], this._accBody);
        accSelect.addEventListener('change', function() { self._accBody = accSelect.value; });

        // Year filter
        this._addLabel(paramsEl, 'Year Filter');
        var yearSelect = this._addSelect(paramsEl, [
            { value: '0', label: 'All Years' },
            { value: '1', label: 'Year 1' },
            { value: '2', label: 'Year 2' },
            { value: '3', label: 'Year 3' }
        ], String(this._yearFilter));
        yearSelect.addEventListener('change', function() { self._yearFilter = parseInt(yearSelect.value, 10); });

        // Load button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        paramsEl.appendChild(btnWrap);
        new uiButton({
            label: 'Load Matrix', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-border-all"></i>',
            parent: btnWrap,
            onClick: function() {
                self._loadData();
                self._renderDashboard();
                self._renderCoverageStats();
            }
        });

        this._renderCoverageStats();
    }

    _renderCoverageStats() {
        var el = this._coverageEl;
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
        if (!this._dataLoaded) {
            var emptyMsg = document.createElement('div');
            emptyMsg.className = 'as-an-ctrl-hint';
            emptyMsg.textContent = 'Load matrix to see coverage';
            el.appendChild(emptyMsg);
            return;
        }

        var stats = this._computeStats();
        var statsWrap = document.createElement('div');
        statsWrap.className = 'as-an-ctrl-stats';

        var overallDiv = document.createElement('div');
        overallDiv.appendChild(document.createTextNode('Overall Coverage: '));
        var overallStrong = document.createElement('strong');
        overallStrong.style.color = stats.overallPct >= 80 ? '#34d399' : '#f87171';
        overallStrong.textContent = stats.overallPct.toFixed(0) + '%';
        overallDiv.appendChild(overallStrong);
        statsWrap.appendChild(overallDiv);

        var mappedDiv = document.createElement('div');
        mappedDiv.appendChild(document.createTextNode('Fully Mapped GAs: '));
        var mappedStrong = document.createElement('strong');
        mappedStrong.style.color = '#34d399';
        mappedStrong.textContent = stats.fullyMapped + '/' + stats.total;
        mappedDiv.appendChild(mappedStrong);
        statsWrap.appendChild(mappedDiv);

        var gapsDiv = document.createElement('div');
        gapsDiv.appendChild(document.createTextNode('Coverage Gaps: '));
        var gapsStrong = document.createElement('strong');
        gapsStrong.style.color = stats.gaps > 0 ? '#f87171' : '#34d399';
        gapsStrong.textContent = String(stats.gaps);
        gapsDiv.appendChild(gapsStrong);
        statsWrap.appendChild(gapsDiv);

        el.appendChild(statsWrap);
    }

    _loadData() {
        // Deep copy the matrix so user clicks don't mutate the source
        this._matrix = {};
        var src = this._data.GA_COURSE_MATRIX;
        for (var ga in src) {
            this._matrix[ga] = {};
            for (var course in src[ga]) {
                this._matrix[ga][course] = src[ga][course];
            }
        }
        this._dataLoaded = true;
    }

    _computeStats() {
        var gas = this._data.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var totalCells = gas.length * courses.length;
        var filledCells = 0;
        var fullyMapped = 0;
        var gaps = 0;

        var self = this;
        gas.forEach(function(ga) {
            var gaMap = self._matrix[ga.code] || {};
            var mappedCount = 0;
            var hasAssessed = false;
            courses.forEach(function(c) {
                if (gaMap[c.code]) {
                    filledCells++;
                    mappedCount++;
                    if (gaMap[c.code] === 'A') hasAssessed = true;
                }
            });
            if (mappedCount >= Math.ceil(courses.length * 0.5) && hasAssessed) {
                fullyMapped++;
            }
            if (!hasAssessed) gaps++;
        });

        return {
            overallPct: totalCells > 0 ? (filledCells / totalCells * 100) : 0,
            fullyMapped: fullyMapped,
            total: gas.length,
            gaps: gaps
        };
    }

    _getFilteredCourses() {
        var yf = this._yearFilter;
        return this._data.COURSES.filter(function(c) {
            return yf === 0 || c.year === yf;
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // STAGE
    // ══════════════════════════════════════════════════════════════════════

    _renderEmptyStage() {
        while (this._stageEl.firstChild) this._stageEl.removeChild(this._stageEl.firstChild);
        this._stageEl.className = 'as-an-stage-scroll';
        new uiAlert({
            color: 'info',
            title: 'Outcome Mapping',
            message: 'Select a programme and accreditation body, then click "Load Matrix" to view the GA-to-course mapping matrix with I/R/A level indicators.',
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
        var header = document.createElement('div');
        header.className = 'as-an-panel-header';
        var titleBadge = document.createElement('span');
        titleBadge.className = 'as-an-panel-badge as-an-panel-badge-outcomes';
        var titleIcon = document.createElement('i');
        titleIcon.className = 'fas fa-border-all as-an-mr-xs';
        titleBadge.appendChild(titleIcon);
        titleBadge.appendChild(document.createTextNode('GA-Outcome Mapping'));
        header.appendChild(titleBadge);

        var frameworkLabel = document.createElement('span');
        frameworkLabel.className = 'as-an-panel-subtitle';
        frameworkLabel.textContent = this._accBody + ' Framework';
        header.appendChild(frameworkLabel);
        wrap.appendChild(header);

        this._renderKPIs(wrap);
        this._renderMatrix(wrap);
        this._renderGapAlerts(wrap);
        this._renderGADistribution(wrap);
    }

    _renderKPIs(parent) {
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        parent.appendChild(row);

        var stats = this._computeStats();
        var kpis = [
            { label: 'Overall Coverage', value: stats.overallPct.toFixed(0) + '%', icon: 'chart-pie', color: stats.overallPct >= 80 ? '#059669' : '#dc2626', bg: stats.overallPct >= 80 ? '#f0fdf4' : '#fef2f2' },
            { label: 'Fully Mapped', value: stats.fullyMapped + '/' + stats.total, icon: 'check-double', color: '#059669', bg: '#f0fdf4' },
            { label: 'Coverage Gaps', value: String(stats.gaps), icon: 'exclamation-circle', color: stats.gaps > 0 ? '#dc2626' : '#059669', bg: stats.gaps > 0 ? '#fef2f2' : '#f0fdf4' }
        ];

        kpis.forEach(function(k) {
            var card = document.createElement('div');
            card.className = 'as-an-kpi-card';
            card.style.background = k.bg;
            card.style.border = '1px solid ' + k.color + '18';
            var cardHeader = document.createElement('div');
            cardHeader.className = 'as-an-kpi-card-header';
            var cardIcon = document.createElement('i');
            cardIcon.className = 'fas fa-' + k.icon + ' as-an-kpi-icon';
            cardIcon.style.color = k.color;
            cardHeader.appendChild(cardIcon);
            var cardLabel = document.createElement('span');
            cardLabel.className = 'as-an-kpi-label';
            cardLabel.textContent = k.label;
            cardHeader.appendChild(cardLabel);
            card.appendChild(cardHeader);

            var cardValue = document.createElement('div');
            cardValue.className = 'as-an-kpi-value';
            cardValue.style.color = k.color;
            cardValue.textContent = k.value;
            card.appendChild(cardValue);
            row.appendChild(card);
        });
    }

    _renderMatrix(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var hdrIcon = document.createElement('i');
        hdrIcon.className = 'fas fa-th as-an-card-header-icon';
        hdr.appendChild(hdrIcon);
        var hdrTitle = document.createElement('span');
        hdrTitle.className = 'as-an-card-header-title';
        hdrTitle.textContent = 'Mapping Matrix';
        hdr.appendChild(hdrTitle);
        var hdrHint = document.createElement('span');
        hdrHint.className = 'as-an-card-header-meta';
        hdrHint.textContent = 'Click cells to cycle I\u2192R\u2192A\u2192empty';
        hdr.appendChild(hdrHint);
        card.appendChild(hdr);

        var tableWrap = document.createElement('div');
        tableWrap.className = 'as-an-table-wrap';
        card.appendChild(tableWrap);

        var gas = this._data.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var self = this;

        var table = document.createElement('table');
        table.className = 'as-an-data-table-sm';

        // Header row with course codes
        var thead = document.createElement('thead');
        var theadTr = document.createElement('tr');
        theadTr.className = 'as-an-thead-row';
        var gaTh = document.createElement('th');
        gaTh.className = 'as-an-matrix-corner';
        gaTh.textContent = 'GA';
        theadTr.appendChild(gaTh);
        courses.forEach(function(c) {
            var th = document.createElement('th');
            th.className = 'as-an-matrix-th';
            th.textContent = c.code;
            theadTr.appendChild(th);
        });
        thead.appendChild(theadTr);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        table.appendChild(tbody);

        var levelColors = { 'I': '#3b82f6', 'R': '#f59e0b', 'A': '#10b981' };
        var cycleLevels = ['I', 'R', 'A', ''];

        gas.forEach(function(ga) {
            var tr = document.createElement('tr');
            // GA label cell
            var gaCell = document.createElement('td');
            gaCell.className = 'as-an-matrix-row-header';
            gaCell.title = ga.name;
            gaCell.textContent = ga.code;
            tr.appendChild(gaCell);

            courses.forEach(function(c) {
                var td = document.createElement('td');
                td.className = 'as-an-matrix-cell';

                var level = (self._matrix[ga.code] && self._matrix[ga.code][c.code]) || '';
                self._renderCell(td, level, levelColors);

                td.addEventListener('click', function() {
                    var currentLevel = (self._matrix[ga.code] && self._matrix[ga.code][c.code]) || '';
                    var idx = cycleLevels.indexOf(currentLevel);
                    var next = cycleLevels[(idx + 1) % cycleLevels.length];
                    if (!self._matrix[ga.code]) self._matrix[ga.code] = {};
                    if (next) {
                        self._matrix[ga.code][c.code] = next;
                    } else {
                        delete self._matrix[ga.code][c.code];
                    }
                    self._renderCell(td, next, levelColors);
                    self._renderCoverageStats();
                });

                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        tableWrap.appendChild(table);

        // Legend
        var legend = document.createElement('div');
        legend.className = 'as-an-legend';
        var legendItems = [
            { letter: 'I', color: '#3b82f6', label: 'Introduced' },
            { letter: 'R', color: '#f59e0b', label: 'Reinforced' },
            { letter: 'A', color: '#10b981', label: 'Assessed' }
        ];
        legendItems.forEach(function(item) {
            var legendSpan = document.createElement('span');
            var swatch = document.createElement('span');
            swatch.className = 'as-an-swatch-wide';
            swatch.style.background = item.color;
            swatch.textContent = item.letter;
            legendSpan.appendChild(swatch);
            legendSpan.appendChild(document.createTextNode(' ' + item.label));
            legend.appendChild(legendSpan);
        });
        card.appendChild(legend);
    }

    _renderCell(td, level, levelColors) {
        while (td.firstChild) td.removeChild(td.firstChild);
        var span = document.createElement('span');
        if (level) {
            span.className = 'as-an-level-swatch as-an-level-' + level;
            span.textContent = level;
        } else {
            span.className = 'as-an-level-swatch-empty';
        }
        td.appendChild(span);
    }

    _renderGapAlerts(parent) {
        var gas = this._data.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var self = this;
        var gapsFound = [];

        gas.forEach(function(ga) {
            var gaMap = self._matrix[ga.code] || {};
            var hasA = false;
            courses.forEach(function(c) {
                if (gaMap[c.code] === 'A') hasA = true;
            });
            if (!hasA) gapsFound.push(ga);
        });

        if (!gapsFound.length) return;

        var alert = document.createElement('div');
        alert.className = 'as-an-alert-danger';
        var alertHeader = document.createElement('div');
        alertHeader.className = 'as-an-alert-header';
        var alertIcon = document.createElement('i');
        alertIcon.className = 'fas fa-exclamation-triangle as-an-alert-icon-danger';
        alertHeader.appendChild(alertIcon);
        var alertTitle = document.createElement('span');
        alertTitle.className = 'as-an-alert-title-danger';
        alertTitle.textContent = 'Coverage Gaps (' + gapsFound.length + ' GAs without Assessment)';
        alertHeader.appendChild(alertTitle);
        alert.appendChild(alertHeader);

        var badgeWrap = document.createElement('div');
        badgeWrap.className = 'as-flex-wrap-tight';
        gapsFound.forEach(function(g) {
            var badge = document.createElement('span');
            badge.className = 'as-an-badge-sm as-an-badge-red';
            badge.textContent = g.code + ': ' + g.name;
            badgeWrap.appendChild(badge);
        });
        alert.appendChild(badgeWrap);
        parent.appendChild(alert);
    }

    _renderGADistribution(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var distIcon = document.createElement('i');
        distIcon.className = 'fas fa-chart-bar as-an-card-header-icon';
        hdr.appendChild(distIcon);
        var distTitle = document.createElement('span');
        distTitle.className = 'as-an-card-header-title';
        distTitle.textContent = 'Per-GA I/R/A Distribution';
        hdr.appendChild(distTitle);
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        var gas = this._data.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var self = this;

        gas.forEach(function(ga) {
            var gaMap = self._matrix[ga.code] || {};
            var counts = { I: 0, R: 0, A: 0 };
            courses.forEach(function(c) {
                var level = gaMap[c.code];
                if (level && counts[level] !== undefined) counts[level]++;
            });
            var total = courses.length;

            var row = document.createElement('div');
            row.className = 'as-an-dist-row';
            var rowLabel = document.createElement('span');
            rowLabel.className = 'as-an-dist-label';
            rowLabel.textContent = ga.code;
            row.appendChild(rowLabel);

            var barContainer = document.createElement('div');
            barContainer.className = 'as-an-bar-container';
            var barSegments = [
                { count: counts.I, color: '#3b82f6', letter: 'I' },
                { count: counts.R, color: '#f59e0b', letter: 'R' },
                { count: counts.A, color: '#10b981', letter: 'A' }
            ];
            barSegments.forEach(function(seg) {
                if (seg.count > 0) {
                    var segDiv = document.createElement('div');
                    segDiv.style.width = (seg.count / total * 100).toFixed(0) + '%';
                    segDiv.style.background = seg.color;
                    segDiv.title = seg.letter + ': ' + seg.count;
                    barContainer.appendChild(segDiv);
                }
            });
            row.appendChild(barContainer);

            var rowSummary = document.createElement('span');
            rowSummary.className = 'as-an-dist-summary';
            rowSummary.textContent = 'I:' + counts.I + ' R:' + counts.R + ' A:' + counts.A;
            row.appendChild(rowSummary);
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
if (typeof module !== 'undefined' && module.exports) { module.exports = OutcomeMappingPanel; }
if (typeof window !== 'undefined') { window.OutcomeMappingPanel = OutcomeMappingPanel; }
