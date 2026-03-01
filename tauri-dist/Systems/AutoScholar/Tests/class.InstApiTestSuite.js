/**
 * InstApiTestSuite - Interactive API Explorer + Tests for DUT Oracle API
 *
 * Controls panel: Auth → Query (action selector + dynamic params) → Tests
 * Stage area: uiTable with dynamic columns from query results
 *
 * @module InstApiTestSuite
 */

class InstApiTestSuite {

    // ─────────────────────────────────────────────────────────────────────────
    // Action Registry — maps API actions to their parameters and categories
    // ─────────────────────────────────────────────────────────────────────────

    static ACTION_REGISTRY = [
        { action: 'getInstitutionId',          label: 'Get Institution',          category: 'Core',      params: [] },
        { action: 'getSampleValues',           label: 'Get Sample Values',        category: 'Core',      params: [] },
        { action: 'getCollegeFaculties',       label: 'Get College Faculties',    category: 'Structure', params: [] },
        { action: 'getDisciplineId',           label: 'Get Faculty Disciplines',  category: 'Structure', params: [] },
        { action: 'getCourseMeta',             label: 'Get Course Metadata',      category: 'Academic',  params: ['courseCode'] },
        { action: 'getCourseResults',          label: 'Get Course Results',       category: 'Academic',  params: ['courseCode', 'year'] },
        { action: 'getAssessmentResults',      label: 'Get Assessment Results',   category: 'Academic',  params: ['courseCode', 'year'] },
        { action: 'getCourseCounts',           label: 'Get Course Counts',        category: 'Academic',  params: ['courseCode', 'year'] },
        { action: 'getStudentBioData',         label: 'Get Student Bio',          category: 'Student',   params: ['studentNumber'] },
        { action: 'searchStudents',            label: 'Search Students',          category: 'Student',   params: ['lastName'] },
        { action: 'getStudentBlocks',          label: 'Get Student Blocks',       category: 'Student',   params: ['studentNumber'] },
        { action: 'getStudentMatric',          label: 'Get Student Matric',       category: 'Student',   params: ['studentNumber'] },
        { action: 'query',                      label: 'Direct Query (SQL)',       category: 'Core',      params: ['sql'] },
        { action: 'getProgrammeRegistrations', label: 'Get Registrations',        category: 'Programme', params: ['studentNumber'] },
        { action: 'getProgrammeId',            label: 'Get Programme Meta',       category: 'Programme', params: ['programmeCode'] },
        { action: 'getProgrammeStructure',     label: 'Get Programme Courses',    category: 'Programme', params: ['programmeCode', 'year'] },
        { action: 'getProgrammeStudents',      label: 'Get Programme Students',   category: 'Programme', params: ['programmeCode', 'year'] },
        { action: 'getProgrammeCounts',        label: 'Get Programme Counts',     category: 'Programme', params: ['programmeCode', 'year'] },
        { action: 'getProgrammeGrads',         label: 'Get Programme Grads',      category: 'Programme', params: ['programmeCode'] },
        { action: 'getGradCounts',             label: 'Get Grad Counts',          category: 'Programme', params: ['programmeCode'] },
        { action: 'getStaffCourses',           label: 'Get Staff Courses',        category: 'Staff',     params: ['staffNumber', 'year'] },
        { action: 'getStaffBio',               label: 'Get Staff Bio',            category: 'Staff',     params: ['staffNumber'] }
    ];

    static PARAM_DEFAULTS = {
        year:            { label: 'Year',            type: 'number', default: '2019' },
        courseCode:      { label: 'Course Code',     type: 'text',   default: 'CEDA201' },
        studentNumber:   { label: 'Student Number',  type: 'text',   default: '21906044' },
        programmeCode:   { label: 'Programme Code',  type: 'text',   default: 'BNCME1' },
        staffNumber:     { label: 'Staff Number',    type: 'text',   default: '40010681' },
        lastName:        { label: 'Last Name',       type: 'text',   default: 'smith' },
        sql:             { label: 'SQL',             type: 'text',   default: 'SELECT SYSDATE as "now" FROM DUAL' }
    };

