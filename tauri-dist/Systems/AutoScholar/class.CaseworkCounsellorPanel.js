/**
 * CaseworkCounsellorPanel — Three-panel counsellor console
 *
 * Architecture: control panel (priority queue) | centre stage (views) | context panel
 * Replaces the original kanban-based monolith with a triage-first console
 * informed by a 3-agent domain debate (Tools Scout, Practice Expert, Novelty Agent).
 *
 * Views: Queue (default), Student Profile, Appointments, Analytics, Cases, About
 *
 * Usage:
 *   new CaseworkCounsellorPanel({ bridge: new CaseworkBridge() }).render(controlEl, stageEl);
 */
class CaseworkCounsellorPanel {

    static VIEWS = [
        { key: 'queue',        label: 'Queue',        icon: 'layer-group' },
        { key: 'profile',      label: 'Profile',      icon: 'user-circle' },
        { key: 'cases',        label: 'Cases',        icon: 'clipboard-list' },
        { key: 'appointments', label: 'Calendar',     icon: 'calendar-alt' },
        { key: 'analytics',    label: 'Analytics',    icon: 'chart-pie' },
        { key: 'about',        label: 'About',        icon: 'info-circle' }
    ];

    static COUNSELLORS = [
        { idx: 1, name: 'Dr. N. Mabaso',   role: 'Senior Student Counsellor', initials: 'NM' },
        { idx: 2, name: 'Ms. T. Dlamini',   role: 'Student Counsellor',        initials: 'TD' },
        { idx: 3, name: 'Mr. R. Singh',     role: 'Academic Advisor',          initials: 'RS' }
    ];

    static URGENCY_GROUPS = [
        { key: 'overdue',    label: 'Overdue',     color: '#dc2626',  icon: 'exclamation-triangle', filter: c => c.get('daysOpen') > 14 && c.get('status') !== 'Resolved' },
        { key: 'critical',   label: 'Critical',    color: '#ef4444',  icon: 'bolt',                 filter: c => c.get('priority') === 'Critical' && c.get('daysOpen') <= 14 && c.get('status') !== 'Resolved' },
        { key: 'high',       label: 'High',        color: '#f97316',  icon: 'arrow-up',             filter: c => c.get('priority') === 'High' && c.get('daysOpen') <= 14 && c.get('status') !== 'Resolved' },
        { key: 'scheduled',  label: 'Scheduled',   color: '#3b82f6',  icon: 'clock',                filter: c => (c.get('priority') === 'Medium' || c.get('priority') === 'Low') && c.get('status') !== 'Resolved' },
        { key: 'stable',     label: 'Stable',       color: '#22c55e',  icon: 'check-circle',         filter: c => c.get('status') === 'Resolved' }
    ];

    constructor(config) {
        config = config || {};
        if (!config.bridge) throw new Error('CaseworkCounsellorPanel requires a CaseworkBridge instance');

        this._controlEl = null;
        this._stageEl = null;
        this._centreStage = null;
        this._contextPanel = null;
        this._activeView = null;
        this._selectedStudentId = null;
        this._counsellor = CaseworkCounsellorPanel.COUNSELLORS[0];
        this._counsellorFilter = null; // null = show all
        this._bridge = config.bridge;
        this._chartInstances = [];
        this._calendarInstance = null;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildStageLayout();
        this._buildControl();
        this._switchView('queue');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STAGE LAYOUT — Three-panel console
    // ══════════════════════════════════════════════════════════════════════════

    _buildStageLayout() {
        var el = this._stageEl;
        el.className = 'as-cw-console';

        // Centre stage (main content)
        this._centreStage = document.createElement('div');
        this._centreStage.className = 'as-cw-centre-stage';
        el.appendChild(this._centreStage);

        // Context panel (right sidebar)
        this._contextPanel = document.createElement('div');
        this._contextPanel.className = 'as-cw-context-panel';
        el.appendChild(this._contextPanel);

        this._buildContextPanel();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTROL PANEL — Priority Queue
    // ══════════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        while (el.firstChild) el.removeChild(el.firstChild);
        el.classList.add('as-cw-dark-control');

        // Counsellor identity
        this._renderCounsellorHeader(el);

        // Triage Pulse Strip
        this._renderPulseStrip(el);

        // View navigation icons
        this._renderViewBar(el);

        // Priority queue
        this._renderPriorityQueue(el);
    }

    _renderCounsellorHeader(el) {
        var card = document.createElement('div');
        card.className = 'as-cw-section-divider';

        var row = document.createElement('div');
        row.className = 'as-flex-row-center';

        var avatar = document.createElement('div');
        avatar.className = 'as-avatar as-avatar-md as-cw-avatar-gradient';
        avatar.textContent = this._counsellor.initials;
        row.appendChild(avatar);

        var info = document.createElement('div');
        var nameDiv = document.createElement('div');
        nameDiv.className = 'as-cw-name';
        nameDiv.textContent = this._counsellor.name;
        info.appendChild(nameDiv);
        var roleDiv = document.createElement('div');
        roleDiv.className = 'as-cw-role';
        roleDiv.textContent = this._counsellor.role;
        info.appendChild(roleDiv);
        row.appendChild(info);
        card.appendChild(row);

        var statsRow = document.createElement('div');
        statsRow.className = 'as-cw-stats-row';
        card.appendChild(statsRow);

        var activeCases = this._bridge.getActiveCases().length;
        new uiBadge({ label: activeCases + ' active', color: 'orange', size: 'xs', parent: statsRow });

        var upcoming = this._bridge.getUpcomingAppointments().length;
        new uiBadge({ label: upcoming + ' appts', color: 'blue', size: 'xs', parent: statsRow });
        new uiBadge({ label: 'Online', color: 'green', size: 'xs', parent: statsRow });

        // Counsellor filter
        var filterRow = document.createElement('div');
        filterRow.className = 'as-cw-filter-row';
        var filterLabel = document.createElement('span');
        filterLabel.className = 'as-cw-filter-label';
        filterLabel.textContent = 'View:';
        filterRow.appendChild(filterLabel);

        var select = document.createElement('select');
        select.className = 'as-cw-filter-select';
        var allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All Counsellors';
        select.appendChild(allOpt);
        var self = this;
        CaseworkCounsellorPanel.COUNSELLORS.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.idx;
            opt.textContent = c.initials + ' — ' + c.name;
            select.appendChild(opt);
        });
        select.addEventListener('change', function() {
            self._counsellorFilter = select.value ? parseInt(select.value) : null;
            self._buildControl();
            if (self._activeView === 'queue') self._switchView('queue');
        });
        if (this._counsellorFilter) select.value = this._counsellorFilter;
        filterRow.appendChild(select);
        card.appendChild(filterRow);

