/**
 * class.AutoScholarApp.js — Reusable institution deployment class
 *
 * Creates a top-level tabbed interface with 8 modules, each rendering
 * its own sub-tabs via existing panel classes. Can be instantiated for
 * any institution (DUT, CPUT, UKZN, VUT) with different configs.
 *
 * Usage:
 *   const app = new AutoScholarApp({
 *       parent: document.getElementById('app'),
 *       endpoint: '/api-proxy',
 *       institution: 'DUT'
 *   });
 *   await app.init();
 */
class AutoScholarApp {

    static TAB_REGISTRY = {
        dashboard:   { label: 'Executive Insight',      icon: 'tachometer-alt' },
        students:    { label: 'Student Central',         icon: 'user-graduate' },
        casework:    { label: 'Casework Counsellor',     icon: 'hands-helping' },
        programme:   { label: 'Programme Analyst',       icon: 'sitemap' },
        supervision: { label: 'ClassView Connect',       icon: 'chalkboard-teacher' },
        reports:     { label: 'Accreditation Automate',  icon: 'file-alt' },
        analytics:   { label: 'Analytics',               icon: 'chart-line' },
        settings:    { label: 'Settings',                icon: 'cog' }
    };

    constructor({ parent, endpoint, institution, startTab, productionMode, moduleLabel, onHubClick }) {
        this._parent = parent;
        this._endpoint = endpoint || '/api-proxy';
        this._institution = institution || 'DUT';
        this._startTab = startTab || 'dashboard';
        this._productionMode = productionMode || false;
        this._moduleLabel = moduleLabel || '';
        this._onHubClick = onHubClick || null;
        this._panels = {};
        this._initialized = {};
        this._mainTabs = null;
    }

    // ── Public entry point ───────────────────────────────────────────────────

    async init() {
        this._buildHeader();
        this._buildTabs();
        this._initPanel(this._startTab);
        this._initCommandPalette();
    }

    // ── Header ───────────────────────────────────────────────────────────────

    _buildHeader() {
        const header = document.createElement('div');
        header.className = 'as-header';
        const ready = window.AS_SESSION?.ready;
        const statusLabel = ready ? `${this._institution} Connected` : this._institution;
        const initials = (window.AS_SESSION?.staffId || 'U').substring(0, 2).toUpperCase();

        // Production mode: Hub button before icon, module label after title
        const hubBtn = this._productionMode
            ? `<button class="as-header-hub-btn"><i class="fas fa-th-large"></i> Hub</button>`
            : '';
        const moduleLbl = (this._productionMode && this._moduleLabel)
            ? `<span class="as-header-module-label">${this._moduleLabel}</span>`
            : '';

        header.innerHTML =
            hubBtn +
            `<div class="as-header-icon"><i class="fas fa-graduation-cap"></i></div>` +
            `<div class="as-header-title">AutoScholar</div>` +
            moduleLbl +
            `<div class="as-header-search">` +
                `<input type="text" placeholder="Search students, courses, reports...">` +
            `</div>` +
            `<span class="as-header-badge">` +
                (ready ? `<span class="as-header-badge-dot"></span>` : '') +
                `${statusLabel}` +
            `</span>` +
            `<div class="as-header-avatar">${initials}</div>`;
        this._parent.appendChild(header);

        // Wire Hub button click
        if (this._productionMode && this._onHubClick) {
            const btn = header.querySelector('.as-header-hub-btn');
            if (btn) btn.addEventListener('click', () => this._onHubClick());
        }
    }

    // ── Command Palette ──────────────────────────────────────────────────────

    _initCommandPalette() {
        if (typeof AsCommandPalette === 'undefined') return;
        this._palette = new AsCommandPalette({ app: this });
        this._palette.install();
    }

    // ── Main Tabs ────────────────────────────────────────────────────────────

