/**
 * Publome - Domain aggregator for related PublonTables
 *
 * A Publome manages a collection of related tables for a domain
 * (e.g., BenchStamp, AutoScholar). It provides:
 * - Schema-driven table initialization
 * - Cross-table event handling
 * - Seed data loading
 * - Domain-specific methods (via subclassing)
 *
 * @example
 * const benchstamp = new Publome(BenchStampSchema, {
 *     config: { /* domain config *\/ }
 * });
 *
 * // Access tables
 * const samples = benchstamp.table('sample');
 * samples.create({ code: 'S001' });
 *
 * // Load seed data
 * benchstamp.loadSeedData({
 *     sample: [{ code: 'S001' }, { code: 'S002' }],
 *     experiment: [...]
 * });
 */

class Publome {
    /**
     * Create a new Publome
     * @param {Object} schema - Domain schema with tables definition
     * @param {Object} [config] - Domain configuration
     */
    constructor(schema, config = {}) {
        this._id = PublonRegistry.register(this, 'publome');
        this.schema = schema;
        this.config = config;
        this.tables = {};

        // Cross-table EventBus
        this._eventBus = new EventBus();

        // Initialize tables from schema
        this._initTables();

        // Wire cross-table events
        this._wireEvents();
    }

    get id() { return this._id; }

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initialize PublonTables from schema
     * @private
     */
    _initTables() {
        const tableDefs = this.schema.tables || [];

        for (const def of tableDefs) {
            this.tables[def.name] = new PublonTable({
                name: def.name,
                schema: def.columns,
                primaryKey: def.primaryKey,
                labeller: def.labeller,
                uiSpec: def.uiSpec,
                selectionMode: def.selectionMode || 'single'
            });
        }
    }

