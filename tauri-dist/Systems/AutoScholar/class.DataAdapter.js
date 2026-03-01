/**
 * DataAdapter - Base class for AutoScholar data sources
 *
 * Adapters populate Publon tables from various sources:
 * - SampleDataAdapter: Hardcoded sample data for development/demo
 * - ApiDataAdapter: Live API connections (DUT, UKZN, VUT, CPUT)
 *
 * All adapters fill the same Publon tables, so UI code remains unchanged.
 *
 * Features:
 * - Health check mechanism for connection monitoring
 * - Retry logic with exponential backoff
 * - Response caching for performance optimization
 */
class DataAdapter {
    constructor(options = {}) {
        this.services = options.services || {};
        this.config = options.config || {};
        this.onProgress = options.onProgress || (() => {});
        this.initialized = false;

        // Health status tracking
        this._healthStatus = {
            lastCheck: null,
            isHealthy: false,
            lastError: null,
            consecutiveFailures: 0
        };

        // Retry configuration
        this._retryConfig = {
            maxRetries: options.maxRetries || 3,
            baseDelay: options.baseDelay || 1000,
            maxDelay: options.maxDelay || 10000
        };

        // Response cache
        this._cache = new Map();
        this._cacheConfig = {
            enabled: options.cacheEnabled !== false,
            defaultTTL: options.cacheTTL || 300000, // 5 minutes
            maxEntries: options.cacheMaxEntries || 100,
            cleanupInterval: options.cacheCleanupInterval || 60000 // 1 minute
        };

        // Start periodic cache cleanup
        if (this._cacheConfig.enabled) {
            this._startCacheCleanup();
        }
    }

    /**
     * Get adapter type identifier
     * @returns {string} 'sample' | 'api' | custom
     */
    getType() {
        return 'base';
    }

    /**
     * Initialize the adapter (authenticate, connect, etc.)
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        throw new Error('DataAdapter.initialize() must be implemented by subclass');
    }

    /**
     * Load all data into Publon tables
     * @returns {Promise<object>} Summary of loaded data
     */
    async loadAll() {
        throw new Error('DataAdapter.loadAll() must be implemented by subclass');
    }

    /**
     * Load specific data type
     * @param {string} dataType - 'members' | 'programmes' | 'courses' | 'enrolments' | 'results'
     * @param {object} params - Query parameters
     * @returns {Promise<array>} Loaded records
     */
    async load(dataType, params = {}) {
        throw new Error('DataAdapter.load() must be implemented by subclass');
    }

    /**
     * Check if adapter is ready to load data
     * @returns {boolean}
     */
    isReady() {
        return this.initialized;
    }

