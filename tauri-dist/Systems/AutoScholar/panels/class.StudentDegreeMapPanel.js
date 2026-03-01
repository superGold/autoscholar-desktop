/**
 * StudentDegreeMapPanel - Degree visualization + what-if planning
 *
 * Phase 1F deliverables from domain debate:
 *  - ApexCharts treemap of credits by year/module/status
 *  - Block-based requirement audit (Degree Works pattern)
 *  - Plan Ahead what-if calculator (client-side arithmetic)
 *
 * Renders into control-stage layout provided by StudentCentralPanel shell.
 */
class StudentDegreeMapPanel {

    constructor(settings = {}) {
        this._bridge = settings.bridge || null;
        this._apiData = settings.studentData || null;
        this._hasRealData = !!(this._apiData && this._apiData.studentNumber);
        this._treemapChart = null;
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._renderControls();
        this._renderStage();
    }

    // ── Controls ──────────────────────────────────────────────────────

    _renderControls() {
        var el = this._controlEl;
        el.innerHTML = '';
        var label = document.createElement('div');
        label.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2';
        label.textContent = 'Degree Map';
        el.appendChild(label);

        var hint = document.createElement('div');
        hint.className = 'text-xs text-gray-400 mb-3';
        hint.textContent = 'Credit overview, requirement audit, and what-if planning';
        el.appendChild(hint);

        // View toggles
        var views = [
            { key: 'treemap', label: 'Credit Map', icon: 'fa-th-large' },
            { key: 'audit', label: 'Requirements', icon: 'fa-clipboard-list' },
            { key: 'planner', label: 'Plan Ahead', icon: 'fa-calculator' }
        ];
        var self = this;
        views.forEach(function(v) {
            var btn = document.createElement('div');
            btn.className = 'as-dm-view-btn';
            btn.innerHTML = '<i class="fas ' + v.icon + ' as-dm-view-btn-icon"></i><span>' + v.label + '</span>';
            btn.addEventListener('click', function() { self._showView(v.key); });
            el.appendChild(btn);
        });
    }

    _showView(key) {
        if (key === 'treemap') this._renderTreemap();
        else if (key === 'audit') this._renderAudit();
        else if (key === 'planner') this._renderPlanner();
    }

    // ── Stage ─────────────────────────────────────────────────────────

    _renderStage() {
        this._renderTreemap();
    }

    // ── Treemap: Credits by Year/Module/Status ────────────────────────

    _renderTreemap() {
        var el = this._stageEl;
        el.innerHTML = '';

        // Build treemap data first so we can compute stats
        var modules = this._getModuleData();
        var earned = 0;
        var total = 0;
        modules.forEach(function(m) {
            total += m.credits;
            if (m.status === 'passed') earned += m.credits;
        });

        var title = document.createElement('div');
        title.className = 'flex items-center gap-2 mb-3';
        title.innerHTML = '<i class="fas fa-th-large as-dm-section-title-icon"></i>' +
            '<span class="font-semibold as-dm-section-title-text">Credit Map</span>' +
            '<span class="as-dm-section-subtitle">' + earned + ' / ' + total + ' credits earned</span>';
        el.appendChild(title);

        var chartEl = document.createElement('div');
        chartEl.id = 'sc-degree-treemap';
        chartEl.className = 'as-dm-chart';
        el.appendChild(chartEl);

        if (typeof ApexCharts !== 'undefined') {
            var series = [{
                data: modules.map(function(m) {
                    return {
                        x: m.code + ' (' + m.credits + 'cr)',
                        y: m.credits,
                        fillColor: m.status === 'passed' ? 'var(--ui-success)' :
                                   m.status === 'enrolled' ? 'var(--ui-primary)' :
                                   m.status === 'failed' ? 'var(--ui-danger)' : 'var(--ui-gray-300)'
                    };
                })
            }];

            var options = {
                series: series,
                chart: { type: 'treemap', height: 350, toolbar: { show: false } },
                plotOptions: {
                    treemap: { distributed: true, enableShades: false }
                },
                tooltip: {
                    custom: function({ seriesIndex, dataPointIndex, w }) {
                        var point = w.config.series[seriesIndex].data[dataPointIndex];
                        return '<div style="padding:8px; font-size:12px;">' +
                            '<strong>' + point.x + '</strong><br>' +
                            '<span style="color:' + point.fillColor + ';">●</span> ' +
                            point.y + ' credits</div>';
                    }
                }
            };

            if (this._treemapChart) this._treemapChart.destroy();
            this._treemapChart = new ApexCharts(chartEl, options);
            this._treemapChart.render();
        } else {
            chartEl.innerHTML = '<div class="as-dm-chart-empty"><i class="fas fa-chart-pie as-dm-chart-empty-icon"></i>ApexCharts not loaded</div>';
        }

        // Legend
        var legend = document.createElement('div');
        legend.className = 'as-dm-legend';
        legend.innerHTML =
            '<span><span class="as-dm-legend-passed">●</span> Passed</span>' +
            '<span><span class="as-dm-legend-enrolled">●</span> Enrolled</span>' +
            '<span><span class="as-dm-legend-failed">●</span> Failed</span>' +
            '<span><span class="as-dm-legend-remaining">●</span> Remaining</span>';
        el.appendChild(legend);
    }

