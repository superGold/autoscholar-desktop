/**
 * AutoScholarAbout - About Component
 *
 * Provides system information including:
 * - Version information with release history
 * - System overview and architecture
 * - Feature documentation
 * - Changelog and release notes
 * - Keyboard shortcuts reference
 * - Documentation links
 * - Support and contact information
 *
 * Extracted from system.autoscholar.v2.js for better maintainability.
 */

class AutoScholarAbout {
    // Centralized version information
    static VERSION_INFO = {
        version: '3.2.0',
        releaseDate: '2026-03-01',
        status: 'stable',
        changelog: [
            {
                version: '3.2.0',
                date: '2026-03-01',
                type: 'major',
                title: 'Production Entry Flow',
                changes: [
                    'AutoScholarEntryFlow: login → hub → module flow with cookie-based session persistence',
                    'Role-based hub cards: students skip to Student Central, staff see role-filtered modules',
                    'Strict no-fallback authentication — login failures show errors, never demo data',
                    'Institution-specific entry points: dut/, vut/, cput/, ukzn/, wits/ with separate config.json',
                    'Root index.html + dev.index.html for institution-agnostic access',
                    'Green button color fix: teal hue 172 → true green hue 142 to match #22c55e',
                    'Architecture documentation added to About: dual API, auth flow, server infrastructure',
                    'Deprecated dut/dev-dut.html in favor of dut/dev.index.html'
                ]
            },
            {
                version: '3.1.0',
                date: '2026-02-28',
                type: 'major',
                title: 'Entry Point Consolidation',
                changes: [
                    'AutoScholarApp is now the sole entry point — one canonical system, no more legacy forks',
                    'Moved 8 legacy role module classes to legacy/ (AutoScholar shell, Hub, Student, Executive, Analyst, Counsellor, Admin)',
                    'Moved system.autoscholar.v2.js (6700-line monolith) to legacy/',
                    'Moved old test rig and module launcher to Tests/legacy/',
                    'Moved DUT production shell (DutAutoScholarApp + old index.html) to dut/legacy/',
                    'Cleaned dev-dut.html: removed 9 unused script imports for legacy role modules',
                    'Added About tab to AutoScholarApp with system documentation',
                    'All 9 tabs work: Executive, ClassView, Analyst, Student, Counsellor, Accreditation, API, Admin, About'
                ]
            },
            {
                version: '3.0.0',
                date: '2026-02-28',
                type: 'major',
                title: 'Deep Review & Domain-First Upgrade',
                changes: [
                    'Maturity L2 to L4 — all L3 and L4 checks pass',
                    'Counsellor module fully wired to CaseworkService (removed all mock data)',
                    'Admin System Health shows real service introspection (removed fake metrics)',
                    'Cross-module navigation: Counsellor can navigate to Student records',
                    'Student Central tab-switch performance: content-only swap preserves sidebar',
                    'Loading states for section transitions with navigation guard',
                    '49 raw progress bars converted to uiProgress with threshold coloring',
                    '51 UIBinding references: reactive metrics across Hub, Student, Counsellor',
                    'Market-neutral schema and seed data for international deployment',
                    'Hex color cleanup: 762 to ~123 remaining (CSS variable adoption)',
                    'Status-color utility: getDeltaColor, getThresholdClass, 8 threshold keys',
                    '25+ inline ternaries replaced with centralized config lookups'
                ]
            },
            {
                version: '2.0.0',
                date: '2026-01-08',
                type: 'major',
                title: 'Curated UI Modernization',
                changes: [
                    'Complete UI overhaul with curated ui design system',
                    'Modular component architecture (8 role modules)',
                    'Enhanced accessibility features (WCAG 2.1 AA)',
                    'Keyboard navigation and shortcuts',
                    'About section with comprehensive documentation'
                ]
            },
            {
                version: '1.5.0',
                date: '2026-01-04',
                type: 'feature',
                title: 'Programme Structure & Backend',
                changes: [
                    'ProgrammeStructureService with estimation fallback',
                    'ServiceBackend for API persistence',
                    'Data adapter pattern (Sample/API/ServiceBackend)',
                    'DUT and UKZN institution API adapters'
                ]
            },
            {
                version: '1.0.0',
                date: '2025-12-15',
                type: 'initial',
                title: 'Initial Release',
                changes: [
                    'Core navigation and role-based access for 7 user types',
                    'Student Central, ClassView, Analyst, Admin sections',
                    'Sample data mode with 12 diverse student profiles',
                    'Risk detection and prerequisite graph analysis'
                ]
            }
        ]
    };

    constructor(settings = {}) {
        this.parent = settings.parent;
        this.services = settings.services || {};
        this.roles = settings.roles || {};
        this.currentUser = settings.currentUser;
        this.dataAdapter = settings.dataAdapter;
        this.config = settings.config;
    }

