/**
 * ServiceRegistry - Central registry for microservices
 *
 * Enables cross-service FK resolution and service discovery.
 * All services register here when initialized.
 *
 * @example
 * // Register a service
 * ServiceRegistry.register('member', memberService, { alias: 'Member Service' });
 *
 * // Resolve FK across services
 * const result = ServiceRegistry.resolve('member', 'member', 42);
 * // → { label: 'john_doe', row: {...}, found: true }
 *
 * // Get service instance
 * const memberService = ServiceRegistry.get('member');
 */

class ServiceRegistry {
    static _services = {};
    static _eventBus = typeof EventBus !== 'undefined' ? new EventBus() : null;

    /**
     * Register a service
     * @param {string} name - Service identifier (e.g., 'member', 'tag')
     * @param {Publome} service - Service instance (Publome subclass)
     * @param {Object} [meta] - Metadata
     * @param {string} [meta.alias] - Human-readable name
     * @param {string} [meta.version] - Service version
     */
    static register(name, service, meta = {}) {
        if (this._services[name]) {
            console.warn(`[ServiceRegistry] Overwriting existing service: ${name}`);
        }

        this._services[name] = {
            service,
            alias: meta.alias || name,
            version: meta.version || '1.0.0',
            registeredAt: Date.now()
        };

        console.log(`[ServiceRegistry] Registered: ${name} (${meta.alias || name})`);
        this._eventBus?.emit('serviceRegistered', { name, service, meta });
    }

    /**
     * Unregister a service
     * @param {string} name - Service identifier
     */
    static unregister(name) {
        if (this._services[name]) {
            delete this._services[name];
            this._eventBus?.emit('serviceUnregistered', { name });
        }
    }