    /**
     * Wire cross-table events
     * @private
     */
    _wireEvents() {
        const that = this;

        // Forward table events to publome level
        for (const [tableName, table] of Object.entries(this.tables)) {
            table.on('created', (e) => {
                that._eventBus.emit(`${tableName}:created`, e);
                that._eventBus.emit('record:created', { ...e, tableName });
            });

            table.on('updated', (e) => {
                that._eventBus.emit(`${tableName}:updated`, e);
                that._eventBus.emit('record:updated', { ...e, tableName });
            });

            table.on('deleted', (e) => {
                that._eventBus.emit(`${tableName}:deleted`, e);
                that._eventBus.emit('record:deleted', { ...e, tableName });
            });

            table.on('selected', (e) => {
                that._eventBus.emit(`${tableName}:selected`, e);
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Table Access
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get a table by name
     * @param {string} name - Table name
     * @returns {PublonTable|undefined}
     */
    table(name) {
        return this.tables[name];
    }

    /**
     * Alias for tables — backwards compatibility for service.publon.tableName access pattern
     * @returns {Object} Map of table names to PublonTable instances
     */
    get publon() {
        return this.tables;
    }

    /**
     * Check if table exists
     * @param {string} name - Table name
     * @returns {boolean}
     */
    hasTable(name) {
        return name in this.tables;
    }

    /**
     * Get all table names
     * @returns {string[]}
     */
    getTableNames() {
        return Object.keys(this.tables);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Subscribe to domain events
     * @param {string} event - Event name (e.g., 'sample:created', 'record:updated')
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
     * Emit a domain event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data) {
        this._eventBus.emit(event, data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Sync (post-login binding — TuiSet pattern)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Register for post-login API sync. When authBus emits 'login',
     * create ApiBinding for each table. On 'logout', disconnect.
     * @param {EventBus} authBus - EventBus that emits 'login'/'logout'
     */
    _initApiSync(authBus) {
        if (!this.config.apiConfig) return;
        this._apiBindings = [];
        authBus.on('login', (e) => { if (e.token) this._connectApi(e.token); });
        authBus.on('logout', () => this._disconnectApi());
    }

    _connectApi(token) {
        const { apiUrl, system } = this.config.apiConfig;
        this.getTableNames().forEach(name => {
            const table = this.table(name);

            // Build column name mapping: lowercase → camelCase (from schema)
            const colMap = {};
            for (const colName of Object.keys(table.columns)) {
                colMap[colName.toLowerCase()] = colName;
            }

            const binding = new ApiBinding(table, {
                apiUrl,
                endpoint: `/api/v1/${system}/${name}`,
                apiToken: token,
                primaryKey: 'idx',
                transformResponse: (data) => {
                    const out = {};
                    for (const [key, val] of Object.entries(data)) {
                        out[colMap[key] || key] = val;
                    }
                    return out;
                },
                transformRequest: (data) => {
                    const out = {};
                    for (const [key, val] of Object.entries(data)) {
                        out[key.toLowerCase()] = val;
                    }
                    return out;
                }
            });
            this._apiBindings.push(binding);
            binding.read().catch(err =>
                console.warn(`[ApiSync] ${name}: ${err.message}`)
            );
        });
        console.log(`[ApiSync] Connected ${this._apiBindings.length} tables to ${apiUrl}`);
    }

    _disconnectApi() {
        (this._apiBindings || []).forEach(b => b.destroy());
        this._apiBindings = [];
        console.log('[ApiSync] Disconnected');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Database Persistence (schema-driven — any Publome can persist)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Wire database persistence for all (or selected) tables.
     * Creates a DbBinding per table using the provided adapter.
     * After this, all table CRUD auto-syncs to the database.
     *
     * @param {Object} dbConfig
     * @param {Object} dbConfig.db       - Database adapter (PhpDbAdapter, etc.)
     * @param {string} [dbConfig.prefix] - Table prefix (default: schema.prefix + '_')
     * @param {string[]} [dbConfig.tables] - Subset of tables to persist (default: all)
     * @returns {Object} Map of tableName → DbBinding
     */
    persistTo(dbConfig) {
        this._dbBindings = {};
        const prefix = dbConfig.prefix || (this.schema.prefix ? this.schema.prefix + '_' : '');
        const tableNames = dbConfig.tables || this.getTableNames();

        for (const name of tableNames) {
            const table = this.table(name);
            if (!table) continue;
            this._dbBindings[name] = new DbBinding(table, {
                db: dbConfig.db,
                tableName: prefix + name
            });
        }

        console.log(`[Publome] Persisting ${Object.keys(this._dbBindings).length} tables via ${prefix}*`);
        return this._dbBindings;
    }

    /**
     * Load all persisted tables from database (call after persistTo).
     * Reads in dependency order if schema has FK references.
     * @param {string[]} [tableNames] - Subset to load (default: all persisted)
     */
    async loadFromDb(tableNames) {
        const bindings = this._dbBindings || {};
        const names = tableNames || this._dbLoadOrder();

        for (const name of names) {
            const binding = bindings[name];
            if (!binding) continue;
            await binding.read();
        }

        console.log(`[Publome] Loaded ${names.length} tables from database`);
    }

    /**
     * Dependency-ordered table names for loading (parents before children).
     * @private
     */
    _dbLoadOrder() {
        const names = Object.keys(this._dbBindings || {});
        const tableDefs = (this.schema.tables || []).filter(t => names.includes(t.name));

        // Build dependency graph
        const deps = {};
        tableDefs.forEach(t => {
            deps[t.name] = [];
            Object.values(t.columns).forEach(col => {
                if (col.refTable && names.includes(col.refTable) && col.refTable !== t.name) {
                    deps[t.name].push(col.refTable);
                }
            });
        });

        // Topological sort
        const ordered = [];
        const visited = new Set();
        function visit(name) {
            if (visited.has(name)) return;
            visited.add(name);
            (deps[name] || []).forEach(visit);
            ordered.push(name);
        }
        names.forEach(visit);
        return ordered;
    }

    /**
     * Disconnect all database bindings.
     */
    disconnectDb() {
        Object.values(this._dbBindings || {}).forEach(b => b.destroy());
        this._dbBindings = {};
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Data Loading
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load seed data into tables
     * @param {Object} data - Object with table names as keys and row arrays as values
     */
    loadSeedData(data) {
        for (const [tableName, rows] of Object.entries(data)) {
            if (this.tables[tableName] && Array.isArray(rows)) {
                this.tables[tableName].load(rows);
            }
        }
    }

    /**
     * Clear all tables
     */
    clearAll() {
        for (const table of Object.values(this.tables)) {
            table.clear();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get records from a table by filter
     * @param {string} tableName - Table name
     * @param {Object} where - Filter criteria { field: value }
     * @returns {Array<Publon>}
     */
    getRecords(tableName, where = {}) {
        const table = this.tables[tableName];
        if (!table) return [];

        if (Object.keys(where).length === 0) {
            return table.all();
        }

        return table.filter(publon => {
            for (const [field, value] of Object.entries(where)) {
                if (publon.get(field) !== value) return false;
            }
            return true;
        });
    }

    /**
     * Get a single record by ID
     * @param {string} tableName - Table name
     * @param {*} idx - Primary key value
     * @returns {Publon|null}
     */
    getRecord(tableName, idx) {
        const table = this.tables[tableName];
        return table ? table.read(idx) : null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Serialization
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Export all data as JSON
     * @returns {Object} Object with table names as keys
     */
    toJSON() {
        const result = {};
        for (const [name, table] of Object.entries(this.tables)) {
            result[name] = table.toJSON();
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Destroy publome and all tables
     */
    destroy() {
        this.disconnectDb();
        for (const table of Object.values(this.tables)) {
            table.destroy();
        }
        this.tables = {};
        this._eventBus.clear();
        PublonRegistry.unregister(this._id);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Publome;
}
if (typeof window !== 'undefined') {
    window.Publome = Publome;
}
