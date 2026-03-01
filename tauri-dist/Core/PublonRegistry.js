/**
 * PublonRegistry - Global registry for tables and bindings
 *
 * Tracks PublonTable and PublonBinding instances (NOT individual Publon records).
 *
 * @example
 * const table = new PublonTable({ name: 'users' });
 * // Auto-registered with ID
 *
 * PublonRegistry.get(1);                    // Get by ID
 * PublonRegistry.findTables('users');       // Find all tables named 'users'
 * PublonRegistry.getByType('binding');      // Get all bindings
 */

class PublonRegistry {
    static _instances = new Map();
    static _counter = 0;
    static _byType = {
        table: new Map(),
        binding: new Map(),
        publome: new Map()
    };

    /**
     * Register an instance and assign a unique ID
     * @param {Object} instance - The instance to register
     * @param {string} type - Type: 'table' | 'binding' | 'publome'
     * @returns {number} The assigned unique ID
     */
    static register(instance, type = 'table') {
        if (!this._byType[type]) {
            this._byType[type] = new Map();
        }

        const id = ++this._counter;
        this._instances.set(id, { instance, type });
        this._byType[type].set(id, instance);

        return id;
    }

    /**
     * Unregister an instance by ID
     * @param {number} id - The instance ID
     */
    static unregister(id) {
        const entry = this._instances.get(id);
        if (entry) {
            this._byType[entry.type]?.delete(id);
            this._instances.delete(id);
        }
    }

    /**
     * Get an instance by ID
     * @param {number} id - The instance ID
     * @returns {Object|null}
     */
    static get(id) {
        const entry = this._instances.get(id);
        return entry ? entry.instance : null;
    }

    /**
     * Get the type of an instance by ID
     * @param {number} id - The instance ID
     * @returns {string|null}
     */
    static getType(id) {
        const entry = this._instances.get(id);
        return entry ? entry.type : null;
    }

    /**
     * Get all instances of a specific type
     * @param {string} type - Type: 'table' | 'binding' | 'publome'
     * @returns {Array}
     */
    static getByType(type) {
        if (!this._byType[type]) return [];
        return [...this._byType[type].values()];
    }

    /**
     * Find all tables with a given name
     * @param {string} name - The table name
     * @returns {Array<PublonTable>}
     */
    static findTables(name) {
        return this.getByType('table').filter(t => t.name === name);
    }

    /**
     * Find a table by name (first match)
     * @param {string} name - The table name
     * @returns {PublonTable|null}
     */
    static findTable(name) {
        return this.getByType('table').find(t => t.name === name) || null;
    }

    /**
     * Check if an ID exists
     * @param {number} id
     * @returns {boolean}
     */
    static has(id) {
        return this._instances.has(id);
    }

    /**
     * Get count of registered instances
     * @param {string} [type] - Optional type filter
     * @returns {number}
     */
    static count(type) {
        if (type) {
            return this._byType[type]?.size || 0;
        }
        return this._instances.size;
    }

    /**
     * List all registered instances (for debugging)
     * @returns {Array<{id: number, type: string, name: string}>}
     */
    static list() {
        return [...this._instances.entries()].map(([id, entry]) => ({
            id,
            type: entry.type,
            name: entry.instance.name || entry.instance.constructor.name
        }));
    }

    /**
     * Clear all registrations
     */
    static clear() {
        this._instances.clear();
        Object.values(this._byType).forEach(map => map.clear());
        this._counter = 0;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PublonRegistry;
}
if (typeof window !== 'undefined') {
    window.PublonRegistry = PublonRegistry;
}