    /**
     * Get a service by name
     * @param {string} name - Service identifier
     * @returns {Publome|null} Service instance
     */
    static get(name) {
        return this._services[name]?.service || null;
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service identifier
     * @returns {boolean}
     */
    static has(name) {
        return !!this._services[name];
    }

    /**
     * List all registered services
     * @returns {Array<{name: string, alias: string, version: string}>}
     */
    static list() {
        return Object.entries(this._services).map(([name, entry]) => ({
            name,
            alias: entry.alias,
            version: entry.version,
            tables: entry.service?.tableNames?.() || Object.keys(entry.service?.tables || {})
        }));
    }

    /**
     * Resolve a FK reference across services
     * @param {string} serviceName - Target service
     * @param {string} tableName - Target table in that service
     * @param {number|string} idx - Record idx to resolve
     * @returns {{label: string, row: Object|null, found: boolean}}
     */
    static resolve(serviceName, tableName, idx) {
        const entry = this._services[serviceName];
        if (!entry) {
            return { label: `[${serviceName}?]`, row: null, found: false };
        }

        const table = entry.service.table?.(tableName) || entry.service.tables?.[tableName];
        if (!table) {
            return { label: `[${tableName}?]`, row: null, found: false };
        }

        const record = table.read(idx);
        if (!record) {
            return { label: `[#${idx}]`, row: null, found: false };
        }

        // Use labeller if available
        const label = table.labeller
            ? this._applyLabeller(table.labeller, record)
            : record.get?.('name') || record.get?.('label') || `#${idx}`;

        return {
            label,
            row: record.getData?.() || record,
            found: true
        };
    }

    /**
     * Apply labeller template to a record
     * @private
     */
    static _applyLabeller(labeller, record) {
        if (typeof labeller === 'function') {
            return labeller(record);
        }
        // Template string like '{name} ({email})'
        return labeller.replace(/\{(\w+)\}/g, (_, field) => {
            return record.get?.(field) ?? record[field] ?? '';
        });
    }

    /**
     * Clear all registered services
     */
    static clear() {
        this._services = {};
        this._eventBus?.emit('registryCleared');
    }

    /**
     * Subscribe to registry events
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    static on(event, handler) {
        this._eventBus?.on(event, handler);
    }

    // =========================================================================
    // CAPABILITY DISCOVERY
    // =========================================================================

    /**
     * Get binding definitions for a service.
     * Delegates to the service's getBindingRegistry() if available,
     * otherwise returns empty array.
     * @param {string} serviceName - Service identifier
     * @returns {Array<Object>} Binding definitions
     */
    static getBindings(serviceName) {
        const svc = this.get(serviceName);
        if (!svc) return [];
        if (typeof svc.getBindingRegistry === 'function') {
            return svc.getBindingRegistry();
        }
        return [];
    }

    /**
     * Get full capability manifest for a service.
     * Delegates to the service's getCapabilities() if available,
     * otherwise synthesises a minimal manifest from registry metadata.
     * @param {string} serviceName - Service identifier
     * @returns {Object|null} Capability manifest
     */
    static getCapabilities(serviceName) {
        const entry = this._services[serviceName];
        if (!entry) return null;
        const svc = entry.service;
        if (typeof svc.getCapabilities === 'function') {
            return svc.getCapabilities();
        }
        // Minimal fallback from registry metadata
        const tables = svc.getTableNames?.() || Object.keys(svc.tables || {});
        return {
            name: serviceName,
            alias: entry.alias,
            icon: '',
            intent: '',
            keywords: [],
            capabilities: [],
            useCases: [],
            consumers: [],
            domainMethods: [],
            bindings: [],
            _fallback: true
        };
    }

    /**
     * Search across all services' capabilities using free-text query.
     * Tokenises query and scores each service by token matches in its
     * intent, keywords, capabilities, useCases, and binding metadata.
     * @param {string} query - Free-text search query
     * @returns {Array<{service: string, alias: string, score: number, matches: string[]}>}
     */
    static searchCapabilities(query) {
        const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
        if (!tokens.length) return [];

        const results = [];

        for (const [name, entry] of Object.entries(this._services)) {
            const caps = this.getCapabilities(name);
            if (!caps) continue;

            // Build corpus from all searchable fields
            const corpus = [
                caps.intent || '',
                (caps.keywords || []).join(' '),
                (caps.capabilities || []).join(' '),
                (caps.useCases || []).join(' '),
                caps.alias || '',
                name
            ];

            // Include binding tags and intents
            const bindings = caps.bindings || [];
            bindings.forEach(b => {
                corpus.push(b.intent || '');
                corpus.push((b.tags || []).join(' '));
                corpus.push(b.label || '');
                corpus.push(b.description || '');
            });

            const corpusText = corpus.join(' ').toLowerCase();
            const matches = [];
            let score = 0;

            tokens.forEach(token => {
                if (corpusText.includes(token)) {
                    score++;
                    matches.push(token);
                }
            });

            if (score > 0) {
                results.push({
                    service: name,
                    alias: caps.alias || entry.alias,
                    score,
                    matches
                });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Find services relevant to a business case description.
     * Wraps searchCapabilities with use-case matching, returning
     * matched use cases as relevance explanation.
     * @param {string} businessCase - Business case description
     * @returns {Array<{service: string, alias: string, score: number, relevantUseCases: string[]}>}
     */
    static findServicesFor(businessCase) {
        const tokens = businessCase.toLowerCase().split(/\s+/).filter(t => t.length > 1);
        if (!tokens.length) return [];

        const results = [];

        for (const [name, entry] of Object.entries(this._services)) {
            const caps = this.getCapabilities(name);
            if (!caps) continue;

            const searchResult = this.searchCapabilities(businessCase)
                .find(r => r.service === name);
            if (!searchResult) continue;

            // Find matching use cases
            const relevantUseCases = (caps.useCases || []).filter(uc => {
                const ucLower = uc.toLowerCase();
                return tokens.some(t => ucLower.includes(t));
            });

            results.push({
                service: name,
                alias: caps.alias || entry.alias,
                score: searchResult.score,
                relevantUseCases
            });
        }

        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * List capability summaries for all registered services.
     * For dashboards and agent prompt injection.
     * @returns {Array<Object>} Summary of each service
     */
    static listCapabilities() {
        return Object.entries(this._services).map(([name, entry]) => {
            const caps = this.getCapabilities(name);
            const tables = entry.service?.getTableNames?.() || Object.keys(entry.service?.tables || {});
            return {
                name,
                alias: caps?.alias || entry.alias,
                intent: caps?.intent || '',
                tableCount: tables.length,
                bindingCount: (caps?.bindings || []).length,
                keywords: caps?.keywords || [],
                hasFull: !caps?._fallback
            };
        });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceRegistry;
}
