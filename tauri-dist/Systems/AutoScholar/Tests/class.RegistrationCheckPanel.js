/**
 * RegistrationCheckPanel - Prerequisite registration checker for DUT courses
 *
 * Standalone analysis panel — works without any services.
 * Answers: "Can these students register for my course, given prerequisite course requirements?"
 *
 * Two-phase data flow:
 *   Phase 1 (Load Students): getCourseResults for target course → enrolled student list
 *   Phase 2 (Check Prerequisites): getCourseResults for prereq courses → max dedup → evaluate rules
 *
 * Usage:
 *   const panel = new RegistrationCheckPanel({ courseCode: 'MGAB401', year: 2020 });
 *   panel.render(controlEl, stageEl);
 */
class RegistrationCheckPanel {

    constructor(config = {}) {
        this.endpoint = config.endpoint || '/api-proxy';
        this.courseCode = config.courseCode || 'MGAB401';
        this.year = config.year || 2020;

        // Prerequisite rules: [{ courseCode, minMark }]
        this._rules = config.ruleRows || [];

        this.sessionId = null;
        this.logToken = null;
        this._statusBadge = null;
        this._controlEl = null;
        this._stageEl = null;
        this._inputs = {};
        this._busKey = config.busKey || 'regCheck';

        // Data
        this._enrolledStudents = [];
        this._bioIndex = {};
        this._report = [];
        this._filteredReport = [];
        this._activeFilter = 'all';

        // Pagination
        this._pageSize = 15;
        this._currentPage = 0;

        // Stats pane elements
        this._statsPane = null;

        // Detail panel
        this._detailEl = null;
        this._selectedRow = null;
    }

    // -- Service Bindings -------------------------------------------------------

    setPublome(publome) {
        this._publome = publome;
    }

    // -- Component API ----------------------------------------------------------

    connectBus(bus) {
        this._bus = bus;
        bus.on('load', params => this.load(params));
        return this;
    }

