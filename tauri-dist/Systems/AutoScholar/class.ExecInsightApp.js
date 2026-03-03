/**
 * ExecInsightApp — Application shell for Executive Insight standalone page
 *
 * Extracts all orchestration from ExecutiveInsight.html into a class:
 *   - Year prompt overlay with data source selection
 *   - Tab creation and panel wiring
 *   - Header controls (year selector, source badge, export)
 *   - Export functions (Excel, CSV, PDF, Management Review)
 *   - Service bridge and project bridge initialization
 *   - Bus event orchestration
 *
 * Usage:
 *   const app = new ExecInsightApp({ appEl, authStatus, headerControls });
 *   app.init();
 */
class ExecInsightApp {

    constructor(config = {}) {
        this._appEl          = config.appEl || document.getElementById('app');
        this._authStatusEl   = config.authStatus || document.getElementById('auth-status');
        this._headerControls = config.headerControls || document.getElementById('exec-header-controls');
        this._yearSelectEl   = config.yearSelect || document.getElementById('exec-year-select');
        this._sourceBadgeEl  = config.sourceBadge || document.getElementById('exec-source-badge');
        this._exportBtnEl    = config.exportBtn || document.getElementById('exec-export-btn');

        this._publome = null;
        this._engine  = null;
        this._bus     = null;
        this._loader  = null;
        this._bridge  = null;
        this._projectBridge = null;
        this._tabs    = null;
        this._year    = new Date().getFullYear();
    }

    // ── Public API ────────────────────────────────────────────────────

    init() {
        if (this._authStatusEl && window.AS_SESSION) {
            this._authStatusEl.textContent = window.AS_SESSION.userId || 'authenticated';
        }

        this._publome = ExecSchema.create();
        this._engine  = new ExecMetrics(this._publome);
        this._bus     = new EventBus();

        this._buildTabs();
        this._buildOverlay();
        this._initLoader();
        this._initBridges();
        this._initPanels();
        this._wireHeaderControls();
        this._wireTabNavigation();

        // Debug handle
        window._execDebug = {
            publome: this._publome,
            engine: this._engine,
            bus: this._bus,
            loader: this._loader
        };
    }

    // ── Tabs ──────────────────────────────────────────────────────────

    _buildTabs() {
        this._tabs = new uiTabs({
            template: 'underline',
            size: 'sm',
            content: {
                summary:     { label: 'Summary',       content: '' },
                hierarchy:   { label: 'Assessment Performance', content: '' },
                performance: { label: 'Performance',   content: '' },
                students:    { label: 'Students',      content: '' },
                counts:      { label: 'Counts',        content: '' },
                assessment:  { label: 'Assessment',    content: '' },
                strategy:    { label: 'Strategy',      content: '' },
                reports:     { label: 'Reports',       content: '' },
                about:       { label: 'About',         content: '' }
            },
            activeTab: 'summary',
            parent: this._appEl
        });
    }

    // ── Overlay (prompt + spinner) ────────────────────────────────────

