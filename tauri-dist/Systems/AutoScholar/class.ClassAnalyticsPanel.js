/**
 * ClassAnalyticsPanel - Real-time class performance dashboard
 *
 * Standalone analysis panel following the compound pattern.
 * Aggregates course results and assessment data into a unified dashboard
 * with KPI cards, distribution charts, risk breakdown, per-assessment
 * comparison bars, and detailed data tables.
 *
 * Usage:
 *   const panel = new ClassAnalyticsPanel({ courseCode: 'MGAB401', year: 2020 });
 *   panel.render(controlEl, stageEl);
 */
class ClassAnalyticsPanel {

    constructor(config = {}) {
        this._embedded = !!config.embedded;
        this.endpoint = config.endpoint || '/api-proxy';
        this.courseCode = config.courseCode || 'MGAB401';
        this.year = config.year || 2020;
        this.passThreshold = config.passThreshold || 50;
        this.riskConfig = config.riskConfig || {
            zAlertThreshold: -0.5,
            highZThreshold: 0.5
        };

        // Auth state
        this.sessionId = null;
        this.logToken = null;

        // UI refs
        this._controlEl = null;
        this._stageEl = null;
        this._inputs = {};
        this._statusBadge = null;
        this._accordion = null;
        this._busKey = 'analytics';
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
        if (params.passThreshold !== undefined) this.passThreshold = parseInt(params.passThreshold, 10);
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

    _buildAccordion(assessStats = null) {
        if (!this._controlEl) return;
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true }
        };

        if (assessStats && assessStats.length > 0) {
            for (const a of assessStats) {
                content[`a_${a.code}`] = { label: `<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>${a.code}` };
            }
        }

        const accordion = new uiAccordion({
            exclusive: true,
            content,
            parent: el
        });
        this._accordion = accordion;

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsContent(paramsEl);

