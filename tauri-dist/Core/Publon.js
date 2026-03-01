/**
 * Publon - Lightweight record wrapper
 *
 * A Publon wraps a single data record. It provides:
 * - Field access via get/set
 * - Reference to parent PublonTable
 * - Memory primary key (idx)
 *
 * Publon does NOT:
 * - Register itself globally (table tracks records)
 * - Have its own EventBus (uses table's)
 * - Store schema (reads from table)
 * - Store binding IDs like dbIdx (bindings own mappings)
 *
 * @example
 * const record = table.create({ name: 'John' });
 * record.get('name');          // 'John'
 * record.set('name', 'Jane');  // Updates and notifies table
 */

class Publon {
    /**
     * Create a new Publon
     * @param {Object} data - Initial data
     * @param {PublonTable} [table] - Parent table (set by table on create)
     */
    constructor(data = {}, table = null) {
        this._data = data;
        this._table = table;
        this._idx = null;
        this._meta = {};  // Optional metadata (dirty flags, etc.)

        // Proxy for direct field access (record.username === record.get('username'))
        return new Proxy(this, {
            get(target, prop, receiver) {
                if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
                if (prop in target) return Reflect.get(target, prop, receiver);
                if (target._data && prop in target._data) return target._data[prop];
                return undefined;
            },
            set(target, prop, value) {
                if (typeof prop === 'string' && prop.startsWith('_')) {
                    target[prop] = value;
                    return true;
                }
                if (prop in Object.getPrototypeOf(target)) {
                    target[prop] = value;
                    return true;
                }
                if (target._data) target._data[prop] = value;
                return true;
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Identity
    // ─────────────────────────────────────────────────────────────────────────

    /** Memory primary key */
    get idx() { return this._idx; }

    /** Parent table reference */
    get table() { return this._table; }

    /** Schema from parent table */
    get schema() { return this._table?.schema || {}; }

    // ─────────────────────────────────────────────────────────────────────────
    // Field Access
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get a field value
     * @param {string} field - Field name
     * @returns {*} Field value
     */
    get(field) {
        return this._data[field];
    }

    /**
     * Set a field value (notifies table)
     * @param {string} field - Field name
     * @param {*} value - New value
     * @param {Object} [options] - Options
     * @param {Object} [options.origin] - Binding that initiated this change
     * @returns {Publon} this
     */
    set(field, value, options = {}) {
        const oldValue = this._data[field];
        if (oldValue === value) return this;

        this._data[field] = value;
        this._table?._onRecordChanged(this, field, oldValue, value, options.origin);

        return this;
    }

    /**
     * Get all data as plain object (copy)
     * Always includes idx for consistency
     * @returns {Object}
     */
    getData() {
        return { ...this._data, idx: this._idx };
    }

    /**
     * Bulk update data (notifies table once)
     * @param {Object} data - Fields to update
     * @param {Object} [options] - Options
     * @param {Object} [options.origin] - Binding that initiated this change
     * @returns {Publon} this
     */
    setData(data, options = {}) {
        const changes = {};

        for (const [field, value] of Object.entries(data)) {
            if (this._data[field] !== value) {
                changes[field] = { oldValue: this._data[field], newValue: value };
                this._data[field] = value;
            }
        }

        if (Object.keys(changes).length > 0) {
            this._table?._onRecordBulkChanged(this, changes, options.origin);
        }

        return this;
    }

    /**
     * Check if field exists
     * @param {string} field - Field name
     * @returns {boolean}
     */
    has(field) {
        return field in this._data;
    }

    /**
     * Get list of field names
     * @returns {string[]}
     */
    fields() {
        return Object.keys(this._data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get metadata value
     * @param {string} key
     * @returns {*}
     */
    getMeta(key) {
        return this._meta[key];
    }

    /**
     * Set metadata value
     * @param {string} key
     * @param {*} value
     */
    setMeta(key, value) {
        this._meta[key] = value;
        return this;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Serialization
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert to plain object (for JSON serialization)
     * @returns {Object}
     */
    toJSON() {
        return this.getData();
    }

    /**
     * Alias for getData() - common expectation from other frameworks
     * @returns {Object}
     */
    toObject() {
        return this.getData();
    }

    /**
     * String representation
     * @returns {string}
     */
    toString() {
        if (this._table?.labeller) {
            return this._table.getLabel(this._idx);
        }
        return `Publon(idx=${this._idx})`;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Publon;
}
if (typeof window !== 'undefined') {
    window.Publon = Publon;
}
