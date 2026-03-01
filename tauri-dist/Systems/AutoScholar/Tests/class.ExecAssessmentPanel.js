/**
 * ExecAssessmentPanel — Assessment type analysis (TM_1, TM_2, FINAL, etc.)
 *
 * Layout: uiControlStage
 * Control: Entity selector, assessment type filter
 * Stage sub-tabs: Overview | Faculty | Programme
 *
 * Usage:
 *   const panel = new ExecAssessmentPanel({ publome, engine, year: 2025 });
 *   panel.render(container);
 */
class ExecAssessmentPanel {

    constructor(config = {}) {
        this.publome = config.publome;
        this.engine  = config.engine;
        this.year    = config.year || 2025;
        this._loader = config.loader;
        this._container = null;
        this._controlEl = null;
        this._stageEl = null;
        this._entityIdx = null;
        this._subView = 'overview';
        this._selectedType = null;  // null = all types

        // Assessment type definitions
        this._assessTypes = [
            { code: 'TM_1',  label: 'Test/Midterm 1',  icon: 'file-alt',       desc: 'First formal assessment',     weight: 15, color: 'var(--ex-clr-primary)' },
            { code: 'TM_2',  label: 'Test/Midterm 2',  icon: 'file-alt',       desc: 'Second formal assessment',    weight: 15, color: 'var(--ex-clr-indigo)' },
            { code: 'TM_3',  label: 'Test/Midterm 3',  icon: 'file-alt',       desc: 'Third formal assessment',     weight: 10, color: 'var(--ex-clr-purple)' },
            { code: 'FINAL', label: 'Final Exam',       icon: 'graduation-cap', desc: 'End of semester exam',         weight: 40, color: 'var(--ex-clr-danger)' },
            { code: 'PRAC',  label: 'Practical',         icon: 'flask',          desc: 'Lab/practical work',           weight: 10, color: 'var(--ex-clr-success)' },
            { code: 'PROJ',  label: 'Project',           icon: 'project-diagram', desc: 'Project submissions',        weight: 10, color: 'var(--ex-clr-warning)' }
        ];
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
        header.innerHTML = '<i class="fas fa-clipboard-check"></i>Assessment';
        el.appendChild(header);

        this._entityLabel = document.createElement('div');
        this._entityLabel.className = 'ex-ctrl-entity-label';
        el.appendChild(this._entityLabel);
        this._updateEntityLabel();

        // Assessment type filter
        const filterLabel = document.createElement('label');
        filterLabel.className = 'ex-ctrl-select-label';
        filterLabel.style.display = 'block';
        filterLabel.textContent = 'Assessment Types';
        el.appendChild(filterLabel);

        const typeList = document.createElement('div');
        typeList.className = 'ex-col-stack ex-mb-lg';

        // "All" option
        const allBtn = document.createElement('div');
        allBtn.className = 'ex-ctrl-nav-btn' + (this._selectedType === null ? ' active' : '');
        allBtn.innerHTML = '<i class="fas fa-layer-group"></i>All Types';
        allBtn.addEventListener('click', () => { this._selectedType = null; this._renderControl(); this._refreshStage(); });
        typeList.appendChild(allBtn);

        for (const t of this._assessTypes) {
            const btn = document.createElement('div');
            btn.className = 'ex-ctrl-nav-btn' + (this._selectedType === t.code ? ' active' : '');
            btn.innerHTML = `<i class="fas fa-${t.icon}" style="color:${t.color};"></i>${t.label}`;
            btn.addEventListener('click', () => { this._selectedType = t.code; this._renderControl(); this._refreshStage(); });
            typeList.appendChild(btn);
        }
        el.appendChild(typeList);

        // Sub-view nav
        const views = [
            { key: 'overview',  label: 'Overview',    icon: 'th-large' },
            { key: 'faculty',   label: 'Faculties',    icon: 'building' },
            { key: 'programme', label: 'Programmes',   icon: 'book' },
            { key: 'alignment', label: 'Alignment',    icon: 'exchange-alt' },
            { key: 'calendar',  label: 'Calendar',     icon: 'calendar-alt' }
        ];

        const sep = document.createElement('div');
        sep.className = 'ex-ctrl-view-sep';
        el.appendChild(sep);

        const nav = document.createElement('div');
        nav.className = 'ex-col-stack';
        for (const v of views) {
            const btn = document.createElement('div');
            btn.className = 'ex-ctrl-nav-btn' + (this._subView === v.key ? ' active' : '');
            btn.innerHTML = `<i class="fas fa-${v.icon}"></i>${v.label}`;
            btn.addEventListener('click', () => { this._subView = v.key; this._renderControl(); this._refreshStage(); });
            nav.appendChild(btn);
        }
        el.appendChild(nav);
    }

