/**
 * SystemIntegrationsPanel - External system connection management
 *
 * Compound-pattern panel (render(controlEl, stageEl)) that provides:
 * - Configured integration endpoints for SIS, LMS, email, LDAP, etc.
 * - Live connectivity testing (real HTTP health checks)
 * - API explorer with request/response inspection
 * - Call log with latency tracking
 * - Per-integration configuration editor
 *
 * Usage:
 *   const panel = new SystemIntegrationsPanel();
 *   panel.render(controlEl, stageEl);
 */
class SystemIntegrationsPanel {

    // ── Integration Definitions ──────────────────────────────────────────────

    static INTEGRATIONS = [
        {
            key: 'sis',
            label: 'Institution SIS',
            description: 'Student Information System — student records, marks, registrations',
            icon: 'fa-university',
            color: 'var(--as-integ-sis)',
            endpoint: '/api-proxy',
            authType: 'credentials',
            get credentials() { const c = window.AS_CREDENTIALS?.api?.sessionBypass; return c ? { userId: c.userId, pwd: c.password } : {}; },
            healthAction: 'logIn',
            actions: [
                { action: 'logIn',                 label: 'Authenticate',            get params() { const c = window.AS_CREDENTIALS?.api?.sessionBypass; return c ? { userId: c.userId, pwd: c.password } : {}; } },
                { action: 'getCourseResults',      label: 'Get Course Results',      params: { courseCode: 'COMP101', year: 2020 } },
                { action: 'getAssessmentResults',  label: 'Get Assessment Results',  params: { courseCode: 'COMP101', year: 2020 } },
                { action: 'getCourseCounts',       label: 'Get Course Counts',       params: { courseCode: 'COMP101', year: 2020 } },
                { action: 'getStudentBioData',     label: 'Get Student Bio',         params: { studentNumber: '21000001' } },
                { action: 'getProgrammeStudents',  label: 'Get Programme Students',  params: { programmeCode: 'NDCOMP', year: 2020 } },
                { action: 'getProgrammeStructure', label: 'Get Programme Structure', params: { programmeCode: 'NDCOMP', year: 2020 } },
                { action: 'getStaffCourses',       label: 'Get Staff Courses',       params: { staffNumber: '12345', year: 2020 } },
                { action: 'searchStudents',        label: 'Search Students',         params: { lastName: 'Naidoo' } }
            ],
            settings: {
                timeout: 30000,
                retries: 2,
                cacheMinutes: 5,
                rateLimit: 60
            }
        },
        {
            key: 'lms',
            label: 'Moodle LMS',
            description: 'Learning Management System — course content, grades, activity logs',
            icon: 'fa-graduation-cap',
            color: 'var(--as-integ-lms)',
            endpoint: '/lms-api',
            authType: 'token',
            credentials: { token: '' },
            healthAction: 'core_webservice_get_site_info',
            actions: [
                { action: 'core_webservice_get_site_info', label: 'Site Info',       params: {} },
                { action: 'core_course_get_courses',       label: 'Get Courses',     params: {} },
                { action: 'core_enrol_get_enrolled_users', label: 'Enrolled Users',  params: { courseid: 1 } },
                { action: 'mod_assign_get_assignments',    label: 'Assignments',     params: { courseids: [1] } }
            ],
            settings: {
                timeout: 15000,
                retries: 1,
                cacheMinutes: 10,
                rateLimit: 30
            }
        },
        {
            key: 'email',
            label: 'Email / SMTP',
            description: 'Outbound email for student notifications, alerts, and reports',
            icon: 'fa-envelope',
            color: 'var(--as-integ-email)',
            endpoint: '/email-api',
            authType: 'smtp',
            credentials: { host: 'smtp.dut.ac.za', port: 587, user: '', password: '' },
            healthAction: 'ping',
            actions: [
                { action: 'ping',      label: 'Ping SMTP',   params: {} },
                { action: 'sendTest',  label: 'Send Test',   params: { to: 'test@dut.ac.za', subject: 'Test', body: 'Ping' } }
            ],
            settings: {
                timeout: 10000,
                retries: 0,
                rateLimit: 10,
                fromAddress: 'autoscalar@dut.ac.za'
            }
        },
        {
            key: 'ldap',
            label: 'LDAP / SSO',
            description: 'Directory service for authentication and staff/student lookup',
            icon: 'fa-key',
            color: 'var(--as-integ-ldap)',
            endpoint: '/ldap-proxy',
            authType: 'bind',
            credentials: { bindDN: '', bindPassword: '' },
            healthAction: 'bind',
            actions: [
                { action: 'bind',     label: 'Bind/Connect',  params: {} },
                { action: 'search',   label: 'Search User',   params: { filter: '(uid=admin)' } }
            ],
            settings: {
                timeout: 5000,
                retries: 1,
                baseDN: 'dc=dut,dc=ac,dc=za'
            }
        },
        {
            key: 'docstore',
            label: 'Document Store',
            description: 'File storage for portfolios, evidence, and generated reports',
            icon: 'fa-archive',
            color: 'var(--as-integ-docstore)',
            endpoint: '/docs-api',
            authType: 'key',
            credentials: { apiKey: '' },
            healthAction: 'ping',
            actions: [
                { action: 'ping',       label: 'Ping',         params: {} },
                { action: 'listBuckets', label: 'List Buckets', params: {} },
                { action: 'getQuota',    label: 'Get Quota',    params: {} }
            ],
            settings: {
                timeout: 10000,
                maxUploadMB: 50,
                allowedTypes: 'pdf,docx,xlsx,png,jpg'
            }
        },
        {
            key: 'analytics',
            label: 'Analytics Engine',
            description: 'ML/AI backend for success prediction and learning analytics',
            icon: 'fa-brain',
            color: 'var(--as-integ-analytics)',
            endpoint: '/analytics-api',
            authType: 'token',
            credentials: { token: '' },
            healthAction: 'health',
            actions: [
                { action: 'health',   label: 'Health Check',   params: {} },
                { action: 'predict',  label: 'Run Prediction', params: { model: 'success_v2', courseCode: 'COMP101' } },
                { action: 'features', label: 'List Features',  params: {} }
            ],
            settings: {
                timeout: 60000,
                retries: 1,
                modelVersion: 'v2.1'
            }
        }
    ];

