/**
 * StaffAdminPanel - Dedicated admin panel for Staff Access CRUD
 *
 * Self-contained class that renders a clean admin interface using
 * modal-mode bindSelectEditor to avoid nested control-stage issues.
 *
 * Controls (left): API URL input, Connect & Load button, status badge
 * Stage (right): list selector with modal create/edit/delete
 */

class StaffAdminPanel {

    constructor(config = {}) {
        this.apiUrl = config.apiUrl || 'http://localhost:8082/api/v1';
        this.staffAccess = new StaffAccessService();
        this.staffTable = this.staffAccess.table('staffCourse');

        this.dbBinding = null;
        this.uiBinding = null;
        this._statusBadge = null;
        this._loaded = false;
    }

    render(controlPanel, stagePanel) {
        this._controlPanel = controlPanel;
        this._stagePanel = stagePanel;

        controlPanel.className = 'sa-control';

        // URL input
        const controls = document.createElement('div');
        controls.className = 'sa-controls-inner';
        controlPanel.appendChild(controls);

        this._urlInput = new uiInput({ template: 'inline-label', label: 'API URL', value: this.apiUrl, size: 'sm', parent: controls });

        new uiButton({
            label: 'Connect & Load',
            variant: 'primary',
            size: 'sm',
            parent: controls,
            onClick: () => this.load()
        });

        // Status pinned to bottom
        const statusBar = document.createElement('div');
        statusBar.className = 'sa-status-bar';
        controlPanel.appendChild(statusBar);

        this._statusBadge = new uiBadge({ label: 'Disconnected', color: 'gray', size: 'sm', parent: statusBar });
        this._countWrapper = document.createElement('div');
        statusBar.appendChild(this._countWrapper);
    }

    async load() {
        try {
            // Read URL from input
            const inputEl = this._urlInput.el.querySelector('input') || this._urlInput.el;
            this.apiUrl = inputEl.value;

            this._statusBadge.update({ label: 'Connecting...', color: 'blue' });

            // Recreate backend with current URL + column map for PG lowercase → schema camelCase
            const backend = new ServiceBackend({ apiUrl: this.apiUrl });
            const schemaTable = StaffAccessSchema.tables.find(t => t.name === 'staffCourse');
            const columnMap = ServiceBackendAdapter.buildColumnMap(schemaTable);
            const adapter = new ServiceBackendAdapter(backend, { columnMap });

            this.dbBinding = new DbBinding(this.staffTable, {
                db: adapter,
                tableName: 'as_staffcourse'
            });

            const records = await this.dbBinding.read();
            this._statusBadge.update({ label: 'Connected', color: 'green' });
            this._updateCount(records.length);

            if (!this._loaded) {
                this._wireBindings();
                this._loaded = true;
            }
        } catch (e) {
            this._statusBadge.update({ label: 'Error: ' + e.message, color: 'red' });
        }
    }

    _updateCount(count) {
        this._countWrapper.innerHTML = '';
        new uiBadge({
            label: `${count} records`,
            color: 'primary',
            size: 'sm',
            parent: this._countWrapper
        });
    }

    _wireBindings() {
        this.uiBinding = new UIBinding(this.staffTable, { publome: this.staffAccess });
        this.uiBinding.bindSelectEditor(this._stagePanel, { editor: 'modal', size: 'sm' });

        const updateCount = () => this._updateCount(this.staffTable.all().length);
        this.staffTable.on('created', updateCount);
        this.staffTable.on('deleted', updateCount);
        this.staffTable.on('loaded', updateCount);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StaffAdminPanel;
}
if (typeof window !== 'undefined') {
    window.StaffAdminPanel = StaffAdminPanel;
}