    // ── Requirement Audit (Degree Works pattern) ──────────────────────

    _renderAudit() {
        var el = this._stageEl;
        el.innerHTML = '';

        var title = document.createElement('div');
        title.className = 'flex items-center gap-2 mb-3';
        title.innerHTML = '<i class="fas fa-clipboard-list as-dm-section-title-icon"></i>' +
            '<span class="font-semibold as-dm-section-title-text">Requirement Audit</span>';
        el.appendChild(title);

        var blocks = this._getAuditBlocks();

        var self = this;
        blocks.forEach(function(block) {
            var blockEl = document.createElement('div');
            blockEl.className = 'as-rounded-card';

            // Block header
            var header = document.createElement('div');
            var headerClass = block.status === 'complete' ? 'as-dm-block-header--complete' :
                               block.status === 'in-progress' ? 'as-dm-block-header--in-progress' : 'as-dm-block-header--not-started';
            header.className = 'as-dm-block-header ' + headerClass;

            var headerLeft = document.createElement('div');
            headerLeft.className = 'as-dm-block-header-left';
            var icon = block.status === 'complete' ? 'fa-check-circle' : block.status === 'in-progress' ? 'fa-spinner' : 'fa-circle';
            var iconColor = block.status === 'complete' ? 'var(--ui-success)' : block.status === 'in-progress' ? 'var(--ui-primary)' : 'var(--ui-gray-400)';
            headerLeft.innerHTML = '<i class="fas ' + icon + '" style="color:' + iconColor + ';"></i>' +
                '<span class="as-dm-block-header-name">' + block.name + '</span>';
            header.appendChild(headerLeft);

            var headerRight = document.createElement('span');
            headerRight.className = 'as-dm-block-header-credits';
            headerRight.textContent = block.earned + ' / ' + block.required + ' credits';
            header.appendChild(headerRight);
            blockEl.appendChild(header);

            // Module rows
            var body = document.createElement('div');
            block.modules.forEach(function(m) {
                var row = document.createElement('div');
                row.className = 'as-dm-module-row';

                var codeEl = document.createElement('span');
                codeEl.className = 'as-dm-module-code';
                codeEl.textContent = m.code;
                row.appendChild(codeEl);

                var nameEl = document.createElement('span');
                nameEl.className = 'as-dm-module-name';
                nameEl.textContent = m.name;
                row.appendChild(nameEl);

                var credEl = document.createElement('span');
                credEl.className = 'as-dm-module-credits';
                credEl.textContent = m.credits + 'cr';
                row.appendChild(credEl);

                var markEl = document.createElement('span');
                markEl.className = 'as-dm-module-mark';
                if (m.mark !== null) {
                    var markColor = m.mark >= 75 ? 'var(--ui-success)' : m.mark >= 50 ? 'var(--ui-primary)' : 'var(--ui-danger)';
                    markEl.setAttribute('style', 'color:' + markColor);
                    markEl.textContent = m.mark + '%';
                } else {
                    markEl.setAttribute('style', 'color:var(--ui-gray-300)');
                    markEl.textContent = '\u2014';
                }
                row.appendChild(markEl);

                // RAG status badge
                var statusEl = document.createElement('span');
                var rag = self._getModuleRAG(m);
                statusEl.className = 'as-dm-rag-badge';
                statusEl.setAttribute('style', 'background:' + rag.bg + ';color:' + rag.color);
                statusEl.textContent = rag.label;
                row.appendChild(statusEl);

                body.appendChild(row);
            });
            blockEl.appendChild(body);
            el.appendChild(blockEl);
        });
    }

