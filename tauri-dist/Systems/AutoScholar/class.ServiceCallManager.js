/**
 * ServiceCallManager - Centralized service call orchestration for AutoScholar
 *
 * Provides:
 * - Standardized service call patterns with error boundaries
 * - Automatic loading state management
 * - Retry logic with exponential backoff
 * - TTL-based caching for frequently accessed data
 * - Service health monitoring
 *
 * Usage:
 *   // Simple call with loading state
 *   const data = await ServiceCallManager.call({
 *       service: 'academic',
 *       method: 'getEnrolmentsByOffering',
 *       args: [offeringId],
 *       options: { showLoading: container }
 *   });
 *
 *   // Call with caching
 *   const cached = await ServiceCallManager.call({
 *       service: 'gradebook',
 *       method: 'getAssessments',
 *       args: [offeringId],
 *       options: { cache: { key: `assessments-${offeringId}`, ttl: 60000 } }
 *   });
 */

class ServiceCallManager {
    // Service reference (set by AutoScholar on init)
    static services = null;

    // Cache storage
    static _cache = new Map();

    // Service health status
    static _health = {};

    // Health check interval
    static _healthInterval = null;

    // Configuration
    static config = {
        defaultRetryAttempts: 2,
        defaultRetryDelay: 500,
        defaultCacheTTL: 60000, // 1 minute
        healthCheckInterval: 30000, // 30 seconds
        requestTimeout: 10000 // 10 seconds
    };

    // Event listeners for service status changes
    static _listeners = [];

    /**
     * Initialize the service call manager
     * @param {Object} services - Services object from AutoScholar
     */
    static init(services) {
        this.services = services;
        console.log('[ServiceCallManager] Initialized with services:', Object.keys(services || {}));
    }

    /**
     * Make a service call with standardized patterns
     * @param {Object} params - Call parameters
     * @param {string} params.service - Service name (e.g., 'academic', 'risk')
     * @param {string} params.method - Method name on the service
     * @param {Array} params.args - Arguments to pass to the method
     * @param {Object} params.options - Options for the call
     * @returns {Promise<any>} Result of the service call
     */
    static async call({ service, method, args = [], options = {} }) {
        const {
            showLoading = null,
            loadingType = 'spinner',
            loadingMessage = 'Loading...',
            cache = null,
            retry = null,
            fallback = null,
            silent = false
        } = options;

        // Check cache first
        if (cache && cache.key) {
            const cached = this._getCache(cache.key);
            if (cached !== null) {
                return cached;
            }
        }

        // Show loading state
        let loaderId = null;
        if (showLoading && typeof LoadingStateManager !== 'undefined') {
            if (loadingType === 'skeleton') {
                loaderId = LoadingStateManager.showSkeleton(showLoading, options.skeletonType || 'text');
            } else {
                loaderId = LoadingStateManager.showSpinner(showLoading, { message: loadingMessage });
            }
        }

        try {
            // Make the service call
            const result = await this._executeWithRetry(
                () => this._callService(service, method, args),
                retry || { attempts: this.config.defaultRetryAttempts, delay: this.config.defaultRetryDelay }
            );

            // Cache result if caching enabled
            if (cache && cache.key) {
                this._setCache(cache.key, result, cache.ttl || this.config.defaultCacheTTL);
            }

            return result;

        } catch (error) {
            // Update service health
            this._updateHealth(service, 'error', error.message);

            // Return fallback if provided
            if (fallback !== null) {
                console.warn(`[ServiceCallManager] ${service}.${method} failed, using fallback:`, error.message);
                return fallback;
            }

            // Show error state if not silent
            if (!silent && showLoading && typeof LoadingStateManager !== 'undefined') {
                LoadingStateManager.hide(loaderId);
                LoadingStateManager.showError(showLoading, {
                    message: this._getUserFriendlyError(error),
                    onRetry: () => this.call({ service, method, args, options })
                });
                return null;
            }

            throw error;

        } finally {
            // Hide loading state
            if (loaderId && typeof LoadingStateManager !== 'undefined') {
                LoadingStateManager.hide(loaderId);
            }
        }
    }

    /**
     * Execute a function with automatic loading state
     * @param {HTMLElement} container - Container for loading UI
     * @param {Function} asyncFn - Async function to execute
     * @param {Object} options - Loading options
     */
    static async withLoading(container, asyncFn, options = {}) {
        const {
            type = 'spinner',
            message = 'Loading...',
            skeleton = 'text',
            minDuration = 300,
            onError = null
        } = options;

        let loaderId;

        if (typeof LoadingStateManager !== 'undefined') {
            if (type === 'skeleton') {
                loaderId = LoadingStateManager.showSkeleton(container, skeleton, { minDuration });
            } else {
                loaderId = LoadingStateManager.showSpinner(container, { message, minDuration });
            }
        }

        try {
            const result = await asyncFn();
            if (loaderId) LoadingStateManager.hide(loaderId);
            return result;
        } catch (error) {
            if (loaderId) LoadingStateManager.hide(loaderId);

            if (onError && typeof LoadingStateManager !== 'undefined') {
                LoadingStateManager.showError(container, {
                    message: this._getUserFriendlyError(error),
                    onRetry: () => this.withLoading(container, asyncFn, options)
                });
            }

            throw error;
        }
    }

