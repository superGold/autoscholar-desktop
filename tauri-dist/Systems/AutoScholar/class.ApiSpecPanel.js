/**
 * ApiSpecPanel - API documentation and live testing
 *
 * Compound-pattern panel (render(controlEl, stageEl)) that provides:
 * - Sidebar listing all API actions from active institution's api-mappings.json
 * - Grouped by category (academic, student, programme, staff, structure, etc.)
 * - Detail view: parameters, Oracle tables, return columns, SQL
 * - Live test: send a test request for the selected action
 *
 * Usage:
 *   const panel = new ApiSpecPanel();
 *   panel.render(controlEl, stageEl);
 */
class ApiSpecPanel {

    // ── Category display config ───────────────────────────────────────────────

    static CATEGORIES = {
        core:      { label: 'Core',             icon: 'fa-cog',           color: '#6b7280' },
        academic:  { label: 'Academic',         icon: 'fa-graduation-cap', color: '#3b82f6' },
        student:   { label: 'Student Data',     icon: 'fa-user',          color: '#8b5cf6' },
        programme: { label: 'Programme',        icon: 'fa-sitemap',       color: '#10b981' },
        staff:     { label: 'Staff',            icon: 'fa-id-badge',      color: '#f59e0b' },
        structure: { label: 'Faculty/Dept',     icon: 'fa-building',      color: '#ec4899' },
        ldap:      { label: 'LDAP/Auth',        icon: 'fa-key',           color: '#ef4444' },
        utility:   { label: 'Utility',          icon: 'fa-wrench',        color: '#6366f1' }
    };

    constructor() {
        this._mappings = {};
        this._selectedAction = null;
        this._controlEl = null;
        this._stageEl = null;
        this._activeCode = '';
    }

    // ── Public API ────────────────────────────────────────────────────────────

    async render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        await this._loadMappings();
        this._renderControl();
        this._renderStageEmpty();