    _getModuleRAG(m) {
        if (m.status === 'passed' && m.mark >= 75) return { label: 'Distinction', bg: 'var(--ui-success-50)', color: 'var(--ui-success)' };
        if (m.status === 'passed') return { label: 'Passed', bg: 'var(--ui-success-50)', color: 'var(--ui-success)' };
        if (m.status === 'enrolled') return { label: 'Enrolled', bg: 'var(--ui-primary-50)', color: 'var(--ui-primary)' };
        if (m.status === 'failed') return { label: 'Failed', bg: 'var(--ui-danger-50)', color: 'var(--ui-danger)' };
        return { label: 'Remaining', bg: 'var(--ui-gray-100)', color: 'var(--ui-gray-400)' };
    }

    // ── Plan Ahead Calculator ─────────────────────────────────────────

    _renderPlanner() {
        var el = this._stageEl;
        el.innerHTML = '';

        var title = document.createElement('div');
        title.className = 'flex items-center gap-2 mb-3';
        title.innerHTML = '<i class="fas fa-calculator as-dm-section-title-icon"></i>' +
            '<span class="font-semibold as-dm-section-title-text">Plan Ahead Calculator</span>' +
            '<span class="as-dm-section-subtitle">What-if scenario planner</span>';
        el.appendChild(title);

        var desc = document.createElement('div');
        desc.className = 'as-dm-planner-desc';
        desc.textContent = 'Adjust your expected marks for current modules to see how they affect your overall GPA and graduation timeline.';
        el.appendChild(desc);

        // Current stats
        var statsRow = document.createElement('div');
        statsRow.className = 'as-dm-stats-grid';
        el.appendChild(statsRow);

        var planStats = this._getPlannerStats();
        var stats = [
            { label: 'Current GPA', value: planStats.gpa + '%', icon: 'fa-chart-line' },
            { label: 'Credits Earned', value: planStats.earned + ' / ' + planStats.total, icon: 'fa-layer-group' },
            { label: 'Est. Completion', value: planStats.estCompletion, icon: 'fa-calendar-check' }
        ];
        stats.forEach(function(s) {
            var chip = document.createElement('div');
            chip.className = 'as-dm-stat-chip';
            chip.innerHTML = '<i class="fas ' + s.icon + ' as-dm-stat-chip-icon"></i>' +
                '<div><div class="as-dm-stat-label">' + s.label + '</div>' +
                '<div class="as-dm-stat-value">' + s.value + '</div></div>';
            statsRow.appendChild(chip);
        });

        // What-if sliders for current modules
        var whatIfTitle = document.createElement('div');
        whatIfTitle.className = 'as-dm-whatif-title';
        whatIfTitle.textContent = 'Adjust expected marks for enrolled modules:';
        el.appendChild(whatIfTitle);

        var currentModules = this._getEnrolledModules();

        var resultEl = document.createElement('div');
        resultEl.className = 'as-dm-projection';
        var self = this;

        var sliderValues = {};
        currentModules.forEach(function(m) {
            sliderValues[m.code] = m.expected;
            var row = document.createElement('div');
            row.className = 'as-dm-slider-row';

            var labelEl = document.createElement('div');
            labelEl.className = 'as-dm-slider-label';
            labelEl.innerHTML = '<div class="as-dm-slider-code">' + m.code + '</div>' +
                '<div class="as-dm-slider-name">' + m.name + '</div>';
            row.appendChild(labelEl);

            var slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = String(m.expected);
            slider.className = 'as-dm-slider-input';
            row.appendChild(slider);

            var valueEl = document.createElement('span');
            valueEl.className = 'as-dm-slider-value';
            valueEl.textContent = m.expected + '%';
            row.appendChild(valueEl);

            slider.addEventListener('input', function() {
                valueEl.textContent = slider.value + '%';
                sliderValues[m.code] = parseInt(slider.value);
                self._updateProjection(sliderValues, resultEl);
            });

            el.appendChild(row);
        });

        el.appendChild(resultEl);
        this._updateProjection(sliderValues, resultEl);
    }

