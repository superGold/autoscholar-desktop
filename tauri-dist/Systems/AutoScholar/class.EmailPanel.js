/**
 * EmailPanel - Email compose + sent mail viewer + DUT details
 *
 * Thin UI over MessagesService email integration.
 * Creates a MessagesService, configures it with an API transport,
 * and uses service methods for send/load.
 *
 * Controls (left): 3 accordion sections — Connection, Compose, DUT Details
 * Stage (right): Sent mail log table with refresh
 */

class EmailPanel {

    constructor(config = {}) {
        this.endpoint = config.endpoint || '/api-proxy';
        this.auth = config.auth || {};
        this.sessionId = null;
        this.logToken = null;
        this._credentials = null;
        this._initialized = false;

        // MessagesService instance for email
        this.messages = new MessagesService();
        this.messages.configureEmail({
            defaultFrom: 'AutoScholar @ DUT<autoscholar@dut.ac.za>',
            transport: (action, params) => this._mailTransport(action, params)
        });
    }

    // ── Public API ──────────────────────────────────────────────────────────

    renderControls(container) {
        this._controlEl = container;
        container.className = 'as-flex-col';
        container.style.height = '100%';

        this._accordion = new uiAccordion({
            exclusive: true,
            size: 'sm',
            content: {
                connection: { label: 'Connection', content: '' },
                compose:    { label: 'Compose', content: '', open: true },
                dut:        { label: 'DUT Details', content: '' }
            },
            parent: container
        });

        const connEl = this._accordion.el.querySelector('[data-key="connection"] .ui-accordion-content');
        const compEl = this._accordion.el.querySelector('[data-key="compose"] .ui-accordion-content');
        const dutEl  = this._accordion.el.querySelector('[data-key="dut"] .ui-accordion-content');
        this._renderConnection(connEl);
        this._renderCompose(compEl);
        this._renderDutDetails(dutEl);
    }

    renderStage(stageEl) {
        this._stageEl = stageEl;

        // Header row
        const header = document.createElement('div');
        header.className = 'as-flex-row-between as-mb-2';
        stageEl.appendChild(header);

        const label = document.createElement('span');
        label.className = 'as-text-sm as-text-bold';
        label.textContent = 'Sent Mail';
        header.appendChild(label);

        new uiButton({
            label: 'Refresh',
            variant: 'ghost',
            size: 'xs',
            parent: header,
            onClick: () => this._loadAndRenderSentMail()
        });

        // Table container
        this._tableContainer = document.createElement('div');
        stageEl.appendChild(this._tableContainer);
    }

    // ── Connection Section ──────────────────────────────────────────────────

    _renderConnection(container) {
        this._smtpLabel = document.createElement('div');
        this._smtpLabel.className = 'as-text-sm';
        this._smtpLabel.style.marginBottom = '0.4rem';
        this._smtpLabel.textContent = 'SMTP: MFD.DUT.AC.ZA:25';
        container.appendChild(this._smtpLabel);

        this._fromLabel = document.createElement('div');
        this._fromLabel.className = 'as-text-sm as-mb-2';
        this._fromLabel.textContent = 'From: autoscholar@dut.ac.za';
        container.appendChild(this._fromLabel);

        this._connBadge = new uiBadge({ label: 'Not tested', color: 'gray', size: 'sm', parent: container });

        const btnRow = document.createElement('div');
        btnRow.className = 'as-mt-2';
        container.appendChild(btnRow);

        new uiButton({
            label: 'Test Connection',
            variant: 'secondary',
            size: 'xs',
            parent: btnRow,
            onClick: () => this._testConnection()
        });
    }

    async _testConnection() {
        this._connBadge.update({ label: 'Testing...', color: 'blue' });
        try {
            await this._authenticate();
            const res = await this._apiCall('Ping', {});
            if (res && (res.status !== false)) {
                this._connBadge.update({ label: 'Connected', color: 'green' });
            } else {
                this._connBadge.update({ label: 'Ping failed', color: 'red' });
            }
        } catch (e) {
            this._connBadge.update({ label: 'Error: ' + e.message, color: 'red' });
        }
    }

