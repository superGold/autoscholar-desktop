/**
 * ExecStudentsPanel — Student progression, CAR, at-risk tracking
 *
 * Layout: uiControlStage
 * Control: Entity selector, risk filter, year
 * Stage sub-tabs: Progression Overview | Faculty Detail | At-Risk Analysis
 *
 * Usage:
 *   const panel = new ExecStudentsPanel({ publome, engine, year: 2025 });
 *   panel.render(container);
 */
class ExecStudentsPanel {

    constructor(config = {}) {
        this.publome = config.publome;
        this.engine  = config.engine;
        this._loader = config.loader;
        this.year    = config.year || 2025;
        this._container = null;
        this._controlEl = null;
        this._stageEl = null;
        this._entityIdx = null;
        this._subView = 'overview';
    }

    connectBus(bus) {
        this._bus = bus;
        bus.on('entity:selected', (data) => {
            this._entityIdx = data.idx;
            this._refreshStage();
        });
        bus.on('year:changed', (data) => {
            this.year = data.year;
            this.engine.clearCache();
            this._refreshStage();
        });
        return this;
    }

    render(container) {
        this._container = container;
        container.innerHTML = '';

        const cs = new uiControlStage({
            controlSize: 'md',
            template: 'unified',
            parent: container
        });

        this._controlEl = cs.getControlPanel();
        this._stageEl = cs.getStage();

        this._entityIdx = this._entityIdx || this._getInstitutionIdx();
        this._renderControl();
        this._refreshStage();
    }

    // ── Control ──────────────────────────────────────────────────────

    _renderControl() {
        const el = this._controlEl;
        el.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'ui-control-stage-header';
        header.innerHTML = '<i class="fas fa-user-graduate"></i> Students';
        el.appendChild(header);

        this._entityLabel = document.createElement('div');
        this._entityLabel.className = 'ex-ctrl-entity-label';
        el.appendChild(this._entityLabel);
        this._updateEntityLabel();

        // Sub-view nav
        const views = [
            { key: 'overview',    label: 'Progression',     icon: 'chart-line' },
            { key: 'faculty',     label: 'By Faculty',      icon: 'building' },
            { key: 'at-risk',     label: 'At-Risk',         icon: 'exclamation-triangle' },
            { key: 'predictive',  label: 'Predictive Risk', icon: 'brain' }
        ];

        const nav = document.createElement('div');
        nav.className = 'ex-col-stack';
        for (const v of views) {
            const btn = document.createElement('div');
            btn.className = 'ex-ctrl-nav-btn' + (this._subView === v.key ? ' active' : '');
            btn.innerHTML = `<i class="fas fa-${v.icon}"></i>${v.label}`;
            btn.addEventListener('click', () => {
                this._subView = v.key;
                this._renderControl();
                this._refreshStage();
            });
            nav.appendChild(btn);
        }
        el.appendChild(nav);

        // Info box
        const info = document.createElement('div');
        info.className = 'ex-ctrl-info';
        info.innerHTML = '<i class="fas fa-info-circle"></i> CAR = Credits Passed / Semesters. Students with CAR below the programme threshold are flagged at-risk.';
        el.appendChild(info);
    }

    // ── Stage ────────────────────────────────────────────────────────

    _refreshStage() {
        if (!this._stageEl) return;
        this._stageEl.innerHTML = '';
        this._updateEntityLabel();

        const entityIdx = this._entityIdx || this._getInstitutionIdx();
        if (!entityIdx) return;

        switch (this._subView) {
            case 'overview':    this._renderOverview(entityIdx); break;
            case 'faculty':     this._renderFacultyDetail(entityIdx); break;
            case 'at-risk':     this._renderAtRisk(entityIdx); break;
            case 'predictive':  this._renderPredictiveRisk(entityIdx); break;
        }
    }