    _updateProjection(sliderValues, resultEl) {
        // Compute from actual module data
        var ps = this._getPlannerStats();
        var passedCredits = ps.earned;
        var passedWeightedSum = ps.earned * ps.gpa;
        var totalDegreeCredits = ps.total;
        var newCredits = 0;
        var newWeightedSum = 0;
        var codes = Object.keys(sliderValues);
        for (var i = 0; i < codes.length; i++) {
            var mark = sliderValues[codes[i]];
            newCredits += 16;
            newWeightedSum += mark * 16;
        }
        var totalCredits = passedCredits + newCredits;
        var projectedGPA = totalCredits > 0 ? ((passedWeightedSum + newWeightedSum) / totalCredits).toFixed(1) : '0.0';
        var remaining = totalDegreeCredits - totalCredits;
        var allPass = true;
        var keys = Object.keys(sliderValues);
        for (var j = 0; j < keys.length; j++) {
            if (sliderValues[keys[j]] < 50) allPass = false;
        }

        var cumLaude = projectedGPA >= 75 ? 'Summa Cum Laude track' : projectedGPA >= 65 ? 'Cum Laude track' : 'Standard track';

        resultEl.innerHTML =
            '<div class="as-dm-projection-title">Projected Outcome</div>' +
            '<div class="as-dm-projection-grid">' +
            '<div><div class="as-dm-projection-label">Projected GPA</div><div class="as-dm-projection-value">' + projectedGPA + '%</div></div>' +
            '<div><div class="as-dm-projection-label">Credits Remaining</div><div class="as-dm-projection-value">' + remaining + '</div></div>' +
            '<div><div class="as-dm-projection-label">Academic Standing</div><div class="as-dm-projection-value--sm">' + cumLaude + '</div></div>' +
            '</div>' +
            (allPass ? '' : '<div class="as-dm-projection-warning"><i class="fas fa-exclamation-triangle"></i> One or more modules below 50% — risk of exclusion</div>');
    }

    // ── Data Helpers ──────────────────────────────────────────────────

    _getModuleData() {
        if (this._hasRealData) return this._modulesFromApi();
        return this._defaultModules();
    }

    _modulesFromApi() {
        var d = this._apiData;
        var results = d.results || [];
        if (results.length === 0) return this._defaultModules();
        return results.map(function(r) {
            var mark = parseFloat(r.result) || 0;
            var rc = (r.resultCode || '').toUpperCase();
            var status = rc === 'P' ? 'passed' : (mark > 0 && rc !== 'P' ? 'failed' : 'enrolled');
            return {
                code: r.courseCode || '',
                credits: parseFloat(r.credits) || 16,
                status: status,
                mark: mark,
                year: parseInt(r.year) || 0,
                semester: r.semester || ''
            };
        });
    }

