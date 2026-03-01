/**
 * DbBinding - Database synchronization for PublonTable
 *
 * Syncs a PublonTable with a database. Maintains bidirectional mapping
 * between memory idx and database idx.
 *
 * @example
 * const users = new PublonTable({ name: 'users', schema: {...} });
 * const dbBinding = new DbBinding(users, {
 *     db: myDbAdapter,
 *     tableName: 'tbl_users'
 * });
 *
 * // Load from database
 * await dbBinding.read();
 *
 * // Listen for sync completion
 * dbBinding.on('created', (e) => {
 *     console.log(`Synced: memory ${e.memoryIdx} → db ${e.dbIdx}`);
 * });
 *
 * // Create record (auto-syncs to DB)
 * users.create({ name: 'John' });
 */

class DbBinding extends PublonBinding {
    /**
     * Create a database binding
     * @param {PublonTable} table - The table to bind
     * @param {Object} config
     * @param {Object} config.db - Database adapter (must have insert, update, delete, fetchAll)
     * @param {string} [config.tableName] - Database table name (defaults to table.name)
     * @param {string} [config.primaryKey] - DB primary key field (default: 'idx')
     */
    constructor(table, config = {}) {
        super(table, { name: 'db', ...config });

        if (!config.db) {
            throw new Error('DbBinding requires a database adapter (config.db)');
        }

        this.db = config.db;
        this.tableName = config.tableName || table.name;
        this.dbPrimaryKey = config.primaryKey || 'idx';

        // Bidirectional mapping
        this._map = new Map();        // memoryIdx → dbIdx
        this._reverseMap = new Map(); // dbIdx → memoryIdx
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapping
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get database ID from memory ID
     * @param {*} memoryIdx
     * @returns {*}
     */
    getDbIdx(memoryIdx) {
        return this._map.get(memoryIdx);
    }

    /**
     * Get memory ID from database ID
     * @param {*} dbIdx
     * @returns {*}
     */
    getMemoryIdx(dbIdx) {
        return this._reverseMap.get(dbIdx);
    }

    /**
     * Check if mapping exists
     * @param {*} memoryIdx
     * @returns {boolean}
     */
    hasMapping(memoryIdx) {
        return this._map.has(memoryIdx);
    }

    /**
     * Set a mapping
     * @private
     */
    _setMapping(memoryIdx, dbIdx) {
        this._map.set(memoryIdx, dbIdx);
        this._reverseMap.set(dbIdx, memoryIdx);
    }

    /**
     * Remove a mapping
     * @private
     */
    _removeMapping(memoryIdx) {
        const dbIdx = this._map.get(memoryIdx);
        if (dbIdx !== undefined) {
            this._reverseMap.delete(dbIdx);
        }
        this._map.delete(memoryIdx);
    }

    /**
     * Clear all mappings
     * @private
     */
    _clearMappings() {
        this._map.clear();
        this._reverseMap.clear();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD Implementation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sync created record to database
     * @param {Publon} record
     */
    async create(record) {
        const data = record.getData();

        // Remove primary key if it matches (let DB auto-generate)
        if (this.table.primaryKey === this.dbPrimaryKey) {
            delete data[this.dbPrimaryKey];
        }

        // Insert into database
        const result = await this.db.insert(this.tableName, data);

        // Get the database ID from result
        const dbIdx = result[this.dbPrimaryKey] || result.insertId || result.idx || result.id;

        // Store mapping
        this._setMapping(record.idx, dbIdx);

        // Emit completion
        this._emit('created', {
            memoryIdx: record.idx,
            dbIdx,
            record
        });
    }

    /**
     * Read from database and populate table
     */
    async read() {
        // Fetch all records from database
        const dbRecords = await this.db.fetchAll(this.tableName);

        // Clear existing state
        this._clearMappings();
        this.table.clear();

        // Create Publons from database records
        const publons = [];
        for (const dbRecord of dbRecords) {
            const dbIdx = dbRecord[this.dbPrimaryKey];

            // Prepare data for table
            const data = { ...dbRecord };

            // If table and DB use same primary key, remove to let table assign
            if (this.table.primaryKey === this.dbPrimaryKey) {
                delete data[this.dbPrimaryKey];
            }

            // Create publon (passes origin=this to prevent sync loop)
            const publon = this.pushCreate(data);
            publons.push(publon);

            // Store mapping
            this._setMapping(publon.idx, dbIdx);
        }

        // Emit completion
        this._emit('read', {
            count: publons.length,
            records: publons
        });

        return publons;
    }

    /**
     * Sync updated record to database
     * @param {Publon} record
     * @param {Object} changes
     */
    async update(record, changes) {
        const dbIdx = this._map.get(record.idx);
        if (dbIdx === undefined) {
            console.warn(`DbBinding: No mapping for memory idx ${record.idx}, skipping update`);
            return;
        }

        // Update in database (strip primary key from vals — it's in the WHERE clause)
        const data = record.getData();
        delete data[this.dbPrimaryKey];
        await this.db.update(this.tableName, dbIdx, data);

        // Emit completion
        this._emit('updated', {
            memoryIdx: record.idx,
            dbIdx,
            record,
            changes
        });
    }

    /**
     * Sync deleted record to database
     * @param {Publon} record
     */
    async delete(record) {
        const dbIdx = this._map.get(record.idx);
        if (dbIdx === undefined) {
            console.warn(`DbBinding: No mapping for memory idx ${record.idx}, skipping delete`);
            return;
        }

        // Delete from database
        await this.db.delete(this.tableName, dbIdx);

        // Remove mapping
        this._removeMapping(record.idx);

        // Emit completion
        this._emit('deleted', {
            memoryIdx: record.idx,
            dbIdx,
            record
        });
    }

    /**
     * Handle table cleared event
     */
    async _onTableCleared(e) {
        this._clearMappings();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Push Helpers (DB → Table)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Push a database record to table
     * @param {Object} dbRecord - Record from database
     * @returns {Publon}
     */
    pushDbCreate(dbRecord) {
        const dbIdx = dbRecord[this.dbPrimaryKey];

        const data = { ...dbRecord };
        if (this.table.primaryKey === this.dbPrimaryKey) {
            delete data[this.dbPrimaryKey];
        }

        const publon = this.pushCreate(data);
        this._setMapping(publon.idx, dbIdx);

        return publon;
    }

    /**
     * Push a database update to table
     * @param {*} dbIdx - Database ID
     * @param {Object} data - Updated data
     * @returns {Publon|null}
     */
    pushDbUpdate(dbIdx, data) {
        const memoryIdx = this._reverseMap.get(dbIdx);
        if (memoryIdx === undefined) {
            console.warn(`DbBinding: No memory mapping for dbIdx ${dbIdx}`);
            return null;
        }
        return this.pushUpdate(memoryIdx, data);
    }

    /**
     * Push a database delete to table
     * @param {*} dbIdx - Database ID
     * @returns {boolean}
     */
    pushDbDelete(dbIdx) {
        const memoryIdx = this._reverseMap.get(dbIdx);
        if (memoryIdx === undefined) {
            console.warn(`DbBinding: No memory mapping for dbIdx ${dbIdx}`);
            return false;
        }
        this._removeMapping(memoryIdx);
        return this.pushDelete(memoryIdx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    destroy() {
        this._clearMappings();
        super.destroy();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DbBinding;
}
if (typeof window !== 'undefined') {
    window.DbBinding = DbBinding;
}
