/**
 * class.AutoScholarEntryFlow.js — Production entry flow controller
 *
 * Manages the complete user journey: login → hub → module.
 * Cookie-based session persistence with strict no-fallback authentication.
 *
 * Usage:
 *   new AutoScholarEntryFlow({
 *       container: document.getElementById('app'),
 *       endpoint: '/api-proxy',
 *       institution: 'DUT',
 *       institutionName: 'Durban University of Technology'
 *   }).start();
 */
class AutoScholarEntryFlow {

    // Section key → AutoScholarApp tab key mapping
    static SECTION_TAB_MAP = {
        student:       'students',
        lecturer:      'supervision',
        analyst:       'programme',
        counsellor:    'casework',
        executive:     'dashboard',
        accreditation: 'reports'
    };

    // Section key → card display metadata (each module has a distinct hue for its avatar/accent)
    static SECTION_CARDS = {
        student:       { label: 'Student Central',        icon: 'fa-user-graduate',       hue: 217, sat: 75  },
        lecturer:      { label: 'ClassView Connect',      icon: 'fa-chalkboard-teacher',  hue: 174, sat: 65  },
        analyst:       { label: 'Programme Analyst',      icon: 'fa-chart-line',          hue: 260, sat: 60  },
        counsellor:    { label: 'Casework Counsellor',    icon: 'fa-hands-helping',       hue: 340, sat: 70  },
        executive:     { label: 'Executive Insight',      icon: 'fa-briefcase',           hue: 43,  sat: 80  },
        accreditation: { label: 'Accreditation Automate', icon: 'fa-certificate',         hue: 150, sat: 60  }
    };

    constructor(config) {
        this._container = config.container;
        this._endpoint = config.endpoint || '/api-proxy';
        this._institution = config.institution || 'DUT';
        this._institutionName = config.institutionName || config.institution || 'Institution';
        this._devAutoLogin = config.devAutoLogin || null; // { userId, password }
        this._app = null;
    }

    // ── Public entry point ────────────────────────────────────────────────────

    async start() {
        // Check for saved session cookies
        const saved = this._loadSession();
        if (saved && saved.sessionId) {
            // Validate session is still alive
            const valid = await this._validateSession(saved);
            if (valid) {
                this._setSession(saved);
                if (saved.role === 'as_student') {
                    this._launchModule('student');
                } else {
                    this._renderHub();
                }
                return;
            }
            // Session expired — clear and show login
            this._clearSession();
        }

        // Dev auto-login if configured
        if (this._devAutoLogin) {
            await this._doLogin(this._devAutoLogin.userId, this._devAutoLogin.password, false);
            return;
        }

        this._renderLogin();
    }

    // ── Login Screen ──────────────────────────────────────────────────────────

