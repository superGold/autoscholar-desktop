/**
 * StudentCentralPanel - Integrated student portal with sidebar navigation
 *
 * Restructured per domain debate consensus:
 *  - uiSidebar navigation (Canvas/Blackboard/Ellucian pattern)
 *  - 7 sections: Dashboard, Academics, Degree Map, Timetable, Finances, Support, About
 *  - Panels own their own KPIs (no persistent shell KPI row)
 *  - Activity-stream-first dashboard
 *
 * Usage:
 *   new StudentCentralPanel().render(controlEl, stageEl);
 */
class StudentCentralPanel {

    static PANELS = [
        { key: 'dashboard',  label: 'Dashboard',    icon: 'fa-home',            panelClass: 'StudentDashPanel',      section: 'Overview' },
        { key: 'academics',  label: 'Academics',    icon: 'fa-graduation-cap',  panelClass: 'MyResultsPanel',        section: 'Academic' },
        { key: 'degreeMap',  label: 'Degree Map',   icon: 'fa-sitemap',         panelClass: 'StudentDegreeMapPanel', section: 'Academic' },
        { key: 'timetable',  label: 'Timetable',    icon: 'fa-calendar-alt',    panelClass: 'DegreeProgressPanel',   section: 'Academic' },
        { key: 'finances',   label: 'Finances',     icon: 'fa-wallet',          panelClass: 'StudentFinancesPanel',  section: 'Services' },
        { key: 'support',    label: 'Support',      icon: 'fa-life-ring',       panelClass: 'StudentSupportPanel',   section: 'Services' },
        { key: 'career',     label: 'Career Hub',   icon: 'fa-briefcase',       panelClass: 'CareerHubPanel',        section: 'Services' },
        { key: 'portfolio',  label: 'Portfolio',    icon: 'fa-folder-open',     panelClass: 'EvidencePortfolioPanel',section: 'Services' },
        { key: 'about',      label: 'About',        icon: 'fa-info-circle',     panelClass: 'StudentAboutPanel',     section: 'System' }
    ];

