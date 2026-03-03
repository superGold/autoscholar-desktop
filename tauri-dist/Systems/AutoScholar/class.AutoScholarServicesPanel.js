/**
 * AutoScholarServicesPanel - Service cards grid + control-stage plates
 *
 * Renders a grid of service cards. Clicking a card opens a
 * control-stage "plate" with stub controls and stage content.
 * Back button returns to the card grid.
 */

class AutoScholarServicesPanel {

    static GROUPS = [
        { key: 'classroom',     label: 'ClassView Connect',     icon: 'chalkboard-teacher', description: 'Lecturer tools for classroom management and student monitoring' },
        { key: 'student',       label: 'Student Central',        icon: 'user-graduate',      description: 'Self-service portal for academic tracking and career development' },
        { key: 'programme',     label: 'Programme Analyst',      icon: 'project-diagram',    description: 'Cohort tracking, curriculum analysis, and programme health' },
        { key: 'casework',      label: 'Casework Counsellor',    icon: 'hands-helping',      description: 'Case management, interventions, and support coordination' },
        { key: 'accreditation', label: 'Accreditation AutoMate', icon: 'certificate',        description: 'Evidence collection, GA mapping, and compliance reporting' },
        { key: 'executive',     label: 'Executive Insight',      icon: 'tachometer-alt',     description: 'Institutional KPIs, strategic analytics, and performance dashboards' },
        { key: 'admin',         label: 'System & Config',        icon: 'cogs',               description: 'User management, roles, integrations, and system settings' },
        { key: 'tools',         label: 'Communication & Tools',  icon: 'tools',              description: 'Messaging, search, scheduling, and cross-cutting utilities' },
        { key: 'advanced',      label: 'Advanced Analytics',     icon: 'robot',              description: 'AI coaching, predictive models, and next-generation analytics' },
        { key: 'utility',       label: 'Utility Services',       icon: 'toolbox',            description: 'Reusable picker and selection utilities' }
    ];

    static SERVICES = [
        // ── ClassView Connect ──────────────────────────────────────────
        { key: 'classView',     label: 'ClassView Connect',      icon: 'plug',                 group: 'classroom', description: 'Unified class dashboard — all analytics from one form', built: true },
        { key: 'risk',           label: 'Student Risk',           icon: 'exclamation-triangle', group: 'classroom', description: 'Z-score risk analysis & at-risk categorization', built: true },
        { key: 'roster',         label: 'Class Roster',           icon: 'users',                group: 'classroom', description: 'Browse enrolled students with marks & status', built: true },
        { key: 'gradebook',      label: 'Gradebook',              icon: 'clipboard-check',      group: 'classroom', description: 'Assessment management & grade entry', built: true },
        { key: 'attendance',     label: 'Attendance & DP',        icon: 'calendar-check',       group: 'classroom', description: 'Attendance tracking & DP status monitoring', built: true },
        { key: 'historical',     label: 'Historical Performance', icon: 'chart-line',           group: 'classroom', description: 'Year-over-year performance trends & statistics', built: true },
        { key: 'peerCorr',       label: 'Peer Correlation',       icon: 'balance-scale',        group: 'classroom', description: 'Cross-course correlation & benchmarking', built: true },
        { key: 'classAnalytics', label: 'Class Analytics',        icon: 'chart-bar',            group: 'classroom', description: 'Real-time class performance dashboard', built: true },
        { key: 'pollManager',    label: 'Quick Polls',            icon: 'poll',                 group: 'classroom', description: 'In-class polling for engagement & feedback', built: true },

        // ── Student Central ────────────────────────────────────────────
        { key: 'studentCentral', label: 'Student Central',         icon: 'graduation-cap',   group: 'student', description: 'Full integrated student portal — 9 tabs with sidebar navigation', built: true },
        { key: 'studentDash',    label: 'Student Dashboard',      icon: 'tachometer-alt',   group: 'student', description: 'Personal academic overview & deadlines', built: true },
        { key: 'myResults',      label: 'My Results',             icon: 'graduation-cap',   group: 'student', description: 'Academic record, marks & GPA tracking', built: true },
        { key: 'progressTracker',label: 'Degree Progress',        icon: 'tasks',            group: 'student', description: 'Credit tracking & graduation requirements', built: true },
        { key: 'cumLaude',       label: 'Cum Laude Tracker',      icon: 'award',            group: 'student', description: 'Class-of-pass projection & what-if scenarios', built: true },
        { key: 'portfolio',      label: 'Evidence Portfolio',     icon: 'folder-open',      group: 'student', description: 'Accreditation evidence collection & upload', built: true },
        { key: 'careerHub',      label: 'Career Hub',             icon: 'briefcase',        group: 'student', description: 'CV builder, bursaries, jobs & applications', built: true },
        { key: 'diary',          label: 'Study Diary',            icon: 'book',             group: 'student', description: 'Reflection journal, goals & study tracking', built: true },
        { key: 'achievements',   label: 'Achievements',           icon: 'trophy',           group: 'student', description: 'Badges, streaks, leaderboards & gamification', built: true },

        // ── Programme Analyst ──────────────────────────────────────────
        { key: 'progOverview',    label: 'Programme Overview',    icon: 'sitemap',          group: 'programme', description: 'Programme health dashboard & key metrics', built: true },
        { key: 'cohortTracker',   label: 'Cohort Tracker',        icon: 'layer-group',     group: 'programme', description: 'Cohort progression Sankey & dropout analysis', built: true },
        { key: 'progressionMap',  label: 'Progression Map',       icon: 'project-diagram', group: 'programme', description: 'Course prerequisite graph & pathways', built: true },
        { key: 'gatekeeper',      label: 'Gatekeeper Detection',  icon: 'door-closed',     group: 'programme', description: 'High-DFW course identification & analysis', built: true },
        { key: 'curriculumEditor',label: 'Curriculum Editor',     icon: 'edit',            group: 'programme', description: 'Programme structure & course sequencing', built: true },
        { key: 'outcomeMapping',  label: 'GA-Outcome Mapping',    icon: 'border-all',      group: 'programme', description: 'Graduate attribute to course outcome matrix', built: true },
        { key: 'cohortCompare',   label: 'Cohort Comparison',     icon: 'columns',         group: 'programme', description: 'Cross-cohort benchmarking over time', built: true },
        { key: 'progAnalyst',     label: 'Programme Analyst',     icon: 'microscope',      group: 'programme', description: 'Unified programme analysis dashboard', built: true },

        // ── Casework Counsellor ────────────────────────────────────────
        { key: 'caseManager',    label: 'Case Manager',           icon: 'clipboard-list',       group: 'casework', description: 'Student support case CRUD & tracking', built: true },
        { key: 'interventionLog',label: 'Intervention Tracker',   icon: 'hand-holding-heart',   group: 'casework', description: 'Intervention history, outcomes & effectiveness', built: true },
        { key: 'atRiskQueue',    label: 'At-Risk Queue',          icon: 'exclamation-circle',   group: 'casework', description: 'Flagged students awaiting triage & action', built: true },
        { key: 'referralTracker',label: 'Referral Manager',       icon: 'share-square',         group: 'casework', description: 'External referral creation & outcome tracking', built: true },
        { key: 'appointments',   label: 'Appointments',           icon: 'calendar-alt',         group: 'casework', description: 'Booking, scheduling & appointment management', built: true },
        { key: 'caseloadReport', label: 'Caseload Analytics',     icon: 'chart-pie',            group: 'casework', description: 'Workload metrics, outcomes & reporting', built: true },

        // ── Accreditation AutoMate ─────────────────────────────────────
        { key: 'accredDash',      label: 'Accreditation Dashboard', icon: 'certificate',   group: 'accreditation', description: 'Compliance overview & deadline tracking' },
        { key: 'gaMatrix',        label: 'GA Matrix Editor',       icon: 'border-all',    group: 'accreditation', description: 'Graduate attribute mapping (I/R/A levels)' },
        { key: 'portfolioReview', label: 'Portfolio Review',       icon: 'check-double',  group: 'accreditation', description: 'Evidence verification queue & workflow' },
        { key: 'evidenceLibrary', label: 'Evidence Library',       icon: 'archive',       group: 'accreditation', description: 'Searchable evidence repository & versioning' },
        { key: 'complianceReport',label: 'Compliance Reporting',   icon: 'file-alt',      group: 'accreditation', description: 'Generated compliance reports for visits' },
        { key: 'logicEditor',    label: 'ECSA Student Evaluation',  icon: 'user-check', group: 'accreditation', description: 'Evaluate individual students against ECSA graduate attributes — see per-GA compliance with reasons, gaps, and advisory', built: true },
        { key: 'studentEval',    label: 'Student GA Evaluation', icon: 'user-check',      group: 'accreditation', description: 'Evaluate individual students against graduate attribute logic packages across all levels' },
        { key: 'cohortReport',   label: 'Cohort Compliance',     icon: 'users',           group: 'accreditation', description: 'Programme-wide compliance reporting with per-student GA achievement and gap analysis' },

        // ── Executive Insight ──────────────────────────────────────────
        { key: 'execDash',       label: 'Executive Dashboard',    icon: 'tachometer-alt',       group: 'executive', description: 'Institutional KPIs & strategic overview', built: true },
        { key: 'enrolmentTrends',label: 'Enrolment Trends',       icon: 'chart-line',           group: 'executive', description: 'Registration analytics & forecasting', built: true },
        { key: 'throughput',     label: 'Throughput Analysis',     icon: 'filter',               group: 'executive', description: 'Graduation rates & completion metrics', built: true },
        { key: 'retentionReport',label: 'Retention Analytics',     icon: 'user-check',           group: 'executive', description: 'First-year retention & dropout analysis', built: true },
        { key: 'progComparison', label: 'Programme Benchmarking',  icon: 'chart-bar',            group: 'executive', description: 'Cross-programme performance comparison', built: true },

        // ── System & Config ────────────────────────────────────────────
        { key: 'userManager',    label: 'User Management',        icon: 'users-cog',    group: 'admin', description: 'User CRUD, roles & course access assignment', built: true },
        { key: 'roles',          label: 'Role Configuration',     icon: 'user-shield',  group: 'admin', description: 'Permission templates & access policies', built: true },
        { key: 'integrations',   label: 'System Integrations',    icon: 'plug',         group: 'admin', description: 'SIS, LMS & external system connections', built: true },
        { key: 'auditLog',       label: 'Audit Log',              icon: 'history',      group: 'admin', description: 'System activity trail & compliance logging' },
        { key: 'alertConfig',    label: 'Alert Rules',            icon: 'sliders-h',    group: 'admin', description: 'At-risk detection threshold configuration' },

        // ── Communication & Tools ──────────────────────────────────────
        { key: 'messaging',      label: 'Student Messaging',      icon: 'envelope',       group: 'tools', description: 'Templated email & in-app communications' },
        { key: 'browser',        label: 'Student Browser',        icon: 'search',         group: 'tools', description: 'Search & view student profiles across programmes' },
        { key: 'timetabling',    label: 'Timetable Manager',      icon: 'calendar-week',  group: 'tools', description: 'Schedule viewing, conflict detection & export' },
        { key: 'notifications',  label: 'Notification Centre',    icon: 'bell',           group: 'tools', description: 'Cross-module alerts, reminders & announcements' },
        { key: 'reporting',      label: 'Report Builder',         icon: 'file-export',    group: 'tools', description: 'Custom reports with export (CSV, PDF, Excel)' },

        // ── Advanced Analytics ─────────────────────────────────────────
        { key: 'aiCoach',         label: 'AI Academic Coach',     icon: 'robot',             group: 'advanced', description: 'AI-powered personalized study recommendations' },
        { key: 'successPredictor',label: 'Success Predictor',     icon: 'chart-area',        group: 'advanced', description: 'ML-based student outcome prediction model' },
        { key: 'learningAnalytics',label: 'Learning Analytics',   icon: 'brain',             group: 'advanced', description: 'LMS engagement analysis & behavioral patterns' },
        { key: 'wellness',        label: 'Wellness Monitor',      icon: 'heartbeat',         group: 'advanced', description: 'Student wellbeing indicators & support triggers' },
        { key: 'integrity',       label: 'Academic Integrity',    icon: 'shield-alt',        group: 'advanced', description: 'Plagiarism patterns & academic honesty monitoring' },
        { key: 'financialAid',    label: 'Financial Aid',         icon: 'hand-holding-usd',  group: 'advanced', description: 'Bursary tracking, NSFAS status & funding alerts' },

        // ── Utility Services ─────────────────────────────────────────────
        { key: 'coursePicker',    label: 'Course Picker',    icon: 'book',            group: 'utility', description: 'Modal course selector with search and pagination', built: true },
        { key: 'programmePicker',   label: 'Programme Picker',   icon: 'graduation-cap',     group: 'utility', description: 'Modal programme selector with search and pagination', built: true },
        { key: 'facultyPicker',     label: 'Faculty Picker',     icon: 'university',         group: 'utility', description: 'Modal faculty selector with search and pagination', built: true },
        { key: 'departmentPicker',  label: 'Department Picker',  icon: 'building',           group: 'utility', description: 'Modal department selector with search and pagination', built: true },
        { key: 'studentPicker',     label: 'Student Picker',     icon: 'user-graduate',      group: 'utility', description: 'Modal student selector with search and role filtering', built: true },
        { key: 'staffPicker',       label: 'Staff Picker',       icon: 'chalkboard-teacher', group: 'utility', description: 'Modal staff selector with search', built: true }
    ];

    constructor() {
        this._controlEl = null;
        this._stageEl = null;
        this._activeKey = null;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl, settings = {}) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        // Find the outer control-stage so we can remove it when showing plates
        this._outerCS = controlEl.closest('.ui-control-stage');
        this._tabPanel = this._outerCS.parentElement;

