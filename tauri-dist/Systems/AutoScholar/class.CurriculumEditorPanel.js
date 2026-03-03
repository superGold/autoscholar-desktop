/**
 * CurriculumEditorPanel — Programme structure viewer
 *
 * Year/semester grid with course cards, credit allocation,
 * course types (core/elective), prerequisite links, variant switching.
 */
class CurriculumEditorPanel {

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._selectedProg = config.programme || 'NDIT';
        this._variant = config.variant || 'mainstream';
        this._dataLoaded = false;
        this._selectedCourse = null;
        this._data = config.bridge || ProgAnalystData;
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderEmptyStage();
    }

    // ══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════

    _clearEl(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    _createIcon(iconClass, extraClass) {
        var i = document.createElement('i');
        i.className = iconClass + (extraClass ? ' ' + extraClass : '');
        return i;
    }

    // ══════════════════════════════════════════════════════════════════════
    // CONTROL
    // ══════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        this._clearEl(el);
        var self = this;

        var accordion = new uiAccordion({
            exclusive: true,
            content: {
                params: { label: '<i class="fas fa-sliders-h as-icon-mr"></i>Parameters', open: true },
                validation: { label: '<i class="fas fa-check-circle as-icon-mr"></i>Validation' },
                stats: { label: '<i class="fas fa-calculator as-icon-mr"></i>Statistics' }
            },
            parent: el
        });

        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._validationEl = accordion.el.querySelector('.ui-accordion-item[data-key="validation"] .ui-accordion-content');
        this._statsEl = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');

        // Programme
        this._addLabel(paramsEl, 'Programme');
        var progSelect = this._addSelect(paramsEl, this._data.PROGRAMMES.map(function(p) { return { value: p.code, label: p.name }; }), this._selectedProg);
        progSelect.addEventListener('change', function() { self._selectedProg = progSelect.value; });

        // Variant toggle
        this._addLabel(paramsEl, 'Variant');
        var variantSelect = this._addSelect(paramsEl, [
            { value: 'mainstream', label: 'Mainstream' },
            { value: 'extended', label: 'Extended Curriculum' }
        ], this._variant);
        variantSelect.addEventListener('change', function() { self._variant = variantSelect.value; });

        // Load button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        paramsEl.appendChild(btnWrap);
        new uiButton({
            label: 'Load Curriculum', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-th-large"></i>',
            parent: btnWrap,
            onClick: function() {
                self._dataLoaded = true;
                self._renderDashboard();
                self._renderValidation();
                self._renderStats();
            }
        });

        this._renderValidation();
        this._renderStats();
    }

    _renderValidation() {
        var el = this._validationEl;
        if (!el) return;
        this._clearEl(el);
        if (!this._dataLoaded) {
            var msg = document.createElement('div');
            msg.className = 'as-an-ctrl-hint';
            msg.textContent = 'Load curriculum to validate';
            el.appendChild(msg);
            return;
        }

        var courses = this._data.COURSES;
        var prereqs = this._data.PREREQUISITES;
        var checks = [];

        // Credit check per year
        [1, 2, 3].forEach(function(yr) {
            var yrCredits = courses.filter(function(c) { return c.year === yr; }).reduce(function(s, c) { return s + c.credits; }, 0);
            var ok = yrCredits >= 100 && yrCredits <= 140;
            checks.push({ label: 'Y' + yr + ' credits: ' + yrCredits, ok: ok });
        });

        // Prereq integrity
        var broken = 0;
        for (var code in prereqs) {
            var course = courses.find(function(c) { return c.code === code; });
            if (!course) continue;
            prereqs[code].forEach(function(p) {
                var prereqCourse = courses.find(function(c) { return c.code === p; });
                if (prereqCourse && prereqCourse.year >= course.year) broken++;
            });
        }
        checks.push({ label: 'Prereq ordering: ' + (broken === 0 ? 'Valid' : broken + ' issues'), ok: broken === 0 });

        var self = this;
        var wrap = document.createElement('div');
        wrap.className = 'as-an-ctrl-stats';
        checks.forEach(function(c) {
            var row = document.createElement('div');
            var icon = self._createIcon(
                c.ok ? 'fas fa-check-circle' : 'fas fa-times-circle',
                c.ok ? 'as-ce-check-pass' : 'as-ce-check-fail'
            );
            row.appendChild(icon);
            var labelText = document.createTextNode(c.label);
            row.appendChild(labelText);
            wrap.appendChild(row);
        });
        el.appendChild(wrap);
    }

    _renderStats() {
        var el = this._statsEl;
        if (!el) return;
        this._clearEl(el);
        if (!this._dataLoaded) {
            var msg = document.createElement('div');
            msg.className = 'as-an-ctrl-hint';
            msg.textContent = 'Load curriculum to see stats';
            el.appendChild(msg);
            return;
        }

        var courses = this._data.COURSES;
        var totalCredits = courses.reduce(function(s, c) { return s + c.credits; }, 0);
        var coreCount = courses.filter(function(c) { return c.type === 'core'; }).length;
        var electiveCount = courses.filter(function(c) { return c.type === 'elective'; }).length;
        var prereqChains = Object.keys(this._data.PREREQUISITES).length;

        var wrap = document.createElement('div');
        wrap.className = 'as-an-ctrl-stats';

        var stats = [
            { prefix: 'Total Credits: ', value: String(totalCredits), cls: 'as-ce-stat-white' },
            { prefix: 'Core Courses: ', value: String(coreCount), cls: 'as-ce-stat-core' },
            { prefix: 'Elective Courses: ', value: String(electiveCount), cls: 'as-ce-stat-elec' },
            { prefix: 'Prereq Chains: ', value: String(prereqChains), cls: 'as-ce-stat-white' }
        ];

        stats.forEach(function(s) {
            var row = document.createElement('div');
            row.appendChild(document.createTextNode(s.prefix));
            var strong = document.createElement('strong');
            strong.className = s.cls;
            strong.textContent = s.value;
            row.appendChild(strong);
            wrap.appendChild(row);
        });
        el.appendChild(wrap);
    }

    // ══════════════════════════════════════════════════════════════════════
    // STAGE
    // ══════════════════════════════════════════════════════════════════════

    _renderEmptyStage() {
        this._clearEl(this._stageEl);
        this._stageEl.className = 'as-an-stage-scroll';
        new uiAlert({
            color: 'info',
            title: 'Curriculum Editor',
            message: 'Select a programme and variant, then click "Load Curriculum" to view the course grid with credits, types, and prerequisite links.',
            parent: this._stageEl
        });
    }

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

        var badge = document.createElement('span');
        badge.className = 'as-an-panel-badge as-an-panel-badge-curriculum';
        badge.appendChild(this._createIcon('fas fa-edit'));
        badge.appendChild(document.createTextNode('Curriculum Editor'));
        header.appendChild(badge);

        var subtitle = document.createElement('span');
        subtitle.className = 'as-an-panel-subtitle';
        subtitle.textContent = (prog ? prog.name : '') + ' | ' + (this._variant === 'extended' ? 'Extended' : 'Mainstream');
        header.appendChild(subtitle);

        wrap.appendChild(header);

        this._renderKPIs(wrap);
        this._renderYearGrid(wrap);
        this._renderCreditSummary(wrap);
        this._renderPrereqViewSection(wrap);
    }

    _renderKPIs(parent) {
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        parent.appendChild(row);

        var courses = this._data.COURSES;
        var totalCredits = courses.reduce(function(s, c) { return s + c.credits; }, 0);
        var coreCount = courses.filter(function(c) { return c.type === 'core'; }).length;
        var electiveCount = courses.filter(function(c) { return c.type === 'elective'; }).length;
        var prereqChains = Object.keys(this._data.PREREQUISITES).length;

        var kpis = [
            { label: 'Total Credits', value: String(totalCredits), icon: 'award', variant: 'as-an-kpi-card-blue' },
            { label: 'Core Courses', value: String(coreCount), icon: 'lock', variant: 'as-an-kpi-card-green' },
            { label: 'Elective Slots', value: String(electiveCount), icon: 'unlock', variant: 'as-an-kpi-card-amber' },
            { label: 'Prereq Chains', value: String(prereqChains), icon: 'link', variant: 'as-an-kpi-card-violet' }
        ];

        var self = this;
        kpis.forEach(function(k) {
            var card = document.createElement('div');
            card.className = 'as-an-kpi-card ' + k.variant;

            var topRow = document.createElement('div');
            topRow.className = 'as-an-kpi-card-header';
            topRow.appendChild(self._createIcon('fas fa-' + k.icon, 'as-an-kpi-icon'));
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

    _renderYearGrid(parent) {
        var courses = this._data.COURSES;
        var prereqs = this._data.PREREQUISITES;
        var self = this;

        [1, 2, 3].forEach(function(year) {
            var card = document.createElement('div');
            card.className = 'as-an-section-card-mb';
            parent.appendChild(card);

            var yrCourses = courses.filter(function(c) { return c.year === year; });
            var yrCredits = yrCourses.reduce(function(s, c) { return s + c.credits; }, 0);

            var hdr = document.createElement('div');
            hdr.className = 'as-an-card-header';
            hdr.appendChild(self._createIcon('fas fa-layer-group as-an-card-header-icon'));
            var yearLabel = document.createElement('span');
            yearLabel.className = 'as-an-card-header-title';
            yearLabel.textContent = 'Year ' + year;
            hdr.appendChild(yearLabel);
            var yearMeta = document.createElement('span');
            yearMeta.className = 'as-an-card-header-meta';
            yearMeta.textContent = yrCourses.length + ' courses \u00b7 ' + yrCredits + ' credits';
            hdr.appendChild(yearMeta);
            card.appendChild(hdr);

            var body = document.createElement('div');
            body.className = 'as-an-card-body as-ce-semester-grid';
            card.appendChild(body);

            // S1 column
            var s1Label = document.createElement('div');
            s1Label.className = 'as-an-upper-label-gray as-ce-col-1';
            s1Label.textContent = 'Semester 1';
            body.appendChild(s1Label);

            var s2Label = document.createElement('div');
            s2Label.className = 'as-an-upper-label-gray as-ce-col-2';
            s2Label.textContent = 'Semester 2';
            body.appendChild(s2Label);

            var s1Courses = yrCourses.filter(function(c) { return c.semester === 'S1'; });
            var s2Courses = yrCourses.filter(function(c) { return c.semester === 'S2'; });
            var maxLen = Math.max(s1Courses.length, s2Courses.length);

            for (var i = 0; i < maxLen; i++) {
                if (i < s1Courses.length) {
                    body.appendChild(self._courseCard(s1Courses[i], prereqs));
                } else {
                    body.appendChild(document.createElement('div'));
                }
                if (i < s2Courses.length) {
                    body.appendChild(self._courseCard(s2Courses[i], prereqs));
                } else {
                    body.appendChild(document.createElement('div'));
                }
            }
        });
    }

    _courseCard(course, prereqs) {
        var self = this;
        var isCore = course.type === 'core';
        var hasPrereqs = prereqs[course.code] && prereqs[course.code].length > 0;
        var passRate = course.enrolled > 0 ? (course.passed / course.enrolled * 100).toFixed(0) : '0';

        var card = document.createElement('div');
        card.className = 'as-an-course-card';

        // Top row: code + badges
        var topRow = document.createElement('div');
        topRow.className = 'as-flex-row-between as-ce-top-row';

        var codeSpan = document.createElement('span');
        codeSpan.className = 'as-an-card-header-title as-ce-code-span';
        codeSpan.textContent = course.code;
        topRow.appendChild(codeSpan);

        var badgeWrap = document.createElement('div');
        badgeWrap.className = 'as-flex-row as-ce-badge-gap';

        var typeBadge = document.createElement('span');
        typeBadge.className = 'as-an-badge-sm ' + (isCore ? 'as-ce-badge-core' : 'as-ce-badge-elec');
        typeBadge.textContent = isCore ? 'CORE' : 'ELEC';
        badgeWrap.appendChild(typeBadge);

        var creditBadge = document.createElement('span');
        creditBadge.className = 'as-an-badge-sm as-an-badge-blue';
        creditBadge.textContent = course.credits + 'cr';
        badgeWrap.appendChild(creditBadge);

        topRow.appendChild(badgeWrap);
        card.appendChild(topRow);

        // Course name
        var nameDiv = document.createElement('div');
        nameDiv.className = 'as-text-xs as-text-muted as-ce-course-name';
        nameDiv.textContent = course.name;
        card.appendChild(nameDiv);

        // Bottom row: prereq icon + pass rate
        var bottomRow = document.createElement('div');
        bottomRow.className = 'as-flex-row-center';
        if (hasPrereqs) {
            var linkIcon = this._createIcon('fas fa-link', 'as-ce-link-icon');
            linkIcon.title = 'Has prerequisites';
            bottomRow.appendChild(linkIcon);
        }
        var passSpan = document.createElement('span');
        passSpan.className = 'as-text-xs as-ce-pass-rate';
        passSpan.textContent = 'Pass: ' + passRate + '%';
        bottomRow.appendChild(passSpan);
        card.appendChild(bottomRow);

        // Hover handled by .as-an-course-card:hover in CSS
        card.addEventListener('click', function() {
            self._selectedCourse = course;
            self._renderPrereqView(self._prereqContainer);
        });
        return card;
    }

    _renderCreditSummary(parent) {
        var self = this;
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        hdr.appendChild(this._createIcon('fas fa-chart-bar as-an-card-header-icon'));
        var hdrLabel = document.createElement('span');
        hdrLabel.className = 'as-an-card-header-title';
        hdrLabel.textContent = 'Credit Summary by Year';
        hdr.appendChild(hdrLabel);
        card.appendChild(hdr);

        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);

        var courses = this._data.COURSES;

        [1, 2, 3].forEach(function(yr) {
            var yrCourses = courses.filter(function(c) { return c.year === yr; });
            var coreCredits = yrCourses.filter(function(c) { return c.type === 'core'; }).reduce(function(s, c) { return s + c.credits; }, 0);
            var elecCredits = yrCourses.filter(function(c) { return c.type === 'elective'; }).reduce(function(s, c) { return s + c.credits; }, 0);
            var total = coreCredits + elecCredits;
            var maxCredits = 140;

            var row = document.createElement('div');
            row.className = 'as-mb-2';

            // Label row
            var labelRow = document.createElement('div');
            labelRow.className = 'as-flex-row-between as-ce-credit-label-row';
            var yearSpan = document.createElement('span');
            yearSpan.className = 'as-text-bold as-ce-year-label';
            yearSpan.textContent = 'Year ' + yr;
            labelRow.appendChild(yearSpan);
            var detailSpan = document.createElement('span');
            detailSpan.className = 'as-text-muted';
            detailSpan.textContent = total + ' credits (Core: ' + coreCredits + ', Elec: ' + elecCredits + ')';
            labelRow.appendChild(detailSpan);
            row.appendChild(labelRow);

            // Stacked bar
            var bar = document.createElement('div');
            bar.className = 'as-an-bar-container-lg';
            var coreSeg = document.createElement('div');
            coreSeg.className = 'as-ce-bar-core';
            coreSeg.style.width = (coreCredits / maxCredits * 100).toFixed(0) + '%';
            coreSeg.title = 'Core: ' + coreCredits;
            bar.appendChild(coreSeg);
            var elecSeg = document.createElement('div');
            elecSeg.className = 'as-ce-bar-elec';
            elecSeg.style.width = (elecCredits / maxCredits * 100).toFixed(0) + '%';
            elecSeg.title = 'Elective: ' + elecCredits;
            bar.appendChild(elecSeg);
            row.appendChild(bar);

            body.appendChild(row);
        });

        // Legend
        var legend = document.createElement('div');
        legend.className = 'as-an-legend-compact';

        var coreLegend = document.createElement('span');
        var coreSwatch = document.createElement('span');
        coreSwatch.className = 'as-an-swatch as-ce-swatch-core';
        coreLegend.appendChild(coreSwatch);
        coreLegend.appendChild(document.createTextNode('Core'));
        legend.appendChild(coreLegend);

        var elecLegend = document.createElement('span');
        var elecSwatch = document.createElement('span');
        elecSwatch.className = 'as-an-swatch as-ce-swatch-elec';
        elecLegend.appendChild(elecSwatch);
        elecLegend.appendChild(document.createTextNode('Elective'));
        legend.appendChild(elecLegend);

        body.appendChild(legend);
    }

    _renderPrereqView(parent) {
        if (!parent) return;
        this._clearEl(parent);

        if (!this._selectedCourse) {
            var msg = document.createElement('div');
            msg.className = 'as-an-empty-msg';
            msg.textContent = 'Click a course card above to view its prerequisite chain';
            parent.appendChild(msg);
            return;
        }

        var c = this._selectedCourse;
        var prereqCodes = this._data.PREREQUISITES[c.code] || [];
        var downstream = this._data.getDownstream(c.code);

        var wrap = document.createElement('div');
        wrap.className = 'as-an-card-body';

        // Title
        var title = document.createElement('div');
        title.className = 'as-an-card-header-title as-ce-prereq-title';
        title.textContent = c.code + ': ' + c.name;
        wrap.appendChild(title);

        // Two-column flex layout
        var columns = document.createElement('div');
        columns.className = 'as-an-two-col';

        // Prerequisites column
        var prereqCol = document.createElement('div');
        prereqCol.className = 'as-flex-1';
        var prereqLabel = document.createElement('div');
        prereqLabel.className = 'as-an-upper-label as-ce-prereq-label';
        prereqLabel.textContent = 'Prerequisites (' + prereqCodes.length + ')';
        prereqCol.appendChild(prereqLabel);

        if (prereqCodes.length) {
            var prereqBadges = document.createElement('div');
            prereqBadges.className = 'as-an-info-wrap';
            prereqCodes.forEach(function(p) {
                var badge = document.createElement('span');
                badge.className = 'as-an-badge-sm as-an-badge-blue';
                badge.textContent = p;
                prereqBadges.appendChild(badge);
            });
            prereqCol.appendChild(prereqBadges);
        } else {
            var noneMsg = document.createElement('div');
            noneMsg.className = 'as-text-xs as-text-muted';
            noneMsg.textContent = 'None';
            prereqCol.appendChild(noneMsg);
        }
        columns.appendChild(prereqCol);

        // Downstream column
        var downCol = document.createElement('div');
        downCol.className = 'as-flex-1';
        var downLabel = document.createElement('div');
        downLabel.className = 'as-an-upper-label as-ce-prereq-label';
        downLabel.textContent = 'Leads to (' + downstream.length + ')';
        downCol.appendChild(downLabel);

        if (downstream.length) {
            var downBadges = document.createElement('div');
            downBadges.className = 'as-an-info-wrap';
            downstream.forEach(function(d) {
                var badge = document.createElement('span');
                badge.className = 'as-an-badge-sm as-an-badge-amber';
                badge.textContent = d;
                downBadges.appendChild(badge);
            });
            downCol.appendChild(downBadges);
        } else {
            var termMsg = document.createElement('div');
            termMsg.className = 'as-text-xs as-text-muted';
            termMsg.textContent = 'None (terminal)';
            downCol.appendChild(termMsg);
        }
        columns.appendChild(downCol);

        wrap.appendChild(columns);
        parent.appendChild(wrap);
    }

    _renderPrereqViewSection(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        hdr.appendChild(this._createIcon('fas fa-link as-an-card-header-icon'));
        var hdrLabel = document.createElement('span');
        hdrLabel.className = 'as-an-card-header-title';
        hdrLabel.textContent = 'Prerequisite Chain';
        hdr.appendChild(hdrLabel);
        card.appendChild(hdr);

        this._prereqContainer = document.createElement('div');
        card.appendChild(this._prereqContainer);
        this._renderPrereqView(this._prereqContainer);
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
if (typeof module !== 'undefined' && module.exports) { module.exports = CurriculumEditorPanel; }
if (typeof window !== 'undefined') { window.CurriculumEditorPanel = CurriculumEditorPanel; }
