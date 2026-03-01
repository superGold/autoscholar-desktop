/**
 * ServiceLoader - Dynamic service initialization for AutoScholar
 *
 * Loads services based on registry configuration, handling:
 * - Topological dependency resolution (Kahn's algorithm)
 * - Cyclic dependency detection
 * - Priority-based initialization order
 * - Optional service detection
 * - Dependency injection
 * - Lazy loading support
 * - Health checks
 * - Lifecycle events
 *
 * Usage:
 *   const loader = new ServiceLoader();
 *   const services = loader.loadAll();
 *
 * Or with inline config:
 *   const services = ServiceLoader.initFromConfig(registryConfig);
 *
 * Events:
 *   - service:loading - { key, config }
 *   - service:loaded - { key, service }
 *   - service:error - { key, error }
 *   - services:ready - { services, errors }
 *
 * Service Contracts:
 *   Services MAY implement these methods:
 *   - healthCheck(): { status: 'healthy'|'degraded'|'unhealthy', message?: string }
 *   - dispose(): void - Called during shutdown
 */

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error class for ServiceLoader errors
 */
class ServiceLoaderError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'ServiceLoaderError';
        this.context = context;
    }
}

/**
 * Service class not found in global scope
 */
class ServiceNotFoundError extends ServiceLoaderError {
    constructor(serviceKey, className) {
        super(`Service class not found: ${className} (for service: ${serviceKey})`);
        this.name = 'ServiceNotFoundError';
        this.context = { serviceKey, className };
    }
}

/**
 * Required dependency not available
 */
class DependencyError extends ServiceLoaderError {
    constructor(serviceKey, missingDependency) {
        super(`Dependency not met for ${serviceKey}: ${missingDependency}`);
        this.name = 'DependencyError';
        this.context = { serviceKey, missingDependency };
    }
}

/**
 * Service failed to initialize
 */
class InitializationError extends ServiceLoaderError {
    constructor(serviceKey, originalError) {
        super(`Error initializing ${serviceKey}: ${originalError.message}`);
        this.name = 'InitializationError';
        this.context = { serviceKey, originalError };
    }
}

/**
 * Cyclic dependency detected
 */
class CyclicDependencyError extends ServiceLoaderError {
    constructor(cycle) {
        super(`Cyclic dependency detected: ${cycle.join(' -> ')}`);
        this.name = 'CyclicDependencyError';
        this.context = { cycle };
    }
}

// =============================================================================
// ServiceLoader Class
// =============================================================================

class ServiceLoader {
    /**
     * Default service registry (inline for cases when JSON can't be loaded)
     */
    static DEFAULT_REGISTRY = {
        member: { class: 'MemberService', priority: 1, required: true, dependencies: [] },
        academic: { class: 'AcademicService', priority: 1, required: true, dependencies: [] },
        risk: { class: 'RiskService', priority: 2, dependencies: [] },
        event: { class: 'EventService', priority: 2, dependencies: [] },
        timetable: { class: 'TimetableService', priority: 2, dependencies: [] },
        concession: { class: 'ConcessionService', priority: 2, dependencies: [] },
        messenger: { class: 'Messenger', priority: 2, dependencies: [] },
        casework: { class: 'CaseworkService', priority: 2, dependencies: [] },
        audit: { class: 'AuditService', priority: 2, dependencies: [] },
        tree: { class: 'TreeService', priority: 2, dependencies: [] },
        diary: {
            class: 'DiaryService',
            priority: 3,
            dependencies: ['member'],
            config: { memberService: 'member' },
            postInit: { method: 'setTreeService', serviceRef: 'tree' }
        },
        career: {
            class: 'CareerService',
            priority: 3,
            dependencies: ['member'],
            config: { memberService: 'member' }
        },
        gradebook: {
            class: 'GradebookService',
            priority: 3,
            dependencies: ['member', 'academic'],
            config: { memberService: 'member', academicService: 'academic' }
        },
        attendance: {
            class: 'AttendanceService',
            priority: 4,
            dependencies: ['member', 'academic', 'gradebook'],
            config: { memberService: 'member', academicService: 'academic', gradebookService: 'gradebook' }
        },
        userFeedback: { class: 'AsUserFeedbackService', priority: 2, dependencies: [] },
        programmeEstimator: {
            class: 'AsProgrammeEstimator',
            priority: 3,
            dependencies: ['academic'],
            config: { academicService: 'academic' }
        },
        programmeStructure: {
            class: 'AsProgrammeStructureService',
            priority: 4,
            dependencies: ['userFeedback', 'programmeEstimator'],
            config: { feedbackService: 'userFeedback', estimator: 'programmeEstimator' }
        },
        logicEditor: { class: 'LogicEditorService', priority: 2, dependencies: [] }
    };

