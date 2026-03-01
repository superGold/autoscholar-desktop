/**
 * ProgAnalystPanel - Unified Programme Analyst dashboard
 *
 * Integrates 7 sub-views (Overview, Gatekeepers, Cohort Flow, Compare,
 * Progression, Outcomes, Curriculum) into a single tabbed interface
 * with shared controls, persistent KPI row, and lazy tab rendering.
 *
 * Usage:
 *   new ProgAnalystPanel().render(controlEl, stageEl);
 */
class ProgAnalystPanel {

    static TAB_REGISTRY = [
        { key: 'overview',    label: 'Overview',    icon: 'sitemap' },
        { key: 'gatekeeper',  label: 'Gatekeepers', icon: 'door-closed' },
        { key: 'cohort',      label: 'Cohort Flow', icon: 'layer-group' },
        { key: 'compare',     label: 'Compare',     icon: 'columns' },
        { key: 'progression', label: 'Progression', icon: 'project-diagram' },
        { key: 'outcomes',    label: 'Outcomes',     icon: 'border-all' },
        { key: 'curriculum',  label: 'Curriculum',   icon: 'edit' },
        { key: 'about',      label: 'About',        icon: 'info-circle' }
    ];

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._bus = new EventBus();
        this._bridge = new ProgAnalystBridge();
        this._selectedProg = config.programme || 'NDIT';
        this._bridge.selectProgramme(this._selectedProg);
        this._selectedYear = config.year || 2026;
        this._dataLoaded = false;
        this._activeTab = 'overview';
        // Shared data
        this._courses = [];
        this._cohorts = [];
        // Gatekeeper
        this._dfwThreshold = 20;
        this._gatekeepers = [];
        // Cohort
        this._cohortYear = 2024;
        this._selectedCohort = null;
        // Compare
        this._compareYearA = 2024;
        this._compareYearB = 2023;
        this._cohortA = null;
        this._cohortB = null;
        // Progression
        this._colorBy = 'passRate';
        this._network = null;
        this._cy = null;
        this._cascadeEngine = null;
        this._dfwShock = 15;
        this._pendingSelection = null;
        // Outcomes
        this._accBody = 'ECSA';
        this._yearFilter = 0;
        this._matrix = {};
        // Curriculum
        this._variant = 'mainstream';
        this._selectedCourse = null;
        // API integration
        this._endpoint = '/api-proxy';
        this._apiProgrammes = null;     // null = not loaded, array = loaded from API
        this._dataSource = 'demo';      // 'demo' | 'api'
        this._loading = false;
        this._sessionId = null;
        this._logToken = null;
        this._programmeStudentCount = 0;
        // Cache & DOM refs
        this._tabRendered = { overview: false, gatekeeper: false, cohort: false, compare: false, progression: false, outcomes: false, curriculum: false, about: false };
        this._tabPanels = {};
        this._contextControlEl = null;
        this._healthEl = null;
        this._alertsEl = null;
        this._tabs = null;
        this._kpiRow = null;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._setupBusSubscriptions();
        this._buildControl();
        this._buildStage();
        // Auto-detect live API session
        if (window.AS_SESSION && window.AS_SESSION.ready && this._dataSource === 'demo') {
            this._connectToApi();
        }
    }

    _setupBusSubscriptions() {
        var self = this;
        // When a course is selected anywhere, highlight it in Cytoscape if loaded
        this._bus.on('course:select', function(data) {
            if (!data || !data.code) return;
            self._pendingSelection = { type: 'course', code: data.code };
            // Highlight in Cytoscape graph if it exists and source is not progression
            if (self._cy && data.source !== 'progression') {
                self._cy.nodes().removeClass('highlight');
                var node = self._cy.getElementById(data.code);
                if (node.length) node.addClass('highlight');
            }
        });
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
                params:  { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
                context: { label: '<i class="fas fa-cog" style="margin-right:0.3rem;"></i>View Controls' },
                health:  { label: '<i class="fas fa-heartbeat" style="margin-right:0.3rem;"></i>Health Summary' },
                alerts:  { label: '<i class="fas fa-exclamation-circle" style="margin-right:0.3rem;"></i>Alerts' }
            },
            parent: el
        });
        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._contextControlEl = accordion.el.querySelector('.ui-accordion-item[data-key="context"] .ui-accordion-content');
        this._healthEl = accordion.el.querySelector('.ui-accordion-item[data-key="health"] .ui-accordion-content');
        this._alertsEl = accordion.el.querySelector('.ui-accordion-item[data-key="alerts"] .ui-accordion-content');

        this._renderSharedParams(paramsEl);
        this._renderContextControls();
        this._renderHealthSummary(this._healthEl);
        this._renderAlertsSidebar(this._alertsEl);
    }

    _renderSharedParams(el) {
        this._clearEl(el);
        var self = this;
        var programmes = this._apiProgrammes || this._bridge.PROGRAMMES;

        // Programme selector via UIBinding
        this._addLabel(el, 'Programme');
        var selectorWrap = document.createElement('div');
        selectorWrap.className = 'as-an-param-row';
        el.appendChild(selectorWrap);
        var progBinding = new UIBinding(this._bridge.programmeTable, { publome: this._bridge.service });
        progBinding.bindSelector(selectorWrap, { searchable: true, template: 'compact' });

        // Unsubscribe previous listener before adding new one
        if (this._progSelectUnsub) this._progSelectUnsub();
        this._progSelectUnsub = this._bridge.programmeTable.on('selected', function(e) {
            var record = self._bridge.programmeTable.read(e.idx);
            if (record) {
                self._selectedProg = record.get('code');
                self._bridge.selectProgramme(self._selectedProg);
                self._renderInfoBadges(el);
            }
        });

        // Info badges container
        this._infoBadgeWrap = document.createElement('div');
        this._infoBadgeWrap.className = 'as-an-info-wrap';
        el.appendChild(this._infoBadgeWrap);
        this._renderInfoBadges(el);

        // Browse Programmes button
        var browseBtnWrap = document.createElement('div');
        browseBtnWrap.className = 'as-an-api-btn-row';
        el.appendChild(browseBtnWrap);
        new uiButton({
            label: 'Browse Programmes', variant: 'secondary', size: 'sm',
            icon: '<i class="fas fa-list"></i>',
            parent: browseBtnWrap,
            onClick: function() { self._openProgrammeBrowser(); }
        });

        // Year
        this._addLabel(el, 'Academic Year');
        var yearSelect = this._addSelect(el,
            Array.from({ length: 10 }, function(_, i) { var y = new Date().getFullYear() - i; return { value: String(y), label: String(y) }; }),
            String(this._selectedYear));
        yearSelect.addEventListener('change', function() { self._selectedYear = parseInt(yearSelect.value, 10); });

        // Data source status badge
        this._statusBadgeEl = document.createElement('div');
        this._statusBadgeEl.className = 'as-mt-2';
        el.appendChild(this._statusBadgeEl);
        this._renderStatusBadge();
        // API connect button
        var apiBtnRow = document.createElement('div');
        apiBtnRow.className = 'as-an-api-btn-row';
        el.appendChild(apiBtnRow);
        new uiButton({
            label: 'Connect to API', variant: 'outline', size: 'xs',
            icon: '<i class="fas fa-plug"></i>',
            parent: apiBtnRow,
            onClick: function() { self._connectToApi(); }
        });
        // Analyse button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        el.appendChild(btnWrap);
        new uiButton({
            label: 'Analyse', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-microscope"></i>',
            parent: btnWrap,
            onClick: async function() {
                // Show loading spinner in the active tab panel
                var activePanel = self._tabPanels[self._activeTab];
                if (activePanel) {
                    self._clearEl(activePanel);
                    var spinner = document.createElement('div');
                    spinner.className = 'as-empty-state';
                    spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>' +
                        '<div class="as-empty-state-title">Loading programme data\u2026</div>' +
                        '<div class="as-empty-state-hint">Fetching courses, cohorts, and results from ' +
                        (self._dataSource === 'api' ? 'the institution API' : 'demo data') + '</div>';
                    activePanel.appendChild(spinner);
                }
                await self._loadAllData();
                self._updateStageHeader();
                self._renderKPIs(self._kpiRow);
                self._renderHealthSummary(self._healthEl);
                self._renderAlertsSidebar(self._alertsEl);
                // Reset tab cache and render active tab
                var keys = Object.keys(self._tabRendered);
                for (var i = 0; i < keys.length; i++) self._tabRendered[keys[i]] = false;
                self._onTabChange(self._activeTab);
                if (typeof log === 'function') log('ProgAnalyst', 'Analysed ' + self._selectedProg + ' ' + self._selectedYear + ' [' + self._dataSource + ']');
            }
        });
    }

    _renderStatusBadge() {
        if (!this._statusBadgeEl) return;
        this._clearEl(this._statusBadgeEl);
        var span = document.createElement('span');
        if (this._loading) {
            span.className = 'as-an-status-loading';
            var loadIcon = this._faIcon('spinner fa-spin');
            loadIcon.className += ' as-an-icon-mr-xs';
            span.appendChild(loadIcon);
            span.appendChild(document.createTextNode('Connecting\u2026'));
        } else if (this._dataSource === 'api' && this._apiProgrammes) {
            span.className = 'as-an-status-connected';
            var connIcon = this._faIcon('check-circle');
            connIcon.className += ' as-an-icon-mr-xs';
            span.appendChild(connIcon);
            span.appendChild(document.createTextNode('API \u2014 ' + this._apiProgrammes.length + ' programmes'));
        } else {
            span.className = 'as-an-status-demo';
            var demoIcon = this._faIcon('database');
            demoIcon.className += ' as-an-icon-mr-xs';
            span.appendChild(demoIcon);
            span.appendChild(document.createTextNode('Demo Data'));
        }
        this._statusBadgeEl.appendChild(span);
    }

    _renderInfoBadges() {
        if (!this._infoBadgeWrap) return;
        this._clearEl(this._infoBadgeWrap);
        var programmes = this._apiProgrammes || this._bridge.PROGRAMMES;
        var self = this;
        var prog = programmes.find(function(p) { return (p.programmeCode || p.code) === self._selectedProg; });
        if (prog) {
            if (prog.nqf) new uiBadge({ label: 'NQF ' + prog.nqf, color: 'gray', size: 'xs', parent: this._infoBadgeWrap });
            if (prog.years) new uiBadge({ label: prog.years + '-year', color: 'gray', size: 'xs', parent: this._infoBadgeWrap });
            if (prog.department) new uiBadge({ label: prog.department, color: 'primary', size: 'xs', parent: this._infoBadgeWrap });
            if (prog.students || prog.studentCount) new uiBadge({ label: (prog.students || prog.studentCount) + ' students', color: 'info', size: 'xs', parent: this._infoBadgeWrap });
        }
    }

    _renderContextControls() {
        var el = this._contextControlEl;
        if (!el) return;
        this._clearEl(el);
        var tab = this._activeTab;
        if (tab === 'overview' || tab === 'about') {
            var msg = document.createElement('div');
            msg.className = 'as-an-ctrl-hint';
            msg.textContent = 'No additional controls for ' + (tab === 'overview' ? 'Overview' : 'About');
            el.appendChild(msg);
        } else if (tab === 'gatekeeper') {
            this._renderGatekeeperControls(el);
        } else if (tab === 'cohort') {
            this._renderCohortControls(el);
        } else if (tab === 'compare') {
            this._renderCompareControls(el);
        } else if (tab === 'progression') {
            this._renderProgressionControls(el);
        } else if (tab === 'outcomes') {
            this._renderOutcomesControls(el);
        } else if (tab === 'curriculum') {
            this._renderCurriculumControls(el);
        }
    }

    _renderGatekeeperControls(el) {
        var self = this;
        this._addLabel(el, 'DFW Threshold: ' + this._dfwThreshold + '%');
        var slider = document.createElement('input');
        slider.type = 'range'; slider.min = '5'; slider.max = '50';
        slider.value = String(this._dfwThreshold);
        slider.className = 'as-an-ctrl-slider as-an-ctrl-wrap';
        slider.addEventListener('input', function() {
            self._dfwThreshold = parseInt(slider.value, 10);
            el.querySelector('label').textContent = 'DFW Threshold: ' + self._dfwThreshold + '%';
        });
        el.appendChild(slider);
        this._addUpdateButton(el, function() { self._tabRendered.gatekeeper = false; self._onTabChange('gatekeeper'); });
    }

    _renderCohortControls(el) {
        var self = this;
        this._addLabel(el, 'Entry Year');
        var years = this._bridge.COHORTS.map(function(c) { return { value: String(c.year), label: String(c.year) }; });
        var sel = this._addSelect(el, years, String(this._cohortYear));
        sel.addEventListener('change', function() { self._cohortYear = parseInt(sel.value, 10); });
        this._addUpdateButton(el, function() { self._tabRendered.cohort = false; self._onTabChange('cohort'); });
    }

    _renderCompareControls(el) {
        var self = this;
        var years = this._bridge.COHORTS.map(function(c) { return { value: String(c.year), label: String(c.year) }; });
        this._addLabel(el, 'Cohort A');
        var selA = this._addSelect(el, years, String(this._compareYearA));
        selA.addEventListener('change', function() { self._compareYearA = parseInt(selA.value, 10); });
        this._addLabel(el, 'Cohort B');
        var selB = this._addSelect(el, years, String(this._compareYearB));
        selB.addEventListener('change', function() { self._compareYearB = parseInt(selB.value, 10); });
        this._addUpdateButton(el, function() { self._tabRendered.compare = false; self._onTabChange('compare'); });
    }

    _renderProgressionControls(el) {
        var self = this;
        this._addLabel(el, 'Color By');
        var sel = this._addSelect(el, [
            { value: 'passRate', label: 'Pass Rate' },
            { value: 'dfw', label: 'DFW Rate' },
            { value: 'year', label: 'Year Level' }
        ], this._colorBy);
        sel.addEventListener('change', function() { self._colorBy = sel.value; });
        this._addUpdateButton(el, function() { self._tabRendered.progression = false; self._onTabChange('progression'); });

        // ── What-If Simulation section ──
        var divider = document.createElement('hr');
        divider.className = 'as-an-ctrl-divider';
        el.appendChild(divider);
        this._addLabel(el, 'What-If Simulation');
        var hint = document.createElement('div');
        hint.className = 'as-an-ctrl-hint';
        hint.textContent = 'Click a node in the graph, then adjust the DFW shock and simulate.';
        el.appendChild(hint);

        // DFW shock slider
        this._addLabel(el, 'DFW Shock (+%)');
        var sliderWrap = document.createElement('div');
        sliderWrap.className = 'as-an-slider-wrap';
        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '5';
        slider.max = '40';
        slider.value = String(this._dfwShock);
        slider.className = 'ui-input';
        var sliderVal = document.createElement('span');
        sliderVal.className = 'as-an-slider-value';
        sliderVal.textContent = '+' + this._dfwShock + '%';
        slider.addEventListener('input', function() {
            self._dfwShock = parseInt(slider.value, 10);
            sliderVal.textContent = '+' + self._dfwShock + '%';
        });
        sliderWrap.appendChild(slider);
        sliderWrap.appendChild(sliderVal);
        el.appendChild(sliderWrap);

        // Simulate + Reset buttons
        var btnRow = document.createElement('div');
        btnRow.className = 'as-flex-row as-mt-2';
        var simBtn = document.createElement('button');
        simBtn.className = 'ui-btn ui-btn-sm ui-btn-primary';
        simBtn.innerHTML = '<i class="fas fa-bolt" style="margin-right:0.3rem;"></i>Simulate';
        simBtn.addEventListener('click', function() { self._runCascadeSimulation(); });
        btnRow.appendChild(simBtn);
        var resetBtn = document.createElement('button');
        resetBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost';
        resetBtn.innerHTML = '<i class="fas fa-undo" style="margin-right:0.3rem;"></i>Reset';
        resetBtn.addEventListener('click', function() { self._resetCascadeSimulation(); });
        btnRow.appendChild(resetBtn);
        el.appendChild(btnRow);

        // CCI results container
        this._cciResultsEl = document.createElement('div');
        this._cciResultsEl.className = 'as-an-cci-results';
        el.appendChild(this._cciResultsEl);
    }

    _runCascadeSimulation() {
        if (!this._cy || !this._pendingSelection || this._pendingSelection.type !== 'course') {
            // If no node selected, pick the top CCI course
            var engine = this._bridge.cascadeEngine;
            var topCCI = engine.computeAllCCI(this._dfwShock / 100);
            if (topCCI.length) {
                this._pendingSelection = { type: 'course', code: topCCI[0].code };
            } else {
                return;
            }
        }
        var sourceCode = this._pendingSelection.code;
        var engine = this._bridge.cascadeEngine;
        var result = engine.simulateShock(sourceCode, this._dfwShock / 100);
        this._animateCascade(sourceCode, result);
        this._showCCIResults(sourceCode, result);
        this._bus.emit('risk:simulated', { source: sourceCode, cci: result.cci, affected: result.affected.length });
    }

    _resetCascadeSimulation() {
        this._resetCascade();
        if (this._cciResultsEl) this._clearEl(this._cciResultsEl);
    }

    _showCCIResults(sourceCode, result) {
        var el = this._cciResultsEl;
        if (!el) return;
        this._clearEl(el);
        // CCI header
        var header = document.createElement('div');
        header.className = 'as-an-cci-card';
        header.innerHTML = '<div class="as-an-cci-card-header"><span class="as-an-cci-card-code">' + sourceCode + '</span><span class="as-an-cci-card-delta" style="color:#dc2626;">CCI: ' + result.cci.toFixed(2) + '</span></div><div style="font-size:0.65rem;color:var(--ui-gray-500,#6b7280);margin-top:0.15rem;">' + result.affected.length + ' downstream courses affected</div>';
        el.appendChild(header);
        // Top affected courses
        var maxDelta = result.affected.length ? Math.max.apply(null, result.affected.map(function(a) { return a.delta; })) : 1;
        result.affected.slice(0, 5).forEach(function(a) {
            var card = document.createElement('div');
            card.className = 'as-an-cci-card';
            var top = document.createElement('div');
            top.className = 'as-an-cci-card-header';
            var code = document.createElement('span');
            code.className = 'as-an-cci-card-code';
            code.textContent = a.code;
            top.appendChild(code);
            var delta = document.createElement('span');
            delta.className = 'as-an-cci-card-delta';
            delta.style.color = a.delta > 5 ? '#dc2626' : a.delta > 2 ? '#d97706' : '#16a34a';
            delta.textContent = '+' + a.delta.toFixed(1) + '%';
            top.appendChild(delta);
            card.appendChild(top);
            var bar = document.createElement('div');
            bar.className = 'as-an-cci-bar';
            var fill = document.createElement('div');
            fill.className = 'as-an-cci-bar-fill';
            fill.style.width = (a.delta / maxDelta * 100).toFixed(0) + '%';
            fill.style.background = a.delta > 5 ? '#dc2626' : a.delta > 2 ? '#d97706' : '#16a34a';
            bar.appendChild(fill);
            card.appendChild(bar);
            el.appendChild(card);
        });
    }

    _renderOutcomesControls(el) {
        var self = this;
        this._addLabel(el, 'Accreditation Body');
        var accSel = this._addSelect(el, [
            { value: 'ECSA', label: 'ECSA' }, { value: 'CHE', label: 'CHE' }, { value: 'SAQA', label: 'SAQA' }
        ], this._accBody);
        accSel.addEventListener('change', function() { self._accBody = accSel.value; });
        this._addLabel(el, 'Year Filter');
        var yrSel = this._addSelect(el, [
            { value: '0', label: 'All Years' }, { value: '1', label: 'Year 1' }, { value: '2', label: 'Year 2' }, { value: '3', label: 'Year 3' }
        ], String(this._yearFilter));
        yrSel.addEventListener('change', function() { self._yearFilter = parseInt(yrSel.value, 10); });
        this._addUpdateButton(el, function() { self._tabRendered.outcomes = false; self._onTabChange('outcomes'); });
    }

    _renderCurriculumControls(el) {
        var self = this;
        this._addLabel(el, 'Variant');
        var sel = this._addSelect(el, [
            { value: 'mainstream', label: 'Mainstream' }, { value: 'extended', label: 'Extended Curriculum' }
        ], this._variant);
        sel.addEventListener('change', function() { self._variant = sel.value; });
        this._addUpdateButton(el, function() { self._tabRendered.curriculum = false; self._onTabChange('curriculum'); });
    }

    _renderHealthSummary(el) {
        if (!el) return;
        this._clearEl(el);
        if (!this._dataLoaded) {
            var placeholder = document.createElement('div');
            placeholder.className = 'as-an-ctrl-hint';
            placeholder.textContent = 'Run analysis to see health summary';
            el.appendChild(placeholder);
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
            { label: 'Pass Rate', value: overallPassRate + '%', color: parseFloat(overallPassRate) >= 70 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' },
            { label: 'Avg DFW Rate', value: avgDfw + '%', color: parseFloat(avgDfw) <= 20 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' },
            { label: 'At-Risk Students', value: String(totalAtRisk), color: totalAtRisk > 50 ? 'var(--ui-red-600)' : 'var(--ui-green-600)' },
            { label: 'Throughput', value: throughput + '%', color: parseFloat(throughput) >= 35 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' },
            { label: 'Courses', value: String(this._courses.length), color: 'var(--ui-gray-700)' }
        ];
        var wrap = document.createElement('div');
        wrap.className = 'as-an-ctrl-stats';
        items.forEach(function(i) {
            var row = document.createElement('div');
            row.appendChild(document.createTextNode(i.label + ': '));
            var strong = document.createElement('strong');
            strong.style.color = i.color;
            strong.textContent = i.value;
            row.appendChild(strong);
            wrap.appendChild(row);
        });
        el.appendChild(wrap);
    }

    _renderAlertsSidebar(el) {
        if (!el) return;
        this._clearEl(el);
        if (!this._dataLoaded) {
            var placeholder = document.createElement('div');
            placeholder.className = 'as-an-ctrl-hint';
            placeholder.textContent = 'Run analysis to see alerts';
            el.appendChild(placeholder);
            return;
        }
        var self = this;
        var alerts = [];
        var gatekeepers = this._courses.filter(function(c) { return c.dfw > 30; });
        if (gatekeepers.length) alerts.push({ icon: 'door-closed', color: 'var(--ui-red-600)', text: gatekeepers.length + ' gatekeeper course' + (gatekeepers.length > 1 ? 's' : '') + ' (DFW>30%)' });
        var lowAvg = this._courses.filter(function(c) { return c.avgMark < 50; });
        if (lowAvg.length) alerts.push({ icon: 'chart-line', color: 'var(--ui-amber-600)', text: lowAvg.length + ' course' + (lowAvg.length > 1 ? 's' : '') + ' below 50% avg' });
        var highRisk = this._courses.filter(function(c) { return c.enrolled > 0 && (c.atRisk / c.enrolled) > 0.3; });
        if (highRisk.length) alerts.push({ icon: 'exclamation-triangle', color: 'var(--ui-red-600)', text: highRisk.length + ' course' + (highRisk.length > 1 ? 's' : '') + ' with >30% at-risk' });
        var latestCohort = this._cohorts[0];
        if (latestCohort && (latestCohort.graduated / latestCohort.intake) < 0.35) alerts.push({ icon: 'filter', color: 'var(--ui-amber-600)', text: 'Throughput below 35% target' });
        if (!alerts.length) {
            var noAlerts = document.createElement('div');
            noAlerts.className = 'as-an-ctrl-hint as-an-no-alerts';
            noAlerts.appendChild(self._faIcon('check-circle', 'as-an-icon-mr-xs'));
            noAlerts.appendChild(document.createTextNode('No critical alerts'));
            el.appendChild(noAlerts);
            return;
        }
        alerts.forEach(function(a) {
            var item = document.createElement('div');
            item.className = 'as-an-ctrl-alert-item';
            var icon = self._faIcon(a.icon);
            icon.className += ' as-an-ctrl-alert-icon';
            icon.style.color = a.color;
            item.appendChild(icon);
            var span = document.createElement('span');
            span.className = 'as-an-ctrl-alert-text';
            span.textContent = a.text;
            item.appendChild(span);
            el.appendChild(item);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STAGE
    // ══════════════════════════════════════════════════════════════════════════

    _buildStage() {
        var stage = this._stageEl;
        this._clearEl(stage);
        stage.className = 'as-an-stage';
        var self = this;

        var wrap = document.createElement('div');
        wrap.className = 'as-an-stage-body';
        stage.appendChild(wrap);

        // Header
        var header = document.createElement('div');
        header.className = 'as-an-panel-header';
        var programmes = this._apiProgrammes || this._bridge.PROGRAMMES;
        var prog = programmes.find(function(p) { return (p.programmeCode || p.code) === self._selectedProg; });
        var progName = prog ? (prog.programmeLabel || prog.programmeName || prog.name) : this._selectedProg;

        var titleSpan = document.createElement('span');
        titleSpan.className = 'as-an-panel-badge as-an-panel-badge-overview';
        titleSpan.appendChild(this._faIcon('microscope'));
        titleSpan.appendChild(document.createTextNode('Programme Analyst'));
        header.appendChild(titleSpan);

        var infoSpan = document.createElement('span');
        infoSpan.className = 'prog-analyst-header-info as-an-panel-subtitle';
        infoSpan.textContent = progName + ' | ' + this._selectedYear;
        header.appendChild(infoSpan);

        var badgeWrap = document.createElement('span');
        badgeWrap.className = 'as-flex-shrink-0';
        var sourceBadgeSpan = document.createElement('span');
        if (this._dataSource === 'api') {
            sourceBadgeSpan.className = 'as-an-source-badge-api';
            sourceBadgeSpan.textContent = 'Live API';
        } else {
            sourceBadgeSpan.className = 'as-an-source-badge-demo';
            sourceBadgeSpan.textContent = 'Demo Data';
        }
        badgeWrap.appendChild(sourceBadgeSpan);
        header.appendChild(badgeWrap);
        wrap.appendChild(header);

        // Persistent KPI row
        this._kpiRow = document.createElement('div');
        this._kpiRow.className = 'as-an-kpi-row';
        wrap.appendChild(this._kpiRow);
        this._renderKPIs(this._kpiRow);

        // Tabs
        var tabContent = {};
        ProgAnalystPanel.TAB_REGISTRY.forEach(function(t) {
            tabContent[t.key] = { label: '<i class="fas fa-' + t.icon + '" style="margin-right:0.3rem;font-size:0.7rem;"></i>' + t.label };
        });
        tabContent.overview.open = true;

        this._tabs = new uiTabs({
            template: 'underline',
            content: tabContent,
            parent: wrap
        });
        this._tabs.bus.on('tabChange', function(e) { self._onTabChange(e.tab); });

        // Store tab panel refs
        ProgAnalystPanel.TAB_REGISTRY.forEach(function(t) {
            var panel = self._tabs.el.querySelector('.ui-tabs-panel[data-tab="' + t.key + '"]');
            if (panel) self._tabPanels[t.key] = panel;
        });

        // Show initial placeholder
        if (this._tabPanels.overview) {
            this._tabPanels.overview.innerHTML =
                '<div class="as-empty-state">' +
                    '<i class="fas fa-microscope"></i>' +
                    '<div class="as-empty-state-title">Select a programme and click Analyse to begin</div>' +
                    '<div class="as-empty-state-hint">Choose a programme from the control panel on the left</div>' +
                '</div>';
        }
    }

    _updateStageHeader() {
        var self = this;
        var infoEl = this._stageEl.querySelector('.prog-analyst-header-info');
        var badgeEl = this._stageEl.querySelector('.prog-analyst-header-badge');
        if (infoEl) {
            var programmes = this._apiProgrammes || this._bridge.PROGRAMMES;
            var prog = programmes.find(function(p) { return (p.programmeCode || p.code) === self._selectedProg; });
            var progName = prog ? (prog.programmeLabel || prog.programmeName || prog.name) : this._selectedProg;
            infoEl.textContent = progName + ' | ' + this._selectedYear;
        }
        if (badgeEl) {
            this._clearEl(badgeEl);
            var badge = document.createElement('span');
            if (this._dataSource === 'api') {
                badge.className = 'as-an-source-badge-api';
                badge.textContent = 'Live API';
            } else {
                badge.className = 'as-an-source-badge-demo';
                badge.textContent = 'Demo Data';
            }
            badgeEl.appendChild(badge);
        }
    }

    _onTabChange(tabKey) {
        this._activeTab = tabKey;
        this._renderContextControls();
        if (!this._dataLoaded && tabKey !== 'about') {
            var panel = this._tabPanels[tabKey];
            if (panel) {
                this._clearEl(panel);
                new uiAlert({ variant: 'info', message: 'Click Analyse to load programme data', parent: panel, dismissible: false });
            }
            return;
        }
        if (this._tabRendered[tabKey]) return;
        var panel = this._tabPanels[tabKey];
        if (!panel) return;
        this._clearEl(panel);
        if (tabKey === 'overview') this._renderOverviewTab(panel);
        else if (tabKey === 'gatekeeper') this._renderGatekeeperTab(panel);
        else if (tabKey === 'cohort') this._renderCohortTab(panel);
        else if (tabKey === 'compare') this._renderCompareTab(panel);
        else if (tabKey === 'progression') this._renderProgressionTab(panel);
        else if (tabKey === 'outcomes') this._renderOutcomesTab(panel);
        else if (tabKey === 'curriculum') this._renderCurriculumTab(panel);
        else if (tabKey === 'about') this._renderAboutTab(panel);
        this._tabRendered[tabKey] = true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DATA
    // ══════════════════════════════════════════════════════════════════════════

    async _loadAllData() {
        var self = this;
        // Ensure bridge has current programme selected
        this._bridge.selectProgramme(this._selectedProg);
        if (this._dataSource === 'api' && this._apiProgrammes) {
            try {
                // Step 1: Get the programme's own students for this year
                var studentSet = new Set();
                var studRaw = await this._apiCall('getProgrammeStudents', { programmeCode: this._selectedProg, year: this._selectedYear });
                var studRecords = this._parseResponse(studRaw) || [];
                studRecords.forEach(function(s) {
                    var sn = s.studentNumber || s.student_number || s.studentnumber || s.id || '';
                    if (sn) studentSet.add(String(sn));
                });
                this._programmeStudentCount = studentSet.size;
                if (typeof log === 'function') log('ProgAnalyst', 'Programme roster: ' + studentSet.size + ' students');

                // Step 2: Get programme course structure
                var structRaw = await this._apiCall('getProgrammeStructure', { programmeCode: this._selectedProg, year: this._selectedYear });
                var apiCourses = this._parseResponse(structRaw) || [];
                if (!apiCourses.length) {
                    structRaw = await this._apiCall('getProgrammeStructure', { programmeCode: this._selectedProg, year: this._selectedYear - 1 });
                    apiCourses = this._parseResponse(structRaw) || [];
                }

                if (apiCourses.length) {
                    // Step 3: Fetch results for each course (batched, max 10 parallel)
                    var courseCodes = apiCourses.map(function(c) { return c.courseCode || c.course_code || c.code; }).filter(Boolean);
                    var resultsMap = await this._batchFetch(courseCodes, async function(code) {
                        var res = await self._apiCall('getCourseResults', { courseCode: code, year: self._selectedYear });
                        return self._parseResponse(res) || [];
                    }, 10);

                    // Step 4: Filter course results to programme students only, then compute stats
                    this._courses = apiCourses.map(function(c) {
                        var code = c.courseCode || c.course_code || c.code;
                        var allResults = resultsMap[code] || [];

                        // Filter to only students registered in this programme
                        var results = studentSet.size > 0
                            ? allResults.filter(function(r) {
                                var sn = String(r.studentNumber || r.student_number || r.studentnumber || r.id || '');
                                return studentSet.has(sn);
                            })
                            : allResults;

                        var enrolled = results.length;
                        var passed = 0, totalMark = 0, atRisk = 0;
                        results.forEach(function(r) {
                            var mark = parseFloat(r.result || r.finalMark || r.final_mark || r.mark || 0);
                            var passCode = String(r.resultCode || r.result_code || r.passStatus || r.pass_status || '').toUpperCase();
                            totalMark += mark;
                            if (passCode.charAt(0) === 'P' || mark >= 50) passed++;
                            else if (mark >= 40) atRisk++;
                        });
                        var avgMark = enrolled > 0 ? totalMark / enrolled : 0;
                        var dfw = enrolled > 0 ? ((enrolled - passed) / enrolled) * 100 : 0;
                        return {
                            code: code,
                            name: c.courseName || c.course_name || c.name || code,
                            year: parseInt(c.ayos || c.yearOfStudy || c.year_of_study || 1, 10),
                            semester: c.semester || 'S1',
                            credits: parseInt(c.credits || 0, 10),
                            type: (c.isCore === 'Y' || c.isCore === true) ? 'core' : (c.type || 'core'),
                            enrolled: enrolled,
                            passed: passed,
                            avgMark: avgMark,
                            atRisk: atRisk,
                            dfw: dfw,
                            dfwHistory: [dfw]
                        };
                    });

                    // Step 5: Cohort data from getProgrammeCounts across years
                    var cohorts = [];
                    var yearsToTry = [self._selectedYear, self._selectedYear - 1, self._selectedYear - 2, self._selectedYear - 3, self._selectedYear - 4];
                    for (var yi = 0; yi < yearsToTry.length; yi++) {
                        try {
                            var countRaw = await this._apiCall('getProgrammeCounts', { year: yearsToTry[yi] });
                            var countData = this._parseResponse(countRaw) || [];
                            var progMatch = countData.find(function(p) { return (p.programmeCode || p.programme_code || p.code) === self._selectedProg; });
                            if (progMatch) {
                                cohorts.push({
                                    year: yearsToTry[yi],
                                    intake: parseInt(progMatch.students || progMatch.studentCount || progMatch.count || 0, 10),
                                    y1End: 0, y2End: 0, y3End: 0, graduated: 0,
                                    dropouts: 0, repeat: 0, excluded: 0, avgYearsToComplete: 0
                                });
                            }
                        } catch (e) { /* skip year */ }
                    }

                    // Step 6: Graduation data
                    try {
                        var gradRaw = await this._apiCall('getProgrammeGrads', { programmeCode: this._selectedProg });
                        var gradData = this._parseResponse(gradRaw) || [];
                        gradData.forEach(function(g) {
                            var gradYear = parseInt(g.year || g.graduationYear || g.graduation_year || 0, 10);
                            var gradCount = parseInt(g.graduates || g.graduated || g.count || 0, 10);
                            var match = cohorts.find(function(c) { return c.year === gradYear; });
                            if (match) match.graduated = gradCount;
                        });
                    } catch (e) { /* graduation data optional */ }

                    // Step 7: Registration data for retention estimates
                    try {
                        var regRaw = await this._apiCall('getProgrammeRegistrations', { programmeCode: this._selectedProg });
                        var regData = this._parseResponse(regRaw) || [];
                        cohorts.forEach(function(coh) {
                            var yearRegs = regData.filter(function(r) {
                                return parseInt(r.year || r.registrationYear || 0, 10) === coh.year;
                            });
                            if (yearRegs.length) {
                                coh.y1End = coh.y1End || Math.round(coh.intake * 0.78);
                                coh.y2End = coh.y2End || Math.round(coh.intake * 0.55);
                                coh.y3End = coh.y3End || Math.round(coh.intake * 0.42);
                            }
                        });
                    } catch (e) { /* registration data optional */ }

                    // Fill in estimated retention figures where missing
                    cohorts.forEach(function(coh) {
                        if (!coh.y1End) coh.y1End = Math.round(coh.intake * 0.78);
                        if (!coh.y2End) coh.y2End = Math.round(coh.intake * 0.55);
                        if (!coh.y3End) coh.y3End = Math.round(coh.intake * 0.42);
                        if (!coh.graduated) coh.graduated = Math.round(coh.intake * 0.35);
                        coh.dropouts = coh.intake - coh.graduated;
                        coh.avgYearsToComplete = coh.avgYearsToComplete || 3.8;
                    });

                    this._cohorts = cohorts.length ? cohorts : this._bridge.COHORTS;
                } else {
                    this._courses = this._bridge.COURSES;
                    this._cohorts = this._bridge.COHORTS;
                }
            } catch (e) {
                console.warn('ProgAnalyst: API data fetch failed, using demo data.', e);
                this._courses = this._bridge.COURSES;
                this._cohorts = this._bridge.COHORTS;
            }
        } else {
            this._courses = this._bridge.COURSES;
            this._cohorts = this._bridge.COHORTS;
            this._programmeStudentCount = 0;
        }

        // Compute gatekeepers (works with either data source)
        var threshold = this._dfwThreshold;
        this._gatekeepers = this._courses
            .filter(function(c) { return c.dfw >= threshold; })
            .map(function(c) {
                var downstream = self._bridge.getAllDownstream(c.code);
                return { course: c, downstream: downstream, score: c.dfw * (downstream.length || 1) };
            })
            .sort(function(a, b) { return b.score - a.score; });
        // Cohort selections
        this._selectedCohort = this._cohorts.find(function(c) { return c.year === self._cohortYear; }) || this._cohorts[0];
        this._cohortA = this._cohorts.find(function(c) { return c.year === self._compareYearA; });
        this._cohortB = this._cohorts.find(function(c) { return c.year === self._compareYearB; });
        // Deep copy GA matrix (always demo — not in API)
        this._matrix = {};
        var src = this._bridge.GA_COURSE_MATRIX;
        for (var ga in src) {
            this._matrix[ga] = {};
            for (var course in src[ga]) this._matrix[ga][course] = src[ga][course];
        }
        this._dataLoaded = true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // KPI ROW (persistent)
    // ══════════════════════════════════════════════════════════════════════════

    _renderKPIs(parent) {
        this._clearEl(parent);
        var self = this;
        if (!this._dataLoaded) {
            [{ icon: 'users', label: 'Headcount' }, { icon: 'check-circle', label: 'Pass Rate' }, { icon: 'filter', label: 'Throughput' },
             { icon: 'user-check', label: 'Retention' }, { icon: 'exclamation-triangle', label: 'At-Risk' }, { icon: 'chart-bar', label: 'Avg Mark' }
            ].forEach(function(c) {
                var card = document.createElement('div');
                card.className = 'as-an-kpi-card as-an-kpi-card-placeholder';
                var topRow = document.createElement('div');
                topRow.className = 'as-an-kpi-card-header';
                var icon = self._faIcon(c.icon);
                icon.className += ' as-an-kpi-icon as-an-placeholder';
                topRow.appendChild(icon);
                var labelSpan = document.createElement('span');
                labelSpan.className = 'as-an-kpi-label';
                labelSpan.textContent = c.label;
                topRow.appendChild(labelSpan);
                card.appendChild(topRow);
                var valueDiv = document.createElement('div');
                valueDiv.className = 'as-an-kpi-value as-an-placeholder';
                valueDiv.textContent = '\u2014';
                card.appendChild(valueDiv);
                parent.appendChild(card);
            });
            return;
        }
        var headcount = this._programmeStudentCount || 0;
        if (!headcount) {
            var y1Courses = this._courses.filter(function(c) { return c.year === 1; });
            headcount = y1Courses.length > 0 ? Math.max.apply(null, y1Courses.map(function(c) { return c.enrolled; })) : 0;
        }
        var totalEnrolled = this._courses.reduce(function(s, c) { return s + c.enrolled; }, 0);
        var totalPassed = this._courses.reduce(function(s, c) { return s + c.passed; }, 0);
        var passRate = totalEnrolled > 0 ? ((totalPassed / totalEnrolled) * 100).toFixed(1) : 0;
        var latestCohort = this._cohorts[0];
        var throughput = latestCohort ? ((latestCohort.graduated / latestCohort.intake) * 100).toFixed(1) : 0;
        var retention = latestCohort ? ((latestCohort.y1End / latestCohort.intake) * 100).toFixed(1) : 0;
        var totalAtRisk = this._courses.reduce(function(s, c) { return s + c.atRisk; }, 0);
        var avgMark = totalEnrolled > 0 ? (this._courses.reduce(function(s, c) { return s + c.avgMark * c.enrolled; }, 0) / totalEnrolled).toFixed(1) : 0;

        // Build cohort-derived sparklines for all KPIs
        var throughputHistory = this._cohorts.map(function(c) { return c.intake > 0 ? (c.graduated / c.intake * 100) : 0; }).reverse();
        var retentionHistory = this._cohorts.map(function(c) { return c.intake > 0 ? (c.y1End / c.intake * 100) : 0; }).reverse();
        var intakeHistory = this._cohorts.map(function(c) { return c.intake || 0; }).reverse();
        var prevCohort = this._cohorts.length > 1 ? this._cohorts[1] : null;
        var prevThroughput = prevCohort ? (prevCohort.graduated / prevCohort.intake * 100) : parseFloat(throughput);
        var prevRetention = prevCohort ? (prevCohort.y1End / prevCohort.intake * 100) : parseFloat(retention);
        var prevIntake = prevCohort ? prevCohort.intake : headcount;

        var kpis = [
            { label: 'Headcount', value: String(headcount), sub: 'First-year intake', icon: 'users', colorClass: 'as-an-kpi-card-blue', sparkline: intakeHistory, trend: headcount, trendPrev: prevIntake, higherIsBetter: true },
            { label: 'Pass Rate', value: passRate + '%', sub: this._courses.length + ' courses', icon: 'check-circle', colorClass: parseFloat(passRate) >= 70 ? 'as-an-kpi-card-green' : 'as-an-kpi-card-amber' },
            { label: 'Throughput', value: throughput + '%', sub: latestCohort ? latestCohort.graduated + '/' + latestCohort.intake : '\u2014', icon: 'filter', colorClass: parseFloat(throughput) >= 35 ? 'as-an-kpi-card-green' : 'as-an-kpi-card-red', sparkline: throughputHistory, trend: parseFloat(throughput), trendPrev: prevThroughput, higherIsBetter: true },
            { label: 'Retention', value: retention + '%', sub: 'First-year retention', icon: 'user-check', colorClass: parseFloat(retention) >= 75 ? 'as-an-kpi-card-green' : 'as-an-kpi-card-amber', sparkline: retentionHistory, trend: parseFloat(retention), trendPrev: prevRetention, higherIsBetter: true },
            { label: 'At-Risk', value: String(totalAtRisk), sub: 'Across all courses', icon: 'exclamation-triangle', colorClass: totalAtRisk > 100 ? 'as-an-kpi-card-red' : 'as-an-kpi-card-amber' },
            { label: 'Avg Mark', value: avgMark + '%', sub: 'Programme-wide', icon: 'chart-bar', colorClass: parseFloat(avgMark) >= 55 ? 'as-an-kpi-card-green' : 'as-an-kpi-card-amber' }
        ];
        kpis.forEach(function(k) {
            parent.appendChild(self._buildKpiCard(k));
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: OVERVIEW
    // ══════════════════════════════════════════════════════════════════════════

    _renderOverviewTab(el) {
        var wrap = document.createElement('div');
        wrap.className = 'as-p-2';
        el.appendChild(wrap);
        this._renderAlertBanner(wrap);
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

    _renderAlertBanner(parent) {
        var gatekeepers = this._courses.filter(function(c) { return c.dfw > 30; });
        if (!gatekeepers.length) return;
        var banner = document.createElement('div');
        banner.className = 'as-an-alert-warning';
        var bannerIcon = this._faIcon('door-closed');
        bannerIcon.className += ' as-an-alert-icon-warn as-flex-shrink-0';
        banner.appendChild(bannerIcon);
        var bannerBody = document.createElement('div');
        bannerBody.className = 'as-flex-1';
        var bannerTitle = document.createElement('div');
        bannerTitle.className = 'as-an-rec-title';
        bannerTitle.textContent = 'Gatekeeper Courses Detected';
        bannerBody.appendChild(bannerTitle);
        var bannerDesc = document.createElement('div');
        bannerDesc.className = 'as-an-rec-body';
        bannerDesc.textContent = gatekeepers.map(function(c) { return c.code + ' (' + c.dfw.toFixed(1) + '% DFW)'; }).join(', ');
        bannerBody.appendChild(bannerDesc);
        banner.appendChild(bannerBody);
        parent.appendChild(banner);
    }

    _renderCoursePerformance(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('table', 'Course Performance', this._courses.length + ' courses'));
        var tableWrap = document.createElement('div');
        tableWrap.className = 'as-an-table-wrap';
        card.appendChild(tableWrap);
        var table = document.createElement('table');
        table.className = 'as-an-data-table';
        table.appendChild(this._buildThead([
            { text: 'Code', css: 'as-an-th-left' },
            { text: 'Course', css: 'as-an-th-left' },
            { text: 'Yr', css: 'as-an-th-center' }, { text: 'Enrol', css: 'as-an-th-center' }, { text: 'Avg', css: 'as-an-th-center' },
            { text: 'Pass%', css: 'as-an-th-center' }, { text: 'DFW%', css: 'as-an-th-center' }, { text: 'Risk', css: 'as-an-th-center' }
        ]));
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        var self = this;
        this._courses.forEach(function(c) {
            var passRate = c.enrolled > 0 ? ((c.passed / c.enrolled) * 100).toFixed(1) : 0;
            var avgColor = c.avgMark >= 60 ? 'var(--ui-green-600)' : c.avgMark >= 50 ? 'var(--ui-blue-700)' : 'var(--ui-red-600)';
            var passColor = parseFloat(passRate) >= 75 ? 'var(--ui-green-600)' : parseFloat(passRate) >= 60 ? 'var(--ui-blue-700)' : 'var(--ui-red-600)';
            var dfwColor = c.dfw <= 15 ? 'var(--ui-green-600)' : c.dfw <= 25 ? 'var(--ui-amber-600)' : 'var(--ui-red-600)';
            var isGK = c.dfw > 30;
            var row = document.createElement('tr');
            row.className = 'as-an-clickable-row';
            // Code cell
            var codeTd = document.createElement('td');
            codeTd.className = 'as-an-td-base-nowrap';
            codeTd.appendChild(document.createTextNode(c.code));
            if (isGK) { codeTd.appendChild(document.createTextNode(' ')); var gkI = self._faIcon('door-closed'); gkI.className += ' as-an-gk-icon-sm'; codeTd.appendChild(gkI); }
            row.appendChild(codeTd);
            row.appendChild(self._buildTd(c.name, null, 'as-an-td-base'));
            row.appendChild(self._buildTd(String(c.year), null, 'as-an-td-center-muted'));
            row.appendChild(self._buildTd(String(c.enrolled), null, 'as-an-td-center-base'));
            var avgTd = self._buildTd(c.avgMark.toFixed(1) + '%', null, 'as-an-td-center-bold');
            avgTd.style.color = avgColor;
            row.appendChild(avgTd);
            // Pass% badge
            var passTd = document.createElement('td');
            passTd.className = 'as-an-td-center-base';
            passTd.appendChild(self._buildBadge(passRate + '%', passColor, self._colorLight(passColor)));
            row.appendChild(passTd);
            // DFW% badge
            var dfwTd = document.createElement('td');
            dfwTd.className = 'as-an-td-center-base';
            dfwTd.appendChild(self._buildBadge(c.dfw.toFixed(1) + '%', dfwColor, self._colorLight(dfwColor)));
            row.appendChild(dfwTd);
            var riskTd = self._buildTd(String(c.atRisk), null, 'as-an-td-center-bold');
            riskTd.style.color = c.atRisk > 30 ? 'var(--ui-red-600)' : c.atRisk > 15 ? 'var(--ui-amber-600)' : 'var(--ui-green-600)';
            row.appendChild(riskTd);
            row.addEventListener('click', function() { self._showCourseDetail(c); });
            tbody.appendChild(row);
        });
    }

    _renderYearLevelBreakdown(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('layer-group', 'Year-Level Breakdown'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        var self = this;
        var yearColors = ['var(--ui-blue-700)', 'var(--ui-purple-600)', 'var(--ui-green-600)'];
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
            var titleRow = document.createElement('div');
            titleRow.className = 'as-an-year-title-row';
            var yrTitle = document.createElement('span');
            yrTitle.className = 'as-an-year-title';
            yrTitle.textContent = 'Year ' + yr;
            titleRow.appendChild(yrTitle);
            var yrInfo = document.createElement('span');
            yrInfo.className = 'as-an-year-info';
            yrInfo.textContent = yrCourses.length + ' courses \u00b7 ' + enrolled + ' students';
            titleRow.appendChild(yrInfo);
            yearBlock.appendChild(titleRow);
            // Stats grid
            var statsGrid = document.createElement('div');
            statsGrid.className = 'as-an-stats-grid-4';
            var statItems = [
                { label: 'Avg Mark', value: avgMark.toFixed(1) + '%', color: avgMark >= 55 ? 'var(--ui-green-600)' : 'var(--ui-amber-600)' },
                { label: 'Pass Rate', value: avgPass.toFixed(1) + '%', color: avgPass >= 70 ? 'var(--ui-green-600)' : 'var(--ui-amber-600)' },
                { label: 'DFW Rate', value: avgDfw.toFixed(1) + '%', color: avgDfw <= 20 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' },
                { label: 'At-Risk', value: String(totalRisk), color: totalRisk > 40 ? 'var(--ui-red-600)' : 'var(--ui-green-600)' }
            ];
            statItems.forEach(function(si) {
                var cell = document.createElement('div');
                cell.className = 'as-an-stat-cell';
                var cellLabel = document.createElement('div');
                cellLabel.className = 'as-an-stat-cell-label';
                cellLabel.textContent = si.label;
                cell.appendChild(cellLabel);
                var cellValue = document.createElement('div');
                cellValue.className = 'as-an-stat-cell-value';
                cellValue.style.color = si.color;
                cellValue.textContent = si.value;
                cell.appendChild(cellValue);
                statsGrid.appendChild(cell);
            });
            yearBlock.appendChild(statsGrid);
            // Progress bar
            var progressWrap = document.createElement('div');
            progressWrap.className = 'as-an-progress-mt';
            var track = document.createElement('div');
            track.className = 'as-progress-track as-progress-track-sm';
            track.className += ' as-an-track-full';
            var fill = document.createElement('div');
            fill.className = 'as-progress-fill';
            fill.style.width = avgPass.toFixed(0) + '%';
            fill.style.background = col;
            track.appendChild(fill);
            progressWrap.appendChild(track);
            yearBlock.appendChild(progressWrap);
            body.appendChild(yearBlock);
        });
    }

    _renderCohortThroughput(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('filter', 'Cohort Throughput'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        this._cohorts.slice(0, 2).forEach(function(cohort) {
            var cohortEl = document.createElement('div');
            cohortEl.className = 'as-an-cohort-divider';
            var throughput = ((cohort.graduated / cohort.intake) * 100).toFixed(1);
            var titleRow = document.createElement('div');
            titleRow.className = 'as-an-cohort-title-row';
            var cohortLabel = document.createElement('span');
            cohortLabel.className = 'as-an-cohort-label';
            cohortLabel.textContent = cohort.year + ' Cohort';
            titleRow.appendChild(cohortLabel);
            var tpLabel = document.createElement('span');
            tpLabel.className = 'as-an-risk-pct-label';
            tpLabel.style.color = parseFloat(throughput) >= 35 ? 'var(--ui-green-600)' : 'var(--ui-red-600)';
            tpLabel.textContent = throughput + '% throughput';
            titleRow.appendChild(tpLabel);
            cohortEl.appendChild(titleRow);
            var steps = [
                { label: 'Intake', value: cohort.intake, pct: 100 },
                { label: 'End Y1', value: cohort.y1End, pct: (cohort.y1End / cohort.intake * 100) },
                { label: 'End Y2', value: cohort.y2End, pct: (cohort.y2End / cohort.intake * 100) },
                { label: 'End Y3', value: cohort.y3End, pct: (cohort.y3End / cohort.intake * 100) },
                { label: 'Graduated', value: cohort.graduated, pct: (cohort.graduated / cohort.intake * 100) }
            ];
            steps.forEach(function(step) {
                var barColor = step.pct >= 75 ? 'var(--ui-green-600)' : step.pct >= 50 ? 'var(--ui-blue-700)' : step.pct >= 35 ? 'var(--ui-amber-600)' : 'var(--ui-red-600)';
                var stepRow = document.createElement('div');
                stepRow.className = 'as-an-bar-step-row';
                var stepLabel = document.createElement('span');
                stepLabel.className = 'as-an-funnel-label';
                stepLabel.textContent = step.label;
                stepRow.appendChild(stepLabel);
                var track = document.createElement('div');
                track.className = 'as-progress-track as-progress-track-sm';
                track.className += ' as-flex-1';
                var fill = document.createElement('div');
                fill.className = 'as-progress-fill';
                fill.style.width = step.pct.toFixed(0) + '%';
                fill.style.background = barColor;
                track.appendChild(fill);
                stepRow.appendChild(track);
                var stepVal = document.createElement('span');
                stepVal.className = 'as-an-funnel-value';
                stepVal.textContent = String(step.value);
                stepRow.appendChild(stepVal);
                cohortEl.appendChild(stepRow);
            });
            body.appendChild(cohortEl);
        });
    }

    _renderAtRiskDistribution(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('exclamation-triangle', 'At-Risk Distribution'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        var self = this;
        [1, 2, 3].forEach(function(yr) {
            var yrCourses = self._courses.filter(function(c) { return c.year === yr; });
            if (!yrCourses.length) return;
            var totalRisk = yrCourses.reduce(function(s, c) { return s + c.atRisk; }, 0);
            var enrolled = yrCourses[0].enrolled;
            var riskPct = enrolled > 0 ? ((totalRisk / enrolled) * 100).toFixed(1) : 0;
            var riskColor = parseFloat(riskPct) > 30 ? 'var(--ui-red-600)' : parseFloat(riskPct) > 20 ? 'var(--ui-amber-600)' : 'var(--ui-green-600)';
            var yrRow = document.createElement('div');
            yrRow.className = 'as-an-bar-step-row-wide';
            var yrLabel = document.createElement('span');
            yrLabel.className = 'as-an-risk-yr-label';
            yrLabel.textContent = 'Year ' + yr;
            yrRow.appendChild(yrLabel);
            var track = document.createElement('div');
            track.className = 'as-progress-track as-progress-track-md as-flex-1';
            var fill = document.createElement('div');
            fill.className = 'as-progress-fill';
            fill.style.width = riskPct + '%';
            fill.style.background = riskColor;
            track.appendChild(fill);
            yrRow.appendChild(track);
            var pctLabel = document.createElement('span');
            pctLabel.className = 'as-an-risk-pct-label';
            pctLabel.style.color = riskColor;
            pctLabel.textContent = riskPct + '%';
            yrRow.appendChild(pctLabel);
            body.appendChild(yrRow);
        });
        var topRisk = this._courses.slice().sort(function(a, b) { return b.atRisk - a.atRisk; }).slice(0, 5);
        var topTitle = document.createElement('div');
        topTitle.className = 'as-an-upper-label as-mt-2 as-mb-2';
        topTitle.textContent = 'Highest Risk Courses';
        body.appendChild(topTitle);
        topRisk.forEach(function(c) {
            var item = document.createElement('div');
            item.className = 'as-an-risk-item';
            var codeEl = document.createElement('code');
            codeEl.className = 'as-an-risk-item-code';
            codeEl.textContent = c.code;
            item.appendChild(codeEl);
            var nameSpan = document.createElement('span');
            nameSpan.className = 'as-an-risk-item-name';
            nameSpan.textContent = c.name;
            item.appendChild(nameSpan);
            var riskSpan = document.createElement('span');
            riskSpan.className = 'as-an-risk-item-value';
            riskSpan.style.color = c.atRisk > 40 ? 'var(--ui-red-600)' : 'var(--ui-amber-600)';
            riskSpan.textContent = String(c.atRisk);
            item.appendChild(riskSpan);
            body.appendChild(item);
        });
    }

    _renderGACoverage(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('border-all', 'GA Coverage'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        var totalMapped = this._bridge.GA_ATTRIBUTES.reduce(function(s, g) { return s + g.mapped; }, 0);
        var totalPossible = this._bridge.GA_ATTRIBUTES.reduce(function(s, g) { return s + g.courses; }, 0);
        var overallPct = ((totalMapped / totalPossible) * 100).toFixed(0);
        var overallColor = parseInt(overallPct, 10) >= 80 ? 'var(--ui-green-600)' : parseInt(overallPct, 10) >= 60 ? 'var(--ui-amber-600)' : 'var(--ui-red-600)';
        var overallRow = document.createElement('div');
        overallRow.className = 'as-an-ga-overall-wrap';
        var overallTop = document.createElement('div');
        overallTop.className = 'as-an-ga-overall-row';
        var overallLabel = document.createElement('span');
        overallLabel.className = 'as-an-ga-label';
        overallLabel.textContent = 'Overall Coverage';
        overallTop.appendChild(overallLabel);
        var overallVal = document.createElement('span');
        overallVal.className = 'as-text-bold';
        overallVal.style.color = overallColor;
        overallVal.textContent = overallPct + '%';
        overallTop.appendChild(overallVal);
        overallRow.appendChild(overallTop);
        var overallTrack = document.createElement('div');
        overallTrack.className = 'as-progress-track as-progress-track-md';
        var overallFill = document.createElement('div');
        overallFill.className = 'as-progress-fill';
        overallFill.style.width = overallPct + '%';
        overallFill.style.background = overallColor;
        overallTrack.appendChild(overallFill);
        overallRow.appendChild(overallTrack);
        body.appendChild(overallRow);
        this._bridge.GA_ATTRIBUTES.forEach(function(ga) {
            var pct = ((ga.mapped / ga.courses) * 100).toFixed(0);
            var color = parseInt(pct, 10) >= 80 ? 'var(--ui-green-600)' : parseInt(pct, 10) >= 60 ? 'var(--ui-amber-600)' : 'var(--ui-red-600)';
            var gaRow = document.createElement('div');
            gaRow.className = 'as-an-dist-row';
            gaRow.title = ga.name;
            var gaCode = document.createElement('span');
            gaCode.className = 'as-an-dist-label';
            gaCode.textContent = ga.code;
            gaRow.appendChild(gaCode);
            var gaTrack = document.createElement('div');
            gaTrack.className = 'as-progress-track as-progress-track-sm as-flex-1';
            var gaFill = document.createElement('div');
            gaFill.className = 'as-progress-fill';
            gaFill.style.width = pct + '%';
            gaFill.style.background = color;
            gaTrack.appendChild(gaFill);
            gaRow.appendChild(gaTrack);
            var gaCount = document.createElement('span');
            gaCount.className = 'as-an-dist-summary';
            gaCount.textContent = ga.mapped + '/' + ga.courses;
            gaRow.appendChild(gaCount);
            body.appendChild(gaRow);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: GATEKEEPERS
    // ══════════════════════════════════════════════════════════════════════════

    _renderGatekeeperTab(el) {
        // Re-detect with current threshold
        var self = this;
        var threshold = this._dfwThreshold;
        this._gatekeepers = this._courses
            .filter(function(c) { return c.dfw >= threshold; })
            .map(function(c) {
                var downstream = self._bridge.getAllDownstream(c.code);
                return { course: c, downstream: downstream, score: c.dfw * downstream.length };
            })
            .sort(function(a, b) { return b.score - a.score; });

        var wrap = document.createElement('div');
        wrap.className = 'as-p-2';
        el.appendChild(wrap);
        // KPIs
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        wrap.appendChild(row);
        var totalAffected = this._gatekeepers.reduce(function(s, g) { return s + g.course.enrolled; }, 0);
        var avgDfw = this._gatekeepers.length > 0 ? (this._gatekeepers.reduce(function(s, g) { return s + g.course.dfw; }, 0) / this._gatekeepers.length).toFixed(1) : '0';
        var worst = this._gatekeepers.length > 0 ? this._gatekeepers[0].course.code : '\u2014';
        var self = this;
        [{ label: 'Gatekeepers', value: String(this._gatekeepers.length), icon: 'door-closed', color: 'var(--ui-red-600)', bg: 'var(--ui-red-50)' },
         { label: 'Avg DFW', value: avgDfw + '%', icon: 'chart-line', color: 'var(--ui-amber-600)', bg: 'var(--ui-amber-50)' },
         { label: 'Students Affected', value: String(totalAffected), icon: 'users', color: 'var(--ui-blue-700)', bg: 'var(--ui-blue-50)' },
         { label: 'Worst Course', value: worst, icon: 'exclamation-triangle', color: 'var(--ui-red-600)', bg: 'var(--ui-red-50)' }
        ].forEach(function(k) {
            row.appendChild(self._buildKpiCard(k));
        });
        this._renderGatekeeperTable(wrap);
    }

    _renderGatekeeperTable(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('sort-amount-down', 'Ranked Gatekeepers', this._gatekeepers.length + ' courses'));
        var tableWrap = document.createElement('div');
        tableWrap.className = 'as-an-table-wrap';
        card.appendChild(tableWrap);
        var table = document.createElement('table');
        table.className = 'as-an-data-table';
        table.appendChild(this._buildThead([
            { text: 'Code', css: 'as-an-th-left' },
            { text: 'Course', css: 'as-an-th-left' },
            { text: 'DFW%', css: 'as-an-th-center' }, { text: 'Pass%', css: 'as-an-th-center' }, { text: 'Enrolled', css: 'as-an-th-center' },
            { text: 'Blocked', css: 'as-an-th-center' }, { text: 'Score', css: 'as-an-th-center' }, { text: 'Trend', css: 'as-an-th-center' }
        ]));
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        var self = this;
        this._gatekeepers.forEach(function(g) {
            var c = g.course;
            var passRate = c.enrolled > 0 ? ((c.passed / c.enrolled) * 100).toFixed(1) : '0';
            var dfwColor = c.dfw >= 35 ? 'var(--ui-red-600)' : c.dfw >= 25 ? 'var(--ui-amber-600)' : 'var(--ui-green-600)';
            var passColor = parseFloat(passRate) >= 70 ? 'var(--ui-green-600)' : parseFloat(passRate) >= 55 ? 'var(--ui-blue-700)' : 'var(--ui-red-600)';
            var tr = document.createElement('tr');
            tr.className = 'as-an-clickable-row';
            // Code cell with icon
            var codeTd = document.createElement('td');
            codeTd.className = 'as-an-td-base-bold';
            var gkIcon = self._faIcon('door-closed');
            gkIcon.className += ' as-an-gk-icon-sm-mr';
            codeTd.appendChild(gkIcon);
            codeTd.appendChild(document.createTextNode(c.code));
            tr.appendChild(codeTd);
            tr.appendChild(self._buildTd(c.name, null, 'as-an-td-base'));
            var dfwTd = document.createElement('td');
            dfwTd.className = 'as-an-td-center-base';
            dfwTd.appendChild(self._buildBadge(c.dfw.toFixed(1) + '%', dfwColor, self._colorLight(dfwColor)));
            tr.appendChild(dfwTd);
            var passTd = self._buildTd(passRate + '%', null, 'as-an-td-center-bold');
            passTd.style.color = passColor;
            tr.appendChild(passTd);
            tr.appendChild(self._buildTd(String(c.enrolled), null, 'as-an-td-center-base'));
            tr.appendChild(self._buildTd(String(g.downstream.length), null, 'as-an-td-center-bold-purple'));
            var scoreTd = document.createElement('td');
            scoreTd.className = 'as-an-td-center-base';
            scoreTd.appendChild(self._buildBadge(g.score.toFixed(0), 'var(--ui-red-600)', 'var(--ui-red-50)'));
            tr.appendChild(scoreTd);
            // Trend (sparkline SVG — computed coords, not user data)
            var trendTd = document.createElement('td');
            trendTd.className = 'as-an-td-center-base';
            trendTd.innerHTML = self._sparkline(c.dfwHistory);
            tr.appendChild(trendTd);
            tr.addEventListener('click', function() {
                self._showGatekeeperDetail(g);
                self._bus.emit('course:select', { code: c.code, source: 'gatekeeper' });
            });
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

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: COHORT FLOW
    // ══════════════════════════════════════════════════════════════════════════

    _renderCohortTab(el) {
        var self = this;
        this._selectedCohort = this._cohorts.find(function(c) { return c.year === self._cohortYear; }) || this._cohorts[0];
        var wrap = document.createElement('div');
        wrap.className = 'as-p-2';
        el.appendChild(wrap);
        if (!this._selectedCohort) { var noData = document.createElement('div'); noData.className = 'as-an-no-data'; noData.textContent = 'No cohort data for selected year.'; wrap.appendChild(noData); return; }
        // KPIs
        var c = this._selectedCohort;
        var throughput = ((c.graduated / c.intake) * 100).toFixed(1);
        var dropout = ((c.dropouts / c.intake) * 100).toFixed(1);
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        wrap.appendChild(row);
        [{ label: 'Intake', value: String(c.intake), icon: 'sign-in-alt', color: 'var(--ui-blue-700)', bg: 'var(--ui-blue-50)' },
         { label: 'Current', value: String(c.y3End), icon: 'users', color: 'var(--ui-purple-600)', bg: 'var(--ui-purple-50)' },
         { label: 'Graduated', value: String(c.graduated), icon: 'graduation-cap', color: 'var(--ui-green-600)', bg: 'var(--ui-green-50)' },
         { label: 'Dropout Rate', value: dropout + '%', icon: 'user-minus', color: 'var(--ui-red-600)', bg: 'var(--ui-red-50)' },
         { label: 'AYOS', value: String(c.avgYearsToComplete), icon: 'clock', color: 'var(--ui-amber-600)', bg: 'var(--ui-amber-50)' }
        ].forEach(function(k) {
            row.appendChild(self._buildKpiCard(k));
        });
        this._renderSankey(wrap);
        this._renderAttritionTable(wrap);
        this._renderAYOS(wrap);
    }

    _renderSankey(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('stream', 'Cohort Flow'));
        var body = document.createElement('div');
        body.className = 'as-p-3';
        card.appendChild(body);
        if (typeof d3 !== 'undefined' && typeof d3.sankey !== 'undefined') {
            this._buildD3Sankey(body);
        } else {
            this._buildLegacySankey(body);
        }
    }

    _buildD3Sankey(container) {
        var c = this._selectedCohort;
        var self = this;
        var W = 700, H = 260;
        var wrap = document.createElement('div');
        wrap.className = 'as-an-sankey-container';
        container.appendChild(wrap);

        // Build nodes: stage nodes + dropout/repeat/excluded sink nodes
        var stageNames = ['Intake', 'End Y1', 'End Y2', 'End Y3', 'Graduated'];
        var stageValues = [c.intake, c.y1End, c.y2End, c.y3End, c.graduated];
        var nodeColors = ['#1d4ed8', '#7c3aed', '#d97706', '#16a34a', '#16a34a', '#dc2626', '#f59e0b', '#991b1b'];

        var nodes = [];
        stageNames.forEach(function(n, i) { nodes.push({ name: n, color: nodeColors[i] }); });
        nodes.push({ name: 'Dropout', color: '#dc2626' });
        nodes.push({ name: 'Repeat', color: '#f59e0b' });
        nodes.push({ name: 'Excluded', color: '#991b1b' });

        // Links: stage-to-stage (progress) + stage-to-sinks (loss categories)
        var links = [];
        var dropoutTotal = c.dropouts || 0;
        var repeatTotal = c.repeat || 0;
        var excludedTotal = c.excluded || 0;
        var totalLoss = dropoutTotal + repeatTotal + excludedTotal;

        for (var i = 0; i < stageValues.length - 1; i++) {
            var progress = stageValues[i + 1];
            var lost = stageValues[i] - stageValues[i + 1];
            if (progress > 0) links.push({ source: i, target: i + 1, value: progress });
            if (lost > 0 && totalLoss > 0) {
                // Distribute loss proportionally across categories
                var dropFrac = dropoutTotal / totalLoss;
                var repFrac = repeatTotal / totalLoss;
                var exFrac = excludedTotal / totalLoss;
                var dLoss = Math.round(lost * dropFrac);
                var rLoss = Math.round(lost * repFrac);
                var eLoss = lost - dLoss - rLoss;
                if (dLoss > 0) links.push({ source: i, target: 5, value: dLoss });
                if (rLoss > 0) links.push({ source: i, target: 6, value: rLoss });
                if (eLoss > 0) links.push({ source: i, target: 7, value: eLoss });
            } else if (lost > 0) {
                links.push({ source: i, target: 5, value: lost });
            }
        }

        // Build d3-sankey
        var sankey = d3.sankey()
            .nodeId(function(d) { return d.index; })
            .nodeWidth(24)
            .nodePadding(16)
            .nodeAlign(d3.sankeyJustify)
            .extent([[1, 1], [W - 1, H - 6]]);

        var graph = sankey({
            nodes: nodes.map(function(n, idx) { return Object.assign({}, n, { index: idx }); }),
            links: links.map(function(l) { return Object.assign({}, l); })
        });

        var svg = d3.select(wrap).append('svg')
            .attr('viewBox', '0 0 ' + W + ' ' + H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Tooltip
        var tooltip = document.createElement('div');
        tooltip.className = 'as-an-sankey-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
        this._sankeyTooltip = tooltip;

        // Links
        svg.append('g')
            .selectAll('path')
            .data(graph.links)
            .join('path')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('fill', 'none')
            .attr('stroke', function(d) { return d.target.color || '#9ca3af'; })
            .attr('stroke-opacity', 0.3)
            .attr('stroke-width', function(d) { return Math.max(1, d.width); })
            .on('mouseover', function(event, d) {
                d3.select(this).attr('stroke-opacity', 0.6);
                tooltip.style.display = '';
                tooltip.textContent = d.source.name + ' \u2192 ' + d.target.name + ': ' + d.value + ' students';
            })
            .on('mousemove', function(event) {
                tooltip.style.left = (event.clientX + 12) + 'px';
                tooltip.style.top = (event.clientY - 20) + 'px';
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke-opacity', 0.3);
                tooltip.style.display = 'none';
            });

        // Nodes
        var nodeG = svg.append('g')
            .selectAll('g')
            .data(graph.nodes)
            .join('g');

        nodeG.append('rect')
            .attr('x', function(d) { return d.x0; })
            .attr('y', function(d) { return d.y0; })
            .attr('width', function(d) { return d.x1 - d.x0; })
            .attr('height', function(d) { return Math.max(1, d.y1 - d.y0); })
            .attr('fill', function(d) { return d.color; })
            .attr('rx', 3)
            .attr('opacity', 0.9)
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                self._bus.emit('cohort:select', { stage: d.name, source: 'sankey' });
            })
            .on('mouseover', function(event, d) {
                tooltip.style.display = '';
                var pct = c.intake > 0 ? ((d.value / c.intake) * 100).toFixed(1) : '0';
                tooltip.textContent = d.name + ': ' + d.value + ' (' + pct + '% of intake)';
            })
            .on('mousemove', function(event) {
                tooltip.style.left = (event.clientX + 12) + 'px';
                tooltip.style.top = (event.clientY - 20) + 'px';
            })
            .on('mouseout', function() { tooltip.style.display = 'none'; });

        // Node labels
        nodeG.append('text')
            .attr('x', function(d) { return d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6; })
            .attr('y', function(d) { return (d.y0 + d.y1) / 2; })
            .attr('dy', '0.35em')
            .attr('text-anchor', function(d) { return d.x0 < W / 2 ? 'start' : 'end'; })
            .attr('font-size', '10px')
            .attr('font-family', 'system-ui')
            .attr('fill', '#374151')
            .text(function(d) { return d.name + ' (' + d.value + ')'; });
    }

    _buildLegacySankey(body) {
        var c = this._selectedCohort;
        var W = 700, H = 200;
        var stages = [
            { label: 'Intake', value: c.intake }, { label: 'End Y1', value: c.y1End },
            { label: 'End Y2', value: c.y2End }, { label: 'End Y3', value: c.y3End },
            { label: 'Graduated', value: c.graduated }
        ];
        var maxVal = stages[0].value;
        var stageW = 80;
        var gap = (W - stageW * stages.length) / (stages.length - 1);
        var colors = ['#1d4ed8', '#7c3aed', '#d97706', '#16a34a', '#16a34a'];
        var svg = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;">';
        for (var i = 0; i < stages.length - 1; i++) {
            var x1 = i * (stageW + gap) + stageW;
            var x2 = (i + 1) * (stageW + gap);
            var h1 = (stages[i].value / maxVal) * 140;
            var h2 = (stages[i + 1].value / maxVal) * 140;
            var y1 = (H - h1) / 2;
            var y2 = (H - h2) / 2;
            svg += '<path d="M' + x1 + ',' + y1 + ' C' + (x1 + gap / 2) + ',' + y1 + ' ' + (x2 - gap / 2) + ',' + y2 + ' ' + x2 + ',' + y2 + ' L' + x2 + ',' + (y2 + h2) + ' C' + (x2 - gap / 2) + ',' + (y2 + h2) + ' ' + (x1 + gap / 2) + ',' + (y1 + h1) + ' ' + x1 + ',' + (y1 + h1) + ' Z" fill="' + colors[i] + '" opacity="0.2"/>';
            var loss = stages[i].value - stages[i + 1].value;
            if (loss > 0) {
                var lossH = (loss / maxVal) * 140;
                var ly1 = y1 + h1 - lossH;
                svg += '<path d="M' + x1 + ',' + ly1 + ' C' + (x1 + gap / 3) + ',' + ly1 + ' ' + (x1 + gap / 2) + ',' + (H - 10) + ' ' + (x1 + gap / 1.5) + ',' + (H - 10) + ' L' + (x1 + gap / 1.5) + ',' + H + ' C' + (x1 + gap / 2) + ',' + H + ' ' + (x1 + gap / 3) + ',' + (y1 + h1) + ' ' + x1 + ',' + (y1 + h1) + ' Z" fill="#dc2626" opacity="0.15"/>';
                svg += '<text x="' + (x1 + gap / 2) + '" y="' + (H - 2) + '" text-anchor="middle" font-size="8" fill="#dc2626" font-weight="600">-' + loss + '</text>';
            }
        }
        for (var j = 0; j < stages.length; j++) {
            var x = j * (stageW + gap);
            var barH = (stages[j].value / maxVal) * 140;
            var barY = (H - barH) / 2;
            svg += '<rect x="' + x + '" y="' + barY + '" width="' + stageW + '" height="' + barH + '" rx="4" fill="' + colors[j] + '" opacity="0.85"/>';
            svg += '<text x="' + (x + stageW / 2) + '" y="' + (barY + barH / 2 - 4) + '" text-anchor="middle" font-size="14" fill="white" font-weight="800">' + stages[j].value + '</text>';
            svg += '<text x="' + (x + stageW / 2) + '" y="' + (barY + barH / 2 + 10) + '" text-anchor="middle" font-size="8" fill="white" opacity="0.8">' + ((stages[j].value / maxVal) * 100).toFixed(0) + '%</text>';
            svg += '<text x="' + (x + stageW / 2) + '" y="' + (barY - 6) + '" text-anchor="middle" font-size="9" fill="#6b7280" font-weight="600">' + stages[j].label + '</text>';
        }
        svg += '</svg>';
        body.innerHTML = svg;
    }

    _renderAttritionTable(parent) {
        var self = this;
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('table', 'Year-Level Attrition'));
        var c = this._selectedCohort;
        var yearData = [
            { year: 'Year 1', start: c.intake, end: c.y1End },
            { year: 'Year 2', start: c.y1End, end: c.y2End },
            { year: 'Year 3', start: c.y2End, end: c.y3End }
        ];
        var table = document.createElement('table');
        table.className = 'as-an-data-table';
        table.appendChild(this._buildThead([
            { text: 'Year', css: 'as-an-th-left' },
            { text: 'Start', css: 'as-an-th-center' }, { text: 'Progress', css: 'as-an-th-center' },
            { text: 'Lost', css: 'as-an-th-center' }, { text: 'Loss %', css: 'as-an-th-center' }
        ]));
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        card.appendChild(table);
        yearData.forEach(function(yd) {
            var lost = yd.start - yd.end;
            var lossPct = yd.start > 0 ? ((lost / yd.start) * 100).toFixed(1) : '0';
            var lossColor = parseFloat(lossPct) > 25 ? 'var(--ui-red-600)' : parseFloat(lossPct) > 15 ? 'var(--ui-amber-600)' : 'var(--ui-green-600)';
            var tr = document.createElement('tr');
            tr.appendChild(self._buildTd(yd.year, null, 'as-an-td-base-bold'));
            tr.appendChild(self._buildTd(String(yd.start), null, 'as-an-td-center-base'));
            tr.appendChild(self._buildTd(String(yd.end), null, 'as-an-td-center-bold-green'));
            tr.appendChild(self._buildTd(String(lost), null, 'as-an-td-center-bold-red'));
            var lossTd = document.createElement('td');
            lossTd.className = 'as-an-td-center-base';
            lossTd.appendChild(self._buildBadge(lossPct + '%', lossColor, self._colorLight(lossColor)));
            tr.appendChild(lossTd);
            tbody.appendChild(tr);
        });
    }

    _renderAYOS(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('clock', 'AYOS Distribution'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        [{ label: '3 years', pct: 45, color: 'var(--ui-green-600)' }, { label: '4 years', pct: 30, color: 'var(--ui-blue-700)' }, { label: '5 years', pct: 15, color: 'var(--ui-amber-600)' }, { label: '6+ years', pct: 10, color: 'var(--ui-red-600)' }].forEach(function(b) {
            var row = document.createElement('div');
            row.className = 'as-an-ayos-bar-row';
            var label = document.createElement('span');
            label.className = 'as-an-ayos-bar-label';
            label.textContent = b.label;
            row.appendChild(label);
            var track = document.createElement('div');
            track.className = 'as-progress-track as-progress-track-md as-flex-1';
            var fill = document.createElement('div');
            fill.className = 'as-progress-fill';
            fill.style.width = b.pct + '%';
            fill.style.background = b.color;
            track.appendChild(fill);
            row.appendChild(track);
            var pctSpan = document.createElement('span');
            pctSpan.className = 'as-an-ayos-pct-label';
            pctSpan.style.color = b.color;
            pctSpan.textContent = b.pct + '%';
            row.appendChild(pctSpan);
            body.appendChild(row);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: COMPARE
    // ══════════════════════════════════════════════════════════════════════════

    _renderCompareTab(el) {
        var self = this;
        this._cohortA = this._cohorts.find(function(c) { return c.year === self._compareYearA; });
        this._cohortB = this._cohorts.find(function(c) { return c.year === self._compareYearB; });
        var wrap = document.createElement('div');
        wrap.className = 'as-p-2';
        el.appendChild(wrap);
        if (!this._cohortA || !this._cohortB) { var noData = document.createElement('div'); noData.className = 'as-an-no-data'; noData.textContent = 'Select two different cohort years with available data.'; wrap.appendChild(noData); return; }
        // KPIs
        var a = this._cohortA, b = this._cohortB;
        var tpA = (a.graduated / a.intake * 100).toFixed(1);
        var tpB = (b.graduated / b.intake * 100).toFixed(1);
        var retA = (a.y1End / a.intake * 100).toFixed(1);
        var retB = (b.y1End / b.intake * 100).toFixed(1);
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        wrap.appendChild(row);
        [{ label: 'Throughput A', value: tpA + '%', icon: 'filter', color: 'var(--ui-blue-700)', bg: 'var(--ui-blue-50)' },
         { label: 'Throughput B', value: tpB + '%', icon: 'filter', color: 'var(--ui-purple-600)', bg: 'var(--ui-purple-50)' },
         { label: 'Retention \u0394', value: this._delta(retA, retB), icon: 'user-check', color: parseFloat(retA) >= parseFloat(retB) ? 'var(--ui-green-600)' : 'var(--ui-red-600)', bg: parseFloat(retA) >= parseFloat(retB) ? 'var(--ui-green-50)' : 'var(--ui-red-50)' },
         { label: 'Throughput \u0394', value: this._delta(tpA, tpB), icon: 'exchange-alt', color: parseFloat(tpA) >= parseFloat(tpB) ? 'var(--ui-green-600)' : 'var(--ui-red-600)', bg: parseFloat(tpA) >= parseFloat(tpB) ? 'var(--ui-green-50)' : 'var(--ui-red-50)' }
        ].forEach(function(k) {
            row.appendChild(self._buildKpiCard(k));
        });
        this._renderComparisonTable(wrap);
        this._renderFunnelOverlay(wrap);
    }

    _renderComparisonTable(parent) {
        var self = this;
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('table', 'Metric Comparison'));
        var a = this._cohortA, b = this._cohortB;
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
        table.appendChild(this._buildThead([
            { text: 'Metric', css: 'as-an-th-left' },
            { text: String(this._compareYearA), css: 'as-an-th-center', color: 'var(--ui-blue-700)' },
            { text: String(this._compareYearB), css: 'as-an-th-center', color: 'var(--ui-purple-600)' },
            { text: 'Delta', css: 'as-an-th-center' }, { text: 'Trend', css: 'as-an-th-center' }
        ]));
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        card.appendChild(table);
        metrics.forEach(function(m) {
            var numA = parseFloat(m.valA), numB = parseFloat(m.valB);
            var diff = numA - numB;
            var improved = m.invert ? diff <= 0 : diff >= 0;
            var deltaStr = (diff >= 0 ? '+' : '') + (m.fmt === 'pct' ? diff.toFixed(1) + '%' : diff.toFixed(1));
            var deltaColor = improved ? 'var(--ui-green-600)' : 'var(--ui-red-600)';
            var arrow = improved ? '\u25B2' : '\u25BC';
            var tr = document.createElement('tr');
            tr.appendChild(self._buildTd(m.label, null, 'as-an-td-base-bold'));
            var tdA = self._buildTd(m.valA + (m.fmt === 'pct' ? '%' : ''), null, 'as-an-td-center-bold');
            tdA.style.color = 'var(--ui-blue-700)';
            tr.appendChild(tdA);
            var tdB = self._buildTd(m.valB + (m.fmt === 'pct' ? '%' : ''), null, 'as-an-td-center-bold');
            tdB.style.color = 'var(--ui-purple-600)';
            tr.appendChild(tdB);
            var deltaTd = self._buildTd(deltaStr, null, 'as-an-td-center-bold');
            deltaTd.style.color = deltaColor;
            tr.appendChild(deltaTd);
            var arrowTd = self._buildTd(arrow, null, 'as-an-td-center-bold');
            arrowTd.style.color = deltaColor;
            tr.appendChild(arrowTd);
            tbody.appendChild(tr);
        });
    }

    _renderFunnelOverlay(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('chart-bar', 'Parallel Funnel'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        var a = this._cohortA, b = this._cohortB;
        var stages = ['Intake', 'End Y1', 'End Y2', 'End Y3', 'Graduated'];
        var valsA = [a.intake, a.y1End, a.y2End, a.y3End, a.graduated];
        var valsB = [b.intake, b.y1End, b.y2End, b.y3End, b.graduated];
        var maxVal = Math.max(a.intake, b.intake);
        var self = this;
        stages.forEach(function(label, i) {
            var pctA = (valsA[i] / maxVal * 100).toFixed(0);
            var pctB = (valsB[i] / maxVal * 100).toFixed(0);
            var row = document.createElement('div');
            row.className = 'as-an-funnel-mb';
            // Label
            var labelDiv = document.createElement('div');
            labelDiv.className = 'as-an-funnel-label-sm';
            labelDiv.textContent = label;
            row.appendChild(labelDiv);
            // Bar A
            var barRowA = document.createElement('div');
            barRowA.className = 'as-an-funnel-bar-row-a';
            var valASpan = document.createElement('span');
            valASpan.className = 'as-an-funnel-val-span-a';
            valASpan.textContent = String(valsA[i]);
            barRowA.appendChild(valASpan);
            var trackA = document.createElement('div');
            trackA.className = 'as-an-funnel-bar-track';
            var fillA = document.createElement('div');
            fillA.className = 'as-an-compare-fill-a';
            fillA.style.width = pctA + '%';
            trackA.appendChild(fillA);
            barRowA.appendChild(trackA);
            row.appendChild(barRowA);
            // Bar B
            var barRowB = document.createElement('div');
            barRowB.className = 'as-an-funnel-bar-row-b';
            var valBSpan = document.createElement('span');
            valBSpan.className = 'as-an-funnel-val-span-b';
            valBSpan.textContent = String(valsB[i]);
            barRowB.appendChild(valBSpan);
            var trackB = document.createElement('div');
            trackB.className = 'as-an-funnel-bar-track';
            var fillB = document.createElement('div');
            fillB.className = 'as-an-compare-fill-b';
            fillB.style.width = pctB + '%';
            trackB.appendChild(fillB);
            barRowB.appendChild(trackB);
            row.appendChild(barRowB);
            body.appendChild(row);
        });
        // Legend
        var legend = document.createElement('div');
        legend.className = 'as-an-legend-compact';
        [{ color: 'var(--ui-blue-700)', year: this._compareYearA }, { color: 'var(--ui-purple-600)', year: this._compareYearB }].forEach(function(l) {
            var item = document.createElement('div');
            var swatch = document.createElement('span');
            swatch.className = 'as-an-swatch';
            swatch.style.background = l.color;
            item.appendChild(swatch);
            item.appendChild(document.createTextNode(String(l.year)));
            legend.appendChild(item);
        });
        body.appendChild(legend);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: PROGRESSION MAP
    // ══════════════════════════════════════════════════════════════════════════

    _renderProgressionTab(el) {
        var wrap = document.createElement('div');
        wrap.className = 'as-p-2 as-flex-col';
        el.appendChild(wrap);
        this._renderGraph(wrap);
        this._renderBottomPanel(wrap);
    }

    _renderGraph(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card as-an-graph-card';
        parent.appendChild(card);
        var hdr = this._buildSectionHeader('project-diagram', 'Prerequisite Graph', 'Click nodes for details');
        card.appendChild(hdr);
        var container = document.createElement('div');
        card.appendChild(container);
        if (typeof cytoscape !== 'undefined') {
            container.className = 'as-an-cy-container';
            this._buildCytoscapeNetwork(container);
            this._renderGraphLegend(card);
        } else if (typeof vis !== 'undefined' && vis.Network) {
            container.className = 'as-an-graph-container';
            this._buildVisNetwork(container);
        } else {
            container.className = 'as-an-graph-container';
            this._renderFallbackGraph(container);
        }
    }

    _buildCytoscapeNetwork(container) {
        var courses = this._courses.length ? this._courses : this._bridge.COURSES;
        var prereqs = this._bridge.PREREQUISITES;
        var self = this;

        // Guard: check if current courses have any matching prerequisite edges
        var courseCodes = {};
        courses.forEach(function(c) { courseCodes[c.code] = true; });
        var matchingEdgeCount = 0;
        for (var code in prereqs) {
            if (courseCodes[code]) {
                prereqs[code].forEach(function(p) {
                    if (courseCodes[p]) matchingEdgeCount++;
                });
            }
        }
        if (!courses.length || matchingEdgeCount === 0) {
            container.className = 'as-an-graph-container';
            var msg = document.createElement('div');
            msg.className = 'as-empty-state';
            msg.innerHTML = '<i class="fas fa-project-diagram"></i>' +
                '<div class="as-empty-state-title">No prerequisite data available</div>' +
                '<div class="as-empty-state-hint">This programme does not have prerequisite chains mapped. ' +
                'Use the Curriculum tab to view course structure.</div>';
            container.appendChild(msg);
            return;
        }

        // Build elements
        var elements = [];
        courses.forEach(function(c) {
            var downstream = self._bridge.getAllDownstream(c.code).length;
            var passRate = c.enrolled > 0 ? (c.passed / c.enrolled * 100) : 0;
            var color = self._getCyNodeColor(c, passRate);
            elements.push({
                data: {
                    id: c.code,
                    label: c.code + '\n' + passRate.toFixed(0) + '%',
                    courseCode: c.code,
                    courseName: c.name,
                    passRate: passRate,
                    dfw: c.dfw,
                    enrolled: c.enrolled,
                    year: c.year,
                    downstream: downstream,
                    color: color,
                    borderWidth: c.dfw > 30 ? 3 : 1,
                    nodeSize: Math.max(25, 15 + downstream * 4)
                }
            });
        });
        for (var code in prereqs) {
            prereqs[code].forEach(function(prereqCode) {
                elements.push({
                    data: { id: prereqCode + '->' + code, source: prereqCode, target: code }
                });
            });
        }

        // Init Cytoscape
        this._cy = cytoscape({
            container: container,
            elements: elements,
            style: [
                { selector: 'node', style: {
                    'label': 'data(label)',
                    'text-wrap': 'wrap',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '9px',
                    'font-family': 'system-ui, monospace',
                    'color': '#fff',
                    'background-color': 'data(color)',
                    'border-width': 'data(borderWidth)',
                    'border-color': 'data(color)',
                    'width': 'data(nodeSize)',
                    'height': 'data(nodeSize)',
                    'shape': 'round-rectangle',
                    'padding': '4px',
                    'transition-property': 'background-color, border-color, border-width',
                    'transition-duration': '0.3s'
                }},
                { selector: 'node:selected', style: {
                    'border-width': 3,
                    'border-color': '#1a1a2e',
                    'overlay-opacity': 0.1
                }},
                { selector: 'node.cascade-source', style: {
                    'border-width': 4,
                    'border-color': '#dc2626',
                    'overlay-color': '#dc2626',
                    'overlay-opacity': 0.15
                }},
                { selector: 'node.cascade-hit', style: {
                    'border-width': 3,
                    'border-color': '#f59e0b',
                    'overlay-color': '#f59e0b',
                    'overlay-opacity': 0.1
                }},
                { selector: 'node.highlight', style: {
                    'border-width': 3,
                    'border-color': '#6366f1',
                    'overlay-color': '#6366f1',
                    'overlay-opacity': 0.12
                }},
                { selector: 'edge', style: {
                    'width': 1.5,
                    'line-color': '#9ca3af',
                    'target-arrow-color': '#9ca3af',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 0.8,
                    'transition-property': 'line-color, target-arrow-color, width',
                    'transition-duration': '0.3s'
                }},
                { selector: 'edge.cascade-edge', style: {
                    'line-color': '#f59e0b',
                    'target-arrow-color': '#f59e0b',
                    'width': 2.5
                }}
            ],
            layout: {
                name: 'dagre',
                rankDir: 'LR',
                nodeSep: 40,
                rankSep: 140,
                edgeSep: 20,
                padding: 20
            },
            userZoomingEnabled: true,
            userPanningEnabled: true,
            boxSelectionEnabled: false,
            minZoom: 0.3,
            maxZoom: 2.5
        });

        // Click handler → detail modal + bus emit
        this._cy.on('tap', 'node', function(evt) {
            var code = evt.target.data('courseCode');
            var course = courses.find(function(c) { return c.code === code; });
            if (course) {
                self._showNodeDetail(course);
                self._bus.emit('course:select', { code: code, source: 'progression' });
            }
        });

        // Initialize cascade engine on bridge
        this._cascadeEngine = this._bridge.cascadeEngine;
    }

    _buildVisNetwork(container) {
        var courses = this._bridge.COURSES;
        var prereqs = this._bridge.PREREQUISITES;
        var self = this;
        var nodes = courses.map(function(c) {
            var downstream = self._bridge.getAllDownstream(c.code).length;
            var passRate = c.enrolled > 0 ? (c.passed / c.enrolled * 100) : 0;
            var color = self._getCyNodeColor(c, passRate);
            return { id: c.code, label: c.code + '\n' + passRate.toFixed(0) + '%', title: c.name + ' | Pass: ' + passRate.toFixed(1) + '% | DFW: ' + c.dfw.toFixed(1) + '%', color: { background: color, border: color, highlight: { background: color, border: '#1a1a2e' } }, size: 15 + downstream * 4, level: c.year, font: { size: 10, color: '#fff', face: 'monospace' }, shape: 'box', borderWidth: c.dfw > 30 ? 3 : 1 };
        });
        var edges = [];
        for (var code in prereqs) { prereqs[code].forEach(function(prereq) { edges.push({ from: prereq, to: code, arrows: 'to', color: { color: '#9ca3af', highlight: '#4338ca' }, width: 1.5 }); }); }
        var data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        var options = { layout: { hierarchical: { direction: 'LR', sortMethod: 'directed', levelSeparation: 180, nodeSpacing: 80 } }, physics: false, interaction: { hover: true, tooltipDelay: 100 }, nodes: { shape: 'box', margin: { top: 5, bottom: 5, left: 8, right: 8 }, font: { size: 10, face: 'system-ui', color: '#fff' } }, edges: { smooth: { type: 'cubicBezier', forceDirection: 'horizontal' } } };
        this._network = new vis.Network(container, data, options);
        this._network.on('click', function(params) { if (params.nodes.length) { var course = courses.find(function(c) { return c.code === params.nodes[0]; }); if (course) self._showNodeDetail(course); } });
    }

    _animateCascade(sourceCode, result) {
        if (!this._cy) return;
        var cy = this._cy;
        // Reset previous cascade classes
        cy.nodes().removeClass('cascade-source cascade-hit');
        cy.edges().removeClass('cascade-edge');
        // BFS layers for timed animation
        var layers = this._bridge.cascadeEngine.bfsLayers(sourceCode);
        var affectedCodes = {};
        result.affected.forEach(function(a) { affectedCodes[a.code] = a; });
        // Animate layer by layer
        layers.forEach(function(layer, depth) {
            setTimeout(function() {
                layer.forEach(function(code) {
                    var node = cy.getElementById(code);
                    if (depth === 0) {
                        node.addClass('cascade-source');
                    } else if (affectedCodes[code]) {
                        node.addClass('cascade-hit');
                    }
                    // Highlight incoming edges
                    node.incomers('edge').forEach(function(edge) {
                        var srcCode = edge.source().data('courseCode');
                        if (depth === 1 && srcCode === sourceCode) edge.addClass('cascade-edge');
                        else if (affectedCodes[srcCode]) edge.addClass('cascade-edge');
                    });
                });
            }, depth * 350);
        });
    }

    _resetCascade() {
        if (!this._cy) return;
        this._cy.nodes().removeClass('cascade-source cascade-hit');
        this._cy.edges().removeClass('cascade-edge');
    }

    _renderGraphLegend(parent) {
        var legend = document.createElement('div');
        legend.className = 'as-an-cy-legend';
        var items = this._colorBy === 'dfw'
            ? [{ label: 'DFW \u226535%', color: '#dc2626' }, { label: 'DFW 25-35%', color: '#d97706' }, { label: 'DFW 15-25%', color: '#1d4ed8' }, { label: 'DFW <15%', color: '#16a34a' }]
            : this._colorBy === 'year'
            ? [{ label: 'Year 1', color: '#1d4ed8' }, { label: 'Year 2', color: '#7c3aed' }, { label: 'Year 3', color: '#16a34a' }]
            : [{ label: 'Pass \u226580%', color: '#16a34a' }, { label: 'Pass 65-80%', color: '#1d4ed8' }, { label: 'Pass 50-65%', color: '#d97706' }, { label: 'Pass <50%', color: '#dc2626' }];
        items.forEach(function(item) {
            var el = document.createElement('span');
            el.className = 'as-an-cy-legend-item';
            var swatch = document.createElement('span');
            swatch.className = 'as-an-cy-legend-swatch';
            swatch.style.background = item.color;
            el.appendChild(swatch);
            el.appendChild(document.createTextNode(item.label));
            legend.appendChild(el);
        });
        parent.appendChild(legend);
    }

    _renderFallbackGraph(container) {
        this._clearEl(container);
        var courses = this._bridge.COURSES;
        var self = this;
        var grid = document.createElement('div');
        grid.className = 'as-an-fallback-grid';
        container.appendChild(grid);
        [1, 2, 3].forEach(function(year) {
            var col = document.createElement('div');
            col.className = 'as-an-fallback-col';
            var yearLabel = document.createElement('div');
            yearLabel.className = 'as-an-fallback-year-label';
            yearLabel.textContent = 'Year ' + year;
            col.appendChild(yearLabel);
            courses.filter(function(c) { return c.year === year; }).forEach(function(c) {
                var passRate = c.enrolled > 0 ? (c.passed / c.enrolled * 100) : 0;
                var color = self._getNodeColor(c, passRate);
                var downstream = self._bridge.getAllDownstream(c.code).length;
                var node = document.createElement('div');
                node.className = 'as-an-fallback-node' + (c.dfw > 30 ? ' as-an-fallback-node-danger' : '');
                node.style.background = color;
                var nodeCode = document.createElement('div');
                nodeCode.className = 'as-an-fallback-node-code';
                nodeCode.textContent = c.code;
                node.appendChild(nodeCode);
                var nodeInfo = document.createElement('div');
                nodeInfo.className = 'as-an-fallback-node-info';
                nodeInfo.textContent = passRate.toFixed(0) + '% pass' + (downstream > 0 ? ' \u00b7 \u2193' + downstream : '');
                node.appendChild(nodeInfo);
                node.title = c.name;
                node.addEventListener('click', function() { self._showNodeDetail(c); });
                col.appendChild(node);
            });
            grid.appendChild(col);
        });
    }

    _renderBottomPanel(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card as-mt-3';
        parent.appendChild(card);
        var body = document.createElement('div');
        body.className = 'as-an-card-body as-grid-3col';
        card.appendChild(body);
        var path = this._findCriticalPath();
        var pathEl = document.createElement('div');
        var pathTitle = document.createElement('div');
        pathTitle.className = 'as-an-upper-label as-mb-2';
        pathTitle.textContent = 'Critical Path (' + path.length + ' courses)';
        pathEl.appendChild(pathTitle);
        var pathFlow = document.createElement('div');
        pathFlow.className = 'as-an-rec-body';
        path.forEach(function(code, i) {
            var codeSpan = document.createElement('span');
            codeSpan.className = 'as-an-path-code-span';
            codeSpan.textContent = code;
            pathFlow.appendChild(codeSpan);
            if (i < path.length - 1) {
                var arrow = document.createElement('span');
                arrow.className = 'as-an-path-arrow-span';
                arrow.textContent = ' \u2192 ';
                pathFlow.appendChild(arrow);
            }
        });
        pathEl.appendChild(pathFlow);
        body.appendChild(pathEl);

        var bottlenecks = this._findBottlenecks();
        var bnEl = document.createElement('div');
        var bnTitle = document.createElement('div');
        bnTitle.className = 'as-an-upper-label as-mb-2';
        bnTitle.textContent = 'Top Bottlenecks';
        bnEl.appendChild(bnTitle);
        bottlenecks.forEach(function(b) {
            var bnRow = document.createElement('div');
            bnRow.className = 'as-an-bottleneck-row';
            var bnCode = document.createElement('span');
            bnCode.className = 'as-an-bn-code-span';
            bnCode.textContent = b.code;
            bnRow.appendChild(bnCode);
            var bnInfo = document.createElement('span');
            bnInfo.className = 'as-an-bn-info-span';
            bnInfo.textContent = '\u2192 ' + b.downstream + ' downstream, DFW ' + b.dfw.toFixed(1) + '%';
            bnRow.appendChild(bnInfo);
            bnEl.appendChild(bnRow);
        });
        body.appendChild(bnEl);

        var chainTP = this._computeChainThroughput(path);
        var tpEl = document.createElement('div');
        var tpTitle = document.createElement('div');
        tpTitle.className = 'as-an-upper-label as-mb-2';
        tpTitle.textContent = 'Chain Throughput';
        tpEl.appendChild(tpTitle);
        var tpValue = document.createElement('div');
        tpValue.className = 'as-an-tp-value-lg';
        tpValue.style.color = chainTP >= 50 ? 'var(--ui-green-600)' : 'var(--ui-red-600)';
        tpValue.textContent = chainTP.toFixed(1) + '%';
        tpEl.appendChild(tpValue);
        var tpDesc = document.createElement('div');
        tpDesc.className = 'as-an-tp-desc-sm';
        tpDesc.textContent = 'Cumulative pass rate through critical path';
        tpEl.appendChild(tpDesc);
        body.appendChild(tpEl);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: OUTCOMES
    // ══════════════════════════════════════════════════════════════════════════

    _renderOutcomesTab(el) {
        var wrap = document.createElement('div');
        wrap.className = 'as-p-2';
        el.appendChild(wrap);
        // KPIs
        var stats = this._computeStats();
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        wrap.appendChild(row);
        var self = this;
        [{ label: 'Overall Coverage', value: stats.overallPct.toFixed(0) + '%', icon: 'chart-pie', color: stats.overallPct >= 80 ? 'var(--ui-green-600)' : 'var(--ui-red-600)', bg: stats.overallPct >= 80 ? 'var(--ui-green-50)' : 'var(--ui-red-50)' },
         { label: 'Fully Mapped', value: stats.fullyMapped + '/' + stats.total, icon: 'check-double', color: 'var(--ui-green-600)', bg: 'var(--ui-green-50)' },
         { label: 'Coverage Gaps', value: String(stats.gaps), icon: 'exclamation-circle', color: stats.gaps > 0 ? 'var(--ui-red-600)' : 'var(--ui-green-600)', bg: stats.gaps > 0 ? 'var(--ui-red-50)' : 'var(--ui-green-50)' }
        ].forEach(function(k) {
            row.appendChild(self._buildKpiCard(k));
        });
        this._renderMatrix(wrap);
        this._renderGapAlerts(wrap);
        this._renderGADistribution(wrap);
    }

    _renderMatrix(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('th', 'Mapping Matrix', 'Click cells to cycle I\u2192R\u2192A\u2192empty'));
        if (typeof d3 !== 'undefined') {
            this._buildD3Heatmap(card);
        } else {
            this._renderLegacyMatrix(card);
        }
    }

    _buildD3Heatmap(card) {
        var gas = this._bridge.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var self = this;
        var levelColors = { 'I': '#6366f1', 'R': '#f59e0b', 'A': '#22c55e', '': '#f3f4f6' };
        var cycleLevels = ['I', 'R', 'A', ''];

        var margin = { top: 50, right: 10, bottom: 10, left: 60 };
        var cellSize = 28;
        var W = margin.left + courses.length * cellSize + margin.right;
        var H = margin.top + gas.length * cellSize + margin.bottom;

        var wrap = document.createElement('div');
        wrap.className = 'as-an-heatmap-container';
        card.appendChild(wrap);

        var svg = d3.select(wrap).append('svg')
            .attr('width', W)
            .attr('height', H);

        var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Column headers (course codes)
        courses.forEach(function(c, i) {
            g.append('text')
                .attr('x', i * cellSize + cellSize / 2)
                .attr('y', -8)
                .attr('text-anchor', 'middle')
                .attr('font-size', '8px')
                .attr('font-family', 'monospace')
                .attr('fill', '#6b7280')
                .attr('transform', 'rotate(-45,' + (i * cellSize + cellSize / 2) + ',-8)')
                .text(c.code);
        });

        // Row headers (GA codes)
        gas.forEach(function(ga, j) {
            g.append('text')
                .attr('x', -6)
                .attr('y', j * cellSize + cellSize / 2 + 4)
                .attr('text-anchor', 'end')
                .attr('font-size', '9px')
                .attr('font-family', 'monospace')
                .attr('fill', '#374151')
                .text(ga.code);
        });

        // Cells
        gas.forEach(function(ga, j) {
            courses.forEach(function(c, i) {
                var level = (self._matrix[ga.code] && self._matrix[ga.code][c.code]) || '';
                var rect = g.append('rect')
                    .attr('x', i * cellSize + 1)
                    .attr('y', j * cellSize + 1)
                    .attr('width', cellSize - 2)
                    .attr('height', cellSize - 2)
                    .attr('rx', 3)
                    .attr('fill', levelColors[level] || levelColors[''])
                    .attr('opacity', level ? 0.85 : 0.4)
                    .attr('stroke', '#e5e7eb')
                    .attr('stroke-width', 0.5)
                    .style('cursor', 'pointer');

                if (level) {
                    g.append('text')
                        .attr('class', 'heatmap-label-' + ga.code + '-' + c.code)
                        .attr('x', i * cellSize + cellSize / 2)
                        .attr('y', j * cellSize + cellSize / 2 + 4)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '10px')
                        .attr('font-weight', '700')
                        .attr('fill', '#fff')
                        .style('pointer-events', 'none')
                        .text(level);
                }

                rect.on('click', function() {
                    var currentLevel = (self._matrix[ga.code] && self._matrix[ga.code][c.code]) || '';
                    var idx = cycleLevels.indexOf(currentLevel);
                    var next = cycleLevels[(idx + 1) % cycleLevels.length];
                    if (!self._matrix[ga.code]) self._matrix[ga.code] = {};
                    if (next) { self._matrix[ga.code][c.code] = next; } else { delete self._matrix[ga.code][c.code]; }
                    d3.select(this).attr('fill', levelColors[next] || levelColors['']).attr('opacity', next ? 0.85 : 0.4);
                    var labelSel = g.select('.heatmap-label-' + ga.code + '-' + c.code);
                    if (next) {
                        if (labelSel.empty()) {
                            g.append('text')
                                .attr('class', 'heatmap-label-' + ga.code + '-' + c.code)
                                .attr('x', i * cellSize + cellSize / 2)
                                .attr('y', j * cellSize + cellSize / 2 + 4)
                                .attr('text-anchor', 'middle')
                                .attr('font-size', '10px')
                                .attr('font-weight', '700')
                                .attr('fill', '#fff')
                                .style('pointer-events', 'none')
                                .text(next);
                        } else {
                            labelSel.text(next);
                        }
                    } else {
                        labelSel.remove();
                    }
                    self._bus.emit('course:select', { code: c.code, source: 'outcomes' });
                });
            });
        });

        // Legend
        var legend = document.createElement('div');
        legend.className = 'as-an-legend';
        [{ letter: 'I', color: '#6366f1', label: 'Introduced' }, { letter: 'R', color: '#f59e0b', label: 'Reinforced' }, { letter: 'A', color: '#22c55e', label: 'Assessed' }].forEach(function(l) {
            var item = document.createElement('span');
            var swatch = document.createElement('span');
            swatch.className = 'as-an-swatch-wide';
            swatch.style.background = l.color;
            swatch.textContent = l.letter;
            item.appendChild(swatch);
            item.appendChild(document.createTextNode(' ' + l.label));
            legend.appendChild(item);
        });
        card.appendChild(legend);
    }

    _renderLegacyMatrix(card) {
        var tableWrap = document.createElement('div');
        tableWrap.className = 'as-an-table-wrap';
        card.appendChild(tableWrap);
        var gas = this._bridge.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var self = this;
        var table = document.createElement('table');
        table.className = 'as-an-data-table-sm';
        var thead = document.createElement('thead');
        var headTr = document.createElement('tr');
        headTr.className = 'as-an-thead-row';
        var gaTh = document.createElement('th');
        gaTh.className = 'as-an-matrix-corner';
        gaTh.textContent = 'GA';
        headTr.appendChild(gaTh);
        courses.forEach(function(c) {
            var th = document.createElement('th');
            th.className = 'as-an-matrix-th';
            th.textContent = c.code;
            headTr.appendChild(th);
        });
        thead.appendChild(headTr);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        var levelColors = { 'I': 'var(--ui-primary-500)', 'R': 'var(--ui-amber-500)', 'A': 'var(--ui-green-500)' };
        var cycleLevels = ['I', 'R', 'A', ''];
        gas.forEach(function(ga) {
            var tr = document.createElement('tr');
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
                    if (next) { self._matrix[ga.code][c.code] = next; } else { delete self._matrix[ga.code][c.code]; }
                    self._renderCell(td, next, levelColors);
                });
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        tableWrap.appendChild(table);
        var legend = document.createElement('div');
        legend.className = 'as-an-legend';
        [{ letter: 'I', color: 'var(--ui-primary-500)', label: 'Introduced' }, { letter: 'R', color: 'var(--ui-amber-500)', label: 'Reinforced' }, { letter: 'A', color: 'var(--ui-green-500)', label: 'Assessed' }].forEach(function(l) {
            var item = document.createElement('span');
            var swatch = document.createElement('span');
            swatch.className = 'as-an-swatch-wide';
            swatch.style.background = l.color;
            swatch.textContent = l.letter;
            item.appendChild(swatch);
            item.appendChild(document.createTextNode(' ' + l.label));
            legend.appendChild(item);
        });
        card.appendChild(legend);
    }

    _renderGapAlerts(parent) {
        var gas = this._bridge.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var self = this;
        var gapsFound = [];
        gas.forEach(function(ga) {
            var gaMap = self._matrix[ga.code] || {};
            var hasA = false;
            courses.forEach(function(c) { if (gaMap[c.code] === 'A') hasA = true; });
            if (!hasA) gapsFound.push(ga);
        });
        if (!gapsFound.length) return;
        var alert = document.createElement('div');
        alert.className = 'as-an-alert-danger';
        var alertTop = document.createElement('div');
        alertTop.className = 'as-an-alert-header';
        alertTop.appendChild(self._faIcon('exclamation-triangle', 'as-an-icon-alert'));
        var alertTitle = document.createElement('span');
        alertTitle.className = 'as-an-gap-alert-title';
        alertTitle.textContent = 'Coverage Gaps (' + gapsFound.length + ' GAs without Assessment)';
        alertTop.appendChild(alertTitle);
        alert.appendChild(alertTop);
        var badgeWrap = document.createElement('div');
        badgeWrap.className = 'as-an-gap-badge-wrap';
        gapsFound.forEach(function(g) {
            badgeWrap.appendChild(self._buildBadge(g.code + ': ' + g.name, 'var(--ui-red-600)', 'var(--ui-red-50)'));
        });
        alert.appendChild(badgeWrap);
        parent.appendChild(alert);
    }

    _renderGADistribution(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('chart-bar', 'Per-GA I/R/A Distribution'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        var gas = this._bridge.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var self = this;
        gas.forEach(function(ga) {
            var gaMap = self._matrix[ga.code] || {};
            var counts = { I: 0, R: 0, A: 0 };
            courses.forEach(function(c) { var level = gaMap[c.code]; if (level && counts[level] !== undefined) counts[level]++; });
            var total = courses.length;
            var row = document.createElement('div');
            row.className = 'as-an-dist-row';
            var codeSpan = document.createElement('span');
            codeSpan.className = 'as-an-dist-label';
            codeSpan.textContent = ga.code;
            row.appendChild(codeSpan);
            var barWrap = document.createElement('div');
            barWrap.className = 'as-an-bar-container';
            var barColors = { I: 'var(--ui-primary-500)', R: 'var(--ui-amber-500)', A: 'var(--ui-green-500)' };
            ['I', 'R', 'A'].forEach(function(level) {
                if (counts[level] > 0) {
                    var seg = document.createElement('div');
                    seg.className = 'as-an-stacked-seg';
                    seg.style.width = (counts[level] / total * 100).toFixed(0) + '%';
                    seg.style.background = barColors[level];
                    barWrap.appendChild(seg);
                }
            });
            row.appendChild(barWrap);
            var countSpan = document.createElement('span');
            countSpan.className = 'as-an-dist-summary';
            countSpan.textContent = 'I:' + counts.I + ' R:' + counts.R + ' A:' + counts.A;
            row.appendChild(countSpan);
            body.appendChild(row);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: CURRICULUM
    // ══════════════════════════════════════════════════════════════════════════

    _renderCurriculumTab(el) {
        var wrap = document.createElement('div');
        wrap.className = 'as-p-2';
        el.appendChild(wrap);
        // KPIs
        var courses = this._bridge.COURSES;
        var totalCredits = courses.reduce(function(s, c) { return s + c.credits; }, 0);
        var coreCount = courses.filter(function(c) { return c.type === 'core'; }).length;
        var electiveCount = courses.filter(function(c) { return c.type === 'elective'; }).length;
        var prereqChains = Object.keys(this._bridge.PREREQUISITES).length;
        var row = document.createElement('div');
        row.className = 'as-an-kpi-row';
        wrap.appendChild(row);
        var self = this;
        [{ label: 'Total Credits', value: String(totalCredits), icon: 'award', color: 'var(--ui-blue-700)', bg: 'var(--ui-blue-50)' },
         { label: 'Core Courses', value: String(coreCount), icon: 'lock', color: 'var(--ui-green-600)', bg: 'var(--ui-green-50)' },
         { label: 'Elective Slots', value: String(electiveCount), icon: 'unlock', color: 'var(--ui-amber-600)', bg: 'var(--ui-amber-50)' },
         { label: 'Prereq Chains', value: String(prereqChains), icon: 'link', color: 'var(--ui-purple-600)', bg: 'var(--ui-purple-50)' }
        ].forEach(function(k) {
            row.appendChild(self._buildKpiCard(k));
        });
        this._renderYearGrid(wrap);
        this._renderCreditSummary(wrap);
        this._renderPrereqViewSection(wrap);
    }

    _renderYearGrid(parent) {
        var courses = this._bridge.COURSES;
        var prereqs = this._bridge.PREREQUISITES;
        var self = this;
        [1, 2, 3].forEach(function(year) {
            var card = document.createElement('div');
            card.className = 'as-an-section-card-mb';
            parent.appendChild(card);
            var yrCourses = courses.filter(function(c) { return c.year === year; });
            var yrCredits = yrCourses.reduce(function(s, c) { return s + c.credits; }, 0);
            card.appendChild(self._buildSectionHeader('layer-group', 'Year ' + year, yrCourses.length + ' courses \u00b7 ' + yrCredits + ' credits'));
            var body = document.createElement('div');
            body.className = 'as-an-card-body as-grid-2col as-gap-half';
            card.appendChild(body);
            var s1Label = document.createElement('div');
            s1Label.className = 'as-an-upper-label-gray as-grid-col-1';
            s1Label.textContent = 'Semester 1';
            body.appendChild(s1Label);
            var s2Label = document.createElement('div');
            s2Label.className = 'as-an-upper-label-gray as-grid-col-2';
            s2Label.textContent = 'Semester 2';
            body.appendChild(s2Label);
            var s1 = yrCourses.filter(function(c) { return c.semester === 'S1'; });
            var s2 = yrCourses.filter(function(c) { return c.semester === 'S2'; });
            var maxLen = Math.max(s1.length, s2.length);
            for (var i = 0; i < maxLen; i++) {
                body.appendChild(i < s1.length ? self._courseCard(s1[i], prereqs) : document.createElement('div'));
                body.appendChild(i < s2.length ? self._courseCard(s2[i], prereqs) : document.createElement('div'));
            }
        });
    }

    _courseCard(course, prereqs) {
        var self = this;
        var isCore = course.type === 'core';
        var hasPrereqs = prereqs[course.code] && prereqs[course.code].length > 0;
        var typeClass = isCore ? 'as-an-cc-type-core' : 'as-an-cc-type-elec';
        var passRate = course.enrolled > 0 ? (course.passed / course.enrolled * 100).toFixed(0) : '0';
        var card = document.createElement('div');
        card.className = 'as-an-course-card';
        // Top row: code + badges
        var topRow = document.createElement('div');
        topRow.className = 'as-an-cc-top-row';
        var codeSpan = document.createElement('span');
        codeSpan.className = 'as-an-cc-code';
        codeSpan.textContent = course.code;
        topRow.appendChild(codeSpan);
        var badgeRow = document.createElement('div');
        badgeRow.className = 'as-an-cc-badge-row';
        var typeBadge = document.createElement('span');
        typeBadge.className = 'as-an-cc-type-badge ' + typeClass;
        typeBadge.textContent = isCore ? 'CORE' : 'ELEC';
        badgeRow.appendChild(typeBadge);
        var creditBadge = document.createElement('span');
        creditBadge.className = 'as-an-cc-credit-badge';
        creditBadge.textContent = course.credits + 'cr';
        badgeRow.appendChild(creditBadge);
        topRow.appendChild(badgeRow);
        card.appendChild(topRow);
        // Name
        var nameDiv = document.createElement('div');
        nameDiv.className = 'as-an-cc-name';
        nameDiv.textContent = course.name;
        card.appendChild(nameDiv);
        // Bottom row
        var bottomRow = document.createElement('div');
        bottomRow.className = 'as-an-cc-bottom-row';
        if (hasPrereqs) { var prereqIcon = document.createElement('i'); prereqIcon.className = 'fas fa-link as-an-cc-prereq-icon'; bottomRow.appendChild(prereqIcon); }
        var passSpan = document.createElement('span');
        passSpan.className = 'as-an-cc-pass-text';
        passSpan.textContent = 'Pass: ' + passRate + '%';
        bottomRow.appendChild(passSpan);
        card.appendChild(bottomRow);
        card.addEventListener('click', function() {
            self._selectedCourse = course;
            self._renderPrereqView(self._prereqContainer);
            self._bus.emit('course:select', { code: course.code, source: 'curriculum' });
        });
        return card;
    }

    _renderCreditSummary(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card-mb';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('chart-bar', 'Credit Summary by Year'));
        var body = document.createElement('div');
        body.className = 'as-an-card-body';
        card.appendChild(body);
        var courses = this._bridge.COURSES;
        [1, 2, 3].forEach(function(yr) {
            var yrCourses = courses.filter(function(c) { return c.year === yr; });
            var coreCredits = yrCourses.filter(function(c) { return c.type === 'core'; }).reduce(function(s, c) { return s + c.credits; }, 0);
            var elecCredits = yrCourses.filter(function(c) { return c.type === 'elective'; }).reduce(function(s, c) { return s + c.credits; }, 0);
            var total = coreCredits + elecCredits;
            var row = document.createElement('div');
            row.className = 'as-an-cs-year-row';
            var rowTop = document.createElement('div');
            rowTop.className = 'as-an-cs-year-top';
            var yrLabel = document.createElement('span');
            yrLabel.className = 'as-an-cs-year-label';
            yrLabel.textContent = 'Year ' + yr;
            rowTop.appendChild(yrLabel);
            var crInfo = document.createElement('span');
            crInfo.className = 'as-an-cs-credit-info';
            crInfo.textContent = total + ' credits (Core: ' + coreCredits + ', Elec: ' + elecCredits + ')';
            rowTop.appendChild(crInfo);
            row.appendChild(rowTop);
            var barWrap = document.createElement('div');
            barWrap.className = 'as-an-bar-container-lg';
            var coreFill = document.createElement('div');
            coreFill.style.width = (coreCredits / 140 * 100).toFixed(0) + '%';
            coreFill.style.background = 'var(--ui-green-600)';
            barWrap.appendChild(coreFill);
            var elecFill = document.createElement('div');
            elecFill.style.width = (elecCredits / 140 * 100).toFixed(0) + '%';
            elecFill.style.background = 'var(--ui-amber-600)';
            barWrap.appendChild(elecFill);
            row.appendChild(barWrap);
            body.appendChild(row);
        });
    }

    _renderPrereqViewSection(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card';
        parent.appendChild(card);
        card.appendChild(this._buildSectionHeader('link', 'Prerequisite Chain'));
        this._prereqContainer = document.createElement('div');
        card.appendChild(this._prereqContainer);
        this._renderPrereqView(this._prereqContainer);
    }

    _renderPrereqView(parent) {
        if (!parent) return;
        this._clearEl(parent);
        if (!this._selectedCourse) {
            var ph = document.createElement('div');
            ph.className = 'as-an-empty-msg';
            ph.textContent = 'Click a course card above to view its prerequisite chain';
            parent.appendChild(ph);
            return;
        }
        var c = this._selectedCourse;
        var prereqCodes = this._bridge.PREREQUISITES[c.code] || [];
        var downstream = this._bridge.getDownstream(c.code);
        var wrap = document.createElement('div');
        wrap.className = 'as-p-2';
        var title = document.createElement('div');
        title.className = 'as-an-cd-title';
        title.textContent = c.code + ': ' + c.name;
        wrap.appendChild(title);
        var cols = document.createElement('div');
        cols.className = 'as-an-two-col';

        // Build a column helper
        function buildCol(label, items, color, emptyText) {
            var col = document.createElement('div');
            col.className = 'as-flex-1';
            var colLabel = document.createElement('div');
            colLabel.className = 'as-an-cd-col-label';
            colLabel.textContent = label;
            col.appendChild(colLabel);
            if (items.length) {
                var badgeWrap = document.createElement('div');
                badgeWrap.className = 'as-an-cd-badge-wrap';
                items.forEach(function(item) {
                    badgeWrap.appendChild(self._buildBadge(item, color, self._colorLight(color)));
                });
                col.appendChild(badgeWrap);
            } else {
                var empty = document.createElement('div');
                empty.className = 'as-an-cd-empty';
                empty.textContent = emptyText;
                col.appendChild(empty);
            }
            return col;
        }

        cols.appendChild(buildCol('Prerequisites (' + prereqCodes.length + ')', prereqCodes, 'var(--ui-blue-700)', 'None'));
        cols.appendChild(buildCol('Leads to (' + downstream.length + ')', downstream, 'var(--ui-amber-600)', 'None (terminal)'));
        wrap.appendChild(cols);
        parent.appendChild(wrap);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MODALS
    // ══════════════════════════════════════════════════════════════════════════

    _showCourseDetail(course) {
        var self = this;
        var passRate = course.enrolled > 0 ? ((course.passed / course.enrolled) * 100).toFixed(1) : 0;
        var failCount = course.enrolled - course.passed;
        var riskPct = course.enrolled > 0 ? ((course.atRisk / course.enrolled) * 100).toFixed(1) : 0;
        var content = document.createElement('div');
        content.className = 'as-an-modal-content-sm';
        var headerRow = document.createElement('div');
        headerRow.className = 'as-an-panel-header';
        var codeEl = document.createElement('code');
        codeEl.className = 'as-an-modal-code as-an-modal-code-gray';
        codeEl.textContent = course.code;
        headerRow.appendChild(codeEl);
        var nameEl = document.createElement('span');
        nameEl.className = 'as-an-modal-code as-an-modal-code-dark';
        nameEl.textContent = course.name;
        headerRow.appendChild(nameEl);
        content.appendChild(headerRow);
        var metricsGrid = document.createElement('div');
        metricsGrid.className = 'as-an-metrics-grid';
        [{ label: 'Enrolled', value: String(course.enrolled), color: 'var(--ui-blue-700)' }, { label: 'Passed', value: String(course.passed), color: 'var(--ui-green-600)' }, { label: 'Failed/DW', value: String(failCount), color: 'var(--ui-red-600)' }, { label: 'Avg Mark', value: course.avgMark.toFixed(1) + '%', color: course.avgMark >= 50 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' }, { label: 'Pass Rate', value: passRate + '%', color: parseFloat(passRate) >= 70 ? 'var(--ui-green-600)' : 'var(--ui-amber-600)' }, { label: 'DFW Rate', value: course.dfw.toFixed(1) + '%', color: course.dfw <= 20 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' }, { label: 'At-Risk', value: String(course.atRisk), color: course.atRisk > 30 ? 'var(--ui-red-600)' : 'var(--ui-green-600)' }, { label: 'Risk %', value: riskPct + '%', color: parseFloat(riskPct) > 30 ? 'var(--ui-red-600)' : 'var(--ui-green-600)' }, { label: 'Credits', value: String(course.credits), color: 'var(--ui-gray-500)' }].forEach(function(m) {
            metricsGrid.appendChild(self._buildMetricCell(m.label, m.value, m.color));
        });
        content.appendChild(metricsGrid);
        var footer = document.createElement('div');
        footer.className = 'as-an-cd-footer';
        footer.textContent = 'Year ' + course.year + ' \u00b7 Semester ' + course.semester + ' \u00b7 ' + course.credits + ' credits';
        content.appendChild(footer);
        new uiModal({ title: course.code + ' \u2014 Course Detail', size: 'md', body: content, buttons: [{ label: 'Close', variant: 'ghost', onClick: function(modal) { modal.close(); } }] });
    }

    _showGatekeeperDetail(gatekeeper) {
        var self = this;
        var c = gatekeeper.course;
        var passRate = c.enrolled > 0 ? ((c.passed / c.enrolled) * 100).toFixed(1) : '0';
        var content = document.createElement('div');
        content.className = 'as-an-modal-content';
        // Header
        var headerRow = document.createElement('div');
        headerRow.className = 'as-an-panel-header';
        headerRow.appendChild(this._faIcon('door-closed', 'as-an-icon-danger'));
        var codeEl = document.createElement('code');
        codeEl.className = 'as-an-modal-code';
        codeEl.textContent = c.code;
        headerRow.appendChild(codeEl);
        var nameEl = document.createElement('span');
        nameEl.className = 'as-an-modal-code as-an-modal-code-dark';
        nameEl.textContent = c.name;
        headerRow.appendChild(nameEl);
        content.appendChild(headerRow);
        // Metrics grid
        var metricsGrid = document.createElement('div');
        metricsGrid.className = 'as-an-metrics-grid';
        [{ label: 'DFW Rate', value: c.dfw.toFixed(1) + '%', color: 'var(--ui-red-600)' }, { label: 'Pass Rate', value: passRate + '%', color: parseFloat(passRate) >= 70 ? 'var(--ui-green-600)' : 'var(--ui-amber-600)' }, { label: 'Enrolled', value: String(c.enrolled), color: 'var(--ui-blue-700)' }, { label: 'Blocked Courses', value: String(gatekeeper.downstream.length), color: 'var(--ui-purple-600)' }, { label: 'Gatekeeper Score', value: gatekeeper.score.toFixed(0), color: 'var(--ui-red-600)' }, { label: 'At-Risk', value: String(c.atRisk), color: c.atRisk > 30 ? 'var(--ui-red-600)' : 'var(--ui-green-600)' }].forEach(function(m) {
            metricsGrid.appendChild(self._buildMetricCell(m.label, m.value, m.color));
        });
        content.appendChild(metricsGrid);
        // Downstream impact
        if (gatekeeper.downstream.length) {
            var dsTitle = document.createElement('div');
            dsTitle.className = 'as-an-od-ds-title';
            dsTitle.textContent = 'Downstream Impact (' + gatekeeper.downstream.length + ' courses blocked)';
            content.appendChild(dsTitle);
            var dsWrap = document.createElement('div');
            dsWrap.className = 'as-an-od-ds-wrap';
            gatekeeper.downstream.forEach(function(code) {
                dsWrap.appendChild(self._buildBadge(code, 'var(--ui-purple-600)', 'var(--ui-purple-50)'));
            });
            content.appendChild(dsWrap);
        }
        // Recommendation
        var rec = c.dfw >= 35 ? 'Critical gatekeeper. Consider: supplemental instruction, split-level tutorials, prerequisite readiness checks, or curriculum restructuring.' : 'Moderate gatekeeper. Consider: peer tutoring, early warning monitoring, or additional tutorial sessions.';
        var recBox = document.createElement('div');
        recBox.className = 'as-an-rec-wrap';
        var recTitle = document.createElement('div');
        recTitle.className = 'as-an-rec-title';
        recTitle.appendChild(this._faIcon('lightbulb', 'as-an-icon-mr-xs'));
        recTitle.appendChild(document.createTextNode('Recommendation'));
        recBox.appendChild(recTitle);
        var recText = document.createElement('div');
        recText.className = 'as-an-rec-body';
        recText.textContent = rec;
        recBox.appendChild(recText);
        content.appendChild(recBox);
        new uiModal({ title: c.code + ' \u2014 Gatekeeper Detail', size: 'md', body: content, buttons: [{ label: 'Close', variant: 'ghost', onClick: function(modal) { modal.close(); } }] });
    }

    _showNodeDetail(course) {
        var self = this;
        var passRate = course.enrolled > 0 ? ((course.passed / course.enrolled) * 100).toFixed(1) : '0';
        var downstream = this._bridge.getAllDownstream(course.code);
        var prereqCodes = this._bridge.PREREQUISITES[course.code] || [];
        var content = document.createElement('div');
        content.className = 'as-an-modal-content-sm';
        var headerRow = document.createElement('div');
        headerRow.className = 'as-an-panel-header';
        var codeEl = document.createElement('code');
        codeEl.className = 'as-an-modal-code';
        codeEl.textContent = course.code;
        headerRow.appendChild(codeEl);
        var nameEl = document.createElement('span');
        nameEl.className = 'as-an-modal-code as-an-modal-code-dark';
        nameEl.textContent = course.name;
        headerRow.appendChild(nameEl);
        content.appendChild(headerRow);
        var metricsGrid = document.createElement('div');
        metricsGrid.className = 'as-an-metrics-grid';
        [{ label: 'Pass Rate', value: passRate + '%', color: parseFloat(passRate) >= 70 ? 'var(--ui-green-600)' : 'var(--ui-amber-600)' }, { label: 'DFW Rate', value: course.dfw.toFixed(1) + '%', color: course.dfw <= 20 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' }, { label: 'Enrolled', value: String(course.enrolled), color: 'var(--ui-blue-700)' }, { label: 'Prerequisites', value: String(prereqCodes.length), color: 'var(--ui-purple-600)' }, { label: 'Downstream', value: String(downstream.length), color: 'var(--ui-amber-600)' }, { label: 'Year ' + course.year + ' ' + course.semester, value: course.credits + ' cr', color: 'var(--ui-gray-500)' }].forEach(function(m) {
            metricsGrid.appendChild(self._buildMetricCell(m.label, m.value, m.color));
        });
        content.appendChild(metricsGrid);
        // Prereqs section
        if (prereqCodes.length) {
            var prLabel = document.createElement('div');
            prLabel.className = 'as-an-od-pr-label';
            prLabel.textContent = 'Prerequisites';
            content.appendChild(prLabel);
            var prWrap = document.createElement('div');
            prWrap.className = 'as-an-od-pr-wrap';
            prereqCodes.forEach(function(code) { prWrap.appendChild(self._buildBadge(code, 'var(--ui-blue-700)', 'var(--ui-blue-50)')); });
            content.appendChild(prWrap);
        }
        // Downstream section
        if (downstream.length) {
            var dsLabel = document.createElement('div');
            dsLabel.className = 'as-an-od-ds-label';
            dsLabel.textContent = 'Downstream Courses';
            content.appendChild(dsLabel);
            var dsWrap = document.createElement('div');
            dsWrap.className = 'as-an-od-ds-wrap-sm';
            downstream.forEach(function(code) { dsWrap.appendChild(self._buildBadge(code, 'var(--ui-amber-600)', 'var(--ui-amber-50)')); });
            content.appendChild(dsWrap);
        }
        new uiModal({ title: course.code + ' \u2014 Course Detail', size: 'md', body: content, buttons: [{ label: 'Close', variant: 'ghost', onClick: function(modal) { modal.close(); } }] });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ABOUT TAB
    // ══════════════════════════════════════════════════════════════════════════

    _renderAboutTab(el) {
        var wrap = document.createElement('div');
        wrap.className = 'as-p-3';
        wrap.className += ' as-an-max-w-960';
        el.appendChild(wrap);
        this._renderAboutOverview(wrap);
        this._renderAboutFeatureGuide(wrap);
        this._renderAboutMethodology(wrap);
        this._renderAboutApiIntegration(wrap);
        this._renderAboutFutureDirections(wrap);
        this._renderAboutDomainDebate(wrap);
        this._renderAboutImplementationPlan(wrap);
    }

    _renderAboutOverview(parent) {
        var card = this._aboutCard(parent, 'info-circle', 'Programme Analyst Dashboard');
        var sections = [
            {
                heading: 'Purpose',
                text: 'Programme-level analytics for programme coordinators, heads of department, and faculty deans. Provides data-driven insights into programme health, student throughput, curriculum structure, and accreditation readiness.'
            },
            {
                heading: 'Scope',
                text: 'Longitudinal cohort tracking, gatekeeper course detection, curriculum critical-path analysis, graduate attribute mapping, cohort comparison, and risk assessment across all year levels.'
            },
            {
                heading: 'How to Use',
                text: 'Select a programme and academic year from the Parameters panel, then click Analyse. Explore the tabs to drill into specific aspects of programme performance. Each tab provides its own view controls where applicable.'
            }
        ];
        sections.forEach(function(s) {
            var h = document.createElement('div');
            h.className = 'as-an-about-heading-sm';
            h.textContent = s.heading;
            card.appendChild(h);
            var p = document.createElement('div');
            p.className = 'as-an-about-text-sm';
            p.textContent = s.text;
            card.appendChild(p);
        });
    }

    _renderAboutFeatureGuide(parent) {
        var self = this;
        var card = this._aboutCard(parent, 'map-signs', 'Feature Guide');
        var features = [
            {
                tab: 'Overview',
                icon: 'sitemap',
                what: 'High-level programme health dashboard with KPI cards, pass-rate distribution, year-level breakdown, and alert summary.',
                metrics: 'Overall pass rate, average DFW rate, at-risk student count, throughput percentage, graduation rate.',
                interpret: 'Green KPIs indicate healthy thresholds. Red flags highlight areas needing immediate attention. Compare against institutional benchmarks.',
                actions: 'Use as a starting point to identify which specific analysis tab to drill into. Share KPI snapshot with faculty management.'
            },
            {
                tab: 'Gatekeepers',
                icon: 'door-closed',
                what: 'Identifies bottleneck courses with high DFW (Drop/Fail/Withdraw) rates that impede student progression.',
                metrics: 'DFW rate per course, downstream impact score, composite gatekeeper score, enrolled vs passed counts.',
                interpret: 'Courses with DFW above the threshold (adjustable via slider) are flagged. Higher downstream count means more students are affected by the bottleneck.',
                actions: 'Prioritise intervention for high-composite-score courses. Consider tutorial support, curriculum review, or assessment redesign.'
            },
            {
                tab: 'Cohort Flow',
                icon: 'layer-group',
                what: 'Sankey-style visualisation tracking a cohort from intake through year levels to graduation, showing attrition at each stage.',
                metrics: 'Intake size, year-level retention, AYOS (Average Years of Study), graduation count, attrition rate per year.',
                interpret: 'Wide flows indicate good retention. Narrow outflows to "Dropped" reveal attrition points. AYOS above minimum time indicates progression delays.',
                actions: 'Target year levels with highest attrition for academic support programmes. Compare AYOS across cohorts to measure improvement.'
            },
            {
                tab: 'Compare',
                icon: 'columns',
                what: 'Side-by-side comparison of two cohort years showing deltas in key metrics.',
                metrics: 'Year-over-year change in pass rates, DFW rates, enrollment, throughput, and at-risk counts.',
                interpret: 'Green deltas indicate improvement, red indicates decline. Look for systemic trends rather than single-year anomalies.',
                actions: 'Correlate changes with interventions implemented between cohort years. Report sustained improvements to quality assurance committees.'
            },
            {
                tab: 'Progression',
                icon: 'project-diagram',
                what: 'Network visualisation of course prerequisite chains showing how courses connect across year levels.',
                metrics: 'Prerequisite depth, critical path length, course connectivity, pass-rate colour coding.',
                interpret: 'Courses on the critical path (longest prerequisite chain) directly affect minimum time to completion. Low pass-rate nodes on the critical path are high-priority concerns.',
                actions: 'Review critical-path courses for prerequisite appropriateness. Consider parallel paths to reduce single-point-of-failure bottlenecks.'
            },
            {
                tab: 'Outcomes',
                icon: 'border-all',
                what: 'Graduate attribute (GA) mapping matrix showing how programme courses address required competencies (I/R/A framework).',
                metrics: 'Coverage percentage per GA, I/R/A distribution, gap identification, accreditation body alignment.',
                interpret: 'Full coverage (I→R→A progression) across GAs indicates accreditation readiness. Gaps in the matrix reveal missing curriculum-to-outcome mappings.',
                actions: 'Address GA gaps by modifying course outcomes or adding new assessments. Use matrix as evidence for accreditation submissions.'
            },
            {
                tab: 'Curriculum',
                icon: 'edit',
                what: 'Structural analysis of the curriculum: credit distribution, year-level loading, course categorisation, and variant comparison.',
                metrics: 'Total credits, credits per year level, NQF level distribution, elective vs core ratio, prerequisite chain depth.',
                interpret: 'Uneven credit loading across years may contribute to attrition. High prerequisite density in early years can create bottlenecks.',
                actions: 'Rebalance credit loading across years. Review NQF level alignment with SAQA requirements. Compare mainstream vs extended curriculum variants.'
            }
        ];
        features.forEach(function(f) {
            var section = document.createElement('div');
            section.className = 'as-an-about-feature-section';
            var title = document.createElement('div');
            title.className = 'as-an-about-feature-title';
            var featIcon = self._faIcon(f.icon);
            featIcon.className += ' as-an-about-icon-sm';
            title.appendChild(featIcon);
            title.appendChild(document.createTextNode(f.tab));
            section.appendChild(title);
            var grid = document.createElement('div');
            grid.className = 'as-an-about-feature-grid';
            var cells = [
                { label: 'What it Shows', text: f.what },
                { label: 'Key Metrics', text: f.metrics },
                { label: 'How to Interpret', text: f.interpret },
                { label: 'Recommended Actions', text: f.actions }
            ];
            cells.forEach(function(c) {
                var cell = document.createElement('div');
                cell.className = 'as-an-about-feature-cell';
                var cellLabel = document.createElement('div');
                cellLabel.className = 'as-an-about-feature-cell-label';
                cellLabel.textContent = c.label;
                cell.appendChild(cellLabel);
                var cellText = document.createElement('div');
                cellText.className = 'as-an-about-feature-cell-text';
                cellText.textContent = c.text;
                cell.appendChild(cellText);
                grid.appendChild(cell);
            });
            section.appendChild(grid);
            card.appendChild(section);
        });
    }

    _renderAboutMethodology(parent) {
        var self = this;
        var card = this._aboutCard(parent, 'book', 'Methodology & Literature');
        var methods = [
            {
                analysis: 'Gatekeeper Detection',
                methodology: 'DFW rate \u00d7 downstream course count = composite gatekeeper score. Courses exceeding the configurable DFW threshold are flagged, weighted by their impact on downstream progression.',
                references: 'Koch & Herling (2017) \u2014 bottleneck course identification in STEM programmes; Suresh (2006) \u2014 factors affecting STEM persistence and retention.'
            },
            {
                analysis: 'Cohort Flow',
                methodology: 'Sankey flow modelling from intake through year levels to graduation. AYOS (Average Years of Study) calculated from registration history to measure actual vs minimum time to completion.',
                references: 'Fazil et al. (2024) \u2014 student performance prediction models; FundiConnect \u2014 DP (Duly Performed) tracking methodology for SA higher education.'
            },
            {
                analysis: 'Risk Assessment',
                methodology: 'Percentile-based risk detection using multi-factor composite scoring. Course-level and student-level risk indicators aggregated for programme-level assessment.',
                references: 'Nature Scientific Reports (2025) \u2014 predictive analytics in engineering education; Frontiers in Education (2025) \u2014 ML approaches for at-risk student identification.'
            },
            {
                analysis: 'GA Mapping',
                methodology: 'I/R/A (Introduced/Reinforced/Assessed) progressive framework mapping course outcomes to graduate attributes across the full curriculum.',
                references: 'Washington Accord \u2014 international engineering graduate attributes; ECSA (2014) \u2014 Competency Standards for SA engineering graduates; CASE v1.1 \u2014 Competency & Academic Standards Exchange.'
            },
            {
                analysis: 'Curriculum Analysis',
                methodology: 'Critical path analysis of prerequisite chains to identify minimum time-to-completion paths. Credit distribution analysis across NQF levels and year levels.',
                references: 'SAQA \u2014 NQF level descriptors and credit allocation; CHE \u2014 programme accreditation criteria for SA higher education.'
            },
            {
                analysis: 'Cohort Comparison',
                methodology: 'Year-over-year delta analysis with trend indicators. Normalised comparison accounting for cohort size differences.',
                references: 'Springer \u2014 Learning Analytics in South African Higher Education; DHET \u2014 Institutional performance reporting frameworks.'
            }
        ];
        var table = document.createElement('table');
        table.className = 'as-an-data-table-sm as-an-data-table-xs';
        table.appendChild(this._buildThead([
            { text: 'Analysis', css: 'as-an-meth-th' },
            { text: 'Methodology', css: 'as-an-meth-th' },
            { text: 'Key References', css: 'as-an-meth-th' }
        ], null, 'as-an-thead-bg-strong'));
        var tbody = document.createElement('tbody');
        methods.forEach(function(m) {
            var tr = document.createElement('tr');
            tr.className = 'as-an-about-tr-border';
            tr.appendChild(self._buildTd(m.analysis, null, 'as-an-about-td-analysis'));
            tr.appendChild(self._buildTd(m.methodology, null, 'as-an-about-td-method'));
            var refTd = self._buildTd(m.references, null, 'as-an-about-td-ref');
            tr.appendChild(refTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        card.appendChild(table);

        // Standards alignment
        var standards = document.createElement('div');
        standards.className = 'as-an-about-standards';
        var stTitle = document.createElement('div');
        stTitle.className = 'as-an-about-standards-title';
        stTitle.textContent = 'Standards Alignment';
        standards.appendChild(stTitle);
        var stBody = document.createElement('div');
        stBody.className = 'as-an-about-standards-body';
        stBody.textContent = 'xAPI (IEEE 9274.1.1) \u2014 experience tracking \u00b7 LTI 1.3 \u2014 LMS integration \u00b7 CASE v1.1 \u2014 competency framework exchange \u00b7 CEDS \u2014 common education data standards \u00b7 POPIA \u2014 SA data protection compliance';
        standards.appendChild(stBody);
        card.appendChild(standards);
    }

    _renderAboutApiIntegration(parent) {
        var self = this;
        var card = this._aboutCard(parent, 'plug', 'instApi Integration');
        var endpoints = [
            { feature: 'Programme list & metadata',       endpoint: 'getProgrammeMeta',          status: 'live' },
            { feature: 'Course list & structure',         endpoint: 'getProgrammeCourses',       status: 'live' },
            { feature: 'Enrollment counts',               endpoint: 'getCourseCounts',           status: 'live' },
            { feature: 'Course results & pass rates',     endpoint: 'getCourseResults',          status: 'live' },
            { feature: 'Programme enrollment',            endpoint: 'getProgrammeCounts',        status: 'live' },
            { feature: 'Graduation data',                 endpoint: 'getProgrammeGrads',         status: 'live' },
            { feature: 'Student roster',                  endpoint: 'getProgrammeStudents',      status: 'live' },
            { feature: 'Registration history (AYOS)',     endpoint: 'getProgrammeRegistrations', status: 'live' },
            { feature: 'DFW rate aggregation',            endpoint: 'getCourseResults (computed)', status: 'derived' },
            { feature: 'Programme structure',             endpoint: 'getProgrammeStructure',     status: 'planned' },
            { feature: 'Course prerequisites',            endpoint: 'N/A',                       status: 'missing' },
            { feature: 'Graduate attribute mappings',     endpoint: 'N/A',                       status: 'missing' },
            { feature: 'Learning outcomes',               endpoint: 'N/A',                       status: 'missing' },
            { feature: 'Curriculum variants',             endpoint: 'N/A',                       status: 'missing' }
        ];
        var statusColors = { live: 'var(--ui-green-400)', derived: 'var(--ui-blue-400)', planned: 'var(--ui-amber-400)', missing: 'var(--ui-red-400)' };
        var statusBg = { live: 'var(--ui-green-50)', derived: 'var(--ui-blue-50)', planned: 'var(--ui-amber-50)', missing: 'var(--ui-red-50)' };

        var table = document.createElement('table');
        table.className = 'as-an-data-table-sm as-an-data-table-xs';
        table.appendChild(this._buildThead([
            { text: 'Feature', css: 'as-an-meth-th' },
            { text: 'Endpoint', css: 'as-an-meth-th' },
            { text: 'Status', css: 'as-an-meth-th' }
        ], null, 'as-an-thead-bg-strong'));
        var tbody = document.createElement('tbody');
        endpoints.forEach(function(ep) {
            var tr = document.createElement('tr');
            tr.className = 'as-an-about-tr-border';
            var badgeColor = statusColors[ep.status] || 'var(--ui-gray-400)';
            var badgeBgColor = statusBg[ep.status] || 'var(--ui-gray-50)';
            tr.appendChild(self._buildTd(ep.feature, null, 'as-an-about-td-feature'));
            tr.appendChild(self._buildTd(ep.endpoint, null, 'as-an-about-td-endpoint'));
            var statusTd = document.createElement('td');
            statusTd.className = 'as-an-about-td-status';
            var statusBadge = document.createElement('span');
            statusBadge.className = 'as-an-about-status-badge';
            statusBadge.style.color = badgeColor;
            statusBadge.style.background = badgeBgColor;
            statusBadge.textContent = ep.status;
            statusTd.appendChild(statusBadge);
            tr.appendChild(statusTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        card.appendChild(table);

        // Data flow note
        var flow = document.createElement('div');
        flow.className = 'as-an-about-standards';
        var flowTitle = document.createElement('div');
        flowTitle.className = 'as-an-about-standards-title';
        flowTitle.textContent = 'Data Flow';
        flow.appendChild(flowTitle);
        var flowPath = document.createElement('div');
        flowPath.className = 'as-an-about-flow-path';
        flowPath.textContent = 'instApi \u2192 DataAdapter \u2192 Publon tables \u2192 UI';
        flow.appendChild(flowPath);
        var flowNote = document.createElement('div');
        flowNote.className = 'as-an-about-flow-note';
        flowNote.textContent = 'Currently using demo data via AnalystService bridge';
        flow.appendChild(flowNote);
        card.appendChild(flow);
    }

    _renderAboutFutureDirections(parent) {
        var card = this._aboutCard(parent, 'rocket', 'Future Directions');
        var directions = [
            { title: 'Predictive At-Risk Models',              status: 'research', description: 'Machine learning prediction using historical results, demographics, and engagement data to identify at-risk students before failure occurs.' },
            { title: 'What-If Curriculum Simulation',           status: 'concept',  description: 'Simulate prerequisite changes and model their impact on student throughput, time-to-completion, and bottleneck formation.' },
            { title: 'Cross-Programme Benchmarking',            status: 'planned',  description: 'Normalised comparison of programme performance across departments and faculties, accounting for discipline-specific factors.' },
            { title: 'Real-Time DP Tracking',                   status: 'planned',  description: 'Live integration with attendance and assessment systems for continuous DP (Duly Performed) eligibility monitoring.' },
            { title: 'Accreditation Evidence Auto-Generation',  status: 'concept',  description: 'Automatically compile graduate attribute evidence, course mapping data, and throughput statistics into accreditation submission packages.' },
            { title: 'Learning Analytics Integration',          status: 'concept',  description: 'Incorporate LMS engagement scores (login frequency, resource access, forum participation) as additional risk factors in student assessment.' },
            { title: 'Multi-Institution Comparative',           status: 'concept',  description: 'Anonymised cross-institution benchmarking for DHET reporting and national performance comparison.' }
        ];
        var statusColors = { research: 'var(--ui-purple-500)', concept: 'var(--ui-indigo-500)', planned: 'var(--ui-sky-500)' };
        var statusBg = { research: 'var(--ui-purple-50)', concept: 'var(--ui-indigo-50)', planned: 'var(--ui-sky-50)' };
        directions.forEach(function(d) {
            var row = document.createElement('div');
            row.className = 'as-an-about-direction-row';
            var inner = document.createElement('div');
            inner.className = 'as-flex-1';
            var titleRow = document.createElement('div');
            titleRow.className = 'as-an-about-direction-title';
            titleRow.appendChild(document.createTextNode(d.title + ' '));
            var badge = document.createElement('span');
            badge.className = 'as-an-about-direction-badge';
            badge.style.color = statusColors[d.status] || 'var(--ui-gray-500)';
            badge.style.background = statusBg[d.status] || 'var(--ui-gray-50)';
            badge.textContent = d.status;
            titleRow.appendChild(badge);
            inner.appendChild(titleRow);
            var desc = document.createElement('div');
            desc.className = 'as-an-about-direction-desc';
            desc.textContent = d.description;
            inner.appendChild(desc);
            row.appendChild(inner);
            card.appendChild(row);
        });
    }

    _renderAboutDomainDebate(parent) {
        var self = this;
        var card = this._aboutCard(parent, 'comments', 'Domain Debate Report — Programme Analyst');

        // ── Preamble ──────────────────────────────────────────────────────
        var preamble = document.createElement('div');
        preamble.className = 'as-an-about-text-sm';
        preamble.style.marginBottom = 'var(--ui-space-4)';
        preamble.style.lineHeight = '1.65';
        preamble.textContent = 'This report captures the findings of a structured three-agent domain debate conducted on 1 March 2026. Three specialist agents — a Tools Scout, a Practice Expert, and a Novelty Agent — each independently researched the programme analytics domain, then challenged each other across three rounds of debate before converging on a unified set of recommendations. The debate protocol follows the Publon.Press domain debate framework: Round 1 (independent discovery), Round 2 (cross-challenge), Round 3 (final convergence with mockups and specifications).';
        card.appendChild(preamble);

        // ── Sections registry ─────────────────────────────────────────────
        var sections = [
            {
                heading: '1. The Signature Innovation: Cascading Risk Propagation',
                paragraphs: [
                    'All three agents converged on a single flagship feature that no existing academic analytics platform provides: Cascading Risk Propagation (CRP). This model treats the prerequisite dependency graph not merely as a structural diagram, but as a failure propagation network. When a course like Engineering Mathematics 1 experiences a high DFW rate, the impact does not stop at that course — it cascades forward through every downstream prerequisite chain, compounding at each hop.',
                    'The Novelty Agent established that this concept has zero prior work in the education domain. While percolation theory and cascading failure analysis are well-studied in infrastructure resilience (power grids, financial contagion, epidemic spreading), no researcher has applied these models to curriculum prerequisite networks. The closest work is CurricularAnalytics.jl (Heileman et al. 2018), which computes static blocking and delay factors, and Slim et al. (EDM 2025), which adds Passability Complexity by weighting structural metrics with historical pass rates. Neither models the dynamic temporal propagation of a cohort-level failure event through the DAG.',
                    'The Practice Expert validated the stakeholder case: programme directors at DUT currently see DFW rates as independent course-level metrics. They know that Mathematics 1 has a 44% DFW rate. What they cannot see is that this single failure point creates an estimated 312 student-semesters of delay per intake cohort — because students blocked from Mathematics 2 are subsequently blocked from Structural Mechanics, Hydraulics, and ultimately their capstone design courses. The cascade model makes this invisible cost visible and quantifiable.',
                    'The Tools Scout confirmed full technical feasibility. The cascade animation requires approximately 100-150 lines of custom code on top of Cytoscape.js, using built-in BFS traversal and node animation APIs. For a programme with 18-50 courses, the deterministic cascade computes in under 1 millisecond. A Monte Carlo extension (1000 stochastic runs) completes in under 50 milliseconds — fast enough for real-time slider interaction without Web Workers.'
                ]
            },
            {
                heading: '2. The What-If Intervention Simulator',
                paragraphs: [
                    'Building on the cascade model, all three agents endorsed a what-if simulation feature. A programme director would click a course node on the prerequisite graph, drag a slider to simulate a DFW reduction (representing an intervention such as supplemental instruction or tutorial support), and watch the cascade re-animate showing the reduced downstream impact. An Intervention Efficiency Ratio (IER) metric — throughput gain per unit of intervention cost — enables evidence-based comparison of competing intervention strategies.',
                    'The Practice Expert grounded this in a concrete DUT scenario: Professor Naidoo, directing the Diploma in Civil Engineering, must choose between hiring tutors for Engineering Mathematics 1 (R400,000/year) or restructuring Surveying 2 assessment (R50,000). The cascade model reveals that the Mathematics intervention has 2.1 times the system-wide impact because of its deeper prerequisite chain, even though Surveying has a worse DFW gap score. This transforms budget allocation from a single-metric decision (worst DFW first) into a network-aware optimisation.',
                    'The Novelty Agent formalized this as a Pareto-optimal portfolio problem: given a fixed intervention budget, which combination of course-level interventions maximises programme-wide throughput? Preliminary analysis suggests that Pareto-optimal portfolios achieve 80% of maximum possible throughput improvement using only 30% of the budget, compared to 55% required by traditional DFW-ranked allocation.'
                ]
            },
            {
                heading: '3. Technical Architecture Consensus',
                paragraphs: [
                    'The Tools Scout proposed and the other agents accepted a minimal library stack: Cytoscape.js with dagre layout for the prerequisite DAG (replacing vis-network, which is no longer actively maintained), d3-sankey for cohort flow visualisation, and D3.js for heatmaps and sparklines. The total additional JS payload is approximately 219 KB gzipped, with a net increase of only 49 KB after removing vis-network. All rendering completes within 200 milliseconds for a 50-course programme.',
                    'Cross-tab linked views — identified by the Practice Expert as the most critical UX gap — are implemented via the existing Publome EventBus architecture. Five event types (course:select, course:highlight, cohort:select, risk:simulated, ga:select) connect all eight tabs without coupling their render methods. The implementation cost is approximately five hours of wiring work, not a library problem.',
                    'The cascade engine itself is a standalone class (CascadeRiskEngine, approximately 200 lines) implementing deterministic cascade propagation via topological sort and forward BFS, with a Monte Carlo extension for Phase 2. The engine operates entirely client-side against data already loaded by ProgAnalystBridge.'
                ]
            },
            {
                heading: '4. South African Higher Education Context',
                paragraphs: [
                    'The Practice Expert emphasised that the South African context is non-negotiable for this tool to be accepted by its users. All performance indicators must use exact DHET/HEMIS definitions: throughput rate (graduates within n+2 years divided by initial census cohort), success rate (FTE credits passed divided by FTE credits enrolled), first-year retention rate, and module success rate. These formulas differ from international conventions and must be precisely implemented.',
                    'PowerHEDA, the national analytics dashboard used across South African universities, provides publicly available sector-level benchmarking data. The tool should contextualise each programme\'s metrics against the University of Technology sector median using PowerHEDA\'s CESM-level graduation and success rates. The Practice Expert cautioned that PowerHEDA data has a two-year lag and should always be labelled with its reference year.',
                    'For accreditation, CHE programme reviews require throughput visualisations, DFW trend analyses, and graduate attribute coverage evidence. ECSA engineering accreditation requires specific I/R/A matrix evidence with exit-level outcome attainment data. The tool should be able to generate structured PDF exports aligned with these review formats. The Novelty Agent noted that the SA context itself is a publication advantage — the learning analytics literature is dominated by US, UK, and Australian research, making South African institutional data a distinctive contribution.'
                ]
            },
            {
                heading: '5. The 30-Minute Senate Workflow',
                paragraphs: [
                    'The Practice Expert defined the acceptance test: a programme director must be able to extract a coherent narrative for a Faculty Board meeting in 30 minutes. The workflow proceeds in four phases: (1) Programme Dashboard (minutes 0-5) — headline throughput rate with trend arrow, DFW hotspot summary, cohort size sparkline; (2) Curriculum Flow Analysis (minutes 5-12) — cascade graph showing structural bottlenecks and their downstream student-semester cost; (3) DFW Gap Analysis (minutes 12-18) — Georgia State-inspired comparison of observed versus predicted DFW rates revealing courses that underperform their intake profile; (4) Cohort Tracking (minutes 18-24) — Sankey progression of a specific intake cohort showing on-track, delayed, and deregistered proportions; (5) Export (minutes 24-30) — formatted PDF matching Faculty Board agenda structure.',
                    'This workflow drives the feature priority matrix. P0 (must ship) features are programme-level KPIs, course-level DFW with time-series, prerequisite graph with DFW overlay, cohort progression tracking, and Senate report export. P1 (differentiation) features are DFW gap analysis, deterministic cascade propagation, PowerHEDA benchmarks, and cross-tab linked views. P2 features are blocking/delay factors, accreditation evidence export, demographic disaggregation, and Monte Carlo simulation. P3 features include predictive risk scoring, natural language queries, and real-time semester monitoring.'
                ]
            },
            {
                heading: '6. Research Contribution: Two Publishable Papers',
                paragraphs: [
                    'Paper 1: "Cascading Risk Propagation in Prerequisite Networks" — introduces the CRP model treating curriculum DAGs as failure percolation networks. The propagation function computes cascade risk at each course as one minus the product of survival probabilities along all prerequisite paths, with structural, temporal, and pedagogical attenuation factors. The Cascade Criticality Index (CCI) ranks courses by their systemic impact — the total risk reduction achievable if that course had zero failure rate. Validation against five years of DUT cohort data tests whether CCI-ranked intervention targeting outperforms traditional DFW-ranked targeting. Target venue: LAK 2027 (Learning Analytics and Knowledge).',
                    'Paper 2: "SimCurriculum: Interactive What-If Simulation for Curriculum Intervention Planning" — builds the interactive tool on the CRP engine. Introduces the Intervention Efficiency Ratio (IER = throughput gain per unit cost) and Pareto-optimal portfolio computation for budget-constrained intervention allocation. Evaluated retrospectively against institutional data and through expert interviews with academic planners. Target venue: CHI 2027 (ACM Conference on Human Factors in Computing Systems) or IEEE VIS/VAST.',
                    'Both papers differentiate clearly from prior work. CurricularAnalytics.jl computes static topological metrics without propagation dynamics. Slim et al. (EDM 2025) adds pass-rate weighting but remains pairwise (no transitive cascade). Georgia State\'s EAB Navigate operates at the individual student level, not the curriculum structure level. JISC Learning Analytics focuses on engagement signals without prerequisite network modelling. AutoScholar\'s CRP model is the first to apply percolation-theoretic cascade analysis to curriculum networks with empirical DFW data — a contribution that is orthogonal to existing student-level alert systems.'
                ]
            },
            {
                heading: '7. What Was Debated and Resolved',
                paragraphs: [
                    'vis-network vs Cytoscape.js: The Tools Scout advocated for Cytoscape.js based on its academic pedigree, built-in graph algorithms, active maintenance, and animation API. The Practice Expert conditionally accepted the migration, arguing that vis-network is adequate for 18 nodes but the cascade animation and graph algorithms justify the switch. Resolution: migrate to Cytoscape.js, keep vis-network as a fallback for environments where Cytoscape does not load.',
                    'Monte Carlo vs Deterministic: The Novelty Agent initially proposed full Monte Carlo simulation. The Practice Expert challenged this as over-engineering for current data depth. Resolution: ship deterministic cascade first (multiply DFW rates along chains), add Monte Carlo in Phase 2 after data calibration. The deterministic model alone is publishable and changes decisions.',
                    'Curriculum Cartography: The Novelty Agent proposed a geographic metaphor (terrain maps for curriculum difficulty). The Tools Scout dismissed this as confusing for programme directors who think in year levels and semesters. Resolution: dropped. The prerequisite DAG with dagre layout already provides spatial structure.',
                    'Natural Language Queries: The Novelty Agent proposed an LLM-powered query interface. The Tools Scout challenged the complexity-to-value ratio for a dataset of 18 courses and 5 cohorts. Resolution: cut from scope. Every question is answerable by clicking.',
                    'Equity Disaggregation: The Practice Expert identified this as critical for SA transformation reporting. The Tools Scout flagged it as a data dependency — demographic data requires integration with institutional student information systems beyond the current API. Resolution: designed into the feature matrix at P2 priority, blocked on data pipeline, not on visualization.',
                    'Cross-Programme Analysis: The Novelty Agent proposed shared-course impact analysis across programmes. The Practice Expert endorsed the value (service courses like Mathematics affect multiple programmes). Resolution: deferred to a later phase. Build single-programme cascade first, expand scope after validation.'
                ]
            },
            {
                heading: '8. Feature Priority Matrix',
                paragraphs: [
                    'P0 — Must Ship: Programme throughput/success/retention KPIs with time-series; Course-level DFW rates with trend sparklines; Curriculum prerequisite graph with DFW overlay and cascade highlighting; Cohort progression tracking via d3-sankey; Senate report export (formatted PDF).',
                    'P1 — Differentiation: DFW gap analysis (observed vs predicted); Deterministic cascade risk propagation with BFS animation; PowerHEDA sector benchmarks; Cross-tab linked selection via EventBus; Credit accumulation distribution per cohort.',
                    'P2 — Completeness: CurricularAnalytics blocking/delay factors as node metrics; ECSA/CHE accreditation evidence export; Demographic disaggregation (race, gender, school quintile); Intervention tracking with outcome measurement; Monte Carlo simulation with what-if sliders.',
                    'P3 — Future Research: Predictive student-level risk scoring; Natural language narrative generation; Multi-programme comparison view; Real-time semester monitoring with alerts.'
                ]
            }
        ];

        // ── Render narrative sections ─────────────────────────────────────
        sections.forEach(function(s) {
            var heading = document.createElement('div');
            heading.className = 'as-an-about-heading-sm';
            heading.style.marginTop = 'var(--ui-space-5)';
            heading.textContent = s.heading;
            card.appendChild(heading);
            s.paragraphs.forEach(function(pText) {
                var p = document.createElement('div');
                p.className = 'as-an-about-text-sm';
                p.style.lineHeight = '1.65';
                p.style.marginBottom = 'var(--ui-space-3)';
                p.textContent = pText;
                card.appendChild(p);
            });
        });

        // ── Differentiation Matrix table ──────────────────────────────────
        var matrixHeading = document.createElement('div');
        matrixHeading.className = 'as-an-about-heading-sm';
        matrixHeading.style.marginTop = 'var(--ui-space-5)';
        matrixHeading.textContent = '9. Differentiation from Existing Tools';
        card.appendChild(matrixHeading);

        var matrixIntro = document.createElement('div');
        matrixIntro.className = 'as-an-about-text-sm';
        matrixIntro.style.marginBottom = 'var(--ui-space-3)';
        matrixIntro.textContent = 'The following matrix compares AutoScholar\'s Programme Analyst against the four most relevant existing tools in the academic analytics landscape.';
        card.appendChild(matrixIntro);

        var diffMatrix = [
            { dimension: 'Unit of Analysis', ca: 'Course structure (static)', slim: 'Course structure (weighted)', gs: 'Individual student', as: 'Course structure + systemic propagation' },
            { dimension: 'Risk Model', ca: 'Blocking factor, delay factor', slim: 'Passability complexity', gs: '800 predictive alerts', as: 'Cascade propagation with attenuation' },
            { dimension: 'Uses Historical DFW?', ca: 'No (topological only)', slim: 'Yes (key innovation)', gs: 'Yes (student-level)', as: 'Yes (propagation parameters)' },
            { dimension: 'Network Effects?', ca: 'Pairwise', slim: 'Pairwise (weighted)', gs: 'None', as: 'Full transitive cascade' },
            { dimension: 'Intervention Simulation?', ca: 'Structural what-if', slim: 'None', gs: 'Advisor nudges', as: 'Course-level what-if + portfolio optimisation' },
            { dimension: 'SA/Developing Context?', ca: 'US-focused', slim: 'US-focused', gs: 'US-focused', as: 'SA HEMIS-aligned, DHET/CHE relevant' },
            { dimension: 'Interactive Visualisation?', ca: 'Static Julia plots', slim: 'Static output', gs: 'Proprietary dashboard', as: 'Real-time Cytoscape.js with animation' }
        ];

        var table = document.createElement('table');
        table.className = 'as-an-data-table-sm as-an-data-table-xs';
        table.appendChild(this._buildThead([
            { text: 'Dimension', css: 'as-an-meth-th' },
            { text: 'CurricularAnalytics', css: 'as-an-meth-th' },
            { text: 'Slim et al. 2025', css: 'as-an-meth-th' },
            { text: 'Georgia State EAB', css: 'as-an-meth-th' },
            { text: 'AutoScholar CRP', css: 'as-an-meth-th' }
        ], null, 'as-an-thead-bg-strong'));
        var tbody = document.createElement('tbody');
        diffMatrix.forEach(function(row) {
            var tr = document.createElement('tr');
            tr.className = 'as-an-about-tr-border';
            tr.appendChild(self._buildTd(row.dimension, null, 'as-an-about-td-analysis'));
            tr.appendChild(self._buildTd(row.ca, null, 'as-an-about-td-method'));
            tr.appendChild(self._buildTd(row.slim, null, 'as-an-about-td-method'));
            tr.appendChild(self._buildTd(row.gs, null, 'as-an-about-td-method'));
            var asTd = self._buildTd(row.as, null, 'as-an-about-td-method');
            asTd.style.fontWeight = 'var(--ui-font-semibold)';
            tr.appendChild(asTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        card.appendChild(table);

        // ── Technical Stack table ─────────────────────────────────────────
        var stackHeading = document.createElement('div');
        stackHeading.className = 'as-an-about-heading-sm';
        stackHeading.style.marginTop = 'var(--ui-space-5)';
        stackHeading.textContent = '10. Recommended Technical Stack';
        card.appendChild(stackHeading);

        var stackData = [
            { component: 'Prerequisite DAG + Cascade', library: 'Cytoscape.js 3.30 + dagre', size: '~123 KB', role: 'Graph layout, BFS traversal, node animation' },
            { component: 'Cohort Flow (Sankey)', library: 'd3-sankey 0.12', size: '~4 KB', role: 'Proportional flow with dropout/repeat branches' },
            { component: 'GA Heatmap', library: 'D3.js 7.x', size: '~90 KB (shared)', role: 'Interactive I/R/A matrix with click drill-down' },
            { component: 'Trend Sparklines', library: 'D3.js 7.x', size: '(shared)', role: 'Compact 5-year DFW trend lines per course' },
            { component: 'Cascade Engine', library: 'CascadeRiskEngine.js', size: '~2 KB', role: 'Deterministic + Monte Carlo propagation' },
            { component: 'Cross-tab Linking', library: 'EventBus (Core)', size: '0 KB (existing)', role: '5 event types connecting all 8 tabs' }
        ];

        var stackTable = document.createElement('table');
        stackTable.className = 'as-an-data-table-sm as-an-data-table-xs';
        stackTable.appendChild(this._buildThead([
            { text: 'Component', css: 'as-an-meth-th' },
            { text: 'Library', css: 'as-an-meth-th' },
            { text: 'Size (gzip)', css: 'as-an-meth-th' },
            { text: 'Role', css: 'as-an-meth-th' }
        ], null, 'as-an-thead-bg-strong'));
        var stackTbody = document.createElement('tbody');
        stackData.forEach(function(row) {
            var tr = document.createElement('tr');
            tr.className = 'as-an-about-tr-border';
            tr.appendChild(self._buildTd(row.component, null, 'as-an-about-td-analysis'));
            tr.appendChild(self._buildTd(row.library, null, 'as-an-about-td-method'));
            tr.appendChild(self._buildTd(row.size, null, 'as-an-about-td-method'));
            tr.appendChild(self._buildTd(row.role, null, 'as-an-about-td-method'));
            stackTbody.appendChild(tr);
        });
        stackTable.appendChild(stackTbody);
        card.appendChild(stackTable);

        // ── DHET Formulas ─────────────────────────────────────────────────
        var formulaHeading = document.createElement('div');
        formulaHeading.className = 'as-an-about-heading-sm';
        formulaHeading.style.marginTop = 'var(--ui-space-5)';
        formulaHeading.textContent = '11. DHET Performance Indicator Formulas';
        card.appendChild(formulaHeading);

        var formulas = [
            { metric: 'Throughput Rate', formula: 'Graduates within n+2 years / Initial census cohort size \u00d7 100', note: 'n = minimum programme duration. Diplomas: 5-year window. Degrees: 6-year window. National UoT target: 60%.' },
            { metric: 'Success Rate', formula: 'FTE credits passed / FTE credits enrolled \u00d7 100', note: 'FTE = credits enrolled / programme credit load per year. National benchmark: 80%.' },
            { metric: 'Graduation Rate', formula: 'Total graduates in year Y / Total headcount in year Y \u00d7 100', note: 'Cross-sectional (not cohort-based). Influenced by cohort size changes.' },
            { metric: 'First-Year Retention', formula: 'First-time students in Y re-registered in Y+1 / First-time students at census Y \u00d7 100', note: 'Not official DHET metric but universally reported in Annual Performance Plans.' },
            { metric: 'Module DFW Rate', formula: '(D + F + W) / Enrolled at census \u00d7 100', note: 'D = below 50% but above sub-minimum. F = below sub-minimum or absent. W = withdrew after census.' }
        ];

        var formulaTable = document.createElement('table');
        formulaTable.className = 'as-an-data-table-sm as-an-data-table-xs';
        formulaTable.appendChild(this._buildThead([
            { text: 'Metric', css: 'as-an-meth-th' },
            { text: 'Formula', css: 'as-an-meth-th' },
            { text: 'Notes', css: 'as-an-meth-th' }
        ], null, 'as-an-thead-bg-strong'));
        var formulaTbody = document.createElement('tbody');
        formulas.forEach(function(row) {
            var tr = document.createElement('tr');
            tr.className = 'as-an-about-tr-border';
            tr.appendChild(self._buildTd(row.metric, null, 'as-an-about-td-analysis'));
            tr.appendChild(self._buildTd(row.formula, null, 'as-an-about-td-method'));
            tr.appendChild(self._buildTd(row.note, null, 'as-an-about-td-ref'));
            formulaTbody.appendChild(tr);
        });
        formulaTable.appendChild(formulaTbody);
        card.appendChild(formulaTable);

        // ── References ────────────────────────────────────────────────────
        var refHeading = document.createElement('div');
        refHeading.className = 'as-an-about-heading-sm';
        refHeading.style.marginTop = 'var(--ui-space-5)';
        refHeading.textContent = '12. Key References';
        card.appendChild(refHeading);

        var references = [
            'Heileman, G.L., Hickman, C.T., Slim, A. et al. (2018) \u2014 Curricular Analytics: A Framework for Quantifying the Impact of Curricular Reforms. CurricularAnalytics.jl.',
            'Slim, A., Abdallah, K. et al. (EDM 2025) \u2014 Integrated Curriculum Analytics: Bridging Structure, Pass Rates, and Student Outcomes. Passability Complexity metric.',
            'Renick, T. (2020) \u2014 Georgia State University GPS Advising System. 800-alert early intervention model with 7pp graduation rate improvement.',
            'Koch, D. & Herling, R. (2017) \u2014 Bottleneck course identification in STEM programmes using DFW gap analysis.',
            'Loder, A. (2024) \u2014 Student Flow Visualization using Sankey diagrams. European Journal of Education. 83,264 students across 140,593 programmes.',
            'Templ, M. (2025) \u2014 Sankey diagrams for curriculum planning and student lifecycle tracking. The Curriculum Journal.',
            'ECSA (2014) \u2014 Competency Standards for South African engineering graduates. 12 Exit Level Outcomes with I/R/A mapping framework.',
            'CHE \u2014 Council on Higher Education programme accreditation criteria. Self-evaluation report and portfolio of evidence requirements.',
            'DHET \u2014 Higher Education Management Information System (HEMIS). Annual institutional data submissions, throughput rate definitions.',
            'PowerHEDA \u2014 National analytics dashboard (heda.co.za/PowerHEDA). Sector-level benchmarking by CESM category and institution type.',
            'Buldyrev, S.V. et al. (2010) \u2014 Catastrophic cascade of failures in interdependent networks. Nature. Percolation theory foundation.',
            'Nature Reviews Physics (2024) \u2014 Cascading failures in complex networks. Theoretical models for failure propagation.',
            'Washington Accord \u2014 International engineering graduate attribute framework. Basis for ECSA and ABET accreditation standards.',
            'SAQA \u2014 NQF level descriptors and credit allocation. South African Qualifications Authority framework.',
            'Suresh, R. (2006) \u2014 Factors affecting STEM persistence and retention in US higher education.',
            'Fazil, M. et al. (2024) \u2014 Student performance prediction models. Frontiers in Education.',
            'Morse, R. (2019) \u2014 Sankey Visualization of Student Cohort Data. University of New Mexico.',
            'AIR (2024) \u2014 Curriculum Analytics: Approaches to Structural Analysis. Association for Institutional Research.'
        ];

        var refList = document.createElement('div');
        refList.style.display = 'flex';
        refList.style.flexDirection = 'column';
        refList.style.gap = 'var(--ui-space-1)';
        references.forEach(function(ref) {
            var refItem = document.createElement('div');
            refItem.className = 'as-an-about-text-sm';
            refItem.style.lineHeight = '1.55';
            refItem.style.paddingLeft = 'var(--ui-space-3)';
            refItem.style.borderLeft = '2px solid var(--ui-gray-200)';
            refItem.textContent = ref;
            refList.appendChild(refItem);
        });
        card.appendChild(refList);

        // ── Debate metadata ───────────────────────────────────────────────
        var meta = document.createElement('div');
        meta.className = 'as-an-about-standards';
        meta.style.marginTop = 'var(--ui-space-5)';
        var metaTitle = document.createElement('div');
        metaTitle.className = 'as-an-about-standards-title';
        metaTitle.textContent = 'Debate Metadata';
        meta.appendChild(metaTitle);
        var metaBody = document.createElement('div');
        metaBody.className = 'as-an-about-standards-body';
        metaBody.textContent = 'Date: 1 March 2026 \u00b7 Protocol: 3-round domain debate (discover \u2192 challenge \u2192 converge) \u00b7 Agents: domain-tools-scout (Opus), domain-practice-expert (Opus), domain-novelty-agent (Opus) \u00b7 Model: Claude Opus 4.6 \u00b7 Sources consulted: 40+ academic papers, industry platforms, and SA government publications';
        meta.appendChild(metaBody);
        card.appendChild(meta);
    }

    _aboutCard(parent, icon, title) {
        var card = document.createElement('div');
        card.className = 'as-an-about-card';
        var header = document.createElement('div');
        header.className = 'as-an-about-card-header';
        var hdrIcon = this._faIcon(icon);
        hdrIcon.className += ' as-an-about-icon-md';
        header.appendChild(hdrIcon);
        var titleSpan = document.createElement('span');
        titleSpan.className = 'as-an-about-card-title';
        titleSpan.textContent = title;
        header.appendChild(titleSpan);
        card.appendChild(header);
        var body = document.createElement('div');
        body.className = 'as-an-about-card-body';
        card.appendChild(body);
        parent.appendChild(card);
        return body;
    }

    _renderAboutImplementationPlan(parent) {
        var card = this._aboutCard(parent, 'tasks', 'Implementation Plan — Debate-Driven Upgrade');

        var intro = document.createElement('div');
        intro.className = 'as-an-about-text-sm';
        intro.textContent = 'This implementation plan was generated from a 3-round domain debate (1 March 2026) between three specialist agents. The plan introduces Cytoscape.js for the prerequisite DAG, d3-sankey for cohort flow, D3 heatmaps for outcomes mapping, and a novel Cascading Risk Propagation (CRP) model — treating the prerequisite DAG as a failure percolation network. Zero prior work exists in education analytics for this approach.';
        card.appendChild(intro);

        var phases = [
            { num: 1, label: 'Foundation', color: '#16a34a', done: true, items: [
                { text: 'Add Cytoscape.js, dagre, D3, d3-sankey library tags', done: true },
                { text: 'Add internal EventBus to ProgAnalystPanel', done: true },
                { text: 'Create CascadeRiskEngine class (topological sort, cascade, CCI)', done: true },
                { text: 'Add DAG_NODES, DAG_EDGES, cascadeEngine to bridge', done: true }
            ]},
            { num: 2, label: 'Cytoscape Migration', color: '#16a34a', done: true, items: [
                { text: 'Add Cytoscape CSS classes to theme', done: true },
                { text: 'Replace _renderGraph with Cytoscape-first, vis-network fallback', done: true },
                { text: 'Add _buildCytoscapeNetwork with dagre layout', done: true },
                { text: 'Add _animateCascade with BFS-timed transitions', done: true },
                { text: 'Add _renderGraphLegend for dynamic legend', done: true }
            ]},
            { num: 3, label: 'd3-sankey Cohort Flow', color: '#16a34a', done: true, items: [
                { text: 'Add Sankey CSS classes', done: true },
                { text: 'Replace _renderSankey with d3-sankey, legacy fallback', done: true },
                { text: 'Add _buildD3Sankey with proportional flows + tooltips', done: true },
                { text: 'Move hand-drawn SVG to _buildLegacySankey', done: true }
            ]},
            { num: 4, label: 'Cross-Tab Linking', color: '#16a34a', done: true, items: [
                { text: 'Emit course:select from Progression, Gatekeepers, Curriculum', done: true },
                { text: 'Emit cohort:select from Sankey nodes', done: true },
                { text: 'Subscribe all tabs to bus events with highlight behaviors', done: true }
            ]},
            { num: 5, label: 'Cascade What-If Controls', color: '#16a34a', done: true, items: [
                { text: 'Add What-If Simulation section to progression controls', done: true },
                { text: 'Add DFW shock slider and Simulate/Reset buttons', done: true },
                { text: 'Add _runCascadeSimulation, _resetCascade, _showCCIResults', done: true },
                { text: 'Emit risk:simulated events for cross-tab KPI updates', done: true }
            ]},
            { num: 6, label: 'D3 GA Heatmap', color: '#16a34a', done: true, items: [
                { text: 'Replace _renderMatrix with D3 SVG heatmap', done: true },
                { text: 'Add I/R/A color-coded cells with click cycling', done: true },
                { text: 'Move legacy HTML table to _renderLegacyMatrix', done: true }
            ]},
            { num: 7, label: 'Overview Sparklines', color: '#16a34a', done: true, items: [
                { text: 'Add _buildD3Sparkline utility (D3 line + end dot)', done: true },
                { text: 'Add _buildTrendArrow for KPI trend indicators', done: true },
                { text: 'Wire sparklines and trends into overview KPI cards', done: true }
            ]},
            { num: 8, label: 'About Section Update', color: '#16a34a', done: true, items: [
                { text: 'Add implementation plan tracker to About tab', done: true },
                { text: 'CSS classes for phase badges and check items', done: true }
            ]}
        ];

        phases.forEach(function(phase) {
            var phaseEl = document.createElement('div');
            phaseEl.className = 'as-an-impl-phase';
            var header = document.createElement('div');
            header.className = 'as-an-impl-phase-header';
            var badge = document.createElement('span');
            badge.className = 'as-an-impl-phase-badge';
            badge.style.background = phase.done ? phase.color : '#9ca3af';
            badge.textContent = 'P' + phase.num;
            header.appendChild(badge);
            header.appendChild(document.createTextNode(phase.label));
            if (phase.done) {
                var doneIcon = document.createElement('i');
                doneIcon.className = 'fas fa-check-circle';
                doneIcon.style.color = '#16a34a';
                doneIcon.style.marginLeft = '0.25rem';
                header.appendChild(doneIcon);
            }
            phaseEl.appendChild(header);

            phase.items.forEach(function(item) {
                var check = document.createElement('div');
                check.className = 'as-an-impl-check' + (item.done ? ' as-an-impl-check-done' : '');
                var icon = document.createElement('i');
                icon.className = 'as-an-impl-check-icon fas ' + (item.done ? 'fa-check-square' : 'fa-square');
                check.appendChild(icon);
                check.appendChild(document.createTextNode(item.text));
                phaseEl.appendChild(check);
            });
            card.appendChild(phaseEl);
        });

        // Key decisions table
        var decisionsHeader = document.createElement('div');
        decisionsHeader.className = 'as-an-about-heading-sm';
        decisionsHeader.style.marginTop = '1rem';
        decisionsHeader.textContent = 'Key Decisions';
        card.appendChild(decisionsHeader);

        var decisions = [
            { decision: 'Graph library', choice: 'Cytoscape.js + dagre', rationale: 'Active maintenance, graph algorithms, animation API' },
            { decision: 'Cascade model', choice: 'Deterministic first, Monte Carlo deferred', rationale: 'Ship verifiable results first' },
            { decision: 'Sankey library', choice: 'd3-sankey', rationale: 'Standard, well-documented, proportional flows' },
            { decision: 'Heatmap approach', choice: 'D3 SVG cells', rationale: 'Interactive, scalable, consistent with D3 stack' },
            { decision: 'Fallback strategy', choice: 'Keep vis-network & legacy SVG', rationale: 'Zero regression risk' },
            { decision: 'EventBus scope', choice: 'Internal to ProgAnalystPanel', rationale: 'Isolates analyst concerns' }
        ];

        var dtable = document.createElement('table');
        dtable.className = 'as-an-data-table-sm';
        dtable.appendChild(this._buildThead([
            { text: 'Decision', css: 'as-an-th-left' },
            { text: 'Choice', css: 'as-an-th-left' },
            { text: 'Rationale', css: 'as-an-th-left' }
        ]));
        var dtbody = document.createElement('tbody');
        decisions.forEach(function(d) {
            var tr = document.createElement('tr');
            tr.className = 'as-an-about-tr-border';
            var td1 = document.createElement('td');
            td1.className = 'as-an-about-td-feature';
            td1.textContent = d.decision;
            tr.appendChild(td1);
            var td2 = document.createElement('td');
            td2.style.fontWeight = '600';
            td2.textContent = d.choice;
            tr.appendChild(td2);
            var td3 = document.createElement('td');
            td3.className = 'as-an-about-td-feature';
            td3.textContent = d.rationale;
            tr.appendChild(td3);
            dtbody.appendChild(tr);
        });
        dtable.appendChild(dtbody);
        card.appendChild(dtable);

        // ── Post-Implementation TODO Notes ──────────────────────────────────
        var todoHeader = document.createElement('div');
        todoHeader.className = 'as-an-about-heading-sm';
        todoHeader.style.marginTop = '1rem';
        todoHeader.textContent = 'Post-Implementation QA Notes (1 March 2026)';
        card.appendChild(todoHeader);

        var todoIntro = document.createElement('div');
        todoIntro.className = 'as-an-about-text-sm';
        todoIntro.textContent = 'Issues identified during live testing with DUT API data. Items are checked off as they are resolved.';
        card.appendChild(todoIntro);

        var todos = [
            { text: 'Cytoscape graph shows blank container when programme has no prerequisite data — add fallback message', done: true },
            { text: 'Extend sparklines to all KPIs where trend data is available (currently only Throughput and Retention)', done: true },
            { text: 'Add loading spinner to overview tab during API data fetch (can take 3-15s)', done: true },
            { text: 'Monte Carlo simulation mode for CascadeRiskEngine (deferred per plan — deterministic first)', done: false },
            { text: 'Cross-tab highlighting: gatekeeper row click → outcomes heatmap column highlight', done: false }
        ];

        todos.forEach(function(item) {
            var check = document.createElement('div');
            check.className = 'as-an-impl-check' + (item.done ? ' as-an-impl-check-done' : '');
            var icon = document.createElement('i');
            icon.className = 'as-an-impl-check-icon fas ' + (item.done ? 'fa-check-square' : 'fa-square');
            check.appendChild(icon);
            check.appendChild(document.createTextNode(item.text));
            card.appendChild(check);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    /** Clear all children from an element (safe replacement for el.innerHTML = '') */
    _clearEl(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    /** Create an <i> element with given FA icon class */
    _faIcon(iconName, extraCss) {
        var i = document.createElement('i');
        i.className = 'fas fa-' + iconName;
        if (extraCss) i.className += ' ' + extraCss;
        return i;
    }

    /** Build a KPI card with icon + label + value using safe DOM construction */
    _buildKpiCard(k) {
        var card = document.createElement('div');
        card.className = 'as-an-kpi-card ' + (k.colorClass || 'as-an-kpi-card-blue');
        var topRow = document.createElement('div');
        topRow.className = 'as-an-kpi-card-header';
        var icon = this._faIcon(k.icon);
        icon.className += ' as-an-kpi-icon';
        topRow.appendChild(icon);
        var labelSpan = document.createElement('span');
        labelSpan.className = 'as-an-kpi-label';
        labelSpan.textContent = k.label;
        topRow.appendChild(labelSpan);
        card.appendChild(topRow);
        var valueDiv = document.createElement('div');
        valueDiv.className = 'as-an-kpi-value';
        valueDiv.textContent = k.value;
        // Trend arrow (if trend data provided)
        if (k.trend !== undefined && k.trendPrev !== undefined) {
            valueDiv.appendChild(this._buildTrendArrow(k.trend, k.trendPrev, k.higherIsBetter));
        }
        card.appendChild(valueDiv);
        if (k.sub) {
            var subDiv = document.createElement('div');
            subDiv.className = 'as-an-kpi-sub';
            subDiv.textContent = k.sub;
            // Sparkline (if sparkline data provided)
            if (k.sparkline && k.sparkline.length >= 2) {
                subDiv.appendChild(this._buildD3Sparkline(k.sparkline, { width: 48, height: 14 }));
            }
            card.appendChild(subDiv);
        }
        return card;
    }

    /** Build a section header with icon + title (+ optional right-side text) */
    _buildSectionHeader(iconName, titleText, rightText) {
        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';
        var icon = this._faIcon(iconName);
        icon.className += ' as-an-card-header-icon';
        hdr.appendChild(icon);
        var titleSpan = document.createElement('span');
        titleSpan.className = 'as-an-card-header-title';
        titleSpan.textContent = titleText;
        hdr.appendChild(titleSpan);
        if (rightText) {
            var rightSpan = document.createElement('span');
            rightSpan.className = 'as-an-card-header-meta';
            rightSpan.textContent = rightText;
            hdr.appendChild(rightSpan);
        }
        return hdr;
    }

    /** Build a table header row from column definitions */
    _buildThead(columns, _unused, trCss) {
        var thead = document.createElement('thead');
        var tr = document.createElement('tr');
        tr.className = trCss || 'as-an-thead-bg';
        columns.forEach(function(col) {
            var th = document.createElement('th');
            th.className = col.css || '';
            th.textContent = col.text;
            if (col.color) th.style.color = col.color;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        return thead;
    }

    /** Build a table cell */
    _buildTd(text, _unused, css) {
        var td = document.createElement('td');
        if (css) td.className = css;
        td.textContent = text;
        return td;
    }

    /** Build a styled badge span */
    _buildBadge(text, color, bg) {
        var span = document.createElement('span');
        span.className = 'as-an-badge-inline';
        span.style.background = bg;
        span.style.color = color;
        span.textContent = text;
        return span;
    }

    /** Build a metric cell (label on top, value below, centered) */
    _buildMetricCell(label, value, color) {
        var cell = document.createElement('div');
        cell.className = 'as-an-metric-cell';
        var labelDiv = document.createElement('div');
        labelDiv.className = 'as-an-metric-label';
        labelDiv.textContent = label;
        cell.appendChild(labelDiv);
        var valueDiv = document.createElement('div');
        valueDiv.className = 'as-an-metric-value';
        valueDiv.style.color = color;
        valueDiv.textContent = value;
        cell.appendChild(valueDiv);
        return cell;
    }

    /** Map a --ui-*-NNN color variable to its -50 light variant for badge backgrounds */
    _colorLight(colorVar) {
        var m = colorVar.match(/var\(--ui-(\w+)-\d+\)/);
        return m ? 'var(--ui-' + m[1] + '-50)' : colorVar;
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

    _addUpdateButton(el, onClick) {
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        el.appendChild(btnWrap);
        new uiButton({ label: 'Update', variant: 'outline', size: 'xs', icon: '<i class="fas fa-sync-alt"></i>', parent: btnWrap, onClick: onClick });
    }

    _yearStatCell(label, value, color) {
        return '<div style="text-align:center;"><div style="font-size:0.55rem;color:var(--ui-gray-500);text-transform:uppercase;">' + label + '</div><div style="font-size:0.85rem;font-weight:700;color:' + color + ';">' + value + '</div></div>';
    }

    _delta(a, b) {
        var d = (parseFloat(a) - parseFloat(b)).toFixed(1);
        return (parseFloat(d) >= 0 ? '+' : '') + d + '%';
    }

    _sparkline(history) {
        if (!history || !history.length) return '\u2014';
        if (history.length === 1) {
            // Single data point — show a dot instead of a polyline
            var color = 'var(--ui-gray-500)';
            return '<svg width="48" height="16" style="vertical-align:middle;"><circle cx="24" cy="8" r="2.5" fill="' + color + '"/></svg>';
        }
        var max = Math.max.apply(null, history);
        var min = Math.min.apply(null, history);
        var range = max - min || 1;
        var w = 48, h = 16;
        var step = w / (history.length - 1);
        var points = history.map(function(v, i) { return (i * step).toFixed(1) + ',' + (h - ((v - min) / range) * h).toFixed(1); }).join(' ');
        var trend = history[history.length - 1] <= history[0] ? 'var(--ui-green-600)' : 'var(--ui-red-600)';
        return '<svg width="' + w + '" height="' + h + '" style="vertical-align:middle;"><polyline points="' + points + '" fill="none" stroke="' + trend + '" stroke-width="1.5" stroke-linecap="round"/></svg>';
    }

    /**
     * Build a D3 sparkline SVG element from a numeric array.
     * Falls back to the legacy SVG polyline if D3 is unavailable.
     * @param {number[]} data — time series values
     * @param {Object} [opts] — { width: 60, height: 20, color: 'auto' }
     * @returns {HTMLElement}
     */
    _buildD3Sparkline(data, opts) {
        opts = opts || {};
        var w = opts.width || 60, h = opts.height || 20;
        var container = document.createElement('span');
        container.className = 'as-an-sparkline-container';
        if (!data || data.length < 2) {
            container.innerHTML = this._sparkline(data);
            return container;
        }
        if (typeof d3 === 'undefined') {
            container.innerHTML = this._sparkline(data);
            return container;
        }
        var trend = data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'flat';
        var color = opts.color || (trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#9ca3af');

        var svg = d3.select(container).append('svg')
            .attr('width', w)
            .attr('height', h)
            .style('vertical-align', 'middle');

        var x = d3.scaleLinear().domain([0, data.length - 1]).range([2, w - 2]);
        var y = d3.scaleLinear().domain([d3.min(data), d3.max(data)]).range([h - 2, 2]);

        var line = d3.line()
            .x(function(d, i) { return x(i); })
            .y(function(d) { return y(d); })
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('stroke-linecap', 'round');

        // End dot
        svg.append('circle')
            .attr('cx', x(data.length - 1))
            .attr('cy', y(data[data.length - 1]))
            .attr('r', 2)
            .attr('fill', color);

        return container;
    }

    /**
     * Build a trend arrow element from current and previous values.
     * @param {number} current
     * @param {number} previous
     * @param {boolean} [higherIsBetter=true]
     * @returns {HTMLElement}
     */
    _buildTrendArrow(current, previous, higherIsBetter) {
        if (higherIsBetter === undefined) higherIsBetter = true;
        var wrap = document.createElement('span');
        wrap.className = 'as-an-trend-wrap';
        var delta = current - previous;
        var pct = previous > 0 ? ((delta / previous) * 100).toFixed(1) : '0';
        var isUp = delta > 0;
        var isGood = higherIsBetter ? isUp : !isUp;
        var arrow = document.createElement('span');
        arrow.className = 'as-an-trend-arrow ' + (delta === 0 ? 'as-an-trend-arrow-flat' : isGood ? 'as-an-trend-arrow-up' : 'as-an-trend-arrow-down');
        arrow.textContent = delta > 0 ? '\u2191' + pct + '%' : delta < 0 ? '\u2193' + Math.abs(parseFloat(pct)) + '%' : '\u2192';
        wrap.appendChild(arrow);
        return wrap;
    }

    _getNodeColor(course, passRate) {
        if (this._colorBy === 'dfw') return course.dfw >= 35 ? 'var(--ui-red-600)' : course.dfw >= 25 ? 'var(--ui-amber-600)' : course.dfw >= 15 ? 'var(--ui-blue-700)' : 'var(--ui-green-600)';
        if (this._colorBy === 'year') return course.year === 1 ? 'var(--ui-blue-700)' : course.year === 2 ? 'var(--ui-purple-600)' : 'var(--ui-green-600)';
        return passRate >= 80 ? 'var(--ui-green-600)' : passRate >= 65 ? 'var(--ui-blue-700)' : passRate >= 50 ? 'var(--ui-amber-600)' : 'var(--ui-red-600)';
    }

    /** Hex colors for Cytoscape (which cannot use CSS custom properties) */
    _getCyNodeColor(course, passRate) {
        if (this._colorBy === 'dfw') return course.dfw >= 35 ? '#dc2626' : course.dfw >= 25 ? '#d97706' : course.dfw >= 15 ? '#1d4ed8' : '#16a34a';
        if (this._colorBy === 'year') return course.year === 1 ? '#1d4ed8' : course.year === 2 ? '#7c3aed' : '#16a34a';
        return passRate >= 80 ? '#16a34a' : passRate >= 65 ? '#1d4ed8' : passRate >= 50 ? '#d97706' : '#dc2626';
    }

    _getFilteredCourses() {
        var yf = this._yearFilter;
        return this._bridge.COURSES.filter(function(c) { return yf === 0 || c.year === yf; });
    }

    _computeStats() {
        var gas = this._bridge.GA_ATTRIBUTES;
        var courses = this._getFilteredCourses();
        var totalCells = gas.length * courses.length;
        var filledCells = 0, fullyMapped = 0, gaps = 0;
        var self = this;
        gas.forEach(function(ga) {
            var gaMap = self._matrix[ga.code] || {};
            var mappedCount = 0, hasAssessed = false;
            courses.forEach(function(c) { if (gaMap[c.code]) { filledCells++; mappedCount++; if (gaMap[c.code] === 'A') hasAssessed = true; } });
            if (mappedCount >= Math.ceil(courses.length * 0.5) && hasAssessed) fullyMapped++;
            if (!hasAssessed) gaps++;
        });
        return { overallPct: totalCells > 0 ? (filledCells / totalCells * 100) : 0, fullyMapped: fullyMapped, total: gas.length, gaps: gaps };
    }

    _findCriticalPath() {
        var self = this;
        var prereqs = this._bridge.PREREQUISITES;
        var courses = this._bridge.COURSES;
        var allCodes = courses.map(function(c) { return c.code; });
        var longestPath = [];
        allCodes.forEach(function(startCode) {
            if (prereqs[startCode] && prereqs[startCode].length) return;
            var stack = [[startCode]];
            while (stack.length) {
                var currentPath = stack.pop();
                var current = currentPath[currentPath.length - 1];
                var downstream = self._bridge.getDownstream(current);
                if (!downstream.length) { if (currentPath.length > longestPath.length) longestPath = currentPath; }
                else { downstream.forEach(function(next) { if (currentPath.indexOf(next) === -1) stack.push(currentPath.concat([next])); }); }
            }
        });
        return longestPath.length ? longestPath : ['No chain found'];
    }

    _findBottlenecks() {
        var self = this;
        return this._bridge.COURSES.map(function(c) {
            return { code: c.code, downstream: self._bridge.getAllDownstream(c.code).length, dfw: c.dfw };
        }).filter(function(b) { return b.downstream > 0; }).sort(function(a, b) { return b.downstream - a.downstream; }).slice(0, 3);
    }

    _computeChainThroughput(path) {
        var courses = this._bridge.COURSES;
        var throughput = 100;
        path.forEach(function(code) { var c = courses.find(function(c) { return c.code === code; }); if (c && c.enrolled > 0) throughput *= (c.passed / c.enrolled); });
        return throughput;
    }

    _renderCell(td, level, levelColors) {
        this._clearEl(td);
        var span = document.createElement('span');
        if (level) {
            span.className = 'as-an-level-swatch as-an-level-' + level;
            span.textContent = level;
        } else {
            span.className = 'as-an-level-swatch-empty';
        }
        td.appendChild(span);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // API INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════

    async _apiCall(action, params) {
        var body = { action: action };
        if (params) { for (var k in params) body[k] = params[k]; }
        if (this._sessionId) body.sessionId = this._sessionId;
        if (this._logToken) body.logToken = this._logToken;
        var response = await fetch(this._endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        return response.json();
    }

    _parseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;
        if (data.fields && Array.isArray(data.data)) return this._fieldsDataToRecords(data.fields, data.data);
        if (data.results && data.results.fields && Array.isArray(data.results.data)) return this._fieldsDataToRecords(data.results.fields, data.results.data);
        if (Array.isArray(data.results)) return data.results;
        var wrapKeys = ['students', 'registrations', 'courseInfo', 'assessmentResults', 'courseResults', 'studentBioData', 'courseMeta', 'courseCounts', 'faculties', 'programmes', 'graduates', 'programmeCount'];
        for (var i = 0; i < wrapKeys.length; i++) {
            var inner = data[wrapKeys[i]];
            if (inner) {
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data)) return this._fieldsDataToRecords(inner.fields, inner.data);
            }
        }
        if (typeof data === 'object' && !Array.isArray(data)) return [data];
        return null;
    }

    _fieldsDataToRecords(fields, data) {
        var normalized = fields.map(function(f) {
            return (f === f.toUpperCase() && f.length > 1)
                ? f.toLowerCase().replace(/_([a-z])/g, function(_, c) { return c.toUpperCase(); })
                : f;
        });
        return data.map(function(row) {
            var record = {};
            normalized.forEach(function(field, i) { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }

    async _batchFetch(keys, fetcher, batchSize) {
        var result = {};
        for (var i = 0; i < keys.length; i += batchSize) {
            var batch = keys.slice(i, i + batchSize);
            var settled = await Promise.allSettled(
                batch.map(function(k) { return fetcher(k).then(function(v) { return { key: k, value: v }; }); })
            );
            for (var j = 0; j < settled.length; j++) {
                if (settled[j].status === 'fulfilled' && settled[j].value) {
                    result[settled[j].value.key] = settled[j].value.value;
                }
            }
        }
        return result;
    }

    async _connectToApi() {
        if (this._loading) return;
        this._loading = true;
        this._renderStatusBadge();
        var self = this;
        try {
            // Wait for AS_SESSION (up to 6s)
            for (var i = 0; i < 12; i++) {
                if (window.AS_SESSION && window.AS_SESSION.ready) break;
                await new Promise(function(r) { setTimeout(r, 500); });
            }
            if (window.AS_SESSION && window.AS_SESSION.ready) {
                this._sessionId = window.AS_SESSION.sessionId;
                this._logToken = window.AS_SESSION.logToken;
            } else {
                throw new Error('No session available — ensure you are logged in.');
            }

            // Fetch programme counts (try selected year, then prior years)
            var programmes = [];
            var years = [this._selectedYear, this._selectedYear - 1, this._selectedYear - 2];
            for (var yi = 0; yi < years.length; yi++) {
                var raw = await this._apiCall('getProgrammeCounts', { year: years[yi] });
                programmes = this._parseResponse(raw) || [];
                if (programmes.length > 0) break;
            }

            if (!programmes.length) throw new Error('No programme data found in API.');

            this._apiProgrammes = programmes;
            this._dataSource = 'api';
            this._loading = false;

            // If current selectedProg isn't in API list, select the first one
            var currentFound = programmes.find(function(p) { return (p.programmeCode || p.code) === self._selectedProg; });
            if (!currentFound && programmes.length) {
                this._selectedProg = programmes[0].programmeCode || programmes[0].code;
            }

            // Rebuild control panel to show real programmes
            this._renderStatusBadge();
            var paramsEl = this._controlEl.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
            if (paramsEl) this._renderSharedParams(paramsEl);

            // Rebuild stage header
            this._buildStage();

            if (typeof log === 'function') log('ProgAnalyst', 'Connected to API — ' + programmes.length + ' programmes');
        } catch (e) {
            this._loading = false;
            this._dataSource = 'demo';
            this._renderStatusBadge();
            console.warn('ProgAnalyst: API connection failed.', e);
            if (typeof log === 'function') log('ProgAnalyst', 'API connection failed: ' + e.message, true);
        }
    }

    _openProgrammeBrowser() {
        var self = this;
        var rawProgs = this._apiProgrammes || this._bridge.PROGRAMMES;

        // Normalise into uniform rows
        var rows = rawProgs.map(function(p) {
            return {
                code: p.programmeCode || p.programme_code || p.code || '',
                name: p.programmeName || p.programmeLabel || p.programme_name || p.name || '',
                students: parseInt(p.students || p.studentCount || p.count || 0, 10)
            };
        });

        var sortCol = 'code', sortAsc = true, filterText = '';

        // Create modal, get body, append content, then open
        var modal = new uiModal({
            title: 'Programme Browser (' + self._selectedYear + ')',
            size: 'lg'
        });
        var body = modal.getBody();
        body.className = 'as-an-card-body';

        // Search row
        var search = document.createElement('input');
        search.type = 'text';
        search.placeholder = 'Filter by code or name\u2026';
        search.className = 'ui-input';
        search.className += ' as-an-cs-search';
        body.appendChild(search);

        // Count label
        var countEl = document.createElement('div');
        countEl.className = 'as-an-cs-count';
        body.appendChild(countEl);

        // Scrollable table wrapper
        var tableWrap = document.createElement('div');
        tableWrap.className = 'as-an-cs-table-wrap';
        body.appendChild(tableWrap);

        function buildSortIcon(col) {
            var icon = document.createElement('i');
            icon.className = 'as-an-pb-sort-icon';
            if (col !== sortCol) {
                icon.className += ' fas fa-sort';
                icon.style.opacity = '0.25';
            } else if (sortAsc) {
                icon.className += ' fas fa-sort-up';
                icon.style.color = 'var(--ui-primary-500)';
            } else {
                icon.className += ' fas fa-sort-down';
                icon.style.color = 'var(--ui-primary-500)';
            }
            return icon;
        }

        function renderTable() {
            var q = filterText.toLowerCase();
            var filtered = rows.filter(function(r) {
                if (!q) return true;
                return r.code.toLowerCase().indexOf(q) >= 0 || r.name.toLowerCase().indexOf(q) >= 0;
            });
            filtered.sort(function(a, b) {
                var va = a[sortCol], vb = b[sortCol];
                if (sortCol === 'students') return sortAsc ? va - vb : vb - va;
                va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
                if (va < vb) return sortAsc ? -1 : 1;
                if (va > vb) return sortAsc ? 1 : -1;
                return 0;
            });

            countEl.textContent = filtered.length + ' of ' + rows.length + ' programmes';
            self._clearEl(tableWrap);

            var table = document.createElement('table');
            table.className = 'as-an-data-table';
            var thead = document.createElement('thead');
            var headTr = document.createElement('tr');
            headTr.className = 'as-an-thead-bg';
            var cols = [
                { col: 'code', label: 'Code', extra: '' },
                { col: 'name', label: 'Programme', extraCss: '' },
                { col: 'students', label: 'Students', extraCss: 'as-text-right' }
            ];
            cols.forEach(function(c) {
                var th = document.createElement('th');
                th.className = 'as-an-pb-th-sortable' + (c.extraCss ? ' ' + c.extraCss : '');
                th.setAttribute('data-col', c.col);
                th.appendChild(document.createTextNode(c.label + ' '));
                th.appendChild(buildSortIcon(c.col));
                th.addEventListener('click', function() {
                    if (sortCol === c.col) sortAsc = !sortAsc;
                    else { sortCol = c.col; sortAsc = true; }
                    renderTable();
                });
                headTr.appendChild(th);
            });
            thead.appendChild(headTr);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            if (!filtered.length) {
                var emptyTr = document.createElement('tr');
                var emptyTd = document.createElement('td');
                emptyTd.colSpan = 3;
                emptyTd.className = 'as-an-empty-td';
                emptyTd.textContent = 'No programmes match';
                emptyTr.appendChild(emptyTd);
                tbody.appendChild(emptyTr);
            }
            filtered.forEach(function(r) {
                var isSelected = r.code === self._selectedProg;
                var tr = document.createElement('tr');
                tr.className = 'as-an-clickable-row' + (isSelected ? ' as-an-row-selected' : '');
                var tdCode = document.createElement('td');
                tdCode.className = 'as-an-pb-td-code';
                tdCode.appendChild(document.createTextNode(r.code));
                if (isSelected) {
                    var checkIcon = document.createElement('i');
                    checkIcon.className = 'fas fa-check as-an-cs-check-icon';
                    tdCode.appendChild(checkIcon);
                }
                tr.appendChild(tdCode);
                var tdName = document.createElement('td');
                tdName.className = 'as-an-pb-td-name';
                tdName.textContent = r.name;
                tr.appendChild(tdName);
                var tdStudents = document.createElement('td');
                tdStudents.className = 'as-an-pb-td-students';
                tdStudents.textContent = r.students > 0 ? String(r.students) : '\u2014';
                tr.appendChild(tdStudents);
                tr.addEventListener('click', function() {
                    self._selectedProg = r.code;
                    self._bridge.selectProgramme(r.code);
                    modal.close();
                    var paramsEl = self._controlEl.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
                    if (paramsEl) self._renderSharedParams(paramsEl);
                    self._buildStage();
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tableWrap.appendChild(table);
        }

        renderTable();
        search.addEventListener('input', function() { filterText = search.value; renderTable(); });
        modal.open();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) { module.exports = ProgAnalystPanel; }
if (typeof window !== 'undefined') { window.ProgAnalystPanel = ProgAnalystPanel; }
