/**
 * ComponentTestSuite - Tests individual classes for existence,
 * instantiation, and method availability.
 *
 * @module ComponentTestSuite
 */

class ComponentTestSuite {
    /**
     * @param {Object} options
     * @param {TestRunner} options.runner - Shared test runner
     * @param {TestResultsRenderer} options.renderer - Results renderer
     */
    constructor({ runner, renderer }) {
        this.runner = runner;
        this.renderer = renderer;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Registration
    // ─────────────────────────────────────────────────────────────────────────

    registerTests() {
        const T = TestRunner;
        const suite = this;

        // ── Selectors ──
        const selectors = [
            { className: 'BaseSelector', methods: ['render', 'getValue', 'setValue', 'getSelectedItems'] },
            { className: 'StudentSelector', methods: ['render'] },
            { className: 'CourseSelector', methods: ['render'] },
            { className: 'FacultySelector', methods: ['render'] },
            { className: 'DepartmentSelector', methods: ['render'] },
            { className: 'ProgrammeSelector', methods: ['render'] },
            { className: 'CohortSelector', methods: ['render'] }
        ];

        for (const sel of selectors) {
            this.runner.test(`Selector: ${sel.className}`, () => {
                suite._testClassExists(sel.className);
                const proto = window[sel.className].prototype;
                suite._testMethodsExist(proto, sel.methods, sel.className);
                return { className: sel.className, methods: sel.methods };
            }, { tags: ['selector'] });
        }

        // ── Data Adapters ──
        const adapters = [
            { className: 'DataAdapter', methods: ['loadAll', 'initialize'] },
            { className: 'SampleDataAdapter', methods: ['loadAll', 'initialize'] },
            { className: 'ApiDataAdapter', methods: ['loadAll', 'initialize'] },
            { className: 'ServiceBackend', methods: ['create', 'read', 'update', 'delete', 'healthCheck', 'findOrCreateMember'] },
            { className: 'ServiceCallManager', methods: [] },
            { className: 'ServiceLoader', methods: ['loadAll', 'get', 'has', 'checkHealth', 'getStatus'] }
        ];

        for (const adapter of adapters) {
            this.runner.test(`DataAdapter: ${adapter.className}`, () => {
                suite._testClassExists(adapter.className);
                if (adapter.methods.length > 0) {
                    const proto = window[adapter.className].prototype;
                    suite._testMethodsExist(proto, adapter.methods, adapter.className);
                }
                return { className: adapter.className, methods: adapter.methods };
            }, { tags: ['adapter'] });
        }

        // ── Subsystem Classes ──
        const subsystems = [
            { className: 'AutoScholarHub', methods: ['render'] },
            { className: 'AutoScholarStudent', methods: ['render'] },
            { className: 'ClassViewConnect', methods: ['render'] },
            { className: 'AutoScholarExecutive', methods: ['render'] },
            { className: 'AutoScholarAnalyst', methods: ['render'] },
            { className: 'AutoScholarCounsellor', methods: ['render'] },
            { className: 'AutoScholarAdmin', methods: ['render'] },
            { className: 'AutoScholarAbout', methods: ['render'] }
        ];

        for (const sub of subsystems) {
            this.runner.test(`Subsystem: ${sub.className}`, () => {
                suite._testClassExists(sub.className);
                const proto = window[sub.className].prototype;
                suite._testMethodsExist(proto, sub.methods, sub.className);
                return { className: sub.className, methods: sub.methods };
            }, { tags: ['subsystem'] });
        }

        // ── Utility Classes ──
        const utilities = [
            { className: 'AutoScholarUtils', methods: [] },
            { className: 'AutoScholarErrors', methods: [] },
            { className: 'SecurityUtils', methods: [] },
            { className: 'LoadingStateManager', methods: [] },
            { className: 'AdapterUtils', methods: [] }
        ];

        for (const util of utilities) {
            this.runner.test(`Utility: ${util.className}`, () => {
                suite._testClassExists(util.className);
                return { className: util.className };
            }, { tags: ['utility'] });
        }

        // ── Instantiation Tests (safe constructors only) ──
        this.runner.test('Instantiate: ServiceBackend', () => {
            const instance = new ServiceBackend({ apiUrl: 'http://test' });
            T.assertNotNull(instance, 'Should instantiate');
            T.assertEqual(instance.apiUrl, 'http://test', 'Should accept config');
            T.assertEqual(instance.memberId, null, 'memberId should be null');
            T.assertEqual(instance.authToken, null, 'authToken should be null');
            return { instantiated: true };
        }, { tags: ['instantiate'] });

        this.runner.test('Instantiate: ServiceLoader', () => {
            if (typeof ServiceLoader === 'undefined') {
                throw new Error('ServiceLoader not loaded');
            }
            const loader = new ServiceLoader({ registry: {} });
            T.assertNotNull(loader, 'Should instantiate');
            T.assertType(loader.loadAll, 'function', 'Should have loadAll');
            return { instantiated: true };
        }, { tags: ['instantiate'] });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Controls UI
    // ─────────────────────────────────────────────────────────────────────────

    renderControls(container) {
        const accordion = new uiAccordion({
            exclusive: true,
            content: {
                tests: { label: 'Tests', content: '<div class="comp-tests"></div>', open: true },
                info:  { label: 'Class Summary', content: '<div class="comp-info"></div>' }
            },
            parent: container
        });

        // ── Tests section ──
        const testsEl = accordion.el.querySelector('.comp-tests');
        new uiButton({
            label: 'Run All', variant: 'primary', size: 'sm', parent: testsEl,
            onClick: () => { this.renderer.clearResults(); this.runner.runAll(); }
        });
        const filterGroup = document.createElement('div');
        filterGroup.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;';
        testsEl.appendChild(filterGroup);
        for (const tag of ['selector', 'adapter', 'subsystem', 'utility', 'instantiate']) {
            new uiButton({
                label: tag, variant: 'outline', size: 'xs', parent: filterGroup,
                onClick: () => { this.renderer.clearResults(); this.runner.runAll(tag); }
            });
        }

        // ── Summary section ──
        const infoEl = accordion.el.querySelector('.comp-info');
        this._renderSummary(infoEl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    _testClassExists(className) {
        const cls = window[className];
        if (typeof cls === 'undefined') {
            throw new Error(`Class "${className}" not found on window`);
        }
        if (typeof cls !== 'function') {
            throw new Error(`window.${className} is not a function/class (got ${typeof cls})`);
        }
    }

    _testMethodsExist(protoOrInstance, methodNames, className) {
        const missing = methodNames.filter(m => typeof protoOrInstance[m] !== 'function');
        if (missing.length > 0) {
            throw new Error(`${className} missing methods: ${missing.join(', ')}`);
        }
    }

    _testInstantiation(ClassName, args = []) {
        const cls = window[ClassName];
        if (!cls) throw new Error(`Class "${ClassName}" not found`);
        const instance = new cls(...args);
        if (!instance) throw new Error(`Failed to instantiate ${ClassName}`);
        return instance;
    }

    _renderSummary(el) {
        const classes = [
            'BaseSelector', 'StudentSelector', 'CourseSelector', 'FacultySelector',
            'DepartmentSelector', 'ProgrammeSelector', 'CohortSelector',
            'DataAdapter', 'SampleDataAdapter', 'ApiDataAdapter', 'ServiceBackend',
            'ServiceCallManager', 'ServiceLoader',
            'AutoScholarHub', 'AutoScholarStudent', 'ClassViewConnect',
            'AutoScholarExecutive', 'AutoScholarAnalyst', 'AutoScholarCounsellor',
            'AutoScholarAdmin', 'AutoScholarAbout',
            'AutoScholarUtils', 'AutoScholarErrors', 'SecurityUtils',
            'LoadingStateManager', 'AdapterUtils'
        ];

        const found = classes.filter(c => typeof window[c] === 'function');
        const missing = classes.filter(c => typeof window[c] !== 'function');

        el.innerHTML = `
            <div style="font-size:0.8rem">
                <strong>${found.length}</strong> / ${classes.length} classes loaded
                ${missing.length > 0 ? `<div style="color:#b91c1c; margin-top:0.25rem">Missing: ${missing.join(', ')}</div>` : ''}
            </div>
        `;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ComponentTestSuite = ComponentTestSuite;
}