    /**
     * Service status constants
     */
    static STATUS = {
        PENDING: 'pending',
        LOADING: 'loading',
        LOADED: 'loaded',
        FAILED: 'failed',
        LAZY: 'lazy'
    };

    constructor(options = {}) {
        this.registry = options.registry || ServiceLoader.DEFAULT_REGISTRY;
        this.services = {};
        this.errors = [];
        this._status = {};  // Track individual service status
        this._loadTimes = {}; // Track initialization timing
        this._lazyProxies = {}; // Track lazy-loaded service proxies
    }

    // -------------------------------------------------------------------------
    // Main Loading Methods
    // -------------------------------------------------------------------------

    /**
     * Load all services from registry
     * @returns {Object} - Map of service key to service instance
     */
    loadAll() {
        // Get topologically sorted order
        const sortedKeys = this._getLoadOrder();
        if (!sortedKeys) {
            // Cyclic dependency detected, error already added
            return this.services;
        }

        // Initialize services in dependency order
        for (const key of sortedKeys) {
            const config = this.registry[key];

            // Check for lazy loading
            if (config.lazy) {
                this._initLazyService(key, config);
            } else {
                this._initService(key, config);
            }
        }

        // Run post-init hooks
        for (const key of sortedKeys) {
            const config = this.registry[key];
            if (config.postInit && this.services[key]) {
                this._runPostInit(key, config.postInit);
            }
        }

        // Emit ready event
        this._emit('services:ready', {
            services: Object.keys(this.services),
            errors: this.errors
        });

        console.log('[ServiceLoader] Initialized:', Object.keys(this.services));
        if (this.errors.length > 0) {
            console.warn('[ServiceLoader] Errors:', this.errors);
        }

        return this.services;
    }

    // -------------------------------------------------------------------------
    // Dependency Resolution
    // -------------------------------------------------------------------------

    /**
     * Get load order using topological sort
     * Combines dependency order with priority for services at same dependency level
     * @returns {string[]|null} - Sorted service keys, or null if cyclic dependency
     */
    _getLoadOrder() {
        const { graph, inDegree } = this._buildDependencyGraph();

        // Check for cyclic dependencies
        const cycle = this._detectCycle(graph);
        if (cycle) {
            const error = new CyclicDependencyError(cycle);
            this.errors.push(error);
            console.error('[ServiceLoader]', error.message);
            return null;
        }

        // Kahn's algorithm for topological sort
        return this._topologicalSort(graph, inDegree);
    }

    /**
     * Build dependency graph from registry
     * @returns {{graph: Object, inDegree: Object}}
     */
    _buildDependencyGraph() {
        const graph = {};  // Adjacency list: service -> services that depend on it
        const inDegree = {};  // Count of dependencies for each service

        // Initialize all services
        for (const key of Object.keys(this.registry)) {
            graph[key] = [];
            inDegree[key] = 0;
        }

        // Build edges based on dependencies
        for (const [key, config] of Object.entries(this.registry)) {
            const deps = config.dependencies || [];
            inDegree[key] = deps.length;

            for (const dep of deps) {
                if (graph[dep]) {
                    graph[dep].push(key);  // dep -> key (key depends on dep)
                }
            }
        }

        return { graph, inDegree };
    }

    /**
     * Detect cyclic dependencies using DFS
     * @param {Object} graph - Adjacency list
     * @returns {string[]|null} - Cycle path if found, null otherwise
     */
    _detectCycle(graph) {
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];

        const dfs = (node) => {
            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const deps = this.registry[node]?.dependencies || [];
            for (const dep of deps) {
                if (!this.registry[dep]) continue; // Skip missing dependencies

                if (!visited.has(dep)) {
                    const cycle = dfs(dep);
                    if (cycle) return cycle;
                } else if (recursionStack.has(dep)) {
                    // Found cycle
                    const cycleStart = path.indexOf(dep);
                    return [...path.slice(cycleStart), dep];
                }
            }

            path.pop();
            recursionStack.delete(node);
            return null;
        };

        for (const key of Object.keys(this.registry)) {
            if (!visited.has(key)) {
                const cycle = dfs(key);
                if (cycle) return cycle;
            }
        }

