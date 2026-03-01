/**
 * AttendanceDPPanel - Attendance tracking & DP status monitoring
 *
 * Publome-based compound panel (Layer 4) that composes:
 *   - EventService  → class sessions as events, eventAttendee for check-in
 *   - GroupService   → course groups, enrolled students with roles
 *   - MemberService  → student/staff identities
 *   - UIBinding      → reactive bridge between services and UI
 *
 * DP (Duly Performed) is a South African HE mechanism where students below
 * an attendance threshold are excluded from writing exams.
 *
 * Usage:
 *   const panel = new AttendanceDPPanel({ courseCode: 'COMP101' });
 *   panel.render(controlEl, stageEl);
 */
class AttendanceDPPanel {

    // ── Static Data ─────────────────────────────────────────────────────────

    static DEMO_STUDENTS = [
        { id: '220101', name: 'Thabo', surname: 'Mokoena' },
        { id: '220102', name: 'Naledi', surname: 'Dlamini' },
        { id: '220103', name: 'Sipho', surname: 'Nkosi' },
        { id: '220104', name: 'Zanele', surname: 'Khumalo' },
        { id: '220105', name: 'Bongani', surname: 'Mthembu' },
        { id: '220106', name: 'Lindiwe', surname: 'Ngcobo' },
        { id: '220107', name: 'Mandla', surname: 'Zulu' },
        { id: '220108', name: 'Ayanda', surname: 'Mkhize' },
        { id: '220109', name: 'Nomvula', surname: 'Sithole' },
        { id: '220110', name: 'Sibusiso', surname: 'Ndlovu' },
        { id: '220111', name: 'Palesa', surname: 'Mahlangu' },
        { id: '220112', name: 'Kagiso', surname: 'Molefe' },
        { id: '220113', name: 'Dineo', surname: 'Maseko' },
        { id: '220114', name: 'Tshiamo', surname: 'Botha' },
        { id: '220115', name: 'Lerato', surname: 'Pretorius' },
        { id: '220116', name: 'Mpho', surname: 'Van der Merwe' },
        { id: '220117', name: 'Nompilo', surname: 'Shabalala' },
        { id: '220118', name: 'Lethabo', surname: 'Joubert' },
        { id: '220119', name: 'Keabetswe', surname: 'Tshabalala' },
        { id: '220120', name: 'Thandeka', surname: 'Radebe' },
        { id: '220121', name: 'Amahle', surname: 'Mbeki' },
        { id: '220122', name: 'Siyabonga', surname: 'Vilakazi' },
        { id: '220123', name: 'Nokuthula', surname: 'Cele' },
        { id: '220124', name: 'Lwazi', surname: 'Phiri' },
        { id: '220125', name: 'Busisiwe', surname: 'Ntuli' },
        { id: '220126', name: 'Thulani', surname: 'Mabaso' },
        { id: '220127', name: 'Refilwe', surname: 'Motaung' },
        { id: '220128', name: 'Andile', surname: 'Govender' }
    ];

