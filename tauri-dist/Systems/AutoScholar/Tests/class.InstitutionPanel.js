/**
 * InstitutionPanel - Multi-institution switcher and config viewer
 *
 * Compound-pattern panel (render(controlEl, stageEl)) that provides:
 * - Card grid of all loaded institutions (DUT, VUT, UKZN, CPUT, WITS)
 * - Click card to switch active institution (POST /api/set-institution)
 * - Config viewer showing active institution's config.json
 * - Config editor (textarea + save) via PUT /api/config/:id
 *
 * Usage:
 *   const panel = new InstitutionPanel();
 *   panel.render(controlEl, stageEl);
 */
class InstitutionPanel {

    constructor() {
        this._institutions = {};
        this._active = '';
        this._controlEl = null;
        this._stageEl = null;
        this._cardsContainer = null;
        this._configDisplay = null;
        this._editing = false;
        this._infraRegistry = null;
        this._credentials = {};
    }

    // ── Public API ────────────────────────────────────────────────────────────

    async render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        await Promise.all([
            this._loadInstitutions(),
            this._loadInfraRegistry()
        ]);
        await this._loadCredentials();
        this._renderControl();
        this._renderStage();
    }

    // ── Data Loading ──────────────────────────────────────────────────────────

    async _loadInstitutions() {
        try {
            const res = await fetch('/api/institutions');
            const data = await res.json();
            this._institutions = data.institutions || {};
            this._active = data.active || '';
        } catch (e) {
            console.error('InstitutionPanel: Failed to load institutions', e);
        }
    }

    async _loadInfraRegistry() {
        try {
            const res = await fetch('/api/infrastructure-registry');
            this._infraRegistry = await res.json();
        } catch (e) {
            console.error('InstitutionPanel: Failed to load infrastructure registry', e);
        }
    }

    async _loadCredentials() {
        for (const code of Object.keys(this._institutions)) {
            try {
                const res = await fetch(`/api/credentials/${code}`);
                this._credentials[code] = await res.json();
            } catch (e) { /* skip */ }
        }
    }

    // ── Control Panel (left side — institution cards) ─────────────────────────

    _renderControl() {
        this._controlEl.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'ip-ctrl-header';
        header.innerHTML = `
            <div class="ip-ctrl-title">
                <i class="fa-solid fa-building-columns" style="margin-right:0.3rem; color:var(--ui-primary-500);"></i>Institutions
            </div>
            <div class="ip-ctrl-desc">Click a card to switch the active institution</div>
        `;
        this._controlEl.appendChild(header);

        // Cards container
        this._cardsContainer = document.createElement('div');
        this._cardsContainer.className = 'ip-card-stack';
        this._controlEl.appendChild(this._cardsContainer);

        this._renderCards();
    }

    _renderCards() {
        this._cardsContainer.innerHTML = '';

        const sorted = Object.entries(this._institutions).sort((a, b) => {
            // Active first, then deployed, then alphabetical
            if (a[0] === this._active) return -1;
            if (b[0] === this._active) return 1;
            const aDeployed = a[1].config?.implementation?.deployed;
            const bDeployed = b[1].config?.implementation?.deployed;
            if (aDeployed && !bDeployed) return -1;
            if (!aDeployed && bDeployed) return 1;
            return a[0].localeCompare(b[0]);
        });

        for (const [code, inst] of sorted) {
            const cfg = inst.config || {};
            const isActive = code === this._active;
            const isDeployed = cfg.implementation?.deployed;
            const hasCredentials = inst.hasCredentials;

            const card = document.createElement('div');
            card.className = `as-hover-card ip-inst-card${isActive ? ' active' : ''}`;

            // Status determination
            let statusColor, statusLabel, statusBg, statusBorder;
            if (isActive && isDeployed) {
                statusColor = 'var(--as-status-connected-color)';
                statusBg = 'var(--as-status-connected-bg)';
                statusBorder = 'var(--as-status-connected-border)';
                statusLabel = 'Active';
            } else if (isDeployed && hasCredentials) {
                statusColor = 'var(--as-status-configured-color)';
                statusBg = 'var(--as-status-configured-bg)';
                statusBorder = 'var(--as-status-configured-border)';
                statusLabel = 'Configured';
            } else if (isDeployed) {
                statusColor = 'var(--as-status-testing-color)';
                statusBg = 'var(--as-status-testing-bg)';
                statusBorder = 'var(--as-status-testing-border)';
                statusLabel = 'Deployed';
            } else {
                statusColor = 'var(--as-status-disconnected-color)';
                statusBg = 'var(--as-status-disconnected-bg)';
                statusBorder = 'var(--as-status-disconnected-border)';
                statusLabel = 'Placeholder';
            }

            const brandColor = cfg.branding?.primaryColor || '#666';
            const iconEl = this._getInstitutionIcon(code);

            card.innerHTML = `
                <div class="ui-flex ui-items-center ui-gap-2">
                    <div class="as-integ-icon as-integ-icon-md" style="background:${brandColor}; color:white;">
                        ${iconEl}
                    </div>
                    <div class="as-flex-1 as-min-w-0">
                        <div class="ip-ctrl-title as-truncate">${(cfg.institution?.shortName || code).toUpperCase()}</div>
                        <div class="ip-ctrl-desc as-truncate">${cfg.institution?.name || 'Unknown'}</div>
                    </div>
                    <span class="as-status-pill" style="color:${statusColor}; background:${statusBg}; border-color:${statusBorder};">
                        <i class="fa-solid fa-circle" style="font-size:0.35rem;"></i>
                        ${statusLabel}
                    </span>
                </div>
            `;

            card.addEventListener('click', () => this._switchInstitution(code));
            this._cardsContainer.appendChild(card);
        }
    }

    _getInstitutionIcon(code) {
        const icons = {
            dut: '<i class="fa-solid fa-building-columns" style="font-size:0.7rem;"></i>',
            vut: '<i class="fa-solid fa-graduation-cap" style="font-size:0.7rem;"></i>',
            ukzn: '<i class="fa-solid fa-landmark" style="font-size:0.7rem;"></i>',
            cput: '<i class="fa-solid fa-university" style="font-size:0.7rem;"></i>',
            wits: '<i class="fa-solid fa-school" style="font-size:0.7rem;"></i>'
        };
        return icons[code] || '<i class="fa-solid fa-building" style="font-size:0.7rem;"></i>';
    }

    // ── Stage (right side — config viewer/editor) ─────────────────────────────

    _renderStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'ip-stage-layout';

        // Institution header
        this._headerEl = document.createElement('div');
        this._stageEl.appendChild(this._headerEl);

        // Config display area
        this._configDisplay = document.createElement('div');
        this._configDisplay.className = 'ip-config-flex';
        this._stageEl.appendChild(this._configDisplay);

        this._renderStageContent();
    }

    _renderStageContent() {
        const inst = this._institutions[this._active];
        const cfg = inst?.config || {};

        // Header
        this._headerEl.innerHTML = '';
        const brandColor = cfg.branding?.primaryColor || '#003366';

        this._headerEl.innerHTML = `
            <div class="ip-stage-header">
                <div class="as-integ-icon as-integ-icon-lg" style="background:${brandColor}; color:white;">
                    ${this._getInstitutionIcon(this._active)}
                </div>
                <div class="as-flex-1">
                    <div class="ip-stage-title">${cfg.institution?.name || this._active.toUpperCase()}</div>
                    <div class="ip-stage-subtitle">
                        ${cfg.implementation?.deployedUrl || 'No deployment URL'} &bull;
                        ${cfg.api?.backend || 'unknown'} backend &bull;
                        ${cfg.api?.dataSource || 'unknown'} data source
                    </div>
                </div>
                <div class="ui-flex ui-gap-2">
                    ${this._makeActionButton('View Config', 'fa-eye')}
                    ${this._makeActionButton('Infrastructure', 'fa-server')}
                    ${this._makeActionButton('Edit Config', 'fa-pen')}
                </div>
            </div>
        `;

        // Bind the buttons after innerHTML
        const buttons = this._headerEl.querySelectorAll('button');
        buttons[0]?.addEventListener('click', () => this._showConfigViewer());
        buttons[1]?.addEventListener('click', () => this._showInfrastructure());
        buttons[2]?.addEventListener('click', () => this._showConfigEditor());

        // Show summary cards + config viewer by default
        this._showConfigViewer();
    }

    _makeActionButton(label, icon, onClick) {
        return `<button class="ip-action-btn"><i class="fa-solid ${icon}" style="font-size:0.6rem;"></i> ${label}</button>`;
    }

    _showConfigViewer() {
        const inst = this._institutions[this._active];
        const cfg = inst?.config || {};
        this._configDisplay.innerHTML = '';

        // Summary cards row
        const summaryRow = document.createElement('div');
        summaryRow.className = 'ip-summary-row';
        this._configDisplay.appendChild(summaryRow);

        const features = cfg.features || {};
        const enabledCount = Object.values(features).filter(f => f.enabled).length;
        const totalFeatures = Object.keys(features).length;

        const summaryCards = [
            { label: 'Status', value: cfg.implementation?.deployed ? 'Deployed' : 'Placeholder', color: cfg.implementation?.deployed ? '#10b981' : '#6b7280' },
            { label: 'Backend', value: (cfg.api?.backend || 'N/A').toUpperCase(), color: '#3b82f6' },
            { label: 'Features', value: `${enabledCount}/${totalFeatures}`, color: '#8b5cf6' },
            { label: 'Auth', value: cfg.auth?.method || 'N/A', color: '#f59e0b' },
            { label: 'Issues', value: String(cfg.knownIssues?.length || 0), color: cfg.knownIssues?.length ? '#ef4444' : '#10b981' }
        ];

        for (const card of summaryCards) {
            const el = document.createElement('div');
            el.className = 'si-kpi-card';
            el.innerHTML = `
                <div class="si-kpi-label">${card.label}</div>
                <div class="si-kpi-value-lg" style="color:${card.color};">${card.value}</div>
            `;
            summaryRow.appendChild(el);
        }

        // Strategy & Documents (rendered from config.notes + config.files)
        const notes = cfg.notes || {};
        const files = cfg.files || {};
        const docEntries = this._buildDocEntries(notes, files);
        if (docEntries.length > 0) {
            const docsSection = document.createElement('div');
            docsSection.style.marginBottom = '0.75rem';
            docsSection.innerHTML = `<div class="si-section-title"><i class="fa-solid fa-file-lines" style="margin-right:0.3rem;"></i>Notes & References</div>`;

            // High-level description from dataSources + knownIssues
            const dataStats = this._getDataStatsMarkup(cfg);
            if (dataStats) {
                const descEl = document.createElement('div');
                descEl.className = 'ip-note-block';
                descEl.innerHTML = dataStats;
                docsSection.appendChild(descEl);
            }

            // Document cards
            const docsGrid = document.createElement('div');
            docsGrid.className = 'ip-doc-list';
            for (const doc of docEntries) {
                const row = document.createElement('div');
                row.className = 'ip-doc-row';
                row.innerHTML = `
                    <i class="fa-solid ${doc.icon}" style="font-size:0.7rem; color:${doc.color}; width:1.2rem; text-align:center;"></i>
                    <div class="as-flex-1 as-min-w-0">
                        <div class="ip-doc-title">${doc.label}</div>
                        <div class="ip-doc-desc as-truncate">${doc.description}</div>
                        <div class="ip-doc-path as-truncate">${doc.path}</div>
                    </div>
                `;
                docsGrid.appendChild(row);
            }
            docsSection.appendChild(docsGrid);
            this._configDisplay.appendChild(docsSection);
        }

        // Feature grid
        if (totalFeatures > 0) {
            const featureSection = document.createElement('div');
            featureSection.innerHTML = `<div class="si-section-title">Features</div>`;
            const featureGrid = document.createElement('div');
            featureGrid.className = 'ip-feature-grid';
            for (const [key, val] of Object.entries(features)) {
                const chip = document.createElement('span');
                chip.className = 'as-perm-chip';
                const enabled = val.enabled;
                chip.style.cssText = `color:${enabled ? 'var(--ui-green-800)' : 'var(--ui-gray-500)'}; background:${enabled ? 'var(--ui-green-50)' : '#f9fafb'}; border-color:${enabled ? 'var(--ui-green-200)' : 'var(--ui-gray-300)'};`;
                chip.innerHTML = `<i class="fa-solid ${enabled ? 'fa-check' : 'fa-minus'}" style="font-size:0.4rem;"></i> ${key}`;
                featureGrid.appendChild(chip);
            }
            featureSection.appendChild(featureGrid);
            this._configDisplay.appendChild(featureSection);
        }

        // JSON config view
        const configSection = document.createElement('div');
        configSection.className = 'ip-config-flex';
        configSection.innerHTML = `<div class="si-section-title">Configuration (config.json)</div>`;
        const pre = document.createElement('pre');
        pre.className = 'as-pre';
        pre.style.cssText = 'flex:1; min-height:0; overflow:auto; max-height:none;';
        pre.textContent = JSON.stringify(cfg, null, 2);
        configSection.appendChild(pre);
        this._configDisplay.appendChild(configSection);
    }

    // ── Infrastructure View ─────────────────────────────────────────────────

    async _showInfrastructure() {
        const creds = this._credentials[this._active] || {};
        const db = creds.database || {};
        const server = creds.server || {};
        this._configDisplay.innerHTML = '';

        // ── Server Details Section ──
        const serverSection = document.createElement('div');
        serverSection.innerHTML = `<div class="si-section-title"><i class="fa-solid fa-server" style="margin-right:0.3rem;"></i>Server Infrastructure</div>`;
        this._configDisplay.appendChild(serverSection);

        const serverGrid = document.createElement('div');
        serverGrid.className = 'ip-infra-grid';
        serverSection.appendChild(serverGrid);

        const serverCards = [
            { label: 'Host', value: server.host || db.host || 'Not set', color: '#3b82f6' },
            { label: 'IP', value: server.ip || '—', color: '#6366f1' },
            { label: 'OS', value: server.os || '—', color: '#8b5cf6' },
            { label: 'Web Root', value: server.webRoot || '—', color: '#06b6d4' },
            { label: 'SSH User', value: server.user || '—', color: '#0891b2' }
        ];

        for (const card of serverCards) {
            const el = document.createElement('div');
            el.className = 'si-kpi-card';
            el.innerHTML = `
                <div class="si-kpi-label">${card.label}</div>
                <div class="si-kpi-value" style="color:${card.color};">${card.value}</div>
            `;
            serverGrid.appendChild(el);
        }

        // ── Database Details Section ──
        const dbSection = document.createElement('div');
        dbSection.innerHTML = `<div class="si-section-title"><i class="fa-solid fa-database" style="margin-right:0.3rem;"></i>Database (PostgreSQL)</div>`;
        this._configDisplay.appendChild(dbSection);

        const dbGrid = document.createElement('div');
        dbGrid.className = 'ip-infra-grid';
        dbGrid.style.marginBottom = '0.5rem';
        dbSection.appendChild(dbGrid);

        const statusColors = { INSTALLED: '#10b981', PENDING: '#f59e0b', NOT_INSTALLED: '#6b7280' };
        const backendLabel = (db.backend || 'rust').toUpperCase();
        const backendColor = db.backend === 'php' ? '#8b5cf6' : '#f59e0b';
        const dbCards = [
            { label: 'Status', value: db.status || 'UNKNOWN', color: statusColors[db.status] || '#6b7280' },
            { label: 'Backend', value: backendLabel, color: backendColor },
            { label: 'Host', value: db.host || 'Not set', color: '#3b82f6' },
            { label: 'Port', value: String(db.port || 5432), color: '#6366f1' },
            { label: 'Database', value: db.dbName || 'publon_db', color: '#8b5cf6' },
            { label: 'Schema', value: db.schemaVersion || 'N/A', color: '#06b6d4' },
            { label: 'API URL', value: db.apiUrl || 'Not set', color: '#0891b2' }
        ];

        for (const card of dbCards) {
            const el = document.createElement('div');
            el.className = 'si-kpi-card';
            el.innerHTML = `
                <div class="si-kpi-label">${card.label}</div>
                <div class="si-kpi-value" style="color:${card.color};">${card.value}</div>
            `;
            dbGrid.appendChild(el);
        }

        // Notes
        if (db.notes) {
            const notesEl = document.createElement('div');
            notesEl.className = 'ip-db-note';
            notesEl.textContent = db.notes;
            dbSection.appendChild(notesEl);
        }

        // ── Health Check Button ──
        const healthRow = document.createElement('div');
        healthRow.className = 'ip-health-row';
        dbSection.appendChild(healthRow);

        const healthBtn = document.createElement('button');
        healthBtn.className = 'ip-health-btn';
        healthBtn.innerHTML = '<i class="fa-solid fa-heartbeat" style="margin-right:0.25rem;"></i>Check DB Health';
        healthRow.appendChild(healthBtn);

        const healthResult = document.createElement('span');
        healthResult.className = 'ip-health-result';
        healthRow.appendChild(healthResult);

        healthBtn.addEventListener('click', async () => {
            healthResult.textContent = 'Checking...';
            healthResult.style.color = '#f59e0b';
            const isPhp = db.backend === 'php';
            const baseUrl = db.localApiUrl || db.apiUrl || 'http://localhost:8082/api/v1';
            // PHP: POST directly to the .php URL; Rust: append /query
            const fetchUrl = baseUrl.endsWith('.php') ? baseUrl : `${baseUrl}/query`;
            // PHP supports 'health' action; Rust uses a read probe
            const healthBody = baseUrl.endsWith('.php')
                ? { action: 'health' }
                : { action: 'read', tableName: 'as_member', limit: 1, where: { idx: -1 } };
            try {
                const start = Date.now();
                const res = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(healthBody)
                });
                const data = await res.json();
                const ms = Date.now() - start;
                if (data.status === 'ok') {
                    const extra = data.tables ? ` — ${data.tables} tables` : '';
                    healthResult.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#10b981;"></i> Healthy (${ms}ms${extra})`;
                    healthResult.style.color = '#10b981';
                    this._checkTables(baseUrl);
                } else {
                    healthResult.innerHTML = `<i class="fa-solid fa-times-circle" style="color:#ef4444;"></i> Error: ${data.msg || 'unknown'}`;
                    healthResult.style.color = '#ef4444';
                }
            } catch (e) {
                healthResult.innerHTML = `<i class="fa-solid fa-times-circle" style="color:#ef4444;"></i> Unreachable: ${e.message}`;
                healthResult.style.color = '#ef4444';
            }
        });

        // ── Required Tables Section ──
        const tablesSection = document.createElement('div');
        tablesSection.innerHTML = `<div class="si-section-title"><i class="fa-solid fa-table" style="margin-right:0.3rem;"></i>Required Tables</div>`;
        this._configDisplay.appendChild(tablesSection);

        this._tableListEl = document.createElement('div');
        this._tableListEl.className = 'ip-table-list';
        tablesSection.appendChild(this._tableListEl);

        this._renderTableChecklist();

        // ── Other Services Section ──
        const servicesSection = document.createElement('div');
        const oracle = creds.oracle || {};
        const ldap = creds.ldap || {};
        const smtp = creds.smtp || {};
        const nodeProxy = creds.nodeProxy || {};

        const hasServices = oracle.user || ldap.host || smtp.host || nodeProxy.port;
        if (hasServices) {
            servicesSection.innerHTML = `<div class="si-section-title" style="margin-top:0.5rem;"><i class="fa-solid fa-plug" style="margin-right:0.3rem;"></i>Other Services</div>`;
            this._configDisplay.appendChild(servicesSection);

            const svcGrid = document.createElement('div');
            svcGrid.className = 'ip-svc-list';
            servicesSection.appendChild(svcGrid);

            const services = [
                { label: 'Oracle ITS', icon: 'fa-database', detail: oracle.connectString || '—', status: oracle.user ? 'Configured' : 'Not set', color: oracle.user ? '#10b981' : '#6b7280' },
                { label: 'LDAP', icon: 'fa-id-card', detail: ldap.host || '—', status: ldap.serviceAccount?.status || (ldap.host ? 'Configured' : 'Not set'), color: ldap.serviceAccount?.status === 'EXPIRED' ? '#ef4444' : ldap.host ? '#10b981' : '#6b7280' },
                { label: 'SMTP', icon: 'fa-envelope', detail: smtp.host || '—', status: smtp.status || (smtp.host ? 'Configured' : 'Not set'), color: smtp.status === 'WORKING' ? '#10b981' : smtp.host ? '#f59e0b' : '#6b7280' },
                { label: 'Node Proxy', icon: 'fa-code', detail: nodeProxy.entryPoint || '—', status: nodeProxy.status || (nodeProxy.port ? 'Configured' : 'Not set'), color: nodeProxy.status === 'RUNNING' ? '#10b981' : nodeProxy.port ? '#f59e0b' : '#6b7280' }
            ];

            for (const svc of services) {
                const row = document.createElement('div');
                row.className = 'ip-svc-row';
                row.innerHTML = `
                    <i class="fa-solid ${svc.icon}" style="font-size:0.65rem; color:var(--ui-gray-500); width:1rem; text-align:center;"></i>
                    <div class="as-flex-1 as-min-w-0">
                        <div class="ip-svc-label">${svc.label}</div>
                        <div class="ip-svc-detail as-truncate">${svc.detail}</div>
                    </div>
                    <span class="as-status-pill" style="color:${svc.color}; background:${svc.color}15; border-color:${svc.color}40;">
                        <i class="fa-solid fa-circle" style="font-size:0.3rem;"></i> ${svc.status}
                    </span>
                `;
                svcGrid.appendChild(row);
            }
        }
    }

    _renderTableChecklist() {
        if (!this._tableListEl || !this._infraRegistry) return;
        this._tableListEl.innerHTML = '';

        const services = this._infraRegistry.services || {};
        for (const [svcKey, svc] of Object.entries(services)) {
            const tables = svc.tables || {};
            const tableCount = Object.keys(tables).length;
            if (tableCount === 0) continue;

            // Service group header
            const groupEl = document.createElement('div');
            groupEl.className = 'ip-table-group';

            const headerEl = document.createElement('div');
            headerEl.className = 'ip-table-group-header';
            headerEl.innerHTML = `
                <span class="ip-table-group-label">${svc.label}</span>
                <span class="ip-table-group-count">(${tableCount} table${tableCount > 1 ? 's' : ''})</span>
                ${svc.required ? '<span class="ip-table-group-required">REQUIRED</span>' : ''}
            `;
            groupEl.appendChild(headerEl);

            for (const [tableName, tableInfo] of Object.entries(tables)) {
                const row = document.createElement('div');
                row.className = 'as-table-check-row ip-table-row';
                row.dataset.table = tableName;
                row.innerHTML = `
                    <i class="fa-solid fa-circle" style="font-size:0.35rem; color:var(--ui-gray-300);"></i>
                    <span class="ip-table-name">${tableName}</span>
                    <span class="ip-table-desc as-truncate">${tableInfo.description}</span>
                    <span class="as-table-status" style="font-size:0.55rem; color:var(--ui-gray-400);">—</span>
                `;
                groupEl.appendChild(row);
            }

            this._tableListEl.appendChild(groupEl);
        }
    }

    async _checkTables(baseUrl) {
        if (!this._tableListEl || !this._infraRegistry) return;

        // PHP: POST directly to .php URL; Rust: append /query
        const fetchUrl = baseUrl.endsWith('.php') ? baseUrl : `${baseUrl}/query`;

        const services = this._infraRegistry.services || {};
        for (const svc of Object.values(services)) {
            for (const tableName of Object.keys(svc.tables || {})) {
                const row = this._tableListEl.querySelector(`[data-table="${tableName}"]`);
                if (!row) continue;

                const statusEl = row.querySelector('.as-table-status');
                const dotEl = row.querySelector('.fa-circle');

                try {
                    const res = await fetch(fetchUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'read', tableName, limit: 1, where: {} })
                    });
                    const data = await res.json();
                    if (data.status === 'ok') {
                        const count = data.results?.length || 0;
                        dotEl.style.color = '#10b981';
                        statusEl.textContent = count > 0 ? `${count}+ rows` : 'empty';
                        statusEl.style.color = '#10b981';
                    } else {
                        dotEl.style.color = '#ef4444';
                        statusEl.textContent = 'missing';
                        statusEl.style.color = '#ef4444';
                    }
                } catch (e) {
                    dotEl.style.color = '#ef4444';
                    statusEl.textContent = 'error';
                    statusEl.style.color = '#ef4444';
                }
            }
        }
    }

    _showConfigEditor() {
        const inst = this._institutions[this._active];
        const cfg = inst?.config || {};
        this._configDisplay.innerHTML = '';

        const editorSection = document.createElement('div');
        editorSection.className = 'ip-editor-wrap';

        editorSection.innerHTML = `
            <div class="si-section-title" style="display:flex; align-items:center; justify-content:space-between;">
                <span>Edit Configuration — ${this._active.toUpperCase()}</span>
            </div>
        `;

        const textarea = document.createElement('textarea');
        textarea.className = 'ip-editor-textarea';
        textarea.value = JSON.stringify(cfg, null, 2);
        editorSection.appendChild(textarea);

        const btnRow = document.createElement('div');
        btnRow.className = 'ip-btn-row';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'ip-btn-cancel';
        cancelBtn.addEventListener('click', () => this._showConfigViewer());

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save Config';
        saveBtn.className = 'ip-btn-save';
        saveBtn.addEventListener('click', async () => {
            try {
                const parsed = JSON.parse(textarea.value);
                const res = await fetch(`/api/config/${this._active}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed)
                });
                const result = await res.json();
                if (result.status) {
                    this._institutions[this._active].config = parsed;
                    this._renderCards();
                    this._showConfigViewer();
                } else {
                    alert('Save failed: ' + (result.error || 'Unknown error'));
                }
            } catch (e) {
                alert('Invalid JSON: ' + e.message);
            }
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(saveBtn);
        editorSection.appendChild(btnRow);

        this._configDisplay.appendChild(editorSection);
    }

    // ── Document & Stats Helpers ────────────────────────────────────────────

    /** Icon/color lookup by keyword in note key or value */
    _noteStyle(key) {
        const map = [
            [/demo|strategy/i,    'fa-bullseye',    '#3b82f6'],
            [/itAction|todo/i,    'fa-list-check',  '#f59e0b'],
            [/ssh|key/i,          'fa-key',         '#10b981'],
            [/instApi|framework/i,'fa-cubes',        '#8b5cf6'],
            [/data|sms|web/i,     'fa-database',    '#06b6d4'],
            [/proxy|plan/i,       'fa-route',       '#6366f1'],
            [/legacy/i,           'fa-clock-rotate-left', '#9ca3af']
        ];
        for (const [re, icon, color] of map) {
            if (re.test(key)) return { icon, color };
        }
        return { icon: 'fa-note-sticky', color: '#6b7280' };
    }

    /**
     * Build document/note entries from config.notes + config.files.
     * Generic — iterates all notes keys, auto-detects icon by keyword.
     */
    _buildDocEntries(notes, files) {
        const entries = [];
        const base = files.basePath || '';
        for (const [key, description] of Object.entries(notes)) {
            const style = this._noteStyle(key);
            // Try to find a matching file reference
            const fileKey = Object.keys(files).find(fk =>
                fk !== 'basePath' && fk.toLowerCase().includes(key.substring(0, 4).toLowerCase())
            );
            const file = fileKey ? files[fileKey] : null;
            const path = file ? (file.startsWith('/') || file.startsWith('~') ? file : base + file) : null;
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
            entries.push({ label, description, file: file || '', path: path || '', ...style });
        }
        return entries;
    }

    /**
     * Build a high-level data summary. Uses cfg.dataStats (structured) if available,
     * otherwise parses record counts from dataSources descriptions.
     */
    _getDataStatsMarkup(cfg) {
        const issues = cfg.knownIssues || [];
        const parts = [];

        // Prefer structured dataStats (UKZN style)
        const stats = cfg.dataStats;
        if (stats) {
            if (stats.marks) parts.push(`${this._fmtNum(stats.marks)} marks`);
            if (stats.distinctStudents) parts.push(`${this._fmtNum(stats.distinctStudents)} students`);
            else if (stats.students) parts.push(`${this._fmtNum(stats.students)} student records`);
            if (stats.courses) parts.push(`${this._fmtNum(stats.courses)} courses`);
            if (stats.departments) parts.push(`${stats.departments} departments`);
            if (stats.yearRange) parts.push(`years ${stats.yearRange}`);
            if (stats.databases) parts.push(`databases: ${stats.databases.join(', ')}`);
        }

        // Fall back to parsing dataSource descriptions (CPUT style)
        if (parts.length === 0) {
            const ds = cfg.dataSources || {};
            for (const [key, val] of Object.entries(ds)) {
                if (key === 'NOTE') continue;
                const match = val.description?.match(/([\d.,]+[KMBkmb]?)\s*records/i);
                if (match) parts.push(`${match[1]} ${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`);
            }
        }

        if (parts.length === 0) return null;

        // API endpoint line
        const api = cfg.api || {};
        let html = '';
        if (api.endpoint) {
            html += `<strong>API</strong>: <code style="font-size:0.6rem; background:#e2e8f0; padding:0.1rem 0.3rem; border-radius:3px;">${api.endpoint}</code> (${api.dataSource || api.backend || '?'})<br>`;
        }
        html += `<strong>Data</strong>: ${parts.join(' &bull; ')}`;

        const blockedIssues = issues.filter(i => i.status === 'blocked' || i.status === 'external').length;
        const todoIssues = issues.filter(i => i.status === 'todo').length;
        if (blockedIssues > 0 || todoIssues > 0) {
            const bits = [];
            if (blockedIssues) bits.push(`${blockedIssues} blocked`);
            if (todoIssues) bits.push(`${todoIssues} todo`);
            html += `<br><strong>Issues</strong>: ${bits.join(', ')}`;
        }

        return html;
    }

    _fmtNum(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
        return String(n);
    }

    // ── Institution Switching ─────────────────────────────────────────────────

    async _switchInstitution(code) {
        if (code === this._active) return;

        try {
            const res = await fetch('/api/set-institution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ institution: code })
            });
            const data = await res.json();
            if (data.status) {
                this._active = code;

                // Update globals
                window.AS_INSTITUTION = data.config;
                window.AS_CREDENTIALS = data.credentials;

                // Re-render
                this._renderCards();
                this._renderStageContent();

                // Re-login with new credentials
                await this._reLogin();

                // Dispatch event for other panels
                window.dispatchEvent(new CustomEvent('institution-changed', {
                    detail: { code, config: data.config, credentials: data.credentials }
                }));

                if (typeof log === 'function') {
                    log('institution', `Switched to ${code.toUpperCase()}`);
                }
            }
        } catch (e) {
            console.error('Failed to switch institution:', e);
            if (typeof log === 'function') {
                log('institution', `Switch failed: ${e.message}`, true);
            }
        }
    }

    async _reLogin() {
        const creds = window.AS_CREDENTIALS?.api?.sessionBypass || {};
        if (!creds.userId) {
            window.AS_SESSION = { sessionId: null, logToken: null, ready: false, error: 'No credentials configured' };
            if (typeof log === 'function') log('auth', 'No credentials for this institution', true);
            return;
        }
        try {
            const res = await fetch('/api-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logIn', userId: creds.userId, pwd: creds.password })
            });
            const data = await res.json();
            if (data && data.status !== false && (data.sessionId || data.session_id)) {
                window.AS_SESSION = {
                    sessionId: data.sessionId || data.session_id,
                    logToken: data.logToken || data.log_token,
                    ready: true,
                    error: null
                };
                if (typeof log === 'function') log('auth', `Re-login successful (${creds.userId})`);
            } else {
                window.AS_SESSION = { sessionId: null, logToken: null, ready: false, error: data?.error || 'Login failed' };
                if (typeof log === 'function') log('auth', `Re-login failed: ${window.AS_SESSION.error}`, true);
            }
        } catch (e) {
            window.AS_SESSION = { sessionId: null, logToken: null, ready: false, error: e.message };
            if (typeof log === 'function') log('auth', `Re-login error: ${e.message}`, true);
        }
    }
}
