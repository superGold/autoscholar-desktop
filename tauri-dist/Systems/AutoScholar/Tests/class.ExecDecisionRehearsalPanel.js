/**
 * ExecDecisionRehearsalPanel — Bounded scenario comparison for Executive Insight
 *
 * Radio button grid for parameter selection, projected outcomes table
 * with delta arrows, confidence indicators, narrative integration,
 * and "Copy to Senate Pack" action.
 *
 * Usage:
 *   const panel = new ExecDecisionRehearsalPanel({ publome, engine, year, scenarioModel, narrativeEngine });
 *   panel.connectBus(bus);
 *   panel.render(container);
 */
class ExecDecisionRehearsalPanel {

    constructor(config = {}) {
        this.publome   = config.publome;
        this.engine    = config.engine;
        this.year      = config.year || 2025;
        this.model     = config.scenarioModel;
        this.narrative = config.narrativeEngine;
        this._container = null;
        this._entityIdx = null;
        this._bus = null;
    }

    connectBus(bus) {
        this._bus = bus;
        bus.on('entity:selected', (data) => {
            this._entityIdx = data.idx;
            this.model.clearCache();
            this._refresh();
        });
        bus.on('year:changed', (data) => {
            this.year = data.year;
            this.model.clearCache();
            this._refresh();
        });
        bus.on('exec:loaded', () => {
            this.model.clearCache();
            this._refresh();
        });
        return this;
    }

    render(container) {
        this._container = container;
        this._entityIdx = this._entityIdx || this._getInstitutionIdx();
        this._refresh();
    }

    // ── Rendering ────────────────────────────────────────────────────