    // ── Stage ────────────────────────────────────────────────────────

    _refreshStage() {
        if (!this._stageEl) return;
        this._stageEl.innerHTML = '';
        this._updateEntityLabel();

        const entityIdx = this._entityIdx || this._getInstitutionIdx();
        if (!entityIdx) return;

        switch (this._subView) {
            case 'overview':   this._renderOverview(entityIdx); break;
            case 'faculty':    this._renderLevelBreakdown(entityIdx, 'faculty'); break;
            case 'programme':  this._renderLevelBreakdown(entityIdx, 'programme'); break;
            case 'alignment':  this._renderAlignment(entityIdx); break;
            case 'calendar':   this._renderCalendar(entityIdx); break;
        }
    }

    async _renderOverview(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entity = this.publome.table('entity').read(entityIdx);

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-clipboard-check"></i>Assessment Overview — ${entity ? entity.get('name') : ''}`;
        wrapper.appendChild(title);

        const types = this._selectedType ? this._assessTypes.filter(t => t.code === this._selectedType) : this._assessTypes;
        const loadIdx = this._entityIdx;

        // Show spinner while loading API data
        if (this._loader?.dataSource === 'api') {
            const spinnerWrap = document.createElement('div');
            spinnerWrap.className = 'ex-empty';
            new uiSpinner({ template: 'dots', size: 'md', parent: spinnerWrap });
            const spinLabel = document.createElement('div');
            spinLabel.className = 'ex-empty-msg';
            spinLabel.textContent = 'Loading assessment data...';
            spinnerWrap.appendChild(spinLabel);
            wrapper.appendChild(spinnerWrap);
            stage.appendChild(wrapper);

            try {
                const apiStats = await this._loader.getAssessmentStats(entityIdx, this.year);
                if (this._entityIdx !== loadIdx) return;
                spinnerWrap.remove();
                this._renderOverviewCards(wrapper, types, apiStats, entityIdx);
            } catch (e) {
                if (this._entityIdx !== loadIdx) return;
                spinnerWrap.remove();
                this._renderOverviewCards(wrapper, types, null, entityIdx);
            }
        } else {
            // Seed mode — use simulation
            this._renderOverviewCards(wrapper, types, null, entityIdx);
            stage.appendChild(wrapper);
        }

        // Mark distribution histograms
        this._renderHistograms(wrapper, entityIdx);

        // Early warning section
        const warnTitle = document.createElement('div');
        warnTitle.className = 'ex-section-title';
        warnTitle.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:var(--ex-clr-warning);margin-right:0.3rem;"></i>Early Warning Indicators';
        wrapper.appendChild(warnTitle);

        const warnInfo = document.createElement('div');
        warnInfo.className = 'ex-info-box ex-info-warning';
        warnInfo.innerHTML = `
            <strong>Assessment-Based Early Warning System:</strong>
            <ul>
                <li><strong>After TM_1:</strong> Students scoring below 40% are flagged for immediate intervention</li>
                <li><strong>TM_1 vs TM_2 comparison:</strong> Students declining by > 10% trigger additional support</li>
                <li><strong>Pre-Final risk:</strong> Students with combined DP mark below 45% are flagged before final exam</li>
                <li><strong>Assessment type gap:</strong> If practical marks are > 15% higher than test marks, additional support for test preparation</li>
            </ul>
        `;
        wrapper.appendChild(warnInfo);
    }