    _renderOverview(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entity = this.publome.table('entity').read(entityIdx);
        const kpis = this.engine.getKPIs(entityIdx, this.year);

        // Title
        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-user-graduate"></i>Student Progression — ${entity ? entity.get('name') : ''}`;
        wrapper.appendChild(title);

        // KPI row
        const students = entity ? entity.get('students') : 0;
        const passRate = kpis['course-pass-rate']?.value;
        const retRate = kpis['retention-rate']?.value;
        const gradRate = kpis['graduation-rate']?.value;
        const atRiskPct = passRate != null ? Math.max(0, 100 - passRate) : null;
        const atRiskCount = students && atRiskPct != null ? Math.round(students * atRiskPct / 100) : null;

        const kpiRow = document.createElement('div');
        kpiRow.className = 'ex-kpi-row';

        const kpiCards = [
            { label: 'Total Students',  value: students,                       icon: 'users',               color: 'var(--ex-clr-primary)' },
            { label: 'Retention Rate',  value: retRate != null ? Math.round(retRate) + '%' : '—',           icon: 'user-check',         color: 'var(--ex-clr-success)' },
            { label: 'Graduation Rate', value: gradRate != null ? Math.round(gradRate) + '%' : '—',          icon: 'graduation-cap',     color: 'var(--ex-clr-purple)' },
            { label: 'At-Risk (est.)',  value: atRiskCount != null ? atRiskCount : '—',                      icon: 'exclamation-triangle', color: 'var(--ex-clr-danger)' },
            { label: 'Pass Rate',       value: passRate != null ? Math.round(passRate) + '%' : '—',          icon: 'check-circle',       color: 'var(--ex-clr-success)' }
        ];

        for (const k of kpiCards) {
            const card = document.createElement('div');
            card.className = 'ex-kpi-card';
            card.innerHTML = `
                <div class="ex-kpi-card-label">
                    <i class="fas fa-${k.icon}" style="color:${k.color};"></i>
                    <span>${k.label}</span>
                </div>
                <div class="ex-kpi-value-md">${k.value}</div>
            `;
            kpiRow.appendChild(card);
        }
        wrapper.appendChild(kpiRow);

        // Sankey flow diagram
        this._renderSankeyFlow(wrapper, entityIdx);

        // Progression by children
        const children = this.engine.getChildrenSummary(entityIdx, this.year);
        if (children.length > 0) {
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'ex-section-title';
            sectionTitle.textContent = 'Progression by Sub-entity';
            wrapper.appendChild(sectionTitle);

            this._renderProgressionTable(wrapper, children);
        }

        stage.appendChild(wrapper);
    }

    _renderFacultyDetail(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-building"></i>Faculty Progression Detail';
        wrapper.appendChild(title);

        // Get all faculties
        const instIdx = this._getInstitutionIdx();
        const faculties = this.engine.getChildren(instIdx);

        for (const fac of faculties) {
            const facIdx = fac.get('idx');
            const facKpis = this.engine.getKPIs(facIdx, this.year);
            const progs = this.engine.getChildrenSummary(facIdx, this.year);

            const facCard = document.createElement('div');
            facCard.className = 'ex-card';

            const pr = facKpis['course-pass-rate']?.value;
            const ret = facKpis['retention-rate']?.value;
            const prClr = this._valColor(pr, 70, 60);

            facCard.innerHTML = `
                <div class="ex-cat-header">
                    <div class="ex-cat-name">
                        <i class="fas fa-${fac.get('icon') || 'building'}" style="color:var(--ui-primary-400);"></i>
                        <span>${fac.get('name')}</span>
                    </div>
                    <div class="ex-row ex-faculty-stats">
                        <span>Pass: <strong style="color:${prClr};">${pr != null ? Math.round(pr) + '%' : '—'}</strong></span>
                        <span>Ret: <strong>${ret != null ? Math.round(ret) + '%' : '—'}</strong></span>
                        <span class="ex-clr-muted">${fac.get('students') || 0} students</span>
                    </div>
                </div>
            `;

            if (progs.length > 0) {
                this._renderProgressionTable(facCard, progs);
            }

            wrapper.appendChild(facCard);
        }

        stage.appendChild(wrapper);
    }

