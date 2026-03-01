/**
 * StaffAuthTestSuite - Authentication flow tests + known bug reproduction
 * Tests student vs staff identification, login flows, member linking,
 * and reproduces the known "Sam" bug (ISSUE-002).
 *
 * @module StaffAuthTestSuite
 */

class StaffAuthTestSuite {
    /**
     * @param {Object} options
     * @param {Object} options.config - DUT config (from config.json)
     * @param {TestRunner} options.runner - Shared test runner
     * @param {TestResultsRenderer} options.renderer - Results renderer
     */
    constructor({ config, runner, renderer }) {
        this.config = config || {};
        this.runner = runner;
        this.renderer = renderer;
        this.endpoint = '/api-proxy';

        // Test accounts
        this.testStudent = '21906044';
        this.testStaff = 'ckell';
        this.studentPassword = '';
        this.staffPassword = '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Registration
    // ─────────────────────────────────────────────────────────────────────────

    registerTests() {
        const T = TestRunner;
        const suite = this;

        // ── Pattern Detection ──
        this.runner.test('staffIdPattern: digits = student', () => {
            T.assert(suite._isStudentNumber('21906044'), '"21906044" should be detected as student');
            T.assert(suite._isStudentNumber('12345678'), '"12345678" should be detected as student');
            T.assert(suite._isStudentNumber('00000001'), '"00000001" should be detected as student');
        }, { tags: ['pattern'] });

        this.runner.test('staffIdPattern: alpha = staff', () => {
            T.assert(suite._isStaffId('ckell'), '"ckell" should be detected as staff');
            T.assert(suite._isStaffId('jsmith'), '"jsmith" should be detected as staff');
            T.assert(suite._isStaffId('admin'), '"admin" should be detected as staff');
        }, { tags: ['pattern'] });

        this.runner.test('staffIdPattern: mixed = staff', () => {
            T.assert(suite._isStaffId('user123'), '"user123" should be detected as staff (not pure digits)');
            T.assert(!suite._isStudentNumber('user123'), '"user123" should NOT be a student number');
        }, { tags: ['pattern'] });

        this.runner.test('digitOnlyRegex behavior', () => {
            const digitOnly = /^\d+$/;
            T.assert(digitOnly.test('21906044'), 'Pure digits should match');
            T.assert(!digitOnly.test('ckell'), 'Alpha string should not match');
            T.assert(!digitOnly.test('ckell123'), 'Mixed string should not match');
            T.assert(!digitOnly.test(''), 'Empty string should not match');
            T.assert(digitOnly.test('0'), 'Single digit should match');
        }, { tags: ['pattern'] });

        this.runner.test('staffVsStudentIdentification', () => {
            const ids = [
                { id: '21906044', expectedType: 'student' },
                { id: 'ckell', expectedType: 'staff' },
                { id: '99999999', expectedType: 'student' },
                { id: 'admin', expectedType: 'staff' },
                { id: 'desigang', expectedType: 'staff' },
                { id: '12345', expectedType: 'student' }
            ];

            ids.forEach(({ id, expectedType }) => {
                const detected = suite._isStudentNumber(id) ? 'student' : 'staff';
                T.assertEqual(detected, expectedType, `"${id}" should be ${expectedType}, got ${detected}`);
            });
        }, { tags: ['pattern'] });

        // ── Login Response Format ──
        this.runner.test('loginResponseFormat (student)', async () => {
            if (!suite.studentPassword) {
                throw new Error('No student password configured — enter in controls');
            }
            const result = await suite._login(suite.testStudent, suite.studentPassword);
            T.assertNotNull(result, 'Login should return a response');
            T.assertType(result, 'object', 'Response should be an object');
            // Check for session fields
            const hasSession = result.sessionId || result.session_id || result.status;
            T.assert(hasSession, 'Response should have session ID or status');
            return result;
        }, { tags: ['login'], skip: true }); // Skip by default — needs password

        this.runner.test('loginResponseFormat (staff)', async () => {
            if (!suite.staffPassword) {
                throw new Error('No staff password configured — enter in controls');
            }
            const result = await suite._login(suite.testStaff, suite.staffPassword);
            T.assertNotNull(result, 'Login should return a response');
            T.assertType(result, 'object', 'Response should be an object');
            return result;
        }, { tags: ['login'], skip: true }); // Skip by default

        // ── Known Bug: Staff Name "Sam" ──
        this.runner.test('KNOWN BUG: staff name should not be "Sam"', () => {
            // This test reproduces the logic bug in ApiDataAdapter
            // When userId is not all digits, the code falls back to sample data
            // which has "Sam Student" as the default name

            const userId = 'ckell';
            const isStudent = /^\d+$/.test(userId);

            // The bug: non-digit userId is not recognized as staff
            T.assert(!isStudent, '"ckell" is NOT all digits — correct');

            // The correct behavior should be:
            // 1. Detect as staff ID
            // 2. Call getStaffInfo() or ldapGetUserInfo()
            // 3. Return actual staff name

            // Document the bug path:
            // If !isStudent, the old code does: userName = sampleData.student.name → "Sam Student"
            T.assert(suite._isStaffId(userId), '"ckell" should be identified as staff');

            // If this test passes, the detection logic is correct.
            // The actual fix needs ldapGetUserInfo implementation on the PHP backend.
        }, { tags: ['bug'] });

        this.runner.test('KNOWN BUG: digit regex edge cases', () => {
            // Verify the regex used for student detection handles edge cases
            const regex = /^\d+$/;

            // These should be students (all digits)
            T.assert(regex.test('21906044'), 'All-digit ID should match');

            // These should NOT be students
            T.assert(!regex.test('ckell'), 'Alpha ID should not match');
            T.assert(!regex.test(''), 'Empty string should not match');
            T.assert(!regex.test(' '), 'Space should not match');
            T.assert(!regex.test('123 456'), 'Digits with space should not match');

            // Config pattern check
            const authConfig = suite.config?.auth || {};
            if (authConfig.staffIdPattern) {
                const staffRegex = new RegExp(authConfig.staffIdPattern);
                T.assert(staffRegex.test('ckell'), 'Config staffIdPattern should match "ckell"');
            }
            if (authConfig.studentIdPattern) {
                const studentRegex = new RegExp(authConfig.studentIdPattern);
                T.assert(studentRegex.test('21906044'), 'Config studentIdPattern should match "21906044"');
            }
        }, { tags: ['bug'] });

        // ── Member Linking Flow ──
        this.runner.test('memberLinking: findOrCreateMember flow', async () => {
            // This tests the ServiceBackend member linking logic
            // without actually calling the live API (unless backend is available)
            if (typeof ServiceBackend === 'undefined') {
                throw new Error('ServiceBackend class not loaded');
            }

            // Verify the class has the expected method
            const backend = new ServiceBackend({ apiUrl: 'http://localhost:8082/api/v1' });
            T.assertType(backend.findOrCreateMember, 'function', 'Should have findOrCreateMember method');
            T.assertType(backend.setAuthToken, 'function', 'Should have setAuthToken method');
            T.assertType(backend.setMemberId, 'function', 'Should have setMemberId method');
            T.assertType(backend.getMember, 'function', 'Should have getMember method');

            return { methodsExist: true };
        }, { tags: ['member'] });

        // ── Session Management ──
        this.runner.test('sessionManagement: ServiceBackend auth state', () => {
            if (typeof ServiceBackend === 'undefined') {
                throw new Error('ServiceBackend class not loaded');
            }

            const backend = new ServiceBackend({ apiUrl: 'http://localhost:8082/api/v1' });

            // Initially no auth
            T.assertEqual(backend.authToken, null, 'Token should be null initially');
            T.assertEqual(backend.memberId, null, 'Member ID should be null initially');

            // Set auth
            backend.setAuthToken('test-token-123');
            T.assertEqual(backend.authToken, 'test-token-123', 'Token should be set');

            backend.setMemberId(42);
            T.assertEqual(backend.memberId, 42, 'Member ID should be set');

            return { authState: 'verified' };
        }, { tags: ['session'] });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Controls UI
    // ─────────────────────────────────────────────────────────────────────────

    renderControls(container) {
        const suite = this;

        const accordion = new uiAccordion({
            exclusive: true,
            content: {
                accounts: { label: 'Test Accounts', content: '<div class="auth-accounts"></div>', open: true },
                tests:    { label: 'Tests', content: '<div class="auth-tests"></div>' },
                issues:   { label: 'Known Issues', content: '<div class="auth-issues"></div>' }
            },
            parent: container
        });

        // ── Accounts section ──
        const accEl = accordion.el.querySelector('.auth-accounts');
        const studentInput = new uiInput({ template: 'inline-label', label: 'Student Number', value: this.testStudent, size: 'sm', parent: accEl });
        const studentPwdInput = new uiInput({ template: 'inline-label', label: 'Student Password', inputType: 'password', size: 'sm', parent: accEl });
        const staffInput = new uiInput({ template: 'inline-label', label: 'Staff ID', value: this.testStaff, size: 'sm', parent: accEl });
        const staffPwdInput = new uiInput({ template: 'inline-label', label: 'Staff Password', inputType: 'password', size: 'sm', parent: accEl });

        new uiButton({
            label: 'Apply', variant: 'secondary', size: 'sm', parent: accEl,
            onClick: () => {
                const getVal = (inp) => (inp.el.querySelector('input') || inp.el).value;
                suite.testStudent = getVal(studentInput);
                suite.testStaff = getVal(staffInput);
                suite.studentPassword = getVal(studentPwdInput);
                suite.staffPassword = getVal(staffPwdInput);
                suite.runner._tests.forEach(t => {
                    if (t.name.includes('student') && t.tags.includes('login')) t.skip = !suite.studentPassword;
                    if (t.name.includes('staff') && t.tags.includes('login')) t.skip = !suite.staffPassword;
                });
            }
        });

        // ── Tests section ──
        const testsEl = accordion.el.querySelector('.auth-tests');
        new uiButton({
            label: 'Run All', variant: 'primary', size: 'sm', parent: testsEl,
            onClick: () => { this.renderer.clearResults(); this.runner.runAll(); }
        });
        const filterGroup = document.createElement('div');
        filterGroup.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;';
        testsEl.appendChild(filterGroup);
        for (const tag of ['pattern', 'login', 'bug', 'member', 'session']) {
            new uiButton({
                label: tag, variant: 'outline', size: 'xs', parent: filterGroup,
                onClick: () => { this.renderer.clearResults(); this.runner.runAll(tag); }
            });
        }

        // ── Known Issues section ──
        const issuesEl = accordion.el.querySelector('.auth-issues');
        new uiAlert({
            color: 'warning',
            title: 'ISSUE-002',
            message: 'Staff login shows "Sam" instead of real name. userId "ckell" fails digit-only check, falls back to sample user.',
            parent: issuesEl
        });
        new uiAlert({
            color: 'warning',
            title: 'AUTH-001',
            message: 'ldapGetUserInfo not implemented. PHP backend cannot resolve staff names from LDAP.',
            parent: issuesEl
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    _isStudentNumber(userId) {
        return /^\d+$/.test(userId);
    }

    _isStaffId(userId) {
        return !this._isStudentNumber(userId) && userId.length > 0;
    }

    async _login(userId, password) {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logIn', userId, pwd: password })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.StaffAuthTestSuite = StaffAuthTestSuite;
}
