/**
 * DbApiTestSuite - CRUD cycle tests against Publon.Press ServiceBackend
 * Tests create -> read -> update -> read -> delete -> read cycle per table.
 * All test records use '_testRig_' prefix for identification and cleanup.
 *
 * @module DbApiTestSuite
 */

class DbApiTestSuite {
    /**
     * @param {Object} options
     * @param {string} options.apiUrl - Publon.Press API base URL
     * @param {TestRunner} options.runner - Shared test runner
     * @param {TestResultsRenderer} options.renderer - Results renderer
     */
    constructor({ apiUrl, runner, renderer }) {
        this.apiUrl = apiUrl || 'http://localhost:8082/api/v1';
        this.runner = runner;
        this.renderer = renderer;
        this.backend = null;
        this._createdIds = {}; // table -> [idx] for cleanup
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Registration
    // ─────────────────────────────────────────────────────────────────────────

    registerTests() {
        const T = TestRunner;
        const suite = this;

        // ── Health ──
        this.runner.test('healthCheck', async () => {
            suite._initBackend();
            const health = await suite.backend.healthCheck();
            T.assertNotNull(health, 'Health check should return a result');
            T.assertEqual(health.status, 'healthy', `API should be healthy, got: ${health.error || health.status}`);
            T.assertType(health.latency, 'number', 'Latency should be a number');
            return health;
        }, { tags: ['health'] });

        // ── CRUD cycles ──
        const tables = [
            {
                name: 'diaryentry', label: 'Diary Entry',
                create: { title: '_testRig_entry', content: 'Test content', mood: 'neutral', entryDate: new Date().toISOString() },
                update: { title: '_testRig_entry_updated' },
                check: (r) => T.assertEqual(r.title, '_testRig_entry_updated', 'Title should be updated')
            },
            {
                name: 'diarygoal', label: 'Diary Goal',
                create: { title: '_testRig_goal', goalType: 'academic', status: 'active', targetValue: 100, currentValue: 0 },
                update: { currentValue: 50 },
                check: (r) => T.assertEqual(r.currentvalue || r.currentValue, 50, 'Current value should be 50')
            },
            {
                name: 'careerprofile', label: 'Career Profile',
                create: { headline: '_testRig_profile', summary: 'Test bio' },
                update: { headline: '_testRig_profile_updated' },
                check: (r) => T.assertEqual(r.headline, '_testRig_profile_updated', 'Headline should be updated')
            },
            {
                name: 'careerskill', label: 'Career Skill',
                create: { skillName: '_testRig_skill', proficiency: 'intermediate', category: 'technical' },
                update: { proficiency: 'advanced' },
                check: (r) => T.assertEqual(r.proficiency, 'advanced', 'Proficiency should be advanced')
            },
            {
                name: 'concession', label: 'Concession',
                create: { courseCode: '_testRig_CONC', reason: 'Test concession', status: 'pending', submittedAt: new Date().toISOString() },
                update: { status: 'approved' },
                check: (r) => T.assertEqual(r.status, 'approved', 'Status should be approved')
            },
            {
                name: 'riskflag', label: 'Risk Flag',
                create: { riskType: '_testRig_risk', severity: 'medium', isActive: true, flaggedAt: new Date().toISOString() },
                update: { severity: 'low' },
                check: (r) => T.assertEqual(r.severity, 'low', 'Severity should be low')
            },
            {
                name: 'intervention', label: 'Intervention',
                create: { interventionType: '_testRig_interv', notes: 'Test intervention', performedAt: new Date().toISOString() },
                update: { notes: 'Updated notes' },
                check: (r) => T.assertEqual(r.notes, 'Updated notes', 'Notes should be updated')
            },
            {
                name: 'attendance', label: 'Attendance',
                create: { courseCode: '_testRig_ATT', eventDate: new Date().toISOString(), status: 'present' },
                update: { status: 'absent' },
                check: (r) => T.assertEqual(r.status, 'absent', 'Status should be absent')
            },
            {
                name: 'gamification', label: 'Gamification',
                create: { totalPoints: 0, level: 1, streak: 0 },
                update: { totalPoints: 100 },
                check: (r) => T.assertEqual(Number(r.totalpoints || r.totalPoints), 100, 'Points should be 100')
            },
            {
                name: 'badge', label: 'Badge',
                create: { badgeCode: '_testRig_badge', badgeName: 'Test Badge', badgeDescription: 'A test badge', awardedAt: new Date().toISOString() },
                update: { badgeName: 'Updated Badge' },
                check: (r) => T.assertEqual(r.badgename || r.badgeName, 'Updated Badge', 'Badge name should be updated')
            }
        ];

        for (const table of tables) {
            this.runner.test(`CRUD: ${table.label}`, async () => {
                return suite._runCrudCycle(table.name, table.create, table.update, table.check);
            }, { tags: ['crud', table.name], timeout: 20000 });
        }

        // ── Batch operations ──
        this.runner.test('batchCreate', async () => {
            suite._initBackend();
            const records = [
                { title: '_testRig_batch_1', content: 'Batch 1', mood: 'happy', entryDate: new Date().toISOString() },
                { title: '_testRig_batch_2', content: 'Batch 2', mood: 'neutral', entryDate: new Date().toISOString() },
                { title: '_testRig_batch_3', content: 'Batch 3', mood: 'sad', entryDate: new Date().toISOString() }
            ];
            const result = await suite.backend.batchCreate('diaryentry', records);
            T.assertNotNull(result, 'Batch result should not be null');
            T.assertEqual(result.success, 3, 'All 3 should succeed');
            T.assertEqual(result.failed, 0, 'None should fail');

            // Cleanup
            await suite._cleanupTable('diaryentry');
            return result;
        }, { tags: ['batch'], timeout: 30000 });

        // ── Edge cases ──
        this.runner.test('readNonExistent', async () => {
            suite._initBackend();
            const records = await suite.backend.read('diaryentry', { idx: -99999 }, { skipMemberFilter: true });
            T.assert(Array.isArray(records), 'Should return array');
            T.assertEqual(records.length, 0, 'Should return empty array for non-existent');
            return records;
        }, { tags: ['edge'] });

        this.runner.test('createMissingFields', async () => {
            suite._initBackend();
            // Create with minimal data — should still succeed (server fills defaults)
            try {
                await suite.backend.create('diaryentry', { title: '_testRig_minimal' });
                await suite._cleanupTable('diaryentry');
                return { success: true };
            } catch (e) {
                // Expected to fail if required fields are missing — that's also valid
                return { success: false, error: e.message };
            }
        }, { tags: ['edge'] });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Controls UI
    // ─────────────────────────────────────────────────────────────────────────

    renderControls(container) {
        const suite = this;

        const accordion = new uiAccordion({
            exclusive: true,
            content: {
                config:  { label: 'Configuration', content: '<div class="db-config"></div>', open: true },
                tests:   { label: 'Tests', content: '<div class="db-tests"></div>' },
                cleanup: { label: 'Cleanup', content: '<div class="db-cleanup"></div>' }
            },
            parent: container
        });

        // ── Config section ──
        const configEl = accordion.el.querySelector('.db-config');
        const urlInput = new uiInput({ template: 'inline-label', label: 'API URL', value: this.apiUrl, size: 'sm', parent: configEl });

        const configBtns = document.createElement('div');
        configBtns.style.cssText = 'display:flex; gap:6px; margin-top:6px;';
        configEl.appendChild(configBtns);

        new uiButton({
            label: 'Apply', variant: 'secondary', size: 'sm', parent: configBtns,
            onClick: () => {
                suite.apiUrl = (urlInput.el.querySelector('input') || urlInput.el).value;
                suite.backend = null;
            }
        });
        new uiButton({
            label: 'Health Check', variant: 'primary', size: 'sm', parent: configBtns,
            onClick: async () => {
                healthBadge.update({ label: 'Checking\u2026', color: 'warning' });
                suite._initBackend();
                const health = await suite.backend.healthCheck();
                if (health.status === 'healthy') {
                    healthBadge.update({ label: `Healthy (${health.latency}ms)`, color: 'success' });
                } else {
                    healthBadge.update({ label: `Unhealthy: ${health.error}`, color: 'danger' });
                }
            }
        });

        const healthStatus = document.createElement('div');
        healthStatus.style.marginTop = '6px';
        configEl.appendChild(healthStatus);
        const healthBadge = new uiBadge({ label: 'Not checked', color: 'gray', size: 'sm', parent: healthStatus });

        // ── Tests section ──
        const testsEl = accordion.el.querySelector('.db-tests');
        new uiButton({
            label: 'Run All', variant: 'primary', size: 'sm', parent: testsEl,
            onClick: () => { this.renderer.clearResults(); this.runner.runAll(); }
        });
        const filterGroup = document.createElement('div');
        filterGroup.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;';
        testsEl.appendChild(filterGroup);
        for (const tag of ['health', 'crud', 'batch', 'edge']) {
            new uiButton({
                label: tag, variant: 'outline', size: 'xs', parent: filterGroup,
                onClick: () => { this.renderer.clearResults(); this.runner.runAll(tag); }
            });
        }

        // ── Cleanup section ──
        const cleanupEl = accordion.el.querySelector('.db-cleanup');
        const cleanupBadge = new uiBadge({ label: '', color: 'gray', size: 'sm' });
        new uiButton({
            label: 'Cleanup All Test Data', variant: 'danger', size: 'sm', parent: cleanupEl,
            onClick: async () => {
                cleanupBadge.update({ label: 'Cleaning up...', color: 'warning' });
                cleanupEl.appendChild(cleanupBadge.el);
                await suite._cleanupAllTables();
                cleanupBadge.update({ label: 'Cleanup complete', color: 'success' });
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal: CRUD Cycle
    // ─────────────────────────────────────────────────────────────────────────

    async _runCrudCycle(table, createData, updateData, checkFn) {
        const T = TestRunner;
        this._initBackend();

        // 1. Create
        await this.backend.create(table, { ...createData });

        // 2. Read back — find the test record
        const afterCreate = await this.backend.read(table, {}, { skipMemberFilter: true });
        const created = afterCreate.find(r =>
            this._isTestRecord(r, createData)
        );
        T.assertNotNull(created, `Should find created ${table} record`);
        const idx = created.idx;

        // 3. Update
        await this.backend.update(table, { idx }, updateData);

        // 4. Read after update
        const afterUpdate = await this.backend.read(table, { idx }, { skipMemberFilter: true });
        T.assertArrayLength(afterUpdate, 1, `Should find updated ${table} record`);
        if (checkFn) checkFn(afterUpdate[0]);

        // 5. Delete
        await this.backend.delete(table, { idx });

        // 6. Read after delete
        const afterDelete = await this.backend.read(table, { idx }, { skipMemberFilter: true });
        T.assertEqual(afterDelete.length, 0, `${table} record should be deleted`);

        return { table, idx, status: 'complete' };
    }

    _isTestRecord(record, createData) {
        // Match on the first string field that starts with _testRig_
        for (const [key, val] of Object.entries(createData)) {
            if (typeof val === 'string' && val.startsWith('_testRig_')) {
                const recordVal = record[key] || record[key.toLowerCase()];
                if (recordVal === val) return true;
            }
        }
        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal: Init & Cleanup
    // ─────────────────────────────────────────────────────────────────────────

    _initBackend() {
        if (!this.backend) {
            this.backend = new ServiceBackend({ apiUrl: this.apiUrl });
        }
    }

    async _cleanupTable(table) {
        this._initBackend();
        try {
            const records = await this.backend.read(table, {}, { skipMemberFilter: true });
            for (const r of records) {
                // Delete any record with _testRig_ in string fields
                const vals = Object.values(r);
                const isTest = vals.some(v => typeof v === 'string' && v.includes('_testRig_'));
                if (isTest) {
                    await this.backend.delete(table, { idx: r.idx });
                }
            }
        } catch (e) {
            console.warn(`[DbApiTestSuite] Cleanup failed for ${table}:`, e.message);
        }
    }

    async _cleanupAllTables() {
        const tables = ['diaryentry', 'diarygoal', 'careerprofile', 'careerskill',
            'concession', 'riskflag', 'intervention', 'attendance',
            'gamification', 'badge'];
        for (const table of tables) {
            await this._cleanupTable(table);
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.DbApiTestSuite = DbApiTestSuite;
}
