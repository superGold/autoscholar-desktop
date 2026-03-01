/**
 * PublonTable - Collection of Publon records
 *
 * Owns everything: schema, EventBus, CRUD, selection, validation, labelling.
 *
 * @example
 * const users = new PublonTable({
 *     name: 'users',
 *     schema: {
 *         idx: { type: 'number', primaryKey: true },
 *         name: { type: 'string', required: true },
 *         email: { type: 'string', format: 'email' }
 *     },
 *     labeller: '{name}'
 * });
 *
 * const user = users.create({ name: 'John', email: 'john@test.com' });
 * users.on('updated', (e) => console.log('Changed:', e.record));
 */

class PublonTable {
    /**
     * Create a new PublonTable
     * @param {Object} config
     * @param {string} config.name - Table name
     * @param {Object|Array} config.schema - Column definitions
     * @param {string} [config.primaryKey] - Primary key field (default: 'idx')
     * @param {string} [config.selectionMode] - 'single' | 'multi' | 'none'
     * @param {string|Function} [config.labeller] - Label template or function
     * @param {Object} [config.uiSpec] - UI rendering hints
     */
    constructor(config = {}) {
        this._id = PublonRegistry.register(this, 'table');
        this.name = config.name || 'unnamed';
        this.schema = this._normalizeSchema(config.schema || config.columns || {});
        this.primaryKey = config.primaryKey || this._detectPrimaryKey() || 'idx';
        this.selectionMode = config.selectionMode || 'single';

        // Labelling
        this.labeller = this._processLabeller(config.labeller);

        // UI hints
        this.uiSpec = config.uiSpec || {};

        // State
        this.records = [];
        this._recordMap = new Map();  // idx → Publon
        this.selection = new Set();
        this._nextIdx = 1;

        // Per-table EventBus (NOT global)
        this._eventBus = new EventBus();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Identity
    // ─────────────────────────────────────────────────────────────────────────

    get id() { return this._id; }

    /** Alias for records — backwards compatibility for table.rows access pattern */
    get rows() { return this.records; }

    // ─────────────────────────────────────────────────────────────────────────
    // Schema Handling
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Normalize schema to object format
     * Supports both array and object formats
     * @private
     */
    _normalizeSchema(schema) {
        if (Array.isArray(schema)) {
            const obj = {};
            for (const col of schema) {
                obj[col.name] = col;
            }
            return obj;
        }
        return schema;
    }

    /**
     * Detect primary key from schema
     * @private
     */
    _detectPrimaryKey() {
        for (const [field, def] of Object.entries(this.schema)) {
            if (def.primaryKey) return field;
        }
        return null;
    }

    /**
     * Get column definition
     * @param {string} field - Field name
     * @returns {Object|null}
     */
    getColumn(field) {
        return this.schema[field] || null;
    }

    /**
     * Get all column names
     * @returns {string[]}
     */
    getColumnNames() {
        return Object.keys(this.schema);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EventBus
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} handler - Callback
     * @returns {Function} Unsubscribe function
     */
    on(event, handler) {
        return this._eventBus.on(event, handler);
    }

    /**
     * Subscribe once
     */
    once(event, handler) {
        return this._eventBus.once(event, handler);
    }

    /**
     * Unsubscribe
     */
    off(event, handler) {
        this._eventBus.off(event, handler);
    }

    /**
     * Emit an event
     * @private
     */
    _emit(event, payload) {
        this._eventBus.emit(event, {
            table: this,
            tableId: this._id,
            tableName: this.name,
            ...payload
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Record Change Handlers (called by Publon)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Called when a single field changes
     * @private
     */
    _onRecordChanged(record, field, oldValue, newValue, origin) {
        this._emit('updated', {
            record,
            changes: { [field]: { oldValue, newValue } },
            origin: origin || null
        });
    }

    /**
     * Called on bulk field changes
     * @private
     */
    _onRecordBulkChanged(record, changes, origin) {
        this._emit('updated', {
            record,
            changes,
            origin: origin || null
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD Operations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a new record
     * @param {Object} data - Record data
     * @param {Object} [options]
     * @param {Object} [options.origin] - Binding that initiated this
     * @returns {Publon}
     */
    create(data = {}, options = {}) {
        // Apply schema defaults
        const dataWithDefaults = this._applyDefaults(data);

        // Create Publon
        const publon = new Publon(dataWithDefaults, this);

        // Assign primary key if not provided
        if (dataWithDefaults[this.primaryKey] === undefined) {
            publon._idx = this._nextIdx++;
            publon._data[this.primaryKey] = publon._idx;
        } else {
            publon._idx = dataWithDefaults[this.primaryKey];
            // Update nextIdx to avoid collision
            if (typeof publon._idx === 'number' && publon._idx >= this._nextIdx) {
                this._nextIdx = publon._idx + 1;
            }
        }

        // Add to collection
        this.records.push(publon);
        this._recordMap.set(publon._idx, publon);

        // Emit event
        this._emit('created', {
            record: publon,
            origin: options.origin || null
        });

        return publon;
    }

    /**
     * Apply schema defaults to data
     * @private
     */
    _applyDefaults(data) {
        const result = { ...data };

        for (const [field, def] of Object.entries(this.schema)) {
            if (result[field] === undefined && def.default !== undefined) {
                result[field] = typeof def.default === 'function'
                    ? def.default()
                    : def.default;
            }
        }

        return result;
    }

    /**
     * Read a record by primary key
     * @param {*} idx - Primary key value
     * @returns {Publon|null}
     */
    read(idx) {
        return this._recordMap.get(idx) || null;
    }

    /**
     * Alias for read() - more intuitive for "get by ID" use case
     * @param {*} idx - Primary key value
     * @returns {Publon|null}
     */
    get(idx) {
        return this.read(idx);
    }

    /**
     * Update a record
     * @param {*} idx - Primary key value
     * @param {Object} data - Fields to update
     * @param {Object} [options]
     * @param {Object} [options.origin] - Binding that initiated this
     * @returns {Publon|null}
     */
    update(idx, data, options = {}) {
        const publon = this._recordMap.get(idx);
        if (!publon) return null;

        publon.setData(data, { origin: options.origin });
        return publon;
    }

    /**
     * Delete a record
     * @param {*} idx - Primary key value
     * @param {Object} [options]
     * @param {Object} [options.origin] - Binding that initiated this
     * @returns {boolean}
     */
    delete(idx, options = {}) {
        const publon = this._recordMap.get(idx);
        if (!publon) return false;

        // Remove from selection
        this.selection.delete(idx);

        // Remove from array
        const index = this.records.indexOf(publon);
        if (index > -1) {
            this.records.splice(index, 1);
        }

        // Remove from map
        this._recordMap.delete(idx);

        // Clean up publon
        publon._table = null;

        // Emit event
        this._emit('deleted', {
            idx,
            record: publon,
            origin: options.origin || null
        });

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bulk Operations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load array of data (replaces all records)
     * @param {Array<Object>} dataArray
     * @returns {Array<Publon>}
     */
    load(dataArray) {
        this.clear();

        const created = [];
        for (const data of dataArray) {
            created.push(this.create(data));
        }

        this._emit('loaded', { records: created });

        return created;
    }

    /**
     * Clear all records
     */
    clear() {
        // Clean up publons
        for (const publon of this.records) {
            publon._table = null;
        }

        this.records = [];
        this._recordMap.clear();
        this.selection.clear();
        this._nextIdx = 1;

        this._emit('cleared', {});
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all records
     * @returns {Array<Publon>}
     */
    all() {
        return [...this.records];
    }

    /**
     * Find first matching record
     * @param {Function} predicate - (publon) => boolean
     * @returns {Publon|null}
     */
    find(predicate) {
        return this.records.find(predicate) || null;
    }

    /**
     * Find by field value
     * @param {string} field - Field name
     * @param {*} value - Value to match
     * @returns {Publon|null}
     */
    findBy(field, value) {
        return this.records.find(p => p.get(field) === value) || null;
    }

    /**
     * Filter records
     * @param {Function} predicate - (publon) => boolean
     * @returns {Array<Publon>}
     */
    filter(predicate) {
        return this.records.filter(predicate);
    }

    /**
     * Filter by field value
     * @param {string} field - Field name
     * @param {*} value - Value to match
     * @returns {Array<Publon>}
     */
    filterBy(field, value) {
        return this.records.filter(p => p.get(field) === value);
    }

    /**
     * Get record count
     * @returns {number}
     */
    count() {
        return this.records.length;
    }

    /**
     * Alias for count()
     */
    get length() {
        return this.records.length;
    }

    /**
     * Check if record exists
     * @param {*} idx - Primary key value
     * @returns {boolean}
     */
    has(idx) {
        return this._recordMap.has(idx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Selection
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Select a record
     * @param {*} idx - Primary key value
     * @param {Object} [options]
     * @returns {boolean}
     */
    select(idx, options = {}) {
        if (!this._recordMap.has(idx)) return false;
        if (this.selectionMode === 'none') return false;

        const previous = new Set(this.selection);

        if (this.selectionMode === 'single') {
            this.selection.clear();
        }

        this.selection.add(idx);

        this._emit('selected', {
            selected: new Set(this.selection),
            previous,
            record: this._recordMap.get(idx),
            origin: options.origin || null
        });

        return true;
    }

    /**
     * Deselect a record
     * @param {*} idx - Primary key value
     * @returns {boolean}
     */
    deselect(idx) {
        if (!this.selection.has(idx)) return false;

        const previous = new Set(this.selection);
        this.selection.delete(idx);

        this._emit('deselected', {
            selected: new Set(this.selection),
            previous,
            deselected: idx
        });

        return true;
    }

    /**
     * Toggle selection
     * @param {*} idx - Primary key value
     * @returns {boolean} True if now selected
     */
    toggleSelect(idx) {
        if (this.selection.has(idx)) {
            this.deselect(idx);
            return false;
        } else {
            this.select(idx);
            return true;
        }
    }

    /**
     * Clear all selection
     */
    clearSelection() {
        if (this.selection.size === 0) return;

        const previous = new Set(this.selection);
        this.selection.clear();

        this._emit('deselected', {
            selected: new Set(),
            previous,
            deselected: 'all'
        });
    }

    /**
     * Get selected records
     * @returns {Array<Publon>}
     */
    getSelected() {
        return [...this.selection]
            .map(idx => this._recordMap.get(idx))
            .filter(Boolean);
    }

    /**
     * Get first selected record
     * @returns {Publon|null}
     */
    getSelectedOne() {
        const first = this.selection.values().next().value;
        return first !== undefined ? this._recordMap.get(first) : null;
    }

    /**
     * Check if record is selected
     * @param {*} idx - Primary key value
     * @returns {boolean}
     */
    isSelected(idx) {
        return this.selection.has(idx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Labelling
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Process labeller config into function
     * @private
     */
    _processLabeller(labeller) {
        if (typeof labeller === 'function') {
            return labeller;
        }

        if (typeof labeller === 'string') {
            // Template string like '{name} ({email})'
            return (record) => {
                const data = record.getData ? record.getData() : record;
                return labeller.replace(/\{(\w+)\}/g, (match, field) => {
                    return data[field] !== undefined ? data[field] : match;
                });
            };
        }

        return null;
    }

    /**
     * Get display label for a record
     * @param {*} idxOrRecord - Primary key or Publon
     * @returns {string}
     */
    getLabel(idxOrRecord) {
        let record = idxOrRecord;
        if (typeof idxOrRecord !== 'object') {
            record = this.read(idxOrRecord);
        }
        if (!record) return '';

        if (this.labeller) {
            return this.labeller(record);
        }

        // Default: use first string field
        const data = record.getData();
        for (const [field, def] of Object.entries(this.schema)) {
            if (def.type === 'string' && data[field]) {
                return String(data[field]);
            }
        }

        return String(data[this.primaryKey] || record.idx || '');
    }

    /**
     * Get subtitle for a record
     * @param {*} idxOrRecord - Primary key or Publon
     * @param {string} [subtitleField] - Specific field to use
     * @returns {string}
     */
    getSubtitle(idxOrRecord, subtitleField) {
        let record = idxOrRecord;
        if (typeof idxOrRecord !== 'object') {
            record = this.read(idxOrRecord);
        }
        if (!record) return '';

        const data = record.getData();

        if (subtitleField && data[subtitleField] !== undefined) {
            return String(data[subtitleField]);
        }

        // Check uiSpec
        if (this.uiSpec.subtitleColumn) {
            return String(data[this.uiSpec.subtitleColumn] || '');
        }

        // Default: find second string field
        let foundFirst = false;
        for (const [field, def] of Object.entries(this.schema)) {
            if (def.type === 'string' && data[field]) {
                if (foundFirst) return String(data[field]);
                foundFirst = true;
            }
        }

        return '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validate a record against schema
     * @param {Publon} record
     * @returns {{valid: boolean, errors: Object}}
     */
    validate(record) {
        const errors = {};
        const data = record.getData();

        for (const [field, def] of Object.entries(this.schema)) {
            const value = data[field];

            // Required
            if (def.required && (value === undefined || value === null || value === '')) {
                errors[field] = `${def.label || field} is required`;
                continue;
            }

            if (value === undefined || value === null) continue;

            // Type check
            if (def.type === 'number' && typeof value !== 'number') {
                errors[field] = `${def.label || field} must be a number`;
            } else if (def.type === 'string' && typeof value !== 'string') {
                errors[field] = `${def.label || field} must be a string`;
            } else if (def.type === 'boolean' && typeof value !== 'boolean') {
                errors[field] = `${def.label || field} must be a boolean`;
            }

            // String constraints
            if (def.type === 'string' && typeof value === 'string') {
                if (def.maxLength && value.length > def.maxLength) {
                    errors[field] = `${def.label || field} exceeds max length of ${def.maxLength}`;
                }
                if (def.minLength && value.length < def.minLength) {
                    errors[field] = `${def.label || field} must be at least ${def.minLength} characters`;
                }
                if (def.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors[field] = `${def.label || field} must be a valid email`;
                }
            }

            // Enum
            if (def.enum && !def.enum.includes(value)) {
                errors[field] = `${def.label || field} must be one of: ${def.enum.join(', ')}`;
            }
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Serialization
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert to JSON array
     * @returns {Array<Object>}
     */
    toJSON() {
        return this.records.map(r => r.toJSON());
    }

    /**
     * Create table from config and data
     * @static
     */
    static fromJSON(config, data = []) {
        const table = new PublonTable(config);
        table.load(data);
        return table;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Destroy table and clean up
     */
    destroy() {
        this.clear();
        this._eventBus.clear();
        PublonRegistry.unregister(this._id);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PublonTable;
}
if (typeof window !== 'undefined') {
    window.PublonTable = PublonTable;
}
