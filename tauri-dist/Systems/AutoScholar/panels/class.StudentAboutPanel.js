/**
 * StudentAboutPanel - System Information and Feature Overview
 *
 * Provides:
 * - System info header (AutoScholar Student Central v2.0)
 * - Completed features checklist
 * - Remaining / recommendations list
 * - Architecture note
 * - Version info
 */
class StudentAboutPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
    }

    render(container) {
        // System header
        this._renderHeader(container);

        // Two-column layout: Completed + Remaining
        const mainGrid = container.add({ css: 'grid md:grid-cols-2 gap-4 mb-5' });
        this._renderCompletedFeatures(mainGrid);
        this._renderRemainingFeatures(mainGrid);

        // Implementation Plan (with live checkboxes)
        this._renderImplementationPlan(container);

        // Domain Debate Report
        this._renderDebateReport(container);

        // Architecture note
        this._renderArchitectureNote(container);

        // Version info
        this._renderVersionInfo(container);
    }

    // ── Header ──────────────────────────────────────────────────────

    _renderHeader(container) {
        const header = container.add({ css: 'mb-5' });
        const titleRow = header.add({ css: 'flex items-center gap-4 mb-3' });

        // Icon
        titleRow.add({ tag: 'i', css: 'fas fa-graduation-cap text-4xl text-primary' });

        const titleText = titleRow.add({});
        titleText.add({ tag: 'h1', css: 'text-2xl font-bold text-gray-800', script: 'AutoScholar Student Central' });
        const versionRow = titleText.add({ css: 'flex items-center gap-2 mt-1' });
        versionRow.add({ css: 'text-sm text-muted', script: 'Academic Management System v2.0' });
        if (typeof uiBadge !== 'undefined') {
            new uiBadge({ parent: versionRow, label: 'Stable', color: 'success', size: 'sm' });
        } else {
            versionRow.add({ css: 'px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700', script: 'Stable' });
        }

        // Description
        header.add({
            css: 'text-sm text-gray-600 leading-relaxed mt-2',
            script: 'AutoScholar Student Central provides students with a comprehensive academic management experience. Access your dashboard, results, schedule, career planning, and support resources all in one place.'
        });
    }

    // ── Completed Features ──────────────────────────────────────────

    _renderCompletedFeatures(container) {
        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-check-circle text-green-500' });
        header.add({ css: 'font-semibold', script: 'Completed Features' });

        const features = [
            { label: 'Dashboard', desc: 'KPIs, current semester, alerts, activity feed', done: true },
            { label: 'Results', desc: 'Full academic results with filtering and detail modals', done: true },
            { label: 'Schedule', desc: 'Timetable view with event integration', done: true },
            { label: 'Progress', desc: 'Credit tracking, GPA trends, graduation estimate', done: true },
            { label: 'Diary', desc: 'Study journal with goals and check-ins', done: true },
            { label: 'Goals', desc: 'Goal setting and progress tracking', done: true },
            { label: 'Career Hub', desc: 'CV builder, bursaries, job opportunities', done: true },
            { label: 'Support', desc: 'Case management, messaging, risk alerts, resources', done: true },
            { label: 'About', desc: 'System information and feature overview', done: true }
        ];

        const list = card.add({ css: 'space-y-2' });
        features.forEach(f => {
            const row = list.add({ css: 'flex items-start gap-3 p-2 rounded' });

            // Checkbox icon
            const iconCls = f.done ? 'fas fa-check-square text-green-500' : 'far fa-square text-gray-300';
            row.add({ tag: 'i', css: `${iconCls} mt-0.5` });

            const info = row.add({ css: 'flex-1' });
            info.add({ css: `text-sm font-medium ${f.done ? 'text-gray-800' : 'text-gray-400'}`, script: f.label });
            info.add({ css: 'text-xs text-muted', script: f.desc });
        });

        // Count
        const doneCount = features.filter(f => f.done).length;
        card.add({
            css: 'mt-3 pt-3 border-t text-sm text-muted text-center',
            script: `${doneCount}/${features.length} features complete`
        });
    }

    // ── Remaining / Recommendations ─────────────────────────────────

    _renderRemainingFeatures(container) {
        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-lightbulb text-amber-500' });
        header.add({ css: 'font-semibold', script: 'Remaining / Recommendations' });

        const items = [
            { label: 'Concession workflow', desc: 'Apply for exam concessions with approval tracking', priority: 'high' },
            { label: 'Attendance tracking', desc: 'PIN-based lecture check-ins and attendance reports', priority: 'high' },
            { label: 'Achievement badges', desc: 'Gamification with milestones and streaks', priority: 'medium' },
            { label: 'Notification center', desc: 'Centralized alerts for deadlines, results, messages', priority: 'high' },
            { label: 'Peer study groups', desc: 'Find and join study groups by course', priority: 'medium' },
            { label: 'Financial aid portal', desc: 'Bursary applications and financial aid status', priority: 'medium' },
            { label: 'Alumni mentoring', desc: 'Connect with alumni for career guidance', priority: 'low' },
            { label: 'Mobile views', desc: 'Optimized responsive layouts for phone access', priority: 'high' },
            { label: 'Accessibility audit', desc: 'WCAG 2.1 AA compliance verification', priority: 'medium' },
            { label: 'Export capabilities', desc: 'Download transcripts, reports as PDF/CSV', priority: 'medium' }
        ];

        const list = card.add({ css: 'space-y-2' });
        items.forEach(item => {
            const priorityColors = {
                high: 'bg-red-100 text-red-700',
                medium: 'bg-amber-100 text-amber-700',
                low: 'bg-blue-100 text-blue-700'
            };
            const pCls = priorityColors[item.priority] || priorityColors.medium;

            const row = list.add({ css: 'flex items-start gap-3 p-2 rounded' });
            row.add({ tag: 'i', css: 'far fa-circle text-gray-300 mt-0.5' });

            const info = row.add({ css: 'flex-1' });
            const labelRow = info.add({ css: 'flex items-center gap-2' });
            labelRow.add({ css: 'text-sm font-medium text-gray-700', script: item.label });
            labelRow.add({ css: `px-1.5 py-0.5 rounded text-xs font-medium ${pCls}`, script: item.priority });
            info.add({ css: 'text-xs text-muted', script: item.desc });
        });
    }

    // ── Implementation Plan ──────────────────────────────────────────

    static PLAN_TASKS = [
        // Phase 1A: Infrastructure
        { id: 'P1A-1', phase: '1A', group: 'Infrastructure', task: 'Add ApexCharts v3.49+ CDN to dev-dut.html', status: 'done', decision: 'ApexCharts over Plotly (112KB vs 1MB) — unanimous' },
        { id: 'P1A-2', phase: '1A', group: 'Infrastructure', task: 'Add FullCalendar v6 CDN to dev-dut.html', status: 'done', decision: 'FullCalendar for timetable (~45KB) — unanimous' },
        { id: 'P1A-3', phase: '1A', group: 'Infrastructure', task: 'Verify page loads with new CDNs', status: 'done' },
        // Phase 1B: Shell Restructure
        { id: 'P1B-1', phase: '1B', group: 'Shell Restructure', task: 'Replace card-grid nav with uiSidebar in StudentCentralPanel', status: 'done', decision: 'Sidebar nav over tabs — validated by Canvas, Blackboard, Ellucian' },
        { id: 'P1B-2', phase: '1B', group: 'Shell Restructure', task: 'Map 7 sidebar sections: Dashboard, Academics, Degree Map, Timetable, Finances, Support, About', status: 'done' },
        { id: 'P1B-3', phase: '1B', group: 'Shell Restructure', task: 'Wire sidebar navigate events to panel switching', status: 'done' },
        { id: 'P1B-4', phase: '1B', group: 'Shell Restructure', task: 'Create StudentFinancesPanel stub', status: 'done' },
        { id: 'P1B-5', phase: '1B', group: 'Shell Restructure', task: 'Create StudentDegreeMapPanel stub', status: 'done' },
        { id: 'P1B-6', phase: '1B', group: 'Shell Restructure', task: 'Remove persistent KPI hero row from shell (panels own their KPIs)', status: 'done' },
        // Phase 1C: Dashboard Redesign
        { id: 'P1C-1', phase: '1C', group: 'Dashboard Redesign', task: 'KPI chip row with Academic Momentum sparkline (ApexCharts area sparkline)', status: 'done', decision: 'Momentum sparkline in chip — 0 additional bytes, growth-mindset framing' },
        { id: 'P1C-2', phase: '1C', group: 'Dashboard Redesign', task: 'Small radial ring (80px) for semester completion', status: 'done' },
        { id: 'P1C-3', phase: '1C', group: 'Dashboard Redesign', task: 'Activity stream: upcoming deadlines with urgency badges', status: 'done', decision: 'Activity-stream-first dashboard — Practice Expert won (Canvas/GitHub pattern)' },
        { id: 'P1C-4', phase: '1C', group: 'Dashboard Redesign', task: 'Today\'s schedule section', status: 'done' },
        { id: 'P1C-5', phase: '1C', group: 'Dashboard Redesign', task: 'RAG indicators on all items', status: 'done' },
        // Phase 1D: Finances
        { id: 'P1D-1', phase: '1D', group: 'Finances Panel', task: 'NSFAS stepper tracker (CSS circles + connecting lines)', status: 'done', decision: 'Domino\'s Pizza Tracker pattern — non-negotiable for SA context' },
        { id: 'P1D-2', phase: '1D', group: 'Finances Panel', task: 'Account balance display', status: 'done' },
        { id: 'P1D-3', phase: '1D', group: 'Finances Panel', task: 'Payment history list', status: 'done' },
        // Phase 1E: Academics Enhancement
        { id: 'P1E-1', phase: '1E', group: 'Academics Enhancement', task: 'Credit progress stacked area with NSFAS minimum, on-time, and distinction bands', status: 'done', decision: 'NSFAS-aware progress — Novelty Agent\'s strongest accepted proposal' },
        { id: 'P1E-2', phase: '1E', group: 'Academics Enhancement', task: 'RAG indicators on module list', status: 'done' },
        { id: 'P1E-3', phase: '1E', group: 'Academics Enhancement', task: 'GPA trend area chart (ApexCharts)', status: 'done' },
        // Phase 1F: Degree Map
        { id: 'P1F-1', phase: '1F', group: 'Degree Map Panel', task: 'ApexCharts treemap of credits by year/module/status', status: 'done', decision: 'Treemap over force-directed — deterministic, mobile-friendly, 0 extra bytes' },
        { id: 'P1F-2', phase: '1F', group: 'Degree Map Panel', task: 'Block-based requirement audit (Degree Works pattern)', status: 'done' },
        { id: 'P1F-3', phase: '1F', group: 'Degree Map Panel', task: 'Plan Ahead what-if calculator (client-side arithmetic)', status: 'done', decision: 'Simplified from Digital Twin — pure arithmetic, no Monte Carlo in Phase 1' },
        // Phase 1G: Verification
        { id: 'P1G-1', phase: '1G', group: 'Verification', task: 'All panels load without JS errors', status: 'done' },
        { id: 'P1G-2', phase: '1G', group: 'Verification', task: 'Screenshot all views', status: 'done' },
        { id: 'P1G-3', phase: '1G', group: 'Verification', task: 'Check off completed items in About section', status: 'done' },
        // Phase 1H: Real Data Integration (Audit 1 March 2026)
        { id: 'P1H-1', phase: '1H', group: 'Real Data Integration', task: 'Fix firstNames parsing — DUT API returns "firstNames" not "firstName"', status: 'done', decision: 'Added firstNames to parsing chain + title-case normalization' },
        { id: 'P1H-2', phase: '1H', group: 'Real Data Integration', task: 'Pass studentData to panel constructors in _switchPanel()', status: 'done', decision: 'All panels now receive studentData via config object' },
        { id: 'P1H-3', phase: '1H', group: 'Real Data Integration', task: 'Dashboard: use real identity + registrations when results unavailable', status: 'done', decision: 'Added _studentFromIdentity() + _coursesFromRegistrations() fallback chain' },
        { id: 'P1H-4', phase: '1H', group: 'Real Data Integration', task: 'Academics: use real student name even without results data', status: 'done', decision: 'Split _hasRealIdentity from _hasRealData; name shows from identity, marks from results' },
        { id: 'P1H-5', phase: '1H', group: 'Real Data Integration', task: 'Degree Map: derive treemap modules from real results data', status: 'done', decision: 'Added _modulesFromApi(), _getAuditBlocks(), _getPlannerStats(), _getEnrolledModules()' },
        { id: 'P1H-6', phase: '1H', group: 'Real Data Integration', task: 'Finances: show "No financial data from API" instead of fake NSFAS data', status: 'done', decision: 'DUT API has no finance endpoints — shows explanatory message per Rule #45' },
        { id: 'P1H-7', phase: '1H', group: 'Real Data Integration', task: 'Support: remove login gate, show contact info always', status: 'done', decision: 'Shows resources + DUT contact info regardless of login state' },
        { id: 'P1H-8', phase: '1H', group: 'Real Data Integration', task: 'Verify all panels with real data — zero hardcoded fallbacks visible', status: 'done', decision: 'Playwright test: 0 JS errors, 0 demo names detected (Cameron Smith / 21906044)' },
        { id: 'P1H-9', phase: '1H', group: 'Real Data Integration', task: 'Career Hub: overlay real student identity on sample profile', status: 'done', decision: 'Added _overlayRealIdentity() — real name, email, programme; fake contact info cleared' },
        { id: 'P1H-10', phase: '1H', group: 'Real Data Integration', task: 'Portfolio: use real student name in header and badge', status: 'done', decision: 'Added _getStudentLabel() using studentData when available' },
        // Phase 2 (Future)
        { id: 'P2-1', phase: '2', group: 'Phase 2 (Future)', task: 'Semester Wrapped: end-of-semester narrative recap with WhatsApp sharing', status: 'pending' },
        { id: 'P2-2', phase: '2', group: 'Phase 2 (Future)', task: 'Degree Constellation: force-directed module graph using graph service', status: 'pending' },
        { id: 'P2-3', phase: '2', group: 'Phase 2 (Future)', task: 'Plan Ahead enhanced with simulation logic (prerequisite chains)', status: 'pending' },
        { id: 'P2-4', phase: '2', group: 'Phase 2 (Future)', task: 'Achievement badges and streak gamification', status: 'pending' },
        { id: 'P2-5', phase: '2', group: 'Phase 2 (Future)', task: 'FullCalendar timetable integration (replacing current schedule view)', status: 'pending' },
        { id: 'P2-6', phase: '2', group: 'Phase 2 (Future)', task: 'Notification centre with push support', status: 'pending' }
    ];

    _renderImplementationPlan(container) {
        const card = container.add({ css: 'card p-5 mb-5' });

        // Header
        const header = card.add({ css: 'flex items-center gap-3 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-tasks text-2xl text-primary' });
        const titleBlock = header.add({});
        titleBlock.add({ tag: 'h2', css: 'text-xl font-bold text-gray-800', script: 'Implementation Plan' });
        titleBlock.add({ css: 'text-sm text-muted', script: 'Based on 3-agent domain debate synthesis \u2022 Phased delivery' });

        // Summary stats
        const tasks = StudentAboutPanel.PLAN_TASKS;
        const done = tasks.filter(t => t.status === 'done').length;
        const total = tasks.length;
        const phase1 = tasks.filter(t => t.phase !== '2');
        const phase1Done = phase1.filter(t => t.status === 'done').length;

        const statsRow = card.add({ css: 'flex flex-wrap gap-3 mb-4' });
        const addStat = (label, value, color) => {
            const chip = statsRow.add({ css: `p-2 rounded text-center ${color}` });
            chip.add({ css: 'text-lg font-bold', script: value });
            chip.add({ css: 'text-xs text-muted', script: label });
        };
        addStat('Phase 1 Progress', `${phase1Done}/${phase1.length}`, 'bg-green-50');
        addStat('Total Tasks', `${done}/${total}`, 'bg-blue-50');
        addStat('Library Budget', '157KB', 'bg-amber-50');
        addStat('New Dependencies', '2', 'bg-purple-50');

        // Progress bar
        const pct = Math.round((phase1Done / phase1.length) * 100);
        const barOuter = card.add({ css: 'w-full bg-gray-200 rounded-full h-2 mb-4' });
        const barInner = barOuter.add({ css: `h-2 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}` });
        (barInner.domElement || barInner).setAttribute('style', 'width:' + pct + '%');

        // Group tasks by phase/group
        let currentGroup = '';
        const list = card.add({ css: 'space-y-1' });

        tasks.forEach(t => {
            if (t.group !== currentGroup) {
                currentGroup = t.group;
                const groupHeader = list.add({ css: 'flex items-center gap-2 pt-3 pb-1' });
                const phaseColor = t.phase === '2' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
                groupHeader.add({ css: `px-2 py-0.5 rounded text-xs font-medium ${phaseColor}`, script: `Phase ${t.phase}` });
                groupHeader.add({ css: 'text-sm font-semibold text-gray-700', script: t.group });
            }

            const row = list.add({ css: 'flex items-start gap-2 pl-4 py-0.5' });
            const iconCls = t.status === 'done'
                ? 'fas fa-check-square text-green-500'
                : 'far fa-square text-gray-300';
            row.add({ tag: 'i', css: `${iconCls} mt-0.5 text-sm` });

            const content = row.add({ css: 'flex-1' });
            const taskRow = content.add({ css: 'flex items-center gap-2' });
            taskRow.add({
                css: `text-sm ${t.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-800'}`,
                script: t.task
            });
            taskRow.add({ css: 'text-xs text-muted', script: t.id });

            if (t.decision) {
                content.add({ css: 'text-xs text-muted italic pl-0', script: '\u2192 ' + t.decision });
            }
        });
    }

    // ── Domain Debate Report ─────────────────────────────────────────

    _renderDebateReport(container) {
        const wrapper = container.add({ css: 'mb-5' });

        // ── Report Header ──
        const reportHeader = wrapper.add({ css: 'card p-5 mb-4' });
        const titleRow = reportHeader.add({ css: 'flex items-center gap-3 mb-3' });
        titleRow.add({ tag: 'i', css: 'fas fa-comments text-2xl text-primary' });
        const titleText = titleRow.add({});
        titleText.add({ tag: 'h2', css: 'text-xl font-bold text-gray-800', script: 'Domain Debate Report: Student Central' });
        titleText.add({ css: 'text-sm text-muted', script: '3-Agent Debate \u2022 3 Rounds \u2022 1 March 2026' });

        reportHeader.add({
            css: 'text-sm text-gray-600 leading-relaxed mt-3',
            script: 'Three specialist agents \u2014 a Tools Scout, a Practice Expert, and a Novelty Agent \u2014 debated the optimal design for Student Central across three rounds. The Tools Scout hunted for the best libraries and visual components. The Practice Expert studied how Canvas, Blackboard, Degree Works, and other gold-standard products work. The Novelty Agent pushed for publishable innovations that address South Africa\'s throughput crisis. This report synthesizes their converged recommendations.'
        });

        // Agent badges
        const badges = reportHeader.add({ css: 'flex flex-wrap gap-2 mt-3' });
        const agentDefs = [
            { label: 'Tools Scout', icon: 'fa-wrench', color: 'bg-blue-100 text-blue-700' },
            { label: 'Practice Expert', icon: 'fa-building', color: 'bg-green-100 text-green-700' },
            { label: 'Novelty Agent', icon: 'fa-lightbulb', color: 'bg-purple-100 text-purple-700' }
        ];
        agentDefs.forEach(a => {
            const badge = badges.add({ css: `flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${a.color}` });
            badge.add({ tag: 'i', css: `fas ${a.icon}` });
            badge.add({ tag: 'span', script: a.label });
        });

        // ── Section 1: Unanimous Consensus ──
        this._renderDebateSection(wrapper, {
            icon: 'fa-handshake',
            iconColor: 'text-green-500',
            title: 'Unanimous Consensus',
            intro: 'All three agents converged on these decisions after three rounds of debate. These are settled and non-negotiable.',
            items: [
                {
                    heading: 'ApexCharts replaces Plotly.js',
                    body: 'ApexCharts (~112KB gzip) replaces Plotly.js (~1MB gzip) as the sole charting library. It covers every chart type needed: radialBar, area, sparkline, heatmap, treemap, boxPlot, bar, stacked area, and radar. The 843KB saving is critical for DUT students on prepaid mobile data. No second charting library is justified.'
                },
                {
                    heading: 'FullCalendar v6 for timetable',
                    body: 'FullCalendar v6 (~45KB gzip) handles the weekly schedule view with timeGridWeek for desktop and listWeek for mobile. It supports color-coded lecture blocks, assessment deadline overlays, and venue information. Purpose-built and well-maintained.'
                },
                {
                    heading: 'Sidebar navigation, not tabs',
                    body: 'Based on Canvas (30M+ users), Blackboard Ultra, and Ellucian Experience, sidebar navigation is the proven pattern for student portals with 7+ functional areas. It collapses to a hamburger menu on mobile, matching how Canvas and Blackboard handle responsive layout.'
                },
                {
                    heading: 'KPI chip row with sparklines',
                    body: 'A compact row of metric chips at the dashboard top showing GPA (with trend sparkline), credits earned, semester completion (small radial ring), and NSFAS status. The sparkline-in-chip pattern is validated by Stripe Dashboard, Shopify Admin, and Datadog. ApexCharts sparkline mode enables this at zero additional bytes.'
                },
                {
                    heading: 'RAG (Red/Amber/Green) status indicators',
                    body: 'Every module, deadline, and academic standing carries a RAG indicator. Green = on track, Amber = at risk, Red = action needed. This is the universal triage language used by 93% of four-year institutions with early alert systems. CSS-only implementation, zero library cost.'
                },
                {
                    heading: 'Mobile-first, data-light design',
                    body: 'DUT students access digital services primarily via mobile phones on prepaid data. Total new library budget: ~157KB gzip. ApexCharts uses SVG (crisp on all screen densities). FullCalendar has built-in responsive breakpoints. Every view must work on a 5-inch screen.'
                },
                {
                    heading: 'Semester Wrapped as an engagement feature',
                    body: 'Inspired by Spotify Wrapped (156M shares in 2023), an end-of-semester narrative recap shows: modules completed, GPA change, busiest study week, strongest subject, cohort percentile. Uses existing ApexCharts types in a sequenced card reveal. Zero additional bytes. Seasonal feature (appears post-exam).'
                },
                {
                    heading: 'Total library budget under 200KB',
                    body: 'ApexCharts (112KB) + FullCalendar (45KB) = 157KB gzip total. 43KB headroom for future needs. On 3G, this loads in under 1 second. On 2G worst-case, about 3 seconds. No React, no D3, no build step \u2014 CDN script tags only.'
                }
            ]
        });

        // ── Section 2: Resolved Disputes ──
        this._renderDebateSection(wrapper, {
            icon: 'fa-gavel',
            iconColor: 'text-amber-500',
            title: 'Resolved Disputes',
            intro: 'These points were debated across rounds. The resolution reflects the strongest argument from the winning position.',
            items: [
                {
                    heading: 'Central dashboard element: Activity stream wins',
                    body: 'DISPUTE: Tools Scout wanted a large radialBar ring as the central visual. Practice Expert wanted an activity-stream-first dashboard. Novelty Agent wanted a heartbeat sparkline. RESOLUTION: Activity stream as primary (Canvas, Blackboard, GitHub, Google Classroom all lead with actionable feeds). A compact 80px radial ring sits in the KPI chip row as a glanceable accent \u2014 prominent but not dominant. Students need to answer "what do I need to do today?" within 3 seconds of landing. The stream answers that; a chart does not.'
                },
                {
                    heading: 'Academic Heartbeat renamed to Academic Momentum',
                    body: 'DISPUTE: Novelty Agent proposed an ECG-style waveform. Practice Expert rejected medical metaphors as anxiety-inducing (UNISA removed health metaphors after focus groups). RESOLUTION: Renamed to "Academic Momentum" \u2014 a 7-point sparkline in a KPI chip showing whether marks are rising, steady, or cooling. Uses growth-mindset framing. ApexCharts area sparkline at zero additional bytes. The insight (trend matters more than snapshot) is preserved; the clinical framing is eliminated.'
                },
                {
                    heading: 'Resilience trajectory: Stacked area accepted for advisor view only',
                    body: 'DISPUTE: Novelty Agent proposed a Sankey flow of student survival states. Practice Expert rejected it entirely \u2014 visualizing historical failure is harmful. Tools Scout proposed stacked area as cheaper alternative. RESOLUTION: A stacked area chart showing credit accumulation against NSFAS minimum pace, on-time graduation pace, and distinction pace is included in the Academics view. It is labeled "Credit Progress" (not "Resilience"). The personal line shows the student where they stand relative to funding thresholds \u2014 this is genuinely novel and directly relevant to NSFAS compliance. The cohort-level Sankey is dropped.'
                },
                {
                    heading: 'Degree visualization: Treemap, not force-directed constellation',
                    body: 'DISPUTE: Novelty Agent wanted a force-directed prerequisite galaxy (requires D3-force, ~30KB). All agents agreed to reject. RESOLUTION: ApexCharts treemap shows hierarchical credit distribution (Year > Module > Credits) color-coded by completion status. Deterministic layout, mobile-friendly, touch-friendly, zero additional bytes. Force-directed graph moved to Phase 2 using existing graph service.'
                },
                {
                    heading: 'Digital Twin Simulator: Simplified to "What-If Calculator"',
                    body: 'DISPUTE: Novelty Agent wanted Monte Carlo simulation. Practice Expert said data infrastructure not ready. RESOLUTION: Renamed to "Plan Ahead" \u2014 a client-side calculator where students select remaining modules, input estimated marks, and see projected GPA and graduation status. Pure arithmetic using transcript data already on the page. No server calls, no ML, no external libraries. Phase 1 with real data; simulation logic can be added in Phase 2 when prerequisite chain data is available.'
                },
                {
                    heading: 'NSFAS financial stepper: Non-negotiable in v1',
                    body: 'Practice Expert championed a Domino\'s-style tracker for NSFAS status (Applied \u2192 Verified \u2192 Approved \u2192 Disbursed). At DUT, 70%+ of students depend on NSFAS and "where is my funding?" is the #1 support query. Built with pure CSS (flexbox circles + connecting lines). Finances is a top-level sidebar section, not buried in a sub-tab.'
                },
                {
                    heading: 'Diary/reflection: Excluded from Student Central',
                    body: 'DISPUTE: Novelty Agent proposed sentiment-aware journaling. Practice Expert rejected it citing <5% voluntary adoption across all LMS journal features globally, POPIA special-category data risks, and role confusion between academic tracking and mental health intervention. RESOLUTION: Excluded entirely. Semester Wrapped covers the reflection use case at semester end. Dedicated wellness applications (Wysa, Woebot, university counseling portals) are the appropriate venue for emotional tracking.'
                }
            ]
        });

        // ── Section 3: Final Architecture ──
        const archCard = wrapper.add({ css: 'card p-5 mb-4' });
        const archHeader = archCard.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        archHeader.add({ tag: 'i', css: 'fas fa-layer-group text-blue-500' });
        archHeader.add({ css: 'font-semibold text-lg', script: 'Final Architecture: Sidebar & Views' });

        archCard.add({
            css: 'text-sm text-gray-600 leading-relaxed mb-4',
            script: 'The sidebar follows the mental model of a student\'s actual weekly priorities (validated by Nielsen Norman Group university UX research). Students visit in this order: "What\'s happening now?" \u2192 "How am I doing?" \u2192 "Where do I need to be?" \u2192 "Can I afford it?"'
        });

        const sidebarTable = [
            { section: 'Dashboard', icon: 'fa-home', desc: 'Activity stream, KPI chips, today\'s schedule, upcoming deadlines' },
            { section: 'Academics', icon: 'fa-graduation-cap', desc: 'Current modules with RAG, marks table, GPA trend, credit progress (stacked area with NSFAS bands)' },
            { section: 'Degree Map', icon: 'fa-sitemap', desc: 'Treemap of credit distribution, block-based requirement audit (Degree Works pattern), "Plan Ahead" calculator' },
            { section: 'Timetable', icon: 'fa-calendar-alt', desc: 'FullCalendar weekly view, exam timetable, assessment deadline overlay' },
            { section: 'Finances', icon: 'fa-wallet', desc: 'NSFAS stepper tracker, account balance, payment history' },
            { section: 'Support', icon: 'fa-life-ring', desc: 'Academic advisor contact, faculty contacts, help resources, registration status' },
            { section: 'Semester Wrapped', icon: 'fa-gift', desc: 'End-of-semester narrative recap (seasonal, appears post-exam)' }
        ];

        const tableEl = archCard.add({ css: 'space-y-2' });
        sidebarTable.forEach((row, i) => {
            const rowEl = tableEl.add({ css: `flex items-start gap-3 p-2 rounded ${i % 2 === 0 ? 'bg-gray-50' : ''}` });
            rowEl.add({ tag: 'i', css: `fas ${row.icon} text-primary mt-0.5 w-5 text-center` });
            const info = rowEl.add({ css: 'flex-1' });
            info.add({ css: 'text-sm font-semibold text-gray-800', script: row.section });
            info.add({ css: 'text-xs text-muted', script: row.desc });
        });

        // ── Section 4: Technology Stack ──
        const techCard = wrapper.add({ css: 'card p-5 mb-4' });
        const techHeader = techCard.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        techHeader.add({ tag: 'i', css: 'fas fa-microchip text-green-500' });
        techHeader.add({ css: 'font-semibold text-lg', script: 'Technology Stack' });

        const stackItems = [
            { lib: 'ApexCharts', size: '~112KB gzip', role: 'All charts: radialBar, area, sparkline, heatmap, treemap, boxPlot, bar, radar' },
            { lib: 'FullCalendar v6', size: '~45KB gzip', role: 'Timetable: day, week, and list views with assessment overlay' },
            { lib: 'Publon.Press UI', size: '0 (existing)', role: 'uiSidebar, uiStepper, bindMetric, bindCollection, uiTable' },
            { lib: 'UIBinding', size: '0 (existing)', role: 'Data-UI bridge for all interactive panels' },
            { lib: 'CSS-only stepper', size: '0', role: 'NSFAS status tracker (flexbox circles + lines)' }
        ];

        const stackGrid = techCard.add({ css: 'space-y-2' });
        stackItems.forEach(item => {
            const row = stackGrid.add({ css: 'flex items-start gap-3 p-2 bg-gray-50 rounded' });
            const label = row.add({ css: 'w-32 flex-shrink-0' });
            label.add({ css: 'text-sm font-semibold text-gray-800', script: item.lib });
            label.add({ css: 'text-xs text-muted', script: item.size });
            row.add({ css: 'flex-1 text-xs text-gray-600', script: item.role });
        });

        const totalRow = techCard.add({ css: 'mt-3 pt-3 border-t flex items-center gap-2' });
        totalRow.add({ tag: 'i', css: 'fas fa-weight text-primary' });
        totalRow.add({ css: 'text-sm font-semibold', script: 'Total external dependencies: ~157KB gzip' });
        totalRow.add({ css: 'text-xs text-muted', script: '(replacing Plotly.js at ~1MB \u2014 net saving of 843KB)' });

        // Rejected libraries
        techCard.add({ css: 'mt-3 text-xs text-muted', script: 'Rejected: Plotly.js (10x too heavy), D3.js (too low-level), Cal-Heatmap (D3 dependency), vis-network (overkill), Chart.js (fewer chart types than ApexCharts), Reactive Resume (full app, not embeddable).' });

        // ── Section 5: Novel Features ──
        const novelCard = wrapper.add({ css: 'card p-5 mb-4' });
        const novelHeader = novelCard.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        novelHeader.add({ tag: 'i', css: 'fas fa-flask text-purple-500' });
        novelHeader.add({ css: 'font-semibold text-lg', script: 'Novel Features & Research Angles' });

        novelCard.add({
            css: 'text-sm text-gray-600 leading-relaxed mb-4',
            script: 'Three features survive the debate as genuinely novel \u2014 each uses zero additional libraries, lives inside proven patterns, and produces a publishable research contribution targeting South Africa\'s throughput crisis (only 36.9% of students complete in minimum time).'
        });

        const novelFeatures = [
            {
                phase: 'Phase 1',
                name: 'Academic Momentum',
                desc: 'A sparkline-in-chip showing whether marks are rising, steady, or cooling. Turns a static GPA number into a directional signal. The insight: trend matters more than snapshot.',
                paper: '"Momentum-framed micro-visualizations for academic self-regulation in South African higher education" \u2014 LAK / British Journal of Educational Technology',
                bytes: '0 additional'
            },
            {
                phase: 'Phase 1',
                name: 'NSFAS-Aware Credit Progress',
                desc: 'A stacked area chart showing credit accumulation against three reference bands: NSFAS minimum pace, on-time graduation, and distinction. Students see whether they\'re on track to keep their funding.',
                paper: '"Funding-aware progress visualization: Integrating financial aid thresholds into academic dashboards at a University of Technology" \u2014 Computers & Education / SAJHE',
                bytes: '0 additional'
            },
            {
                phase: 'Phase 1',
                name: 'Plan Ahead Calculator',
                desc: 'A client-side what-if calculator. Students select remaining modules, input estimated marks, and see projected GPA and graduation status. Pure arithmetic, no server calls.',
                paper: '"Lightweight curricular simulation in resource-constrained learning analytics deployments" \u2014 Journal of Learning Analytics',
                bytes: '0 additional'
            },
            {
                phase: 'Phase 2',
                name: 'Semester Wrapped',
                desc: 'End-of-semester Spotify-Wrapped-style narrative recap. Shareable to WhatsApp. Modules completed, GPA arc, busiest week, strongest subject, cohort percentile.',
                paper: '"Reflective analytics: Temporally-bounded summative dashboards for undergraduate engagement" \u2014 Computers & Education',
                bytes: '0 additional'
            },
            {
                phase: 'Phase 2',
                name: 'Degree Constellation',
                desc: 'Force-directed graph of modules as nodes, prerequisites as edges. Uses existing graph service. Spatial understanding of degree structure.',
                paper: '"Spatial curriculum mapping with force-directed degree visualization for student wayfinding" \u2014 IEEE VIS Education / SIGCSE',
                bytes: '0 (uses existing graph service)'
            }
        ];

        novelFeatures.forEach(f => {
            const fCard = novelCard.add({ css: 'p-3 border rounded-lg mb-3' });
            const fHeader = fCard.add({ css: 'flex items-center gap-2 mb-2' });
            const phaseColor = f.phase === 'Phase 1' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
            fHeader.add({ css: `px-2 py-0.5 rounded text-xs font-medium ${phaseColor}`, script: f.phase });
            fHeader.add({ css: 'text-sm font-semibold text-gray-800', script: f.name });
            fHeader.add({ css: 'ml-auto text-xs text-muted', script: f.bytes });
            fCard.add({ css: 'text-sm text-gray-600 leading-relaxed mb-2', script: f.desc });
            const paperRow = fCard.add({ css: 'flex items-start gap-1.5' });
            paperRow.add({ tag: 'i', css: 'fas fa-file-alt text-xs text-muted mt-1' });
            paperRow.add({ css: 'text-xs text-muted italic', script: f.paper });
        });

        // ── Section 6: Gold Standard Products Referenced ──
        const refCard = wrapper.add({ css: 'card p-5 mb-4' });
        const refHeader = refCard.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        refHeader.add({ tag: 'i', css: 'fas fa-trophy text-amber-500' });
        refHeader.add({ css: 'font-semibold text-lg', script: 'Gold Standard Products Referenced' });

        refCard.add({
            css: 'text-sm text-gray-600 leading-relaxed mb-3',
            script: 'Every design decision in this report is grounded in a named product. The Practice Expert surveyed these platforms and extracted the patterns that Student Central must match or exceed.'
        });

        const products = [
            { name: 'Canvas LMS', pattern: 'Activity stream dashboard, card-based course view, unified calendar, persistent sidebar' },
            { name: 'Blackboard Ultra', pattern: 'Temporal activity categorization (Important > Today > This Week > Recent), stream-first design' },
            { name: 'Ellucian Experience', pattern: 'Card-based widget dashboard, role-based personalization, cross-system integration' },
            { name: 'Degree Works', pattern: 'Block-based requirement audit with progress bars, What-If major change analysis' },
            { name: 'Pathify', pattern: 'Hero metrics bar + personalized activity feed, proactive information surfacing' },
            { name: 'Handshake', pattern: 'Profile-driven recommendation engine, skills profile, personalized job feed' },
            { name: 'iEnabler (DUT current)', pattern: 'Baseline to improve upon \u2014 transactional, no analytics, no engagement layer' },
            { name: 'Spotify Wrapped', pattern: 'End-of-period narrative data recap, shareable identity cards, engagement through personalization' },
            { name: 'Notion / Todoist', pattern: 'Streak counting, activity heatmaps, hierarchical task organization, gamified consistency' },
            { name: 'Google Classroom', pattern: 'Stream-first design, assignment cards with due dates, mobile-first layout' }
        ];

        const prodGrid = refCard.add({ css: 'grid md:grid-cols-2 gap-2' });
        products.forEach(p => {
            const pEl = prodGrid.add({ css: 'flex items-start gap-2 p-2 bg-gray-50 rounded' });
            pEl.add({ tag: 'i', css: 'fas fa-star text-amber-400 mt-0.5 text-xs' });
            const pInfo = pEl.add({ css: 'flex-1' });
            pInfo.add({ css: 'text-xs font-semibold text-gray-800', script: p.name });
            pInfo.add({ css: 'text-xs text-muted', script: p.pattern });
        });

        // ── Section 7: SA Context ──
        const saCard = wrapper.add({ css: 'card p-5 mb-4' });
        const saHeader = saCard.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        saHeader.add({ tag: 'i', css: 'fas fa-map-marker-alt text-red-500' });
        saHeader.add({ css: 'font-semibold text-lg', script: 'South African Higher Education Context' });

        saCard.add({
            css: 'text-sm text-gray-600 leading-relaxed',
            script: 'Student Central is designed for a specific context that demands specific design decisions. DUT serves a student population where 60%+ are first-generation university attendees, financial exclusion causes more dropouts than academic failure, and the gap between "enrolled" and "graduated" is a national crisis. Only 36.9% of South African students complete in minimum time, rising to 58.1% after six years. Black students complete at 53.5% versus 71.6% for white students. NSFAS-funded students \u2014 predominantly first-generation, from disadvantaged backgrounds \u2014 actually outperform non-NSFAS students, suggesting the bottleneck is not ability but visibility, self-regulation, and timely intervention. This is exactly the space where the novel features (momentum sparklines, NSFAS-aware progress bands, what-if calculators) can make a measurable difference. A conventional portal that merely displays grades and timetables is not just unambitious \u2014 it fails the students who most need the analytics layer that Student Central uniquely provides.'
        });

        // Key stats
        const statsRow = saCard.add({ css: 'flex flex-wrap gap-3 mt-3' });
        const stats = [
            { label: 'Min-time completion', value: '36.9%' },
            { label: '6-year completion', value: '58.1%' },
            { label: 'NSFAS dependency', value: '~70%' },
            { label: 'Mobile-primary access', value: '80%+' }
        ];
        stats.forEach(s => {
            const chip = statsRow.add({ css: 'p-2 bg-red-50 rounded text-center' });
            chip.add({ css: 'text-lg font-bold text-red-700', script: s.value });
            chip.add({ css: 'text-xs text-muted', script: s.label });
        });

        // ── Section 8: Dashboard Mockup ──
        const mockCard = wrapper.add({ css: 'card p-5 mb-4' });
        const mockHeader = mockCard.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        mockHeader.add({ tag: 'i', css: 'fas fa-desktop text-blue-500' });
        mockHeader.add({ css: 'font-semibold text-lg', script: 'Converged Dashboard Mockup' });

        const mockPre = mockCard.add({
            tag: 'pre',
            css: 'bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-auto'
        });
        (mockPre.domElement || mockPre).textContent = [
            '+============================================================================+',
            '|  STUDENT CENTRAL                                    Sipho Ndlovu  [photo]  |',
            '+============================================================================+',
            '|  SIDE  |  KPI CHIPS                                                        |',
            '|  BAR   |  [@ 67%] [Momentum 71 ~~~\u2197] [GPA 3.2 +0.3] [NSFAS: Approved]     |',
            '|        |                                                                    |',
            '|  Dash  |  TODAY \u2014 Wed 5 March                                               |',
            '|  Acad  |  09:00 PROG201 Lab \u2014 IT Lab 3                                     |',
            '|  Degree|  11:00 MATH202 Lecture \u2014 Sci Block B                               |',
            '|  Time  |  14:00 DBMS201 Tutorial \u2014 Eng Building                             |',
            '|  Money |                                                                    |',
            '|  Help  |  ACTIONS NEEDED                                                    |',
            '|  Wrap  |  [!] DBMS201 Assignment 3 \u2014 due Tomorrow           [View \u2192]      |',
            '|        |  [\u2713] PROG201 Test 2 marks released \u2014 68%          [View \u2192]      |',
            '|        |  [i] Faculty notice \u2014 timetable change Week 8     [Details \u2192]    |',
            '|        |  [$] NSFAS allowance deposited \u2014 R3,200            [Receipt \u2192]   |',
            '|        |                                                                    |',
            '|        |  COMING UP THIS WEEK                                               |',
            '|        |  Thu 6  DBMS201 Assignment due 23:59                                |',
            '|        |  Fri 7  MATH202 Tutorial submission                                 |',
            '|        |  Mon 10 PROG201 Lab test (Lab 3, 14:00)                            |',
            '+============================================================================+'
        ].join('\n');

        // ── Section 9: Implementation Phases ──
        const phaseCard = wrapper.add({ css: 'card p-5' });
        const phaseHeader = phaseCard.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        phaseHeader.add({ tag: 'i', css: 'fas fa-road text-primary' });
        phaseHeader.add({ css: 'font-semibold text-lg', script: 'Implementation Phases' });

        const phases = [
            {
                phase: 'Phase 1 \u2014 Core Portal',
                color: 'border-l-4 border-green-500',
                items: [
                    'Activity-stream dashboard with KPI chip row (including Academic Momentum sparkline and small radial ring)',
                    'Academics panel: module list with RAG, marks table, GPA trend area chart, credit progress with NSFAS bands',
                    'Degree Map: treemap + block-based requirement audit + "Plan Ahead" what-if calculator',
                    'Timetable: FullCalendar weekly view with assessment deadline overlay',
                    'Finances: NSFAS stepper tracker, account balance, payment history',
                    'Support: advisor contact, faculty contacts, help resources, registration status'
                ]
            },
            {
                phase: 'Phase 2 \u2014 Engagement & Discovery',
                color: 'border-l-4 border-blue-500',
                items: [
                    'Semester Wrapped: end-of-semester narrative recap with WhatsApp sharing',
                    'Degree Constellation: force-directed module graph using existing graph service',
                    '"Plan Ahead" enhanced with simulation logic when prerequisite chain data available',
                    'Achievement badges and streak gamification',
                    'Notification centre with push notification support'
                ]
            }
        ];

        phases.forEach(p => {
            const pBlock = phaseCard.add({ css: `${p.color} pl-4 mb-4` });
            pBlock.add({ css: 'text-sm font-semibold text-gray-800 mb-2', script: p.phase });
            const pList = pBlock.add({ css: 'space-y-1' });
            p.items.forEach(item => {
                const row = pList.add({ css: 'flex items-start gap-2' });
                row.add({ tag: 'i', css: 'fas fa-check text-xs text-muted mt-1' });
                row.add({ css: 'text-xs text-gray-600', script: item });
            });
        });

        // Debate metadata
        phaseCard.add({
            css: 'mt-4 pt-3 border-t text-xs text-muted text-center',
            script: 'Debate conducted 1 March 2026 \u2022 3 rounds \u2022 Tools Scout + Practice Expert + Novelty Agent \u2022 All agents used Opus model with WebSearch'
        });
    }

    /**
     * Renders a debate report section with icon header and item cards.
     */
    _renderDebateSection(container, { icon, iconColor, title, intro, items }) {
        const card = container.add({ css: 'card p-5 mb-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: `fas ${icon} ${iconColor}` });
        header.add({ css: 'font-semibold text-lg', script: title });

        if (intro) {
            card.add({ css: 'text-sm text-gray-600 leading-relaxed mb-4', script: intro });
        }

        items.forEach(item => {
            const block = card.add({ css: 'mb-4 last:mb-0' });
            block.add({ css: 'text-sm font-semibold text-gray-800 mb-1', script: item.heading });
            block.add({ css: 'text-sm text-gray-600 leading-relaxed', script: item.body });
        });
    }

    // ── Architecture Note ───────────────────────────────────────────

    _renderArchitectureNote(container) {
        const card = container.add({ css: 'card p-4 mb-5' });
        const header = card.add({ css: 'flex items-center gap-2 mb-3 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-sitemap text-blue-500' });
        header.add({ css: 'font-semibold', script: 'Architecture' });

        card.add({
            css: 'text-sm text-gray-600 leading-relaxed mb-3',
            script: 'Student Central uses a modular panel architecture. Each panel is a self-contained class that receives shared services (academic, member, risk, etc.) and renders into a provided container using the Publon.Press DOM builder pattern.'
        });

        const pre = card.add({
            tag: 'pre',
            css: 'bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-auto'
        });
        (pre.domElement || pre).textContent = [
            'StudentCentral (Shell)',
            '  |-- StudentDashboardPanel    KPIs, semester, alerts, activity',
            '  |-- StudentResultsPanel      Filtered results, detail modals, GPA',
            '  |-- StudentSchedulePanel     Timetable + events',
            '  |-- StudentProgressPanel     Credits, trends, graduation estimate',
            '  |-- StudentDiaryPanel        Entries, goals, check-ins',
            '  |-- StudentGoalsPanel        Goal setting + tracking',
            '  |-- StudentCareerHubPanel    CV, bursaries, opportunities',
            '  |-- StudentSupportPanel      Cases, messages, risk, resources',
            '  |-- StudentAboutPanel        System info, features, roadmap',
            '  |',
            '  Shared: { services, currentUser, app }'
        ].join('\n');

        card.add({
            css: 'text-xs text-muted mt-3',
            script: 'Each panel follows the constructor({ services, currentUser, app }) + render(container) contract. Panels access data through service publons (e.g., services.academic.publon.enrolment.rows) and degrade gracefully when services are unavailable.'
        });
    }

    // ── Version Info ────────────────────────────────────────────────

    _renderVersionInfo(container) {
        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-3 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-info-circle text-primary' });
        header.add({ css: 'font-semibold', script: 'Version Information' });

        const grid = card.add({ css: 'flex flex-wrap gap-3' });

        const versionItems = [
            { label: 'Student Central', value: 'v2.0.0' },
            { label: 'AutoScholar Core', value: typeof AutoScholar !== 'undefined' ? `v${AutoScholar.VERSION}` : 'N/A' },
            { label: 'Release Date', value: '2026-02-15' },
            { label: 'Architecture', value: 'Panel-based modular' },
            { label: 'Data Layer', value: 'Publon.Press Publome' },
            { label: 'UI System', value: 'Publon.Press DOM builder' }
        ];

        versionItems.forEach(item => {
            const box = grid.add({ css: 'p-3 bg-gray-50 rounded-lg as-flex-card-md' });
            box.add({ css: 'text-xs text-muted', script: item.label });
            box.add({ css: 'text-sm font-medium text-gray-800', script: item.value });
        });

        // Footer
        container.add({
            css: 'text-center text-sm text-muted mt-5 pt-4 border-t',
            script: 'Publon.Press - AutoScholar Student Central'
        });
    }
}