    _renderAtRisk(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-exclamation-triangle ex-clr-danger"></i> At-Risk Analysis';
        wrapper.appendChild(title);

        // Explanation
        const info = document.createElement('div');
        info.className = 'ex-info-box ex-info-danger';
        info.innerHTML = `
            <strong>At-Risk Identification Criteria:</strong>
            <ul>
                <li>Course pass rate below 60% (critical threshold)</li>
                <li>Retention rate below 80%</li>
                <li>Estimated at-risk students = total students × (100% - pass rate)</li>
            </ul>
        `;
        wrapper.appendChild(info);

        // Find at-risk entities across all levels
        const allEntities = this.publome.table('entity').all();
        const atRiskItems = [];

        for (const e of allEntities) {
            const eIdx = e.get('idx');
            const kpis = this.engine.getKPIs(eIdx, this.year);
            const pr = kpis['course-pass-rate']?.value;
            const ret = kpis['retention-rate']?.value;
            const students = e.get('students') || 0;

            if (pr != null && pr < 60) {
                atRiskItems.push({
                    name:     e.get('name'),
                    code:     e.get('code'),
                    type:     e.get('type'),
                    students,
                    passRate: pr,
                    retention: ret,
                    atRisk:   Math.round(students * (100 - pr) / 100),
                    severity: pr < 50 ? 'critical' : 'warning'
                });
            }
        }

        atRiskItems.sort((a, b) => a.passRate - b.passRate);

        if (atRiskItems.length === 0) {
            wrapper.innerHTML += `
                <div class="ex-empty ex-empty-success">
                    <i class="fas fa-check-circle"></i>
                    <div class="ex-empty-msg">No entities below the 60% pass rate threshold</div>
                </div>
            `;
        } else {
            const table = document.createElement('table');
            table.className = 'ex-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Entity</th>
                        <th class="center">Type</th>
                        <th class="right">Students</th>
                        <th class="right">Pass Rate</th>
                        <th class="right">Est. At-Risk</th>
                        <th class="center">Severity</th>
                    </tr>
                </thead>
                <tbody>
                    ${atRiskItems.map(item => {
                        const sevCls = item.severity === 'critical' ? 'ex-severity-critical' : 'ex-severity-warning';
                        return `<tr>
                            <td class="bold">${item.name}</td>
                            <td class="center"><span class="ex-type-badge">${item.type}</span></td>
                            <td class="right">${item.students}</td>
                            <td class="right emphasis ex-clr-danger">${Math.round(item.passRate)}%</td>
                            <td class="right emphasis ex-clr-danger">${item.atRisk}</td>
                            <td class="center"><span class="ex-severity-badge ${sevCls}">${item.severity.toUpperCase()}</span></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            `;
            wrapper.appendChild(table);
        }

        // Demographics section (async — appended when data arrives)
        if (atRiskItems.length > 0 && this._loader) {
            this._renderDemographicBreakdown(wrapper, entityIdx);
        } else if (atRiskItems.length > 0 && !this._loader) {
            var demoInfo = document.createElement('div');
            demoInfo.className = 'ex-card';
            new uiAlert({ variant: 'info', message: 'Demographic data requires API connection', parent: demoInfo, dismissible: false });
            wrapper.appendChild(demoInfo);
        }

        stage.appendChild(wrapper);
    }

    // ── Demographic Breakdown ─────────────────────────────────────────

    _renderDemographicBreakdown(parent, entityIdx) {
        const section = document.createElement('div');
        section.className = 'ex-card';
        section.innerHTML = '<div class="ex-section-title"><i class="fas fa-chart-pie"></i> At-Risk Demographics</div><div class="ex-empty"><i class="fas fa-spinner fa-spin"></i><div class="ex-empty-msg">Loading demographics...</div></div>';
        parent.appendChild(section);

        // Get programmes under this entity
        const entity = this.publome.table('entity').read(entityIdx);
        const type = entity ? entity.get('type') : '';
        let programmes = [];
        if (type === 'programme') {
            programmes = [entity];
        } else if (type === 'faculty') {
            programmes = this.engine.getChildren(entityIdx);
        } else {
            // institution — get all programmes via faculties
            const facs = this.engine.getChildren(entityIdx);
            for (const f of facs) {
                const progs = this.engine.getChildren(f.get('idx'));
                programmes.push(...progs);
            }
        }

        // Fetch biodata for up to 5 programmes
        const progSlice = programmes.slice(0, 5);
        const fetches = progSlice.map(p => this._loader.getStudentBiodata(p.get('code'), this.year));

        Promise.all(fetches).then(results => {
            const allBio = results.flat();
            if (allBio.length === 0) {
                section.innerHTML = '<div class="ex-section-title"><i class="fas fa-chart-pie"></i> At-Risk Demographics</div><div class="ex-empty"><div class="ex-empty-msg">No demographic data available</div></div>';
                return;
            }

            // Gender distribution
            const genderCounts = {};
            const langCounts = {};
            const ageBuckets = { '<20': 0, '20-25': 0, '25-30': 0, '30+': 0 };
            const currentYear = this.year;

            for (const s of allBio) {
                const g = s.gender || 'Unknown';
                genderCounts[g] = (genderCounts[g] || 0) + 1;
                const l = s.language || 'Unknown';
                langCounts[l] = (langCounts[l] || 0) + 1;
                if (s.dob) {
                    const age = currentYear - parseInt(String(s.dob).substring(0, 4));
                    if (age < 20) ageBuckets['<20']++;
                    else if (age < 25) ageBuckets['20-25']++;
                    else if (age < 30) ageBuckets['25-30']++;
                    else ageBuckets['30+']++;
                }
            }

            // Top 5 languages
            const topLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

            let html = '<div class="ex-section-title"><i class="fas fa-chart-pie"></i> At-Risk Demographics</div>';
            html += '<div class="ex-flex-wrap">';

            // Gender bars
            html += '<div class="ex-demo-col">';
            html += '<div class="ex-chart-subtitle ex-demo-subtitle">Gender Distribution</div>';
            html += this._buildBarChart(Object.entries(genderCounts), allBio.length, ['var(--ex-clr-primary)', 'var(--ex-clr-pink)', 'var(--ex-clr-purple)', 'var(--ui-gray-500)']);
            html += '</div>';

            // Language bars
            html += '<div class="ex-demo-col">';
            html += '<div class="ex-chart-subtitle ex-demo-subtitle">Top Languages</div>';
            html += this._buildBarChart(topLangs, allBio.length, ['var(--ex-clr-success)', 'var(--ex-clr-cyan)', 'var(--ex-clr-primary)', 'var(--ex-clr-indigo)', 'var(--ex-clr-purple)']);
            html += '</div>';

            // Age bars
            html += '<div class="ex-demo-col">';
            html += '<div class="ex-chart-subtitle ex-demo-subtitle">Age Groups</div>';
            html += this._buildBarChart(Object.entries(ageBuckets), allBio.length, ['var(--ex-clr-warning)', 'var(--ex-clr-orange)', 'var(--ex-clr-danger)', 'var(--ex-clr-danger)']);
            html += '</div>';

            html += '</div>';
            section.innerHTML = html;
        }).catch(() => {
            section.innerHTML = '<div class="ex-section-title"><i class="fas fa-chart-pie"></i> At-Risk Demographics</div><div class="ex-empty"><div class="ex-empty-msg">Demographics data unavailable</div></div>';
        });
    }

    _buildBarChart(entries, total, colors) {
        let html = '';
        entries.forEach(([label, count], i) => {
            const pct = total > 0 ? (count / total * 100) : 0;
            const clr = colors[i % colors.length];
            html += `<div class="ex-bar-row">
                <div class="ex-bar-label ex-bar-label-sm">${label}</div>
                <div class="ex-bar-track ex-bar-track-sm">
                    <div class="ex-bar-fill" style="width:${Math.max(pct, 2)}%;background:${clr};"></div>
                </div>
                <div class="ex-bar-value-sm">${count} (${Math.round(pct)}%)</div>
            </div>`;
        });
        return html;
    }

    // ── Predictive Risk ───────────────────────────────────────────────

    _renderPredictiveRisk(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-brain ex-clr-purple"></i> Predictive Risk Analysis';
        wrapper.appendChild(title);

        // Info
        const info = document.createElement('div');
        info.className = 'ex-info-box ex-info-purple';
        info.innerHTML = `
            <strong>Rule-Based Risk Model:</strong>
            <ul>
                <li><span class="ex-clr-danger ex-font-bold">High Risk:</span> TM1 &lt; 40% AND TM2 &lt; 45%</li>
                <li><span class="ex-clr-warning ex-font-bold">Medium Risk:</span> TM1 &lt; 50% AND TM2 &lt; 50%</li>
                <li><span class="ex-clr-orange ex-font-bold">Declining:</span> TM2 drops &gt; 15% from TM1</li>
            </ul>
        `;
        wrapper.appendChild(info);

        if (!this._loader) {
            wrapper.innerHTML += '<div class="ex-empty"><div class="ex-empty-msg">Predictive risk requires a data loader connection.</div></div>';
            stage.appendChild(wrapper);
            return;
        }

        // Spinner
        const spinner = document.createElement('div');
        spinner.className = 'ex-empty';
        spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i><div class="ex-empty-msg">Analysing student risk profiles...</div>';
        wrapper.appendChild(spinner);
        stage.appendChild(wrapper);

        // Get programmes
        const entity = this.publome.table('entity').read(entityIdx);
        const type = entity ? entity.get('type') : '';
        let programmes = [];
        if (type === 'programme') {
            programmes = [entity];
        } else if (type === 'faculty') {
            programmes = this.engine.getChildren(entityIdx);
        } else {
            const facs = this.engine.getChildren(entityIdx);
            for (const f of facs) programmes.push(...this.engine.getChildren(f.get('idx')));
        }

        const progSlice = programmes.slice(0, 8);
        const fetches = progSlice.map(p => this._loader.getPredictiveRisk(p.get('code'), this.year).then(r => ({ prog: p, risk: r })));

        Promise.all(fetches).then(results => {
            spinner.remove();

            // Aggregate risk counts
            let high = 0, medium = 0, declining = 0, low = 0;
            const allStudents = [];
            for (const { prog, risk } of results) {
                for (const s of risk) {
                    s._progName = prog.get('name');
                    s._progCode = prog.get('code');
                    allStudents.push(s);
                    if (s.riskLevel === 'High') high++;
                    else if (s.riskLevel === 'Medium') medium++;
                    else if (s.riskLevel === 'Declining') declining++;
                    else low++;
                }
            }

            const total = allStudents.length;

            // Risk distribution stacked bar
            const distSection = document.createElement('div');

            const pHigh = total > 0 ? high / total * 100 : 0;
            const pMed = total > 0 ? medium / total * 100 : 0;
            const pDec = total > 0 ? declining / total * 100 : 0;
            const pLow = total > 0 ? low / total * 100 : 0;

            distSection.innerHTML = `
                <div class="ex-chart-subtitle ex-demo-subtitle">Risk Distribution (${total} students analysed)</div>
                <div class="ex-progress-stacked">
                    ${pHigh > 0 ? `<div style="width:${pHigh}%;background:var(--ex-clr-danger);" title="High Risk: ${high}"></div>` : ''}
                    ${pMed > 0 ? `<div style="width:${pMed}%;background:var(--ex-clr-warning);" title="Medium Risk: ${medium}"></div>` : ''}
                    ${pDec > 0 ? `<div style="width:${pDec}%;background:var(--ex-clr-orange);" title="Declining: ${declining}"></div>` : ''}
                    ${pLow > 0 ? `<div style="width:${pLow}%;background:var(--ex-clr-success);" title="Low Risk: ${low}"></div>` : ''}
                </div>
                <div class="ex-chart-legend">
                    <span><span class="ex-legend-swatch" style="background:var(--ex-clr-danger);"></span>High: ${high}</span>
                    <span><span class="ex-legend-swatch" style="background:var(--ex-clr-warning);"></span>Medium: ${medium}</span>
                    <span><span class="ex-legend-swatch" style="background:var(--ex-clr-orange);"></span>Declining: ${declining}</span>
                    <span><span class="ex-legend-swatch" style="background:var(--ex-clr-success);"></span>Low: ${low}</span>
                </div>
            `;
            wrapper.appendChild(distSection);

            // High-risk students table
            const highRisk = allStudents.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Declining').sort((a, b) => (a.failProb || 0) - (b.failProb || 0)).reverse();

            if (highRisk.length > 0) {
                const tableTitle = document.createElement('div');
                tableTitle.className = 'ex-section-title';
                tableTitle.textContent = `High Risk & Declining Students (${highRisk.length})`;
                wrapper.appendChild(tableTitle);

                const table = document.createElement('table');
                table.className = 'ex-table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Programme</th>
                            <th class="center">TM1</th>
                            <th class="center">TM2</th>
                            <th class="center">Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${highRisk.slice(0, 50).map(s => {
                            const rCls = s.riskLevel === 'High' ? 'ex-severity-high' : 'ex-severity-declining';
                            return `<tr>
                                <td>${s.studentNumber}</td>
                                <td class="muted">${s._progName}</td>
                                <td class="center emphasis" style="color:${this._valColor(s.tm1, 50, 40)};">${s.tm1 != null ? Math.round(s.tm1) : '—'}</td>
                                <td class="center emphasis" style="color:${this._valColor(s.tm2, 50, 40)};">${s.tm2 != null ? Math.round(s.tm2) : '—'}</td>
                                <td class="center"><span class="ex-severity-badge ${rCls}">${s.riskLevel}</span></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                `;
                wrapper.appendChild(table);
            } else {
                wrapper.innerHTML += '<div class="ex-empty ex-empty-success"><i class="fas fa-check-circle"></i><div class="ex-empty-msg">No high-risk students identified in analysed programmes</div></div>';
            }
        }).catch(() => {
            spinner.innerHTML = '<i class="fas fa-exclamation-circle ex-clr-danger"></i> Could not load predictive risk data';
        });
    }

    // ── Sankey Flow ───────────────────────────────────────────────────

    _renderSankeyFlow(parent, entityIdx) {
        const entity = this.publome.table('entity').read(entityIdx);
        const kpis = this.engine.getKPIs(entityIdx, this.year);
        const students = entity ? (entity.get('students') || 0) : 0;
        if (students === 0) return;

        const passRate = kpis['course-pass-rate']?.value || 0;
        const retRate = kpis['retention-rate']?.value || 0;
        const gradRate = kpis['graduation-rate']?.value || 0;

        // Stage counts
        const registered = students;
        const retained = Math.round(registered * retRate / 100);
        const passed = Math.round(registered * passRate / 100);
        const graduated = Math.round(registered * gradRate / 100);

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ex-section-title';
        sectionTitle.textContent = 'Student Flow';
        parent.appendChild(sectionTitle);

        const W = 520, H = 100, barW = 30, gapX = (W - 4 * barW) / 3;
        const maxH = 70, topY = 15;
        const stages = [
            { label: 'Registered', count: registered, color: 'var(--ex-clr-primary)' },
            { label: 'Retained',   count: retained,   color: 'var(--ex-clr-info)' },
            { label: 'Passed',     count: passed,     color: 'var(--ex-clr-success)' },
            { label: 'Graduated',  count: graduated,  color: 'var(--ex-clr-purple)' }
        ];

        const maxCount = registered || 1;
        let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:520px;height:auto;display:block;margin:0 auto 0.75rem;">`;

        // Draw bars and flows
        for (let i = 0; i < stages.length; i++) {
            const s = stages[i];
            const x = i * (barW + gapX);
            const h = Math.max((s.count / maxCount) * maxH, 6);
            const y = topY + (maxH - h);

            // Bar
            svg += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${s.color}" rx="3"/>`;
            // Count
            svg += `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="7" font-weight="700" fill="${s.color}">${s.count}</text>`;
            // Label
            svg += `<text x="${x + barW / 2}" y="${topY + maxH + 10}" text-anchor="middle" font-size="6" fill="var(--ui-gray-500)">${s.label}</text>`;

            // Flow path to next
            if (i < stages.length - 1) {
                const next = stages[i + 1];
                const nextH = Math.max((next.count / maxCount) * maxH, 6);
                const nextY = topY + (maxH - nextH);
                const x1 = x + barW;
                const x2 = (i + 1) * (barW + gapX);

                // Top path
                const topPathY1 = y;
                const topPathY2 = nextY;
                // Bottom path
                const botPathY1 = y + h;
                const botPathY2 = nextY + nextH;
                const cx = (x1 + x2) / 2;

                svg += `<path d="M${x1},${topPathY1} C${cx},${topPathY1} ${cx},${topPathY2} ${x2},${topPathY2} L${x2},${botPathY2} C${cx},${botPathY2} ${cx},${botPathY1} ${x1},${botPathY1} Z" fill="${s.color}" opacity="0.15"/>`;

                // Dropout annotation
                const dropout = s.count - next.count;
                if (dropout > 0) {
                    const dropY = topY + maxH + 10;
                    const dropX = (x1 + x2) / 2;
                    svg += `<text x="${dropX}" y="${dropY - 14}" text-anchor="middle" font-size="5.5" fill="var(--ex-clr-danger)">-${dropout}</text>`;
                }
            }
        }

        svg += '</svg>';
        const container = document.createElement('div');
        container.innerHTML = svg;
        parent.appendChild(container);
    }

    // ── Shared ───────────────────────────────────────────────────────

    _renderProgressionTable(parent, items) {
        const table = document.createElement('table');
        table.className = 'ex-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th class="right">Students</th>
                    <th class="right">Pass Rate</th>
                    <th class="right">Retention</th>
                    <th class="right">Graduation</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(c => `
                    <tr>
                        <td>${c.name}</td>
                        <td class="right">${c.students}</td>
                        <td class="right bold" style="color:${this._valColor(c['course-pass-rate'], 70, 60)};">${c['course-pass-rate'] != null ? Math.round(c['course-pass-rate']) + '%' : '—'}</td>
                        <td class="right" style="color:${this._valColor(c['retention-rate'], 85, 75)};">${c['retention-rate'] != null ? Math.round(c['retention-rate']) + '%' : '—'}</td>
                        <td class="right" style="color:${this._valColor(c['graduation-rate'], 75, 65)};">${c['graduation-rate'] != null ? Math.round(c['graduation-rate']) + '%' : '—'}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        parent.appendChild(table);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    _getInstitutionIdx() {
        const inst = this.publome.table('entity').all().find(e => e.get('type') === 'institution');
        return inst ? inst.get('idx') : null;
    }

    _updateEntityLabel() {
        if (!this._entityLabel) return;
        const idx = this._entityIdx || this._getInstitutionIdx();
        if (idx) {
            const e = this.publome.table('entity').read(idx);
            this._entityLabel.textContent = e ? e.get('name') : 'Unknown';
        } else {
            this._entityLabel.textContent = 'No entity selected';
        }
    }

    _valColor(val, good, ok) { return ExecMetrics.valColor(val, good, ok); }
}
