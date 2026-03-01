/**
 * ServiceBackendAdapter - Bridges ServiceBackend to DbBinding's adapter interface
 *
 * DbBinding expects: { insert, update, delete, fetchAll }
 * ServiceBackend provides: { create, read, update, delete }
 *
 * This thin adapter translates between the two.
 *
 * @example
 * const backend = new ServiceBackend({ apiUrl: 'http://localhost:8082/api/v1' });
 * const adapter = new ServiceBackendAdapter(backend);
 * const dbBinding = new DbBinding(table, { db: adapter, tableName: 'as_staffcourse' });
 */

class ServiceBackendAdapter {
    /**
     * @param {ServiceBackend} backend - ServiceBackend instance
     * @param {Object} [options]
     * @param {Object} [options.columnMap] - Maps lowercase DB columns to camelCase schema columns
     *                                       e.g. { userid: 'userId', coursecode: 'courseCode' }
     */
    constructor(backend, options = {}) {
        if (!backend) {
            throw new Error('ServiceBackendAdapter requires a ServiceBackend instance');
        }
        this.backend = backend;
        this.columnMap = options.columnMap || null;
    }

    /**
     * Build column map from a Publome schema table definition
     * @param {Object} schemaTable - Schema table with columns array
     * @returns {Object} Map of lowercase → camelCase column names
     */
    static buildColumnMap(schemaTable) {
        const map = {};
        if (schemaTable && schemaTable.columns) {
            schemaTable.columns.forEach(col => {
                map[col.name.toLowerCase()] = col.name;
            });
        }
        return map;
    }

    /**
     * Insert a record — DbBinding calls this on create
     * @param {string} tableName - Full table name (e.g. 'as_staffcourse')
     * @param {Object} data - Record data
     * @returns {Promise<Object>} Must return object with idx
     */
    async insert(tableName, data) {
        await this.backend.create(tableName, data);

        // ServiceBackend.create doesn't return the new idx directly.
        // Re-read to find the created record by matching fields.
        const where = {};
        for (const [key, val] of Object.entries(data)) {
            if (val !== null && val !== undefined && key !== 'createdAt' && key !== 'updatedAt') {
                where[key] = val;
            }
        }

        const rows = await this.backend.read(tableName, where, { skipMemberFilter: true });
        if (rows.length > 0) {
            // Return the most recently created match
            const row = rows[rows.length - 1];
            return { idx: row.idx };
        }

        throw new Error('Insert succeeded but could not retrieve the new record');
    }

    /**
     * Fetch all records — DbBinding calls this on read
     * @param {string} tableName - Full table name
     * @returns {Promise<Array>} Array of record objects
     */
    async fetchAll(tableName) {
        const rows = await this.backend.read(tableName, {}, { skipMemberFilter: true });
        return this.columnMap ? rows.map(row => this._mapToSchema(row)) : rows;
    }

    /**
     * Remap lowercase DB column names to camelCase schema names
     * @private
     */
    _mapToSchema(row) {
        const mapped = {};
        for (const [key, value] of Object.entries(row)) {
            mapped[this.columnMap[key] || key] = value;
        }
        return mapped;
    }

    /**
     * Update a record by idx — DbBinding calls this on update
     * @param {string} tableName - Full table name
     * @param {number} dbIdx - Database primary key
     * @param {Object} data - Full record data
     * @returns {Promise<Object>}
     */
    async update(tableName, dbIdx, data) {
        const updateData = { ...data };
        delete updateData.idx;
        return this.backend.update(tableName, { idx: dbIdx }, updateData);
    }

    /**
     * Delete a record by idx — DbBinding calls this on delete
     * @param {string} tableName - Full table name
     * @param {number} dbIdx - Database primary key
     * @returns {Promise<Object>}
     */
    async delete(tableName, dbIdx) {
        return this.backend.delete(tableName, { idx: dbIdx });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceBackendAdapter;
}
if (typeof window !== 'undefined') {
    window.ServiceBackendAdapter = ServiceBackendAdapter;
}