    static DEMO_SESSIONS = [
        { date: '2025-02-10', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' },
        { date: '2025-02-19', type: 'tutorial',  venue: 'Lab-2', time: '10:00:00' },
        { date: '2025-02-24', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' },
        { date: '2025-03-10', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' },
        { date: '2025-03-12', type: 'tutorial',  venue: 'Lab-2', time: '10:00:00' },
        { date: '2025-03-21', type: 'practical', venue: 'Lab-1', time: '14:00:00' },
        { date: '2025-03-31', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' },
        { date: '2025-04-14', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' },
        { date: '2025-04-16', type: 'tutorial',  venue: 'Lab-2', time: '10:00:00' },
        { date: '2025-04-28', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' },
        { date: '2025-05-09', type: 'practical', venue: 'Lab-1', time: '14:00:00' },
        { date: '2025-05-19', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' },
        { date: '2025-05-21', type: 'tutorial',  venue: 'Lab-2', time: '10:00:00' },
        { date: '2025-06-02', type: 'lecture',   venue: 'LT-A',  time: '08:00:00' }
    ];

    static DP_RULES = {
        threshold: 80,
        riskThreshold: 60,
        minSessions: 3,
        lateWeight: 0.5,
        excusedCounts: true
    };

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._embedded = !!config.embedded;
        this.courseCode = config.courseCode || 'COMP101';
        this.year = config.year || 2025;
        this.dpThreshold = config.dpThreshold || AttendanceDPPanel.DP_RULES.threshold;
        this.dpRiskThreshold = config.dpRiskThreshold || AttendanceDPPanel.DP_RULES.riskThreshold;

        // ── Services (instantiate or get from ServiceRegistry) ──
        this._eventService = config.eventService || new EventService();
        this._groupService = config.groupService || (typeof ServiceRegistry !== 'undefined' && ServiceRegistry.has('group')
            ? ServiceRegistry.get('group') : new GroupService());
        this._memberService = config.memberService || (typeof ServiceRegistry !== 'undefined' && ServiceRegistry.has('member')
            ? ServiceRegistry.get('member') : new MemberService());

        // Register if not already registered
        if (typeof ServiceRegistry !== 'undefined') {
            if (!ServiceRegistry.has('event')) ServiceRegistry.register('event', this._eventService);
            if (!ServiceRegistry.has('group')) ServiceRegistry.register('group', this._groupService);
            if (!ServiceRegistry.has('member')) ServiceRegistry.register('member', this._memberService);
        }

        // ── UIBindings (created after data seeded) ──
        this._eventBinding = null;
        this._attendeeBinding = null;
        this._groupMemberBinding = null;

        // ── State ──
        this._courseGroup = null;
        this._dataLoaded = false;
        this._checkInActive = false;
        this._checkInPin = null;
        this._checkInTimer = null;
        this._selectedSession = 0;

        // ── Bus ──
        this._bus = null;

        // ── UI refs ──
        this._controlEl = null;
        this._stageEl = null;
        this._accordion = null;
        this._inputs = {};
    }

    // ── Service Bindings ─────────────────────────────────────────────────────

    setPublome(publome) {
        this._publome = publome;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    connectBus(bus) {
        this._bus = bus;
        bus.on('load', params => this.load(params));
        return this;
    }

    async load(params = {}) {
        if (params.courseCode !== undefined) this.courseCode = params.courseCode;
        if (params.year !== undefined) this.year = parseInt(params.year, 10);
        this._dataLoaded = false;
        if (this._bus) this._bus.emit('panelStatus', { key: 'attendance', status: 'loading' });
        // Re-seed demo data with updated course context
        this._seedDemoData();
        this._dataLoaded = true;
        if (this._stageEl) this._renderDashboard();
        if (this._bus) this._bus.emit('panelStatus', { key: 'attendance', status: 'done' });
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildAccordion();
        this._renderEmptyStage();
    }

    // ── Demo Data Seeding (into Services) ───────────────────────────────────

    _seedDemoData() {
        const memberTable = this._memberService.table('member');
        const STUDENTS = AttendanceDPPanel.DEMO_STUDENTS;
        const SESSIONS = AttendanceDPPanel.DEMO_SESSIONS;

        // 1. Create members (28 students + 1 lecturer)
        STUDENTS.forEach(s => {
            memberTable.create({
                username: s.id,
                email: `${s.id}@dut4life.ac.za`,
                displayName: `${s.name} ${s.surname}`,
                status: 'active'
            });
        });
        const lecturer = memberTable.create({
            username: 'lecturer1',
            email: 'lecturer@dut.ac.za',
            displayName: 'Dr. A. Naidoo',
            status: 'active'
        });

        // 2. Create course group
        this._courseGroup = this._groupService.createGroup({
            name: this.courseCode,
            code: this.courseCode,
            type: 'course',
            visibility: 'private'
        }, lecturer.idx);

        // 3. Add students + lecturer to group
        memberTable.all().filter(m => m.get('username') !== 'lecturer1')
            .forEach(m => this._groupService.addMember(this._courseGroup.idx, m.idx, 'member'));
        this._groupService.addMember(this._courseGroup.idx, lecturer.idx, 'owner');

        // 4. Create event types
        this._eventService.createEventType({ name: 'Lecture', color: 'var(--ui-primary-500)', icon: 'chalkboard', defaultDuration: 90 });
        this._eventService.createEventType({ name: 'Tutorial', color: 'var(--ui-warning)', icon: 'users', defaultDuration: 60 });
        this._eventService.createEventType({ name: 'Practical', color: 'var(--ui-success)', icon: 'laptop-code', defaultDuration: 120 });

        // 5. Create class sessions as events + attendance
        const typeMap = { lecture: 1, tutorial: 2, practical: 3 };
        const students = memberTable.all().filter(m => m.get('username') !== 'lecturer1');

        // Pre-compute per-student reliability (consistent across sessions)
        const reliabilityMap = {};
        students.forEach(s => {
            reliabilityMap[s.idx] = this._generateReliability();
        });

        SESSIONS.forEach(sess => {
            const typeId = typeMap[sess.type];
            const event = this._eventService.createEvent({
                title: `${this.courseCode} ${sess.type.charAt(0).toUpperCase() + sess.type.slice(1)}`,
                typeId,
                startTime: `${sess.date}T${sess.time}`,
                location: sess.venue,
                groupId: this._courseGroup.idx,
                status: 'completed'
            }, lecturer.idx);

            // 6. Add all students as attendees + generate attendance
            students.forEach(student => {
                this._eventService.addAttendee(event.idx, student.idx, 'attendee');
                const reliability = reliabilityMap[student.idx];
                if (Math.random() < reliability) {
                    this._eventService.checkInAttendee(event.idx, student.idx);
                }
            });
        });

        this._dataLoaded = true;
    }

    /** Box-Muller normal distribution for student reliability */
    _generateReliability() {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(0.3, Math.min(0.98, 0.82 + z * 0.12));
    }

    // ── UIBindings — Wire Services to UI ────────────────────────────────────

    _wireBindings() {
        const eventTable = this._eventService.table('event');
        const attendeeTable = this._eventService.table('eventAttendee');
        const memberTable = this._groupService.table('groupMember');

        // Event (session) binding
        this._eventBinding = new UIBinding(eventTable, { publome: this._eventService });

        // Attendee binding (child of event)
        this._attendeeBinding = new UIBinding(attendeeTable, { publome: this._eventService });

        // Wire parent-child: selecting an event filters attendees
        this._eventBinding.bindChildTable(this._attendeeBinding, 'eventId');

        // Group member binding
        this._groupMemberBinding = new UIBinding(memberTable, { publome: this._groupService });
    }

    // ── Accordion (Control Panel) ───────────────────────────────────────────

    _buildAccordion() {
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            course: {
                label: '<i class="fas fa-graduation-cap as-accordion-icon as-icon-primary"></i>Course & Group',
                open: true
            },
            sessions: {
                label: '<i class="fas fa-calendar-alt as-accordion-icon as-icon-warning"></i>Sessions'
            },
            checkin: {
                label: '<i class="fas fa-qrcode as-accordion-icon as-icon-success"></i>Check-in'
            },
            dpConfig: {
                label: '<i class="fas fa-cogs as-accordion-icon as-icon-muted"></i>DP Configuration'
            }
        };

        this._accordion = new uiAccordion({ exclusive: true, content, parent: el });

        this._renderCoursePane();
        this._renderSessionsPane();
        this._renderCheckInPane();
        this._renderDPConfigPane();
    }

    _getPane(key) {
        if (!this._accordion) return null;
        var item = this._accordion.el.querySelector('.ui-accordion-item[data-key="' + key + '"]');
        return item ? item.querySelector('.ui-accordion-content') : null;
    }

    // ── Course & Group Pane ─────────────────────────────────────────────────

    _renderCoursePane() {
        const pane = this._getPane('course');
        if (!pane) return;
        pane.innerHTML = '';

        // Course badge (hidden in embedded mode)
        if (!this._embedded) {
            const badge = document.createElement('div');
            badge.className = 'cv-mb-md';
            badge.innerHTML = `
                <span class="as-course-code-badge">${this.courseCode}</span>
                <span class="as-course-year-label">${this.year}</span>
            `;
            pane.appendChild(badge);
        }

        // Member count metric (will be bound after data loads)
        const memberCountEl = document.createElement('div');
        memberCountEl.id = 'at-member-count';
        memberCountEl.className = 'as-ctrl-metric-text';
        memberCountEl.textContent = 'No data loaded';
        pane.appendChild(memberCountEl);

        // Load Demo Data button (hidden in embedded mode)
        if (!this._embedded) {
            const loadBtn = document.createElement('div');
            pane.appendChild(loadBtn);
            new uiButton({
                parent: loadBtn,
                label: 'Load Demo Data',
                icon: '<i class="fas fa-database"></i>',
                variant: 'primary',
                size: 'sm',
                onClick: () => this._handleLoadDemo()
            });
        }

        // Import CSV button (hidden in embedded mode)
        if (!this._embedded) {
            const importBtn = document.createElement('div');
            importBtn.className = 'cv-mt-sm';
            pane.appendChild(importBtn);
            new uiButton({
                parent: importBtn,
                label: 'Import CSV',
                icon: '<i class="fas fa-file-csv"></i>',
                variant: 'outline',
                size: 'sm',
                onClick: () => this._renderImportUI()
            });
        }
    }

    _handleLoadDemo() {
        if (this._dataLoaded) return;
        this._seedDemoData();
        this._dataLoaded = true;
        this._wireBindings();

        // Update member count via binding
        const memberCountEl = document.getElementById('at-member-count');
        if (memberCountEl && this._groupMemberBinding) {
            this._groupMemberBinding.bindMetric(memberCountEl, {
                compute: (records) => {
                    const students = records.filter(r => r.get('role') === 'member');
                    return students.length;
                },
                label: 'Enrolled Students',
                template: 'badge',
                color: 'primary'
            });
        }

        // Re-render sessions pane with session cards
        this._renderSessionsPane();
        this._renderCheckInPane();
        this._renderDashboard();
    }

    // ── Sessions Pane ───────────────────────────────────────────────────────

    _renderSessionsPane() {
        const pane = this._getPane('sessions');
        if (!pane) return;
        pane.innerHTML = '';

        if (!this._dataLoaded) {
            pane.innerHTML = '<div class="as-empty-hint">Load data to see sessions</div>';
            return;
        }

        // Session list via bindCollection
        const listEl = document.createElement('div');
        listEl.className = 'as-scroll-list-300';
        pane.appendChild(listEl);

        const eventTable = this._eventService.table('event');
        const events = eventTable.all()
            .filter(e => e.get('groupId') === this._courseGroup?.idx)
            .sort((a, b) => (a.get('startTime') || '').localeCompare(b.get('startTime') || ''));

        events.forEach((evt, i) => {
            const card = document.createElement('div');
            card.className = 'at-session-card' + (i === this._selectedSession ? ' at-active' : '');
            card.dataset.eventId = evt.idx;

            const dateStr = (evt.get('startTime') || '').substring(0, 10);
            const typeName = this._getEventTypeName(evt.get('typeId')).toLowerCase();
            const typeClass = typeName;
            const attendees = this._eventService.getEventAttendees(evt.idx);
            const checkedIn = attendees.filter(a => a.get('checkedIn')).length;
            const total = attendees.length;
            const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

            card.innerHTML = `
                <div class="as-flex-row-between">
                    <div>
                        <span class="at-session-type-badge ${typeClass}">${typeName}</span>
                        <span class="as-session-date-label">${dateStr}</span>
                    </div>
                    <span class="as-session-venue-label">${evt.get('location') || ''}</span>
                </div>
                <div class="as-session-count-label">
                    ${checkedIn}/${total} present (${pct}%)
                </div>
            `;
            card.addEventListener('click', () => this._selectSession(evt.idx, i));
            listEl.appendChild(card);
        });

        // Add Session button
        const addBtnEl = document.createElement('div');
        addBtnEl.className = 'cv-mt-sm';
        pane.appendChild(addBtnEl);
        new uiButton({
            parent: addBtnEl,
            label: 'Add Session',
            icon: '<i class="fas fa-plus"></i>',
            variant: 'outline',
            size: 'sm',
            onClick: () => this._handleAddSession()
        });
    }

    _selectSession(eventId, index) {
        this._selectedSession = index;
        // Select in the event table (triggers UIBinding reactivity)
        const eventTable = this._eventService.table('event');
        eventTable.select(eventId);

        // Update active card styling
        const cards = this._controlEl.querySelectorAll('.at-session-card');
        cards.forEach(c => c.classList.remove('at-active'));
        const activeCard = this._controlEl.querySelector(`.at-session-card[data-event-id="${eventId}"]`);
        if (activeCard) activeCard.classList.add('at-active');

        // Refresh the session detail tab if visible
        this._refreshActiveTab();
    }

    _handleAddSession() {
        if (!this._dataLoaded || !this._eventBinding) return;
        UIBinding.openCreateModal(this._eventService.table('event'), {
            publome: this._eventService,
            title: 'Add Session'
        });
    }

    // ── Check-in Pane ───────────────────────────────────────────────────────

    _renderCheckInPane() {
        const pane = this._getPane('checkin');
        if (!pane) return;
        pane.innerHTML = '';

        if (!this._dataLoaded) {
            pane.innerHTML = '<div class="as-empty-hint">Load data first</div>';
            return;
        }

        // Start/Stop check-in button
        const btnEl = document.createElement('div');
        pane.appendChild(btnEl);
        this._checkInBtnEl = btnEl;
        this._renderCheckInButton();

        // Status text
        const statusEl = document.createElement('div');
        statusEl.className = 'as-checkin-status-text';
        pane.appendChild(statusEl);

        if (this._checkInActive && this._checkInPin) {
            statusEl.innerHTML = `
                <div class="as-checkin-active-label">Check-in Active</div>
                <div class="as-checkin-pin-display">${this._checkInPin}</div>
            `;

            // QR container (bound via UIBinding.bindQR) — only shown during active check-in
            const qrWrap = document.createElement('div');
            qrWrap.className = 'as-checkin-qr-wrap';
            pane.appendChild(qrWrap);

            this._eventBinding.bindQR(qrWrap, {
                dataFn: (record) => {
                    const pin = record.get('metadata')?.checkInPin || '';
                    return `checkin:${record.idx}:${pin}:${this.courseCode}`;
                },
                size: 120,
                color: '#1565C0'
            });
        } else {
            const eventTable = this._eventService.table('event');
            const selected = eventTable.getSelectedOne();
            if (selected) {
                statusEl.textContent = `Session: ${selected.get('title')} — ready to start`;
            } else {
                statusEl.textContent = 'Select a session, then start check-in';
            }
        }
    }

    _renderCheckInButton() {
        if (!this._checkInBtnEl) return;
        this._checkInBtnEl.innerHTML = '';
        const isActive = this._checkInActive;
        new uiButton({
            parent: this._checkInBtnEl,
            label: isActive ? 'Stop Check-in' : 'Start Check-in',
            icon: isActive ? '<i class="fas fa-stop"></i>' : '<i class="fas fa-play"></i>',
            variant: isActive ? 'danger' : 'success',
            size: 'sm',
            onClick: () => isActive ? this._stopCheckIn() : this._startCheckIn()
        });
    }

    _startCheckIn() {
        const eventTable = this._eventService.table('event');
        const selected = eventTable.getSelectedOne();
        if (!selected) {
            new uiToast({ message: 'Select a session first', color: 'warning' });
            return;
        }

        // Generate 6-digit PIN
        this._checkInPin = String(Math.floor(100000 + Math.random() * 900000));
        this._checkInActive = true;

        // Store PIN in event metadata (spread to create new object for change detection)
        const oldMeta = selected.get('metadata') || {};
        const newMeta = { ...oldMeta, checkInPin: this._checkInPin };
        eventTable.update(selected.idx, { metadata: newMeta, status: 'in-progress' });

        this._renderCheckInPane();
        this._switchToTab(4); // Check-in tab
    }

    _stopCheckIn() {
        const eventTable = this._eventService.table('event');
        const selected = eventTable.getSelectedOne();
        if (selected) {
            // Clear PIN from metadata and set status back to completed
            const oldMeta = selected.get('metadata') || {};
            const newMeta = { ...oldMeta };
            delete newMeta.checkInPin;
            eventTable.update(selected.idx, { metadata: newMeta, status: 'completed' });
        }

        this._checkInActive = false;
        this._checkInPin = null;
        if (this._checkInTimer) {
            clearInterval(this._checkInTimer);
            this._checkInTimer = null;
        }

        this._renderCheckInPane();
        this._refreshActiveTab();
    }

    // ── DP Configuration Pane ───────────────────────────────────────────────

    _renderDPConfigPane() {
        const pane = this._getPane('dpConfig');
        if (!pane) return;
        pane.innerHTML = '';

        // DP Threshold slider
        const threshWrap = document.createElement('div');
        threshWrap.className = 'cv-mb-md';
        pane.appendChild(threshWrap);
        const threshLabel = document.createElement('div');
        threshLabel.className = 'as-ctrl-label';
        threshLabel.textContent = `DP Threshold: ${this.dpThreshold}%`;
        threshWrap.appendChild(threshLabel);
        this._inputs.dpThreshold = new uiSlider({
            parent: threshWrap,
            min: 50, max: 100, value: this.dpThreshold, step: 5,
            size: 'sm'
        });
        this._inputs.dpThreshold.bus.on('change', (e) => {
            this.dpThreshold = e.value;
            threshLabel.textContent = `DP Threshold: ${e.value}%`;
            this._refreshActiveTab();
        });

        // Risk Threshold slider
        const riskWrap = document.createElement('div');
        riskWrap.className = 'cv-mb-md';
        pane.appendChild(riskWrap);
        const riskLabel = document.createElement('div');
        riskLabel.className = 'as-ctrl-label';
        riskLabel.textContent = `Risk Threshold: ${this.dpRiskThreshold}%`;
        riskWrap.appendChild(riskLabel);
        this._inputs.dpRisk = new uiSlider({
            parent: riskWrap,
            min: 30, max: 90, value: this.dpRiskThreshold, step: 5,
            size: 'sm'
        });
        this._inputs.dpRisk.bus.on('change', (e) => {
            this.dpRiskThreshold = e.value;
            riskLabel.textContent = `Risk Threshold: ${e.value}%`;
            this._refreshActiveTab();
        });

        // Min sessions
        const minWrap = document.createElement('div');
        pane.appendChild(minWrap);
        const minLabel = document.createElement('div');
        minLabel.className = 'as-ctrl-label';
        minLabel.textContent = 'Min Sessions for DP:';
        minWrap.appendChild(minLabel);
        this._inputs.minSessions = new uiInput({
            parent: minWrap, inputType: 'number', value: '3', size: 'sm',
            placeholder: 'Min sessions'
        });
    }

    // ── Empty Stage ─────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = `
            <div class="as-empty-stage">
                <div class="as-empty-stage-inner">
                    <i class="fas fa-calendar-check as-empty-stage-icon"></i>
                    <div class="as-empty-stage-title">Attendance & DP Panel</div>
                    <div class="as-empty-stage-hint">Click <b>Load Demo Data</b> to populate with 28 students, 14 sessions</div>
                </div>
            </div>
        `;
    }

    // ── Dashboard (Stage) ───────────────────────────────────────────────────

    _renderDashboard() {
        const stage = this._stageEl;
        stage.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML = `
            <div>
                <span class="as-course-code-badge">${this.courseCode}</span>
                <span class="as-course-year-label">Attendance & DP Status</span>
            </div>
        `;
        stage.appendChild(header);

        // KPI cards
        this._renderKPICards(stage);

        // Tabs
        const tabWrap = document.createElement('div');
        stage.appendChild(tabWrap);

        const tabContent = {
            grid: { label: '<i class="fas fa-th as-tab-icon"></i>Attendance Grid' },
            detail: { label: '<i class="fas fa-chart-pie as-tab-icon"></i>Session Detail' },
            dp: { label: '<i class="fas fa-exclamation-triangle as-tab-icon"></i>DP Status' },
            trends: { label: '<i class="fas fa-chart-line as-tab-icon"></i>Trends' },
            checkinTab: { label: '<i class="fas fa-qrcode as-tab-icon"></i>Check-in' }
        };

        this._tabs = new uiTabs({
            parent: tabWrap,
            content: tabContent,
            template: 'underline',
            size: 'sm'
        });

        const contentEl = document.createElement('div');
        contentEl.className = 'cv-mt-md';
        stage.appendChild(contentEl);
        this._tabContentEl = contentEl;

        this._tabs.bus.on('tabChange', (e) => {
            this._activeTabKey = e.tab;
            this._renderTabContent(e.tab);
        });

        this._activeTabKey = 'grid';
        this._renderTabContent('grid');
    }

    _switchToTab(index) {
        const keys = ['grid', 'detail', 'dp', 'trends', 'checkinTab'];
        const key = keys[index] || 'grid';
        if (this._tabs) {
            this._tabs._activateTab(key);
            this._activeTabKey = key;
            this._renderTabContent(key);
        }
    }

    _refreshActiveTab() {
        if (this._activeTabKey && this._tabContentEl) {
            this._renderTabContent(this._activeTabKey);
        }
    }

    _renderTabContent(key) {
        if (!this._tabContentEl) return;
        this._tabContentEl.innerHTML = '';
        switch (key) {
            case 'grid':       this._renderAttendanceGrid(this._tabContentEl); break;
            case 'detail':     this._renderSessionDetail(this._tabContentEl); break;
            case 'dp':         this._renderDPStatus(this._tabContentEl); break;
            case 'trends':     this._renderTrends(this._tabContentEl); break;
            case 'checkinTab': this._renderCheckInTab(this._tabContentEl); break;
        }
    }

    // ── KPI Cards ───────────────────────────────────────────────────────────

    _renderKPICards(container) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        container.appendChild(row);

        const events = this._getCourseEvents();
        const students = this._getCourseStudents();
        const totalSessions = events.length;
        const totalStudents = students.length;

        // Overall attendance rate
        let totalChecked = 0, totalPossible = 0;
        events.forEach(evt => {
            const attendees = this._eventService.getEventAttendees(evt.idx);
            totalChecked += attendees.filter(a => a.get('checkedIn')).length;
            totalPossible += attendees.length;
        });
        const overallRate = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

        // DP stats
        let okCount = 0, riskCount = 0, excludedCount = 0;
        students.forEach(gm => {
            const dp = this._computeDP(gm.get('memberId'));
            if (dp.status === 'OK') okCount++;
            else if (dp.status === 'Risk') riskCount++;
            else excludedCount++;
        });

        this._bindKPIs(row, [
            { code: 'students', value: String(totalStudents), label: 'Students', icon: 'fas fa-users', color: 'var(--ui-info)' },
            { code: 'sessions', value: String(totalSessions), label: 'Sessions', icon: 'fas fa-calendar', color: 'var(--ui-secondary)' },
            { code: 'attendance', value: `${overallRate}%`, label: 'Attendance', icon: 'fas fa-chart-bar', color: 'var(--ui-success)' },
            { code: 'dpOk', value: String(okCount), label: 'DP OK', icon: 'fas fa-check-circle', color: 'var(--ui-success)' },
            { code: 'excluded', value: String(excludedCount), label: 'Excluded', icon: 'fas fa-exclamation-triangle', color: 'var(--ui-danger)' }
        ]);
    }

    // ── Tab 1: Attendance Grid ──────────────────────────────────────────────

    _renderAttendanceGrid(container) {
        const events = this._getCourseEvents();
        const students = this._getCourseStudents();
        if (events.length === 0 || students.length === 0) {
            container.innerHTML = '<div class="as-empty-hint cv-p-md">No data available</div>';
            return;
        }

        const wrap = document.createElement('div');
        wrap.className = 'as-scroll-grid-500';
        container.appendChild(wrap);

        let html = '<table class="at-attend-grid"><thead><tr>';
        html += '<th class="at-grid-sticky-header">Student</th>';
        events.forEach(evt => {
            const dateStr = (evt.get('startTime') || '').substring(5, 10);
            const typeName = this._getEventTypeName(evt.get('typeId')).toLowerCase();
            html += `<th><span class="at-session-type-badge ${typeName}">${typeName.charAt(0).toUpperCase()}</span><br>${dateStr}</th>`;
        });
        html += '<th>%</th><th>DP</th></tr></thead><tbody>';

        // Resolve member names
        const memberTable = this._memberService.table('member');

        students.forEach(gm => {
            const memberId = gm.get('memberId');
            const member = memberTable.read(memberId);
            const name = member ? member.get('displayName') : `#${memberId}`;
            const dp = this._computeDP(memberId);
            const rowClass = dp.status === 'OK' ? 'at-dp-ok' : dp.status === 'Risk' ? 'at-dp-risk' : 'at-dp-excluded';

            html += `<tr class="${rowClass}">`;
            html += `<td class="at-grid-sticky-name">${name}</td>`;

            events.forEach(evt => {
                const attendee = this._getAttendeeRecord(evt.idx, memberId);
                const isPresent = attendee?.get('checkedIn');
                const mark = isPresent ? 'P' : 'A';
                const cls = isPresent ? 'at-present' : 'at-absent';
                html += `<td><span class="at-mark-btn ${cls}" data-event-id="${evt.idx}" data-member-id="${memberId}">${mark}</span></td>`;
            });

            html += `<td class="at-grid-pct">${this._r(dp.pct)}%</td>`;
            const dpStatusClass = dp.status === 'OK' ? 'as-status-present' : dp.status === 'Risk' ? 'as-status-warning' : 'as-status-absent';
            html += `<td><span class="at-grid-dp-badge ${dpStatusClass}">${dp.status}</span></td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        wrap.innerHTML = html;

        // Wire toggle clicks
        wrap.querySelectorAll('.at-mark-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const eventId = parseInt(btn.dataset.eventId);
                const memberId = parseInt(btn.dataset.memberId);
                this._handleMarkToggle(btn, eventId, memberId);
            });
        });
    }

    _handleMarkToggle(cell, eventId, memberId) {
        const attendee = this._getAttendeeRecord(eventId, memberId);
        if (!attendee) return;

        const currentState = attendee.get('checkedIn');

        if (currentState) {
            // Uncheck: set checkedIn to false via direct table update
            this._eventService.table('eventAttendee').update(attendee.idx, {
                checkedIn: false, checkedInAt: null
            });
            cell.className = 'at-mark-btn at-absent';
            cell.textContent = 'A';
        } else {
            // Check in via service method
            this._eventService.checkInAttendee(eventId, memberId);
            cell.className = 'at-mark-btn at-present';
            cell.textContent = 'P';
        }

        // Update DP for this student's row
        this._recalculateStudentDP(memberId);
    }

    _recalculateStudentDP(memberId) {
        const dp = this._computeDP(memberId);
        // Find the row containing this member's DP cells
        const grid = this._stageEl.querySelector('.at-attend-grid');
        if (!grid) return;

        const rows = grid.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const firstBtn = row.querySelector('.at-mark-btn');
            if (firstBtn && parseInt(firstBtn.dataset.memberId) === memberId) {
                const cells = row.querySelectorAll('td');
                const pctCell = cells[cells.length - 2];
                const dpCell = cells[cells.length - 1];
                if (pctCell) pctCell.innerHTML = `<span class="at-grid-pct-inner">${this._r(dp.pct)}%</span>`;
                const dpStatusClass = dp.status === 'OK' ? 'as-status-present' : dp.status === 'Risk' ? 'as-status-warning' : 'as-status-absent';
                if (dpCell) dpCell.innerHTML = `<span class="at-grid-dp-badge ${dpStatusClass}">${dp.status}</span>`;
                row.className = dp.status === 'OK' ? 'at-dp-ok' : dp.status === 'Risk' ? 'at-dp-risk' : 'at-dp-excluded';
            }
        });

        // Re-render sessions pane counts
        this._renderSessionsPane();
    }

    // ── Tab 2: Session Detail ───────────────────────────────────────────────

    _renderSessionDetail(container) {
        const eventTable = this._eventService.table('event');
        const selected = eventTable.getSelectedOne();
        if (!selected) {
            container.innerHTML = '<div class="as-empty-hint cv-p-md">Select a session in the sidebar to view details</div>';
            return;
        }

        const attendees = this._eventService.getEventAttendees(selected.idx);
        const present = attendees.filter(a => a.get('checkedIn')).length;
        const absent = attendees.length - present;
        const pct = attendees.length > 0 ? Math.round((present / attendees.length) * 100) : 0;

        const dateStr = (selected.get('startTime') || '').substring(0, 10);
        const typeName = this._getEventTypeName(selected.get('typeId'));

        // Header
        const headerEl = document.createElement('div');
        headerEl.className = 'cv-mb-lg';
        headerEl.innerHTML = `
            <div class="as-detail-title">${selected.get('title')}</div>
            <div class="as-detail-subtitle">${dateStr} &bull; ${selected.get('location') || ''} &bull; <span class="at-session-type-badge ${typeName.toLowerCase()}">${typeName}</span></div>
        `;
        container.appendChild(headerEl);

        // Donut + stats row
        const row = document.createElement('div');
        row.className = 'as-detail-row';
        container.appendChild(row);

        const donutEl = document.createElement('div');
        row.appendChild(donutEl);
        this._renderSessionDonut(donutEl, present, absent);

        // Quick actions
        const actionsEl = document.createElement('div');
        actionsEl.className = 'as-actions-col';
        row.appendChild(actionsEl);

        const markAllBtn = document.createElement('div');
        actionsEl.appendChild(markAllBtn);
        new uiButton({
            parent: markAllBtn, label: 'Mark All Present', variant: 'success', size: 'sm',
            icon: '<i class="fas fa-check-double"></i>',
            onClick: () => {
                attendees.forEach(a => {
                    if (!a.get('checkedIn')) {
                        this._eventService.checkInAttendee(selected.idx, a.get('memberId'));
                    }
                });
                this._renderSessionDetail(container);
                this._renderSessionsPane();
            }
        });

        const clearAllBtn = document.createElement('div');
        actionsEl.appendChild(clearAllBtn);
        new uiButton({
            parent: clearAllBtn, label: 'Clear All', variant: 'outline', size: 'sm',
            icon: '<i class="fas fa-times"></i>',
            onClick: () => {
                attendees.forEach(a => {
                    this._eventService.table('eventAttendee').update(a.idx, { checkedIn: false, checkedInAt: null });
                });
                this._renderSessionDetail(container);
                this._renderSessionsPane();
            }
        });

        // Student list
        const listTitle = document.createElement('div');
        listTitle.className = 'at-section-title';
        listTitle.textContent = `Students (${present}/${attendees.length} present)`;
        container.appendChild(listTitle);

        const listEl = document.createElement('div');
        listEl.className = 'as-student-list-scroll';
        container.appendChild(listEl);

        const memberTable = this._memberService.table('member');
        attendees.sort((a, b) => {
            const mA = memberTable.read(a.get('memberId'));
            const mB = memberTable.read(b.get('memberId'));
            return (mA?.get('displayName') || '').localeCompare(mB?.get('displayName') || '');
        }).forEach(att => {
            const member = memberTable.read(att.get('memberId'));
            const name = member ? member.get('displayName') : `#${att.get('memberId')}`;
            const isPresent = att.get('checkedIn');
            const timeStr = att.get('checkedInAt') ? new Date(att.get('checkedInAt')).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

            const item = document.createElement('div');
            item.className = `as-attendee-row ${isPresent ? 'as-attendee-present' : 'as-attendee-absent'}`;
            item.innerHTML = `
                <span class="as-attendee-name">${name}</span>
                <span class="as-attendee-status ${isPresent ? 'as-status-present' : 'as-status-absent'}">${isPresent ? 'Present' : 'Absent'}${timeStr ? ` (${timeStr})` : ''}</span>
            `;
            listEl.appendChild(item);
        });
    }

    _renderSessionDonut(container, present, absent) {
        const total = present + absent;
        if (total === 0) { container.innerHTML = '<div class="as-empty-hint">No data</div>'; return; }

        const W = 180, H = 180;
        const cx = W / 2, cy = H / 2, outerR = 70, innerR = 40;
        const pct = Math.round((present / total) * 100);

        const segments = [
            { count: present, color: 'var(--ui-success)', label: 'Present' },
            { count: absent, color: 'var(--ui-danger)', label: 'Absent' }
        ].filter(s => s.count > 0);

        let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;">`;

        let startAngle = -Math.PI / 2;
        segments.forEach(seg => {
            const frac = seg.count / total;
            const endAngle = startAngle + frac * 2 * Math.PI;
            const x1 = cx + outerR * Math.cos(startAngle);
            const y1 = cy + outerR * Math.sin(startAngle);
            const x2 = cx + outerR * Math.cos(endAngle);
            const y2 = cy + outerR * Math.sin(endAngle);
            const ix1 = cx + innerR * Math.cos(endAngle);
            const iy1 = cy + innerR * Math.sin(endAngle);
            const ix2 = cx + innerR * Math.cos(startAngle);
            const iy2 = cy + innerR * Math.sin(startAngle);
            const largeArc = frac > 0.5 ? 1 : 0;
            const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
            svg += `<path d="${d}" fill="${seg.color}" opacity="0.8"/>`;
            startAngle = endAngle;
        });

        svg += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ui-gray-800)">${pct}%</text>`;
        svg += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="var(--ui-gray-500)">attendance</text>`;
        svg += '</svg>';

        // Legend
        let legend = '<div class="as-chart-legend">';
        segments.forEach(s => {
            legend += `<div class="as-chart-legend-item">
                <span class="as-chart-legend-dot" style="background:${s.color}"></span>
                ${s.label} (${s.count})
            </div>`;
        });
        legend += '</div>';

        container.innerHTML = svg + legend;
    }

    // ── Tab 3: DP Status ────────────────────────────────────────────────────

    _renderDPStatus(container) {
        const students = this._getCourseStudents();
        const memberTable = this._memberService.table('member');

        const tableData = students.map(gm => {
            const memberId = gm.get('memberId');
            const member = memberTable.read(memberId);
            const dp = this._computeDP(memberId);
            return {
                name: member ? member.get('displayName') : `#${memberId}`,
                studentId: member ? member.get('username') : '',
                attended: dp.attended,
                total: dp.total,
                pct: this._r(dp.pct),
                status: dp.status
            };
        }).sort((a, b) => a.pct - b.pct); // Worst first