    // ── Compose Section ─────────────────────────────────────────────────────

    _renderCompose(container) {
        this._toInput = new uiInput({
            template: 'inline-label', label: 'To', size: 'sm',
            placeholder: 'recipient@dut.ac.za',
            parent: container
        });

        this._subjectInput = new uiInput({
            template: 'inline-label', label: 'Subject', size: 'sm',
            placeholder: 'Test email subject',
            parent: container
        });

        // Body textarea
        const bodyWrap = document.createElement('div');
        bodyWrap.className = 'ui-input-wrapper';
        bodyWrap.classList.add('as-mb-2');
        container.appendChild(bodyWrap);

        const bodyLabel = document.createElement('label');
        bodyLabel.className = 'as-ctrl-label';
        bodyLabel.textContent = 'Body';
        bodyWrap.appendChild(bodyLabel);

        this._bodyTextarea = document.createElement('textarea');
        this._bodyTextarea.className = 'ui-input';
        this._bodyTextarea.classList.add('as-text-sm');
        this._bodyTextarea.style.cssText = 'width: 100%; min-height: 80px; resize: vertical;';
        this._bodyTextarea.placeholder = 'Email body (HTML supported)';
        bodyWrap.appendChild(this._bodyTextarea);

        // Send button + status
        const sendRow = document.createElement('div');
        sendRow.className = 'as-flex-row-center';
        container.appendChild(sendRow);

        new uiButton({
            label: 'Send',
            variant: 'primary',
            size: 'sm',
            parent: sendRow,
            onClick: () => this._doSend()
        });

        this._sendBadge = new uiBadge({ label: 'Ready', color: 'gray', size: 'sm', parent: sendRow });
    }

    async _doSend() {
        const to = this._getInputValue(this._toInput);
        const subject = this._getInputValue(this._subjectInput);
        const html = this._bodyTextarea.value.trim();

        if (!to) { this._sendBadge.update({ label: 'Enter recipient', color: 'orange' }); return; }
        if (!subject) { this._sendBadge.update({ label: 'Enter subject', color: 'orange' }); return; }

        this._sendBadge.update({ label: 'Sending...', color: 'blue' });
        try {
            await this._authenticate();
            await this.messages.sendEmail({ to, subject, html: html || subject });
            this._sendBadge.update({ label: 'Sent → ' + to, color: 'green' });
        } catch (e) {
            this._sendBadge.update({ label: 'Failed: ' + e.message, color: 'red' });
        }
    }

    // ── DUT Details Section ─────────────────────────────────────────────────

    _renderDutDetails(container) {
        this._dutContainer = container;
        this._loadCredentials();
    }

    async _loadCredentials() {
        try {
            const res = await fetch('../Implementations-DUT/credentials.json');
            this._credentials = await res.json();
            this._renderCredentials();
        } catch (e) {
            this._dutContainer.innerHTML = '<span class="as-text-sm as-text-muted">Could not load credentials.json</span>';
        }
    }

