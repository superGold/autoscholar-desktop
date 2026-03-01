/**
 * ExecStrategyPanel — ISO 21001 metrics + PDSA + interventions + benchmarks
 *
 * Layout: uiControlStage with accordion in control
 * Control accordion sections:
 *   1. ISO 21001 Metrics — bindSelector on metric table, grouped by category
 *   2. Interventions — bindSelectEditor on intervention table
 *   3. PDSA Cycles — bindSelectEditor on pdsaCycle table
 *   4. Notes — bindSelectEditor on note table
 *
 * Stage: Selected metric detail with observations, interventions, PDSA cycles
 *
 * Usage:
 *   const panel = new ExecStrategyPanel({ publome, engine, year: 2025 });
 *   panel.render(container);
 */
class ExecStrategyPanel {

    constructor(config = {}) {
        this.publome = config.publome;
        this.engine  = config.engine;
        this.year    = config.year || 2025;
        this.bridge  = config.bridge || null;          // ExecServiceBridge
        this.projectBridge = config.projectBridge || null; // ExecProjectBridge
        this._container = null;
        this._controlEl = null;
        this._stageEl = null;
        this._entityIdx = null;
        this._selectedMetricIdx = null;
        this._stageView = 'default'; // 'default' | 'gantt' | 'strategyMap'
        this._bindings = {};
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
        this._renderDefaultStage();
    }

    // ── Control Panel with Accordion ─────────────────────────────────

    _renderControl() {
        const el = this._controlEl;
        el.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'ui-control-stage-header';
        header.innerHTML = '<i class="fas fa-chess"></i>Strategy';
        el.appendChild(header);

        this._entityLabel = document.createElement('div');
        this._entityLabel.className = 'ex-ctrl-entity-label';
        el.appendChild(this._entityLabel);
        this._updateEntityLabel();

        // Accordion with 4 sections
        const accordion = new uiAccordion({
            exclusive: true,
            content: {
                metrics:       { label: '<i class="fas fa-chart-pie" style="margin-right:0.3rem;"></i>ISO 21001 Metrics', open: true },
                interventions: { label: '<i class="fas fa-tools" style="margin-right:0.3rem;"></i>Interventions' },
                pdsa:          { label: '<i class="fas fa-sync-alt" style="margin-right:0.3rem;"></i>PDSA Cycles' },
                notes:         { label: '<i class="fas fa-sticky-note" style="margin-right:0.3rem;"></i>Notes' }
            },
            parent: el
        });

        // ── Metrics section: bindSelector ────────────────────────
        const metricsPane = accordion.el.querySelector('.ui-accordion-item[data-key="metrics"] .ui-accordion-content');
        if (metricsPane) {
            const metricTable = this.publome.table('metric');
            const metricBinding = new UIBinding(metricTable, { publome: this.publome });
            metricBinding.bindSelector(metricsPane);
            this._bindings.metric = metricBinding;

            // Listen for metric selection
            metricTable.on('selected', (data) => {
                this._selectedMetricIdx = data.record ? data.record.get('idx') : [...data.selected][0];
                this._refreshStage();
            });
        }

        // ── Interventions section: bindSelectEditor ──────────────
        const intPane = accordion.el.querySelector('.ui-accordion-item[data-key="interventions"] .ui-accordion-content');
        if (intPane) {
            const intTable = this.publome.table('intervention');
            const intBinding = new UIBinding(intTable, { publome: this.publome });
            intBinding.bindSelectEditor(intPane, { editor: 'modal' });
            this._bindings.intervention = intBinding;

            // Wire parent-child: metric → intervention
            if (this._bindings.metric) {
                this._bindings.metric.bindChildTable(intBinding, 'metricId');
            }
        }

        // ── PDSA section: bindSelectEditor ───────────────────────
        const pdsaPane = accordion.el.querySelector('.ui-accordion-item[data-key="pdsa"] .ui-accordion-content');
        if (pdsaPane) {
            const pdsaTable = this.publome.table('pdsaCycle');
            const pdsaBinding = new UIBinding(pdsaTable, { publome: this.publome });
            pdsaBinding.bindSelectEditor(pdsaPane, { editor: 'modal' });
            this._bindings.pdsa = pdsaBinding;

            // Wire parent-child: intervention → pdsaCycle
            if (this._bindings.intervention) {
                this._bindings.intervention.bindChildTable(pdsaBinding, 'interventionId');
            }
        }

        // ── Notes section: bindSelectEditor ──────────────────────
        const notesPane = accordion.el.querySelector('.ui-accordion-item[data-key="notes"] .ui-accordion-content');
        if (notesPane) {
            const noteTable = this.publome.table('note');
            const noteBinding = new UIBinding(noteTable, { publome: this.publome });
            noteBinding.bindSelectEditor(notesPane, { editor: 'modal' });
            this._bindings.note = noteBinding;
        }

        // ── View navigation ─────────────────────────────────────────
        const viewNav = document.createElement('div');
        viewNav.className = 'ex-col-stack ex-ctrl-view-sep';
        const viewBtns = [
            { key: 'default',     label: 'Overview',     icon: 'th-large' },
            { key: 'gantt',       label: 'Gantt Timeline', icon: 'tasks' },
            { key: 'strategyMap', label: 'Strategy Map',  icon: 'project-diagram' }
        ];
        for (const v of viewBtns) {
            const btn = document.createElement('div');
            btn.className = 'ex-ctrl-nav-btn' + (this._stageView === v.key ? ' active' : '');
            btn.innerHTML = `<i class="fas fa-${v.icon}"></i>${v.label}`;
            btn.addEventListener('click', () => {
                this._stageView = v.key;
                this._selectedMetricIdx = null;
                this._renderControl();
                this._refreshStage();
            });
            viewNav.appendChild(btn);
        }
        el.appendChild(viewNav);
    }