    _buildOverlay() {
        this._appEl.style.position = 'relative';

        var overlay = document.createElement('div');
        overlay.id = 'exec-loading-overlay';

        // State A: Year prompt card
        var promptCard = document.createElement('div');
        promptCard.className = 'exec-prompt-card';
        promptCard.innerHTML =
            '<div class="exec-prompt-icon"><i class="fas fa-tachometer-alt"></i></div>' +
            '<div class="exec-prompt-title">Executive Insight</div>' +
            '<div class="exec-prompt-subtitle">Select an academic year to load institutional data</div>';

        var promptSelect = document.createElement('select');
        promptSelect.className = 'exec-prompt-select';
        for (var py = this._year; py >= this._year - 4; py--) {
            var po = document.createElement('option');
            po.value = String(py);
            po.textContent = String(py);
            promptSelect.appendChild(po);
        }
        promptCard.appendChild(promptSelect);

        var loadBtn = document.createElement('button');
        loadBtn.className = 'ui-btn ui-btn-primary';
        loadBtn.className += ' ex-full-width';
        loadBtn.style.marginTop = '0.25rem';
        loadBtn.innerHTML = '<i class="fas fa-cloud-download-alt" style="margin-right:0.4rem;"></i>Load Data';
        promptCard.appendChild(loadBtn);
        overlay.appendChild(promptCard);

        // State B: Spinner
        var spinnerArea = document.createElement('div');
        spinnerArea.className = 'exec-spinner-area';
        new uiSpinner({ template: 'dots', size: 'lg', parent: spinnerArea });
        var spinnerLabel = document.createElement('div');
        spinnerLabel.className = 'exec-loading-label';
        spinnerLabel.textContent = 'Loading institutional data...';
        spinnerArea.appendChild(spinnerLabel);
        overlay.appendChild(spinnerArea);

        this._appEl.appendChild(overlay);

        // Store refs
        this._overlay      = overlay;
        this._promptCard   = promptCard;
        this._promptSelect = promptSelect;
        this._spinnerArea  = spinnerArea;
        this._spinnerLabel = spinnerLabel;

        // Load button click
        var self = this;
        loadBtn.addEventListener('click', function() {
            var year = parseInt(promptSelect.value, 10);
            self._loader.load(year).catch(function(err) {
                console.error('Executive Insight load failed:', err);
                if (self._authStatusEl) self._authStatusEl.textContent = 'ERROR';
                self._spinnerArea.style.display = 'none';
                self._promptCard.style.display = 'block';
                self._promptCard.innerHTML =
                    '<div class="exec-prompt-icon" style="background:var(--ui-danger-50,#fef2f2);color:var(--ui-danger-500,#ef4444);"><i class="fas fa-exclamation-triangle"></i></div>' +
                    '<div class="exec-prompt-title" style="color:var(--ui-danger-600,#dc2626);">Connection Failed</div>' +
                    '<div style="font-size:0.75rem;color:var(--ui-gray-500);margin:0.5rem 0;">' + err.message + '</div>' +
                    '<div style="font-size:0.65rem;color:var(--ui-gray-400);">Check DUT API at autoscholar.dut.ac.za</div>';
            });
        });
    }

    _showSpinner(year) {
        this._promptCard.style.display = 'none';
        this._spinnerLabel.textContent = 'Loading institutional data for ' + year + '...';
        this._spinnerArea.style.display = 'flex';
        this._overlay.style.display = 'flex';
    }

    _hideOverlay() {
        this._overlay.style.display = 'none';
        this._promptCard.style.display = 'block';
        this._spinnerArea.style.display = 'none';
    }

    // ── Data Loader ──────────────────────────────────────────────────

    _initLoader() {
        this._loader = new ExecDataLoader({
            publome: this._publome,
            engine: this._engine,
            bus: this._bus
        });

        var self = this;

        this._bus.on('exec:loading', function(data) {
            self._showSpinner(data.year);
        });

        this._bus.on('exec:loaded', function(data) {
            self._hideOverlay();
            self._onDataLoaded(data);
        });

        this._loader.listenForInstitutionChange();
    }

    _onDataLoaded(data) {
        // Audit log
        if (ServiceRegistry.has('audit')) {
            ServiceRegistry.get('audit').logAccess({
                resourceType: 'ExecutiveInsight',
                resourceId: String(data.year),
                accessType: 'view',
                metadata: { year: data.year, source: data.source || 'seed' }
            });
        }

        // API failure warning
        var existingWarn = document.getElementById('exec-api-warning');
        if (existingWarn) existingWarn.remove();
        if (data.error) {
            var warn = document.createElement('div');
            warn.id = 'exec-api-warning';
            warn.className = 'ex-info-box ex-info-warning';
            warn.style.margin = '0.5rem 1rem';
            warn.style.display = 'flex';
            warn.style.alignItems = 'center';
            warn.style.gap = '0.5rem';
            warn.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:' + 'var(--ex-clr-warning)' + ';"></i>' +
                '<span><strong>API unavailable:</strong> ' + data.error + '. Showing demo seed data.</span>' +
                '<span style="margin-left:auto;cursor:pointer;font-size:0.65rem;opacity:0.6;" onclick="this.parentNode.remove()">\u2715</span>';
            var tabsEl = document.querySelector('.ui-tabs');
            if (tabsEl) tabsEl.parentNode.insertBefore(warn, tabsEl);
        }

        // Show header controls
        if (this._headerControls) this._headerControls.style.display = 'flex';

        // Source badge
        var isLive = data.source === 'api';
        if (this._sourceBadgeEl) {
            this._sourceBadgeEl.textContent = isLive ? 'LIVE' : 'SEED';
            this._sourceBadgeEl.className = 'exec-source-badge ' + (isLive ? 'live' : 'seed');
        }

        // Year dropdown
        if (this._yearSelectEl) {
            var years = this._engine.getYears();
            this._yearSelectEl.innerHTML = '';
            for (var i = 0; i < years.length; i++) {
                var opt = document.createElement('option');
                opt.value = String(years[i]);
                opt.textContent = String(years[i]);
                this._yearSelectEl.appendChild(opt);
            }
            this._yearSelectEl.value = String(data.year);
        }
    }

