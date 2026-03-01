/**
 * PublonBinding - Base class for synchronizing PublonTable with external sources
 *
 * Bindings subscribe to table events and sync changes to external sources
 * (database, API, file, UI). They own their mappings (e.g., memoryIdx → dbIdx).
 *
 * Key concepts:
 * - Origin tracking: Bindings pass themselves as 'origin' when they initiate
 *   changes, and skip events they initiated (prevents infinite loops)
 * - Own EventBus: Bindings emit completion events ('created', 'updated', etc.)
 *
 * @example
 * class MyBinding extends PublonBinding {
 *     async create(record) {
 *         // Sync to external source
 *         await myApi.save(record.getData());
 *         this._emit('created', { record });
 *     }
 * }
 */

class PublonBinding {
    /**
     * Create a new binding
     * @param {PublonTable} table - The table to bind
     * @param {Object} [config]
     * @param {string} [config.name] - Binding name (e.g., 'db', 'api')
     */
    constructor(table, config = {}) {
        if (!table) {
            throw new Error('PublonBinding requires a PublonTable');
        }

        this._id = PublonRegistry.register(this, 'binding');
        this.table = table;
        this.name = config.name || 'binding';

        // Own EventBus for completion events
        this._eventBus = new EventBus();
        this._subscriptions = [];

        // Subscribe to table events
        this._subscribe();
    }

    get id() { return this._id; }

    // ─────────────────────────────────────────────────────────────────────────
    // EventBus (for completion events)
    // ─────────────────────────────────────────────────────────────────────────

    on(event, handler) { return this._eventBus.on(event, handler); }
    once(event, handler) { return this._eventBus.once(event, handler); }
    off(event, handler) { this._eventBus.off(event, handler); }

    _emit(event, payload) {
        this._eventBus.emit(event, {
            binding: this,
            bindingId: this._id,
            bindingName: this.name,
            tableName: this.table.name,
            ...payload
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Subscribe to Table Events
    // ─────────────────────────────────────────────────────────────────────────

    _subscribe() {
        this._subscriptions.push(
            this.table.on('created', (e) => this._onTableCreated(e)),
            this.table.on('updated', (e) => this._onTableUpdated(e)),
            this.table.on('deleted', (e) => this._onTableDeleted(e)),
            this.table.on('loaded', (e) => this._onTableLoaded(e)),
            this.table.on('cleared', (e) => this._onTableCleared(e))
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers (with origin tracking)
    // ─────────────────────────────────────────────────────────────────────────

    async _onTableCreated(e) {
        if (e.origin === this) return;  // Skip if we initiated
        try {
            await this.create(e.record);
        } catch (err) {
            console.error(`${this.name} binding: Error on create`, err);
            this._emit('error', { operation: 'create', record: e.record, error: err });
        }
    }

    async _onTableUpdated(e) {
        if (e.origin === this) return;
        try {
            await this.update(e.record, e.changes);
        } catch (err) {
            console.error(`${this.name} binding: Error on update`, err);
            this._emit('error', { operation: 'update', record: e.record, error: err });
        }
    }

    async _onTableDeleted(e) {
        if (e.origin === this) return;
        try {
            await this.delete(e.record);
        } catch (err) {
            console.error(`${this.name} binding: Error on delete`, err);
            this._emit('error', { operation: 'delete', record: e.record, error: err });
        }
    }

    async _onTableLoaded(e) {
        // Subclass can override
    }

    async _onTableCleared(e) {
        // Subclass can override
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD (subclass implements)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sync a created record to external source
     * @param {Publon} record
     */
    async create(record) {
        // Subclass implements
    }

    /**
     * Read from external source and push to table
     */
    async read() {
        // Subclass implements
    }

    /**
     * Sync an updated record to external source
     * @param {Publon} record
     * @param {Object} changes
     */
    async update(record, changes) {
        // Subclass implements
    }

    /**
     * Sync a deleted record to external source
     * @param {Publon} record
     */
    async delete(record) {
        // Subclass implements
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Push Helpers (for two-way sync)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Push a create from external source to table
     * @param {Object} data
     * @returns {Publon}
     */
    pushCreate(data) {
        return this.table.create(data, { origin: this });
    }

    /**
     * Push an update from external source to table
     * @param {*} idx - Primary key
     * @param {Object} data
     * @returns {Publon|null}
     */
    pushUpdate(idx, data) {
        return this.table.update(idx, data, { origin: this });
    }

    /**
     * Push a delete from external source to table
     * @param {*} idx - Primary key
     * @returns {boolean}
     */
    pushDelete(idx) {
        return this.table.delete(idx, { origin: this });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Destroy binding and unsubscribe
     */
    destroy() {
        this._subscriptions.forEach(unsub => unsub());
        this._subscriptions = [];
        this._eventBus.clear();
        PublonRegistry.unregister(this._id);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PublonBinding;
}
if (typeof window !== 'undefined') {
    window.PublonBinding = PublonBinding;
}
