/**
 * ExecutiveInsightPanel - Services panel integration for Executive Insight
 *
 * Composes existing Exec*Panel classes into the control-stage layout.
 * Each service card maps to a focused view using the appropriate panel.
 *
 * Usage:
 *   const panel = new ExecutiveInsightPanel({ executiveService, view: 'dashboard' });
 *   panel.render(controlEl, stageEl);
 */
class ExecutiveInsightPanel {

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._executiveService = config.executiveService || null;
        this._activeView = config.view || 'dashboard';
        this._year = 2025;
        this._entityIdx = null;
        this._bus = null;
        this._publome = null;
        this._engine = null;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._initData();
        this._bus = new EventBus();
        this._buildControl();
        this._renderView();
    }

    setView(viewName) {
        this._activeView = viewName;
        this._renderView();
    }

    // ── Data Initialization ──────────────────────────────────────────────────

    _initData() {
        if (this._executiveService) {
            this._publome = this._executiveService;
            this._engine = this._executiveService.getEngine();
            this._entityIdx = this._executiveService.getInstitutionIdx();
        } else {
            // Fallback: create from ExecSchema
            if (typeof ExecSchema !== 'undefined' && typeof Publome !== 'undefined') {
                this._publome = ExecSchema.create();
                ExecSchema.seed(this._publome);
                this._engine = new ExecMetrics(this._publome);
                const inst = this._publome.table('entity').all().find(e => e.get('type') === 'institution');
                this._entityIdx = inst ? inst.get('idx') : 1;
            }
        }

        // Resolve available years
        if (this._engine) {
            const years = this._engine.getYears();
            if (years.length > 0) this._year = years[0];
        }
    }

    // ── Control Panel ────────────────────────────────────────────────────────

    _buildControl() {
        if (!this._controlEl) return;
        this._controlEl.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'ex-dark-header';
        header.innerHTML = `
            <div class="ex-dark-header-title">
                <i class="fas fa-tachometer-alt" style="color:var(--ui-primary-400);"></i>
                <span>Executive Insight</span>
            </div>
            <div class="ex-dark-header-sub">${this._getViewLabel()}</div>
        `;
        this._controlEl.appendChild(header);

        // Year selector
        const yearSection = document.createElement('div');
        yearSection.className = 'ex-dark-section';
        const yearLabel = document.createElement('div');
        yearLabel.className = 'ex-dark-label';
        yearLabel.textContent = 'Academic Year';
        yearSection.appendChild(yearLabel);

        const yearSelect = document.createElement('select');
        yearSelect.className = 'ex-dark-select';
        const years = this._engine ? this._engine.getYears() : Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === this._year) opt.selected = true;
            yearSelect.appendChild(opt);
        });
        yearSelect.addEventListener('change', () => {
            this._year = parseInt(yearSelect.value);
            if (this._engine) this._engine.clearCache();
            if (this._bus) this._bus.emit('year:changed', { year: this._year });
            this._renderView();
        });
        yearSection.appendChild(yearSelect);
        this._controlEl.appendChild(yearSection);

        // Entity tree
        const treeSection = document.createElement('div');
        treeSection.className = 'ex-dark-section-scroll';
        const treeLabel = document.createElement('div');
        treeLabel.className = 'ex-dark-label as-mb-2';
        treeLabel.textContent = 'Entity Hierarchy';
        treeSection.appendChild(treeLabel);
        this._buildEntityTree(treeSection);
        this._controlEl.appendChild(treeSection);

        // View switcher (for multi-view navigation)
        const viewSection = document.createElement('div');
        viewSection.className = 'ex-dark-section-border';
        const views = [
            { key: 'dashboard', label: 'Dashboard', icon: 'tachometer-alt' },
            { key: 'counts', label: 'Enrolment', icon: 'chart-line' },
            { key: 'performance', label: 'Performance', icon: 'filter' },
            { key: 'students', label: 'Retention', icon: 'user-check' },
            { key: 'comparison', label: 'Comparison', icon: 'chart-bar' },
            { key: 'healthMatrix', label: 'Health Matrix', icon: 'th' },
            { key: 'rehearsal', label: 'Decision Rehearsal', icon: 'flask' },
            { key: 'reports', label: 'Reports', icon: 'file-alt' }
        ];
        views.forEach(v => {
            const btn = document.createElement('div');
            const isActive = v.key === this._activeView;
            btn.className = 'ex-dark-nav-btn' + (isActive ? ' active' : '');
            btn.innerHTML = `<i class="fas fa-${v.icon}"></i>${v.label}`;
            btn.addEventListener('click', () => {
                this._activeView = v.key;
                this._buildControl();
                this._renderView();
            });
            viewSection.appendChild(btn);
        });
        this._controlEl.appendChild(viewSection);
    }

    // ── Entity Tree ──────────────────────────────────────────────────────────

    _buildEntityTree(container) {
        if (!this._publome) return;
        const entities = this._publome.table('entity').all();
        const roots = entities.filter(e => !e.get('parentId'));
        roots.forEach(root => this._renderTreeNode(root, container, 0));
    }

    _renderTreeNode(entity, container, depth) {
        const idx = entity.get('idx');
        const isSelected = idx === this._entityIdx;
        const type = entity.get('type');
        const icon = type === 'institution' ? 'university' : type === 'faculty' ? 'building' : 'book';

        const node = document.createElement('div');
        node.className = 'ex-dark-tree-node' + (isSelected ? ' active' : '');
        node.style.paddingLeft = (0.4 + depth * 0.75) + 'rem';
        node.innerHTML = `<i class="fas fa-${icon}"></i><span>${entity.get('name')}</span>`;

        node.addEventListener('click', () => {
            this._entityIdx = idx;
            if (this._bus) this._bus.emit('entity:selected', { idx });
            this._buildControl();
            this._renderView();
        });

        container.appendChild(node);

        // Render children
        const children = this._publome.table('entity').all().filter(e => e.get('parentId') === idx);
        children.forEach(child => this._renderTreeNode(child, container, depth + 1));
    }

    // ── Stage Views ──────────────────────────────────────────────────────────

    _renderView() {
        if (!this._stageEl || !this._publome || !this._engine) return;
        this._stageEl.innerHTML = '';

        const config = {
            publome: this._publome,
            engine: this._engine,
            year: this._year
        };

        let panel = null;

        switch (this._activeView) {
            case 'dashboard':
                if (typeof ExecSummaryPanel !== 'undefined') {
                    panel = new ExecSummaryPanel(config);
                }
                break;
            case 'counts':
                if (typeof ExecCountsPanel !== 'undefined') {
                    panel = new ExecCountsPanel(config);
                }
                break;
            case 'performance':
                if (typeof ExecPerformancePanel !== 'undefined') {
                    panel = new ExecPerformancePanel(config);
                }
                break;
            case 'students':
                if (typeof ExecStudentsPanel !== 'undefined') {
                    panel = new ExecStudentsPanel(config);
                }
                break;
            case 'comparison':
                if (typeof ExecHierarchyPanel !== 'undefined') {
                    panel = new ExecHierarchyPanel(config);
                }
                break;
            case 'healthMatrix':
                if (typeof HealthMatrix !== 'undefined') {
                    const matrixWrap = document.createElement('div');
                    matrixWrap.className = 'as-p-4';
                    this._stageEl.appendChild(matrixWrap);
                    const matrix = new HealthMatrix(config);
                    if (this._bus && matrix.connectBus) matrix.connectBus(this._bus);
                    matrix.render(matrixWrap);
                    return;
                }
                break;
            case 'rehearsal':
                if (typeof ExecDecisionRehearsalPanel !== 'undefined') {
                    panel = new ExecDecisionRehearsalPanel(config);
                }
                break;
            case 'reports':
                if (typeof ExecReportsPanel !== 'undefined') {
                    panel = new ExecReportsPanel(config);
                }
                break;
        }

        if (panel) {
            if (this._bus && panel.connectBus) panel.connectBus(this._bus);
            if (this._entityIdx && panel._entityIdx !== undefined) {
                panel._entityIdx = this._entityIdx;
            }
            panel.render(this._stageEl);
        } else {
            this._stageEl.innerHTML = `<div class="ex-empty">
                <i class="fas fa-tachometer-alt"></i>
                <div class="ex-empty-msg">Panel not available for view: ${this._activeView}</div>
            </div>`;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _getViewLabel() {
        const labels = {
            dashboard: 'KPI Dashboard',
            counts: 'Enrolment Trends',
            performance: 'Throughput Analysis',
            students: 'Retention Analytics',
            comparison: 'Programme Benchmarking',
            healthMatrix: 'Programme Health Matrix',
            rehearsal: 'Decision Rehearsal',
            reports: 'Assessment Reports'
        };
        return labels[this._activeView] || 'Executive Insight';
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExecutiveInsightPanel };
}
if (typeof window !== 'undefined') {
    window.ExecutiveInsightPanel = ExecutiveInsightPanel;
}
