/**
 * ExecCountsPanel — Registration counts, enrolment analysis, year-over-year
 *
 * Layout: uiControlStage
 * Control: Year selector, entity filter, comparison year
 * Stage sub-tabs: Overview | Faculty | Programme | Year-over-Year
 *
 * Usage:
 *   const panel = new ExecCountsPanel({ publome, engine, year: 2025 });
 *   panel.render(container);
 */
class ExecCountsPanel {

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
        this._compareYear = this.year - 1;
    }

    connectBus(bus) {
        this._bus = bus;
        bus.on('entity:selected', (data) => {
            this._entityIdx = data.idx;
            this._refreshStage();
        });
        bus.on('year:changed', (data) => {
            this.year = data.year;
            this._compareYear = this.year - 1;
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
        header.innerHTML = '<i class="fas fa-calculator"></i> Counts';
        el.appendChild(header);

        this._entityLabel = document.createElement('div');
        this._entityLabel.className = 'ex-ctrl-entity-label';
        el.appendChild(this._entityLabel);
        this._updateEntityLabel();

        // Comparison year selector (native select — no uiSelect component)
        const compWrap = document.createElement('div');
        compWrap.className = 'ui-input-wrapper';
        const compLabel = document.createElement('label');
        compLabel.className = 'ui-input-label';
        compLabel.textContent = 'Compare with';
        compWrap.appendChild(compLabel);
        const compSelect = document.createElement('select');
        compSelect.className = 'ui-input';
        const years = this.engine.getYears();
        for (const y of years) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            compSelect.appendChild(opt);
        }
        compSelect.value = String(this._compareYear);
        compSelect.addEventListener('change', () => {
            this._compareYear = parseInt(compSelect.value, 10);
            this._refreshStage();
        });
        compWrap.appendChild(compSelect);
        el.appendChild(compWrap);

        // Sub-view nav
        const views = [
            { key: 'overview',  label: 'Overview',        icon: 'th-large' },
            { key: 'faculty',   label: 'Faculties',       icon: 'building' },
            { key: 'programme', label: 'Programmes',      icon: 'book' },
            { key: 'yoy',       label: 'Year-over-Year',  icon: 'exchange-alt' },
            { key: 'forecast',  label: 'Forecast',        icon: 'chart-line' }
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
            case 'yoy':        this._renderYoY(entityIdx); break;
            case 'forecast':   this._renderForecast(entityIdx); break;
        }
    }

    _renderOverview(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entity = this.publome.table('entity').read(entityIdx);

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-calculator"></i>Enrolment Overview — ${entity ? entity.get('name') : ''}`;
        wrapper.appendChild(title);

        // Count the entities at each level
        const allEntities = this.publome.table('entity').all();
        const faculties = allEntities.filter(e => e.get('type') === 'faculty');
        const programmes = allEntities.filter(e => e.get('type') === 'programme');
        const totalStudents = entity ? entity.get('students') || 0 : 0;

        // KPI cards
        const kpiRow = document.createElement('div');
        kpiRow.className = 'ex-kpi-row';

        const cards = [
            { label: 'Total Students',  value: totalStudents.toLocaleString(), icon: 'users',           color: 'var(--ex-clr-primary)' },
            { label: 'Faculties',        value: faculties.length,               icon: 'building',        color: 'var(--ex-clr-purple)' },
            { label: 'Programmes',       value: programmes.length,              icon: 'book',            color: 'var(--ex-clr-success)' },
            { label: 'Avg per Faculty',  value: faculties.length > 0 ? Math.round(totalStudents / faculties.length) : 0, icon: 'divide', color: 'var(--ex-clr-warning)' },
            { label: 'Avg per Programme', value: programmes.length > 0 ? Math.round(totalStudents / programmes.length) : 0, icon: 'divide', color: 'var(--ex-clr-indigo)' }
        ];

        for (const k of cards) {
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

        // Faculty distribution bar chart
        if (faculties.length > 0) {
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'ex-section-title';
            sectionTitle.textContent = 'Faculty Distribution';
            wrapper.appendChild(sectionTitle);

            const maxStudents = Math.max(...faculties.map(f => f.get('students') || 0));

            const bars = document.createElement('div');
            bars.className = 'ex-col-stack';

            for (const fac of faculties) {
                const stu = fac.get('students') || 0;
                const pct = maxStudents > 0 ? (stu / maxStudents) * 100 : 0;
                const bar = document.createElement('div');
                bar.className = 'ex-bar-row';
                bar.innerHTML = `
                    <div class="ex-bar-label ex-bar-label-wide" title="${fac.get('name')}">${fac.get('name')}</div>
                    <div class="ex-bar-track">
                        <div class="ex-bar-fill ex-bar-fill-gradient" style="width:${pct}%;"></div>
                    </div>
                    <div class="ex-bar-value">${stu}</div>
                `;
                bars.appendChild(bar);
            }
            wrapper.appendChild(bars);
        }

        // FTEN vs Returning & Capacity section
        const bottomRow = document.createElement('div');
        bottomRow.className = 'ex-flex-wrap';

        // FTEN vs Returning (estimated: 30% FTEN for UoTs)
        const ftenCard = document.createElement('div');
        ftenCard.className = 'ex-card ex-card-flex';
        const ftenPct = 30; // SA UoT average FTEN ratio
        const ftenCount = Math.round(totalStudents * ftenPct / 100);
        const retCount = totalStudents - ftenCount;
        ftenCard.innerHTML = `
            <div class="ex-chart-subtitle ex-chart-subtitle-spaced">New vs Returning Students</div>
            <div class="ex-progress-stacked">
                <div style="width:${ftenPct}%;background:var(--ex-clr-primary);" title="First-time entering: ${ftenCount}"></div>
                <div style="width:${100 - ftenPct}%;background:var(--ex-clr-success);" title="Returning: ${retCount}"></div>
            </div>
            <div class="ex-chart-legend ex-chart-legend-between">
                <span><span class="ex-legend-swatch" style="background:var(--ex-clr-primary);"></span>FTEN: ${ftenCount.toLocaleString()} (${ftenPct}%)</span>
                <span><span class="ex-legend-swatch" style="background:var(--ex-clr-success);"></span>Returning: ${retCount.toLocaleString()} (${100 - ftenPct}%)</span>
            </div>
        `;
        bottomRow.appendChild(ftenCard);

        // Capacity utilisation (estimate based on historical max)
        const capCard = document.createElement('div');
        capCard.className = 'ex-card ex-card-flex';
        const years = this.engine.getYears();
        let historicalMax = totalStudents;
        for (const y of years) {
            const val = this.engine.getValue(
                this.publome.table('metric').all().find(m => m.get('code') === 'student-staff-ratio')?.get('idx'),
                entityIdx, y
            );
            // Use entity students as proxy since we track them
            const e = this.publome.table('entity').read(entityIdx);
            if (e && e.get('students') > historicalMax) historicalMax = e.get('students');
        }
        // Estimate capacity as 120% of historical max
        const estimatedCapacity = Math.round(historicalMax * 1.2);
        const utilPct = estimatedCapacity > 0 ? Math.round(totalStudents / estimatedCapacity * 100) : 0;
        const utilClr = utilPct >= 90 ? 'var(--ex-clr-danger)' : utilPct >= 75 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-success)';

        // Circular progress
        const radius = 30, stroke = 6, circ = 2 * Math.PI * radius;
        const dashOffset = circ * (1 - utilPct / 100);
        capCard.innerHTML = `
            <div class="ex-chart-subtitle ex-chart-subtitle-spaced">Capacity Utilisation</div>
            <div class="ex-row ex-row-gap-lg">
                <svg width="76" height="76" viewBox="0 0 76 76">
                    <circle cx="38" cy="38" r="${radius}" fill="none" stroke="var(--ui-gray-100)" stroke-width="${stroke}"/>
                    <circle cx="38" cy="38" r="${radius}" fill="none" stroke="${utilClr}" stroke-width="${stroke}"
                        stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
                        stroke-linecap="round" transform="rotate(-90 38 38)"/>
                    <text x="38" y="38" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="${utilClr}">${utilPct}%</text>
                </svg>
                <div class="ex-circular-info">
                    Current: ${totalStudents.toLocaleString()}<br>
                    Est. Capacity: ${estimatedCapacity.toLocaleString()}<br>
                    <span style="color:${utilClr};font-weight:var(--ui-font-semibold);">${utilPct >= 90 ? 'Near capacity' : utilPct >= 75 ? 'Moderate' : 'Available capacity'}</span>
                </div>
            </div>
        `;
        bottomRow.appendChild(capCard);

        wrapper.appendChild(bottomRow);

        stage.appendChild(wrapper);
    }

    // ── Forecast ──────────────────────────────────────────────────────

    _renderForecast(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entity = this.publome.table('entity').read(entityIdx);
        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-chart-line"></i>Pass Rate Forecast — ${entity ? entity.get('name') : ''}`;
        wrapper.appendChild(title);

        const years = this.engine.getYears();
        const forecastData = this.engine.forecast(entityIdx, years, 2);

        if (forecastData.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><div class="ex-empty-msg">Insufficient data for forecasting (need at least 2 years)</div></div>';
            stage.appendChild(wrapper);
            return;
        }

        const rSquared = forecastData[0]?.rSquared;
        const lastActual = forecastData.filter(d => d.actual != null).pop();
        const lastProjected = forecastData.filter(d => d.projected != null).pop();

        // Summary text
        if (lastActual && lastProjected) {
            const change = lastProjected.projected - lastActual.actual;
            const changePct = lastActual.actual > 0 ? ((change / lastActual.actual) * 100).toFixed(1) : 0;
            const deltaCls = change >= 0 ? 'ex-clr-success' : 'ex-clr-danger';
            const r2Clr = rSquared >= 0.7 ? 'var(--ex-clr-success)' : rSquared >= 0.4 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
            const summary = document.createElement('div');
            summary.className = 'ex-forecast-card';
            summary.innerHTML = `
                <div class="ex-forecast-main">
                    <div class="ex-forecast-label">Projected Pass Rate for ${lastProjected.year}</div>
                    <div class="ex-forecast-value">${lastProjected.projected}%</div>
                    <div class="ex-forecast-delta ${deltaCls}">${change >= 0 ? '+' : ''}${changePct}% vs ${lastActual.year}</div>
                </div>
                <div class="ex-forecast-confidence">
                    <div class="ex-forecast-confidence-label">R² Confidence</div>
                    <div class="ex-forecast-confidence-value" style="color:${r2Clr};">${rSquared != null ? rSquared.toFixed(2) : '—'}</div>
                    <div class="ex-forecast-confidence-desc">${rSquared >= 0.7 ? 'Strong fit' : rSquared >= 0.4 ? 'Moderate fit' : 'Weak fit'}</div>
                </div>
            `;
            wrapper.appendChild(summary);
        }

        // Bar chart: solid for actual, striped for projected
        const maxVal = Math.max(...forecastData.map(d => d.actual || d.projected || 0));
        const chartSection = document.createElement('div');
        chartSection.className = 'ex-section-title';
        chartSection.textContent = 'Historical & Projected';
        wrapper.appendChild(chartSection);

        const chartW = 400, chartH = 140, padL = 40, padR = 10, padT = 10, padB = 25;
        const plotW = chartW - padL - padR;
        const plotH = chartH - padT - padB;
        const barCount = forecastData.length;
        const barW = Math.min(plotW / barCount * 0.6, 35);
        const gap = (plotW - barW * barCount) / (barCount + 1);

        let svg = `<svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;max-width:${chartW}px;height:auto;display:block;">`;

        // Y-axis
        for (let i = 0; i <= 4; i++) {
            const y = padT + plotH * (1 - i / 4);
            const val = Math.round(maxVal * i / 4);
            svg += `<line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" stroke="var(--ui-gray-200)" stroke-width="0.5"/>`;
            svg += `<text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="6" fill="#9ca3af">${val}</text>`;
        }

        // Striped pattern for projected bars
        svg += `<defs><pattern id="proj-stripe" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="4" fill="#8b5cf6" opacity="0.6"/></pattern></defs>`;

        forecastData.forEach((d, i) => {
            const val = d.actual || d.projected || 0;
            const h = maxVal > 0 ? (val / maxVal) * plotH : 0;
            const x = padL + gap + i * (barW + gap);
            const y = padT + plotH - h;
            const fill = d.actual != null ? 'var(--ui-primary-400)' : 'url(#proj-stripe)';
            const border = d.projected != null ? ' stroke="#8b5cf6" stroke-width="1" stroke-dasharray="2,1"' : '';

            svg += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${fill}" rx="2"${border}/>`;
            svg += `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="6" font-weight="600" fill="${d.projected != null ? '#8b5cf6' : '#374151'}">${val}</text>`;
            svg += `<text x="${x + barW / 2}" y="${chartH - 5}" text-anchor="middle" font-size="6" fill="#6b7280">${d.year}</text>`;
        });

        svg += '</svg>';

        const chartContainer = document.createElement('div');
        chartContainer.innerHTML = svg;
        wrapper.appendChild(chartContainer);

        // Legend (outside SVG — div inside SVG is invalid markup)
        const legend = document.createElement('div');
        legend.className = 'ex-chart-legend ex-chart-legend-center';
        legend.innerHTML = `
            <span><span class="ex-legend-swatch" style="background:var(--ui-primary-400);"></span>Actual</span>
            <span><span class="ex-legend-swatch" style="background:repeating-linear-gradient(45deg, var(--ex-clr-purple) 0,var(--ex-clr-purple) 2px,transparent 2px,transparent 4px);"></span>Projected</span>
        `;
        wrapper.appendChild(legend);

        // Subsidy band analysis
        this._renderSubsidyBands(wrapper, entityIdx);

        stage.appendChild(wrapper);
    }

    // ── Subsidy Bands ─────────────────────────────────────────────────

    _renderSubsidyBands(parent, entityIdx) {
        const entity = this.publome.table('entity').read(entityIdx);
        const students = entity ? (entity.get('students') || 0) : 0;
        if (students === 0) return;

        // DHET funding bands by CESM discipline category (simplified)
        const CESM_BANDS = {
            1: { label: 'Band 1 — Humanities, Social Sciences, Law, Education', weight: 1.0, color: 'var(--ex-clr-primary)' },
            2: { label: 'Band 2 — Commerce, Management, IT, Architecture', weight: 1.5, color: 'var(--ex-clr-success)' },
            3: { label: 'Band 3 — Engineering, Science, Agriculture', weight: 2.5, color: 'var(--ex-clr-warning)' },
            4: { label: 'Band 4 — Health Sciences, Veterinary Science', weight: 3.5, color: 'var(--ex-clr-danger)' }
        };

        // Estimate distribution based on typical UoT profile
        const bandDistribution = [
            { band: 1, pct: 35 },
            { band: 2, pct: 30 },
            { band: 3, pct: 25 },
            { band: 4, pct: 10 }
        ];

        const section = document.createElement('div');
        section.innerHTML = '<div class="ex-section-title"><i class="fas fa-layer-group"></i> DHET Subsidy Bands (Estimated)</div>';

        let totalWeighted = 0;
        let barsHtml = '';
        for (const bd of bandDistribution) {
            const info = CESM_BANDS[bd.band];
            const count = Math.round(students * bd.pct / 100);
            const weighted = Math.round(count * info.weight);
            totalWeighted += weighted;
            barsHtml += `<div class="ex-bar-row">
                <div class="ex-bar-label ex-bar-label-xl">${info.label}</div>
                <div class="ex-bar-track ex-bar-track-lg">
                    <div class="ex-bar-fill" style="width:${bd.pct}%;background:${info.color};"></div>
                </div>
                <div class="ex-bar-value-sm">${count} (${bd.pct}%)</div>
                <div class="ex-bar-weight">×${info.weight}</div>
            </div>`;
        }

        section.innerHTML += `<div class="ex-mb-md">${barsHtml}</div>`;
        section.innerHTML += `<div class="ex-kpi-target">Weighted FTE: <strong>${totalWeighted.toLocaleString()}</strong> (from ${students.toLocaleString()} headcount)</div>`;

        parent.appendChild(section);
    }

    _renderLevelBreakdown(entityIdx, level) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-${level === 'faculty' ? 'building' : 'book'}"></i>${level === 'faculty' ? 'Faculty' : 'Programme'} Enrolment`;
        wrapper.appendChild(title);

        let items;
        if (level === 'faculty') {
            const instIdx = this._getInstitutionIdx();
            items = this.engine.getChildrenSummary(instIdx, this.year);
        } else {
            // Get all programmes
            const instIdx = this._getInstitutionIdx();
            const faculties = this.engine.getChildren(instIdx);
            items = [];
            for (const f of faculties) {
                const progs = this.engine.getChildrenSummary(f.get('idx'), this.year);
                for (const p of progs) {
                    p.faculty = f.get('name');
                }
                items.push(...progs);
            }
        }

        if (items.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><div class="ex-empty-msg">No data available</div></div>';
            stage.appendChild(wrapper);
            return;
        }

        // Sort by students descending
        items.sort((a, b) => (b.students || 0) - (a.students || 0));

        const table = document.createElement('table');
        table.className = 'ex-table';

        const extraHeader = level === 'programme' ? '<th>Faculty</th>' : '';
        const totalStudents = items.reduce((s, i) => s + (i.students || 0), 0);

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    ${extraHeader}
                    <th class="right">Students</th>
                    <th class="right">% of Total</th>
                    <th class="w-30">Distribution</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
                    const stu = item.students || 0;
                    const pct = totalStudents > 0 ? (stu / totalStudents * 100).toFixed(1) : 0;
                    const barPct = totalStudents > 0 ? (stu / items[0].students * 100) : 0;
                    const extraCol = level === 'programme' ? `<td class="muted">${item.faculty || '—'}</td>` : '';
                    return `<tr>
                        <td class="bold">${item.name}</td>
                        ${extraCol}
                        <td class="right emphasis">${stu.toLocaleString()}</td>
                        <td class="right muted">${pct}%</td>
                        <td>
                            <div class="ex-bar-track ex-bar-track-sm">
                                <div class="ex-bar-fill" style="width:${barPct}%;background:var(--ui-primary-300);"></div>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        `;

        wrapper.appendChild(table);
        stage.appendChild(wrapper);
    }

    _renderYoY(entityIdx) {
        const stage = this._stageEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = `<i class="fas fa-exchange-alt"></i>Year-over-Year Comparison (${this._compareYear} vs ${this.year})`;
        wrapper.appendChild(title);

        // Compare key metrics across years for all entities
        const instIdx = this._getInstitutionIdx();
        const faculties = this.engine.getChildren(instIdx);

        const items = [
            { name: 'Institution', idx: instIdx, type: 'institution' },
            ...faculties.map(f => ({ name: f.get('name'), idx: f.get('idx'), type: 'faculty' }))
        ];

        const metricCodes = ['course-pass-rate', 'course-mean', 'retention-rate', 'graduation-rate'];
        const metricTable = this.publome.table('metric');
        const metricMap = {};
        for (const m of metricTable.all()) {
            metricMap[m.get('code')] = m.get('idx');
        }

        const table = document.createElement('table');
        table.className = 'ex-table';

        let headerHtml = '<th>Entity</th>';
        for (const code of metricCodes) {
            const m = metricTable.all().find(m => m.get('code') === code);
            const label = m ? m.get('name') : code;
            headerHtml += `
                <th class="right">${label} ${this._compareYear}</th>
                <th class="right">${this.year}</th>
                <th class="right">\u0394</th>
            `;
        }

        let bodyHtml = '';
        for (const item of items) {
            bodyHtml += `<tr class="${item.type === 'institution' ? 'ex-row-institution' : ''}">`;
            bodyHtml += `<td>${item.name}</td>`;

            for (const code of metricCodes) {
                const mId = metricMap[code];
                const oldVal = this.engine.getValue(mId, item.idx, this._compareYear);
                const newVal = this.engine.getValue(mId, item.idx, this.year);
                const delta = oldVal != null && newVal != null ? newVal - oldVal : null;
                const deltaClr = delta != null ? (delta >= 0 ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)') : 'var(--ui-gray-400)';

                bodyHtml += `
                    <td class="right muted">${oldVal != null ? Math.round(oldVal) : '—'}</td>
                    <td class="right emphasis">${newVal != null ? Math.round(newVal) : '—'}</td>
                    <td class="right small" style="color:${deltaClr};">${delta != null ? (delta >= 0 ? '+' : '') + delta.toFixed(1) : '—'}</td>
                `;
            }
            bodyHtml += '</tr>';
        }

        table.innerHTML = `<thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody>`;
        wrapper.appendChild(table);
        stage.appendChild(wrapper);
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
        }
    }
}