        // Listen for institution changes
        window.addEventListener('institution-changed', async () => {
            await this._loadMappings();
            this._renderControl();
            this._renderStageEmpty();
        });
    }

    // ── Data Loading ──────────────────────────────────────────────────────────

    async _loadMappings() {
        try {
            const instRes = await fetch('/api/institutions');
            const instData = await instRes.json();
            this._activeCode = instData.active || '';

            const res = await fetch(`/api/mappings/${this._activeCode}`);
            this._mappings = await res.json();
        } catch (e) {
            console.error('ApiSpecPanel: Failed to load mappings', e);
            this._mappings = {};
        }
    }

    // ── Control Panel (left side — action list grouped by category) ───────────

    _renderControl() {
        this._controlEl.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding:0.5rem 0 0.75rem 0;';
        header.innerHTML = `
            <div style="font-size:0.75rem; font-weight:700; color:var(--ui-gray-800); margin-bottom:0.25rem;">
                <i class="fa-solid fa-book" style="margin-right:0.3rem; color:var(--ui-primary-500);"></i>API Actions
            </div>
            <div style="font-size:0.6rem; color:var(--ui-gray-500);">
                ${this._activeCode.toUpperCase()} &mdash; ${Object.keys(this._mappings.mappings || {}).length} actions
            </div>
        `;
        this._controlEl.appendChild(header);

        const mappings = this._mappings.mappings || {};
        if (Object.keys(mappings).length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size:0.65rem; color:var(--ui-gray-400); padding:1rem 0; text-align:center;';
            empty.textContent = 'No API mappings loaded for this institution.';
            this._controlEl.appendChild(empty);
            return;
        }

        // Group by category
        const grouped = {};
        for (const [action, spec] of Object.entries(mappings)) {
            const cat = spec.category || 'utility';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ action, spec });
        }

        // Render each category group
        for (const [cat, actions] of Object.entries(grouped)) {
            const catConfig = ApiSpecPanel.CATEGORIES[cat] || { label: cat, icon: 'fa-circle', color: '#6b7280' };

            const section = document.createElement('div');
            section.style.cssText = 'margin-bottom:0.5rem;';

            const sectionHeader = document.createElement('div');
            sectionHeader.style.cssText = `
                font-size:0.6rem; font-weight:600; color:${catConfig.color};
                padding:0.35rem 0; border-bottom:1px solid var(--ui-gray-200);
                display:flex; align-items:center; gap:0.3rem;
                text-transform:uppercase; letter-spacing:0.03em;
            `;
            sectionHeader.innerHTML = `<i class="fa-solid ${catConfig.icon}" style="font-size:0.5rem;"></i> ${catConfig.label}`;
            section.appendChild(sectionHeader);

            for (const { action, spec } of actions) {
                const item = document.createElement('div');
                item.className = 'as-hover-row';
                item.style.cssText = `
                    padding:0.3rem 0.5rem; font-size:0.65rem; color:var(--ui-gray-700);
                    display:flex; align-items:center; gap:0.35rem;
                    border-bottom:1px solid var(--ui-gray-100);
                `;

                const statusDot = spec.status === 'implemented'
                    ? '<i class="fa-solid fa-circle" style="font-size:0.3rem; color:#10b981;"></i>'
                    : '<i class="fa-regular fa-circle" style="font-size:0.3rem; color:#d1d5db;"></i>';

                item.innerHTML = `${statusDot} <span style="flex:1;" class="as-truncate">${action}</span>`;

                if (this._selectedAction === action) {
                    item.style.background = 'var(--ui-primary-50)';
                    item.style.color = 'var(--ui-primary-700)';
                    item.style.fontWeight = '600';
                }

                item.addEventListener('click', () => {
                    this._selectedAction = action;
                    this._renderControl();
                    this._renderActionDetail(action, spec);
                });

                section.appendChild(item);
            }

            this._controlEl.appendChild(section);
        }
    }

    // ── Stage (right side) ────────────────────────────────────────────────────

    _renderStageEmpty() {
        this._stageEl.innerHTML = '';
        this._stageEl.style.cssText = 'padding:1rem; display:flex; flex-direction:column;';

        const empty = document.createElement('div');
        empty.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; color:var(--ui-gray-400); font-size:0.75rem;';
        empty.innerHTML = `
            <div style="text-align:center;">
                <i class="fa-solid fa-book-open" style="font-size:2rem; margin-bottom:0.5rem; display:block; opacity:0.3;"></i>
                Select an API action from the left panel to view its specification
            </div>
        `;
        this._stageEl.appendChild(empty);
    }

    _renderActionDetail(action, spec) {
        this._stageEl.innerHTML = '';
        this._stageEl.style.cssText = 'padding:1rem; display:flex; flex-direction:column; gap:0.75rem; overflow-y:auto;';

        // Action header
        const header = document.createElement('div');
        header.style.cssText = 'border-bottom:1px solid var(--ui-gray-200); padding-bottom:0.75rem;';
        const catConfig = ApiSpecPanel.CATEGORIES[spec.category] || { label: spec.category, color: '#6b7280' };
        const statusBadge = spec.status === 'implemented'
            ? '<span style="background:#f0fdf4; color:#065f46; border:1px solid #bbf7d0; padding:0.1rem 0.35rem; border-radius:12px; font-size:0.55rem; font-weight:600;">Implemented</span>'
            : '<span style="background:#f9fafb; color:#6b7280; border:1px solid #d1d5db; padding:0.1rem 0.35rem; border-radius:12px; font-size:0.55rem; font-weight:600;">Not Implemented</span>';

        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
                <span style="font-size:1rem; font-weight:700; color:var(--ui-gray-800);">${action}</span>
                ${statusBadge}
            </div>
            <div style="font-size:0.7rem; color:var(--ui-gray-600);">${spec.description || ''}</div>
            <div style="font-size:0.6rem; color:var(--ui-gray-400); margin-top:0.25rem;">
                Category: <span style="color:${catConfig.color}; font-weight:600;">${catConfig.label}</span>
                &bull; Priority: ${spec.priority || 'N/A'}
                &bull; Implementation: ${spec.implementation || 'N/A'}
                ${spec.tested ? '&bull; <span style="color:#10b981;">Tested</span>' : ''}
            </div>
        `;
        this._stageEl.appendChild(header);

        // Tables used
        if (spec.tables?.length) {
            const tablesSection = document.createElement('div');
            tablesSection.innerHTML = `<div class="si-section-title">Oracle Tables</div>`;
            const tableRow = document.createElement('div');
            tableRow.style.cssText = 'display:flex; gap:0.35rem; flex-wrap:wrap;';
            for (const table of spec.tables) {
                const chip = document.createElement('span');
                chip.style.cssText = 'background:var(--ui-primary-50); color:var(--ui-primary-700); border:1px solid var(--ui-primary-200); padding:0.15rem 0.4rem; border-radius:3px; font-size:0.6rem; font-family:var(--ui-font-mono); font-weight:600;';
                chip.textContent = table;
                tableRow.appendChild(chip);
            }
            if (spec.primaryTable) {
                const note = document.createElement('span');
                note.style.cssText = 'font-size:0.55rem; color:var(--ui-gray-400); align-self:center;';
                note.textContent = `Primary: ${spec.primaryTable}`;
                tableRow.appendChild(note);
            }
            tablesSection.appendChild(tableRow);
            this._stageEl.appendChild(tablesSection);
        }

        // Joins
        if (spec.joins?.length) {
            const joinSection = document.createElement('div');
            joinSection.innerHTML = `<div class="si-section-title">Joins</div>`;
            for (const join of spec.joins) {
                const joinEl = document.createElement('div');
                joinEl.style.cssText = 'font-size:0.6rem; font-family:var(--ui-font-mono); color:var(--ui-gray-600); padding:0.15rem 0;';
                joinEl.textContent = `${join.type} ${join.table} ${join.alias} ON ${join.on}`;
                joinSection.appendChild(joinEl);
            }
            this._stageEl.appendChild(joinSection);
        }

        // Parameters
        const params = spec.fieldMappings?.parameters;
        if (params?.length) {
            const paramSection = document.createElement('div');
            paramSection.innerHTML = `<div class="si-section-title">Parameters</div>`;
            const paramTable = this._buildFieldTable(params, ['param', 'type', 'column', 'table']);
            paramSection.appendChild(paramTable);
            this._stageEl.appendChild(paramSection);
        }

        // Return columns
        const returns = spec.fieldMappings?.returns;
        if (returns?.length) {
            const returnSection = document.createElement('div');
            returnSection.innerHTML = `<div class="si-section-title">Return Fields</div>`;
            const returnTable = this._buildFieldTable(returns, ['field', 'column', 'table']);
            returnSection.appendChild(returnTable);
            this._stageEl.appendChild(returnSection);
        }

        // SQL
        if (spec.sql) {
            const sqlSection = document.createElement('div');
            sqlSection.innerHTML = `<div class="si-section-title">SQL Query</div>`;
            const pre = document.createElement('pre');
            pre.className = 'as-pre';
            pre.style.cssText += 'max-height:15rem;';
            pre.textContent = spec.sql;
            sqlSection.appendChild(pre);
            this._stageEl.appendChild(sqlSection);
        }

        // Notes
        if (spec.notes) {
            const noteSection = document.createElement('div');
            noteSection.innerHTML = `
                <div class="si-section-title">Notes</div>
                <div style="font-size:0.65rem; color:var(--ui-gray-600); background:var(--ui-gray-50); padding:0.5rem; border-radius:4px; border:1px solid var(--ui-gray-200);">
                    ${spec.notes}
                </div>
            `;
            this._stageEl.appendChild(noteSection);
        }

        // Live test section
        if (spec.status === 'implemented') {
            this._renderLiveTest(action, spec);
        }
    }

    _buildFieldTable(fields, columns) {
        const table = document.createElement('table');
        table.style.cssText = 'width:100%; border-collapse:collapse; font-size:0.6rem;';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        for (const col of columns) {
            const th = document.createElement('th');
            th.style.cssText = 'text-align:left; padding:0.3rem 0.5rem; background:var(--ui-gray-50); border-bottom:2px solid var(--ui-gray-200); font-weight:600; font-size:0.55rem; text-transform:uppercase; letter-spacing:0.03em;';
            th.textContent = col;
            headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (const field of fields) {
            const row = document.createElement('tr');
            row.style.cssText = 'border-bottom:1px solid var(--ui-gray-100);';
            for (const col of columns) {
                const td = document.createElement('td');
                td.style.cssText = 'padding:0.25rem 0.5rem; font-family:var(--ui-font-mono);';
                td.textContent = field[col] || '';
                row.appendChild(td);
            }
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        return table;
    }

    // ── Live Test ─────────────────────────────────────────────────────────────

    _renderLiveTest(action, spec) {
        const section = document.createElement('div');
        section.innerHTML = `<div class="si-section-title">Live Test</div>`;

        // Build param inputs from fieldMappings.parameters
        const params = spec.fieldMappings?.parameters || [];
        const inputs = {};

        if (params.length > 0) {
            const inputGrid = document.createElement('div');
            inputGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(12rem, 1fr)); gap:0.5rem; margin-bottom:0.5rem;';

            for (const p of params) {
                const wrapper = document.createElement('div');
                const label = document.createElement('div');
                label.className = 'as-field-label';
                label.textContent = p.param;
                wrapper.appendChild(label);

                const input = document.createElement('input');
                input.className = 'as-field-input';
                input.placeholder = `${p.type || 'string'}`;
                // Set sensible defaults for common params
                if (p.param === 'year') input.value = '2024';
                if (p.param === 'courseCode') input.value = 'COMP101';
                inputs[p.param] = input;
                wrapper.appendChild(input);
                inputGrid.appendChild(wrapper);
            }
            section.appendChild(inputGrid);
        }

        // Send button
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;';

        const sendBtn = document.createElement('button');
        sendBtn.style.cssText = 'padding:0.35rem 0.75rem; border-radius:4px; border:none; background:var(--ui-primary-500); color:white; cursor:pointer; font-size:0.65rem; font-weight:600; display:flex; align-items:center; gap:0.3rem;';
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane" style="font-size:0.55rem;"></i> Send Request';

        const statusEl = document.createElement('span');
        statusEl.style.cssText = 'font-size:0.6rem; color:var(--ui-gray-500);';

        btnRow.appendChild(sendBtn);
        btnRow.appendChild(statusEl);
        section.appendChild(btnRow);

        // Response area
        const responsePre = document.createElement('pre');
        responsePre.className = 'as-pre';
        responsePre.style.cssText += 'max-height:15rem;';
        responsePre.textContent = '// Response will appear here...';
        section.appendChild(responsePre);

        // Send handler
        sendBtn.addEventListener('click', async () => {
            const payload = { action };

            // Add session if available
            if (window.AS_SESSION?.sessionId) {
                payload.sessionId = window.AS_SESSION.sessionId;
            }

            // Add params
            for (const [key, input] of Object.entries(inputs)) {
                if (input.value) {
                    payload[key] = isNaN(input.value) ? input.value : Number(input.value);
                }
            }

            statusEl.textContent = 'Sending...';
            statusEl.style.color = 'var(--ui-primary-500)';
            responsePre.textContent = '// Loading...';

            const start = performance.now();
            try {
                const res = await fetch('/api-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                const elapsed = Math.round(performance.now() - start);

                const rowCount = Array.isArray(data?.data) ? data.data.length : (data?.data ? 1 : 0);
                statusEl.textContent = `${elapsed}ms — ${rowCount} row(s)`;
                statusEl.style.color = data?.status === false ? '#ef4444' : '#10b981';
                responsePre.textContent = JSON.stringify(data, null, 2);
            } catch (e) {
                const elapsed = Math.round(performance.now() - start);
                statusEl.textContent = `${elapsed}ms — Error`;
                statusEl.style.color = '#ef4444';
                responsePre.textContent = `Error: ${e.message}`;
            }
        });

        this._stageEl.appendChild(section);
    }
}