    // ── Stage ────────────────────────────────────────────────────────

    _renderDefaultStage() {
        this._stageEl.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const entityIdx = this._entityIdx || this._getInstitutionIdx();

        // Show category overview by default
        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-chess"></i>Strategic Overview — ISO 21001';
        wrapper.appendChild(title);

        if (entityIdx) {
            const categories = this.engine.getMetricsByCategory(entityIdx, this.year);
            this._renderCategoryCards(wrapper, categories);
        }

        // Intervention summary
        const intTable = this.publome.table('intervention');
        const allInt = intTable.all();
        const activeCount = allInt.filter(i => i.get('status') === 'active').length;

        const intTitle = document.createElement('div');
        intTitle.className = 'ex-section-title';
        intTitle.textContent = 'Intervention Status';
        wrapper.appendChild(intTitle);

        const intRow = document.createElement('div');
        intRow.className = 'ex-kpi-row';
        const statuses = ['active', 'proposed', 'completed', 'paused'];
        const statusColors = { active: 'var(--ex-clr-success)', proposed: 'var(--ex-clr-primary)', completed: 'var(--ex-clr-purple)', paused: 'var(--ex-clr-warning)' };
        for (const s of statuses) {
            const count = allInt.filter(i => i.get('status') === s).length;
            const card = document.createElement('div');
            card.className = 'ex-kpi-card';
            card.innerHTML = `
                <div class="ex-kpi-card-label"><span style="text-transform:capitalize;">${s}</span></div>
                <div class="ex-kpi-value-md" style="color:${statusColors[s]};">${count}</div>
            `;
            intRow.appendChild(card);
        }
        wrapper.appendChild(intRow);

        // PDSA cycle summary
        const pdsaTable = this.publome.table('pdsaCycle');
        const allPdsa = pdsaTable.all();

        const pdsaTitle = document.createElement('div');
        pdsaTitle.className = 'ex-section-title';
        pdsaTitle.textContent = 'PDSA Cycles';
        wrapper.appendChild(pdsaTitle);

        const pdsaRow = document.createElement('div');
        pdsaRow.className = 'ex-kpi-row';
        const phases = ['Plan', 'Do', 'Study', 'Act'];
        const phaseColors = { Plan: 'var(--ex-clr-primary)', Do: 'var(--ex-clr-success)', Study: 'var(--ex-clr-warning)', Act: 'var(--ex-clr-purple)' };
        const phaseIcons = { Plan: 'lightbulb', Do: 'play', Study: 'search', Act: 'check' };
        for (const p of phases) {
            const count = allPdsa.filter(c => c.get('phase') === p && c.get('status') === 'active').length;
            const card = document.createElement('div');
            card.className = 'ex-kpi-card';
            card.innerHTML = `
                <div class="ex-kpi-card-label">
                    <i class="fas fa-${phaseIcons[p]}" style="color:${phaseColors[p]};"></i>
                    <span>${p}</span>
                </div>
                <div class="ex-kpi-value-md" style="color:${phaseColors[p]};">${count}</div>
            `;
            pdsaRow.appendChild(card);
        }
        wrapper.appendChild(pdsaRow);

        this._stageEl.appendChild(wrapper);
    }

