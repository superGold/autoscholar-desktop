/**
 * HistoricalPerformancePanel - Year-over-year course performance analytics
 *
 * Standalone analysis panel following the compound pattern (same as RiskAssessmentPanel).
 * Fetches live data for a course over multiple years and renders trend lines,
 * grade distributions, KPI cards, box plots, and exportable data tables.
 *
 * Usage:
 *   const panel = new HistoricalPerformancePanel({ courseCode: 'COMP101', yearFrom: 2021, yearTo: 2025 });
 *   panel.render(controlEl, stageEl);
 */
class HistoricalPerformancePanel {

    constructor(config = {}) {
        this._embedded = !!config.embedded;
        this.endpoint = config.endpoint || '/api-proxy';
        this.courseCode = config.courseCode || 'COMP101';
        this.yearFrom = config.yearFrom || 2021;
        this.yearTo = config.yearTo || 2025;
        this.passThreshold = config.passThreshold || 50;

        // Auth state
        this.sessionId = null;
        this.logToken = null;

        // UI refs
        this._controlEl = null;
        this._stageEl = null;
        this._inputs = {};
        this._statusBadge = null;
        this._accordion = null;
        this._busKey = 'historical';
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
        if (params.year !== undefined) {
            this.yearTo = parseInt(params.year, 10);
            this.yearFrom = this.yearTo - 4;
        }
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

    _buildAccordion(yearData = null) {
        if (!this._controlEl) return;
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true }
        };

