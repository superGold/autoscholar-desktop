/**
 * RiskAssessmentPanel - Live student risk analysis for DUT courses
 *
 * Standalone analysis panel — works without any services.
 * Gains messaging capability when bound to a MessagesService via bindMessenger().
 *
 * Usage:
 *   const panel = new RiskAssessmentPanel({ courseCode: 'MGAB401', year: 2020 });
 *   panel.render(controlEl, stageEl);
 *
 *   // Optional: bind messaging
 *   panel.bindMessenger(ServiceRegistry.get('messages'));
 */
class RiskAssessmentPanel {

    constructor(config = {}) {
        this._embedded = !!config.embedded;
        this.endpoint = config.endpoint || '/api-proxy';
        this.courseCode = config.courseCode || 'MGAB401';
        this.year = config.year || 2020;
        this.riskConfig = config.riskConfig || {
            zAlertThreshold: -0.5,
            highZThreshold: 0.5,
            passThreshold: 50
        };

        this.sessionId = null;
        this.logToken = null;
        this._statusBadge = null;
        this._controlEl = null;
        this._stageEl = null;
        this._inputs = {};
        this._messagesService = null;
        this._msgPanel = null;

        this._msgConfig = {
            category: 'autoscholar',
            entityLabel: 'Student',
            categoryColors: { 'at-risk': 'danger', 'average': 'info', 'high-performing': 'success' },
            labelResolver: (s) => `${s.firstName} ${s.lastName}`.trim(),
            emailResolver: (s) => s.email || `${s.studentNumber}@dut4life.ac.za`,
            variableBuilder: (s) => this._buildStudentVariables(s),
            sendFn: (to, subject, body) =>
                this._apiCall('sendEmail', { to, subject, html: body.replace(/\n/g, '<br>') })
        };

        this._busKey = 'risk';
    }

    // ── Service Bindings ─────────────────────────────────────────────────────

    setPublome(publome) {
        this._publome = publome;
    }

    bindMessenger(messagesService) {
        this._messagesService = messagesService;
        this._seedTemplates();
        return this;
    }

    _seedTemplates() {
        const vars = ['name', 'firstName', 'lastName', 'studentNumber',
            'courseCode', 'year', 'avgMark', 'category',
            'negCount', 'posCount', 'negAlertZ', 'posAlertZ', 'assessmentDetails'];

        // Keys match risk categories so templates auto-select per entity.
        // Institutions override by calling seedTemplate with the same keys.
        this._messagesService.seedTemplate({
            name: 'At-Risk Warning',
            key: 'at-risk',
            category: 'autoscholar',
            subject: '{courseCode} {year} — At-Risk Warning',
            body: 'Dear {name},\n\nThis is to inform you that your performance in {courseCode} ({year}) has flagged {negCount} alert(s) based on our z-score analysis.\n\nYour results:\n{assessmentDetails}\n\nAverage mark: {avgMark}%\nNegative alert z-score: {negAlertZ}\n\nPlease contact your lecturer or the student support office to discuss strategies for improvement.\n\nRegards,\nAutoScholar',
            contentType: 'text',
            variables: vars
        });

        this._messagesService.seedTemplate({
            name: 'Performance Report',
            key: 'average',
            category: 'autoscholar',
            subject: '{courseCode} {year} — Performance Report',
            body: 'Dear {name},\n\nHere is your performance summary for {courseCode} ({year}):\n\n{assessmentDetails}\n\nOverall average: {avgMark}%\nCategory: {category}\nNeg alerts: {negCount} | Pos alerts: {posCount}\n\nRegards,\nAutoScholar',
            contentType: 'text',
            variables: vars
        });

        this._messagesService.seedTemplate({
            name: 'Encouragement',
            key: 'high-performing',
            category: 'autoscholar',
            subject: '{courseCode} {year} — Congratulations',
            body: 'Dear {name},\n\nCongratulations on your strong performance in {courseCode} ({year})!\n\nYour results:\n{assessmentDetails}\n\nAverage mark: {avgMark}%\nPositive alert z-score: {posAlertZ}\n\nKeep up the excellent work.\n\nRegards,\nAutoScholar',
            contentType: 'text',
            variables: vars
        });
    }

    // ── Component API ──────────────────────────────────────────────────

    connectBus(bus) {
        this._bus = bus;
        bus.on('load', params => this.load(params));
        return this;
    }