    _refreshStage() {
        if (!this._stageEl) return;
        this._updateEntityLabel();

        if (this._selectedMetricIdx) {
            this._renderMetricDetail();
        } else if (this._stageView === 'gantt') {
            this._renderGantt();
        } else if (this._stageView === 'strategyMap') {
            this._renderStrategyMap();
        } else {
            this._renderDefaultStage();
        }
    }

    _renderMetricDetail() {
        this._stageEl.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const metricTable = this.publome.table('metric');
        const metric = metricTable.read(this._selectedMetricIdx);
        if (!metric) return;

        const entityIdx = this._entityIdx || this._getInstitutionIdx();
        const catTable = this.publome.table('metricCategory');
        const cat = metric.get('metricCategoryId') ? catTable.read(metric.get('metricCategoryId')) : null;

        // Metric header
        const header = document.createElement('div');
        header.className = 'ex-mb-xl';
        const colorMap = { success: 'var(--ex-clr-success)', info: 'var(--ex-clr-primary)', warning: 'var(--ex-clr-warning)', primary: 'var(--ex-clr-purple)' };
        const catColor = cat ? colorMap[cat.get('color')] || 'var(--ui-gray-500)' : 'var(--ui-gray-500)';

        header.innerHTML = `
            <div class="ex-row ex-mb-md" style="gap:0.5rem;">
                <div class="ex-entity-icon-box" style="background:${catColor}15;">
                    <i class="fas fa-${cat ? cat.get('icon') : 'chart-pie'}" style="color:${catColor};"></i>
                </div>
                <div>
                    <div class="ex-chart-title ex-title-lg">${metric.get('name')}</div>
                    <div class="ex-entity-detail">${cat ? cat.get('name') : ''} | Code: ${metric.get('code')} | Unit: ${metric.get('unit')}</div>
                </div>
            </div>
            <div class="ex-body-text">${metric.get('description') || ''}</div>
        `;
        wrapper.appendChild(header);

        // Current value + target + benchmark
        const value = entityIdx ? this.engine.getValue(this._selectedMetricIdx, entityIdx, this.year) : null;
        const target = metric.get('target');
        const benchmark = metric.get('benchmark');
        const unit = metric.get('unit') || '';
        const unitSuffix = unit === 'ratio' ? ':1' : unit === 'score' ? '/5' : unit;

        const valRow = document.createElement('div');
        valRow.className = 'ex-kpi-row';

        const valCards = [
            { label: `Value (${this.year})`, value: value != null ? (unit === 'score' || unit === 'ratio' ? value.toFixed(1) : Math.round(value)) : '—', color: catColor },
            { label: 'Target', value: target, color: 'var(--ex-clr-success)' },
            { label: 'Benchmark', value: benchmark, color: 'var(--ex-clr-warning)' }
        ];

        for (const vc of valCards) {
            const card = document.createElement('div');
            card.className = 'ex-kpi-card';
            card.innerHTML = `
                <div class="ex-kpi-card-label"><span>${vc.label}</span></div>
                <div class="ex-kpi-value" style="color:${vc.color};">${vc.value}<span class="ex-kpi-unit">${unitSuffix}</span></div>
            `;
            valRow.appendChild(card);
        }
        wrapper.appendChild(valRow);

        // Automated metric monitoring badge
        const monitorStatus = this._getMonitorStatus(this._selectedMetricIdx, entityIdx);
        if (monitorStatus) {
            const badge = document.createElement('div');
            badge.className = 'ex-monitor-badge';
            badge.style.cssText = `border:1px solid ${monitorStatus.color}30;background:${monitorStatus.bg};`;
            badge.innerHTML = `<i class="fas fa-${monitorStatus.icon}" style="color:${monitorStatus.color};"></i><span class="ex-monitor-label" style="color:${monitorStatus.color};">${monitorStatus.label}</span><span class="ex-body-text">— ${monitorStatus.detail}</span>`;
            wrapper.appendChild(badge);
        }

        // Trend across years
        const years = this.engine.getYears();
        const trend = this.engine.getTrend(this._selectedMetricIdx, entityIdx, years);

        const trendTitle = document.createElement('div');
        trendTitle.className = 'ex-section-title';
        trendTitle.textContent = 'Year-over-Year Trend';
        wrapper.appendChild(trendTitle);

        const trendRow = document.createElement('div');
        trendRow.className = 'ex-kpi-row';
        for (const t of trend) {
            const val = t.value;
            const isGood = val != null && val >= target;
            const card = document.createElement('div');
            card.className = 'ex-trend-card ' + (isGood ? 'ex-trend-card-good' : 'ex-trend-card-bad');
            card.innerHTML = `
                <div class="ex-kpi-card-label" style="justify-content:center;"><span>${t.year}</span></div>
                <div class="ex-trend-value" style="color:${isGood ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)'};">${val != null ? (unit === 'score' || unit === 'ratio' ? val.toFixed(1) : Math.round(val)) : '—'}<span class="ex-kpi-unit">${unitSuffix}</span></div>
            `;
            trendRow.appendChild(card);
        }
        wrapper.appendChild(trendRow);

        // Related interventions
        const interventions = this.engine.getInterventions(this._selectedMetricIdx);
        if (interventions.length > 0) {
            const intTitle = document.createElement('div');
            intTitle.className = 'ex-section-title';
            intTitle.textContent = `Interventions (${interventions.length})`;
            wrapper.appendChild(intTitle);

            for (const int of interventions) {
                const intCard = document.createElement('div');
                intCard.className = 'ex-card ex-mb-md';

                const statusColors = { active: 'var(--ex-clr-success)', proposed: 'var(--ex-clr-primary)', completed: 'var(--ex-clr-purple)', paused: 'var(--ex-clr-warning)' };
                const evidenceColors = { strong: 'var(--ex-clr-success)', moderate: 'var(--ex-clr-warning)', emerging: 'var(--ex-clr-primary)' };
                const sClr = statusColors[int.status] || 'var(--ui-gray-500)';
                const eClr = evidenceColors[int.evidenceLevel] || 'var(--ui-gray-500)';

                let cyclesHtml = '';
                if (int.cycles.length > 0) {
                    cyclesHtml = `<div class="ex-cycles-wrap">`;
                    for (const c of int.cycles) {
                        const phaseClr = { Plan: 'var(--ex-clr-primary)', Do: 'var(--ex-clr-success)', Study: 'var(--ex-clr-warning)', Act: 'var(--ex-clr-purple)' }[c.phase] || 'var(--ui-gray-500)';
                        const entityName = c.entityId ? (this.publome.table('entity').read(c.entityId)?.get('name') || '') : '';
                        cyclesHtml += `
                            <div class="ex-cycle-row">
                                <span class="ex-status-dot" style="background:${phaseClr};margin-left:0;"></span>
                                <strong style="color:${phaseClr};">${c.phase}</strong>
                                <span class="ex-body-text">${(c.plan || '').substring(0, 60)}${(c.plan || '').length > 60 ? '...' : ''}</span>
                                ${entityName ? `<span class="ex-meta-text" style="margin-left:auto;">${entityName}</span>` : ''}
                                <span class="ex-severity-badge" style="background:${c.status === 'active' ? 'var(--ex-clr-success-bg)' : 'var(--ui-gray-100)'};color:${c.status === 'active' ? 'var(--ex-clr-success)' : 'var(--ui-gray-500)'};border-color:transparent;">${c.status}</span>
                            </div>
                        `;
                    }
                    cyclesHtml += '</div>';
                }

                intCard.innerHTML = `
                    <div class="ex-row-between ex-mb-sm">
                        <span class="ex-chart-title">${int.name}</span>
                        <div class="ex-row" style="gap:0.3rem;">
                            <span class="ex-severity-badge" style="background:${sClr}15;color:${sClr};border-color:${sClr}30;">${int.status}</span>
                            <span class="ex-severity-badge" style="background:${eClr}15;color:${eClr};border-color:${eClr}30;">${int.evidenceLevel}</span>
                        </div>
                    </div>
                    <div class="ex-body-text ex-mb-sm">${int.description || ''}</div>
                    <div class="ex-meta-text">Category: ${int.category || '—'} | PDSA Cycles: ${int.cycles.length}</div>
                    ${cyclesHtml}
                `;

                // Tag picker for intervention
                if (this.bridge) {
                    var tagRow = document.createElement('div');
                    tagRow.className = 'ex-link-row';
                    var tagLabel = document.createElement('span');
                    tagLabel.className = 'ex-link-label';
                    tagLabel.textContent = 'Tags:';
                    tagRow.appendChild(tagLabel);
                    var tagContainer = document.createElement('span');
                    tagContainer.className = 'ex-link-container';
                    this.bridge.renderTagPicker(tagContainer, 'intervention', int.idx, ['Intervention Type', 'Priority']);
                    tagRow.appendChild(tagContainer);
                    intCard.appendChild(tagRow);
                }

                // Project sync button
                if (this.projectBridge) {
                    var projRow = document.createElement('div');
                    projRow.className = 'ex-link-row';
                    var linkedProject = this.projectBridge.getProjectForIntervention(int.idx);
                    if (linkedProject) {
                        projRow.innerHTML = '<i class="fas fa-project-diagram ex-clr-purple" style="font-size:0.55rem;"></i>' +
                            '<span class="ex-meta-text">Project: <strong>' + linkedProject.get('name') + '</strong> (' + (linkedProject.get('status') || 'planning') + ')</span>';
                    } else {
                        var syncBtn = document.createElement('button');
                        syncBtn.className = 'ui-btn ui-btn-ghost';
                        syncBtn.style.fontSize = '0.55rem';
                        syncBtn.style.padding = '0.15rem 0.4rem';
                        syncBtn.innerHTML = '<i class="fas fa-sync-alt" style="margin-right:0.2rem;"></i>Sync to Project';
                        (function(intervention) {
                            syncBtn.addEventListener('click', function() {
                                this.projectBridge.syncIntervention(intervention);
                                this._refreshStage();
                                uiToast.show({ message: 'Project created for ' + intervention.name, color: 'success' });
                            }.bind(this));
                        }).call(this, int);
                        projRow.appendChild(syncBtn);
                    }
                    intCard.appendChild(projRow);
                }

                wrapper.appendChild(intCard);
            }
        }

        // Related notes
        if (entityIdx) {
            const notes = this.engine.getNotes(entityIdx, this._selectedMetricIdx);
            if (notes.length > 0) {
                const noteTitle = document.createElement('div');
                noteTitle.className = 'ex-section-title';
                noteTitle.textContent = `Notes (${notes.length})`;
                wrapper.appendChild(noteTitle);

                for (const n of notes) {
                    const noteCard = document.createElement('div');
                    noteCard.className = 'ex-note-card ex-mb-sm';
                    noteCard.style.cssText = 'border-left:3px solid var(--ui-primary-300);border-radius:0 6px 6px 0;';
                    noteCard.innerHTML = `
                        <div class="ex-note-content">${n.content}</div>
                        <div class="ex-meta-text" style="margin-top:0.25rem;">${n.author || ''} ${n.createdAt ? '| ' + n.createdAt : ''}</div>
                    `;
                    wrapper.appendChild(noteCard);
                }
            }
        }

        this._stageEl.appendChild(wrapper);
    }

