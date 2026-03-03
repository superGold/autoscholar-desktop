/**
 * PeerCorrelationPanel - Cross-course correlation analysis
 *
 * Standalone analysis panel following the compound pattern (same as RiskAssessmentPanel).
 * Given a primary course, discovers peer courses taken by the same cohort,
 * builds a student × course marks matrix, computes Pearson R correlations,
 * and renders heatmaps, scatter plots, and detailed pair analysis.
 *
 * Usage:
 *   const panel = new PeerCorrelationPanel({ courseCode: 'MGAB401', year: 2020 });
 *   panel.render(controlEl, stageEl);
 */
class PeerCorrelationPanel {

    constructor(config = {}) {
        this._embedded = !!config.embedded;
        this.endpoint = config.endpoint || '/api-proxy';
        this.courseCode = config.courseCode || 'MGAB401';
        this.year = config.year || 2020;
        this.passThreshold = config.passThreshold || 50;
        this.minOverlap = config.minOverlap || 5; // Minimum shared students for a valid correlation

        // Auth state
        this.sessionId = null;
        this.logToken = null;

        // UI refs
        this._controlEl = null;
        this._stageEl = null;
        this._inputs = {};
        this._statusBadge = null;
        this._accordion = null;

        // Data state
        this._matrix = null;       // student × course marks
        this._courses = [];        // discovered course codes
        this._correlations = null; // correlation matrix
        this._primaryCode = null;
        this._selectedPair = null; // currently selected pair for scatter
        this._busKey = 'peerCorr';
    }

    // ── Publome / UIBinding ─────────────────────────────────────────────

    setPublome(publome) {
        this._publome = publome;
    }

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

    // ── Component API ──────────────────────────────────────────────────

    connectBus(bus) {
        this._bus = bus;
        bus.on('load', params => this.load(params));
        return this;
    }

    async load(params = {}) {
        if (params.courseCode !== undefined) this.courseCode = params.courseCode;
        if (params.year !== undefined) this.year = parseInt(params.year, 10);
        if (params.minOverlap !== undefined) this.minOverlap = parseInt(params.minOverlap, 10);
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
        if (controlEl) this._buildAccordion();
        if (stageEl) this._renderEmptyStage();
    }

    // ── Controls ────────────────────────────────────────────────────────────