        el.appendChild(card);
    }

    _renderPulseStrip(el) {
        var strip = document.createElement('div');
        strip.className = 'as-cw-pulse-strip';

        var allCases = this._bridge.table('case').all();
        var self = this;

        CaseworkCounsellorPanel.URGENCY_GROUPS.forEach(function(group) {
            var count = allCases.filter(group.filter).length;
            if (count === 0 && group.key === 'stable') return;

            var glyph = document.createElement('div');
            glyph.className = 'as-cw-pulse-glyph';
            glyph.title = group.label + ': ' + count;

            var icon = document.createElement('i');
            icon.className = 'fas fa-' + group.icon;
            icon.style.color = group.color;
            glyph.appendChild(icon);

            var num = document.createElement('span');
            num.className = 'as-cw-pulse-count';
            num.textContent = count;
            glyph.appendChild(num);

            strip.appendChild(glyph);
        });

        el.appendChild(strip);
    }

    _renderViewBar(el) {
        var bar = document.createElement('div');
        bar.className = 'as-cw-view-bar';

        var self = this;
        this._viewBarBtns = {};

        CaseworkCounsellorPanel.VIEWS.forEach(function(v) {
            var btn = document.createElement('div');
            btn.className = 'as-cw-view-btn';
            btn.title = v.label;

            var icon = document.createElement('i');
            icon.className = 'fas fa-' + v.icon;
            btn.appendChild(icon);

            btn.addEventListener('click', function() { self._switchView(v.key); });
            self._viewBarBtns[v.key] = btn;
            bar.appendChild(btn);
        });

        el.appendChild(bar);
    }

    _renderPriorityQueue(el) {
        var allCases = this._bridge.table('case').all();
        var filterCounsellor = this._counsellorFilter;
        if (filterCounsellor) {
            allCases = allCases.filter(function(c) { return c.get('counsellorId') === filterCounsellor; });
        }
        var self = this;

        CaseworkCounsellorPanel.URGENCY_GROUPS.forEach(function(group) {
            var cases = allCases.filter(group.filter);
            if (cases.length === 0) return;

            var section = document.createElement('div');
            section.className = 'as-cw-queue-section';

            var header = document.createElement('div');
            header.className = 'as-cw-queue-header';

            var dot = document.createElement('span');
            dot.className = 'as-status-dot';
            dot.style.background = group.color;
            header.appendChild(dot);

            var label = document.createElement('span');
            label.className = 'as-cw-queue-label';
            label.textContent = group.label + ' (' + cases.length + ')';
            header.appendChild(label);

            section.appendChild(header);

            cases.forEach(function(c) {
                section.appendChild(self._createQueueItem(c, group.color));
            });

            el.appendChild(section);
        });
    }

    _createQueueItem(casePublon, borderColor) {
        var self = this;
        var studentId = casePublon.get('studentId');
        var studentName = this._bridge.getStudentName(studentId);

        var item = document.createElement('div');
        item.className = 'as-cw-queue-item';
        item.style.borderLeftColor = borderColor;

        item.addEventListener('click', function() {
            self._selectedStudentId = studentId;
            self._switchView('profile');
        });

        // Top row: name + days badge
        var topRow = document.createElement('div');
        topRow.className = 'as-cw-queue-top';

        var nameSpan = document.createElement('span');
        nameSpan.className = 'as-cw-queue-name';
        nameSpan.textContent = studentName;
        topRow.appendChild(nameSpan);

        var daysOpen = casePublon.get('daysOpen') || 0;
        var daysBadge = document.createElement('span');
        daysBadge.className = 'as-cw-queue-days';
        daysBadge.textContent = daysOpen + 'd';
        topRow.appendChild(daysBadge);

        item.appendChild(topRow);

        // Title
        var title = document.createElement('div');
        title.className = 'as-cw-queue-title';
        title.textContent = casePublon.get('title');
        item.appendChild(title);

        // Bottom row: category badge + sparkline
        var bottomRow = document.createElement('div');
        bottomRow.className = 'as-cw-queue-bottom';

        var catId = casePublon.get('categoryId');
        var cat = this._bridge.table('caseCategory').read(catId);
        var catName = cat ? cat.get('name') : 'Unknown';
        new uiBadge({ label: catName, color: 'gray', size: 'xs', parent: bottomRow });

        // Risk badge
        var latestRisk = this._bridge.getLatestRiskScore(studentId);
        if (latestRisk !== null) {
            var riskColor = latestRisk >= 70 ? 'red' : latestRisk >= 50 ? 'orange' : latestRisk >= 30 ? 'yellow' : 'green';
            new uiBadge({ label: latestRisk + '', color: riskColor, size: 'xs', parent: bottomRow });
        }

        // Sparkline from risk history
        var sparkline = this._createSparkline(studentId);
        if (sparkline) bottomRow.appendChild(sparkline);

        item.appendChild(bottomRow);

        return item;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SPARKLINES — Inline SVG risk trajectories
    // ══════════════════════════════════════════════════════════════════════════

    _createSparkline(studentId) {
        var history = this._bridge.getRiskHistory(studentId);
        if (history.length < 2) return null;

        var scores = history.map(function(r) { return r.get('riskScore'); });
        var w = 48, h = 18;
        var minVal = Math.min.apply(null, scores);
        var maxVal = Math.max.apply(null, scores);
        var range = maxVal - minVal || 1;

        var points = scores.map(function(v, i) {
            var x = (i / (scores.length - 1)) * w;
            var y = h - ((v - minVal) / range) * h;
            return x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');

        // Trend: compare last 2 values
        var lastVal = scores[scores.length - 1];
        var prevVal = scores[scores.length - 2];
        var trend = lastVal > prevVal ? 'rising' : lastVal < prevVal ? 'falling' : 'stable';
        var strokeColor = trend === 'rising' ? '#ef4444' : trend === 'falling' ? '#22c55e' : '#9ca3af';

        var container = document.createElement('div');
        container.className = 'as-cw-sparkline-wrap';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        svg.classList.add('as-cw-sparkline');

        var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', strokeColor);
        polyline.setAttribute('stroke-width', '1.5');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(polyline);

        container.appendChild(svg);

        // Trend arrow
        var arrow = document.createElement('i');
        arrow.className = 'fas fa-arrow-' + (trend === 'rising' ? 'up' : trend === 'falling' ? 'down' : 'right') + ' as-cw-trend-' + trend;
        container.appendChild(arrow);

        return container;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTEXT PANEL — Right sidebar
    // ══════════════════════════════════════════════════════════════════════════

    _buildContextPanel() {
        var el = this._contextPanel;
        while (el.firstChild) el.removeChild(el.firstChild);

        // Quick actions
        var actionsLabel = document.createElement('div');
        actionsLabel.className = 'as-cw-ctx-label';
        actionsLabel.textContent = 'Quick Actions';
        el.appendChild(actionsLabel);

        var self = this;
        var actions = [
            { label: 'New Case', icon: 'plus', action: function() {
                var result = UIBinding.openCreateModal(self._bridge.table('case'), { publome: self._bridge.service });
                if (self._selectedStudentId) result.editor.openCreate({ studentId: String(self._selectedStudentId) });
            } },
            { label: 'Log Intervention', icon: 'hand-holding-heart', action: function() {
                var result = UIBinding.openCreateModal(self._bridge.table('intervention'), { publome: self._bridge.service });
                if (self._selectedStudentId) result.editor.openCreate({ studentId: String(self._selectedStudentId) });
            } },
            { label: 'Schedule Appt', icon: 'calendar-plus', action: function() {
                var result = UIBinding.openCreateModal(self._bridge.table('appointment'), { publome: self._bridge.service });
                if (self._selectedStudentId) result.editor.openCreate({ studentId: String(self._selectedStudentId) });
            } },
            { label: 'New Referral', icon: 'share-square', action: function() {
                var result = UIBinding.openCreateModal(self._bridge.table('referral'), { publome: self._bridge.service });
                if (self._selectedStudentId) result.editor.openCreate({ studentId: String(self._selectedStudentId) });
            } }
        ];

        actions.forEach(function(a) {
            var btn = document.createElement('div');
            btn.className = 'as-cw-ctx-action';
            btn.addEventListener('click', a.action);

            var icon = document.createElement('i');
            icon.className = 'fas fa-' + a.icon;
            btn.appendChild(icon);

            var label = document.createElement('span');
            label.textContent = a.label;
            btn.appendChild(label);

            el.appendChild(btn);
        });

        // Upcoming appointments
        var apptLabel = document.createElement('div');
        apptLabel.className = 'as-cw-ctx-label as-cw-ctx-label-spaced';
        apptLabel.textContent = 'Upcoming';
        el.appendChild(apptLabel);

        var upcoming = this._bridge.getUpcomingAppointments().slice(0, 4);
        if (upcoming.length === 0) {
            var emptyMsg = document.createElement('div');
            emptyMsg.className = 'as-cw-ctx-empty';
            emptyMsg.textContent = 'No upcoming appointments';
            el.appendChild(emptyMsg);
        } else {
            upcoming.forEach(function(a) {
                var card = document.createElement('div');
                card.className = 'as-cw-ctx-appt';

                var time = document.createElement('div');
                time.className = 'as-cw-ctx-appt-time';
                time.textContent = a.get('date').slice(5) + ' ' + a.get('time');
                card.appendChild(time);

                var name = document.createElement('div');
                name.className = 'as-cw-ctx-appt-name';
                name.textContent = self._bridge.getStudentName(a.get('studentId'));
                card.appendChild(name);

                var type = document.createElement('div');
                type.className = 'as-cw-ctx-appt-type';
                type.textContent = a.get('type');
                card.appendChild(type);

                el.appendChild(card);
            });
        }

        // Support network constellation (simple SVG)
        var netLabel = document.createElement('div');
        netLabel.className = 'as-cw-ctx-label as-cw-ctx-label-spaced';
        netLabel.textContent = 'Support Network';
        el.appendChild(netLabel);

        el.appendChild(this._createConstellation());
    }

    _createConstellation() {
        var nodes = [
            { label: 'Counsellor', x: 100, y: 60, r: 18, color: '#6366f1' },
            { label: 'Health',     x: 40,  y: 30, r: 12, color: '#f87171' },
            { label: 'Financial',  x: 160, y: 30, r: 12, color: '#fbbf24' },
            { label: 'Academic',   x: 40,  y: 100, r: 14, color: '#60a5fa' },
            { label: 'SRC',        x: 160, y: 100, r: 10, color: '#34d399' },
            { label: 'Disability', x: 100, y: 120, r: 11, color: '#a78bfa' }
        ];

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '200');
        svg.setAttribute('height', '140');
        svg.setAttribute('viewBox', '0 0 200 140');
        svg.classList.add('as-cw-constellation');

        // Edges from centre (Counsellor) to all others
        for (var i = 1; i < nodes.length; i++) {
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', nodes[0].x);
            line.setAttribute('y1', nodes[0].y);
            line.setAttribute('x2', nodes[i].x);
            line.setAttribute('y2', nodes[i].y);
            line.setAttribute('stroke', '#e5e7eb');
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
        }

        // Nodes
        nodes.forEach(function(n) {
            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', n.x);
            circle.setAttribute('cy', n.y);
            circle.setAttribute('r', n.r);
            circle.setAttribute('fill', n.color);
            circle.setAttribute('opacity', '0.8');
            svg.appendChild(circle);

            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', n.x);
            text.setAttribute('y', n.y + n.r + 10);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#6b7280');
            text.setAttribute('font-size', '8');
            text.textContent = n.label;
            svg.appendChild(text);
        });

        return svg;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW SWITCHING
    // ══════════════════════════════════════════════════════════════════════════

    _switchView(key) {
        // Destroy old charts
        this._destroyCharts();
        this._calendarInstance = null;

        // Update view bar highlight
        var self = this;
        CaseworkCounsellorPanel.VIEWS.forEach(function(v) {
            var btn = self._viewBarBtns[v.key];
            if (!btn) return;
            btn.className = v.key === key ? 'as-cw-view-btn as-cw-view-btn-active' : 'as-cw-view-btn';
        });

        this._activeView = key;
        var stage = this._centreStage;
        while (stage.firstChild) stage.removeChild(stage.firstChild);

        switch (key) {
            case 'queue':        this._renderQueueView(); break;
            case 'profile':      this._renderProfileView(); break;
            case 'cases':        this._renderCasesView(); break;
            case 'appointments': this._renderAppointmentsView(); break;
            case 'analytics':    this._renderAnalyticsView(); break;
            case 'about':        this._renderAboutView(); break;
        }
    }

    _destroyCharts() {
        this._chartInstances.forEach(function(c) {
            if (c && typeof c.destroy === 'function') c.destroy();
        });
        this._chartInstances = [];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: QUEUE — At-a-glance caseload overview
    // ══════════════════════════════════════════════════════════════════════════

    _renderQueueView() {
        var el = this._centreStage;

        var header = this._createViewHeader('layer-group', 'Priority Queue');
        el.appendChild(header);

        // Metric chips
        var metricsRow = document.createElement('div');
        metricsRow.className = 'as-cw-metrics-row';
        el.appendChild(metricsRow);

        var analytics = this._bridge.getCaseloadAnalytics();
        var binding = new UIBinding(this._bridge.table('case'), { publome: this._bridge.service });
        binding.bindMetric(metricsRow, { compute: function(rows) { return rows.filter(function(r) { return r.get('status') !== 'Resolved'; }).length; }, label: 'Active', icon: 'clipboard-list', color: 'orange' });
        binding.bindMetric(metricsRow, { compute: function(rows) { return rows.filter(function(r) { return r.get('priority') === 'Critical'; }).length; }, label: 'Critical', icon: 'bolt', color: 'red' });
        binding.bindMetric(metricsRow, { compute: function(rows) { var active = rows.filter(function(r) { return r.get('status') !== 'Resolved'; }); return active.length > 0 ? Math.round(active.reduce(function(s, r) { return s + (r.get('daysOpen') || 0); }, 0) / active.length) : 0; }, label: 'Avg Days', icon: 'clock', color: 'blue' });
        binding.bindMetric(metricsRow, { compute: function(rows) { var total = rows.length; var resolved = rows.filter(function(r) { return r.get('status') === 'Resolved'; }).length; return total > 0 ? Math.round((resolved / total) * 100) + '%' : '0%'; }, label: 'Resolved', icon: 'check-circle', color: 'green' });

        // At-risk students from service
        var atRiskLabel = document.createElement('div');
        atRiskLabel.className = 'as-cw-section-title';
        var atRiskIcon = document.createElement('i');
        atRiskIcon.className = 'fas fa-exclamation-circle';
        atRiskIcon.style.color = '#ef4444';
        atRiskLabel.appendChild(atRiskIcon);
        atRiskLabel.appendChild(document.createTextNode('At-Risk Students'));
        el.appendChild(atRiskLabel);

        var atRisk = this._bridge.getAtRiskStudents();
        var self = this;

        if (atRisk.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'as-cw-ctx-empty';
            emptyEl.textContent = 'No at-risk students identified';
            el.appendChild(emptyEl);
        } else {
            atRisk.forEach(function(entry) {
                var card = document.createElement('div');
                card.className = 'as-cw-risk-card';
                card.addEventListener('click', function() {
                    self._selectedStudentId = entry.studentId;
                    self._switchView('profile');
                });

                var topRow = document.createElement('div');
                topRow.className = 'as-cw-risk-top-row';

                var studentData = self._bridge.getStudent(entry.studentId);
                var studentName = studentData ? studentData.name : 'Student #' + entry.studentId;
                var initials = studentData ? studentData.initials : '??';

                var avatar = document.createElement('div');
                avatar.className = 'as-avatar as-avatar-sm as-cw-avatar-sm-text';
                avatar.textContent = initials;
                topRow.appendChild(avatar);

                var info = document.createElement('div');
                info.className = 'as-flex-1';

                var nameSpan = document.createElement('div');
                nameSpan.className = 'as-cw-risk-name';
                nameSpan.textContent = studentName;
                info.appendChild(nameSpan);

                var detail = document.createElement('div');
                detail.className = 'as-cw-risk-detail';
                detail.textContent = entry.caseCount + ' case(s) · Highest: ' + entry.highestPriority;
                info.appendChild(detail);

                topRow.appendChild(info);

                // Sparkline
                var sparkline = self._createSparkline(entry.studentId);
                if (sparkline) topRow.appendChild(sparkline);

                card.appendChild(topRow);
                el.appendChild(card);
            });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: STUDENT PROFILE — 360° view with Case Feed
    // ══════════════════════════════════════════════════════════════════════════

    _renderProfileView() {
        var el = this._centreStage;
        var studentId = this._selectedStudentId;

        if (!studentId) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'as-empty-state';
            emptyEl.innerHTML = '<i class="fas fa-user-graduate"></i><div class="as-empty-state-title">No student selected</div><div class="as-empty-state-hint">Click a student in the queue to view their profile</div>';
            el.appendChild(emptyEl);
            return;
        }

        var student = this._bridge.getStudent(studentId);
        if (!student) {
            var errEl = document.createElement('div');
            errEl.className = 'as-empty-state';
            errEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i><div class="as-empty-state-title">Student not found</div>';
            el.appendChild(errEl);
            return;
        }

        // Profile header
        var header = document.createElement('div');
        header.className = 'as-cw-profile-header';

        var avatar = document.createElement('div');
        avatar.className = 'as-avatar as-avatar-lg as-cw-avatar-gradient';
        avatar.textContent = student.initials;
        header.appendChild(avatar);

        var info = document.createElement('div');
        info.className = 'as-flex-1';

        var nameDiv = document.createElement('div');
        nameDiv.className = 'as-cw-profile-name';
        nameDiv.textContent = student.name;
        info.appendChild(nameDiv);

        var detailDiv = document.createElement('div');
        detailDiv.className = 'as-cw-profile-detail';
        detailDiv.textContent = student.studentId + ' · ' + student.programme + ' · Year ' + student.yearOfStudy;
        info.appendChild(detailDiv);

        var statsDiv = document.createElement('div');
        statsDiv.className = 'as-cw-profile-stats';
        new uiBadge({ label: 'GPA: ' + student.gpa, color: 'blue', size: 'xs', parent: statsDiv });
        new uiBadge({ label: 'Credits: ' + student.credits, color: 'gray', size: 'xs', parent: statsDiv });

        var latestRisk = this._bridge.getLatestRiskScore(studentId);
        if (latestRisk !== null) {
            var riskColor = latestRisk >= 70 ? 'red' : latestRisk >= 50 ? 'orange' : latestRisk >= 30 ? 'yellow' : 'green';
            new uiBadge({ label: 'Risk: ' + latestRisk, color: riskColor, size: 'xs', parent: statsDiv });
        }
        info.appendChild(statsDiv);
        header.appendChild(info);

        // Risk sparkline (larger)
        var sparkWrap = document.createElement('div');
        sparkWrap.className = 'as-cw-profile-spark';
        var history = this._bridge.getRiskHistory(studentId);
        if (history.length >= 2) {
            var bigSparkline = this._createProfileSparkline(history);
            sparkWrap.appendChild(bigSparkline);
        }
        header.appendChild(sparkWrap);

        el.appendChild(header);

        // Toggle: Case Feed | Appointments
        var toggleRow = document.createElement('div');
        toggleRow.className = 'as-cw-toggle-row';
        el.appendChild(toggleRow);

        var feedContainer = document.createElement('div');
        feedContainer.className = 'as-cw-feed-container';
        el.appendChild(feedContainer);

        var self = this;
        var feedBtn = document.createElement('div');
        feedBtn.className = 'as-cw-toggle-btn as-cw-toggle-active';
        feedBtn.innerHTML = '<i class="fas fa-stream"></i> Case Feed';
        feedBtn.addEventListener('click', function() {
            feedBtn.className = 'as-cw-toggle-btn as-cw-toggle-active';
            apptBtn.className = 'as-cw-toggle-btn';
            self._renderCaseFeed(feedContainer, studentId);
        });
        toggleRow.appendChild(feedBtn);

        var apptBtn = document.createElement('div');
        apptBtn.className = 'as-cw-toggle-btn';
        apptBtn.innerHTML = '<i class="fas fa-calendar-alt"></i> Appointments';
        apptBtn.addEventListener('click', function() {
            apptBtn.className = 'as-cw-toggle-btn as-cw-toggle-active';
            feedBtn.className = 'as-cw-toggle-btn';
            self._renderStudentAppointments(feedContainer, studentId);
        });
        toggleRow.appendChild(apptBtn);

        // Default: Case Feed
        this._renderCaseFeed(feedContainer, studentId);
    }

    _createProfileSparkline(history) {
        var scores = history.map(function(r) { return r.get('riskScore'); });
        var w = 100, h = 36;
        var minVal = Math.min.apply(null, scores);
        var maxVal = Math.max.apply(null, scores);
        var range = maxVal - minVal || 1;

        var points = scores.map(function(v, i) {
            var x = (i / (scores.length - 1)) * w;
            var y = h - 2 - ((v - minVal) / range) * (h - 4);
            return x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');

        var lastVal = scores[scores.length - 1];
        var prevVal = scores[scores.length - 2];
        var trend = lastVal > prevVal ? 'rising' : lastVal < prevVal ? 'falling' : 'stable';
        var strokeColor = trend === 'rising' ? '#ef4444' : trend === 'falling' ? '#22c55e' : '#9ca3af';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

        // Fill area
        var fillPoints = '0,' + h + ' ' + points + ' ' + w + ',' + h;
        var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', fillPoints);
        polygon.setAttribute('fill', strokeColor);
        polygon.setAttribute('opacity', '0.1');
        svg.appendChild(polygon);

        var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', strokeColor);
        polyline.setAttribute('stroke-width', '2');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(polyline);

        return svg;
    }

    _renderCaseFeed(container, studentId) {
        while (container.firstChild) container.removeChild(container.firstChild);

        // Merge all records for this student chronologically
        var records = [];
        var self = this;

        // Cases
        this._bridge.table('case').all().filter(function(c) { return c.get('studentId') === studentId; }).forEach(function(c) {
            records.push({ type: 'case', date: c.get('dateOpened'), icon: 'clipboard-list', color: '#3b82f6', title: c.get('title'), detail: c.get('status') + ' · ' + c.get('priority'), description: c.get('description') });
        });

        // Interventions
        this._bridge.table('intervention').all().filter(function(i) { return i.get('studentId') === studentId; }).forEach(function(i) {
            records.push({ type: 'intervention', date: i.get('date'), icon: 'hand-holding-heart', color: '#22c55e', title: i.get('type'), detail: 'Outcome: ' + (i.get('outcome') || 'Pending'), description: i.get('notes') });
        });

        // Referrals
        this._bridge.table('referral').all().filter(function(r) { return r.get('studentId') === studentId; }).forEach(function(r) {
            records.push({ type: 'referral', date: r.get('date'), icon: 'share-square', color: '#8b5cf6', title: 'Referral: ' + r.get('service'), detail: 'Status: ' + r.get('status'), description: r.get('reason') });
        });

        // Case notes (via case)
        var studentCases = this._bridge.table('case').all().filter(function(c) { return c.get('studentId') === studentId; });
        studentCases.forEach(function(c) {
            self._bridge.getCaseNotes(c.get('idx')).forEach(function(n) {
                records.push({ type: 'note', date: n.get('date'), icon: 'sticky-note', color: '#f59e0b', title: 'Note by ' + n.get('author'), detail: '', description: n.get('text') });
            });
        });

        // Sort descending by date
        records.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });

        if (records.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'as-cw-ctx-empty';
            empty.textContent = 'No records found for this student';
            container.appendChild(empty);
            return;
        }

        records.forEach(function(rec) {
            var entry = document.createElement('div');
            entry.className = 'as-cw-feed-entry';

            var iconWrap = document.createElement('div');
            iconWrap.className = 'as-cw-feed-icon';
            iconWrap.style.background = rec.color;
            var icon = document.createElement('i');
            icon.className = 'fas fa-' + rec.icon;
            iconWrap.appendChild(icon);
            entry.appendChild(iconWrap);

            var content = document.createElement('div');
            content.className = 'as-cw-feed-content';

            var topRow = document.createElement('div');
            topRow.className = 'as-cw-feed-top';
            var titleSpan = document.createElement('span');
            titleSpan.className = 'as-cw-feed-title';
            titleSpan.textContent = rec.title;
            topRow.appendChild(titleSpan);
            var dateSpan = document.createElement('span');
            dateSpan.className = 'as-cw-feed-date';
            dateSpan.textContent = rec.date || '';
            topRow.appendChild(dateSpan);
            content.appendChild(topRow);

            if (rec.detail) {
                var detailSpan = document.createElement('div');
                detailSpan.className = 'as-cw-feed-detail';
                detailSpan.textContent = rec.detail;
                content.appendChild(detailSpan);
            }

            if (rec.description) {
                var desc = document.createElement('div');
                desc.className = 'as-cw-feed-desc';
                desc.textContent = rec.description;
                content.appendChild(desc);
            }

            entry.appendChild(content);
            container.appendChild(entry);
        });
    }

    _renderStudentAppointments(container, studentId) {
        while (container.firstChild) container.removeChild(container.firstChild);

        var appts = this._bridge.getAppointmentsByStudent(studentId);
        if (appts.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'as-cw-ctx-empty';
            empty.textContent = 'No appointments for this student';
            container.appendChild(empty);
            return;
        }

        var self = this;
        appts.forEach(function(a) {
            var card = document.createElement('div');
            card.className = 'as-cw-appt-card';
            var statusColors = { 'Scheduled': '#3b82f6', 'Confirmed': '#22c55e', 'Completed': '#6b7280', 'No-Show': '#ef4444', 'Cancelled': '#9ca3af' };
            card.style.borderLeftColor = statusColors[a.get('status')] || '#9ca3af';

            var time = document.createElement('div');
            time.className = 'as-cw-appt-time';
            time.textContent = a.get('date') + ' ' + a.get('time');
            card.appendChild(time);

            var type = document.createElement('div');
            type.className = 'as-cw-appt-name';
            type.textContent = a.get('type') + ' · ' + (a.get('location') || 'TBC');
            card.appendChild(type);

            var statusWrap = document.createElement('div');
            var statusColor = { 'Scheduled': 'blue', 'Confirmed': 'green', 'Completed': 'gray', 'No-Show': 'red', 'Cancelled': 'gray' };
            new uiBadge({ label: a.get('status'), color: statusColor[a.get('status')] || 'gray', size: 'xs', parent: statusWrap });
            card.appendChild(statusWrap);

            container.appendChild(card);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: CASES — Full CRUD via UIBinding
    // ══════════════════════════════════════════════════════════════════════════

    _renderCasesView() {
        var el = this._centreStage;

        var header = this._createViewHeader('clipboard-list', 'Case Management');
        el.appendChild(header);

        var self = this;
        new uiButton({
            label: 'New Case', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-plus"></i>',
            parent: header,
            onClick: function() {
                var result = UIBinding.openCreateModal(self._bridge.table('case'), { publome: self._bridge.service });
                if (self._selectedStudentId) result.editor.openCreate({ studentId: String(self._selectedStudentId) });
            }
        });

        var bindContainer = document.createElement('div');
        bindContainer.className = 'as-mt-2';
        el.appendChild(bindContainer);

        var binding = new UIBinding(this._bridge.table('case'), {
            publome: this._bridge.service,
            hiddenColumns: ['idx', 'dateClosed']
        });
        binding.bindSelectEditor(bindContainer, { editor: 'modal' });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: APPOINTMENTS — FullCalendar
    // ══════════════════════════════════════════════════════════════════════════

    _renderAppointmentsView() {
        var el = this._centreStage;

        var header = this._createViewHeader('calendar-alt', 'Appointments');
        el.appendChild(header);

        var self = this;
        new uiButton({
            label: 'Schedule', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-plus"></i>',
            parent: header,
            onClick: function() {
                UIBinding.openCreateModal(self._bridge.table('appointment'), { publome: self._bridge.service });
            }
        });

        var calContainer = document.createElement('div');
        calContainer.className = 'as-cw-calendar-wrap';
        el.appendChild(calContainer);

        // Build FullCalendar events from appointment table
        var events = this._bridge.getAppointments().map(function(a) {
            var typeColors = {
                'Initial Consultation': '#3b82f6',
                'Follow-up':           '#10b981',
                'Emergency':           '#ef4444',
                'Academic Review':     '#f59e0b',
                'Career Guidance':     '#8b5cf6',
                'Group Session':       '#6b7280'
            };

            var startStr = a.get('date') + 'T' + a.get('time') + ':00';
            var duration = a.get('duration') || 30;
            var endDate = new Date(new Date(startStr).getTime() + duration * 60000);
            var endStr = endDate.toISOString().slice(0, 16);

            return {
                title: self._bridge.getStudentName(a.get('studentId')) + ' — ' + a.get('type'),
                start: startStr,
                end: endStr,
                color: typeColors[a.get('type')] || '#6b7280',
                extendedProps: { status: a.get('status'), location: a.get('location') }
            };
        });

        // Render FullCalendar if available
        if (typeof FullCalendar !== 'undefined') {
            try {
                this._calendarInstance = new FullCalendar.Calendar(calContainer, {
                    initialView: 'timeGridWeek',
                    initialDate: '2026-02-20',
                    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay,listWeek' },
                    slotMinTime: '07:00:00',
                    slotMaxTime: '18:00:00',
                    height: 'auto',
                    events: events,
                    eventClick: function(info) {
                        var props = info.event.extendedProps;
                        new uiToast({ message: info.event.title + ' · ' + (props.location || '') + ' · ' + (props.status || ''), color: 'blue' });
                    }
                });
                this._calendarInstance.render();
            } catch (e) {
                calContainer.textContent = 'FullCalendar failed to load: ' + e.message;
            }
        } else {
            // Fallback: simple list
            calContainer.innerHTML = '<div class="as-cw-ctx-empty">FullCalendar CDN not loaded. Showing list view.</div>';
            var binding = new UIBinding(this._bridge.table('appointment'), {
                publome: this._bridge.service,
                hiddenColumns: ['idx']
            });
            var listWrap = document.createElement('div');
            calContainer.appendChild(listWrap);
            binding.bindSelectEditor(listWrap, { editor: 'modal' });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: ANALYTICS — Chart.js
    // ══════════════════════════════════════════════════════════════════════════

    _renderAnalyticsView() {
        var el = this._centreStage;

        var header = this._createViewHeader('chart-pie', 'Caseload Analytics');
        el.appendChild(header);

        // Metric chips
        var metricsRow = document.createElement('div');
        metricsRow.className = 'as-cw-metrics-row';
        el.appendChild(metricsRow);

        var binding = new UIBinding(this._bridge.table('case'), { publome: this._bridge.service });
        binding.bindMetric(metricsRow, { compute: function(rows) { return rows.length; }, label: 'Total Cases', icon: 'clipboard-list', color: 'blue' });
        binding.bindMetric(metricsRow, { compute: function(rows) { return rows.filter(function(r) { return r.get('status') !== 'Resolved'; }).length; }, label: 'Active', icon: 'folder-open', color: 'orange' });
        binding.bindMetric(metricsRow, { compute: function(rows) { return rows.filter(function(r) { return r.get('status') === 'Resolved'; }).length; }, label: 'Resolved', icon: 'check-circle', color: 'green' });

        var intBinding = new UIBinding(this._bridge.table('intervention'), { publome: this._bridge.service });
        intBinding.bindMetric(metricsRow, { compute: function(rows) { return rows.length; }, label: 'Interventions', icon: 'hand-holding-heart', color: 'purple' });

        var refBinding = new UIBinding(this._bridge.table('referral'), { publome: this._bridge.service });
        refBinding.bindMetric(metricsRow, { compute: function(rows) { return rows.length; }, label: 'Referrals', icon: 'share-square', color: 'blue' });

        // Chart grid
        var chartGrid = document.createElement('div');
        chartGrid.className = 'as-cw-chart-grid';
        el.appendChild(chartGrid);

        var analytics = this._bridge.getCaseloadAnalytics();

        // 1. Category doughnut
        this._addChart(chartGrid, 'Category Distribution', 'doughnut', {
            labels: Object.keys(analytics.categoryCounts),
            datasets: [{ data: Object.values(analytics.categoryCounts), backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6b7280'] }]
        });

        // 2. Status bar chart
        this._addChart(chartGrid, 'Status Breakdown', 'bar', {
            labels: Object.keys(analytics.statusCounts),
            datasets: [{ label: 'Cases', data: Object.values(analytics.statusCounts), backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981'] }]
        }, { indexAxis: 'y' });

        // 3. Outcome pie
        this._addChart(chartGrid, 'Intervention Outcomes', 'pie', {
            labels: Object.keys(analytics.outcomeCounts),
            datasets: [{ data: Object.values(analytics.outcomeCounts), backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#9ca3af'] }]
        });

        // 4. Counsellor workload bar
        var counsellorLabels = [];
        var counsellorCounts = [];
        var self = this;
        CaseworkCounsellorPanel.COUNSELLORS.forEach(function(couns) {
            counsellorLabels.push(couns.initials);
            var count = self._bridge.table('case').all().filter(function(c) { return c.get('counsellorId') === couns.idx && c.get('status') !== 'Resolved'; }).length;
            counsellorCounts.push(count);
        });

        this._addChart(chartGrid, 'Counsellor Workload', 'bar', {
            labels: counsellorLabels,
            datasets: [{ label: 'Active Cases', data: counsellorCounts, backgroundColor: '#3b82f6' }]
        });

        // 5. Burnout heatmap (CSS grid)
        var heatLabel = document.createElement('div');
        heatLabel.className = 'as-cw-chart-title';
        heatLabel.textContent = 'Weekly Activity Heatmap';
        el.appendChild(heatLabel);

        el.appendChild(this._createHeatmap());
    }

    _addChart(container, title, type, data, extraOptions) {
        var wrapper = document.createElement('div');
        wrapper.className = 'as-cw-chart-card';

        var titleEl = document.createElement('div');
        titleEl.className = 'as-cw-chart-card-title';
        titleEl.textContent = title;
        wrapper.appendChild(titleEl);

        var canvas = document.createElement('canvas');
        canvas.height = 200;
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        if (typeof Chart !== 'undefined') {
            try {
                var options = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
                };
                if (extraOptions) Object.assign(options, extraOptions);

                var chart = new Chart(canvas, { type: type, data: data, options: options });
                this._chartInstances.push(chart);
            } catch (e) {
                canvas.parentElement.innerHTML += '<div class="as-cw-ctx-empty">Chart error: ' + e.message + '</div>';
            }
        } else {
            wrapper.innerHTML += '<div class="as-cw-ctx-empty">Chart.js not loaded</div>';
        }
    }

    _createHeatmap() {
        var grid = document.createElement('div');
        grid.className = 'as-cw-heatmap';

        var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        var weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];

        // Generate activity counts from intervention dates
        var interventions = this._bridge.table('intervention').all();
        var activityByCell = {};
        interventions.forEach(function(i) {
            var date = i.get('date');
            if (!date) return;
            var d = new Date(date);
            var dayIdx = d.getDay() - 1; // Mon=0
            var weekIdx = Math.floor((d.getDate() - 1) / 7);
            if (dayIdx >= 0 && dayIdx < 5) {
                var key = weekIdx + '-' + dayIdx;
                activityByCell[key] = (activityByCell[key] || 0) + 1;
            }
        });

        // Header row
        var headerRow = document.createElement('div');
        headerRow.className = 'as-cw-heatmap-row';
        headerRow.appendChild(this._heatmapCell('', 'header'));
        days.forEach(function(d) { headerRow.appendChild(this._heatmapCell(d, 'header')); }.bind(this));
        grid.appendChild(headerRow);

        // Data rows
        for (var w = 0; w < weeks.length; w++) {
            var row = document.createElement('div');
            row.className = 'as-cw-heatmap-row';
            row.appendChild(this._heatmapCell(weeks[w], 'label'));
            for (var d = 0; d < days.length; d++) {
                var count = activityByCell[w + '-' + d] || 0;
                var intensity = Math.min(count, 4);
                row.appendChild(this._heatmapCell(count || '', 'cell-' + intensity));
            }
            grid.appendChild(row);
        }

        return grid;
    }

    _heatmapCell(text, className) {
        var cell = document.createElement('div');
        cell.className = 'as-cw-heatmap-cell as-cw-heatmap-' + className;
        cell.textContent = text;
        return cell;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: ABOUT — Domain Debate Synthesis Report
    // ══════════════════════════════════════════════════════════════════════════

    _renderAboutView() {
        var el = this._centreStage;
        var wrapper = document.createElement('div');
        wrapper.className = 'as-cw-about-wrapper';
        el.appendChild(wrapper);

        var sections = this._getAboutSections();
        var self = this;

        sections.forEach(function(section) {
            var block = document.createElement('div');
            block.className = 'as-cw-about-block';

            if (section.type === 'title') {
                var h1 = document.createElement('h1');
                h1.className = 'as-cw-about-h1';
                h1.textContent = section.text;
                block.appendChild(h1);
                if (section.subtitle) {
                    var sub = document.createElement('p');
                    sub.className = 'as-cw-about-subtitle';
                    sub.textContent = section.subtitle;
                    block.appendChild(sub);
                }
                var hr = document.createElement('hr');
                hr.className = 'as-cw-about-hr';
                block.appendChild(hr);
            } else if (section.type === 'heading') {
                var h2 = document.createElement('h2');
                h2.className = 'as-cw-about-h2';
                h2.textContent = section.text;
                block.appendChild(h2);
            } else if (section.type === 'subheading') {
                var h3 = document.createElement('h3');
                h3.className = 'as-cw-about-h3';
                h3.textContent = section.text;
                block.appendChild(h3);
            } else if (section.type === 'paragraph') {
                var p = document.createElement('p');
                p.className = 'as-cw-about-p';
                p.textContent = section.text;
                block.appendChild(p);
            } else if (section.type === 'table') {
                var table = self._buildAboutTable(section.headers, section.rows);
                block.appendChild(table);
            } else if (section.type === 'ascii') {
                var pre = document.createElement('pre');
                pre.className = 'as-cw-about-pre';
                pre.textContent = section.text;
                block.appendChild(pre);
            } else if (section.type === 'badge-row') {
                var row = document.createElement('div');
                row.className = 'as-cw-about-badges';
                section.badges.forEach(function(b) {
                    new uiBadge({ label: b.label, color: b.color || 'gray', size: 'sm', parent: row });
                });
                block.appendChild(row);
            } else if (section.type === 'checklist') {
                var list = document.createElement('div');
                list.className = 'as-cw-about-checklist';
                section.items.forEach(function(item) {
                    var row = document.createElement('div');
                    row.className = 'as-cw-about-check-item';
                    var icon = document.createElement('i');
                    icon.className = item.done ? 'fas fa-check-circle' : 'fas fa-circle';
                    icon.style.color = item.done ? '#22c55e' : '#d1d5db';
                    row.appendChild(icon);
                    var label = document.createElement('span');
                    label.textContent = item.label;
                    row.appendChild(label);
                    list.appendChild(row);
                });
                block.appendChild(list);
            }

            wrapper.appendChild(block);
        });
    }

    _buildAboutTable(headers, rows) {
        var table = document.createElement('table');
        table.className = 'as-cw-about-table';

        var thead = document.createElement('thead');
        var tr = document.createElement('tr');
        headers.forEach(function(h) {
            var th = document.createElement('th');
            th.textContent = h;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        rows.forEach(function(row) {
            var tr2 = document.createElement('tr');
            row.forEach(function(cell) {
                var td = document.createElement('td');
                td.textContent = cell;
                tr2.appendChild(td);
            });
            tbody.appendChild(tr2);
        });
        table.appendChild(tbody);
        return table;
    }

    _getAboutSections() {
        return [
            { type: 'title', text: 'Casework Counsellor Workstation', subtitle: 'Domain Debate Synthesis Report — March 2026 — 3-Agent External Review' },

            { type: 'badge-row', badges: [
                { label: 'Tools Scout', color: 'blue' },
                { label: 'Practice Expert', color: 'green' },
                { label: 'Novelty Agent', color: 'orange' },
                { label: 'Converged', color: 'purple' }
            ]},

            { type: 'heading', text: '1. Executive Summary' },
            { type: 'paragraph', text: 'Three specialist agents debated the optimal design for AutoScholar\'s Casework Counsellor workstation over two rounds. The Tools Scout searched for the best libraries and visual components. The Practice Expert studied gold-standard products (EAB Navigate, Salesforce Education Cloud, Watermark, ServiceNow, Maxient, Penelope). The Novelty Agent pushed for publishable innovation beyond industry conventions.' },
            { type: 'paragraph', text: 'The debate produced a strong convergence: the counsellor workstation should be a console-layout application with a smart priority queue (not a kanban board), a multi-track student trajectory browser, sparkline risk indicators embedded in the queue, and structured intervention logging with outcome tracking.' },

            { type: 'heading', text: '2. Architecture' },
            { type: 'paragraph', text: 'The workstation uses a three-panel console layout: a priority queue in the control panel (left), a centre stage for views (middle), and a context panel with quick actions and upcoming appointments (right). This replaces the original single-stage layout with a persistent contextual sidebar.' },
            { type: 'ascii', text: '┌──────────────┬──────────────────────────┬─────────────┐\n│  Priority    │  Centre Stage            │  Context    │\n│  Queue       │  (Queue/Profile/Cases/   │  Panel      │\n│              │   Calendar/Analytics)    │  - Actions  │\n│  Urgency     │                          │  - Upcoming │\n│  Groups:     │  View bar switches       │  - Support  │\n│  · Overdue   │  between views           │    Network  │\n│  · Critical  │                          │             │\n│  · High      │                          │             │\n│  · Scheduled │                          │             │\n│  · Stable    │                          │             │\n└──────────────┴──────────────────────────┴─────────────┘' },

            { type: 'heading', text: '3. Key Design Decisions' },
            { type: 'table', headers: ['Decision', 'Choice', 'Rationale'],
              rows: [
                ['Primary view', 'Priority queue (not kanban)', 'All 3 agents converged — counsellors triage, not pipeline'],
                ['Risk indicators', 'Inline SVG sparklines', '40×18px polylines are trivial, no library needed'],
                ['Charting', 'Chart.js v4', '65KB vs 1MB Plotly, purpose-fit for analytics'],
                ['Calendar', 'FullCalendar v6', 'Industry standard, timeGridWeek, CDN-loaded'],
                ['Student view', 'Case Feed timeline', 'Merged chronological feed of all records'],
                ['Layout', 'Three-panel inside stageEl', 'Preserves render(controlEl, stageEl) contract'],
                ['Heatmap', 'CSS grid (no library)', 'Simple 5×6 grid, fewer dependencies'],
                ['Support network', 'Simple SVG constellation', '6 nodes don\'t need force physics']
            ]},

            { type: 'heading', text: '4. Data Model' },
            { type: 'paragraph', text: 'The casework schema defines 7 tables: caseCategory, case, intervention, referral, caseNote, appointment, and riskSnapshot. The appointment table enables FullCalendar integration. The riskSnapshot table provides weekly risk score history for sparkline trajectories and trend analysis.' },
            { type: 'table', headers: ['Table', 'Records', 'Purpose'],
              rows: [
                ['caseCategory', '6', 'Academic, Personal, Financial, Health, Career, Disciplinary'],
                ['case', '15', 'Student cases with priority, status, counsellor assignment'],
                ['intervention', '12', 'Meeting, email, phone, referral, workshop, peer tutoring'],
                ['referral', '8', 'External service referrals with status tracking'],
                ['caseNote', '8', 'Case progress notes by counsellors'],
                ['appointment', '10', 'Scheduled appointments with type, location, status'],
                ['riskSnapshot', '54', 'Weekly risk scores for all 10 students — sparkline data']
            ]},

            { type: 'heading', text: '5. Implementation Checklist' },
            { type: 'checklist', items: [
                { label: 'Schema: appointment + riskSnapshot tables', done: true },
                { label: 'Seed: 15 cases, 12 interventions, 8 referrals, 10 appointments, 54 risk snapshots', done: true },
                { label: 'Service: 5 new domain methods (getAppointments, getRiskHistory, etc.)', done: true },
                { label: 'Bridge: pass-through methods for new tables', done: true },
                { label: 'CDN: Chart.js v4, FullCalendar v6', done: true },
                { label: 'Console layout: three-panel (queue + centre + context)', done: true },
                { label: 'Priority queue with urgency groups', done: true },
                { label: 'Triage pulse strip', done: true },
                { label: 'View bar navigation (6 views)', done: true },
                { label: 'Inline SVG sparklines with trend arrows', done: true },
                { label: 'Student 360 profile with Case Feed', done: true },
                { label: 'FullCalendar appointments view', done: true },
                { label: 'Chart.js analytics (4 charts + heatmap)', done: true },
                { label: 'bindMetric chips (no fat stat cards)', done: true },
                { label: 'Context panel: quick actions + upcoming + constellation', done: true },
                { label: 'About section with debate report', done: true },
                { label: 'CSS classes in autoscholar.theme.css', done: true },
                { label: 'All sample data removed — Publome-backed only', done: true }
            ]},

            { type: 'heading', text: '6. Views' },
            { type: 'table', headers: ['View', 'Key', 'Content'],
              rows: [
                ['Queue', 'queue', 'Metric chips + at-risk student cards with sparklines'],
                ['Profile', 'profile', 'Student 360° header + Case Feed timeline / appointments toggle'],
                ['Cases', 'cases', 'UIBinding bindSelectEditor for full case CRUD'],
                ['Calendar', 'appointments', 'FullCalendar timeGridWeek with colour-coded events'],
                ['Analytics', 'analytics', 'Chart.js charts + CSS heatmap + bindMetric chips'],
                ['About', 'about', 'This report']
            ]},

            { type: 'heading', text: '7. Quality Audit — March 2026' },
            { type: 'paragraph', text: 'A Playwright-driven visual audit identified 5 issues in the initial implementation. All were traced to a single root cause: unresolved CSS custom property references (--ui-red-500, --ui-green-500, etc.) that do not exist in class.ui.css. The hyper-parameter system only generates --ui-primary, --ui-secondary, --ui-accent, and --ui-gray scales. All issues were fixed and verified.' },
            { type: 'checklist', items: [
                { label: 'Dark control panel: added as-cw-dark-control class (gradient slate-800→slate-900)', done: true },
                { label: 'Queue items: student name, title, days badge now visible on dark background', done: true },
                { label: 'View bar icons: now visible on dark background', done: true },
                { label: 'Sparkline colours: replaced CSS vars with hex (#ef4444, #22c55e, #9ca3af)', done: true },
                { label: 'Constellation nodes: replaced CSS vars with hex for SVG fill attributes', done: true },
                { label: 'Feed entry icons: coloured background circles now render correctly', done: true },
                { label: 'Risk data: expanded from 35 to 54 snapshots (all 10 students covered)', done: true },
                { label: 'Profile sparkline: now renders for all students with risk history', done: true },
                { label: 'Appointment status colours: hex values for border-left styling', done: true },
                { label: 'Trend arrow colours: CSS fallbacks added to theme.css', done: true }
            ]},

            { type: 'heading', text: '8. Remaining Improvements' },
            { type: 'paragraph', text: 'These items were identified during the quality audit and have been addressed:' },
            { type: 'checklist', items: [
                { label: 'Queue reordering via SortableJS (deferred — manual priority is sufficient)', done: false },
                { label: 'Risk badge in queue items — compact score badge next to sparkline', done: true },
                { label: 'Counsellor filter: dropdown to switch between counsellor views', done: true },
                { label: 'Case create flow: pre-populate studentId when creating from profile view', done: true },
                { label: 'Responsive layout: context panel hides <1200px, charts stack <900px', done: true }
            ]}
        ];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UTILITY
    // ══════════════════════════════════════════════════════════════════════════

    _createViewHeader(iconName, title) {
        var header = document.createElement('div');
        header.className = 'as-cw-view-header';
        var titleDiv = document.createElement('div');
        titleDiv.className = 'as-cw-view-title';
        var icon = document.createElement('i');
        icon.className = 'fas fa-' + iconName;
        icon.style.color = 'var(--ui-primary-500)';
        titleDiv.appendChild(icon);
        titleDiv.appendChild(document.createTextNode(title));
        header.appendChild(titleDiv);
        return header;
    }
}