    // ── Shared ───────────────────────────────────────────────────────

    _renderCategoryCards(parent, categories) {
        const grid = document.createElement('div');
        grid.className = 'ex-grid ex-mb-xl';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';

        const colorMap = { success: 'var(--ex-clr-success)', info: 'var(--ex-clr-primary)', warning: 'var(--ex-clr-warning)', primary: 'var(--ex-clr-purple)' };

        for (const cat of categories) {
            const accent = colorMap[cat.color] || 'var(--ui-gray-500)';
            const onTarget = cat.metrics.filter(m => m.status === 'success').length;
            const total = cat.metrics.length;
            const pct = total > 0 ? Math.round((onTarget / total) * 100) : 0;

            const card = document.createElement('div');
            card.className = 'ex-card ex-kpi-card-clickable';
            card.style.cssText = `border-left:3px solid ${accent};`;

            card.innerHTML = `
                <div class="ex-row ex-mb-sm" style="margin-bottom:0.4rem;">
                    <i class="fas fa-${cat.icon}" style="color:${accent};font-size:0.7rem;"></i>
                    <span class="ex-chart-title">${cat.name}</span>
                </div>
                <div class="ex-row ex-mb-sm" style="align-items:baseline;">
                    <span class="ex-kpi-value" style="color:${accent};">${pct}%</span>
                    <span class="ex-kpi-unit">on target</span>
                </div>
                <div class="ex-meta-text">${onTarget}/${total} metrics meeting target</div>
                <div class="ex-progress" style="height:3px;">
                    <div class="ex-progress-fill" style="width:${pct}%;background:${accent};"></div>
                </div>
            `;

            grid.appendChild(card);
        }

        parent.appendChild(grid);
    }