        const columns = [
            { key: 'name', label: 'Student', sortable: true },
            { key: 'studentId', label: 'ID', sortable: true },
            { key: 'attended', label: 'Attended', sortable: true },
            { key: 'total', label: 'Total', sortable: true },
            { key: 'pct', label: '%', sortable: true, render: (val) => `<span style="font-weight:700;">${val}%</span>` },
            {
                key: 'status', label: 'DP Status', sortable: true,
                render: (val) => {
                    const color = val === 'OK' ? 'var(--ui-success)' : val === 'Risk' ? 'var(--ui-warning)' : 'var(--ui-danger)';
                    const bg = val === 'OK' ? 'var(--ui-success-light)' : val === 'Risk' ? 'var(--ui-warning-light)' : 'var(--ui-danger-light)';
                    return `<span style="font-size:0.7rem;font-weight:700;color:${color};background:${bg};padding:1px 8px;border-radius:3px;">${val}</span>`;
                }
            }
        ];

        const tableWrap = document.createElement('div');
        container.appendChild(tableWrap);
        new uiTable({
            parent: tableWrap,
            columns,
            data: tableData,
            template: 'compact',
            paging: true,
            searching: true,
            ordering: true,
            pageLength: 15,
            buttons: false
        });

        // Summary
        const ok = tableData.filter(d => d.status === 'OK').length;
        const risk = tableData.filter(d => d.status === 'Risk').length;
        const excl = tableData.filter(d => d.status === 'Excluded').length;