    /**
     * Render assessment type cards. If apiStats provided, use real data.
     * Otherwise fall back to simulation using entityIdx.
     */
    _renderOverviewCards(wrapper, types, apiStats, simEntityIdx) {
        const grid = document.createElement('div');
        grid.className = 'ex-grid';
        grid.className += ' ex-mb-xl';

        for (const t of types) {
            const data = apiStats && apiStats[t.code]
                ? apiStats[t.code]
                : this._simulateAssessmentData(simEntityIdx, t.code);

            const card = document.createElement('div');
            card.className = 'ex-card';
            card.style.borderTop = `3px solid ${t.color}`;

            const passClr = data.passRate >= 70 ? 'var(--ex-clr-success)' : data.passRate >= 60 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
            const meanVal = data.mean != null ? `${data.mean}%` : '\u2014';
            const passVal = data.passRate != null ? `${data.passRate}%` : '\u2014';
            const sdVal = data.stdDev != null ? data.stdDev : '\u2014';

            card.innerHTML = `
                <div class="ex-row-between ex-mb-md">
                    <div class="ex-row">
                        <i class="fas fa-${t.icon}" style="color:${t.color};font-size:0.7rem;"></i>
                        <span class="ex-chart-title">${t.label}</span>
                    </div>
                    <span class="ex-kpi-target">Weight: ${t.weight}%</span>
                </div>
                <div class="ex-kpi-row ex-mb-sm">
                    <div>
                        <div class="ex-kpi-target">Mean</div>
                        <div class="ex-kpi-value-md">${meanVal}</div>
                    </div>
                    <div>
                        <div class="ex-kpi-target">Pass Rate</div>
                        <div class="ex-kpi-value-md" style="color:${passClr};">${passVal}</div>
                    </div>
                    <div>
                        <div class="ex-kpi-target">Std Dev</div>
                        <div class="ex-kpi-value-md" style="color:var(--ui-gray-600);">${sdVal}</div>
                    </div>
                </div>
                <div class="ex-kpi-target" style="line-height:1.4;">${t.desc}${data.students ? ` <span class="ex-clr-muted">(n=${data.students})</span>` : ''}</div>
            `;
            grid.appendChild(card);
        }
        wrapper.appendChild(grid);
    }

    async _renderLevelBreakdown(entityIdx, level) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-${level === 'faculty' ? 'building' : 'book'}"></i>${level === 'faculty' ? 'Faculty' : 'Programme'} Assessment Breakdown`;
        wrapper.appendChild(title);

        let items;
        if (level === 'faculty') {
            const instIdx = this._getInstitutionIdx();
            items = this.engine.getChildren(instIdx).map(e => ({
                idx: e.get('idx'), name: e.get('name'), code: e.get('code'), students: e.get('students')
            }));
        } else {
            const instIdx = this._getInstitutionIdx();
            items = [];
            for (const f of this.engine.getChildren(instIdx)) {
                for (const p of this.engine.getChildren(f.get('idx'))) {
                    items.push({ idx: p.get('idx'), name: p.get('name'), code: p.get('code'), students: p.get('students'), faculty: f.get('name') });
                }
            }
        }

        const types = this._selectedType ? this._assessTypes.filter(t => t.code === this._selectedType) : this._assessTypes;
        const loadIdx = this._entityIdx;