    _defaultModules() {
        return [
            { code: 'PROG101', credits: 16, status: 'passed' },
            { code: 'MATH101', credits: 16, status: 'passed' },
            { code: 'NETW101', credits: 16, status: 'passed' },
            { code: 'DBAS101', credits: 16, status: 'passed' },
            { code: 'WEBD101', credits: 16, status: 'passed' },
            { code: 'COMP101', credits: 16, status: 'passed' },
            { code: 'ELEC101', credits: 8, status: 'passed' },
            { code: 'ELEC102', credits: 16, status: 'passed' },
            { code: 'PROG201', credits: 16, status: 'passed' },
            { code: 'MATH201', credits: 16, status: 'passed' },
            { code: 'NETW201', credits: 16, status: 'passed' },
            { code: 'DBAS201', credits: 16, status: 'enrolled' },
            { code: 'WEBD201', credits: 16, status: 'enrolled' },
            { code: 'PROJ201', credits: 16, status: 'passed' },
            { code: 'STAT201', credits: 8, status: 'passed' },
            { code: 'ELEC201', credits: 16, status: 'passed' },
            { code: 'PROG301', credits: 16, status: 'remaining' },
            { code: 'PROJ301', credits: 32, status: 'remaining' },
            { code: 'SECU301', credits: 16, status: 'remaining' },
            { code: 'CLOUD301', credits: 16, status: 'remaining' },
            { code: 'AIDV301', credits: 16, status: 'remaining' },
            { code: 'SMEF301', credits: 16, status: 'remaining' },
            { code: 'ELEC301', credits: 8, status: 'remaining' }
        ];
    }

    // ── Audit blocks: group by year from real data ─────────────────────

    _getAuditBlocks() {
        if (!this._hasRealData) return this._defaultAuditBlocks();
        var d = this._apiData;
        var results = d.results || [];
        if (results.length === 0) return this._defaultAuditBlocks();

        // Group results by year
        var yearMap = {};
        results.forEach(function(r) {
            var yr = parseInt(r.year) || 0;
            if (!yearMap[yr]) yearMap[yr] = [];
            yearMap[yr].push(r);
        });

        var years = Object.keys(yearMap).map(Number).sort();
        return years.map(function(yr) {
            var items = yearMap[yr];
            var modules = items.map(function(r) {
                var mark = parseFloat(r.result) || 0;
                var rc = (r.resultCode || '').toUpperCase();
                var status = rc === 'P' ? 'passed' : (mark > 0 && rc !== 'P' ? 'failed' : 'enrolled');
                return {
                    code: r.courseCode || '',
                    name: r.courseCode || '',
                    credits: parseFloat(r.credits) || 16,
                    mark: mark > 0 ? Math.round(mark) : null,
                    status: status
                };
            });
            var earned = 0;
            var required = 0;
            modules.forEach(function(m) {
                required += m.credits;
                if (m.status === 'passed') earned += m.credits;
            });
            var allPassed = modules.every(function(m) { return m.status === 'passed'; });
            var anyEnrolled = modules.some(function(m) { return m.status === 'enrolled' || m.status === 'failed'; });
            var blockStatus = allPassed ? 'complete' : (anyEnrolled ? 'in-progress' : 'not-started');
            return {
                name: 'Year ' + yr,
                required: required,
                earned: earned,
                status: blockStatus,
                modules: modules
            };
        });
    }