        return null;
    }

    /**
     * Topological sort using Kahn's algorithm
     * Services at same level are sorted by priority
     * @param {Object} graph - Adjacency list
     * @param {Object} inDegree - In-degree counts
     * @returns {string[]} - Sorted service keys
     */
    _topologicalSort(graph, inDegree) {
        const result = [];
        const queue = [];

        // Start with services that have no dependencies
        for (const [key, degree] of Object.entries(inDegree)) {
            if (degree === 0) {
                queue.push(key);
            }
        }

        // Sort initial queue by priority
        queue.sort((a, b) => {
            const priorityA = this.registry[a]?.priority || 99;
            const priorityB = this.registry[b]?.priority || 99;
            return priorityA - priorityB;
        });

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            // Reduce in-degree for dependents
            for (const dependent of graph[current]) {
                inDegree[dependent]--;
                if (inDegree[dependent] === 0) {
                    queue.push(dependent);
                }
            }

            // Re-sort queue by priority
            queue.sort((a, b) => {
                const priorityA = this.registry[a]?.priority || 99;
                const priorityB = this.registry[b]?.priority || 99;
                return priorityA - priorityB;
            });
        }

        return result;
    }

    // -------------------------------------------------------------------------
    // Service Initialization
    // -------------------------------------------------------------------------

    /**
     * Initialize a single service
     * @param {string} key - Service key
     * @param {Object} config - Service configuration
     * @returns {Object|null} - Service instance or null
     */
    _initService(key, config) {
        const startTime = performance.now();
        this._status[key] = ServiceLoader.STATUS.LOADING;
        this._emit('service:loading', { key, config });

        // Check if class exists
        const ServiceClass = window[config.class];
        if (typeof ServiceClass === 'undefined') {
            const error = new ServiceNotFoundError(key, config.class);
            this._handleServiceError(key, config, error);
            return null;
        }

        // Check dependencies
        const deps = config.dependencies || [];
        for (const dep of deps) {
            if (!this.services[dep] && this.registry[dep]) {
                // Dependency exists in registry but not loaded
                const error = new DependencyError(key, dep);
                this._handleServiceError(key, config, error);
                return null;
            }
        }

        // Build config object with service references
        let initConfig = {};
        if (config.config) {
            for (const [cfgKey, serviceRef] of Object.entries(config.config)) {
                initConfig[cfgKey] = this.services[serviceRef];
            }
        }

        // Create service instance
        try {
            this.services[key] = Object.keys(initConfig).length > 0
                ? new ServiceClass(initConfig)
                : new ServiceClass();

            this._status[key] = ServiceLoader.STATUS.LOADED;
            this._loadTimes[key] = performance.now() - startTime;
            this._emit('service:loaded', { key, service: this.services[key] });

            return this.services[key];
        } catch (error) {
            const initError = new InitializationError(key, error);
            this._handleServiceError(key, config, initError);
            return null;
        }
    }

    /**
     * Initialize a lazy-loaded service using Proxy
     * @param {string} key - Service key
     * @param {Object} config - Service configuration
     */
    _initLazyService(key, config) {
        this._status[key] = ServiceLoader.STATUS.LAZY;

        const loader = this;
        const proxy = new Proxy({}, {
            get(target, prop) {
                // Initialize on first access
                if (!loader.services[key] || loader.services[key] === proxy) {
                    console.log(`[ServiceLoader] Lazy-loading service: ${key}`);
                    const service = loader._initService(key, config);
                    if (!service) {
                        throw new Error(`Failed to lazy-load service: ${key}`);
                    }
                }
                return loader.services[key][prop];
            },
            set(target, prop, value) {
                if (!loader.services[key] || loader.services[key] === proxy) {
                    loader._initService(key, config);
                }
                loader.services[key][prop] = value;
                return true;
            }
        });

        this._lazyProxies[key] = proxy;
        this.services[key] = proxy;
    }

    /**
     * Handle service initialization error
     * @param {string} key - Service key
     * @param {Object} config - Service configuration
     * @param {Error} error - The error that occurred
     */
    _handleServiceError(key, config, error) {
        this._status[key] = ServiceLoader.STATUS.FAILED;
        this.errors.push(error);
        this._emit('service:error', { key, error });

        if (config.required) {
            console.error('[ServiceLoader]', error.message);
        } else {
            console.warn('[ServiceLoader]', error.message);
        }
    }

    /**
     * Run post-initialization hook
     * @param {string} key - Service key
     * @param {Object} postInit - Post-init configuration
     */
    _runPostInit(key, postInit) {
        const service = this.services[key];
        const refService = this.services[postInit.serviceRef];

        if (service && refService && typeof service[postInit.method] === 'function') {
            try {
                service[postInit.method](refService);
            } catch (error) {
                const postInitError = new ServiceLoaderError(
                    `PostInit error for ${key}: ${error.message}`,
                    { key, method: postInit.method, originalError: error }
                );
                this.errors.push(postInitError);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Health Checks
    // -------------------------------------------------------------------------

    /**
     * Check health of all loaded services
     * @returns {Object} - Health status for each service
     */
    checkHealth() {
        const health = {
            status: 'healthy',
            services: {},
            timestamp: new Date().toISOString()
        };

        let hasUnhealthy = false;
        let hasDegraded = false;

        for (const [key, service] of Object.entries(this.services)) {
            // Skip lazy proxies that haven't been initialized
            if (this._status[key] === ServiceLoader.STATUS.LAZY) {
                health.services[key] = { status: 'lazy', message: 'Not yet initialized' };
                continue;
            }

            // Check if service implements healthCheck
            if (typeof service?.healthCheck === 'function') {
                try {
                    health.services[key] = service.healthCheck();
                    if (health.services[key].status === 'unhealthy') {
                        hasUnhealthy = true;
                    } else if (health.services[key].status === 'degraded') {
                        hasDegraded = true;
                    }
                } catch (error) {
                    health.services[key] = {
                        status: 'unhealthy',
                        message: `Health check failed: ${error.message}`
                    };
                    hasUnhealthy = true;
                }
            } else {
                health.services[key] = { status: 'unknown', message: 'No health check implemented' };
            }
        }

        // Set overall status
        if (hasUnhealthy) {
            health.status = 'unhealthy';
        } else if (hasDegraded) {
            health.status = 'degraded';
        }

        return health;
    }

    // -------------------------------------------------------------------------
    // Status Reporting
    // -------------------------------------------------------------------------

    /**
     * Get overall loader status
     * @returns {Object} - Status report
     */
    getStatus() {
        const loaded = Object.entries(this._status)
            .filter(([_, status]) => status === ServiceLoader.STATUS.LOADED)
            .map(([key]) => key);

        const failed = Object.entries(this._status)
            .filter(([_, status]) => status === ServiceLoader.STATUS.FAILED)
            .map(([key]) => key);

        const lazy = Object.entries(this._status)
            .filter(([_, status]) => status === ServiceLoader.STATUS.LAZY)
            .map(([key]) => key);

        return {
            loaded,
            failed,
            lazy,
            errors: this.errors.map(e => ({
                name: e.name,
                message: e.message,
                context: e.context
            })),
            loadTimes: { ...this._loadTimes },
            totalLoadTime: Object.values(this._loadTimes).reduce((a, b) => a + b, 0)
        };
    }

    /**
     * Get status for a specific service
     * @param {string} key - Service key
     * @returns {Object} - Service status
     */
    getServiceStatus(key) {
        return {
            key,
            status: this._status[key] || 'unknown',
            loaded: !!this.services[key],
            loadTime: this._loadTimes[key] || null,
            config: this.registry[key] || null
        };
    }

    // -------------------------------------------------------------------------
    // Event System
    // -------------------------------------------------------------------------

    /**
     * Emit a lifecycle event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event details
     */
    _emit(eventName, detail) {
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent(`serviceloader:${eventName}`, { detail });
            window.dispatchEvent(event);
        }
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Get a specific service
     * @param {string} key - Service key
     * @returns {Object|undefined} - Service instance
     */
    get(key) {
        return this.services[key];
    }

    /**
     * Check if a service is available
     * @param {string} key - Service key
     * @returns {boolean}
     */
    has(key) {
        return !!this.services[key];
    }

    /**
     * Check if a service is loaded (not lazy)
     * @param {string} key - Service key
     * @returns {boolean}
     */
    isLoaded(key) {
        return this._status[key] === ServiceLoader.STATUS.LOADED;
    }

    /**
     * Force load a lazy service
     * @param {string} key - Service key
     * @returns {Object|null} - Service instance
     */
    forceLoad(key) {
        if (this._status[key] === ServiceLoader.STATUS.LAZY) {
            const config = this.registry[key];
            return this._initService(key, config);
        }
        return this.services[key];
    }

    // -------------------------------------------------------------------------
    // Static Helpers
    // -------------------------------------------------------------------------

    /**
     * Static helper to initialize services from config
     * @param {Object} registry - Service registry config
     * @returns {Object} - Map of services
     */
    static initFromConfig(registry) {
        const loader = new ServiceLoader({ registry });
        return loader.loadAll();
    }

    /**
     * Static helper to initialize with default registry
     * @returns {Object} - Map of services
     */
    static initDefault() {
        const loader = new ServiceLoader();
        return loader.loadAll();
    }
}

// =============================================================================
// Export Error Classes
// =============================================================================

ServiceLoader.ServiceLoaderError = ServiceLoaderError;
ServiceLoader.ServiceNotFoundError = ServiceNotFoundError;
ServiceLoader.DependencyError = DependencyError;
ServiceLoader.InitializationError = InitializationError;
ServiceLoader.CyclicDependencyError = CyclicDependencyError;

// Make available globally
window.ServiceLoader = ServiceLoader;