        const summary = document.createElement('div');
        summary.className = 'as-dp-summary-row';
        summary.innerHTML = `
            <span class="as-dp-stat as-status-present"><i class="fas fa-check-circle"></i> OK: ${ok}</span>
            <span class="as-dp-stat as-status-warning"><i class="fas fa-exclamation-circle"></i> Risk: ${risk}</span>
            <span class="as-dp-stat as-status-absent"><i class="fas fa-times-circle"></i> Excluded: ${excl}</span>
            <span class="as-dp-stat-muted">Threshold: ${this.dpThreshold}% | Risk: ${this.dpRiskThreshold}%</span>
        `;
        container.appendChild(summary);
    }

    // ── Tab 4: Trends ───────────────────────────────────────────────────────

    _renderTrends(container) {
        const events = this._getCourseEvents();
        if (events.length === 0) {
            container.innerHTML = '<div class="as-empty-hint cv-p-md">No session data available</div>';
            return;
        }

        // Session-by-session attendance line chart
        const title1 = document.createElement('div');
        title1.className = 'at-section-title';
        title1.textContent = 'Session Attendance Rate';
        container.appendChild(title1);

        const chartEl = document.createElement('div');
        container.appendChild(chartEl);
        this._renderTrendLineChart(chartEl, events);

        // Weekday heatmap
        const title2 = document.createElement('div');
        title2.className = 'at-section-title';
        title2.textContent = 'Weekday Heatmap';
        container.appendChild(title2);

        const heatEl = document.createElement('div');
        container.appendChild(heatEl);
        this._renderWeekdayHeatmap(heatEl, events);
    }

    _renderTrendLineChart(container, events) {
        const W = 500, H = 180;
        const pad = { left: 35, right: 10, top: 10, bottom: 28 };
        const cW = W - pad.left - pad.right;
        const cH = H - pad.top - pad.bottom;

        // Compute attendance % per session
        const data = events.map(evt => {
            const attendees = this._eventService.getEventAttendees(evt.idx);
            const total = attendees.length;
            const present = attendees.filter(a => a.get('checkedIn')).length;
            return {
                date: (evt.get('startTime') || '').substring(5, 10),
                pct: total > 0 ? (present / total) * 100 : 0
            };
        });

        let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:${W}px;">`;

        // Grid lines
        for (let y = 0; y <= 100; y += 25) {
            const yPos = pad.top + cH - (y / 100) * cH;
            svg += `<line x1="${pad.left}" y1="${yPos}" x2="${W - pad.right}" y2="${yPos}" stroke="var(--ui-gray-200)" stroke-width="0.5"/>`;
            svg += `<text x="${pad.left - 4}" y="${yPos + 3}" text-anchor="end" font-size="8" fill="var(--ui-gray-400)">${y}%</text>`;
        }

        // DP threshold line
        const threshY = pad.top + cH - (this.dpThreshold / 100) * cH;
        svg += `<line x1="${pad.left}" y1="${threshY}" x2="${W - pad.right}" y2="${threshY}" stroke="var(--ui-danger)" stroke-width="1" stroke-dasharray="4,3"/>`;
        svg += `<text x="${W - pad.right + 2}" y="${threshY + 3}" font-size="7" fill="var(--ui-danger)">DP ${this.dpThreshold}%</text>`;

        // Area fill + line
        const points = data.map((d, i) => {
            const x = pad.left + (i / (data.length - 1 || 1)) * cW;
            const y = pad.top + cH - (d.pct / 100) * cH;
            return { x, y };
        });

        if (points.length > 1) {
            let areaPath = `M ${points[0].x} ${pad.top + cH}`;
            points.forEach(p => { areaPath += ` L ${p.x} ${p.y}`; });
            areaPath += ` L ${points[points.length - 1].x} ${pad.top + cH} Z`;
            svg += `<path d="${areaPath}" fill="var(--ui-primary-100)" opacity="0.5"/>`;

            let linePath = `M ${points[0].x} ${points[0].y}`;
            points.slice(1).forEach(p => { linePath += ` L ${p.x} ${p.y}`; });
            svg += `<path d="${linePath}" fill="none" stroke="var(--ui-primary-500)" stroke-width="2"/>`;
        }

        // Dots + labels
        points.forEach((p, i) => {
            const color = data[i].pct >= this.dpThreshold ? 'var(--ui-success)' : data[i].pct >= this.dpRiskThreshold ? 'var(--ui-warning)' : 'var(--ui-danger)';
            svg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${color}" stroke="white" stroke-width="1"/>`;
            svg += `<text x="${p.x}" y="${H - 4}" text-anchor="middle" font-size="7" fill="var(--ui-gray-400)" transform="rotate(-45 ${p.x} ${H - 4})">${data[i].date}</text>`;
        });

        svg += '</svg>';
        container.innerHTML = svg;
    }

    _renderWeekdayHeatmap(container, events) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const dayData = days.map(() => ({ total: 0, present: 0 }));

        events.forEach(evt => {
            const dateStr = evt.get('startTime');
            if (!dateStr) return;
            const dayOfWeek = new Date(dateStr).getDay(); // 0=Sun
            const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0
            if (idx >= 5) return; // Skip weekends

            const attendees = this._eventService.getEventAttendees(evt.idx);
            dayData[idx].total += attendees.length;
            dayData[idx].present += attendees.filter(a => a.get('checkedIn')).length;
        });

        const W = 300, H = 60, cellW = W / 5, cellH = 30;
        let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:${W}px;">`;

        days.forEach((day, i) => {
            const pct = dayData[i].total > 0 ? dayData[i].present / dayData[i].total : 0;
            const r = Math.round(239 - pct * 200);
            const g = Math.round(239 - pct * 50);
            const b = Math.round(239 - pct * 200);
            const fill = `rgb(${r},${g},${b})`;
            const x = i * cellW;

            svg += `<rect x="${x + 2}" y="0" width="${cellW - 4}" height="${cellH}" rx="4" fill="${fill}"/>`;
            svg += `<text x="${x + cellW / 2}" y="${cellH / 2 + 4}" text-anchor="middle" font-size="10" font-weight="600" fill="white">${Math.round(pct * 100)}%</text>`;
            svg += `<text x="${x + cellW / 2}" y="${cellH + 14}" text-anchor="middle" font-size="9" fill="var(--ui-gray-500)">${day}</text>`;
        });

        svg += '</svg>';
        container.innerHTML = svg;
    }

    // ── Tab 5: Check-in ─────────────────────────────────────────────────────

    _renderCheckInTab(container) {
        const eventTable = this._eventService.table('event');
        const selected = eventTable.getSelectedOne();

        if (!selected) {
            container.innerHTML = '<div class="as-empty-stage-centered">Select a session and click "Start Check-in" in the sidebar</div>';
            return;
        }

        if (!this._checkInActive) {
            container.innerHTML = `
                <div class="as-empty-stage-centered">
                    <i class="fas fa-qrcode as-empty-stage-icon"></i>
                    Session selected: <b>${selected.get('title')}</b><br>
                    Click <b>Start Check-in</b> in the sidebar to begin
                </div>
            `;
            return;
        }

        // Full check-in display
        const display = document.createElement('div');
        display.className = 'at-checkin-display';
        container.appendChild(display);

        // PIN display
        const pinEl = document.createElement('div');
        pinEl.className = 'at-checkin-pin';
        pinEl.textContent = this._checkInPin || '------';
        display.appendChild(pinEl);

        const pinLabel = document.createElement('div');
        pinLabel.className = 'at-checkin-label';
        pinLabel.textContent = 'Check-in PIN';
        display.appendChild(pinLabel);

        // QR Code (large, via uiQRCode)
        const qrWrap = document.createElement('div');
        qrWrap.className = 'as-checkin-qr-wrap-lg';
        display.appendChild(qrWrap);
        new uiQRCode({
            parent: qrWrap,
            data: `checkin:${selected.idx}:${this._checkInPin}:${this.courseCode}`,
            size: 200,
            color: '#1565C0'
        });

        const qrLabel = document.createElement('div');
        qrLabel.className = 'at-checkin-label';
        qrLabel.textContent = 'Scan to check in';
        display.appendChild(qrLabel);

        // Live attendance dots
        const dotsTitle = document.createElement('div');
        dotsTitle.className = 'as-checkin-dots-title';
        dotsTitle.textContent = 'Live Attendance';
        display.appendChild(dotsTitle);

        const dotsEl = document.createElement('div');
        dotsEl.className = 'at-checkin-live';
        dotsEl.id = 'at-checkin-dots';
        display.appendChild(dotsEl);

        const attendees = this._eventService.getEventAttendees(selected.idx);
        attendees.forEach(att => {
            const dot = document.createElement('div');
            dot.className = 'at-checkin-dot' + (att.get('checkedIn') ? ' at-checked' : '');
            dot.dataset.memberId = att.get('memberId');
            dot.title = this._getMemberName(att.get('memberId'));
            dotsEl.appendChild(dot);
        });

        // Simulate button
        const simBtnWrap = document.createElement('div');
        simBtnWrap.className = 'cv-mt-md';
        display.appendChild(simBtnWrap);
        new uiButton({
            parent: simBtnWrap,
            label: 'Simulate Check-ins',
            icon: '<i class="fas fa-bolt"></i>',
            variant: 'outline',
            size: 'sm',
            onClick: () => this._simulateCheckIns(selected.idx)
        });

        // Count display
        const countEl = document.createElement('div');
        countEl.id = 'at-checkin-count';
        countEl.className = 'as-checkin-count-text';
        const checkedCount = attendees.filter(a => a.get('checkedIn')).length;
        countEl.textContent = `${checkedCount} / ${attendees.length} checked in`;
        display.appendChild(countEl);
    }

    _simulateCheckIns(eventId) {
        const attendees = this._eventService.getEventAttendees(eventId);
        const unchecked = attendees.filter(a => !a.get('checkedIn'));
        if (unchecked.length === 0) return;

        // Shuffle and check in one at a time
        const shuffled = unchecked.sort(() => Math.random() - 0.5);
        let i = 0;

        if (this._checkInTimer) clearInterval(this._checkInTimer);
        this._checkInTimer = setInterval(() => {
            if (i >= shuffled.length || !this._checkInActive) {
                clearInterval(this._checkInTimer);
                this._checkInTimer = null;
                return;
            }

            const att = shuffled[i];
            this._eventService.checkInAttendee(eventId, att.get('memberId'));

            // Update dot
            const dotsEl = document.getElementById('at-checkin-dots');
            if (dotsEl) {
                const dot = dotsEl.querySelector(`[data-member-id="${att.get('memberId')}"]`);
                if (dot) dot.classList.add('at-checked');
            }

            // Update count
            const countEl = document.getElementById('at-checkin-count');
            if (countEl) {
                const allAtt = this._eventService.getEventAttendees(eventId);
                const checked = allAtt.filter(a => a.get('checkedIn')).length;
                countEl.textContent = `${checked} / ${allAtt.length} checked in`;
            }

            i++;
        }, 800);
    }

    // ── CSV Import ──────────────────────────────────────────────────────────

    _renderImportUI() {
        const container = this._stageEl;
        container.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'as-detail-title cv-mb-md';
        title.textContent = 'Import Attendance CSV';
        container.appendChild(title);

        const desc = document.createElement('div');
        desc.className = 'as-empty-hint cv-mb-md';
        desc.textContent = 'Upload a CSV file with columns: StudentID, Date, Status (P/A/L/E)';
        container.appendChild(desc);

        const textWrap = document.createElement('div');
        container.appendChild(textWrap);
        const textarea = new uiTextarea({
            parent: textWrap,
            placeholder: 'StudentID,Date,Status\n220101,2025-02-10,P\n220102,2025-02-10,A',
            rows: 10,
            size: 'sm'
        });

        const btnRow = document.createElement('div');
        btnRow.className = 'as-flex-row cv-mt-md';
        container.appendChild(btnRow);

        new uiButton({
            parent: btnRow, label: 'Preview', variant: 'outline', size: 'sm',
            onClick: () => {
                const val = textarea.el.querySelector('textarea')?.value || '';
                this._previewCSV(val, container);
            }
        });

        new uiButton({
            parent: btnRow, label: 'Back to Dashboard', variant: 'outline', size: 'sm',
            onClick: () => { if (this._dataLoaded) this._renderDashboard(); else this._renderEmptyStage(); }
        });
    }

    _previewCSV(csvText, container) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            new uiToast({ message: 'CSV requires a header and at least one data row', color: 'warning' });
            return;
        }

        const previewEl = container.querySelector('#at-csv-preview') || document.createElement('div');
        previewEl.id = 'at-csv-preview';
        previewEl.className = 'cv-mt-md';
        if (!container.contains(previewEl)) container.appendChild(previewEl);

        const rows = lines.slice(1).map(line => {
            const cols = line.split(',').map(c => c.trim());
            return { studentId: cols[0], date: cols[1], status: cols[2] };
        });

        previewEl.innerHTML = `
            <div class="as-preview-title">Preview: ${rows.length} records</div>
            <div class="as-preview-box">
                ${rows.slice(0, 20).map(r => `<div>${r.studentId} | ${r.date} | ${r.status}</div>`).join('')}
                ${rows.length > 20 ? `<div class="as-preview-overflow">...and ${rows.length - 20} more</div>` : ''}
            </div>
        `;

        const importBtnWrap = document.createElement('div');
        importBtnWrap.className = 'cv-mt-sm';
        previewEl.appendChild(importBtnWrap);
        new uiButton({
            parent: importBtnWrap, label: 'Import', variant: 'primary', size: 'sm',
            onClick: () => this._importCSVRows(rows)
        });
    }

    _importCSVRows(rows) {
        if (!this._dataLoaded) {
            new uiToast({ message: 'Load demo data first', color: 'warning' });
            return;
        }

        let imported = 0;
        const memberTable = this._memberService.table('member');
        const eventTable = this._eventService.table('event');

        rows.forEach(row => {
            // Find member by username (student ID)
            const member = memberTable.all().find(m => m.get('username') === row.studentId);
            if (!member) return;

            // Find event by date
            const event = eventTable.all().find(e =>
                (e.get('startTime') || '').startsWith(row.date) &&
                e.get('groupId') === this._courseGroup?.idx
            );
            if (!event) return;

            // Update attendance
            const attendee = this._getAttendeeRecord(event.idx, member.idx);
            if (!attendee) return;

            if (row.status === 'P') {
                if (!attendee.get('checkedIn')) {
                    this._eventService.checkInAttendee(event.idx, member.idx);
                    imported++;
                }
            } else if (row.status === 'A') {
                if (attendee.get('checkedIn')) {
                    this._eventService.table('eventAttendee').update(attendee.idx, { checkedIn: false, checkedInAt: null });
                    imported++;
                }
            }
        });

        new uiToast({ message: `Imported ${imported} attendance records`, color: 'success' });
        this._renderDashboard();
        this._renderSessionsPane();
    }

    // ── DP Computation (Analysis Layer on Service Data) ─────────────────────

    _computeDP(memberId) {
        const events = this._getCourseEvents();
        const total = events.length;
        if (total === 0) return { pct: 0, attended: 0, total: 0, status: 'OK' };

        let attended = 0;
        events.forEach(event => {
            const attendee = this._getAttendeeRecord(event.idx, memberId);
            if (attendee?.get('checkedIn')) attended++;
        });

        const pct = (attended / total) * 100;
        const status = pct >= this.dpThreshold ? 'OK'
            : pct >= this.dpRiskThreshold ? 'Risk' : 'Excluded';

        return { pct, attended, total, status };
    }

    // ── Helper Methods ──────────────────────────────────────────────────────

    _getCourseEvents() {
        return this._eventService.table('event').all()
            .filter(e => e.get('groupId') === this._courseGroup?.idx)
            .sort((a, b) => (a.get('startTime') || '').localeCompare(b.get('startTime') || ''));
    }

    _getCourseStudents() {
        if (!this._courseGroup) return [];
        return this._groupService.table('groupMember').all()
            .filter(m => m.get('groupId') === this._courseGroup.idx && m.get('role') === 'member');
    }

    _getAttendeeRecord(eventId, memberId) {
        return this._eventService.table('eventAttendee').all()
            .find(a => a.get('eventId') === eventId && a.get('memberId') === memberId);
    }

    _getEventTypeName(typeId) {
        const type = this._eventService.table('eventType').read(typeId);
        return type ? type.get('name') : 'Session';
    }

    _getMemberName(memberId) {
        const member = this._memberService.table('member').read(memberId);
        return member ? member.get('displayName') : `#${memberId}`;
    }

    _getInputVal(inst) {
        if (!inst || !inst.el) return '';
        const inputEl = inst.el.querySelector('input');
        return inputEl ? inputEl.value.trim() : '';
    }

    _r(v) { return Math.round(v * 10) / 10; }

    _mean(arr) { return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length; }

    _stdDev(arr) {
        if (arr.length < 2) return 0;
        const m = this._mean(arr);
        return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
    }

    // ── UIBinding Methods ────────────────────────────────────────────────────

    _bindKPIs(container, stats) {
        var miniPublome = new Publome({
            tables: [{ name: 'metric', columns: {
                idx: { type: 'number', primaryKey: true },
                code: { type: 'string' },
                value: { type: 'string' },
                label: { type: 'string' },
                icon: { type: 'string' },
                color: { type: 'string' }
            }}]
        });
        stats.forEach(function(s, i) {
            miniPublome.table('metric').create({ idx: i + 1, code: s.code || s.label, value: String(s.value), label: s.label, icon: s.icon, color: s.color });
        });

        var self = this;
        stats.forEach(function(s) {
            var el = document.createElement('div');
            container.appendChild(el);
            var binding = new UIBinding(miniPublome.table('metric'), { publome: miniPublome });
            binding.bindMetric(el, {
                compute: function(records) {
                    var r = records.find(function(rec) { return rec.get('code') === (s.code || s.label); });
                    return r ? r.get('value') : '\u2014';
                },
                label: s.label,
                icon: s.icon || '',
                color: s.color || 'var(--ui-primary)'
            });
        });
    }

    _bindSessionCollection(container) {
        if (!this._eventBinding) return;
        var self = this;
        this._eventBinding.bindCollection(container, {
            component: 'card',
            map: function(record) {
                var dateStr = (record.get('startTime') || '').substring(0, 10);
                var typeName = self._getEventTypeName(record.get('typeId'));
                var attendees = self._eventService.getEventAttendees(record.idx);
                var checkedIn = attendees.filter(function(a) { return a.get('checkedIn'); }).length;
                return {
                    title: typeName + ' — ' + dateStr,
                    subtitle: record.get('location') || '',
                    badges: [
                        { label: checkedIn + '/' + attendees.length + ' present', color: 'info' }
                    ]
                };
            }
        });
    }

    _bindStudentAttendanceCollection(container) {
        if (!this._courseGroup) return;
        var self = this;
        var memberTable = this._groupService.table('groupMember');
        var students = memberTable.all().filter(function(m) {
            return m.get('groupId') === self._courseGroup.idx && m.get('role') === 'member';
        });

        var miniPublome = new Publome({
            tables: [{ name: 'studentAttendance', columns: {
                idx: { type: 'number', primaryKey: true },
                name: { type: 'string' },
                studentId: { type: 'string' },
                attended: { type: 'number' },
                total: { type: 'number' },
                pct: { type: 'number' },
                status: { type: 'string' }
            }, labeller: '{name}' }]
        });

        var memberLookup = this._memberService.table('member');
        students.forEach(function(gm, i) {
            var memberId = gm.get('memberId');
            var member = memberLookup.read(memberId);
            var dp = self._computeDP(memberId);
            miniPublome.table('studentAttendance').create({
                idx: i + 1,
                name: member ? member.get('displayName') : '#' + memberId,
                studentId: member ? member.get('username') : '',
                attended: dp.attended,
                total: dp.total,
                pct: self._r(dp.pct),
                status: dp.status
            });
        });

        var binding = new UIBinding(miniPublome.table('studentAttendance'), { publome: miniPublome });
        binding.bindCollection(container, {
            component: 'card',
            map: function(record) {
                var status = record.get('status');
                var statusColors = { 'OK': 'success', 'Risk': 'warning', 'Excluded': 'danger' };
                return {
                    title: record.get('name'),
                    subtitle: record.get('studentId'),
                    badges: [
                        { label: record.get('pct') + '%', color: statusColors[status] || 'gray' },
                        { label: status, color: statusColors[status] || 'gray' }
                    ]
                };
            }
        });
    }
}

// ── Export ───────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceDPPanel;
}
if (typeof window !== 'undefined') {
    window.AttendanceDPPanel = AttendanceDPPanel;
}
if (typeof ClassViewConnect !== 'undefined') {
    ClassViewConnect.registerPanel('AttendanceDPPanel', AttendanceDPPanel);
}