    /**
     * Get adapter status info
     * @returns {object}
     */
    getStatus() {
        return {
            type: this.getType(),
            initialized: this.initialized,
            config: this.config,
            health: this._healthStatus,
            cache: {
                enabled: this._cacheConfig.enabled,
                entries: this._cache.size,
                maxEntries: this._cacheConfig.maxEntries
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HEALTH CHECK METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Perform a health check on the adapter connection
     * Override in subclass for specific health check logic
     * @returns {Promise<object>} Health status
     */
    async healthCheck() {
        return {
            isHealthy: this.initialized,
            lastCheck: new Date().toISOString(),
            message: this.initialized ? 'Adapter initialized' : 'Adapter not initialized'
        };
    }

    /**
     * Get current health status
     * @returns {object}
     */
    getHealthStatus() {
        return { ...this._healthStatus };
    }

    /**
     * Update health status after an operation
     * @param {boolean} success - Whether the operation succeeded
     * @param {Error} error - Error if operation failed
     */
    _updateHealthStatus(success, error = null) {
        this._healthStatus.lastCheck = new Date().toISOString();
        if (success) {
            this._healthStatus.isHealthy = true;
            this._healthStatus.lastError = null;
            this._healthStatus.consecutiveFailures = 0;
        } else {
            this._healthStatus.consecutiveFailures++;
            this._healthStatus.lastError = error?.message || 'Unknown error';
            if (this._healthStatus.consecutiveFailures >= 3) {
                this._healthStatus.isHealthy = false;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RETRY LOGIC
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute an async operation with retry logic and exponential backoff
     * @param {Function} operation - Async function to execute
     * @param {object} options - Retry options
     * @returns {Promise<any>} Operation result
     */
    async _withRetry(operation, options = {}) {
        const maxRetries = options.maxRetries || this._retryConfig.maxRetries;
        const baseDelay = options.baseDelay || this._retryConfig.baseDelay;
        const maxDelay = options.maxDelay || this._retryConfig.maxDelay;
        const retryOn = options.retryOn || this._isRetryableError.bind(this);

        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                this._updateHealthStatus(true);
                return result;
            } catch (error) {
                lastError = error;
                this._updateHealthStatus(false, error);

                if (!retryOn(error) || attempt === maxRetries) {
                    throw this._enrichError(error, { attempt, maxRetries });
                }

                // Exponential backoff with jitter to prevent thundering herd
                const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 0.3 * exponentialDelay; // +/- 30% jitter
                const delay = Math.min(exponentialDelay + jitter, maxDelay);
                console.log(`[DataAdapter] Retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms: ${error.message}`);
                await this._sleep(delay);
            }
        }
        throw lastError;
    }

    /**
     * Check if an error is retryable
     * Override in subclass for specific retry logic
     * @param {Error} error
     * @returns {boolean}
     */
    _isRetryableError(error) {
        // Network errors, timeouts, and server errors are retryable
        const retryableMessages = [
            'network', 'timeout', 'ECONNRESET', 'ECONNREFUSED',
            'ETIMEDOUT', 'fetch failed', 'Failed to fetch'
        ];
        const errorMessage = (error.message || '').toLowerCase();
        return retryableMessages.some(msg => errorMessage.includes(msg.toLowerCase())) ||
               (error.status && error.status >= 500 && error.status < 600);
    }

    /**
     * Enrich error with additional context
     * @param {Error} error - Original error
     * @param {object} context - Additional context
     * @returns {Error}
     */
    _enrichError(error, context) {
        error.context = { ...error.context, ...context };
        error.timestamp = new Date().toISOString();
        error.adapterType = this.getType();
        return error;
    }

    /**
     * Sleep for a specified duration
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CACHING METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Start periodic cache cleanup to remove expired entries
     */
    _startCacheCleanup() {
        if (this._cleanupTimer) return; // Already running

        this._cleanupTimer = setInterval(() => {
            this._cleanupExpiredEntries();
        }, this._cacheConfig.cleanupInterval);
    }

    /**
     * Stop periodic cache cleanup
     */
    _stopCacheCleanup() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
        }
    }

    /**
     * Remove expired entries from cache
     */
    _cleanupExpiredEntries() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this._cache.entries()) {
            if (now > entry.expires) {
                this._cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[DataAdapter] Cache cleanup: removed ${cleaned} expired entries`);
        }
    }

    /**
     * Generate a cache key from action and params
     * @param {string} action - Action name
     * @param {object} params - Parameters
     * @returns {string}
     */
    _cacheKey(action, params = {}) {
        return `${action}:${JSON.stringify(params)}`;
    }

    /**
     * Get a cached response
     * @param {string} action - Action name
     * @param {object} params - Parameters
     * @returns {any|null} Cached data or null
     */
    _cacheGet(action, params = {}) {
        if (!this._cacheConfig.enabled) return null;

        const key = this._cacheKey(action, params);
        const entry = this._cache.get(key);

        if (!entry) return null;

        // Check expiration
        if (Date.now() > entry.expires) {
            this._cache.delete(key);
            return null;
        }

        console.log(`[DataAdapter] Cache hit: ${action}`);
        return entry.data;
    }

    /**
     * Store a response in cache
     * @param {string} action - Action name
     * @param {object} params - Parameters
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in ms (optional)
     */
    _cacheSet(action, params, data, ttl = null) {
        if (!this._cacheConfig.enabled) return;

        // Enforce max entries
        if (this._cache.size >= this._cacheConfig.maxEntries) {
            this._cacheEvictOldest();
        }

        const key = this._cacheKey(action, params);
        this._cache.set(key, {
            data,
            expires: Date.now() + (ttl || this._cacheConfig.defaultTTL),
            createdAt: Date.now()
        });
    }

    /**
     * Invalidate cache entries matching a pattern
     * @param {string|string[]} patterns - Pattern(s) to match (action prefix or array of prefixes)
     */
    _cacheInvalidate(patterns) {
        const patternList = Array.isArray(patterns) ? patterns : [patterns];
        let invalidated = 0;

        for (const key of this._cache.keys()) {
            for (const pattern of patternList) {
                if (key.startsWith(pattern)) {
                    this._cache.delete(key);
                    invalidated++;
                    break;
                }
            }
        }

        if (invalidated > 0) {
            console.log(`[DataAdapter] Cache invalidation: removed ${invalidated} entries matching patterns:`, patternList);
        }
        return invalidated;
    }

    /**
     * Invalidate cache with cascade rules
     * Example: Invalidating programmes also invalidates courses
     * @param {string} action - Action that triggered invalidation
     */
    _cacheInvalidateCascade(action) {
        const cascadeRules = {
            'getCollegeFaculties': ['getFacultyDisciplines', 'getDisciplineProgrammes', 'getInstProgrammes'],
            'getFacultyDisciplines': ['getDisciplineProgrammes', 'getInstProgrammes'],
            'getDisciplineProgrammes': ['getInstProgrammes', 'getProgrammeStructure'],
            'getInstProgrammes': ['getProgrammeStructure', 'getCourseMeta'],
            'getProgrammeStructure': ['getCourseMeta']
        };

        const patternsToInvalidate = [action];
        if (cascadeRules[action]) {
            patternsToInvalidate.push(...cascadeRules[action]);
        }

        return this._cacheInvalidate(patternsToInvalidate);
    }

    /**
     * Clear all cached data
     */
    _cacheClear() {
        this._cache.clear();
        console.log('[DataAdapter] Cache cleared');
    }

    /**
     * Evict the oldest cache entry
     */
    _cacheEvictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this._cache.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this._cache.delete(oldestKey);
        }
    }

    /**
     * Get cache statistics
     * @returns {object}
     */
    _cacheStats() {
        let validEntries = 0;
        let expiredEntries = 0;
        const now = Date.now();

        for (const entry of this._cache.values()) {
            if (now < entry.expires) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }

        return {
            totalEntries: this._cache.size,
            validEntries,
            expiredEntries,
            maxEntries: this._cacheConfig.maxEntries,
            enabled: this._cacheConfig.enabled
        };
    }

    /**
     * Helper: Report progress
     */
    _progress(message, percent = null) {
        this.onProgress({ message, percent });
        console.log(`[DataAdapter] ${message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOADING STATE INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute an operation with loading state management
     * @param {HTMLElement|El} container - Container for loading indicator
     * @param {Function} operation - Async operation to execute
     * @param {Object} options - Loading options
     * @returns {Promise<any>} Operation result
     */
    async withLoadingState(container, operation, options = {}) {
        if (typeof LoadingStateManager === 'undefined') {
            // Fallback if LoadingStateManager not available
            return operation();
        }

        const {
            type = 'spinner',
            skeleton = 'text',
            message = 'Loading...',
            showError = true
        } = options;

        return LoadingStateManager.withLoading(container, operation, {
            type,
            skeleton,
            message,
            errorMessage: 'Failed to load data. Please try again.',
            onError: showError ? (error) => console.error('[DataAdapter]', error) : null
        });
    }

    /**
     * Load data with progress indicator for batch operations
     * @param {HTMLElement|El} container - Container for progress indicator
     * @param {Array} items - Items to load
     * @param {Function} loadFn - Async function to load each item
     * @param {Object} options - Options
     * @returns {Promise<Object>} Results with success/error counts
     */
    async loadWithProgress(container, items, loadFn, options = {}) {
        if (typeof LoadingStateManager === 'undefined') {
            // Fallback without progress UI
            const results = [];
            for (const item of items) {
                results.push(await loadFn(item));
            }
            return { results, errors: [] };
        }

        return LoadingStateManager.withProgress(container, items, loadFn, {
            message: options.message || 'Loading {current} of {total}...',
            onError: options.onError
        });
    }

    /**
     * Helper: Populate a Publon table from an array of records
     * @param {Publon} publon - The Publon instance
     * @param {array} records - Records to insert
     * @param {object} fieldMap - Optional field name mapping
     * @returns {number} Number of records inserted
     */
    _populateTable(publon, records, fieldMap = null) {
        if (!publon || !records || !Array.isArray(records)) return 0;

        let count = 0;
        for (const record of records) {
            try {
                const mapped = fieldMap ? this._mapFields(record, fieldMap) : record;
                publon.create(mapped);
                count++;
            } catch (e) {
                console.warn(`[DataAdapter] Failed to insert record:`, e.message);
            }
        }
        return count;
    }

    /**
     * Helper: Map field names from source to target schema
     * @param {object} record - Source record
     * @param {object} fieldMap - { targetField: 'sourceField' } or { targetField: (record) => value }
     * @returns {object} Mapped record
     */
    _mapFields(record, fieldMap) {
        const result = {};
        for (const [targetField, source] of Object.entries(fieldMap)) {
            if (typeof source === 'function') {
                result[targetField] = source(record);
            } else if (typeof source === 'string') {
                result[targetField] = record[source];
            } else {
                result[targetField] = source; // Literal value
            }
        }
        return result;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.DataAdapter = DataAdapter;
}
