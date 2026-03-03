/**
 * ClassViewConnectApp - Minimal wrapper for ClassView Connect
 *
 * Renders a thin header bar (back button + title + user badge) and a
 * full-height as-plate containing uiControlStage with ClassViewConnect.
 * No PageFrame — the ClassViewConnect panel already owns its own tabs,
 * KPI row, and sidebar, so an outer PageFrame was redundant chrome.
 *
 * Usage:
 *   const app = new ClassViewConnectApp({
 *       parent: document.body,
 *       onBack: () => { ... }
 *   });
 */
class ClassViewConnectApp {

    constructor(settings) {
        settings = settings || {};
        this._settings = settings;
        this._parent = settings.parent;
        this._cvPanel = null;
        this._build();
    }

    _build() {
        var parent = this._parent;
        parent.innerHTML = '';
        parent.className = 'cvc-parent';
        var self = this;

        // ── Thin header bar ──────────────────────────────────────────
        var header = document.createElement('div');
        header.className = 'cvc-header';

        if (this._settings.onBack) {
            var backBtn = document.createElement('button');
            backBtn.className = 'cvc-back-btn';
            backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
            backBtn.addEventListener('click', this._settings.onBack);
            header.appendChild(backBtn);
        }

        var titleEl = document.createElement('span');
        titleEl.className = 'cvc-title';
        titleEl.innerHTML = '<i class="fas fa-chalkboard-teacher"></i>ClassView Connect';
        header.appendChild(titleEl);

        var spacer = document.createElement('span');
        spacer.className = 'cvc-spacer';
        header.appendChild(spacer);

        if (window.AS_SESSION && window.AS_SESSION.ready) {
            var userEl = document.createElement('span');
            userEl.className = 'cvc-user-id';
            var userId = (window.AS_CREDENTIALS && window.AS_CREDENTIALS.api && window.AS_CREDENTIALS.api.sessionBypass) ? window.AS_CREDENTIALS.api.sessionBypass.userId : 'Authenticated';
            userEl.textContent = userId;
            header.appendChild(userEl);
        }

        parent.appendChild(header);

        // ── Main content — plate + controlStage ──────────────────────
        var main = document.createElement('div');
        main.className = 'as-plate cvc-main';
        parent.appendChild(main);

        var cs = new uiControlStage({
            template: 'unified',
            controlSize: 'md',
            parent: main
        });

        this._cvPanel = new ClassViewConnect({
            courseCode: this._settings.courseCode || 'MGAB401',
            year: this._settings.year || 2020,
            endpoint: this._settings.endpoint || '/api-proxy'
        });
        this._cvPanel.render(cs.getControlPanel(), cs.getStage());
    }

    setUser(user) {
        // Compatibility stub — the header already shows user info from AS_SESSION
    }
}