        // Auto-open a specific service plate, or show card grid
        const defaultService = settings.defaultService || null;
        if (defaultService) {
            this._showPlate(defaultService);
        } else {
            this._showCards();
        }
    }

    // ── Card Grid ───────────────────────────────────────────────────────────

    _showCards() {
        this._activeKey = null;

        // Remove plate if it exists
        if (this._plateEl) {
            this._plateEl.remove();
            this._plateEl = null;
        }

        // Re-attach outer control-stage to tab panel
        this._tabPanel.appendChild(this._outerCS);

        this._controlEl.innerHTML = '';
        this._stageEl.innerHTML = '';

        // Control: brief info
        const info = document.createElement('div');
        info.className = 'as-text-sm as-p-2';
        info.style.color = 'var(--ui-gray-600)';
        info.innerHTML = '<strong>AutoScholar Services</strong><br>Select a service card to open its control-stage plate.';
        this._controlEl.appendChild(info);

        const builtCount = AutoScholarServicesPanel.SERVICES.filter(s => s.built).length;
        const totalCount = AutoScholarServicesPanel.SERVICES.length;
        new uiBadge({ label: `${totalCount} services`, color: 'primary', size: 'sm', parent: this._controlEl });
        new uiBadge({ label: `${builtCount} built`, color: 'green', size: 'sm', parent: this._controlEl });

        // Stage: grouped card grid
        const stage = this._stageEl;
        stage.className = 'as-panel-stage-scroll';
        stage.style.padding = '0.5rem 1rem 2rem 1rem';

        AutoScholarServicesPanel.GROUPS.forEach(grp => {
            const services = AutoScholarServicesPanel.SERVICES.filter(s => s.group === grp.key);
            if (!services.length) return;

            // Group header
            const header = document.createElement('div');
            header.className = 'as-flex-row-center as-mb-2 as-sp-group-header';
            header.innerHTML = `
                <i class="fas fa-${grp.icon}" style="color: var(--ui-primary-500); font-size: 0.85rem; width: 20px; text-align: center;"></i>
                <span class="as-text-bold as-text-sm" style="color: var(--ui-gray-800);">${grp.label}</span>
                <span class="as-text-xs as-text-muted" style="margin-left: auto;">${services.length} services</span>`;
            stage.appendChild(header);

            // Card grid for this group
            const grid = document.createElement('div');
            grid.className = 'as-grid-auto as-mb-2';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(13rem, 1fr))';
            stage.appendChild(grid);

            services.forEach(svc => grid.appendChild(this._createCard(svc)));
        });
    }

    _createCard(svc) {
        const card = document.createElement('div');
        card.className = 'as-service-card as-flex-col';
        card.classList.add('as-sp-card-padded');

        // Icon
        const iconWrap = document.createElement('div');
        iconWrap.className = 'as-icon-box';
        iconWrap.classList.add('as-sp-icon-box');
        iconWrap.innerHTML = `<i class="fas fa-${svc.icon}" style="color: var(--ui-primary-600); font-size: 1rem;"></i>`;
        card.appendChild(iconWrap);

        // Label
        const label = document.createElement('div');
        label.className = 'as-text-bold as-text-sm';
        label.style.color = 'var(--ui-gray-800)';
        label.textContent = svc.label;
        card.appendChild(label);

        // Description
        const desc = document.createElement('div');
        desc.className = 'as-text-xs as-text-muted';
        desc.style.lineHeight = '1.4';
        desc.textContent = svc.description;
        card.appendChild(desc);

        // Built badge
        if (svc.built) {
            const badge = document.createElement('div');
            badge.className = 'as-sp-badge-bottom';
            badge.innerHTML = '<span class="as-badge" style="color: var(--ui-green-700); background: var(--ui-green-50); text-transform: uppercase; letter-spacing: 0.03em;">Built</span>';
            card.appendChild(badge);
        }

        card.addEventListener('click', () => this._showPlate(svc.key));
        return card;
    }

    // ── Plate (Control-Stage) ───────────────────────────────────────────────

    _showPlate(key) {
        this._activeKey = key;
        const svc = AutoScholarServicesPanel.SERVICES.find(s => s.key === key);
        if (!svc) return;

        // Remove outer CS from DOM entirely — plate takes full tab panel
        this._controlEl.innerHTML = '';
        this._stageEl.innerHTML = '';
        this._outerCS.remove();

        // Create plate directly in the tab panel
        const plate = document.createElement('div');
        plate.className = 'as-plate as-panel-stage';
        this._plateEl = plate;
        this._tabPanel.appendChild(plate);

        // Single uiControlStage — service name as header title
        const cs = new uiControlStage({
            template: 'unified',
            controlSize: 'sm',
            controlTitle: svc.label,
            parent: plate
        });
        cs.el.classList.add('as-sp-plate-flex');
        cs.el.classList.remove('ui-radius-md', 'ui-shadow-sm');

        const ctrl = cs.getControlPanel();
        const stage = cs.getStage();

        // Make stage a flex column so wrappers fill it
        stage.className = (stage.className || '') + ' as-panel-stage';

        // Service content wrapper (visible by default)
        this._stageServiceEl = document.createElement('div');
        this._stageServiceEl.className = 'as-stage-service as-panel-stage-scroll';
        this._stageServiceEl.style.display = 'flex';
        stage.appendChild(this._stageServiceEl);

        // About content wrapper (hidden by default, lazy-rendered)
        this._stageAboutEl = document.createElement('div');
        this._stageAboutEl.className = 'as-stage-about as-scrollable';
        this._stageAboutEl.style.display = 'none';
        stage.appendChild(this._stageAboutEl);

        this._aboutRendered = false;
        this._aboutVisible = false;

        // Control panel layout: back → scrollable content → about
        ctrl.classList.add('as-flex-col');
        ctrl.style.gap = '0';

        // Back button at top
        const backRow = document.createElement('div');
        backRow.className = 'as-flex-shrink-0 as-mb-2';
        backRow.classList.add('as-sp-back-row');
        ctrl.appendChild(backRow);

        new uiButton({
            label: 'Back to Services', variant: 'ghost', size: 'xs',
            icon: '<i class="fas fa-arrow-left"></i>',
            parent: backRow,
            onClick: () => this._showCards()
        });

        // Scrollable content area
        const ctrlContent = document.createElement('div');
        ctrlContent.className = 'as-scrollable';
        ctrl.appendChild(ctrlContent);

        // About button at bottom
        const aboutRow = document.createElement('div');
        aboutRow.className = 'as-flex-shrink-0';
        aboutRow.classList.add('as-sp-about-row');
        ctrl.appendChild(aboutRow);

        this._aboutBtn = new uiButton({
            label: 'About', variant: 'ghost', size: 'xs',
            icon: '<i class="fas fa-info-circle"></i>',
            parent: aboutRow,
            onClick: () => this._toggleAbout(key, svc)
        });

        // Populate content
        if (key === 'classView' && typeof ClassViewConnect !== 'undefined') {
            const cvPanel = new ClassViewConnect();
            cvPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'risk' && typeof RiskAssessmentPanel !== 'undefined') {
            const riskPanel = new RiskAssessmentPanel({ courseCode: 'HEWPP4A', year: 2024 });
            if (typeof MessagesService !== 'undefined') {
                riskPanel.bindMessenger(new MessagesService());
            }
            riskPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'roster' && typeof ClassRosterPanel !== 'undefined') {
            const rosterPanel = new ClassRosterPanel();
            rosterPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'gradebook' && typeof GradebookPanel !== 'undefined') {
            const gbPanel = new GradebookPanel({ courseCode: 'COMP101' });
            gbPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'attendance' && typeof AttendanceDPPanel !== 'undefined') {
            const attPanel = new AttendanceDPPanel({ courseCode: 'COMP101' });
            attPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'historical' && typeof HistoricalPerformancePanel !== 'undefined') {
            const histPanel = new HistoricalPerformancePanel();
            histPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'peerCorr' && typeof PeerCorrelationPanel !== 'undefined') {
            const peerPanel = new PeerCorrelationPanel();
            peerPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'classAnalytics' && typeof ClassAnalyticsPanel !== 'undefined') {
            const caPanel = new ClassAnalyticsPanel();
            caPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'pollManager' && typeof QuickPollsPanel !== 'undefined') {
            const pollPanel = new QuickPollsPanel({ courseCode: 'COMP101' });
            pollPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'userManager' && typeof UserManagementPanel !== 'undefined') {
            const umPanel = new UserManagementPanel();
            umPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'roles' && typeof RoleConfigurationPanel !== 'undefined') {
            const rcPanel = new RoleConfigurationPanel();
            rcPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'integrations' && typeof SystemIntegrationsPanel !== 'undefined') {
            const siPanel = new SystemIntegrationsPanel();
            siPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'careerHub' && typeof CareerHubPanel !== 'undefined') {
            // Wire CareerService if available
            let careerService = null;
            if (typeof CareerService !== 'undefined') {
                careerService = new CareerService();
                careerService.seedDemoData(1);
            }
            const chPanel = new CareerHubPanel({ careerService, memberId: 1 });
            chPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'studentCentral' && typeof StudentCentralPanel !== 'undefined') {
            new StudentCentralPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'studentDash' && typeof StudentDashPanel !== 'undefined') {
            const sdPanel = new StudentDashPanel();
            sdPanel.render(ctrlContent, this._stageServiceEl);
        } else if (key === 'myResults' && typeof MyResultsPanel !== 'undefined') {
            new MyResultsPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'progressTracker' && typeof DegreeProgressPanel !== 'undefined') {
            new DegreeProgressPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'cumLaude' && typeof CumLaudePanel !== 'undefined') {
            new CumLaudePanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'portfolio' && typeof EvidencePortfolioPanel !== 'undefined') {
            new EvidencePortfolioPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'diary' && typeof StudyDiaryPanel !== 'undefined') {
            new StudyDiaryPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'achievements' && typeof AchievementsPanel !== 'undefined') {
            new AchievementsPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'progOverview' && typeof ProgOverviewPanel !== 'undefined') {
            new ProgOverviewPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'gatekeeper' && typeof GatekeeperPanel !== 'undefined') {
            new GatekeeperPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'cohortTracker' && typeof CohortTrackerPanel !== 'undefined') {
            new CohortTrackerPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'cohortCompare' && typeof CohortComparePanel !== 'undefined') {
            new CohortComparePanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'progressionMap' && typeof ProgressionMapPanel !== 'undefined') {
            new ProgressionMapPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'outcomeMapping' && typeof OutcomeMappingPanel !== 'undefined') {
            new OutcomeMappingPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'curriculumEditor' && typeof CurriculumEditorPanel !== 'undefined') {
            new CurriculumEditorPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'progAnalyst' && typeof ProgAnalystPanel !== 'undefined') {
            new ProgAnalystPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'coursePicker' && typeof CoursePickerPanel !== 'undefined') {
            new CoursePickerPanel().render(ctrlContent, this._stageServiceEl);
        } else if (key === 'programmePicker' && typeof ProgrammePickerPanel !== 'undefined') {
            new ProgrammePickerPanel().render(ctrlContent, this._stageServiceEl);
        } else if (['facultyPicker','departmentPicker','studentPicker','staffPicker'].includes(key) && typeof PickerDemoPanel !== 'undefined') {
            const configKey = key.replace('Picker', '');
            new PickerDemoPanel(configKey).render(ctrlContent, this._stageServiceEl);
        } else if (['caseManager','interventionLog','atRiskQueue','referralTracker','appointments','caseloadReport'].includes(key) && typeof CaseworkCounsellorPanel !== 'undefined') {
            const cwPanel = new CaseworkCounsellorPanel();
            cwPanel.render(ctrlContent, this._stageServiceEl);
            // Auto-navigate to the appropriate view based on clicked card
            const viewMap = { caseManager: 'cases', interventionLog: 'interventions', atRiskQueue: 'atRisk', referralTracker: 'referrals', appointments: 'appointments', caseloadReport: 'analytics' };
            if (viewMap[key]) cwPanel._switchView(viewMap[key]);
        } else if (key === 'logicEditor' && typeof LogicComposerService !== 'undefined' && typeof ServiceRegistry !== 'undefined' && ServiceRegistry.has('logicComposer')) {
            this._renderLogicEditorPlate(ctrlContent, this._stageServiceEl);
        } else if (['execDash','enrolmentTrends','throughput','retentionReport','progComparison'].includes(key) && typeof ExecutiveInsightPanel !== 'undefined') {
            let executiveService = null;
            if (typeof ExecutiveService !== 'undefined') {
                executiveService = new ExecutiveService();
                executiveService.seedDemoData();
            }
            const viewMap = {
                execDash: 'dashboard', enrolmentTrends: 'counts',
                throughput: 'performance', retentionReport: 'students',
                progComparison: 'comparison'
            };
            const execPanel = new ExecutiveInsightPanel({ executiveService, view: viewMap[key] });
            execPanel.render(ctrlContent, this._stageServiceEl);
        } else {
            this._renderPlateControl(key, svc, ctrlContent);
            this._renderPlateStage(key, svc, this._stageServiceEl);
        }
    }

    // ── ECSA Student Evaluation Plate ──────────────────────────────────────

    static GA_DESCRIPTIONS = {
        GA1:  'Identify, formulate, analyse and solve complex engineering problems creatively and innovatively.',
        GA2:  'Apply knowledge of mathematics, natural science and engineering sciences to engineering problems.',
        GA3:  'Perform creative, procedural and non-procedural design and synthesis of components, systems, works, products or processes.',
        GA4:  'Conduct investigations and experiments, and analyse and interpret data.',
        GA5:  'Use appropriate engineering methods, skills and tools, including those based on information technology.',
        GA6:  'Communicate effectively, both orally and in writing, with engineering audiences and the community at large.',
        GA7:  'Demonstrate critical awareness of the impact of engineering activity on the social, industrial, and physical environment.',
        GA8:  'Work effectively as an individual, taking responsibility for own work and development.',
        GA9:  'Work effectively as a member of a team which may be composed of different disciplines and levels.',
        GA10: 'Demonstrate understanding of the need for professional development and the ability to function within relevant codes of conduct.',
        GA11: 'Demonstrate knowledge and understanding of engineering management principles and economic decision-making.'
    };

    static _getEcsaSampleStudents() {
        return [
            // ── Student A: Naledi Mokoena — Year 4, strong (~70% avg) ──
            {
                id: 'STU001', name: 'Naledi Mokoena', studentNumber: '220145832',
                programme: 'B.Eng Electrical Engineering', year: 4,
                courses: [
                    // Year 1
                    { code: 'ENEL1CA', name: 'Circuit Analysis Fundamentals', credits: 16, year: 1, finalMark: 72, status: 'passed', assessments: { test1: 68, test2: 74, assignment1: 78, exam: 70 } },
                    { code: 'MATH1AB', name: 'Engineering Mathematics I', credits: 16, year: 1, finalMark: 68, status: 'passed', assessments: { test1: 65, test2: 70, assignment1: 72, exam: 66 } },
                    { code: 'PHYS1AA', name: 'Physics for Engineers', credits: 16, year: 1, finalMark: 74, status: 'passed', assessments: { test1: 72, labReport: 76, exam: 73 } },
                    { code: 'CHEM1AB', name: 'Chemistry for Engineers', credits: 8, year: 1, finalMark: 66, status: 'passed', assessments: { test1: 62, labReport: 70, exam: 65 } },
                    { code: 'ENEL1CS', name: 'Computing & Programming', credits: 8, year: 1, finalMark: 75, status: 'passed', assessments: { test1: 72, project: 80, exam: 73 } },
                    { code: 'ENGL1TC', name: 'Technical Communication', credits: 8, year: 1, finalMark: 70, status: 'passed', assessments: { oral: 68, writtenReport: 72, groupProject: 71 } },
                    // Year 2
                    { code: 'ENEL2CA', name: 'Advanced Circuit Analysis', credits: 16, year: 2, finalMark: 64, status: 'passed', assessments: { test1: 60, test2: 66, assignment1: 68, exam: 62 } },
                    { code: 'MATH2AB', name: 'Engineering Mathematics II', credits: 16, year: 2, finalMark: 62, status: 'passed', assessments: { test1: 58, test2: 64, exam: 63 } },
                    { code: 'ENEL2EL', name: 'Electronics Laboratory', credits: 16, year: 2, finalMark: 71, status: 'passed', assessments: { labReport: 74, groupExperiment: 68, practical: 72, exam: 70 } },
                    { code: 'ENEL2TD', name: 'Technical Design', credits: 16, year: 2, finalMark: 69, status: 'passed', assessments: { assignment1: 66, designProject: 74, presentation: 68, exam: 67 } },
                    // Year 3
                    { code: 'ENEL3PS', name: 'Power Systems', credits: 16, year: 3, finalMark: 67, status: 'passed', assessments: { test1: 64, test2: 70, assignment1: 68, exam: 66 } },
                    { code: 'ENEL3GP', name: 'Group Design Project', credits: 16, year: 3, finalMark: 73, status: 'passed', assessments: { designReport: 76, presentation: 70, peerReview: 72 } },
                    { code: 'ENEL3RT', name: 'Research & Testing Lab', credits: 16, year: 3, finalMark: 68, status: 'passed', assessments: { labReport: 72, test1: 64, investigation: 68 } },
                    { code: 'ENEL3EM', name: 'Engineering Management & Ethics', credits: 8, year: 3, finalMark: 71, status: 'passed', assessments: { test1: 68, ethics: 74, assignment1: 70 } },
                    // Year 4
                    { code: 'ENEL4DP', name: 'Capstone Design Project', credits: 32, year: 4, finalMark: 72, status: 'passed', assessments: { problemAnalysis: 70, designReport: 74, presentation: 68, investigation: 72, impactAssessment: 66, projectPlan: 75 } },
                    { code: 'ENEL4WL', name: 'Work-Integrated Learning', credits: 16, year: 4, finalMark: 74, status: 'passed', assessments: { supervisorReport: 76, reflectiveJournal: 70, finalPresentation: 75 } }
                ]
            },

            // ── Student B: James van der Merwe — Year 3, borderline ──
            {
                id: 'STU002', name: 'James van der Merwe', studentNumber: '210298476',
                programme: 'B.Eng Electrical Engineering', year: 3,
                courses: [
                    // Year 1
                    { code: 'ENEL1CA', name: 'Circuit Analysis Fundamentals', credits: 16, year: 1, finalMark: 58, status: 'passed', assessments: { test1: 54, test2: 60, assignment1: 62, exam: 56 } },
                    { code: 'MATH1AB', name: 'Engineering Mathematics I', credits: 16, year: 1, finalMark: 55, status: 'passed', assessments: { test1: 52, test2: 56, assignment1: 58, exam: 54 } },
                    { code: 'PHYS1AA', name: 'Physics for Engineers', credits: 16, year: 1, finalMark: 60, status: 'passed', assessments: { test1: 58, labReport: 62, exam: 59 } },
                    { code: 'CHEM1AB', name: 'Chemistry for Engineers', credits: 8, year: 1, finalMark: 52, status: 'passed', assessments: { test1: 48, labReport: 55, exam: 52 } },
                    { code: 'ENEL1CS', name: 'Computing & Programming', credits: 8, year: 1, finalMark: 56, status: 'passed', assessments: { test1: 52, project: 60, exam: 55 } },
                    { code: 'ENGL1TC', name: 'Technical Communication', credits: 8, year: 1, finalMark: 62, status: 'passed', assessments: { oral: 58, writtenReport: 64, groupProject: 63 } },
                    // Year 2
                    { code: 'ENEL2CA', name: 'Advanced Circuit Analysis', credits: 16, year: 2, finalMark: 54, status: 'passed', assessments: { test1: 50, test2: 56, assignment1: 58, exam: 52 } },
                    { code: 'MATH2AB', name: 'Engineering Mathematics II', credits: 16, year: 2, finalMark: 56, status: 'passed', assessments: { test1: 52, test2: 58, exam: 56 } },
                    { code: 'ENEL2EL', name: 'Electronics Laboratory', credits: 16, year: 2, finalMark: 58, status: 'passed', assessments: { labReport: 56, groupExperiment: 54, practical: 60, exam: 58 } },
                    { code: 'ENEL2TD', name: 'Technical Design', credits: 16, year: 2, finalMark: 55, status: 'passed', assessments: { assignment1: 52, designProject: 58, presentation: 54, exam: 55 } },
                    // Year 3 (partial)
                    { code: 'ENEL3PS', name: 'Power Systems', credits: 16, year: 3, finalMark: 53, status: 'passed', assessments: { test1: 50, test2: 54, assignment1: 56, exam: 52 } },
                    { code: 'ENEL3GP', name: 'Group Design Project', credits: 16, year: 3, finalMark: 60, status: 'passed', assessments: { designReport: 58, presentation: 62, peerReview: 60 } },
                    { code: 'ENEL3EM', name: 'Engineering Management & Ethics', credits: 8, year: 3, finalMark: 57, status: 'passed', assessments: { test1: 54, ethics: 60, assignment1: 56 } }
                    // Missing: ENEL3RT, ENEL4DP, ENEL4WL
                ]
            },

            // ── Student C: Thandi Nkosi — Year 2, average ──
            {
                id: 'STU003', name: 'Thandi Nkosi', studentNumber: '220367891',
                programme: 'B.Eng Electrical Engineering', year: 2,
                courses: [
                    // Year 1
                    { code: 'ENEL1CA', name: 'Circuit Analysis Fundamentals', credits: 16, year: 1, finalMark: 64, status: 'passed', assessments: { test1: 60, test2: 66, assignment1: 68, exam: 62 } },
                    { code: 'MATH1AB', name: 'Engineering Mathematics I', credits: 16, year: 1, finalMark: 60, status: 'passed', assessments: { test1: 56, test2: 62, assignment1: 64, exam: 58 } },
                    { code: 'PHYS1AA', name: 'Physics for Engineers', credits: 16, year: 1, finalMark: 66, status: 'passed', assessments: { test1: 64, labReport: 68, exam: 65 } },
                    { code: 'CHEM1AB', name: 'Chemistry for Engineers', credits: 8, year: 1, finalMark: 58, status: 'passed', assessments: { test1: 54, labReport: 62, exam: 57 } },
                    { code: 'ENEL1CS', name: 'Computing & Programming', credits: 8, year: 1, finalMark: 62, status: 'passed', assessments: { test1: 58, project: 66, exam: 61 } },
                    { code: 'ENGL1TC', name: 'Technical Communication', credits: 8, year: 1, finalMark: 65, status: 'passed', assessments: { oral: 62, writtenReport: 68, groupProject: 64 } },
                    // Year 2
                    { code: 'ENEL2CA', name: 'Advanced Circuit Analysis', credits: 16, year: 2, finalMark: 56, status: 'passed', assessments: { test1: 52, test2: 58, assignment1: 60, exam: 54 } },
                    { code: 'MATH2AB', name: 'Engineering Mathematics II', credits: 16, year: 2, finalMark: 54, status: 'passed', assessments: { test1: 50, test2: 56, exam: 54 } },
                    { code: 'ENEL2EL', name: 'Electronics Laboratory', credits: 16, year: 2, finalMark: 61, status: 'passed', assessments: { labReport: 64, groupExperiment: 58, practical: 62, exam: 60 } },
                    { code: 'ENEL2TD', name: 'Technical Design', credits: 16, year: 2, finalMark: 57, status: 'passed', assessments: { assignment1: 54, designProject: 60, presentation: 52, exam: 58 } }
                    // Missing: all Year 3 and Year 4
                ]
            },

            // ── Student D: Ryan Pillay — Year 1, struggling ──
            {
                id: 'STU004', name: 'Ryan Pillay', studentNumber: '210412553',
                programme: 'B.Eng Electrical Engineering', year: 1,
                courses: [
                    // Year 1 only, some low marks
                    { code: 'ENEL1CA', name: 'Circuit Analysis Fundamentals', credits: 16, year: 1, finalMark: 52, status: 'passed', assessments: { test1: 48, test2: 54, assignment1: 56, exam: 50 } },
                    { code: 'MATH1AB', name: 'Engineering Mathematics I', credits: 16, year: 1, finalMark: 50, status: 'passed', assessments: { test1: 46, test2: 52, assignment1: 54, exam: 48 } },
                    { code: 'PHYS1AA', name: 'Physics for Engineers', credits: 16, year: 1, finalMark: 55, status: 'passed', assessments: { test1: 52, labReport: 58, exam: 54 } },
                    { code: 'CHEM1AB', name: 'Chemistry for Engineers', credits: 8, year: 1, finalMark: 48, status: 'failed', assessments: { test1: 44, labReport: 50, exam: 47 } },
                    { code: 'ENEL1CS', name: 'Computing & Programming', credits: 8, year: 1, finalMark: 53, status: 'passed', assessments: { test1: 50, project: 56, exam: 52 } },
                    { code: 'ENGL1TC', name: 'Technical Communication', credits: 8, year: 1, finalMark: 56, status: 'passed', assessments: { oral: 52, writtenReport: 58, groupProject: 56 } }
                ]
            }
        ];
    }

    /**
     * Build evaluator-compatible data from student courses.
     * Output: { student: { CODE: { finalMark, passed, ...assessments } } }
     */
    static _buildStudentEvalData(student) {
        const data = { student: {} };
        for (const course of student.courses) {
            data.student[course.code] = {
                finalMark: course.finalMark,
                passed: course.status === 'passed',
                ...course.assessments
            };
        }
        return data;
    }

    _renderLogicEditorPlate(ctrlContent, stageEl) {
        const logicService = ServiceRegistry.get('logicComposer');
        const students = AutoScholarServicesPanel._getEcsaSampleStudents();
        this._ecsaState = { logicService, students, lastResult: null, lastStudent: null, studentLocks: {} };

        // ── Control: Header ──
        const hdr = document.createElement('div');
        hdr.className = 'as-ctrl-row';
        hdr.innerHTML = '<div class="as-text-sm as-text-bold" style="color: var(--ui-white); margin-bottom: 0.15rem;"><i class="fas fa-user-check" style="margin-right: 0.4rem; color: var(--ui-primary-400);"></i>ECSA Graduate Attributes</div><div style="font-size: 0.65rem; color: var(--ui-gray-400);">Individual student evaluation</div>';
        ctrlContent.appendChild(hdr);

        // ── Control: Student selector ──
        const selWrap = document.createElement('div');
        selWrap.className = 'as-ctrl-row';
        ctrlContent.appendChild(selWrap);
        const selLabel = document.createElement('label');
        selLabel.className = 'as-ctrl-label';
        selLabel.classList.add('as-sp-ctrl-label-dark');
        selLabel.textContent = 'Student';
        selWrap.appendChild(selLabel);
        const stuSelect = document.createElement('select');
        stuSelect.className = 'ui-input';
        stuSelect.classList.add('as-sp-select-dark');
        students.forEach((s, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${s.name} (${s.studentNumber})`;
            stuSelect.appendChild(opt);
        });
        selWrap.appendChild(stuSelect);

        // ── Control: Evaluate button ──
        const btnRow = document.createElement('div');
        btnRow.className = 'as-mt-2';
        ctrlContent.appendChild(btnRow);
        new uiButton({ label: 'Evaluate Student', variant: 'primary', size: 'sm', icon: '<i class="fas fa-play"></i>', parent: btnRow, onClick: () => this._runStudentEvaluation() });

        // ── Control: Results summary (populated after eval) ──
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'as-mt-3';
        ctrlContent.appendChild(summaryDiv);
        this._ecsaState.summaryDiv = summaryDiv;
        this._ecsaState.stuSelect = stuSelect;

        // ── Stage: tab bar + scrollable content ──
        stageEl.style.display = 'block';
        stageEl.style.padding = '0';

        const tabKeys = ['criteria', 'evaluation', 'advisory'];
        const tabLabels = {
            criteria: '<i class="fas fa-list-alt"></i> Criteria',
            evaluation: '<i class="fas fa-clipboard-check"></i> Evaluation',
            advisory: '<i class="fas fa-lightbulb"></i> Advisory'
        };
        const tabBar = document.createElement('div');
        tabBar.className = 'as-flex-row';
        tabBar.classList.add('as-sp-tab-bar');
        stageEl.appendChild(tabBar);

        const tabBtns = {};
        tabKeys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'as-sp-tab-btn';
            btn.innerHTML = tabLabels[key];
            btn.addEventListener('click', () => {
                Object.values(tabBtns).forEach(b => { b.style.color = 'var(--ui-gray-500)'; b.style.borderBottomColor = 'transparent'; });
                btn.style.color = 'var(--ui-primary-600)';
                btn.style.borderBottomColor = 'var(--ui-primary-500)';
                this._ecsaState.activeTab = key;
                this._renderEcsaTabContent(key);
            });
            tabBar.appendChild(btn);
            tabBtns[key] = btn;
        });
        tabBtns.criteria.style.color = 'var(--ui-primary-600)';
        tabBtns.criteria.style.borderBottomColor = 'var(--ui-primary-500)';
        this._ecsaState.tabBtns = tabBtns;

        const contentWrap = document.createElement('div');
        contentWrap.className = 'as-p-3';
        stageEl.appendChild(contentWrap);

        this._ecsaState.contentWrap = contentWrap;
        this._ecsaState.activeTab = 'criteria';

        // Show criteria tab immediately (no eval needed)
        this._renderCriteriaTab(contentWrap);
    }

    _runStudentEvaluation() {
        const st = this._ecsaState;
        const stuIdx = parseInt(st.stuSelect.value);
        const student = st.students[stuIdx];
        const evalData = AutoScholarServicesPanel._buildStudentEvalData(student);
        const result = st.logicService.evaluateStudent(evalData, 'ECSA');

        // ── GA-locking: preserve previous passes ──
        if (!st.studentLocks[student.id]) st.studentLocks[student.id] = {};
        const locks = st.studentLocks[student.id];
        for (const r of result.results) {
            const key = `${r.attributeCode}_${r.levelCode}`;
            if (r.passed) locks[key] = true;
            if (locks[key]) r.passed = true; // locked — stays passed
        }

        // Recompute summary after locking
        const passed = result.results.filter(r => r.passed).length;
        result.summary = { total: result.results.length, passed, failed: result.results.length - passed };

        st.lastResult = result;
        st.lastStudent = student;
        st.lastEvalData = evalData;
        st.lockedResults = locks;

        // ── Update control summary ──
        const { summary } = result;
        st.summaryDiv.innerHTML = '';

        // Large score
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'as-sp-score-center';
        scoreDiv.innerHTML = `<div style="font-size: 2rem; font-weight: 800; color: var(--ui-primary-500);">${summary.passed}/${summary.total}</div><div class="as-text-xs" style="color: var(--ui-gray-400);">Criteria Met</div>`;
        st.summaryDiv.appendChild(scoreDiv);

        // Per-level breakdown
        const levelCounts = { EMERGING: { p: 0, t: 0 }, DEVELOPED: { p: 0, t: 0 }, EXIT_LEVEL: { p: 0, t: 0 } };
        for (const r of result.results) {
            if (levelCounts[r.levelCode]) {
                levelCounts[r.levelCode].t++;
                if (r.passed) levelCounts[r.levelCode].p++;
            }
        }
        const levelRow = document.createElement('div');
        levelRow.className = 'as-flex-wrap-tight as-mb-2';
        levelRow.style.justifyContent = 'center';
        st.summaryDiv.appendChild(levelRow);
        new uiBadge({ label: `Emerging: ${levelCounts.EMERGING.p}/${levelCounts.EMERGING.t}`, color: levelCounts.EMERGING.p === levelCounts.EMERGING.t ? 'green' : 'gray', size: 'xs', parent: levelRow });
        new uiBadge({ label: `Developed: ${levelCounts.DEVELOPED.p}/${levelCounts.DEVELOPED.t}`, color: levelCounts.DEVELOPED.p === levelCounts.DEVELOPED.t ? 'green' : 'gray', size: 'xs', parent: levelRow });
        new uiBadge({ label: `Exit: ${levelCounts.EXIT_LEVEL.p}/${levelCounts.EXIT_LEVEL.t}`, color: levelCounts.EXIT_LEVEL.p === levelCounts.EXIT_LEVEL.t ? 'green' : 'gray', size: 'xs', parent: levelRow });

        // Pass/fail badges
        const badgeRow = document.createElement('div');
        badgeRow.className = 'as-flex-wrap-tight as-mb-2';
        badgeRow.style.justifyContent = 'center';
        st.summaryDiv.appendChild(badgeRow);
        new uiBadge({ label: `${summary.passed} Passed`, color: 'green', size: 'xs', parent: badgeRow });
        new uiBadge({ label: `${summary.failed} Failed`, color: 'red', size: 'xs', parent: badgeRow });

        // Student info
        const totalCredits = student.courses.reduce((s, c) => s + c.credits, 0);
        const infoDiv = document.createElement('div');
        infoDiv.className = 'as-sp-info-center';
        infoDiv.innerHTML = `<div style="font-weight: 600; color: var(--ui-gray-300);">${student.name}</div><div>${student.programme}</div><div>Year ${student.year} | ${student.courses.length} courses | ${totalCredits} credits</div>`;
        st.summaryDiv.appendChild(infoDiv);

        // Render active tab
        this._renderEcsaTabContent(st.activeTab);
    }

    _renderEcsaTabContent(tabKey) {
        const st = this._ecsaState;
        st.contentWrap.innerHTML = '';
        if (tabKey === 'criteria') this._renderCriteriaTab(st.contentWrap);
        else if (tabKey === 'evaluation') this._renderEvaluationTab(st.contentWrap);
        else if (tabKey === 'advisory') this._renderAdvisoryTab(st.contentWrap);
    }

    // ── Tab 1: Criteria ─────────────────────────────────────────────────────

    _renderCriteriaTab(container) {
        const st = this._ecsaState;
        const logicService = st.logicService;

        const system = logicService.getSystem('ECSA');
        if (!system) { container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--ui-gray-400);">ECSA system not found.</div>'; return; }

        const attributes = logicService.getAttributes(system.idx);
        const levels = logicService.getLevels(system.idx);
        const packages = logicService.table('logicPackage').all();

        container.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'as-section-header as-mb-3';
        title.innerHTML = '<i class="fas fa-list-alt" style="margin-right: 0.4rem; color: var(--ui-primary-500);"></i>ECSA Graduate Attribute Requirements';
        container.appendChild(title);

        const subtitle = document.createElement('div');
        subtitle.className = 'as-section-desc';
        subtitle.style.marginBottom = '1rem';
        subtitle.textContent = '11 graduate attributes × 3 levels with course-code criteria and minimum marks. B.Eng Electrical Engineering curriculum.';
        container.appendChild(subtitle);

        for (const attr of attributes) {
            const code = attr.get('code');
            const label = attr.get('label');
            const desc = AutoScholarServicesPanel.GA_DESCRIPTIONS[code] || '';

            const card = document.createElement('div');
            card.className = 'as-card as-mb-2';
            card.style.padding = '0.8rem';

            // Header with version
            const cardHdr = document.createElement('div');
            cardHdr.className = 'as-flex-row-center as-mb-2';
            cardHdr.innerHTML = `<span class="as-badge" style="background: var(--ui-primary-100); color: var(--ui-primary-700); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem;">${code}</span><span class="as-text-bold as-text-sm" style="color: var(--ui-gray-800);">${label}</span><span class="as-text-xs as-text-muted" style="margin-left: auto;">v2019-2025</span>`;
            card.appendChild(cardHdr);

            if (desc) {
                const descEl = document.createElement('div');
                descEl.className = 'as-section-desc as-mb-2';
                descEl.textContent = desc;
                card.appendChild(descEl);
            }

            // Show 3 levels
            const levelColors = { EMERGING: '#6366f1', DEVELOPED: '#d97706', EXIT_LEVEL: '#059669' };
            for (const level of levels) {
                const pkg = packages.find(p =>
                    p.get('attributeId') === attr.idx &&
                    p.get('levelId') === level.idx &&
                    p.get('isActive')
                );
                if (!pkg) continue;

                const roots = logicService.getRootNodes(pkg.idx);
                if (!roots.length) continue;

                const lvlColor = levelColors[level.get('code')] || 'var(--ui-gray-600)';
                const lvlSection = document.createElement('div');
                lvlSection.className = 'as-sp-lvl-section';
                lvlSection.style.borderLeftColor = lvlColor;
                lvlSection.style.background = `${lvlColor}08`;

                const lvlHdr = document.createElement('div');
                lvlHdr.className = 'as-sp-lvl-hdr';
                lvlHdr.style.color = lvlColor;
                lvlHdr.textContent = level.get('label');
                lvlSection.appendChild(lvlHdr);

                this._renderCriteriaTree(lvlSection, logicService, roots, 0);
                card.appendChild(lvlSection);
            }

            container.appendChild(card);
        }
    }

    _renderCriteriaTree(container, logicService, nodes, depth) {
        for (const node of nodes) {
            const type = node.get('nodeType');
            const label = node.get('label') || '';
            const children = logicService.getChildren(node.idx);

            const row = document.createElement('div');
            row.className = 'as-sp-criteria-row';
            row.style.paddingLeft = `${depth + 0.3}rem`;

            if (type === 'AND') {
                row.innerHTML = `<span style="color: var(--ui-primary-600); font-weight: 600;">ALL of:</span> <span style="color: var(--ui-gray-500); font-size: 0.68rem;">${label}</span>`;
            } else if (type === 'OR') {
                row.innerHTML = `<span style="color: #16a34a; font-weight: 600;">ANY of:</span> <span style="color: var(--ui-gray-500); font-size: 0.68rem;">${label}</span>`;
            } else if (type === 'anyNof') {
                const n = node.get('nRequired') || 1;
                row.innerHTML = `At least <span style="font-weight: 700; color: var(--ui-primary-600);">${n}</span> of: <span style="color: var(--ui-gray-500); font-size: 0.68rem;">${label}</span>`;
            } else if (type === 'criterion') {
                const attrPath = node.get('attrPath') || '';
                const value = node.get('value') || '';
                // Parse course code and assessment from attrPath: student.CODE.assessment
                const parts = attrPath.split('.');
                const courseCode = parts[1] || '';
                const assessment = parts[2] || '';
                const isAssessment = assessment && assessment !== 'finalMark';
                const display = isAssessment ? `${courseCode}.${assessment}` : courseCode;

                row.innerHTML = `<i class="fas fa-chevron-right" style="font-size: 0.5rem; margin-right: 0.3rem; color: var(--ui-gray-400);"></i><code style="font-size: 0.7rem; background: var(--ui-gray-100); padding: 0.05rem 0.3rem; border-radius: 3px;">${display}</code> <span style="color: var(--ui-gray-500);">${this._fmtOp('gte')}${value}%</span> <span style="color: var(--ui-gray-400); font-size: 0.68rem;">— ${label}</span>`;
            }

            container.appendChild(row);

            if (children.length) {
                this._renderCriteriaTree(container, logicService, children, depth + 1);
            }
        }
    }

    // ── Tab 2: Evaluation ───────────────────────────────────────────────────

    _renderEvaluationTab(container) {
        const st = this._ecsaState;
        if (!st.lastResult) {
            container.innerHTML = '<div style="text-align: center; padding: 4rem 1rem; color: var(--ui-gray-400);"><i class="fas fa-user-check" style="font-size: 2.5rem; margin-bottom: 0.8rem; opacity: 0.3; display: block;"></i>Select a student and click <strong>Evaluate Student</strong></div>';
            return;
        }

        const student = st.lastStudent;
        const evalData = st.lastEvalData;
        const { results, summary } = st.lastResult;
        const locks = st.lockedResults || {};

        // ── Section A: Student Academic Record ──
        const recHdr = document.createElement('div');
        recHdr.className = 'as-section-header as-mb-2';
        recHdr.innerHTML = `<i class="fas fa-graduation-cap" style="margin-right: 0.4rem; color: var(--ui-primary-500);"></i>${student.name} — Academic Record`;
        container.appendChild(recHdr);

        // Course table with assessments
        const tableWrap = document.createElement('div');
        tableWrap.className = 'as-card';
        tableWrap.classList.add('as-sp-table-wrap');
        container.appendChild(tableWrap);

        const table = document.createElement('table');
        table.className = 'as-sp-record-table';
        const thStyle = 'padding: 0.35rem 0.5rem; text-align: left; font-weight: 600; color: var(--ui-gray-600); font-size: 0.6rem; text-transform: uppercase;';
        table.innerHTML = `<thead><tr style="background: var(--ui-gray-50);"><th style="${thStyle}">Code</th><th style="${thStyle}">Course</th><th style="${thStyle} text-align: center;">Yr</th><th style="${thStyle} text-align: center;">Cr</th><th style="${thStyle} text-align: center;">Final</th><th style="${thStyle}">Assessments</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        student.courses.forEach(c => {
            const tr = document.createElement('tr');
            tr.className = 'as-sp-record-tr';
            const fm = c.finalMark;
            const gradeColor = fm >= 75 ? '#059669' : fm >= 60 ? '#d97706' : fm >= 50 ? '#ea580c' : '#dc2626';
            const statusBg = c.status === 'passed' ? '#d1fae5' : '#fee2e2';
            const statusColor = c.status === 'passed' ? '#059669' : '#dc2626';
            const assessStr = Object.entries(c.assessments || {}).map(([k, v]) => `${k}:${v}`).join(', ');
            tr.innerHTML = `<td style="padding: 0.3rem 0.5rem; font-weight: 600; color: var(--ui-gray-700);"><code>${c.code}</code></td><td style="padding: 0.3rem 0.5rem; color: var(--ui-gray-600); max-width: 12rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.name}</td><td style="padding: 0.3rem 0.5rem; text-align: center; color: var(--ui-gray-500);">${c.year}</td><td style="padding: 0.3rem 0.5rem; text-align: center;">${c.credits}</td><td style="padding: 0.3rem 0.5rem; text-align: center; font-weight: 700; color: ${gradeColor};">${fm}%</td><td style="padding: 0.3rem 0.5rem; font-size: 0.65rem; color: var(--ui-gray-500);">${assessStr}</td>`;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        tableWrap.appendChild(table);

        // ── Section B: GA Results grouped by attribute ──
        const gaHdr = document.createElement('div');
        gaHdr.className = 'as-section-header as-mb-2';
        gaHdr.innerHTML = '<i class="fas fa-clipboard-check" style="margin-right: 0.4rem; color: var(--ui-primary-500);"></i>Graduate Attribute Results';
        container.appendChild(gaHdr);

        // Group results by GA
        const gaMap = {};
        for (const r of results) {
            if (!gaMap[r.attributeCode]) gaMap[r.attributeCode] = { label: r.attributeLabel, levels: [] };
            gaMap[r.attributeCode].levels.push(r);
        }

        const levelOrder = ['EMERGING', 'DEVELOPED', 'EXIT_LEVEL'];
        const levelColors = { EMERGING: '#6366f1', DEVELOPED: '#d97706', EXIT_LEVEL: '#059669' };

        for (const [gaCode, ga] of Object.entries(gaMap)) {
            const allPassed = ga.levels.every(l => l.passed);
            const somePassed = ga.levels.some(l => l.passed);
            const borderColor = allPassed ? '#059669' : somePassed ? '#3b82f6' : '#dc2626';
            const bgColor = allPassed ? '#f0fdf4' : somePassed ? '#eff6ff' : '#fef2f2';

            const card = document.createElement('div');
            card.className = 'as-sp-ga-result-card';
            card.style.borderLeftColor = borderColor;
            card.style.background = bgColor;

            // GA header
            const cardHdr = document.createElement('div');
            cardHdr.className = 'as-flex-row-center as-mb-2';
            const passCount = ga.levels.filter(l => l.passed).length;
            cardHdr.innerHTML = `<span class="as-text-bold" style="font-size: 0.78rem; color: var(--ui-gray-800);">${gaCode} — ${ga.label}</span><span class="as-text-xs as-text-muted" style="margin-left: auto;">v2019-25</span><span class="as-text-bold" style="font-size: 0.68rem; color: ${borderColor};">${passCount}/${ga.levels.length}</span>`;
            card.appendChild(cardHdr);

            // Sort levels
            ga.levels.sort((a, b) => levelOrder.indexOf(a.levelCode) - levelOrder.indexOf(b.levelCode));

            for (const lvl of ga.levels) {
                const isLocked = locks[`${gaCode}_${lvl.levelCode}`] && lvl.passed;
                const lvlColor = levelColors[lvl.levelCode] || '#6b7280';
                const icon = lvl.passed
                    ? (isLocked ? '<i class="fas fa-lock" style="color: #059669;"></i>' : '<i class="fas fa-check-circle" style="color: #059669;"></i>')
                    : '<i class="fas fa-times-circle" style="color: #dc2626;"></i>';
                const statusText = lvl.passed ? (isLocked ? 'LOCKED' : 'PASS') : 'FAIL';

                const lvlRow = document.createElement('div');
                lvlRow.className = 'as-sp-lvl-row';
                lvlRow.style.borderLeftColor = lvlColor;

                const lvlHdr = document.createElement('div');
                lvlHdr.className = 'as-flex-row-center';
                lvlHdr.style.fontSize = '0.72rem';
                lvlHdr.innerHTML = `${icon} <span style="font-weight: 600; color: ${lvlColor};">${lvl.levelLabel}</span><span style="color: var(--ui-gray-400); font-size: 0.65rem;">${statusText}</span>`;
                lvlRow.appendChild(lvlHdr);

                // Render sub-criteria with actual marks
                if (lvl.details && lvl.details.length) {
                    this._renderEvalNodeChildren(lvlRow, lvl.details[0], evalData, 1);
                }

                card.appendChild(lvlRow);
            }

            container.appendChild(card);
        }
    }

    /** Recursively render evaluation result tree with actual marks */
    _renderEvalNodeChildren(container, node, evalData, depth) {
        const children = node.children || [];
        for (const child of children) {
            const ci = child.passed
                ? '<i class="fas fa-check" style="color: #059669; font-size: 0.6rem;"></i>'
                : '<i class="fas fa-times" style="color: #dc2626; font-size: 0.6rem;"></i>';
            let text = '';

            if (child.nodeType === 'criterion') {
                const label = child.label || '';
                const actual = child.actual;
                const expected = child.expected;
                // Extract course.assessment from label for display
                if (actual === '' || actual == null || actual === 'undefined') {
                    text = `${label} <span style="color: #9ca3af; font-style: italic;">(not enrolled)</span>`;
                } else {
                    const numActual = parseFloat(actual);
                    const numExpected = parseFloat(expected);
                    if (child.passed) {
                        text = `${label} <span style="color: #059669;">(have ${numActual})</span>`;
                    } else {
                        const gap = numExpected - numActual;
                        text = `${label} <span style="color: #dc2626;">(have ${numActual}, gap: ${gap > 0 ? gap : 0})</span>`;
                    }
                }
            } else if (child.nodeType === 'anyNof') {
                text = `${child.label}: <span style="color: var(--ui-gray-500);">${child.detail || ''}</span>`;
            } else if (child.nodeType === 'AND') {
                text = `<span style="font-weight: 600; color: var(--ui-primary-600);">ALL of:</span> ${child.label || ''}`;
            } else if (child.nodeType === 'OR') {
                text = `<span style="font-weight: 600; color: #16a34a;">ANY of:</span> ${child.label || ''}`;
            } else {
                text = child.label || child.detail || '';
            }

            const row = document.createElement('div');
            row.className = 'as-sp-eval-node';
            row.style.paddingLeft = `${depth * 0.8}rem`;
            row.innerHTML = `${ci} <span>${text}</span>`;
            container.appendChild(row);

            // Recurse into children of composite nodes
            if (child.children && child.children.length) {
                this._renderEvalNodeChildren(container, child, evalData, depth + 1);
            }
        }
    }

    _fmtOp(op) {
        const map = { gte: '\u2265', gt: '>', lte: '\u2264', lt: '<', eq: '=', neq: '\u2260' };
        return map[op] || op;
    }

    // ── Tab 3: Advisory ─────────────────────────────────────────────────────

    _renderAdvisoryTab(container) {
        const st = this._ecsaState;
        if (!st.lastResult) {
            container.innerHTML = '<div style="text-align: center; padding: 4rem 1rem; color: var(--ui-gray-400);"><i class="fas fa-lightbulb" style="font-size: 2.5rem; margin-bottom: 0.8rem; opacity: 0.3; display: block;"></i>Select a student and click <strong>Evaluate Student</strong></div>';
            return;
        }

        const student = st.lastStudent;
        const evalData = st.lastEvalData;
        const { results, summary } = st.lastResult;
        const pct = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
        const failedResults = results.filter(r => !r.passed);

        // ── Overall readiness alert ──
        const alertColor = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
        const firstName = student.name.split(' ')[0];
        const alertMsg = failedResults.length === 0
            ? `${firstName}, you meet all ${summary.total} criteria across 11 GAs at all levels. Fully compliant for ECSA accreditation.`
            : `${firstName}, you meet ${summary.passed} of ${summary.total} criteria. Address ${failedResults.length} area${failedResults.length > 1 ? 's' : ''} below.`;

        new uiAlert({
            color: alertColor,
            title: `${summary.passed}/${summary.total} Criteria Met`,
            message: alertMsg,
            parent: container
        });

        // Progress bar
        const progBar = document.createElement('div');
        progBar.className = 'as-flex-row-center';
        progBar.classList.add('as-sp-progress-spacing');
        const barFg = pct >= 80 ? 'var(--ui-green-600)' : pct >= 50 ? 'var(--ui-amber-600)' : 'var(--ui-red-600)';
        progBar.innerHTML = `<div class="as-bar-bg as-flex-1" style="height: 10px;"><div class="as-bar-fill" style="width: ${pct}%; background: ${barFg};"></div></div><span class="as-text-bold as-text-xs" style="color: ${barFg};">${pct}%</span>`;
        container.appendChild(progBar);

        if (failedResults.length === 0) {
            const success = document.createElement('div');
            success.className = 'as-sp-success-center';
            success.innerHTML = '<i class="fas fa-trophy" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i><div style="font-weight: 700; font-size: 0.9rem;">Full Compliance Achieved</div><div style="font-size: 0.75rem; color: var(--ui-gray-500); margin-top: 0.3rem;">No action items required.</div>';
            container.appendChild(success);
            return;
        }

        // ── Per-failed-criterion advice cards ──
        const advHdr = document.createElement('div');
        advHdr.className = 'as-section-header as-mb-2';
        advHdr.innerHTML = '<i class="fas fa-lightbulb" style="margin-right: 0.4rem; color: var(--ui-amber-600);"></i>Recommended Actions';
        container.appendChild(advHdr);

        const actionItems = [];
        const sortedFailed = [...failedResults].sort((a, b) => a.score - b.score);

        for (const r of sortedFailed) {
            const score = r.score;
            const priorityColor = score < 0.3 ? '#dc2626' : score < 0.7 ? '#d97706' : '#16a34a';
            const priorityLabel = score < 0.3 ? 'HIGH PRIORITY' : score < 0.7 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY';
            const priorityIcon = score < 0.3 ? 'fa-exclamation-circle' : score < 0.7 ? 'fa-exclamation-triangle' : 'fa-info-circle';
            const priorityTag = score < 0.3 ? 'HIGH' : score < 0.7 ? 'MED' : 'LOW';

            const card = document.createElement('div');
            card.className = 'as-sp-priority-card';
            card.style.borderLeftColor = priorityColor;

            const priHdr = document.createElement('div');
            priHdr.className = 'as-sp-priority-hdr';
            priHdr.style.color = priorityColor;
            priHdr.innerHTML = `<i class="fas ${priorityIcon}"></i> ${priorityLabel}`;
            card.appendChild(priHdr);

            const gaTitle = document.createElement('div');
            gaTitle.className = 'as-sp-ga-title';
            gaTitle.textContent = `${r.attributeCode} — ${r.attributeLabel} (${r.levelLabel})`;
            card.appendChild(gaTitle);

            // Collect failed leaf criteria recursively
            const failedLeaves = [];
            const collectFailed = (node) => {
                if (!node) return;
                if (node.nodeType === 'criterion' && !node.passed) {
                    failedLeaves.push(node);
                }
                if (node.children) node.children.forEach(collectFailed);
            };
            if (r.details) r.details.forEach(collectFailed);

            for (const leaf of failedLeaves) {
                const label = leaf.label || '';
                const actual = leaf.actual;
                const expected = parseFloat(leaf.expected) || 50;

                // Parse course code from attrPath via label
                let gapText, adviceText;
                if (actual === '' || actual == null || actual === 'undefined') {
                    // Not enrolled
                    gapText = `${label} — not yet taken`;
                    adviceText = `Enrol in this course`;
                } else {
                    const numActual = parseFloat(actual) || 0;
                    const gap = expected - numActual;
                    gapText = `${label} — currently ${numActual}%, need ${this._fmtOp('gte')}${expected}% (gap: ${gap > 0 ? gap : 0}%)`;
                    adviceText = gap > 15
                        ? `Significant improvement needed — consider tutoring or retaking`
                        : `Improve by ${gap}% — focus on this assessment`;
                }

                const gapRow = document.createElement('div');
                gapRow.className = 'as-sp-gap-row';
                gapRow.innerHTML = `<span style="color: #dc2626; flex-shrink: 0;"><i class="fas fa-minus-circle" style="font-size: 0.6rem;"></i></span> <span><strong>Gap:</strong> ${gapText}</span>`;
                card.appendChild(gapRow);

                const advRow = document.createElement('div');
                advRow.className = 'as-sp-advice-row';
                advRow.innerHTML = `<span style="color: var(--ui-primary-600); flex-shrink: 0;"><i class="fas fa-arrow-right" style="font-size: 0.55rem;"></i></span> <span><strong>Action:</strong> ${adviceText}</span>`;
                card.appendChild(advRow);

                actionItems.push({ tag: priorityTag, text: adviceText, ga: r.attributeCode, level: r.levelLabel });
            }

            container.appendChild(card);
        }

        // ── Action Items Summary ──
        if (actionItems.length) {
            const sumCard = document.createElement('div');
            sumCard.className = 'as-card as-mt-3';
            sumCard.style.background = 'var(--ui-gray-50)';

            const sumHdr = document.createElement('div');
            sumHdr.className = 'as-section-header as-mb-2';
            sumHdr.style.fontSize = '0.8rem';
            sumHdr.innerHTML = '<i class="fas fa-tasks" style="margin-right: 0.4rem; color: var(--ui-primary-500);"></i>Action Items Summary';
            sumCard.appendChild(sumHdr);

            actionItems.forEach((item, i) => {
                const tagColor = item.tag === 'HIGH' ? '#dc2626' : item.tag === 'MED' ? '#d97706' : '#16a34a';
                const itemRow = document.createElement('div');
                itemRow.className = 'as-sp-action-item';
                itemRow.innerHTML = `<span style="font-weight: 700; color: var(--ui-gray-400); min-width: 16px;">${i + 1}.</span><span style="background: ${tagColor}15; color: ${tagColor}; padding: 0 0.3rem; border-radius: 3px; font-size: 0.6rem; font-weight: 700; flex-shrink: 0;">${item.tag}</span><span>${item.text} <span style="color: var(--ui-gray-400);">(${item.ga} ${item.level})</span></span>`;
                sumCard.appendChild(itemRow);
            });

            container.appendChild(sumCard);
        }
    }

    _toggleAbout(key, svc) {
        if (this._aboutVisible) {
            // Return to service view
            this._stageAboutEl.style.display = 'none';
            this._stageServiceEl.style.display = 'flex';
            this._aboutVisible = false;
            this._aboutBtn.update({ label: 'About', icon: '<i class="fas fa-info-circle"></i>' });
            this._aboutBtn.el.style.background = '';
            return;
        }

        // Show about, hide service
        this._stageServiceEl.style.display = 'none';
        this._stageAboutEl.style.display = 'block';
        this._aboutVisible = true;
        this._aboutBtn.update({ label: 'Back to Service', icon: '<i class="fas fa-arrow-left"></i>' });
        this._aboutBtn.el.style.background = 'rgba(255,255,255,0.1)';

        // Lazy render on first toggle
        if (!this._aboutRendered) {
            this._renderAboutContent(key, svc);
            this._aboutRendered = true;
        }
    }

    // ── About Content Rendering ─────────────────────────────────────────

    _renderAboutContent(key, svc) {
        const about = this._aboutContent();
        const info = about[key];
        if (info && info.comprehensive) {
            this._renderComprehensiveAbout(key, svc, info);
        } else {
            this._renderBriefAbout(key, svc, info);
        }
    }

    _renderBriefAbout(key, svc, info) {
        const container = this._stageAboutEl;
        const grp = AutoScholarServicesPanel.GROUPS.find(g => g.key === svc.group);

        // Max-width wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'as-sp-about-wrapper';
        container.appendChild(wrapper);

        // Title
        const title = document.createElement('h2');
        title.className = 'as-sp-about-title';
        title.innerHTML = `<i class="fas fa-${svc.icon}" style="margin-right: 0.5rem; color: var(--ui-primary-600);"></i>${svc.label} — Development Notes`;
        wrapper.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'as-sp-about-subtitle';
        subtitle.textContent = grp ? grp.label + ' subsystem' : '';
        wrapper.appendChild(subtitle);

        // ── Overview ──
        const overviewBody = this._aboutSection(wrapper, 'fa-eye', 'Overview');
        const descP = document.createElement('p');
        descP.className = 'as-sp-about-body';
        descP.textContent = info ? info.description : svc.description;
        overviewBody.appendChild(descP);

        // ── Features to Build ──
        if (info && info.features && info.features.length) {
            const featBody = this._aboutSection(wrapper, 'fa-check-circle', 'Features to Build');
            info.features.forEach(f => {
                const item = document.createElement('div');
                item.className = 'as-sp-feature-item';
                item.innerHTML = `<i class="fas fa-check" style="color: var(--ui-primary-500); margin-right: 0.4rem; font-size: 0.65rem;"></i>${f}`;
                featBody.appendChild(item);
            });
        }

        // ── Development Plan ──
        if (info && info.devPlan && info.devPlan.length) {
            const planBody = this._aboutSection(wrapper, 'fa-clipboard-list', 'Development Plan');
            const ol = document.createElement('ol');
            ol.className = 'as-sp-dev-plan-ol';
            info.devPlan.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                ol.appendChild(li);
            });
            planBody.appendChild(ol);
        }

        // ── Data Requirements ──
        if (info && info.dataSources && info.dataSources.length) {
            const dsBody = this._aboutSection(wrapper, 'fa-database', 'Data Requirements');
            const dsRow = document.createElement('div');
            dsRow.className = 'as-flex-wrap-tight';
            dsBody.appendChild(dsRow);
            info.dataSources.forEach(d => {
                new uiBadge({ label: d, color: 'gray', size: 'xs', parent: dsRow });
            });
        }

        // ── References ──
        if (info && info.references && info.references.length) {
            const refBody = this._aboutSection(wrapper, 'fa-book', 'References');
            info.references.forEach(c => {
                const cite = document.createElement('div');
                cite.className = 'as-sp-citation';
                cite.innerHTML = `
                    <div class="as-sp-citation-author">${c.authors} (${c.year})</div>
                    <div class="as-sp-citation-title">${c.title}</div>
                    ${c.note ? `<div class="as-sp-citation-note">${c.note}</div>` : ''}`;
                refBody.appendChild(cite);
            });
        }
    }

    _renderComprehensiveAbout(key, svc, info) {
        // Dispatch to service-specific comprehensive renderers
        if (key === 'logicEditor') return this._renderLogicEditorAbout(svc, info);

        const container = this._stageAboutEl;

        // Max-width wrapper for readability
        const wrapper = document.createElement('div');
        wrapper.className = 'as-sp-about-wrapper';
        container.appendChild(wrapper);

        // Title
        const title = document.createElement('h2');
        title.className = 'as-sp-about-title-spaced';
        title.innerHTML = `<i class="fas fa-${svc.icon}" style="margin-right: 0.5rem; color: var(--ui-primary-600);"></i>${svc.label} — Documentation`;
        wrapper.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'as-sp-about-subtitle';
        subtitle.textContent = 'Comprehensive methodology, data pipeline, and research context';
        wrapper.appendChild(subtitle);

        // ── Section 1: Overview ──
        const overviewBody = this._aboutSection(wrapper, 'fa-eye', 'Overview');
        const overviewP = document.createElement('p');
        overviewP.className = 'as-sp-about-body';
        overviewP.textContent = info.description;
        overviewBody.appendChild(overviewP);

        // ── Section 2: Methodology ──
        const methBody = this._aboutSection(wrapper, 'fa-flask', 'Methodology');

        const methLevel1 = document.createElement('div');
        methLevel1.className = 'as-sp-meth-block';
        methLevel1.innerHTML = `
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--ui-gray-800); margin-bottom: 0.3rem;">Level 1 — Per-Assessment Z-Scores</div>
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0;">
                For each assessment, compute <code>z = (mark - mean) / SD</code>. If <code>z &lt; zAlertThreshold</code> the student receives a negative alert.
                If <code>z &gt; highZThreshold</code> they receive a positive alert. Alert counts are accumulated per student across all assessments.
            </p>`;
        methBody.appendChild(methLevel1);

        const methLevel2 = document.createElement('div');
        methLevel2.className = 'as-sp-meth-block';
        methLevel2.innerHTML = `
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--ui-gray-800); margin-bottom: 0.3rem;">Level 2 — Meta Z-Score on Alert Counts</div>
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0;">
                Compute the mean and SD of negative alert counts across all students. Then <code>negAlertZ = (negCount - meanNeg) / SDneg</code>.
                Categorize: <code>negAlertZ &gt; threshold</code> → at-risk; <code>posAlertZ &gt; threshold</code> → high-performing; else average.
            </p>`;
        methBody.appendChild(methLevel2);

        const methWhy = document.createElement('div');
        methWhy.innerHTML = `
            <div style="font-weight: 600; font-size: 0.8rem; color: var(--ui-gray-800); margin-bottom: 0.3rem;">Why Two Levels?</div>
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0;">
                Catches students who are systematically underperforming across many assessments, even if no single test score is dramatically low.
                Avoids false positives from isolated bad scores by requiring a pattern of alerts before flagging a student as at-risk.
            </p>`;
        methBody.appendChild(methWhy);

        // ── Section 3: Data Pipeline ──
        const pipeBody = this._aboutSection(wrapper, 'fa-stream', 'Data Pipeline');
        const steps = [
            'Authenticate via institutional API credentials',
            'getCourseResults — fetch course enrolment and overall marks',
            'getAssessmentResults — fetch per-assessment marks for all students',
            'getStudentBioData — fetch student biographical data (batched, 20 per request)',
            'Compute per-assessment statistics (mean, SD, min, max)',
            'Pivot results by student — build per-student assessment profile',
            'Level 1: compute per-assessment z-scores, flag alerts',
            'Level 2: compute meta z-scores on alert counts',
            'Categorize students (at-risk, average, high-performing)',
            'Render results with paginated student cards'
        ];
        const ol = document.createElement('ol');
        ol.className = 'as-sp-dev-plan-ol';
        steps.forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            ol.appendChild(li);
        });
        pipeBody.appendChild(ol);

        // ── Section 4: Configuration Parameters ──
        const configBody = this._aboutSection(wrapper, 'fa-sliders-h', 'Configuration Parameters');
        const configTable = document.createElement('table');
        configTable.innerHTML = `
            <thead>
                <tr><th>Parameter</th><th>Default</th><th>Description</th></tr>
            </thead>
            <tbody>
                <tr><td><code>zAlertThreshold</code></td><td>-0.5</td><td>Z-score below which a student receives a negative alert on an assessment</td></tr>
                <tr><td><code>highZThreshold</code></td><td>+0.5</td><td>Z-score above which a student receives a positive alert on an assessment</td></tr>
                <tr><td><code>passThreshold</code></td><td>50</td><td>Percentage mark considered a passing grade</td></tr>
            </tbody>`;
        configBody.appendChild(configTable);

        // ── Section 5: Literature & Research Context ──
        const litBody = this._aboutSection(wrapper, 'fa-book', 'Literature & Research Context');
        const citations = [
            { authors: 'Arnold, K.E. & Pistilli, M.D.', year: 2012, title: 'Course Signals at Purdue: Using learning analytics to increase student success', note: 'Foundational early warning system (EWS) — demonstrated that timely interventions based on analytics signals improved retention.' },
            { authors: 'Jayaprakash, S.M. et al.', year: 2014, title: 'Open Academic Analytics Initiative (OAAI)', note: 'Pioneered z-score normalization across courses to enable cross-course risk comparisons in open-source analytics platforms.' },
            { authors: 'Macfadyen, L.P. & Dawson, S.', year: 2010, title: 'Mining LMS data to develop an early warning system', note: 'Demonstrated that LMS interaction data can predict approximately 70% of final grade variance.' },
            { authors: 'Tinto, V.', year: '1975, 2012', title: 'Integration model for student attrition', note: 'Foundational theoretical framework — academic and social integration predict persistence. Updated model (2012) emphasizes institutional conditions.' },
            { authors: 'Slade, S. & Prinsloo, P.', year: 2013, title: 'Learning analytics: Ethical issues and dilemmas', note: 'Key ethical framework for learning analytics — student agency, transparency, data ownership, and the moral obligation to act on analytics.' },
            { authors: 'Baker, R.S. & Hawn, A.', year: 2022, title: 'Algorithmic bias in education', note: 'Comprehensive review of how prediction models can perpetuate demographic biases — critical consideration for any student risk system.' },
            { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor: A case for improving teaching and learning in SA', note: 'South African cohort study — only 30% of entering students graduate within 5 years, underscoring the need for early detection systems.' },
            { authors: 'Council on Higher Education (CHE)', year: 2013, title: 'A proposal for undergraduate curriculum reform in South Africa', note: 'Policy context for South African HE — curriculum structure and student support framework that informs risk analysis design.' },
            { authors: 'Drachsler, H. & Greller, W.', year: 2016, title: 'Privacy and analytics: DELICATE checklist', note: 'Eight-point checklist (Determination, Explain, Legitimate, Involve, Consent, Anonymise, Technical, External) for ethical learning analytics deployment.' },
            { authors: 'Hlosta, M. et al.', year: 2017, title: 'Ouroboros: Early identification of at-risk students without models based on legacy data', note: 'Demonstrates risk identification using within-cohort relative performance (no historical training data) — directly aligns with the z-score approach used here.' },
            { authors: 'Romero, C. & Ventura, S.', year: 2020, title: 'Educational data mining and learning analytics: An updated survey', note: 'Comprehensive survey of EDM/LA techniques — contextualizes z-score methods within the broader analytics landscape.' }
        ];

        citations.forEach(c => {
            const cite = document.createElement('div');
            cite.className = 'as-sp-citation';
            cite.innerHTML = `
                <div class="as-sp-citation-author">${c.authors} (${c.year})</div>
                <div class="as-sp-citation-title">${c.title}</div>
                <div class="as-sp-citation-note">${c.note}</div>`;
            litBody.appendChild(cite);
        });

        // ── Section 6: Strengths & Limitations ──
        const slBody = this._aboutSection(wrapper, 'fa-balance-scale', 'Strengths & Limitations');

        const strengthsDiv = document.createElement('div');
        strengthsDiv.className = 'as-sp-strengths-block';
        strengthsDiv.innerHTML = `<div class="as-sp-feat-label" style="color: var(--ui-green-700);"><i class="fas fa-check-circle" style="margin-right: 0.3rem;"></i>Strengths</div>`;
        const strengths = [
            'No historical training data needed — works on first offering (aligns with Hlosta 2017)',
            'Relative, not absolute — adapts to cohort performance automatically',
            'Transparent and interpretable — z-scores are well-understood statistical measures',
            'Two-level aggregation captures systematic patterns, not just isolated poor scores'
        ];
        const sUl = document.createElement('ul');
        sUl.className = 'as-sp-text-list';
        strengths.forEach(s => { const li = document.createElement('li'); li.textContent = s; sUl.appendChild(li); });
        strengthsDiv.appendChild(sUl);
        slBody.appendChild(strengthsDiv);

        const limDiv = document.createElement('div');
        limDiv.innerHTML = `<div class="as-sp-feat-label" style="color: var(--ui-orange-700);"><i class="fas fa-exclamation-circle" style="margin-right: 0.3rem;"></i>Limitations</div>`;
        const limitations = [
            'Normality assumption — z-scores are most meaningful with roughly normal distributions',
            'Missing data bias — students with incomplete records may be misclassified',
            'Equal weighting of assessments — a quiz and a final exam contribute equally to alert counts',
            'Threshold sensitivity — small changes in z-thresholds can shift categorizations',
            'Small sample unreliability — with n < 20 students, z-scores become unstable',
            'No temporal weighting — recent assessments are not weighted more heavily than earlier ones'
        ];
        const lUl = document.createElement('ul');
        lUl.className = 'as-sp-text-list';
        limitations.forEach(l => { const li = document.createElement('li'); li.textContent = l; lUl.appendChild(li); });
        limDiv.appendChild(lUl);
        slBody.appendChild(limDiv);

        // ── Section 7: Open Questions for Future Development ──
        const oqBody = this._aboutSection(wrapper, 'fa-lightbulb', 'Open Questions for Future Development');
        const questions = [
            { icon: 'fa-brain', title: 'Beyond z-scores?', text: 'Should we layer ML prediction (logistic regression, gradient boosting) on top of descriptive z-scores for improved accuracy?' },
            { icon: 'fa-database', title: 'Additional data sources?', text: 'LMS activity, attendance, financial aid status, prior academic record — what additional signals would improve prediction?' },
            { icon: 'fa-shield-alt', title: 'Ethical framework?', text: 'How to implement DELICATE/POPIA-compliant analytics? Student consent, opt-out mechanisms, and avoiding deficit framing.' },
            { icon: 'fa-chart-line', title: 'Longitudinal tracking?', text: 'Track students across courses and years, not just within a single module — how to aggregate risk signals over time?' },
            { icon: 'fa-hands-helping', title: 'Support service integration?', text: 'Close the loop from detection → intervention → outcome measurement. How to connect analytics to student support workflows?' },
            { icon: 'fa-calculator', title: 'Small sample handling?', text: 'Bayesian estimation, pooled z-scores, or absolute threshold fallback when cohort size is below reliable thresholds?' },
            { icon: 'fa-crosshairs', title: 'Threshold calibration?', text: 'Course-type-specific thresholds (STEM vs humanities)? How to empirically calibrate without overfitting?' },
            { icon: 'fa-users-cog', title: 'Fairness auditing?', text: 'Check for systematic bias in predictions across demographic groups — how to audit and remediate?' }
        ];
        questions.forEach(q => {
            const card = document.createElement('div');
            card.className = 'as-sp-question-card';
            card.innerHTML = `
                <div class="as-sp-feat-label">
                    <i class="fas ${q.icon}" style="color: var(--ui-primary-500); margin-right: 0.4rem; width: 14px; text-align: center;"></i>${q.title}
                </div>
                <div class="as-sp-about-body" style="padding-left: 1.4rem;">${q.text}</div>`;
            oqBody.appendChild(card);
        });

        // ── Section 8: Features & Data Sources ──
        const fdBody = this._aboutSection(wrapper, 'fa-cogs', 'Features & Data Sources');

        if (info.features) {
            const featLabel = document.createElement('div');
            featLabel.className = 'as-sp-feat-label';
            featLabel.textContent = 'Features';
            fdBody.appendChild(featLabel);

            info.features.forEach(f => {
                const item = document.createElement('div');
                item.className = 'as-sp-feature-item';
                item.innerHTML = `<i class="fas fa-check" style="color: var(--ui-primary-500); margin-right: 0.3rem; font-size: 0.65rem;"></i>${f}`;
                fdBody.appendChild(item);
            });
        }

        if (info.dataSources) {
            const dsLabel = document.createElement('div');
            dsLabel.className = 'as-sp-feat-label as-mt-2';
            dsLabel.textContent = 'Data Sources';
            fdBody.appendChild(dsLabel);

            const dsRow = document.createElement('div');
            dsRow.className = 'as-flex-wrap-tight';
            fdBody.appendChild(dsRow);
            info.dataSources.forEach(d => {
                new uiBadge({ label: d, color: 'gray', size: 'xs', parent: dsRow });
            });
        }
    }

    // ── Accreditation Logic Editor — Comprehensive About ─────────────────

    _renderLogicEditorAbout(svc, info) {
        const container = this._stageAboutEl;
        const wrapper = document.createElement('div');
        wrapper.className = 'as-sp-about-wrapper-wide';
        container.appendChild(wrapper);

        // Title
        const title = document.createElement('h2');
        title.className = 'as-sp-about-title';
        title.innerHTML = `<i class="fas fa-project-diagram" style="margin-right: 0.5rem; color: var(--ui-primary-600);"></i>Accreditation AutoMate — Analysis & Architecture`;
        wrapper.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'as-sp-about-subtitle';
        subtitle.textContent = 'Logic Package Editor, Evaluator, and Compliance Reporting Engine';
        wrapper.appendChild(subtitle);

        // ── 1. Domain Analysis ──
        const domBody = this._aboutSection(wrapper, 'fa-university', 'Domain Analysis');
        domBody.innerHTML = `
            <p style="font-size: 0.8rem; line-height: 1.7; color: var(--ui-gray-700); margin: 0 0 0.75rem 0;">
                Accreditation bodies (ECSA, CHE, HEQSF, HPCSA) evaluate whether a programme produces graduates who demonstrably possess a set of <strong>graduate attributes</strong> (GAs). ECSA defines 11 GAs (GA1–GA11). Each GA is demonstrated at <strong>levels of achievement</strong>:
            </p>
            <table style="width: 100%; font-size: 0.78rem; border-collapse: collapse; margin-bottom: 0.75rem;">
                <thead><tr style="background: var(--ui-gray-50); border-bottom: 2px solid var(--ui-gray-200);">
                    <th style="padding: 0.4rem 0.6rem; text-align: left; font-weight: 600;">Level</th>
                    <th style="padding: 0.4rem 0.6rem; text-align: left; font-weight: 600;">ECSA Term</th>
                    <th style="padding: 0.4rem 0.6rem; text-align: left; font-weight: 600;">Meaning</th>
                </tr></thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);"><td style="padding: 0.35rem 0.6rem; font-weight: 600;">Emerging</td><td style="padding: 0.35rem 0.6rem;">Introductory</td><td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-600);">Student exposed through foundational coursework</td></tr>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);"><td style="padding: 0.35rem 0.6rem; font-weight: 600;">Developed</td><td style="padding: 0.35rem 0.6rem;">Reinforced</td><td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-600);">Student practiced across multiple courses</td></tr>
                    <tr><td style="padding: 0.35rem 0.6rem; font-weight: 600;">Exit Level</td><td style="padding: 0.35rem 0.6rem;">Demonstrated/Assessed</td><td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-600);">Student independently demonstrates at professional standard</td></tr>
                </tbody>
            </table>
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0;">
                An accreditation visit evaluates whether a programme's curriculum and student outcomes cover all GAs at all required levels. This means <strong>programme-level</strong> evaluation (does the curriculum structure map courses to GAs?) and <strong>student-level</strong> evaluation (can individual students demonstrate achievement through course results and marks?).
            </p>`;

        // ── 2. Course-Code Criteria System ──
        const evalBody = this._aboutSection(wrapper, 'fa-code-branch', 'Course-Code Criteria System');
        evalBody.innerHTML = `
            <p style="font-size: 0.8rem; line-height: 1.7; color: var(--ui-gray-700); margin: 0 0 0.75rem 0;">
                Criteria now reference <strong>specific course codes and assessments</strong> with minimum marks, matching the AccredAdvisor system format. Each criterion is a dot-path into the student's academic record:
            </p>
            <div style="background: var(--ui-gray-50); border-radius: 6px; padding: 0.7rem 1rem; font-family: monospace; font-size: 0.73rem; line-height: 1.8; color: var(--ui-gray-700); margin-bottom: 0.75rem;">
                <div><span style="color: var(--ui-primary-600);">student.ENEL1CA.finalMark</span> &ge; 50 &nbsp; <span style="color: var(--ui-gray-400);">// Pass Circuit Analysis</span></div>
                <div><span style="color: var(--ui-primary-600);">student.ENEL2EL.labReport</span> &ge; 40 &nbsp; <span style="color: var(--ui-gray-400);">// Lab report with custom minimum</span></div>
                <div><span style="color: var(--ui-primary-600);">student.MATH2AB.finalMark</span> &ge; 60 &nbsp; <span style="color: var(--ui-gray-400);">// Strong maths (custom threshold)</span></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="background: var(--ui-green-50); border: 1px solid var(--ui-green-200); border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: var(--ui-green-800); margin-bottom: 0.3rem;"><i class="fas fa-user-graduate" style="margin-right: 0.3rem;"></i>Student Evaluation</div>
                    <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.6;">
                        <strong>Input:</strong> Individual student course results + assessment marks<br>
                        <strong>Question:</strong> "Has this student achieved GA3 at exit level?"<br>
                        <strong>Logic:</strong> AND/OR/AT_LEAST nesting with course-code criteria<br>
                        <strong>Example:</strong> <code>ENEL4DP.designReport &ge; 50</code>
                    </div>
                </div>
                <div style="background: var(--ui-blue-50); border: 1px solid var(--ui-blue-200); border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: var(--ui-blue-800); margin-bottom: 0.3rem;"><i class="fas fa-chart-bar" style="margin-right: 0.3rem;"></i>Logic Complexity</div>
                    <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.6;">
                        <strong>11 GAs &times; 3 levels</strong> = 33 logic packages<br>
                        24 AND nodes, 7 OR nodes, 5 AT_LEAST(N) nodes<br>
                        41 course-level + 32 assessment-level criteria<br>
                        8 custom min marks (&ne;50%): &ge;40% to &ge;60%
                    </div>
                </div>
            </div>`;

        // ── 2b. Full Logic Package Example ──
        const exBody = this._aboutSection(wrapper, 'fa-project-diagram', 'Full Logic Package Example — GA3 Exit Level');
        exBody.innerHTML = `
            <div style="background: var(--ui-gray-800); border-radius: 6px; padding: 1rem; font-family: monospace; font-size: 0.72rem; line-height: 1.7; color: var(--ui-gray-300); overflow-x: auto; margin-bottom: 0.75rem;">
<pre style="margin: 0; white-space: pre;">GA3 — Engineering Design (Exit Level) v2019-2025
├─ <span style="color: #93c5fd;">AND</span> "GA3 Exit Level"
│   ├─ ENEL4DP.finalMark ≥ 50     <span style="color: #9ca3af;">"Pass Capstone Design"</span>
│   ├─ ENEL4DP.designReport ≥ 50  <span style="color: #9ca3af;">"Design report (≥50%)"</span>
│   ├─ ENEL3GP.finalMark ≥ 50     <span style="color: #9ca3af;">"Pass Group Design Project"</span>
│   └─ <span style="color: #86efac;">OR</span> "Design synthesis evidence"
│       ├─ ENEL3GP.designReport ≥ 60  <span style="color: #9ca3af;">"Group report (≥60%)"</span>
│       └─ <span style="color: #93c5fd;">AND</span> "Capstone synthesis"
│           ├─ ENEL4DP.problemAnalysis ≥ 50
│           └─ ENEL4DP.impactAssessment ≥ 40</pre>
            </div>
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0;">
                The OR node allows two alternative paths — either a strong group design report (&ge;60%) or demonstrated capstone synthesis (problem analysis + impact assessment). This flexibility matches real accreditation criteria where students can demonstrate competence through different evidence pathways.
            </p>`;

        // ── 2c. Criteria Versioning ──
        const verBody = this._aboutSection(wrapper, 'fa-calendar-alt', 'Criteria Versioning');
        verBody.innerHTML = `
            <p style="font-size: 0.8rem; line-height: 1.7; color: var(--ui-gray-700); margin: 0 0 0.75rem 0;">
                Each logic package carries a <strong>version</strong> field (e.g., <code>2019-2025</code>) representing the accreditation cycle validity period. When criteria change for a new cycle:
            </p>
            <ol style="margin: 0 0 0.75rem 0; padding-left: 1.2rem; font-size: 0.78rem; line-height: 1.7; color: var(--ui-gray-600);">
                <li>New packages are created with the new version range (e.g., <code>2025-2031</code>)</li>
                <li>Old packages are set to <code>isActive: false</code> but retained for historical evaluation</li>
                <li>Students who started under the old criteria can be evaluated against either version</li>
                <li>The Criteria tab displays the version year range per GA for transparency</li>
            </ol>
            <p style="font-size: 0.78rem; color: var(--ui-gray-500); margin: 0;">Current demo: all 33 packages use version <code>2019-2025</code>.</p>`;

        // ── 2d. GA-Locking (Pass Preservation) ──
        const lockBody = this._aboutSection(wrapper, 'fa-lock', 'GA-Locking — Pass Preservation');
        lockBody.innerHTML = `
            <p style="font-size: 0.8rem; line-height: 1.7; color: var(--ui-gray-700); margin: 0 0 0.75rem 0;">
                Once a student meets a GA at a level, that result is <strong>locked as passed</strong>. This prevents regression:
            </p>
            <ul style="margin: 0 0 0.75rem 0; padding-left: 1.2rem; font-size: 0.78rem; line-height: 1.7; color: var(--ui-gray-600);">
                <li>A student might retake a course and score lower — the original pass still counts</li>
                <li>Results from prior semesters are preserved, not revoked</li>
                <li>The evaluation uses the <strong>best available</strong> mark for each course/assessment</li>
                <li>Locked GA/levels show a lock icon in the Evaluation tab and cannot regress from PASS to FAIL</li>
            </ul>
            <p style="font-size: 0.78rem; color: var(--ui-gray-500); margin: 0;">Implementation: <code>_ecsaState.studentLocks[studentId]</code> maps <code>'GA1_EMERGING' &rarr; true</code>. Any GA/level that passes once stays passed on re-evaluation.</p>`;

        // ── 2e. Natural Language Advisory Reports ──
        const nlBody = this._aboutSection(wrapper, 'fa-comment-alt', 'Natural Language Advisory Reports');
        nlBody.innerHTML = `
            <p style="font-size: 0.8rem; line-height: 1.7; color: var(--ui-gray-700); margin: 0 0 0.75rem 0;">
                The criteria structure enables <strong>automatic generation of natural language advisory reports</strong> explaining why (or why not yet) a GA was passed, and when the next opportunity to pass would be. The approach uses <strong>dual-report generation</strong>:
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: #059669; margin-bottom: 0.3rem;"><i class="fas fa-check-circle" style="margin-right: 0.3rem;"></i>Positive Report (PASS)</div>
                    <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.6;">
                        Generated when the GA/level evaluation passes. Explains:<br>
                        &bull; Which courses and assessments contributed to meeting this GA<br>
                        &bull; The student's actual marks vs required minimums<br>
                        &bull; Which alternative path was taken (for OR nodes)<br>
                        <strong>Example:</strong> "You have achieved GA3 Engineering Design at Exit Level. Your Capstone Design Project (72%) and Group Design Project (73%) demonstrate design competence. You met the synthesis requirement through your group design report (76%, exceeding the 60% threshold)."
                    </div>
                </div>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: #dc2626; margin-bottom: 0.3rem;"><i class="fas fa-times-circle" style="margin-right: 0.3rem;"></i>Negative Report (NOT YET)</div>
                    <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.6;">
                        Generated when the GA/level evaluation fails. Explains:<br>
                        &bull; Which specific criteria are not yet met and why<br>
                        &bull; Gap analysis: current mark vs required, exact shortfall<br>
                        &bull; Whether the course hasn't been taken yet vs. mark too low<br>
                        <strong>Example:</strong> "GA4 Exit Level is not yet achieved. You need to pass ENEL3RT Research & Testing (not yet enrolled). Your ENEL4DP investigation mark (42%) is below the 50% threshold — a gap of 8%. Consider additional lab practice."
                    </div>
                </div>
            </div>
            <div style="background: var(--ui-gray-50); border-radius: 6px; padding: 0.7rem 1rem; font-family: monospace; font-size: 0.72rem; line-height: 1.7; color: var(--ui-gray-700); margin-bottom: 0.75rem;">
                <div style="font-weight: 600; margin-bottom: 0.3rem; color: var(--ui-primary-700);">Report Generation Algorithm:</div>
                <div>1. Evaluate all 33 GA/level packages against student data</div>
                <div>2. For each package, generate <strong>both</strong> positive and negative report text</div>
                <div>3. Walk the result tree — each node type produces a phrase:</div>
                <div style="padding-left: 1rem;">AND: "All of the following are met/not yet met"</div>
                <div style="padding-left: 1rem;">OR: "Met via [winning path]" / "None of the alternatives achieved"</div>
                <div style="padding-left: 1rem;">AT_LEAST: "N of M achieved (specific list)" / "Only K of N — need M more"</div>
                <div style="padding-left: 1rem;">CRITERION: "[Code].[assessment]: have X%, need &ge;Y% (met/gap: Z%)"</div>
                <div>4. Based on final outcome, serve the appropriate report</div>
                <div>5. For NOT YET reports, add <strong>next opportunity</strong>:</div>
                <div style="padding-left: 1rem;">&bull; Course not taken &rarr; "Enrol in [CODE] — [Name] (offered Semester X)"</div>
                <div style="padding-left: 1rem;">&bull; Mark too low &rarr; "Retake/supplementary for [assessment] (gap: N%)"</div>
                <div style="padding-left: 1rem;">&bull; Alternative path &rarr; "Alternatively, achieve [OR branch criteria]"</div>
            </div>
            <div style="background: var(--ui-orange-50); border-left: 3px solid var(--ui-orange-400); padding: 0.6rem 0.8rem; border-radius: 0 4px 4px 0; font-size: 0.78rem; color: var(--ui-gray-700);">
                <strong>Key insight:</strong> Because the logic tree is fully structured (not free text), the report generator can produce precise, actionable advice referencing exact course codes, assessment names, and mark thresholds. This replaces vague "improve your problem-solving skills" with specific "achieve &ge;50% on ENEL4DP.problemAnalysis (Capstone problem analysis section)."
            </div>`;

        // ── 2f. Criteria Logic Editor UI ──
        const editorBody = this._aboutSection(wrapper, 'fa-edit', 'Criteria Logic Editor UI');
        editorBody.innerHTML = `
            <p style="font-size: 0.8rem; line-height: 1.7; color: var(--ui-gray-700); margin: 0 0 0.75rem 0;">
                Accreditation coordinators need a <strong>visual tree editor</strong> to author and modify criteria logic without touching JSON. The editor operates on the <code>logicNode</code> table via <code>UIBinding.bindTree()</code> and exposes all 5 node types through an adaptive form.
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: var(--ui-primary-700); margin-bottom: 0.3rem;"><i class="fas fa-mouse-pointer" style="margin-right: 0.3rem;"></i>Tree Interactions</div>
                    <ul style="margin: 0; padding-left: 1rem; font-size: 0.75rem; line-height: 1.7; color: var(--ui-gray-600);">
                        <li><strong>Add node:</strong> Click + on parent &rarr; select type (AND/OR/anyNof/atLeastTotal/criterion) &rarr; inserted as child</li>
                        <li><strong>Edit node:</strong> Click node &rarr; adaptive form appears in side panel (fields change per type)</li>
                        <li><strong>Delete node:</strong> Right-click or delete button &rarr; recursive delete of subtree</li>
                        <li><strong>Move node:</strong> Drag-drop reorder within siblings &rarr; updates <code>sortOrder</code>; drag to different parent &rarr; updates <code>parentId</code></li>
                        <li><strong>Clone subtree:</strong> Duplicate a branch to another GA/level package</li>
                    </ul>
                </div>
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: var(--ui-primary-700); margin-bottom: 0.3rem;"><i class="fas fa-sliders-h" style="margin-right: 0.3rem;"></i>Adaptive Node Form</div>
                    <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.7;">
                        Fields shown depend on <code>nodeType</code>:<br>
                        <strong>AND / OR:</strong> label only (children define the logic)<br>
                        <strong>anyNof:</strong> label + <code>nRequired</code> (integer spinner)<br>
                        <strong>atLeastTotal:</strong> label + <code>metric</code> (credits|count|sum|avg) + <code>threshold</code><br>
                        <strong>criterion:</strong> <code>attrPath</code> (course-code picker + assessment dropdown), <code>operator</code>, <code>value</code> (min mark), label<br><br>
                        <em>The course-code picker auto-completes from the programme's course list. The assessment dropdown populates from the selected course's known assessments.</em>
                    </div>
                </div>
            </div>
            <div style="background: var(--ui-gray-50); border-radius: 6px; padding: 0.7rem 1rem; font-family: monospace; font-size: 0.72rem; line-height: 1.7; color: var(--ui-gray-700); margin-bottom: 0.75rem;">
                <div style="font-weight: 600; margin-bottom: 0.3rem; color: var(--ui-primary-700);">Editor Layout (control-stage):</div>
                <div>CONTROL (1/3):</div>
                <div style="padding-left: 1rem;">&bull; System/GA/Level cascading selectors (UIBinding)</div>
                <div style="padding-left: 1rem;">&bull; Node tree outline (mini-tree with selection)</div>
                <div style="padding-left: 1rem;">&bull; Live test panel — select student, run eval, see result</div>
                <div>STAGE (2/3):</div>
                <div style="padding-left: 1rem;">&bull; Full tree view (uiTree with icons per node type)</div>
                <div style="padding-left: 1rem;">&bull; Node editor form (below or side panel)</div>
                <div style="padding-left: 1rem;">&bull; Test result overlay — green/red badges on tree nodes</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div style="background: var(--ui-blue-50); border: 1px solid var(--ui-blue-200); border-radius: 6px; padding: 0.6rem; text-align: center;">
                    <div style="font-weight: 700; font-size: 0.78rem; color: var(--ui-blue-700); margin-bottom: 0.2rem;">Package Management</div>
                    <div style="font-size: 0.72rem; color: var(--ui-gray-600);">Create, clone, version, activate/deactivate packages per GA/level/programme</div>
                </div>
                <div style="background: var(--ui-green-50); border: 1px solid var(--ui-green-200); border-radius: 6px; padding: 0.6rem; text-align: center;">
                    <div style="font-weight: 700; font-size: 0.78rem; color: var(--ui-green-700); margin-bottom: 0.2rem;">Validation</div>
                    <div style="font-size: 0.72rem; color: var(--ui-gray-600);">Warn on empty trees, orphan nodes, criteria referencing unknown courses</div>
                </div>
                <div style="background: var(--ui-orange-50); border: 1px solid var(--ui-orange-200); border-radius: 6px; padding: 0.6rem; text-align: center;">
                    <div style="font-weight: 700; font-size: 0.78rem; color: var(--ui-orange-700); margin-bottom: 0.2rem;">Import/Export</div>
                    <div style="font-size: 0.72rem; color: var(--ui-gray-600);">Import from JSON templates, export tree as JSON or printable PDF</div>
                </div>
            </div>`;

        // ── 2g. Evidence Portfolio & Pass Preservation ──
        const evidBody = this._aboutSection(wrapper, 'fa-folder-open', 'Evidence Portfolio & Pass Preservation');
        evidBody.innerHTML = `
            <p style="font-size: 0.8rem; line-height: 1.7; color: var(--ui-gray-700); margin: 0 0 0.75rem 0;">
                Accreditation visits require <strong>documentary evidence</strong> that students have achieved each GA/level — not just a pass/fail flag from the evaluator, but uploaded artefacts (transcripts, portfolios, marked assessments, project reports). Two new tables support this:
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: var(--ui-green-700); margin-bottom: 0.3rem;"><i class="fas fa-link" style="margin-right: 0.3rem;"></i>gaEvidence (linking table)</div>
                    <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.7;">
                        Links a <strong>student</strong> to a <strong>GA/level package</strong> with pass status:
                    </div>
                    <div style="background: var(--ui-gray-50); border-radius: 4px; padding: 0.5rem 0.7rem; margin-top: 0.3rem; font-family: monospace; font-size: 0.7rem; line-height: 1.7; color: var(--ui-gray-700);">
                        <div>idx, <strong>studentId</strong>, <strong>packageId</strong> &rarr; logicPackage</div>
                        <div>evalRunId &rarr; evalRun (which eval produced this)</div>
                        <div>status: pending | verified | rejected</div>
                        <div>verifiedBy, verifiedAt (moderator sign-off)</div>
                        <div>notes (free text for moderator comments)</div>
                        <div>lockedAt, lockedBy (GA-lock timestamp)</div>
                    </div>
                </div>
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.8rem;">
                    <div style="font-weight: 700; font-size: 0.82rem; color: var(--ui-green-700); margin-bottom: 0.3rem;"><i class="fas fa-file-pdf" style="margin-right: 0.3rem;"></i>gaEvidenceFile (file uploads)</div>
                    <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.7;">
                        Each evidence record can have <strong>multiple file attachments</strong>:
                    </div>
                    <div style="background: var(--ui-gray-50); border-radius: 4px; padding: 0.5rem 0.7rem; margin-top: 0.3rem; font-family: monospace; font-size: 0.7rem; line-height: 1.7; color: var(--ui-gray-700);">
                        <div>idx, <strong>evidenceId</strong> &rarr; gaEvidence</div>
                        <div>fileName, fileType, fileSize, filePath</div>
                        <div>mimeType (application/pdf, image/*, ...)</div>
                        <div>uploadedAt, uploadedBy</div>
                        <div>category: transcript | portfolio | assessment | other</div>
                        <div>description (what this file proves)</div>
                    </div>
                </div>
            </div>
            <div style="background: var(--ui-gray-50); border-radius: 6px; padding: 0.7rem 1rem; font-family: monospace; font-size: 0.72rem; line-height: 1.7; color: var(--ui-gray-700); margin-bottom: 0.75rem;">
                <div style="font-weight: 600; margin-bottom: 0.3rem; color: var(--ui-primary-700);">Evidence Lifecycle:</div>
                <div>1. Evaluator runs &rarr; GA/level passes &rarr; <code>gaEvidence</code> record created (status: pending)</div>
                <div>2. Student or coordinator uploads supporting files &rarr; <code>gaEvidenceFile</code> rows</div>
                <div>3. Moderator reviews evidence &rarr; sets status to verified/rejected + notes</div>
                <div>4. On verification &rarr; GA-lock is applied (<code>lockedAt</code>, <code>lockedBy</code>)</div>
                <div>5. Locked evidence persists across re-evaluations — retaking a course cannot revoke it</div>
                <div>6. For accreditation visits: query all verified evidence per student/GA/level</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div style="background: var(--ui-blue-50); border: 1px solid var(--ui-blue-200); border-radius: 6px; padding: 0.6rem;">
                    <div style="font-weight: 700; font-size: 0.78rem; color: var(--ui-blue-700); margin-bottom: 0.2rem;"><i class="fas fa-upload" style="margin-right: 0.3rem;"></i>File Upload UI</div>
                    <div style="font-size: 0.72rem; color: var(--ui-gray-600); line-height: 1.5;">
                        Drag-drop zone per GA/level card. Accepts PDF, images, DOCX. Shows thumbnails, file sizes, upload progress. Uses the existing <code>files</code> service for storage backend.
                    </div>
                </div>
                <div style="background: var(--ui-green-50); border: 1px solid var(--ui-green-200); border-radius: 6px; padding: 0.6rem;">
                    <div style="font-weight: 700; font-size: 0.78rem; color: var(--ui-green-700); margin-bottom: 0.2rem;"><i class="fas fa-check-double" style="margin-right: 0.3rem;"></i>Verification Workflow</div>
                    <div style="font-size: 0.72rem; color: var(--ui-gray-600); line-height: 1.5;">
                        Moderator queue shows pending evidence. Review panel: view uploaded files inline, approve/reject with notes. Batch verification for cohort processing. Audit trail via <code>audit</code> service.
                    </div>
                </div>
                <div style="background: var(--ui-orange-50); border: 1px solid var(--ui-orange-200); border-radius: 6px; padding: 0.6rem;">
                    <div style="font-weight: 700; font-size: 0.78rem; color: var(--ui-orange-700); margin-bottom: 0.2rem;"><i class="fas fa-shield-alt" style="margin-right: 0.3rem;"></i>Pass Preservation</div>
                    <div style="font-size: 0.72rem; color: var(--ui-gray-600); line-height: 1.5;">
                        Once verified + locked, evidence cannot be deleted or modified. Lock includes timestamp, moderator ID, and the eval run that produced the pass. Historical record survives criteria version changes.
                    </div>
                </div>
            </div>
            <div style="background: var(--ui-purple-50); border-left: 3px solid var(--ui-purple-400); padding: 0.6rem 0.8rem; border-radius: 0 4px 4px 0; font-size: 0.78rem; color: var(--ui-gray-700);">
                <strong>Integration with files service:</strong> The <code>gaEvidenceFile</code> table mirrors the <code>files</code> service's <code>file</code> / <code>fileVersion</code> pattern. Upload handling, versioning, and storage are delegated to the existing file service. The evidence table adds the accreditation-specific metadata (category, evidence linkage, verification status).
            </div>`;

        // ── 3. Existing Systems Gap Analysis ──
        const gapBody = this._aboutSection(wrapper, 'fa-puzzle-piece', 'Existing Systems — Gap Analysis');
        gapBody.innerHTML = `
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0 0 0.5rem 0;">
                Three separate logic systems exist in the codebase, each solving part of the problem:
            </p>
            <table style="width: 100%; font-size: 0.75rem; border-collapse: collapse; margin-bottom: 0.75rem;">
                <thead><tr style="background: var(--ui-gray-50); border-bottom: 2px solid var(--ui-gray-200);">
                    <th style="padding: 0.4rem 0.5rem; text-align: left; font-weight: 600;">System</th>
                    <th style="padding: 0.4rem 0.5rem; text-align: left; font-weight: 600;">Operators</th>
                    <th style="padding: 0.4rem 0.5rem; text-align: left; font-weight: 600;">Data Target</th>
                    <th style="padding: 0.4rem 0.5rem; text-align: left; font-weight: 600;">Editor</th>
                    <th style="padding: 0.4rem 0.5rem; text-align: left; font-weight: 600;">Limitation</th>
                </tr></thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);">
                        <td style="padding: 0.35rem 0.5rem;"><code>LogicEvaluator</code><br><span style="color: var(--ui-gray-400); font-size: 0.7rem;">class.data.js</span></td>
                        <td style="padding: 0.35rem 0.5rem;">AND, OR, atLeastNof, minVal, maxVal</td>
                        <td style="padding: 0.35rem 0.5rem;">Generic objects</td>
                        <td style="padding: 0.35rem 0.5rem;">JSON textarea</td>
                        <td style="padding: 0.35rem 0.5rem; color: var(--ui-red-600);">No tree UI, no accreditation operators</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);">
                        <td style="padding: 0.35rem 0.5rem;"><code>AccreditationEvaluator</code><br><span style="color: var(--ui-gray-400); font-size: 0.7rem;">Publon.Press</span></td>
                        <td style="padding: 0.35rem 0.5rem;">AND, OR, AT_LEAST, CRITERION</td>
                        <td style="padding: 0.35rem 0.5rem;">Programme metadata</td>
                        <td style="padding: 0.35rem 0.5rem;">JSON templates</td>
                        <td style="padding: 0.35rem 0.5rem; color: var(--ui-green-600);">Student evaluation with course-code criteria (33 packages)</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.35rem 0.5rem;"><code>AccreditationAutoMate</code><br><span style="color: var(--ui-gray-400); font-size: 0.7rem;">AutoScholarComponents</span></td>
                        <td style="padding: 0.35rem 0.5rem;">and, or, anyMofSet, courseCode≥mark</td>
                        <td style="padding: 0.35rem 0.5rem;">Student course results</td>
                        <td style="padding: 0.35rem 0.5rem;">JSON form</td>
                        <td style="padding: 0.35rem 0.5rem; color: var(--ui-red-600);">Not in Publon.Press, no uiTree</td>
                    </tr>
                </tbody>
            </table>
            <div style="background: var(--ui-orange-50); border-left: 3px solid var(--ui-orange-400); padding: 0.5rem 0.7rem; border-radius: 0 4px 4px 0; font-size: 0.78rem; color: var(--ui-gray-700);">
                <strong>None of these have:</strong> A visual tree editor using uiTree with drag-drop • The <code>atLeastTotal</code> operator • Unified student + programme evaluation • GA-level modeling (emerging/developed/exit) • Cohort report generation with per-student detail
            </div>`;

        // ── 4. Logic Node Types ──
        const nodesBody = this._aboutSection(wrapper, 'fa-sitemap', 'Unified Logic Node Types');
        nodesBody.innerHTML = `
            <table style="width: 100%; font-size: 0.75rem; border-collapse: collapse; margin-bottom: 0.75rem;">
                <thead><tr style="background: var(--ui-gray-50); border-bottom: 2px solid var(--ui-gray-200);">
                    <th style="padding: 0.4rem 0.6rem; text-align: left; font-weight: 600;">Node Type</th>
                    <th style="padding: 0.4rem 0.6rem; text-align: left; font-weight: 600;">Semantics</th>
                    <th style="padding: 0.4rem 0.6rem; text-align: left; font-weight: 600;">Parameters</th>
                    <th style="padding: 0.4rem 0.6rem; text-align: left; font-weight: 600;">Example</th>
                </tr></thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);">
                        <td style="padding: 0.35rem 0.6rem;"><span style="background: var(--ui-blue-100); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600;">AND</span></td>
                        <td style="padding: 0.35rem 0.6rem;">All children must pass</td>
                        <td style="padding: 0.35rem 0.6rem;"><code>children[]</code></td>
                        <td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-500);">GA requires design AND lab AND communication</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);">
                        <td style="padding: 0.35rem 0.6rem;"><span style="background: var(--ui-green-100); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600;">OR</span></td>
                        <td style="padding: 0.35rem 0.6rem;">At least one child passes</td>
                        <td style="padding: 0.35rem 0.6rem;"><code>children[]</code></td>
                        <td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-500);">Pass via course OR portfolio evidence</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);">
                        <td style="padding: 0.35rem 0.6rem;"><span style="background: var(--ui-orange-100); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600;">anyNof</span></td>
                        <td style="padding: 0.35rem 0.6rem;">At least N of M children pass</td>
                        <td style="padding: 0.35rem 0.6rem;"><code>n</code>, <code>children[]</code></td>
                        <td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-500);">Any 3 of 5 listed courses passed</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--ui-gray-100);">
                        <td style="padding: 0.35rem 0.6rem;"><span style="background: var(--ui-purple-100); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600;">atLeastTotal</span></td>
                        <td style="padding: 0.35rem 0.6rem;">Sum/count across children ≥ threshold</td>
                        <td style="padding: 0.35rem 0.6rem;"><code>metric</code>, <code>threshold</code>, <code>children[]</code></td>
                        <td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-500);">≥60 credits from listed courses</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.35rem 0.6rem;"><span style="background: var(--ui-gray-100); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600;">criterion</span></td>
                        <td style="padding: 0.35rem 0.6rem;">Leaf: evaluate one condition</td>
                        <td style="padding: 0.35rem 0.6rem;"><code>context</code>, <code>attrPath</code>, <code>operator</code>, <code>value</code></td>
                        <td style="padding: 0.35rem 0.6rem; color: var(--ui-gray-500);">studentResult("CEDS301") ≥ 50</td>
                    </tr>
                </tbody>
            </table>
            <div style="background: var(--ui-purple-50); border-left: 3px solid var(--ui-purple-400); padding: 0.6rem 0.8rem; border-radius: 0 4px 4px 0; margin-bottom: 0.5rem;">
                <div style="font-weight: 600; font-size: 0.8rem; color: var(--ui-purple-800); margin-bottom: 0.2rem;">Why <code>atLeastTotal</code> as a first-class operator?</div>
                <div style="font-size: 0.75rem; color: var(--ui-gray-600); line-height: 1.6;">
                    This operator cannot be expressed with AND/OR/anyNof: "At least 60 credits from these 8 courses" — you don't know which courses the student will pass, and they have varying credit weights. "Average mark ≥55% across these courses" — requires aggregation, not boolean logic. Making it a first-class node type keeps the tree simple and the editor intuitive.
                </div>
            </div>`;

        // ── 5. Data Schema ──
        const schemaBody = this._aboutSection(wrapper, 'fa-database', 'Data Schema (Publome)');
        schemaBody.innerHTML = `
            <div style="background: var(--ui-gray-50); border-radius: 6px; padding: 0.8rem 1rem; font-family: monospace; font-size: 0.73rem; line-height: 1.8; color: var(--ui-gray-700); margin-bottom: 0.75rem; overflow-x: auto;">
                <div><strong style="color: var(--ui-primary-700);">accredSystem</strong> — Accreditation body (ECSA, CHE, HEQSF)</div>
                <div style="padding-left: 1rem;">idx, code, label, description, version, isActive</div>
                <br>
                <div><strong style="color: var(--ui-primary-700);">accredAttribute</strong> — Graduate attribute definition</div>
                <div style="padding-left: 1rem;">idx, systemId → accredSystem, code, label, description, category, sortOrder</div>
                <br>
                <div><strong style="color: var(--ui-primary-700);">accredLevel</strong> — Achievement level</div>
                <div style="padding-left: 1rem;">idx, systemId → accredSystem, code, label, description, sortOrder</div>
                <br>
                <div><strong style="color: var(--ui-primary-700);">logicPackage</strong> — One GA at one level for one programme</div>
                <div style="padding-left: 1rem;">idx, attributeId → accredAttribute, levelId → accredLevel, programmeCode, version, label, isActive</div>
                <br>
                <div><strong style="color: var(--ui-primary-700);">logicNode</strong> — Tree node (self-referential via parentId)</div>
                <div style="padding-left: 1rem;">idx, packageId → logicPackage, parentId → logicNode</div>
                <div style="padding-left: 1rem;">nodeType (AND|OR|anyNof|atLeastTotal|criterion), label, sortOrder</div>
                <div style="padding-left: 1rem;">nRequired, metric, threshold — operator params</div>
                <div style="padding-left: 1rem;">context, attrPath, operator, value, courseCode, credits — criterion params</div>
                <br>
                <div><strong style="color: var(--ui-primary-700);">evalRun</strong> — Evaluation execution record</div>
                <div style="padding-left: 1rem;">idx, packageId, programmeCode, year, mode, targetId, runAt, duration, overallStatus, score</div>
                <br>
                <div><strong style="color: var(--ui-primary-700);">evalResult</strong> — Per-node evaluation result</div>
                <div style="padding-left: 1rem;">idx, runId → evalRun, nodeId → logicNode, passed, score, actual, expected, detail (JSON)</div>
                <br>
                <div><strong style="color: var(--ui-green-700);">gaEvidence</strong> — Evidence linking a student to a GA/level pass</div>
                <div style="padding-left: 1rem;">idx, studentId, packageId → logicPackage, evalRunId → evalRun</div>
                <div style="padding-left: 1rem;">status (pending|verified|rejected), verifiedBy, verifiedAt</div>
                <div style="padding-left: 1rem;">notes (text), lockedAt (datetime), lockedBy</div>
                <br>
                <div><strong style="color: var(--ui-green-700);">gaEvidenceFile</strong> — File attachments for evidence</div>
                <div style="padding-left: 1rem;">idx, evidenceId → gaEvidence, fileName, fileType, fileSize</div>
                <div style="padding-left: 1rem;">filePath, mimeType, uploadedAt, uploadedBy</div>
                <div style="padding-left: 1rem;">category (transcript|portfolio|assessment|other), description</div>
            </div>
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0;">
                The <code>logicNode</code> table with <code>parentId</code> self-reference is directly compatible with <code>UIBinding.bindTreeEditor()</code>, supports drag-drop reordering via <code>sortOrder</code>, and is efficient for the evaluator (load once, build tree in memory). The <code>gaEvidence</code> / <code>gaEvidenceFile</code> tables provide the audit trail linking pass results to uploaded proof — critical for accreditation visits.
            </p>`;

        // ── 6. Class Architecture ──
        const archBody = this._aboutSection(wrapper, 'fa-layer-group', 'Class Architecture');
        archBody.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.7rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--ui-primary-700); margin-bottom: 0.35rem;"><i class="fas fa-server" style="margin-right: 0.3rem;"></i>LogicPackageService</div>
                    <div style="font-size: 0.73rem; color: var(--ui-gray-500); margin-bottom: 0.3rem;">Layer 3 — Microservice (extends Publome)</div>
                    <ul style="margin: 0; padding-left: 1rem; font-size: 0.73rem; line-height: 1.6; color: var(--ui-gray-600);">
                        <li>Schema: 7 tables with FK relationships</li>
                        <li><code>getTreeForPackage(id)</code> — flat rows for tree binding</li>
                        <li><code>clonePackage(id, progCode)</code> — programme customization</li>
                        <li><code>importFromTemplate(json)</code> — load ECSA/CHE templates</li>
                    </ul>
                </div>
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.7rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--ui-primary-700); margin-bottom: 0.35rem;"><i class="fas fa-cogs" style="margin-right: 0.3rem;"></i>LogicPackageEvaluator</div>
                    <div style="font-size: 0.73rem; color: var(--ui-gray-500); margin-bottom: 0.3rem;">Layer 4 — Standalone evaluation engine</div>
                    <ul style="margin: 0; padding-left: 1rem; font-size: 0.73rem; line-height: 1.6; color: var(--ui-gray-600);">
                        <li><code>evaluateStudent(pkgId, data)</code> — individual student</li>
                        <li><code>evaluateProgramme(pkgId, data)</code> — programme check</li>
                        <li><code>evaluateCohort(pkgIds, dataSet)</code> — batch cohort</li>
                        <li><code>_evalNode()</code> — recursive dispatch</li>
                    </ul>
                </div>
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.7rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--ui-primary-700); margin-bottom: 0.35rem;"><i class="fas fa-edit" style="margin-right: 0.3rem;"></i>LogicPackageEditor</div>
                    <div style="font-size: 0.73rem; color: var(--ui-gray-500); margin-bottom: 0.3rem;">Layer 4 — UI class (uiTree + UIBinding)</div>
                    <ul style="margin: 0; padding-left: 1rem; font-size: 0.73rem; line-height: 1.6; color: var(--ui-gray-600);">
                        <li>Control-stage layout with accordion controls</li>
                        <li><code>bindTreeEditor()</code> on logicNode table</li>
                        <li>Node-type-specific editor form</li>
                        <li>Live test panel with result overlay</li>
                    </ul>
                </div>
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.7rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--ui-primary-700); margin-bottom: 0.35rem;"><i class="fas fa-chart-bar" style="margin-right: 0.3rem;"></i>AccreditationReporter</div>
                    <div style="font-size: 0.73rem; color: var(--ui-gray-500); margin-bottom: 0.3rem;">Layer 4 — Report generation + NL advisory</div>
                    <ul style="margin: 0; padding-left: 1rem; font-size: 0.73rem; line-height: 1.6; color: var(--ui-gray-600);">
                        <li><code>studentReport()</code> — full GA profile</li>
                        <li><code>cohortReport()</code> — programme compliance</li>
                        <li><code>generateAdvisory()</code> — dual NL reports (PASS/NOT YET)</li>
                        <li><code>complianceSnapshot()</code> — dashboard summary</li>
                    </ul>
                </div>
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.7rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--ui-primary-700); margin-bottom: 0.35rem;"><i class="fas fa-folder-open" style="margin-right: 0.3rem;"></i>EvidencePortfolio</div>
                    <div style="font-size: 0.73rem; color: var(--ui-gray-500); margin-bottom: 0.3rem;">Layer 4 — Evidence management + file uploads</div>
                    <ul style="margin: 0; padding-left: 1rem; font-size: 0.73rem; line-height: 1.6; color: var(--ui-gray-600);">
                        <li><code>gaEvidence</code> — student × GA/level linking + lock</li>
                        <li><code>gaEvidenceFile</code> — multi-file uploads (PDF, etc.)</li>
                        <li>Verification workflow (pending → verified → locked)</li>
                        <li>Integrates with <code>files</code> + <code>audit</code> services</li>
                    </ul>
                </div>
            </div>`;

        // ── 7. UI Design ──
        const uiBody = this._aboutSection(wrapper, 'fa-desktop', 'Logic Package Editor — UI Design');
        uiBody.innerHTML = `
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0 0 0.75rem 0;">
                The editor follows the <strong>control-stage layout</strong> pattern. Controls on the left (1/3) with three accordion sections; stage on the right (2/3) showing the tree and results.
            </p>
            <div style="background: var(--ui-gray-800); border-radius: 6px; padding: 1rem; font-family: monospace; font-size: 0.7rem; line-height: 1.6; color: var(--ui-gray-300); overflow-x: auto; margin-bottom: 0.75rem;">