        // API mode: show spinner and fetch real stats per child entity
        if (this._loader?.dataSource === 'api') {
            const spinnerWrap = document.createElement('div');
            spinnerWrap.className = 'ex-empty';
            new uiSpinner({ template: 'dots', size: 'md', parent: spinnerWrap });
            const spinLabel = document.createElement('div');
            spinLabel.className = 'ex-empty-msg';
            spinLabel.textContent = `Loading ${level} assessment data...`;
            spinnerWrap.appendChild(spinLabel);
            wrapper.appendChild(spinnerWrap);
            stage.appendChild(wrapper);

            try {
                const allStats = await Promise.all(
                    items.map(item => this._loader.getAssessmentStats(item.idx, this.year))
                );
                if (this._entityIdx !== loadIdx) return;
                spinnerWrap.remove();

                const itemStats = items.map((item, i) => ({ ...item, stats: allStats[i] }));
                this._renderBreakdownTable(wrapper, itemStats, types);
            } catch (e) {
                if (this._entityIdx !== loadIdx) return;
                spinnerWrap.remove();
                // Fallback to simulation
                const itemStats = items.map(item => ({ ...item, stats: null }));
                this._renderBreakdownTable(wrapper, itemStats, types);
            }
        } else {
            // Seed mode — simulation
            const itemStats = items.map(item => ({ ...item, stats: null }));
            this._renderBreakdownTable(wrapper, itemStats, types);
            stage.appendChild(wrapper);
        }
    }

    /**
     * Render the breakdown comparison table. Each item has .stats (from API) or null (use simulation).
     */
    _renderBreakdownTable(wrapper, itemStats, types) {
        const table = document.createElement('table');
        table.className = 'ex-table';

        let thHtml = '<th>Entity</th>';
        for (const t of types) {
            thHtml += `<th class="center" style="color:${t.color};">${t.code}</th>`;
        }

        let tbodyHtml = '';
        for (const item of itemStats) {
            tbodyHtml += `<tr><td class="bold">${item.name}</td>`;
            for (const t of types) {
                const data = item.stats && item.stats[t.code]
                    ? item.stats[t.code]
                    : this._simulateAssessmentData(item.idx, t.code);
                const clr = data.passRate >= 70 ? 'var(--ex-clr-success)' : data.passRate >= 60 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
                const passVal = data.passRate != null ? `${data.passRate}%` : '\u2014';
                const meanVal = data.mean != null ? `${data.mean}%` : '\u2014';
                tbodyHtml += `<td class="center">
                    <div style="font-weight:700;color:${clr};">${passVal}</div>
                    <div class="small ex-clr-muted">\u03BC ${meanVal}</div>
                </td>`;
            }
            tbodyHtml += '</tr>';
        }

        table.innerHTML = `<thead><tr>${thHtml}</tr></thead><tbody>${tbodyHtml}</tbody>`;
        wrapper.appendChild(table);
    }

    // ── Mark Distribution Histograms ──────────────────────────────────

    async _renderHistograms(wrapper, entityIdx) {
        if (!this._loader) return;
        const types = this._selectedType ? this._assessTypes.filter(t => t.code === this._selectedType) : this._assessTypes.slice(0, 3);
        const histTitle = document.createElement('div');
        histTitle.className = 'ex-section-title';
        histTitle.textContent = 'Mark Distribution';
        wrapper.appendChild(histTitle);

        const grid = document.createElement('div');
        grid.className = 'ex-grid';
        grid.className += ' ex-mb-xl';
        wrapper.appendChild(grid);

        for (const t of types) {
            const dist = await this._loader.getMarkDistribution(entityIdx, t.code, this.year);
            if (!dist || dist.length === 0) continue;
            const maxCount = Math.max(...dist.map(d => d.count));
            const barW = 16, h = 50, w = dist.length * (barW + 2);

            let bars = '';
            for (let i = 0; i < dist.length; i++) {
                const pct = maxCount > 0 ? (dist[i].count / maxCount) * h : 0;
                const x = i * (barW + 2);
                const clr = i < 5 ? 'var(--ex-clr-danger)' : i < 6 ? 'var(--ex-clr-warning)' : i < 7 ? 'var(--ex-clr-success)' : 'var(--ex-clr-success)';
                bars += `<rect x="${x}" y="${h - pct}" width="${barW}" height="${pct}" fill="${clr}" rx="1"/>`;
                bars += `<text x="${x + barW / 2}" y="${h + 10}" text-anchor="middle" font-size="6" fill="var(--ui-gray-400)">${i * 10}</text>`;
            }

            const card = document.createElement('div');
            card.className = 'ex-chart-card';
            card.style.borderTop = `2px solid ${t.color}`;
            card.innerHTML = `
                <div class="ex-chart-title" style="margin-bottom:0.3rem;">${t.label}</div>
                <svg width="${w}" height="${h + 14}" viewBox="0 0 ${w} ${h + 14}" style="width:100%;">${bars}</svg>
            `;
            grid.appendChild(card);
        }
    }

    // ── Alignment View ─────────────────────────────────────────────

    async _renderAlignment(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entity = this.publome.table('entity').read(entityIdx);
        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-exchange-alt"></i>Assessment Alignment Analysis';
        wrapper.appendChild(title);

        if (!this._loader) {
            wrapper.innerHTML += '<div class="ex-empty"><div class="ex-empty-msg">Requires data loader</div></div>';
            stage.appendChild(wrapper);
            return;
        }

        // Get correlation for programme entities or show message for higher levels
        const entityType = entity ? entity.get('type') : 'institution';
        let progCodes = [];
        if (entityType === 'programme') {
            progCodes = [entity.get('code')];
        } else {
            const children = entityType === 'faculty'
                ? this.engine.getChildren(entityIdx)
                : this.engine.getChildren(this._getInstitutionIdx()).flatMap(f => this.engine.getChildren(f.get('idx')));
            progCodes = children.slice(0, 5).map(c => c.get('code'));
        }

        if (progCodes.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><div class="ex-empty-msg">No programmes available</div></div>';
            stage.appendChild(wrapper);
            return;
        }

        const spinnerWrap = document.createElement('div');
        spinnerWrap.className = 'ex-empty';
        new uiSpinner({ template: 'dots', size: 'sm', parent: spinnerWrap });
        spinnerWrap.appendChild(Object.assign(document.createElement('span'), { className: 'ex-empty-msg', textContent: 'Computing correlations...' }));
        wrapper.appendChild(spinnerWrap);
        stage.appendChild(wrapper);

        const results = [];
        for (const code of progCodes) {
            const corr = await this._loader.getAssessmentCorrelation(code, this.year);
            results.push({ code, ...corr });
        }
        spinnerWrap.remove();

        // Correlation table
        const table = document.createElement('table');
        table.className = 'ex-table';
        table.className += ' ex-mb-xl';
        const interpClr = (r) => r == null ? 'var(--ui-gray-400)' : r >= 0.7 ? 'var(--ex-clr-success)' : r >= 0.5 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
        const interpLabel = (r) => r == null ? '\u2014' : r >= 0.7 ? 'Strong' : r >= 0.5 ? 'Moderate' : 'Weak';
        table.innerHTML = `
            <thead><tr>
                <th>Programme</th>
                <th class="center">TM1 \u2194 Final</th>
                <th class="center">TM2 \u2194 Final</th>
                <th class="center">TM1 \u2194 TM2</th>
            </tr></thead>
            <tbody>${results.map(r => `<tr>
                <td class="bold">${r.code}</td>
                <td class="center">
                    <span style="font-weight:700;color:${interpClr(r.tm1Final)};">${r.tm1Final != null ? r.tm1Final : '\u2014'}</span>
                    <div class="small" style="color:${interpClr(r.tm1Final)};">${interpLabel(r.tm1Final)}</div>
                </td>
                <td class="center">
                    <span style="font-weight:700;color:${interpClr(r.tm2Final)};">${r.tm2Final != null ? r.tm2Final : '\u2014'}</span>
                    <div class="small" style="color:${interpClr(r.tm2Final)};">${interpLabel(r.tm2Final)}</div>
                </td>
                <td class="center">
                    <span style="font-weight:700;color:${interpClr(r.tm1Tm2)};">${r.tm1Tm2 != null ? r.tm1Tm2 : '\u2014'}</span>
                    <div class="small" style="color:${interpClr(r.tm1Tm2)};">${interpLabel(r.tm1Tm2)}</div>
                </td>
            </tr>`).join('')}</tbody>
        `;
        wrapper.appendChild(table);

        // Interpretation guide
        const guide = document.createElement('div');
        guide.className = 'ex-info-box';
        guide.style.background = 'var(--ui-gray-50)';
        guide.style.borderColor = 'var(--ui-gray-200)';
        guide.style.color = 'var(--ui-gray-600)';
        guide.innerHTML = `
            <strong>Interpretation:</strong>
            <div class="ex-flex-wrap" style="margin-top:0.3rem;">
                <span><span class="ex-clr-success" style="font-weight:600;">r \u2265 0.7 Strong</span> — Assessment aligns well with final outcomes</span>
                <span><span class="ex-clr-warning" style="font-weight:600;">0.5 \u2264 r < 0.7 Moderate</span> — Some alignment</span>
                <span><span class="ex-clr-danger" style="font-weight:600;">r < 0.5 Weak</span> — Poor predictive value</span>
            </div>
        `;
        wrapper.appendChild(guide);
    }

    // ── Calendar View ──────────────────────────────────────────────

    _renderCalendar(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-calendar-alt"></i>Assessment Schedule';
        wrapper.appendChild(title);

        // Display a simplified semester calendar grid
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const types = this._assessTypes;

        const grid = document.createElement('div');
        grid.style.overflowX = 'auto';
        const table = document.createElement('table');
        table.className = 'ex-table';

        let headerHtml = '<th style="position:sticky;left:0;">Type</th>';
        for (const m of months) headerHtml += `<th class="center">${m}</th>`;

        // Generate typical assessment schedule
        const schedule = {
            'TM_1': [2, 3],       // Feb-Mar (S1) and Jul-Aug (S2)
            'TM_2': [3, 4],       // Mar-Apr (S1) and Aug-Sep (S2)
            'TM_3': [4, 9],       // Apr (S1) and Sep (S2)
            'FINAL': [5, 10],     // May-Jun (S1) and Oct-Nov (S2)
            'PRAC':  [1, 2, 3, 4, 7, 8, 9, 10],  // Throughout
            'PROJ':  [4, 5, 9, 10]  // Submission periods
        };

        let bodyHtml = '';
        for (const t of types) {
            const activeMonths = schedule[t.code] || [];
            bodyHtml += `<tr><td class="bold" style="position:sticky;left:0;background:var(--ui-white);">
                <span class="ex-status-dot" style="background:${t.color};margin-right:0.2rem;margin-left:0;"></span>${t.label}
            </td>`;
            for (let m = 0; m < 12; m++) {
                const active = activeMonths.includes(m);
                bodyHtml += `<td class="center" style="background:${active ? t.color + '15' : 'transparent'};">
                    ${active ? `<div style="width:12px;height:12px;border-radius:2px;background:${t.color};margin:auto;opacity:0.7;"></div>` : ''}
                </td>`;
            }
            bodyHtml += '</tr>';
        }

        table.innerHTML = `<thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody>`;
        grid.appendChild(table);
        wrapper.appendChild(grid);

        // Note about data availability
        const note = document.createElement('div');
        note.className = 'ex-info-box';
        note.style.marginTop = '0.75rem';
        note.style.background = 'var(--ui-blue-50, #f0f9ff)';
        note.style.borderColor = 'var(--ui-blue-200, #bfdbfe)';
        note.style.color = 'var(--ui-blue-800, #1e40af)';
        note.innerHTML = '<i class="fas fa-info-circle" style="margin-right:0.3rem;"></i>Calendar shows typical assessment scheduling for a South African UoT semester system. Actual dates depend on individual course calendars.';
        wrapper.appendChild(note);

        // Moderation tracking placeholder
        const modTitle = document.createElement('div');
        modTitle.className = 'ex-section-title';
        modTitle.className += ' ex-mt-xl';
        modTitle.textContent = 'Moderation Tracking';
        wrapper.appendChild(modTitle);
        const modNote = document.createElement('div');
        modNote.className = 'ex-info-box';
        modNote.style.background = 'var(--ui-gray-50)';
        modNote.style.borderColor = 'var(--ui-gray-200)';
        modNote.style.color = 'var(--ui-gray-500)';
        modNote.innerHTML = '<i class="fas fa-clock" style="margin-right:0.3rem;"></i>Full moderation tracking requires pre/post moderation mark data. This feature will be available when the API provides moderation-specific assessment codes.';
        wrapper.appendChild(modNote);

        stage.appendChild(wrapper);
    }

    // ── Data Simulation ──────────────────────────────────────────────
    // Generates plausible assessment data from the entity's overall metrics

    _simulateAssessmentData(entityIdx, typeCode) {
        const kpis = this.engine.getKPIs(entityIdx, this.year);
        const basePassRate = kpis['course-pass-rate']?.value || 65;
        const baseMean = kpis['course-mean']?.value || 55;

        // Modifiers by assessment type
        const mods = {
            'TM_1':  { prMod: -3, meanMod: -4, sdMod: 0 },
            'TM_2':  { prMod: 1,  meanMod: 0,  sdMod: 0 },
            'TM_3':  { prMod: 2,  meanMod: 2,  sdMod: 0 },
            'FINAL': { prMod: -5, meanMod: -3, sdMod: 2 },
            'PRAC':  { prMod: 8,  meanMod: 7,  sdMod: -2 },
            'PROJ':  { prMod: 5,  meanMod: 5,  sdMod: -1 }
        };

        const mod = mods[typeCode] || { prMod: 0, meanMod: 0, sdMod: 0 };

        // Add deterministic entity-specific variation
        const seed = (entityIdx * 31 + typeCode.charCodeAt(0) * 7) % 100;
        const noise = ((seed - 50) / 50) * 3;

        const passRate = Math.round(Math.max(0, Math.min(100, basePassRate + mod.prMod + noise)));
        const mean = Math.round(Math.max(0, Math.min(100, baseMean + mod.meanMod + noise)));
        const stdDev = Math.round(Math.max(3, Math.min(25, 14 + mod.sdMod + noise / 2)) * 10) / 10;

        return { passRate, mean, stdDev };
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
            this._entityLabel.textContent = e ? e.get('name') : '';
        }
    }
}