    render() {
        const container = this.parent.add({ css: 'p-6 max-w-6xl mx-auto' });
        const versionInfo = AutoScholarAbout.VERSION_INFO;

        // Header with enhanced version display
        const header = container.add({ css: 'mb-8' });
        const titleRow = header.add({ css: 'flex items-center gap-4' });
        titleRow.add({ tag: 'i', css: 'fas fa-graduation-cap text-4xl text-pri' });
        const titleText = titleRow.add({ css: '' });
        titleText.add({ tag: 'h1', css: 'text-3xl font-bold text-pri', script: 'AutoScholar' });

        // Version info with release date and status
        const versionRow = titleText.add({ css: 'flex items-center gap-2 mt-1' });
        versionRow.add({ css: 'text-lg text-muted', script: `Academic Management System v${AutoScholarAbout.VERSION_INFO.version}` });

        // Status badge
        const statusVariant = versionInfo.status === 'stable' ? 'success' :
            versionInfo.status === 'beta' ? 'warning' : 'secondary';
        const statusLabel = versionInfo.status.charAt(0).toUpperCase() + versionInfo.status.slice(1);
        if (typeof uiBadge !== 'undefined') {
            new uiBadge({ parent: versionRow, label: statusLabel, color: statusVariant, size: 'sm' });
        }

        // Release date
        const releaseDateText = header.add({ css: 'text-sm text-muted mt-1 ml-14' });
        releaseDateText.add({ script: `Released ${this._formatDate(versionInfo.releaseDate)}` });

        // Desktop App Downloads
        this._renderDownloads(container);

        // Overview Card
        this._renderOverview(container);

        // Two-column layout for Features and Status
        const twoCol = container.add({ css: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6' });
        this._renderFeatures(twoCol);
        this._renderStatus(twoCol);

        // Documentation and Shortcuts row
        const docsRow = container.add({ css: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6' });
        this._renderDocumentation(docsRow);
        this._renderKeyboardShortcuts(docsRow);

        // Architecture
        this._renderArchitecture(container);

        // Maturity Audit
        this._renderMaturityAudit(container);

        // UIBinding Registry
        this._renderBindingRegistry(container);

        // Services and Data Sources
        const bottomRow = container.add({ css: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6' });
        this._renderServices(bottomRow);
        this._renderDataSources(bottomRow);

        // Changelog
        this._renderChangelog(container);

        // Remaining Work
        this._renderRemainingWork(container);

        // Support and Contact
        this._renderSupport(container);
    }

    _formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    _renderDownloads(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-download text-pri"></i> Desktop App' });

        const desc = card.add({ css: 'text-gray-700 leading-relaxed mb-4' });
        desc.add({ tag: 'p', script: 'AutoScholar is available as a standalone desktop application for macOS, Windows, and Android. The desktop app connects directly to your institution\'s API — no local server required.' });

        const platforms = [
            { icon: 'fab fa-apple', label: 'macOS', desc: 'Apple Silicon (.dmg)', css: 'text-gray-800' },
            { icon: 'fab fa-windows', label: 'Windows', desc: 'Installer (.msi / .exe)', css: 'text-blue-500' },
            { icon: 'fab fa-android', label: 'Android', desc: 'Mobile (.apk)', css: 'text-green-500' }
        ];

        const grid = card.add({ css: 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-4' });
        platforms.forEach(p => {
            const item = grid.add({ css: 'bg-gray-50 rounded-lg p-4 text-center' });
            item.add({ tag: 'i', css: `${p.icon} text-2xl ${p.css} mb-2` });
            item.add({ css: 'font-medium text-sm', script: p.label });
            item.add({ css: 'text-xs text-muted', script: p.desc });
        });

        const btnRow = card.add({ css: 'flex justify-center' });
        const btn = btnRow.add({ tag: 'button', css: 'as-hub-download-btn', script: '<i class="fas fa-download"></i> Download Desktop App' });
        btn.el.addEventListener('click', () => {
            if (typeof AutoScholarEntryFlow !== 'undefined') {
                AutoScholarEntryFlow.showDownloadModal();
            }
        });
    }

    _renderOverview(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-info-circle text-pri"></i> Overview' });

        const content = card.add({ css: 'text-gray-700 leading-relaxed space-y-3' });
        content.add({ tag: 'p', script: 'AutoScholar is a comprehensive Academic Management System built on the Publon.Press reactive data platform. It manages the complete student lifecycle from enrolment through graduation, providing role-specific dashboards for seven distinct user types: students, lecturers, programme coordinators (analysts), student counsellors, executives, administrators, and alumni.' });

        content.add({ tag: 'p', script: 'The system is designed to be institution-neutral. While it currently integrates with South African universities (DUT, CPUT, UKZN, VUT) via API adapters, all domain concepts use internationally portable terminology — academic periods instead of institution-specific terms, qualification levels instead of local frameworks, and generic attendance tracking that adapts to any regulatory environment.' });

        content.add({ tag: 'p', script: 'At its core, AutoScholar connects real-time data to every interface through UIBinding reactive metrics. When a counsellor logs an intervention, the Hub dashboard metrics update automatically. When results are published, student progress bars recalculate. This reactive architecture means every view always shows current data without manual refreshes.' });

        // Role module cards
        card.add({ css: 'text-xs text-muted uppercase tracking-wide mt-5 mb-3', script: 'Role Modules' });
        const highlights = card.add({ css: 'grid grid-cols-2 md:grid-cols-4 gap-3' });

        const stats = [
            { icon: 'home', label: 'Hub', desc: 'Navigation, live metrics, alerts' },
            { icon: 'user-graduate', label: 'Student Central', desc: 'Dashboard, Progress, Diary, Career' },
            { icon: 'chalkboard-teacher', label: 'ClassView', desc: 'Class management, risk, grades' },
            { icon: 'chart-line', label: 'Analyst', desc: 'Programme structure, cohorts, bottlenecks' },
            { icon: 'hands-helping', label: 'Counsellor', desc: 'Cases, interventions, referrals' },
            { icon: 'chart-bar', label: 'Executive', desc: 'KPIs, benchmarks, reports' },
            { icon: 'cogs', label: 'Admin', desc: 'Users, roles, system health' },
            { icon: 'user-friends', label: 'Alumni', desc: 'Directory, surveys, mentorship' }
        ];

        stats.forEach(s => {
            const item = highlights.add({ css: 'bg-gray-50 rounded-lg p-3 text-center' });
            item.add({ tag: 'i', css: `fas fa-${s.icon} text-xl text-pri mb-1` });
            item.add({ css: 'font-medium text-sm', script: s.label });
            item.add({ css: 'text-xs text-muted', script: s.desc });
        });
    }

    _renderFeatures(container) {
        const card = container.add({ css: 'card p-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-check-circle text-success"></i> Implemented Features' });

        const features = {
            'Student Central': [
                'Dashboard with reactive KPIs (GPA, credits, attendance) via UIBinding metrics',
                'Degree progress tracking with credit breakdown by year level',
                'Course status grid showing passed, in-progress, and remaining courses',
                'Registration Advisor with prerequisite validation and concession requests',
                'My Diary with tag-based entries and goal tracking',
                'Career Hub with professional profile, bursaries, and job applications',
                'Results panel with per-assessment breakdowns and trend analysis'
            ],
            'ClassView & Analyst': [
                'ClassView: class roster, grade distribution, risk monitoring, DP tracking',
                'Student Explorer with comprehensive profiles and intervention history',
                'Programme Estimator: infers curriculum structure from student registrations',
                'Prerequisite graph visualization with SVG dependency chains',
                'Bottleneck detection: identifies courses causing programme delays',
                'Cohort progression tracking with year-over-year comparisons',
                'Confidence scoring on programme structure completeness'
            ],
            'Counsellor & Executive': [
                'Counsellor: live case management wired to CaseworkService (no mock data)',
                'Case detail with interventions, referrals, and notes timeline',
                'At-risk student identification with cross-module navigation to Academic Record',
                'Executive: institutional KPIs with faculty and department drill-down',
                'Benchmark comparisons against institutional and programme averages',
                'Risk severity heat maps and trend analysis',
                'Executive summary reports with delta indicators'
            ],
            'Admin & System': [
                'User and role management with permission groups',
                'System health dashboard with real service introspection',
                'Programme structure editor with tree visualization',
                'Audit logging via AuditService',
                'Cross-module navigation: any module can navigate to any other with context',
                'Loading states for section transitions with navigation guard',
                'Threshold-based progress bars via AutoScholarConfig.renderProgress()'
            ]
        };

        if (typeof ElAccordion !== 'undefined') {
            const accordion = new ElAccordion({ parent: card, variant: 'bordered', exclusive: true });

            Object.entries(features).forEach(([category, items], index) => {
                const { body } = accordion.addItem({ title: category, expanded: index === 0 });
                const list = body.add({ tag: 'ul', css: 'list-disc list-inside text-sm space-y-1' });
                items.forEach(item => list.add({ tag: 'li', script: item }));
            });
        } else {
            Object.entries(features).forEach(([category, items]) => {
                card.add({ css: 'font-medium mt-3 mb-1', script: category });
                const list = card.add({ tag: 'ul', css: 'list-disc list-inside text-sm text-gray-600 space-y-1' });
                items.forEach(item => list.add({ tag: 'li', script: item }));
            });
        }
    }

    _renderStatus(container) {
        const card = container.add({ css: 'card p-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-database text-info"></i> Current Session' });

        // Data mode
        const mode = this.dataAdapter ? this.dataAdapter.constructor.name : 'No Adapter';
        const modeRow = card.add({ css: 'flex items-center gap-2 mb-4' });
        modeRow.add({ css: 'text-sm', script: 'Data Mode:' });
        if (typeof uiBadge !== 'undefined') {
            new uiBadge({
                parent: modeRow,
                label: mode.replace('DataAdapter', ''),
                variant: mode.includes('Api') ? 'success' : 'secondary'
            });
        } else {
            modeRow.add({ css: 'font-medium', script: mode });
        }

        // Data counts
        const counts = card.add({ css: 'space-y-2' });

        const dataSets = [
            { label: 'Programmes', publon: 'programme', svc: 'academic' },
            { label: 'Courses', publon: 'course', svc: 'academic' },
            { label: 'Students', publon: 'member', svc: 'member' },
            { label: 'Enrolments', publon: 'enrolment', svc: 'academic' },
            { label: 'Departments', publon: 'department', svc: 'academic' },
            { label: 'Timetable Slots', publon: 'timetableSlot', svc: 'timetable' }
        ];

        dataSets.forEach(d => {
            const svc = this.services[d.svc];
            const count = svc?.publon?.[d.publon]?.rows?.filter(r => r)?.length || 0;

            const row = counts.add({ css: 'flex items-center justify-between py-1 border-b border-gray-100' });
            row.add({ css: 'text-sm', script: d.label });
            if (typeof uiBadge !== 'undefined') {
                new uiBadge({ parent: row, label: count.toLocaleString(), color: count > 0 ? 'primary' : 'secondary', size: 'sm' });
            } else {
                row.add({ css: 'font-mono text-sm', script: count.toLocaleString() });
            }
        });

        // Current user
        if (this.currentUser) {
            card.add({ css: 'mt-4 pt-4 border-t' });
            const userRow = card.add({ css: 'flex items-center gap-3' });
            const avatar = userRow.add({ css: 'w-10 h-10 rounded-full bg-pri-light flex items-center justify-center text-pri font-bold' });
            const initials = `${this.currentUser.firstName?.[0] || ''}${this.currentUser.lastName?.[0] || ''}`.toUpperCase();
            avatar.add({ script: initials || '?' });
            const userInfo = userRow.add({ css: '' });
            userInfo.add({ css: 'font-medium', script: `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() || 'Unknown' });
            userInfo.add({ css: 'text-sm text-muted', script: this.currentUser.username || this.currentUser.studentNumber || '' });
        }
    }

    _renderArchitecture(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-sitemap text-warning"></i> Architecture' });

        const pre = card.add({ tag: 'pre', css: 'bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto' });
        pre.domElement.textContent = `AutoScholar v${AutoScholarAbout.VERSION_INFO.version} — Architecture (Consolidated)
─────────────────────────────────────────────────────────
  Entry Point: AutoScholarApp (class.AutoScholarApp.js)
  ├── uiTabs (9 tabs) + uiControlStage per module
  └── Lazy init: panels load on first tab visit

  Module Tabs → Panel Classes (in Tests/)
  ├── Executive Insight ──→ ExecSummaryPanel + 6 sub-panels + ExecAboutPanel
  ├── ClassView Connect ──→ ClassViewConnect (schema + seed + manifest)
  ├── Programme Analyst ──→ ProgAnalystPanel (bridge + data + 7 sub-panels)
  ├── Student Central ────→ StudentCentralPanel (9 student panels from panels/)
  ├── Casework Counsellor → CaseworkCounsellorPanel (CaseworkBridge)
  ├── Accreditation ──────→ AccreditationAutomatePanel
  ├── API Tester ─────────→ InstApiTestSuite + TestRunner
  ├── Admin ──────────────→ UserManagementPanel
  └── About ──────────────→ AutoScholarAbout (this page)

  Data Layer
  ├── Publome reactive tables ←→ UIBinding (51+ refs)
  ├── 8 standard services (member, audit, tag, tree, group, messages, event, logic)
  └── 5 domain microservices (casework, analyst, executive, career, qualification)

  Data Adapters
  ├── SampleDataAdapter ──→ AutoScholarConfig (12 students, 20 enrolments)
  ├── ApiDataAdapter ────→ Institution API (DUT, CPUT, UKZN, VUT)
  └── ServiceBackendAdapter → DbBinding → PostgreSQL (as_* tables)

  Config Layer
  ├── autoscholar.manifest.js ─── Boot order, services, file list
  ├── autoscholar.schema.js ──── 12 tables, market-neutral columns
  ├── autoscholar.seed.js ────── 2 institutions, 12 students, 7 scenarios
  └── autoscholar.config.js ──── Thresholds, status colors, role tabs`;

        // Server Infrastructure
        this._renderServerInfrastructure(container);

        // Authentication & Entry Flow
        this._renderAuthenticationFlow(container);

        // Institution Deployment Pattern
        this._renderInstitutionDeployment(container);

        // Consolidation narrative
        card.add({ css: 'mt-4' });
        card.add({ tag: 'h3', css: 'text-lg font-semibold mb-2', script: 'Entry Point Consolidation (v3.1)' });
        const narrative = card.add({ css: 'text-sm text-gray-700 leading-relaxed space-y-2' });
        narrative.add({ tag: 'p', script: 'AutoScholar previously had two parallel architectures competing for the same screen. The legacy system used an AutoScholar navigation shell with registerComponent() — each role module (Hub, Executive, Analyst, etc.) was a heavyweight class that registered itself and rendered when selected via showSection(). The newer system, AutoScholarApp, bypasses all of that: it creates a flat uiTabs interface and directly instantiates lightweight panel classes from Tests/ with lazy initialization.' });
        narrative.add({ tag: 'p', script: 'These two systems shared no code at the panel level. The legacy AutoScholarExecutive class (8000+ lines) is completely separate from the ExecSummaryPanel + ExecHierarchyPanel composition that AutoScholarApp uses. The same is true for every module: AutoScholarCounsellor vs CaseworkCounsellorPanel, AutoScholarAdmin vs UserManagementPanel, and so on. This meant every improvement had to be made in the right place depending on which entry point was active — a constant source of confusion.' });
        narrative.add({ tag: 'p', script: 'The consolidation moves all legacy role modules and the navigation shell to a legacy/ folder. The 6700-line system.autoscholar.v2.js monolith (which contained duplicate class definitions) goes with them. AutoScholarApp is now the sole entry point. dev-dut.html loads only what AutoScholarApp actually uses — support classes, selectors, adapters, student panels, and the Tests/ module panels.' });
    }

    _renderServerInfrastructure(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-network-wired text-info"></i> Dual API Architecture' });

        const narrative = card.add({ css: 'text-sm text-gray-700 leading-relaxed space-y-3' });
        narrative.add({ tag: 'p', script: 'AutoScholar operates through a dual-backend architecture. The institution\'s PHP API server (e.g. api.query5.php at DUT) acts as the primary orchestrator — it authenticates users via LDAP against the institution\'s Active Directory, queries the Oracle ITS database for academic records (student results from STUD.IAHSUB, assessment marks from STUD.JCHSTM, biographical data from STUD.IADBIO, programme metadata from STUD.IAIQAL), and manages sessions. On successful authentication, the PHP server also calls the supplemental database at scholarcloud.live via postToMsLive({action:\'getExtSession\'}) to create or link the user in the supplemental Publon CRUD layer.' });
        narrative.add({ tag: 'p', script: 'The supplemental database (scholarcloud.live/dut/member) stores everything the institution\'s Oracle system doesn\'t track — cases, interventions, tags, messages, event logs, career profiles, and other Publon service data. When the PHP API receives Publon CRUD requests (callPublon, createEntry, readEntry), it forwards them to a Node.js service running on localhost:4003 which manages the PostgreSQL-backed Publon tables.' });

        // Architecture diagram
        const pre = card.add({ tag: 'pre', css: 'bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto mt-4' });
        pre.domElement.textContent = `Client (Browser)
  │
  └─ POST /api-proxy ─→ Node proxy (localhost:3099)
                            │
                            └─→ api.query5.php (institution server)
                                  │
                                  ├── LDAP auth (Active Directory)
                                  │   Staff: alphanumeric ID (e.g. bkDr3)
                                  │   Student: numeric ID (e.g. 21906044)
                                  │
                                  ├── On success → postToMsLive({action:'getExtSession'})
                                  │                → scholarcloud.live/dut/member
                                  │                (creates/links user in supplemental DB)
                                  │
                                  ├── Oracle queries (academic data)
                                  │   STUD.IAHSUB  — Final course results (USE FOR COUNTS)
                                  │   STUD.JCHSTM  — Assessment marks (NOT for counts)
                                  │   STUD.IADBIO  — Student biographical data
                                  │   STUD.IAIQAL  — Programme metadata
                                  │   STUD.IDDSCG  — Staff teaching assignments
                                  │
                                  └── Publon CRUD → requestNode() → localhost:4003
                                      (callPublon, createEntry, readEntry, etc.)`;

        // Response contract
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Login Response Contract' });
        const respNarr = card.add({ css: 'text-sm text-gray-700 leading-relaxed' });
        respNarr.add({ tag: 'p', script: 'A successful login returns two session objects. sessionData contains sessionId, logToken, userId, and userIdx from the Oracle session — these authenticate subsequent API calls. extSet contains the supplemental database session from scholarcloud.live, enabling Publon CRUD operations. Both must be present for full functionality; if extSet is missing, the supplemental layer (cases, tags, messages) will be unavailable.' });

        // Data source warning
        card.add({ css: 'bg-amber-50 border-l-4 border-amber-400 p-3 mt-4 text-sm text-amber-800', script: '<strong>Critical:</strong> Always use STUD.IAHSUB for student counts, never STUD.JCHSTM. JCHSTM contains individual assessment marks (tests, assignments) which inflates counts by 3-10x. This is the root cause of the 9x count mismatch between ClassView and Executive dashboards (ISSUE-001).' });
    }

    _renderAuthenticationFlow(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-lock text-warning"></i> Authentication & Entry Flow' });

        const narrative = card.add({ css: 'text-sm text-gray-700 leading-relaxed space-y-3' });
        narrative.add({ tag: 'p', script: 'The production entry flow uses AutoScholarEntryFlow, a standalone controller class that manages the complete user journey: login → hub → module. On page load, it checks for saved session cookies (as_sessionId, as_logToken, as_userId, as_role, as_institution). If valid cookies exist, it validates the session against the API and either resumes at the hub or redirects to login if the session has expired.' });
        narrative.add({ tag: 'p', script: 'Authentication uses LDAP via the institution\'s Active Directory. The PHP API determines the user type from their ID pattern — staff IDs are alphabetic (e.g. bkDr3), student IDs are numeric (e.g. 21906044). After LDAP verification, the server creates both an Oracle session and a supplemental database session via postToMsLive({action:\'getExtSession\'}), which auto-creates the user record in the Publon member table if they don\'t exist yet.' });
        narrative.add({ tag: 'p', script: 'The hub screen shows role-filtered module cards based on ROLE_TABS from autoscholar.config.js. Students with only the as_student role skip the hub entirely and go straight to Student Central. Staff see cards for their permitted modules — a lecturer sees ClassView and About, a coordinator sees ClassView, Programme Analyst, Accreditation, and Alumni. Clicking a card launches AutoScholarApp with the corresponding tab pre-selected.' });

        // Role → Tab mapping
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Module Card Mapping' });
        const tableContainer = card.add({ css: 'overflow-x-auto' });
        const table = tableContainer.add({ tag: 'table', css: 'text-sm w-full' });
        const thead = table.add({ tag: 'thead' });
        const headRow = thead.add({ tag: 'tr', css: 'border-b-2 border-gray-200' });
        ['Section Key', 'Card Label', 'AutoScholarApp Tab', 'Icon'].forEach(h => {
            headRow.add({ tag: 'th', css: 'text-left py-2 px-3 text-xs uppercase text-muted', script: h });
        });
        const tbody = table.add({ tag: 'tbody' });
        const mappings = [
            ['student',       'Student Central',      'students',       'fa-user-graduate'],
            ['lecturer',      'ClassView Connect',    'supervision',    'fa-chalkboard-teacher'],
            ['analyst',       'Programme Analyst',    'programme',      'fa-chart-line'],
            ['counsellor',    'Counsellor',           'casework',       'fa-hands-helping'],
            ['admin',         'Administration',       'settings',       'fa-cogs'],
            ['executive',     'Executive Insight',    'dashboard',      'fa-briefcase'],
            ['accreditation', 'Accreditation',        'reports',        'fa-certificate'],
            ['alumni',        'Alumni Relations',     '(stub)',         'fa-users']
        ];
        mappings.forEach(row => {
            const tr = tbody.add({ tag: 'tr', css: 'border-b border-gray-100' });
            tr.add({ tag: 'td', css: 'py-2 px-3 font-mono text-xs', script: row[0] });
            tr.add({ tag: 'td', css: 'py-2 px-3', script: row[1] });
            tr.add({ tag: 'td', css: 'py-2 px-3 font-mono text-xs', script: row[2] });
            tr.add({ tag: 'td', css: 'py-2 px-3', script: `<i class="fas ${row[3]} text-pri"></i>` });
        });

        // Cookie management
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Session Cookies' });
        const cookieNarr = card.add({ css: 'text-sm text-gray-700 leading-relaxed' });
        cookieNarr.add({ tag: 'p', script: 'When "remember me" is checked, five cookies persist for 7 days: as_sessionId, as_logToken, as_userId, as_role, and as_institution. Without "remember me", cookies expire with the browser session. Logout clears all cookies and returns to the login screen. The strict no-fallback rule applies: if session validation fails, the user sees an error message and the login form — never demo data.' });
    }

    _renderInstitutionDeployment(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-university text-pri"></i> Institution Deployment Pattern' });

        const narrative = card.add({ css: 'text-sm text-gray-700 leading-relaxed space-y-3' });
        narrative.add({ tag: 'p', script: 'Each institution gets a pair of HTML entry points: index.html (production, requires real credentials) and dev.index.html (development, merges config.local.json with dev credentials). These are thin-client files — under 50 lines of JS each — that load the shared script bundle and call AutoScholarEntryFlow with the institution code.' });
        narrative.add({ tag: 'p', script: 'Institution-specific configuration lives in two places. The frontend config ({inst}/config.json) stores institution branding, API endpoint, defaults, and feature flags. The backend config (Implementations-{INST}/config.json) documents the server infrastructure, data sources, auth method, known issues, and deployment contacts. The frontend config is loaded at runtime; the backend config is reference documentation for deployment management.' });

        // Institution grid
        card.add({ css: 'text-xs text-muted uppercase tracking-wide mt-5 mb-3', script: 'Deployed Institutions' });
        const grid = card.add({ css: 'grid grid-cols-1 md:grid-cols-5 gap-3' });
        const institutions = [
            { code: 'DUT', name: 'Durban University of Technology', backend: 'PHP/Oracle', status: 'Active', schema: 'ITS (STUD.*)' },
            { code: 'VUT', name: 'Vaal University of Technology', backend: 'PHP-Node/Oracle', status: 'Active', schema: 'ITS (STUD.*)' },
            { code: 'CPUT', name: 'Cape Peninsula University of Technology', backend: 'Node/MySQL', status: 'Blocked', schema: 'ITS (A-prefix)' },
            { code: 'UKZN', name: 'University of KwaZulu-Natal', backend: 'PHP/MSSQL', status: 'Partial', schema: 'SMS (custom)' },
            { code: 'WITS', name: 'University of the Witwatersrand', backend: 'Node/Oracle', status: 'Legacy', schema: 'ITS (via proxy)' }
        ];
        institutions.forEach(inst => {
            const statusColor = inst.status === 'Active' ? 'text-success' : inst.status === 'Blocked' ? 'text-danger' : inst.status === 'Partial' ? 'text-warning' : 'text-muted';
            const cell = grid.add({ css: 'bg-gray-50 rounded-lg p-3' });
            cell.add({ css: 'font-bold text-sm', script: inst.code });
            cell.add({ css: 'text-xs text-muted mb-2', script: inst.name });
            cell.add({ css: 'text-xs', script: `<span class="text-muted">Backend:</span> ${inst.backend}` });
            cell.add({ css: 'text-xs', script: `<span class="text-muted">Schema:</span> ${inst.schema}` });
            cell.add({ css: `text-xs font-medium mt-1 ${statusColor}`, script: inst.status });
        });

        // File structure
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Entry Point File Structure' });
        const filePre = card.add({ tag: 'pre', css: 'bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto' });
        filePre.domElement.textContent = `AutoScholar/
  ├── index.html          ← Root entry (reads ?inst= param)
  ├── dev.index.html      ← Root dev entry (auto-login)
  ├── dut/
  │   ├── config.json     ← DUT frontend config
  │   ├── index.html      ← DUT production entry
  │   └── dev.index.html  ← DUT dev entry
  ├── vut/                ← Same pattern for each institution
  ├── cput/
  ├── ukzn/
  ├── wits/
  └── Implementations-*/  ← Backend config (reference docs)`;
    }

    _renderMaturityAudit(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-clipboard-check text-success"></i> Maturity Audit (2026-02-28)' });

        const narrative = card.add({ css: 'text-sm text-gray-700 leading-relaxed mb-4' });
        narrative.add({ tag: 'p', script: 'AutoScholar underwent a comprehensive pipeline audit after the v3.1 entry point consolidation. The audit covers six dimensions: system maturity (L0-L5), test coverage (T0-T5), API readiness (A0-A5), deployment readiness (D0-D5), UI responsiveness, and binding/extension gaps. The consolidation significantly improved the active codebase — half the binding debt identified by the auditor now lives in legacy/ files that are no longer loaded.' });

        // Score dashboard - compact grid
        const scores = card.add({ css: 'grid grid-cols-2 md:grid-cols-5 gap-3 mb-5' });
        const scoreData = [
            { label: 'System', score: 'L4', detail: '21/22 checks', color: 'text-success' },
            { label: 'Tests', score: 'T4', detail: '204 tests, 9 specs', color: 'text-success' },
            { label: 'API', score: 'A0', detail: '8/12 checks', color: 'text-warning' },
            { label: 'Deploy', score: 'D2', detail: '5 impls, 2 active', color: 'text-info' },
            { label: 'Responsive', score: '100%', detail: '0 dead spots', color: 'text-success' }
        ];
        scoreData.forEach(s => {
            const cell = scores.add({ css: 'bg-gray-50 rounded-lg p-3 text-center' });
            cell.add({ css: `text-2xl font-bold ${s.color}`, script: s.score });
            cell.add({ css: 'text-xs font-medium', script: s.label });
            cell.add({ css: 'text-xs text-muted', script: s.detail });
        });

        // System maturity detail
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'System Maturity — L4' });
        const sysNarr = card.add({ css: 'text-sm text-gray-700 leading-relaxed mb-3' });
        sysNarr.add({ tag: 'p', script: 'All L3 and L4 checks pass. The single failing check is api_endpoints — the API readiness sub-score (A0) which requires server discoverability, webhooks, rate limiting, and custom routes. These are infrastructure-level concerns for production deployment, not blockers for the current development phase. Key metrics: 51 UIBinding references (threshold: 50), 122 inline styles (threshold: 2393), zero BlUi references, zero overflow-hidden, 318 raw DOM patterns balanced against 38 domain views and 265 workflow method calls.' });

        // API readiness
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'API Readiness — A0 (8/12)' });
        const apiNarr = card.add({ css: 'text-sm text-gray-700 leading-relaxed mb-3' });
        apiNarr.add({ tag: 'p', script: 'Eight checks pass: schema exists and loads, config has API URL, API binding is wired, auth is configured, OpenAPI spec is ready, API tests exist, and training docs exist. The four failures are all infrastructure: server not discoverable (no health endpoint), no webhook binding, no rate limiting, and no custom route definitions. These represent the gap between a working API integration and a production-hardened API layer.' });

        // Deployment
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Deployment — D2 (5 Implementations)' });
        const deployGrid = card.add({ css: 'grid grid-cols-1 md:grid-cols-5 gap-2 mb-3' });
        const deployData = [
            { inst: 'DUT', status: 'Active', color: 'text-success', note: 'Oracle/PHP backend' },
            { inst: 'VUT', status: 'Active', color: 'text-success', note: 'Production' },
            { inst: 'CPUT', status: 'Blocked', color: 'text-danger', note: '502 — SSH blocked' },
            { inst: 'WITS', status: 'Blocked', color: 'text-danger', note: 'Needs Cisco VPN' },
            { inst: 'UKZN', status: 'Dev', color: 'text-warning', note: 'Needs SMS adapter' }
        ];
        deployData.forEach(d => {
            const cell = deployGrid.add({ css: 'bg-gray-50 rounded-lg p-2 text-center' });
            cell.add({ css: 'font-semibold text-sm', script: d.inst });
            cell.add({ css: `text-xs font-medium ${d.color}`, script: d.status });
            cell.add({ css: 'text-xs text-muted', script: d.note });
        });

        // Binding debt — active vs legacy
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Binding Debt — Active vs Legacy' });
        const bindNarr = card.add({ css: 'text-sm text-gray-700 leading-relaxed mb-3' });
        bindNarr.add({ tag: 'p', script: 'The auditor identified 32 raw DOM patterns that could be replaced with UIBinding methods or ui components. The consolidation cut the active debt in half: 16 candidates remain in active code, while the other 16 are in legacy/ files that are no longer loaded. The active candidates are concentrated in two files: StudentResultsPanel (7 raw table builds that should use uiTable) and AssessmentStatsTest (4 raw tables + 2 progress bars). Two additional progress bar patterns exist in autoscholar.config.js and LoadingStateManager.' });

        const bindGrid = card.add({ css: 'grid grid-cols-3 gap-3 mb-3' });
        [
            { label: 'uiProgress', active: 5, legacy: 16 },
            { label: 'uiTable', active: 11, legacy: 0 },
            { label: 'Total', active: 16, legacy: 16 }
        ].forEach(b => {
            const cell = bindGrid.add({ css: 'bg-gray-50 rounded-lg p-3 text-center' });
            cell.add({ css: 'text-xs font-medium mb-1', script: b.label });
            cell.add({ css: 'text-sm', script: `<span class="text-warning font-semibold">${b.active}</span> active · <span class="text-muted">${b.legacy}</span> legacy` });
        });

        // Extension gaps
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Extension Gaps' });
        const extNarr = card.add({ css: 'text-sm text-gray-700 leading-relaxed mb-3' });
        extNarr.add({ tag: 'p', script: 'Three categories of extension needs were identified across the full codebase (including legacy). Status-color switches (100 instances) suggest that bindCollection and uiCard need a built-in statusField + colorMap option to eliminate repetitive ternary chains. Nine manual modal constructions indicate that bindEditor modal mode needs size and template passthrough to uiModal. And 161 hardcoded hex colors remain that should use --ui-* CSS variables — though many of these are legitimate (chart series colors, SVG attributes, data registries) or live in legacy files.' });

        // Score progression
        card.add({ tag: 'h3', css: 'text-lg font-semibold mt-5 mb-2', script: 'Score Progression' });
        const progNarr = card.add({ css: 'text-sm text-gray-700 leading-relaxed' });
        progNarr.add({ tag: 'p', script: 'The deep review took AutoScholar from L2 to L4 across six phases: foundation files (manifest, schema, seed), domain fixes (Counsellor live data, Admin real health, cross-module navigation), binding conversions (49 progress bars, 51 UIBinding refs), visual polish (762 to 123 hex colors, status-color utilities), UX improvements (tab standardization, dashboard density, notification center, API batching), and entry point consolidation (legacy modules moved, AutoScholarApp canonical). The only L5 blocker is API infrastructure — webhooks, rate limiting, and custom routes.' });
    }

    _renderServices(container) {
        const card = container.add({ css: 'card p-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-plug text-success"></i> Microservices' });

        // Standard Publon.Press services
        card.add({ css: 'text-xs text-muted uppercase tracking-wide mb-2', script: 'Standard Services' });
        const services = [
            { name: 'MemberService', key: 'member', desc: 'Users, roles, authentication' },
            { name: 'AuditService', key: 'audit', desc: 'Access and activity logs' },
            { name: 'TagService', key: 'tag', desc: 'Course/programme categorization' },
            { name: 'TreeService', key: 'tree', desc: 'Programme structure trees' },
            { name: 'GroupService', key: 'group', desc: 'Faculty/department permissions' },
            { name: 'MessagesService', key: 'messages', desc: 'Notifications and templates' },
            { name: 'EventService', key: 'event', desc: 'Calendar and scheduling' }
        ];

        const grid = card.add({ css: 'grid grid-cols-2 gap-2' });

        services.forEach(s => {
            const active = !!this.services[s.key];
            const row = grid.add({ css: 'flex items-center gap-2 py-1' });
            row.add({ tag: 'i', css: `fas fa-circle text-xs ${active ? 'text-success' : 'text-gray-300'}` });
            row.add({ css: 'text-sm', script: s.name });
        });

        // Domain MicroServices
        card.add({ css: 'text-xs text-muted uppercase tracking-wide mt-4 mb-2', script: 'Domain MicroServices' });
        const microGrid = card.add({ css: 'grid grid-cols-2 gap-2' });
        const microServices = [
            { name: 'CaseworkService', key: 'casework', desc: 'Cases, interventions, referrals' },
            { name: 'AcademicService', key: 'academic', desc: 'Programmes, courses, enrolments, results' },
            { name: 'ExecutiveService', key: 'executive', desc: 'Metrics, interventions, PDSA cycles' },
            { name: 'CareerService', key: 'career', desc: 'Profiles, CVs, opportunities' },
            { name: 'QualificationService', key: 'qualification', desc: 'Qualification mapping' }
        ];
        microServices.forEach(s => {
            const active = !!this.services[s.key];
            const row = microGrid.add({ css: 'flex items-center gap-2 py-1' });
            row.add({ tag: 'i', css: `fas fa-circle text-xs ${active ? 'text-success' : 'text-gray-300'}` });
            row.add({ css: 'text-sm', script: s.name });
        });
    }

    _renderDataSources(container) {
        const card = container.add({ css: 'card p-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-server text-info"></i> Data Sources' });

        const sources = [
            {
                name: 'Sample Data',
                status: !this.dataAdapter || this.dataAdapter.constructor.name === 'SampleDataAdapter',
                desc: '2 institutions, 12 students, 7 scenarios'
            },
            {
                name: 'Institution API',
                status: this.dataAdapter?.constructor.name === 'ApiDataAdapter',
                desc: 'DUT, CPUT, UKZN, VUT (configurable)'
            },
            {
                name: 'Publon.Press Backend',
                status: typeof ServiceBackend !== 'undefined',
                desc: 'DbBinding sync to PostgreSQL (as_* tables)'
            }
        ];

        sources.forEach(s => {
            const row = card.add({ css: 'flex items-center justify-between py-2 border-b border-gray-100 last:border-0' });
            const info = row.add({ css: '' });
            info.add({ css: 'font-medium text-sm', script: s.name });
            info.add({ css: 'text-xs text-muted', script: s.desc });
            if (typeof uiBadge !== 'undefined') {
                new uiBadge({ parent: row, label: s.status ? 'Active' : 'Inactive', color: s.status ? 'success' : 'secondary', size: 'sm' });
            }
        });
    }

    _renderRemainingWork(container) {
        const card = container.add({ css: 'card p-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-tasks text-warning"></i> Roadmap' });

        const priorities = {
            'Next Up': [
                'Production login page wired to AutoScholarApp (DUT, VUT, CPUT)',
                'Convert remaining raw tables in StudentResultsPanel to uiTable',
                'Hub tab for AutoScholarApp with navigation and live service metrics',
                'Role-based tab visibility (students see Student Central only)',
                'Extract Tests/ panel classes into proper module folders'
            ],
            'Medium Priority': [
                'Grade entry for lecturers directly in ClassView',
                'Concession approval workflow with admin comments and student notifications',
                'Programme structure versioning (formal vs estimated)',
                'Course statistics caching for faster class position queries',
                'Handbook parsing for official programme structures',
                'Events and attendance with PIN-based check-in'
            ],
            'Future': [
                'Additional institution API adapters (international universities)',
                'Accreditation AutoMate: graduate attribute mapping and compliance reports',
                'AI curriculum optimization from student outcome data',
                'API endpoints for L5 maturity (external system integration)',
                'Mobile responsive layout optimization'
            ]
        };

        const grid = card.add({ css: 'grid grid-cols-1 md:grid-cols-3 gap-4' });

        Object.entries(priorities).forEach(([priority, items]) => {
            const col = grid.add({ css: 'bg-gray-50 rounded-lg p-4' });
            const variant = priority === 'High Priority' ? 'danger' : priority === 'Medium Priority' ? 'warning' : 'secondary';
            if (typeof uiBadge !== 'undefined') {
                new uiBadge({ parent: col, label: priority, variant, size: 'sm' });
            } else {
                col.add({ css: 'font-medium text-sm mb-2', script: priority });
            }
            const list = col.add({ tag: 'ul', css: 'list-disc list-inside text-sm text-gray-600 space-y-1 mt-2' });
            items.forEach(item => list.add({ tag: 'li', script: item }));
        });

    }

    _renderDocumentation(container) {
        const card = container.add({ css: 'card p-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-book text-info"></i> Documentation' });

        const docs = [
            { icon: 'rocket', label: 'Quick Start Guide', file: 'QUICKSTART.md', desc: 'Get started in 10 minutes' },
            { icon: 'sitemap', label: 'Architecture', file: 'ARCHITECTURE.md', desc: 'System design and data flow' },
            { icon: 'shield-alt', label: 'Security', file: 'SECURITY.md', desc: 'Security configuration guide' },
            { icon: 'cog', label: 'Setup Guide', file: 'SETUP.md', desc: 'Installation and configuration' },
            { icon: 'users', label: 'Roles & Permissions', file: 'ROLES.md', desc: 'User roles and access control' }
        ];

        const list = card.add({ css: 'space-y-2' });

        docs.forEach(doc => {
            const row = list.add({ css: 'flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer' });
            row.add({ tag: 'i', css: `fas fa-${doc.icon} text-pri w-5` });
            const info = row.add({ css: 'flex-1' });
            info.add({ css: 'font-medium text-sm', script: doc.label });
            info.add({ css: 'text-xs text-muted', script: doc.desc });
            row.add({ tag: 'i', css: 'fas fa-external-link-alt text-xs text-muted' });

            row.domElement.addEventListener('click', () => {
                window.open(`/System/AutoScholar/docs/${doc.file}`, '_blank');
            });
        });

        // Additional resources
        card.add({ css: 'mt-4 pt-4 border-t' });
        const extraRow = card.add({ css: 'flex items-center justify-between text-sm' });
        extraRow.add({ css: 'text-muted', script: 'Full documentation' });
        const link = extraRow.add({ tag: 'a', css: 'text-pri hover:underline cursor-pointer', script: 'View all docs' });
        link.domElement.href = '/System/AutoScholar/docs/';
        link.domElement.target = '_blank';
    }

    _renderKeyboardShortcuts(container) {
        const card = container.add({ css: 'card p-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-keyboard text-success"></i> Keyboard Shortcuts' });

        // Get shortcuts from A11y if available
        const shortcuts = [];

        if (typeof AutoScholarA11y !== 'undefined' && AutoScholarA11y.shortcuts) {
            AutoScholarA11y.shortcuts.forEach((shortcut, key) => {
                if (shortcut.description) {
                    shortcuts.push({ key: key === ' ' ? 'Space' : key, desc: shortcut.description });
                }
            });
        }

        // Add standard shortcuts if none registered
        if (shortcuts.length === 0) {
            shortcuts.push(
                { key: '?', desc: 'Show keyboard shortcuts' },
                { key: 'h', desc: 'Go to Hub' },
                { key: '/', desc: 'Focus search' },
                { key: 'Escape', desc: 'Close modal' }
            );
        }

        // Shortcuts table
        const table = card.add({ tag: 'table', css: 'w-full' });

        shortcuts.slice(0, 5).forEach(s => {
            const row = table.add({ tag: 'tr', css: 'border-b border-gray-100' });
            const keyCell = row.add({ tag: 'td', css: 'py-2 pr-4' });
            keyCell.add({
                tag: 'kbd',
                css: 'px-2 py-1 bg-gray-100 border rounded text-xs font-mono',
                script: s.key
            });
            row.add({ tag: 'td', css: 'py-2 text-sm', script: s.desc });
        });

        // Standard navigation
        card.add({ css: 'mt-4 mb-2 text-sm font-medium text-muted', script: 'Standard Navigation' });
        const stdTable = card.add({ tag: 'table', css: 'w-full text-sm' });

        const standard = [
            { key: 'Tab', desc: 'Move to next element' },
            { key: 'Enter', desc: 'Activate button/link' },
            { key: 'Arrow keys', desc: 'Navigate within lists' }
        ];

        standard.forEach(s => {
            const row = stdTable.add({ tag: 'tr', css: 'border-b border-gray-100 last:border-0' });
            const keyCell = row.add({ tag: 'td', css: 'py-1 pr-4' });
            keyCell.add({
                tag: 'kbd',
                css: 'px-2 py-0.5 bg-gray-100 border rounded text-xs font-mono',
                script: s.key
            });
            row.add({ tag: 'td', css: 'py-1 text-sm text-muted', script: s.desc });
        });

        // Show all shortcuts button
        card.add({ css: 'mt-4 pt-4 border-t' });
        if (typeof uiButton !== 'undefined') {
            new uiButton({
                parent: card,
                label: 'View All Shortcuts',
                icon: 'list',
                variant: 'ghost',
                size: 'sm',
                onClick: () => {
                    if (typeof AutoScholarA11y !== 'undefined') {
                        AutoScholarA11y.showShortcutsHelp();
                    }
                }
            });
        }
    }

    _renderBindingRegistry(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-link text-pri"></i> UIBinding Registry' });

        card.add({ tag: 'p', css: 'text-sm text-gray-600 mb-4', script: 'AutoScholar uses 51+ UIBinding references across its modules. Every data-driven metric chip, progress bar, and status indicator flows through the reactive binding system, ensuring displays stay current as underlying data changes.' });

        const modules = [
            { name: 'Hub', icon: 'home', bindings: [
                'CaseworkService.case: bindMetric (active cases, resolved)',
                'CaseworkService.intervention: bindMetric (total interventions)',
                'CaseworkService.referral: bindMetric (total referrals)',
                'MemberService.member: bindMetric (users, active users)'
            ]},
            { name: 'Student Dashboard', icon: 'user-graduate', bindings: [
                'Mini-Publome KPI: bindMetric (GPA, credits earned, credits left, attendance, courses)'
            ]},
            { name: 'Student Progress', icon: 'chart-line', bindings: [
                'Mini-Publome KPI: bindMetric (year, credits earned, credits required, completion, GPA)'
            ]},
            { name: 'Counsellor', icon: 'hands-helping', bindings: [
                'CaseworkService.case: bindMetric (active, pending, resolved)',
                'CaseworkService.intervention: bindMetric (total, improved outcomes)',
                'CaseworkService.referral: bindMetric (total, attended)'
            ]},
            { name: 'Admin', icon: 'cogs', bindings: [
                'PublonBindings: bindSelectEditor (users, roles, settings, timetable, concessions, audit)'
            ]}
        ];

        const grid = card.add({ css: 'space-y-3' });
        modules.forEach(mod => {
            const row = grid.add({ css: 'bg-gray-50 rounded-lg p-3' });
            const header = row.add({ css: 'flex items-center gap-2 mb-1' });
            header.add({ tag: 'i', css: `fas fa-${mod.icon} text-pri` });
            header.add({ css: 'font-medium text-sm', script: mod.name });
            const list = row.add({ css: 'pl-6' });
            mod.bindings.forEach(b => {
                list.add({ css: 'text-xs text-gray-500 py-0.5', script: b });
            });
        });
    }

    _renderChangelog(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-history text-pri"></i> Release History' });

        const changelog = AutoScholarAbout.VERSION_INFO.changelog;

        if (typeof ElAccordion !== 'undefined') {
            const accordion = new ElAccordion({ parent: card, variant: 'bordered', exclusive: true });

            changelog.forEach((release, index) => {
                // Version type badge variant
                const typeVariant = release.type === 'major' ? 'danger' :
                    release.type === 'feature' ? 'primary' :
                    release.type === 'bugfix' ? 'success' : 'secondary';

                const title = `v${release.version} - ${release.title}`;
                const { header, body } = accordion.addItem({ title, expanded: index === 0 });

                // Add date and type badge to header
                const headerInfo = header.add({ css: 'flex items-center gap-2 ml-auto' });
                headerInfo.add({ css: 'text-xs text-muted', script: this._formatDate(release.date) });
                new uiBadge({ parent: headerInfo, label: release.type.charAt(0).toUpperCase() + release.type.slice(1), color: typeVariant, size: 'sm' });

                // Changes list
                const list = body.add({ tag: 'ul', css: 'list-disc list-inside text-sm text-gray-600 space-y-1' });
                release.changes.forEach(change => {
                    list.add({ tag: 'li', script: change });
                });
            });
        } else {
            // Fallback without accordion
            changelog.slice(0, 3).forEach(release => {
                const section = card.add({ css: 'mb-4 pb-4 border-b last:border-0' });
                section.add({ css: 'font-medium', script: `v${release.version} - ${release.title}` });
                section.add({ css: 'text-xs text-muted mb-2', script: this._formatDate(release.date) });
                const list = section.add({ tag: 'ul', css: 'list-disc list-inside text-sm text-gray-600 space-y-1' });
                release.changes.forEach(change => list.add({ tag: 'li', script: change }));
            });
        }
    }

    _renderSupport(container) {
        const card = container.add({ css: 'card p-6 mb-6' });
        card.add({ tag: 'h2', css: 'text-xl font-semibold mb-4 flex items-center gap-2', script: '<i class="fas fa-life-ring text-success"></i> Support & Contact' });

        const grid = card.add({ css: 'grid grid-cols-1 md:grid-cols-3 gap-6' });

        // System Information
        const sysInfo = grid.add({ css: 'bg-gray-50 rounded-lg p-4' });
        sysInfo.add({ css: 'font-medium text-sm mb-3 flex items-center gap-2', script: '<i class="fas fa-info-circle text-info"></i> System Information' });

        const infoList = sysInfo.add({ css: 'space-y-2 text-sm' });
        infoList.add({ css: 'flex justify-between', script: `<span class="text-muted">Version:</span> <span class="font-mono">v${AutoScholarAbout.VERSION_INFO.version}</span>` });
        infoList.add({ css: 'flex justify-between', script: `<span class="text-muted">Status:</span> <span>${AutoScholarAbout.VERSION_INFO.status}</span>` });
        infoList.add({ css: 'flex justify-between', script: `<span class="text-muted">Browser:</span> <span class="font-mono text-xs">${navigator.userAgent.split(' ').slice(-2).join(' ')}</span>` });
        infoList.add({ css: 'flex justify-between', script: `<span class="text-muted">Platform:</span> <span>${navigator.platform}</span>` });

        // Get Help
        const help = grid.add({ css: 'bg-gray-50 rounded-lg p-4' });
        help.add({ css: 'font-medium text-sm mb-3 flex items-center gap-2', script: '<i class="fas fa-question-circle text-warning"></i> Get Help' });

        const helpList = help.add({ css: 'space-y-3 text-sm' });

        const docLink = helpList.add({ css: 'flex items-center gap-2 cursor-pointer hover:text-pri' });
        docLink.add({ tag: 'i', css: 'fas fa-book w-4' });
        docLink.add({ script: 'Read the documentation' });
        docLink.domElement.addEventListener('click', () => window.open('/System/AutoScholar/docs/QUICKSTART.md', '_blank'));

        const shortcutLink = helpList.add({ css: 'flex items-center gap-2 cursor-pointer hover:text-pri' });
        shortcutLink.add({ tag: 'i', css: 'fas fa-keyboard w-4' });
        shortcutLink.add({ script: 'Press ? for keyboard shortcuts' });
        shortcutLink.domElement.addEventListener('click', () => {
            if (typeof AutoScholarA11y !== 'undefined') {
                AutoScholarA11y.showShortcutsHelp();
            }
        });

        const overviewLink = helpList.add({ css: 'flex items-center gap-2 cursor-pointer hover:text-pri' });
        overviewLink.add({ tag: 'i', css: 'fas fa-map w-4' });
        overviewLink.add({ script: 'System overview' });
        overviewLink.domElement.addEventListener('click', () => window.open('/System/AutoScholar/AutoScholar-overview.md', '_blank'));

        // Contact
        const contact = grid.add({ css: 'bg-gray-50 rounded-lg p-4' });
        contact.add({ css: 'font-medium text-sm mb-3 flex items-center gap-2', script: '<i class="fas fa-envelope text-pri"></i> Contact' });

        const contactList = contact.add({ css: 'space-y-3 text-sm' });

        const emailRow = contactList.add({ css: 'flex items-center gap-2' });
        emailRow.add({ tag: 'i', css: 'fas fa-at w-4 text-muted' });
        const emailLink = emailRow.add({ tag: 'a', css: 'text-pri hover:underline', script: 'support@publon.press' });
        emailLink.domElement.href = 'mailto:support@publon.press';

        const issueRow = contactList.add({ css: 'flex items-center gap-2' });
        issueRow.add({ tag: 'i', css: 'fas fa-bug w-4 text-muted' });
        issueRow.add({ css: 'text-muted', script: 'Report issues via Admin > Feedback' });

        const feedbackRow = contactList.add({ css: 'flex items-center gap-2' });
        feedbackRow.add({ tag: 'i', css: 'fas fa-lightbulb w-4 text-muted' });
        feedbackRow.add({ css: 'text-muted', script: 'Feature requests welcome' });

        // Footer
        container.add({ css: 'text-center text-sm text-muted mt-8 pt-4 border-t', script: '© 2026 Publon.Press • AutoScholar Academic Management System' });
    }
}