        if (yearData) {
            for (const yd of yearData) {
                content[`y_${yd.year}`] = { label: `<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>${yd.year}` };
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

        if (yearData) {
            for (const yd of yearData) {
                const paneEl = accordion.el.querySelector(`.ui-accordion-item[data-key="y_${yd.year}"] .ui-accordion-content`);
                if (paneEl) this._renderHistogram(paneEl, yd.marks, yd.stats.mean, yd.stats.stdDev);
            }
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
            connLabel.textContent = 'Connection';
            connRow.appendChild(connLabel);

            this._statusBadge = new uiBadge({ label: 'Disconnected', color: 'gray', size: 'sm', parent: connRow });

            // Course Code input
            this._inputs.courseCode = new uiInput({
                template: 'inline-label', label: 'Course Code',
                value: this.courseCode, size: 'sm', parent: el
            });
        }

        this._inputs.yearFrom = new uiInput({
            template: 'inline-label', label: 'Year From',
            value: String(this.yearFrom), inputType: 'number', size: 'sm', parent: el
        });

        this._inputs.yearTo = new uiInput({
            template: 'inline-label', label: 'Year To',
            value: String(this.yearTo), inputType: 'number', size: 'sm', parent: el
        });

        // Generate button
        const btnWrap = document.createElement('div');
        btnWrap.style.marginTop = '0.75rem';
        el.appendChild(btnWrap);

        new uiButton({
            label: this._embedded ? 'Re-generate' : 'Generate', variant: 'primary', size: 'sm', parent: btnWrap,
            onClick: () => this._loadData()
        });
    }

    _getInputValue(uiInputInstance) {
        const inputEl = uiInputInstance.el.querySelector('input') || uiInputInstance.el;
        return inputEl.value;
    }

    _readParams() {
        this.courseCode = this._getInputValue(this._inputs.courseCode);
        this.yearFrom = parseInt(this._getInputValue(this._inputs.yearFrom), 10);
        this.yearTo = parseInt(this._getInputValue(this._inputs.yearTo), 10);
    }

    // ── Empty Stage ─────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.style.padding = '1rem';

        new uiAlert({
            color: 'info',
            title: 'Historical Performance Analysis',
            message: 'Set the course code and year range, then click Generate to fetch live data and build trend analysis.',
            parent: this._stageEl
        });
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    async _loadData(skipReadParams = false) {
        if (!skipReadParams) this._readParams();
        this._stageEl.innerHTML = '';
        this._stageEl.style.padding = '1rem';

        // Show loading spinner in stage
        var loadWrap = document.createElement('div');
        loadWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;color:var(--ui-gray-400);';
        loadWrap.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:1.5rem;margin-bottom:0.75rem;color:var(--ui-primary-400);"></i><div style="font-size:0.8rem;font-weight:500;">Loading Historical Data...</div><div class="hp-load-sub" style="font-size:0.65rem;margin-top:0.3rem;color:var(--ui-gray-300);">Connecting</div>';
        this._stageEl.appendChild(loadWrap);
        var loadSub = loadWrap.querySelector('.hp-load-sub');

        try {
            // Step 1: Authenticate
            this._setStatus('Authenticating...', 'warning');
            if (loadSub) loadSub.textContent = 'Authenticating...';
            await this._authenticate();
            this._setStatus('Connected', 'success');

            const years = [];
            for (let y = this.yearFrom; y <= this.yearTo; y++) years.push(y);

            const yearDataArr = [];

            for (const year of years) {
                this._setStatus(`Loading ${year}...`, 'warning');
                if (loadSub) loadSub.textContent = 'Loading ' + year + ' (' + (years.indexOf(year) + 1) + '/' + years.length + ')...';

                // Fetch course results
                const courseApiParams = { courseCode: this.courseCode, year };
                if (this._studentNumberFilter) courseApiParams.studentNumber = this._studentNumberFilter;
                const courseData = await this._apiCall('getCourseResults', courseApiParams);
                const courseResults = this._parseResponse(courseData);

                // Fetch assessment results
                const assessData = await this._apiCall('getAssessmentResults', {
                    courseCode: this.courseCode, year
                });
                const assessResults = this._parseResponse(assessData);

                if (!courseResults || courseResults.length === 0) {
                    yearDataArr.push({ year, marks: [], stats: this._emptyStats(year), assessStats: [] });
                    continue;
                }

                const marks = courseResults.map(r => parseFloat(r.result || r.mark || r.finalMark || 0)).filter(m => !isNaN(m));
                const stats = this._computeYearStats(marks, year, courseResults);
                const assessStats = this._computeAssessmentStats(assessResults);

                yearDataArr.push({ year, marks, stats, assessStats, courseResults });
            }

            // Cross-year analysis
            const analysis = this._buildCrossYearAnalysis(yearDataArr);

            this._setStatus('Done', 'success');
            this._renderResults(analysis);
            this._buildAccordion(yearDataArr.filter(yd => yd.marks.length > 0));

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

    _emptyStats(year) {
        return {
            year, enrolled: 0, passed: 0, failed: 0, passRate: 0,
            mean: 0, median: 0, stdDev: 0, min: 0, max: 0, q1: 0, q3: 0,
            skewness: 0, kurtosis: 0, mode: 0, cv: 0, iqr: 0
        };
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

    // ── Stats Computation ───────────────────────────────────────────────────

    _computeYearStats(marks, year, courseResults = null) {
        if (!marks || marks.length === 0) return this._emptyStats(year);

        const sorted = [...marks].sort((a, b) => a - b);
        const n = sorted.length;
        const mean = this._mean(marks);
        const sd = this._stdDev(marks);
        // Use PassRateCalculator for proper dedup + block-aware denominator
        let passed, enrolled, passRate;
        if (courseResults && courseResults.length > 0) {
            const prStats = PassRateCalculator.computePassRate(courseResults, { denominator: 'itsOfficial' });
            passed = prStats.passes;
            enrolled = prStats.enrolled;
            passRate = prStats.passRate != null ? prStats.passRate : 0;
        } else {
            passed = marks.filter(m => m >= this.passThreshold).length;
            enrolled = n;
            passRate = n > 0 ? this._r(100 * passed / n) : 0;
        }
        const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
        const q1 = this._percentile(sorted, 25);
        const q3 = this._percentile(sorted, 75);

        // Skewness (Fisher-Pearson)
        let skewness = 0;
        if (sd > 0 && n >= 3) {
            const m3 = marks.reduce((s, v) => s + Math.pow(v - mean, 3), 0) / n;
            skewness = m3 / Math.pow(sd, 3);
        }

        // Kurtosis (excess)
        let kurtosis = 0;
        if (sd > 0 && n >= 4) {
            const m4 = marks.reduce((s, v) => s + Math.pow(v - mean, 4), 0) / n;
            kurtosis = m4 / Math.pow(sd, 4) - 3;
        }

        // Mode
        const freq = {};
        marks.forEach(m => { const k = Math.round(m); freq[k] = (freq[k] || 0) + 1; });
        const mode = +Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];

        return {
            year, enrolled, passed, failed: enrolled - passed,
            passRate,
            mean: this._r(mean), median: this._r(median),
            stdDev: this._r(sd),
            min: this._r(Math.min(...marks)), max: this._r(Math.max(...marks)),
            q1: this._r(q1), q3: this._r(q3),
            skewness: this._r(skewness), kurtosis: this._r(kurtosis),
            mode, cv: mean > 0 ? this._r(100 * sd / mean) : 0,
            iqr: this._r(q3 - q1)
        };
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

        return Object.entries(byCode).map(([code, marks]) => {
            const mean = this._mean(marks);
            const sd = this._stdDev(marks);
            const passCount = marks.filter(m => m >= this.passThreshold).length;
            return {
                code, count: marks.length,
                mean: this._r(mean), stdDev: this._r(sd),
                min: this._r(Math.min(...marks)), max: this._r(Math.max(...marks)),
                passRate: this._r(100 * passCount / marks.length)
            };
        }).sort((a, b) => a.code.localeCompare(b.code));
    }

    _buildCrossYearAnalysis(yearDataArr) {
        const years = yearDataArr.map(yd => yd.year);
        const passRates = yearDataArr.map(yd => yd.stats.passRate);
        const means = yearDataArr.map(yd => yd.stats.mean);
        const enrollments = yearDataArr.map(yd => yd.stats.enrolled);
        const stdDevs = yearDataArr.map(yd => yd.stats.stdDev);

        // Trend direction
        const validRates = passRates.filter(r => r > 0);
        let trendDirection = 'Stable';
        if (validRates.length >= 2) {
            const first = validRates[0];
            const last = validRates[validRates.length - 1];
            const delta = last - first;
            if (delta > 3) trendDirection = 'Improving';
            else if (delta < -3) trendDirection = 'Declining';
        }

        // Latest year with data
        const withData = yearDataArr.filter(yd => yd.stats.enrolled > 0);
        const latest = withData.length > 0 ? withData[withData.length - 1] : null;
        const prevYear = withData.length > 1 ? withData[withData.length - 2] : null;

        // Deltas vs previous year
        const deltas = {};
        if (latest && prevYear) {
            deltas.passRate = this._r(latest.stats.passRate - prevYear.stats.passRate);
            deltas.mean = this._r(latest.stats.mean - prevYear.stats.mean);
            deltas.enrolled = latest.stats.enrolled - prevYear.stats.enrolled;
            deltas.stdDev = this._r(latest.stats.stdDev - prevYear.stats.stdDev);
        }

        // Per-year deltas
        const yearDeltas = [];
        for (let i = 0; i < yearDataArr.length; i++) {
            if (i === 0) {
                yearDeltas.push({});
            } else {
                const cur = yearDataArr[i].stats;
                const prev = yearDataArr[i - 1].stats;
                yearDeltas.push({
                    passRate: this._r(cur.passRate - prev.passRate),
                    mean: this._r(cur.mean - prev.mean),
                    enrolled: cur.enrolled - prev.enrolled
                });
            }
        }

        return {
            years, passRates, means, enrollments, stdDevs,
            trendDirection, latest, prevYear, deltas,
            yearData: yearDataArr, yearDeltas
        };
    }

    // ── Grade Distribution ──────────────────────────────────────────────────

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

    _getBoxPlotData(marks) {
        if (!marks || marks.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
        const sorted = [...marks].sort((a, b) => a - b);
        return {
            min: sorted[0],
            q1: this._percentile(sorted, 25),
            median: this._percentile(sorted, 50),
            q3: this._percentile(sorted, 75),
            max: sorted[sorted.length - 1]
        };
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

    _percentile(sorted, p) {
        const idx = (p / 100) * (sorted.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        if (lo === hi) return sorted[lo];
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    }

    _r(v) { return Math.round(v * 10) / 10; }

    // ── Status Badge ────────────────────────────────────────────────────────

    _setStatus(label, color) {
        if (this._statusBadge) {
            this._statusBadge.update({ label, color });
        }
    }

    // ── Histogram (control panel, same as RiskAssessmentPanel) ──────────────

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
        const midVal = Math.round(min + range / 2);
        svg += `<text x="${svgW / 2}" y="${svgH - 2}" font-size="7" fill="rgba(255,255,255,0.5)" text-anchor="middle">${midVal}</text>`;

        if (mean !== undefined && mean >= min && mean <= max) {
            const meanX = ((mean - min) / range) * svgW;
            svg += `<line x1="${meanX}" y1="${padTop}" x2="${meanX}" y2="${axisY}" stroke="#f87171" stroke-width="1.5" stroke-dasharray="3,2"/>`;
        }

        if (stdDev !== undefined && stdDev > 0) {
            const lo = Math.max(0, ((mean - stdDev - min) / range) * svgW);
            const hi = Math.min(svgW, ((mean + stdDev - min) / range) * svgW);
            svg += `<rect x="${lo}" y="${padTop}" width="${hi - lo}" height="${chartH}" fill="#f87171" opacity="0.12"/>`;
        }

        svg += '</svg>';
        container.innerHTML = svg;

        const stats = document.createElement('div');
        stats.style.cssText = 'font-size: 0.65rem; color: rgba(255,255,255,0.5); display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;';
        stats.innerHTML = [
            `n=${values.length}`,
            `\u03BC=${this._r(mean)}`,
            `\u03C3=${this._r(stdDev)}`,
            `min=${this._r(Math.min(...values))}`,
            `max=${this._r(Math.max(...values))}`
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

        this._renderKPICards(wrap, analysis);
        this._renderTrendChart(wrap, analysis);
        this._renderEnrollmentChart(wrap, analysis);
        this._renderYearCards(wrap, analysis);

        // Assessment breakdown for latest year
        if (analysis.latest && analysis.latest.assessStats && analysis.latest.assessStats.length > 0) {
            this._renderAssessmentTable(wrap, analysis.latest.assessStats, analysis.latest.year);
        }

        this._renderDataTable(wrap, analysis);
    }

    // ── KPI Cards ───────────────────────────────────────────────────────────

    _renderKPICards(container, analysis) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        container.appendChild(row);

        const latest = analysis.latest?.stats;
        const d = analysis.deltas || {};

        const passColor = !latest ? 'var(--ui-gray-500)'
            : latest.passRate >= 80 ? 'var(--ui-success)'
            : latest.passRate >= 70 ? 'var(--ui-info)'
            : latest.passRate >= 60 ? 'var(--ui-warning)'
            : 'var(--ui-danger)';

        const stats = [
            { icon: 'fa-percentage', label: 'Pass Rate', value: latest ? `${latest.passRate}%` : '\u2014', color: passColor },
            { icon: 'fa-chart-line', label: 'Mean Mark', value: latest ? `${latest.mean}%` : '\u2014', color: 'var(--ui-primary-900)' },
            { icon: 'fa-users', label: 'Enrolled', value: latest ? String(latest.enrolled) : '\u2014', color: 'var(--ui-primary-900)' },
            { icon: 'fa-arrow-trend-up', label: 'Trend', value: analysis.trendDirection, color: analysis.trendDirection === 'Improving' ? 'var(--ui-success)' : analysis.trendDirection === 'Declining' ? 'var(--ui-danger)' : 'var(--ui-gray-500)' },
            { icon: 'fa-chart-area', label: 'Std Dev', value: latest ? String(latest.stdDev) : '\u2014', color: 'var(--ui-secondary)' }
        ];

        this._bindKPIs(row, stats);
    }

    // ── Trend Line Chart ────────────────────────────────────────────────────

    _renderTrendChart(container, analysis) {
        const title = document.createElement('div');
        title.className = 'hp-section-title';
        title.textContent = 'Pass Rate & Mean Trend';
        container.appendChild(title);

        const validYears = analysis.yearData.filter(yd => yd.stats.enrolled > 0);
        if (validYears.length < 2) {
            const note = document.createElement('div');
            note.style.cssText = 'font-size:0.8rem; color:var(--ui-gray-400); padding:1rem;';
            note.textContent = 'Need at least 2 years of data for trend chart.';
            container.appendChild(note);
            return;
        }

        const W = 600, H = 280;
        const pad = { left: 50, right: 20, top: 25, bottom: 35 };
        const cW = W - pad.left - pad.right;
        const cH = H - pad.top - pad.bottom;

        const years = validYears.map(yd => yd.year);
        const passRates = validYears.map(yd => yd.stats.passRate);
        const means = validYears.map(yd => yd.stats.mean);

        const xStep = cW / (years.length - 1);
        const toX = (i) => pad.left + i * xStep;
        const toY = (v) => pad.top + cH - (v / 100) * cH;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:600px; height:auto; display:block; margin:0 auto;">`;

        // Gridlines
        [25, 50, 75].forEach(v => {
            const y = toY(v);
            svg += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="4,3"/>`;
            svg += `<text x="${pad.left - 6}" y="${y + 3}" font-size="9" fill="var(--ui-gray-400)" text-anchor="end">${v}%</text>`;
        });
        // 0 and 100 labels
        svg += `<text x="${pad.left - 6}" y="${toY(0) + 3}" font-size="9" fill="var(--ui-gray-400)" text-anchor="end">0%</text>`;
        svg += `<text x="${pad.left - 6}" y="${toY(100) + 3}" font-size="9" fill="var(--ui-gray-400)" text-anchor="end">100%</text>`;

        // Pass threshold line at 50%
        const threshY = toY(50);
        svg += `<line x1="${pad.left}" y1="${threshY}" x2="${W - pad.right}" y2="${threshY}" stroke="var(--ui-danger)" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>`;

        // X-axis labels
        years.forEach((yr, i) => {
            svg += `<text x="${toX(i)}" y="${H - 8}" font-size="10" fill="var(--ui-gray-500)" text-anchor="middle">${yr}</text>`;
        });

        // Pass rate line (navy, solid)
        const prPoints = passRates.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
        svg += `<polyline points="${prPoints}" fill="none" stroke="var(--ui-primary-900)" stroke-width="2.5" stroke-linejoin="round"/>`;

        // Mean line (gold, dashed)
        const meanPoints = means.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
        svg += `<polyline points="${meanPoints}" fill="none" stroke="var(--ui-warning)" stroke-width="2" stroke-dasharray="6,3" stroke-linejoin="round"/>`;

        // Data points
        passRates.forEach((v, i) => {
            svg += `<circle cx="${toX(i)}" cy="${toY(v)}" r="4" fill="var(--ui-primary-900)" stroke="white" stroke-width="1.5"/>`;
        });
        means.forEach((v, i) => {
            svg += `<circle cx="${toX(i)}" cy="${toY(v)}" r="4" fill="var(--ui-warning)" stroke="white" stroke-width="1.5"/>`;
        });

        // Legend
        const lx = W - pad.right - 150;
        svg += `<line x1="${lx}" y1="12" x2="${lx + 20}" y2="12" stroke="var(--ui-primary-900)" stroke-width="2.5"/>`;
        svg += `<text x="${lx + 24}" y="15" font-size="9" fill="var(--ui-primary-900)">Pass Rate</text>`;
        svg += `<line x1="${lx + 80}" y1="12" x2="${lx + 100}" y2="12" stroke="var(--ui-warning)" stroke-width="2" stroke-dasharray="6,3"/>`;
        svg += `<text x="${lx + 104}" y="15" font-size="9" fill="var(--ui-warning)">Mean</text>`;

        svg += '</svg>';

        const chartEl = document.createElement('div');
        chartEl.style.marginBottom = '1rem';
        chartEl.innerHTML = svg;
        container.appendChild(chartEl);
    }

    // ── Enrollment Bar Chart ────────────────────────────────────────────────

    _renderEnrollmentChart(container, analysis) {
        const title = document.createElement('div');
        title.className = 'hp-section-title';
        title.textContent = 'Enrollment';
        container.appendChild(title);

        const validYears = analysis.yearData.filter(yd => yd.stats.enrolled > 0);
        if (validYears.length === 0) return;

        const W = 600, H = 120;
        const pad = { left: 40, right: 20, top: 15, bottom: 25 };
        const cW = W - pad.left - pad.right;
        const cH = H - pad.top - pad.bottom;

        const enrollments = validYears.map(yd => yd.stats.enrolled);
        const years = validYears.map(yd => yd.year);
        const maxEnroll = Math.max(...enrollments, 1);

        const barW = Math.min(40, cW / years.length * 0.6);
        const gap = (cW - barW * years.length) / (years.length + 1);

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:600px; height:auto; display:block; margin:0 auto;">`;

        enrollments.forEach((count, i) => {
            const x = pad.left + gap + i * (barW + gap);
            const barH = (count / maxEnroll) * cH;
            const y = pad.top + cH - barH;

            svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="var(--ui-primary-900)" rx="3"/>`;
            svg += `<text x="${x + barW / 2}" y="${y - 4}" font-size="9" fill="var(--ui-primary-900)" text-anchor="middle" font-weight="600">${count}</text>`;
            svg += `<text x="${x + barW / 2}" y="${H - 6}" font-size="9" fill="var(--ui-gray-500)" text-anchor="middle">${years[i]}</text>`;

            // Delta label between bars
            if (i > 0) {
                const delta = count - enrollments[i - 1];
                if (delta !== 0) {
                    const dColor = delta > 0 ? 'var(--ui-success)' : 'var(--ui-danger)';
                    const sign = delta > 0 ? '+' : '';
                    const midX = x - gap / 2;
                    svg += `<text x="${midX}" y="${pad.top + cH / 2}" font-size="8" fill="${dColor}" text-anchor="middle" font-weight="600">${sign}${delta}</text>`;
                }
            }
        });

        svg += '</svg>';

        const chartEl = document.createElement('div');
        chartEl.style.marginBottom = '1rem';
        chartEl.innerHTML = svg;
        container.appendChild(chartEl);
    }

    // ── Year-by-Year Detail Cards ───────────────────────────────────────────

    _renderYearCards(container, analysis) {
        const title = document.createElement('div');
        title.className = 'hp-section-title';
        title.textContent = 'Year-by-Year Breakdown';
        container.appendChild(title);

        const gradeColors = { A: 'var(--ui-success)', B: 'var(--ui-info)', C: 'var(--ui-warning)', D: 'var(--ui-warning)', F: 'var(--ui-danger)' };

        // Build a mini Publome for year cards
        const reversed = [...analysis.yearData].filter(yd => yd.stats.enrolled > 0).reverse();
        const yearPublome = new Publome({
            tables: [{ name: 'yearCard', columns: {
                idx: { type: 'number', primaryKey: true },
                year: { type: 'number' },
                enrolled: { type: 'number' },
                passRate: { type: 'number' },
                mean: { type: 'number' },
                stdDev: { type: 'number' },
                skewness: { type: 'number' },
                kurtosis: { type: 'number' },
                mode: { type: 'number' },
                cv: { type: 'number' },
                iqr: { type: 'number' }
            }}]
        });
        reversed.forEach((yd, i) => {
            const s = yd.stats;
            yearPublome.table('yearCard').create({
                idx: i + 1, year: s.year, enrolled: s.enrolled, passRate: s.passRate,
                mean: s.mean, stdDev: s.stdDev, skewness: s.skewness,
                kurtosis: s.kurtosis, mode: s.mode, cv: s.cv, iqr: s.iqr
            });
        });

        const listEl = document.createElement('div');
        container.appendChild(listEl);

        const self = this;
        const yearBinding = new UIBinding(yearPublome.table('yearCard'), { publome: yearPublome });
        yearBinding.bindCollection(listEl, {
            component: 'card',
            map: function(record) {
                const revIdx = record.get('idx') - 1;
                const yd = reversed[revIdx];
                const origIdx = analysis.yearData.indexOf(yd);
                const delta = analysis.yearDeltas[origIdx] || {};
                const s = yd.stats;

                // Build card content as HTML
                let html = '';
                html += `<div class="as-panel-header" style="margin-bottom:0.6rem;">`;
                html += `<span style="background:var(--ui-primary-900); color:white; padding:0.15rem 0.5rem; border-radius:3px; font-weight:700; font-size:0.85rem;">${yd.year}</span>`;
                html += `<span style="font-size:0.75rem; color:var(--ui-gray-600);">Enrolled: ${s.enrolled} | Pass Rate: ${s.passRate}% | Mean: ${s.mean}%</span>`;
                if (delta.passRate !== undefined) {
                    html += self._buildDeltaBadgeHtml('PR', delta.passRate);
                    html += self._buildDeltaBadgeHtml('\u03BC', delta.mean);
                    html += self._buildDeltaBadgeHtml('n', delta.enrolled);
                }
                html += '</div>';

                // Stats grid
                html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(6rem, 1fr)); gap:0.3rem; font-size:0.7rem;">';
                [{ label: 'SD', value: s.stdDev }, { label: 'Skewness', value: s.skewness },
                 { label: 'Kurtosis', value: s.kurtosis }, { label: 'Mode', value: s.mode },
                 { label: 'CV', value: s.cv + '%' }, { label: 'IQR', value: s.iqr }].forEach(si => {
                    html += `<div style="background:var(--ui-gray-50); padding:0.25rem 0.4rem; border-radius:3px;"><span style="color:var(--ui-gray-500);">${si.label}:</span> <strong>${si.value}</strong></div>`;
                });
                html += '</div>';

                return {
                    title: String(yd.year),
                    subtitle: `Enrolled: ${s.enrolled} | Pass Rate: ${s.passRate}%`,
                    body: html,
                    css: 'hp-year-card'
                };
            }
        });
    }

    _buildDeltaBadgeHtml(label, delta) {
        if (delta === undefined || delta === null) return '';
        const color = delta > 0 ? 'var(--ui-success)' : delta < 0 ? 'var(--ui-danger)' : 'var(--ui-gray-500)';
        const arrow = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2192';
        return `<span style="font-size:0.65rem; color:${color}; background:${color}15; padding:0.1rem 0.3rem; border-radius:2px; font-weight:600;">${label} ${arrow}${Math.abs(delta)}</span>`;
    }

    _appendDeltaBadge(parent, label, delta) {
        if (delta === undefined || delta === null) return;
        const color = delta > 0 ? 'var(--ui-success)' : delta < 0 ? 'var(--ui-danger)' : 'var(--ui-gray-500)';
        const arrow = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2192';
        const badge = document.createElement('span');
        badge.style.cssText = `font-size:0.65rem; color:${color}; background:${color}15; padding:0.1rem 0.3rem; border-radius:2px; font-weight:600;`;
        badge.textContent = `${label} ${arrow}${Math.abs(delta)}`;
        parent.appendChild(badge);
    }

    // ── Box Plot (SVG) ──────────────────────────────────────────────────────

    _renderBoxPlot(container, boxData) {
        const W = 300, H = 40;
        const pad = { left: 5, right: 5 };
        const cW = W - pad.left - pad.right;

        const toX = (v) => pad.left + (v / 100) * cW;

        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; max-width:300px; height:auto; display:block;">`;

        const midY = H / 2;

        // Whiskers: min to Q1
        svg += `<line x1="${toX(boxData.min)}" y1="${midY}" x2="${toX(boxData.q1)}" y2="${midY}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;
        // Whisker caps
        svg += `<line x1="${toX(boxData.min)}" y1="${midY - 6}" x2="${toX(boxData.min)}" y2="${midY + 6}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;

        // Whiskers: Q3 to max
        svg += `<line x1="${toX(boxData.q3)}" y1="${midY}" x2="${toX(boxData.max)}" y2="${midY}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;
        svg += `<line x1="${toX(boxData.max)}" y1="${midY - 6}" x2="${toX(boxData.max)}" y2="${midY + 6}" stroke="var(--ui-primary-900)" stroke-width="1"/>`;

        // Box: Q1 to Q3
        const boxX = toX(boxData.q1);
        const boxW = toX(boxData.q3) - boxX;
        svg += `<rect x="${boxX}" y="${midY - 10}" width="${boxW}" height="20" fill="#c5cae9" stroke="var(--ui-primary-900)" stroke-width="1" rx="2"/>`;

        // Median line
        svg += `<line x1="${toX(boxData.median)}" y1="${midY - 10}" x2="${toX(boxData.median)}" y2="${midY + 10}" stroke="var(--ui-danger)" stroke-width="2"/>`;

        // Pass threshold
        svg += `<line x1="${toX(50)}" y1="2" x2="${toX(50)}" y2="${H - 2}" stroke="var(--ui-danger)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.5"/>`;

        // Value labels
        svg += `<text x="${toX(boxData.min)}" y="${midY - 10}" font-size="7" fill="var(--ui-gray-500)" text-anchor="middle">${this._r(boxData.min)}</text>`;
        svg += `<text x="${toX(boxData.max)}" y="${midY - 10}" font-size="7" fill="var(--ui-gray-500)" text-anchor="middle">${this._r(boxData.max)}</text>`;
        svg += `<text x="${toX(boxData.median)}" y="${midY + 20}" font-size="7" fill="var(--ui-danger)" text-anchor="middle">Med: ${this._r(boxData.median)}</text>`;

        svg += '</svg>';

        const el = document.createElement('div');
        el.innerHTML = svg;
        container.appendChild(el);
    }

    // ── Assessment Table ────────────────────────────────────────────────────

    _renderAssessmentTable(container, assessStats, year) {
        const title = document.createElement('div');
        title.className = 'hp-section-title';
        title.innerHTML = `Assessment Analysis &mdash; ${year}`;
        container.appendChild(title);

        const table = document.createElement('table');
        table.className = 'as-an-data-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `<tr class="as-an-thead-row">
            <th style="text-align:left;">Code</th>
            <th style="text-align:right;">Count</th>
            <th style="text-align:right;">Mean</th>
            <th style="text-align:right;">SD</th>
            <th style="text-align:right;">Pass Rate</th>
            <th style="text-align:right;">Min</th>
            <th style="text-align:right;">Max</th>
        </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        assessStats.forEach(a => {
            const prColor = a.passRate >= 80 ? 'var(--ui-success)' : a.passRate >= 60 ? 'var(--ui-warning)' : 'var(--ui-danger)';
            const tr = document.createElement('tr');
            tr.className = 'as-hover-row-subtle';
            tr.innerHTML = `
                <td style="font-weight:600;">${a.code}</td>
                <td style="text-align:right;">${a.count}</td>
                <td style="text-align:right;">${a.mean}%</td>
                <td style="text-align:right;">${a.stdDev}</td>
                <td style="text-align:right; color:${prColor}; font-weight:600;">${a.passRate}%</td>
                <td style="text-align:right;">${a.min}</td>
                <td style="text-align:right;">${a.max}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    // ── Full Data Table (uiTable) ───────────────────────────────────────────

    _renderDataTable(container, analysis) {
        const title = document.createElement('div');
        title.className = 'hp-section-title';
        title.textContent = 'Summary Data';
        container.appendChild(title);

        const tableWrap = document.createElement('div');
        tableWrap.style.marginBottom = '1rem';
        container.appendChild(tableWrap);

        const columns = [
            { key: 'year', label: 'Year' },
            { key: 'enrolled', label: 'Enrolled' },
            { key: 'passed', label: 'Passed' },
            { key: 'failed', label: 'Failed' },
            { key: 'passRate', label: 'Pass Rate (%)' },
            { key: 'mean', label: 'Mean' },
            { key: 'median', label: 'Median' },
            { key: 'stdDev', label: 'SD' },
            { key: 'q1', label: 'Q1' },
            { key: 'q3', label: 'Q3' },
            { key: 'min', label: 'Min' },
            { key: 'max', label: 'Max' }
        ];

        const data = analysis.yearData
            .filter(yd => yd.stats.enrolled > 0)
            .map(yd => yd.stats);

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
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoricalPerformancePanel;
}
if (typeof window !== 'undefined') {
    window.HistoricalPerformancePanel = HistoricalPerformancePanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('HistoricalPerformancePanel', HistoricalPerformancePanel);
}