    _refresh() {
        if (!this._container) return;
        this._container.innerHTML = '';

        const entityIdx = this._entityIdx || this._getInstitutionIdx();
        if (!entityIdx || !this.model) {
            this._container.innerHTML = '<div class="ex-empty"><i class="fas fa-flask"></i><div class="ex-empty-msg">Decision Rehearsal requires scenario model</div></div>';
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        // Header
        this._renderHeader(wrapper, entityIdx);

        // Main content: parameters + results side by side
        const content = document.createElement('div');
        content.className = 'ex-rehearsal-layout';

        // Left: Parameter selection
        const paramPanel = document.createElement('div');
        paramPanel.className = 'ex-rehearsal-params';
        this._renderParameters(paramPanel);
        content.appendChild(paramPanel);

        // Right: Results
        const resultPanel = document.createElement('div');
        resultPanel.className = 'ex-rehearsal-results';
        this._renderResults(resultPanel, entityIdx);
        content.appendChild(resultPanel);

        wrapper.appendChild(content);

        // Narrative section
        this._renderNarrative(wrapper, entityIdx);

        // Model info footer
        this._renderModelInfo(wrapper, entityIdx);

        this._container.appendChild(wrapper);
    }

    _renderHeader(wrapper, entityIdx) {
        const entity = this.engine.getKPIs(entityIdx, this.year)._entity;
        const header = document.createElement('div');
        header.className = 'ex-summary-header';
        header.innerHTML = `
            <div class="ex-summary-header-row">
                <i class="fas fa-flask ex-summary-header-icon ex-clr-indigo"></i>
                <div>
                    <div class="ex-summary-header-title">Decision Rehearsal</div>
                    <div class="ex-summary-header-sub">${entity ? entity.name : ''} | ${this.year} | Bounded Scenario Comparison</div>
                </div>
                <button class="ex-btn ex-btn-sm ex-btn-outline" onclick="this.closest('.ex-stage-wrap').querySelector('.ex-rehearsal-params').querySelectorAll('input[value=current]').forEach(r => { r.checked = true; r.dispatchEvent(new Event('change', {bubbles:true})); })">
                    <i class="fas fa-undo"></i> Reset All
                </button>
            </div>
        `;
        wrapper.appendChild(header);
    }

    _renderParameters(panel) {
        const params = this.model.getParameters();
        const selections = this.model.getSelections();

        const title = document.createElement('div');
        title.className = 'ex-section-title';
        title.textContent = 'Intervention Parameters';
        panel.appendChild(title);

        for (const param of params) {
            const card = document.createElement('div');
            card.className = 'ex-rehearsal-param-card';

            const header = document.createElement('div');
            header.className = 'ex-rehearsal-param-header';
            header.innerHTML = `
                <i class="fas fa-${param.icon} ex-clr-primary"></i>
                <span class="ex-rehearsal-param-name">${param.name}</span>
                <span class="ex-rehearsal-evidence" title="Evidence strength: ${Math.round(param.evidenceStrength * 100)}%">
                    ${'<i class="fas fa-star ex-evidence-star"></i>'.repeat(Math.round(param.evidenceStrength * 5))}
                </span>
            `;
            card.appendChild(header);

            const desc = document.createElement('div');
            desc.className = 'ex-rehearsal-param-desc';
            desc.textContent = param.description;
            card.appendChild(desc);

            // Radio buttons for 3 settings
            const radioGroup = document.createElement('div');
            radioGroup.className = 'ex-rehearsal-radios';

            for (const [level, setting] of Object.entries(param.settings)) {
                const label = document.createElement('label');
                label.className = 'ex-rehearsal-radio-label';
                if (level === (selections[param.key] || 'current')) {
                    label.classList.add('ex-rehearsal-radio-active');
                }

                const levelCls = level === 'current' ? 'ex-clr-muted' :
                                 level === 'moderate' ? 'ex-clr-primary' : 'ex-clr-success';

                const costText = setting.annualCost > 0
                    ? `R${(setting.annualCost / 1000).toFixed(0)}k/yr`
                    : 'No additional cost';

                label.innerHTML = `
                    <input type="radio" name="param-${param.key}" value="${level}"
                        ${level === (selections[param.key] || 'current') ? 'checked' : ''}>
                    <div class="ex-rehearsal-radio-content">
                        <div class="ex-rehearsal-radio-title ${levelCls}">${setting.label}</div>
                        <div class="ex-rehearsal-radio-desc">${setting.description}</div>
                        <div class="ex-rehearsal-radio-cost">${costText}</div>
                    </div>
                `;

                const self = this;
                label.querySelector('input').addEventListener('change', function() {
                    self.model.setSelection(param.key, this.value);
                    self._refresh();
                });

                radioGroup.appendChild(label);
            }

            card.appendChild(radioGroup);
            panel.appendChild(card);
        }
    }

    _renderResults(panel, entityIdx) {
        const projection = this.model.project(entityIdx, this.year);

        const title = document.createElement('div');
        title.className = 'ex-section-title';
        title.textContent = 'Projected Outcomes';
        panel.appendChild(title);

        // Metrics table
        const table = document.createElement('table');
        table.className = 'ex-rehearsal-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Current</th>
                    <th>Projected</th>
                    <th>Change</th>
                    <th>vs Target</th>
                    <th>Confidence</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement('tbody');

        for (const m of projection.metrics) {
            const row = document.createElement('tr');
            const deltaClass = m.delta > 0 ? 'ex-clr-success' : (m.delta < 0 ? 'ex-clr-danger' : 'ex-clr-muted');
            const deltaArrow = m.delta > 0 ? '\u2191' : (m.delta < 0 ? '\u2193' : '\u2192');
            const statusIcon = m.status === 'success' ? 'check-circle' :
                               m.status === 'warning' ? 'exclamation-triangle' : 'times-circle';
            const statusCls = m.status === 'success' ? 'ex-clr-success' :
                              m.status === 'warning' ? 'ex-clr-warning' : 'ex-clr-danger';

            // Confidence bar
            const confPct = Math.round(m.confidence * 100);
            const confColor = confPct >= 70 ? 'var(--ex-clr-success)' :
                              confPct >= 50 ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';

            row.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td>${m.current.toFixed(1)}%</td>
                <td><strong>${m.projected.toFixed(1)}%</strong></td>
                <td class="${deltaClass}">
                    ${deltaArrow} ${Math.abs(m.delta).toFixed(1)}pp
                </td>
                <td><i class="fas fa-${statusIcon} ${statusCls}"></i> ${m.target}%</td>
                <td>
                    <div class="ex-confidence-bar">
                        <div class="ex-confidence-fill" style="width:${confPct}%;background:${confColor};"></div>
                    </div>
                    <span class="ex-confidence-label">${confPct}%</span>
                </td>
            `;
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        panel.appendChild(table);

        // Cost summary
        if (projection.costImpact.totalAnnual > 0) {
            const costSection = document.createElement('div');
            costSection.className = 'ex-rehearsal-cost';
            costSection.innerHTML = `
                <div class="ex-section-title ex-mt-4">Cost Impact</div>
                <div class="ex-rehearsal-cost-grid">
                    <div class="ex-rehearsal-cost-item">
                        <div class="ex-rehearsal-cost-label">Additional Annual Cost</div>
                        <div class="ex-rehearsal-cost-value">R${(projection.costImpact.totalAnnual / 1000).toFixed(0)}k</div>
                    </div>
                    <div class="ex-rehearsal-cost-item">
                        <div class="ex-rehearsal-cost-label">Est. Additional Graduates</div>
                        <div class="ex-rehearsal-cost-value">${projection.costImpact.additionalGraduates > 0 ? projection.costImpact.additionalGraduates : '<span class="ex-clr-muted">—</span>'}</div>
                    </div>
                    <div class="ex-rehearsal-cost-item">
                        <div class="ex-rehearsal-cost-label">Cost per Additional Graduate</div>
                        <div class="ex-rehearsal-cost-value">${projection.costImpact.costPerGraduate > 0 ? 'R' + projection.costImpact.costPerGraduate.toLocaleString() : '<span class="ex-clr-muted">N/A</span>'}</div>
                    </div>
                </div>
            `;

            // Cost breakdown
            if (projection.costImpact.items.length > 0) {
                const breakdownHtml = projection.costImpact.items.map(item =>
                    `<div class="ex-rehearsal-cost-row">
                        <span>${item.name} (${item.level})</span>
                        <span>R${(item.cost / 1000).toFixed(0)}k</span>
                    </div>`
                ).join('');
                costSection.innerHTML += `<div class="ex-rehearsal-cost-breakdown">${breakdownHtml}</div>`;
            }

            panel.appendChild(costSection);
        }
    }

    _renderNarrative(wrapper, entityIdx) {
        if (!this.narrative) return;

        const selections = this.model.getSelections();
        const hasChanges = Object.values(selections).some(v => v !== 'current');
        if (!hasChanges) return;

        const narrativeText = this.model.generateNarrative(entityIdx, this.year);

        const section = document.createElement('div');
        section.className = 'ex-section ex-rehearsal-narrative';

        const title = document.createElement('div');
        title.className = 'ex-section-title';
        title.innerHTML = '<i class="fas fa-file-alt"></i> Governance Narrative';
        section.appendChild(title);

        const textEl = document.createElement('div');
        textEl.className = 'ex-rehearsal-narrative-text';
        textEl.innerHTML = narrativeText.split('\n\n').map(p =>
            `<p class="ex-about-body">${p}</p>`
        ).join('');
        section.appendChild(textEl);

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'ex-rehearsal-actions';
        actions.innerHTML = `
            <button class="ex-btn ex-btn-sm ex-btn-primary" title="Copy narrative to clipboard">
                <i class="fas fa-copy"></i> Copy to Senate Pack
            </button>
        `;

        actions.querySelector('.ex-btn-primary').addEventListener('click', () => {
            navigator.clipboard.writeText(narrativeText).then(() => {
                const btn = actions.querySelector('.ex-btn-primary');
                btn.innerHTML = '<i class="fas fa-check"></i> Copied';
                setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy to Senate Pack'; }, 2000);
            });
        });

        section.appendChild(actions);
        wrapper.appendChild(section);
    }

    _renderModelInfo(wrapper, entityIdx) {
        const projection = this.model.project(entityIdx, this.year);
        const info = projection.modelInfo;

        const footer = document.createElement('div');
        footer.className = 'ex-rehearsal-footer';
        footer.innerHTML = `
            <div class="ex-rehearsal-footer-row">
                <span class="ex-rehearsal-footer-item">
                    <i class="fas fa-info-circle"></i> Model v${info.version}
                </span>
                <span class="ex-rehearsal-footer-item">
                    <i class="fas fa-cog"></i> ${info.method}
                </span>
                <span class="ex-rehearsal-footer-item">
                    <i class="fas fa-database"></i> ${info.dataSource}
                </span>
            </div>
            <div class="ex-rehearsal-disclaimer">${info.disclaimer}</div>
        `;

        // Assumptions
        if (info.assumptions.length > 0) {
            const assumList = document.createElement('details');
            assumList.className = 'ex-rehearsal-assumptions';
            assumList.innerHTML = `
                <summary><i class="fas fa-list"></i> Assumptions (${info.assumptions.length})</summary>
                <ul>${info.assumptions.map(a => `<li>${a}</li>`).join('')}</ul>
            `;
            footer.appendChild(assumList);
        }

        wrapper.appendChild(footer);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    _getInstitutionIdx() {
        const entityTable = this.publome.table('entity');
        const inst = entityTable.all().find(e => e.get('type') === 'institution');
        return inst ? inst.get('idx') : null;
    }
}