    async load(params = {}) {
        if (params.courseCode !== undefined) this.courseCode = params.courseCode;
        if (params.year !== undefined) this.year = parseInt(params.year, 10);
        if (params.zAlertThreshold !== undefined) this.riskConfig.zAlertThreshold = parseFloat(params.zAlertThreshold);
        if (params.highZThreshold !== undefined) this.riskConfig.highZThreshold = parseFloat(params.highZThreshold);
        if (params.studentNumber !== undefined) this._studentNumberFilter = params.studentNumber;
        if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'loading' });
        try {
            await this._loadData(true);
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'done' });
        } catch (err) {
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'error', detail: err.message });
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        if (controlEl) this._renderControls();
        if (stageEl) this._renderEmptyStage();
    }

    // ── Controls ────────────────────────────────────────────────────────────

    _renderControls() {
        this._buildAccordion();
    }

    _buildAccordion(variables = null) {
        if (!this._controlEl) return;
        const el = this._controlEl;
        el.innerHTML = '';

        // Build accordion content: Parameters pane + variable histogram panes
        const content = {
            params: { label: '<i class="fas fa-sliders-h as-icon-mr"></i>Parameters', open: true }
        };

        if (variables) {
            for (const v of variables) {
                content[v.key] = { label: `<i class="fas fa-chart-bar as-icon-mr"></i>${v.label}`, open: true };
            }
        }

        const accordion = new uiAccordion({
            exclusive: false,
            content,
            parent: el
        });
        this._accordion = accordion;

        // Populate Parameters pane
        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsContent(paramsEl);

        // Render all histograms immediately + handle resize on toggle
        if (variables) {
            var self = this;
            this._histogramData = {};
            for (const v of variables) {
                this._histogramData[v.key] = { values: v.values, mean: v.mean, stdDev: v.stdDev };
            }

            // Auto-render all histograms once the DOM is laid out
            requestAnimationFrame(function() {
                Object.keys(self._histogramData).forEach(function(key) {
                    var paneEl = accordion.el.querySelector('.ui-accordion-item[data-key="' + key + '"] .ui-accordion-content');
                    if (paneEl) {
                        var hd = self._histogramData[key];
                        self._renderHistogram(paneEl, hd.values, hd.mean, hd.stdDev);
                    }
                });
                self._histogramData = {};
            });

            // Resize Plotly charts when pane re-opens after collapse
            accordion.bus.on('toggle', function(evt) {
                if (evt.open) {
                    var paneEl = accordion.el.querySelector('.ui-accordion-item[data-key="' + evt.key + '"] .ui-accordion-content');
                    if (paneEl) {
                        var chart = paneEl.querySelector('.js-plotly-plot');
                        if (chart && typeof Plotly !== 'undefined') Plotly.Plots.resize(chart);
                    }
                }
            });
        }
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

    _renderParamsContent(el) {
        if (!this._embedded) {
            // Connection section
            const connRow = document.createElement('div');
            connRow.className = 'cv-mb-md';
            el.appendChild(connRow);

            const connLabel = document.createElement('label');
            connLabel.className = 'cv-dash-section-title';
            connLabel.textContent = 'Connection';
            connRow.appendChild(connLabel);

            const connStatus = document.createElement('div');
            connStatus.className = 'cv-dash-detail';
            connRow.appendChild(connStatus);
            this._statusBadge = new uiBadge({ label: 'Disconnected', color: 'gray', size: 'sm', parent: connStatus });

            // Parameter inputs
            this._inputs.courseCode = new uiInput({
                template: 'inline-label', label: 'Course Code',
                value: this.courseCode, size: 'sm', parent: el
            });

            this._inputs.year = new uiInput({
                template: 'inline-label', label: 'Year',
                value: String(this.year), inputType: 'number', size: 'sm', parent: el
            });
        }

        // Thresholds subsection
        const threshTitle = document.createElement('div');
        threshTitle.className = 'cv-dash-section-title cv-mt-md';
        threshTitle.textContent = 'Thresholds';
        el.appendChild(threshTitle);

        this._inputs.zAlert = new uiInput({
            template: 'inline-label', label: 'Alert z-threshold',
            value: String(this.riskConfig.zAlertThreshold), size: 'sm', parent: el
        });

        this._inputs.highZ = new uiInput({
            template: 'inline-label', label: 'High-perf z-threshold',
            value: String(this.riskConfig.highZThreshold), size: 'sm', parent: el
        });

        // Analyze button
        const btnWrap = document.createElement('div');
        btnWrap.className = 'cv-mt-md';
        el.appendChild(btnWrap);

        new uiButton({
            label: this._embedded ? 'Re-analyze' : 'Analyze', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => this._loadData()
        });
    }

    _getInputValue(uiInputInstance) {
        const inputEl = uiInputInstance.el.querySelector('input') || uiInputInstance.el;
        return inputEl.value;
    }

    _readParams() {
        this.courseCode = this._getInputValue(this._inputs.courseCode);
        this.year = parseInt(this._getInputValue(this._inputs.year), 10);
        this.riskConfig.zAlertThreshold = parseFloat(this._getInputValue(this._inputs.zAlert));
        this.riskConfig.highZThreshold = parseFloat(this._getInputValue(this._inputs.highZ));
    }

    // ── Empty Stage ─────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        new uiAlert({
            color: 'info',
            title: 'Student Risk Analysis',
            message: 'Set course parameters and click Analyze to fetch live data and run risk categorization.',
            parent: this._stageEl
        });
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    _showLoading(msg) {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';
        var el = document.createElement('div');
        el.className = 'as-loading-center';
        el.innerHTML = '<i class="fas fa-spinner fa-spin as-loading-icon"></i><div class="as-loading-text">' + (msg || 'Loading...') + '</div><div class="cv-load-sub as-loading-sub">Connecting</div>';
        this._stageEl.appendChild(el);
        this._loadingSubEl = el.querySelector('.cv-load-sub');
    }

    _updateLoadingStatus(text) {
        if (this._loadingSubEl && this._loadingSubEl.parentNode) this._loadingSubEl.textContent = text;
    }

    async _loadData(skipReadParams = false) {
        if (!skipReadParams) this._readParams();
        this._showLoading('Loading Risk Assessment...');

        try {
            // Step 1: Authenticate
            this._setStatus('Authenticating...', 'warning');
            this._updateLoadingStatus('Authenticating...');
            await this._authenticate();
            this._setStatus('Connected', 'success');

            // Step 2: Fetch course results
            this._setStatus('Loading course results...', 'warning');
            this._updateLoadingStatus('Fetching course results...');
            var courseApiParams = { courseCode: this.courseCode, year: this.year };
            if (this._studentNumberFilter) courseApiParams.studentNumber = this._studentNumberFilter;
            const courseData = await this._apiCall('getCourseResults', courseApiParams);
            const courseResults = this._parseResponse(courseData);
            if (!courseResults || courseResults.length === 0) {
                throw new Error('No course results returned');
            }

            // Step 3: Fetch assessment results
            this._setStatus('Loading assessments...', 'warning');
            this._updateLoadingStatus('Fetching assessments...');
            const assessData = await this._apiCall('getAssessmentResults', {
                courseCode: this.courseCode, year: this.year
            });
            const assessResults = this._parseResponse(assessData);

            // Step 4: Fetch student bio data
            this._setStatus('Loading student data...', 'warning');
            this._updateLoadingStatus('Loading student data (' + courseResults.length + ' students)...');
            const studentNumbers = [...new Set(courseResults.map(r => r.studentNumber))];
            const bioIndex = await this._fetchBioData(studentNumbers);

            // Step 5: Compute per-assessment stats (mean, SD) + z-score analysis
            this._setStatus('Analyzing...', 'warning');
            this._updateLoadingStatus('Computing risk scores...');
            const assessStats = this._computeAssessmentStats(assessResults);
            const assessStatsIndex = {};
            assessStats.forEach(s => assessStatsIndex[s.code] = s);

            // Step 6: Pivot assessments by student
            const assessmentsByStudent = this._pivotAssessments(assessResults);

            // Step 7: Level 1 — per-assessment z-scores, count negative & positive alerts
            const { zAlertThreshold, highZThreshold } = this.riskConfig;
            const students = courseResults.map(cr => {
                const stNo = cr.studentNumber;
                const bio = bioIndex[stNo] || {};
                const assessments = assessmentsByStudent[stNo] || {};
                const mark = parseFloat(cr.result || cr.mark || cr.finalMark || 0);

                const negAlerts = [];
                const posAlerts = [];
                const zScores = {};
                for (const [code, result] of Object.entries(assessments)) {
                    const stat = assessStatsIndex[code];
                    if (!stat || stat.stdDev === 0) continue;
                    const z = (result - stat.mean) / stat.stdDev;
                    zScores[code] = Math.round(z * 100) / 100;
                    if (z < zAlertThreshold) {
                        negAlerts.push({ code, result, z: zScores[code] });
                    }
                    if (z > highZThreshold) {
                        posAlerts.push({ code, result, z: zScores[code] });
                    }
                }

                return {
                    studentNumber: stNo,
                    firstName: bio.firstName || bio.firstNames || '',
                    lastName: bio.lastName || bio.surname || bio.lastNames || '',
                    email: bio.email || '',
                    avgMark: mark,
                    negAlerts, posAlerts,
                    negCount: negAlerts.length,
                    posCount: posAlerts.length,
                    zScores,
                    ...assessments
                };
            });

            // Step 8: Level 2 — z-score on alert counts themselves
            const negCounts = students.map(s => s.negCount);
            const posCounts = students.map(s => s.posCount);
            const negMean = this._mean(negCounts);
            const negSD = this._stdDev(negCounts);
            const posMean = this._mean(posCounts);
            const posSD = this._stdDev(posCounts);

            students.forEach(s => {
                s.negAlertZ = negSD > 0 ? Math.round(100 * (s.negCount - negMean) / negSD) / 100 : 0;
                s.posAlertZ = posSD > 0 ? Math.round(100 * (s.posCount - posMean) / posSD) / 100 : 0;

                // Categorize: high neg-alert z → at-risk, high pos-alert z → high-performing
                if (s.negAlertZ > highZThreshold) {
                    s.category = 'at-risk';
                } else if (s.posAlertZ > highZThreshold) {
                    s.category = 'high-performing';
                } else {
                    s.category = 'average';
                }
            });

            // Step 9: Split + summarize
            const analysis = {
                atRisk: students.filter(s => s.category === 'at-risk'),
                average: students.filter(s => s.category === 'average'),
                highPerforming: students.filter(s => s.category === 'high-performing'),
                students
            };

            const marks = students.map(s => s.avgMark).filter(m => m > 0);
            const r = (v) => Math.round(v * 10) / 10;
            analysis.summary = {
                totalStudents: students.length,
                atRiskCount: analysis.atRisk.length,
                atRiskRate: students.length > 0 ? r(100 * analysis.atRisk.length / students.length) : 0,
                highPerformingCount: analysis.highPerforming.length,
                highPerformingRate: students.length > 0 ? r(100 * analysis.highPerforming.length / students.length) : 0,
                averageCount: analysis.average.length,
                classMean: marks.length > 0 ? r(this._mean(marks)) : 0,
                classStdDev: marks.length > 0 ? r(this._stdDev(marks)) : 0,
                negAlertMean: r(negMean), negAlertSD: r(negSD),
                posAlertMean: r(posMean), posAlertSD: r(posSD),
                zAlertThreshold, highZThreshold
            };

            // Step 10: Render results + rebuild accordion with histograms
            this._renderResults(analysis, assessStats);
            this._rebuildAccordionWithVariables(students, assessStats);
            this._setStatus('Done', 'success');

        } catch (err) {
            this._setStatus(`Error: ${err.message}`, 'danger');
            new uiAlert({
                color: 'danger',
                title: 'Analysis Failed',
                message: err.message,
                parent: this._stageEl
            });
        }
    }

    // ── API Methods ─────────────────────────────────────────────────────────

    async _authenticate() {
        // Reuse global rig session if available
        if (window.AS_SESSION?.ready) {
            this.sessionId = window.AS_SESSION.sessionId;
            this.logToken = window.AS_SESSION.logToken;
            return;
        }
        const creds = window.AS_CREDENTIALS?.api?.sessionBypass || {};
        const data = await this._apiCall('logIn', { userId: creds.userId, pwd: creds.password });

        if (data && data.status !== false) {
            this.sessionId = data.sessionId || data.session_id;
            this.logToken = data.logToken || data.log_token;
            return;
        }

        throw new Error(data?.error || 'Authentication failed');
    }

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

    // ── Response Parsing (mirrors InstApiTestSuite) ─────────────────────────

    _parseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;

        if (data.fields && Array.isArray(data.data)) {
            return this._fieldsDataToRecords(data.fields, data.data);
        }
        if (data.results && data.results.fields && Array.isArray(data.results.data)) {
            return this._fieldsDataToRecords(data.results.fields, data.results.data);
        }
        if (Array.isArray(data.results)) return data.results;

        const wrapKeys = ['students', 'registrations', 'courseInfo', 'assessmentResults',
            'courseResults', 'studentBioData', 'courseMeta', 'courseCounts'];
        for (const key of wrapKeys) {
            if (data[key]) {
                const inner = data[key];
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data)) {
                    return this._fieldsDataToRecords(inner.fields, inner.data);
                }
            }
        }

        if (typeof data === 'object' && !Array.isArray(data)) return [data];
        return null;
    }

    _fieldsDataToRecords(fields, data) {
        const normalized = fields.map(f =>
            f === f.toUpperCase() && f.length > 1
                ? f.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())
                : f
        );
        return data.map(row => {
            const record = {};
            normalized.forEach((field, i) => { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }

    // ── Bio Data Fetching ───────────────────────────────────────────────────

    async _fetchBioData(studentNumbers) {
        const index = {};
        // Batch in groups of 20 to avoid overloading
        const batchSize = 20;
        for (let i = 0; i < studentNumbers.length; i += batchSize) {
            const batch = studentNumbers.slice(i, i + batchSize);
            const promises = batch.map(sn =>
                this._apiCall('getStudentBioData', { studentNumber: sn })
                    .then(d => {
                        const records = this._parseResponse(d);
                        if (records && records.length > 0) index[sn] = records[0];
                    })
                    .catch(() => {}) // Skip failed lookups
            );
            await Promise.all(promises);
        }
        return index;
    }

    // ── Assessment Pivot ────────────────────────────────────────────────────

    _pivotAssessments(assessResults) {
        const byStudent = {};
        if (!assessResults) return byStudent;

        assessResults.forEach(row => {
            const sn = row.studentNumber;
            const code = row.assessmentCode || row.assessment_code || row.assessCode;
            const result = parseFloat(row.result || row.mark || 0);
            if (!sn || !code) return;

            if (!byStudent[sn]) byStudent[sn] = {};
            byStudent[sn][code] = result;
        });
        return byStudent;
    }

    // ── Assessment Stats ────────────────────────────────────────────────────

    _computeAssessmentStats(assessResults) {
        if (!assessResults || assessResults.length === 0) return [];

        const byCode = {};
        assessResults.forEach(row => {
            const code = row.assessmentCode || row.assessment_code || row.assessCode;
            const result = parseFloat(row.result || row.mark || 0);
            if (!code || isNaN(result) || result === 0) return;

            if (!byCode[code]) byCode[code] = [];
            byCode[code].push(result);
        });

        return Object.entries(byCode).map(([code, marks]) => {
            const mean = marks.reduce((a, b) => a + b, 0) / marks.length;
            const variance = marks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / marks.length;
            const passCount = marks.filter(m => m >= this.riskConfig.passThreshold).length;

            return {
                code,
                count: marks.length,
                mean: Math.round(mean * 10) / 10,
                stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
                min: Math.min(...marks),
                max: Math.max(...marks),
                passRate: Math.round(100 * passCount / marks.length)
            };
        }).sort((a, b) => a.code.localeCompare(b.code));
    }

    // ── Math Helpers ────────────────────────────────────────────────────────

    _mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    _stdDev(arr) {
        if (arr.length < 2) return 0;
        const mean = this._mean(arr);
        return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length);
    }

    // ── Variable Histograms ─────────────────────────────────────────────────

    _rebuildAccordionWithVariables(students, assessStats) {
        // Collect variables: avgMark + each assessment + alert counts
        const variables = [];

        // Average mark
        const avgMarks = students.map(s => s.avgMark).filter(m => m > 0);
        if (avgMarks.length > 0) {
            variables.push({
                key: 'v_avgMark', label: 'Avg Mark',
                values: avgMarks,
                mean: this._mean(avgMarks),
                stdDev: this._stdDev(avgMarks)
            });
        }

        // Per-assessment distributions
        for (const stat of assessStats) {
            const vals = students.map(s => s[stat.code]).filter(v => v !== undefined && v > 0);
            if (vals.length > 0) {
                variables.push({
                    key: `v_${stat.code}`, label: stat.code,
                    values: vals,
                    mean: stat.mean,
                    stdDev: stat.stdDev
                });
            }
        }

        // Negative alert counts
        const negCounts = students.map(s => s.negCount);
        variables.push({
            key: 'v_negAlerts', label: 'Neg Alerts',
            values: negCounts,
            mean: this._mean(negCounts),
            stdDev: this._stdDev(negCounts)
        });

        // Positive alert counts
        const posCounts = students.map(s => s.posCount);
        variables.push({
            key: 'v_posAlerts', label: 'Pos Alerts',
            values: posCounts,
            mean: this._mean(posCounts),
            stdDev: this._stdDev(posCounts)
        });

        // Rebuild accordion with all panes
        this._buildAccordion(variables);
    }

    _renderHistogram(container, values, mean, stdDev) {
        if (!values || values.length === 0) return;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.min(12, Math.max(5, Math.ceil(Math.sqrt(values.length))));
        const n = values.length;

        container.innerHTML = '';

        // Plotly chart container — fills available width
        const chartDiv = document.createElement('div');
        container.appendChild(chartDiv);

        const traces = [];

        // Histogram trace
        traces.push({
            x: values,
            type: 'histogram',
            marker: { color: 'var(--ui-primary-400)', opacity: 0.65 },
            nbinsx: binCount,
            name: 'Count'
        });

        // Normal distribution curve overlay
        if (stdDev > 0 && n > 1) {
            var binWidth = (max - min) / binCount;
            var curveX = [];
            var curveY = [];
            var nPoints = 60;
            var rangeMin = Math.max(min - stdDev, mean - 3.5 * stdDev);
            var rangeMax = Math.min(max + stdDev, mean + 3.5 * stdDev);
            var step = (rangeMax - rangeMin) / nPoints;
            for (var i = 0; i <= nPoints; i++) {
                var x = rangeMin + i * step;
                var z = (x - mean) / stdDev;
                var pdf = Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI));
                curveX.push(x);
                curveY.push(pdf * n * binWidth); // Scale to histogram counts
            }
            traces.push({
                x: curveX,
                y: curveY,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'var(--ui-danger)', width: 2, shape: 'spline' },
                name: 'Normal',
                hoverinfo: 'skip'
            });
        }

        const shapes = [];

        // Mean vertical line
        if (mean !== undefined && mean >= min && mean <= max) {
            shapes.push({
                type: 'line', x0: mean, x1: mean, y0: 0, y1: 1, yref: 'paper',
                line: { color: 'var(--ui-danger)', width: 1.5, dash: 'dash' }
            });
        }

        // ±1σ shading
        if (stdDev > 0) {
            shapes.push({
                type: 'rect', x0: mean - stdDev, x1: mean + stdDev, y0: 0, y1: 1, yref: 'paper',
                fillcolor: 'rgba(239,68,68,0.08)', line: { width: 0 }
            });
        }

        Plotly.newPlot(chartDiv, traces, {
            shapes: shapes,
            margin: { t: 5, r: 5, b: 25, l: 30 },
            autosize: true,
            height: 150,
            xaxis: { title: false, fixedrange: true },
            yaxis: { title: false, fixedrange: true },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { size: 9, color: 'var(--ui-gray-500)' },
            showlegend: false,
            bargap: 0.05
        }, { displayModeBar: false, responsive: true });

        // Stats row below histogram
        const stats = document.createElement('div');
        stats.className = 'cv-flex-row cv-flex-wrap cv-gap-sm as-histogram-stats';
        const r = v => Math.round(v * 10) / 10;
        stats.innerHTML = [
            `n=${n}`,
            `\u03BC=${r(mean)}`,
            `\u03C3=${r(stdDev)}`,
            `min=${r(min)}`,
            `max=${r(max)}`
        ].map(s => `<span>${s}</span>`).join('');
        container.appendChild(stats);
    }

    // ── Status Badge ────────────────────────────────────────────────────────

    _setStatus(label, color) {
        if (this._statusBadge) {
            this._statusBadge.update({ label, color });
        }
    }

    // ── Results Rendering ───────────────────────────────────────────────────

    _renderResults(analysis, assessStats) {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage-scroll';

        const { summary } = analysis;
        this._allStudents = analysis.students;
        this._assessStats = assessStats;

        // Summary badges row
        const badgeRow = document.createElement('div');
        badgeRow.className = 'as-kpi-row as-kpi-row-bordered';
        this._stageEl.appendChild(badgeRow);

        this._bindKPIs(badgeRow, [
            { code: 'total', value: String(summary.totalStudents), label: 'Total', icon: 'fas fa-users', color: 'var(--ui-primary)' },
            { code: 'atRisk', value: `${summary.atRiskCount} (${summary.atRiskRate}%)`, label: 'At Risk', icon: 'fas fa-exclamation-triangle', color: 'var(--ui-danger)' },
            { code: 'average', value: String(summary.averageCount), label: 'Average', icon: 'fas fa-minus-circle', color: 'var(--ui-info)' },
            { code: 'highPerf', value: `${summary.highPerformingCount} (${summary.highPerformingRate}%)`, label: 'High Perf', icon: 'fas fa-arrow-up', color: 'var(--ui-success)' },
            { code: 'mean', value: `${summary.classMean}%`, label: 'Mean', icon: 'fas fa-chart-line', color: 'var(--ui-secondary)' },
            { code: 'zThresh', value: `${summary.zAlertThreshold} / +${summary.highZThreshold}`, label: 'z thresholds', icon: 'fas fa-ruler-horizontal', color: 'var(--ui-gray-500)' }
        ]);

        // Two-column layout: cards (2fr) | email form (1fr)
        const columns = document.createElement('div');
        columns.className = 'as-risk-columns';
        this._stageEl.appendChild(columns);

        // Left column: filter tabs + search + paginated cards
        const cardCol = document.createElement('div');
        cardCol.className = 'as-risk-col-cards';
        columns.appendChild(cardCol);

        this._renderCardColumn(cardCol, analysis);

        // Right column: messaging panel (only if messenger is bound)
        if (this._messagesService) {
            const emailCol = document.createElement('div');
            emailCol.className = 'as-risk-col-email';
            columns.appendChild(emailCol);
            this._renderEmailColumn(emailCol);
            this._msgPanel.setEntities(analysis.students);
        }
    }

    // ── Card Column ─────────────────────────────────────────────────────────

    _renderCardColumn(container, analysis) {
        // Filter tabs
        const filterRow = document.createElement('div');
        filterRow.className = 'as-risk-filter-row';
        container.appendChild(filterRow);

        this._activeFilter = 'all';
        const filters = [
            { key: 'all', label: `All (${analysis.students.length})` },
            { key: 'at-risk', label: `At Risk (${analysis.atRisk.length})`, color: 'danger' },
            { key: 'average', label: `Average (${analysis.average.length})`, color: 'info' },
            { key: 'high-performing', label: `High Perf (${analysis.highPerforming.length})`, color: 'success' }
        ];

        this._filterBadges = {};
        filters.forEach(f => {
            const badge = new uiBadge({
                label: f.label, color: f.key === 'all' ? 'primary' : (f.color || 'gray'),
                size: 'sm', parent: filterRow
            });
            badge.el.classList.add('as-risk-filter-badge');
            if (f.key !== 'all') badge.el.classList.add('as-risk-filter-inactive');
            badge.el.addEventListener('click', () => this._setFilter(f.key));
            this._filterBadges[f.key] = badge;
        });

        // Search input
        const searchRow = document.createElement('div');
        searchRow.className = 'as-risk-search-row';
        container.appendChild(searchRow);

        this._searchInput = new uiInput({
            template: 'inline-label', label: 'Search', placeholder: 'Name or student ID...',
            size: 'sm', parent: searchRow
        });
        const searchEl = this._searchInput.el.querySelector('input') || this._searchInput.el;
        searchEl.addEventListener('input', () => this._applyFilterAndSearch());

        // Scrollable card list
        this._cardList = document.createElement('div');
        this._cardList.className = 'as-risk-card-list';
        container.appendChild(this._cardList);

        // Pagination footer
        const pageRow = document.createElement('div');
        pageRow.className = 'as-risk-page-row';
        container.appendChild(pageRow);

        this._pageSize = 10;
        this._currentPage = 0;
        this._filteredStudents = [...this._allStudents];

        this._prevBtn = document.createElement('button');
        this._prevBtn.className = 'ui-btn ui-btn-ghost ui-btn-xs';
        this._prevBtn.textContent = 'Prev';
        this._prevBtn.addEventListener('click', () => { this._currentPage--; this._renderCards(); });
        pageRow.appendChild(this._prevBtn);

        this._pageLabel = document.createElement('span');
        this._pageLabel.className = 'as-risk-page-label';
        pageRow.appendChild(this._pageLabel);

        this._nextBtn = document.createElement('button');
        this._nextBtn.className = 'ui-btn ui-btn-ghost ui-btn-xs';
        this._nextBtn.textContent = 'Next';
        this._nextBtn.addEventListener('click', () => { this._currentPage++; this._renderCards(); });
        pageRow.appendChild(this._nextBtn);

        this._renderCards();
    }

    _setFilter(key) {
        this._activeFilter = key;
        Object.entries(this._filterBadges).forEach(([k, badge]) => {
            badge.el.classList.toggle('as-risk-filter-inactive', k !== key);
        });
        this._currentPage = 0;
        this._applyFilterAndSearch();
    }

    _applyFilterAndSearch() {
        const searchEl = this._searchInput.el.querySelector('input') || this._searchInput.el;
        const query = searchEl.value.toLowerCase().trim();

        this._filteredStudents = this._allStudents.filter(s => {
            // Category filter
            if (this._activeFilter !== 'all' && s.category !== this._activeFilter) return false;
            // Search filter
            if (query) {
                const name = `${s.firstName} ${s.lastName}`.toLowerCase();
                return name.includes(query) || String(s.studentNumber).includes(query);
            }
            return true;
        });

        this._currentPage = 0;
        this._renderCards();
    }

    _renderCards() {
        this._cardList.innerHTML = '';
        const total = this._filteredStudents.length;
        const totalPages = Math.max(1, Math.ceil(total / this._pageSize));
        this._currentPage = Math.max(0, Math.min(this._currentPage, totalPages - 1));

        const start = this._currentPage * this._pageSize;
        const page = this._filteredStudents.slice(start, start + this._pageSize);

        if (page.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'as-risk-empty';
            empty.textContent = 'No students match the filter.';
            this._cardList.appendChild(empty);
        }

        page.forEach(s => this._cardList.appendChild(this._buildStudentCard(s)));

        // Update pagination
        this._pageLabel.textContent = `${start + 1}–${Math.min(start + this._pageSize, total)} of ${total}`;
        this._prevBtn.disabled = this._currentPage === 0;
        this._nextBtn.disabled = this._currentPage >= totalPages - 1;
    }

    _buildStudentCard(student) {
        const avatarVariants = { 'at-risk': 'as-student-avatar-risk', 'average': 'as-student-avatar-average', 'high-performing': 'as-student-avatar-star' };
        const pillVariants = { 'at-risk': 'as-status-pill-risk', 'average': 'as-status-pill-good', 'high-performing': 'as-status-pill-star' };
        const pillLabels = { 'at-risk': 'Risk', 'average': 'Active', 'high-performing': 'Top' };
        const pillIcons = { 'at-risk': '<i class="fas fa-exclamation-triangle as-pill-icon-xs"></i> ', 'high-performing': '<i class="fas fa-trophy as-pill-icon-xs"></i> ' };

        const card = document.createElement('div');
        card.className = 'as-student-card';
        card.addEventListener('click', () => this._selectStudent(student, card));

        // Header: avatar + name + status pill
        const header = document.createElement('div');
        header.className = 'as-student-card-header';
        card.appendChild(header);

        const initials = ((student.firstName?.[0] || '') + (student.lastName?.[0] || '')).toUpperCase() || '?';
        const avatar = document.createElement('div');
        avatar.className = 'as-student-avatar ' + (avatarVariants[student.category] || 'as-student-avatar-average');
        avatar.textContent = initials;
        header.appendChild(avatar);

        const nameBlock = document.createElement('div');
        nameBlock.className = 'as-student-name-block';
        nameBlock.innerHTML =
            `<div class="as-student-name">${(`${student.firstName} ${student.lastName}`).trim() || student.studentNumber}</div>` +
            `<div class="as-student-id">${student.studentNumber}</div>`;
        header.appendChild(nameBlock);

        const pill = document.createElement('span');
        pill.className = 'as-status-pill ' + (pillVariants[student.category] || 'as-status-pill-good');
        pill.innerHTML = (pillIcons[student.category] || '') + (pillLabels[student.category] || student.category);
        header.appendChild(pill);

        // Stats row
        const statsRow = document.createElement('div');
        statsRow.className = 'as-student-stats';
        const avgClass = student.avgMark >= 50 ? 'as-risk-low' : 'as-risk-critical';
        statsRow.innerHTML =
            `<span>Avg: <strong class="${avgClass}">${student.avgMark}%</strong></span>` +
            (student.negCount > 0 ? `<span>Neg: <strong class="as-risk-critical">${student.negCount}</strong></span>` : '') +
            (student.posCount > 0 ? `<span>Pos: <strong class="as-risk-low">${student.posCount}</strong></span>` : '');
        card.appendChild(statsRow);

        // Progress bar
        const progress = document.createElement('div');
        progress.className = 'as-student-progress';
        const fillClass = student.avgMark >= 75 ? 'as-progress-high' : (student.avgMark >= 50 ? 'as-progress-mid' : 'as-progress-low');
        progress.innerHTML = `<div class="as-student-progress-fill ${fillClass}" style="width:${Math.min(student.avgMark, 100)}%"></div>`;
        card.appendChild(progress);

        // Assessment z-score badges
        const assessRow = document.createElement('div');
        assessRow.className = 'as-risk-assess-row';
        card.appendChild(assessRow);

        for (const [code, z] of Object.entries(student.zScores)) {
            const mark = student[code] !== undefined ? student[code] : '\u2014';
            const color = z < this.riskConfig.zAlertThreshold ? 'danger' : z > this.riskConfig.highZThreshold ? 'success' : 'gray';
            new uiBadge({ label: `${code}: ${mark} (z ${z})`, color, size: 'xs', parent: assessRow });
        }

        return card;
    }

    _selectStudent(student, cardEl) {
        // Highlight selected card
        if (this._selectedCardEl) {
            this._selectedCardEl.classList.remove('as-student-card-selected');
        }
        this._selectedCardEl = cardEl;
        cardEl.classList.add('as-student-card-selected');

        this._selectedStudent = student;
        if (this._msgPanel) this._msgPanel.setEntity(student);
    }

    // ── Email Column ────────────────────────────────────────────────────────

    _renderEmailColumn(container) {
        this._msgPanel = this._messagesService.renderMessagingPanel(container, this._msgConfig);
    }

    _buildStudentVariables(student) {
        const name = `${student.firstName} ${student.lastName}`.trim();
        const assessmentDetails = Object.entries(student.zScores)
            .map(([code, z]) => `  ${code}: mark ${student[code] !== undefined ? student[code] : '—'}, z-score ${z}`)
            .join('\n');

        return {
            name, firstName: student.firstName, lastName: student.lastName,
            studentNumber: student.studentNumber,
            courseCode: this.courseCode, year: this.year,
            avgMark: student.avgMark, category: student.category,
            negCount: student.negCount, posCount: student.posCount,
            negAlertZ: student.negAlertZ, posAlertZ: student.posAlertZ,
            assessmentDetails
        };
    }

    // ── UIBinding Methods ────────────────────────────────────────────────────

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

        var self = this;
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

    _bindStudentCollection(container, students) {
        var miniPublome = new Publome({
            tables: [{ name: 'student', columns: {
                idx: { type: 'number', primaryKey: true },
                studentNumber: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                avgMark: { type: 'number' },
                category: { type: 'string' },
                negCount: { type: 'number' },
                posCount: { type: 'number' }
            }, labeller: '{firstName} {lastName}' }]
        });
        students.forEach(function(s, i) {
            miniPublome.table('student').create({
                idx: i + 1,
                studentNumber: s.studentNumber,
                firstName: s.firstName,
                lastName: s.lastName,
                avgMark: s.avgMark,
                category: s.category,
                negCount: s.negCount,
                posCount: s.posCount
            });
        });

        var binding = new UIBinding(miniPublome.table('student'), { publome: miniPublome });
        binding.bindCollection(container, {
            component: 'card',
            map: function(record) {
                var cat = record.get('category');
                var catColors = { 'at-risk': 'danger', 'average': 'info', 'high-performing': 'success' };
                return {
                    title: (record.get('firstName') + ' ' + record.get('lastName')).trim() || record.get('studentNumber'),
                    subtitle: record.get('studentNumber'),
                    badges: [
                        { label: cat, color: catColors[cat] || 'gray' },
                        { label: 'Avg: ' + record.get('avgMark') + '%', color: 'secondary' }
                    ]
                };
            }
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskAssessmentPanel;
}
if (typeof window !== 'undefined') {
    window.RiskAssessmentPanel = RiskAssessmentPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('RiskAssessmentPanel', RiskAssessmentPanel);
}