<pre style="margin: 0; white-space: pre;">┌─ Header: [ECSA ▼] [GA3 ▼] [Exit Level ▼] ─────────────────┐
├──── CONTROL (1/3) ────┬──── STAGE (2/3) ───────────────────┤
│                       │                                     │
│ ▸ Logic Tree          │  Logic Tree [uiTreeView]            │
│   ▼ AND (GA3 Exit)    │  ● AND (GA3 Exit Level)             │
│     ├── anyNof (3/5)  │    ├── 🎯 anyNof (3 of 5)          │
│     │  ├── CEDS201    │    │   ├── ✓ CEDS201 ≥ 50          │
│     │  ├── CEDS301    │    │   ├── ✓ CEDS301 ≥ 60          │
│     │  └── CEDS401    │    │   ├── ✗ CEDS401 ≥ 60          │
│     ├── atLeast (60c) │    │   ├── ✓ PFDS301 ≥ 50          │
│     └── yearSpread    │    │   └── — PFDS401 ≥ 50          │
│                       │    ├── 📊 atLeastTotal              │
│ ▸ Node Editor         │    │   credits ≥ 60 from [...]      │
│   Type: [anyNof ▼]    │    └── ✓ designYearSpread ≥ 2      │
│   N Required: [3]     │                                     │
│   Label: Design crses │  Node Properties [uiForm]           │
│                       │  Type: anyNof  N: 3  Label: ...     │
│ ▸ Test Panel          │                                     │
│   Student: [22345678] │  Test Results                       │
│   [Run Test]          │  Student: 22345678                  │
│   Result: ✓ PASS 83%  │  GA3 Exit: ✓ PASS (83%)            │
│                       │   ├── anyNof: ✓ 4/3                │
│                       │   ├── credits: ✓ 64/60             │
│                       │   └── yearSpread: ✓ 3/2            │
└───────────────────────┴─────────────────────────────────────┘</pre>
            </div>
            <p style="font-size: 0.78rem; line-height: 1.65; color: var(--ui-gray-600); margin: 0;">
                <strong>uiTree node mapping:</strong> Each node type gets a distinct icon (<code>AND:🔗  OR:⚡  anyNof:🎯  atLeastTotal:📊  criterion:📋</code>) and a contextual sublabel ("3 of 5" or "credits ≥ 60"). After running a test, nodes show green ✓ or red ✗ badges.
            </p>`;

        // ── 8. Evaluation Algorithm ──
        const algoBody = this._aboutSection(wrapper, 'fa-code', 'Evaluation Algorithm — Recursive Descent');
        algoBody.innerHTML = `
            <div style="background: var(--ui-gray-50); border-radius: 6px; padding: 0.8rem 1rem; font-family: monospace; font-size: 0.72rem; line-height: 1.7; color: var(--ui-gray-700); overflow-x: auto; margin-bottom: 0.75rem;">