    // ── Service Bridges ──────────────────────────────────────────────

    _initBridges() {
        this._bridge = new ExecServiceBridge({ publome: this._publome, bus: this._bus });
        this._bridge.init();

        var bridge = this._bridge;
        this._bus.on('exec:loading', function() { bridge._loading = true; });
        this._bus.on('exec:loaded', function() { bridge._loading = false; });

        if (typeof ExecProjectBridge !== 'undefined' && ServiceRegistry.has('project')) {
            this._projectBridge = new ExecProjectBridge({
                publome: this._publome,
                projectService: ServiceRegistry.get('project')
            });
        }
    }

    // ── Panels ───────────────────────────────────────────────────────

    _initPanels() {
        var config = {
            publome: this._publome,
            engine: this._engine,
            year: this._year,
            loader: this._loader,
            bridge: this._bridge,
            projectBridge: this._projectBridge
        };

        var panelClasses = [
            ['summary',     ExecSummaryPanel],
            ['hierarchy',   ExecHierarchyPanel],
            ['performance', ExecPerformancePanel],
            ['students',    ExecStudentsPanel],
            ['counts',      ExecCountsPanel],
            ['assessment',  ExecAssessmentPanel],
            ['strategy',    ExecStrategyPanel],
            ['reports',     ExecReportsPanel]
        ];

        var tabsEl = this._tabs.el;
        var bus = this._bus;

        panelClasses.forEach(function(pair) {
            var key = pair[0], PanelClass = pair[1];
            var panel = new PanelClass(config);
            panel.connectBus(bus);
            panel.render(tabsEl.querySelector('.ui-tabs-panel[data-tab="' + key + '"]'));
        });

        var aboutPanel = new ExecAboutPanel({ publome: this._publome });
        aboutPanel.render(tabsEl.querySelector('.ui-tabs-panel[data-tab="about"]'));
    }

    // ── Header Controls ──────────────────────────────────────────────

    _wireHeaderControls() {
        var self = this;

        // Year change
        if (this._yearSelectEl) {
            this._yearSelectEl.addEventListener('change', function() {
                var newYear = parseInt(self._yearSelectEl.value, 10);
                if (newYear) self._loader.load(newYear);
            });
        }

        // Export button
        if (this._exportBtnEl) {
            this._exportBtnEl.addEventListener('click', function() {
                self._buildExportModal();
            });
        }
    }

    // ── Tab Navigation ───────────────────────────────────────────────

    _wireTabNavigation() {
        var tabs = this._tabs;
        this._bus.on('tab:navigate', function(data) {
            if (data.tab && tabs.setActive) {
                tabs.setActive(data.tab);
                if (ServiceRegistry.has('audit')) {
                    ServiceRegistry.get('audit').logAccess({
                        resourceType: 'tab',
                        resourceId: data.tab,
                        accessType: 'view'
                    });
                }
            }
        });
    }

    // ── Export Modal ──────────────────────────────────────────────────

    _buildExportModal() {
        var self = this;
        var body = document.createElement('div');
        var cards = [
            { icon: 'fa-file-excel', iconBg: '#065f4620', iconColor: 'var(--ex-clr-success)',
              title: 'Executive Summary', desc: 'Excel workbook \u2014 Summary, Faculty Comparison, Year-over-Year Trends',
              action: function(m) { self._exportExcel(m); } },
            { icon: 'fa-file-csv', iconBg: '#1e40af20', iconColor: 'var(--ex-clr-primary)',
              title: 'Metrics Data', desc: 'CSV flat export \u2014 all metric observations with entity names',
              action: function(m) { self._exportCSV(m); } },
            { icon: 'fa-file-pdf', iconBg: '#dc262620', iconColor: 'var(--ex-clr-danger)',
              title: 'PDF Summary', desc: 'Print-ready summary \u2014 hides controls, shows KPIs only',
              action: function(m) { m.close(); document.body.classList.add('ex-print-mode'); window.print(); document.body.classList.remove('ex-print-mode'); } },
            { icon: 'fa-print', iconBg: '#7c3aed20', iconColor: 'var(--ex-clr-purple)',
              title: 'Print View', desc: 'Browser print dialog \u2014 hides chrome, shows summary',
              action: function(m) { m.close(); window.print(); } },
            { icon: 'fa-clipboard-check', iconBg: '#f9731620', iconColor: 'var(--ex-clr-orange)',
              title: 'Management Review', desc: 'Excel sheet \u2014 ISO clauses, metrics, targets, interventions, PDSA status',
              action: function(m) { self._exportManagementReview(m); } }
        ];

        for (var i = 0; i < cards.length; i++) {
            (function(c) {
                var card = document.createElement('div');
                card.className = 'exec-export-card';
                card.innerHTML =
                    '<div class="exec-export-icon" style="background:' + c.iconBg + ';color:' + c.iconColor + ';">' +
                        '<i class="fas ' + c.icon + '"></i>' +
                    '</div>' +
                    '<div>' +
                        '<div class="exec-export-title">' + c.title + '</div>' +
                        '<div class="exec-export-desc">' + c.desc + '</div>' +
                    '</div>';
                card.addEventListener('click', function() { c.action(modal); });
                body.appendChild(card);
            })(cards[i]);
        }

        var modal = new uiModal({ title: 'Export Report', content: body, size: 'sm', showClose: true });
    }