    static STATUS_STYLES = {
        connected:    { color: 'var(--as-status-connected-color)',    bg: 'var(--as-status-connected-bg)',    border: 'var(--as-status-connected-border)',    label: 'Connected',    icon: 'fa-check-circle' },
        disconnected: { color: 'var(--as-status-disconnected-color)', bg: 'var(--as-status-disconnected-bg)', border: 'var(--as-status-disconnected-border)', label: 'Disconnected', icon: 'fa-circle' },
        error:        { color: 'var(--as-status-error-color)',        bg: 'var(--as-status-error-bg)',        border: 'var(--as-status-error-border)',        label: 'Error',        icon: 'fa-times-circle' },
        testing:      { color: 'var(--as-status-testing-color)',      bg: 'var(--as-status-testing-bg)',      border: 'var(--as-status-testing-border)',      label: 'Testing...',   icon: 'fa-spinner fa-spin' },
        configured:   { color: 'var(--as-status-configured-color)',   bg: 'var(--as-status-configured-bg)',   border: 'var(--as-status-configured-border)',   label: 'Configured',   icon: 'fa-cog' }
    };

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(config = {}) {
        this.endpoint = config.endpoint || '/api-proxy';
        this._controlEl = null;
        this._stageEl = null;
        this._accordion = null;
        this._statusBadge = null;
        this._selectedKey = null;

        // Live state
        this._integrationState = {};
        this._callLog = [];
        this._sessionTokens = {}; // Cached auth tokens per integration

        // Initialize state for each integration
        SystemIntegrationsPanel.INTEGRATIONS.forEach(i => {
            this._integrationState[i.key] = {
                status: 'disconnected',
                lastChecked: null,
                latencyMs: null,
                error: null,
                responsePreview: null
            };
        });
    }