    _renderCredentials() {
        const c = this._credentials;
        if (!c) return;
        this._dutContainer.innerHTML = '';

        const items = [
            { key: 'Server', value: `${c.server.host} (${c.server.ip})`, status: null },
            { key: 'OS', value: c.server.os, status: null },
            { key: 'Oracle', value: `${c.oracle.user}@${c.oracle.connectString.split('/').pop()}`, status: null },
            { key: 'LDAP', value: c.ldap.host.replace('ldap://', ''), status: c.ldap.serviceAccount.status },
            { key: 'SMTP', value: `${c.smtp.host}:${c.smtp.port}`, status: c.smtp.status },
            { key: 'NodeProxy', value: `port ${c.nodeProxy.port}`, status: c.nodeProxy.status },
            { key: 'API', value: c.api.endpoint.replace('https://', ''), status: null }
        ];

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'as-cw-flex-row-sm-mb as-text-xs';

            const keyEl = document.createElement('span');
            keyEl.className = 'as-text-bold';
            keyEl.style.cssText = 'min-width: 70px; color: var(--ui-gray-600);';
            keyEl.textContent = item.key;
            row.appendChild(keyEl);

            const valEl = document.createElement('span');
            valEl.className = 'as-flex-1';
            valEl.style.cssText = 'color: var(--ui-gray-800); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            valEl.textContent = item.value;
            row.appendChild(valEl);

            if (item.status) {
                const color = this._statusColor(item.status);
                new uiBadge({ label: item.status, color, size: 'xs', parent: row });
            }

            this._dutContainer.appendChild(row);
        });

        // Pending items
        if (c.ldap.serviceAccount.status === 'EXPIRED') {
            const note = document.createElement('div');
            note.className = 'as-alert-item as-mt-2';
            note.style.borderLeftColor = 'var(--ui-orange-400, #fb923c)';
            note.style.background = 'var(--ui-orange-50, #fff7ed)';
            note.textContent = c.ldap.serviceAccount.action || 'LDAP password reset pending';
            this._dutContainer.appendChild(note);
        }
    }

    _statusColor(status) {
        const map = { WORKING: 'green', RUNNING: 'green', EXPIRED: 'orange', ERROR: 'red' };
        return map[status] || 'gray';
    }

    // ── Transport (API proxy auth + call) ───────────────────────────────────

    async _authenticate() {
        if (this.sessionId) return;
        // Reuse global rig session if available
        if (window.AS_SESSION?.ready) {
            this.sessionId = window.AS_SESSION.sessionId;
            this.logToken = window.AS_SESSION.logToken;
            return;
        }
        if (this._authPending) return this._authPending;
        this._authPending = this._apiCall('logIn', {
            userId: this.auth.userId,
            pwd: this.auth.pwd
        }).then(res => {
            if (res && res.sessionId) {
                this.sessionId = res.sessionId;
                this.logToken = res.logToken;
            }
            this._authPending = null;
        });
        return this._authPending;
    }

    async _mailTransport(action, params) {
        if (action === 'readSentMail') {
            // StreamRecorder needs start/end unix timestamps; timeout guards against empty fileSet bug
            const end = Math.floor(Date.now() / 1000) + 86400;
            params = Object.assign({ start: 0, end }, params);
            return Promise.race([
                this._apiCall(action, params),
                new Promise(resolve => setTimeout(() => resolve({ data: [], timeout: true }), 8000))
            ]);
        }
        return this._apiCall(action, params);
    }

    async _apiCall(action, params) {
        const body = Object.assign({ action }, params);
        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.logToken) body.logToken = this.logToken;
        if (this.auth.userId && !body.userId) body.userId = this.auth.userId;

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
            throw new Error('Session expired');
        }
        return data;
    }

    // ── Sent Mail Table ─────────────────────────────────────────────────────

    async _loadAndRenderSentMail() {
        await this._authenticate();
        const rows = await this.messages.loadEmailLog();
        this._renderSentMail(rows);
    }

    _renderSentMail(rows) {
        this._tableContainer.innerHTML = '';

        if (!rows || rows.length === 0) {
            new uiAlert({
                color: 'info',
                title: 'No sent mail',
                message: 'Send an email or click Refresh to load sent mail log.',
                parent: this._tableContainer
            });
            return;
        }

        new uiTable({
            size: 'sm',
            columns: [
                { key: 'time', label: 'Time' },
                { key: 'to', label: 'To' },
                { key: 'subject', label: 'Subject' }
            ],
            data: rows,
            parent: this._tableContainer
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    _getInputValue(uiInputInstance) {
        const el = uiInputInstance.el.querySelector('input') || uiInputInstance.el;
        return (el.value || '').trim();
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;
        // Authenticate eagerly so Send works immediately
        await this._authenticate().catch(() => {});
        // Load sent mail in background — don't block if it hangs
        this._loadAndRenderSentMail().catch(() => {});
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailPanel;
}
if (typeof window !== 'undefined') {
    window.EmailPanel = EmailPanel;
}