    _buildAccordion(peerCourses = null) {
        if (!this._controlEl) return;
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true }
        };

        if (peerCourses && peerCourses.length > 0) {
            content.pairs = { label: '<i class="fas fa-project-diagram" style="margin-right:0.3rem;"></i>Course Pairs' };
            content.legend = { label: '<i class="fas fa-palette" style="margin-right:0.3rem;"></i>Interpretation' };
        }

        const accordion = new uiAccordion({
            exclusive: true,
            content,
            parent: el
        });
        this._accordion = accordion;

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsContent(paramsEl);

        if (peerCourses && peerCourses.length > 0) {
            const pairsEl = accordion.el.querySelector('.ui-accordion-item[data-key="pairs"] .ui-accordion-content');
            if (pairsEl) this._renderPairsList(pairsEl, peerCourses);

            const legendEl = accordion.el.querySelector('.ui-accordion-item[data-key="legend"] .ui-accordion-content');
            if (legendEl) this._renderLegend(legendEl);
        }
    }

    _renderParamsContent(el) {
        if (!this._embedded) {
            // Connection status
            const connRow = document.createElement('div');
            connRow.className = 'as-ctrl-row';
            el.appendChild(connRow);

            const connLabel = document.createElement('label');
            connLabel.className = 'as-ctrl-label';
            connLabel.style.display = 'block';
            connLabel.textContent = 'Connection';
            connRow.appendChild(connLabel);

            this._statusBadge = new uiBadge({ label: 'Disconnected', color: 'gray', size: 'sm', parent: connRow });

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

        this._inputs.minOverlap = new uiInput({
            template: 'inline-label', label: 'Min Students',
            value: String(this.minOverlap), inputType: 'number', size: 'sm', parent: el
        });

        // Analyze button
        const btnWrap = document.createElement('div');
        btnWrap.className = 'as-ctrl-row';
        el.appendChild(btnWrap);

        new uiButton({
            label: this._embedded ? 'Re-analyze' : 'Analyze', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => this._loadData()
        });
    }

    _renderPairsList(el, peerCourses) {
        el.innerHTML = '';
        const sorted = [...peerCourses].sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

        sorted.forEach(pc => {
            const row = document.createElement('div');
            row.className = 'as-hover-row-subtle';
            row.className += ' pc-pair-row';
            row.addEventListener('click', () => this._selectPair(this._primaryCode, pc.code));

            const colorDot = document.createElement('span');
            colorDot.className = 'pc-color-dot';
            colorDot.style.background = this._getCorrelationColor(pc.r);
            row.appendChild(colorDot);

            const label = document.createElement('span');
            label.className = 'pc-pair-label';
            label.textContent = pc.code;
            row.appendChild(label);

            const rVal = document.createElement('span');
            rVal.style.cssText = `font-size:0.7rem; font-weight:600; color:${this._getCorrelationColor(pc.r)};`; // DYNAMIC: color from correlation
            rVal.textContent = pc.r.toFixed(2);
            row.appendChild(rVal);

            const nVal = document.createElement('span');
            nVal.className = 'pc-pair-n';
            nVal.textContent = `n=${pc.n}`;
            row.appendChild(nVal);

            el.appendChild(row);
        });
    }

    _renderLegend(el) {
        el.innerHTML = '';
        const bands = [
            { range: '0.7 – 1.0', label: 'Strong positive', color: 'var(--ui-success)', desc: 'Students who do well in one course tend to do well in the other' },
            { range: '0.4 – 0.7', label: 'Moderate positive', color: 'var(--ui-info)', desc: 'Meaningful relationship; shared skills or prerequisites likely' },
            { range: '0.2 – 0.4', label: 'Weak positive', color: 'var(--ui-warning)', desc: 'Slight tendency; some shared factors' },
            { range: '−0.2 – 0.2', label: 'Negligible', color: 'var(--ui-gray-500)', desc: 'No meaningful linear relationship' },
            { range: '−0.4 – −0.2', label: 'Weak negative', color: 'var(--ui-warning)', desc: 'Slight inverse tendency' },
            { range: '< −0.4', label: 'Moderate–strong neg.', color: 'var(--ui-danger)', desc: 'Inverse relationship; competing demands likely' }
        ];

        bands.forEach(b => {
            const row = document.createElement('div');
            row.className = 'pc-legend-row';

            const dot = document.createElement('span');
            dot.className = 'pc-legend-dot';
            dot.style.background = b.color;
            row.appendChild(dot);

            const text = document.createElement('div');
            text.className = 'pc-legend-text';
            text.innerHTML = `<div style="font-size:0.68rem; color:rgba(255,255,255,0.8); font-weight:600;">${b.range} — ${b.label}</div>
                <div style="font-size:0.62rem; color:rgba(255,255,255,0.45);">${b.desc}</div>`;
            row.appendChild(text);

            el.appendChild(row);
        });
    }

    _getInputValue(uiInputInstance) {
        const inputEl = uiInputInstance.el.querySelector('input') || uiInputInstance.el;
        return inputEl.value;
    }

    _readParams() {
        this.courseCode = this._getInputValue(this._inputs.courseCode);
        this.year = parseInt(this._getInputValue(this._inputs.year), 10);
        this.minOverlap = parseInt(this._getInputValue(this._inputs.minOverlap), 10) || 5;
    }

    // ── Empty Stage ─────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        new uiAlert({
            color: 'info',
            title: 'Peer Correlation Analysis',
            message: 'Set the course code and year, then click Analyze to discover peer courses and compute cross-course correlations.',
            parent: this._stageEl
        });
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    async _loadData(skipReadParams = false) {
        if (!skipReadParams) this._readParams();
        this._primaryCode = this.courseCode;
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        try {
            // Step 1: Authenticate
            this._setStatus('Authenticating...', 'warning');
            await this._authenticate();
            this._setStatus('Connected', 'success');

            // Step 2: Fetch primary course results
            this._setStatus('Loading primary course...', 'warning');
            const courseApiParams = { courseCode: this.courseCode, year: this.year };
            if (this._studentNumberFilter) courseApiParams.studentNumber = this._studentNumberFilter;
            const primaryData = await this._apiCall('getCourseResults', courseApiParams);
            const primaryResults = this._parseResponse(primaryData);
            if (!primaryResults || primaryResults.length === 0) {
                throw new Error(`No results for ${this.courseCode} in ${this.year}`);
            }

            // Build primary marks index: studentNumber → mark
            const primaryIndex = {};
            const studentNumbers = [];
            primaryResults.forEach(r => {
                const sn = r.studentNumber;
                const mark = parseFloat(r.result || r.mark || r.finalMark || 0);
                if (sn && !isNaN(mark)) {
                    primaryIndex[sn] = mark;
                    studentNumbers.push(sn);
                }
            });

            // Step 3: Discover peer courses
            // Fetch ALL course results for these students in this year —
            // getCourseResults supports studentNumber arrays, returns courseCode per row
            this._setStatus('Discovering peer courses...', 'warning');
            const courseMarkIndex = { [this.courseCode]: primaryIndex };

            const BATCH = 50;
            const allPeerResults = [];
            for (let i = 0; i < studentNumbers.length; i += BATCH) {
                const batch = studentNumbers.slice(i, i + BATCH);
                this._setStatus(`Discovering courses (${Math.min(i + BATCH, studentNumbers.length)}/${studentNumbers.length} students)...`, 'warning');
                const data = await this._apiCall('getCourseResults', {
                    studentNumber: batch, year: this.year
                });
                const results = this._parseResponse(data);
                if (results) allPeerResults.push(...results);
            }

            // Group by courseCode → build marks index + count shared students
            const peerStudentSets = {};  // courseCode → Set<studentNumber>
            allPeerResults.forEach(r => {
                const code = r.courseCode || r.course_code || r.subjectCode;
                const sn = r.studentNumber;
                const mark = parseFloat(r.result || r.mark || r.finalMark || 0);
                if (!code || !sn || isNaN(mark)) return;
                if (code === this.courseCode) return; // skip primary

                if (!peerStudentSets[code]) peerStudentSets[code] = new Set();
                peerStudentSets[code].add(sn);

                if (!courseMarkIndex[code]) courseMarkIndex[code] = {};
                courseMarkIndex[code][sn] = mark;
            });

            // Keep only courses with enough shared students
            const qualifyingCodes = Object.keys(peerStudentSets)
                .filter(code => peerStudentSets[code].size >= this.minOverlap);

            if (qualifyingCodes.length === 0) {
                throw new Error(`No peer courses found with at least ${this.minOverlap} shared students.`);
            }

            // Prune non-qualifying courses from the index
            for (const code of Object.keys(courseMarkIndex)) {
                if (code !== this.courseCode && !qualifyingCodes.includes(code)) {
                    delete courseMarkIndex[code];
                }
            }

            // Step 5: Build correlation matrix
            this._setStatus('Computing correlations...', 'warning');
            const allCodes = Object.keys(courseMarkIndex);
            this._courses = allCodes;
            this._matrix = courseMarkIndex;

            // Compute pairwise correlations
            const correlations = {};
            for (const codeA of allCodes) {
                correlations[codeA] = {};
                for (const codeB of allCodes) {
                    if (codeA === codeB) {
                        correlations[codeA][codeB] = { r: 1, n: Object.keys(courseMarkIndex[codeA]).length, p: 0 };
                    } else {
                        const result = this._pearsonR(courseMarkIndex[codeA], courseMarkIndex[codeB]);
                        correlations[codeA][codeB] = result;
                    }
                }
            }
            this._correlations = correlations;

            // Build peer course list (correlations with primary)
            const peerCourseStats = allCodes
                .filter(c => c !== this.courseCode)
                .map(c => ({
                    code: c,
                    r: correlations[this.courseCode][c].r,
                    n: correlations[this.courseCode][c].n
                }))
                .filter(pc => pc.n >= this.minOverlap && !isNaN(pc.r))
                .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

            // Step 6: Render
            this._setStatus('Done', 'success');

            const analysis = {
                primaryCode: this.courseCode,
                year: this.year,
                primaryCount: studentNumbers.length,
                peerCourses: peerCourseStats,
                allCodes: [this.courseCode, ...peerCourseStats.map(p => p.code)],
                correlations,
                courseMarkIndex
            };

            this._renderResults(analysis);
            this._buildAccordion(peerCourseStats);

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
        const data = await response.json();
        if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
            throw new Error('Session expired');
        }
        return data;
    }

    // ── Response Parsing ────────────────────────────────────────────────────

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

    // ── Statistics ───────────────────────────────────────────────────────────

    _pearsonR(indexA, indexB) {
        // Find overlapping students
        const pairs = [];
        for (const sn of Object.keys(indexA)) {
            if (indexB[sn] !== undefined) {
                pairs.push([indexA[sn], indexB[sn]]);
            }
        }

        const n = pairs.length;
        if (n < 3) return { r: NaN, n, p: 1 };

        const xs = pairs.map(p => p[0]);
        const ys = pairs.map(p => p[1]);
        const meanX = this._mean(xs);
        const meanY = this._mean(ys);

        let sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (let i = 0; i < n; i++) {
            const dx = xs[i] - meanX;
            const dy = ys[i] - meanY;
            sumXY += dx * dy;
            sumX2 += dx * dx;
            sumY2 += dy * dy;
        }

        const denom = Math.sqrt(sumX2 * sumY2);
        if (denom === 0) return { r: 0, n, p: 1 };

        const r = sumXY / denom;

        // t-test for significance
        const t = r * Math.sqrt((n - 2) / (1 - r * r));
        // Approximate two-tailed p-value using t-distribution
        const p = this._tTestP(t, n - 2);

        return { r: Math.round(r * 1000) / 1000, n, p: Math.round(p * 10000) / 10000 };
    }

    _tTestP(t, df) {
        // Approximation of two-tailed p-value
        const x = df / (df + t * t);
        if (df <= 0) return 1;
        // Simple approximation using regularized incomplete beta function approx
        const absT = Math.abs(t);
        if (absT < 0.001) return 1;
        // Use normal approximation for large df
        if (df > 30) {
            const z = absT;
            const p = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
            return Math.min(1, 2 * p * (1 + z * z / 4));
        }
        // For small df, rough approximation
        const p = Math.pow(1 + t * t / df, -(df + 1) / 2);
        return Math.min(1, p * 2);
    }

    _linearRegression(pairs) {
        const n = pairs.length;
        if (n < 2) return { slope: 0, intercept: 0 };

        const xs = pairs.map(p => p[0]);
        const ys = pairs.map(p => p[1]);
        const meanX = this._mean(xs);
        const meanY = this._mean(ys);

        let sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumXY += (xs[i] - meanX) * (ys[i] - meanY);
            sumX2 += (xs[i] - meanX) * (xs[i] - meanX);
        }

        const slope = sumX2 > 0 ? sumXY / sumX2 : 0;
        const intercept = meanY - slope * meanX;
        return { slope, intercept };
    }

    _mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    _stdDev(arr) {
        if (arr.length < 2) return 0;
        const mean = this._mean(arr);
        return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length);
    }

    _r(v) { return Math.round(v * 10) / 10; }

    _sampleArray(arr, n) {
        if (n >= arr.length) return [...arr];
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, n);
    }

    // ── Status Badge ────────────────────────────────────────────────────────

    _setStatus(label, color) {
        if (this._statusBadge) {
            this._statusBadge.update({ label, color });
        }
    }

    // ── Color Helpers ───────────────────────────────────────────────────────

    _getCorrelationColor(r) {
        const abs = Math.abs(r);
        if (isNaN(r)) return 'var(--ui-gray-500)';
        if (r >= 0.7) return 'var(--ui-success)';
        if (r >= 0.4) return 'var(--ui-info)';
        if (r >= 0.2) return 'var(--ui-warning)';
        if (r >= -0.2) return 'var(--ui-gray-500)';
        if (r >= -0.4) return 'var(--ui-warning)';
        return 'var(--ui-danger)';
    }

    _getStrengthLabel(r) {
        const abs = Math.abs(r);
        if (isNaN(r)) return 'N/A';
        if (abs >= 0.7) return 'Strong';
        if (abs >= 0.4) return 'Moderate';
        if (abs >= 0.2) return 'Weak';
        return 'Negligible';
    }

    _getHeatmapBg(r) {
        if (isNaN(r)) return 'var(--ui-gray-50)';
        // Map r from -1..+1 to a color gradient
        // Negative: red shades, Zero: white, Positive: blue/green shades
        if (r >= 0.7) return 'rgba(5, 150, 105, 0.35)';
        if (r >= 0.4) return 'rgba(8, 145, 178, 0.25)';
        if (r >= 0.2) return 'rgba(8, 145, 178, 0.12)';
        if (r >= -0.2) return 'var(--ui-gray-50)';
        if (r >= -0.4) return 'rgba(217, 119, 6, 0.12)';
        return 'rgba(220, 38, 38, 0.2)';
    }

    // ── Master Renderer ─────────────────────────────────────────────────────

    _renderResults(analysis) {
        this._analysis = analysis;
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage-scroll';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-inner';
        this._stageEl.appendChild(wrap);

        this._renderKPICards(wrap, analysis);
        this._renderHeatmap(wrap, analysis);

        // Scatter plot area (clickable from heatmap or pair list)
        const scatterTitle = document.createElement('div');
        scatterTitle.className = 'pc-section-title';
        scatterTitle.textContent = 'Pair Scatter Plot';
        wrap.appendChild(scatterTitle);

        this._scatterContainer = document.createElement('div');
        this._scatterContainer.className = 'pc-scatter-wrap';
        wrap.appendChild(this._scatterContainer);

        // Show top pair by default
        if (analysis.peerCourses.length > 0) {
            this._renderScatterPlot(this._scatterContainer, analysis.primaryCode, analysis.peerCourses[0].code, analysis);
        } else {
            this._scatterContainer.innerHTML = '<div style="font-size:0.8rem; color:var(--ui-gray-400); padding:1rem;">No qualifying peer courses found.</div>';
        }

        this._renderPeerCards(wrap, analysis);
        this._renderCorrelationTable(wrap, analysis);
    }

    // ── KPI Cards ───────────────────────────────────────────────────────────

    _renderKPICards(container, analysis) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        container.appendChild(row);

        const top = analysis.peerCourses[0];
        const strongCount = analysis.peerCourses.filter(p => Math.abs(p.r) >= 0.7).length;
        const modCount = analysis.peerCourses.filter(p => Math.abs(p.r) >= 0.4 && Math.abs(p.r) < 0.7).length;

        const stats = [
            { icon: 'fa-book', label: 'Primary Course', value: analysis.primaryCode, color: 'var(--ui-primary-900)' },
            { icon: 'fa-users', label: 'Cohort Size', value: String(analysis.primaryCount), color: 'var(--ui-primary-900)' },
            { icon: 'fa-project-diagram', label: 'Peer Courses', value: String(analysis.peerCourses.length), color: 'var(--ui-secondary)' },
            { icon: 'fa-link', label: 'Strongest Peer', value: top ? `${top.code} (${top.r.toFixed(2)})` : '\u2014', color: top ? this._getCorrelationColor(top.r) : 'var(--ui-gray-500)' },
            { icon: 'fa-chart-bar', label: 'Strong / Moderate', value: `${strongCount} / ${modCount}`, color: 'var(--ui-success)' }
        ];

        this._bindKPIs(row, stats);
    }

    // ── Heatmap ─────────────────────────────────────────────────────────────

    _renderHeatmap(container, analysis) {
        const title = document.createElement('div');
        title.className = 'pc-section-title';
        title.textContent = 'Correlation Matrix';
        container.appendChild(title);

        const codes = analysis.allCodes;
        if (codes.length < 2) {
            container.appendChild(this._emptyNote('Not enough courses for a matrix.'));
            return;
        }

        // Limit heatmap to primary + top 10 peers to keep it readable
        const displayCodes = codes.slice(0, 11);

        const wrap = document.createElement('div');
        wrap.className = 'pc-heatmap-scroll';
        container.appendChild(wrap);

        const table = document.createElement('table');
        table.className = 'pc-heatmap-table';

        // Header row
        const thead = document.createElement('thead');
        let headerHtml = '<tr><th style="padding:0.3rem 0.4rem; background:var(--ui-gray-50);"></th>';
        displayCodes.forEach(code => {
            const isPrimary = code === analysis.primaryCode;
            headerHtml += `<th style="padding:0.3rem 0.4rem; text-align:center; background:var(--ui-gray-50); font-weight:${isPrimary ? '700' : '500'}; color:${isPrimary ? 'var(--ui-primary-900)' : 'var(--ui-gray-600)'}; writing-mode:vertical-lr; transform:rotate(180deg); height:4.5rem;">${code}</th>`;
        });
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;
        table.appendChild(thead);

        // Body rows
        const tbody = document.createElement('tbody');
        displayCodes.forEach(codeA => {
            const tr = document.createElement('tr');
            const isPrimaryRow = codeA === analysis.primaryCode;

            const th = document.createElement('th');
            th.style.cssText = `padding:0.3rem 0.5rem; text-align:left; font-size:0.68rem; white-space:nowrap; font-weight:${isPrimaryRow ? '700' : '500'}; color:${isPrimaryRow ? 'var(--ui-primary-900)' : 'var(--ui-gray-700)'};`; // DYNAMIC: weight/color conditional on primary row
            th.textContent = codeA;
            tr.appendChild(th);

            displayCodes.forEach(codeB => {
                const td = document.createElement('td');
                const corr = analysis.correlations[codeA]?.[codeB];

                if (codeA === codeB) {
                    td.className = 'pc-heatmap-td-diag';
                    td.textContent = '1.00';
                } else if (corr && !isNaN(corr.r) && corr.n >= this.minOverlap) {
                    td.style.cssText = `padding:0.3rem 0.4rem; text-align:center; background:${this._getHeatmapBg(corr.r)}; color:${this._getCorrelationColor(corr.r)}; font-weight:600; cursor:pointer; transition:transform 0.1s;`; // DYNAMIC: bg/color from correlation data
                    td.textContent = corr.r.toFixed(2);
                    td.title = `${codeA} vs ${codeB}: r=${corr.r.toFixed(3)}, n=${corr.n}`;
                    td.addEventListener('click', () => this._selectPair(codeA, codeB));
                    td.addEventListener('mouseenter', () => { td.style.transform = 'scale(1.15)'; td.style.zIndex = '1'; });
                    td.addEventListener('mouseleave', () => { td.style.transform = 'scale(1)'; td.style.zIndex = ''; });
                } else {
                    td.className = 'pc-heatmap-td-empty';
                    td.textContent = '\u2014';
                    td.title = corr ? `n=${corr.n} (below min)` : 'No data';
                }

                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
    }

    // ── Scatter Plot ────────────────────────────────────────────────────────

    _selectPair(codeA, codeB) {
        if (this._scatterContainer && this._analysis) {
            this._renderScatterPlot(this._scatterContainer, codeA, codeB, this._analysis);
        }
    }

    _renderScatterPlot(container, codeA, codeB, analysis) {
        container.innerHTML = '';

        const indexA = analysis.courseMarkIndex[codeA];
        const indexB = analysis.courseMarkIndex[codeB];
        if (!indexA || !indexB) {
            container.innerHTML = '<div style="font-size:0.8rem; color:var(--ui-gray-400);">No data for this pair.</div>';
            return;
        }

        // Build pairs
        const pairs = [];
        for (const sn of Object.keys(indexA)) {
            if (indexB[sn] !== undefined) {
                pairs.push([indexA[sn], indexB[sn]]);
            }
        }

        if (pairs.length < 3) {
            container.innerHTML = `<div style="font-size:0.8rem; color:var(--ui-gray-400);">Only ${pairs.length} shared students — not enough for scatter plot.</div>`;
            return;
        }

        const corr = analysis.correlations[codeA]?.[codeB] || { r: NaN, n: 0 };
        const reg = this._linearRegression(pairs);

        // Header
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.style.marginBottom = '0.5rem';

        const pairLabel = document.createElement('span');
        pairLabel.className = 'pc-scatter-pair-label';
        pairLabel.textContent = `${codeA} vs ${codeB}`;
        header.appendChild(pairLabel);

        const rBadge = document.createElement('span');
        const rColor = this._getCorrelationColor(corr.r);
        rBadge.style.cssText = `font-size:0.7rem; font-weight:600; color:${rColor}; background:${rColor}15; padding:0.15rem 0.4rem; border-radius:3px;`; // DYNAMIC: color from correlation
        rBadge.textContent = `r = ${isNaN(corr.r) ? 'N/A' : corr.r.toFixed(3)}`;
        header.appendChild(rBadge);

        const strengthBadge = document.createElement('span');
        strengthBadge.style.cssText = `font-size:0.65rem; color:${rColor}; padding:0.1rem 0.3rem;`; // DYNAMIC: color from correlation
        strengthBadge.textContent = `${this._getStrengthLabel(corr.r)} | n=${corr.n}`;
        header.appendChild(strengthBadge);

        container.appendChild(header);

        // SVG scatter
        const W = 400, H = 400;
        const pad = { left: 45, right: 15, top: 15, bottom: 40 };
        const cW = W - pad.left - pad.right;
        const cH = H - pad.top - pad.bottom;

        const toX = (v) => pad.left + (v / 100) * cW;
        const toY = (v) => pad.top + cH - (v / 100) * cH;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:400px; height:auto; display:block;">`;

        // Background
        svg += `<rect x="${pad.left}" y="${pad.top}" width="${cW}" height="${cH}" fill="#f8fafc"/>`;

        // Gridlines
        [0, 25, 50, 75, 100].forEach(v => {
            const y = toY(v);
            const x = toX(v);
            svg += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#e2e8f0" stroke-width="0.5"/>`;
            svg += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + cH}" stroke="#e2e8f0" stroke-width="0.5"/>`;
            svg += `<text x="${pad.left - 5}" y="${y + 3}" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">${v}</text>`;
            svg += `<text x="${x}" y="${H - pad.bottom + 14}" font-size="8" fill="var(--ui-gray-400)" text-anchor="middle">${v}</text>`;
        });

        // Pass threshold lines
        svg += `<line x1="${toX(50)}" y1="${pad.top}" x2="${toX(50)}" y2="${pad.top + cH}" stroke="var(--ui-danger)" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.4"/>`;
        svg += `<line x1="${pad.left}" y1="${toY(50)}" x2="${W - pad.right}" y2="${toY(50)}" stroke="var(--ui-danger)" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.4"/>`;

        // Regression line
        const regY0 = reg.intercept;
        const regY100 = reg.slope * 100 + reg.intercept;
        const clamp = (v) => Math.max(0, Math.min(100, v));
        svg += `<line x1="${toX(0)}" y1="${toY(clamp(regY0))}" x2="${toX(100)}" y2="${toY(clamp(regY100))}" stroke="${rColor}" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.7"/>`;

        // Data points
        pairs.forEach(([x, y]) => {
            const cx = toX(Math.max(0, Math.min(100, x)));
            const cy = toY(Math.max(0, Math.min(100, y)));
            svg += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${rColor}" opacity="0.6" stroke="white" stroke-width="0.5"/>`;
        });

        // Axis labels
        svg += `<text x="${pad.left + cW / 2}" y="${H - 4}" font-size="10" fill="var(--ui-gray-500)" text-anchor="middle">${codeA} (%)</text>`;
        svg += `<text x="12" y="${pad.top + cH / 2}" font-size="10" fill="var(--ui-gray-500)" text-anchor="middle" transform="rotate(-90, 12, ${pad.top + cH / 2})">${codeB} (%)</text>`;

        svg += '</svg>';

        const chartEl = document.createElement('div');
        chartEl.innerHTML = svg;
        container.appendChild(chartEl);

        // Regression equation
        const eqn = document.createElement('div');
        eqn.className = 'pc-regression-eqn';
        eqn.textContent = `y = ${reg.slope.toFixed(2)}x + ${reg.intercept.toFixed(1)} | R\u00B2 = ${(corr.r * corr.r).toFixed(3)}`;
        container.appendChild(eqn);
    }

    // ── Peer Course Cards ───────────────────────────────────────────────────

    _renderPeerCards(container, analysis) {
        const title = document.createElement('div');
        title.className = 'pc-section-title';
        title.textContent = 'Peer Course Details';
        container.appendChild(title);

        if (analysis.peerCourses.length === 0) {
            container.appendChild(this._emptyNote('No qualifying peer courses.'));
            return;
        }

        // Build a mini Publome for peer course cards
        const peerPublome = new Publome({
            tables: [{ name: 'peerCard', columns: {
                idx: { type: 'number', primaryKey: true },
                code: { type: 'string' },
                r: { type: 'number' },
                n: { type: 'number' }
            }}]
        });
        analysis.peerCourses.forEach((pc, i) => {
            peerPublome.table('peerCard').create({ idx: i + 1, code: pc.code, r: pc.r, n: pc.n });
        });

        const listEl = document.createElement('div');
        container.appendChild(listEl);

        const self = this;
        const peerBinding = new UIBinding(peerPublome.table('peerCard'), { publome: peerPublome });
        peerBinding.bindCollection(listEl, {
            component: 'card',
            map: function(record) {
                const pc = analysis.peerCourses[record.get('idx') - 1];
                const color = self._getCorrelationColor(pc.r);
                const absR = Math.abs(pc.r);

                let html = '';
                html += `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">`;
                html += `<span style="background:var(--ui-primary-900); color:white; padding:0.15rem 0.5rem; border-radius:3px; font-weight:700; font-size:0.8rem;">${pc.code}</span>`;
                html += `<span style="font-size:0.75rem; font-weight:700; color:${color};">r = ${pc.r.toFixed(3)}</span>`;
                html += `<span style="font-size:0.65rem; color:${color}; background:${color}15; padding:0.1rem 0.35rem; border-radius:2px;">${self._getStrengthLabel(pc.r)}</span>`;
                html += `<span style="font-size:0.65rem; color:var(--ui-gray-500); margin-left:auto;">${pc.n} shared students</span>`;
                html += '</div>';

                // Correlation bar
                html += `<div style="display:flex; align-items:center; gap:0.4rem;">`;
                html += `<div style="flex:1; height:6px; background:var(--ui-gray-100); border-radius:3px; overflow:hidden;">`;
                html += `<div style="width:${absR * 100}%; height:100%; background:${color}; border-radius:3px;"></div></div>`;
                html += `<span style="font-size:0.6rem; color:var(--ui-gray-400); width:3rem; text-align:right;">${(absR * 100).toFixed(0)}%</span></div>`;

                // Interpretation
                html += `<div style="font-size:0.65rem; color:var(--ui-gray-500); margin-top:0.3rem;">${self._getInterpretation(pc.r, analysis.primaryCode, pc.code)}</div>`;

                return {
                    title: pc.code,
                    body: html,
                    css: 'pc-peer-card'
                };
            }
        });
    }

    _getInterpretation(r, primary, peer) {
        if (r >= 0.7) return `Strong positive: students who score well in ${primary} almost certainly score well in ${peer}. Likely shared skills or strong prerequisite relationship.`;
        if (r >= 0.4) return `Moderate positive: meaningful shared variance between ${primary} and ${peer}. Common foundational knowledge likely required.`;
        if (r >= 0.2) return `Weak positive: some tendency for marks to move together, but many other factors dominate.`;
        if (r >= -0.2) return `Negligible: performance in ${primary} and ${peer} appears largely independent.`;
        if (r >= -0.4) return `Weak negative: slight tendency for marks to move in opposite directions.`;
        return `Moderate–strong negative: students who do well in ${primary} tend to do less well in ${peer}. Competing demands or different skill requirements.`;
    }

    // ── Correlation Data Table ──────────────────────────────────────────────

    _renderCorrelationTable(container, analysis) {
        const title = document.createElement('div');
        title.className = 'pc-section-title';
        title.textContent = 'Correlation Data';
        container.appendChild(title);

        const tableWrap = document.createElement('div');
        tableWrap.className = 'pc-table-wrap-mb';
        container.appendChild(tableWrap);

        const columns = [
            { key: 'course', label: 'Course' },
            { key: 'r', label: 'Pearson R' },
            { key: 'rSquared', label: 'R\u00B2' },
            { key: 'strength', label: 'Strength' },
            { key: 'n', label: 'Shared Students' },
            { key: 'significance', label: 'Significance' }
        ];

        const data = analysis.peerCourses.map(pc => ({
            course: pc.code,
            r: pc.r.toFixed(3),
            rSquared: (pc.r * pc.r).toFixed(3),
            strength: this._getStrengthLabel(pc.r),
            n: pc.n,
            significance: analysis.correlations[analysis.primaryCode]?.[pc.code]?.p < 0.05 ? 'p < 0.05' : 'NS'
        }));

        new uiTable({
            template: 'compact',
            columns,
            data,
            paging: false,
            searching: true,
            ordering: true,
            parent: tableWrap
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    _emptyNote(text) {
        const el = document.createElement('div');
        el.className = 'pc-empty-note';
        el.textContent = text;
        return el;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PeerCorrelationPanel;
}
if (typeof window !== 'undefined') {
    window.PeerCorrelationPanel = PeerCorrelationPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('PeerCorrelationPanel', PeerCorrelationPanel);
}