<pre style="margin: 0; white-space: pre;">evaluateNode(node, data, context):
  switch node.type:
    case "AND":
      results = children.map(c => evaluateNode(c, data, context))
      passed = results.every(r => r.passed)
      score = average(results.map(r => r.score))

    case "OR":
      results = children.map(c => evaluateNode(c, data, context))
      passed = results.some(r => r.passed)
      score = max(results.map(r => r.score))

    case "anyNof":
      results = children.map(c => evaluateNode(c, data, context))
      passCount = results.filter(r => r.passed).length
      passed = passCount >= node.nRequired

    case "atLeastTotal":
      results = children.map(c => evaluateNode(c, data, context))
      total = results.filter(r => r.passed)
        .reduce((sum, r) => sum + getMetric(r, node.metric), 0)
      passed = total >= node.threshold

    case "criterion":
      actual = context == "student"
        ? getStudentValue(data, node)    // course mark lookup
        : getProgrammeValue(data, node)  // attribute lookup
      passed = compare(actual, node.operator, node.value)</pre>
            </div>
            <div style="background: var(--ui-blue-50); border-left: 3px solid var(--ui-blue-400); padding: 0.5rem 0.7rem; border-radius: 0 4px 4px 0; font-size: 0.78rem; color: var(--ui-gray-700);">
                <strong>Student data resolution:</strong> When evaluating a <code>criterion</code> with <code>courseCode</code>, the evaluator finds the course in the student's results and extracts the relevant metric (final mark, pass status, credits earned). Non-course criteria check student profile attributes directly (e.g., <code>hasWIL</code>, <code>portfolioComplete</code>).
            </div>`;

        // ── 9. Report Structures ──
        const repBody = this._aboutSection(wrapper, 'fa-file-alt', 'Report Structures');
        repBody.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.7rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--ui-green-700); margin-bottom: 0.35rem;"><i class="fas fa-user" style="margin-right: 0.3rem;"></i>Individual Student Report</div>
                    <div style="font-size: 0.73rem; color: var(--ui-gray-600); line-height: 1.6;">
                        <div>GA × Level matrix with pass/fail per cell</div>
                        <div>Per-node drill-down showing actual vs expected values</div>
                        <div>Gap identification with specific recommendations</div>
                        <div>e.g., "GA3 Exit: FAIL — designYearSpread=1, need ≥2"</div>
                        <div>→ "Recommendation: Enrol in design course in another year"</div>
                    </div>
                </div>
                <div style="background: var(--ui-white); border: 1px solid var(--ui-gray-200); border-radius: 6px; padding: 0.7rem;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--ui-blue-700); margin-bottom: 0.35rem;"><i class="fas fa-users" style="margin-right: 0.3rem;"></i>Cohort Compliance Report</div>
                    <div style="font-size: 0.73rem; color: var(--ui-gray-600); line-height: 1.6;">
                        <div>Per-GA pass rates across all students in cohort</div>
                        <div>At-risk student lists per GA with specific missing criteria</div>
                        <div>Programme compliance score (% students passing all GAs)</div>
                        <div>GA-Course coverage matrix from logic package structure</div>
                        <div>Drill-down from cohort summary to individual student report</div>
                    </div>
                </div>
            </div>`;

        // ── 10. Implementation Plan ──
        const planBody = this._aboutSection(wrapper, 'fa-clipboard-list', 'Implementation Plan — 7 Phases');

        const phases = [
            {
                phase: 'Phase 1', title: 'Logic Package Service', icon: 'fa-server', color: 'blue',
                items: [
                    'Define schema: accredSystem, accredAttribute, accredLevel, logicPackage, logicNode, evalRun, evalResult',
                    'Create class.LogicPackageService.js extending Publome',
                    'Implement ECSA seed data: 11 GAs × 3 levels (emerging, developed, exit) with course-code criteria',
                    'Implement getTreeForPackage() — flat logicNode rows for uiTree binding',
                    'Implement clonePackage() and importFromTemplate()',
                    'Register in ServiceRegistry'
                ]
            },
            {
                phase: 'Phase 2', title: 'Logic Package Evaluator', icon: 'fa-cogs', color: 'green',
                items: [
                    'Create class.LogicPackageEvaluator.js',
                    'Implement _evalNode() recursive dispatcher',
                    'Implement _evalAnd(), _evalOr(), _evalAnyNof(), _evalAtLeastTotal(), _evalCriterion()',
                    'Implement context routing: student dot-path resolution (student.CODE.assessment)',
                    'Implement evaluateStudent(), evaluateProgramme(), evaluateCohort()',
                    'Generate detailed result trees with pass/fail, scores, actual vs expected',
                    'Wire result persistence to evalRun and evalResult tables',
                    'Natural language report generation — dual positive/negative reports per GA/level'
                ]
            },
            {
                phase: 'Phase 3', title: 'Criteria Logic Editor (uiTree)', icon: 'fa-edit', color: 'orange',
                items: [
                    'Create class.LogicPackageEditor.js with control-stage layout',
                    'System/GA/Level cascading selectors via UIBinding',
                    'Wire bindTree() to logicNode table with parentId self-reference',
                    'Node-type icons and sublabels in map function (AND:🔗 OR:⚡ anyNof:🎯 atLeastTotal:📊 criterion:📋)',
                    'Adaptive node editor form — fields change per nodeType (label-only for AND/OR, nRequired for anyNof, attrPath+operator+value for criterion)',
                    'Course-code picker for criterion nodes — auto-complete from programme course list, assessment dropdown from course schema',
                    'Wire add/edit/delete/move/clone events from uiTree to logicNode CRUD',
                    'Drag-drop reorder (sortOrder) and reparent (parentId)',
                    'Tree validation: warn on empty trees, orphan nodes, unknown course codes',
                    'Live test panel: select student, run evaluator, show green/red badges on tree nodes',
                    'Import/export: load from JSON templates, export tree as JSON or printable PDF'
                ]
            },
            {
                phase: 'Phase 4', title: 'Evidence Portfolio & File Uploads', icon: 'fa-folder-open', color: 'teal',
                items: [
                    'Add gaEvidence table: studentId × packageId linking with status (pending/verified/rejected)',
                    'Add gaEvidenceFile table: multi-file attachments per evidence record (PDF, images, DOCX)',
                    'File upload UI: drag-drop zone per GA/level card, thumbnail previews, upload progress',
                    'Wire to existing files service for storage backend (file/fileVersion pattern)',
                    'Evidence lifecycle: auto-create on eval pass → upload artefacts → moderator verify → lock',
                    'Verification workflow: moderator queue, inline file viewer, approve/reject with notes',
                    'GA-locking on verification: lockedAt/lockedBy timestamps, immutable after lock',
                    'Pass preservation: locked evidence persists across re-evaluations and criteria version changes',
                    'Evidence categories: transcript, portfolio, assessment, other — filterable in review',
                    'Audit trail integration via audit service for all evidence state changes'
                ]
            },
            {
                phase: 'Phase 5', title: 'Reporting & NL Advisory', icon: 'fa-chart-bar', color: 'purple',
                items: [
                    'Create class.AccreditationReporter.js',
                    'studentReport(): GA × level matrix with per-node drill-down and evidence status',
                    'cohortReport(): per-GA pass rates, at-risk lists, gap analysis',
                    'gaMatrix(): courses × GAs with I/R/A coverage from logic package structure',
                    'complianceSnapshot(): single-number score for dashboard display',
                    'Natural language advisory: generate positive (PASS) and negative (NOT YET) narrative reports per GA/level',
                    'Advisory includes: specific course/assessment references, gap amounts, next opportunity (enrol/retake/alternative path)',
                    'Evidence completeness report: which GA/levels have verified evidence vs pending vs missing'
                ]
            },
            {
                phase: 'Phase 6', title: 'Integration & Testing', icon: 'fa-plug', color: 'red',
                items: [
                    'Wire into AutoScholar Services Panel (logicEditor, studentEval, cohortReport cards)',
                    'Create demo.logic-package-editor.html with full tree editing',
                    'Create demo.evidence-portfolio.html with file upload and verification workflow',
                    'Import ECSA GA1-GA11 templates with all three levels as seed data',
                    'Import DUT BNCME1 programme-specific logic from old AccreditationAutoMate',
                    'Test against sample student data from DUT testrig',
                    'Screenshot verification of all interactions'
                ]
            },
            {
                phase: 'Phase 7', title: 'Accreditation Visit Readiness', icon: 'fa-certificate', color: 'yellow',
                items: [
                    'Accreditation dashboard: per-GA/level status across all students with evidence completeness',
                    'Bulk evidence export: generate evidence portfolio per student or per GA for site visit panel',
                    'Compliance report PDF generation with criteria trees, student results, and evidence references',
                    'Version management: create new criteria version for next accreditation cycle, deactivate old',
                    'Cross-programme comparison: same GAs evaluated across multiple programme variants'
                ]
            }
        ];

        phases.forEach(p => {
            const phaseDiv = document.createElement('div');
            phaseDiv.className = 'as-sp-phase';

            const phaseHeader = document.createElement('div');
            phaseHeader.className = 'as-sp-phase-header';
            phaseHeader.innerHTML = `
                <span style="background: var(--ui-${p.color}-100); color: var(--ui-${p.color}-700); font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 3px; text-transform: uppercase;">${p.phase}</span>
                <span style="font-weight: 600; font-size: 0.82rem; color: var(--ui-gray-800);">${p.title}</span>`;
            phaseDiv.appendChild(phaseHeader);

            const ol = document.createElement('ol');
            ol.className = 'as-sp-phase-ol';
            p.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                ol.appendChild(li);
            });
            phaseDiv.appendChild(ol);
            planBody.appendChild(phaseDiv);
        });

        // ── 11. Files Manifest ──
        const filesBody = this._aboutSection(wrapper, 'fa-folder-open', 'Files to Create');
        filesBody.innerHTML = `
            <div style="background: var(--ui-gray-50); border-radius: 6px; padding: 0.7rem 1rem; font-family: monospace; font-size: 0.73rem; line-height: 1.8; color: var(--ui-gray-700);">
                <div style="font-weight: 600; margin-bottom: 0.3rem;">Publon.Press/Systems/AutoScholar/</div>
                <div style="padding-left: 1rem;">class.LogicPackageService.js <span style="color: var(--ui-gray-400);">— Publome microservice</span></div>
                <div style="padding-left: 1rem;">class.LogicPackageEvaluator.js <span style="color: var(--ui-gray-400);">— Recursive evaluation engine</span></div>
                <div style="padding-left: 1rem;">class.LogicPackageEditor.js <span style="color: var(--ui-gray-400);">— uiTree-based visual editor</span></div>
                <div style="padding-left: 1rem;">class.AccreditationReporter.js <span style="color: var(--ui-gray-400);">— Student + cohort reports</span></div>
                <div style="padding-left: 1rem;">templates/ecsa-ga-packages.json <span style="color: var(--ui-gray-400);">— GA1-GA11 × 3 levels</span></div>
                <div style="padding-left: 1rem;">demo.logic-package-editor.html <span style="color: var(--ui-gray-400);">— Editor demo</span></div>
                <div style="padding-left: 1rem;">demo.student-ga-evaluation-v2.html <span style="color: var(--ui-gray-400);">— Student eval demo</span></div>
            </div>`;

        // ── 12. Success Criteria ──
        const scBody = this._aboutSection(wrapper, 'fa-check-double', 'Success Criteria');
        const criteria = [
            'User can open Logic Package Editor, select ECSA → GA3 → Exit Level, and see a visual tree',
            'User can add, edit, delete, and drag-drop reorder nodes in the tree',
            'Each node type has an appropriate editor form with the right fields',
            'User can click "Test" with a student number and see pass/fail overlaid on tree (green/red per node)',
            'Student report generates full GA profile: 11 GAs × 3 levels with pass/fail and drill-down',
            'Cohort report generates per-GA pass rates and identifies at-risk students',
            'atLeastTotal operator correctly aggregates credits/marks across a set of courses',
            'Logic packages can be imported from existing ECSA JSON templates',
            'Everything runs in the DUT testrig with sample data'
        ];
        criteria.forEach((c, i) => {
            const item = document.createElement('div');
            item.className = 'as-sp-criteria-item';
            item.innerHTML = `<span style="color: var(--ui-primary-500); font-weight: 600; min-width: 1.2rem;">${i + 1}.</span>${c}`;
            scBody.appendChild(item);
        });

        // ── 13. References ──
        const refBody = this._aboutSection(wrapper, 'fa-book', 'References & Research Context');
        const refs = [
            { authors: 'ECSA', year: 2019, title: 'Qualification Standard for Bachelor of Science in Engineering (NQF Level 8)', note: 'Defines GA1–GA11 with range statements at multiple achievement levels — the primary accreditation framework this editor targets.' },
            { authors: 'Washington Accord', year: 2021, title: 'Graduate Attributes and Professional Competencies', note: 'International engineering accreditation standard that South African programmes must satisfy through the Accord.' },
            { authors: 'CHE', year: 2013, title: 'A proposal for undergraduate curriculum reform in South Africa', note: 'Higher education accreditation context — credit/NQF requirements that the atLeastTotal operator addresses.' },
            { authors: 'Biggs, J. & Tang, C.', year: 2011, title: 'Teaching for Quality Learning at University', note: 'Constructive alignment framework — GA mapping demonstrates that graduate attributes are systematically developed through the curriculum.' },
            { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor: A case for improving teaching and learning in SA', note: 'South African cohort study — only 30% graduate within 5 years, contextualizing the need for automated compliance tracking.' },
            { authors: 'CASE v1.1', year: 2020, title: 'Competency and Academic Standards Exchange', note: 'Interoperability standard — the logic package data model follows CASE patterns for exchange with external accreditation systems.' }
        ];
        refs.forEach(c => {
            const cite = document.createElement('div');
            cite.className = 'as-sp-citation-lg';
            cite.innerHTML = `
                <div style="font-size: 0.78rem; font-weight: 600; color: var(--ui-gray-800);">${c.authors} (${c.year})</div>
                <div style="font-size: 0.75rem; font-style: italic; color: var(--ui-gray-600); margin: 0.15rem 0;">${c.title}</div>
                <div style="font-size: 0.73rem; color: var(--ui-gray-500); line-height: 1.5;">${c.note}</div>`;
            refBody.appendChild(cite);
        });

        // ── 14. Features & Data Sources (from info) ──
        if (info.features || info.dataSources) {
            const fdBody = this._aboutSection(wrapper, 'fa-cogs', 'Features & Data Sources');
            if (info.features) {
                const featLabel = document.createElement('div');
                featLabel.className = 'as-sp-feat-label';
                featLabel.textContent = 'Features';
                fdBody.appendChild(featLabel);
                info.features.forEach(f => {
                    const item = document.createElement('div');
                    item.className = 'as-sp-feat-item-sm';
                    item.innerHTML = `<i class="fas fa-check" style="color: var(--ui-primary-500); margin-right: 0.3rem; font-size: 0.65rem;"></i>${f}`;
                    fdBody.appendChild(item);
                });
            }
            if (info.dataSources) {
                const dsLabel = document.createElement('div');
                dsLabel.className = 'as-sp-ds-label';
                dsLabel.textContent = 'Data Sources';
                fdBody.appendChild(dsLabel);
                const dsRow = document.createElement('div');
                dsRow.className = 'as-flex-wrap-tight';
                fdBody.appendChild(dsRow);
                info.dataSources.forEach(d => {
                    new uiBadge({ label: d, color: 'gray', size: 'xs', parent: dsRow });
                });
            }
        }
    }

    _aboutSection(parent, icon, title) {
        const section = document.createElement('div');
        section.className = 'as-sp-section';
        parent.appendChild(section);

        const heading = document.createElement('h3');
        heading.className = 'as-sp-section-heading';
        heading.innerHTML = `<i class="fas ${icon}" style="margin-right: 0.5rem; color: var(--ui-primary-500); width: 16px; text-align: center;"></i>${title}`;
        section.appendChild(heading);

        const body = document.createElement('div');
        section.appendChild(body);
        return body;
    }

    _aboutContent() {
        return {
            // ═══════════════════════════════════════════════════════════
            // ClassView Connect
            // ═══════════════════════════════════════════════════════════
            risk: {
                comprehensive: true,
                description: 'Z-score based risk analysis that identifies at-risk and high-performing students across assessments. Uses a two-level z-score approach: first computing per-assessment z-scores, then computing z-scores on the alert counts themselves to find students with unusually many negative or positive performance signals.',
                features: ['Per-assessment z-score analysis', 'Negative & positive alert counting', 'Two-level z-score categorization', 'Paginated student cards with search', 'Email templates for student communication', 'Configurable z-thresholds'],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'getStudentBioData']
            },
            roster: {
                description: 'Browse all enrolled students in a course with their current marks, programme information, campus, and contact details. Provides the core student listing that other ClassView tools reference. Includes traffic-light status indicators, sortable columns, and the ability to drill into individual student profiles with full academic history.',
                features: ['Sortable student listing with marks and programme info', 'Traffic-light status indicators (at-risk, average, high-performing)', 'Campus filtering for multi-campus courses', 'Search by name, student number, or programme', 'Drill-down to individual student profile', 'Export roster to CSV/Excel', 'Inline contact actions (email, flag)'],
                devPlan: [
                    'Define roster Publome schema (student, enrolment, course tables)',
                    'Build UIBinding-powered sortable list with traffic-light badges',
                    'Implement campus/programme filter dropdowns from course enrolment data',
                    'Add student profile drill-down using uiControlStage nested plate',
                    'Connect to getCourseResults + getStudentBioData APIs for live data',
                    'Add CSV/Excel export via report builder utility'
                ],
                dataSources: ['getCourseResults', 'getStudentBioData', 'getProgrammeRegistrations'],
                references: [
                    { authors: 'Macfadyen, L.P. & Dawson, S.', year: 2010, title: 'Mining LMS data to develop an early warning system for educators', note: 'Demonstrated the value of student-level dashboards showing engagement indicators alongside academic performance.' },
                    { authors: 'Arnold, K.E. & Pistilli, M.D.', year: 2012, title: 'Course Signals at Purdue: Using learning analytics to increase student success', note: 'Traffic-light visualization paradigm for student risk that this roster view implements.' }
                ]
            },
            gradebook: {
                description: 'Assessment management and grade entry for course lecturers. Provides a spreadsheet-style grid for viewing and entering marks per assessment, with per-assessment statistics (mean, SD, pass rate, distribution histogram). Supports bulk import from CSV, inline editing, and weighted final mark calculation.',
                features: ['Spreadsheet-style grade grid with inline editing', 'Per-assessment statistics (mean, SD, pass rate, histogram)', 'Bulk mark import from CSV/Excel', 'Assessment CRUD (create, weight, reorder, delete)', 'Weighted final mark calculation', 'Distribution histogram per assessment', 'Mark validation and outlier highlighting'],
                devPlan: [
                    'Define assessment + result Publome schema with weights and ordering',
                    'Build UIBinding grid with inline-editable cells for mark entry',
                    'Implement assessment CRUD modal (name, code, weight, max mark, date)',
                    'Add per-assessment statistics panel (mean, SD, pass rate) with histogram',
                    'Build CSV import with column mapping and validation',
                    'Implement weighted final mark calculation engine',
                    'Connect to getAssessmentResults API with batch save'
                ],
                dataSources: ['getAssessmentResults', 'getCourseResults', 'getAssessmentMeta'],
                references: [
                    { authors: 'Biggs, J. & Tang, C.', year: 2011, title: 'Teaching for Quality Learning at University', note: 'Constructive alignment framework — assessment design should align with learning outcomes. Gradebook should surface this alignment.' },
                    { authors: 'Sadler, D.R.', year: 2009, title: 'Indeterminacy in the use of preset criteria for assessment and grading', note: 'Highlights the importance of transparent rubrics and statistical awareness in grading practices.' }
                ]
            },
            attendance: {
                description: 'Attendance tracking and DP (Duly Performed) status monitoring unique to South African higher education. Tracks attendance percentage against configurable thresholds, identifies students at risk of DP exclusion, and generates DP status reports for exam offices. Supports bulk attendance marking via QR code or manual entry.',
                features: ['Attendance percentage tracking per student per course', 'Configurable DP threshold rules (percentage, absolute count)', 'DP risk identification with early warnings', 'Bulk attendance marking (QR code, roll call, import)', 'DP exclusion reports for exam office submission', 'Attendance trend visualization over semester', 'Session-level attendance detail view'],
                devPlan: [
                    'Define attendance Publome schema (session, attendance record, DP rule tables)',
                    'Build session creation interface (date, type, venue)',
                    'Implement bulk attendance marking with multiple input methods',
                    'Build DP rule configuration (threshold %, minimum sessions, grace period)',
                    'Create DP status calculator that evaluates rules per student',
                    'Add DP risk early-warning alerts with configurable trigger points',
                    'Generate DP exclusion reports in printable/exportable format'
                ],
                dataSources: ['getAttendanceRecords', 'getCourseResults', 'getDPRules'],
                references: [
                    { authors: 'FundiConnect', year: 2023, title: 'DP System Explained — Understanding Duly Performed Requirements', note: 'Practical guide to the SA-specific DP system. AutoScholar automates this tracking — no existing platform provides DP status automation.' },
                    { authors: 'Macfadyen, L.P. & Dawson, S.', year: 2010, title: 'Mining LMS data to develop an early warning system', note: 'Attendance data is among the strongest predictors of student success — combining it with DP tracking creates a powerful SA-specific intervention tool.' },
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor: A case for improving teaching and learning in SA', note: 'Only 30% of SA students graduate in 5 years. DP exclusion is a significant attrition mechanism that needs systematic tracking.' }
                ]
            },
            historical: {
                description: 'Year-over-year performance analysis for a course spanning up to 6 years. Displays trend lines for pass rate, mean mark, enrolment, and throughput. Includes per-year summary cards with detailed statistics (SD, skewness, kurtosis) and a data table with export to CSV/PDF/Excel. Based on the legacy ClassView historical performance module.',
                features: ['6-year historical trend line charts (pass rate, mean, enrolment)', 'Per-year summary cards with expanded statistics', 'Histogram distribution per year', 'Exportable data table (CSV, PDF, Excel)', 'Year-over-year comparison metrics (delta, trend direction)', 'Normality indicators (skewness, kurtosis)'],
                devPlan: [
                    'Query getCourseResults with year range (current year - 5 to current)',
                    'Compute per-year statistics (n, wrote, passed, passrate, mean, SD, skewness, kurtosis)',
                    'Build trend line chart using uiControlChart for pass rate + mean',
                    'Create per-year expandable summary cards with histogram',
                    'Build exportable data table with column sorting',
                    'Add year-over-year delta calculations and trend arrows'
                ],
                dataSources: ['getCourseResults', 'getCourseCounts', 'getAssessmentMeta'],
                references: [
                    { authors: 'Romero, C. & Ventura, S.', year: 2020, title: 'Educational data mining and learning analytics: An updated survey', note: 'Comprehensive survey of temporal analysis techniques in educational data — historical trend analysis is foundational to EDM.' },
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor: A case for improving teaching and learning', note: 'Longitudinal cohort data reveals systemic patterns. Historical performance analysis enables identification of improving/declining courses.' }
                ]
            },
            peerCorr: {
                description: 'Cross-course correlation analysis using Pearson R coefficients. Builds a student-by-course matrix and computes pairwise correlations between all courses a cohort takes. Identifies courses that predict performance in others, revealing prerequisite relationships and curricular dependencies. Includes correlation matrix heatmap and pairwise scatter plots.',
                features: ['Pearson R correlation matrix across all peer courses', 'Correlation matrix heatmap visualization', 'Pairwise scatter plot with regression line', 'Course pair selector for detailed comparison', 'Correlation strength categorization (strong/moderate/weak)', 'Identification of potential prerequisite relationships'],
                devPlan: [
                    'Fetch all course results for students in target course (current + previous year)',
                    'Build student × course matrix with marks as values',
                    'Compute Pearson R for all course pairs using bm.pearsonR utility',
                    'Render correlation matrix as heatmap table with color coding',
                    'Build pairwise scatter plot with course selectors',
                    'Add interpretation guide for correlation strengths'
                ],
                dataSources: ['getCourseResults', 'getProgrammeRegistrations'],
                references: [
                    { authors: 'Jayaprakash, S.M. et al.', year: 2014, title: 'Open Academic Analytics Initiative', note: 'Cross-course performance comparison using normalized scores — the OAAI approach to identifying curricular relationships.' },
                    { authors: 'Macfadyen, L.P. & Dawson, S.', year: 2010, title: 'Mining LMS data to develop an early warning system', note: 'Demonstrated that performance in related courses is a strong predictor — peer correlation quantifies these relationships.' }
                ]
            },
            classAnalytics: {
                description: 'Real-time class performance dashboard showing key metrics at a glance. Aggregates data from risk analysis, attendance, gradebook, and roster into a unified dashboard with KPI cards, distribution charts, and alert summaries. Provides the "single pane of glass" view for lecturers to understand class health.',
                features: ['KPI cards (class mean, pass rate, at-risk count, attendance rate)', 'Score distribution histogram with normal curve overlay', 'Risk category breakdown (pie/donut chart)', 'Assessment-by-assessment trend sparklines', 'DP status summary widget', 'Quick-action links to related tools', 'Refreshable with course/year selector'],
                devPlan: [
                    'Define dashboard layout with KPI cards row + chart grid',
                    'Build KPI aggregation from course results (mean, pass rate, at-risk %)',
                    'Create score distribution histogram with configurable bin size',
                    'Add risk category donut chart from risk analysis output',
                    'Build assessment trend sparklines per assessment code',
                    'Add DP status summary from attendance data',
                    'Wire refresh to course/year selector change events'
                ],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'getAttendanceRecords'],
                references: [
                    { authors: 'Arnold, K.E. & Pistilli, M.D.', year: 2012, title: 'Course Signals at Purdue', note: 'Established the dashboard paradigm for instructor-facing analytics — timely, actionable, and visually clear.' },
                    { authors: 'Verbert, K. et al.', year: 2014, title: 'Learning dashboards: An overview and future research opportunities', note: 'Comprehensive review of LA dashboard design principles — awareness, reflection, sensemaking, and impact.' }
                ]
            },
            pollManager: {
                description: 'In-class quick polling tool for real-time engagement and formative feedback. Lecturers create polls (multiple choice, Likert, open-ended) that students respond to via their devices. Results display live with bar charts. Supports anonymous and identified responses, and saves poll data for later analysis.',
                features: ['Multiple question types (MCQ, Likert, open-ended, word cloud)', 'Live result visualization with auto-updating charts', 'Anonymous and identified response modes', 'Poll templates and reuse across sessions', 'Response export and historical poll archive', 'Student participation tracking'],
                devPlan: [
                    'Define poll Publome schema (poll, question, response tables)',
                    'Build poll creation interface with question type templates',
                    'Implement student response capture via shared link/QR code',
                    'Create live result visualization with auto-refresh',
                    'Add poll archive with historical response data',
                    'Connect participation data to attendance/engagement metrics'
                ],
                dataSources: ['PollService', 'getCourseResults'],
                references: [
                    { authors: 'Caldwell, J.E.', year: 2007, title: 'Clickers in the large classroom: Current research and best-practice tips', note: 'Meta-analysis showing audience response systems improve engagement and learning outcomes — digital polling extends this.' },
                    { authors: 'Biggs, J. & Tang, C.', year: 2011, title: 'Teaching for Quality Learning at University', note: 'Formative assessment through polling aligns with constructive alignment principles.' }
                ]
            },

            // ═══════════════════════════════════════════════════════════
            // Student Central
            // ═══════════════════════════════════════════════════════════
            studentDash: {
                description: 'Personal academic overview serving as the student\'s home screen. Displays upcoming deadlines, current GPA, at-risk warnings with actionable suggestions, degree progress summary, and motivational progress indicators. Provides quick-action links to all Student Central tools.',
                features: ['Upcoming deadlines with countdown', 'Current GPA and semester average', 'At-risk warnings with actionable suggestions', 'Degree progress percentage ring', 'Quick-action links to results, diary, career hub', 'Motivational streak and achievement highlights', 'Personalized course schedule widget'],
                devPlan: [
                    'Define student dashboard data aggregation from multiple services',
                    'Build KPI cards (GPA, credits completed, at-risk status)',
                    'Create upcoming deadlines widget from assessment schedule',
                    'Add at-risk warning panel with support service links',
                    'Build degree progress visualization ring',
                    'Add motivational section (streak, recent achievements)',
                    'Wire quick-action buttons to Student Central tools'
                ],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'getDiaryEntries', 'getGamificationState'],
                references: [
                    { authors: 'Tinto, V.', year: 2012, title: 'Completing College: Rethinking Institutional Action', note: 'Student engagement and sense of belonging are critical to retention — the dashboard aims to make academic progress tangible and motivating.' },
                    { authors: 'Slade, S. & Prinsloo, P.', year: 2013, title: 'Learning analytics: Ethical issues and dilemmas', note: 'Student-facing analytics must empower, not surveil — the dashboard prioritizes actionable, supportive information.' }
                ]
            },
            myResults: {
                description: 'Comprehensive academic record view for students showing course results, assessment marks, GPA calculation, and academic transcript. Students can view current and historical results, filter by year/semester, and export their academic record. Includes programme-level aggregation and credit counting.',
                features: ['Course results table with sorting and filtering', 'Per-assessment mark detail view', 'GPA calculation (semester and cumulative)', 'Credit counting toward graduation', 'Historical results by year/semester', 'Exportable academic record (PDF transcript)', 'Programme progress summary'],
                devPlan: [
                    'Build results table with UIBinding from student\'s course results',
                    'Add per-assessment expandable rows showing individual marks',
                    'Implement GPA calculation engine (configurable scale)',
                    'Create credit counting against programme requirements',
                    'Add year/semester filter with historical navigation',
                    'Build PDF transcript export with institutional branding'
                ],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'getProgrammeRegistrations'],
                references: [
                    { authors: 'Tinto, V.', year: 2012, title: 'Completing College: Rethinking Institutional Action', note: 'Students who understand their academic standing make better decisions — transparent results viewing supports self-regulation.' }
                ]
            },
            progressTracker: {
                description: 'Visual degree progress tracker showing completed, in-progress, and remaining courses against programme requirements. Displays a course graph with prerequisite chains, credit accumulation, and estimated completion timeline. Helps students understand where they are in their programme journey.',
                features: ['Course completion grid (done, in-progress, remaining)', 'Prerequisite chain visualization', 'Credit accumulation progress bar', 'Estimated completion date', 'Year-of-study (AYOS) calculation', 'Course substitution tracking', 'What-if scenario for course selection'],
                devPlan: [
                    'Load programme curriculum structure (required, elective courses)',
                    'Match student\'s completed courses against requirements',
                    'Build visual grid showing completion status per course',
                    'Add prerequisite graph visualization using vis-network',
                    'Implement AYOS (Academic Year of Study) calculation',
                    'Build what-if tool for course selection scenarios'
                ],
                dataSources: ['getCourseResults', 'getProgrammeStructure', 'getPrerequisites'],
                references: [
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'Only 30% of SA students graduate in 5 years — progress tracking helps students stay on the shortest path to completion.' },
                    { authors: 'CHE', year: 2013, title: 'A proposal for undergraduate curriculum reform in South Africa', note: 'Extended curriculum programmes make progress tracking complex — the tool must handle multiple programme variants.' }
                ]
            },
            cumLaude: {
                description: 'Class-of-pass projection tool that calculates a student\'s weighted GPA trajectory and projects their likely class of pass (pass, cum laude, magna cum laude, summa cum laude). Includes what-if scenarios: "If I get X% in remaining courses, what class of pass?" Helps motivated students set mark targets.',
                features: ['Current weighted GPA calculation', 'Projected class of pass based on trajectory', 'What-if scenario calculator', 'Per-course mark target recommendations', 'Historical class-of-pass distribution for programme', 'Distinction indicator per course'],
                devPlan: [
                    'Implement weighted GPA engine with institutional rules',
                    'Build trajectory projection from remaining courses + weights',
                    'Create what-if calculator interface',
                    'Add per-course target marks for desired class of pass',
                    'Show historical distribution of classes of pass for context'
                ],
                dataSources: ['getCourseResults', 'getProgrammeStructure', 'getGraduationRules'],
                references: [
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'Graduation with distinction is a key metric for SA institutions. Making this visible to students creates achievable aspiration targets.' }
                ]
            },
            portfolio: {
                description: 'Evidence portfolio for accreditation where students upload artifacts demonstrating graduate attribute achievement. Organized by graduate attribute (GA), with status tracking (pending, verified, rejected). Lecturers and accreditation officers review submissions. Feeds into the Accreditation AutoMate compliance pipeline.',
                features: ['Evidence upload organized by graduate attribute', 'File versioning and metadata tagging', 'Status workflow (draft, submitted, verified, rejected)', 'Reviewer comments and feedback', 'GA achievement progress dashboard', 'Bulk upload with drag-and-drop', 'PDF portfolio export for accreditation visits'],
                devPlan: [
                    'Define evidence Publome schema (artifact, review, GA link tables)',
                    'Build file upload interface with drag-and-drop',
                    'Implement GA-organized artifact browser',
                    'Create review workflow with status transitions',
                    'Add GA achievement progress visualization',
                    'Build PDF portfolio export with institutional template'
                ],
                dataSources: ['FileService', 'getGraduateAttributes', 'getEvidenceRecords'],
                references: [
                    { authors: 'ECSA', year: 2014, title: 'Qualification Standard for Bachelor of Science in Engineering', note: 'ECSA graduate attributes define the evidence categories students must demonstrate — the portfolio structure maps directly to these.' },
                    { authors: 'CASE v1.1 Specification', year: 2020, title: 'Competency and Academic Standards Exchange', note: 'The portfolio follows CASE competency framework patterns for evidence-to-outcome mapping.' }
                ]
            },
            careerHub: {
                description: 'Career development portal with CV builder, opportunity matching, and application tracker. Students build verified professional profiles drawing from academic records, match skills to opportunities via a weighted scoring engine, and track applications through status workflows. Backed by CareerService (9-table Publome, 24 methods) and QualificationService (3-table Publome, 6 methods).',
                features: [
                    'Structured CV builder with drag-drop reordering and verified academic blocks',
                    'Skills inventory with proficiency self-assessment (Beginner→Expert)',
                    'Experience log (work, volunteer, project) with current-role tracking',
                    'Opportunity browser with type/field/location filters and match-score badges',
                    'Weighted matching engine (qualification 25%, field 20%, NQF 15%, GPA 15%, skills 10%, year 5%, deadline 10%)',
                    'Application tracker with status workflow (submitted→reviewed→shortlisted→accepted/rejected)',
                    'Employer portal for posting opportunities and reviewing applicants',
                    'Qualification mapping service with keyword-based HEQSF suggestions'
                ],
                architecture: {
                    services: [
                        'CareerService (ms.career.js) — 9 tables: studentProfile, studentProgrammeData, cvBlock, skillEntry, experienceEntry, verifiedResult, opportunity, opportunityRequirement, application',
                        'QualificationService (ms.qualification.js) — 3 tables: qualification, programmeQualificationMap, jobQualificationMap'
                    ],
                    dataFlow: 'CareerHubPanel accepts optional { careerService, memberId } config. When service provided, all CRUD operations (add skill, add experience, apply, withdraw) write through to Publome tables. Falls back to hardcoded sample data when no service present.',
                    matching: 'getMatchingOpportunities(profileId) iterates published opportunities, evaluates each requirement against student profile/skills/programme data, produces weighted score 0–100. Requirements checked: qualification type, field of study, NQF level, minimum GPA, specific skills, year of study, deadline currency.',
                    registry: 'registry.careerHub.json provides opportunity types, qualification types (12 HEQSF levels NQF 5-10), NQF level labels, CESM field codes, and match score weights.'
                },
                testResults: {
                    framework: 'Playwright',
                    config: 'Tests/careerhub.config.js',
                    spec: 'Tests/careerhub.spec.js',
                    total: '25/25 passing',
                    groups: [
                        'Service Instantiation (3) — CareerService + QualificationService load, tables exist, registry seeds',
                        'Profile CRUD (3) — create profile, idempotent getOrCreate, field access',
                        'CV Blocks (4) — add, update, reorder, delete',
                        'Skills & Experience (4) — add/get skills, add/delete experience',
                        'Opportunities (3) — create, add requirements, matching engine',
                        'Applications (3) — apply, retrieve, update status',
                        'Qualification Service (3) — seed from registry, suggest mapping, create mapping',
                        'UI Smoke Tests (2) — all 3 tabs render, service data populates views'
                    ]
                },
                devPlan: [
                    '✓ Define career Publome schema (9 tables: profile, programme, cvBlock, skill, experience, verifiedResult, opportunity, requirement, application)',
                    '✓ Implement CareerService with 24 CRUD + domain methods',
                    '✓ Implement QualificationService with HEQSF seed data and keyword mapping',
                    '✓ Wire services into testrig (CareerHubPanel accepts careerService config)',
                    '✓ Build weighted matching engine with configurable score weights',
                    '✓ Create Playwright test suite (25 tests across 8 groups)',
                    'Build UIBinding forms for CV section editing (replace manual modals)',
                    'Implement CV PDF export with template selection',
                    'Add employer portal CRUD via UIBinding',
                    'Connect to academic service for live verified-result sync'
                ],
                dataSources: ['CareerService', 'QualificationService', 'registry.careerHub.json'],
                references: [
                    { authors: 'Bridgstock, R.', year: 2009, title: 'The graduate attributes we\'ve overlooked: Enhancing graduate employability through career management skills', note: 'Career readiness as a graduate attribute — the career hub operationalizes this for students.' },
                    { authors: 'Tomlinson, M.', year: 2008, title: 'The degree is not enough: Students\' perceptions of the role of higher education credentials for graduate work', note: 'Students need structured support to translate academic achievement into career outcomes.' },
                    { authors: 'HEQSF (DHET)', year: 2013, title: 'Higher Education Qualifications Sub-Framework', note: 'The 12 qualification types (NQF 5-10) from HEQSF define the qualification taxonomy used by the matching engine and QualificationService.' }
                ]
            },
            diary: {
                description: 'Study diary combining reflection journaling, goal setting, and study session tracking. Students log study sessions, set weekly/semester goals, and write reflections. Includes check-in prompts for wellbeing and academic confidence. Data feeds into learning analytics and engagement metrics.',
                features: ['Study session logging with duration and topic', 'Goal setting (daily, weekly, semester targets)', 'Reflection journal entries with prompts', 'Wellbeing check-in with mood/confidence tracking', 'Study time analytics (weekly heatmap, totals)', 'Goal achievement tracking and streaks', 'Private entries (not visible to staff)'],
                devPlan: [
                    'Define diary Publome schema (entry, goal, checkIn tables)',
                    'Build journal entry form with markdown support',
                    'Implement goal creation and tracking interface',
                    'Add wellbeing check-in with quick-select mood/confidence',
                    'Create study time analytics dashboard (heatmap, weekly totals)',
                    'Build streak tracking and goal completion visualization'
                ],
                dataSources: ['DiaryService', 'getGamificationState'],
                references: [
                    { authors: 'Zimmerman, B.J.', year: 2002, title: 'Becoming a self-regulated learner: An overview', note: 'Self-regulated learning theory underpins the diary — reflection, goal-setting, and self-monitoring are key SRL strategies.' },
                    { authors: 'Winne, P.H. & Hadwin, A.F.', year: 1998, title: 'Studying as self-regulated learning', note: 'The COPES model of SRL — study diary captures conditions, operations, products, evaluations, and standards.' }
                ]
            },
            achievements: {
                description: 'Gamification system with badges, points, streaks, leaderboards, and challenges. Awards points for engagement activities (attending class, submitting on time, journaling, helping peers). Supports 11 progression levels, 8+ badge categories with rarity tiers, and weekly/semester leaderboards.',
                features: ['Achievement badges with rarity tiers (common to legendary)', 'Points system for engagement activities', 'Streak tracking with freeze/protection feature', 'Leaderboards (weekly, semester, all-time)', 'Challenge system with timed goals', 'Level progression (11 levels)', 'Achievement wall showcase'],
                devPlan: [
                    'Define gamification Publome schema (badge, points, streak, challenge tables)',
                    'Build achievement wall with badge display and unlock animations',
                    'Implement points engine with configurable activity-to-points mapping',
                    'Create streak tracker with calendar visualization',
                    'Build leaderboard with time-period filters',
                    'Add challenge creation and participation workflow',
                    'Connect activity hooks from other services (attendance, diary, submissions)'
                ],
                dataSources: ['GamificationService', 'getActivityLog'],
                references: [
                    { authors: 'Dichev, C. & Dicheva, D.', year: 2017, title: 'Gamifying education: What is known, what is believed and what remains uncertain', note: 'Meta-review of gamification in education — badges and leaderboards show positive effects when aligned with learning goals.' },
                    { authors: 'Hamari, J., Koivisto, J. & Sarsa, H.', year: 2014, title: 'Does gamification work? A literature review of empirical studies on gamification', note: 'Gamification effects are context-dependent — the system must be configurable to institutional culture.' }
                ]
            },

            // ═══════════════════════════════════════════════════════════
            // Programme Analyst
            // ═══════════════════════════════════════════════════════════
            progOverview: {
                description: 'Programme health dashboard for programme coordinators showing key metrics at programme level: throughput rate, average time-to-completion, at-risk student percentage, DFW rate trends, and comparison to institutional benchmarks. The entry point for all Programme Analyst tools.',
                features: ['Programme KPI cards (throughput, DFW rate, avg completion time)', 'At-risk student count and percentage', 'Year-over-year trend sparklines', 'Benchmark comparison against institution average', 'Quick-nav links to detailed analyst tools', 'Multi-programme selection for comparison'],
                devPlan: [
                    'Define programme analytics aggregation queries',
                    'Build KPI card row with throughput, DFW rate, at-risk percentage',
                    'Add year-over-year trend sparklines per KPI',
                    'Implement institutional benchmark comparison',
                    'Create multi-programme selector for comparison mode',
                    'Add quick-nav panel linking to analyst sub-tools'
                ],
                dataSources: ['getCourseResults', 'getProgrammeRegistrations', 'getGraduationData'],
                references: [
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'Programme-level cohort tracking is essential for understanding systematic underperformance in SA higher education.' },
                    { authors: 'CHE', year: 2013, title: 'A proposal for undergraduate curriculum reform in South Africa', note: 'The programme overview directly supports the CHE\'s call for evidence-based curriculum governance.' }
                ]
            },
            cohortTracker: {
                description: 'Cohort progression visualization using Sankey diagrams to show student flow through a programme. Tracks an entry cohort from first year through graduation, showing progression, repetition, dropout, and exclusion at each year level. Calculates AYOS (Academic Year of Study) and identifies bottleneck years.',
                features: ['Sankey diagram of cohort flow (progress, repeat, drop, graduate)', 'AYOS (Academic Year of Study) calculation per student', 'Bottleneck year identification', 'Cohort size tracking at each stage', 'Dropout/exclusion rate per year level', 'Multiple cohort overlay for comparison', 'Export cohort data and Sankey visualization'],
                devPlan: [
                    'Load programme registrations for entry cohort (by year)',
                    'Compute year-level progression per student per year',
                    'Calculate AYOS for each student',
                    'Build Sankey diagram using D3/vis.js for flow visualization',
                    'Add bottleneck detection (year levels with highest attrition)',
                    'Implement multi-cohort overlay for comparison',
                    'Export cohort report with flow statistics'
                ],
                dataSources: ['getProgrammeRegistrations', 'getCourseResults', 'getGraduationData'],
                references: [
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'The cohort study methodology that revealed only 30% of SA students graduate in 5 years — this tool systematizes that analysis.' },
                    { authors: 'Tinto, V.', year: 2012, title: 'Completing College: Rethinking Institutional Action', note: 'Cohort tracking enables institutions to identify where in the pipeline students are lost — essential for targeted interventions.' }
                ]
            },
            progressionMap: {
                description: 'Interactive course prerequisite graph showing the dependency chain through a programme. Renders courses as nodes with directed edges for prerequisites, corequisites, and recommended sequences. Enables programme coordinators to visualize bottleneck paths and identify courses that gate large portions of the curriculum.',
                features: ['Interactive directed graph of prerequisites', 'Course nodes with pass rate and credit info', 'Critical path highlighting (longest prerequisite chain)', 'Bottleneck course identification (most dependents)', 'Prerequisite vs corequisite vs recommended edges', 'Student-specific overlay (which courses they can register for)', 'Drag-and-drop graph layout'],
                devPlan: [
                    'Load programme structure with prerequisite rules',
                    'Build directed graph data model from prerequisite relationships',
                    'Render interactive graph using vis-network library',
                    'Add critical path calculation (longest chain to graduation)',
                    'Implement bottleneck scoring (courses blocking most downstream courses)',
                    'Add student-specific overlay showing unlocked/locked courses'
                ],
                dataSources: ['getProgrammeStructure', 'getPrerequisites', 'getCourseResults'],
                references: [
                    { authors: 'Slim, A. et al.', year: 2014, title: 'Predicting student enrollment based on student and course features', note: 'Curriculum graph analysis reveals hidden dependencies that affect student progression patterns.' }
                ]
            },
            gatekeeper: {
                description: 'Automated identification of high-DFW (D grade, Fail, Withdraw) courses that act as bottlenecks in student progression. Combines pass rate and average delay metrics to rank courses by their gatekeeping impact. Provides actionable recommendations and historical trend analysis for identified gatekeepers.',
                features: ['DFW rate calculation per course with ranking', 'Delay metric (average semesters delayed by failure)', 'Combined gatekeeper score (DFW × impact)', 'Historical DFW trend per course', 'Affected student count and demographics', 'Recommendation engine (tutoring, curriculum redesign, supplementary instruction)', 'Export gatekeeper report for faculty review'],
                devPlan: [
                    'Compute DFW rate for all courses in programme',
                    'Calculate delay metric from repeat registrations',
                    'Build combined gatekeeper scoring algorithm',
                    'Create ranked table with sortable DFW/delay/impact columns',
                    'Add per-course drill-down with historical trends',
                    'Implement recommendation templates based on gatekeeper characteristics',
                    'Build exportable gatekeeper report for governance'
                ],
                dataSources: ['getCourseResults', 'getProgrammeRegistrations', 'getCourseMeta'],
                references: [
                    { authors: 'Koch, A.K.', year: 2017, title: 'It\'s about the gateway courses: Defining and contextualizing the issue', note: 'Comprehensive framework for gatekeeper course identification and intervention — the theoretical basis for this tool.' },
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'SA-specific evidence that certain courses disproportionately contribute to dropout — gatekeeper detection addresses this systematically.' }
                ]
            },
            curriculumEditor: {
                description: 'Programme structure editor for managing course sequences, year/semester placement, credit allocation, and prerequisite rules. Provides a year-semester grid layout with drag-and-drop course cards. Supports programme variants (extended curriculum, mainstream). Includes validation against credit limits and prerequisite logic.',
                features: ['Year/semester grid layout with drag-and-drop courses', 'Course cards with credits, type (core/elective/exit level)', 'Prerequisite rule editor with AND/OR logic', 'Programme variant management (extended, mainstream)', 'Credit limit validation per semester/year', 'Verification status (verified, unverified, estimated)', 'Export curriculum structure for handbook publication'],
                devPlan: [
                    'Define curriculum Publome schema (programme, programmeYear, programmeCourse, rule tables)',
                    'Build year/semester grid with course card placement',
                    'Implement drag-and-drop reordering with validation',
                    'Create prerequisite rule editor with nested AND/OR logic',
                    'Add programme variant management (extended curriculum support)',
                    'Build credit validation engine per semester/year level',
                    'Add export to structured format for academic handbook'
                ],
                dataSources: ['getProgrammeStructure', 'getPrerequisites', 'getCourseMeta'],
                references: [
                    { authors: 'CHE', year: 2013, title: 'A proposal for undergraduate curriculum reform in South Africa', note: 'Extended curriculum programmes are a key SA reform — the editor must handle multiple programme variants for the same qualification.' },
                    { authors: 'Biggs, J. & Tang, C.', year: 2011, title: 'Teaching for Quality Learning at University', note: 'Constructive alignment — the curriculum editor should surface the alignment between courses, outcomes, and assessments.' }
                ]
            },
            outcomeMapping: {
                description: 'Graduate attribute (GA) to course outcome mapping matrix. Allows programme coordinators to map at which level (Introduced, Reinforced, Assessed) each GA is addressed by each course. The matrix is the core data structure for accreditation compliance and feeds into the Accreditation AutoMate pipeline.',
                features: ['NxM matrix editor (GAs × courses)', 'I/R/A level mapping with color coding', 'Coverage gap identification (GAs not adequately addressed)', 'Per-GA histogram showing distribution across I/R/A levels', 'Filter by year level or course type', 'Version history for mapping changes', 'Export mapping matrix for accreditation documentation'],
                devPlan: [
                    'Load graduate attributes from accreditation body standards',
                    'Build NxM matrix editor with GA rows and course columns',
                    'Implement I/R/A level toggle per cell with color coding',
                    'Add coverage gap detection (GAs below minimum thresholds)',
                    'Create per-GA distribution histogram',
                    'Add version tracking for mapping changes',
                    'Export matrix to formatted document for accreditation'
                ],
                dataSources: ['getGraduateAttributes', 'getProgrammeStructure', 'getOutcomeMappings'],
                references: [
                    { authors: 'ECSA', year: 2014, title: 'Qualification Standard for Bachelor of Science in Engineering', note: 'ECSA defines 12 graduate attributes that programmes must demonstrate coverage of — this matrix is the primary compliance evidence.' },
                    { authors: 'Washington Accord', year: 2021, title: 'Graduate Attributes and Professional Competencies', note: 'International engineering accreditation standard defining graduate attribute categories — the matrix maps to these categories.' },
                    { authors: 'CASE v1.1', year: 2020, title: 'Competency and Academic Standards Exchange', note: 'The outcome mapping data model follows CASE patterns for interoperability with external accreditation systems.' }
                ]
            },
            cohortCompare: {
                description: 'Cross-cohort comparison tool that places two or more entry cohorts side-by-side for benchmarking. Compare throughput rates, DFW trends, average marks, time-to-completion, and at-risk percentages across cohorts. Useful for measuring the impact of curriculum changes or intervention programmes.',
                features: ['Side-by-side cohort metrics comparison', 'Selectable comparison dimensions (throughput, DFW, marks, time)', 'Statistical significance testing between cohorts', 'Intervention impact analysis (before/after cohorts)', 'Visual diff highlighting (improved, declined, unchanged)', 'Multi-year cohort selection interface'],
                devPlan: [
                    'Build cohort selector allowing 2-4 cohorts for comparison',
                    'Compute parallel metrics for each selected cohort',
                    'Create side-by-side comparison table with delta columns',
                    'Add statistical significance testing (chi-squared, t-test)',
                    'Build visual diff with color-coded improvement/decline',
                    'Add annotation for known interventions or curriculum changes'
                ],
                dataSources: ['getCourseResults', 'getProgrammeRegistrations', 'getGraduationData'],
                references: [
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'Cohort comparison is the gold standard for measuring educational interventions — this tool systematizes the comparison methodology.' }
                ]
            },

            // ═══════════════════════════════════════════════════════════
            // Accreditation AutoMate
            // ═══════════════════════════════════════════════════════════
            accredDash: {
                description: 'Accreditation compliance overview dashboard showing deadline timelines, compliance percentage per programme, document completeness, and gap analysis summaries. The command centre for accreditation officers preparing for professional body visits (ECSA, HPCSA, SAQA).',
                features: ['Compliance percentage per programme with progress rings', 'Deadline timeline with urgency indicators', 'Document completeness tracker', 'Gap analysis summary per accreditation body', 'Quick-access to programmes below compliance threshold', 'Upcoming visit countdown and checklist'],
                devPlan: [
                    'Define accreditation Publome schema (body, programme, deadline, compliance tables)',
                    'Build compliance progress rings per programme',
                    'Create deadline timeline with urgency color coding',
                    'Add gap analysis summary from outcome mapping data',
                    'Build document completeness checker against required evidence list',
                    'Create visit preparation checklist with status tracking'
                ],
                dataSources: ['getAccreditationBodies', 'getOutcomeMappings', 'getEvidenceRecords'],
                references: [
                    { authors: 'ECSA', year: 2014, title: 'Qualification Standard for BSc Engineering', note: 'ECSA accreditation requirements define the compliance framework — the dashboard tracks these requirements systematically.' },
                    { authors: 'Washington Accord', year: 2021, title: 'Graduate Attributes and Professional Competencies', note: 'International engineering accreditation standard that South African programmes must satisfy through the Accord.' }
                ]
            },
            gaMatrix: {
                description: 'Interactive editor for the Graduate Attribute mapping matrix. Maps each graduate attribute to courses at three levels: Introduced (I), Reinforced (R), and Assessed (A). The matrix is the foundational document for accreditation — it demonstrates where and how each GA is developed through the curriculum.',
                features: ['Interactive NxM matrix (GAs × courses) with click-to-toggle I/R/A', 'Color-coded cells (I=blue, R=amber, A=green, empty=gray)', 'Coverage analysis (GAs not at A level in any course)', 'Course contribution summary (how many GAs per course)', 'Filtering by year level, course type, GA category', 'History tracking with diff comparison between versions', 'Print-ready matrix export for accreditation documents'],
                devPlan: [
                    'Load GA definitions from accreditation body standards',
                    'Load programme course list with year/semester placement',
                    'Build interactive matrix grid with I/R/A toggle per cell',
                    'Add coverage analysis (identify gaps where GAs lack A-level)',
                    'Implement version tracking with date stamps',
                    'Build diff comparison between matrix versions',
                    'Create print-ready export with institutional branding'
                ],
                dataSources: ['getGraduateAttributes', 'getProgrammeStructure', 'getOutcomeMappings'],
                references: [
                    { authors: 'ECSA', year: 2014, title: 'Qualification Standard for BSc Engineering', note: 'The I/R/A mapping structure is directly required by ECSA for programme accreditation.' },
                    { authors: 'Biggs, J. & Tang, C.', year: 2011, title: 'Teaching for Quality Learning at University', note: 'Constructive alignment — the GA matrix demonstrates that graduate attributes are systematically developed across the curriculum.' }
                ]
            },
            portfolioReview: {
                description: 'Evidence verification workflow for accreditation officers reviewing student portfolio submissions. Queue-based review with approve/reject/request-revision actions. Bulk review for efficiency, with rubric-based assessment criteria per GA and statistical dashboard showing portfolio completeness across the programme.',
                features: ['Review queue sorted by GA, programme, or student', 'Approve/reject/request-revision actions with comments', 'Rubric-based assessment criteria per GA', 'Bulk review mode for efficiency', 'Portfolio completeness statistics per programme', 'Evidence quality scoring', 'Review history and audit trail'],
                devPlan: [
                    'Build review queue from submitted student portfolios',
                    'Create review interface with evidence viewer and rubric',
                    'Implement approve/reject/revise workflow with comments',
                    'Add bulk review mode for batch processing',
                    'Build portfolio completeness dashboard per programme',
                    'Create audit trail for all review decisions'
                ],
                dataSources: ['FileService', 'getEvidenceRecords', 'getGraduateAttributes'],
                references: [
                    { authors: 'CASE v1.1', year: 2020, title: 'Competency and Academic Standards Exchange', note: 'Evidence-to-competency linking follows CASE patterns for interoperable portfolio data.' }
                ]
            },
            evidenceLibrary: {
                description: 'Centralized searchable repository for all accreditation evidence artifacts (assessments, rubrics, student work samples, external examiner reports, moderation documents, policy documents). Supports tagging, categorization by GA, versioning, and batch upload. The single source of truth for accreditation preparation.',
                features: ['Searchable repository with full-text search', 'Categorization by GA, programme, document type', 'File versioning with change history', 'Batch upload with metadata templates', 'Tag-based organization and filtering', 'Preview support for PDF, images, Office docs', 'Download packages for specific GAs or programmes'],
                devPlan: [
                    'Define evidence library Publome schema (document, version, tag, category tables)',
                    'Build file upload with metadata form (GA, programme, type)',
                    'Implement full-text search across document metadata',
                    'Add file versioning with diff view for documents',
                    'Create download package builder for accreditation visits',
                    'Build preview system for common file types'
                ],
                dataSources: ['FileService', 'getGraduateAttributes', 'getProgrammeStructure'],
                references: [
                    { authors: 'ECSA', year: 2014, title: 'Qualification Standard for BSc Engineering', note: 'ECSA requires organized evidence portfolios — the library provides the systematic storage and retrieval needed for accreditation visits.' }
                ]
            },
            complianceReport: {
                description: 'Automated compliance report generator for accreditation visits. Aggregates data from the GA matrix, evidence library, portfolio reviews, and programme analytics into structured reports matching accreditation body requirements. Generates per-GA compliance summaries, evidence inventories, and gap analysis documents.',
                features: ['Template-based report generation per accreditation body', 'Per-GA compliance summary with evidence count', 'Gap analysis highlighting non-compliant areas', 'Evidence inventory with links to library artifacts', 'Programme statistics insert (throughput, demographics)', 'PDF/Word export with institutional branding', 'Report version tracking and approval workflow'],
                devPlan: [
                    'Define report templates for major accreditation bodies (ECSA, HPCSA, SAQA)',
                    'Build report aggregation engine pulling from GA matrix + evidence library',
                    'Create per-GA compliance summary with evidence counts',
                    'Add gap analysis section highlighting non-compliant GAs',
                    'Implement PDF/Word generation with institutional branding',
                    'Build report approval workflow (draft, review, approved, submitted)'
                ],
                dataSources: ['getOutcomeMappings', 'getEvidenceRecords', 'getCourseResults', 'getGraduationData'],
                references: [
                    { authors: 'ECSA', year: 2014, title: 'Qualification Standard for BSc Engineering', note: 'Compliance reports must demonstrate systematic coverage of all 12 ECSA graduate attributes.' },
                    { authors: 'Washington Accord', year: 2021, title: 'Graduate Attributes and Professional Competencies', note: 'International benchmark for engineering programme accreditation — reports must map to these standards.' }
                ]
            },
            logicEditor: {
                comprehensive: true,
                description: 'The Logic Package Editor is the core accreditation engine for AutoScholar. It provides a visual, tree-based editor for defining accreditation evaluation criteria and a recursive evaluator that tests student or programme data against those criteria. Each accreditation system (ECSA, CHE, HEQSF) defines graduate attributes, each GA has achievement levels (Emerging, Developed, Exit Level), and each GA-at-level has a Logic Package — a tree of conditions that must be satisfied.',
                features: [
                    'Visual tree editor using uiTreeView with drag-drop, add/edit/delete nodes',
                    'Five logic node types: AND, OR, anyNof, atLeastTotal, criterion',
                    'Recursive descent evaluator with detailed per-node pass/fail reporting',
                    'Student-level evaluation (checks course results and marks)',
                    'Programme-level evaluation (checks curriculum structure and attributes)',
                    'Live test panel — select a student and see green/red pass/fail overlaid on the tree',
                    'GA level modeling: Emerging → Developed → Exit Level per graduate attribute',
                    'Import from ECSA/CHE/HEQSF JSON templates',
                    'Clone packages for programme-specific customization',
                    'Schema-driven via Publome (accredSystem, accredAttribute, accredLevel, logicPackage, logicNode)'
                ],
                dataSources: ['LogicPackageService', 'AccreditationDataAdapter', 'getCourseResults', 'getAssessmentResults'],
                references: [
                    { authors: 'ECSA', year: 2019, title: 'Qualification Standard for Bachelor of Science in Engineering (NQF Level 8)', note: 'Defines GA1–GA11 with range statements at multiple achievement levels — the primary accreditation framework this editor targets.' },
                    { authors: 'Washington Accord', year: 2021, title: 'Graduate Attributes and Professional Competencies', note: 'International benchmark for engineering programme accreditation — logic packages encode these attribute requirements as evaluable trees.' },
                    { authors: 'CHE', year: 2013, title: 'A proposal for undergraduate curriculum reform in South Africa', note: 'Defines the higher education accreditation context and credit/NQF requirements that the atLeastTotal operator addresses.' }
                ]
            },
            studentEval: {
                description: 'Evaluates an individual student\'s achievement against all graduate attributes at all levels for a selected accreditation system. Loads the student\'s course results and marks, runs each GA logic package through the recursive evaluator, and produces a full GA achievement profile showing where the student has demonstrated, partially achieved, or not yet achieved each attribute. Identifies specific gaps with actionable recommendations.',
                features: [
                    'Full GA profile: 11 GAs × 3 levels with pass/fail status',
                    'Per-node result drill-down showing exactly which criteria passed or failed',
                    'Gap identification with specific missing courses or marks',
                    'Actionable recommendations (e.g., "Enrol in CEDS401 to satisfy GA3 exit level")',
                    'Portfolio evidence linking — connect results to uploaded artifacts',
                    'Comparison view between students',
                    'Export individual student report to PDF'
                ],
                devPlan: [
                    'Load student course results via DataAdapter',
                    'Load all logic packages for selected accreditation system and programme',
                    'Run LogicPackageEvaluator.evaluateStudent() for each GA × level',
                    'Render GA achievement matrix (GA rows × Level columns) with color coding',
                    'Implement drill-down: click a cell to see per-node evaluation tree',
                    'Add gap analysis panel with recommendations',
                    'Build PDF export with institutional branding'
                ],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'getStudentBioData', 'LogicPackageService'],
                references: [
                    { authors: 'ECSA', year: 2019, title: 'Qualification Standard for BSc Engineering', note: 'Student evaluation checks whether individual students demonstrate all 11 graduate attributes at exit level — the core accreditation requirement.' }
                ]
            },
            cohortReport: {
                description: 'Programme-wide compliance reporting that evaluates all students in a programme against the accreditation system. Produces per-GA pass rates, identifies at-risk students who don\'t satisfy specific GAs, generates gap analysis showing which GAs have the lowest achievement rates, and provides a compliance snapshot for dashboard display. Essential for accreditation visit preparation — shows whether the programme is producing graduates with all required attributes.',
                features: [
                    'Batch evaluation of entire student cohort against all GAs',
                    'Per-GA pass rate table with compliance thresholds',
                    'At-risk student lists per GA with specific missing criteria',
                    'Programme compliance score (percentage of students satisfying all GAs)',
                    'GA-Course coverage matrix derived from logic package structure',
                    'Trend analysis: compliance rate over multiple years',
                    'Exportable compliance report for accreditation body submission',
                    'Drill-down from cohort summary to individual student report'
                ],
                devPlan: [
                    'Load all students in programme for selected year via DataAdapter',
                    'Run LogicPackageEvaluator.evaluateCohort() — batch student evaluation',
                    'Aggregate results: per-GA pass count, fail count, pass rate',
                    'Identify at-risk students per GA — students who fail specific attributes',
                    'Calculate programme compliance score (% students passing all GAs)',
                    'Build GA-Course matrix from logic package structure (which courses appear in which GA packages)',
                    'Render summary dashboard with compliance rings and GA bar chart',
                    'Implement drill-down: click GA row to see failing students, click student to see individual report'
                ],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'getProgrammeRegistrations', 'LogicPackageService'],
                references: [
                    { authors: 'ECSA', year: 2019, title: 'Qualification Standard for BSc Engineering', note: 'Programme accreditation requires demonstrating that a sufficient proportion of graduates achieve all GAs — this report provides that evidence.' },
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor: A case for improving teaching and learning in SA', note: 'South African cohort study context — only 30% of entering students graduate within 5 years, so cohort-level GA analysis must account for attrition.' }
                ]
            },

            // ═══════════════════════════════════════════════════════════
            // Executive Insight
            // ═══════════════════════════════════════════════════════════
            execDash: {
                description: 'Institutional KPI dashboard for deans, HODs, and executive leadership. Shows 12 ISO 21001-aligned metrics across 4 categories (Student Success, Quality Assurance, Teaching & Learning, Research). Supports drill-down from institution to faculty to programme with entity tree navigation. Powered by ExecutiveService microservice with ExecMetrics calculation engine.',
                features: ['12 KPI cards with status badges (success/warning/danger)', 'Entity hierarchy drill-down (institution → faculty → programme)', 'Year selector with 3-year data (2023-2025)', 'ISO 21001 metric category grouping with colour coding', 'Sector benchmark comparison (HEMIS data)', 'Entity summary with student counts', 'Real-time cache-backed calculations'],
                architecture: {
                    service: 'ExecutiveService (ms.executive.js) — Publome subclass with 8 tables',
                    engine: 'ExecMetrics — calculation engine with caching, KPIs, trends, ranking, forecasting',
                    panel: 'ExecutiveInsightPanel → ExecSummaryPanel — control-stage with entity tree + year selector',
                    schema: 'ExecSchema — 8-table schema: entity, metricCategory, metric, metricObservation, intervention, pdsaCycle, sectorBenchmark, note'
                },
                devPlan: [
                    '✅ Define executive schema with 8 tables (ExecSchema)',
                    '✅ Build KPI calculation engine (ExecMetrics)',
                    '✅ Implement drill-down navigation (institution → faculty → programme)',
                    '✅ Create ExecSummaryPanel with KPI cards and category overview',
                    '✅ Create ExecutiveService microservice (Publome subclass)',
                    '✅ Wire into services panel via ExecutiveInsightPanel',
                    '✅ Add year selector and entity tree to control panel'
                ],
                dataSources: ['ExecutiveService.getKPIs()', 'ExecMetrics.getMetricsByCategory()', 'ExecMetrics.getChildrenSummary()'],
                references: [
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'Executive-level cohort data is essential for strategic planning — this dashboard makes institutional performance visible to leadership.' },
                    { authors: 'Macfadyen, L.P. & Dawson, S.', year: 2010, title: 'Mining LMS data to develop an early warning system', note: 'Aggregated analytics enable institution-wide decision-making about resource allocation for student success.' }
                ]
            },
            enrolmentTrends: {
                description: 'Registration count analytics showing enrolment patterns across entities and years. Uses ExecCountsPanel to display student counts per faculty and programme, with year-over-year comparison. Powered by ExecutiveService seed data with 15 entities across 4 faculties.',
                features: ['Student count cards per entity with year-over-year delta', 'Faculty and programme level breakdown', 'Year selector for historical comparison', 'Entity drill-down via shared hierarchy tree', 'Sector benchmark comparison', 'Automatic aggregation from entity student counts'],
                architecture: {
                    service: 'ExecutiveService (ms.executive.js)',
                    engine: 'ExecMetrics.getChildrenSummary()',
                    panel: 'ExecutiveInsightPanel → ExecCountsPanel'
                },
                devPlan: [
                    '✅ Aggregate enrolment data by programme, faculty, year',
                    '✅ Build count cards with entity breakdown',
                    '✅ Add year selector with trend comparison',
                    '✅ Wire entity tree for drill-down navigation',
                    '✅ Create ExecutiveInsightPanel integration layer',
                    '✅ Connect to services panel plate rendering'
                ],
                dataSources: ['ExecutiveService.getChildrenSummary()', 'ExecMetrics.getYears()'],
                references: [
                    { authors: 'DHET', year: 2019, title: 'Statistics on Post-School Education and Training in SA', note: 'DHET enrolment planning framework — the tool aligns with reporting requirements for performance-based funding.' }
                ]
            },
            throughput: {
                description: 'Graduation rate and performance analysis using ExecPerformancePanel. Shows course pass rates, course means, and comparison metrics across entities. Uses ExecMetrics engine for calculations with target and benchmark comparison.',
                features: ['Pass rate and course mean KPIs per entity', 'Target vs benchmark vs actual comparison', 'Status indicators (success/warning/danger)', 'Entity drill-down for programme-level analysis', 'Year-over-year trend data', 'Sector benchmark overlay (HEMIS data)'],
                architecture: {
                    service: 'ExecutiveService (ms.executive.js)',
                    engine: 'ExecMetrics.getKPIs() + compare()',
                    panel: 'ExecutiveInsightPanel → ExecPerformancePanel'
                },
                devPlan: [
                    '✅ Calculate performance metrics per entity per year',
                    '✅ Build performance comparison cards with status badges',
                    '✅ Add target and benchmark reference lines',
                    '✅ Implement entity drill-down navigation',
                    '✅ Wire into services panel via ExecutiveInsightPanel',
                    '✅ Create HEMIS-compatible sector benchmarks'
                ],
                dataSources: ['ExecutiveService.getKPIs()', 'ExecMetrics.compare()'],
                references: [
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'The definitive SA study on throughput — only 30% graduate in 5 years. This tool tracks the metric that matters most for institutional performance.' },
                    { authors: 'CHE', year: 2013, title: 'A proposal for undergraduate curriculum reform in South Africa', note: 'Throughput is the primary metric in the CHE\'s framework for evaluating curriculum effectiveness.' }
                ]
            },
            retentionReport: {
                description: 'Retention and student progression analytics using ExecStudentsPanel. Shows retention rates, at-risk tracking, and student success metrics. Supports drill-down to programme level with year-over-year comparison.',
                features: ['Retention rate KPIs per entity', 'Student progression tracking', 'At-risk population identification', 'Year-over-year retention comparison', 'Entity hierarchy drill-down', 'Intervention impact tracking via PDSA cycles'],
                architecture: {
                    service: 'ExecutiveService (ms.executive.js)',
                    engine: 'ExecMetrics.getKPIs() + getTrend()',
                    panel: 'ExecutiveInsightPanel → ExecStudentsPanel'
                },
                devPlan: [
                    '✅ Calculate retention rate per programme per year',
                    '✅ Build retention dashboard with entity comparison',
                    '✅ Add student progression tracking',
                    '✅ Implement year-over-year trend analysis',
                    '✅ Wire intervention tracking via PDSA cycles',
                    '✅ Connect to services panel plate rendering'
                ],
                dataSources: ['ExecutiveService.getKPIs()', 'ExecMetrics.getTrend()', 'ExecMetrics.getInterventions()'],
                references: [
                    { authors: 'Tinto, V.', year: 2012, title: 'Completing College: Rethinking Institutional Action', note: 'Retention is determined by institutional conditions, not just student characteristics — the report helps institutions identify what they can change.' },
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'First-year attrition is the single largest factor in SA\'s low throughput rates — targeted retention analysis is critical.' }
                ]
            },
            progComparison: {
                description: 'Cross-programme performance benchmarking using ExecHierarchyPanel. Allows executives to compare programmes via the entity hierarchy tree. Shows children summary with all 12 metrics, ranking tables, and distribution analysis.',
                features: ['Entity hierarchy tree with drill-down', 'Children summary table with all metrics', 'Programme ranking by any metric', 'Distribution statistics (min, Q1, median, Q3, max)', 'Breadcrumb navigation through entity levels', 'Side-by-side entity comparison'],
                architecture: {
                    service: 'ExecutiveService (ms.executive.js)',
                    engine: 'ExecMetrics.getRanking() + getChildrenSummary() + getDistribution()',
                    panel: 'ExecutiveInsightPanel → ExecHierarchyPanel'
                },
                devPlan: [
                    '✅ Build entity hierarchy tree with drill-down',
                    '✅ Aggregate metrics per programme for comparison',
                    '✅ Create ranking table with sortable columns',
                    '✅ Add distribution analysis (quartiles)',
                    '✅ Implement breadcrumb navigation',
                    '✅ Wire into services panel via ExecutiveInsightPanel'
                ],
                dataSources: ['ExecutiveService.getRanking()', 'ExecMetrics.getChildrenSummary()', 'ExecMetrics.getDistribution()'],
                references: [
                    { authors: 'DHET', year: 2019, title: 'Statistics on Post-School Education and Training', note: 'Performance-based funding requires programmes to benchmark against peers — this tool provides the comparative data.' }
                ]
            },

            // ═══════════════════════════════════════════════════════════
            // System & Config
            // ═══════════════════════════════════════════════════════════
            userManager: {
                description: 'User account management with CRUD operations, role assignment, and course-level access configuration. Supports bulk user import from CSV, active directory sync, and account lifecycle management (create, activate, deactivate, archive).',
                features: ['User CRUD with profile fields (name, email, staff ID, department)', 'Role assignment from permission templates', 'Course-level access grants', 'Bulk user import from CSV/AD sync', 'Account lifecycle (active, deactivated, archived)', 'Search and filter by name, role, department', 'Password reset and MFA configuration'],
                devPlan: [
                    'Define user management Publome schema (user, userRole, courseAccess tables)',
                    'Build user list with UIBinding filterable table',
                    'Create user form with role multi-select',
                    'Implement course access grant interface',
                    'Add bulk import with CSV template and validation',
                    'Build account lifecycle management controls'
                ],
                dataSources: ['MemberService', 'getRoles', 'getCourseList']
            },
            roles: {
                description: 'Permission template configuration defining what each role can access across AutoScholar subsystems. Each role maps to a set of module/action permissions. Supports custom roles beyond defaults (student, lecturer, tutor, coordinator, counsellor, accreditation officer, executive, admin).',
                features: ['Role definition with name and description', 'Module-level permission matrix (read, create, update, delete)', 'Default role templates (8 standard roles)', 'Custom role creation', 'Role hierarchy and inheritance', 'Permission audit view (who has access to what)', 'Role comparison tool'],
                devPlan: [
                    'Define role Publome schema (role, permission, rolePermission tables)',
                    'Build permission matrix editor (roles × modules × CRUD)',
                    'Create default role templates for 8 standard roles',
                    'Implement custom role creation with permission selection',
                    'Add permission audit report (all users with their effective permissions)',
                    'Build role comparison side-by-side view'
                ],
                dataSources: ['MemberService', 'getRoles', 'getPermissions']
            },
            integrations: {
                description: 'System integration management for connecting AutoScholar with external systems: Student Information System (SIS), Learning Management System (LMS), email/SMS providers, and authentication services. Configure connection credentials, test connections, monitor sync status, and manage API keys.',
                features: ['Integration registry (SIS, LMS, email, SMS, auth)', 'Connection configuration with encrypted credential storage', 'Test connection with diagnostic output', 'Sync schedule configuration (real-time, hourly, daily)', 'Sync status monitoring with error logs', 'Data mapping configuration (field-to-field mapping)', 'API key management for external consumers'],
                devPlan: [
                    'Define integration Publome schema (integration, credential, syncLog tables)',
                    'Build integration registry with connection configuration forms',
                    'Implement connection testing with diagnostic output',
                    'Create sync schedule configuration interface',
                    'Add sync status monitoring dashboard with error logs',
                    'Build field mapping editor for data normalization'
                ],
                dataSources: ['IntegrationService', 'SyncService']
            },
            auditLog: {
                description: 'System-wide audit trail capturing all significant actions: user logins, data modifications, permission changes, report generation, and configuration changes. Searchable and exportable for compliance (POPIA, institutional governance). Includes suspicious activity detection.',
                features: ['Chronological audit event log with filtering', 'Search by user, action type, date range, entity', 'Event categories (auth, data, config, report, access)', 'Suspicious activity detection (bulk data access, after-hours activity)', 'Export to CSV/PDF for compliance reporting', 'Retention policy configuration', 'User activity summary view'],
                devPlan: [
                    'Define audit Publome schema (auditEvent, auditRule tables)',
                    'Build event log viewer with infinite scroll and filtering',
                    'Create search interface with multi-criteria filters',
                    'Add suspicious activity rules and alerts',
                    'Implement export for compliance reporting',
                    'Add user activity summary with login history'
                ],
                dataSources: ['AuditService', 'MemberService'],
                references: [
                    { authors: 'Drachsler, H. & Greller, W.', year: 2016, title: 'Privacy and analytics: DELICATE checklist', note: 'Audit logging is essential for the "Technical" dimension of the DELICATE framework — ensuring data use is traceable and accountable.' },
                    { authors: 'POPIA', year: 2013, title: 'Protection of Personal Information Act, South Africa', note: 'POPIA requires that processing of personal information be auditable — the audit log satisfies this compliance requirement.' }
                ]
            },
            alertConfig: {
                description: 'Configuration interface for at-risk detection alert rules. Define thresholds, conditions, and triggers for the risk analysis engine. Configure per-course or institution-wide rules, set z-score thresholds, attendance minimums, and multi-factor scoring weights.',
                features: ['Rule definition with conditions and thresholds', 'Per-course vs institution-wide rule scope', 'Z-score threshold configuration', 'Attendance minimum thresholds for DP', 'Multi-factor risk weight configuration', 'Rule testing with sample data', 'Rule activation/deactivation with scheduling'],
                devPlan: [
                    'Define alert rule Publome schema (rule, condition, weight tables)',
                    'Build rule editor with condition builder interface',
                    'Implement rule scope selection (course, department, institution)',
                    'Add rule testing tool with sample data simulation',
                    'Create multi-factor weight configuration interface',
                    'Build rule activation scheduler'
                ],
                dataSources: ['RiskService', 'AlertService', 'getCourseList'],
                references: [
                    { authors: 'Hlosta, M. et al.', year: 2017, title: 'Ouroboros: Early identification of at-risk students without models based on legacy data', note: 'The threshold configuration tool enables institutions to calibrate the within-cohort relative risk detection approach.' },
                    { authors: 'Baker, R.S. & Hawn, A.', year: 2022, title: 'Algorithmic bias in education', note: 'Alert rule configuration must be transparent and auditable to prevent systematic bias in risk detection.' }
                ]
            },

            // ═══════════════════════════════════════════════════════════
            // Communication & Tools
            // ═══════════════════════════════════════════════════════════
            messaging: {
                description: 'Student communication system with template-based messaging. Send emails to individual students, risk categories, or custom selections. Supports template variables ({firstName}, {courseCode}, {report.pos}) for personalized mass communication. Includes message history and delivery tracking.',
                features: ['Template library with customizable messages', 'Template variables for personalization', 'Recipient selection (individual, course, risk category, custom)', 'Preview before send with variable substitution', 'Message history and delivery status', 'Bulk send with batching and rate limiting', 'Message scheduling for timed delivery'],
                devPlan: [
                    'Define messaging Publome schema (template, message, delivery tables)',
                    'Build template editor with variable insertion',
                    'Create recipient selector with multiple selection modes',
                    'Implement message preview with live variable substitution',
                    'Build send engine with batching and delivery tracking',
                    'Add message history viewer with status filters',
                    'Connect to institutional email/SMS gateway'
                ],
                dataSources: ['MessagesService', 'getStudentBioData', 'sendEmail'],
                references: [
                    { authors: 'Arnold, K.E. & Pistilli, M.D.', year: 2012, title: 'Course Signals at Purdue', note: 'Timely, personalized communication is a core component of the early warning intervention pipeline.' }
                ]
            },
            browser: {
                description: 'Cross-programme student search and profile viewer. Search by student number, name, programme, or campus. View comprehensive student profiles including biographical data, academic history, assessment results, registration history, at-risk flags, and support case records.',
                features: ['Multi-field search (number, name, programme, campus)', 'Student profile view with biographical data', 'Academic history tab with all course results', 'Assessment results per course', 'Registration history across years', 'At-risk flag history', 'Support case summary (if counsellor role)', 'Data anonymisation toggle (POPIA compliance)'],
                devPlan: [
                    'Build multi-field search form with type-ahead',
                    'Create student profile layout with tabbed sections',
                    'Implement academic history tab from course results',
                    'Add assessment results expandable per course',
                    'Build registration history timeline',
                    'Add at-risk and case sections (role-restricted)',
                    'Implement anonymisation toggle for POPIA compliance'
                ],
                dataSources: ['getStudentBioData', 'getCourseResults', 'getAssessmentResults', 'getProgrammeRegistrations'],
                references: [
                    { authors: 'Drachsler, H. & Greller, W.', year: 2016, title: 'Privacy and analytics: DELICATE checklist', note: 'Student browser must implement the "Anonymise" and "Consent" principles — role-based access and anonymisation toggle are critical.' },
                    { authors: 'POPIA', year: 2013, title: 'Protection of Personal Information Act', note: 'Viewing student personal data requires legitimate purpose and access controls — the browser enforces role-based restrictions.' }
                ]
            },
            timetabling: {
                description: 'Timetable viewing and management tool supporting student, lecturer, and venue schedules. Weekly grid view with conflict detection, room availability matrix, and iCal export. Admin users can create and manage periods, venues, and slot allocations.',
                features: ['Weekly grid view for student/lecturer/venue', 'Daily and monthly view modes', 'Conflict detection and visualization', 'Room availability matrix', 'iCal export for calendar sync', 'Lecturer availability display', 'Period and venue management (admin)', 'Tutorial group assignment'],
                devPlan: [
                    'Define timetable Publome schema (period, venue, slot, group tables)',
                    'Build weekly grid view with color-coded courses',
                    'Add student/lecturer/venue schedule switcher',
                    'Implement conflict detection algorithm',
                    'Create room availability matrix view',
                    'Add iCal export for external calendar sync',
                    'Build admin interface for period/venue management'
                ],
                dataSources: ['TimetableService', 'getCourseList', 'getVenues']
            },
            notifications: {
                description: 'Cross-module notification centre aggregating alerts, reminders, and announcements from all AutoScholar subsystems. Supports in-app toast notifications, email digests, and push notifications. Includes notification preferences and do-not-disturb scheduling.',
                features: ['Unified notification inbox from all modules', 'In-app toast notifications for real-time alerts', 'Email digest configuration (immediate, daily, weekly)', 'Notification categories (alert, reminder, announcement, system)', 'Read/unread status with bulk actions', 'Notification preferences per category', 'Do-not-disturb scheduling'],
                devPlan: [
                    'Define notification Publome schema (notification, preference, digest tables)',
                    'Build notification inbox with category filtering',
                    'Implement toast notification system for real-time alerts',
                    'Create email digest aggregation engine',
                    'Add notification preference management interface',
                    'Build notification API for other modules to publish alerts'
                ],
                dataSources: ['NotificationService', 'MemberService']
            },
            reporting: {
                description: 'Custom report builder enabling power users to create ad-hoc reports from any AutoScholar data. Drag-and-drop field selection, filter configuration, grouping, aggregation, and visualization. Reports can be saved, shared, and scheduled for periodic generation.',
                features: ['Drag-and-drop field selector from available data sources', 'Filter builder with AND/OR condition groups', 'Grouping and aggregation (sum, count, average, min, max)', 'Visualization options (table, chart, pivot table)', 'Report save and share with other users', 'Scheduled report generation (daily, weekly, monthly)', 'Export to CSV, PDF, Excel'],
                devPlan: [
                    'Define report Publome schema (report, field, filter, schedule tables)',
                    'Build field selector with draggable field list from data sources',
                    'Create filter builder with nested condition groups',
                    'Implement grouping and aggregation engine',
                    'Add visualization selector with chart/table/pivot options',
                    'Build report save/share/schedule functionality',
                    'Implement export engine (CSV, PDF, Excel)'
                ],
                dataSources: ['All data sources (dynamic)', 'ReportService']
            },

            // ═══════════════════════════════════════════════════════════
            // Advanced Analytics
            // ═══════════════════════════════════════════════════════════
            aiCoach: {
                description: 'AI-powered academic coaching assistant that provides personalized study recommendations, identifies knowledge gaps, and suggests targeted interventions. Uses student performance data to generate actionable advice. Explainable recommendations (not black-box) aligned with self-regulated learning theory.',
                features: ['Personalized study recommendations based on performance data', 'Knowledge gap identification from assessment patterns', 'Study strategy suggestions (spaced repetition, practice testing)', 'Goal-setting assistant with SMART goal templates', 'Weekly academic health check-in', 'Resource recommendations (textbook sections, practice materials)', 'Explainable reasoning (why this recommendation)'],
                devPlan: [
                    'Define coaching Publome schema (recommendation, gap, strategy tables)',
                    'Build recommendation engine from assessment performance patterns',
                    'Create knowledge gap identification from per-topic assessment data',
                    'Implement study strategy library with evidence-based methods',
                    'Add goal-setting assistant with SMART goal validation',
                    'Build weekly check-in interface with coaching summary',
                    'Ensure all recommendations include explainable reasoning'
                ],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'DiaryService'],
                references: [
                    { authors: 'Zawacki-Richter, O. et al.', year: 2019, title: 'Systematic review of research on AI applications in higher education', note: 'Comprehensive survey showing AI tutoring systems improve outcomes when providing personalized, explainable guidance.' },
                    { authors: 'Zimmerman, B.J.', year: 2002, title: 'Becoming a self-regulated learner: An overview', note: 'The AI coach operationalizes SRL theory — helping students develop metacognitive strategies through guided reflection.' },
                    { authors: 'Baker, R.S. & Hawn, A.', year: 2022, title: 'Algorithmic bias in education', note: 'AI recommendations must be auditable and equitable — explainability is not optional in educational AI systems.' }
                ]
            },
            successPredictor: {
                description: 'Machine learning-based student outcome prediction model. Uses historical data (prior results, demographics, engagement metrics) to predict pass/fail probability for current courses. Outputs probability scores with confidence intervals and feature importance rankings. Model is validated against historical data before deployment.',
                features: ['Pass/fail probability prediction per student per course', 'Confidence interval and prediction quality indicators', 'Feature importance ranking (what drives the prediction)', 'Model performance dashboard (accuracy, AUC, calibration)', 'Historical validation report', 'Demographic fairness audit', 'Configurable model selection (logistic regression, gradient boosting)'],
                devPlan: [
                    'Collect and prepare historical training dataset from API data',
                    'Implement feature engineering pipeline (prior GPA, attendance, demographics)',
                    'Build model training with logistic regression baseline',
                    'Add model validation with holdout testing and cross-validation',
                    'Create prediction dashboard with probability scores and confidence',
                    'Implement feature importance visualization',
                    'Add demographic fairness audit with bias detection',
                    'Build model comparison framework for algorithm selection'
                ],
                dataSources: ['getCourseResults', 'getAssessmentResults', 'getStudentBioData', 'getAttendanceRecords'],
                references: [
                    { authors: 'Jayaprakash, S.M. et al.', year: 2014, title: 'Open Academic Analytics Initiative', note: 'Open-source prediction models for student success — the OAAI approach to transparent, reproducible prediction.' },
                    { authors: 'Baker, R.S. & Hawn, A.', year: 2022, title: 'Algorithmic bias in education', note: 'Critical review of how prediction models can perpetuate demographic biases — fairness auditing is essential.' },
                    { authors: 'Hlosta, M. et al.', year: 2017, title: 'Ouroboros: Early identification without legacy data', note: 'The success predictor supplements z-score detection with ML when sufficient historical data is available.' },
                    { authors: 'Romero, C. & Ventura, S.', year: 2020, title: 'Educational data mining and learning analytics: An updated survey', note: 'Contextualizes prediction methods within the broader EDM/LA landscape.' }
                ]
            },
            learningAnalytics: {
                description: 'LMS engagement analysis combining learning management system data (page views, forum posts, resource access, submission timing) with academic performance. Identifies behavioral patterns that correlate with success and risk. Requires LMS integration (Canvas, Moodle, Blackboard) via LTI 1.3 or REST API.',
                features: ['LMS activity dashboard (login frequency, page views, time-on-task)', 'Engagement score calculation from multi-signal data', 'Behavioral pattern clustering (engaged, surface, disengaged)', 'Early warning based on engagement drop-off', 'Correlation between engagement metrics and grades', 'Forum and discussion participation analysis', 'Comparative analytics (student vs class average)'],
                devPlan: [
                    'Implement LMS integration via LTI 1.3 / REST API',
                    'Define learning activity Publome schema (event, session, engagement tables)',
                    'Build engagement score calculation from weighted activity signals',
                    'Create behavioral pattern clustering algorithm',
                    'Add engagement trend visualization with drop-off detection',
                    'Build correlation dashboard showing engagement vs performance',
                    'Implement early warning trigger from engagement decline'
                ],
                dataSources: ['LMS API (Canvas/Moodle)', 'getCourseResults', 'xAPI events'],
                references: [
                    { authors: 'Macfadyen, L.P. & Dawson, S.', year: 2010, title: 'Mining LMS data to develop an early warning system', note: 'Demonstrated that LMS interaction data predicts ~70% of final grade variance — the foundational study for this tool.' },
                    { authors: 'Romero, C. & Ventura, S.', year: 2020, title: 'Educational data mining and learning analytics survey', note: 'Comprehensive overview of engagement analytics techniques and their effectiveness in predicting student outcomes.' },
                    { authors: 'xAPI Specification (IEEE 9274.1.1)', year: 2023, title: 'Experience API for learning events', note: 'Standard format for capturing and exchanging learning events from LMS and other systems.' }
                ]
            },
            wellness: {
                description: 'Student wellbeing monitoring combining self-reported check-ins with behavioral proxy indicators (attendance drops, grade declines, disengagement patterns). Generates wellbeing risk signals that can trigger support service outreach. Designed with privacy-first principles — student consent required for all data collection.',
                features: ['Voluntary wellbeing check-in with validated scales', 'Behavioral proxy indicators (attendance, grade, engagement trends)', 'Wellbeing risk signal generation for support teams', 'Resource recommendations (counselling, health services, peer support)', 'Population-level wellbeing dashboard (anonymized)', 'Consent management and opt-out controls', 'Integration with case management for support coordination'],
                devPlan: [
                    'Design wellbeing check-in using validated instruments (PHQ-2, GAD-2, WHO-5)',
                    'Build voluntary check-in interface with consent management',
                    'Implement behavioral proxy calculation from existing data',
                    'Create wellbeing risk signal engine combining check-in and proxy data',
                    'Add resource recommendation system linking to support services',
                    'Build anonymized population-level dashboard for institutional awareness',
                    'Ensure POPIA-compliant consent and opt-out mechanisms'
                ],
                dataSources: ['DiaryService', 'getCourseResults', 'getAttendanceRecords'],
                references: [
                    { authors: 'Eisenberg, D. et al.', year: 2009, title: 'Mental health and academic success in college', note: 'Strong evidence linking mental health to academic outcomes — wellbeing monitoring can identify students needing support before academic crisis.' },
                    { authors: 'Stallman, H.M.', year: 2010, title: 'Psychological distress in university students', note: 'Prevalence of distress in university populations is significantly higher than general population — systematic monitoring is warranted.' },
                    { authors: 'Slade, S. & Prinsloo, P.', year: 2013, title: 'Learning analytics: Ethical issues and dilemmas', note: 'Wellbeing analytics must be ethical — student agency, consent, and privacy are paramount. The tool must empower, not surveil.' },
                    { authors: 'Drachsler, H. & Greller, W.', year: 2016, title: 'DELICATE checklist for ethical LA', note: 'All 8 DELICATE principles apply to wellbeing monitoring — especially Consent, Involve, and Anonymise.' }
                ]
            },
            integrity: {
                description: 'Academic integrity monitoring that identifies patterns of potential academic misconduct: unusual grade jumps, submission timing anomalies, similarity clustering across students, and repeat offender tracking. Designed as a detection aid for academic integrity officers, not an automated judgment system.',
                features: ['Unusual grade jump detection (z-score deviation between assessments)', 'Submission timing anomaly detection', 'Similarity clustering across student submissions', 'Repeat offender tracking and case history', 'Academic integrity case workflow (investigation, hearing, outcome)', 'Policy violation categorization', 'Population-level integrity analytics (trends, hotspots)'],
                devPlan: [
                    'Define integrity Publome schema (case, evidence, hearing, outcome tables)',
                    'Build anomaly detection from grade patterns and timing data',
                    'Implement similarity analysis for submission clustering',
                    'Create integrity case workflow with investigation stages',
                    'Add repeat offender tracking across courses and years',
                    'Build population-level integrity dashboard for institutional trends',
                    'Ensure due process protections in workflow design'
                ],
                dataSources: ['getAssessmentResults', 'getCourseResults', 'SubmissionService'],
                references: [
                    { authors: 'McCabe, D.L., Butterfield, K.D. & Trevino, L.K.', year: 2012, title: 'Cheating in College: Why Students Do It and What Educators Can Do about It', note: 'Comprehensive study on academic integrity — detection must be paired with education and fair processes.' },
                    { authors: 'Baker, R.S. & Hawn, A.', year: 2022, title: 'Algorithmic bias in education', note: 'Automated detection must not disproportionately target demographic groups — fairness auditing is essential for integrity systems.' }
                ]
            },
            financialAid: {
                description: 'Financial aid and bursary tracking for students and financial aid officers. Tracks NSFAS status, institutional bursaries, external scholarships, and funding-related academic requirements (minimum pass rate, credit load). Identifies students whose academic performance threatens continued funding.',
                features: ['NSFAS status tracking and N+2 rule monitoring', 'Institutional bursary management (application, award, renewal)', 'External scholarship tracking', 'Academic requirement monitoring for funding continuation', 'At-risk-of-losing-funding alerts', 'Funding application workflow for students', 'Financial aid analytics (disbursement, impact on retention)'],
                devPlan: [
                    'Define financial aid Publome schema (funding, application, requirement, disbursement tables)',
                    'Build funding status dashboard for students',
                    'Implement NSFAS N+2 rule monitoring engine',
                    'Create academic requirement checker against funding conditions',
                    'Add funding-at-risk alert system',
                    'Build application workflow for institutional bursaries',
                    'Create analytics dashboard for financial aid officers'
                ],
                dataSources: ['FinancialAidService', 'getCourseResults', 'getProgrammeRegistrations'],
                references: [
                    { authors: 'NSFAS', year: 2023, title: 'NSFAS Policy on Funding Eligibility', note: 'NSFAS N+2 rule and academic progress requirements — the tool monitors compliance to prevent funding loss.' },
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'Financial barriers are a major contributor to dropout in SA — proactive funding monitoring can prevent avoidable attrition.' }
                ]
            },

            // ═══════════════════════════════════════════════════════════
            // Casework Counsellor
            // ═══════════════════════════════════════════════════════════
            caseManager: {
                description: 'Unified counsellor workstation providing case management, at-risk triage, intervention tracking, referral coordination, appointment scheduling, and caseload analytics in a single compound panel. Built as a CaseworkCounsellorPanel class with 6 tabbed views and 8 modal dialogs, following the StudentCentralPanel compound pattern. Counsellors manage their full workflow without switching between separate tools.',
                features: [
                    'Kanban board with 4 status columns (Open → In Progress → Pending Review → Resolved)',
                    'At-risk queue sorted by severity with Accept/Defer/Dismiss triage actions',
                    'Intervention timeline with reverse-chronological entries and type filtering',
                    'Referral tracking table with status badges (Pending, Attended, No-Show, Ongoing)',
                    'Appointment schedule with today view + upcoming list + no-show follow-up alerts',
                    'Caseload analytics with KPI cards, category distribution, outcome breakdown, counsellor workload',
                    '8 modals: New Case, Case Detail, Log Intervention, New Referral, Schedule Appointment, Email Student, Student Profile, Triage Action',
                    'Student lookup in control panel with instant search across all known students',
                    'Quick stats sidebar: open cases, pending review, resolved this month, at-risk queue count'
                ],
                devPlan: [
                    'Review existing AutoScholarCounsellor class (BlUi-based) for feature coverage and data patterns',
                    'Design compound panel architecture with shared state (selected student, active case)',
                    'Build CaseworkCounsellorPanel class with render(controlEl, stageEl) API',
                    'Implement control panel: counsellor identity, student lookup, quick stats, view navigation',
                    'Build Cases view with Kanban board — 4 columns, draggable cards with case metadata',
                    'Build At-Risk Queue view with severity-sorted cards and triage action buttons',
                    'Build Interventions view as timeline with type icons, outcome badges, and filter chips',
                    'Build Referrals view as DataTable with status badges and service directory',
                    'Build Appointments view with today/upcoming sections and no-show alerts',
                    'Build Analytics view with KPI cards, category chart, outcome breakdown, counsellor workload',
                    'Create 8 modal dialogs using uiModal + uiForm for all CRUD actions',
                    'Populate rich sample data reflecting SA higher education context (DUT)',
                    'Map all 6 casework service keys to unified panel with auto-navigation to correct view',
                    'Integrate into AutoScholarServicesPanel if-chain with built: true flags',
                    'Syntax check, structural verification, screenshot validation'
                ],
                dataSources: ['CaseService', 'getCourseResults', 'getStudentBioData', 'MessagesService', 'EventService'],
                references: [
                    { authors: 'Tinto, V.', year: 2012, title: 'Completing College: Rethinking Institutional Action', note: 'Student support workflows directly impact retention — coordinated case management ensures no student falls through the cracks.' },
                    { authors: 'Kuh, G.D. et al.', year: 2010, title: 'Student Success in College', note: 'Conditions that matter for student success include advising, early warning, and coordinated support — this panel integrates all three.' },
                    { authors: 'Drake, J.K.', year: 2011, title: 'The role of academic advising in student retention and persistence', note: 'Academic advising as intervention — case management formalizes the advising relationship with tracking and accountability.' },
                    { authors: 'Scott, I., Yeld, N. & Hendry, J.', year: 2007, title: 'Higher Education Monitor', note: 'SA context: 30% graduation rate demands systematic support coordination. Ad-hoc interventions are insufficient at scale.' }
                ]
            },
            interventionLog: {
                description: 'Intervention tracking within the unified Casework Counsellor workstation. Records all counsellor-student interactions as a reverse-chronological timeline with type icons, outcome badges, and notes. Supports filtering by intervention type (Meeting, Email, Phone Call, Referral, Workshop, Peer Tutoring) and outcome (Improved, Unchanged, Declined, Pending). Linked to active cases when applicable.',
                features: ['Reverse-chronological timeline with type-coded dot indicators', 'Filter chips by intervention type and outcome', 'Log Intervention modal with case linking', 'Outcome tracking (Improved, Unchanged, Declined, Pending)', 'Notes and follow-up action recording', 'Integration with case detail view'],
                devPlan: [
                    'Access via Cases Counsellor → Interventions view tab',
                    'Timeline layout with colour-coded type dots and intervention cards',
                    'Filter chip bar for type and outcome filtering',
                    'Log Intervention modal with student selector, type, outcome, notes, and optional case link',
                    'Connect to case detail modal for cross-referencing'
                ],
                dataSources: ['InterventionService', 'CaseService']
            },
            atRiskQueue: {
                description: 'At-risk student triage queue within the unified Casework Counsellor workstation. Displays flagged students sorted by severity (Critical > High > Medium) with risk scores, risk factors as badges, and programme context. Three triage actions per student: Accept (creates a new case pre-filled with student and risk data), Defer (delays action), Dismiss (removes from queue). Includes queue statistics bar showing counts per severity level.',
                features: ['Severity-sorted student cards with risk score and factors', 'Accept → opens Triage modal pre-filled with student data → creates case', 'Defer and Dismiss quick actions', 'Risk factor badges (failing modules, low attendance, financial hold, etc.)', 'Queue stats bar showing Critical/High/Medium counts', 'Student avatar and programme context on each card'],
                devPlan: [
                    'Access via Cases Counsellor → At-Risk Queue view tab',
                    'Sort students by severity level (Critical first)',
                    'Cards with left border coloured by severity, avatar, badges',
                    'Triage modal pre-fills case creation form from risk data',
                    'Connect to risk analysis output for live flag population'
                ],
                dataSources: ['RiskAnalysis', 'getCourseResults', 'getStudentBioData']
            },
            referralTracker: {
                description: 'Referral management within the unified Casework Counsellor workstation. Tracks student referrals to external support services (Counselling Centre, Financial Aid Office, Health Services, Writing Centre, Disability Unit, Career Services, Student Housing, Legal Aid). Displays referrals in a table with status badges (Pending → Attended / No-Show / Ongoing). New Referral modal provides a service directory for quick selection.',
                features: ['Referral table with student, service, date, reason, status columns', 'Status badges: Pending (yellow), Attended (green), No-Show (red), Ongoing (blue)', 'New Referral modal with service directory dropdown', 'Referral history per student accessible from case detail', 'Service utilisation tracking'],
                devPlan: [
                    'Access via Cases Counsellor → Referrals view tab',
                    'Table rendering via uiTable with status badges',
                    'New Referral modal with student selector and service directory',
                    'Link referrals to active cases where applicable',
                    'Track referral outcomes for service effectiveness analysis'
                ],
                dataSources: ['ReferralService', 'CaseService']
            },
            appointments: {
                description: 'Appointment scheduling and management within the unified Casework Counsellor workstation. Displays today\'s schedule and upcoming appointments with time, student name, type, location, and status. Supports scheduling new appointments via modal with date, time slot, type, and location selection. No-show detection with follow-up alert banner.',
                features: ['Today\'s schedule with time-block cards', 'Upcoming appointments list by day', 'Schedule Appointment modal with time slot picker', 'Status tracking: Confirmed, Pending, No-Show, Completed', 'No-show follow-up alert banner', 'Location options: office rooms, MS Teams, Google Meet'],
                devPlan: [
                    'Access via Cases Counsellor → Appointments view tab',
                    'Today section with time-ordered appointment cards',
                    'Upcoming section grouped by day',
                    'Schedule modal with date, time slot, type, and location fields',
                    'No-show alert banner with count and follow-up prompt',
                    'Connect to EventService for calendar integration'
                ],
                dataSources: ['EventService', 'CaseService']
            },
            caseloadReport: {
                description: 'Caseload analytics dashboard within the unified Casework Counsellor workstation. Provides KPI cards (total active cases, resolution rate, average days to resolve, caseload per counsellor), case distribution by category as horizontal bar charts, outcome breakdown by status, and counsellor workload comparison grid. Designed for both individual counsellors and team leads monitoring workload distribution.',
                features: ['KPI cards: active cases, resolution rate, avg resolve time, load per counsellor', 'Case distribution by category with bar chart visualization', 'Outcome breakdown: status counts with colour-coded chips', 'Counsellor workload grid with avatar cards and active case counts', 'Period selector for time-bounded analytics'],
                devPlan: [
                    'Access via Cases Counsellor → Analytics view tab',
                    'KPI computation from live case data',
                    'Category distribution using styled bar charts',
                    'Status breakdown with colour-coded outcome chips',
                    'Counsellor workload grid comparing caseloads across team',
                    'Add period selector for semester/year filtering'
                ],
                dataSources: ['CaseService', 'InterventionService', 'ReferralService']
            }
        };
    }

    // ── Stub Controls ───────────────────────────────────────────────────────

    _renderPlateControl(key, svc, container) {
        const stubs = this._controlStubs();
        const stub = stubs[key];
        if (!stub) return;

        stub.forEach(item => {
            if (item.type === 'select') {
                this._createSelectField(item, container);
            } else if (item.type === 'input') {
                new uiInput({ template: 'inline-label', label: item.label, placeholder: item.placeholder || '', size: 'sm', parent: container });
            } else if (item.type === 'button') {
                const wrap = document.createElement('div');
                wrap.style.marginTop = '0.5rem';
                container.appendChild(wrap);
                new uiButton({ label: item.label, variant: item.variant || 'primary', size: 'sm', parent: wrap });
            }
        });
    }

    _createSelectField(item, container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-input-wrapper';
        wrapper.style.marginBottom = '0.5rem';
        container.appendChild(wrapper);

        const label = document.createElement('label');
        label.className = 'as-sp-field-label';
        label.textContent = item.label;
        wrapper.appendChild(label);

        const select = document.createElement('select');
        select.className = 'ui-input';
        select.classList.add('as-sp-field-select');
        item.options.forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            select.appendChild(option);
        });
        wrapper.appendChild(select);
    }

    _controlStubs() {
        const courseSelect = { type: 'select', label: 'Course', options: ['-- Select --', 'COMP101', 'MATH201', 'ENG102'] };
        const yearOpts = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));
        const yearSelect = { type: 'select', label: 'Year', options: yearOpts };
        const progSelect = { type: 'select', label: 'Programme', options: ['-- All --', 'ND: IT', 'ND: Civil', 'BTech: IT'] };
        const facSelect = { type: 'select', label: 'Faculty', options: ['-- Select --', 'Engineering', 'Applied Sciences', 'Management'] };
        const deptSelect = { type: 'select', label: 'Department', options: ['-- All --', 'IT', 'Civil', 'Electrical'] };

        return {
            // ClassView Connect
            risk:           [courseSelect, yearSelect, { type: 'select', label: 'Risk Level', options: ['All', 'High', 'Medium', 'Low'] }, { type: 'button', label: 'Analyze' }],
            roster:         [courseSelect, { type: 'select', label: 'Semester', options: ['S1', 'S2', 'Year'] }, { type: 'input', label: 'Search', placeholder: 'Student name or ID' }, { type: 'button', label: 'Load Roster' }],
            gradebook:      [courseSelect, { type: 'select', label: 'Assessment', options: ['All', 'Test 1', 'Test 2', 'Assignment 1', 'Exam'] }, { type: 'button', label: 'Load Grades' }],
            attendance:     [courseSelect, { type: 'select', label: 'Period', options: ['This Week', 'This Month', 'Semester'] }, { type: 'select', label: 'DP Status', options: ['All', 'At Risk', 'Excluded'] }, { type: 'button', label: 'Load Attendance' }],
            historical:     [courseSelect, { type: 'select', label: 'From', options: yearOpts.slice().reverse() }, { type: 'select', label: 'To', options: yearOpts.slice(0, 5) }, { type: 'button', label: 'Generate Trends' }],
            peerCorr:       [courseSelect, yearSelect, { type: 'button', label: 'Load Peer Data' }],
            classAnalytics: [courseSelect, yearSelect, { type: 'button', label: 'Load Dashboard' }],
            pollManager:    [courseSelect, { type: 'select', label: 'Poll Type', options: ['MCQ', 'Likert', 'Open-Ended', 'Word Cloud'] }, { type: 'button', label: 'Create Poll' }],

            // Student Central
            studentDash:    [yearSelect, { type: 'select', label: 'Semester', options: ['Current', 'S1', 'S2'] }, { type: 'button', label: 'Load Dashboard' }],
            myResults:      [yearSelect, { type: 'select', label: 'View', options: ['All Courses', 'Current Semester', 'By Programme'] }, { type: 'button', label: 'Load Results' }],
            progressTracker:[progSelect, { type: 'button', label: 'Load Progress' }],
            cumLaude:       [progSelect, { type: 'input', label: 'Target GPA', placeholder: 'e.g. 75' }, { type: 'button', label: 'Calculate' }],
            portfolio:      [{ type: 'select', label: 'GA Category', options: ['-- All --', 'Problem Solving', 'Design', 'Communication', 'Ethics'] }, { type: 'button', label: 'Load Portfolio' }],
            careerHub:      [{ type: 'select', label: 'Section', options: ['Profile', 'Skills', 'Experience', 'Bursaries', 'Jobs'] }, { type: 'button', label: 'Open Section' }],
            diary:          [{ type: 'select', label: 'View', options: ['This Week', 'Goals', 'Entries', 'Check-Ins'] }, { type: 'button', label: 'Load Diary' }],
            achievements:   [{ type: 'select', label: 'View', options: ['My Badges', 'Leaderboard', 'Challenges', 'Streaks'] }, { type: 'button', label: 'Load Achievements' }],

            // Programme Analyst
            progOverview:    [progSelect, yearSelect, { type: 'button', label: 'Load Overview' }],
            cohortTracker:   [progSelect, { type: 'select', label: 'Entry Year', options: yearOpts.slice(1) }, { type: 'button', label: 'Track Cohort' }],
            progressionMap:  [progSelect, { type: 'button', label: 'Load Map' }],
            gatekeeper:      [facSelect, deptSelect, yearSelect, { type: 'button', label: 'Detect Gatekeepers' }],
            curriculumEditor:[progSelect, { type: 'select', label: 'Variant', options: ['Mainstream', 'Extended'] }, { type: 'button', label: 'Load Curriculum' }],
            outcomeMapping:  [progSelect, { type: 'select', label: 'Accred. Body', options: ['-- Select --', 'ECSA', 'HPCSA', 'SAQA'] }, { type: 'button', label: 'Load Matrix' }],
            cohortCompare:   [progSelect, { type: 'select', label: 'Cohort A', options: yearOpts.slice(1, 6) }, { type: 'select', label: 'Cohort B', options: yearOpts.slice(2, 7) }, { type: 'button', label: 'Compare' }],

            // Casework Counsellor
            caseManager:     [{ type: 'select', label: 'Status', options: ['All', 'Open', 'In Progress', 'Resolved'] }, { type: 'select', label: 'Category', options: ['All', 'Academic', 'Personal', 'Financial'] }, { type: 'input', label: 'Search', placeholder: 'Student name or ID' }, { type: 'button', label: 'Load Cases' }],
            interventionLog: [{ type: 'select', label: 'Type', options: ['All', 'Meeting', 'Email', 'Referral', 'Workshop'] }, { type: 'select', label: 'Outcome', options: ['All', 'Improved', 'Unchanged', 'Declined'] }, { type: 'button', label: 'Load Interventions' }],
            atRiskQueue:     [{ type: 'select', label: 'Severity', options: ['All', 'Critical', 'High', 'Medium'] }, { type: 'select', label: 'Status', options: ['Unactioned', 'Accepted', 'Deferred'] }, { type: 'button', label: 'Load Queue' }],
            referralTracker: [{ type: 'select', label: 'Service', options: ['All', 'Counselling', 'Financial Aid', 'Health', 'Writing Centre'] }, { type: 'select', label: 'Status', options: ['All', 'Pending', 'Attended', 'No-Show'] }, { type: 'button', label: 'Load Referrals' }],
            appointments:    [{ type: 'select', label: 'View', options: ['My Calendar', 'Available Slots', 'Upcoming'] }, { type: 'button', label: 'Load Calendar' }],
            caseloadReport:  [{ type: 'select', label: 'Period', options: ['This Semester', 'Last Semester', 'This Year'] }, { type: 'select', label: 'Counsellor', options: ['All', 'My Cases'] }, { type: 'button', label: 'Generate Report' }],

            // Accreditation AutoMate
            accredDash:      [{ type: 'select', label: 'Accred. Body', options: ['-- All --', 'ECSA', 'HPCSA', 'SAQA'] }, progSelect, { type: 'button', label: 'Load Dashboard' }],
            gaMatrix:        [progSelect, { type: 'select', label: 'Accred. Body', options: ['ECSA', 'HPCSA', 'SAQA'] }, { type: 'button', label: 'Load Matrix' }],
            portfolioReview: [{ type: 'select', label: 'Queue', options: ['Pending Review', 'Approved', 'Rejected'] }, progSelect, { type: 'button', label: 'Load Queue' }],
            evidenceLibrary: [{ type: 'select', label: 'Type', options: ['All', 'Assessment', 'Rubric', 'Student Work', 'External Report'] }, { type: 'input', label: 'Search', placeholder: 'Search evidence...' }, { type: 'button', label: 'Search' }],
            complianceReport:[progSelect, { type: 'select', label: 'Accred. Body', options: ['ECSA', 'HPCSA', 'SAQA'] }, { type: 'button', label: 'Generate Report' }],
            logicEditor:     [{ type: 'select', label: 'Accred. System', options: ['ECSA', 'CHE', 'HEQSF'] }, { type: 'select', label: 'Grad. Attribute', options: ['GA1', 'GA2', 'GA3', 'GA4', 'GA5', 'GA6', 'GA7', 'GA8', 'GA9', 'GA10', 'GA11'] }, { type: 'select', label: 'Level', options: ['Emerging', 'Developed', 'Exit Level'] }, { type: 'button', label: 'Load Package' }],
            studentEval:     [progSelect, { type: 'input', label: 'Student #', placeholder: 'e.g. 22345678' }, { type: 'select', label: 'Accred. System', options: ['ECSA', 'CHE', 'HEQSF'] }, { type: 'button', label: 'Evaluate' }],
            cohortReport:    [progSelect, yearSelect, { type: 'select', label: 'Accred. System', options: ['ECSA', 'CHE', 'HEQSF'] }, { type: 'button', label: 'Generate Report' }],

            // Executive Insight
            execDash:        [facSelect, yearSelect, { type: 'button', label: 'Load Dashboard' }],
            enrolmentTrends: [facSelect, { type: 'select', label: 'From', options: yearOpts.slice().reverse() }, { type: 'select', label: 'To', options: yearOpts.slice(0, 5) }, { type: 'button', label: 'Load Trends' }],
            throughput:      [progSelect, { type: 'select', label: 'Entry Cohort', options: yearOpts.slice(1) }, { type: 'button', label: 'Analyze Throughput' }],
            retentionReport: [facSelect, { type: 'select', label: 'Cohort', options: yearOpts.slice(0, 5) }, { type: 'button', label: 'Load Retention' }],
            progComparison:  [facSelect, { type: 'select', label: 'Metric', options: ['Pass Rate', 'Throughput', 'DFW Rate', 'Retention'] }, { type: 'button', label: 'Compare' }],

            // System & Config
            userManager:     [{ type: 'select', label: 'Role', options: ['-- All --', 'Lecturer', 'Coordinator', 'Counsellor', 'Admin'] }, { type: 'input', label: 'Search', placeholder: 'Name or staff ID' }, { type: 'button', label: 'Load Users' }],
            roles:           [{ type: 'select', label: 'Role', options: ['-- All --', 'Lecturer', 'HoD', 'Admin', 'Executive'] }, { type: 'input', label: 'Staff ID', placeholder: 'e.g. STF001' }, { type: 'button', label: 'Load Roles' }],
            integrations:    [{ type: 'select', label: 'System', options: ['-- All --', 'SIS', 'LMS', 'Email', 'SMS', 'Auth'] }, { type: 'button', label: 'Load Integrations' }],
            auditLog:        [{ type: 'select', label: 'Category', options: ['All', 'Auth', 'Data', 'Config', 'Report'] }, { type: 'select', label: 'Period', options: ['Today', 'This Week', 'This Month'] }, { type: 'input', label: 'User', placeholder: 'Filter by user' }, { type: 'button', label: 'Search' }],
            alertConfig:     [{ type: 'select', label: 'Scope', options: ['Institution', 'Department', 'Course'] }, { type: 'button', label: 'Load Rules' }],

            // Communication & Tools
            messaging:       [{ type: 'select', label: 'Template', options: ['-- Select --', 'At-Risk Warning', 'DP Exclusion', 'Encouragement', 'Custom'] }, { type: 'select', label: 'Recipients', options: ['Selected Students', 'Course Roster', 'At-Risk Only'] }, { type: 'button', label: 'Preview' }, { type: 'button', label: 'Send', variant: 'primary' }],
            browser:         [{ type: 'input', label: 'Student ID', placeholder: 'e.g. 22001234' }, { type: 'input', label: 'Name', placeholder: 'Surname or first name' }, progSelect, { type: 'button', label: 'Search' }],
            timetabling:     [{ type: 'select', label: 'View', options: ['My Schedule', 'Venue', 'Lecturer'] }, { type: 'select', label: 'Week', options: ['This Week', 'Next Week', 'Select Date'] }, { type: 'button', label: 'Load Timetable' }],
            notifications:   [{ type: 'select', label: 'Category', options: ['All', 'Alerts', 'Reminders', 'Announcements'] }, { type: 'select', label: 'Status', options: ['Unread', 'All'] }, { type: 'button', label: 'Load Notifications' }],
            reporting:       [{ type: 'select', label: 'Data Source', options: ['Students', 'Courses', 'Results', 'Attendance', 'Cases'] }, { type: 'select', label: 'Output', options: ['Table', 'Chart', 'Pivot'] }, { type: 'button', label: 'Build Report' }],

            // Advanced Analytics
            aiCoach:          [courseSelect, { type: 'select', label: 'Focus', options: ['Study Plan', 'Knowledge Gaps', 'Strategies'] }, { type: 'button', label: 'Get Recommendations' }],
            successPredictor: [courseSelect, yearSelect, { type: 'select', label: 'Model', options: ['Logistic Regression', 'Gradient Boosting'] }, { type: 'button', label: 'Run Prediction' }],
            learningAnalytics:[courseSelect, { type: 'select', label: 'Metric', options: ['Login Freq', 'Time on Task', 'Forum Posts', 'Resource Access'] }, { type: 'button', label: 'Load Analytics' }],
            wellness:         [{ type: 'select', label: 'View', options: ['Check-In', 'My Wellness', 'Resources'] }, { type: 'button', label: 'Load' }],
            integrity:        [courseSelect, { type: 'select', label: 'Detection', options: ['Grade Anomalies', 'Timing Patterns', 'Similarity'] }, { type: 'button', label: 'Run Analysis' }],
            financialAid:     [{ type: 'select', label: 'Funding', options: ['All', 'NSFAS', 'Institutional', 'External'] }, { type: 'select', label: 'Status', options: ['Active', 'At Risk', 'Expired'] }, { type: 'button', label: 'Load Funding' }]
        };
    }

    // ── Stub Stage Content ──────────────────────────────────────────────────

    _renderPlateStage(key, svc, container) {
        container.style.padding = '1rem';

        const stageContent = this._stageStubs();
        const stub = stageContent[key];
        if (!stub) return;

        if (stub.alert) {
            new uiAlert({
                color: stub.alert.color || 'info',
                title: stub.alert.title,
                message: stub.alert.message,
                parent: container
            });
        }

        if (stub.table) {
            const tableWrap = document.createElement('div');
            tableWrap.style.marginTop = '0.75rem';
            container.appendChild(tableWrap);

            new uiTable({
                size: 'sm',
                columns: stub.table.columns,
                data: stub.table.data,
                parent: tableWrap
            });
        }

        if (stub.badges) {
            const badgeRow = document.createElement('div');
            badgeRow.className = 'as-sp-badge-row';
            container.appendChild(badgeRow);
            stub.badges.forEach(b => {
                new uiBadge({ label: b.label, color: b.color, size: 'sm', parent: badgeRow });
            });
        }
    }

    _stageStubs() {
        return {
            // ── ClassView Connect ──
            risk:           { alert: { title: 'Student Risk Analysis', message: 'Select a course and click Analyze to view at-risk students.', color: 'warning' }, badges: [{ label: 'High Risk: 12', color: 'red' }, { label: 'Medium: 28', color: 'orange' }, { label: 'Low: 85', color: 'green' }], table: { columns: [{ key: 'id', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'risk', label: 'Risk Level' }, { key: 'mark', label: 'Current %' }], data: [{ id: '22001001', name: 'J. Nkosi', risk: 'High', mark: '32%' }, { id: '22001045', name: 'S. Pillay', risk: 'High', mark: '38%' }, { id: '22001102', name: 'T. Molefe', risk: 'Medium', mark: '47%' }] } },
            roster:         { alert: { title: 'Class Roster', message: 'Select a course to browse enrolled students with traffic-light status.' }, table: { columns: [{ key: 'id', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'programme', label: 'Programme' }, { key: 'mark', label: 'Mark' }, { key: 'status', label: 'Status' }], data: [{ id: '22001001', name: 'J. Nkosi', programme: 'ND: IT', mark: '62%', status: 'Average' }, { id: '22001002', name: 'A. Dlamini', programme: 'ND: IT', mark: '75%', status: 'High' }, { id: '22001003', name: 'R. Govender', programme: 'ND: IT', mark: '38%', status: 'At Risk' }] } },
            gradebook:      { alert: { title: 'Gradebook', message: 'Select a course and assessment to manage grades.' }, table: { columns: [{ key: 'id', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'test1', label: 'Test 1' }, { key: 'test2', label: 'Test 2' }, { key: 'assign', label: 'Assign 1' }, { key: 'exam', label: 'Exam' }], data: [{ id: '22001001', name: 'J. Nkosi', test1: '45', test2: '52', assign: '68', exam: '--' }, { id: '22001002', name: 'A. Dlamini', test1: '78', test2: '72', assign: '85', exam: '--' }] } },
            attendance:     { alert: { title: 'Attendance & DP Tracker', message: 'Monitor attendance and DP status for a course.' }, badges: [{ label: 'Present: 89%', color: 'green' }, { label: 'DP Risk: 5', color: 'orange' }, { label: 'Excluded: 2', color: 'red' }], table: { columns: [{ key: 'id', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'attended', label: 'Sessions' }, { key: 'pct', label: '%' }, { key: 'dp', label: 'DP Status' }], data: [{ id: '22001001', name: 'J. Nkosi', attended: '8/14', pct: '57%', dp: 'At Risk' }, { id: '22001045', name: 'S. Pillay', attended: '12/14', pct: '86%', dp: 'OK' }] } },
            historical:     { alert: { title: 'Historical Performance', message: 'View year-over-year performance trends for a course.' }, table: { columns: [{ key: 'year', label: 'Year' }, { key: 'enrolled', label: 'Enrolled' }, { key: 'passed', label: 'Passed' }, { key: 'rate', label: 'Pass Rate' }, { key: 'mean', label: 'Mean' }], data: [{ year: '2023', enrolled: '142', passed: '98', rate: '69%', mean: '54%' }, { year: '2024', enrolled: '155', passed: '112', rate: '72%', mean: '57%' }, { year: '2025', enrolled: '148', passed: '—', rate: '—', mean: '—' }] } },
            peerCorr:       { alert: { title: 'Peer Correlation', message: 'Load peer data to see cross-course correlations for this cohort.' }, table: { columns: [{ key: 'course', label: 'Course' }, { key: 'r', label: 'Pearson R' }, { key: 'strength', label: 'Strength' }], data: [{ course: 'MATH201', r: '0.72', strength: 'Strong' }, { course: 'STAT101', r: '0.58', strength: 'Moderate' }, { course: 'ENG102', r: '0.31', strength: 'Weak' }] } },
            classAnalytics: { alert: { title: 'Class Analytics', message: 'Select a course to view the class performance dashboard.' }, badges: [{ label: 'Mean: 58%', color: 'blue' }, { label: 'Pass Rate: 72%', color: 'green' }, { label: 'At Risk: 14%', color: 'orange' }, { label: 'Attendance: 85%', color: 'blue' }] },
            pollManager:    { alert: { title: 'Quick Polls', message: 'Create a poll to engage your class in real-time.', color: 'info' }, table: { columns: [{ key: 'question', label: 'Question' }, { key: 'type', label: 'Type' }, { key: 'responses', label: 'Responses' }, { key: 'date', label: 'Date' }], data: [{ question: 'Was the tutorial helpful?', type: 'Likert', responses: '42', date: '2025-03-12' }] } },

            // ── Student Central ──
            studentDash:    { alert: { title: 'Student Dashboard', message: 'Your academic overview and upcoming deadlines.', color: 'info' }, badges: [{ label: 'GPA: 62%', color: 'blue' }, { label: 'Credits: 240/480', color: 'blue' }, { label: 'Streak: 7 days', color: 'green' }] },
            myResults:      { alert: { title: 'My Results', message: 'View your academic record and GPA.' }, table: { columns: [{ key: 'code', label: 'Course' }, { key: 'name', label: 'Name' }, { key: 'mark', label: 'Mark' }, { key: 'status', label: 'Status' }], data: [{ code: 'COMP101', name: 'Programming 1', mark: '72%', status: 'Passed' }, { code: 'MATH201', name: 'Mathematics 2', mark: '55%', status: 'Passed' }] } },
            progressTracker:{ alert: { title: 'Degree Progress', message: 'Track your progress toward graduation requirements.' }, badges: [{ label: 'Year 2 of 3', color: 'blue' }, { label: '50% Complete', color: 'green' }, { label: '4 Courses Remaining', color: 'orange' }] },
            cumLaude:       { alert: { title: 'Cum Laude Tracker', message: 'Project your class of pass based on current trajectory.' }, badges: [{ label: 'Current: Pass', color: 'blue' }, { label: 'Target: 75% for Cum Laude', color: 'orange' }] },
            portfolio:      { alert: { title: 'Evidence Portfolio', message: 'Upload evidence artifacts organized by graduate attribute.' }, table: { columns: [{ key: 'ga', label: 'Graduate Attribute' }, { key: 'artifacts', label: 'Artifacts' }, { key: 'status', label: 'Status' }], data: [{ ga: 'Problem Solving', artifacts: '3', status: '2 Verified' }, { ga: 'Communication', artifacts: '1', status: 'Pending' }] } },
            careerHub:      { alert: { title: 'Career Hub', message: 'Build your profile, find bursaries, and explore job opportunities.', color: 'info' }, badges: [{ label: 'Profile: 60%', color: 'orange' }, { label: 'Skills: 8', color: 'blue' }, { label: 'Applications: 2', color: 'blue' }] },
            diary:          { alert: { title: 'Study Diary', message: 'Log study sessions, set goals, and reflect on your progress.' }, badges: [{ label: 'This Week: 12h', color: 'blue' }, { label: 'Goal: 15h', color: 'orange' }, { label: 'Streak: 5 days', color: 'green' }] },
            achievements:   { alert: { title: 'Achievements', message: 'View your badges, streaks, and position on the leaderboard.', color: 'info' }, badges: [{ label: 'Level 4', color: 'blue' }, { label: 'Badges: 6', color: 'green' }, { label: 'Points: 1,240', color: 'blue' }] },

            // ── Programme Analyst ──
            progOverview:    { alert: { title: 'Programme Overview', message: 'Select a programme to view health metrics and KPIs.' }, badges: [{ label: 'Throughput: 68%', color: 'green' }, { label: 'DFW Rate: 18%', color: 'orange' }, { label: 'At Risk: 22%', color: 'red' }] },
            cohortTracker:   { alert: { title: 'Cohort Tracker', message: 'Select a programme and entry year to track cohort progression.' }, badges: [{ label: 'Entry: 180', color: 'blue' }, { label: 'Current: 142', color: 'blue' }, { label: 'Graduated: 89', color: 'green' }, { label: 'Dropped: 38', color: 'red' }] },
            progressionMap:  { alert: { title: 'Progression Map', message: 'Select a programme to view the course prerequisite graph.' } },
            gatekeeper:      { alert: { title: 'Gatekeeper Detection', message: 'Identify high-DFW courses that act as bottlenecks.', color: 'warning' }, table: { columns: [{ key: 'code', label: 'Course' }, { key: 'dfw', label: 'DFW Rate' }, { key: 'delay', label: 'Avg Delay' }, { key: 'affected', label: 'Students Affected' }], data: [{ code: 'MATH101', dfw: '42%', delay: '1.3 sem', affected: '156' }, { code: 'PHYS101', dfw: '38%', delay: '1.1 sem', affected: '132' }] } },
            curriculumEditor:{ alert: { title: 'Curriculum Editor', message: 'Select a programme to edit its course structure and sequencing.' } },
            outcomeMapping:  { alert: { title: 'GA-Outcome Mapping', message: 'Select a programme and accreditation body to edit the GA matrix.' } },
            cohortCompare:   { alert: { title: 'Cohort Comparison', message: 'Select two or more cohorts to compare metrics side-by-side.' } },

            // ── Casework Counsellor ──
            caseManager:     { alert: { title: 'Case Manager', message: 'Manage student support cases — create, track, and resolve.' }, badges: [{ label: 'Open: 23', color: 'orange' }, { label: 'In Progress: 15', color: 'blue' }, { label: 'Resolved: 89', color: 'green' }], table: { columns: [{ key: 'id', label: 'Case #' }, { key: 'student', label: 'Student' }, { key: 'category', label: 'Category' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }], data: [{ id: 'C-2025-042', student: 'J. Nkosi', category: 'Academic', priority: 'High', status: 'Open' }, { id: 'C-2025-041', student: 'S. Pillay', category: 'Financial', priority: 'Medium', status: 'In Progress' }] } },
            interventionLog: { alert: { title: 'Intervention Tracker', message: 'View and log interventions for at-risk students.' }, table: { columns: [{ key: 'date', label: 'Date' }, { key: 'student', label: 'Student' }, { key: 'type', label: 'Type' }, { key: 'outcome', label: 'Outcome' }], data: [{ date: '2025-03-10', student: 'J. Nkosi', type: 'Meeting', outcome: 'Improved' }, { date: '2025-03-08', student: 'T. Molefe', type: 'Referral', outcome: 'Pending' }] } },
            atRiskQueue:     { alert: { title: 'At-Risk Queue', message: 'Review flagged students awaiting triage.', color: 'warning' }, badges: [{ label: 'Critical: 4', color: 'red' }, { label: 'High: 8', color: 'orange' }, { label: 'Medium: 12', color: 'blue' }] },
            referralTracker: { alert: { title: 'Referral Manager', message: 'Track external referrals and their outcomes.' }, table: { columns: [{ key: 'student', label: 'Student' }, { key: 'service', label: 'Service' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }], data: [{ student: 'J. Nkosi', service: 'Counselling Centre', date: '2025-03-05', status: 'Attended' }, { student: 'T. Molefe', service: 'Financial Aid', date: '2025-03-08', status: 'Pending' }] } },
            appointments:    { alert: { title: 'Appointments', message: 'Manage your appointment calendar and bookings.', color: 'info' }, badges: [{ label: 'Today: 3', color: 'blue' }, { label: 'This Week: 12', color: 'blue' }, { label: 'No-shows: 1', color: 'orange' }] },
            caseloadReport:  { alert: { title: 'Caseload Analytics', message: 'Generate workload and outcomes reports for your caseload.' }, badges: [{ label: 'Total Cases: 127', color: 'blue' }, { label: 'Resolution Rate: 78%', color: 'green' }, { label: 'Avg Days: 14', color: 'blue' }] },

            // ── Accreditation AutoMate ──
            accredDash:      { alert: { title: 'Accreditation Dashboard', message: 'Overview of compliance status across programmes.' }, badges: [{ label: 'ND: IT — 85%', color: 'green' }, { label: 'ND: Civil — 72%', color: 'orange' }, { label: 'BTech: IT — 91%', color: 'green' }] },
            gaMatrix:        { alert: { title: 'GA Matrix Editor', message: 'Select a programme and accreditation body to edit the GA mapping.' } },
            portfolioReview: { alert: { title: 'Portfolio Review', message: 'Review submitted evidence artifacts for accreditation.' }, badges: [{ label: 'Pending: 24', color: 'orange' }, { label: 'Approved: 156', color: 'green' }, { label: 'Rejected: 8', color: 'red' }] },
            evidenceLibrary: { alert: { title: 'Evidence Library', message: 'Search and browse accreditation evidence artifacts.' }, badges: [{ label: '342 Documents', color: 'blue' }, { label: '12 Categories', color: 'blue' }] },
            complianceReport:{ alert: { title: 'Compliance Reporting', message: 'Generate compliance reports for accreditation visits.' } },
            logicEditor:     { alert: { title: 'Logic Package Editor', message: 'Select an accreditation system, graduate attribute, and achievement level to edit its logic package tree.' } },
            studentEval:     { alert: { title: 'Student GA Evaluation', message: 'Enter a student number to evaluate their achievement across all graduate attributes and levels.' }, badges: [{ label: 'ECSA GA1-GA11', color: 'blue' }, { label: '3 Levels', color: 'blue' }] },
            cohortReport:    { alert: { title: 'Cohort Compliance Report', message: 'Generate programme-wide compliance report with per-student GA achievement.' }, badges: [{ label: 'BNCME1: 142 students', color: 'blue' }, { label: 'Compliance: 76%', color: 'orange' }] },

            // ── Executive Insight ──
            execDash:        { alert: { title: 'Executive Dashboard', message: 'Institutional KPIs and strategic performance overview.' }, badges: [{ label: 'Enrolled: 12,450', color: 'blue' }, { label: 'Retention: 82%', color: 'green' }, { label: 'Throughput: 68%', color: 'orange' }, { label: 'At Risk: 18%', color: 'red' }] },
            enrolmentTrends: { alert: { title: 'Enrolment Trends', message: 'Registration analytics and enrolment forecasting.' }, table: { columns: [{ key: 'year', label: 'Year' }, { key: 'total', label: 'Total' }, { key: 'new', label: 'New' }, { key: 'returning', label: 'Returning' }], data: [{ year: '2024', total: '11,800', new: '3,200', returning: '8,600' }, { year: '2025', total: '12,100', new: '3,400', returning: '8,700' }, { year: '2026', total: '12,450', new: '3,500', returning: '8,950' }] } },
            throughput:      { alert: { title: 'Throughput Analysis', message: 'Graduation rates and completion metrics by programme.' }, table: { columns: [{ key: 'prog', label: 'Programme' }, { key: 'reg', label: 'Reg Time' }, { key: 'plus1', label: '+1 Year' }, { key: 'plus2', label: '+2 Years' }, { key: 'overall', label: 'Overall' }], data: [{ prog: 'ND: IT', reg: '42%', plus1: '58%', plus2: '65%', overall: '68%' }, { prog: 'ND: Civil', reg: '38%', plus1: '52%', plus2: '61%', overall: '64%' }] } },
            retentionReport: { alert: { title: 'Retention Analytics', message: 'First-year retention and dropout analysis.' }, badges: [{ label: 'Retention: 82%', color: 'green' }, { label: 'Dropout: 12%', color: 'red' }, { label: 'Transfer: 6%', color: 'orange' }] },
            progComparison:  { alert: { title: 'Programme Benchmarking', message: 'Compare programme performance across the institution.' } },

            // ── System & Config ──
            userManager:     { alert: { title: 'User Management', message: 'Manage user accounts, roles, and course access.' }, table: { columns: [{ key: 'staffId', label: 'Staff ID' }, { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' }], data: [{ staffId: 'STF001', name: 'Dr. R. Smith', role: 'Lecturer', status: 'Active' }, { staffId: 'STF002', name: 'Prof. N. Zulu', role: 'HoD', status: 'Active' }] } },
            roles:           { alert: { title: 'Role Configuration', message: 'Configure permission templates and access policies.' }, table: { columns: [{ key: 'role', label: 'Role' }, { key: 'users', label: 'Users' }, { key: 'modules', label: 'Modules' }], data: [{ role: 'Lecturer', users: '45', modules: 'ClassView, Hub' }, { role: 'HoD', users: '8', modules: 'ClassView, Programme, Executive' }, { role: 'Admin', users: '3', modules: 'All' }] } },
            integrations:    { alert: { title: 'System Integrations', message: 'Configure connections to SIS, LMS, and other external systems.' }, badges: [{ label: 'SIS: Connected', color: 'green' }, { label: 'LMS: Not Configured', color: 'red' }, { label: 'Email: Connected', color: 'green' }] },
            auditLog:        { alert: { title: 'Audit Log', message: 'Search system activity events for compliance and debugging.' }, table: { columns: [{ key: 'time', label: 'Time' }, { key: 'user', label: 'User' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entity' }], data: [{ time: '10:42', user: 'admin', action: 'Login', entity: 'Session' }, { time: '10:38', user: 'dr.smith', action: 'Export', entity: 'Report' }] } },
            alertConfig:     { alert: { title: 'Alert Rules', message: 'Configure at-risk detection thresholds and conditions.' }, table: { columns: [{ key: 'rule', label: 'Rule' }, { key: 'scope', label: 'Scope' }, { key: 'threshold', label: 'Threshold' }, { key: 'active', label: 'Active' }], data: [{ rule: 'Z-Score Alert', scope: 'Institution', threshold: '-0.5', active: 'Yes' }, { rule: 'Attendance DP', scope: 'Institution', threshold: '75%', active: 'Yes' }] } },

            // ── Communication & Tools ──
            messaging:       { alert: { title: 'Student Messaging', message: 'Select a template and recipients, then preview before sending.', color: 'info' }, table: { columns: [{ key: 'template', label: 'Template' }, { key: 'recipients', label: 'Recipients' }, { key: 'sent', label: 'Last Sent' }], data: [{ template: 'At-Risk Warning', recipients: '12 students', sent: '2025-03-15' }, { template: 'DP Exclusion', recipients: '3 students', sent: '2025-04-01' }] } },
            browser:         { alert: { title: 'Student Browser', message: 'Search for students by ID, name, or programme.' }, table: { columns: [{ key: 'id', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'programme', label: 'Programme' }, { key: 'year', label: 'Year' }, { key: 'status', label: 'Status' }], data: [{ id: '22001001', name: 'J. Nkosi', programme: 'ND: IT', year: '2', status: 'Active' }, { id: '22001002', name: 'A. Dlamini', programme: 'ND: IT', year: '3', status: 'Active' }] } },
            timetabling:     { alert: { title: 'Timetable Manager', message: 'View schedules and manage timetable slots.', color: 'info' } },
            notifications:   { alert: { title: 'Notification Centre', message: 'View alerts, reminders, and announcements across all modules.' }, badges: [{ label: 'Unread: 5', color: 'orange' }, { label: 'Alerts: 2', color: 'red' }, { label: 'Reminders: 3', color: 'blue' }] },
            reporting:       { alert: { title: 'Report Builder', message: 'Select data sources and fields to build a custom report.' } },

            // ── Advanced Analytics ──
            aiCoach:          { alert: { title: 'AI Academic Coach', message: 'Get personalized study recommendations based on your performance data.', color: 'info' } },
            successPredictor: { alert: { title: 'Success Predictor', message: 'Run ML prediction model to estimate student pass/fail probabilities.', color: 'warning' } },
            learningAnalytics:{ alert: { title: 'Learning Analytics', message: 'Analyze LMS engagement data alongside academic performance.' } },
            wellness:         { alert: { title: 'Wellness Monitor', message: 'Voluntary wellbeing check-in and resource recommendations.', color: 'info' } },
            integrity:        { alert: { title: 'Academic Integrity', message: 'Detect anomalous patterns in assessment data for integrity review.', color: 'warning' } },
            financialAid:     { alert: { title: 'Financial Aid', message: 'Track funding status and academic requirements for continued support.' }, badges: [{ label: 'NSFAS: Active', color: 'green' }, { label: 'N+2: Year 1 of 4', color: 'blue' }, { label: 'Requirements: Met', color: 'green' }] }
        };
    }

}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoScholarServicesPanel;
}
if (typeof window !== 'undefined') {
    window.AutoScholarServicesPanel = AutoScholarServicesPanel;
}