    async load(params = {}) {
        if (params.courseCode !== undefined) this.courseCode = params.courseCode;
        if (params.year !== undefined) this.year = parseInt(params.year, 10);
        if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'loading' });
        try {
            await this._loadStudents(true);
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'done' });
        } catch (err) {
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'error', detail: err.message });
        }
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        if (controlEl) this._renderControls();
        if (stageEl) this._renderEmptyStage();
    }

    openParams() {
        if (!this._accordion) return;
        var paramsItem = this._accordion.el.querySelector('.ui-accordion-item[data-key="params"]');
        if (!paramsItem) return;
        if (!paramsItem.classList.contains('ui-active')) {
            var trigger = paramsItem.querySelector('.ui-accordion-trigger');
            if (trigger) trigger.click();
        }
    }

    // -- Controls ---------------------------------------------------------------

    _renderControls() {
        if (!this._controlEl) return;
        var el = this._controlEl;
        el.innerHTML = '';

        var accordion = new uiAccordion({
            exclusive: true,
            content: {
                params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
                rules: { label: '<i class="fas fa-clipboard-list" style="margin-right:0.3rem;"></i>Prerequisite Rules' },
                stats: { label: '<i class="fas fa-chart-pie" style="margin-right:0.3rem;"></i>Quick Stats' },
                logic: { label: '<i class="fas fa-project-diagram" style="margin-right:0.3rem;"></i>Logic Evaluator' }
            },
            parent: el
        });
        this._accordion = accordion;

        // Parameters pane
        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsPane(paramsEl);

        // Prerequisite Rules pane
        var rulesEl = accordion.el.querySelector('.ui-accordion-item[data-key="rules"] .ui-accordion-content');
        this._renderRulesPane(rulesEl);

        // Quick Stats pane
        this._statsPane = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        this._renderStatsPane(this._statsPane);

        // Logic Evaluator pane
        var logicEl = accordion.el.querySelector('.ui-accordion-item[data-key="logic"] .ui-accordion-content');
        this._renderLogicPane(logicEl);
    }

    _renderParamsPane(el) {
        // Connection badge
        var connRow = document.createElement('div');
        connRow.className = 'cv-mb-md';
        el.appendChild(connRow);

        var connLabel = document.createElement('label');
        connLabel.className = 'cv-dash-section-title';
        connLabel.textContent = 'Connection';
        connRow.appendChild(connLabel);

        var connStatus = document.createElement('div');
        connStatus.className = 'cv-dash-detail';
        connRow.appendChild(connStatus);
        this._statusBadge = new uiBadge({ label: 'Disconnected', color: 'gray', size: 'sm', parent: connStatus });

        // Course code input
        this._inputs.courseCode = new uiInput({
            template: 'inline-label', label: 'Course Code',
            value: this.courseCode, size: 'sm', parent: el
        });

        // Year input
        this._inputs.year = new uiInput({
            template: 'inline-label', label: 'Year',
            value: String(this.year), inputType: 'number', size: 'sm', parent: el
        });

        // Load Students button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'cv-mt-md';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Students', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => this._loadStudents()
        });
    }

    _renderRulesPane(el) {
        this._rulesContainer = el;
        this._renderRulesList();

        // Add rule button
        var addWrap = document.createElement('div');
        addWrap.className = 'cv-mt-md';
        el.appendChild(addWrap);

        new uiButton({
            label: 'Add Rule', variant: 'ghost', size: 'sm', parent: addWrap,
            onClick: () => this._addRule()
        });

        // Separator + Check button
        var sep = document.createElement('div');
        sep.className = 'as-separator';
        el.appendChild(sep);

        new uiButton({
            label: 'Check Prerequisites', variant: 'primary', size: 'sm', parent: sep,
            onClick: () => this._runCheck()
        });
    }

    _renderRulesList() {
        // Clear only the rule rows (keep add/check buttons)
        var existing = this._rulesContainer.querySelectorAll('.reg-rule-row');
        existing.forEach(function(r) { r.remove(); });

        var self = this;

        // Seed default rules if empty
        if (this._rules.length === 0) {
            this._rules.push({ courseCode: '', minMark: 50 });
        }

        this._rules.forEach(function(rule, i) {
            var row = document.createElement('div');
            row.className = 'reg-rule-row as-rule-row';

            var codeInput = document.createElement('input');
            codeInput.type = 'text';
            codeInput.placeholder = 'Course code';
            codeInput.value = rule.courseCode;
            codeInput.className = 'ui-input ui-input-sm as-rule-input-code';
            codeInput.addEventListener('change', function() { rule.courseCode = codeInput.value.trim().toUpperCase(); });
            row.appendChild(codeInput);

            var markInput = document.createElement('input');
            markInput.type = 'number';
            markInput.min = '0';
            markInput.max = '100';
            markInput.value = String(rule.minMark);
            markInput.className = 'ui-input ui-input-sm as-rule-input-mark';
            markInput.addEventListener('change', function() { rule.minMark = parseInt(markInput.value) || 0; });
            row.appendChild(markInput);

            var pctLabel = document.createElement('span');
            pctLabel.className = 'as-rule-pct';
            pctLabel.textContent = '%';
            row.appendChild(pctLabel);

            var removeBtn = document.createElement('button');
            removeBtn.className = 'ui-btn ui-btn-ghost ui-btn-xs as-rule-remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', function() {
                self._rules.splice(i, 1);
                self._renderRulesList();
            });
            row.appendChild(removeBtn);

            // Insert before the Add Rule button wrapper
            var addBtn = self._rulesContainer.querySelector('.cv-mt-md');
            if (addBtn) {
                self._rulesContainer.insertBefore(row, addBtn);
            } else {
                self._rulesContainer.appendChild(row);
            }
        });
    }

    _addRule() {
        this._rules.push({ courseCode: '', minMark: 50 });
        this._renderRulesList();
    }

    _renderStatsPane(el) {
        el.innerHTML = '';
        var placeholder = document.createElement('div');
        placeholder.className = 'as-placeholder-text';
        placeholder.textContent = 'Run a prerequisite check to see stats.';
        el.appendChild(placeholder);
    }

    _updateStatsPane(report) {
        if (!this._statsPane) return;
        this._statsPane.innerHTML = '';

        var eligible = report.filter(function(r) { return r.eligible; }).length;
        var ineligible = report.filter(function(r) { return !r.eligible; }).length;
        var total = report.length;
        var eligRate = total > 0 ? Math.round(100 * eligible / total) : 0;

        var stats = [
            { label: 'Total', value: String(total), icon: 'fas fa-users', color: 'var(--ui-primary)' },
            { label: 'Eligible', value: String(eligible), icon: 'fas fa-check-circle', color: 'var(--ui-success)' },
            { label: 'Ineligible', value: String(ineligible), icon: 'fas fa-times-circle', color: 'var(--ui-danger)' },
            { label: 'Elig. Rate', value: eligRate + '%', icon: 'fas fa-percentage', color: 'var(--ui-info)' }
        ];

        var self = this;
        stats.forEach(function(s) {
            var row = document.createElement('div');
            row.className = 'as-stats-row';
            row.innerHTML = '<i class="' + s.icon + ' as-stats-icon" style="color:' + s.color + ';"></i>' +
                '<span class="as-stats-label">' + s.label + '</span>' +
                '<span class="as-stats-value">' + s.value + '</span>';
            self._statsPane.appendChild(row);
        });
    }

    _renderLogicPane(el) {
        el.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'as-detail-placeholder';
        wrap.innerHTML = '<i class="fas fa-project-diagram"></i>' +
            '<div class="as-detail-section-title">Coming Soon</div>' +
            '<div class="as-placeholder-text" style="padding:0;">AND/OR logic trees for complex prerequisite evaluation</div>';
        el.appendChild(wrap);
    }

    // -- Empty Stage ------------------------------------------------------------

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        new uiAlert({
            color: 'info',
            title: 'Registration & Prerequisite Check',
            message: 'Set course parameters and click Load Students, then define prerequisite rules and click Check Prerequisites to evaluate registration eligibility.',
            parent: this._stageEl
        });
    }

    // -- Input Helpers ----------------------------------------------------------

    _getInputValue(uiInputInstance) {
        var inputEl = uiInputInstance.el.querySelector('input') || uiInputInstance.el;
        return inputEl.value;
    }

    _readParams() {
        this.courseCode = this._getInputValue(this._inputs.courseCode);
        this.year = parseInt(this._getInputValue(this._inputs.year), 10);
    }

    // -- Loading Indicator ------------------------------------------------------

    _showLoading(msg) {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';
        var el = document.createElement('div');
        el.className = 'as-loading-state';
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>' +
            '<div class="as-loading-state-text">' + (msg || 'Loading...') + '</div>' +
            '<div class="as-loading-sub">Connecting</div>';
        this._stageEl.appendChild(el);
        this._loadingSubEl = el.querySelector('.as-loading-sub');
    }

    _updateLoadingStatus(text) {
        if (this._loadingSubEl && this._loadingSubEl.parentNode) this._loadingSubEl.textContent = text;
    }

    // -- Status Badge -----------------------------------------------------------

    _setStatus(label, color) {
        if (this._statusBadge) this._statusBadge.update({ label: label, color: color });
    }

    // -- API Methods (same pattern as RiskAssessmentPanel) ----------------------

    async _authenticate() {
        if (window.AS_SESSION && window.AS_SESSION.ready) {
            this.sessionId = window.AS_SESSION.sessionId;
            this.logToken = window.AS_SESSION.logToken;
            return;
        }
        var creds = (window.AS_CREDENTIALS && window.AS_CREDENTIALS.api && window.AS_CREDENTIALS.api.sessionBypass) || {};
        var data = await this._apiCall('logIn', { userId: creds.userId, pwd: creds.password });

        if (data && data.status !== false) {
            this.sessionId = data.sessionId || data.session_id;
            this.logToken = data.logToken || data.log_token;
            return;
        }
        throw new Error((data && data.error) || 'Authentication failed');
    }

    async _apiCall(action, params) {
        params = params || {};
        var body = { action: action };
        var keys = Object.keys(params);
        for (var i = 0; i < keys.length; i++) body[keys[i]] = params[keys[i]];
        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.logToken) body.logToken = this.logToken;

        var response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        return response.json();
    }

    _parseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;
        if (data.fields && Array.isArray(data.data)) return this._fieldsDataToRecords(data.fields, data.data);
        if (data.results && data.results.fields && Array.isArray(data.results.data)) return this._fieldsDataToRecords(data.results.fields, data.results.data);
        if (Array.isArray(data.results)) return data.results;
        var wrapKeys = ['students', 'registrations', 'courseInfo', 'assessmentResults', 'courseResults', 'studentBioData', 'courseMeta', 'courseCounts'];
        for (var i = 0; i < wrapKeys.length; i++) {
            var key = wrapKeys[i];
            if (data[key]) {
                var inner = data[key];
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data)) return this._fieldsDataToRecords(inner.fields, inner.data);
            }
        }
        if (typeof data === 'object' && !Array.isArray(data)) return [data];
        return null;
    }

    _fieldsDataToRecords(fields, data) {
        var normalized = fields.map(function(f) {
            return f === f.toUpperCase() && f.length > 1
                ? f.toLowerCase().replace(/_([a-z])/g, function(_, c) { return c.toUpperCase(); })
                : f;
        });
        return data.map(function(row) {
            var record = {};
            normalized.forEach(function(field, i) { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }

    // -- Bio Data ---------------------------------------------------------------

    async _fetchBioData(studentNumbers) {
        var self = this;
        var index = {};
        var batchSize = 20;
        for (var i = 0; i < studentNumbers.length; i += batchSize) {
            var batch = studentNumbers.slice(i, i + batchSize);
            var promises = batch.map(function(sn) {
                return self._apiCall('getStudentBioData', { studentNumber: sn })
                    .then(function(d) {
                        var records = self._parseResponse(d);
                        if (records && records.length > 0) index[sn] = records[0];
                    })
                    .catch(function() {});
            });
            await Promise.all(promises);
        }
        return index;
    }

    // -- Core Algorithms --------------------------------------------------------

    /**
     * Groups results by [studentNumber, courseCode], keeps max mark per group.
     * Returns { studentNumber: { courseCode: maxMark } }
     */
    _maxResults(results) {
        var maxMap = {};
        for (var i = 0; i < results.length; i++) {
            var row = results[i];
            var sn = String(row.studentNumber);
            var cc = row.courseCode;
            var mark = parseFloat(row.result || row.mark || row.finalMark || 0);
            if (isNaN(mark)) mark = 0;
            if (!maxMap[sn]) maxMap[sn] = {};
            if (maxMap[sn][cc] === undefined || mark > maxMap[sn][cc]) {
                maxMap[sn][cc] = mark;
            }
        }
        return maxMap;
    }

    /**
     * Builds student x course matrix from maxMap.
     * Returns [{ studentNumber, courses: { code: mark|null } }]
     */
    _transposeToMatrix(maxMap, studentNumbers, courseCodes) {
        var matrix = [];
        for (var i = 0; i < studentNumbers.length; i++) {
            var sn = studentNumbers[i];
            var courses = {};
            for (var j = 0; j < courseCodes.length; j++) {
                var cc = courseCodes[j];
                courses[cc] = (maxMap[sn] && maxMap[sn][cc] !== undefined) ? maxMap[sn][cc] : null;
            }
            matrix.push({ studentNumber: sn, courses: courses });
        }
        return matrix;
    }

    /**
     * Evaluates each student against all rules.
     * Returns per-student report: { studentNumber, eligible, details: [{ courseCode, minMark, actualMark, pass }] }
     */
    _checkPrerequisites(matrix, rules, bioIndex) {
        var report = [];
        for (var i = 0; i < matrix.length; i++) {
            var row = matrix[i];
            var sn = row.studentNumber;
            var bio = bioIndex[sn] || {};
            var eligible = true;
            var details = [];

            for (var j = 0; j < rules.length; j++) {
                var rule = rules[j];
                if (!rule.courseCode) continue;
                var actualMark = row.courses[rule.courseCode];
                var pass;
                if (actualMark === null || actualMark === undefined) {
                    pass = false;
                } else {
                    pass = actualMark >= rule.minMark;
                }
                if (!pass) eligible = false;
                details.push({
                    courseCode: rule.courseCode,
                    minMark: rule.minMark,
                    actualMark: actualMark,
                    pass: pass
                });
            }

            report.push({
                studentNumber: sn,
                firstName: bio.firstName || bio.firstNames || '',
                lastName: bio.lastName || bio.surname || bio.lastNames || '',
                programmeCode: bio.programmeCode || bio.programme || '',
                eligible: eligible,
                details: details,
                failCount: details.filter(function(d) { return !d.pass; }).length
            });
        }

        // Sort: ineligible first (by fail count desc), then eligible
        report.sort(function(a, b) {
            if (a.eligible !== b.eligible) return a.eligible ? 1 : -1;
            return b.failCount - a.failCount;
        });

        return report;
    }

    // -- Phase 1: Load Students -------------------------------------------------

    async _loadStudents(skipReadParams) {
        if (!skipReadParams) this._readParams();
        this._showLoading('Loading Students...');

        try {
            this._setStatus('Authenticating...', 'warning');
            this._updateLoadingStatus('Authenticating...');
            await this._authenticate();
            this._setStatus('Connected', 'success');

            this._updateLoadingStatus('Fetching enrolled students...');
            var courseData = await this._apiCall('getCourseResults', { courseCode: this.courseCode, year: this.year });
            var courseResults = this._parseResponse(courseData);

            if (!courseResults || courseResults.length === 0) {
                throw new Error('No students found for ' + this.courseCode + ' (' + this.year + ')');
            }

            // Extract unique student numbers
            var studentNumbers = [];
            var seen = {};
            for (var i = 0; i < courseResults.length; i++) {
                var sn = courseResults[i].studentNumber;
                if (sn && !seen[sn]) {
                    studentNumbers.push(sn);
                    seen[sn] = true;
                }
            }

            // Fetch bio data
            this._updateLoadingStatus('Loading student data (' + studentNumbers.length + ' students)...');
            this._bioIndex = await this._fetchBioData(studentNumbers);

            this._enrolledStudents = studentNumbers;
            this._courseResults = courseResults;
            this._setStatus(studentNumbers.length + ' students loaded', 'success');

            // Show loaded state
            this._renderLoadedStage();

        } catch (err) {
            // Fallback to demo data
            if (err.message.indexOf('HTTP') >= 0 || err.message.indexOf('Authentication') >= 0 || err.message.indexOf('fetch') >= 0) {
                this._loadDemoData();
                this._setStatus('Demo mode', 'warning');
                this._renderLoadedStage();
            } else {
                this._setStatus('Error: ' + err.message, 'danger');
                this._stageEl.innerHTML = '';
                this._stageEl.className = 'as-panel-inner';
                new uiAlert({
                    color: 'danger',
                    title: 'Load Failed',
                    message: err.message,
                    parent: this._stageEl
                });
            }
        }
    }

    // -- Demo Data --------------------------------------------------------------

    _loadDemoData() {
        this._enrolledStudents = [
            '21900001', '21900002', '21900003', '21900004', '21900005',
            '21900006', '21900007', '21900008', '21900009', '21900010'
        ];
        this._bioIndex = {
            '21900001': { firstName: 'Sipho',    lastName: 'Nkosi',    programmeCode: 'BTMBA1' },
            '21900002': { firstName: 'Thandiwe', lastName: 'Dlamini',  programmeCode: 'BTMBA1' },
            '21900003': { firstName: 'Bongani',  lastName: 'Mthembu',  programmeCode: 'BTMBA1' },
            '21900004': { firstName: 'Nomvula',  lastName: 'Zulu',     programmeCode: 'BTMSB1' },
            '21900005': { firstName: 'Andile',   lastName: 'Cele',     programmeCode: 'BTMBA1' },
            '21900006': { firstName: 'Zanele',   lastName: 'Mkhize',   programmeCode: 'BTMBA1' },
            '21900007': { firstName: 'Thabo',    lastName: 'Sithole',  programmeCode: 'BTMSB1' },
            '21900008': { firstName: 'Ayanda',   lastName: 'Ngcobo',   programmeCode: 'BTMBA1' },
            '21900009': { firstName: 'Lungelo',  lastName: 'Khumalo',  programmeCode: 'BTMBA1' },
            '21900010': { firstName: 'Nompilo',  lastName: 'Ndlovu',   programmeCode: 'BTMSB1' }
        };
        // Demo prerequisite results: 3 courses, varying marks
        this._demoPrereqResults = [
            // FNAB401 results
            { studentNumber: '21900001', courseCode: 'FNAB401', result: 72 },
            { studentNumber: '21900002', courseCode: 'FNAB401', result: 85 },
            { studentNumber: '21900003', courseCode: 'FNAB401', result: 38 },
            { studentNumber: '21900004', courseCode: 'FNAB401', result: 62 },
            { studentNumber: '21900005', courseCode: 'FNAB401', result: 45 },
            { studentNumber: '21900006', courseCode: 'FNAB401', result: 55 },
            { studentNumber: '21900007', courseCode: 'FNAB401', result: 91 },
            { studentNumber: '21900008', courseCode: 'FNAB401', result: 67 },
            { studentNumber: '21900009', courseCode: 'FNAB401', result: 42 },
            { studentNumber: '21900010', courseCode: 'FNAB401', result: 78 },
            // PDAB203 results
            { studentNumber: '21900001', courseCode: 'PDAB203', result: 58 },
            { studentNumber: '21900002', courseCode: 'PDAB203', result: 76 },
            { studentNumber: '21900003', courseCode: 'PDAB203', result: 41 },
            { studentNumber: '21900004', courseCode: 'PDAB203', result: 53 },
            { studentNumber: '21900005', courseCode: 'PDAB203', result: 35 },
            { studentNumber: '21900006', courseCode: 'PDAB203', result: 62 },
            { studentNumber: '21900007', courseCode: 'PDAB203', result: 88 },
            { studentNumber: '21900008', courseCode: 'PDAB203', result: 49 },
            // 21900009 has NO PDAB203 result
            { studentNumber: '21900010', courseCode: 'PDAB203', result: 70 },
            // MKAB202 results
            { studentNumber: '21900001', courseCode: 'MKAB202', result: 65 },
            { studentNumber: '21900002', courseCode: 'MKAB202', result: 90 },
            { studentNumber: '21900003', courseCode: 'MKAB202', result: 50 },
            { studentNumber: '21900004', courseCode: 'MKAB202', result: 44 },
            { studentNumber: '21900005', courseCode: 'MKAB202', result: 30 },
            { studentNumber: '21900006', courseCode: 'MKAB202', result: 58 },
            { studentNumber: '21900007', courseCode: 'MKAB202', result: 82 },
            // 21900008 has NO MKAB202 result
            { studentNumber: '21900009', courseCode: 'MKAB202', result: 47 },
            { studentNumber: '21900010', courseCode: 'MKAB202', result: 71 }
        ];

        // Pre-fill rules for demo
        if (this._rules.length <= 1 && (!this._rules[0] || !this._rules[0].courseCode)) {
            this._rules = [
                { courseCode: 'FNAB401', minMark: 50 },
                { courseCode: 'PDAB203', minMark: 50 },
                { courseCode: 'MKAB202', minMark: 50 }
            ];
            this._renderRulesList();
        }
    }

    // -- Loaded Stage -----------------------------------------------------------

    _renderLoadedStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage';

        // Info bar
        var infoBar = document.createElement('div');
        infoBar.className = 'as-info-bar';
        this._stageEl.appendChild(infoBar);

        new uiBadge({ label: this.courseCode, color: 'primary', size: 'sm', parent: infoBar });
        new uiBadge({ label: String(this.year), color: 'secondary', size: 'sm', parent: infoBar });
        new uiBadge({ label: this._enrolledStudents.length + ' students', color: 'info', size: 'sm', parent: infoBar });

        var hint = document.createElement('span');
        hint.className = 'as-hint-text';
        hint.textContent = 'Define prerequisite rules in the sidebar, then click Check Prerequisites';
        infoBar.appendChild(hint);

        // Content area (will be replaced after check)
        this._contentEl = document.createElement('div');
        this._contentEl.className = 'as-panel-content';
        this._stageEl.appendChild(this._contentEl);

        new uiAlert({
            color: 'info',
            title: 'Students Loaded',
            message: this._enrolledStudents.length + ' students enrolled in ' + this.courseCode + ' (' + this.year + '). Now add prerequisite course rules in the sidebar and click Check Prerequisites.',
            parent: this._contentEl
        });
    }

    // -- Phase 2: Run Prerequisite Check ----------------------------------------

    async _runCheck() {
        // Validate rules
        var validRules = this._rules.filter(function(r) { return r.courseCode && r.courseCode.length > 0; });
        if (validRules.length === 0) {
            if (typeof uiToast !== 'undefined') uiToast.show({ message: 'Add at least one prerequisite rule', color: 'warning' });
            return;
        }
        if (this._enrolledStudents.length === 0) {
            if (typeof uiToast !== 'undefined') uiToast.show({ message: 'Load students first', color: 'warning' });
            return;
        }

        this._showLoading('Checking Prerequisites...');
        var prereqCodes = validRules.map(function(r) { return r.courseCode; });

        try {
            var results;
            if (this._demoPrereqResults) {
                // Demo mode — use pre-built data
                results = this._demoPrereqResults;
            } else {
                // Live API — fetch prereq course results for enrolled students
                this._updateLoadingStatus('Fetching prerequisite results...');
                var data = await this._apiCall('getCourseResults', {
                    studentNumber: this._enrolledStudents,
                    courseCode: prereqCodes
                });
                results = this._parseResponse(data) || [];
            }

            // Process
            this._updateLoadingStatus('Evaluating rules...');
            var maxMap = this._maxResults(results);
            var matrix = this._transposeToMatrix(maxMap, this._enrolledStudents, prereqCodes);
            this._report = this._checkPrerequisites(matrix, validRules, this._bioIndex);
            this._filteredReport = this._report.slice();
            this._activeFilter = 'all';
            this._currentPage = 0;

            // Update stats pane
            this._updateStatsPane(this._report);

            // Render results
            this._renderResults();
            this._setStatus('Check complete', 'success');

        } catch (err) {
            this._setStatus('Error: ' + err.message, 'danger');
            this._stageEl.innerHTML = '';
            this._stageEl.className = 'as-panel-inner';
            new uiAlert({
                color: 'danger',
                title: 'Check Failed',
                message: err.message,
                parent: this._stageEl
            });
        }
    }

    // -- Results Rendering ------------------------------------------------------

    _renderResults() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage';

        var report = this._report;
        var eligible = report.filter(function(r) { return r.eligible; });
        var ineligible = report.filter(function(r) { return !r.eligible; });

        // Summary chips row
        var chipRow = document.createElement('div');
        chipRow.className = 'as-filter-row';
        this._stageEl.appendChild(chipRow);

        this._bindKPIs(chipRow, [
            { code: 'total',      value: String(report.length),     label: 'Total',       icon: 'fas fa-users',          color: 'var(--ui-primary)' },
            { code: 'eligible',   value: String(eligible.length),   label: 'Eligible',    icon: 'fas fa-check-circle',   color: 'var(--ui-success)' },
            { code: 'ineligible', value: String(ineligible.length), label: 'Ineligible',  icon: 'fas fa-times-circle',   color: 'var(--ui-danger)' },
            { code: 'eligRate',   value: (report.length > 0 ? Math.round(100 * eligible.length / report.length) : 0) + '%', label: 'Elig. Rate', icon: 'fas fa-percentage', color: 'var(--ui-info)' },
            { code: 'course',     value: this.courseCode,            label: 'Target',      icon: 'fas fa-book',           color: 'var(--ui-secondary)' },
            { code: 'rules',      value: String(this._rules.filter(function(r) { return r.courseCode; }).length), label: 'Rules', icon: 'fas fa-clipboard-list', color: 'var(--ui-gray-500)' }
        ]);

        // Main content: table + detail split
        var mainArea = document.createElement('div');
        mainArea.className = 'as-split-panel';
        this._stageEl.appendChild(mainArea);

        // Left: filter + table
        var tableCol = document.createElement('div');
        tableCol.className = 'as-split-left';
        mainArea.appendChild(tableCol);

        // Right: detail panel
        this._detailEl = document.createElement('div');
        this._detailEl.className = 'as-split-right';
        this._detailEl.style.cssText = 'overflow-y:auto;padding:0.75rem;min-width:14rem;';
        mainArea.appendChild(this._detailEl);
        this._renderDetailPlaceholder();

        // Filter badges
        var filterRow = document.createElement('div');
        filterRow.className = 'as-filter-row-sm';
        tableCol.appendChild(filterRow);

        var self = this;
        var filters = [
            { key: 'all',        label: 'All (' + report.length + ')' },
            { key: 'eligible',   label: 'Eligible (' + eligible.length + ')',   color: 'success' },
            { key: 'ineligible', label: 'Ineligible (' + ineligible.length + ')', color: 'danger' }
        ];

        this._filterBadges = {};
        filters.forEach(function(f) {
            var badge = new uiBadge({
                label: f.label,
                color: f.key === 'all' ? 'primary' : (f.color || 'gray'),
                size: 'sm',
                parent: filterRow
            });
            badge.el.style.cursor = 'pointer';
            badge.el.style.opacity = f.key === 'all' ? '1' : '0.5';
            badge.el.addEventListener('click', function() { self._setFilter(f.key); });
            self._filterBadges[f.key] = badge;
        });

        // Scrollable table
        this._tableContainer = document.createElement('div');
        this._tableContainer.className = 'as-table-scroll';
        tableCol.appendChild(this._tableContainer);

        // Pagination
        var pageRow = document.createElement('div');
        pageRow.className = 'as-pagination';
        tableCol.appendChild(pageRow);

        this._prevBtn = document.createElement('button');
        this._prevBtn.className = 'ui-btn ui-btn-ghost ui-btn-xs';
        this._prevBtn.textContent = 'Prev';
        this._prevBtn.addEventListener('click', function() { self._currentPage--; self._renderTable(); });
        pageRow.appendChild(this._prevBtn);

        this._pageLabel = document.createElement('span');
        this._pageLabel.style.color = 'var(--ui-gray-500)';
        pageRow.appendChild(this._pageLabel);

        this._nextBtn = document.createElement('button');
        this._nextBtn.className = 'ui-btn ui-btn-ghost ui-btn-xs';
        this._nextBtn.textContent = 'Next';
        this._nextBtn.addEventListener('click', function() { self._currentPage++; self._renderTable(); });
        pageRow.appendChild(this._nextBtn);

        this._renderTable();
    }

    _setFilter(key) {
        this._activeFilter = key;
        var self = this;
        Object.keys(this._filterBadges).forEach(function(k) {
            self._filterBadges[k].el.style.opacity = k === key ? '1' : '0.5';
        });
        this._currentPage = 0;

        if (key === 'all') {
            this._filteredReport = this._report.slice();
        } else if (key === 'eligible') {
            this._filteredReport = this._report.filter(function(r) { return r.eligible; });
        } else {
            this._filteredReport = this._report.filter(function(r) { return !r.eligible; });
        }
        this._renderTable();
    }

    _renderTable() {
        this._tableContainer.innerHTML = '';
        var total = this._filteredReport.length;
        var totalPages = Math.max(1, Math.ceil(total / this._pageSize));
        this._currentPage = Math.max(0, Math.min(this._currentPage, totalPages - 1));

        var start = this._currentPage * this._pageSize;
        var page = this._filteredReport.slice(start, start + this._pageSize);

        if (page.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'as-empty-text';
            empty.textContent = 'No students match the filter.';
            this._tableContainer.appendChild(empty);
            this._pageLabel.textContent = '0 of 0';
            this._prevBtn.disabled = true;
            this._nextBtn.disabled = true;
            return;
        }

        // Get valid rules for column headers
        var validRules = this._rules.filter(function(r) { return r.courseCode; });

        var table = document.createElement('table');
        table.className = 'as-an-data-table';

        // Header
        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        headRow.className = 'as-an-thead-row';

        var headers = ['Student', 'Name', 'Programme'];
        validRules.forEach(function(r) { headers.push(r.courseCode); });
        headers.push('Status');

        headers.forEach(function(h) {
            var th = document.createElement('th');
            th.className = 'as-an-th-left';
            th.textContent = h;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        var self = this;
        var tbody = document.createElement('tbody');
        page.forEach(function(row) {
            var tr = document.createElement('tr');
            tr.className = 'as-hover-row';
            tr.style.borderLeft = '3px solid ' + (row.eligible ? 'var(--ui-success)' : 'var(--ui-danger)');
            tr.addEventListener('click', function() { self._showDetail(row, tr); });

            // Student number
            var tdSn = document.createElement('td');
            tdSn.className = 'as-an-td-base-nowrap';
            tdSn.style.fontFamily = 'monospace';
            tdSn.textContent = row.studentNumber;
            tr.appendChild(tdSn);

            // Name
            var tdName = document.createElement('td');
            tdName.className = 'as-an-td-base';
            tdName.textContent = (row.firstName + ' ' + row.lastName).trim() || '-';
            tr.appendChild(tdName);

            // Programme
            var tdProg = document.createElement('td');
            tdProg.className = 'as-an-td-center-muted';
            tdProg.style.textAlign = 'left';
            tdProg.textContent = row.programmeCode || '-';
            tr.appendChild(tdProg);

            // Prereq columns (dynamic pass/fail coloring)
            row.details.forEach(function(d) {
                var td = document.createElement('td');
                if (d.actualMark === null || d.actualMark === undefined) {
                    td.className = 'as-an-td-center-muted';
                    td.textContent = '-';
                } else if (d.pass) {
                    td.className = 'as-an-td-center-bold-green';
                    td.textContent = d.actualMark + '%';
                } else {
                    td.className = 'as-an-td-center-bold-red';
                    td.textContent = d.actualMark + '%';
                }
                tr.appendChild(td);
            });

            // Status
            var tdStatus = document.createElement('td');
            tdStatus.className = 'as-an-td-base';
            var statusBadge = document.createElement('span');
            statusBadge.className = 'as-status-badge-inline ' + (row.eligible ? 'as-status-badge-eligible' : 'as-status-badge-ineligible');
            statusBadge.textContent = row.eligible ? 'ELIGIBLE' : 'INELIGIBLE';
            tdStatus.appendChild(statusBadge);
            tr.appendChild(tdStatus);

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        this._tableContainer.appendChild(table);

        // Update pagination
        this._pageLabel.textContent = (start + 1) + '\u2013' + Math.min(start + this._pageSize, total) + ' of ' + total;
        this._prevBtn.disabled = this._currentPage === 0;
        this._nextBtn.disabled = this._currentPage >= totalPages - 1;
    }

    // -- Detail Panel -----------------------------------------------------------

    _renderDetailPlaceholder() {
        this._detailEl.innerHTML = '';
        var placeholder = document.createElement('div');
        placeholder.className = 'as-detail-placeholder';
        placeholder.innerHTML = '<i class="fas fa-user-check"></i>' +
            '<div>Click a student row to see details</div>';
        this._detailEl.appendChild(placeholder);
    }

    _showDetail(row, trEl) {
        // Highlight selected row
        if (this._selectedRow) this._selectedRow.style.outline = 'none';
        this._selectedRow = trEl;
        trEl.style.outline = '2px solid var(--ui-primary-500)';

        this._detailEl.innerHTML = '';

        // Header
        var header = document.createElement('div');
        header.style.marginBottom = '0.75rem';
        this._detailEl.appendChild(header);

        var name = document.createElement('div');
        name.className = 'as-detail-name';
        name.textContent = (row.firstName + ' ' + row.lastName).trim() || row.studentNumber;
        header.appendChild(name);

        var sub = document.createElement('div');
        sub.className = 'as-detail-sub';
        sub.innerHTML = '<span>' + row.studentNumber + '</span>' +
            (row.programmeCode ? '<span>' + row.programmeCode + '</span>' : '');
        header.appendChild(sub);

        // Status badge
        var statusWrap = document.createElement('div');
        statusWrap.style.margin = '0.5rem 0';
        header.appendChild(statusWrap);
        new uiBadge({
            label: row.eligible ? 'ELIGIBLE' : 'INELIGIBLE',
            color: row.eligible ? 'success' : 'danger',
            size: 'sm',
            parent: statusWrap
        });

        // Per-rule evaluation
        var rulesTitle = document.createElement('div');
        rulesTitle.className = 'as-detail-section-title';
        rulesTitle.textContent = 'Prerequisite Evaluation';
        this._detailEl.appendChild(rulesTitle);

        var self = this;
        row.details.forEach(function(d) {
            var ruleRow = document.createElement('div');
            ruleRow.className = 'as-rule-eval-row';
            ruleRow.style.borderLeft = '3px solid ' + (d.pass ? 'var(--ui-success)' : 'var(--ui-danger)');
            ruleRow.style.background = d.pass ? 'var(--ui-success-light)' : 'var(--ui-danger-light)';

            var icon = document.createElement('i');
            icon.className = (d.pass ? 'fas fa-check-circle' : 'fas fa-times-circle') + ' as-rule-eval-icon';
            icon.style.color = d.pass ? 'var(--ui-success)' : 'var(--ui-danger)';
            ruleRow.appendChild(icon);

            var label = document.createElement('span');
            label.className = 'as-rule-eval-label';
            label.textContent = d.courseCode;
            ruleRow.appendChild(label);

            var markText = document.createElement('span');
            markText.className = 'as-rule-eval-mark';
            if (d.actualMark === null || d.actualMark === undefined) {
                markText.textContent = 'No result (need ' + d.minMark + '%)';
            } else {
                markText.textContent = d.actualMark + '% (need ' + d.minMark + '%)';
            }
            ruleRow.appendChild(markText);

            self._detailEl.appendChild(ruleRow);
        });

        // Summary line
        var summaryLine = document.createElement('div');
        summaryLine.className = 'as-detail-summary';
        var passCount = row.details.filter(function(d) { return d.pass; }).length;
        summaryLine.textContent = passCount + ' of ' + row.details.length + ' prerequisites met';
        this._detailEl.appendChild(summaryLine);
    }

    // -- KPI Binding (same pattern as RiskAssessmentPanel) ----------------------

    _bindKPIs(container, stats) {
        var miniPublome = new Publome({
            tables: [{ name: 'metric', columns: {
                idx: { type: 'number', primaryKey: true },
                code: { type: 'string' },
                value: { type: 'string' },
                label: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' }
            }}]
        });
        stats.forEach(function(s, i) {
            miniPublome.table('metric').create({ idx: i + 1, code: s.code || s.label, value: String(s.value), label: s.label, icon: s.icon, color: s.color });
        });

        stats.forEach(function(s) {
            var el = document.createElement('div');
            container.appendChild(el);
            var binding = new UIBinding(miniPublome.table('metric'), { publome: miniPublome });
            binding.bindMetric(el, {
                compute: function(records) {
                    var r = records.find(function(rec) { return rec.get('code') === (s.code || s.label); });
                    return r ? r.get('value') : '\u2014';
                },
                label: s.label,
                icon: s.icon || '',
                color: s.color || 'var(--ui-primary)'
            });
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistrationCheckPanel;
}
if (typeof window !== 'undefined') {
    window.RegistrationCheckPanel = RegistrationCheckPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('RegistrationCheckPanel', RegistrationCheckPanel);
}