    // ── Excel Export ─────────────────────────────────────────────────

    _exportExcel(modal) {
        modal.close();
        if (typeof XLSX === 'undefined') {
            uiToast.show({ message: 'SheetJS library not loaded', color: 'danger' });
            return;
        }
        var wb = XLSX.utils.book_new();
        var entityTable = this._publome.table('entity');
        var metricTable = this._publome.table('metric');
        var years = this._engine.getYears();
        var currentYear = years[0] || this._year;
        var metrics = metricTable.all();

        // Sheet 1: Summary
        var headerRow = ['Entity', 'Type', 'Students'];
        for (var m = 0; m < metrics.length; m++) {
            headerRow.push(metrics[m].get('name') + ' (' + (metrics[m].get('unit') || '') + ')');
        }
        var summaryData = [headerRow];
        var engine = this._engine;
        entityTable.all().forEach(function(ent) {
            var row = [ent.get('name'), ent.get('type'), ent.get('students') || 0];
            for (var m2 = 0; m2 < metrics.length; m2++) {
                var val = engine.getValue(metrics[m2].get('idx'), ent.get('idx'), currentYear);
                row.push(val != null ? val : '');
            }
            summaryData.push(row);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

        // Sheet 2: Faculty Comparison
        var facHeader = ['Faculty', 'Students'];
        for (var m3 = 0; m3 < metrics.length; m3++) { facHeader.push(metrics[m3].get('name')); }
        var facData = [facHeader];
        entityTable.all().filter(function(e) { return e.get('type') === 'faculty'; }).forEach(function(fac) {
            var fRow = [fac.get('name'), fac.get('students') || 0];
            for (var m4 = 0; m4 < metrics.length; m4++) {
                var fVal = engine.getValue(metrics[m4].get('idx'), fac.get('idx'), currentYear);
                fRow.push(fVal != null ? fVal : '');
            }
            facData.push(fRow);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(facData), 'Faculty Comparison');

        // Sheet 3: Year-over-Year Trends
        var inst = entityTable.all().find(function(e) { return e.get('type') === 'institution'; });
        var trendHeader = ['Metric'];
        for (var y = 0; y < years.length; y++) { trendHeader.push(String(years[y])); }
        var trendData = [trendHeader];
        if (inst) {
            for (var m5 = 0; m5 < metrics.length; m5++) {
                var tRow = [metrics[m5].get('name')];
                for (var y2 = 0; y2 < years.length; y2++) {
                    var tVal = engine.getValue(metrics[m5].get('idx'), inst.get('idx'), years[y2]);
                    tRow.push(tVal != null ? tVal : '');
                }
                trendData.push(tRow);
            }
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendData), 'Year-over-Year Trends');

        var instName = (inst ? inst.get('name') : 'Institution').replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(wb, 'Executive_Summary_' + instName + '_' + currentYear + '.xlsx');
        uiToast.show({ message: 'Excel workbook exported', color: 'success' });
        this._logExport('Exported Executive Summary (Excel)');
    }

    // ── Management Review Export ──────────────────────────────────────

    _exportManagementReview(modal) {
        modal.close();
        if (typeof XLSX === 'undefined') {
            uiToast.show({ message: 'SheetJS library not loaded', color: 'danger' });
            return;
        }
        var wb = XLSX.utils.book_new();
        var metricTable = this._publome.table('metric');
        var catTable = this._publome.table('metricCategory');
        var intTable = this._publome.table('intervention');
        var pdsaTable = this._publome.table('pdsaCycle');
        var entityTable = this._publome.table('entity');
        var inst = entityTable.all().find(function(e) { return e.get('type') === 'institution'; });
        var instIdx = inst ? inst.get('idx') : null;
        var currentYear = this._engine.getYears()[0] || this._year;
        var engine = this._engine;

        var clauseMap = {
            'Student Success': '8.5 \u2014 Educational service delivery',
            'Teaching Quality': '7.1.2 \u2014 Competence of personnel',
            'Student Experience': '8.2 \u2014 Student requirements',
            'Operational Excellence': '9.1 \u2014 Monitoring, measurement, analysis'
        };

        var header = ['ISO 21001 Clause', 'Category', 'Metric', 'Unit', 'Value (' + currentYear + ')', 'Target', 'Benchmark', 'Status', 'Interventions', 'PDSA Active'];
        var data = [header];

        catTable.all().forEach(function(cat) {
            var catName = cat.get('name');
            var clause = clauseMap[catName] || 'General';
            var catMetrics = metricTable.all().filter(function(m) { return m.get('metricCategoryId') === cat.get('idx'); });
            catMetrics.forEach(function(m) {
                var mIdx = m.get('idx');
                var val = instIdx ? engine.getValue(mIdx, instIdx, currentYear) : null;
                var target = m.get('target');
                var benchmark = m.get('benchmark');
                var unit = m.get('unit') || '';
                var status = val != null && target != null ? (val >= target ? 'On Target' : val >= benchmark ? 'Watch' : 'Below Benchmark') : '\u2014';
                var ints = intTable.all().filter(function(i) { return i.get('metricId') === mIdx; });
                var intNames = ints.map(function(i) { return i.get('name') + ' (' + (i.get('status') || '') + ')'; }).join('; ');
                var activePdsa = 0;
                ints.forEach(function(i) {
                    activePdsa += pdsaTable.all().filter(function(p) { return p.get('interventionId') === i.get('idx') && p.get('status') === 'active'; }).length;
                });
                data.push([clause, catName, m.get('name'), unit, val != null ? val : '', target || '', benchmark || '', status, intNames || '\u2014', activePdsa]);
            });
        });

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Management Review');
        var instName = (inst ? inst.get('name') : 'Institution').replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(wb, 'Management_Review_' + instName + '_' + currentYear + '.xlsx');
        uiToast.show({ message: 'Management Review exported', color: 'success' });
        this._logExport('Exported Management Review (Excel)');
    }

    // ── CSV Export ────────────────────────────────────────────────────

    _exportCSV(modal) {
        modal.close();
        var entityTable = this._publome.table('entity');
        var metricTable = this._publome.table('metric');
        var obsTable = this._publome.table('metricObservation');
        var entityMap = {};
        entityTable.all().forEach(function(e) { entityMap[e.get('idx')] = e; });
        var metricMap = {};
        metricTable.all().forEach(function(m) { metricMap[m.get('idx')] = m; });
        var rows = ['Entity,Entity Type,Metric,Unit,Year,Value'];
        obsTable.all().forEach(function(o) {
            var ent = entityMap[o.get('entityId')];
            var met = metricMap[o.get('metricId')];
            if (!ent || !met) return;
            var name = '"' + (ent.get('name') || '').replace(/"/g, '""') + '"';
            var mName = '"' + (met.get('name') || '').replace(/"/g, '""') + '"';
            rows.push([name, ent.get('type'), mName, met.get('unit') || '', o.get('year'), o.get('value')].join(','));
        });
        var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var inst = entityTable.all().find(function(e) { return e.get('type') === 'institution'; });
        var instName = (inst ? inst.get('name') : 'Institution').replace(/[^a-zA-Z0-9]/g, '_');
        a.download = 'Metrics_Data_' + instName + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        uiToast.show({ message: 'CSV data exported', color: 'success' });
        this._logExport('Exported Metrics Data (CSV)');
    }

    // ── Audit Helper ─────────────────────────────────────────────────

    _logExport(description) {
        if (ServiceRegistry.has('audit')) {
            ServiceRegistry.get('audit').logAction({
                action: 'export',
                entityType: 'report',
                description: description
            });
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExecInsightApp };
}
if (typeof window !== 'undefined') {
    window.ExecInsightApp = ExecInsightApp;
}