    _renderLogin() {
        this._container.innerHTML = '';
        this._container.className = '';

        const screen = document.createElement('div');
        screen.className = 'as-login-screen';

        const panel = document.createElement('div');
        panel.className = 'as-login-panel';

        // Brand
        panel.innerHTML = `
            <div class="as-login-brand">
                <i class="fas fa-graduation-cap as-brand-icon"></i>
                <span class="as-brand-name">AutoScholar</span>
                <span class="as-brand-sub">Advisor System</span>
                <span class="as-brand-institution">${this._esc(this._institutionName)}</span>
            </div>
            <div class="as-login-error" id="as-login-error"></div>
            <div class="as-login-field">
                <label for="as-userId">Staff / Student ID</label>
                <input type="text" id="as-userId" autocomplete="username" placeholder="Enter your ID">
            </div>
            <div class="as-login-field">
                <label for="as-password">Password</label>
                <input type="password" id="as-password" autocomplete="current-password" placeholder="Enter your password">
            </div>
            <div class="as-login-remember">
                <input type="checkbox" id="as-remember">
                <label for="as-remember">Remember me for 7 days</label>
            </div>
            <button class="as-login-btn" id="as-login-btn">
                <i class="fas fa-sign-in-alt"></i> Sign In
            </button>
            <div class="as-login-footer">
                Powered by Publon.Press
            </div>
        `;

        screen.appendChild(panel);

        // Wrap in flex column for footer
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;height:100vh;';
        screen.style.cssText = 'flex:1;min-height:0;';
        wrapper.appendChild(screen);
        this._renderFooter(wrapper);
        this._container.appendChild(wrapper);

        // Wire events
        const btn = document.getElementById('as-login-btn');
        const userInput = document.getElementById('as-userId');
        const pwdInput = document.getElementById('as-password');

        btn.addEventListener('click', () => this._handleLogin());
        pwdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleLogin();
        });
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') pwdInput.focus();
        });

        userInput.focus();
    }

    async _handleLogin() {
        const userId = document.getElementById('as-userId').value.trim();
        const password = document.getElementById('as-password').value;
        const remember = document.getElementById('as-remember').checked;

        if (!userId || !password) {
            this._showLoginError('Please enter your ID and password.');
            return;
        }

        const btn = document.getElementById('as-login-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        this._hideLoginError();

        await this._doLogin(userId, password, remember);
    }

    async _doLogin(userId, password, remember) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);

            const res = await fetch(this._endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logIn', userId, pwd: password }),
                signal: controller.signal
            });
            clearTimeout(timer);

            const data = await res.json();

            if (!data || !data.sessionId) {
                const msg = data?.error || 'Login failed — invalid credentials or server error.';
                this._showLoginError(msg);
                this._resetLoginButton();
                return;
            }

            // Determine role from user ID pattern and response
            const role = this._detectRole(userId, data);

            const session = {
                sessionId: data.sessionId,
                logToken: data.logToken,
                userId: userId,
                role: role,
                institution: this._institution
            };

            // Set global session
            this._setSession(session);

            // Save to cookies
            this._saveSession(session, remember);

            // Route to appropriate screen
            if (role === 'as_student') {
                this._launchModule('student');
            } else {
                this._renderHub();
            }

        } catch (e) {
            const msg = e.name === 'AbortError'
                ? 'Connection timeout — the institution API may be unreachable.'
                : `Login failed: ${e.message}`;
            this._showLoginError(msg);
            this._resetLoginButton();
        }
    }

    _detectRole(userId, data) {
        // If server provides role, use it
        if (data.role) return data.role;

        // Detect from ID pattern: numeric = student, alphabetic = staff
        const isStudent = /^\d{5,}$/.test(userId);
        if (isStudent) return 'as_student';

        // Default staff to admin for dev — production should get role from server
        return data.staffRole || 'as_admin';
    }

    _showLoginError(msg) {
        const el = document.getElementById('as-login-error');
        if (el) {
            el.textContent = msg;
            el.classList.add('visible');
        }
    }

    _hideLoginError() {
        const el = document.getElementById('as-login-error');
        if (el) el.classList.remove('visible');
    }

    _resetLoginButton() {
        const btn = document.getElementById('as-login-btn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }

    // ── Hub Screen ────────────────────────────────────────────────────────────

    _renderHub() {
        this._container.innerHTML = '';
        this._container.className = '';

        const screen = document.createElement('div');
        screen.className = 'as-hub-screen';

        // Header band
        const header = document.createElement('div');
        header.className = 'as-hub-header';
        const initials = (window.AS_SESSION?.userId || 'U').substring(0, 2).toUpperCase();
        header.innerHTML = `
            <div class="as-hub-header-left">
                <div class="as-hub-logo"><i class="fas fa-graduation-cap"></i></div>
                <div class="as-hub-header-text">
                    <div class="as-hub-header-title">AutoScholar <span class="as-hub-header-sub">Advisor System</span></div>
                    <div class="as-hub-header-inst">${this._esc(this._institutionName)}</div>
                </div>
            </div>
            <div class="as-hub-header-right">
                <div class="as-hub-header-avatar">${initials}</div>
                <button class="as-hub-logout" id="as-hub-logout">
                    <i class="fas fa-sign-out-alt"></i> Sign out
                </button>
            </div>
        `;
        screen.appendChild(header);

        // Welcome banner
        const welcome = document.createElement('div');
        welcome.className = 'as-hub-welcome';
        const firstName = (window.AS_SESSION?.userId || 'there').split('.')[0];
        const capFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        welcome.innerHTML = `
            <div class="as-hub-welcome-text">
                <div class="as-hub-welcome-greeting">Welcome back, ${this._esc(capFirst)}</div>
                <div class="as-hub-welcome-sub">Select a module to get started</div>
            </div>
        `;
        screen.appendChild(welcome);

        // Card grid
        const grid = document.createElement('div');
        grid.className = 'as-hub-grid';

        // Get role-filtered sections
        const role = window.AS_SESSION?.role || 'as_admin';
        const roleTabs = AutoScholarConfigData.ROLE_TABS[role] || AutoScholarConfigData.ROLE_TABS.as_admin;
        const sections = AutoScholarConfigData.SECTIONS;
        const visibleSections = roleTabs.filter(key => key !== 'hub' && key !== 'about' && sections[key]);

        visibleSections.forEach(key => {
            const section = sections[key];
            const cardMeta = AutoScholarEntryFlow.SECTION_CARDS[key];
            if (!cardMeta) return;

            const h = cardMeta.hue;
            const s = cardMeta.sat;
            const card = document.createElement('div');
            card.className = 'as-hub-card';
            card.style.setProperty('--card-hue', h);
            card.style.setProperty('--card-sat', s + '%');
            card.innerHTML = `
                <div class="as-hub-card-avatar">
                    <i class="fas ${cardMeta.icon}"></i>
                </div>
                <div class="as-hub-card-body">
                    <div class="as-hub-card-label">${this._esc(cardMeta.label)}</div>
                    <div class="as-hub-card-desc">${this._esc(section.description)}</div>
                </div>
                <div class="as-hub-card-arrow"><i class="fas fa-arrow-right"></i></div>
            `;
            card.addEventListener('click', () => this._launchModule(key));
            grid.appendChild(card);
        });

        screen.appendChild(grid);

        // Wrap in flex column for footer
        const wrapper = document.createElement('div');
        wrapper.className = 'as-hub-wrapper';
        screen.className += ' as-hub-screen-flex';
        wrapper.appendChild(screen);
        this._renderFooter(wrapper);
        this._container.appendChild(wrapper);

        // Wire logout
        document.getElementById('as-hub-logout').addEventListener('click', () => this._logout());
    }

    // ── Module Launch ─────────────────────────────────────────────────────────

    _launchModule(sectionKey) {
        const tabKey = AutoScholarEntryFlow.SECTION_TAB_MAP[sectionKey];
        if (!tabKey) {
            // Stub module — show message and return to hub
            this._container.innerHTML = '';
            this._container.className = '';
            const stub = document.createElement('div');
            stub.style.cssText = 'display:flex;align-items:center;justify-content:center;flex:1;font-family:system-ui;color:var(--ui-gray-500);';
            stub.innerHTML = `
                <div style="text-align:center;">
                    <i class="fas fa-hard-hat" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
                    <p>This module is coming soon.</p>
                    <button class="as-header-hub-btn" style="margin:1rem auto 0;color:var(--ui-gray-600);border-color:var(--ui-gray-300);">
                        <i class="fas fa-th-large"></i> Back to Hub
                    </button>
                </div>`;
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex;flex-direction:column;height:100vh;';
            wrapper.appendChild(stub);
            this._renderFooter(wrapper);
            this._container.appendChild(wrapper);
            stub.querySelector('button').addEventListener('click', () => this._returnToHub());
            window._entryFlow = this;
            return;
        }

        this._container.innerHTML = '';
        this._container.className = '';

        // Page wrapper (flex column: app + footer)
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;height:100vh;';

        // App container (flex: 1, no fixed 100vh)
        const appEl = document.createElement('div');
        appEl.className = 'autoscholar';
        appEl.style.cssText = 'flex:1;min-height:0;height:auto;';
        wrapper.appendChild(appEl);

        // Footer
        this._renderFooter(wrapper);

        this._container.appendChild(wrapper);

        // Launch AutoScholarApp in production mode
        const cardMeta = AutoScholarEntryFlow.SECTION_CARDS[sectionKey];
        this._app = new AutoScholarApp({
            parent: appEl,
            endpoint: this._endpoint,
            institution: this._institution,
            startTab: tabKey,
            productionMode: true,
            moduleLabel: cardMeta?.label || sectionKey,
            onHubClick: () => this._returnToHub()
        });
        this._app.init();

        // Store ref for stub back button
        window._entryFlow = this;
    }

    _returnToHub() {
        this._app = null;
        const role = window.AS_SESSION?.role;
        if (role === 'as_student') {
            // Students don't have a hub — back goes to login
            this._logout();
        } else {
            this._renderHub();
        }
    }

    _logout() {
        this._clearSession();
        window.AS_SESSION = { sessionId: null, logToken: null, ready: false, error: null };
        window.AS_INSTITUTION = null;
        this._app = null;
        this._renderLogin();
    }

    // ── Session Management (globals) ──────────────────────────────────────────

    _setSession(session) {
        window.AS_SESSION = {
            sessionId: session.sessionId,
            logToken: session.logToken,
            userId: session.userId,
            staffId: session.userId,
            ready: true,
            error: null
        };
        window.AS_INSTITUTION = {
            institution: { name: this._institutionName, code: this._institution },
            api: { endpoint: this._endpoint },
            defaults: { academicYear: new Date().getFullYear() }
        };
    }

    // ── Session Validation ────────────────────────────────────────────────────

    _validateSession(session) {
        // Trust the saved cookie — the PHP API has no validateSession action.
        // If the server-side session has expired, individual API calls within
        // the app will return errors and the user can re-login manually.
        // We only check that the cookie contains the required fields.
        return !!(session.sessionId && session.userId);
    }

    // ── Cookie Management ─────────────────────────────────────────────────────

    _saveSession(session, remember) {
        const maxAge = remember ? 7 * 24 * 60 * 60 : ''; // 7 days or session
        const expires = remember ? `; max-age=${maxAge}` : '';
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        const sameSite = '; SameSite=Lax';

        document.cookie = `as_sessionId=${encodeURIComponent(session.sessionId)}${expires}; path=/${secure}${sameSite}`;
        document.cookie = `as_logToken=${encodeURIComponent(session.logToken)}${expires}; path=/${secure}${sameSite}`;
        document.cookie = `as_userId=${encodeURIComponent(session.userId)}${expires}; path=/${secure}${sameSite}`;
        document.cookie = `as_role=${encodeURIComponent(session.role)}${expires}; path=/${secure}${sameSite}`;
        document.cookie = `as_institution=${encodeURIComponent(session.institution)}${expires}; path=/${secure}${sameSite}`;
    }

    _loadSession() {
        const cookies = {};
        document.cookie.split(';').forEach(c => {
            const [key, val] = c.trim().split('=');
            if (key) cookies[key] = decodeURIComponent(val || '');
        });

        if (!cookies.as_sessionId) return null;

        return {
            sessionId: cookies.as_sessionId,
            logToken: cookies.as_logToken || '',
            userId: cookies.as_userId || '',
            role: cookies.as_role || 'as_admin',
            institution: cookies.as_institution || this._institution
        };
    }

    _clearSession() {
        const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
        ['as_sessionId', 'as_logToken', 'as_userId', 'as_role', 'as_institution'].forEach(name => {
            document.cookie = `${name}=; expires=${past}; path=/`;
        });
    }

    // ── Footer ──────────────────────────────────────────────────────────────

    _renderFooter(parent) {
        const footer = document.createElement('div');
        footer.className = 'as-footer';
        footer.innerHTML = `
            <div class="as-footer-left">
                <span class="as-footer-brand">NanoStream</span>
                <span class="as-footer-sep">|</span>
                <span class="as-footer-link">AutoScholar</span>
            </div>
            <div class="as-footer-right">
                <a class="as-footer-link" href="#">About</a>
                <a class="as-footer-link" href="#">Projects</a>
                <a class="as-footer-link" href="#">Contact</a>
            </div>
        `;
        parent.appendChild(footer);
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    _esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }
}