        if (assessStats) {
            for (const a of assessStats) {
                const paneEl = accordion.el.querySelector(`.ui-accordion-item[data-key="a_${a.code}"] .ui-accordion-content`);
                if (paneEl) this._renderHistogram(paneEl, a.values, a.mean, a.stdDev);
            }
        }
    }

    _renderParamsContent(el) {
        if (!this._embedded) {
            const connRow = document.createElement('div');
            connRow.className = 'as-ctrl-row';
            el.appendChild(connRow);

            const connLabel = document.createElement('label');
            connLabel.className = 'as-ctrl-label';
            connLabel.textContent = 'Connection';
            connRow.appendChild(connLabel);

            this._statusBadge = new uiBadge({ label: 'Disconnected', color: 'gray', size: 'sm', parent: connRow });

            this._inputs.courseCode = new uiInput({
                template: 'inline-label', label: 'Course Code',
                value: this.courseCode, size: 'sm', parent: el
            });

            this._inputs.year = new uiInput({
                template: 'inline-label', label: 'Year',
                value: String(this.year), inputType: 'number', size: 'sm', parent: el
            });
        }

        this._inputs.passThreshold = new uiInput({
            template: 'inline-label', label: 'Pass Mark',
            value: String(this.passThreshold), inputType: 'number', size: 'sm', parent: el
        });

        const btnWrap = document.createElement('div');
        btnWrap.style.marginTop = '0.75rem';
        el.appendChild(btnWrap);

        new uiButton({
            label: this._embedded ? 'Reload' : 'Load Dashboard', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => this._loadData()
        });
    }

    _getInputValue(inst) {
        const inputEl = inst.el.querySelector('input') || inst.el;
        return inputEl.value;
    }

    _readParams() {
        this.courseCode = this._getInputValue(this._inputs.courseCode);
        this.year = parseInt(this._getInputValue(this._inputs.year), 10);
        this.passThreshold = parseInt(this._getInputValue(this._inputs.passThreshold), 10) || 50;
    }

    // ── Empty Stage ─────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.style.padding = '1rem';

        new uiAlert({
            color: 'info',
            title: 'Class Analytics Dashboard',
            message: 'Select a course and year, then click Load Dashboard to view the class performance overview.',
            parent: this._stageEl
        });
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    async _loadData(skipReadParams = false) {
        if (!skipReadParams) this._readParams();
        this._stageEl.innerHTML = '';
        this._stageEl.style.padding = '1rem';

        try {
            this._setStatus('Authenticating...', 'warning');
            await this._authenticate();
            this._setStatus('Connected', 'success');

            // Fetch course results
            this._setStatus('Loading course results...', 'warning');
            const courseApiParams = { courseCode: this.courseCode, year: this.year };
            if (this._studentNumberFilter) courseApiParams.studentNumber = this._studentNumberFilter;
            const courseData = await this._apiCall('getCourseResults', courseApiParams);
            const courseResults = this._parseResponse(courseData);
            if (!courseResults || courseResults.length === 0) {
                throw new Error(`No results for ${this.courseCode} in ${this.year}`);
            }

            // Fetch assessment results
            this._setStatus('Loading assessments...', 'warning');
            const assessData = await this._apiCall('getAssessmentResults', {
                courseCode: this.courseCode, year: this.year
            });
            const assessResults = this._parseResponse(assessData);

            // Compute
            this._setStatus('Analyzing...', 'warning');
            const analysis = this._analyze(courseResults, assessResults);

            this._setStatus('Done', 'success');
            this._renderResults(analysis);
            this._buildAccordion(analysis.assessStats);

        } catch (err) {
            this._setStatus(`Error: ${err.message}`, 'danger');
            new uiAlert({
                color: 'danger',
                title: 'Dashboard Failed',
                message: err.message,
                parent: this._stageEl
            });
        }
    }

    // ── Analysis Engine ─────────────────────────────────────────────────────

    _analyze(courseResults, assessResults) {
        // Extract marks
        const marks = courseResults.map(r => parseFloat(r.result || r.mark || r.finalMark || 0)).filter(m => !isNaN(m));
        const sorted = [...marks].sort((a, b) => a - b);
        const n = marks.length;

        const mean = this._mean(marks);
        const sd = this._stdDev(marks);
        const passed = marks.filter(m => m >= this.passThreshold).length;
        const failed = n - passed;
        const passRate = n > 0 ? this._r(100 * passed / n) : 0;
        const median = this._percentile(sorted, 50);
        const q1 = this._percentile(sorted, 25);
        const q3 = this._percentile(sorted, 75);
        const minMark = n > 0 ? Math.min(...marks) : 0;
        const maxMark = n > 0 ? Math.max(...marks) : 0;

        // Grade distribution
        const grades = this._getGradeDistribution(marks);

        // Box plot
        const boxPlot = { min: minMark, q1, median, q3, max: maxMark };

        // Skewness
        let skewness = 0;
        if (sd > 0 && n >= 3) {
            skewness = marks.reduce((s, v) => s + Math.pow(v - mean, 3), 0) / (n * Math.pow(sd, 3));
        }

        // Assessment stats
        const assessStats = this._computeAssessmentStats(assessResults);

        // Risk categorization (simplified z-score based)
        const riskBreakdown = this._computeRiskBreakdown(courseResults, assessResults);

        // Score distribution bins for histogram
        const histBins = this._computeHistogramBins(marks, 10);

        return {
            courseCode: this.courseCode,
            year: this.year,
            n, mean: this._r(mean), median: this._r(median),
            stdDev: this._r(sd), passed, failed, passRate,
            q1: this._r(q1), q3: this._r(q3),
            min: this._r(minMark), max: this._r(maxMark),
            iqr: this._r(q3 - q1),
            skewness: this._r(skewness),
            grades, boxPlot, assessStats,
            riskBreakdown, histBins, marks, sorted
        };
    }

    _getGradeDistribution(marks) {
        const buckets = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        marks.forEach(m => {
            if (m >= 75) buckets.A++;
            else if (m >= 60) buckets.B++;
            else if (m >= 50) buckets.C++;
            else if (m >= 40) buckets.D++;
            else buckets.F++;
        });
        const n = marks.length || 1;
        return Object.entries(buckets).map(([grade, count]) => ({
            grade, count, pct: this._r(100 * count / n)
        }));
    }

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

        return Object.entries(byCode).map(([code, values]) => {
            const mean = this._mean(values);
            const sd = this._stdDev(values);
            const passCount = values.filter(m => m >= this.passThreshold).length;
            return {
                code, count: values.length, values,
                mean: this._r(mean), stdDev: this._r(sd),
                min: this._r(Math.min(...values)), max: this._r(Math.max(...values)),
                passRate: this._r(100 * passCount / values.length),
                median: this._r(this._percentile([...values].sort((a, b) => a - b), 50))
            };
        }).sort((a, b) => a.code.localeCompare(b.code));
    }

    _computeRiskBreakdown(courseResults, assessResults) {
        // Simplified risk: use per-assessment z-scores
        const assessStats = {};
        if (assessResults) {
            const byCode = {};
            assessResults.forEach(row => {
                const code = row.assessmentCode || row.assessment_code || row.assessCode;
                const result = parseFloat(row.result || row.mark || 0);
                if (!code || isNaN(result) || result === 0) return;
                if (!byCode[code]) byCode[code] = [];
                byCode[code].push(result);
            });
            for (const [code, vals] of Object.entries(byCode)) {
                assessStats[code] = { mean: this._mean(vals), stdDev: this._stdDev(vals) };
            }
        }

        // Pivot assessments by student
        const byStudent = {};
        if (assessResults) {
            assessResults.forEach(row => {
                const sn = row.studentNumber;
                const code = row.assessmentCode || row.assessment_code || row.assessCode;
                const result = parseFloat(row.result || row.mark || 0);
                if (!sn || !code) return;
                if (!byStudent[sn]) byStudent[sn] = {};
                byStudent[sn][code] = result;
            });
        }

        const { zAlertThreshold, highZThreshold } = this.riskConfig;

        const students = courseResults.map(cr => {
            const sn = cr.studentNumber;
            const mark = parseFloat(cr.result || cr.mark || cr.finalMark || 0);
            const assessments = byStudent[sn] || {};

            let negCount = 0, posCount = 0;
            for (const [code, result] of Object.entries(assessments)) {
                const stat = assessStats[code];
                if (!stat || stat.stdDev === 0) continue;
                const z = (result - stat.mean) / stat.stdDev;
                if (z < zAlertThreshold) negCount++;
                if (z > highZThreshold) posCount++;
            }

            return { studentNumber: sn, mark, negCount, posCount };
        });

        // Level 2 z-scores on alert counts
        const negCounts = students.map(s => s.negCount);
        const posCounts = students.map(s => s.posCount);
        const negMean = this._mean(negCounts);
        const negSD = this._stdDev(negCounts);
        const posMean = this._mean(posCounts);
        const posSD = this._stdDev(posCounts);

        let atRisk = 0, average = 0, highPerf = 0;
        students.forEach(s => {
            const negZ = negSD > 0 ? (s.negCount - negMean) / negSD : 0;
            const posZ = posSD > 0 ? (s.posCount - posMean) / posSD : 0;

            if (negZ > highZThreshold) atRisk++;
            else if (posZ > highZThreshold) highPerf++;
            else average++;
        });

        return { atRisk, average, highPerf, total: students.length };
    }

    _computeHistogramBins(marks, binCount) {
        if (marks.length === 0) return [];
        // Fixed 0-100 range for academic marks
        const binWidth = 100 / binCount;
        const bins = Array(binCount).fill(0);
        marks.forEach(m => {
            const idx = Math.min(Math.floor(m / binWidth), binCount - 1);
            bins[idx]++;
        });
        return bins.map((count, i) => ({
            from: i * binWidth,
            to: (i + 1) * binWidth,
            count,
            label: `${i * binWidth}–${(i + 1) * binWidth}`
        }));
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

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
            throw new Error('Session expired');
        }
        return data;
    }

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

    // ── Math ────────────────────────────────────────────────────────────────

    _mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    _stdDev(arr) {
        if (arr.length < 2) return 0;
        const mean = this._mean(arr);
        return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length);
    }

    _percentile(sorted, p) {
        if (sorted.length === 0) return 0;
        const idx = (p / 100) * (sorted.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        if (lo === hi) return sorted[lo];
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    }

    _r(v) { return Math.round(v * 10) / 10; }

    _setStatus(label, color) {
        if (this._statusBadge) this._statusBadge.update({ label, color });
    }

    // ── Histogram (control panel, dark bg) ──────────────────────────────────

    _renderHistogram(container, values, mean, stdDev) {
        if (!values || values.length === 0) return;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const binCount = Math.min(12, Math.max(5, Math.ceil(Math.sqrt(values.length))));
        const binWidth = range / binCount;

        const bins = Array(binCount).fill(0);
        values.forEach(v => {
            const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
            bins[idx]++;
        });
        const maxBin = Math.max(...bins);

        const svgW = 220, svgH = 80, padBottom = 18, padTop = 4;
        const chartH = svgH - padBottom - padTop;
        const barW = svgW / binCount;

        let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%; height:auto; display:block;">`;

        bins.forEach((count, i) => {
            const barH = maxBin > 0 ? (count / maxBin) * chartH : 0;
            const x = i * barW;
            const y = padTop + chartH - barH;
            svg += `<rect x="${x + 0.5}" y="${y}" width="${barW - 1}" height="${barH}" fill="#60a5fa" rx="1"/>`;
            if (count > 0) {
                svg += `<text x="${x + barW / 2}" y="${y - 2}" font-size="7" fill="rgba(255,255,255,0.6)" text-anchor="middle">${count}</text>`;
            }
        });

        const axisY = padTop + chartH;
        svg += `<line x1="0" y1="${axisY}" x2="${svgW}" y2="${axisY}" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>`;
        svg += `<text x="1" y="${svgH - 2}" font-size="7" fill="rgba(255,255,255,0.5)">${Math.round(min)}</text>`;
        svg += `<text x="${svgW - 1}" y="${svgH - 2}" font-size="7" fill="rgba(255,255,255,0.5)" text-anchor="end">${Math.round(max)}</text>`;
        svg += `<text x="${svgW / 2}" y="${svgH - 2}" font-size="7" fill="rgba(255,255,255,0.5)" text-anchor="middle">${Math.round(min + range / 2)}</text>`;

        if (mean >= min && mean <= max) {
            const meanX = ((mean - min) / range) * svgW;
            svg += `<line x1="${meanX}" y1="${padTop}" x2="${meanX}" y2="${axisY}" stroke="#f87171" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        }

        if (stdDev > 0) {
            const lo = Math.max(0, ((mean - stdDev - min) / range) * svgW);
            const hi = Math.min(svgW, ((mean + stdDev - min) / range) * svgW);
            svg += `<rect x="${lo}" y="${padTop}" width="${hi - lo}" height="${chartH}" fill="#f87171" opacity="0.12"/>`;
        }

        svg += '</svg>';
        container.innerHTML = svg;

        const stats = document.createElement('div');
        stats.className = 'ca-ctrl-stats';
        stats.innerHTML = [
            `n=${values.length}`, `\u03BC=${this._r(mean)}`, `\u03C3=${this._r(stdDev)}`,
            `min=${this._r(min)}`, `max=${this._r(max)}`
        ].map(s => `<span>${s}</span>`).join('');
        container.appendChild(stats);
    }

    // ── Master Renderer ─────────────────────────────────────────────────────

    _renderResults(analysis) {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-stage-scroll';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-inner';
        this._stageEl.appendChild(wrap);

        // Title
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML = `
            <span style="background:var(--ui-primary-900); color:white; padding:0.2rem 0.6rem; border-radius:4px; font-weight:700; font-size:0.9rem;">${analysis.courseCode}</span>
            <span style="font-size:0.8rem; color:var(--ui-gray-500);">${analysis.year} | ${analysis.n} students</span>
        `;
        wrap.appendChild(header);

        this._renderKPICards(wrap, analysis);

        // Two-column chart row: histogram + donut
        const chartRow = document.createElement('div');
        chartRow.className = 'ca-chart-row';
        wrap.appendChild(chartRow);

        const histCol = document.createElement('div');
        histCol.className = 'ca-col-flex2';
        chartRow.appendChild(histCol);
        this._renderDistributionChart(histCol, analysis);

        const donutCol = document.createElement('div');
        donutCol.className = 'ca-col-flex1-10';
        chartRow.appendChild(donutCol);
        this._renderRiskDonut(donutCol, analysis);

        // Grade bar + box plot row
        const vizRow = document.createElement('div');
        vizRow.className = 'ca-chart-row';
        wrap.appendChild(vizRow);

        const gradeCol = document.createElement('div');
        gradeCol.className = 'ca-col-flex1-14';
        vizRow.appendChild(gradeCol);
        this._renderGradeBar(gradeCol, analysis);

        const boxCol = document.createElement('div');
        boxCol.className = 'ca-col-flex1-14';
        vizRow.appendChild(boxCol);
        this._renderBoxPlot(boxCol, analysis);

        // Assessment comparison
        if (analysis.assessStats.length > 0) {
            this._renderAssessmentBars(wrap, analysis);
            this._renderAssessmentTable(wrap, analysis);
        }

        // Summary stats table
        this._renderSummaryTable(wrap, analysis);
    }

    // ── KPI Cards ───────────────────────────────────────────────────────────

    _renderKPICards(container, a) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        container.appendChild(row);

        const prColor = a.passRate >= 80 ? 'var(--ui-success)' : a.passRate >= 70 ? 'var(--ui-info)' : a.passRate >= 60 ? 'var(--ui-warning)' : 'var(--ui-danger)';
        const risk = a.riskBreakdown;

        const stats = [
            { icon: 'fa-percentage', label: 'Pass Rate', value: `${a.passRate}%`, color: prColor },
            { icon: 'fa-chart-line', label: 'Mean', value: `${a.mean}%`, color: 'var(--ui-primary-900)' },
            { icon: 'fa-ruler-vertical', label: 'Median', value: `${a.median}%`, color: 'var(--ui-secondary)' },
            { icon: 'fa-exclamation-triangle', label: 'At Risk', value: String(risk.atRisk), color: 'var(--ui-danger)' },
            { icon: 'fa-trophy', label: 'High Perf', value: String(risk.highPerf), color: 'var(--ui-success)' },
            { icon: 'fa-arrows-alt-h', label: 'Range', value: `${a.min} \u2013 ${a.max}`, color: 'var(--ui-info)' }
        ];

        this._bindKPIs(row, stats);
    }

    // ── Distribution Histogram (stage, white bg, with normal curve) ─────────

    _renderDistributionChart(container, analysis) {
        const title = document.createElement('div');
        title.className = 'ca-section-title';
        title.textContent = 'Score Distribution';
        container.appendChild(title);

        const bins = analysis.histBins;
        if (bins.length === 0) return;

        const W = 420, H = 200;
        const pad = { left: 35, right: 10, top: 10, bottom: 28 };
        const cW = W - pad.left - pad.right;
        const cH = H - pad.top - pad.bottom;

        const maxCount = Math.max(...bins.map(b => b.count), 1);
        const barW = cW / bins.length;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:420px; height:auto; display:block;">`;

        // Bars
        bins.forEach((b, i) => {
            const barH = (b.count / maxCount) * cH;
            const x = pad.left + i * barW;
            const y = pad.top + cH - barH;

            // Color bars by pass threshold zones
            const midPoint = b.from + (b.to - b.from) / 2;
            const fill = midPoint >= 75 ? 'var(--ui-success)' : midPoint >= 50 ? 'var(--ui-info)' : midPoint >= 40 ? 'var(--ui-warning)' : 'var(--ui-danger)';

            svg += `<rect x="${x + 1}" y="${y}" width="${barW - 2}" height="${barH}" fill="${fill}" opacity="0.7" rx="1"/>`;
            if (b.count > 0) {
                svg += `<text x="${x + barW / 2}" y="${y - 3}" font-size="8" fill="var(--ui-gray-500)" text-anchor="middle">${b.count}</text>`;
            }
        });

        // Normal curve overlay
        if (analysis.stdDev > 0) {
            const mean = analysis.mean;
            const sd = analysis.stdDev;
            const n = analysis.n;
            const binWidth = 10; // Each bin is 10% wide
            const peakDensity = 1 / (sd * Math.sqrt(2 * Math.PI));
            const peakCount = peakDensity * n * binWidth;
            const scale = (peakCount / maxCount) * cH;

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
        bins.forEach((b, i) => {
            if (i % 2 === 0) {
                svg += `<text x="${pad.left + i * barW + barW / 2}" y="${H - 8}" font-size="8" fill="var(--ui-gray-400)" text-anchor="middle">${b.from}</text>`;
            }
        });
        svg += `<text x="${W - pad.right}" y="${H - 8}" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">100</text>`;

        // Y-axis labels
        svg += `<text x="${pad.left - 4}" y="${axisY + 3}" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">0</text>`;
        svg += `<text x="${pad.left - 4}" y="${pad.top + 5}" font-size="8" fill="var(--ui-gray-400)" text-anchor="end">${maxCount}</text>`;

        // Mean marker
        const meanX = pad.left + (analysis.mean / 100) * cW;
        svg += `<line x1="${meanX}" y1="${pad.top}" x2="${meanX}" y2="${axisY}" stroke="var(--ui-primary-900)" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        svg += `<text x="${meanX}" y="${pad.top - 2}" font-size="7" fill="var(--ui-primary-900)" text-anchor="middle">\u03BC=${analysis.mean}</text>`;

        svg += '</svg>';

        const el = document.createElement('div');
        el.innerHTML = svg;
        container.appendChild(el);
    }

    // ── Risk Donut Chart ────────────────────────────────────────────────────

    _renderRiskDonut(container, analysis) {
        const title = document.createElement('div');
        title.className = 'ca-section-title';
        title.textContent = 'Risk Breakdown';
        container.appendChild(title);

        const risk = analysis.riskBreakdown;
        if (risk.total === 0) return;

        const W = 180, H = 180;
        const cx = W / 2, cy = H / 2;
        const outerR = 70, innerR = 40;

        const segments = [
            { label: 'At Risk', count: risk.atRisk, color: 'var(--ui-danger)' },
            { label: 'Average', count: risk.average, color: 'var(--ui-secondary)' },
            { label: 'High Perf', count: risk.highPerf, color: 'var(--ui-success)' }
        ].filter(s => s.count > 0);

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:180px; height:auto; display:block; margin:0 auto;">`;

        let startAngle = -Math.PI / 2;
        segments.forEach(seg => {
            const frac = seg.count / risk.total;
            const endAngle = startAngle + frac * 2 * Math.PI;

            // Donut arc path
            const x1 = cx + outerR * Math.cos(startAngle);
            const y1 = cy + outerR * Math.sin(startAngle);
            const x2 = cx + outerR * Math.cos(endAngle);
            const y2 = cy + outerR * Math.sin(endAngle);
            const ix1 = cx + innerR * Math.cos(endAngle);
            const iy1 = cy + innerR * Math.sin(endAngle);
            const ix2 = cx + innerR * Math.cos(startAngle);
            const iy2 = cy + innerR * Math.sin(startAngle);

            const largeArc = frac > 0.5 ? 1 : 0;

            const d = [
                `M ${x1} ${y1}`,
                `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${ix1} ${iy1}`,
                `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
                'Z'
            ].join(' ');

            svg += `<path d="${d}" fill="${seg.color}" opacity="0.8"/>`;

            startAngle = endAngle;
        });

        // Center label
        svg += `<text x="${cx}" y="${cy - 4}" font-size="18" font-weight="700" fill="var(--ui-gray-800)" text-anchor="middle">${risk.total}</text>`;
        svg += `<text x="${cx}" y="${cy + 10}" font-size="8" fill="var(--ui-gray-500)" text-anchor="middle">students</text>`;

        svg += '</svg>';

        const el = document.createElement('div');
        el.innerHTML = svg;
        container.appendChild(el);

        // Legend below donut
        const legend = document.createElement('div');
        legend.className = 'ca-donut-legend';
        segments.forEach(seg => {
            const pct = this._r(100 * seg.count / risk.total);
            legend.innerHTML += `<span style="font-size:0.65rem; display:flex; align-items:center; gap:0.2rem;">
                <span style="width:8px; height:8px; border-radius:50%; background:${seg.color}; display:inline-block;"></span>
                ${seg.label}: ${seg.count} (${pct}%)
            </span>`;
        });
        container.appendChild(legend);
    }

    // ── Grade Distribution Bar ──────────────────────────────────────────────

    _renderGradeBar(container, analysis) {
        const title = document.createElement('div');
        title.className = 'ca-section-title';
        title.textContent = 'Grade Distribution';
        container.appendChild(title);

        const gradeColors = { A: 'var(--ui-success)', B: 'var(--ui-info)', C: 'var(--ui-warning)', D: 'var(--ui-warning)', F: 'var(--ui-danger)' };

        const bar = document.createElement('div');
        bar.className = 'ca-grade-bar';

        analysis.grades.forEach(g => {
            if (g.pct > 0) {
                const seg = document.createElement('div');
                seg.style.cssText = `width:${g.pct}%; background:${gradeColors[g.grade]}; display:flex; align-items:center; justify-content:center; transition:width 0.3s;`;
                if (g.pct > 8) {
                    seg.innerHTML = `<span style="font-size:0.65rem; color:white; font-weight:600;">${g.grade} ${g.pct}%</span>`;
                }
                seg.title = `${g.grade}: ${g.count} students (${g.pct}%)`;
                bar.appendChild(seg);
            }
        });
        container.appendChild(bar);

        // Labels row
        const labels = document.createElement('div');
        labels.className = 'ca-grade-bar-labels';
        analysis.grades.forEach(g => {
            labels.innerHTML += `<span style="font-size:0.65rem; color:var(--ui-gray-600);">
                <span style="display:inline-block; width:8px; height:8px; border-radius:2px; background:${gradeColors[g.grade]}; vertical-align:middle; margin-right:2px;"></span>
                ${g.grade}: ${g.count}
            </span>`;
        });
        container.appendChild(labels);
    }

    // ── Box Plot ────────────────────────────────────────────────────────────

    _renderBoxPlot(container, analysis) {
        const title = document.createElement('div');
        title.className = 'ca-section-title';
        title.textContent = 'Mark Spread';
        container.appendChild(title);

        const bp = analysis.boxPlot;
        const W = 300, H = 50;
        const pad = { left: 5, right: 5 };
        const cW = W - pad.left - pad.right;
        const toX = (v) => pad.left + (v / 100) * cW;
        const midY = 22;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:300px; height:auto; display:block;">`;

        // Whiskers
        svg += `<line x1="${toX(bp.min)}" y1="${midY}" x2="${toX(bp.q1)}" y2="${midY}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;
        svg += `<line x1="${toX(bp.min)}" y1="${midY - 6}" x2="${toX(bp.min)}" y2="${midY + 6}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;
        svg += `<line x1="${toX(bp.q3)}" y1="${midY}" x2="${toX(bp.max)}" y2="${midY}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;
        svg += `<line x1="${toX(bp.max)}" y1="${midY - 6}" x2="${toX(bp.max)}" y2="${midY + 6}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;

        // Box
        const boxX = toX(bp.q1);
        const boxW = toX(bp.q3) - boxX;
        svg += `<rect x="${boxX}" y="${midY - 10}" width="${boxW}" height="20" fill="#c5cae9" stroke="var(--ui-primary-900)" stroke-width="1" rx="2"/>`;

        // Median
        svg += `<line x1="${toX(bp.median)}" y1="${midY - 10}" x2="${toX(bp.median)}" y2="${midY + 10}" stroke="var(--ui-danger)" stroke-width="2"/>`;

        // Mean marker
        svg += `<circle cx="${toX(analysis.mean)}" cy="${midY}" r="3" fill="var(--ui-warning)" stroke="white" stroke-width="0.5"/>`;

        // Pass threshold
        svg += `<line x1="${toX(this.passThreshold)}" y1="2" x2="${toX(this.passThreshold)}" y2="${H - 2}" stroke="var(--ui-danger)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.5"/>`;

        // Labels
        svg += `<text x="${toX(bp.min)}" y="${midY - 14}" font-size="7" fill="var(--ui-gray-500)" text-anchor="middle">${this._r(bp.min)}</text>`;
        svg += `<text x="${toX(bp.max)}" y="${midY - 14}" font-size="7" fill="var(--ui-gray-500)" text-anchor="middle">${this._r(bp.max)}</text>`;
        svg += `<text x="${toX(bp.median)}" y="${midY + 22}" font-size="7" fill="var(--ui-danger)" text-anchor="middle">Med ${this._r(bp.median)}</text>`;
        svg += `<text x="${toX(analysis.mean)}" y="${midY + 22}" font-size="6" fill="var(--ui-warning)" text-anchor="middle">\u03BC${analysis.mean}</text>`;

        svg += '</svg>';

        const el = document.createElement('div');
        el.innerHTML = svg;
        container.appendChild(el);
    }

    // ── Assessment Comparison Bars ──────────────────────────────────────────

    _renderAssessmentBars(container, analysis) {
        const title = document.createElement('div');
        title.className = 'ca-section-title';
        title.textContent = 'Assessment Comparison';
        container.appendChild(title);

        const W = 500, H = Math.max(100, analysis.assessStats.length * 30 + 30);
        const pad = { left: 70, right: 50, top: 10, bottom: 10 };
        const cW = W - pad.left - pad.right;
        const cH = H - pad.top - pad.bottom;
        const barH = Math.min(20, cH / analysis.assessStats.length - 4);

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:500px; height:auto; display:block;">`;

        // Gridlines
        [25, 50, 75, 100].forEach(v => {
            const x = pad.left + (v / 100) * cW;
            svg += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${H - pad.bottom}" stroke="#e2e8f0" stroke-width="0.5"/>`;
            svg += `<text x="${x}" y="${H - 1}" font-size="7" fill="var(--ui-gray-400)" text-anchor="middle">${v}%</text>`;
        });

        // Pass threshold
        const threshX = pad.left + (this.passThreshold / 100) * cW;
        svg += `<line x1="${threshX}" y1="${pad.top}" x2="${threshX}" y2="${H - pad.bottom}" stroke="var(--ui-danger)" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.5"/>`;

        analysis.assessStats.forEach((a, i) => {
            const y = pad.top + i * (barH + 6);

            // Assessment label
            svg += `<text x="${pad.left - 4}" y="${y + barH / 2 + 3}" font-size="9" fill="#374151" text-anchor="end" font-weight="500">${a.code}</text>`;

            // Mean bar
            const meanW = (a.mean / 100) * cW;
            const barColor = a.passRate >= 80 ? 'var(--ui-success)' : a.passRate >= 60 ? 'var(--ui-info)' : a.passRate >= 50 ? 'var(--ui-warning)' : 'var(--ui-danger)';
            svg += `<rect x="${pad.left}" y="${y}" width="${meanW}" height="${barH}" fill="${barColor}" opacity="0.7" rx="2"/>`;

            // SD whisker
            const sdLo = pad.left + (Math.max(0, a.mean - a.stdDev) / 100) * cW;
            const sdHi = pad.left + (Math.min(100, a.mean + a.stdDev) / 100) * cW;
            svg += `<line x1="${sdLo}" y1="${y + barH / 2}" x2="${sdHi}" y2="${y + barH / 2}" stroke="#374151" stroke-width="1" opacity="0.4"/>`;
            svg += `<line x1="${sdLo}" y1="${y + barH / 2 - 3}" x2="${sdLo}" y2="${y + barH / 2 + 3}" stroke="#374151" stroke-width="1" opacity="0.4"/>`;
            svg += `<line x1="${sdHi}" y1="${y + barH / 2 - 3}" x2="${sdHi}" y2="${y + barH / 2 + 3}" stroke="#374151" stroke-width="1" opacity="0.4"/>`;

            // Value label
            svg += `<text x="${pad.left + meanW + 4}" y="${y + barH / 2 + 3}" font-size="8" fill="${barColor}" font-weight="600">${a.mean}% (n=${a.count})</text>`;
        });

        svg += '</svg>';

        const el = document.createElement('div');
        el.className = 'ca-svg-wrap';
        el.innerHTML = svg;
        container.appendChild(el);
    }

    // ── Assessment Table ────────────────────────────────────────────────────

    _renderAssessmentTable(container, analysis) {
        const title = document.createElement('div');
        title.className = 'ca-section-title';
        title.textContent = 'Assessment Details';
        container.appendChild(title);

        const table = document.createElement('table');
        table.className = 'as-an-data-table';
        table.style.marginBottom = '1rem';

        const thead = document.createElement('thead');
        thead.innerHTML = `<tr class="as-an-thead-row">
            <th style="padding:0.35rem 0.5rem; text-align:left;">Code</th>
            <th style="padding:0.35rem 0.5rem; text-align:right;">n</th>
            <th style="padding:0.35rem 0.5rem; text-align:right;">Mean</th>
            <th style="padding:0.35rem 0.5rem; text-align:right;">Median</th>
            <th style="padding:0.35rem 0.5rem; text-align:right;">SD</th>
            <th style="padding:0.35rem 0.5rem; text-align:right;">Pass Rate</th>
            <th style="padding:0.35rem 0.5rem; text-align:right;">Min</th>
            <th style="padding:0.35rem 0.5rem; text-align:right;">Max</th>
        </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        analysis.assessStats.forEach(a => {
            const prColor = a.passRate >= 80 ? 'var(--ui-success)' : a.passRate >= 60 ? 'var(--ui-warning)' : 'var(--ui-danger)';
            const tr = document.createElement('tr');
            tr.className = 'ca-table-row-border';
            tr.innerHTML = `
                <td style="padding:0.3rem 0.5rem; font-weight:600;">${a.code}</td>
                <td style="padding:0.3rem 0.5rem; text-align:right;">${a.count}</td>
                <td style="padding:0.3rem 0.5rem; text-align:right;">${a.mean}%</td>
                <td style="padding:0.3rem 0.5rem; text-align:right;">${a.median}%</td>
                <td style="padding:0.3rem 0.5rem; text-align:right;">${a.stdDev}</td>
                <td style="padding:0.3rem 0.5rem; text-align:right; color:${prColor}; font-weight:600;">${a.passRate}%</td>
                <td style="padding:0.3rem 0.5rem; text-align:right;">${a.min}</td>
                <td style="padding:0.3rem 0.5rem; text-align:right;">${a.max}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    // ── Summary Stats Table (uiTable) ───────────────────────────────────────

    _renderSummaryTable(container, analysis) {
        const title = document.createElement('div');
        title.className = 'ca-section-title';
        title.textContent = 'Summary Statistics';
        container.appendChild(title);

        const tableWrap = document.createElement('div');
        tableWrap.className = 'ca-table-wrap-mb';
        container.appendChild(tableWrap);

        const columns = [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' }
        ];

        const risk = analysis.riskBreakdown;
        const data = [
            { metric: 'Enrolled', value: analysis.n },
            { metric: 'Passed', value: `${analysis.passed} (${analysis.passRate}%)` },
            { metric: 'Failed', value: `${analysis.failed} (${analysis.n > 0 ? this._r(100 * analysis.failed / analysis.n) : 0}%)` },
            { metric: 'Mean', value: `${analysis.mean}%` },
            { metric: 'Median', value: `${analysis.median}%` },
            { metric: 'Std Dev', value: analysis.stdDev },
            { metric: 'Q1 / Q3', value: `${analysis.q1} / ${analysis.q3}` },
            { metric: 'IQR', value: analysis.iqr },
            { metric: 'Min / Max', value: `${analysis.min} / ${analysis.max}` },
            { metric: 'Skewness', value: analysis.skewness },
            { metric: 'At Risk', value: `${risk.atRisk} (${risk.total > 0 ? this._r(100 * risk.atRisk / risk.total) : 0}%)` },
            { metric: 'Average', value: `${risk.average} (${risk.total > 0 ? this._r(100 * risk.average / risk.total) : 0}%)` },
            { metric: 'High Performing', value: `${risk.highPerf} (${risk.total > 0 ? this._r(100 * risk.highPerf / risk.total) : 0}%)` },
            { metric: 'Assessments', value: analysis.assessStats.length }
        ];

        new uiTable({
            template: 'compact',
            columns,
            data,
            paging: false,
            searching: false,
            ordering: true,
            parent: tableWrap
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassAnalyticsPanel;
}
if (typeof window !== 'undefined') {
    window.ClassAnalyticsPanel = ClassAnalyticsPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('ClassAnalyticsPanel', ClassAnalyticsPanel);
}