    /**
     * @param {Object} options
     * @param {string} options.endpoint - DUT API endpoint URL
     * @param {TestRunner} options.runner - Shared test runner
     * @param {TestResultsRenderer} options.renderer - Results renderer
     */
    constructor({ endpoint, runner, renderer }) {
        this.endpoint = endpoint || '/api-proxy';
        this.runner = runner;
        this.renderer = renderer;

        this.sessionId = null;
        this.logToken = null;
        this.userId = null;
        this.connected = false;

        this.params = {
            year: 2019,
            courseCode: 'CEDA201',
            studentNumber: '21906044',
            programmeCode: 'BNCME1',
            staffNumber: '40010681',
            lastName: 'smith'
        };

        this.mappings = null;
        this.stageEl = null;
        this._currentTable = null;
        this._paramInputs = {};
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────────────────────────────────

    async authenticate(userId, password) {
        const data = await this._apiCall('logIn', { userId, pwd: password });

        if (data && data.status !== false) {
            this.sessionId = data.sessionId || data.session_id;
            this.logToken = data.logToken || data.log_token;
            this.userId = userId;
            this.connected = true;
            return { success: true, data };
        }

        return { success: false, error: data?.error || 'Authentication failed' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Registration (data-driven from mappings)
    // ─────────────────────────────────────────────────────────────────────────

    async registerTests() {
        try {
            const resp = await fetch('../Implementations-DUT/api-mappings.json');
            this.mappings = await resp.json();
        } catch (e) {
            this.mappings = { mappings: {} };
            console.warn('[InstApiTestSuite] Could not load api-mappings.json, using built-in list');
        }

        const T = TestRunner;

        // ── Core ──
        this.runner.test('getInstitutionId', async () => {
            const data = await this._apiCall('getInstitutionId');
            T.assertNotNull(data, 'Response should not be null');
            return data;
        }, { tags: ['core'] });

        this.runner.test('getSampleValues', async () => {
            const data = await this._apiCall('getSampleValues');
            T.assertNotNull(data, 'Response should not be null');
            const sample = data?.sample || data;
            if (sample.studentNumber) this.params.studentNumber = sample.studentNumber;
            if (sample.courseCode) this.params.courseCode = sample.courseCode;
            if (sample.programmeCode) this.params.programmeCode = sample.programmeCode;
            if (sample.year) this.params.year = sample.year;
            if (sample.staffNumber) this.params.staffNumber = sample.staffNumber;
            return data;
        }, { tags: ['core'] });

        this.runner.test('query (direct SQL)', async () => {
            const data = await this._apiCall('query', { sql: 'SELECT SYSDATE as "now" FROM DUAL' });
            T.assertNotNull(data, 'Response should not be null');
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have 1 row');
            return records;
        }, { tags: ['core'] });

        // ── Structure ──
        this.runner.test('getCollegeFaculties', async () => {
            const data = await this._apiCall('getCollegeFaculties');
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 faculty');
            T.assertHasFields(records[0], ['facultyCode', 'facultyLabel'], 'Faculty should have code and label');
            return records;
        }, { tags: ['structure'] });

        this.runner.test('getDisciplineId', async () => {
            const data = await this._apiCall('getDisciplineId');
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 discipline');
            T.assertHasFields(records[0], ['disciplineCode', 'disciplineLabel'], 'Discipline should have code and label');
            return records;
        }, { tags: ['structure'] });

        // ── Academic ──
        this.runner.test('getCourseMeta', async () => {
            const data = await this._apiCall('getCourseMeta', { courseCode: this.params.courseCode });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 course');
            T.assertHasFields(records[0], ['courseCode'], 'Course should have courseCode');
            return records;
        }, { tags: ['academic'] });

        this.runner.test('getCourseResults', async () => {
            const data = await this._apiCall('getCourseResults', {
                courseCode: this.params.courseCode, year: this.params.year
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 result');
            T.assertHasFields(records[0], ['studentNumber', 'courseCode', 'result'], 'Result should have key fields');
            return records;
        }, { tags: ['academic'], timeout: 30000 });

        this.runner.test('getAssessmentResults', async () => {
            const data = await this._apiCall('getAssessmentResults', {
                courseCode: this.params.courseCode, year: this.params.year
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 assessment');
            T.assertHasFields(records[0], ['studentNumber', 'courseCode'], 'Assessment should have studentNumber and courseCode');
            return records;
        }, { tags: ['academic'], timeout: 30000 });

        this.runner.test('getCourseCounts', async () => {
            const data = await this._apiCall('getCourseCounts', {
                courseCode: this.params.courseCode, year: this.params.year
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 count row');
            return records;
        }, { tags: ['academic'] });

        // ── Student ──
        this.runner.test('getStudentBioData', async () => {
            const data = await this._apiCall('getStudentBioData', { studentNumber: this.params.studentNumber });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should find the student');
            T.assertHasFields(records[0], ['studentNumber', 'lastName'], 'Student should have number and name');
            return records;
        }, { tags: ['student'] });

        this.runner.test('searchStudents', async () => {
            const data = await this._apiCall('searchStudents', { lastName: this.params.lastName });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should find at least 1 student');
            return records;
        }, { tags: ['student'] });

        this.runner.test('getStudentBlocks', async () => {
            const data = await this._apiCall('getStudentBlocks', { studentNumber: this.params.studentNumber });
            T.assertNotNull(data, 'Should return response');
            return data;
        }, { tags: ['student'] });

        this.runner.test('getStudentMatric', async () => {
            const data = await this._apiCall('getStudentMatric', { studentNumber: this.params.studentNumber });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 matric subject');
            T.assertHasFields(records[0], ['studentNumber', 'subjectCode'], 'Matric record should have studentNumber and subjectCode');
            return records;
        }, { tags: ['student'] });

        // ── Programme ──
        this.runner.test('getProgrammeRegistrations', async () => {
            const data = await this._apiCall('getProgrammeRegistrations', { studentNumber: this.params.studentNumber });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 registration');
            T.assertHasFields(records[0], ['studentNumber', 'programmeCode'], 'Registration should have studentNumber and programmeCode');
            return records;
        }, { tags: ['programme'] });

        this.runner.test('getProgrammeId', async () => {
            const data = await this._apiCall('getProgrammeId', { programmeCode: this.params.programmeCode });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should find the programme');
            T.assertHasFields(records[0], ['programmeCode', 'programmeLabel'], 'Programme should have code and label');
            return records;
        }, { tags: ['programme'] });

        this.runner.test('getProgrammeStructure', async () => {
            const data = await this._apiCall('getProgrammeStructure', {
                programmeCode: this.params.programmeCode, year: this.params.year
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 course in programme');
            return records;
        }, { tags: ['programme'] });

        this.runner.test('getProgrammeStudents', async () => {
            const data = await this._apiCall('getProgrammeStudents', {
                programmeCode: this.params.programmeCode, year: this.params.year
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 student');
            return records;
        }, { tags: ['programme'], timeout: 30000 });

        this.runner.test('getProgrammeCounts', async () => {
            const data = await this._apiCall('getProgrammeCounts', {
                programmeCode: this.params.programmeCode, year: this.params.year
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            return records;
        }, { tags: ['programme'] });

        this.runner.test('getProgrammeGrads', async () => {
            const data = await this._apiCall('getProgrammeGrads', { programmeCode: this.params.programmeCode });
            T.assertNotNull(data, 'Should return response');
            return data;
        }, { tags: ['programme'] });

        this.runner.test('getGradCounts', async () => {
            const data = await this._apiCall('getGradCounts', { programmeCode: this.params.programmeCode });
            T.assertNotNull(data, 'Should return response');
            return data;
        }, { tags: ['programme'] });

        // ── Staff ──
        this.runner.test('getStaffCourses', async () => {
            if (!this.params.staffNumber) {
                throw new Error('No staff number configured — set params.staffNumber');
            }
            const data = await this._apiCall('getStaffCourses', {
                staffNumber: this.params.staffNumber, year: this.params.year
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 course');
            T.assertHasFields(records[0], ['staffNumber', 'courseCode'], 'Staff course should have staffNumber and courseCode');
            return records;
        }, { tags: ['staff'], skip: !this.params.staffNumber });

        this.runner.test('getStaffBio', async () => {
            if (!this.params.staffNumber) {
                throw new Error('No staff number configured — set params.staffNumber');
            }
            const data = await this._apiCall('getStaffBio', {
                staffNumber: this.params.staffNumber
            });
            const records = this._parseResponse(data);
            T.assertNotNull(records, 'Should return records');
            T.assertArrayLength(records, 1, 'Should have at least 1 record');
            T.assertHasFields(records[0], ['staffNumber', 'userId'], 'Staff bio should have staffNumber and userId');
            return records;
        }, { tags: ['staff'], skip: !this.params.staffNumber });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Controls UI — Auth + Query + Tests accordion
    // ─────────────────────────────────────────────────────────────────────────

    renderControls(container) {
        const suite = this;

        const accordion = new uiAccordion({
            exclusive: true,
            content: {
                auth:  { label: 'Auth',  content: '<div class="inst-auth"></div>' },
                query: { label: 'Query', content: '<div class="inst-query"></div>', open: true },
                tests: { label: 'Tests', content: '<div class="inst-tests"></div>' }
            },
            parent: container
        });

        this._renderAuthSection(accordion.el.querySelector('.inst-auth'));
        this._renderQuerySection(accordion.el.querySelector('.inst-query'));
        this._renderTestsSection(accordion.el.querySelector('.inst-tests'));
    }

    _renderAuthSection(authEl) {
        const suite = this;

        const defaultCreds = window.AS_CREDENTIALS?.api?.sessionBypass || {};
        const userIdInput = new uiInput({ template: 'inline-label', label: 'User ID', value: defaultCreds.userId || '', size: 'sm', parent: authEl });
        const pwdInput = new uiInput({ template: 'inline-label', label: 'Password', inputType: 'password', value: defaultCreds.password || '', size: 'sm', parent: authEl });

        new uiButton({
            label: 'Login', variant: 'primary', size: 'sm', parent: authEl,
            onClick: async () => {
                const uid = (userIdInput.el.querySelector('input') || userIdInput.el).value;
                const pwd = (pwdInput.el.querySelector('input') || pwdInput.el).value;
                statusBadge.update({ label: 'Connecting...', color: 'warning' });
                const result = await suite.authenticate(uid, pwd);
                if (result.success) {
                    statusBadge.update({ label: `Connected: ${uid}`, color: 'success' });
                } else {
                    statusBadge.update({ label: `Failed: ${result.error}`, color: 'danger' });
                }
            }
        });

        const authStatus = document.createElement('div');
        authStatus.style.marginTop = '6px';
        authEl.appendChild(authStatus);
        const statusBadge = new uiBadge({ label: 'Not connected', color: 'gray', size: 'sm', parent: authStatus });
    }

    _renderQuerySection(queryEl) {
        // Action selector
        this._actionSelect = this._buildActionSelect();
        const selectWrapper = document.createElement('div');
        selectWrapper.className = 'ui-mb-2';
        const selectLabel = document.createElement('label');
        selectLabel.textContent = 'Action';
        selectLabel.className = 'ui-form-label ui-text-xs';
        selectWrapper.appendChild(selectLabel);
        selectWrapper.appendChild(this._actionSelect);
        queryEl.appendChild(selectWrapper);

        // Dynamic parameter inputs container
        this._paramsContainer = document.createElement('div');
        this._paramsContainer.className = 'inst-query-params';
        queryEl.appendChild(this._paramsContainer);

        // Create all param inputs (hidden by default)
        const defaults = InstApiTestSuite.PARAM_DEFAULTS;
        for (const [key, meta] of Object.entries(defaults)) {
            const inp = new uiInput({
                template: 'inline-label',
                label: meta.label,
                inputType: meta.type,
                value: meta.default,
                size: 'sm',
                parent: this._paramsContainer
            });
            inp.el.classList.add('ui-hidden');
            inp.el.setAttribute('data-param', key);
            this._paramInputs[key] = inp;
        }

        // Run Query button
        new uiButton({
            label: 'Run Query', variant: 'primary', size: 'sm', parent: queryEl,
            onClick: () => this._runExplorerQuery()
        });

        // Result status badge (below button)
        const queryStatus = document.createElement('div');
        queryStatus.style.marginTop = '6px';
        queryEl.appendChild(queryStatus);
        this._queryStatusBadge = new uiBadge({ label: 'Ready', color: 'gray', size: 'sm', parent: queryStatus });

        // Trigger initial param visibility
        this._onActionChange(this._actionSelect.value);

        // Listen for action changes
        this._actionSelect.addEventListener('change', () => {
            this._onActionChange(this._actionSelect.value);
        });
    }

    _renderTestsSection(testsEl) {
        new uiButton({
            label: 'Run All', variant: 'primary', size: 'sm', parent: testsEl,
            onClick: () => { this.renderer.clearResults(); this.runner.runAll(); }
        });

        const filterGroup = document.createElement('div');
        filterGroup.className = 'ui-flex ui-flex-wrap ui-gap-1 ui-mt-2';
        testsEl.appendChild(filterGroup);

        for (const tag of ['core', 'structure', 'academic', 'student', 'programme', 'staff']) {
            new uiButton({
                label: tag, variant: 'outline', size: 'xs', parent: filterGroup,
                onClick: () => { this.renderer.clearResults(); this.runner.runAll(tag); }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stage Area — Explorer results
    // ─────────────────────────────────────────────────────────────────────────

    renderExplorer(stageEl) {
        this.stageEl = stageEl;
        // Show initial empty state
        new uiAlert({
            color: 'info',
            message: 'Select an API action and click Run Query to see results.',
            parent: this.stageEl
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Action Select — grouped by category via <optgroup>
    // ─────────────────────────────────────────────────────────────────────────

    _buildActionSelect() {
        const select = document.createElement('select');
        select.className = 'ui-input ui-text-xs';

        // Group actions by category
        const groups = {};
        for (const entry of InstApiTestSuite.ACTION_REGISTRY) {
            if (!groups[entry.category]) groups[entry.category] = [];
            groups[entry.category].push(entry);
        }

        for (const [category, actions] of Object.entries(groups)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            for (const entry of actions) {
                const option = document.createElement('option');
                option.value = entry.action;
                option.textContent = entry.label;
                optgroup.appendChild(option);
            }
            select.appendChild(optgroup);
        }

        return select;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dynamic param visibility based on selected action
    // ─────────────────────────────────────────────────────────────────────────

    _onActionChange(action) {
        const entry = InstApiTestSuite.ACTION_REGISTRY.find(e => e.action === action);
        const requiredParams = entry ? entry.params : [];

        for (const [key, inp] of Object.entries(this._paramInputs)) {
            inp.el.classList.toggle('ui-hidden', !requiredParams.includes(key));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Run Explorer Query
    // ─────────────────────────────────────────────────────────────────────────

    async _runExplorerQuery() {
        const action = this._actionSelect.value;
        const entry = InstApiTestSuite.ACTION_REGISTRY.find(e => e.action === action);
        if (!entry) return;

        // Collect parameter values from visible inputs
        const params = {};
        for (const key of entry.params) {
            const inp = this._paramInputs[key];
            const inputEl = inp.el.querySelector('input') || inp.el;
            const val = inputEl.value;
            if (val) params[key] = val;
        }

        this._queryStatusBadge.update({ label: 'Running...', color: 'warning' });
        const startTime = performance.now();

        try {
            const data = await this._apiCall(action, params);
            const elapsed = Math.round(performance.now() - startTime);
            const records = this._parseResponse(data);

            if (records && records.length > 0) {
                this._queryStatusBadge.update({
                    label: `${records.length} records (${elapsed}ms)`,
                    color: 'success'
                });
                this._renderResultTable(records);
            } else {
                this._queryStatusBadge.update({
                    label: `No records (${elapsed}ms)`,
                    color: 'info'
                });
                this.stageEl.innerHTML = '';
                new uiAlert({
                    color: 'info',
                    message: 'No records returned.',
                    parent: this.stageEl
                });
            }
        } catch (err) {
            const elapsed = Math.round(performance.now() - startTime);
            this._queryStatusBadge.update({
                label: `Error (${elapsed}ms)`,
                color: 'danger'
            });
            this.stageEl.innerHTML = '';
            new uiAlert({
                color: 'danger',
                message: `Query failed: ${err.message}`,
                parent: this.stageEl
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render Result Table — dynamic columns from response records
    // ─────────────────────────────────────────────────────────────────────────

    _renderResultTable(records) {
        this.stageEl.innerHTML = '';

        if (!records || records.length === 0) {
            new uiAlert({
                color: 'info',
                message: 'No records returned.',
                parent: this.stageEl
            });
            return;
        }

        // Derive columns from first record's keys
        const columns = Object.keys(records[0]).map(key => ({
            key,
            label: key,
            sortable: true,
            searchable: true
        }));

        this._currentTable = new uiTable({
            columns,
            data: records,
            paging: true,
            searching: true,
            ordering: true,
            pageLength: 25,
            template: 'compact',
            parent: this.stageEl
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Call
    // ─────────────────────────────────────────────────────────────────────────

    async _apiCall(action, params = {}) {
        const body = { action, ...params };

        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.logToken) body.logToken = this.logToken;

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Response Parsing (mirrors ApiDataAdapter._fieldsDataToRecords)
    // ─────────────────────────────────────────────────────────────────────────

    _parseResponse(data) {
        if (!data) return null;

        // Direct array
        if (Array.isArray(data)) return data;

        // { fields: [...], data: [[...], ...] }
        if (data.fields && Array.isArray(data.data)) {
            return this._fieldsDataToRecords(data.fields, data.data);
        }

        // { results: { fields, data } }
        if (data.results && data.results.fields && Array.isArray(data.results.data)) {
            return this._fieldsDataToRecords(data.results.fields, data.results.data);
        }

        // { results: [...] }
        if (Array.isArray(data.results)) return data.results;

        // Wrapped in known keys
        const wrapKeys = ['students', 'registrations', 'courseInfo', 'assessmentResults',
            'faculties', 'disciplines', 'programmes', 'courses', 'blocks',
            'studentBioData', 'studentBlocks', 'programmeRegistrations', 'programmeCourses',
            'programmeStudents', 'courseMeta', 'courseCounts', 'programmeCounts',
            'programmeGrads', 'gradCounts', 'staffCourses', 'studentMatric', 'staffBio'];
        for (const key of wrapKeys) {
            if (data[key]) {
                const inner = data[key];
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data)) {
                    return this._fieldsDataToRecords(inner.fields, inner.data);
                }
            }
        }

        // Single object response (e.g., getInstitution)
        if (typeof data === 'object' && !Array.isArray(data)) {
            return [data];
        }

        return null;
    }

    _normalizeFieldName(field) {
        if (field === field.toUpperCase() && field.length > 1) {
            return field.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        }
        return field;
    }

    _fieldsDataToRecords(fields, data) {
        const normalizedFields = fields.map(f => this._normalizeFieldName(f));
        return data.map(row => {
            const record = {};
            normalizedFields.forEach((field, i) => {
                record[field] = row[i] !== undefined ? row[i] : null;
            });
            return record;
        });
    }
}

// Export
if (typeof window !== 'undefined') {
    window.InstApiTestSuite = InstApiTestSuite;
}