    constructor() {
        this._controlEl = null;
        this._stageEl = null;
        this._activePanel = null;
        this._panelInstances = {};
        this._studentData = {
            firstName: 'Naledi', surname: 'Dlamini', lastName: 'Dlamini',
            studentNumber: '22001002', studentId: '22001002',
            programme: 'ND: Information Technology', faculty: 'Applied Sciences',
            yearOfStudy: 2, registrations: []
        };
        this._status = 'idle';
        this._statusBadge = null;
        this._identityEl = null;
        this._sidebar = null;
        this._subControlEl = null;
        this._endpoint = '/api-proxy';
        this.onLoaded = null;

        // Create StudentDataBridge with seed data
        this._bridge = null;
        if (typeof StudentDataBridge !== 'undefined' && typeof AutoScholarSchema !== 'undefined') {
            this._bridge = new StudentDataBridge();
            if (typeof AutoScholarSeed !== 'undefined') {
                this._bridge.loadSeedData(AutoScholarSeed);
            }
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderIdentity();
        this._switchPanel('dashboard');
        if (window.AS_SESSION && window.AS_SESSION.ready && this._statusBadge) {
            this._statusBadge.update({ label: 'API ready', color: 'success' });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTROL PANEL
    // ══════════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        var self = this;
        el.innerHTML = '';

        // ── Student identity card ──
        this._identityEl = document.createElement('div');
        this._identityEl.className = 'sc-identity';
        el.appendChild(this._identityEl);

        // ── Status + Load button (hidden when session already active) ──
        var sessionReady = !!(window.AS_SESSION && window.AS_SESSION.ready);
        if (!sessionReady) {
            var actionRow = document.createElement('div');
            actionRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-bottom:1px solid var(--ui-gray-200);';
            el.appendChild(actionRow);

            var statusRow = document.createElement('div');
            statusRow.style.cssText = 'display:flex; align-items:center; gap:6px;';
            actionRow.appendChild(statusRow);

            var statusLabel = document.createElement('span');
            statusLabel.style.cssText = 'font-size:var(--ui-text-2xs); color:var(--ui-gray-400); text-transform:uppercase;';
            statusLabel.textContent = 'API';
            statusRow.appendChild(statusLabel);

            this._statusBadge = new uiBadge({ label: 'Not loaded', color: 'gray', size: 'xs', parent: statusRow });

            new uiButton({
                label: 'Load Student', variant: 'primary', size: 'xs',
                icon: '<i class="fas fa-download"></i>',
                parent: actionRow,
                onClick: function() { self._loadStudentData(); }
            });
        }

        // ── Sidebar navigation ──
        var sidebarWrap = document.createElement('div');
        sidebarWrap.style.cssText = 'flex:1; min-height:0; overflow-y:auto;';
        el.appendChild(sidebarWrap);

        // Group panels by section
        var sections = this._buildSidebarSections();

        this._sidebar = new uiSidebar({
            parent: sidebarWrap,
            template: 'default',
            color: 'light',
            sections: sections
        });

        this._sidebar.bus.on('navigate', function(e) {
            if (e.item && e.item.href) {
                self._switchPanel(e.item.href);
            }
        });

        // ── Sub-panel controls area ──
        var subCtrlLabel = document.createElement('div');
        subCtrlLabel.style.cssText = 'padding:6px 12px; font-size:var(--ui-text-2xs); font-weight:var(--ui-font-semibold); color:var(--ui-gray-400); text-transform:uppercase; letter-spacing:0.5px; border-top:1px solid var(--ui-gray-200);';
        subCtrlLabel.textContent = 'Panel Controls';
        el.appendChild(subCtrlLabel);

        this._subControlEl = document.createElement('div');
        this._subControlEl.style.cssText = 'padding:8px 12px; flex-shrink:0;';
        el.appendChild(this._subControlEl);
    }

    _buildSidebarSections() {
        var sectionMap = {};
        var sectionOrder = ['Overview', 'Academic', 'Services', 'System'];

        StudentCentralPanel.PANELS.forEach(function(p) {
            if (!sectionMap[p.section]) sectionMap[p.section] = [];
            sectionMap[p.section].push({
                label: p.label,
                icon: '<i class="fas ' + p.icon + '"></i>',
                href: p.key,
                active: p.key === 'dashboard'
            });
        });

        return sectionOrder.filter(function(s) { return sectionMap[s]; }).map(function(s) {
            return { title: s, items: sectionMap[s] };
        });
    }

    _renderIdentity() {
        var el = this._identityEl;
        el.innerHTML = '';

        if (!this._studentData) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:12px; text-align:center;';

            var avatar = document.createElement('div');
            avatar.className = 'as-avatar as-avatar-md';
            avatar.textContent = '?';
            empty.appendChild(avatar);

            var nameEl = document.createElement('div');
            nameEl.style.cssText = 'font-size:var(--ui-text-sm); color:var(--ui-gray-400); margin-top:6px;';
            nameEl.textContent = 'No student loaded';
            empty.appendChild(nameEl);

            el.appendChild(empty);
            return;
        }

        var s = this._studentData;
        var initials = (s.firstName || '?').charAt(0) + (s.surname || s.lastName || '?').charAt(0);
        var fullName = (s.firstName || '') + ' ' + (s.surname || s.lastName || '');

        var card = document.createElement('div');
        card.style.cssText = 'padding:12px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--ui-gray-200);';

        var avatarEl = document.createElement('div');
        avatarEl.className = 'as-avatar as-avatar-md';
        avatarEl.textContent = initials.toUpperCase();
        card.appendChild(avatarEl);

        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'flex:1; min-width:0;';

        var nameRow = document.createElement('div');
        nameRow.style.cssText = 'font-size:var(--ui-text-sm); font-weight:var(--ui-font-semibold); color:var(--ui-gray-800); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        nameRow.textContent = fullName.trim();
        infoEl.appendChild(nameRow);

        var idRow = document.createElement('div');
        idRow.style.cssText = 'font-size:var(--ui-text-xs); color:var(--ui-gray-500);';
        idRow.textContent = s.studentNumber || s.studentId || '';
        infoEl.appendChild(idRow);

        card.appendChild(infoEl);
        el.appendChild(card);

        // Programme + badges below
        if (s.programme || s.faculty || s.yearOfStudy) {
            var badgeRow = document.createElement('div');
            badgeRow.style.cssText = 'padding:6px 12px; display:flex; flex-wrap:wrap; gap:4px;';
            if (s.programme) new uiBadge({ label: s.programme, color: 'primary', size: 'xs', parent: badgeRow });
            if (s.faculty) new uiBadge({ label: s.faculty, color: 'gray', size: 'xs', parent: badgeRow });
            if (s.yearOfStudy) new uiBadge({ label: 'Year ' + s.yearOfStudy, color: 'gray', size: 'xs', parent: badgeRow });
            if (s.registrations) new uiBadge({ label: s.registrations.length + ' courses', color: 'blue', size: 'xs', parent: badgeRow });
            el.appendChild(badgeRow);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STAGE — Panel Rendering
    // ══════════════════════════════════════════════════════════════════════════

    _switchPanel(key) {
        this._activePanel = key;

        var def = StudentCentralPanel.PANELS.find(function(p) { return p.key === key; });
        if (!def) return;

        // Resolve panel class
        var PanelClass = window[def.panelClass];
        if (!PanelClass) {
            try { PanelClass = eval(def.panelClass); } catch (e) { /* not defined */ }
        }
        if (!PanelClass) {
            this._stageEl.innerHTML = '<div style="padding:40px; text-align:center; color:var(--ui-gray-400);"><i class="fas fa-puzzle-piece" style="font-size:32px; display:block; margin-bottom:8px;"></i>' + def.panelClass + ' not loaded</div>';
            this._subControlEl.innerHTML = '';
            return;
        }

        // Clear stage and sub-control
        this._stageEl.innerHTML = '';
        this._stageEl.style.cssText = 'flex:1; min-height:0; overflow-y:auto; padding:var(--ui-space-4);';
        this._subControlEl.innerHTML = '';

        // Panel content container
        var panelHost = document.createElement('div');
        this._stageEl.appendChild(panelHost);

        // Instantiate and render — pass both bridge (seed) and real API data
        var panel = new PanelClass({
            bridge: this._bridge,
            studentData: this._studentData || null
        });

        // Handle both contracts: render(controlEl, stageEl) and render(container)
        if (panel.render.length <= 1) {
            // Single-arg panels (panels/ directory — El.add pattern)
            // Ensure .add() is available for El-style panels
            if (!panelHost.add) StudentCentralPanel._patchAdd(panelHost);
            panel.render(panelHost);
        } else {
            // Two-arg panels (Tests/ directory — control + stage pattern)
            panel.render(this._subControlEl, panelHost);
        }
        this._panelInstances[key] = panel;

        if (typeof log === 'function') log('StudentCentral', 'Switched to ' + def.label);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EL-COMPAT: minimal .add() for panels/ classes that use the El pattern
    // ══════════════════════════════════════════════════════════════════════════

    static _patchAdd(el) {
        el.add = function(spec) {
            var child = document.createElement(spec.tag || 'div');
            if (spec.css) child.className = spec.css;
            if (spec.script) child.textContent = spec.script;
            if (spec.html) child.innerHTML = spec.html;
            if (spec.style) child.style.cssText = spec.style;
            el.appendChild(child);
            StudentCentralPanel._patchAdd(child);
            return child;
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DATA LOADING — instApi
    // ══════════════════════════════════════════════════════════════════════════

    async loadStudent(studentNumber) {
        return this._loadStudentData(studentNumber);
    }

    async _loadStudentData(studentNumberOverride) {
        if (this._status === 'loading') return;
        this._status = 'loading';
        this._statusBadge.update({ label: 'Loading...', color: 'warning' });

        try {
            var studentNumber = studentNumberOverride || null;
            var courseCode = null;
            var year = null;

            if (!studentNumber) {
                if (typeof log === 'function') log('StudentCentral', 'Fetching sample values...');
                var sampleData = await this._apiCall('getSampleValues');
                var samples = this._parseResponse(sampleData);
                if (samples && samples.length > 0) {
                    var s = samples[0];
                    studentNumber = s.studentNumber || s.STUDENT_NUMBER || s.student_number;
                    courseCode = s.courseCode || s.COURSE_CODE || s.course_code;
                    year = s.year || s.YEAR || s.academicYear || 2024;
                }
            }

            if (!studentNumber) throw new Error('No student number available');
            if (typeof log === 'function') log('StudentCentral', 'Student: ' + studentNumber);

            this._statusBadge.update({ label: 'Bio data...', color: 'warning' });
            var bioData = await this._apiCall('getStudentBioData', { studentNumber: studentNumber });
            var bioRecords = this._parseResponse(bioData);
            var bio = bioRecords && bioRecords.length > 0 ? bioRecords[0] : {};

            this._statusBadge.update({ label: 'Registrations...', color: 'warning' });
            var regData = await this._apiCall('getProgrammeRegistrations', { studentNumber: studentNumber });
            var registrations = this._parseResponse(regData) || [];

            this._statusBadge.update({ label: 'Results...', color: 'warning' });
            var results = [];
            if (courseCode && year) {
                try {
                    var resultData = await this._apiCall('getCourseResults', { courseCode: courseCode, year: year });
                    var allResults = this._parseResponse(resultData) || [];
                    results = allResults.filter(function(r) {
                        return (r.studentNumber || r.STUDENT_NUMBER) === studentNumber;
                    });
                } catch (e) {
                    if (typeof log === 'function') log('StudentCentral', 'Results fetch: ' + e.message, true);
                }
            }

            // Extract first name — DUT API returns "firstNames" (plural)
            var rawFirst = bio.firstName || bio.firstNames || bio.FIRST_NAME || bio.first_name || bio.name || '';
            // Take only the first word if multiple names (e.g. "CAMERON MATTHEW" → "Cameron")
            var firstName = rawFirst.split(' ')[0];
            firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

            var rawSurname = bio.surname || bio.lastName || bio.SURNAME || bio.last_name || '';
            var surname = rawSurname.charAt(0).toUpperCase() + rawSurname.slice(1).toLowerCase();

            // Programme: use programmeLabel or programmeCode from registrations
            var latestReg = registrations.length > 0 ? registrations[registrations.length - 1] : null;
            var programme = '';
            if (latestReg) {
                programme = latestReg.programmeLabel || latestReg.programmeName || latestReg.programmeCode || '';
            }
            // AYOS from latest registration
            var yearOfStudy = latestReg ? (latestReg.ayos || latestReg.yearOfStudy || '') : '';

            this._studentData = {
                studentNumber: studentNumber,
                studentId: studentNumber,
                firstName: firstName,
                surname: surname,
                lastName: surname,
                email: bio.email || bio.EMAIL || bio.emailAddress || '',
                programme: programme,
                faculty: bio.faculty || bio.FACULTY || '',
                department: bio.department || bio.DEPARTMENT || '',
                yearOfStudy: yearOfStudy,
                registrations: registrations,
                results: results,
                courseCode: courseCode,
                year: year
            };

            this._status = 'ready';
            this._statusBadge.update({ label: 'Ready', color: 'success' });
            this._renderIdentity();
            this._switchPanel('dashboard');

            if (typeof log === 'function') log('StudentCentral', 'Loaded: ' + this._studentData.firstName + ' ' + this._studentData.surname + ' (' + studentNumber + ')');
            if (this.onLoaded) this.onLoaded({ status: 'ready', studentData: this._studentData });

        } catch (err) {
            this._status = 'error';
            this._statusBadge.update({ label: 'Error: ' + err.message, color: 'danger' });
            if (typeof log === 'function') log('StudentCentral', 'Load failed: ' + err.message, true);
            if (this.onLoaded) this.onLoaded({ status: 'error', error: err.message });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // API HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    async _apiCall(action, params) {
        var body = { action: action };
        var keys = Object.keys(params || {});
        for (var i = 0; i < keys.length; i++) body[keys[i]] = params[keys[i]];
        if (window.AS_SESSION && window.AS_SESSION.sessionId) body.sessionId = window.AS_SESSION.sessionId;
        if (window.AS_SESSION && window.AS_SESSION.logToken) body.logToken = window.AS_SESSION.logToken;
        var response = await fetch(this._endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
            throw new Error('Session expired');
        }
        return data;
    }

    _parseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;
        if (data.fields && Array.isArray(data.data)) return this._fieldsDataToRecords(data.fields, data.data);
        if (data.results && data.results.fields && Array.isArray(data.results.data))
            return this._fieldsDataToRecords(data.results.fields, data.results.data);
        if (Array.isArray(data.results)) return data.results;
        var wrapKeys = ['students', 'registrations', 'courseResults', 'studentBioData', 'sampleValues'];
        for (var i = 0; i < wrapKeys.length; i++) {
            var inner = data[wrapKeys[i]];
            if (inner) {
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data))
                    return this._fieldsDataToRecords(inner.fields, inner.data);
            }
        }
        if (typeof data === 'object' && !Array.isArray(data)) return [data];
        return null;
    }

    _fieldsDataToRecords(fields, data) {
        var normalized = fields.map(function(f) {
            return f === f.toUpperCase() && f.length > 1
                ? f.toLowerCase().replace(/_([a-z])/g, function(_, c) { return c.toUpperCase(); })
                : f;
        });
        return data.map(function(row) {
            var record = {};
            normalized.forEach(function(field, i) { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentCentralPanel;
}
if (typeof window !== 'undefined') {
    window.StudentCentralPanel = StudentCentralPanel;
}
