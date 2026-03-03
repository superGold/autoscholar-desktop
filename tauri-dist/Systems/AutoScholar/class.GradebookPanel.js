/**
 * GradebookPanel - Assessment management & grade entry
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Self-contained demo data (28 SA students, 6 assessments), with grade grid
 * inline editing, per-assessment stats with SVG histograms, distribution
 * charts, final marks table, assessment CRUD, and CSV import.
 *
 * Usage:
 *   const panel = new GradebookPanel({ courseCode: 'COMP101' });
 *   panel.render(controlEl, stageEl);
 */
class GradebookPanel {

    // ── Static Data ─────────────────────────────────────────────────────────

    static DEMO_STUDENTS = [
        { id: '220101', name: 'Thabo', surname: 'Mokoena' },
        { id: '220102', name: 'Naledi', surname: 'Dlamini' },
        { id: '220103', name: 'Sipho', surname: 'Nkosi' },
        { id: '220104', name: 'Zanele', surname: 'Khumalo' },
        { id: '220105', name: 'Bongani', surname: 'Mthembu' },
        { id: '220106', name: 'Lindiwe', surname: 'Ngcobo' },
        { id: '220107', name: 'Mandla', surname: 'Zulu' },
        { id: '220108', name: 'Ayanda', surname: 'Mkhize' },
        { id: '220109', name: 'Nomvula', surname: 'Sithole' },
        { id: '220110', name: 'Sibusiso', surname: 'Ndlovu' },
        { id: '220111', name: 'Palesa', surname: 'Mahlangu' },
        { id: '220112', name: 'Kagiso', surname: 'Molefe' },
        { id: '220113', name: 'Dineo', surname: 'Maseko' },
        { id: '220114', name: 'Tshiamo', surname: 'Botha' },
        { id: '220115', name: 'Lerato', surname: 'Pretorius' },
        { id: '220116', name: 'Mpho', surname: 'Van der Merwe' },
        { id: '220117', name: 'Nompilo', surname: 'Shabalala' },
        { id: '220118', name: 'Lethabo', surname: 'Joubert' },
        { id: '220119', name: 'Keabetswe', surname: 'Tshabalala' },
        { id: '220120', name: 'Thandeka', surname: 'Radebe' },
        { id: '220121', name: 'Amahle', surname: 'Mbeki' },
        { id: '220122', name: 'Siyabonga', surname: 'Vilakazi' },
        { id: '220123', name: 'Nokuthula', surname: 'Cele' },
        { id: '220124', name: 'Lwazi', surname: 'Phiri' },
        { id: '220125', name: 'Busisiwe', surname: 'Ntuli' },
        { id: '220126', name: 'Thulani', surname: 'Mabaso' },
        { id: '220127', name: 'Refilwe', surname: 'Motaung' },
        { id: '220128', name: 'Andile', surname: 'Govender' }
    ];

    static DEMO_ASSESSMENTS = [
        { code: 'T1',  name: 'Test 1',        weight: 15, maxMark: 50,  date: '2025-03-15', type: 'test' },
        { code: 'T2',  name: 'Test 2',        weight: 15, maxMark: 50,  date: '2025-05-10', type: 'test' },
        { code: 'A1',  name: 'Assignment 1',  weight: 10, maxMark: 100, date: '2025-04-01', type: 'assignment' },
        { code: 'A2',  name: 'Assignment 2',  weight: 10, maxMark: 100, date: '2025-06-01', type: 'assignment' },
        { code: 'P1',  name: 'Practical',     weight: 10, maxMark: 40,  date: '2025-07-15', type: 'practical' },
        { code: 'EX',  name: 'Exam',          weight: 40, maxMark: 100, date: '2025-10-25', type: 'exam' }
    ];

    static GRADE_SCALE = [
        { grade: 'A', min: 75, max: 100, color: 'var(--ui-success)', label: 'Distinction' },
        { grade: 'B', min: 60, max: 74,  color: 'var(--ui-info)', label: 'Merit' },
        { grade: 'C', min: 50, max: 59,  color: 'var(--ui-warning)', label: 'Pass' },
        { grade: 'D', min: 40, max: 49,  color: 'var(--ui-warning)', label: 'Supplementary' },
        { grade: 'F', min: 0,  max: 39,  color: 'var(--ui-danger)', label: 'Fail' }
    ];

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._embedded = !!config.embedded;
        this.courseCode = config.courseCode || 'COMP101';
        this.year = config.year || 2025;
        this.endpoint = config.endpoint || '/api-proxy';
        this.passThreshold = config.passThreshold || 50;

        this._students = [];
        this._assessments = [];
        this._grades = new Map(); // key: "studentId|assessCode" → { mark, pct }
        this._dataLoaded = false;

        // Auth
        this.sessionId = null;
        this.logToken = null;

        // Bus
        this._bus = null;
        this._busKey = 'gradebook';