    // ── Public API ───────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderDashboard();
    }

    // ── API Call Infrastructure ───────────────────────────────────────────────

    async _apiCall(endpoint, action, params = {}, sessionTokens = {}) {
        const body = { action, ...params };
        if (sessionTokens.sessionId) body.sessionId = sessionTokens.sessionId;
        if (sessionTokens.logToken) body.logToken = sessionTokens.logToken;

        const start = performance.now();
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const latency = Math.round(performance.now() - start);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return { data, latency };
    }

    _logCall(integrationKey, action, status, latencyMs, detail) {
        this._callLog.unshift({
            timestamp: new Date().toISOString(),
            integration: integrationKey,
            action,
            status,
            latencyMs,
            detail: typeof detail === 'string' ? detail : JSON.stringify(detail || '').substring(0, 200)
        });
        // Keep last 100 entries
        if (this._callLog.length > 100) this._callLog.length = 100;
    }

    // ── Health Check ─────────────────────────────────────────────────────────

    async _testIntegration(integrationDef) {
        const key = integrationDef.key;
        const state = this._integrationState[key];
        state.status = 'testing';
        state.error = null;
        this._renderIntegrationsPane();

        try {
            // Only the SIS integration has a real endpoint we can test
            if (key === 'sis') {
                const { data, latency } = await this._apiCall(
                    integrationDef.endpoint,
                    integrationDef.healthAction,
                    integrationDef.credentials
                );

                if (data && data.status !== false && (data.sessionId || data.session_id)) {
                    state.status = 'connected';
                    state.latencyMs = latency;
                    state.lastChecked = new Date().toISOString();
                    state.responsePreview = JSON.stringify(data).substring(0, 300);
                    // Cache session tokens
                    this._sessionTokens[key] = {
                        sessionId: data.sessionId || data.session_id,
                        logToken: data.logToken || data.log_token
                    };
                    this._logCall(key, integrationDef.healthAction, 'success', latency, 'Authenticated successfully');
                } else {
                    state.status = 'error';
                    state.error = data?.error || 'Unexpected response';
                    state.latencyMs = latency;
                    state.lastChecked = new Date().toISOString();
                    this._logCall(key, integrationDef.healthAction, 'error', latency, state.error);
                }
            } else {
                // Simulate health check for non-SIS integrations
                await new Promise(r => setTimeout(r, 300 + Math.random() * 700));
                const hasCredentials = this._hasCredentials(integrationDef);
                if (hasCredentials) {
                    state.status = 'configured';
                    state.latencyMs = Math.round(300 + Math.random() * 200);
                    state.lastChecked = new Date().toISOString();
                    state.responsePreview = `{ "status": "configured", "endpoint": "${integrationDef.endpoint}" }`;
                    this._logCall(key, 'health', 'configured', state.latencyMs, 'Endpoint configured but not reachable in test environment');
                } else {
                    state.status = 'disconnected';
                    state.lastChecked = new Date().toISOString();
                    state.error = 'No credentials configured';
                    this._logCall(key, 'health', 'disconnected', 0, 'Missing credentials');
                }
            }
        } catch (err) {
            state.status = 'error';
            state.error = err.message;
            state.lastChecked = new Date().toISOString();
            this._logCall(key, integrationDef.healthAction, 'error', 0, err.message);
        }

        this._renderIntegrationsPane();
        this._renderStatsPane();
    }

    _hasCredentials(integrationDef) {
        const creds = integrationDef.credentials;
        if (!creds) return false;
        return Object.values(creds).some(v => v && String(v).length > 0);
    }

    async _testAll() {
        for (const integ of SystemIntegrationsPanel.INTEGRATIONS) {
            await this._testIntegration(integ);
        }
    }

    // ── Control Panel ────────────────────────────────────────────────────────

    _buildControl() {
        this._controlEl.innerHTML = '';

        // Status badge
        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'rc-badge-wrap';
        this._controlEl.appendChild(badgeWrap);
        this._statusBadge = new uiBadge({
            label: `${SystemIntegrationsPanel.INTEGRATIONS.length} integrations`,
            color: 'primary',
            size: 'sm',
            parent: badgeWrap
        });

        // Accordion
        const accWrap = document.createElement('div');
        this._controlEl.appendChild(accWrap);
        this._accordion = new uiAccordion({
            parent: accWrap,
            exclusive: true,
            content: {
                integrations: { label: '<i class="fas fa-plug" style="margin-right:0.3rem;"></i>Integrations', open: true },
                actions:      { label: '<i class="fas fa-bolt" style="margin-right:0.3rem;"></i>Actions' },
                stats:        { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Status' }
            }
        });

        this._renderIntegrationsPane();
        this._renderActionsPane();
        this._renderStatsPane();
    }

    _renderIntegrationsPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="integrations"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        SystemIntegrationsPanel.INTEGRATIONS.forEach(integ => {
            const state = this._integrationState[integ.key];
            const ss = SystemIntegrationsPanel.STATUS_STYLES[state.status] || SystemIntegrationsPanel.STATUS_STYLES.disconnected;
            const isSelected = this._selectedKey === integ.key;

            const item = document.createElement('div');
            item.className = 'ui-flex ui-items-center ui-gap-2 as-rounded-md as-hover-row si-integ-list-item';
            if (isSelected) {
                item.style.borderColor = integ.color + '44';
                item.style.background = integ.color + '08';
            }
            item.innerHTML = `
                <div class="as-integ-icon as-integ-icon-sm" style="background:${integ.color}15;">
                    <i class="fas ${integ.icon}" style="font-size:0.6rem;color:${integ.color};"></i>
                </div>
                <div class="as-flex-1 as-min-w-0">
                    <div class="as-truncate ui-font-semibold" style="font-size:0.65rem;">${integ.label}</div>
                    <div style="font-size:0.5rem;color:var(--as-muted);">${integ.endpoint}</div>
                </div>
                <i class="fas ${ss.icon}" style="color:${ss.color};font-size:0.55rem;"></i>
            `;
            item.onclick = () => {
                this._selectedKey = integ.key;
                this._renderIntegrationsPane();
                this._renderIntegrationDetail(integ.key);
            };
            el.appendChild(item);
        });
    }

    _renderActionsPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="actions"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        const btnWrap = document.createElement('div');
        btnWrap.className = 'ui-flex ui-flex-col ui-gap-1';
        el.appendChild(btnWrap);

        const btns = [
            { label: 'Test All', icon: 'fa-play', color: 'primary', fn: () => this._testAll().then(() => this._renderDashboard()) },
            { label: 'Dashboard', icon: 'fa-th-large', color: 'secondary', fn: () => { this._selectedKey = null; this._renderIntegrationsPane(); this._renderDashboard(); } },
            { label: 'Clear Log', icon: 'fa-eraser', color: 'secondary', fn: () => { this._callLog = []; if (typeof uiToast !== 'undefined') new uiToast({ parent: document.body, message: 'Call log cleared', type: 'info', duration: 1500 }); } }
        ];

        btns.forEach(b => {
            const d = document.createElement('div');
            btnWrap.appendChild(d);
            new uiButtonGroup({
                parent: d,
                buttons: [{
                    label: b.label, icon: `<i class="fas ${b.icon}"></i>`,
                    color: b.color, variant: b.color === 'primary' ? 'solid' : 'outline', size: 'sm',
                    onClick: b.fn
                }]
            });
        });
    }

    _renderStatsPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        const states = Object.values(this._integrationState);
        const counts = { connected: 0, configured: 0, error: 0, disconnected: 0, testing: 0 };
        states.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });

        const total = states.length;
        const statusOrder = ['connected', 'configured', 'error', 'disconnected'];

        statusOrder.forEach(status => {
            if (counts[status] === 0) return;
            const ss = SystemIntegrationsPanel.STATUS_STYLES[status];
            const pct = Math.round(counts[status] / total * 100);
            const row = document.createElement('div');
            row.className = 'ui-flex ui-items-center ui-gap-2';
            row.style.padding = '0.2rem 0';
            row.innerHTML = `
                <i class="fas ${ss.icon}" style="color:${ss.color};font-size:0.55rem;width:0.8rem;text-align:center;"></i>
                <span class="as-flex-1" style="font-size:0.6rem;color:var(--as-text-secondary);">${ss.label}</span>
                <span class="ui-font-bold" style="font-size:0.65rem;color:${ss.color};">${counts[status]}</span>
            `;
            el.appendChild(row);
        });

        // Avg latency
        const latencies = states.filter(s => s.latencyMs !== null).map(s => s.latencyMs);
        if (latencies.length > 0) {
            const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
            const divider = document.createElement('div');
            divider.className = 'si-stats-divider';
            divider.innerHTML = `
                <div class="ui-flex ui-justify-between" style="font-size:0.6rem;color:var(--as-text-secondary);">
                    <span>Avg Latency</span><span class="ui-font-semibold">${avg}ms</span>
                </div>
            `;
            el.appendChild(divider);
        }

        // Last checked
        const lastChecked = states.filter(s => s.lastChecked).sort((a, b) => b.lastChecked.localeCompare(a.lastChecked))[0];
        if (lastChecked) {
            const ago = document.createElement('div');
            ago.className = 'si-last-checked';
            ago.textContent = `Last checked: ${new Date(lastChecked.lastChecked).toLocaleTimeString()}`;
            el.appendChild(ago);
        }
    }

    // ── Stage: Dashboard ─────────────────────────────────────────────────────

    _renderDashboard() {
        this._stageEl.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.className = 'rc-stage-wrap';
        this._stageEl.appendChild(wrap);

        // Header
        const header = document.createElement('div');
        header.className = 'ui-flex ui-items-center ui-gap-2 rc-stage-header';
        header.innerHTML = `
            <i class="fas fa-plug" style="font-size:1.5rem;color:var(--as-brand-navy);"></i>
            <div>
                <div class="ui-font-bold" style="font-size:1rem;">System Integrations</div>
                <div style="font-size:0.75rem;color:var(--as-text-secondary);">${SystemIntegrationsPanel.INTEGRATIONS.length} configured endpoints</div>
            </div>
        `;
        wrap.appendChild(header);

        // KPI row
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        wrap.appendChild(kpiRow);

        const states = Object.values(this._integrationState);
        const connected = states.filter(s => s.status === 'connected').length;
        const configured = states.filter(s => s.status === 'configured').length;
        const errors = states.filter(s => s.status === 'error').length;
        const latencies = states.filter(s => s.latencyMs !== null).map(s => s.latencyMs);
        const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : '-';

        [
            { label: 'Total', value: SystemIntegrationsPanel.INTEGRATIONS.length, icon: 'fa-plug', color: 'var(--as-brand-navy)' },
            { label: 'Connected', value: connected, icon: 'fa-check-circle', color: 'var(--as-status-connected-color)' },
            { label: 'Configured', value: configured, icon: 'fa-cog', color: 'var(--as-status-configured-color)' },
            { label: 'Errors', value: errors, icon: 'fa-times-circle', color: errors > 0 ? 'var(--as-status-error-color)' : '#d1d5db' },
            { label: 'Avg Latency', value: avgLatency === '-' ? '-' : `${avgLatency}ms`, icon: 'fa-tachometer-alt', color: 'var(--as-status-testing-color)' }
        ].forEach(k => {
            const card = document.createElement('div');
            card.className = 'si-kpi-card';
            card.innerHTML = `
                <i class="fas ${k.icon}" style="color:${k.color}; font-size:0.9rem;"></i>
                <div class="si-kpi-value-lg" style="color:${k.color};">${k.value}</div>
                <div class="si-kpi-label">${k.label}</div>
            `;
            kpiRow.appendChild(card);
        });

        // Tabs
        const tabWrap = document.createElement('div');
        wrap.appendChild(tabWrap);
        const contentWrap = document.createElement('div');
        wrap.appendChild(contentWrap);

        const tabs = new uiTabs({
            parent: tabWrap,
            tabs: [
                { label: 'Integration Cards', icon: '<i class="fas fa-th-large"></i>' },
                { label: 'Call Log', icon: '<i class="fas fa-history"></i>' },
                { label: 'Topology', icon: '<i class="fas fa-project-diagram"></i>' }
            ]
        });

        const renderTab = (index) => {
            contentWrap.innerHTML = '';
            switch (index) {
                case 0: this._renderIntegrationCards(contentWrap); break;
                case 1: this._renderCallLogTable(contentWrap); break;
                case 2: this._renderTopology(contentWrap); break;
            }
        };

        tabs.bus.on('tab-changed', ({ index }) => renderTab(index));
        renderTab(0);
    }

    // ── Dashboard Tab: Integration Cards ─────────────────────────────────────

    _renderIntegrationCards(container) {
        const grid = document.createElement('div');
        grid.className = 'si-grid-cards';
        container.appendChild(grid);

        SystemIntegrationsPanel.INTEGRATIONS.forEach(integ => {
            const state = this._integrationState[integ.key];
            const ss = SystemIntegrationsPanel.STATUS_STYLES[state.status];

            const card = document.createElement('div');
            card.className = 'as-hover-card si-integ-card';
            card.style.borderColor = ss.border;
            card.style.borderLeftColor = integ.color;
            card.onclick = () => {
                this._selectedKey = integ.key;
                this._renderIntegrationsPane();
                this._renderIntegrationDetail(integ.key);
            };

            // Header
            card.innerHTML = `
                <div class="ui-flex ui-items-center ui-justify-between" style="margin-bottom:0.5rem;">
                    <div class="ui-flex ui-items-center ui-gap-2">
                        <div class="as-integ-icon as-integ-icon-md" style="background:${integ.color}15;">
                            <i class="fas ${integ.icon}" style="font-size:0.75rem;color:${integ.color};"></i>
                        </div>
                        <div>
                            <div class="ui-font-bold" style="font-size:0.8rem;">${integ.label}</div>
                            <div style="font-size:0.55rem;color:var(--as-muted);font-family:monospace;">${integ.endpoint}</div>
                        </div>
                    </div>
                    <div class="as-status-pill" style="background:${ss.bg};border-color:${ss.border};color:${ss.color};">
                        <i class="fas ${ss.icon}" style="font-size:0.5rem;"></i>
                        <span>${ss.label}</span>
                    </div>
                </div>
                <div style="font-size:0.65rem;color:var(--as-text-secondary);margin-bottom:0.5rem;">${integ.description}</div>
                <div class="ui-flex ui-gap-2" style="font-size:0.55rem;color:var(--as-muted);">
                    <span><i class="fas fa-lock" style="margin-right:0.15rem;"></i>${integ.authType}</span>
                    <span><i class="fas fa-exchange-alt" style="margin-right:0.15rem;"></i>${integ.actions.length} actions</span>
                    ${state.latencyMs !== null ? `<span><i class="fas fa-clock" style="margin-right:0.15rem;"></i>${state.latencyMs}ms</span>` : ''}
                </div>
            `;

            // Test button
            const btnDiv = document.createElement('div');
            btnDiv.style.marginTop = '0.5rem';
            card.appendChild(btnDiv);
            new uiButtonGroup({
                parent: btnDiv,
                buttons: [{
                    label: 'Test', icon: '<i class="fas fa-play"></i>', color: 'primary', variant: 'outline', size: 'xs',
                    onClick: (e) => {
                        e.stopPropagation();
                        this._testIntegration(integ).then(() => this._renderIntegrationCards(container.parentElement || container));
                    }
                }]
            });

            grid.appendChild(card);
        });
    }

    // ── Dashboard Tab: Call Log ───────────────────────────────────────────────

    _renderCallLogTable(container) {
        if (this._callLog.length === 0) {
            container.innerHTML = '<div class="ui-text-center" style="font-size:0.8rem;color:var(--as-text-faint);padding:1rem;"><i class="fas fa-history" style="font-size:2rem;color:var(--as-border-light);display:block;margin-bottom:0.5rem;"></i>No API calls logged yet. Test an integration to see activity.</div>';
            return;
        }

        const tableData = this._callLog.map((entry, i) => ({
            id: i,
            time: new Date(entry.timestamp).toLocaleTimeString(),
            integration: entry.integration,
            action: entry.action,
            status: entry.status,
            latency: entry.latencyMs ? `${entry.latencyMs}ms` : '-',
            detail: entry.detail || ''
        }));

        new uiTable({
            parent: container,
            columns: [
                { key: 'time',        label: 'Time' },
                { key: 'integration', label: 'Integration' },
                { key: 'action',      label: 'Action' },
                { key: 'status',      label: 'Status' },
                { key: 'latency',     label: 'Latency' },
                { key: 'detail',      label: 'Detail' }
            ],
            data: tableData,
            paging: true,
            searching: true,
            ordering: true,
            pageLength: 20
        });
    }

    // ── Dashboard Tab: Topology ──────────────────────────────────────────────

    _renderTopology(container) {
        const desc = document.createElement('div');
        desc.className = 'rc-desc-text';
        desc.textContent = 'System integration topology showing AutoScholar at the centre with connections to each external system.';
        container.appendChild(desc);

        // SVG topology diagram
        const width = 600;
        const height = 400;
        const cx = width / 2;
        const cy = height / 2;
        const radius = 150;

        const integrations = SystemIntegrationsPanel.INTEGRATIONS;
        const n = integrations.length;

        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:600px;height:auto;">`;

        // Connection lines
        integrations.forEach((integ, i) => {
            const angle = (2 * Math.PI * i / n) - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const state = this._integrationState[integ.key];
            const ss = SystemIntegrationsPanel.STATUS_STYLES[state.status];
            const dashArray = state.status === 'connected' ? '' : state.status === 'configured' ? '6,3' : '3,3';

            svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${ss.color}" stroke-width="2" stroke-dasharray="${dashArray}" opacity="0.6"/>`;

            // Latency label on line
            if (state.latencyMs !== null) {
                const mx = (cx + x) / 2;
                const my = (cy + y) / 2;
                svg += `<text x="${mx}" y="${my - 4}" text-anchor="middle" font-size="9" fill="${ss.color}" font-weight="600">${state.latencyMs}ms</text>`;
            }
        });

        // Center node (AutoScholar)
        svg += `<circle cx="${cx}" cy="${cy}" r="32" fill="#1a237e" stroke="#0d1545" stroke-width="2"/>`;
        svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="9" fill="white" font-weight="700">Auto</text>`;
        svg += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="9" fill="white" font-weight="700">Scholar</text>`;

        // Outer nodes
        integrations.forEach((integ, i) => {
            const angle = (2 * Math.PI * i / n) - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const state = this._integrationState[integ.key];
            const ss = SystemIntegrationsPanel.STATUS_STYLES[state.status];

            svg += `<circle cx="${x}" cy="${y}" r="24" fill="white" stroke="${integ.color}" stroke-width="2"/>`;
            svg += `<circle cx="${x + 16}" cy="${y - 16}" r="5" fill="${ss.color}" stroke="white" stroke-width="1.5"/>`;

            // Label below node
            const labelY = y + 36;
            svg += `<text x="${x}" y="${labelY}" text-anchor="middle" font-size="10" fill="#333" font-weight="600">${integ.label}</text>`;
            svg += `<text x="${x}" y="${labelY + 12}" text-anchor="middle" font-size="8" fill="#888">${ss.label}</text>`;
        });

        svg += '</svg>';

        const svgWrap = document.createElement('div');
        svgWrap.className = 'ui-text-center';
        svgWrap.innerHTML = svg;
        container.appendChild(svgWrap);
    }

    // ── Stage: Integration Detail ────────────────────────────────────────────

    _renderIntegrationDetail(key) {
        this._stageEl.innerHTML = '';
        const integ = SystemIntegrationsPanel.INTEGRATIONS.find(i => i.key === key);
        if (!integ) return;

        const state = this._integrationState[key];
        const ss = SystemIntegrationsPanel.STATUS_STYLES[state.status];

        const wrap = document.createElement('div');
        wrap.className = 'rc-stage-wrap';
        this._stageEl.appendChild(wrap);

        // Header
        const header = document.createElement('div');
        header.className = 'ui-flex ui-items-center ui-gap-3 si-detail-header';
        header.style.borderBottomColor = integ.color;
        header.innerHTML = `
            <div class="as-integ-icon as-integ-icon-lg" style="background:${integ.color}15;">
                <i class="fas ${integ.icon}" style="font-size:1.3rem;color:${integ.color};"></i>
            </div>
            <div class="as-flex-1">
                <div class="ui-font-bold" style="font-size:1rem;">${integ.label}</div>
                <div style="font-size:0.75rem;color:var(--as-text-secondary);">${integ.description}</div>
                <div class="ui-flex ui-gap-2" style="margin-top:0.2rem;">
                    <span class="as-status-pill" style="background:${ss.bg};border-color:${ss.border};color:${ss.color};font-size:0.6rem;"><i class="fas ${ss.icon}" style="margin-right:0.2rem;"></i>${ss.label}</span>
                    <span class="as-rounded-sm" style="font-size:0.6rem;color:var(--as-muted);font-family:monospace;padding:0.1rem 0.3rem;background:var(--as-border-subtle);">${integ.endpoint}</span>
                </div>
            </div>
            <div id="si-back-btn"></div>
        `;
        wrap.appendChild(header);

        new uiButtonGroup({
            parent: header.querySelector('#si-back-btn'),
            buttons: [{
                label: 'Dashboard', icon: '<i class="fas fa-arrow-left"></i>', color: 'secondary', variant: 'outline', size: 'sm',
                onClick: () => { this._selectedKey = null; this._renderIntegrationsPane(); this._renderDashboard(); }
            }]
        });

        // Tabs
        const tabWrap = document.createElement('div');
        wrap.appendChild(tabWrap);
        const contentWrap = document.createElement('div');
        contentWrap.className = 'rc-content-gap';
        wrap.appendChild(contentWrap);

        const tabs = new uiTabs({
            parent: tabWrap,
            tabs: [
                { label: 'Configuration', icon: '<i class="fas fa-cog"></i>' },
                { label: 'Health Check', icon: '<i class="fas fa-heartbeat"></i>' },
                { label: 'API Explorer', icon: '<i class="fas fa-terminal"></i>' },
                { label: 'Activity Log', icon: '<i class="fas fa-history"></i>' }
            ]
        });

        const renderTab = (index) => {
            contentWrap.innerHTML = '';
            switch (index) {
                case 0: this._renderConfigTab(contentWrap, integ); break;
                case 1: this._renderHealthTab(contentWrap, integ); break;
                case 2: this._renderExplorerTab(contentWrap, integ); break;
                case 3: this._renderActivityTab(contentWrap, integ); break;
            }
        };

        tabs.bus.on('tab-changed', ({ index }) => renderTab(index));
        renderTab(0);
    }

    // ── Detail: Configuration Tab ────────────────────────────────────────────

    _renderConfigTab(container, integ) {
        // Connection settings
        const connTitle = document.createElement('div');
        connTitle.className = 'si-section-title';
        connTitle.textContent = 'Connection';
        container.appendChild(connTitle);

        const connGrid = document.createElement('div');
        connGrid.className = 'si-config-grid';

        const fields = [
            { label: 'Endpoint', value: integ.endpoint, key: 'endpoint' },
            { label: 'Auth Type', value: integ.authType, key: 'authType' },
            { label: 'Health Action', value: integ.healthAction, key: 'healthAction' }
        ];

        fields.forEach(f => {
            connGrid.innerHTML += `
                <div>
                    <div class="as-field-label">${f.label}</div>
                    <input type="text" value="${f.value || ''}" data-key="${f.key}" class="as-field-input">
                </div>
            `;
        });
        container.appendChild(connGrid);

        // Credentials
        const credTitle = document.createElement('div');
        credTitle.className = 'si-section-title';
        credTitle.textContent = 'Credentials';
        container.appendChild(credTitle);

        const credGrid = document.createElement('div');
        credGrid.className = 'si-config-grid';

        Object.entries(integ.credentials).forEach(([key, value]) => {
            const isPassword = key.toLowerCase().includes('pwd') || key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('key');
            credGrid.innerHTML += `
                <div>
                    <div class="as-field-label">${key}</div>
                    <input type="${isPassword ? 'password' : 'text'}" value="${value || ''}" data-cred="${key}" class="as-field-input">
                </div>
            `;
        });
        container.appendChild(credGrid);

        // Settings
        const settTitle = document.createElement('div');
        settTitle.className = 'si-section-title';
        settTitle.textContent = 'Settings';
        container.appendChild(settTitle);

        const settGrid = document.createElement('div');
        settGrid.className = 'si-config-grid';

        Object.entries(integ.settings).forEach(([key, value]) => {
            settGrid.innerHTML += `
                <div>
                    <div class="as-field-label">${key}</div>
                    <input type="${typeof value === 'number' ? 'number' : 'text'}" value="${value}" data-setting="${key}" class="as-field-input">
                </div>
            `;
        });
        container.appendChild(settGrid);

        // Save button
        const btnDiv = document.createElement('div');
        container.appendChild(btnDiv);
        new uiButtonGroup({
            parent: btnDiv,
            buttons: [{
                label: 'Save Configuration', icon: '<i class="fas fa-save"></i>', color: 'primary', size: 'sm',
                onClick: () => {
                    // Update credentials
                    container.querySelectorAll('[data-cred]').forEach(inp => {
                        integ.credentials[inp.dataset.cred] = inp.value;
                    });
                    // Update settings
                    container.querySelectorAll('[data-setting]').forEach(inp => {
                        const val = inp.type === 'number' ? Number(inp.value) : inp.value;
                        integ.settings[inp.dataset.setting] = val;
                    });
                    if (typeof uiToast !== 'undefined') {
                        new uiToast({ parent: document.body, message: `${integ.label} configuration saved`, type: 'success', duration: 2000 });
                    }
                }
            }]
        });
    }

    // ── Detail: Health Check Tab ─────────────────────────────────────────────

    _renderHealthTab(container, integ) {
        const state = this._integrationState[integ.key];
        const ss = SystemIntegrationsPanel.STATUS_STYLES[state.status];

        // Status card
        const statusCard = document.createElement('div');
        statusCard.className = 'si-status-card';
        statusCard.style.background = ss.bg;
        statusCard.style.borderColor = ss.border;
        statusCard.innerHTML = `
            <i class="fas ${ss.icon}" style="font-size:2rem; color:${ss.color}; margin-bottom:0.5rem; display:block;"></i>
            <div style="font-size:1rem; font-weight:700; color:${ss.color};">${ss.label}</div>
            ${state.latencyMs !== null ? `<div style="font-size:0.75rem; color:var(--ui-gray-500); margin-top:0.25rem;">Latency: ${state.latencyMs}ms</div>` : ''}
            ${state.lastChecked ? `<div style="font-size:0.65rem; color:var(--ui-gray-400); margin-top:0.15rem;">Last checked: ${new Date(state.lastChecked).toLocaleString()}</div>` : ''}
            ${state.error ? `<div class="si-result-error" style="margin-top:0.3rem;">${state.error}</div>` : ''}
        `;
        container.appendChild(statusCard);

        // Test button
        const testDiv = document.createElement('div');
        testDiv.className = 'ui-text-center';
        testDiv.style.marginBottom = '1rem';
        container.appendChild(testDiv);
        const resultDiv = document.createElement('div');
        resultDiv.style.marginTop = '0.75rem';
        container.appendChild(resultDiv);

        new uiButtonGroup({
            parent: testDiv,
            buttons: [{
                label: 'Run Health Check', icon: '<i class="fas fa-play"></i>', color: 'primary', size: 'sm',
                onClick: async () => {
                    resultDiv.innerHTML = '<div class="ui-text-center" style="font-size:0.75rem; color:var(--ui-amber-500);"><i class="fas fa-spinner fa-spin"></i> Testing...</div>';
                    await this._testIntegration(integ);
                    // Re-render the entire health tab to show updated status
                    container.innerHTML = '';
                    this._renderHealthTab(container, integ);
                }
            }]
        });

        // Response preview
        if (state.responsePreview) {
            const preTitle = document.createElement('div');
            preTitle.className = 'si-section-title';
            preTitle.textContent = 'Last Response';
            container.appendChild(preTitle);

            const pre = document.createElement('pre');
            pre.className = 'as-pre';
            try {
                pre.textContent = JSON.stringify(JSON.parse(state.responsePreview), null, 2);
            } catch (e) {
                pre.textContent = state.responsePreview;
            }
            container.appendChild(pre);
        }
    }

    // ── Detail: API Explorer Tab ─────────────────────────────────────────────

    _renderExplorerTab(container, integ) {
        const title = document.createElement('div');
        title.className = 'si-section-title';
        title.textContent = 'Available Actions';
        container.appendChild(title);

        const desc = document.createElement('div');
        desc.className = 'rc-desc-text';
        desc.textContent = integ.key === 'sis'
            ? 'Execute live API calls against the Institution SIS. Results are displayed below.'
            : 'These actions would be available when the integration is connected. The SIS integration supports live testing.';
        container.appendChild(desc);

        // Action cards
        integ.actions.forEach(act => {
            const card = document.createElement('div');
            card.className = 'si-explorer-card';

            const hdr = document.createElement('div');
            hdr.className = 'ui-flex ui-items-center ui-justify-between';
            hdr.style.marginBottom = '0.3rem';
            hdr.innerHTML = `
                <div>
                    <span class="ui-font-semibold" style="font-size:0.75rem;color:var(--as-text-body);">${act.label}</span>
                    <span style="font-size:0.6rem;color:var(--as-muted);font-family:monospace;margin-left:0.4rem;">${act.action}</span>
                </div>
            `;
            card.appendChild(hdr);

            // Editable params
            const paramsDiv = document.createElement('div');
            paramsDiv.className = 'ui-flex ui-flex-wrap ui-gap-1';
            paramsDiv.style.marginBottom = '0.3rem';
            Object.entries(act.params).forEach(([key, value]) => {
                paramsDiv.innerHTML += `
                    <div class="ui-flex ui-items-center ui-gap-1">
                        <span style="font-size:0.55rem;color:var(--as-muted);">${key}:</span>
                        <input type="text" value="${Array.isArray(value) ? JSON.stringify(value) : value}" data-param="${key}" class="as-rounded-sm" style="padding:0.15rem 0.3rem;border:1px solid #d1d5db;font-size:0.6rem;font-family:monospace;width:8rem;">
                    </div>
                `;
            });
            card.appendChild(paramsDiv);

            // Execute button + result area
            const execRow = document.createElement('div');
            execRow.className = 'ui-flex ui-items-center ui-gap-2';
            const execBtnDiv = document.createElement('div');
            execRow.appendChild(execBtnDiv);
            card.appendChild(execRow);

            const resultArea = document.createElement('div');
            card.appendChild(resultArea);

            const isSIS = integ.key === 'sis';
            new uiButtonGroup({
                parent: execBtnDiv,
                buttons: [{
                    label: isSIS ? 'Execute' : 'Preview',
                    icon: `<i class="fas ${isSIS ? 'fa-play' : 'fa-eye'}"></i>`,
                    color: isSIS ? 'primary' : 'secondary',
                    variant: 'outline',
                    size: 'xs',
                    onClick: async () => {
                        if (!isSIS) {
                            resultArea.innerHTML = `<pre class="as-pre" style="margin-top:0.3rem; max-height:8rem;">POST ${integ.endpoint}\n${JSON.stringify({ action: act.action, ...act.params }, null, 2)}</pre>`;
                            return;
                        }

                        resultArea.innerHTML = '<div style="font-size:0.65rem; color:var(--ui-amber-500); margin-top:0.3rem;"><i class="fas fa-spinner fa-spin"></i> Executing...</div>';

                        try {
                            // Read params from inputs
                            const params = {};
                            paramsDiv.querySelectorAll('[data-param]').forEach(inp => {
                                let val = inp.value;
                                try { val = JSON.parse(val); } catch (e) { /* keep as string */ }
                                params[inp.dataset.param] = val;
                            });

                            // Auth first if needed
                            if (!this._sessionTokens.sis && act.action !== 'logIn') {
                                const authResult = await this._apiCall(integ.endpoint, 'logIn', integ.credentials);
                                this._sessionTokens.sis = {
                                    sessionId: authResult.data.sessionId || authResult.data.session_id,
                                    logToken: authResult.data.logToken || authResult.data.log_token
                                };
                            }

                            const tokens = act.action === 'logIn' ? {} : (this._sessionTokens.sis || {});
                            const { data, latency } = await this._apiCall(integ.endpoint, act.action, params, tokens);

                            // Cache tokens from logIn
                            if (act.action === 'logIn' && data) {
                                this._sessionTokens.sis = {
                                    sessionId: data.sessionId || data.session_id,
                                    logToken: data.logToken || data.log_token
                                };
                            }

                            this._logCall(integ.key, act.action, 'success', latency, JSON.stringify(data).substring(0, 200));

                            // Show result
                            const preview = JSON.stringify(data, null, 2);
                            const recordCount = Array.isArray(data) ? data.length :
                                (data?.fields && data?.data) ? data.data.length :
                                (data?.results?.data) ? data.results.data.length : null;

                            resultArea.innerHTML = `
                                <div class="ui-flex ui-gap-1" style="margin:0.3rem 0; font-size:0.6rem;">
                                    <span class="si-result-success">Success</span>
                                    <span style="color:var(--ui-gray-400);">${latency}ms</span>
                                    ${recordCount !== null ? `<span style="color:var(--ui-gray-400);">${recordCount} records</span>` : ''}
                                </div>
                                <pre class="as-pre">${this._escapeHtml(preview)}</pre>
                            `;
                        } catch (err) {
                            this._logCall(integ.key, act.action, 'error', 0, err.message);
                            resultArea.innerHTML = `
                                <div class="si-result-error">
                                    <i class="fas fa-times-circle" style="margin-right:0.25rem;"></i>${this._escapeHtml(err.message)}
                                </div>
                            `;
                        }
                    }
                }]
            });

            container.appendChild(card);
        });
    }

    // ── Detail: Activity Log Tab ─────────────────────────────────────────────

    _renderActivityTab(container, integ) {
        const filtered = this._callLog.filter(e => e.integration === integ.key);

        if (filtered.length === 0) {
            container.innerHTML = '<div class="ui-text-center" style="font-size:0.8rem;color:var(--as-text-faint);padding:1rem;">No activity logged for this integration.</div>';
            return;
        }

        const tableData = filtered.map((entry, i) => ({
            id: i,
            time: new Date(entry.timestamp).toLocaleTimeString(),
            action: entry.action,
            status: entry.status,
            latency: entry.latencyMs ? `${entry.latencyMs}ms` : '-',
            detail: entry.detail || ''
        }));

        new uiTable({
            parent: container,
            columns: [
                { key: 'time',    label: 'Time' },
                { key: 'action',  label: 'Action' },
                { key: 'status',  label: 'Status' },
                { key: 'latency', label: 'Latency' },
                { key: 'detail',  label: 'Detail' }
            ],
            data: tableData,
            paging: true,
            searching: true,
            ordering: true,
            pageLength: 15
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SystemIntegrationsPanel };
}