    _buildTabs() {
        // Production mode: single panel, no tab row
        if (this._productionMode) {
            const panel = document.createElement('div');
            panel.className = 'as-production-panel';
            panel.style.cssText = 'flex:1;min-height:0;overflow-y:auto;';
            this._parent.appendChild(panel);

            const fullPanelTabs = ['dashboard', 'analytics', 'settings'];
            if (fullPanelTabs.includes(this._startTab)) {
                // Dashboard/analytics/settings render directly into panel
                this._panels[this._startTab] = { directPanel: panel };
            } else {
                // Other tabs get a control-stage layout
                const cs = new uiControlStage({ controlSize: 'md', parent: panel });
                this._panels[this._startTab] = { control: cs.getControlPanel(), stage: cs.getStage() };
            }
            return;
        }

        const content = {};
        for (const [key, def] of Object.entries(AutoScholarApp.TAB_REGISTRY)) {
            content[key] = { label: def.label, icon: `<i class="fas fa-${def.icon}"></i>`, content: '' };
        }

        this._mainTabs = new uiTabs({
            template: 'pills',
            size: 'sm',
            content,
            activeTab: this._startTab,
            parent: this._parent
        });

        // Create uiControlStage inside tabs that need control+stage layout
        // Dashboard, analytics, and settings render directly into their panels
        const fullPanelTabs = ['dashboard', 'analytics', 'settings'];
        Object.keys(AutoScholarApp.TAB_REGISTRY).forEach(key => {
            if (fullPanelTabs.includes(key)) return;
            const tabPanel = this._mainTabs.el.querySelector(`.ui-tabs-panel[data-tab="${key}"]`);
            const cs = new uiControlStage({ controlSize: 'md', parent: tabPanel });
            this._panels[key] = { control: cs.getControlPanel(), stage: cs.getStage() };
        });

        // Lazy init on tab change
        this._mainTabs.bus.on('tabChange', ({ tab }) => this._initPanel(tab));
    }

    // ── Tab Badge ──────────────────────────────────────────────────────────────

    updateTabBadge(tabKey, count) {
        if (!this._mainTabs) return;
        const tabEl = this._mainTabs.el.querySelector(`.ui-tabs-tab[data-tab="${tabKey}"]`);
        if (!tabEl) return;
        let badge = tabEl.querySelector('.as-tab-badge');
        if (count == null || count === 0) {
            if (badge) badge.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'as-tab-badge';
            tabEl.appendChild(badge);
        }
        badge.textContent = count;
    }

    // ── Lazy Panel Initialization ────────────────────────────────────────────

    _initPanel(key) {
        if (this._initialized[key]) return;
        this._initialized[key] = true;

        const p = this._panels[key];

        try {
            switch (key) {
                case 'dashboard':
                    this._initDashboard();
                    break;
                case 'students':
                    new StudentCentralPanel().render(p.control, p.stage);
                    break;
                case 'casework':
                    new CaseworkCounsellorPanel({ bridge: new CaseworkBridge() }).render(p.control, p.stage);
                    break;
                case 'programme':
                    new ProgAnalystPanel().render(p.control, p.stage);
                    break;
                case 'supervision':
                    new ClassViewConnect({ endpoint: this._endpoint }).render(p.control, p.stage);
                    break;
                case 'reports':
                    this._initAccreditation(p.control, p.stage);
                    break;
                case 'analytics':
                    this._initAnalytics();
                    break;
                case 'settings':
                    this._initSettings();
                    break;
            }
        } catch (err) {
            console.error(`[AutoScholarApp] Failed to init panel "${key}":`, err);
            const target = p ? (p.stage || p.directPanel) : this._getTabPanel(key);
            if (target && typeof AsEmptyState !== 'undefined') {
                AsEmptyState.render(target, {
                    icon: 'fas fa-exclamation-triangle',
                    title: `${AutoScholarApp.TAB_REGISTRY[key]?.label || key} — Init Error`,
                    message: err.message
                });
            }
        }
    }

    // ── Panel Lookup ─────────────────────────────────────────────────────────

    _getTabPanel(key) {
        // Production mode stores the panel element directly
        const p = this._panels[key];
        if (p && p.directPanel) return p.directPanel;
        // Normal mode: query from uiTabs
        if (this._mainTabs) return this._mainTabs.el.querySelector(`.ui-tabs-panel[data-tab="${key}"]`);
        return null;
    }