    _defaultAuditBlocks() {
        return [
            {
                name: 'Year 1 \u2014 Foundation',
                required: 120, earned: 120, status: 'complete',
                modules: [
                    { code: 'PROG101', name: 'Programming 1', credits: 16, mark: 72, status: 'passed' },
                    { code: 'MATH101', name: 'Mathematics 1', credits: 16, mark: 65, status: 'passed' },
                    { code: 'NETW101', name: 'Networking 1', credits: 16, mark: 58, status: 'passed' },
                    { code: 'DBAS101', name: 'Databases 1', credits: 16, mark: 78, status: 'passed' },
                    { code: 'WEBD101', name: 'Web Dev 1', credits: 16, mark: 71, status: 'passed' },
                    { code: 'COMP101', name: 'Computer Skills', credits: 16, mark: 82, status: 'passed' },
                    { code: 'ELEC101', name: 'Elective 1', credits: 8, mark: 69, status: 'passed' },
                    { code: 'ELEC102', name: 'Elective 2', credits: 16, mark: 61, status: 'passed' }
                ]
            },
            {
                name: 'Year 2 \u2014 Intermediate',
                required: 120, earned: 96, status: 'in-progress',
                modules: [
                    { code: 'PROG201', name: 'Programming 2', credits: 16, mark: 68, status: 'passed' },
                    { code: 'MATH201', name: 'Mathematics 2', credits: 16, mark: 55, status: 'passed' },
                    { code: 'NETW201', name: 'Networking 2', credits: 16, mark: 62, status: 'passed' },
                    { code: 'DBAS201', name: 'Databases 2', credits: 16, mark: null, status: 'enrolled' },
                    { code: 'WEBD201', name: 'Web Dev 2', credits: 16, mark: null, status: 'enrolled' },
                    { code: 'PROJ201', name: 'Project 2', credits: 16, mark: 71, status: 'passed' },
                    { code: 'STAT201', name: 'Statistics 2', credits: 8, mark: 48, status: 'passed' },
                    { code: 'ELEC201', name: 'Elective 3', credits: 16, mark: 64, status: 'passed' }
                ]
            },
            {
                name: 'Year 3 \u2014 Advanced',
                required: 120, earned: 24, status: 'not-started',
                modules: [
                    { code: 'PROG301', name: 'Programming 3', credits: 16, mark: null, status: 'remaining' },
                    { code: 'PROJ301', name: 'Capstone Project', credits: 32, mark: null, status: 'remaining' },
                    { code: 'SECU301', name: 'Security', credits: 16, mark: null, status: 'remaining' },
                    { code: 'CLOUD301', name: 'Cloud Computing', credits: 16, mark: null, status: 'remaining' },
                    { code: 'AIDV301', name: 'AI & Data Viz', credits: 16, mark: null, status: 'remaining' },
                    { code: 'SMEF301', name: 'Software Methods', credits: 16, mark: null, status: 'remaining' },
                    { code: 'ELEC301', name: 'Elective 4', credits: 8, mark: null, status: 'remaining' }
                ]
            }
        ];
    }

    // ── Planner stats: compute from real data ──────────────────────────

    _getPlannerStats() {
        var modules = this._getModuleData();
        var earned = 0;
        var total = 0;
        var weightedSum = 0;
        var passedCount = 0;
        modules.forEach(function(m) {
            total += m.credits;
            if (m.status === 'passed') {
                earned += m.credits;
                if (m.mark && m.mark > 0) {
                    weightedSum += m.mark * m.credits;
                    passedCount += m.credits;
                }
            }
        });
        var gpa = passedCount > 0 ? (weightedSum / passedCount).toFixed(1) : '0.0';
        // Estimate completion: remaining credits / ~120 per year
        var remaining = total - earned;
        var yearsLeft = Math.ceil(remaining / 120);
        var now = new Date();
        var estYear = now.getFullYear() + yearsLeft;
        var estCompletion = yearsLeft <= 0 ? 'Complete' : 'Dec ' + estYear;
        return { gpa: gpa, earned: earned, total: total, estCompletion: estCompletion };
    }

    _getEnrolledModules() {
        if (!this._hasRealData) {
            return [
                { code: 'DBAS201', name: 'Databases 2', credits: 16, expected: 65 },
                { code: 'WEBD201', name: 'Web Dev 2', credits: 16, expected: 70 }
            ];
        }
        var d = this._apiData;
        var results = d.results || [];
        var enrolled = results.filter(function(r) {
            var mark = parseFloat(r.result) || 0;
            var rc = (r.resultCode || '').toUpperCase();
            return mark === 0 && rc !== 'P';
        });
        if (enrolled.length === 0) {
            return [{ code: 'N/A', name: 'No enrolled modules', credits: 16, expected: 65 }];
        }
        return enrolled.map(function(r) {
            return {
                code: r.courseCode || '',
                name: r.courseCode || '',
                credits: parseFloat(r.credits) || 16,
                expected: 65
            };
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) module.exports = StudentDegreeMapPanel;
if (typeof window !== 'undefined') window.StudentDegreeMapPanel = StudentDegreeMapPanel;
