/**
 * ClassViewConnect - Unified ClassView service dashboard
 *
 * Integrates 8 analysis panels + Dashboard + About into a single tabbed
 * interface with shared controls, persistent KPI row, and lazy tab rendering.
 * Follows the ProgAnalystPanel pattern exactly.
 *
 * Usage:
 *   new ClassViewConnect().render(controlEl, stageEl);
 */
var ClassViewConnect = class ClassViewConnect {

    static TAB_REGISTRY = [
        { key: 'dashboard',  label: 'Dashboard',     icon: 'tachometer-alt' },
        { key: 'risk',       label: 'Risk',           icon: 'exclamation-triangle' },
        { key: 'roster',     label: 'Student Browser', icon: 'search' },
        { key: 'gradebook',  label: 'Gradebook',      icon: 'clipboard-check' },
        { key: 'attendance', label: 'Attendance',     icon: 'calendar-check' },
        { key: 'historical', label: 'Historical',     icon: 'chart-line' },
        { key: 'peerCorr',   label: 'Peer Corr',      icon: 'balance-scale' },
        { key: 'analytics',  label: 'Analytics',      icon: 'chart-bar' },
        { key: 'polls',      label: 'Polls',           icon: 'poll' },
        { key: 'regCheck',  label: 'Registration',    icon: 'clipboard-list' },
        { key: 'about',      label: 'About',           icon: 'info-circle' }
    ];

    static PANEL_MAP = {
        risk:       { cls: 'RiskAssessmentPanel',       busKey: 'risk',       hasBus: true },
        roster:     { cls: 'ClassRosterPanel',           busKey: 'roster',     hasBus: true },
        gradebook:  { cls: 'GradebookPanel',             busKey: 'gradebook',  hasBus: true },
        attendance: { cls: 'AttendanceDPPanel',           busKey: 'attendance', hasBus: true },
        historical: { cls: 'HistoricalPerformancePanel', busKey: 'historical', hasBus: true },
        peerCorr:   { cls: 'PeerCorrelationPanel',       busKey: 'peerCorr',   hasBus: true },
        analytics:  { cls: 'ClassAnalyticsPanel',        busKey: 'analytics',  hasBus: true },
        polls:      { cls: 'QuickPollsPanel',             busKey: 'polls',      hasBus: true },
        regCheck:   { cls: 'RegistrationCheckPanel',       busKey: 'regCheck',   hasBus: true }
    };

    // Panel class registry — avoids eval() for ES6 class resolution
    static PANEL_CLASSES = {};

    static registerPanel(name, cls) {
        ClassViewConnect.PANEL_CLASSES[name] = cls;
    };

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._courseCode = config.courseCode || 'MGAB401';
        this._year = config.year || 2020;
        this._endpoint = config.endpoint || '/api-proxy';
        this._dataLoaded = false;
        this._activeTab = 'dashboard';

        // EventBus for broadcasting to sub-panels
        this._bus = new EventBus();

        // Panel instances keyed by tab key
        this._panels = {};

        // Auth
        this.sessionId = null;
        this.logToken = null;

        // Publome data layer
        this._publome = ClassViewSchema.create();
        this._kpiBinding = null;
        this._kpiBindingRefs = [];

        // Demo data cache
        this._demoData = null;

        // Tab cache & DOM refs
        this._tabRendered = {};
        this._tabPanels = {};
        this._contextControlEl = null;
        this._healthEl = null;
        this._alertsEl = null;
        this._tabs = null;
        this._kpiRow = null;
        this._statusBadge = null;

        // Programme filter
        this._courseResults = null;
        this._programmeStudentMap = {};
        this._programmeData = [];
        this._activeProgramme = null;
        this._progSelect = null;
        this._progWrap = null;

        // Panel sidebar control divs keyed by panel key
        this._panelControlEls = {};
        this._sidebarAccordion = null;
        this._panelCtrlPlaceholder = null;

        var self = this;
        ClassViewConnect.TAB_REGISTRY.forEach(function(t) {
            self._tabRendered[t.key] = false;
        });
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._buildStage();

        // Auto-load course counts when API session is ready
        if (window.AS_SESSION && window.AS_SESSION.ready) {
            var self = this;
            this._loadStaffCourses().then(function() {
                self._updateCourseCountBadge();
            });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTROL PANEL
    // ══════════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        el.innerHTML = '';
        this._sidebarAccordion = new uiAccordion({
            template: 'default', exclusive: true,
            content: {
                params:  { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
                context: { label: '<i class="fas fa-cog" style="margin-right:0.3rem;"></i>Panel Controls' },
                health:  { label: '<i class="fas fa-heartbeat" style="margin-right:0.3rem;"></i>Health Summary' },
                alerts:  { label: '<i class="fas fa-exclamation-circle" style="margin-right:0.3rem;"></i>Alerts' }
            },
            parent: el
        });
        var paramsEl = this._sidebarAccordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._contextControlEl = this._sidebarAccordion.el.querySelector('.ui-accordion-item[data-key="context"] .ui-accordion-content');
        this._healthEl = this._sidebarAccordion.el.querySelector('.ui-accordion-item[data-key="health"] .ui-accordion-content');
        this._alertsEl = this._sidebarAccordion.el.querySelector('.ui-accordion-item[data-key="alerts"] .ui-accordion-content');

        // Placeholder text shown when no panel has controls
        this._panelCtrlPlaceholder = document.createElement('div');
        this._panelCtrlPlaceholder.className = 'cv-ctrl-placeholder';
        this._panelCtrlPlaceholder.textContent = 'Select an analysis tab to see panel controls';
        this._contextControlEl.appendChild(this._panelCtrlPlaceholder);

        this._renderSharedParams(paramsEl);
        this._renderContextControls();
        this._renderHealthSummary(this._healthEl);
        this._renderAlertsSidebar(this._alertsEl);
    }

    _renderSharedParams(el) {
        el.innerHTML = '';
        var self = this;

        // ── Status group ──
        var statusGroup = document.createElement('div');
        statusGroup.className = 'cv-ctrl-group';
        el.appendChild(statusGroup);
        var statusLabel = document.createElement('div');
        statusLabel.className = 'cv-ctrl-group-label';
        statusLabel.textContent = 'Status';
        statusGroup.appendChild(statusLabel);
        var ready = window.AS_SESSION && window.AS_SESSION.ready;
        var badgeRow = document.createElement('div');
        badgeRow.className = 'cv-badge-row';
        statusGroup.appendChild(badgeRow);
        this._statusBadge = new uiBadge({ label: ready ? 'Connected' : 'Disconnected', color: ready ? 'success' : 'gray', size: 'sm', parent: badgeRow });
        new uiBadge({ label: 'Class-Level', color: 'gray', size: 'xs', parent: badgeRow });
        new uiBadge({ label: '8 Panels', color: 'primary', size: 'xs', parent: badgeRow });

        // ── Filters group ──
        var filterGroup = document.createElement('div');
        filterGroup.className = 'cv-ctrl-group';
        el.appendChild(filterGroup);
        var filterLabel = document.createElement('div');
        filterLabel.className = 'cv-ctrl-group-label';
        filterLabel.textContent = 'Filters';
        filterGroup.appendChild(filterLabel);

        // Course Code — use uiInput
        var courseInputComp = new uiInput({ template: 'floating-label', label: 'Course Code', value: this._courseCode, size: 'sm', parent: filterGroup });
        this._courseInput = courseInputComp.el.querySelector('input') || courseInputComp.el;

        // Academic Year — native select in ui-input wrapper
        var yearWrap = document.createElement('div');
        yearWrap.className = 'ui-input-wrapper cv-ctrl-mb';
        filterGroup.appendChild(yearWrap);
        var yearLabel = document.createElement('label');
        yearLabel.className = 'ui-input-label';
        yearLabel.textContent = 'Academic Year';
        yearWrap.appendChild(yearLabel);
        this._yearSelect = document.createElement('select');
        this._yearSelect.className = 'ui-input';
        [2026, 2025, 2024, 2023, 2022, 2021, 2020].forEach(function(y) {
            var opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            self._yearSelect.appendChild(opt);
        });
        this._yearSelect.value = String(this._year);
        yearWrap.appendChild(this._yearSelect);
        this._yearSelect.addEventListener('change', function() { self._year = parseInt(self._yearSelect.value, 10); });

        // Programme filter
        this._progWrap = document.createElement('div');
        this._progWrap.className = 'ui-input-wrapper';
        filterGroup.appendChild(this._progWrap);
        var progLabel = document.createElement('label');
        progLabel.className = 'ui-input-label';
        progLabel.textContent = 'Programme';
        this._progWrap.appendChild(progLabel);
        this._progSelect = document.createElement('select');
        this._progSelect.className = 'ui-input';
        this._progSelect.disabled = true;
        var defaultProgOpt = document.createElement('option');
        defaultProgOpt.value = '';
        defaultProgOpt.textContent = 'Run analysis first';
        this._progSelect.appendChild(defaultProgOpt);
        this._progWrap.appendChild(this._progSelect);
        this._progSelect.addEventListener('change', function() { self._onProgrammeFilterChange(); });

        // ── Actions group ──
        var actionGroup = document.createElement('div');
        actionGroup.className = 'cv-action-group';
        el.appendChild(actionGroup);

        // Analyse All — gold gradient button
        var goldBtn = document.createElement('button');
        goldBtn.className = 'as-ctrl-btn-gold';
        goldBtn.innerHTML = '<i class="fas fa-bolt"></i> Analyse All';
        goldBtn.addEventListener('click', function() { self._onAnalyseAll(); });
        actionGroup.appendChild(goldBtn);

        // Browse Courses button + course count badge
        var browseWrap = document.createElement('div');
        browseWrap.className = 'cv-btn-wrap';
        actionGroup.appendChild(browseWrap);
        new uiButton({
            label: 'Browse Courses', variant: 'secondary', size: 'sm',
            icon: '<i class="fas fa-book-open"></i>',
            parent: browseWrap,
            onClick: function() { self._openCourseBrowser(); }
        });
        this._courseCountBadge = new uiBadge({ label: '', color: 'gray', size: 'xs', parent: browseWrap });
        this._courseCountBadge.el.style.display = 'none';

        // Divider
        var divider = document.createElement('div');
        divider.className = 'as-ctrl-divider';
        el.appendChild(divider);

        // Quick Stats mini-grid
        var qLabel = document.createElement('div');
        qLabel.className = 'as-section-compact';
        qLabel.textContent = 'Quick Stats';
        el.appendChild(qLabel);

        this._quickStatsGrid = document.createElement('div');
        this._quickStatsGrid.className = 'as-quick-stats-grid';
        el.appendChild(this._quickStatsGrid);
        this._updateQuickStats();
    }

    _renderContextControls() {
        var el = this._contextControlEl;
        if (!el) return;
        var tab = this._activeTab;
        var self = this;
        var hasControls = false;

        // Hide all panel control divs
        Object.keys(this._panelControlEls).forEach(function(k) {
            self._panelControlEls[k].style.display = 'none';
        });

        // Show the active tab's control div if it exists
        if (this._panelControlEls[tab]) {
            this._panelControlEls[tab].style.display = '';
            hasControls = true;
        }

        // Show/hide the placeholder
        if (this._panelCtrlPlaceholder) {
            if (tab === 'dashboard' || tab === 'about') {
                this._panelCtrlPlaceholder.textContent = 'No additional controls for ' + (tab === 'dashboard' ? 'Dashboard' : 'About');
                this._panelCtrlPlaceholder.style.display = '';
            } else if (!hasControls) {
                this._panelCtrlPlaceholder.textContent = 'Select an analysis tab to see panel controls';
                this._panelCtrlPlaceholder.style.display = '';
            } else {
                this._panelCtrlPlaceholder.style.display = 'none';
            }
        }

        // Auto-open the Panel Controls accordion section when a panel tab has controls
        if (hasControls && this._sidebarAccordion) {
            var contextItem = this._sidebarAccordion.el.querySelector('.ui-accordion-item[data-key="context"]');
            if (contextItem && !contextItem.classList.contains('ui-active')) {
                var toggle = contextItem.querySelector('.ui-accordion-trigger');
                if (toggle) toggle.click();
            }
        }

        // Auto-open the panel's own Parameters pane when switching to it
        if (this._panels[tab] && typeof this._panels[tab].openParams === 'function') {
            this._panels[tab].openParams();
        }
    }

    _renderHealthSummary(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div style="font-size:0.65rem;color:var(--ui-gray-400);padding:0.25rem 0;">Click Analyse All to see health summary</div>';
            return;
        }
        var d = this._demoData;
        var items = [
            { label: 'Students', value: String(d.totalStudents), color: 'var(--ui-gray-800)' },
            { label: 'Avg Mark', value: d.avgMark + '%', color: parseFloat(d.avgMark) >= 55 ? 'var(--ui-success)' : 'var(--ui-danger)' },
            { label: 'Pass Rate', value: d.passRate + '%', color: parseFloat(d.passRate) >= 70 ? 'var(--ui-success)' : 'var(--ui-danger)' },
            { label: 'Failing', value: String(d.atRisk), color: d.atRisk > 5 ? 'var(--ui-danger)' : 'var(--ui-success)' },
            { label: 'Attendance', value: d.attendance != null ? d.attendance + '%' : '\u2014', color: d.attendance != null ? (parseFloat(d.attendance) >= 75 ? 'var(--ui-success)' : 'var(--ui-warning)') : 'var(--ui-gray-400)' },
            { label: 'Panels Active', value: String(Object.keys(this._panels).length), color: 'var(--ui-gray-800)' }
        ];
        el.innerHTML = '<div style="font-size:0.65rem;color:var(--ui-gray-500);line-height:1.8;">' +
            items.map(function(i) { return '<div>' + i.label + ': <strong style="color:' + i.color + ';">' + i.value + '</strong></div>'; }).join('') + '</div>';
    }

    _renderAlertsSidebar(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div style="font-size:0.65rem;color:var(--ui-gray-400);padding:0.25rem 0;">Click Analyse All to see alerts</div>';
            return;
        }
        var d = this._demoData;
        var alerts = [];
        if (d.atRisk > 5) alerts.push({ color: 'danger', text: d.atRisk + ' students failing below 50% (' + (d.atRisk / d.totalStudents * 100).toFixed(0) + '% of class)' });
        if (parseFloat(d.passRate) < 70) alerts.push({ color: 'warning', text: 'Pass rate below 70% target (' + d.passRate + '%)' });
        if (d.attendance != null && parseFloat(d.attendance) < 75) alerts.push({ color: 'warning', text: 'Average attendance below 75% (' + d.attendance + '%)' });
        if (d.missingMarks > 0) alerts.push({ color: 'danger', text: d.missingMarks + ' students with missing assessment marks' });
        if (d.dpExclusions > 0) alerts.push({ color: 'danger', text: d.dpExclusions + ' students facing DP exclusion' });

        if (!alerts.length) {
            new uiAlert({ template: 'inline', color: 'success', message: 'No critical alerts', parent: el });
            return;
        }
        alerts.forEach(function(a) {
            new uiAlert({ template: 'inline', color: a.color, message: a.text, parent: el });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STAGE
    // ══════════════════════════════════════════════════════════════════════════

    _buildStage() {
        var stage = this._stageEl;
        stage.innerHTML = '';
        stage.className = 'cv-stage-fill';
        stage.style.overflowY = 'auto';
        var self = this;

        var wrap = document.createElement('div');
        wrap.className = 'cv-stage-wrap';
        stage.appendChild(wrap);

        // Header
        var header = document.createElement('div');
        header.className = 'cv-flex-row cv-gap-md cv-mb-md cv-flex-wrap';
        header.innerHTML =
            '<span style="background:var(--ui-primary-900);color:white;padding:0.2rem 0.6rem;border-radius:4px;font-weight:700;font-size:0.9rem;"><i class="fas fa-chalkboard-teacher" style="margin-right:0.3rem;"></i>ClassView Connect</span>' +
            '<span style="font-size:0.8rem;color:var(--ui-gray-500);">' + this._courseCode + ' | ' + this._year + '</span>';
        this._headerInfo = header.querySelector('span:last-child');
        wrap.appendChild(header);

        // Persistent KPI row
        this._kpiRow = document.createElement('div');
        this._kpiRow.className = 'as-hero-kpi-row';
        wrap.appendChild(this._kpiRow);
        this._renderKPIs(this._kpiRow);

        // Tabs
        var tabContent = {};
        ClassViewConnect.TAB_REGISTRY.forEach(function(t) {
            tabContent[t.key] = { label: '<i class="fas fa-' + t.icon + '" style="margin-right:0.3rem;font-size:0.7rem;"></i>' + t.label };
        });
        tabContent.dashboard.open = true;

        this._tabs = new uiTabs({
            template: 'underline',
            content: tabContent,
            parent: wrap
        });
        this._tabs.bus.on('tabChange', function(e) { self._onTabChange(e.tab); });

        // Store tab panel refs
        ClassViewConnect.TAB_REGISTRY.forEach(function(t) {
            var panel = self._tabs.el.querySelector('.ui-tabs-panel[data-tab="' + t.key + '"]');
            if (panel) self._tabPanels[t.key] = panel;
        });

        // Initial placeholder
        if (this._tabPanels.dashboard) {
            this._tabPanels.dashboard.innerHTML =
                '<div class="as-empty-state">' +
                    '<i class="fas fa-chalkboard-teacher"></i>' +
                    '<div class="as-empty-state-title">Enter course code and click Analyse All to begin</div>' +
                    '<div class="as-empty-state-hint">Select a course from the sidebar or type a code above</div>' +
                '</div>';
        }
    }

    _onTabChange(tabKey) {
        this._activeTab = tabKey;
        this._renderContextControls();
        if (!this._dataLoaded && tabKey !== 'about') return;
        if (this._tabRendered[tabKey]) return;
        var panel = this._tabPanels[tabKey];
        if (!panel) return;
        panel.innerHTML = '';
        if (tabKey === 'dashboard') this._renderDashboardTab(panel);
        else if (tabKey === 'risk') this._renderPanelTab('risk', panel);
        else if (tabKey === 'roster') this._renderPanelTab('roster', panel);
        else if (tabKey === 'gradebook') this._renderPanelTab('gradebook', panel);
        else if (tabKey === 'attendance') this._renderPanelTab('attendance', panel);
        else if (tabKey === 'historical') this._renderPanelTab('historical', panel);
        else if (tabKey === 'peerCorr') this._renderPanelTab('peerCorr', panel);
        else if (tabKey === 'analytics') this._renderPanelTab('analytics', panel);
        else if (tabKey === 'polls') this._renderPanelTab('polls', panel);
        else if (tabKey === 'regCheck') this._renderPanelTab('regCheck', panel);
        else if (tabKey === 'about') this._renderAboutTab(panel);
        this._tabRendered[tabKey] = true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DATA
    // ══════════════════════════════════════════════════════════════════════════

    _updateAnalyseStatus(text) {
        var el = document.getElementById('cv-analyse-status');
        if (el) el.textContent = text;
    }

    async _loadApiData() {
        var self = this;
        try {
            // Fetch course results
            this._setStatus('Loading results...', 'warning');
            this._updateAnalyseStatus('Fetching course results...');
            var courseData = await this._apiCall('getCourseResults', {
                courseCode: this._courseCode, year: this._year
            });
            var courseResults = this._parseResponse(courseData);
            if (!courseResults || courseResults.length === 0) throw new Error('No course results');
            this._courseResults = courseResults;

            // Fetch assessment results
            this._setStatus('Loading assessments...', 'warning');
            this._updateAnalyseStatus('Fetching assessments...');
            var assessData = await this._apiCall('getAssessmentResults', {
                courseCode: this._courseCode, year: this._year
            });
            var assessResults = this._parseResponse(assessData);

            // Compute aggregates from real data
            var marks = courseResults.map(function(r) {
                return parseFloat(r.result || r.mark || r.finalMark || 0);
            }).filter(function(m) { return m > 0; });

            var totalStudents = courseResults.length;
            var avgMark = marks.length > 0 ? Math.round(10 * marks.reduce(function(a, b) { return a + b; }, 0) / marks.length) / 10 : 0;
            var passCount = marks.filter(function(m) { return m >= 50; }).length;
            var passRate = totalStudents > 0 ? Math.round(10 * 100 * passCount / totalStudents) / 10 : 0;
            var atRisk = marks.filter(function(m) { return m < 50; }).length;

            // Count unique assessments
            var assessCodes = {};
            if (assessResults) {
                assessResults.forEach(function(r) {
                    var code = r.assessmentCode || r.assessment_code || r.assessCode;
                    if (code) assessCodes[code] = true;
                });
            }

            this._demoData = {
                totalStudents: totalStudents,
                avgMark: avgMark,
                passRate: passRate,
                atRisk: atRisk,
                attendance: null,
                assessments: Object.keys(assessCodes).length,
                missingMarks: 0,
                dpExclusions: 0
            };

            // Fetch programme data for filter dropdown
            try {
                this._updateAnalyseStatus('Fetching programme data...');
                var progRows = null;

                // Try dedicated endpoint first
                try {
                    var progData = await this._apiCall('getCourseProgrammes', {
                        courseCode: this._courseCode, year: this._year
                    });
                    progRows = this._parseResponse(progData);
                    // Validate we got actual programme data
                    if (progRows && progRows.length > 0 && !progRows[0].programmeCode) progRows = null;
                } catch (e) { progRows = null; }

                // Fallback: derive from getProgrammeRegistrations using student numbers
                if (!progRows || progRows.length === 0) {
                    var studentNums = courseResults.map(function(r) { return r.studentNumber; }).filter(Boolean);
                    if (studentNums.length > 0) {
                        var regData = await this._apiCall('getProgrammeRegistrations', {
                            studentNumber: studentNums, year: this._year
                        });
                        var regRows = this._parseResponse(regData);
                        if (regRows && regRows.length > 0) {
                            progRows = regRows.map(function(r) {
                                return { studentNumber: r.studentNumber, programmeCode: r.programmeCode, programmeLabel: r.programmeLabel || r.programmeCode };
                            });
                        }
                    }
                }

                this._buildProgrammeMaps(progRows || []);
            } catch (progErr) {
                this._programmeStudentMap = {};
                this._programmeData = [];
            }
            this._populateProgrammeDropdown();

            this._dataLoaded = true;
            this._setStatus('Connected', 'success');

        } catch (err) {
            // Fall back to empty state with error
            this._demoData = { totalStudents: 0, avgMark: 0, passRate: 0, atRisk: 0, attendance: null, assessments: 0, missingMarks: 0, dpExclusions: 0 };
            this._dataLoaded = true;
            this._setStatus('Error: ' + err.message, 'danger');
        }
    }

    // ── Programme Filter ─────────────────────────────────────────────────────

    _buildProgrammeMaps(progRows) {
        var map = {};
        progRows.forEach(function(r) {
            var code = r.programmeCode;
            if (!code) return;
            if (!map[code]) map[code] = { code: code, label: r.programmeLabel || code, students: [] };
            map[code].students.push(r.studentNumber);
        });
        this._programmeStudentMap = {};
        this._programmeData = [];
        var codes = Object.keys(map);
        var self = this;
        codes.forEach(function(c) {
            self._programmeStudentMap[c] = map[c].students;
            self._programmeData.push({ code: c, label: map[c].label, count: map[c].students.length });
        });
        this._programmeData.sort(function(a, b) { return b.count - a.count; });
    }

    _populateProgrammeDropdown() {
        if (!this._progSelect || !this._progWrap) return;
        this._progSelect.innerHTML = '';
        var total = this._courseResults ? this._courseResults.length : 0;

        if (this._programmeData.length === 0) {
            var emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = total > 0 ? 'No programme data' : 'Run analysis first';
            this._progSelect.appendChild(emptyOpt);
            this._progSelect.disabled = true;
            return;
        }

        this._progSelect.disabled = false;

        // "All" option
        var allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All Programmes (' + total + ')';
        this._progSelect.appendChild(allOpt);

        // Each programme sorted by count desc
        this._programmeData.forEach(function(p) {
            var opt = document.createElement('option');
            opt.value = p.code;
            opt.textContent = p.label + ' (' + p.count + ')';
            this._progSelect.appendChild(opt);
        }.bind(this));

        this._progSelect.value = this._activeProgramme || '';
    }

    _onProgrammeFilterChange() {
        var val = this._progSelect ? this._progSelect.value : '';
        this._activeProgramme = val || null;
        this._recomputeFilteredKPIs();
        this._reloadPanelsForProgramme();
    }

    _recomputeFilteredKPIs() {
        if (!this._courseResults) return;
        var results = this._courseResults;

        // Filter to programme if active
        if (this._activeProgramme && this._programmeStudentMap[this._activeProgramme]) {
            var allowedSet = {};
            this._programmeStudentMap[this._activeProgramme].forEach(function(sn) { allowedSet[sn] = true; });
            results = this._courseResults.filter(function(r) { return allowedSet[r.studentNumber]; });
        }

        var marks = results.map(function(r) {
            return parseFloat(r.result || r.mark || r.finalMark || 0);
        }).filter(function(m) { return m > 0; });

        var totalStudents = results.length;
        var avgMark = marks.length > 0 ? Math.round(10 * marks.reduce(function(a, b) { return a + b; }, 0) / marks.length) / 10 : 0;
        var passCount = marks.filter(function(m) { return m >= 50; }).length;
        var passRate = totalStudents > 0 ? Math.round(10 * 100 * passCount / totalStudents) / 10 : 0;
        var atRisk = marks.filter(function(m) { return m < 50; }).length;

        this._demoData.totalStudents = totalStudents;
        this._demoData.avgMark = avgMark;
        this._demoData.passRate = passRate;
        this._demoData.atRisk = atRisk;

        // Update Publome KPI records — bindings auto-refresh
        ClassViewSeed.seedKPIs(this._publome, this._demoData);

        // Re-render KPIs and summaries
        this._renderKPIs(this._kpiRow);
        this._updateQuickStats();
        this._renderHealthSummary(this._healthEl);
        this._renderAlertsSidebar(this._alertsEl);
    }

    _reloadPanelsForProgramme() {
        var studentNumbers = null;
        if (this._activeProgramme && this._programmeStudentMap[this._activeProgramme]) {
            studentNumbers = this._programmeStudentMap[this._activeProgramme];
        }
        var self = this;
        Object.keys(this._panels).forEach(function(key) {
            var panel = self._panels[key];
            if (typeof panel.load === 'function') {
                panel.load({
                    courseCode: self._courseCode,
                    year: self._year,
                    studentNumber: studentNumbers
                });
            }
        });
        // Also broadcast via bus for any bus-connected panels
        this._bus.emit('load', {
            courseCode: this._courseCode,
            year: this._year,
            studentNumber: studentNumbers
        });
    }

    // ══════════════════════════════════════════════════════════════════════════

    async _onAnalyseAll() {
        var self = this;
        // Reset programme filter
        this._activeProgramme = null;
        if (this._progSelect) this._progSelect.value = '';

        // Read current params
        this._courseCode = this._courseInput.value || this._courseCode;
        this._year = parseInt(this._yearSelect.value, 10) || this._year;

        // Update header info
        if (this._headerInfo) {
            this._headerInfo.textContent = this._courseCode + ' | ' + this._year;
        }

        // Show loading in dashboard tab
        if (this._tabPanels.dashboard) {
            this._tabPanels.dashboard.innerHTML = '<div class="cv-loading"><i class="fas fa-spinner fa-spin cv-loading-icon"></i><div class="cv-loading-text">Analysing ' + this._courseCode + ' ' + this._year + '...</div><div id="cv-analyse-status" class="cv-loading-sub">Connecting</div></div>';
        }

        // Authenticate
        try {
            this._setStatus('Authenticating...', 'warning');
            await this._authenticate();
            this._setStatus('Connected', 'success');
        } catch (err) {
            this._setStatus('Auth Failed', 'danger');
        }

        // Load real API data — fall back to seed demo data when API unavailable
        await this._loadApiData();

        this._publome = ClassViewSchema.create();
        if (this._courseResults && this._courseResults.length > 0) {
            // Seed from real API data
            ClassViewSeed.seed(this._publome, {
                courseResults: this._courseResults,
                demoData: this._demoData,
                assessStats: this._demoData ? [{ code: 'all', name: 'All Assessments', count: this._demoData.assessments }] : [],
                panels: Object.keys(this._panels)
            });
        } else {
            // API unavailable — use standalone demo data
            ClassViewSeed.seedDemo(this._publome);
            this._courseResults = this._publome.table('student').all();
            this._demoData = { totalStudents: 10, avgMark: 63.5, passRate: 70, atRisk: 3, attendance: 82, assessments: 4, missingMarks: 0, dpExclusions: 0 };
            this._dataLoaded = true;
            this._setStatus('Demo Mode', 'warning');
        }

        this._renderKPIs(this._kpiRow);
        this._updateQuickStats();
        this._renderHealthSummary(this._healthEl);
        this._renderAlertsSidebar(this._alertsEl);

        // Clean up old panel control divs from the sidebar
        Object.keys(this._panelControlEls).forEach(function(k) {
            var div = self._panelControlEls[k];
            if (div.parentNode) div.parentNode.removeChild(div);
        });
        this._panelControlEls = {};
        this._panels = {};

        // Reset tab cache and render active tab
        var keys = Object.keys(this._tabRendered);
        for (var i = 0; i < keys.length; i++) this._tabRendered[keys[i]] = false;
        this._onTabChange(this._activeTab);

        // Broadcast to bus-connected panels
        this._bus.emit('load', { courseCode: this._courseCode, year: this._year });

        if (typeof log === 'function') log('ClassViewConnect', 'Analysed ' + this._courseCode + ' ' + this._year);

        // Audit log the analysis action
        if (typeof AuditService !== 'undefined') {
            try {
                var audit = new AuditService();
                audit.logAction({ action: 'analyseAll', category: 'classview', detail: this._courseCode + ' ' + this._year });
            } catch (e) { /* audit not available */ }
        }
    }

    async _authenticate() {
        if (window.AS_SESSION && window.AS_SESSION.ready) {
            this.sessionId = window.AS_SESSION.sessionId;
            this.logToken = window.AS_SESSION.logToken;
            return;
        }
        var creds = (window.AS_CREDENTIALS && window.AS_CREDENTIALS.api && window.AS_CREDENTIALS.api.sessionBypass) || {};
        if (!creds.userId) throw new Error('No credentials');
        var response = await fetch(this._endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logIn', userId: creds.userId, pwd: creds.password })
        });
        var data = await response.json();
        if (data && data.status !== false && (data.sessionId || data.session_id)) {
            this.sessionId = data.sessionId || data.session_id;
            this.logToken = data.logToken || data.log_token;
            if (!window.AS_SESSION) window.AS_SESSION = {};
            window.AS_SESSION.sessionId = this.sessionId;
            window.AS_SESSION.logToken = this.logToken;
            window.AS_SESSION.ready = true;
            return;
        }
        throw new Error(data && data.error ? data.error : 'Auth failed');
    }

    _setStatus(label, color) {
        if (this._statusBadge) this._statusBadge.update({ label: label, color: color });
    }

    async _apiCall(action, params) {
        var body = { action: action };
        var keys = Object.keys(params || {});
        for (var i = 0; i < keys.length; i++) body[keys[i]] = params[keys[i]];
        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.logToken) body.logToken = this.logToken;
        var response = await fetch(this._endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    }

    _parseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;
        if (data.fields && Array.isArray(data.data)) return this._fieldsDataToRecords(data.fields, data.data);
        if (data.results && data.results.fields && Array.isArray(data.results.data)) return this._fieldsDataToRecords(data.results.fields, data.results.data);
        if (Array.isArray(data.results)) return data.results;
        var wrapKeys = ['students', 'registrations', 'courseResults', 'assessmentResults', 'studentBioData', 'courseMeta', 'courseCounts'];
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
            return f === f.toUpperCase() && f.length > 1
                ? f.toLowerCase().replace(/_([a-z])/g, function(_, c) { return c.toUpperCase(); })
                : f;
        });
        return data.map(function(row) {
            var record = {};
            normalized.forEach(function(field, i) { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // KPI ROW (persistent)
    // ══════════════════════════════════════════════════════════════════════════

    _renderKPIs(parent) {
        parent.innerHTML = '';
        this._kpiBindingRefs = [];

        var heroDefs = [
            { code: 'students', label: 'Enrolled Students', icon: 'fas fa-users',        iconColor: 'var(--ui-primary-400)', barClass: 'as-hero-kpi-bar-blue',  field: 'totalStudents', suffix: '' },
            { code: 'passRate', label: 'Pass Rate',          icon: 'fas fa-check-double', iconColor: '#22c55e',               barClass: 'as-hero-kpi-bar-green', field: 'passRate',      suffix: '%' },
            { code: 'avgMark',  label: 'Class Average',      icon: 'fas fa-chart-bar',    iconColor: 'var(--as-gold-50)',     barClass: 'as-hero-kpi-bar-gold',  field: 'avgMark',       suffix: '%' }
        ];

        if (!this._dataLoaded) {
            // Skeleton shimmer placeholders
            heroDefs.forEach(function() {
                var skel = document.createElement('div');
                skel.className = 'as-skeleton as-skeleton-hero';
                parent.appendChild(skel);
            });
            return;
        }

        var d = this._demoData || {};
        var self = this;

        heroDefs.forEach(function(h) {
            var card = document.createElement('div');
            card.className = 'as-hero-kpi';

            var label = document.createElement('div');
            label.className = 'as-hero-kpi-label';
            label.innerHTML = '<i class="' + h.icon + '" style="color:' + h.iconColor + '"></i> ' + h.label;
            card.appendChild(label);

            var valueRow = document.createElement('div');
            valueRow.className = 'as-hero-kpi-value-row';

            var valueEl = document.createElement('div');
            valueEl.className = 'as-hero-kpi-value';
            var rawVal = d[h.field];
            valueEl.textContent = (rawVal != null ? rawVal : '\u2014') + h.suffix;
            valueRow.appendChild(valueEl);

            card.appendChild(valueRow);

            var bar = document.createElement('div');
            bar.className = 'as-hero-kpi-bar ' + h.barClass;
            card.appendChild(bar);

            parent.appendChild(card);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // QUICK STATS (sidebar mini-grid)
    // ══════════════════════════════════════════════════════════════════════════

    _updateQuickStats() {
        if (!this._quickStatsGrid) return;
        var d = this._demoData || {};
        var loaded = this._dataLoaded;
        var stats = [
            { label: 'Enrolled', value: loaded ? String(d.totalStudents || 0) : '\u2014' },
            { label: 'Pass Rate', value: loaded ? (d.passRate || 0) + '%' : '\u2014', color: loaded && parseFloat(d.passRate) >= 70 ? '#16a34a' : (loaded ? '#dc2626' : null) },
            { label: 'At Risk', value: loaded ? String(d.atRisk || 0) : '\u2014', color: loaded && d.atRisk > 5 ? '#dc2626' : null },
            { label: 'Attend.', value: loaded && d.attendance != null ? d.attendance + '%' : '\u2014' },
            { label: 'Assess.', value: loaded && d.assessments != null ? String(d.assessments) : '\u2014' },
            { label: 'Class Avg', value: loaded ? (d.avgMark || 0) + '%' : '\u2014', color: loaded ? 'var(--ui-primary-600)' : null }
        ];
        this._quickStatsGrid.innerHTML = stats.map(function(s) {
            var valStyle = s.color ? ' style="color:' + s.color + '"' : '';
            return '<div class="as-quick-stat">' +
                '<div class="as-quick-stat-value"' + valStyle + '>' + s.value + '</div>' +
                '<div class="as-quick-stat-label">' + s.label + '</div>' +
            '</div>';
        }).join('');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: DASHBOARD
    // ══════════════════════════════════════════════════════════════════════════

    _renderDashboardTab(el) {
        var wrap = document.createElement('div');
        wrap.className = 'cv-wrap-pad';
        el.appendChild(wrap);

        // Alert banner
        var d = this._demoData;
        if (d.atRisk > 5 || parseFloat(d.passRate) < 70) {
            var alertText = [];
            if (d.atRisk > 5) alertText.push(d.atRisk + ' at-risk students');
            if (parseFloat(d.passRate) < 70) alertText.push('Pass rate at ' + d.passRate + '%');
            var alertWrap = document.createElement('div');
            alertWrap.className = 'cv-mb-md';
            wrap.appendChild(alertWrap);
            new uiAlert({ color: 'warning', title: 'Attention Required', message: alertText.join(' \u2022 '), parent: alertWrap });
        }

        // 2x2 grid: Distribution + Grade Bands / At-Risk + Programme
        var grid = document.createElement('div');
        grid.className = 'cv-dash-2col';
        wrap.appendChild(grid);

        this._renderDistribution(grid);
        this._renderGradeBands(grid);
        this._renderAtRisk(grid);
        this._renderProgrammeBreakdown(grid);
    }

    // ── Dashboard: Grade Distribution (SVG histogram) ────────────────────

    _renderDistribution(parent) {
        var card = this._dashCard(parent, 'chart-bar', 'Grade Distribution');

        var students = this._publome.table('student').all();
        var marks = [];
        students.forEach(function(s) {
            var m = parseFloat(s.get('finalMark') || 0);
            if (m > 0) marks.push(m);
        });

        if (marks.length === 0) {
            card.innerHTML = '<div class="ex-col-stack" style="padding:1rem;text-align:center;color:var(--ui-gray-400);"><i class="fas fa-chart-bar" style="font-size:1.5rem;margin-bottom:0.3rem;"></i>No mark data available</div>';
            return;
        }

        // Hero stat row: mean + SD + n
        var sum = marks.reduce(function(a, b) { return a + b; }, 0);
        var mean = sum / marks.length;
        var variance = marks.reduce(function(a, m) { return a + (m - mean) * (m - mean); }, 0) / marks.length;
        var sd = Math.sqrt(variance);
        var heroHtml = '<div class="cv-dash-stat-row">';
        heroHtml += '<div><span class="cv-dash-hero">' + Math.round(mean * 10) / 10 + '<span class="cv-dash-hero-unit">%</span></span><div class="cv-dash-subtitle">Class Mean</div></div>';
        heroHtml += '<div><span class="cv-dash-hero" style="font-size:var(--ui-text-lg);">' + Math.round(sd * 10) / 10 + '</span><div class="cv-dash-subtitle">\u03C3 Std Dev</div></div>';
        heroHtml += '<div><span class="cv-dash-hero" style="font-size:var(--ui-text-lg);">' + marks.length + '</span><div class="cv-dash-subtitle">Students</div></div>';
        heroHtml += '</div>';

        // Build 10-mark-wide bins (0-9, 10-19, ..., 90-100)
        var bins = [];
        for (var b = 0; b < 10; b++) {
            bins.push({ from: b * 10, to: (b + 1) * 10, count: 0 });
        }
        marks.forEach(function(m) {
            var idx = Math.min(Math.floor(m / 10), 9);
            bins[idx].count++;
        });

        var W = 420, H = 180;
        var pad = { left: 35, right: 10, top: 10, bottom: 28 };
        var cW = W - pad.left - pad.right;
        var cH = H - pad.top - pad.bottom;
        var maxCount = Math.max.apply(null, bins.map(function(b) { return b.count; }).concat([1]));
        var barW = cW / bins.length;

        var svg = heroHtml;
        svg += '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:420px;height:auto;display:block;">';

        // Bars colored by zone: red <50, amber 50-59, green 60+
        bins.forEach(function(bin, i) {
            var barH = (bin.count / maxCount) * cH;
            var x = pad.left + i * barW;
            var y = pad.top + cH - barH;
            var midPoint = bin.from + 5;
            var fill = midPoint >= 60 ? 'var(--ex-clr-success)' : midPoint >= 50 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
            svg += '<rect x="' + (x + 1) + '" y="' + y + '" width="' + (barW - 2) + '" height="' + barH + '" fill="' + fill + '" opacity="0.75" rx="1"/>';
            if (bin.count > 0) {
                svg += '<text x="' + (x + barW / 2) + '" y="' + (y - 3) + '" font-size="8" fill="var(--ui-gray-500)" text-anchor="middle">' + bin.count + '</text>';
            }
        });

        // Normal curve overlay (if >20 students)
        if (marks.length > 20 && sd > 0) {
            var n = marks.length;
            var binWidth = 10;
            var curvePath = '';
            for (var cx = 0; cx <= 100; cx++) {
                var density = Math.exp(-0.5 * Math.pow((cx - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
                var curveY = (density * n * binWidth / maxCount) * cH;
                var px = pad.left + (cx / 100) * cW;
                var py = pad.top + cH - curveY;
                curvePath += (cx === 0 ? 'M' : 'L') + px + ',' + py;
            }
            svg += '<path d="' + curvePath + '" fill="none" stroke="var(--ui-primary-900)" stroke-width="1.5" opacity="0.6"/>';
        }

        // Pass threshold line at 50%
        var threshX = pad.left + (50 / 100) * cW;
        svg += '<line x1="' + threshX + '" y1="' + pad.top + '" x2="' + threshX + '" y2="' + (pad.top + cH) + '" stroke="var(--ex-clr-danger)" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>';
        svg += '<text x="' + (threshX + 3) + '" y="' + (pad.top + 10) + '" font-size="7" fill="var(--ex-clr-danger)">Pass</text>';

        // X-axis
        var axisY = pad.top + cH;
        svg += '<line x1="' + pad.left + '" y1="' + axisY + '" x2="' + (W - pad.right) + '" y2="' + axisY + '" stroke="var(--ui-gray-200)" stroke-width="0.5"/>';
        bins.forEach(function(bin, i) {
            if (i % 2 === 0) {
                svg += '<text x="' + (pad.left + i * barW + barW / 2) + '" y="' + (H - 8) + '" font-size="8" fill="var(--ui-gray-400)" text-anchor="middle">' + bin.from + '</text>';
            }
        });
        svg += '<text x="' + (W - pad.right) + '" y="' + (H - 8) + '" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">100</text>';

        // Y-axis labels
        svg += '<text x="' + (pad.left - 4) + '" y="' + (axisY + 3) + '" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">0</text>';
        svg += '<text x="' + (pad.left - 4) + '" y="' + (pad.top + 5) + '" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">' + maxCount + '</text>';

        svg += '</svg>';

        // Legend
        svg += '<div class="ex-chart-legend">';
        svg += '<span><span class="ex-legend-swatch" style="background:var(--ex-clr-danger);"></span>Fail (&lt;50)</span>';
        svg += '<span><span class="ex-legend-swatch" style="background:var(--ex-clr-warning);"></span>Pass (50-59)</span>';
        svg += '<span><span class="ex-legend-swatch" style="background:var(--ex-clr-success);"></span>Good (60+)</span>';
        svg += '<span><span class="ex-legend-swatch-dashed" style="border-color:var(--ex-clr-danger);"></span>Pass threshold</span>';
        svg += '</div>';

        card.innerHTML = svg;
    }

    // ── Dashboard: Grade Band Summary ────────────────────────────────────

    _renderGradeBands(parent) {
        var card = this._dashCard(parent, 'layer-group', 'Grade Band Summary');

        var students = this._publome.table('student').all();
        var marks = [];
        students.forEach(function(s) {
            var m = parseFloat(s.get('finalMark') || 0);
            if (m > 0) marks.push(m);
        });

        // Hero: pass rate
        var passCount = marks.filter(function(m) { return m >= 50; }).length;
        var passRate = marks.length > 0 ? Math.round(10 * 100 * passCount / marks.length) / 10 : 0;
        var passColor = passRate >= 70 ? 'var(--ex-clr-success)' : passRate >= 50 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';

        var html = '<div class="cv-dash-stat-row">';
        html += '<div><span class="cv-dash-hero" style="color:' + passColor + ';">' + passRate + '<span class="cv-dash-hero-unit">%</span></span><div class="cv-dash-subtitle">Pass Rate</div></div>';
        html += '<div><span class="cv-dash-hero" style="font-size:var(--ui-text-lg);">' + passCount + '<span class="cv-dash-hero-unit">/ ' + marks.length + '</span></span><div class="cv-dash-subtitle">Passing</div></div>';
        html += '</div>';

        var bands = [
            { label: 'A (75+)',   min: 75, max: 101, count: 0, color: 'var(--ex-clr-success)' },
            { label: 'B (60-74)', min: 60, max: 75,  count: 0, color: 'var(--ex-clr-success)' },
            { label: 'C (50-59)', min: 50, max: 60,  count: 0, color: 'var(--ex-clr-warning)' },
            { label: 'D (40-49)', min: 40, max: 50,  count: 0, color: 'var(--ex-clr-warning)' },
            { label: 'F (<40)',   min: 0,  max: 40,  count: 0, color: 'var(--ex-clr-danger)' }
        ];
        marks.forEach(function(m) {
            for (var i = 0; i < bands.length; i++) {
                if (m >= bands[i].min && m < bands[i].max) { bands[i].count++; break; }
            }
        });

        var maxBand = Math.max.apply(null, bands.map(function(b) { return b.count; }).concat([1]));
        html += '<div class="cv-dash-section-title">Distribution by Band</div>';
        html += '<div class="ex-col-stack">';
        bands.forEach(function(band) {
            var pct = Math.round(100 * band.count / maxBand);
            var bandPct = marks.length > 0 ? Math.round(100 * band.count / marks.length) : 0;
            html += '<div class="ex-bar-row">';
            html += '<span class="ex-bar-label ex-bar-label-sm">' + band.label + '</span>';
            html += '<div class="ex-bar-track ex-bar-track-sm"><div class="ex-bar-fill" style="width:' + pct + '%;background:' + band.color + ';"></div></div>';
            html += '<span class="ex-bar-value-sm" style="width:28px;">' + band.count + '</span>';
            html += '<span class="cv-dash-detail" style="width:28px;">' + bandPct + '%</span>';
            html += '</div>';
        });
        html += '</div>';
        card.innerHTML = html;
    }

    // ── Dashboard: At-Risk Students ──────────────────────────────────────

    _renderAtRisk(parent) {
        var self = this;
        var students = this._publome.table('student').all();

        // Compute class mean and SD for z-score classification
        var allMarks = [];
        students.forEach(function(s) {
            var m = parseFloat(s.get('finalMark') || 0);
            if (m > 0) allMarks.push(m);
        });
        var mean = 0, sd = 0;
        if (allMarks.length > 0) {
            mean = allMarks.reduce(function(a, b) { return a + b; }, 0) / allMarks.length;
            var variance = allMarks.reduce(function(a, m) { return a + (m - mean) * (m - mean); }, 0) / allMarks.length;
            sd = Math.sqrt(variance);
        }

        // At-risk = z < -0.5 (0.5 SD below mean), matching RiskAssessmentPanel
        var atRisk = [];
        students.forEach(function(s) {
            var m = parseFloat(s.get('finalMark') || 0);
            if (m <= 0 || sd === 0) return;
            var z = (m - mean) / sd;
            if (z < -0.5) {
                atRisk.push({
                    studentNumber: s.get('studentNumber'),
                    firstName: s.get('firstName'),
                    lastName: s.get('lastName'),
                    mark: m,
                    z: Math.round(z * 100) / 100
                });
            }
        });
        // Worst z-scores first
        atRisk.sort(function(a, b) { return a.z - b.z; });

        var card = this._dashCard(parent, 'exclamation-triangle', 'At-Risk Students');

        // Empty state
        if (atRisk.length === 0) {
            card.innerHTML = '<div class="cv-dash-stat-row"><div><span class="cv-dash-hero" style="color:var(--ex-clr-success);">0</span><div class="cv-dash-subtitle">All students passing</div></div></div><div class="ex-col-stack" style="text-align:center;color:var(--ex-clr-success);"><i class="fas fa-check-circle" style="font-size:1rem;"></i></div>';
            return;
        }

        // Hero: at-risk count with severity breakdown
        var critical = atRisk.filter(function(s) { return s.z < -1.5; }).length;
        var danger = atRisk.filter(function(s) { return s.z >= -1.5 && s.z < -1.0; }).length;
        var warning = atRisk.length - critical - danger;
        var riskColor = critical > 0 ? 'var(--ex-clr-danger)' : danger > 0 ? 'var(--ex-clr-orange)' : 'var(--ex-clr-warning)';

        var html = '<div class="cv-dash-stat-row">';
        html += '<div><span class="cv-dash-hero" style="color:' + riskColor + ';">' + atRisk.length + '</span><div class="cv-dash-subtitle">Below -0.5\u03C3</div></div>';
        if (critical > 0) html += '<div><span class="cv-dash-hero" style="font-size:var(--ui-text-lg);color:var(--ex-clr-danger);">' + critical + '</span><div class="cv-dash-subtitle">Critical</div></div>';
        if (danger > 0) html += '<div><span class="cv-dash-hero" style="font-size:var(--ui-text-lg);color:var(--ex-clr-orange);">' + danger + '</span><div class="cv-dash-subtitle">Danger</div></div>';
        html += '</div>';

        html += '<div class="cv-dash-section-title">All At-Risk Students</div>';
        html += '<div class="ex-col-stack cv-at-risk-scroll">';
        atRisk.forEach(function(s) {
            // Color by z-band severity: z < -1.5 critical, z < -1.0 danger, else warning
            var zColor = s.z < -1.5 ? 'var(--ex-clr-danger)' : s.z < -1.0 ? 'var(--ex-clr-orange)' : 'var(--ex-clr-warning)';
            var zIcon = s.z < -1.5 ? 'fa-times-circle' : s.z < -1.0 ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
            var name = (s.firstName + ' ' + s.lastName).trim() || s.studentNumber;
            html += '<div class="cv-at-risk-row">';
            html += '<i class="fas ' + zIcon + '" style="color:' + zColor + ';font-size:0.6rem;"></i>';
            html += '<span class="cv-dash-detail" style="min-width:70px;color:var(--ui-gray-500);">' + s.studentNumber + '</span>';
            html += '<span style="flex:1;font-size:var(--ui-text-2xs);color:var(--ui-gray-700);">' + name + '</span>';
            html += '<span class="cv-dash-detail" style="margin-right:0.3rem;">z=' + s.z.toFixed(1) + '</span>';
            html += '<span style="font-weight:var(--ui-font-bold);font-size:var(--ui-text-xs);color:' + zColor + ';">' + Math.round(s.mark) + '%</span>';
            html += '</div>';
        });
        html += '</div>';

        // Legend: z-band severity
        html += '<div class="ex-chart-legend" style="margin-top:0.3rem;justify-content:center;">';
        html += '<span><span class="ex-legend-swatch" style="background:var(--ex-clr-danger);"></span>&lt; -1.5\u03C3</span>';
        html += '<span><span class="ex-legend-swatch" style="background:var(--ex-clr-orange);"></span>-1.0 to -1.5\u03C3</span>';
        html += '<span><span class="ex-legend-swatch" style="background:var(--ex-clr-warning);"></span>-0.5 to -1.0\u03C3</span>';
        html += '</div>';

        html += '</div>';
        card.innerHTML = html;
    }

    // ── Dashboard: Programme Breakdown / Assessment Overview ─────────────

    _renderProgrammeBreakdown(parent) {
        var progData = this._programmeData;

        // If >1 programme, show programme pass rates
        if (progData && progData.length > 1) {
            var card = this._dashCard(parent, 'sitemap', 'Programme Breakdown');
            var students = this._publome.table('student').all();

            // Build programme pass rates
            var progStats = [];
            var self = this;
            progData.forEach(function(p) {
                var progStudents = self._programmeStudentMap[p.code] || [];
                var passCount = 0;
                var total = 0;
                progStudents.forEach(function(sn) {
                    var student = students.find(function(s) { return s.get('studentNumber') === sn; });
                    if (student) {
                        var m = parseFloat(student.get('finalMark') || 0);
                        if (m > 0) {
                            total++;
                            if (m >= 50) passCount++;
                        }
                    }
                });
                var rate = total > 0 ? Math.round(10 * 100 * passCount / total) / 10 : 0;
                progStats.push({ code: p.code, count: p.count, passRate: rate });
            });

            // Hero: programme count
            var html = '<div class="cv-dash-stat-row">';
            html += '<div><span class="cv-dash-hero">' + progStats.length + '</span><div class="cv-dash-subtitle">Programmes</div></div>';
            // Show best & worst performing
            var sorted = progStats.slice().sort(function(a, b) { return b.passRate - a.passRate; });
            html += '<div><span class="cv-dash-hero" style="font-size:var(--ui-text-lg);color:var(--ex-clr-success);">' + sorted[0].passRate + '<span class="cv-dash-hero-unit">%</span></span><div class="cv-dash-subtitle">' + sorted[0].code + ' (best)</div></div>';
            if (sorted.length > 1) {
                var worst = sorted[sorted.length - 1];
                var worstColor = worst.passRate >= 70 ? 'var(--ex-clr-success)' : worst.passRate >= 50 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
                html += '<div><span class="cv-dash-hero" style="font-size:var(--ui-text-lg);color:' + worstColor + ';">' + worst.passRate + '<span class="cv-dash-hero-unit">%</span></span><div class="cv-dash-subtitle">' + worst.code + ' (lowest)</div></div>';
            }
            html += '</div>';

            html += '<div class="cv-dash-section-title">Pass Rate by Programme</div>';
            html += '<div class="ex-col-stack">';
            progStats.forEach(function(p) {
                var rateColor = p.passRate >= 70 ? 'var(--ex-clr-success)' : p.passRate >= 50 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
                html += '<div class="ex-bar-row">';
                html += '<span class="ex-bar-label" style="width:75px;">' + p.code + '</span>';
                html += '<div class="ex-bar-track ex-bar-track-sm"><div class="ex-bar-fill" style="width:' + p.passRate + '%;background:' + rateColor + ';"></div></div>';
                html += '<span class="ex-bar-value-sm" style="width:42px;">' + p.passRate + '%</span>';
                html += '</div>';
                html += '<div class="cv-dash-detail" style="margin:-0.2rem 0 0.15rem 80px;">' + p.count + ' students</div>';
            });
            html += '</div>';
            card.innerHTML = html;
            return;
        }

        // Fallback: Assessment Overview (when single or no programme)
        var card = this._dashCard(parent, 'clipboard-list', 'Assessment Overview');
        var assessments = this._publome.table('assessment').all();

        if (assessments.length === 0) {
            card.innerHTML = '<div class="cv-dash-stat-row"><div><span class="cv-dash-hero" style="color:var(--ui-gray-300);">0</span><div class="cv-dash-subtitle">No assessment data</div></div></div>';
            return;
        }

        // Hero: assessment count
        var html = '<div class="cv-dash-stat-row">';
        html += '<div><span class="cv-dash-hero">' + assessments.length + '</span><div class="cv-dash-subtitle">Assessments</div></div>';
        html += '</div>';

        html += '<div class="cv-dash-section-title">Mean by Assessment</div>';
        html += '<div class="ex-col-stack">';
        assessments.forEach(function(a) {
            var mean = parseFloat(a.get('mean') || 0);
            var meanColor = mean >= 60 ? 'var(--ex-clr-success)' : mean >= 50 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
            var name = a.get('name') || a.get('code');
            html += '<div class="ex-bar-row">';
            html += '<span class="ex-bar-label" style="width:90px;">' + name + '</span>';
            html += '<div class="ex-bar-track ex-bar-track-sm"><div class="ex-bar-fill" style="width:' + mean + '%;background:' + meanColor + ';"></div></div>';
            html += '<span class="ex-bar-value-sm" style="width:36px;">' + Math.round(mean) + '%</span>';
            html += '</div>';
        });
        html += '</div>';
        card.innerHTML = html;
    }

    _dashCard(parent, icon, title) {
        var cardTitle = '<i class="fas fa-' + icon + '" style="margin-right:0.3rem;"></i>' + title;
        var cardComponent = new uiCard({ title: cardTitle, size: 'sm', parent: parent });
        // Return the body element for content to be appended into
        var body = cardComponent.el.querySelector('.ui-card-body');
        if (!body) {
            body = document.createElement('div');
            cardComponent.el.appendChild(body);
        }
        return body;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: PANEL DELEGATE
    // ══════════════════════════════════════════════════════════════════════════

    _renderPanelTab(key, el) {
        var self = this;
        var pm = ClassViewConnect.PANEL_MAP[key];
        if (!pm) return;

        // Resolve panel class via registry, then window fallback
        var PanelClass = ClassViewConnect.PANEL_CLASSES[pm.cls] || window[pm.cls];
        if (!PanelClass) {
            el.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--ui-gray-400);"><i class="fas fa-puzzle-piece" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>' + pm.cls + ' not loaded.</div>';
            return;
        }

        // Create a real controlEl div inside the sidebar, initially hidden
        var panelControlDiv = document.createElement('div');
        panelControlDiv.style.display = 'none';
        this._contextControlEl.appendChild(panelControlDiv);
        this._panelControlEls[key] = panelControlDiv;

        // Create a container for the panel's stage content
        var container = document.createElement('div');
        container.className = 'cv-panel-container';
        el.appendChild(container);

        // Instantiate and render with real controlEl + real stageEl
        var panel = new PanelClass({
            courseCode: this._courseCode,
            year: this._year,
            endpoint: this._endpoint,
            embedded: true
        });
        panel._busKey = pm.busKey;
        if (typeof panel.setPublome === 'function') {
            panel.setPublome(this._publome);
        }
        panel.render(panelControlDiv, container);

        // Bind MessagesService to any panel that supports it
        if (typeof panel.bindMessenger === 'function' && typeof MessagesService !== 'undefined') {
            try {
                panel.bindMessenger(new MessagesService());
            } catch (e) {
                if (typeof log === 'function') log('ClassViewConnect', 'MessagesService bind failed for ' + key + ': ' + e.message);
            }
        }

        // Bind TagService where panel supports it
        if (typeof panel.bindTagger === 'function' && typeof TagService !== 'undefined') {
            try {
                panel.bindTagger(new TagService());
            } catch (e) {
                if (typeof log === 'function') log('ClassViewConnect', 'TagService bind failed for ' + key + ': ' + e.message);
            }
        }

        // Bind AuditService where panel supports it
        if (typeof panel.bindAuditor === 'function' && typeof AuditService !== 'undefined') {
            try {
                panel.bindAuditor(new AuditService());
            } catch (e) {
                if (typeof log === 'function') log('ClassViewConnect', 'AuditService bind failed for ' + key + ': ' + e.message);
            }
        }

        // Connect bus if supported
        if (pm.hasBus && typeof panel.connectBus === 'function') {
            panel.connectBus(this._bus);
        }

        this._panels[key] = panel;

        // Show this panel's sidebar controls
        this._renderContextControls();

        // If data already loaded, trigger load directly on this panel only
        // (NOT via bus.emit which would cascade-reload all connected panels)
        if (this._dataLoaded && typeof panel.load === 'function') {
            var loadParams = { courseCode: this._courseCode, year: this._year };
            if (this._activeProgramme && this._programmeStudentMap[this._activeProgramme]) {
                loadParams.studentNumber = this._programmeStudentMap[this._activeProgramme];
            }
            var loadResult = panel.load(loadParams);
            // Re-check sidebar controls after async load completes
            if (loadResult && typeof loadResult.then === 'function') {
                loadResult.then(function() { self._renderContextControls(); });
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB: ABOUT
    // ══════════════════════════════════════════════════════════════════════════

    _renderAboutTab(el) {
        var wrap = document.createElement('div');
        wrap.className = 'as-stage-about';
        wrap.style.cssText = 'padding:1rem;max-width:960px;'; // about layout - needs max-width
        el.appendChild(wrap);
        this._renderAboutOverview(wrap);
        this._renderAboutFeatureGuide(wrap);
        this._renderAboutApiIntegration(wrap);
        this._renderAboutDevPlan(wrap);
        this._renderAboutDeepReview(wrap);
        this._renderAboutLegacyComponents(wrap);
    }

    _renderAboutOverview(parent) {
        var card = this._aboutCard(parent, 'info-circle', 'ClassView Connect Dashboard');
        var sections = [
            {
                heading: 'Purpose',
                text: 'A unified class-level analytics dashboard for lecturers. Aggregates 8 analysis panels under a single interface with shared parameters, eliminating the need to configure course code and year separately in each panel.'
            },
            {
                heading: 'Scope',
                text: 'Risk assessment, class roster management, gradebook analytics, attendance and DP tracking, historical performance trends, peer course correlation, class analytics, and quick polls \u2014 all connected through a shared EventBus.'
            },
            {
                heading: 'How to Use',
                text: 'Enter a course code and select an academic year in the Parameters panel, then click Analyse All. All connected panels receive the parameters simultaneously. Switch between tabs to explore different aspects of the class. The persistent KPI row provides at-a-glance metrics across all views.'
            }
        ];
        sections.forEach(function(s) {
            var h = document.createElement('div');
            h.className = 'cv-about-heading';
            h.textContent = s.heading;
            card.appendChild(h);
            var p = document.createElement('div');
            p.className = 'cv-about-text';
            p.textContent = s.text;
            card.appendChild(p);
        });
    }

    _renderAboutFeatureGuide(parent) {
        var card = this._aboutCard(parent, 'map-signs', 'Feature Guide');
        var features = [
            {
                tab: 'Dashboard',
                icon: 'tachometer-alt',
                what: 'Overview of class health with KPI cards, quick navigation to all panels, panel status summary, and connection information.',
                metrics: 'Total students, average mark, pass rate, at-risk count, attendance percentage, assessment count.',
                interpret: 'Use as a starting point to identify which specific analysis tab to drill into. Green status dots indicate active panels.',
                actions: 'Click any panel card to navigate directly. Share the KPI snapshot with department heads.'
            },
            {
                tab: 'Risk Assessment',
                icon: 'exclamation-triangle',
                what: 'Multi-factor risk scoring for each student based on marks, attendance, assignment completion, and engagement.',
                metrics: 'Individual risk scores, risk category distribution (high/medium/low), composite risk factors.',
                interpret: 'Students in the red zone need immediate intervention. Yellow students should be monitored. Risk factors show which areas contribute most.',
                actions: 'Prioritise at-risk student consultations. Flag students for academic support referral. Track intervention effectiveness over time.'
            },
            {
                tab: 'Class Roster',
                icon: 'users',
                what: 'Complete student list with demographics, contact details, and quick-access to individual performance profiles.',
                metrics: 'Student count, demographic breakdown, contact completeness, registration status.',
                interpret: 'Use for class communication, grouping, and individual student lookup. Incomplete contact details indicate data quality issues.',
                actions: 'Export roster for communication tools. Group students for tutorial allocation. Verify registration status.'
            },
            {
                tab: 'Gradebook',
                icon: 'clipboard-check',
                what: 'Full assessment matrix with inline editing, per-assessment statistics, distribution charts, and final mark calculations.',
                metrics: 'Per-assessment averages, pass/fail counts, grade distributions, missing marks, weight allocations.',
                interpret: 'Low assessment averages may indicate content difficulty or assessment design issues. Bimodal distributions suggest disparate student groups.',
                actions: 'Identify assessments needing moderation. Edit marks inline. Export grade sheets. Review weight allocations.'
            },
            {
                tab: 'Attendance & DP',
                icon: 'calendar-check',
                what: 'Session-level attendance tracking, live check-in with PIN codes, and DP (Duly Performed) eligibility calculation.',
                metrics: 'Per-session attendance rates, cumulative attendance per student, DP threshold status, check-in completion.',
                interpret: 'Students below the DP threshold are at risk of exclusion from exams. Declining attendance trends need early intervention.',
                actions: 'Run live check-ins during class. Flag DP-at-risk students for counselling. Export attendance reports.'
            },
            {
                tab: 'Historical',
                icon: 'chart-line',
                what: 'Multi-year trend analysis showing how this course has performed over time with year-over-year comparison.',
                metrics: 'Year-over-year pass rates, enrollment trends, average marks, grade distributions by year.',
                interpret: 'Sustained declining trends indicate systemic issues. Improvements should correlate with recorded interventions.',
                actions: 'Correlate changes with curriculum modifications. Report trends in programme reviews. Benchmark against departmental averages.'
            },
            {
                tab: 'Peer Correlation',
                icon: 'balance-scale',
                what: 'Cross-course comparison showing how students in this class perform in peer courses taken concurrently.',
                metrics: 'Correlation coefficients, shared student overlap, relative performance comparison, outlier identification.',
                interpret: 'Strong positive correlation suggests shared factors. Negative correlation may indicate competing workloads. Outliers need individual review.',
                actions: 'Coordinate assessments with correlated courses. Identify students struggling across multiple courses. Review workload balance.'
            },
            {
                tab: 'Analytics',
                icon: 'chart-bar',
                what: 'Deep statistical analysis with distribution charts, performance segmentation, and predictive indicators.',
                metrics: 'Distribution skewness, quartile analysis, performance gaps, engagement scores, predicted outcomes.',
                interpret: 'Normal distributions suggest fair assessment. Left-skewed distributions indicate most students are achieving well. Right-skewed needs review.',
                actions: 'Use analytics to inform assessment design. Present data in teaching reviews. Guide curriculum adjustments.'
            },
            {
                tab: 'Quick Polls',
                icon: 'poll',
                what: 'In-class polling tool for real-time student engagement, comprehension checks, and feedback collection.',
                metrics: 'Response rates, response distribution, time-to-respond, comprehension scores.',
                interpret: 'Low response rates indicate engagement issues. Wrong-heavy responses indicate content not yet understood.',
                actions: 'Launch polls during lectures for comprehension checks. Use anonymous polls for sensitive feedback. Review trends across sessions.'
            }
        ];
        features.forEach(function(f) {
            var section = document.createElement('div');
            section.className = 'cv-section-pad';
            var title = document.createElement('div');
            title.style.cssText = 'font-size:0.7rem;font-weight:700;color:var(--ui-gray-700);margin-bottom:0.4rem;display:flex;align-items:center;gap:0.3rem;';
            title.innerHTML = '<i class="fas fa-' + f.icon + '" style="color:var(--ui-primary-500);font-size:0.65rem;"></i>' + f.tab;
            section.appendChild(title);
            var g = document.createElement('div');
            g.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;';
            var cells = [
                { label: 'What it Shows', text: f.what },
                { label: 'Key Metrics', text: f.metrics },
                { label: 'How to Interpret', text: f.interpret },
                { label: 'Recommended Actions', text: f.actions }
            ];
            cells.forEach(function(c) {
                var cell = document.createElement('div');
                cell.style.cssText = 'background:var(--ui-gray-50);border-radius:4px;padding:0.35rem 0.4rem;';
                cell.innerHTML = '<div style="font-size:0.6rem;font-weight:600;color:var(--ui-primary-600);margin-bottom:0.15rem;">' + c.label + '</div><div style="font-size:0.65rem;color:var(--ui-gray-600);line-height:1.4;">' + c.text + '</div>';
                g.appendChild(cell);
            });
            section.appendChild(g);
            card.appendChild(section);
        });
    }

    _renderAboutApiIntegration(parent) {
        var card = this._aboutCard(parent, 'plug', 'API Integration');
        var endpoints = [
            { feature: 'Authentication',            endpoint: 'logIn',                  status: 'live' },
            { feature: 'Course enrollment',          endpoint: 'getCourseCounts',        status: 'live' },
            { feature: 'Course results',             endpoint: 'getCourseResults',       status: 'live' },
            { feature: 'Student roster',             endpoint: 'getCourseStudents',      status: 'live' },
            { feature: 'Assessment results',          endpoint: 'getAssessmentResults',   status: 'live' },
            { feature: 'Attendance records',          endpoint: 'getAttendance',          status: 'planned' },
            { feature: 'DP status',                  endpoint: 'getDPStatus',            status: 'planned' },
            { feature: 'Historical results',          endpoint: 'getCourseResults (multi-year)', status: 'derived' },
            { feature: 'Peer course mapping',        endpoint: 'getPeerCourses',         status: 'planned' },
            { feature: 'Risk factor calculation',    endpoint: 'N/A (client-side)',      status: 'derived' },
            { feature: 'Real-time polling',           endpoint: 'N/A',                    status: 'missing' },
            { feature: 'Engagement analytics',       endpoint: 'N/A',                    status: 'missing' }
        ];

        new uiTable({
            template: 'compact',
            columns: [
                { key: 'feature', label: 'Feature' },
                { key: 'endpoint', label: 'Endpoint' },
                { key: 'status', label: 'Status' }
            ],
            data: endpoints,
            paging: false,
            searching: false,
            ordering: false,
            info: false,
            buttons: false,
            colVisibility: false,
            parent: card
        });

        // Data flow note
        var flow = document.createElement('div');
        flow.style.cssText = 'margin-top:0.6rem;padding:0.4rem 0.5rem;background:var(--ui-gray-50);border-radius:4px;';
        flow.innerHTML = '<div style="font-size:0.6rem;font-weight:600;color:var(--ui-gray-700);margin-bottom:0.2rem;">Data Flow</div><div style="font-size:0.65rem;color:var(--ui-gray-600);font-family:monospace;">instApi \u2192 api-proxy \u2192 ClassViewConnect (KPIs) + EventBus \u2192 Sub-panels</div><div style="font-size:0.6rem;color:var(--ui-gray-400);margin-top:0.15rem;">KPI row uses live getCourseResults + getAssessmentResults. Risk panel authenticates and fetches independently via EventBus load event.</div>';
        card.appendChild(flow);
    }

    _renderAboutDevPlan(parent) {
        var card = this._aboutCard(parent, 'rocket', 'Development Plan');

        // Completed section
        var compTitle = document.createElement('div');
        compTitle.style.cssText = 'font-size:0.7rem;font-weight:700;color:var(--ui-success);margin-bottom:0.4rem;display:flex;align-items:center;gap:0.3rem;';
        compTitle.innerHTML = '<i class="fas fa-check-circle"></i>Completed';
        card.appendChild(compTitle);

        var completed = [
            'Unified ClassView Connect panel with 10 tabs (Dashboard + 8 analysis + About)',
            'Shared parameters (course code + year) with single Analyse All button',
            'Persistent KPI row visible across all tabs',
            'Health summary and alerts in sidebar accordion',
            'Lazy tab rendering with cache invalidation on re-analyse',
            'EventBus-based data broadcasting to bus-connected sub-panels',
            'Dashboard overview with quick navigation, class summary, and panel status',
            'Panel delegate pattern: sub-panels render their stage content while ClassView owns the sidebar',
            'Comprehensive About documentation with feature guide and API status',
            'Authentication flow with auto-login fallback to demo mode',
            'bindMessenger() capability \u2014 MessagesService bound to all supporting panels',
            'Real controlEl for panel sidebar controls \u2014 context-sensitive sidebar accordion',
            'Panel Controls accordion with show/hide per active tab',
            'KPI row, dashboard cards, and alerts migrated to curated ui components (uiCard, uiAlert)',
            'API Integration table migrated to uiTable component',
            'TagService + AuditService wired to panels supporting bindTagger/bindAuditor',
            'Audit logging for analyseAll action',
            'Live DUT API data \u2014 KPIs from getCourseResults + getAssessmentResults',
            'Risk panel fetches real student data with z-score analysis via EventBus load',
            'Gradebook panel full API integration \u2014 connectBus + load from DUT API with grade grid',
            'Roster panel loaded stage \u2014 KPI summary cards + top/bottom performer tables',
            'Loading indicators with live status text for Risk, Roster, and Gradebook panels',
            'Per-panel direct load \u2014 fixed cascading bus.emit to panel-specific panel.load()',
            'Manual input/select helpers replaced with ui-classed components',
            'Playwright test suite — 30 tests across 12 groups (hub, data, dashboard, risk, roster, gradebook, historical, peer, analytics, about, smoke, screenshots)',
            'Deep review plan with literature survey, 5-phase improvement roadmap, and UI priorities'
        ];
        completed.forEach(function(item) {
            var row = document.createElement('div');
            row.className = 'cv-check-item';
            row.innerHTML = '<i class="fas fa-check" style="color:var(--ui-success);font-size:0.55rem;margin-top:0.15rem;width:10px;flex-shrink:0;"></i><span style="color:var(--ui-gray-600);">' + item + '</span>';
            card.appendChild(row);
        });

        // Remaining section
        var remTitle = document.createElement('div');
        remTitle.style.cssText = 'font-size:0.7rem;font-weight:700;color:var(--ui-warning);margin:0.75rem 0 0.4rem;display:flex;align-items:center;gap:0.3rem;';
        remTitle.innerHTML = '<i class="fas fa-clock"></i>Remaining / Recommendations';
        card.appendChild(remTitle);

        var remaining = [
            { title: 'Attendance API integration',              status: 'planned',  description: 'Wire getAttendance endpoint for KPI attendance metric (currently shows dash).' },
            { title: 'ConnectBus for Attendance + Polls',       status: 'planned',  description: 'Add connectBus() support to AttendanceDPPanel and QuickPollsPanel (Gradebook done).' },
            { title: 'Migrate remaining manual DOM to ui components', status: 'in-progress', description: 'Health summary, about card builder, and feature guide sections still use manual DOM.' },
            { title: 'Add bindTagger() panel support',         status: 'wired',    description: 'TagService wired to all panels \u2014 pending panel-level bindTagger() methods.' },
            { title: 'Add bindAuditor() panel support',        status: 'wired',    description: 'AuditService wired to all panels \u2014 pending panel-level bindAuditor() methods.' },
            { title: 'Export/reporting functionality',          status: 'concept',  description: 'PDF/CSV export of class reports, KPI snapshots, and assessment summaries.' },
            { title: 'Programme-level drill-down',              status: 'concept',  description: 'Navigate from ClassView to Programme Analyst for programme-level context.' },
            { title: 'Publome data layer for student/result data', status: 'concept', description: 'Replace demo data with Publome + PublonTable for reactive data management.' },
            { title: 'UIBinding for reactive KPI updates',     status: 'concept',  description: 'Use UIBinding.bindMetric() for auto-updating KPI cards from data changes.' },
            { title: 'Real-time data refresh',                  status: 'concept',  description: 'Periodic polling or WebSocket for live updates during class sessions.' },
            { title: 'Mobile-responsive layout',                status: 'concept',  description: 'Tablet-optimised layout for in-classroom use by lecturers.' },
            { title: 'Registration Checker panel (port)',       status: 'done',  description: 'Ported as RegistrationCheckPanel. Two-phase flow: load students by course, then check prerequisite rules (courseCode + minMark). Max-result dedup, student\u00d7course matrix transpose, per-student pass/fail evaluation. Sidebar accordion with Parameters, Prerequisite Rules, Quick Stats, and Logic Evaluator (Phase 2). Paginated results table with filter badges and row-click detail panel.' },
            { title: 'Risk-based messaging (port)',             status: 'planned',  description: 'Port legacy RiskAlertIntegration (lines 1197\u20131327). Assessment-based risk categorisation using one-hot transpose matrix + z-score thresholds. Template messages for high/average/low performers. Integrate into existing Risk panel as messaging sub-section.' },
            { title: 'Course Messenger panel (port)',           status: 'planned',  description: 'Port legacy AutoScholarMessenger (lines 1078\u20131509). Rich HTML email composer with template library, student selector with bulk "add all current students" action, Messenger service integration, and sent message audit viewer with date-range search and per-day activity charts.' },
            { title: 'Course Meta Editor panel (port)',         status: 'planned',  description: 'Port legacy CourseMetaEditor (lines 26673\u201326797). Lecturer tool for managing class events via EventManager and assessment weights/dates via CRUD editor (code, label, weight%, commencement, duration, due time). Wire into a new Course Management tab or the existing Gradebook sidebar.' },
            { title: 'Registration Advisor panel (port)',       status: 'concept',  description: 'Port legacy RegistrationAdvisor (lines 10121\u201310938). Weekly timetable editor with course scheduling (lectures/tutorials/practicals), clash detection, ProgrammeEstimator integration, credit load analysis, and scenario-to-graduation planning.' },
            { title: 'Assessment Review panel (port)',          status: 'planned',  description: 'Port legacy AssessmentReview (lines 8727\u20139352). Faculty/discipline/programme-level assessment aggregation. Loads institution-wide assessment data for a year, cross-references with registrations, generates hierarchical summaries. Useful for HODs and programme coordinators.' },
            { title: 'Prerequisite Rule Editor (port)',         status: 'concept',  description: 'Port legacy RequisiteManager (lines 26504\u201326672). CRUD editor for course pre-requisite and co-requisite rules with course/assessment criterion basis and min values. Persists to ScholarCloud API. Provides the rule data that the Registration Checker consumes.' },
            { title: 'Matric Correlator panel (port)',          status: 'planned',  description: 'Port legacy MatricCorrelator (lines 9353\u20139553). Pearson R correlation between matric subjects and course performance, ranked by sample-size-weighted R. Includes ML dataset generator. Integrate into Analytics or as a new Predictors tab.' },
            { title: 'Course-Lecturer Browser (port)',          status: 'concept',  description: 'Port legacy CourseLecturerBrowser (lines 9555\u20139619). Bidirectional lookup: all courses for a staff number, or all lecturers for a course code. Useful for sidebar course selector and admin views.' },
            { title: 'Learning Content Manager (port)',         status: 'concept',  description: 'Port legacy CourseLearningContent (line 26799+). Teaching resource management for lecturers \u2014 attach and organise learning materials per course. Class exists but createUi() was commented out in legacy. Would integrate as a Resources tab or Gradebook sub-section.' }
        ];
        var statusColors = { planned: 'var(--ui-info)', concept: 'var(--ui-secondary)', wired: 'var(--ui-success)', 'in-progress': 'var(--ui-warning)' };
        var statusBgColors = { planned: 'var(--ui-info-light)', concept: 'var(--ui-secondary-light)', wired: 'var(--ui-success-light)', 'in-progress': 'var(--ui-warning-light)' };
        remaining.forEach(function(d) {
            var row = document.createElement('div');
            row.className = 'cv-remaining-item';
            var badge = '<span style="display:inline-block;padding:0.1rem 0.4rem;border-radius:9px;font-size:0.55rem;font-weight:600;white-space:nowrap;color:' + (statusColors[d.status] || 'var(--ui-gray-500)') + ';background:' + (statusBgColors[d.status] || 'var(--ui-gray-100)') + ';">' + d.status + '</span>';
            row.innerHTML = '<div style="flex:1;"><div style="font-size:0.7rem;font-weight:600;color:var(--ui-gray-700);display:flex;align-items:center;gap:0.4rem;">' + d.title + ' ' + badge + '</div><div style="font-size:0.65rem;color:var(--ui-gray-500);line-height:1.4;margin-top:0.15rem;">' + d.description + '</div></div>';
            card.appendChild(row);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DEEP REVIEW & IMPROVEMENT PLAN
    // ══════════════════════════════════════════════════════════════════════════

    _renderAboutDeepReview(parent) {
        var self = this;

        // ── Section 1: Deep Review Summary ───────────────────────────────────
        var reviewCard = this._aboutCard(parent, 'microscope', 'Deep Review — February 2026');

        var reviewIntro = document.createElement('div');
        reviewIntro.style.cssText = 'font-size:0.7rem;color:var(--ui-gray-600);line-height:1.6;margin-bottom:0.6rem;';
        reviewIntro.textContent = 'Live testing against DUT API (MGAB401, 2020) with literature review of learning analytics best practices. 102 students, 4 assessments (TM_1–TM_4), 2 programmes (BTMBA1: 94, BTMSB1: 12). Analysis covers UI improvements, functionality gaps, and research-informed innovations across 5 phases.';
        reviewCard.appendChild(reviewIntro);

        // Live test findings
        var findingsTitle = document.createElement('div');
        findingsTitle.style.cssText = 'font-size:0.7rem;font-weight:700;color:var(--ui-danger);margin:0.5rem 0 0.3rem;display:flex;align-items:center;gap:0.3rem;';
        findingsTitle.innerHTML = '<i class="fas fa-bug"></i>Critical Findings from Live Test';
        reviewCard.appendChild(findingsTitle);

        var findings = [
            { severity: 'critical', title: 'Gradebook averaging bug', detail: 'Class Mean shows 33.3% and Pass Rate 0% because TM_3/TM_4 have all zeros. Final grade averages all 4 assessments including zeros instead of only non-zero assessments. Fix: exclude zero-mark assessments from average or use weighted average based on available data.' },
            { severity: 'critical', title: 'KPI mismatch between panels', detail: 'Global KPI shows 70.2% avg (from getCourseResults final marks) but Gradebook shows 33.3% (from assessment averages with zeros). Roster shows 68.2%. Three different averages confuse users. Standardise to getCourseResults as single source of truth.' },
            { severity: 'high', title: 'Attendance panel not connected to API', detail: 'Shows "Click Load Demo Data" placeholder. No getAttendance endpoint integration. The Attendance KPI shows "—" across all views. DUT API endpoint exists but is marked "planned".' },
            { severity: 'high', title: 'Polls panel disconnected', detail: 'Shows instruction text only. No real-time polling infrastructure. No bus connectivity (hasBus: false).' },
            { severity: 'medium', title: 'Panel sidebar controls never populate', detail: 'EventBus shows 0 listeners on dashboard. Panel Controls accordion section stays at placeholder text even when data-loaded panels are active. Sub-panel controlEl divs exist but are empty for most panels.' },
            { severity: 'medium', title: 'Gradebook shows "Not loaded" in Panel Status', detail: 'GradebookPanel class is registered with window assignment pattern but PANEL_MAP resolves via window[cls] which misses ES6 class declarations. Uses eval() fallback which works but is fragile.' }
        ];
        var sevColors = { critical: 'var(--ui-danger)', high: 'var(--ui-warning-dark)', medium: 'var(--ui-warning)', low: 'var(--ui-success)' };
        var sevBgColors = { critical: 'var(--ui-danger-light)', high: 'var(--ui-warning-light)', medium: 'var(--ui-warning-light)', low: 'var(--ui-success-light)' };
        findings.forEach(function(f) {
            var row = document.createElement('div');
            row.style.cssText = 'padding:0.4rem 0;border-bottom:1px solid var(--ui-gray-100);';
            row.innerHTML = '<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.15rem;"><span style="display:inline-block;padding:0.1rem 0.35rem;border-radius:9px;font-size:0.5rem;font-weight:700;color:' + sevColors[f.severity] + ';background:' + sevBgColors[f.severity] + ';text-transform:uppercase;">' + f.severity + '</span><span style="font-size:0.7rem;font-weight:600;color:var(--ui-gray-700);">' + f.title + '</span></div><div style="font-size:0.65rem;color:var(--ui-gray-500);line-height:1.4;">' + f.detail + '</div>';
            reviewCard.appendChild(row);
        });

        // ── Section 2: Literature Review ─────────────────────────────────────
        var litCard = this._aboutCard(parent, 'book-open', 'Literature Review — Learning Analytics State of the Art');

        var litIntro = document.createElement('div');
        litIntro.style.cssText = 'font-size:0.7rem;color:var(--ui-gray-600);line-height:1.6;margin-bottom:0.6rem;';
        litIntro.textContent = 'Survey of 7 areas in learning analytics research informing the improvement plan. Sources include LAK proceedings, JISC frameworks, Georgia State GPS Advising, Open University OU Analyse, Purdue Course Signals, and recent SHAP/XAI literature.';
        litCard.appendChild(litIntro);

        var litAreas = [
            {
                area: 'Dashboard Design & Cognitive Load',
                icon: 'desktop',
                findings: 'Shneiderman\'s visual information-seeking mantra (overview → zoom → filter → details-on-demand) is the gold standard. Current ClassView follows this partially — KPI row provides overview but lacks drill-down pathways. Research shows dashboards with more than 7 KPIs cause cognitive overload (Miller\'s law). Action-oriented dashboards (Verbert et al. 2014) outperform passive data displays by 40% in user engagement.',
                implication: 'Reduce KPI row to 4 primary metrics. Add click-to-drill on each KPI. Introduce action recommendations alongside every data view.'
            },
            {
                area: 'Risk Prediction Beyond Z-Scores',
                icon: 'brain',
                findings: 'Z-score-only risk classification (current approach) has known limitations: assumes normal distributions, ignores temporal patterns, and provides no explanation of WHY a student is at risk. Georgia State GPS uses 800+ risk factors with gradient-boosted models. Course Signals (Purdue) combines 4 factor categories with instructor judgment. OU Analyse uses demographic + VLE engagement + assessment data. SHAP (SHapley Additive exPlanations) values provide transparent, per-student feature attribution.',
                implication: 'Augment z-scores with multi-factor composite risk scoring. Add SHAP-style feature importance bars showing which factors drive each student\'s risk classification. Phase in engagement metrics as data becomes available.'
            },
            {
                area: 'Early Warning Systems',
                icon: 'bell',
                findings: 'Effective EWS share 3 properties: (1) timely — alerts within 2 weeks of risk emergence, (2) actionable — each alert suggests specific interventions, (3) closed-loop — track whether interventions were applied and their outcomes. Georgia State GPS reduced time-to-graduation by 0.5 semesters. Course Signals achieved 21% improvement in B grades and above. Key innovation: traffic-light signals visible to BOTH staff and students.',
                implication: 'Build alert timeline showing risk trajectory over assessment windows. Link each alert to a recommended intervention from the PDSA cycle library. Track intervention application and correlate with subsequent performance.'
            },
            {
                area: 'Assessment Analytics (IRT & BKT)',
                icon: 'chart-bar',
                findings: 'Item Response Theory (IRT) calculates item difficulty (b) and discrimination (a) parameters per assessment question, revealing whether low scores reflect student weakness or poor question design. Bayesian Knowledge Tracing (BKT) models mastery probability over sequential assessments, distinguishing "hasn\'t learned yet" from "learned and forgot." Normalized Learning Gain (NLG = (post-pre)/(max-pre)) measures teaching effectiveness independent of starting ability.',
                implication: 'Add IRT-derived item analysis to gradebook (difficulty index, discrimination index per assessment). Add learning gain visualisation showing mastery progression across assessment windows. Flag assessments where difficulty index < 0.3 or > 0.9 for review.'
            },
            {
                area: 'Peer & Curriculum Correlation',
                icon: 'project-diagram',
                findings: 'Current Pearson-R correlation is a good start but limited. Curriculum DAG (Directed Acyclic Graph) analysis maps prerequisite chains and identifies bottleneck courses where failure cascades to downstream courses. Research shows that 15-20% of courses in a typical programme account for 60-70% of cascading failures. Cross-course workload analysis identifies assessment collision weeks where students have multiple deadlines.',
                implication: 'Extend peer correlation to show prerequisite chain impact. Add assessment calendar heatmap showing deadline collisions across correlated courses. Identify "gateway" courses where intervention has maximum downstream impact.'
            },
            {
                area: 'Engagement & Behavioral Analytics',
                icon: 'user-clock',
                findings: 'LMS engagement (login frequency, resource access, forum participation) is the strongest predictor of at-risk status — stronger than prior GPA in most studies. Engagement metrics available 3-4 weeks before assessment data. Composite engagement scores (weighted sum of login regularity, resource diversity, submission timeliness, forum activity) predict final outcomes with AUC > 0.80. Current ClassView has no engagement data integration.',
                implication: 'Design engagement score framework even without current LMS data. When Moodle/Blackboard integration becomes available, engagement scoring becomes the primary early warning signal. In the interim, use assessment submission timeliness as a proxy.'
            },
            {
                area: 'Prescriptive Analytics & Nudging',
                icon: 'lightbulb',
                findings: 'Moving from descriptive ("what happened") through predictive ("what will happen") to prescriptive ("what should we do") analytics represents the maturity trajectory. Nudge theory (Thaler & Sunstein) applied to education: small targeted interventions at decision points. Personalised study recommendations based on gap analysis. Just-in-time support triggered by behavioral signals. Research shows personalised nudges improve course completion by 12-15%.',
                implication: 'Add "Recommended Actions" panel that generates specific suggestions per student based on their risk profile. E.g., "Student X missed TM_2 and TM_3 — schedule meeting before TM_4 deadline." Automate email nudges via existing MessagesService.'
            }
        ];

        litAreas.forEach(function(la) {
            var section = document.createElement('div');
            section.className = 'cv-section-pad';
            section.innerHTML =
                '<div style="font-size:0.7rem;font-weight:700;color:var(--ui-gray-700);margin-bottom:0.3rem;display:flex;align-items:center;gap:0.3rem;"><i class="fas fa-' + la.icon + '" style="color:var(--ui-primary-500);font-size:0.65rem;"></i>' + la.area + '</div>' +
                '<div style="font-size:0.65rem;color:var(--ui-gray-600);line-height:1.5;margin-bottom:0.3rem;">' + la.findings + '</div>' +
                '<div style="font-size:0.65rem;color:var(--ui-primary-700);line-height:1.4;background:var(--ui-primary-50);padding:0.3rem 0.4rem;border-radius:4px;"><strong>Implication:</strong> ' + la.implication + '</div>';
            litCard.appendChild(section);
        });

        // ── Section 3: Phased Improvement Plan ───────────────────────────────
        var planCard = this._aboutCard(parent, 'road', 'Phased Improvement Plan');

        var phases = [
            {
                phase: 'Phase 1',
                title: 'Critical Fixes & Data Integrity',
                status: 'ready',
                timeline: '1–2 weeks',
                items: [
                    { task: 'Fix gradebook averaging bug — exclude zero-mark assessments from final calculation', priority: 'P0', test: 'Verify MGAB401 shows ~70% class mean (matching getCourseResults), not 33%' },
                    { task: 'Standardise KPI source — all panels use getCourseResults final marks as single truth', priority: 'P0', test: 'Global KPI, Roster KPI, Analytics KPI all show same average' },
                    { task: 'Fix Panel Status "Not loaded" for Gradebook — resolve ES6 class window registration', priority: 'P1', test: 'All 8 panels show green "Active" dots after Analyse All' },
                    { task: 'Wire Attendance API endpoint (getAttendance) when DUT backend implements it', priority: 'P1', test: 'Attendance KPI shows percentage instead of dash' },
                    { task: 'Add connectBus() to AttendanceDPPanel and QuickPollsPanel', priority: 'P1', test: 'Attendance and Polls panels reload when course changes' },
                    { task: 'Populate panel sidebar controls — ensure each panel\'s controlEl renders its config UI', priority: 'P2', test: 'Panel Controls accordion shows panel-specific controls when switching tabs' }
                ]
            },
            {
                phase: 'Phase 2',
                title: 'UI/UX Enhancement',
                status: 'planned',
                timeline: '2–3 weeks',
                items: [
                    { task: 'Reduce KPI row to 4 primary metrics (Students, Avg Mark, Pass Rate, At Risk) — move Attendance and Assessments to dashboard detail', priority: 'P1', test: 'KPI row fits without overflow; secondary metrics visible on dashboard' },
                    { task: 'Add click-to-drill on KPI cards — clicking "At Risk" navigates to Risk tab pre-filtered', priority: 'P1', test: 'Click each KPI card and verify navigation + filter state' },
                    { task: 'Add action recommendations to each panel — contextual "What to do" sidebar section', priority: 'P2', test: 'Each loaded panel shows at least 1 recommendation in Panel Controls' },
                    { task: 'Dashboard: Replace Quick Navigation with action-priority cards (e.g., "5 students need attention", "Assessment deadline in 3 days")', priority: 'P2', test: 'Dashboard shows actionable cards instead of static navigation grid' },
                    { task: 'Gradebook: Add per-assessment difficulty index (% students scoring >50%) and flag problematic assessments', priority: 'P2', test: 'Assessment columns show difficulty badge; low-difficulty assessments highlighted' },
                    { task: 'Risk tab: Add risk trajectory sparklines showing z-score movement across assessment windows', priority: 'P2', test: 'Each student card shows mini trend line (up/down/stable)' },
                    { task: 'Mobile-responsive layout for tablet use in classrooms', priority: 'P3', test: 'Layout works at 768px width without horizontal scroll' }
                ]
            },
            {
                phase: 'Phase 3',
                title: 'Advanced Analytics (Literature-Informed)',
                status: 'planned',
                timeline: '3–4 weeks',
                items: [
                    { task: 'Multi-factor risk scoring — composite risk from marks + submission timeliness + assessment gaps + historical performance', priority: 'P1', test: 'Risk panel shows composite score breakdown with factor weights' },
                    { task: 'SHAP-style feature importance bars — per-student visual showing which factors drive their risk category', priority: 'P1', test: 'Student detail modal shows horizontal bar chart of contributing factors' },
                    { task: 'IRT item analysis — add difficulty (p-value) and discrimination (point-biserial r) per assessment to Gradebook', priority: 'P2', test: 'Gradebook assessment headers show difficulty/discrimination badges' },
                    { task: 'Normalized Learning Gain — show mastery progression across sequential assessments (TM_1→TM_2→TM_3→TM_4)', priority: 'P2', test: 'Analytics panel shows NLG chart with class and per-student gain values' },
                    { task: 'Assessment calendar heatmap — show deadline collisions across peer courses', priority: 'P2', test: 'Peer Corr panel shows weekly heatmap of assessment load across correlated courses' },
                    { task: 'Alert timeline — early warning system showing risk trajectory with intervention markers', priority: 'P2', test: 'Risk panel timeline view shows alerts, interventions, and outcome changes' },
                    { task: 'Curriculum DAG analysis — identify prerequisite chain bottleneck courses', priority: 'P3', test: 'Peer Corr panel shows directed graph of prerequisite relationships' }
                ]
            },
            {
                phase: 'Phase 4',
                title: 'Prescriptive Analytics & Automation',
                status: 'concept',
                timeline: '4–6 weeks',
                items: [
                    { task: 'Recommended Actions panel — auto-generate per-student intervention suggestions based on risk profile and assessment pattern', priority: 'P1', test: 'Dashboard shows "Recommended Actions" card with prioritised student list and specific suggestions' },
                    { task: 'Automated nudge emails — trigger personalised messages via MessagesService when risk thresholds crossed', priority: 'P2', test: 'New at-risk student triggers draft email with pre-filled template and student variables' },
                    { task: 'Intervention tracking — log which students received interventions and correlate with subsequent performance', priority: 'P2', test: 'Risk panel shows intervention history per student with before/after marks' },
                    { task: 'Engagement score framework — design composite engagement metric (ready for LMS integration)', priority: 'P2', test: 'Analytics panel shows engagement score section (initially using submission timeliness proxy)' },
                    { task: 'Export/reporting — PDF class report with KPIs, risk summary, intervention log, and recommendations', priority: 'P2', test: 'Export button generates downloadable PDF with all sections' },
                    { task: 'Programme drill-down — navigate from ClassView to Programme Analyst for programme-level context', priority: 'P3', test: 'Click programme code in dropdown navigates to Programme Analyst filtered to that programme' }
                ]
            },
            {
                phase: 'Phase 5',
                title: 'Data Layer & Infrastructure',
                status: 'concept',
                timeline: '4–6 weeks',
                items: [
                    { task: 'Publome data layer — replace _demoData with Publome + PublonTable for reactive data management', priority: 'P1', test: 'All KPIs auto-update when Publome data changes; no manual re-render calls' },
                    { task: 'UIBinding for KPI cards — use bindMetric() for auto-updating KPI cards from data changes', priority: 'P2', test: 'KPI cards react to programme filter without explicit _renderKPIs() call' },
                    { task: 'Real-time data refresh — periodic polling for live updates during class sessions', priority: 'P3', test: 'Data refreshes every 60s during active session; new marks appear without page reload' },
                    { task: 'LMS engagement integration — connect Moodle/Blackboard API for login, resource access, forum data', priority: 'P3', test: 'Engagement score section populated with real LMS data' },
                    { task: 'Bayesian Knowledge Tracing — model mastery probability over sequential assessments per student', priority: 'P3', test: 'Student detail shows mastery probability curve with confidence intervals' }
                ]
            },
            {
                phase: 'Phase 6a',
                title: 'Legacy Lecturer Feature Ports — Registration & Prerequisites',
                status: 'planned',
                timeline: '2–3 weeks',
                items: [
                    { task: 'Port Registration Checker (legacy lines 12235\u201312429) — new Registration tab with 4 sub-panels: (1) load students by course, (2) check prerequisites against configurable min marks, (3) load programme cohort, (4) evaluate registration via logic trees', priority: 'P1', test: 'Enter course code + year, load students, filter against ENCH3RT/ENCH3MT prereqs with min 50, verify per-student pass/fail report with detailed reasoning' },
                    { task: 'Port PreRequisiteChecker (legacy lines 20482\u201320770) — standalone validator that transposes student results to studentNumber \u00d7 courseCode matrix, applies max-result deduplication, evaluates prerequisite rules. Integrate as the engine behind the Registration tab', priority: 'P1', test: 'Load 100+ students, verify matrix transpose produces correct oneHot layout, confirm max-result dedup picks highest mark per course' },
                    { task: 'Port RequisiteManager (legacy lines 26504\u201326672) — CRUD editor for course pre-requisite and co-requisite rules. Supports pre-reqs (course result or assessment result basis with min values) and co-reqs. Persists to ScholarCloud API via requisite table', priority: 'P2', test: 'Create pre-req rule for ENCH3RT min 50, save, reload, verify persisted. Create co-req, verify type-specific UI hide/show' },
                    { task: 'Port RegistrationAdvisor timetable (legacy lines 10121\u201310938) — weekly calendar editor with course scheduling (lectures/tutorials/practicals per time slot), clash detection across multiple courses, visual timetable rendering via bluiCalendar', priority: 'P2', test: 'Add MGAB401 lecture to Monday 08:00, add IBUS101 lecture to Monday 08:00, verify clash detected and displayed' },
                    { task: 'Integrate LogicEvaluator for complex prerequisite logic — AND/OR trees with nested conditions, minVal per course/assessment, visual logic editor with pass/fail evaluation per student', priority: 'P2', test: 'Define AND(ENCH3RT>=50, OR(ENCH2EF>=50, ENCH2MB>=50)), evaluate against student data, verify correct pass/fail classification' }
                ]
            },
            {
                phase: 'Phase 6b',
                title: 'Legacy Lecturer Feature Ports — Messaging & Risk Communication',
                status: 'planned',
                timeline: '2–3 weeks',
                items: [
                    { task: 'Port RiskAlertIntegration (legacy lines 1197\u20131327) — assessment-based risk categorisation using one-hot transpose matrix + z-score thresholds. Integrate into existing Risk panel as sub-section with configurable alertMin (default 50) and std deviation bounds', priority: 'P1', test: 'Load MGAB401 assessments, verify students categorised into high/average/low based on z-scores, confirm feature list matches assessment codes' },
                    { task: 'Port risk-based template messaging — configurable message templates for high/average/low performers with variable substitution ({firstName}, {courseCode}). Integrate with MessagesService for actual email sending via staff/student email suffixes', priority: 'P1', test: 'Select 3 at-risk students, choose "low" template, verify email preview shows personalised content with student names and course code' },
                    { task: 'Port AutoScholarMessenger (legacy lines 1078\u20131509) — rich HTML email composer with HtmlEditor, template library (welcome message, article), student recipient selector with StudentBrowser integration, bulk "add all current students" button, and Messenger service send', priority: 'P1', test: 'Open composer, select "welcome" template, pick 5 students, preview HTML email, send, verify message appears in sent log' },
                    { task: 'Port sent message viewer (legacy showSentMessages) — date-range search for sent messages, per-message detail view with from/to/subject/body, per-day action and unique visitor charts (plotly bar charts), raw data table export', priority: 'P2', test: 'Set date range to last 30 days, search, verify message list renders with envelope icons, click message to see detail, verify charts show daily activity' },
                    { task: 'Wire course-context messaging — when Risk panel identifies at-risk students, auto-populate messenger recipient list and pre-select appropriate risk template. One-click "message all at-risk" action from Risk tab', priority: 'P2', test: 'Analyse course, switch to Risk tab, click "Message at-risk students", verify messenger opens with at-risk students pre-loaded and low-performer template selected' }
                ]
            },
            {
                phase: 'Phase 6c',
                title: 'Legacy Lecturer Feature Ports — Course Management & Analytics',
                status: 'planned',
                timeline: '2–3 weeks',
                items: [
                    { task: 'Port CourseMetaEditor (legacy lines 26673\u201326797) — new Course Management tab or Gradebook sidebar section. Two parts: (1) class event scheduler via EventManager with groupCode "course-{courseCode}-{year}", (2) assessment weight/date CRUD editor with fields: code, label, weight%, commencement, duration, due time', priority: 'P1', test: 'Open Course Management, create assessment TM_5 with weight 20% and due date, verify persisted. Create tutorial event for Thursday 14:00, verify on calendar.' },
                    { task: 'Port AssessmentReview (legacy lines 8727\u20139352) — institutional assessment aggregation. Load all assessment data for a year, cross-reference with programme registrations, generate hierarchical summaries at faculty/discipline/programme level. Add as Analytics sub-panel or new Assessments tab', priority: 'P1', test: 'Load 2020 institution data, verify faculty-level aggregation shows assessment counts and averages per discipline, drill down to programme level' },
                    { task: 'Port MatricCorrelator (legacy lines 9353\u20139553) — Pearson R correlation between matric subjects and course performance. Rank subjects by sample-size-weighted R (n*R), display summary cards for top correlating subjects. Add as Analytics sub-panel or Predictors section', priority: 'P1', test: 'Load MGAB401, compute matric correlations, verify top 3 subjects shown with R values and sample sizes, confirm ML dataset generator produces decision tree output' },
                    { task: 'Port CourseLecturerBrowser (legacy lines 9555\u20139619) — bidirectional lookup: all courses for a staff number, or all lecturers for a course code. Integrate into course selector sidebar as a secondary navigation path', priority: 'P2', test: 'Enter staff number, verify course list loads. Enter course code, verify lecturer list loads with names and staff numbers.' },
                    { task: 'Port CourseLearningContent (legacy line 26799+) — teaching resource management. Allow lecturers to attach and organise learning materials per course. Class exists in legacy but createUi() was commented out. Design and implement the content editor and viewer', priority: 'P3', test: 'Open Learning Resources section, upload/link a resource, tag it to a topic, verify resource list renders with download/view actions' }
                ]
            }
        ];

        var phaseColors = { ready: 'var(--ui-success)', planned: 'var(--ui-info)', concept: 'var(--ui-secondary)' };
        var phaseBgColors = { ready: 'var(--ui-success-light)', planned: 'var(--ui-info-light)', concept: 'var(--ui-secondary-light)' };
        var priorityColors = { P0: 'var(--ui-danger)', P1: 'var(--ui-warning-dark)', P2: 'var(--ui-info)', P3: 'var(--ui-secondary)' };

        phases.forEach(function(ph) {
            var phSection = document.createElement('div');
            phSection.style.cssText = 'border:1px solid var(--ui-gray-200);border-radius:8px;margin-bottom:0.75rem;overflow:visible;';

            // Phase header
            var phHeader = document.createElement('div');
            phHeader.style.cssText = 'background:var(--ui-gray-50);padding:0.5rem 0.6rem;border-bottom:1px solid var(--ui-gray-200);display:flex;align-items:center;gap:0.5rem;';
            phHeader.innerHTML =
                '<span style="font-size:0.75rem;font-weight:700;color:var(--ui-gray-700);">' + ph.phase + ': ' + ph.title + '</span>' +
                '<span style="display:inline-block;padding:0.1rem 0.4rem;border-radius:9px;font-size:0.55rem;font-weight:600;color:' + phaseColors[ph.status] + ';background:' + phaseBgColors[ph.status] + ';">' + ph.status + '</span>' +
                '<span style="margin-left:auto;font-size:0.6rem;color:var(--ui-gray-400);"><i class="fas fa-clock" style="margin-right:0.2rem;"></i>' + ph.timeline + '</span>';
            phSection.appendChild(phHeader);

            // Phase items
            var phBody = document.createElement('div');
            phBody.style.cssText = 'padding:0.4rem 0.6rem;';
            ph.items.forEach(function(item) {
                var itemRow = document.createElement('div');
                itemRow.style.cssText = 'display:flex;align-items:flex-start;gap:0.4rem;padding:0.35rem 0;border-bottom:1px solid var(--ui-gray-100);';
                itemRow.innerHTML =
                    '<span style="display:inline-block;padding:0.05rem 0.3rem;border-radius:4px;font-size:0.5rem;font-weight:700;color:white;background:' + (priorityColors[item.priority] || 'var(--ui-gray-500)') + ';white-space:nowrap;margin-top:0.1rem;">' + item.priority + '</span>' +
                    '<div style="flex:1;"><div style="font-size:0.65rem;color:var(--ui-gray-700);line-height:1.4;">' + item.task + '</div><div style="font-size:0.6rem;color:var(--ui-gray-400);margin-top:0.1rem;"><i class="fas fa-vial" style="margin-right:0.2rem;font-size:0.5rem;"></i>' + item.test + '</div></div>';
                phBody.appendChild(itemRow);
            });
            phSection.appendChild(phBody);
            planCard.appendChild(phSection);
        });

        // ── Section 4: Test Plan ─────────────────────────────────────────────
        var testCard = this._aboutCard(parent, 'vial', 'Playwright Test Suite Plan');

        var testIntro = document.createElement('div');
        testIntro.style.cssText = 'font-size:0.7rem;color:var(--ui-gray-600);line-height:1.6;margin-bottom:0.6rem;';
        testIntro.textContent = 'Automated end-to-end test suite following the Executive Insight gold standard pattern. Uses @playwright/test framework with testrig server (port 3099) + DUT API proxy. Each phase adds tests for its new features.';
        testCard.appendChild(testIntro);

        var testGroups = [
            {
                group: 'Page Load & Hub Navigation (4 tests)',
                tests: ['Hub loads without JS errors', 'Hub shows 6 module cards with "Ready" status', 'Clicking ClassView Connect navigates to ClassView frame', 'ClassView shows 10 tabs after launch']
            },
            {
                group: 'Authentication & API (3 tests)',
                tests: ['Auto-login sets AS_SESSION.ready = true', 'Session ID is non-null after login', 'API proxy forwards requests to DUT endpoint']
            },
            {
                group: 'Data Loading (5 tests)',
                tests: ['Analyse All loads MGAB401 2020 data', 'KPI row shows 102 students / 70.2% avg / 97.1% pass rate', 'Programme dropdown shows BTMBA1 (94) and BTMSB1 (12)', 'Programme filter recomputes KPIs for filtered set', 'Course code change and re-analyse loads new data']
            },
            {
                group: 'Dashboard Tab (4 tests)',
                tests: ['Quick Navigation cards present for all 8 analysis panels', 'Class Summary shows correct course code, year, student count', 'Panel Status shows correct loaded/ready/not-loaded states', 'Connection card shows "Connected" with session ID']
            },
            {
                group: 'Risk Tab (4 tests)',
                tests: ['Student list renders with category badges (at-risk/average/high-performing)', 'Student cards show z-score data and assessment marks', 'Search filters student list', 'Message panel shows template selector and compose form']
            },
            {
                group: 'Roster Tab (3 tests)',
                tests: ['KPI summary cards show correct student/passing/failing/avg counts', 'Top Performers table lists top 5 students by mark', 'Needs Attention table lists bottom students']
            },
            {
                group: 'Gradebook Tab (4 tests)',
                tests: ['Grade grid shows all students with assessment columns', 'Per-assessment headers show weight percentage', 'Final column shows calculated grades', 'Class mean and pass rate KPIs match getCourseResults data (after Phase 1 fix)']
            },
            {
                group: 'Historical Tab (3 tests)',
                tests: ['Multi-year trend chart renders (6 years of data)', 'Year-by-year breakdown cards show stats', 'Assessment analysis table shows per-assessment stats']
            },
            {
                group: 'Peer Correlation Tab (3 tests)',
                tests: ['Correlation matrix renders with peer courses', 'Scatter plot shows with regression line and R-squared', 'Peer Course Details cards show interpretation text']
            },
            {
                group: 'Analytics Tab (4 tests)',
                tests: ['Score distribution histogram renders', 'Risk breakdown donut chart shows categories', 'Assessment comparison bars render', 'Summary statistics table shows all 14 metrics']
            },
            {
                group: 'Tab Smoke Tests (2 tests)',
                tests: ['All 10 tabs render without JS errors', 'Screenshot gallery captures all tabs for visual review']
            }
        ];

        testGroups.forEach(function(tg) {
            var groupEl = document.createElement('div');
            groupEl.style.cssText = 'margin-bottom:0.5rem;';
            groupEl.innerHTML = '<div style="font-size:0.7rem;font-weight:600;color:var(--ui-gray-700);margin-bottom:0.2rem;">' + tg.group + '</div>';
            tg.tests.forEach(function(t) {
                var testEl = document.createElement('div');
                testEl.style.cssText = 'display:flex;align-items:flex-start;gap:0.3rem;padding:0.1rem 0;font-size:0.65rem;color:var(--ui-gray-600);';
                testEl.innerHTML = '<i class="fas fa-circle" style="font-size:0.25rem;color:var(--ui-gray-400);margin-top:0.35rem;"></i>' + t;
                groupEl.appendChild(testEl);
            });
            testCard.appendChild(groupEl);
        });

        // Run instructions
        var runInfo = document.createElement('div');
        runInfo.style.cssText = 'margin-top:0.6rem;padding:0.4rem 0.5rem;background:var(--ui-gray-50);border-radius:4px;';
        runInfo.innerHTML = '<div style="font-size:0.6rem;font-weight:600;color:var(--ui-gray-700);margin-bottom:0.2rem;">Running Tests</div><div style="font-size:0.65rem;color:var(--ui-gray-600);font-family:monospace;line-height:1.6;">node server.js &nbsp; # Terminal 1: testrig on port 3099<br>npx playwright test --config=classview-connect.config.js &nbsp; # Terminal 2</div>';
        testCard.appendChild(runInfo);

        // ── Section 5: UI Improvement Mockups ────────────────────────────────
        var uiCard = this._aboutCard(parent, 'paint-brush', 'UI Improvement Priorities');

        var uiItems = [
            { area: 'KPI Row', current: '6 cards with large icons; Attendance always shows "—"; takes significant vertical space', proposed: 'Compact 4-card row (Students, Avg, Pass Rate, At Risk). Click-to-drill. Colour-coded thresholds. Secondary metrics on hover or in dashboard.' },
            { area: 'Dashboard', current: 'Static navigation grid + summary table + panel status + connection info', proposed: 'Action-priority dashboard: "3 students dropped below 50% since last analysis" + "Next assessment TM_3 in 5 days" + "2 students haven\'t submitted TM_2". Quick action buttons.' },
            { area: 'Risk Student Cards', current: 'Flat list with marks and category badge', proposed: 'Add risk trajectory sparkline (z-score trend across assessments), feature importance bars (SHAP-style), and one-click intervention buttons (email, flag, refer).' },
            { area: 'Gradebook', current: 'Clean grade grid with colour-coded marks', proposed: 'Add difficulty/discrimination badges per assessment header. Highlight anomalous patterns (e.g., sudden drops). Add inline "compare to class" sparklines per student.' },
            { area: 'Sidebar Controls', current: 'Parameters accordion with empty Panel Controls, Health, Alerts sections', proposed: 'Panel Controls populates with panel-specific filters. Health shows real-time summary. Alerts shows actionable items with dismiss/action buttons.' },
            { area: 'Student Detail Modal', current: 'Assessment breakdown table', proposed: 'Full student profile: assessment trajectory chart, risk factor breakdown, peer comparison, intervention history, recommended actions, one-click communication.' }
        ];

        uiItems.forEach(function(ui) {
            var uiSection = document.createElement('div');
            uiSection.style.cssText = 'border:1px solid var(--ui-gray-200);border-radius:6px;padding:0.5rem;margin-bottom:0.4rem;';
            uiSection.innerHTML =
                '<div style="font-size:0.7rem;font-weight:700;color:var(--ui-gray-700);margin-bottom:0.3rem;">' + ui.area + '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">' +
                '<div style="background:var(--ui-danger-light);border-radius:4px;padding:0.3rem 0.4rem;"><div style="font-size:0.55rem;font-weight:600;color:var(--ui-danger);margin-bottom:0.1rem;">Current</div><div style="font-size:0.63rem;color:var(--ui-gray-600);line-height:1.4;">' + ui.current + '</div></div>' +
                '<div style="background:var(--ui-success-light);border-radius:4px;padding:0.3rem 0.4rem;"><div style="font-size:0.55rem;font-weight:600;color:var(--ui-success);margin-bottom:0.1rem;">Proposed</div><div style="font-size:0.63rem;color:var(--ui-gray-600);line-height:1.4;">' + ui.proposed + '</div></div>' +
                '</div>';
            uiCard.appendChild(uiSection);
        });
    }

    // ── Legacy Components — Port Candidates ──────────────────────────────────

    _renderAboutLegacyComponents(parent) {
        var card = this._aboutCard(parent, 'archive', 'Legacy Analytics — Port Candidates');

        var intro = document.createElement('p');
        intro.className = 'cv-about-text';
        intro.textContent = 'The original AutoScholar codebase contains rich analytics functionality that predates the current test rig architecture. These components live in a single monolith file and should be reviewed for porting into the modern panel system. Each represents proven functionality that worked in production at DUT.';
        card.appendChild(intro);

        var sourceEl = document.createElement('div');
        sourceEl.className = 'cv-dash-detail';
        sourceEl.style.cssText = 'margin:0.5rem 0 0.75rem;padding:0.4rem 0.6rem;background:var(--ui-gray-50);border-radius:var(--ui-radius-md);font-family:monospace;font-size:var(--ui-text-xs);color:var(--ui-gray-600);word-break:break-all;';
        sourceEl.textContent = 'Source: /Users/randhirrawatlal/Dropbox/NodeJS/Projects/Autoscholar/class.AutoScholarComponents.js (67 classes, ~30k lines)';
        card.appendChild(sourceEl);

        var components = [
            {
                name: 'ProgrammeEstimator',
                lines: '13342–16165',
                priority: 'high',
                description: 'Master analytics engine. Loads programme structure and cohort data, derives course statistics, categorises courses (core/elective), generates recommendations, and runs the Population Balance Model (PBM). The PBM tracks session-by-session student position through a programme as weighted credit fractions — showing population flux, stalls, and exits. Also includes Residence Time Distribution (RTD), gatekeeper course detection via Z-scores, and progression pathway analysis.'
            },
            {
                name: 'MatricCorrelator',
                lines: '9353–9553',
                priority: 'high',
                description: 'Computes Pearson R correlation between matric (high school) subject results and university course performance. Ranks subjects by sample-size-weighted R (n*R), shows summary cards for top correlating subjects. Includes an ML dataset generator using a decision tree built from the top correlated subjects.'
            },
            {
                name: 'ProgrammeCohortView',
                lines: '6501–6831',
                priority: 'high',
                description: 'Loads a full programme cohort for a given intake year. Calculates per-student performance statistics (passes, fails, pass rates, credit rates, means). Integrates RiskAlertReview with messenger for at-risk identification. Displays programme structure and raw data tables.'
            },
            {
                name: 'CohortAnalysis',
                lines: '21569–22990',
                priority: 'medium',
                description: 'Drop-out pattern analysis for a programme cohort. Course-level and student-level performance, programme structure estimation from data, student progression pathway visualisation, at-risk recommendations.'
            },
            {
                name: 'GradCohort + GradProfiler + GradView',
                lines: '6833–8282',
                priority: 'medium',
                description: 'Institution-level cohort-to-graduation analysis. GradCohort shows graduation profiles by faculty/discipline with min-time completion metrics. GradProfiler computes per-programme m0..m4 distributions (years to complete). GradView visualises hierarchical faculty > discipline > programme graduation data with bar charts.'
            },
            {
                name: 'AccreditationTest',
                lines: '7243–7685',
                priority: 'medium',
                description: 'Maps graduate attributes and range statements to required courses. Evaluates per-student whether each GA criterion is achieved. Includes JSON-based accreditation object editor. Has the full DUT Chemical Engineering ECSA accreditation specification built in.'
            },
            {
                name: 'InstitutionBrowser',
                lines: '8534–9263',
                priority: 'low',
                description: 'Institution-level hierarchical browser: faculty > discipline > programme > course, with student counts and data tables at each level.'
            },
            {
                name: 'StudentPBL (Gamification)',
                lines: '5482–6345',
                priority: 'low',
                description: 'Problem-Based Learning / gamification: badge editor, student awards, leaderboard, PBL profile preview, admin analytics.'
            },
            {
                name: 'Registration Checker + PreRequisiteChecker',
                lines: '12235–12429 + 20482–20770',
                priority: 'high',
                description: 'Two-part registration validation system used directly inside ClassView. showRegChecker (line 12235) provides 4 sub-panels: (1) Course Registration — load students by course code, (2) Check Pre-requisites — filter students against prerequisite course codes with configurable minimum marks, producing a pass/fail report per student, (3) Programme Registration Check — load an entire programme cohort and get their full results, (4) Evaluate Registration — integration with LogicEvaluator for complex boolean prerequisite logic (AND/OR trees with minVal per course/assessment). PreRequisiteChecker (line 20482) is the standalone version wired into AutoScholarComponentClassViewConnect\'s "Registration" accordion section. Core algorithm: transposes student results to a studentNumber × courseCode matrix, applies max-result deduplication, then evaluates prerequisite rules against the matrix. Outputs a per-student pass/fail report with detailed reasoning. This is a production-proven tool used by DUT lecturers to verify class eligibility.'
            },
            {
                name: 'RegistrationAdvisor',
                lines: '10121–10938',
                priority: 'high',
                description: 'Full registration advisory system extending AutoScholarFrame. Includes: (1) showTimetable — weekly calendar-based timetable editor with course scheduling (lectures/tutorials/practicals), clash detection across courses, and visual time slot management; (2) ProgrammeEstimator integration for scenario-to-graduation planning; (3) Credit load analysis and semester constraint evaluation. Designed for both staff (advising students on course selection) and students (self-service registration planning). Comments at lines 10123-10131 enumerate the intended feature set: pre/co-requisite evaluation, concession applications, credit load study, student self-eval, and career planning.'
            },
            {
                name: 'CourseMetaEditor',
                lines: '26673–26797',
                priority: 'high',
                description: 'Lecturer tool for managing course-level metadata. Two accordion sections: (1) "Set class events" — integrates EventManager to create/edit calendar events for the course group (lectures, tutorials, assessments, deadlines); (2) "Set assessment weights & dates" — DataBindBlu-backed CRUD editor for assessment metadata including code, label, weight percentage, commencement time, duration, and release/due time. Wired into AutoScholarComponentClassViewConnect\'s "Schedule events & assessments" accordion section (line 20020). Requires msApi (ScholarCloud backend) and EventManager service. This gives lecturers control over their course assessment structure and schedule.'
            },
            {
                name: 'CourseLearningContent',
                lines: '26799+',
                priority: 'medium',
                description: 'Teaching resource management class for lecturers. Exists as a class in the codebase and is instantiated in ClassViewConnect (line 20037) but its createUi() call is commented out (line 20046). Intended to allow lecturers to attach, organise, and manage learning materials linked to specific courses. Would integrate with the "Learning pathways" accordion section.'
            },
            {
                name: 'RequisiteManager',
                lines: '26504–26672',
                priority: 'medium',
                description: 'CRUD editor for course prerequisite and co-requisite rules. Supports pre-requisites (with course result or assessment result criterion basis and minimum values) and co-requisites. Persists rules to a "requisite" table via ScholarCloud API. Displays rules as selectable list items with type-specific labels. Integrates with LogicEvaluator for complex prerequisite evaluation. Provides the data management layer that PreRequisiteChecker consumes for validation.'
            },
            {
                name: 'AssessmentReview',
                lines: '8727–9352',
                priority: 'high',
                description: 'Faculty/discipline/programme-level assessment aggregation engine. Loads institution-wide assessment data for a year and cross-references with programme registrations and course results. genAssessmentReview() aggregates assessment data hierarchically: per-faculty, per-discipline, per-programme, showing assessment completion rates, result distributions, and coverage gaps. Useful for HODs and programme coordinators reviewing assessment practices across their portfolio. Produces DataTable views and raw data export.'
            },
            {
                name: 'CourseLecturerBrowser',
                lines: '9555–9619',
                priority: 'medium',
                description: 'Staff-course relationship lookup tool. Provides a form to either: (1) load all courses for a specific lecturer by staff number, or (2) load all lecturers for a specific course by course code. Returns staff names, staff numbers, course codes, and years. Used inside ClassView\'s showClassView method as a secondary navigation tool alongside the ProgrammeSelector hierarchy browser.'
            },
            {
                name: 'AutoScholarMessenger',
                lines: '1078–1509',
                priority: 'high',
                description: 'Rich HTML email composition and student communication system. Features: (1) HTML composer with template library (welcome message, article template) using HtmlEditor; (2) Student select panel with StudentBrowser integration for picking recipients; (3) "Add all current students" bulk action that loads all programme registrations for the current year; (4) Message sender with Messenger service integration; (5) Sent messages viewer with date-range search, per-message detail view, per-day action/visitor charts and raw data tables. This is the primary lecturer-to-student communication tool with full audit trail of all sent messages.'
            },
            {
                name: 'RiskAlertIntegration (showAutoScholarAssessRisk)',
                lines: '1197–1327',
                priority: 'high',
                description: 'Risk-based student messaging embedded directly in ClassView and other components. Loads assessment results for a course, merges with student bio data, builds a one-hot transpose matrix (student × assessment), computes per-assessment features with alert thresholds (alertMin: 50, z-score bounds), and pipes the data through a RiskAlertReview component for visual risk categorisation with integrated messaging. Template messages for high/average/low performers are configurable. The core algorithm: getAssessmentRecords → genStudentTable (oneHotTranspose) → genRiskSettings → showRiskAlertIntegration. This is the foundation of the "Student risk review" panel in the legacy ClassView.'
            }
        ];

        var priorityColors = { high: 'var(--ui-danger)', medium: 'var(--ui-warning-500)', low: 'var(--ui-gray-400)' };

        components.forEach(function(comp) {
            var row = document.createElement('div');
            row.style.cssText = 'margin-bottom:0.6rem;padding:0.5rem 0.6rem;background:var(--ui-gray-50);border-radius:var(--ui-radius-md);border-left:3px solid ' + (priorityColors[comp.priority] || 'var(--ui-gray-300)') + ';';

            var header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;gap:0.4rem;margin-bottom:0.25rem;';
            header.innerHTML = '<span style="font-size:var(--ui-text-xs);font-weight:var(--ui-font-bold);color:var(--ui-gray-800);">' + comp.name + '</span>' +
                '<span class="cv-dash-detail" style="font-size:0.6rem;">lines ' + comp.lines + '</span>' +
                '<span style="font-size:0.55rem;padding:0.1rem 0.35rem;border-radius:var(--ui-radius-full);background:' + (priorityColors[comp.priority] || 'var(--ui-gray-300)') + ';color:white;font-weight:var(--ui-font-semibold);text-transform:uppercase;">' + comp.priority + '</span>';
            row.appendChild(header);

            var desc = document.createElement('div');
            desc.style.cssText = 'font-size:var(--ui-text-xs);color:var(--ui-gray-600);line-height:1.45;';
            desc.textContent = comp.description;
            row.appendChild(desc);

            card.appendChild(row);
        });

        var footer = document.createElement('p');
        footer.className = 'cv-about-text';
        footer.style.cssText = 'margin-top:0.75rem;font-style:italic;color:var(--ui-gray-500);';
        footer.textContent = 'Porting strategy: 17 legacy components identified across 3 tiers. Tier 1 (high priority, 9 items): Registration Checker + PreRequisiteChecker into a new Registration panel; CourseMetaEditor into a Course Management panel; AutoScholarMessenger and RiskAlertIntegration into the existing Risk panel\'s messaging layer; AssessmentReview as an Analytics enhancement; RegistrationAdvisor\'s timetable into a Schedule panel. Tier 2 (medium, 5 items): CourseLearningContent, RequisiteManager, CourseLecturerBrowser, CohortAnalysis, and GradCohort into their respective panels. Tier 3 (low, 3 items): InstitutionBrowser, StudentPBL. The Population Balance Model (inside ProgrammeEstimator) is unique and deserves its own panel within Programme Analyst.';
        card.appendChild(footer);
    }

    // ── About Card Builder ──────────────────────────────────────────────────

    _aboutCard(parent, icon, title) {
        var card = document.createElement('div');
        card.className = 'cv-about-card';
        var header = document.createElement('div');
        header.className = 'cv-about-card-header';
        header.innerHTML = '<i class="fas fa-' + icon + '" style="color:var(--ui-primary-500);font-size:0.7rem;"></i><span style="font-size:0.75rem;font-weight:700;color:var(--ui-gray-700);">' + title + '</span>';
        card.appendChild(header);
        var body = document.createElement('div');
        body.className = 'cv-about-card-body';
        card.appendChild(body);
        parent.appendChild(card);
        return body;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // COURSE SELECTOR INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Load all courses for a year via getCourseCounts (single API call).
     * Returns courseCode + studentCount for every course in that year — no cap.
     * Labels are lazy-loaded by CourseSelector as pages are viewed.
     */
    async _loadStaffCourses() {
        var self = this;
        try {
            await this._authenticate();

            var year = this._year;
            console.log('[ClassView] Loading course counts for year', year, '...');
            var data = await this._apiCall('getCourseCounts', { year: year });
            var rows = this._parseCourseCounts(data);

            if (!rows || rows.length === 0) {
                console.log('[ClassView] No courses found for year', year);
                this._staffCourses = [];
                return;
            }

            // Build course objects from counts — one per courseCode
            var courseMap = {};
            rows.forEach(function(r) {
                var code = r.courseCode || '';
                if (!code) return;
                if (!courseMap[code] || (parseInt(r.students) || 0) > courseMap[code].studentCount) {
                    courseMap[code] = {
                        code: code,
                        courseCode: code,
                        year: r.year || year,
                        studentCount: parseInt(r.students) || 0,
                        label: '',
                        courseLabel: '',
                        credits: '',
                        facultyCode: '',
                        disciplineCode: ''
                    };
                }
            });
            this._staffCourses = Object.values(courseMap);
            console.log('[ClassView] Loaded', this._staffCourses.length, 'courses for year', year);

        } catch (e) {
            console.error('[ClassView] _loadStaffCourses error:', e.message);
            this._staffCourses = [];
        }
    }

    /**
     * Enrich a batch of courses with labels, credits, faculty via getCourseMeta.
     * Called lazily by CourseSelector as the user pages through results.
     */
    async _enrichCourses(codes) {
        var self = this;
        if (!codes || codes.length === 0) return;
        try {
            var data = await this._apiCall('getCourseMeta', { courseCode: codes });
            var rows = this._parseResponse(data);
            if (!rows) return;

            // Build lookup
            var metaMap = {};
            rows.forEach(function(r) {
                metaMap[r.courseCode] = {
                    label: r.courseLabel || r.label || '',
                    credits: r.credits || '',
                    facultyCode: r.facultyCode || '',
                    disciplineCode: r.disciplineCode || ''
                };
            });

            // Merge into existing course objects
            this._staffCourses.forEach(function(c) {
                var meta = metaMap[c.code];
                if (meta) {
                    c.label = meta.label;
                    c.courseLabel = meta.label;
                    c.credits = meta.credits;
                    c.facultyCode = meta.facultyCode;
                    c.disciplineCode = meta.disciplineCode;
                }
            });
        } catch (e) {
            console.warn('[ClassView] _enrichCourses failed:', e.message);
        }
    }

    /**
     * Parse getCourseCounts response — wrapped in { courseCount: { fields, data } }
     */
    _parseCourseCounts(data) {
        if (!data) return null;
        var inner = data.courseCount || data;
        if (inner.fields && Array.isArray(inner.data)) {
            return this._fieldsDataToRecords(inner.fields, inner.data);
        }
        return this._parseResponse(data);
    }

    /**
     * Update the course count badge next to Browse Courses button
     */
    _updateCourseCountBadge() {
        if (!this._courseCountBadge) return;
        var count = this._staffCourses ? this._staffCourses.length : 0;
        if (count > 0) {
            this._courseCountBadge.update({ label: count + ' courses', color: 'success' });
            this._courseCountBadge.el.style.display = '';
        } else {
            this._courseCountBadge.el.style.display = 'none';
        }
    }

    /**
     * Open CourseSelector populated with staff courses
     */
    _openCourseBrowser() {
        var self = this;
        if (!this._staffCourses || this._staffCourses.length === 0) {
            // No courses loaded yet — trigger load first
            this._setStatus('Loading courses...', 'warning');
            this._loadStaffCourses().then(function() {
                self._updateCourseCountBadge();
                if (self._staffCourses && self._staffCourses.length > 0) {
                    self._setStatus('Connected', 'success');
                    self._showCourseSelectorModal();
                } else {
                    // Fail visibly — API unavailable or returned no courses
                    self._setStatus('API unavailable', 'danger');
                    new uiAlert({
                        title: 'Cannot Browse Courses',
                        message: 'The getCourseCounts API returned no data. Ensure the test server is running and connected to an institution API.',
                        variant: 'danger',
                        parent: self._stageEl,
                        dismissible: true
                    });
                }
            });
            return;
        }
        this._showCourseSelectorModal();
    }

    _showCourseSelectorModal() {
        var self = this;
        var PAGE_SIZE = 10;
        var currentPage = 1;
        var searchTerm = '';

        // ── Helpers ──
        function getFiltered() {
            var term = searchTerm.toLowerCase().trim();
            var courses = self._staffCourses || [];
            if (!term) return courses;
            return courses.filter(function(c) {
                var code = (c.code || c.courseCode || '').toLowerCase();
                var label = (c.label || c.courseLabel || c.name || '').toLowerCase();
                return code.indexOf(term) !== -1 || label.indexOf(term) !== -1;
            });
        }

        function renderTable() {
            var filtered = getFiltered();
            var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            if (currentPage > totalPages) currentPage = totalPages;
            var start = (currentPage - 1) * PAGE_SIZE;
            var page = filtered.slice(start, start + PAGE_SIZE);

            // Enrich visible page (lazy-load labels)
            var needEnrich = [];
            page.forEach(function(c) {
                var code = c.code || c.courseCode;
                if (code && !c.label && !self._enrichedCodes) self._enrichedCodes = {};
                if (code && !c.label && !self._enrichedCodes[code]) {
                    needEnrich.push(code);
                    self._enrichedCodes[code] = true;
                }
            });
            if (needEnrich.length > 0) {
                self._enrichCourses(needEnrich).then(function() { renderTable(); });
            }

            // Build table
            tbody.innerHTML = '';
            if (page.length === 0) {
                var emptyRow = document.createElement('tr');
                var emptyTd = document.createElement('td');
                emptyTd.colSpan = 4;
                emptyTd.className = 'cv-browse-empty';
                emptyTd.textContent = searchTerm ? 'No courses match "' + searchTerm + '"' : 'No courses loaded';
                emptyRow.appendChild(emptyTd);
                tbody.appendChild(emptyRow);
            } else {
                page.forEach(function(course, i) {
                    var tr = document.createElement('tr');
                    tr.className = 'cv-browse-row';
                    tr.addEventListener('click', function() {
                        var code = course.code || course.courseCode;
                        self._courseCode = code;
                        if (self._courseInput) self._courseInput.value = code;
                        modal.close();
                    });

                    var tdNum = document.createElement('td');
                    tdNum.className = 'cv-browse-num';
                    tdNum.textContent = start + i + 1;
                    tr.appendChild(tdNum);

                    var tdCode = document.createElement('td');
                    tdCode.className = 'cv-browse-code';
                    tdCode.textContent = course.code || course.courseCode || '';
                    tr.appendChild(tdCode);

                    var tdLabel = document.createElement('td');
                    tdLabel.className = 'cv-browse-label';
                    tdLabel.textContent = course.label || course.courseLabel || course.name || '';
                    tr.appendChild(tdLabel);

                    var tdCount = document.createElement('td');
                    tdCount.className = 'cv-browse-count';
                    tdCount.textContent = (course.studentCount || course.enrolmentCount || 0).toLocaleString();
                    tr.appendChild(tdCount);

                    tbody.appendChild(tr);
                });
            }

            // Pagination info
            if (filtered.length > 0) {
                pageInfo.textContent = (start + 1) + '–' + Math.min(start + PAGE_SIZE, filtered.length) + ' of ' + filtered.length;
            } else {
                pageInfo.textContent = '0 courses';
            }
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
        }

        // ── Build modal body ──
        var bodyEl = document.createElement('div');
        bodyEl.className = 'cv-browse-body';

        // Top row: year selector + search
        var topRow = document.createElement('div');
        topRow.className = 'cv-browse-top';
        bodyEl.appendChild(topRow);

        // Year select
        var yearSelect = document.createElement('select');
        yearSelect.className = 'ui-input cv-browse-year';
        var curYear = new Date().getFullYear();
        for (var y = curYear; y >= curYear - 6; y--) {
            var opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);
        }
        yearSelect.value = String(this._year);
        yearSelect.addEventListener('change', function() {
            self._year = parseInt(yearSelect.value, 10);
            if (self._yearSelect) self._yearSelect.value = yearSelect.value;
            self._enrichedCodes = {};
            currentPage = 1;
            // Show loading
            tbody.innerHTML = '<tr><td colspan="4" class="cv-browse-empty"><i class="fas fa-spinner fa-spin"></i> Loading courses...</td></tr>';
            self._loadStaffCourses().then(function() {
                self._updateCourseCountBadge();
                renderTable();
            });
        });
        topRow.appendChild(yearSelect);

        // Search input
        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'ui-input cv-browse-search';
        searchInput.placeholder = 'Search by code or name...';
        searchInput.addEventListener('input', function() {
            searchTerm = searchInput.value;
            currentPage = 1;
            renderTable();
        });
        topRow.appendChild(searchInput);

        // Table
        var table = document.createElement('table');
        table.className = 'cv-browse-table';
        bodyEl.appendChild(table);

        var thead = document.createElement('thead');
        thead.innerHTML = '<tr><th class="cv-browse-th-num">#</th><th>Code</th><th>Course Name</th><th class="cv-browse-th-count">Students</th></tr>';
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        table.appendChild(tbody);

        // Pagination row
        var pagRow = document.createElement('div');
        pagRow.className = 'cv-browse-pagination';
        bodyEl.appendChild(pagRow);

        var pageInfo = document.createElement('span');
        pageInfo.className = 'cv-browse-page-info';
        pagRow.appendChild(pageInfo);

        var btnGroup = document.createElement('div');
        btnGroup.className = 'cv-browse-page-btns';
        pagRow.appendChild(btnGroup);

        var prevBtn = document.createElement('button');
        prevBtn.className = 'cv-browse-page-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.addEventListener('click', function() { if (currentPage > 1) { currentPage--; renderTable(); } });
        btnGroup.appendChild(prevBtn);

        var nextBtn = document.createElement('button');
        nextBtn.className = 'cv-browse-page-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', function() { currentPage++; renderTable(); });
        btnGroup.appendChild(nextBtn);

        // ── Create modal ──
        var modal = new uiModal({
            title: 'Browse Courses — ' + this._year,
            size: 'lg'
        });
        var modalBody = modal.getBody();
        if (modalBody) modalBody.appendChild(bodyEl);
        modal.open();

        // Initial render
        renderTable();
        setTimeout(function() { searchInput.focus(); }, 150);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════════

};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassViewConnect;
}
if (typeof window !== 'undefined') {
    window.ClassViewConnect = ClassViewConnect;
}