    // ── Dashboard — Health Matrix + sub-tabs ────────────────────────────────

    _initDashboard() {
        const publome = ExecSchema.create();
        ExecSchema.seed(publome);
        const engine = new ExecMetrics(publome);
        const availableYears = engine.getYears();
        const year = availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
        const bus = new EventBus();

        // Exception engine with rhythm calendar awareness
        const exceptionEngine = new ExecExceptionEngine(engine, publome);
        exceptionEngine.setCalendar(new ExecRhythmCalendar());

        // Narrative engine for governance-ready prose
        const narrativeEngine = new ExecNarrativeEngine(engine, publome);
        narrativeEngine.setExceptionEngine(exceptionEngine);

        // Scenario model for decision rehearsal
        const scenarioModel = new ExecScenarioModel(engine, publome);

        const tabPanel = this._getTabPanel('dashboard');

        // Funnel Strip — P2 orientation element (compact pipeline overview)
        if (typeof FunnelStrip !== 'undefined') {
            const funnel = new FunnelStrip({ engine, publome, year, bus });
            funnel.connectBus(bus);
            funnel.render(tabPanel);
        }

        // Sub-tabs (Health Matrix is its own tab alongside the others)
        const tabs = new uiTabs({
            template: 'underline', size: 'sm',
            content: {
                summary:         { label: 'Summary', content: '' },
                hierarchy:       { label: 'Assessment Performance', content: '' },
                studentOverview: { label: 'Students', content: '' },
                healthMatrix:    { label: 'Health Matrix', content: '' },
                rehearsal:       { label: 'Decision Rehearsal', content: '' }
            },
            activeTab: 'summary',
            parent: tabPanel
        });

        // Programme Health Matrix — renders into its own tab
        if (typeof HealthMatrix !== 'undefined') {
            const matrixPanel = tabs.el.querySelector('.ui-tabs-panel[data-tab="healthMatrix"]');
            if (matrixPanel) {
                const matrix = new HealthMatrix({ engine, publome, year, bus });
                matrix.connectBus(bus);
                matrix.render(matrixPanel);
            }
        }

        const loader = new ExecDataLoader({ publome, engine, bus });
        const config = { publome, engine, year, loader, exceptionEngine, narrativeEngine };

        [
            ['summary',         ExecSummaryPanel],
            ['hierarchy',       ExecHierarchyPanel],
            ['studentOverview', ExecStudentsPanel]
        ].forEach(([k, PanelClass]) => {
            const panel = new PanelClass(config);
            panel.connectBus(bus);
            panel.render(tabs.el.querySelector(`.ui-tabs-panel[data-tab="${k}"]`));
        });

        // Decision Rehearsal panel
        const rehearsalPanel = new ExecDecisionRehearsalPanel({
            publome, engine, year, scenarioModel, narrativeEngine
        });
        rehearsalPanel.connectBus(bus);
        rehearsalPanel.render(tabs.el.querySelector('.ui-tabs-panel[data-tab="rehearsal"]'));

        loader.load(year);
        loader.listenForInstitutionChange();
        window._execDebug = { publome, engine, bus, loader, exceptionEngine, narrativeEngine, scenarioModel };
    }

    // ── Analytics — interactive funnel / deep analysis ─────────────────────────