        // UI refs
        this._controlEl = null;
        this._stageEl = null;
        this._accordion = null;
        this._inputs = {};
        this._statusBadge = null;
    }

    // ── Service Bindings ─────────────────────────────────────────────────────

    setPublome(publome) {
        this._publome = publome;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    connectBus(bus) {
        this._bus = bus;
        bus.on('load', params => this.load(params));
        return this;
    }

    async load(params = {}) {
        if (params.courseCode !== undefined) this.courseCode = params.courseCode;
        if (params.year !== undefined) this.year = parseInt(params.year, 10);
        if (params.studentNumber !== undefined) this._studentNumberFilter = params.studentNumber;
        // Clear stale data before reload
        this._students = [];
        this._assessments = [];
        this._grades = new Map();
        this._dataLoaded = false;
        if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'loading' });
        try {
            await this._loadFromAPI();
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'done' });
        } catch (err) {
            if (this._bus) this._bus.emit('panelStatus', { key: this._busKey, status: 'error', detail: err.message });
        }
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildAccordion();
        this._renderEmptyStage();
    }

    // ── Control Accordion ───────────────────────────────────────────────────

    _buildAccordion() {
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
            assessments: { label: '<i class="fas fa-clipboard-list" style="margin-right:0.3rem;"></i>Assessments' },
            stats: { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Quick Stats' }
        };

        const accordion = new uiAccordion({
            exclusive: true,
            content,
            parent: el
        });
        this._accordion = accordion;

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsPane(paramsEl);

        this._assessEl = accordion.el.querySelector('.ui-accordion-item[data-key="assessments"] .ui-accordion-content');
        this._renderAssessmentsPane(this._assessEl);

        this._statsEl = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        this._renderStatsPane(this._statsEl);
    }

    _renderParamsPane(el) {
        el.innerHTML = '';

        if (!this._embedded) {
            // Connection status
            var connRow = document.createElement('div');
            connRow.className = 'cv-mb-sm';
            el.appendChild(connRow);
            var connLabel = document.createElement('label');
            connLabel.className = 'as-ctrl-label';
            connLabel.style.opacity = '0.6';
            connLabel.textContent = 'Connection';
            connRow.appendChild(connLabel);
            var ready = window.AS_SESSION && window.AS_SESSION.ready;
            this._statusBadge = new uiBadge({ label: ready ? 'Connected' : 'Disconnected', color: ready ? 'success' : 'gray', size: 'sm', parent: connRow });

            // Course badge
            const courseRow = document.createElement('div');
            courseRow.className = 'cv-mb-sm cv-mt-sm';
            el.appendChild(courseRow);
            new uiBadge({ label: this.courseCode, color: 'primary', size: 'sm', parent: courseRow });
            const yearSpan = document.createElement('span');
            yearSpan.className = 'gb-year-span';
            yearSpan.textContent = String(this.year);
            courseRow.appendChild(yearSpan);
        }

        // Pass mark input
        this._inputs.passMark = new uiInput({
            template: 'inline-label', label: 'Pass Mark',
            value: String(this.passThreshold), inputType: 'number', size: 'sm', parent: el
        });

        if (!this._embedded) {
            // Load API Data button (primary)
            const apiBtnWrap = document.createElement('div');
            apiBtnWrap.style.marginTop = '0.75rem';
            el.appendChild(apiBtnWrap);

            new uiButton({
                label: 'Load API Data', variant: 'primary', size: 'sm', parent: apiBtnWrap,
                icon: '<i class="fas fa-cloud-download-alt"></i>',
                onClick: () => this._loadFromAPI()
            });
        }

        // Load Demo Data button (secondary)
        const btnWrap = document.createElement('div');
        btnWrap.style.marginTop = '0.4rem';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Demo Data', variant: 'ghost', size: 'sm', parent: btnWrap,
            icon: '<i class="fas fa-database"></i>',
            onClick: () => {
                this._seedDemoData();
                this._renderDashboard();
                this._renderAssessmentsPane(this._assessEl);
                this._renderStatsPane(this._statsEl);
            }
        });

        // CSV Import button
        const importWrap = document.createElement('div');
        importWrap.style.marginTop = '0.4rem';
        el.appendChild(importWrap);

        new uiButton({
            label: 'Import CSV', variant: 'ghost', size: 'sm', parent: importWrap,
            icon: '<i class="fas fa-file-csv"></i>',
            onClick: () => this._renderImportUI()
        });
    }

    _renderAssessmentsPane(el) {
        if (!el) return;
        el.innerHTML = '';

        if (this._assessments.length === 0) {
            el.innerHTML = '<div style="font-size:0.65rem;color:rgba(255,255,255,0.4);padding:0.25rem 0;">No assessments loaded</div>';
            return;
        }

        this._assessments.forEach(a => {
            const row = document.createElement('div');
            row.className = 'as-hover-row-subtle';
            row.className += ' gb-assess-row';
            row.innerHTML = `
                <span style="font-size:0.65rem;font-weight:600;color:rgba(255,255,255,0.8);min-width:2rem;">${a.code}</span>
                <span style="font-size:0.6rem;color:rgba(255,255,255,0.5);flex:1;">${a.name}</span>
                <span style="font-size:0.55rem;color:rgba(255,255,255,0.4);">${a.weight}%</span>
            `;

            // Edit on click
            row.addEventListener('click', () => this._showEditAssessmentForm(a.code));
            el.appendChild(row);
        });

        // Add button
        const addWrap = document.createElement('div');
        addWrap.className = 'cv-mt-sm';
        el.appendChild(addWrap);
        new uiButton({
            label: 'Add Assessment', variant: 'ghost', size: 'xs', parent: addWrap,
            icon: '<i class="fas fa-plus"></i>',
            onClick: () => this._showAddAssessmentForm()
        });
    }

    _renderStatsPane(el) {
        if (!el) return;
        el.innerHTML = '';

        if (!this._dataLoaded) {
            el.innerHTML = '<div style="font-size:0.65rem;color:rgba(255,255,255,0.4);padding:0.25rem 0;">Load data to see stats</div>';
            return;
        }

        // Overall quick stats
        const n = this._students.length;
        const finals = this._students.map(s => this._computeWeightedFinal(s.id));
        const mean = this._mean(finals);
        const passCount = finals.filter(f => f >= this.passThreshold).length;
        const passRate = n > 0 ? this._r(100 * passCount / n) : 0;

        const statsHtml = `
            <div style="font-size:0.65rem;color:rgba(255,255,255,0.6);line-height:1.8;">
                <div>Students: <strong style="color:rgba(255,255,255,0.9);">${n}</strong></div>
                <div>Assessments: <strong style="color:rgba(255,255,255,0.9);">${this._assessments.length}</strong></div>
                <div>Mean: <strong style="color:rgba(255,255,255,0.9);">${this._r(mean)}%</strong></div>
                <div>SD: <strong style="color:rgba(255,255,255,0.9);">${this._r(this._stdDev(finals))}%</strong></div>
                <div>Pass Rate: <strong style="color:${passRate >= 60 ? 'var(--ui-success)' : 'var(--ui-danger)'};">${passRate}%</strong></div>
            </div>
        `;
        el.innerHTML = statsHtml;
    }

    // ── Demo Data ───────────────────────────────────────────────────────────

    _seedDemoData() {
        this._students = [...GradebookPanel.DEMO_STUDENTS];
        this._assessments = GradebookPanel.DEMO_ASSESSMENTS.map(a => ({ ...a }));
        this._grades = new Map();

        // Per-student baseline (correlated marks across assessments)
        const baselines = {};
        this._students.forEach(s => {
            baselines[s.id] = this._generateNormalMark(57, 12, 20, 95);
        });

        // Generate marks for each student x assessment
        this._students.forEach(s => {
            const base = baselines[s.id];
            this._assessments.forEach(a => {
                const noise = this._generateNormalMark(0, 8, -25, 25);
                const pct = Math.max(5, Math.min(100, Math.round(base + noise)));
                const mark = Math.round((pct / 100) * a.maxMark);
                this._grades.set(`${s.id}|${a.code}`, { mark, pct });
            });
        });

        this._dataLoaded = true;

        // Read pass threshold from input
        const pmInput = this._inputs.passMark;
        if (pmInput) {
            const inputEl = pmInput.el.querySelector('input');
            if (inputEl) {
                const v = parseInt(inputEl.value, 10);
                if (!isNaN(v) && v > 0 && v <= 100) this.passThreshold = v;
            }
        }
    }

    _generateNormalMark(mean, sd, min, max) {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(min, Math.min(max, mean + z * sd));
    }

    // ── API Loading ──────────────────────────────────────────────────────────

    _showLoading(msg) {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';
        var el = document.createElement('div');
        el.className = 'as-loading-state';
        el.innerHTML = '<i class="fas fa-spinner fa-spin"></i><div class="as-loading-state-text">' + (msg || 'Loading...') + '</div><div class="cv-load-sub" style="font-size:0.65rem;margin-top:0.3rem;color:var(--ui-gray-300);">Connecting</div>';
        this._stageEl.appendChild(el);
        this._loadingSubEl = el.querySelector('.cv-load-sub');
    }

    _updateLoadingStatus(text) {
        if (this._loadingSubEl && this._loadingSubEl.parentNode) this._loadingSubEl.textContent = text;
    }

    async _loadFromAPI() {
        if (!this._stageEl) return;
        this._showLoading('Loading Gradebook...');
        this._setStatus('Authenticating...', 'warning');

        try {
            this._updateLoadingStatus('Authenticating...');
            await this._authenticate();
            this._setStatus('Connected', 'success');

            // Fetch course results (student marks)
            this._setStatus('Loading results...', 'warning');
            this._updateLoadingStatus('Fetching course results...');
            var courseApiParams = { courseCode: this.courseCode, year: this.year };
            if (this._studentNumberFilter) courseApiParams.studentNumber = this._studentNumberFilter;
            var courseData = await this._apiCall('getCourseResults', courseApiParams);
            var courseResults = this._gbParseResponse(courseData);
            if (!courseResults || courseResults.length === 0) throw new Error('No course results');

            // Fetch assessment results (per-assessment marks)
            this._setStatus('Loading assessments...', 'warning');
            this._updateLoadingStatus('Fetching assessments...');
            var assessData = await this._apiCall('getAssessmentResults', {
                courseCode: this.courseCode, year: this.year
            });
            var assessResults = this._gbParseResponse(assessData) || [];

            // Fetch student bio data (batched)
            this._setStatus('Loading student data...', 'warning');
            this._updateLoadingStatus('Loading student data (' + courseResults.length + ' students)...');
            var studentNumbers = [...new Set(courseResults.map(r => r.studentNumber))];
            var bioIndex = await this._fetchBioData(studentNumbers);

            // Build students list
            this._students = courseResults.map(cr => {
                var sn = cr.studentNumber;
                var bio = bioIndex[sn] || {};
                return {
                    id: String(sn),
                    name: bio.firstName || bio.firstNames || '',
                    surname: bio.lastName || bio.surname || bio.lastNames || '',
                    resultCode: (cr.resultCode || cr.result_code || '').toString().toUpperCase(),
                    itsStatus: PassRateCalculator.classifyStudentResult(cr)
                };
            });
            this._students.sort((a, b) => (a.surname || '').localeCompare(b.surname || ''));

            // Build assessments from unique assessment codes
            var assessMap = {};
            assessResults.forEach(r => {
                var code = r.assessmentCode || r.assessment_code || r.assessCode;
                if (!code) return;
                if (!assessMap[code]) {
                    var maxMark = parseFloat(r.maxMark || r.max_mark || r.totalMark || 100);
                    assessMap[code] = { code: code, name: code, weight: 0, maxMark: maxMark, date: '', type: 'assessment' };
                }
            });
            this._assessments = Object.values(assessMap);

            // Auto-compute weights (equal distribution if not provided)
            if (this._assessments.length > 0) {
                var weightEach = Math.round(100 / this._assessments.length);
                this._assessments.forEach((a, i) => {
                    a.weight = i === this._assessments.length - 1 ? (100 - weightEach * (this._assessments.length - 1)) : weightEach;
                });
            }

            // Build grades map
            this._grades = new Map();
            assessResults.forEach(r => {
                var sn = String(r.studentNumber || r.student_number);
                var code = r.assessmentCode || r.assessment_code || r.assessCode;
                if (!sn || !code) return;
                var mark = parseFloat(r.mark || r.result || 0);
                var maxMark = parseFloat(r.maxMark || r.max_mark || r.totalMark || 100);
                var pct = maxMark > 0 ? Math.round((mark / maxMark) * 100) : 0;
                this._grades.set(sn + '|' + code, { mark: Math.round(mark), pct: pct });
            });

            this._dataLoaded = true;
            this._setStatus('Connected', 'success');
            this._renderDashboard();
            this._renderAssessmentsPane(this._assessEl);
            this._renderStatsPane(this._statsEl);

        } catch (err) {
            this._setStatus('Error: ' + err.message, 'danger');
            new uiAlert({
                color: 'danger',
                title: 'Gradebook Load Failed', message: err.message,
                parent: this._stageEl
            });
        }
    }

    async _authenticate() {
        if (window.AS_SESSION && window.AS_SESSION.ready) {
            this.sessionId = window.AS_SESSION.sessionId;
            this.logToken = window.AS_SESSION.logToken;
            return;
        }
        var creds = (window.AS_CREDENTIALS && window.AS_CREDENTIALS.api && window.AS_CREDENTIALS.api.sessionBypass) || {};
        if (!creds.userId) throw new Error('No credentials');
        var data = await this._apiCall('logIn', { userId: creds.userId, pwd: creds.password });
        if (data && data.status !== false && (data.sessionId || data.session_id)) {
            this.sessionId = data.sessionId || data.session_id;
            this.logToken = data.logToken || data.log_token;
            return;
        }
        throw new Error(data && data.error ? data.error : 'Auth failed');
    }

    async _apiCall(action, params) {
        var body = { action: action };
        var keys = Object.keys(params || {});
        for (var i = 0; i < keys.length; i++) body[keys[i]] = params[keys[i]];
        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.logToken) body.logToken = this.logToken;
        var response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
            throw new Error('Session expired');
        }
        return data;
    }

    async _fetchBioData(studentNumbers) {
        var index = {};
        var batchSize = 20;
        var self = this;
        for (var i = 0; i < studentNumbers.length; i += batchSize) {
            var batch = studentNumbers.slice(i, i + batchSize);
            var promises = batch.map(sn =>
                self._apiCall('getStudentBioData', { studentNumber: sn })
                    .then(d => {
                        var records = self._gbParseResponse(d);
                        if (records && records.length > 0) index[sn] = records[0];
                    })
                    .catch(() => {})
            );
            await Promise.all(promises);
        }
        return index;
    }

    _gbParseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;
        if (data.fields && Array.isArray(data.data)) return this._gbFieldsToRecords(data.fields, data.data);
        if (data.results && data.results.fields && Array.isArray(data.results.data)) return this._gbFieldsToRecords(data.results.fields, data.results.data);
        if (Array.isArray(data.results)) return data.results;
        var wrapKeys = ['students', 'registrations', 'courseResults', 'assessmentResults', 'studentBioData'];
        for (var i = 0; i < wrapKeys.length; i++) {
            var inner = data[wrapKeys[i]];
            if (inner) {
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data)) return this._gbFieldsToRecords(inner.fields, inner.data);
            }
        }
        if (typeof data === 'object' && !Array.isArray(data)) return [data];
        return null;
    }

    _gbFieldsToRecords(fields, data) {
        var normalized = fields.map(f => {
            return f === f.toUpperCase() && f.length > 1
                ? f.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())
                : f;
        });
        return data.map(row => {
            var record = {};
            normalized.forEach((field, i) => { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }

    _setStatus(label, color) {
        if (this._statusBadge) this._statusBadge.update({ label: label, color: color });
    }

    // ── Stage: Empty ────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        new uiAlert({
            color: 'info',
            title: 'Gradebook',
            message: 'Click Analyse All to load gradebook data from the API, or use Load Demo Data / Import CSV from the sidebar.',
            parent: this._stageEl
        });

        // Welcome KPI placeholders
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        kpiRow.style.marginTop = '1rem';
        this._stageEl.appendChild(kpiRow);

        [
            { icon: 'fa-users', label: 'Students', value: '—' },
            { icon: 'fa-clipboard-list', label: 'Assessments', value: '—' },
            { icon: 'fa-percentage', label: 'Pass Rate', value: '—' }
        ].forEach(c => {
            const card = document.createElement('div');
            card.className = 'gb-kpi-card';
            card.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.35rem;margin-bottom:0.25rem;">
                    <i class="fas ${c.icon}" style="color:var(--ui-gray-400);font-size:0.8rem;"></i>
                    <span style="font-size:0.65rem;color:var(--ui-gray-500);">${c.label}</span>
                </div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--ui-gray-400);">${c.value}</div>
            `;
            kpiRow.appendChild(card);
        });
    }

    // ── Stage: Dashboard ────────────────────────────────────────────────────

    _renderDashboard() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage-scroll';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-inner';
        this._stageEl.appendChild(wrap);

        // Header
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML = `
            <span style="background:var(--ui-primary-900);color:white;padding:0.2rem 0.6rem;border-radius:4px;font-weight:700;font-size:0.9rem;">${this.courseCode}</span>
            <span style="font-size:0.8rem;color:var(--ui-gray-500);">${this.year} | ${this._students.length} students | ${this._assessments.length} assessments</span>
        `;
        wrap.appendChild(header);

        // KPI cards
        this._renderKPICards(wrap);

        // Tabs
        const tabWrap = document.createElement('div');
        wrap.appendChild(tabWrap);
        const contentWrap = document.createElement('div');
        wrap.appendChild(contentWrap);

        const tabs = new uiTabs({
            parent: tabWrap,
            tabs: [
                { label: 'Grade Grid', icon: '<i class="fas fa-th"></i>' },
                { label: 'Assessment Stats', icon: '<i class="fas fa-chart-bar"></i>' },
                { label: 'Distribution', icon: '<i class="fas fa-chart-area"></i>' },
                { label: 'Final Marks', icon: '<i class="fas fa-list-ol"></i>' }
            ]
        });

        const renderTab = (index) => {
            contentWrap.innerHTML = '';
            switch (index) {
                case 0: this._renderGradeGrid(contentWrap); break;
                case 1: this._renderAssessmentStats(contentWrap); break;
                case 2: this._renderDistribution(contentWrap); break;
                case 3: this._renderFinalMarks(contentWrap); break;
            }
        };

        tabs.bus.on('tab-changed', ({ index }) => renderTab(index));
        renderTab(0);
    }

    _renderKPICards(container) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        container.appendChild(row);

        const n = this._students.length;
        const finals = this._students.map(s => this._computeWeightedFinal(s.id));
        const mean = this._mean(finals);
        const sd = this._stdDev(finals);
        const passCount = finals.filter(f => f >= this.passThreshold).length;
        const passRate = n > 0 ? this._r(100 * passCount / n) : 0;
        const atRisk = finals.filter(f => f < this.passThreshold).length;
        const prColor = passRate >= 80 ? 'var(--ui-success)' : passRate >= 70 ? 'var(--ui-info)' : passRate >= 60 ? 'var(--ui-warning)' : 'var(--ui-danger)';

        this._bindKPIs(row, [
            { code: 'students', value: String(n), label: 'Students', icon: 'fas fa-users', color: 'var(--ui-primary-900)' },
            { code: 'assessments', value: String(this._assessments.length), label: 'Assessments', icon: 'fas fa-clipboard-list', color: 'var(--ui-secondary)' },
            { code: 'classMean', value: `${this._r(mean)}%`, label: 'Class Mean', icon: 'fas fa-chart-line', color: 'var(--ui-info)' },
            { code: 'passRate', value: `${passRate}%`, label: 'Pass Rate', icon: 'fas fa-percentage', color: prColor },
            { code: 'atRisk', value: String(atRisk), label: 'At Risk', icon: 'fas fa-exclamation-triangle', color: 'var(--ui-danger)' }
        ]);
    }

    // ── Tab 0: Grade Grid ───────────────────────────────────────────────────

    _renderGradeGrid(container) {
        const title = document.createElement('div');
        title.className = 'gb-section-title';
        title.textContent = 'Grade Grid';
        container.appendChild(title);

        const tableWrap = document.createElement('div');
        tableWrap.className = 'gb-grid-scroll';
        container.appendChild(tableWrap);

        const table = document.createElement('table');
        table.className = 'gb-grade-grid';

        // Header
        const thead = document.createElement('thead');
        let headerHtml = '<tr><th style="text-align:left;min-width:2.5rem;">#</th><th style="text-align:left;min-width:8rem;">Student</th>';
        this._assessments.forEach(a => {
            headerHtml += `<th title="${a.name} (${a.weight}%)">${a.code}<br><span style="font-weight:400;font-size:0.55rem;color:var(--ui-gray-400);">${a.weight}%</span></th>`;
        });
        headerHtml += '<th>Final</th><th>Grade</th></tr>';
        thead.innerHTML = headerHtml;
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        this._students.forEach((s, idx) => {
            const tr = document.createElement('tr');
            tr.dataset.studentId = s.id;

            let rowHtml = `<td style="text-align:left;font-size:0.6rem;color:var(--ui-gray-400);">${idx + 1}</td>`;
            const displayName = (s.surname || s.name) ? ((s.surname || '') + (s.surname && s.name ? ', ' : '') + (s.name || '')) : s.id;
            rowHtml += `<td style="text-align:left;white-space:nowrap;"><span style="font-weight:600;font-size:0.7rem;">${displayName}</span><br><span style="font-size:0.55rem;color:var(--ui-gray-400);">${s.id}</span></td>`;

            this._assessments.forEach(a => {
                const key = `${s.id}|${a.code}`;
                const entry = this._grades.get(key);
                const pct = entry ? entry.pct : '';
                const failCls = pct !== '' && pct < this.passThreshold ? ' gb-fail' : '';
                const distCls = pct !== '' && pct >= 75 ? ' gb-distinction' : '';
                rowHtml += `<td><span class="gb-grade-cell${failCls}${distCls}" data-student="${s.id}" data-assess="${a.code}">${pct !== '' ? pct : '—'}</span></td>`;
            });

            const final = this._computeWeightedFinal(s.id);
            const grade = this._getLetterGrade(final);
            const finalFail = final < this.passThreshold ? ' gb-fail' : '';
            const finalDist = final >= 75 ? ' gb-distinction' : '';
            rowHtml += `<td><strong class="${finalFail}${finalDist}" data-final="${s.id}">${this._r(final)}</strong></td>`;
            rowHtml += `<td><span style="font-weight:600;color:${this._getGradeColor(grade)};" data-grade="${s.id}">${grade}</span></td>`;

            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
        });

        // Summary row
        const summaryTr = document.createElement('tr');
        summaryTr.className = 'as-an-thead-row';
        summaryTr.style.fontWeight = '600';
        summaryTr.style.borderTop = '2px solid var(--ui-gray-300)';
        let summaryHtml = '<td></td><td style="text-align:left;font-size:0.7rem;">Average</td>';
        this._assessments.forEach(a => {
            const marks = this._getMarksForAssessment(a.code);
            const avg = marks.length > 0 ? this._r(this._mean(marks)) : '—';
            summaryHtml += `<td>${avg}</td>`;
        });
        const allFinals = this._students.map(s => this._computeWeightedFinal(s.id));
        const finalAvg = allFinals.length > 0 ? this._r(this._mean(allFinals)) : '—';
        summaryHtml += `<td>${finalAvg}</td><td></td>`;
        summaryTr.innerHTML = summaryHtml;
        tbody.appendChild(summaryTr);

        table.appendChild(tbody);
        tableWrap.appendChild(table);

        // Attach click handlers for inline editing
        tableWrap.querySelectorAll('.gb-grade-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                this._handleCellEdit(cell, cell.dataset.student, cell.dataset.assess);
            });
        });
    }

    _handleCellEdit(cell, studentId, assessCode) {
        if (cell.querySelector('input')) return; // already editing

        const assessment = this._assessments.find(a => a.code === assessCode);
        if (!assessment) return;

        const key = `${studentId}|${assessCode}`;
        const entry = this._grades.get(key);
        const currentPct = entry ? entry.pct : '';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '100';
        input.value = currentPct !== '' ? String(currentPct) : '';
        input.className = 'gb-inline-input';

        const originalText = cell.textContent;
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        input.select();

        const save = () => {
            const val = parseInt(input.value, 10);
            if (!isNaN(val) && val >= 0 && val <= 100) {
                const mark = Math.round((val / 100) * assessment.maxMark);
                this._grades.set(key, { mark, pct: val });
                cell.textContent = String(val);
                cell.className = 'gb-grade-cell' + (val < this.passThreshold ? ' gb-fail' : '') + (val >= 75 ? ' gb-distinction' : '');
                this._recalculateRow(studentId);
                this._renderStatsPane(this._statsEl);
            } else {
                cell.textContent = originalText;
            }
        };

        const cancel = () => {
            cell.textContent = originalText;
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.removeEventListener('blur', save); cancel(); }
        });
    }

    _recalculateRow(studentId) {
        const final = this._computeWeightedFinal(studentId);
        const grade = this._getLetterGrade(final);

        const finalEl = this._stageEl.querySelector(`[data-final="${studentId}"]`);
        if (finalEl) {
            finalEl.textContent = this._r(final);
            finalEl.className = (final < this.passThreshold ? 'gb-fail' : '') + (final >= 75 ? ' gb-distinction' : '');
        }

        const gradeEl = this._stageEl.querySelector(`[data-grade="${studentId}"]`);
        if (gradeEl) {
            gradeEl.textContent = grade;
            gradeEl.style.color = this._getGradeColor(grade);
        }
    }

    /**
     * Check if an assessment has at least one student with a non-zero mark.
     * Assessments where all students scored 0 (e.g. TM_3/TM_4 not yet graded)
     * should be excluded from weighted averages.
     */
    _isAssessmentActive(code) {
        for (const s of this._students) {
            const entry = this._grades.get(`${s.id}|${code}`);
            if (entry && entry.pct > 0) return true;
        }
        return false;
    }

    _computeWeightedFinal(studentId) {
        let totalWeight = 0;
        let weightedSum = 0;

        this._assessments.forEach(a => {
            if (!this._isAssessmentActive(a.code)) return; // skip inactive assessments
            const key = `${studentId}|${a.code}`;
            const entry = this._grades.get(key);
            if (entry) {
                weightedSum += entry.pct * a.weight;
                totalWeight += a.weight;
            }
        });

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    // ── Tab 1: Assessment Stats ─────────────────────────────────────────────

    _renderAssessmentStats(container) {
        const title = document.createElement('div');
        title.className = 'gb-section-title';
        title.textContent = 'Assessment Statistics';
        container.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'as-flex-row';
        grid.style.flexWrap = 'wrap';
        grid.style.gap = '0.75rem';
        container.appendChild(grid);

        this._assessments.forEach(a => {
            this._renderAssessmentCard(grid, a);
        });
    }

    _renderAssessmentCard(container, assessment) {
        const marks = this._getMarksForAssessment(assessment.code);
        const n = marks.length;
        const mean = n > 0 ? this._mean(marks) : 0;
        const sd = n > 0 ? this._stdDev(marks) : 0;
        const passCount = marks.filter(m => m >= this.passThreshold).length;
        const passRate = n > 0 ? this._r(100 * passCount / n) : 0;
        const min = n > 0 ? Math.min(...marks) : 0;
        const max = n > 0 ? Math.max(...marks) : 0;

        const card = document.createElement('div');
        card.className = 'gb-assess-card';
        card.className += ' gb-assess-card-size';

        // Header
        const headerHtml = `
            <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.5rem;">
                <span style="background:var(--ui-primary-900);color:white;padding:0.15rem 0.4rem;border-radius:3px;font-size:0.65rem;font-weight:700;">${assessment.code}</span>
                <span style="font-size:0.75rem;font-weight:600;color:var(--ui-gray-800);">${assessment.name}</span>
                <span style="font-size:0.55rem;color:var(--ui-gray-400);margin-left:auto;">${assessment.weight}% weight</span>
            </div>
        `;

        // Stats row
        const statsHtml = `
            <div style="display:flex;gap:0.75rem;font-size:0.65rem;color:var(--ui-gray-600);margin-bottom:0.5rem;flex-wrap:wrap;">
                <span>n=${n}</span>
                <span>\u03BC=${this._r(mean)}</span>
                <span>\u03C3=${this._r(sd)}</span>
                <span>Pass: ${passRate}%</span>
                <span>Min: ${this._r(min)}</span>
                <span>Max: ${this._r(max)}</span>
            </div>
        `;

        card.innerHTML = headerHtml + statsHtml;

        // Mini histogram
        const histContainer = document.createElement('div');
        card.appendChild(histContainer);
        this._renderMiniHistogram(histContainer, marks, mean, sd);

        container.appendChild(card);
    }

    _renderMiniHistogram(container, values, mean, sd) {
        if (!values || values.length === 0) return;

        const binCount = 10;
        const binWidth = 100 / binCount;
        const bins = Array(binCount).fill(0);
        values.forEach(v => {
            const idx = Math.min(Math.floor(v / binWidth), binCount - 1);
            bins[idx]++;
        });
        const maxBin = Math.max(...bins, 1);

        const svgW = 260, svgH = 70, padBottom = 16, padTop = 4, padLeft = 0;
        const chartH = svgH - padBottom - padTop;
        const barW = svgW / binCount;

        let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;height:auto;display:block;">`;

        bins.forEach((count, i) => {
            const barH = maxBin > 0 ? (count / maxBin) * chartH : 0;
            const x = padLeft + i * barW;
            const y = padTop + chartH - barH;

            const midPoint = i * binWidth + binWidth / 2;
            const fill = midPoint >= 75 ? 'var(--ui-success)' : midPoint >= 50 ? 'var(--ui-info)' : midPoint >= 40 ? 'var(--ui-warning)' : 'var(--ui-danger)';

            svg += `<rect x="${x + 0.5}" y="${y}" width="${barW - 1}" height="${barH}" fill="${fill}" opacity="0.7" rx="1"/>`;
            if (count > 0) {
                svg += `<text x="${x + barW / 2}" y="${y - 2}" font-size="7" fill="var(--ui-gray-500)" text-anchor="middle">${count}</text>`;
            }
        });

        // Axis
        const axisY = padTop + chartH;
        svg += `<line x1="0" y1="${axisY}" x2="${svgW}" y2="${axisY}" stroke="#e2e8f0" stroke-width="0.5"/>`;
        svg += `<text x="1" y="${svgH - 2}" font-size="7" fill="var(--ui-gray-400)">0</text>`;
        svg += `<text x="${svgW / 2}" y="${svgH - 2}" font-size="7" fill="var(--ui-gray-400)" text-anchor="middle">50</text>`;
        svg += `<text x="${svgW - 1}" y="${svgH - 2}" font-size="7" fill="var(--ui-gray-400)" text-anchor="end">100</text>`;

        // Mean line
        if (mean >= 0 && mean <= 100) {
            const meanX = (mean / 100) * svgW;
            svg += `<line x1="${meanX}" y1="${padTop}" x2="${meanX}" y2="${axisY}" stroke="var(--ui-primary-900)" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        }

        // Pass threshold line
        const threshX = (this.passThreshold / 100) * svgW;
        svg += `<line x1="${threshX}" y1="${padTop}" x2="${threshX}" y2="${axisY}" stroke="var(--ui-danger)" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/>`;

        svg += '</svg>';
        container.innerHTML = svg;
    }

    // ── Tab 2: Distribution ─────────────────────────────────────────────────

    _renderDistribution(container) {
        const title1 = document.createElement('div');
        title1.className = 'gb-section-title';
        title1.textContent = 'Grade Distribution';
        container.appendChild(title1);

        this._renderGradeBarChart(container);

        const title2 = document.createElement('div');
        title2.className = 'gb-section-title';
        title2.textContent = 'Mark Histogram';
        container.appendChild(title2);

        this._renderHistogramChart(container);
    }

    _renderGradeBarChart(container) {
        const finals = this._students.map(s => this._computeWeightedFinal(s.id));
        const dist = this._getGradeDistribution(finals);
        const n = finals.length;
        const gradeColors = { A: 'var(--ui-success)', B: 'var(--ui-info)', C: 'var(--ui-warning)', D: 'var(--ui-warning)', F: 'var(--ui-danger)' };

        const bar = document.createElement('div');
        bar.className = 'as-grade-bar';
        bar.style.height = '28px';
        bar.style.marginBottom = '0.4rem';

        Object.entries(dist).forEach(([grade, count]) => {
            const pct = n > 0 ? this._r(100 * count / n) : 0;
            if (pct > 0) {
                const seg = document.createElement('div');
                seg.style.cssText = `width:${pct}%;background:${gradeColors[grade]};display:flex;align-items:center;justify-content:center;transition:width 0.3s;`; // DYNAMIC: width/bg from data
                if (pct > 8) {
                    seg.innerHTML = `<span style="font-size:0.65rem;color:white;font-weight:600;">${grade} ${pct}%</span>`;
                }
                seg.title = `${grade}: ${count} students (${pct}%)`;
                bar.appendChild(seg);
            }
        });
        container.appendChild(bar);

        // Legend
        const labels = document.createElement('div');
        labels.className = 'as-grade-bar-labels';
        Object.entries(dist).forEach(([grade, count]) => {
            labels.innerHTML += `<span style="font-size:0.65rem;color:var(--ui-gray-600);">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${gradeColors[grade]};vertical-align:middle;margin-right:2px;"></span>
                ${grade}: ${count}
            </span>`;
        });
        container.appendChild(labels);
    }

    _renderHistogramChart(container) {
        const finals = this._students.map(s => this._computeWeightedFinal(s.id));
        const n = finals.length;
        if (n === 0) return;

        const mean = this._mean(finals);
        const sd = this._stdDev(finals);

        // 10 bins: 0-10, 10-20, ..., 90-100
        const binCount = 10;
        const binWidth = 100 / binCount;
        const bins = Array(binCount).fill(0);
        finals.forEach(v => {
            const idx = Math.min(Math.floor(v / binWidth), binCount - 1);
            bins[idx]++;
        });
        const maxCount = Math.max(...bins, 1);

        const W = 420, H = 200;
        const pad = { left: 35, right: 10, top: 10, bottom: 28 };
        const cW = W - pad.left - pad.right;
        const cH = H - pad.top - pad.bottom;
        const barW = cW / binCount;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:420px;height:auto;display:block;">`;

        // Bars
        bins.forEach((count, i) => {
            const barH = (count / maxCount) * cH;
            const x = pad.left + i * barW;
            const y = pad.top + cH - barH;
            const midPoint = i * binWidth + binWidth / 2;
            const fill = midPoint >= 75 ? 'var(--ui-success)' : midPoint >= 50 ? 'var(--ui-info)' : midPoint >= 40 ? 'var(--ui-warning)' : 'var(--ui-danger)';

            svg += `<rect x="${x + 1}" y="${y}" width="${barW - 2}" height="${barH}" fill="${fill}" opacity="0.7" rx="1"/>`;
            if (count > 0) {
                svg += `<text x="${x + barW / 2}" y="${y - 3}" font-size="8" fill="var(--ui-gray-500)" text-anchor="middle">${count}</text>`;
            }
        });

        // Normal curve overlay
        if (sd > 0) {
            const peakDensity = 1 / (sd * Math.sqrt(2 * Math.PI));
            const peakCount = peakDensity * n * binWidth;

            let curvePath = '';
            for (let x = 0; x <= 100; x += 1) {
                const density = Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
                const curveY = (density * n * binWidth / maxCount) * cH;
                const px = pad.left + (x / 100) * cW;
                const py = pad.top + cH - curveY;
                curvePath += (x === 0 ? 'M' : 'L') + `${px},${py}`;
            }
            svg += `<path d="${curvePath}" fill="none" stroke="var(--ui-primary-900)" stroke-width="1.5" opacity="0.6"/>`;
        }

        // Pass threshold line
        const threshX = pad.left + (this.passThreshold / 100) * cW;
        svg += `<line x1="${threshX}" y1="${pad.top}" x2="${threshX}" y2="${pad.top + cH}" stroke="var(--ui-danger)" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>`;
        svg += `<text x="${threshX + 3}" y="${pad.top + 10}" font-size="7" fill="var(--ui-danger)">Pass</text>`;

        // X-axis
        const axisY = pad.top + cH;
        svg += `<line x1="${pad.left}" y1="${axisY}" x2="${W - pad.right}" y2="${axisY}" stroke="#e2e8f0" stroke-width="0.5"/>`;
        for (let i = 0; i <= binCount; i += 2) {
            const label = i * binWidth;
            svg += `<text x="${pad.left + i * barW}" y="${H - 8}" font-size="8" fill="var(--ui-gray-400)" text-anchor="middle">${label}</text>`;
        }

        // Y-axis
        svg += `<text x="${pad.left - 4}" y="${axisY + 3}" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">0</text>`;
        svg += `<text x="${pad.left - 4}" y="${pad.top + 5}" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">${maxCount}</text>`;

        // Mean marker
        const meanX = pad.left + (mean / 100) * cW;
        svg += `<line x1="${meanX}" y1="${pad.top}" x2="${meanX}" y2="${axisY}" stroke="var(--ui-primary-900)" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        svg += `<text x="${meanX}" y="${pad.top - 2}" font-size="7" fill="var(--ui-primary-900)" text-anchor="middle">\u03BC=${this._r(mean)}</text>`;

        svg += '</svg>';

        const el = document.createElement('div');
        el.innerHTML = svg;
        container.appendChild(el);
    }

    // ── Tab 3: Final Marks ──────────────────────────────────────────────────

    _renderFinalMarks(container) {
        const title = document.createElement('div');
        title.className = 'gb-section-title';
        title.textContent = 'Final Marks (Ranked)';
        container.appendChild(title);

        // Build data sorted by final descending
        const tableData = this._students.map(s => {
            const row = {
                studentId: s.id,
                name: (s.surname || s.name) ? ((s.surname || '') + (s.surname && s.name ? ', ' : '') + (s.name || '')) : s.id
            };

            this._assessments.forEach(a => {
                const key = `${s.id}|${a.code}`;
                const entry = this._grades.get(key);
                row[a.code] = entry ? entry.pct : '';
            });

            row.final = this._r(this._computeWeightedFinal(s.id));
            row.grade = this._getLetterGrade(parseFloat(row.final));
            row.status = parseFloat(row.final) >= this.passThreshold ? 'Pass' : 'Fail';
            return row;
        }).sort((a, b) => parseFloat(b.final) - parseFloat(a.final));

        // Add rank
        tableData.forEach((r, i) => { r.rank = i + 1; });

        // Build columns
        const columns = [
            { key: 'rank', label: '#' },
            { key: 'studentId', label: 'ID' },
            { key: 'name', label: 'Student' }
        ];
        this._assessments.forEach(a => {
            columns.push({ key: a.code, label: a.code });
        });
        columns.push({ key: 'final', label: 'Final' });
        columns.push({ key: 'grade', label: 'Grade' });
        columns.push({ key: 'status', label: 'Status' });

        const tableWrap = document.createElement('div');
        container.appendChild(tableWrap);

        new uiTable({
            parent: tableWrap,
            columns,
            data: tableData,
            paging: true,
            searching: true,
            ordering: true,
            pageLength: 15,
            rowClass: (row) => {
                return parseFloat(row.final) >= this.passThreshold ? 'gb-final-pass' : 'gb-final-fail';
            }
        });
    }

    // ── Assessment CRUD ─────────────────────────────────────────────────────

    _showAddAssessmentForm() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        const title = document.createElement('div');
        title.className = 'gb-section-title';
        title.textContent = 'Add Assessment';
        this._stageEl.appendChild(title);

        const form = document.createElement('div');
        form.className = 'gb-form-narrow';
        this._stageEl.appendChild(form);

        const fields = {};
        const fieldDefs = [
            { key: 'code', label: 'Code', placeholder: 'e.g. T3', type: 'text' },
            { key: 'name', label: 'Name', placeholder: 'e.g. Test 3', type: 'text' },
            { key: 'weight', label: 'Weight (%)', placeholder: '10', type: 'number' },
            { key: 'maxMark', label: 'Max Mark', placeholder: '100', type: 'number' },
            { key: 'date', label: 'Date', placeholder: '2025-08-01', type: 'text' }
        ];

        fieldDefs.forEach(fd => {
            fields[fd.key] = new uiInput({
                template: 'inline-label',
                label: fd.label,
                placeholder: fd.placeholder,
                inputType: fd.type,
                size: 'sm',
                parent: form
            });
        });

        const btnWrap = document.createElement('div');
        btnWrap.className = 'cv-mt-md cv-flex-row cv-gap-md';
        form.appendChild(btnWrap);

        new uiButton({
            label: 'Save', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => {
                const code = this._getInputVal(fields.code);
                const name = this._getInputVal(fields.name);
                const weight = parseInt(this._getInputVal(fields.weight), 10);
                const maxMark = parseInt(this._getInputVal(fields.maxMark), 10);
                const date = this._getInputVal(fields.date) || '';

                if (!code || !name || isNaN(weight) || isNaN(maxMark)) return;
                if (this._assessments.find(a => a.code === code)) return;

                this._assessments.push({ code, name, weight, maxMark, date, type: 'custom' });

                // Generate random marks for all students
                this._students.forEach(s => {
                    const pct = Math.round(this._generateNormalMark(55, 15, 5, 100));
                    const mark = Math.round((pct / 100) * maxMark);
                    this._grades.set(`${s.id}|${code}`, { mark, pct });
                });

                this._renderAssessmentsPane(this._assessEl);
                this._renderStatsPane(this._statsEl);
                this._renderDashboard();
            }
        });

        new uiButton({
            label: 'Cancel', variant: 'ghost', size: 'sm', parent: btnWrap,
            onClick: () => this._renderDashboard()
        });
    }

    _showEditAssessmentForm(code) {
        const assess = this._assessments.find(a => a.code === code);
        if (!assess) return;

        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        const title = document.createElement('div');
        title.className = 'gb-section-title';
        title.textContent = `Edit Assessment: ${code}`;
        this._stageEl.appendChild(title);

        const form = document.createElement('div');
        form.className = 'gb-form-narrow';
        this._stageEl.appendChild(form);

        const fields = {};
        const fieldDefs = [
            { key: 'name', label: 'Name', value: assess.name, type: 'text' },
            { key: 'weight', label: 'Weight (%)', value: String(assess.weight), type: 'number' },
            { key: 'maxMark', label: 'Max Mark', value: String(assess.maxMark), type: 'number' },
            { key: 'date', label: 'Date', value: assess.date || '', type: 'text' }
        ];

        fieldDefs.forEach(fd => {
            fields[fd.key] = new uiInput({
                template: 'inline-label',
                label: fd.label,
                value: fd.value,
                inputType: fd.type,
                size: 'sm',
                parent: form
            });
        });

        const btnWrap = document.createElement('div');
        btnWrap.className = 'cv-mt-md cv-flex-row cv-gap-md';
        form.appendChild(btnWrap);

        new uiButton({
            label: 'Update', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => {
                const name = this._getInputVal(fields.name);
                const weight = parseInt(this._getInputVal(fields.weight), 10);
                const maxMark = parseInt(this._getInputVal(fields.maxMark), 10);
                const date = this._getInputVal(fields.date) || '';

                if (!name || isNaN(weight) || isNaN(maxMark)) return;

                assess.name = name;
                assess.weight = weight;
                assess.maxMark = maxMark;
                assess.date = date;

                this._renderAssessmentsPane(this._assessEl);
                this._renderStatsPane(this._statsEl);
                this._renderDashboard();
            }
        });

        new uiButton({
            label: 'Delete', variant: 'ghost', size: 'sm', parent: btnWrap,
            onClick: () => this._deleteAssessment(code)
        });

        new uiButton({
            label: 'Cancel', variant: 'ghost', size: 'sm', parent: btnWrap,
            onClick: () => this._renderDashboard()
        });
    }

    _deleteAssessment(code) {
        this._assessments = this._assessments.filter(a => a.code !== code);

        // Remove all grades for this assessment
        for (const key of this._grades.keys()) {
            if (key.endsWith(`|${code}`)) this._grades.delete(key);
        }

        this._renderAssessmentsPane(this._assessEl);
        this._renderStatsPane(this._statsEl);
        this._renderDashboard();
    }

    // ── CSV Import ──────────────────────────────────────────────────────────

    _renderImportUI() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        const title = document.createElement('div');
        title.className = 'gb-section-title';
        title.textContent = 'CSV Mark Import';
        this._stageEl.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'gb-import-desc';
        desc.textContent = 'Paste CSV data in the format: StudentID,AssessmentCode,Mark (one per line). Mark is the percentage (0-100).';
        this._stageEl.appendChild(desc);

        const textarea = document.createElement('textarea');
        textarea.className = 'gb-import-textarea';
        textarea.placeholder = '220101,T1,72\n220102,T1,65\n220103,T1,48\n...';
        this._stageEl.appendChild(textarea);

        const previewWrap = document.createElement('div');
        previewWrap.className = 'cv-mt-md';
        this._stageEl.appendChild(previewWrap);

        const btnWrap = document.createElement('div');
        btnWrap.className = 'cv-mt-md cv-flex-row cv-gap-md';
        this._stageEl.appendChild(btnWrap);

        new uiButton({
            label: 'Preview', variant: 'secondary', size: 'sm', parent: btnWrap,
            onClick: () => {
                const parsed = this._parseCSV(textarea.value);
                previewWrap.innerHTML = '';

                if (parsed.errors.length > 0) {
                    new uiAlert({
                        color: 'danger',
                        title: 'Parse Errors',
                        message: parsed.errors.join('\n'),
                        parent: previewWrap
                    });
                }

                if (parsed.rows.length > 0) {
                    const info = document.createElement('div');
                    info.className = 'gb-import-info';
                    info.textContent = `${parsed.rows.length} valid rows ready to import.`;
                    previewWrap.appendChild(info);
                }
            }
        });

        new uiButton({
            label: 'Import', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => {
                const parsed = this._parseCSV(textarea.value);
                if (parsed.rows.length > 0) {
                    this._applyImportedMarks(parsed);
                    this._renderStatsPane(this._statsEl);
                    this._renderDashboard();
                }
            }
        });

        new uiButton({
            label: 'Cancel', variant: 'ghost', size: 'sm', parent: btnWrap,
            onClick: () => {
                if (this._dataLoaded) this._renderDashboard();
                else this._renderEmptyStage();
            }
        });
    }

    _parseCSV(text) {
        const rows = [];
        const errors = [];

        text.split('\n').forEach((line, i) => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            const parts = line.split(',').map(s => s.trim());
            if (parts.length < 3) {
                errors.push(`Line ${i + 1}: expected 3 fields, got ${parts.length}`);
                return;
            }

            const studentId = parts[0];
            const assessCode = parts[1];
            const mark = parseFloat(parts[2]);

            if (!studentId) { errors.push(`Line ${i + 1}: missing student ID`); return; }
            if (!assessCode) { errors.push(`Line ${i + 1}: missing assessment code`); return; }
            if (isNaN(mark) || mark < 0 || mark > 100) { errors.push(`Line ${i + 1}: invalid mark "${parts[2]}"`); return; }

            rows.push({ studentId, assessCode, pct: Math.round(mark) });
        });

        return { rows, errors };
    }

    _applyImportedMarks(parsed) {
        parsed.rows.forEach(row => {
            const assessment = this._assessments.find(a => a.code === row.assessCode);
            if (!assessment) return;

            const student = this._students.find(s => s.id === row.studentId);
            if (!student) return;

            const mark = Math.round((row.pct / 100) * assessment.maxMark);
            this._grades.set(`${row.studentId}|${row.assessCode}`, { mark, pct: row.pct });
        });
    }

    // ── Utilities ────────────────────────────────────────────────────────────

    _getMarksForAssessment(code) {
        const marks = [];
        this._students.forEach(s => {
            const entry = this._grades.get(`${s.id}|${code}`);
            if (entry) marks.push(entry.pct);
        });
        return marks;
    }

    _getGradeDistribution(marks) {
        const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        marks.forEach(m => {
            const g = this._getLetterGrade(m);
            if (dist[g] !== undefined) dist[g]++;
        });
        return dist;
    }

    _getLetterGrade(mark) {
        if (mark >= 75) return 'A';
        if (mark >= 60) return 'B';
        if (mark >= 50) return 'C';
        if (mark >= 40) return 'D';
        return 'F';
    }

    _getGradeColor(grade) {
        const entry = GradebookPanel.GRADE_SCALE.find(g => g.grade === grade);
        return entry ? entry.color : 'var(--ui-gray-500)';
    }

    _getInputVal(inst) {
        if (!inst || !inst.el) return '';
        const inputEl = inst.el.querySelector('input');
        return inputEl ? inputEl.value.trim() : '';
    }

    _mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((s, v) => s + v, 0) / arr.length;
    }

    _stdDev(arr) {
        if (arr.length < 2) return 0;
        const m = this._mean(arr);
        const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
        return Math.sqrt(variance);
    }

    _percentile(sorted, p) {
        if (sorted.length === 0) return 0;
        const k = (p / 100) * (sorted.length - 1);
        const f = Math.floor(k);
        const c = Math.ceil(k);
        if (f === c) return sorted[f];
        return sorted[f] + (sorted[c] - sorted[f]) * (k - f);
    }

    _r(v) {
        return Math.round(v * 10) / 10;
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

    _bindGradebookView(container) {
        if (!this._dataLoaded) return;
        var n = this._students.length;
        var finals = this._students.map(s => this._computeWeightedFinal(s.id));
        var mean = this._mean(finals);
        var sd = this._stdDev(finals);
        var passCount = finals.filter(f => f >= this.passThreshold).length;

        var miniPublome = new Publome({
            tables: [{ name: 'gradebookSummary', columns: {
                idx: { type: 'number', primaryKey: true },
                courseCode: { type: 'string', label: 'Course' },
                year: { type: 'number', label: 'Year' },
                studentCount: { type: 'number', label: 'Students' },
                assessmentCount: { type: 'number', label: 'Assessments' },
                classMean: { type: 'number', label: 'Class Mean' },
                classSD: { type: 'number', label: 'Class SD' },
                passCount: { type: 'number', label: 'Pass Count' }
            }, labeller: '{courseCode} {year}' }]
        });
        miniPublome.table('gradebookSummary').create({
            idx: 1,
            courseCode: this.courseCode,
            year: this.year,
            studentCount: n,
            assessmentCount: this._assessments.length,
            classMean: this._r(mean),
            classSD: this._r(sd),
            passCount: passCount
        });
        miniPublome.table('gradebookSummary').select(1);

        var binding = new UIBinding(miniPublome.table('gradebookSummary'), { publome: miniPublome });
        binding.bindView(container, 'detail');
    }
}

// Export + register
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GradebookPanel;
}
if (typeof window !== 'undefined') {
    window.GradebookPanel = GradebookPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('GradebookPanel', GradebookPanel);
}