    // ── Gantt Timeline ──────────────────────────────────────────────

    _renderGantt() {
        this._stageEl.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-tasks"></i>PDSA Cycle Timeline';
        wrapper.appendChild(title);

        const pdsaTable = this.publome.table('pdsaCycle');
        const intTable = this.publome.table('intervention');
        const allPdsa = pdsaTable.all();

        // Map to Gantt tasks
        const tasks = [];
        const phaseColors = { Plan: 'var(--ex-clr-primary)', Do: 'var(--ex-clr-success)', Study: 'var(--ex-clr-warning)', Act: 'var(--ex-clr-purple)' };

        for (const p of allPdsa) {
            const start = p.get('startDate');
            const end = p.get('endDate');
            if (!start) continue; // skip cycles without dates

            const intervention = intTable.read(p.get('interventionId'));
            const intName = intervention ? intervention.get('name') : 'Unknown';
            const phase = p.get('phase') || 'Plan';

            tasks.push({
                id: p.get('idx'),
                title: `${phase}: ${(p.get('plan') || '').substring(0, 40)}`,
                startDate: start,
                endDate: end || start,
                color: phaseColors[phase] || 'var(--ui-gray-500)',
                group: intName,
                status: p.get('status') || 'active'
            });
        }

        if (tasks.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><i class="fas fa-info-circle"></i><div class="ex-empty-msg">Add start/end dates to PDSA cycles to see the Gantt timeline</div></div>';
            this._stageEl.appendChild(wrapper);
            return;
        }

        const ganttContainer = document.createElement('div');
        ganttContainer.className = 'ex-mb-xl';
        new uiGantt({
            template: 'compact',
            tasks: tasks,
            parent: ganttContainer
        });
        wrapper.appendChild(ganttContainer);

        // Legend
        const legend = document.createElement('div');
        legend.className = 'ex-chart-legend';
        for (const [phase, color] of Object.entries(phaseColors)) {
            legend.innerHTML += `<span><span class="ex-legend-swatch" style="background:${color};"></span>${phase}</span>`;
        }
        wrapper.appendChild(legend);

        this._stageEl.appendChild(wrapper);
    }