    _initAnalytics() {
        const tabPanel = this._getTabPanel('analytics');
        // Re-use Executive engine for analytics views (funnel, Sankey, drill-down)
        const publome = ExecSchema.create();
        ExecSchema.seed(publome);
        const engine = new ExecMetrics(publome);
        const availableYears = engine.getYears();
        const year = availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
        const bus = new EventBus();

        const tabs = new uiTabs({
            template: 'underline', size: 'sm',
            content: {
                flow:        { label: 'Student Flow', content: '' },
                performance: { label: 'Performance', content: '' },
                counts:      { label: 'Counts', content: '' },
                assessment:  { label: 'Assessment', content: '' },
                strategy:    { label: 'Strategy', content: '' }
            },
            activeTab: 'flow',
            parent: tabPanel
        });

        const loader = new ExecDataLoader({ publome, engine, bus });
        const exceptionEngine = new ExecExceptionEngine(engine, publome);
        exceptionEngine.setCalendar(new ExecRhythmCalendar());
        const narrativeEngine = new ExecNarrativeEngine(engine, publome);
        narrativeEngine.setExceptionEngine(exceptionEngine);
        const config = { publome, engine, year, loader, exceptionEngine, narrativeEngine };

        // Sankey flow panel (dominant visual)
        if (typeof ExecSankeyPanel !== 'undefined') {
            const sankey = new ExecSankeyPanel({ publome, engine, year, bus });
            sankey.connectBus(bus);
            sankey.render(tabs.el.querySelector('.ui-tabs-panel[data-tab="flow"]'));
        }

        [
            ['performance', ExecPerformancePanel],
            ['counts',      ExecCountsPanel],
            ['assessment',  ExecAssessmentPanel],
            ['strategy',    ExecStrategyPanel]
        ].forEach(([k, PanelClass]) => {
            const panel = new PanelClass(config);
            panel.connectBus(bus);
            panel.render(tabs.el.querySelector(`.ui-tabs-panel[data-tab="${k}"]`));
        });

        loader.load(year);
        loader.listenForInstitutionChange();
    }

    // ── Accreditation — AccreditationService + LogicComposer ─────────────────

