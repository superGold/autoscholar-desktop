/**
 * TestRunner - Shared test engine for AutoScholar test rig
 * Async-first: all tests are async functions (API calls are primary target)
 * No external dependencies.
 *
 * @module TestRunner
 */

class TestRunner {
    /**
     * @param {Object} options
     * @param {string} options.name - Suite name
     * @param {Function} [options.onResult] - Called after each test: (result) => void
     * @param {Function} [options.onComplete] - Called when all tests finish: (summary) => void
     */
    constructor({ name, onResult, onComplete } = {}) {
        this.name = name || 'Test Suite';
        this.onResult = onResult || (() => {});
        this.onComplete = onComplete || (() => {});
        this._tests = [];
        this._results = [];
        this._running = false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Registration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Register a test
     * @param {string} name - Test name
     * @param {Function} asyncFn - Async test function
     * @param {Object} [options]
     * @param {number} [options.timeout=15000] - Timeout in ms
     * @param {boolean} [options.skip=false] - Skip this test
     * @param {string[]} [options.tags] - Tags for filtering
     */
    test(name, asyncFn, options = {}) {
        this._tests.push({
            name,
            fn: asyncFn,
            timeout: options.timeout || 15000,
            skip: options.skip || false,
            tags: options.tags || []
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Assertions (throw on failure)
    // ─────────────────────────────────────────────────────────────────────────

    static assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
    }

    static assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(
                message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
            );
        }
    }

    static assertNotEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(message || `Expected value to differ from ${JSON.stringify(expected)}`);
        }
    }

    static assertNotNull(value, message) {
        if (value === null || value === undefined) {
            throw new Error(message || 'Expected non-null value');
        }
    }

    static assertType(value, type, message) {
        const actual = typeof value;
        if (actual !== type) {
            throw new Error(message || `Expected type "${type}", got "${actual}"`);
        }
    }

    static assertArrayLength(arr, min, message) {
        if (!Array.isArray(arr)) {
            throw new Error(message || `Expected array, got ${typeof arr}`);
        }
        if (arr.length < min) {
            throw new Error(message || `Expected array length >= ${min}, got ${arr.length}`);
        }
    }

    static assertHasFields(obj, fields, message) {
        if (!obj || typeof obj !== 'object') {
            throw new Error(message || 'Expected object');
        }
        const missing = fields.filter(f => !(f in obj));
        if (missing.length > 0) {
            throw new Error(message || `Missing fields: ${missing.join(', ')}`);
        }
    }

    /**
     * Assert API response has {status, fields, data} or {status, results} format
     */
    static assertResponseFormat(data, message) {
        if (!data || typeof data !== 'object') {
            throw new Error(message || 'Response is not an object');
        }
        // Accept either { status, fields, data } or { status, results }
        const hasFieldsData = ('fields' in data && 'data' in data);
        const hasResults = ('results' in data);
        const hasStatus = ('status' in data);
        if (!hasStatus && !hasFieldsData && !hasResults) {
            throw new Error(
                message || `Response missing expected format. Keys: ${Object.keys(data).join(', ')}`
            );
        }
    }

    static assertGreaterThan(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} > ${expected}`);
        }
    }

    static assertMatch(value, regex, message) {
        if (!regex.test(value)) {
            throw new Error(message || `"${value}" does not match ${regex}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Execution
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Run all tests, optionally filtered by tag or name substring
     * @param {string} [filter] - Only run tests whose name or tags include this string
     * @returns {Promise<Object>} Summary
     */
    async runAll(filter) {
        this._running = true;
        this._results = [];

        const tests = filter
            ? this._tests.filter(t =>
                t.name.toLowerCase().includes(filter.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
            )
            : this._tests;

        for (const test of tests) {
            if (!this._running) break;
            const result = await this._execute(test);
            this._results.push(result);
            this.onResult(result);
        }

        this._running = false;
        const summary = this.getResults();
        this.onComplete(summary);
        return summary;
    }

    /**
     * Run a single test by name
     * @param {string} testName - Exact or partial test name
     * @returns {Promise<Object>} Result
     */
    async runSingle(testName) {
        const test = this._tests.find(t =>
            t.name === testName || t.name.toLowerCase().includes(testName.toLowerCase())
        );
        if (!test) throw new Error(`Test not found: ${testName}`);

        const result = await this._execute(test);
        this._results.push(result);
        this.onResult(result);
        return result;
    }

    /**
     * Stop running tests
     */
    stop() {
        this._running = false;
    }

    /**
     * Get results summary
     * @returns {Object} { passed, failed, skipped, total, duration, results[] }
     */
    getResults() {
        const passed = this._results.filter(r => r.status === 'passed').length;
        const failed = this._results.filter(r => r.status === 'failed').length;
        const skipped = this._results.filter(r => r.status === 'skipped').length;
        const totalDuration = this._results.reduce((sum, r) => sum + (r.duration || 0), 0);

        return {
            name: this.name,
            passed,
            failed,
            skipped,
            total: this._results.length,
            duration: totalDuration,
            results: this._results
        };
    }

    /**
     * Get registered test count
     */
    get testCount() {
        return this._tests.length;
    }

    /**
     * Get registered test names
     */
    get testNames() {
        return this._tests.map(t => t.name);
    }

    /**
     * Clear registered tests and results
     */
    clear() {
        this._tests = [];
        this._results = [];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    async _execute(test) {
        if (test.skip) {
            return { name: test.name, status: 'skipped', duration: 0, error: null, data: null };
        }

        const start = performance.now();

        try {
            // Race between test and timeout
            const result = await Promise.race([
                test.fn(TestRunner),
                this._timeout(test.timeout, test.name)
            ]);

            const duration = performance.now() - start;
            return {
                name: test.name,
                status: 'passed',
                duration,
                error: null,
                data: result !== undefined ? this._preview(result) : null
            };
        } catch (error) {
            const duration = performance.now() - start;
            return {
                name: test.name,
                status: 'failed',
                duration,
                error: error.message || String(error),
                data: null
            };
        }
    }

    _timeout(ms, testName) {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${testName}`)), ms)
        );
    }

    /**
     * Create a preview of API response data (truncated for display)
     */
    _preview(data) {
        if (data === null || data === undefined) return null;
        if (typeof data !== 'object') return data;

        try {
            // For arrays, show first 3 items
            if (Array.isArray(data)) {
                return {
                    _type: 'array',
                    length: data.length,
                    sample: data.slice(0, 3)
                };
            }

            // For objects, shallow copy with truncated arrays
            const preview = {};
            for (const [key, val] of Object.entries(data)) {
                if (Array.isArray(val)) {
                    preview[key] = `[Array(${val.length})]`;
                } else if (typeof val === 'object' && val !== null) {
                    preview[key] = '{...}';
                } else {
                    preview[key] = val;
                }
            }
            return preview;
        } catch {
            return '[preview error]';
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}