    // =========================================================================
    // INTERNAL SERVICE CALL
    // =========================================================================

    /**
     * Execute the actual service call
     */
    static _callService(serviceName, methodName, args) {
        return new Promise((resolve, reject) => {
            // Check if services are initialized
            if (!this.services) {
                reject(new Error('ServiceCallManager not initialized. Call ServiceCallManager.init(services) first.'));
                return;
            }

            // Get the service
            const service = this.services[serviceName];
            if (!service) {
                reject(new Error(`Service '${serviceName}' not found`));
                return;
            }

            // Get the method
            const method = service[methodName];
            if (typeof method !== 'function') {
                // Check if it's a publon property access
                if (methodName.startsWith('publon.')) {
                    const path = methodName.split('.');
                    let value = service;
                    for (const part of path) {
                        value = value?.[part];
                    }
                    resolve(value);
                    return;
                }
                reject(new Error(`Method '${methodName}' not found on service '${serviceName}'`));
                return;
            }

            // Execute with timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Service call timed out: ${serviceName}.${methodName}`));
            }, this.config.requestTimeout);

            try {
                const result = method.apply(service, args);

                // Handle promises
                if (result instanceof Promise) {
                    result
                        .then(data => {
                            clearTimeout(timeoutId);
                            this._updateHealth(serviceName, 'healthy');
                            resolve(data);
                        })
                        .catch(err => {
                            clearTimeout(timeoutId);
                            reject(err);
                        });
                } else {
                    clearTimeout(timeoutId);
                    this._updateHealth(serviceName, 'healthy');
                    resolve(result);
                }
            } catch (err) {
                clearTimeout(timeoutId);
                reject(err);
            }
        });
    }

    /**
     * Execute with retry logic
     */
    static async _executeWithRetry(fn, retryConfig) {
        const { attempts, delay } = retryConfig;

        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                const isRetryable = this._isRetryableError(error);

                if (attempt === attempts || !isRetryable) {
                    throw this._enhanceError(error, attempt);
                }

                // Exponential backoff
                const waitTime = delay * Math.pow(2, attempt - 1);
                console.warn(`[ServiceCallManager] Attempt ${attempt} failed, retrying in ${waitTime}ms...`);
                await this._delay(waitTime);
            }
        }
    }

    /**
     * Check if error is retryable
     */
    static _isRetryableError(error) {
        const message = error.message?.toLowerCase() || '';

        // Network/timeout errors
        if (message.includes('timeout') || message.includes('network')) return true;

        // Server errors (5xx)
        if (message.includes('5') && message.includes('error')) return true;

        // Rate limiting
        if (message.includes('429') || message.includes('rate')) return true;

        return false;
    }

    /**
     * Enhance error with user-friendly message
     */
    static _enhanceError(error, attempt = 1) {
        error.attempt = attempt;
        error.userMessage = this._getUserFriendlyError(error);
        return error;
    }

    /**
     * Get user-friendly error message
     */
    static _getUserFriendlyError(error) {
        const message = error.message?.toLowerCase() || '';

        if (message.includes('timeout')) {
            return 'Request timed out. Please try again.';
        }
        if (message.includes('network') || message.includes('fetch')) {
            return 'Network error. Please check your connection.';
        }
        if (message.includes('not found')) {
            return 'The requested data could not be found.';
        }
        if (message.includes('not initialized')) {
            return 'System is still loading. Please wait a moment.';
        }

        return 'An error occurred. Please try again.';
    }

    // =========================================================================
    // CACHING
    // =========================================================================

    /**
     * Get cached value
     */
    static _getCache(key) {
        const cached = this._cache.get(key);
        if (!cached) return null;

        // Check if expired
        if (Date.now() > cached.expiresAt) {
            this._cache.delete(key);
            return null;
        }

        return cached.value;
    }

    /**
     * Set cache value
     */
    static _setCache(key, value, ttl) {
        this._cache.set(key, {
            value,
            expiresAt: Date.now() + ttl,
            createdAt: Date.now()
        });
    }

    /**
     * Invalidate cache entries by key pattern
     * @param {string|RegExp} pattern - Key or pattern to match
     */
    static invalidateCache(pattern) {
        if (typeof pattern === 'string') {
            this._cache.delete(pattern);
        } else if (pattern instanceof RegExp) {
            for (const key of this._cache.keys()) {
                if (pattern.test(key)) {
                    this._cache.delete(key);
                }
            }
        }
    }

    /**
     * Clear all cache
     */
    static clearCache() {
        this._cache.clear();
    }

    /**
     * Get cache statistics
     */
    static getCacheStats() {
        let valid = 0;
        let expired = 0;
        const now = Date.now();

        for (const cached of this._cache.values()) {
            if (now > cached.expiresAt) {
                expired++;
            } else {
                valid++;
            }
        }

        return { total: this._cache.size, valid, expired };
    }

    // =========================================================================
    // HEALTH MONITORING
    // =========================================================================

    /**
     * Get health status for all services
     */
    static getHealth() {
        return { ...this._health };
    }

    /**
     * Get health status for a specific service
     */
    static getServiceHealth(serviceName) {
        return this._health[serviceName] || { status: 'unknown', lastCheck: null };
    }

    /**
     * Check health of all services
     */
    static async checkAllHealth() {
        if (!this.services) return;

        const serviceNames = Object.keys(this.services);

        for (const name of serviceNames) {
            try {
                const service = this.services[name];
                const start = Date.now();

                // Simple check - see if service has publon property
                if (service.publon) {
                    this._updateHealth(name, 'healthy', null, Date.now() - start);
                } else {
                    this._updateHealth(name, 'healthy', null, Date.now() - start);
                }
            } catch (error) {
                this._updateHealth(name, 'error', error.message);
            }
        }

        return this.getHealth();
    }

    /**
     * Start periodic health monitoring
     */
    static startHealthMonitor(interval = null) {
        if (this._healthInterval) {
            clearInterval(this._healthInterval);
        }

        const checkInterval = interval || this.config.healthCheckInterval;
        this._healthInterval = setInterval(() => this.checkAllHealth(), checkInterval);

        // Run initial check
        this.checkAllHealth();

        console.log(`[ServiceCallManager] Health monitor started (${checkInterval}ms interval)`);
    }

    /**
     * Stop health monitoring
     */
    static stopHealthMonitor() {
        if (this._healthInterval) {
            clearInterval(this._healthInterval);
            this._healthInterval = null;
            console.log('[ServiceCallManager] Health monitor stopped');
        }
    }

    /**
     * Update health status for a service
     */
    static _updateHealth(serviceName, status, error = null, latency = null) {
        const previousStatus = this._health[serviceName]?.status;

        this._health[serviceName] = {
            status,
            error,
            latency,
            lastCheck: Date.now()
        };

        // Emit event if status changed
        if (previousStatus !== status) {
            this._emitStatusChange(serviceName, status, previousStatus);
        }
    }

    /**
     * Add listener for service status changes
     */
    static onStatusChange(callback) {
        this._listeners.push(callback);
        return () => {
            const index = this._listeners.indexOf(callback);
            if (index > -1) this._listeners.splice(index, 1);
        };
    }

    /**
     * Emit status change event
     */
    static _emitStatusChange(serviceName, newStatus, previousStatus) {
        const event = { serviceName, newStatus, previousStatus, timestamp: Date.now() };

        this._listeners.forEach(callback => {
            try {
                callback(event);
            } catch (e) {
                console.error('[ServiceCallManager] Status change listener error:', e);
            }
        });

        // Also emit to EventBus if available
        if (typeof EventBus !== 'undefined' && typeof EventBus.emit === 'function') {
            EventBus.emit('service:status_changed', event);
        }
    }

    // =========================================================================
    // UTILITY
    // =========================================================================

    /**
     * Delay helper
     */
    static _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Batch multiple service calls
     * @param {Array} calls - Array of call configs
     * @param {Object} options - Batch options
     */
    static async batch(calls, options = {}) {
        const {
            parallel = true,
            showLoading = null,
            loadingMessage = 'Loading data...'
        } = options;

        let loaderId = null;
        if (showLoading && typeof LoadingStateManager !== 'undefined') {
            loaderId = LoadingStateManager.showProgress(showLoading, {
                total: calls.length,
                message: loadingMessage
            });
        }

        const results = [];

        if (parallel) {
            // Execute all in parallel
            const promises = calls.map((call, index) =>
                this.call({ ...call, options: { ...call.options, silent: true } })
                    .then(result => {
                        if (loaderId) LoadingStateManager.updateProgress(loaderId, index + 1);
                        return { success: true, result };
                    })
                    .catch(error => ({ success: false, error }))
            );
            results.push(...await Promise.all(promises));
        } else {
            // Execute sequentially
            for (let i = 0; i < calls.length; i++) {
                try {
                    const result = await this.call({ ...calls[i], options: { ...calls[i].options, silent: true } });
                    results.push({ success: true, result });
                } catch (error) {
                    results.push({ success: false, error });
                }
                if (loaderId) LoadingStateManager.updateProgress(loaderId, i + 1);
            }
        }

        if (loaderId) LoadingStateManager.hide(loaderId);

        return results;
    }

    /**
     * Preload data into cache
     * @param {Array} configs - Array of { key, service, method, args, ttl }
     */
    static async preload(configs) {
        console.log('[ServiceCallManager] Preloading', configs.length, 'items...');

        for (const config of configs) {
            try {
                const result = await this._callService(config.service, config.method, config.args || []);
                this._setCache(config.key, result, config.ttl || this.config.defaultCacheTTL);
            } catch (error) {
                console.warn(`[ServiceCallManager] Preload failed for ${config.key}:`, error.message);
            }
        }

        console.log('[ServiceCallManager] Preload complete');
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ServiceCallManager = ServiceCallManager;
}