    _initAccreditation(controlEl, stageEl) {
        const lc = new LogicComposerService();
        ServiceRegistry.register('logicComposer', lc, { alias: 'Logic Composer' });
        lc.seedDefaults();

        const accred = new AccreditationService();
        ServiceRegistry.register('accreditation', accred, { alias: 'Accreditation AutoMate' });
        accred.seedDefaults(lc);

        // Node type visual config for logic tree
        const nodeTypeConfig = {
            AND:       { icon: 'fas fa-layer-group',  color: 'var(--ui-primary)' },
            OR:        { icon: 'fas fa-code-branch',  color: 'var(--ui-success, #22c55e)' },
            anyNof:    { icon: 'fas fa-list-ol',       color: 'var(--ui-warning, #f59e0b)' },
            minTotal:  { icon: 'fas fa-arrow-up-wide-short', color: 'var(--ui-secondary-600)' },
            maxTotal:  { icon: 'fas fa-arrow-down-wide-short', color: 'var(--ui-accent, #14b8a6)' },
            criterion: { icon: 'fas fa-equals',        color: 'var(--ui-gray-500)' }
        };

        function nodeMapFn(record) {
            const type = record.get('nodeType');
            const cfg = nodeTypeConfig[type] || { icon: 'fas fa-question', color: 'var(--ui-gray-400)' };
            let sublabel;
            switch (type) {
                case 'AND': sublabel = 'All must pass'; break;
                case 'OR':  sublabel = 'Any may pass'; break;
                case 'anyNof': sublabel = (record.get('nRequired') || '?') + ' of children required'; break;
                case 'minTotal': sublabel = (record.get('metric') || 'count') + ' >= ' + (record.get('threshold') || '?'); break;
                case 'maxTotal': sublabel = (record.get('metric') || 'count') + ' <= ' + (record.get('threshold') || '?'); break;
                case 'criterion': {
                    const path = record.get('attrPath') || '';
                    const op = record.get('operator') || '';
                    const val = record.get('value') || '';
                    sublabel = path ? (path + ' ' + op + ' ' + val) : 'unconfigured';
                    break;
                }
                default: sublabel = type;
            }
            return {
                label: record.get('label'),
                sublabel: sublabel,
                iconHtml: '<i class="' + cfg.icon + '" style="color:' + cfg.color + '"></i>'
            };
        }

        // Controls: body selector + child tables in accordion
        const bodyBinding = new UIBinding(accred.table('accredBody'), { publome: accred });
        bodyBinding.bindSelectEditor(controlEl, { editor: 'modal' });

        const accordion = new uiAccordion({ parent: controlEl, exclusive: true,
            content: {
                attributes:    { label: 'Attributes', icon: 'fas fa-list-ol' },
                bands:         { label: 'Bands', icon: 'fas fa-layer-group' },
                criterionSets: { label: 'Criterion Sets', icon: 'fas fa-puzzle-piece' },
                logicTree:     { label: 'Logic Tree', icon: 'fas fa-project-diagram' },
                documents:     { label: 'Documents', icon: 'fas fa-file-pdf' },
                ruleVersions:  { label: 'Rule Versions', icon: 'fas fa-code-branch' }
            }
        });

        function accPanel(key) {
            return accordion.el.querySelector('[data-key="' + key + '"] .ui-accordion-content');
        }

        const attrBinding = new UIBinding(accred.table('accredAttribute'), { publome: accred });
        attrBinding.bindSelectEditor(accPanel('attributes'), { editor: 'inline' });
        bodyBinding.bindChildTable(attrBinding, 'bodyId');

        const bandBinding = new UIBinding(accred.table('accredBand'), { publome: accred });
        bandBinding.bindSelectEditor(accPanel('bands'), { editor: 'inline' });
        bodyBinding.bindChildTable(bandBinding, 'bodyId');

        const csBinding = new UIBinding(accred.table('accredCriterionSet'), { publome: accred });
        csBinding.bindSelectEditor(accPanel('criterionSets'), { editor: 'modal' });
        bodyBinding.bindChildTable(csBinding, 'bodyId');

        // LC tree editor for logic
        const lcCompBinding = new UIBinding(lc.table('lcComposition'), { publome: lc });
        const lcNodeBinding = new UIBinding(lc.table('lcNode'), { publome: lc });
        lcNodeBinding.bindTreeEditor(accPanel('logicTree'), {
            parentField: 'parentId',
            editor: 'modal',
            map: nodeMapFn,
            fieldMapping: LogicComposerService.nodeFieldMapping
        });
        lcCompBinding.bindChildTable(lcNodeBinding, 'compositionId');

        // Cross-service: criterion set → LC composition
        accred.table('accredCriterionSet').on('selected', (e) => {
            const composerCode = e.record.get('composerCode');
            const comp = lc.getComposition(composerCode);
            if (comp) lc.table('lcComposition').select(comp.idx);
        });

        const docBinding = new UIBinding(accred.table('accredDocument'), { publome: accred });
        docBinding.bindSelectEditor(accPanel('documents'), { editor: 'modal' });

        const rvBinding = new UIBinding(accred.table('accredRuleVersion'), { publome: accred });
        rvBinding.bindSelectEditor(accPanel('ruleVersions'), { editor: 'modal' });
        bodyBinding.bindChildTable(rvBinding, 'bodyId');

        // Stage tabs
        const tabs = new uiTabs({ parent: stageEl, template: 'underline', size: 'sm',
            content: {
                matrix:   { label: 'Criterion Matrix' },
                evaluate: { label: 'Evaluate' }
            },
            activeTab: 'matrix'
        });

        const stageArea = document.createElement('div');
        stageArea.className = 'ui-p-density-md';
        stageEl.appendChild(stageArea);

        let currentTab = 'matrix';
        tabs.bus.on('tabChange', (e) => { currentTab = e.tab; renderTab(e.tab); });
        accred.table('accredBody').on('selected', () => renderTab(currentTab));

        const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

        function getSelectedBody() {
            return accred.table('accredBody').getSelectedOne();
        }

        function renderTab(tab) {
            stageArea.innerHTML = '';
            if (tab === 'matrix') renderMatrix();
            else if (tab === 'evaluate') renderEvaluate();
        }

        function renderMatrix() {
            const body = getSelectedBody();
            if (!body) {
                new uiAlert({ parent: stageArea, message: 'Select an accreditation body to view the criterion matrix.', color: 'warning' });
                return;
            }
            const matrix = accred.getCriterionMatrix(body.idx);
            const bands = accred.getBands(body.idx);
            if (!matrix.length || !bands.length) {
                new uiAlert({ parent: stageArea, message: 'No attributes or bands defined for this body.', color: 'info' });
                return;
            }
            const bodyCode = body.get('code');
            stageArea.innerHTML = '<p class="ui-text-sm" style="color:var(--ui-gray-500);margin:0 0 var(--ui-space-3) 0">'
                + esc(bodyCode) + ': ' + matrix.length + ' attributes &times; ' + bands.length + ' bands = ' + (matrix.length * bands.length) + ' criterion sets</p>'
                + '<div style="overflow-x:auto;">'
                + '<table class="ui-table" style="width:100%;"><thead><tr><th>Attribute</th>'
                + bands.map(b => '<th style="text-align:center;">' + esc(b.get('label')) + '</th>').join('')
                + '</tr></thead><tbody>'
                + matrix.map(row => '<tr><td><strong>' + esc(row.attribute.code) + '</strong> — ' + esc(row.attribute.label) + '</td>'
                    + row.bands.map(b => {
                        if (b.criterionSet) {
                            return '<td class="matrix-cell" data-cs-idx="' + b.criterionSet.idx + '" title="' + esc(b.criterionSet.composerCode) + '" style="cursor:pointer;">'
                                + '<i class="fas fa-check-circle" style="color:var(--ui-success);"></i>'
                                + '<div class="ui-text-2xs" style="color:var(--ui-gray-500);">' + esc(b.criterionSet.composerCode) + '</div></td>';
                        }
                        return '<td class="matrix-cell matrix-na">&mdash;</td>';
                    }).join('')
                + '</tr>').join('')
                + '</tbody></table></div>';

            stageArea.addEventListener('click', (e) => {
                const cell = e.target.closest('[data-cs-idx]');
                if (!cell) return;
                const idx = parseInt(cell.dataset.csIdx);
                if (!isNaN(idx)) accred.table('accredCriterionSet').select(idx);
            });
        }

        function renderEvaluate() {
            const metricsRow = document.createElement('div');
            metricsRow.className = 'ui-flex ui-gap-density-4';
            stageArea.appendChild(metricsRow);

            new UIBinding(accred.table('accredEvaluation'), { publome: accred })
                .bindMetric(metricsRow, { compute: r => r.length, label: 'Evaluations', icon: 'fas fa-clipboard-check', color: 'primary' });
            new UIBinding(accred.table('accredEvalDetail'), { publome: accred })
                .bindMetric(metricsRow, { compute: r => r.filter(d => d.get('passed')).length, label: 'Passed Sets', icon: 'fas fa-check', color: 'accent' });

            const students = AccreditationService.sampleStudents;
            const form = new uiForm({
                parent: stageArea,
                template: 'default',
                fields: {
                    student: { type: 'select', label: 'Student', options: [
                        { value: '', label: '— Choose —' },
                        ...students.map((s, i) => ({ value: String(i), label: s.label + ' (' + s.id + ')' }))
                    ]}
                },
                buttons: {
                    evaluate: { label: 'Evaluate Student', variant: 'primary', type: 'button' },
                    cohort:   { label: 'Run Cohort', variant: 'outline', type: 'button' }
                }
            });

            const resultsDiv = document.createElement('div');
            stageArea.appendChild(resultsDiv);

            form.bus.on('buttonClick', (e) => {
                if (e.button === 'evaluate') {
                    resultsDiv.innerHTML = '';
                    const body = getSelectedBody();
                    if (!body) { new uiAlert({ parent: resultsDiv, message: 'Select a body first.', color: 'warning' }); return; }
                    const idx = parseInt(form.getValues().student);
                    if (isNaN(idx)) { new uiAlert({ parent: resultsDiv, message: 'Select a student.', color: 'warning' }); return; }
                    const student = students[idx];
                    const result = accred.evaluateEntity(body.idx, student.id, student.data, lc);
                    const passed = result.evaluation.get('passed');
                    resultsDiv.innerHTML = '<div class="eval-result ' + (passed ? 'pass' : 'fail') + '">'
                        + '<div class="eval-banner ' + (passed ? 'pass' : 'fail') + '">' + (passed ? 'PASSED' : 'FAILED') + '</div>'
                        + '<p>' + esc(student.label) + ' (' + esc(student.id) + ')</p>'
                        + '<p>' + result.details.filter(d => d.get('passed')).length + '/' + result.details.length + ' criterion sets passed</p>'
                        + '</div>';
                } else if (e.button === 'cohort') {
                    resultsDiv.innerHTML = '';
                    const body = getSelectedBody();
                    if (!body) { new uiAlert({ parent: resultsDiv, message: 'Select a body first.', color: 'warning' }); return; }
                    const results = accred.evaluateCohort(body.idx, students, lc);
                    const passed = results.filter(r => r.evaluation.get('passed')).length;
                    resultsDiv.innerHTML = '<div class="eval-result ' + (passed === results.length ? 'pass' : 'fail') + '">'
                        + '<div class="eval-banner ' + (passed === results.length ? 'pass' : 'fail') + '">Cohort: ' + passed + '/' + results.length + ' passed</div>'
                        + results.map(r => '<p>' + esc(r.entityId) + ': ' + (r.evaluation.get('passed') ? 'Pass' : 'Fail') + '</p>').join('')
                        + '</div>';
                }
            });
        }

        // Initial render
        renderTab('matrix');
    }