    // ── Strategy Map ─────────────────────────────────────────────────

    _renderStrategyMap() {
        this._stageEl.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        const title = document.createElement('div');
        title.className = 'ex-view-title';
        title.innerHTML = '<i class="fas fa-project-diagram"></i>Strategy Map — Metrics & Interventions';
        wrapper.appendChild(title);

        const metricTable = this.publome.table('metric');
        const intTable = this.publome.table('intervention');
        const catTable = this.publome.table('metricCategory');
        const colorMap = { success: 'var(--ex-clr-success)', info: 'var(--ex-clr-primary)', warning: 'var(--ex-clr-warning)', primary: 'var(--ex-clr-purple)' };
        const statusColorMap = { active: 'var(--ex-clr-success)', proposed: 'var(--ex-clr-primary)', completed: 'var(--ex-clr-purple)', paused: 'var(--ex-clr-warning)' };

        // Build nodes: metrics + interventions
        const nodes = [];
        const edges = [];

        for (const m of metricTable.all()) {
            const cat = m.get('metricCategoryId') ? catTable.read(m.get('metricCategoryId')) : null;
            const catColor = cat ? (colorMap[cat.get('color')] || 'var(--ui-gray-500)') : 'var(--ui-gray-500)';
            nodes.push({
                id: `m-${m.get('idx')}`,
                label: m.get('code'),
                color: catColor,
                icon: cat ? cat.get('icon') : 'chart-pie'
            });
        }

        for (const i of intTable.all()) {
            const status = i.get('status') || 'proposed';
            nodes.push({
                id: `i-${i.get('idx')}`,
                label: i.get('name').substring(0, 20),
                color: statusColorMap[status] || 'var(--ui-gray-500)',
                icon: 'tools'
            });
            // Edge: intervention → metric
            edges.push({
                source: `i-${i.get('idx')}`,
                target: `m-${i.get('metricId')}`,
                label: ''
            });
        }

        if (nodes.length === 0) {
            wrapper.innerHTML += '<div class="ex-empty"><div class="ex-empty-msg">No data for strategy map</div></div>';
            this._stageEl.appendChild(wrapper);
            return;
        }

        const graphContainer = document.createElement('div');
        graphContainer.className = 'ex-mb-xl';
        new uiGraphView({
            nodes: nodes,
            edges: edges,
            parent: graphContainer
        });
        wrapper.appendChild(graphContainer);

        // Legend
        const legend = document.createElement('div');
        legend.className = 'ex-chart-legend ex-flex-wrap';
        legend.innerHTML = '<strong style="margin-right:0.3rem;">Metrics:</strong>';
        for (const cat of catTable.all()) {
            const clr = colorMap[cat.get('color')] || 'var(--ui-gray-500)';
            legend.innerHTML += `<span><span class="ex-legend-swatch" style="border-radius:50%;background:${clr};"></span>${cat.get('name')}</span>`;
        }
        legend.innerHTML += '<span style="margin-left:0.5rem;"><strong>Interventions:</strong></span>';
        for (const [s, c] of Object.entries(statusColorMap)) {
            legend.innerHTML += `<span><span class="ex-legend-swatch" style="background:${c};"></span>${s}</span>`;
        }
        wrapper.appendChild(legend);

        this._stageEl.appendChild(wrapper);
    }

    // ── Metric Monitoring ─────────────────────────────────────────────

    _getMonitorStatus(metricIdx, entityIdx) {
        if (!metricIdx || !entityIdx) return null;

        const metric = this.publome.table('metric').read(metricIdx);
        if (!metric) return null;

        const target = metric.get('target');
        const benchmark = metric.get('benchmark');
        const unit = metric.get('unit');
        const lowerIsBetter = unit === 'ratio';
        const value = this.engine.getValue(metricIdx, entityIdx, this.year);

        if (value == null) return null;

        // Check YoY trend for consecutive decline
        const years = this.engine.getYears();
        const trend = this.engine.getTrend(metricIdx, entityIdx, years);
        const vals = trend.filter(t => t.value != null).sort((a, b) => b.year - a.year);
        let consecutiveDecline = 0;
        for (let i = 0; i < vals.length - 1; i++) {
            const improving = lowerIsBetter ? vals[i].value < vals[i + 1].value : vals[i].value > vals[i + 1].value;
            if (!improving) consecutiveDecline++;
            else break;
        }

        // Decision tree
        const atTarget = lowerIsBetter ? value <= target : value >= target;
        const atBenchmark = lowerIsBetter ? value <= benchmark : value >= benchmark;

        if (atTarget) {
            return { label: 'On Track', icon: 'check-circle', color: 'var(--ex-clr-success)', bg: 'var(--ex-clr-success-bg)', detail: 'Meeting or exceeding target' };
        }
        if (consecutiveDecline >= 2 && !atBenchmark) {
            return { label: 'Action Required', icon: 'exclamation-circle', color: 'var(--ex-clr-danger)', bg: 'var(--ex-clr-danger-bg)', detail: `Declining ${consecutiveDecline} consecutive years and below benchmark` };
        }
        if (atBenchmark) {
            return { label: 'Watch', icon: 'eye', color: 'var(--ex-clr-warning)', bg: 'var(--ex-clr-warning-bg)', detail: 'Below target but above benchmark' };
        }
        return { label: 'Action Required', icon: 'exclamation-triangle', color: 'var(--ex-clr-danger)', bg: 'var(--ex-clr-danger-bg)', detail: 'Below benchmark — intervention needed' };
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