    // ── Settings — Admin + API Tester + About ───────────────────────────────

    _initSettings() {
        const tabPanel = this._getTabPanel('settings');
        const tabs = new uiTabs({
            template: 'underline', size: 'sm',
            content: {
                admin: { label: 'User Management', content: '' },
                api:   { label: 'API Tester', content: '' },
                about: { label: 'About', content: '' }
            },
            activeTab: 'admin',
            parent: tabPanel
        });

        // Admin — uses control+stage inside the sub-tab
        const adminPanel = tabs.el.querySelector('.ui-tabs-panel[data-tab="admin"]');
        try {
            const adminCS = new uiControlStage({ controlSize: 'md', parent: adminPanel });
            new UserManagementPanel().render(adminCS.getControlPanel(), adminCS.getStage());
        } catch (err) {
            console.warn('[AutoScholarApp] Admin panel failed:', err.message);
            AsEmptyState.render(adminPanel, { icon: 'fas fa-users-cog', title: 'Admin panel unavailable', message: err.message });
        }

        // API Tester
        const apiPanel = tabs.el.querySelector('.ui-tabs-panel[data-tab="api"]');
        try {
            const apiCS = new uiControlStage({ controlSize: 'md', parent: apiPanel });
            const renderer = new TestResultsRenderer(apiCS.getStage());
            const runner = new TestRunner({
                name: 'API',
                onResult: (result) => renderer.renderTestResult(result),
                onComplete: (summary) => {
                    renderer.removeProgressBar();
                    renderer.renderSummary(summary);
                }
            });
            const suite = new InstApiTestSuite({
                endpoint: this._endpoint,
                runner, renderer
            });
            suite.registerTests().then(() => {
                suite.renderControls(apiCS.getControlPanel());
                suite.renderExplorer(apiCS.getStage());
            });
        } catch (err) {
            console.warn('[AutoScholarApp] API panel failed:', err.message);
            AsEmptyState.render(apiPanel, { icon: 'fas fa-flask', title: 'API Tester unavailable', message: err.message });
        }

        // About — AutoScholarAbout uses El .add() pattern, wrap parent
        const aboutPanel = tabs.el.querySelector('.ui-tabs-panel[data-tab="about"]');
        try {
            if (typeof AutoScholarAbout !== 'undefined' && typeof El !== 'undefined') {
                const elParent = El.from(aboutPanel);
                new AutoScholarAbout({ parent: elParent }).render();
            } else {
                AsEmptyState.render(aboutPanel, { icon: 'fas fa-info-circle', title: 'About panel not loaded', message: 'AutoScholarAbout class is not available.' });
            }
        } catch (err) {
            console.warn('[AutoScholarApp] About panel failed:', err.message);
            AsEmptyState.render(aboutPanel, { icon: 'fas fa-info-circle', title: 'About panel unavailable', message: err.message });
        }
    }
}
