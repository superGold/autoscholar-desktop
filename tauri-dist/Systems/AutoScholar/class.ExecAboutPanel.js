/**
 * ExecAboutPanel — Documentation, ISO 21001 reference, development plan, observations
 *
 * Usage:
 *   const panel = new ExecAboutPanel({ publome });
 *   panel.render(container);
 */
class ExecAboutPanel {

    constructor(config = {}) {
        this.publome = config.publome;
        this._container = null;
    }

    render(container) {
        this._container = container;
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'as-stage-about ex-stage-wrap ex-about-wrap';

        wrapper.innerHTML = `
            <h3 class="ex-view-title ex-about-mt-0">
                <i class="fas fa-info-circle"></i>Executive Insight — About
            </h3>

            <p class="ex-about-intro">
                Executive Insight is a strategic dashboard for institutional leadership, providing multi-level
                performance analytics aligned with the <strong>ISO 21001:2025</strong> Educational Organizations
                Management System (EOMS) framework. It supports data-driven decision making through structured
                metrics, PDSA improvement cycles, and evidence-based interventions.
            </p>

            <h3 class="ex-view-title">
                <i class="fas fa-exclamation-triangle ex-clr-warning"></i>Early Warning — Performance Drill-Down
            </h3>
            <p class="ex-about-body">
                The <strong>Early Warning</strong> tab is designed to help institutional leadership identify
                <em>where academic support is most needed</em> — before end-of-year results make it too late to act.
                It provides a top-down scan of the entire institution:
            </p>
            <ol class="ex-about-list">
                <li><strong>Institution level</strong> — which faculties are underperforming across key assessment types?</li>
                <li><strong>Faculty level</strong> — within a faculty, which programmes show low pass rates or poor mean marks?</li>
                <li><strong>Programme level</strong> — within a programme, which courses are struggling? Where are students failing assessments?</li>
                <li><strong>Assessment type filter</strong> — compare performance on TM 1, TM 2, Final Exam, Practicals, or Projects separately. A programme might pass the final exam but fail TM 1, indicating early-semester support gaps.</li>
                <li><strong>Denominator filter</strong> — "Completed" shows stats for students who took the assessment (actual performance). "Registered" includes all registered students (reveals non-participation as a problem).</li>
            </ol>
            <p class="ex-about-body">
                All tables support <strong>sorting, searching, and CSV/Excel/PDF export</strong> so that data can be
                shared with Deans and programme coordinators for follow-up action. The goal is to surface exactly where
                intervention is needed — which faculty, which programme, which course, which assessment — so that support
                resources can be directed precisely rather than spread thin.
            </p>

            <h3 class="ex-view-title">
                <i class="fas fa-sitemap"></i>Architecture
            </h3>
            <table>
                <thead>
                    <tr>
                        <th>Component</th>
                        <th>Purpose</th>
                        <th>Pattern</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td><code>ExecSchema</code></td><td>Publome schema (8 tables incl. sectorBenchmark) + seed data</td><td>Static factory</td></tr>
                    <tr><td><code>ExecMetrics</code></td><td>Metrics engine + distribution, forecast, significance testing</td><td>Cached computation</td></tr>
                    <tr><td><code>ExecDataLoader</code></td><td>DUT API adapter + biodata, risk, correlation, distributions</td><td>Async batch fetcher</td></tr>
                    <tr><td><code>ExecSummaryPanel</code></td><td>KPI dashboard + executive summary</td><td>Full-width dashboard</td></tr>
                    <tr><td><code>ExecHierarchyPanel</code></td><td>Early Warning — assessment performance drill-down</td><td>bindTree + DataTables + EventBus</td></tr>
                    <tr><td><code>ExecPerformancePanel</code></td><td>Pass rates, means, comparisons</td><td>Control-stage + sub-tabs</td></tr>
                    <tr><td><code>ExecStudentsPanel</code></td><td>Student progression, CAR, at-risk</td><td>Control-stage + sub-tabs</td></tr>
                    <tr><td><code>ExecCountsPanel</code></td><td>Registration counts, enrolment</td><td>Control-stage + sub-tabs</td></tr>
                    <tr><td><code>ExecAssessmentPanel</code></td><td>Assessment type analysis</td><td>Control-stage + sub-tabs</td></tr>
                    <tr><td><code>ExecStrategyPanel</code></td><td>ISO 21001 metrics + PDSA + interventions</td><td>Control-stage + accordion</td></tr>
                    <tr><td><code>ExecAboutPanel</code></td><td>This documentation panel</td><td>Static content</td></tr>
                    <tr><td><code>ExecServiceBridge</code></td><td>Wires audit, tag, project services to ExecSchema tables</td><td>EthiKit pattern</td></tr>
                    <tr><td><code>ExecProjectBridge</code></td><td>Maps interventions → projects, PDSA → tasks</td><td>Service adapter</td></tr>
                </tbody>
            </table>

            <h3 class="ex-view-title">
                <i class="fas fa-certificate ex-clr-warning"></i>ISO 21001:2025 Framework
            </h3>
            <p class="ex-about-body">
                ISO 21001 specifies requirements for an <strong>Educational Organizations Management System (EOMS)</strong>
                when the organization needs to demonstrate its ability to support the acquisition of competence through
                teaching, learning, or research. The standard is aligned with:
            </p>
            <table>
                <thead><tr><th>Clause</th><th>Focus</th><th>Dashboard Mapping</th></tr></thead>
                <tbody>
                    <tr><td>4</td><td>Context of the Organization</td><td>Entity hierarchy, stakeholder analysis</td></tr>
                    <tr><td>5</td><td>Leadership</td><td>Executive KPIs, strategic targets</td></tr>
                    <tr><td>6</td><td>Planning</td><td>PDSA cycles, intervention planning</td></tr>
                    <tr><td>7</td><td>Support</td><td>Staff ratios, teaching evaluations</td></tr>
                    <tr><td>8</td><td>Operation</td><td>Curriculum currency, assessment analysis</td></tr>
                    <tr><td>9</td><td>Performance Evaluation</td><td>All metrics, benchmarks, comparisons</td></tr>
                    <tr><td>10</td><td>Improvement</td><td>Interventions, PDSA, corrective actions</td></tr>
                </tbody>
            </table>

            <h3 class="ex-view-title">
                <i class="fas fa-database"></i>Data Model
            </h3>
            <table>
                <thead><tr><th>Table</th><th>Records</th><th>Key Fields</th></tr></thead>
                <tbody>
                    ${this._dataModelRows()}
                </tbody>
            </table>

            <h3 class="ex-view-title">
                <i class="fas fa-sync-alt ex-clr-success"></i>PDSA Improvement Cycle
            </h3>
            <div class="ex-flex-wrap ex-mb-xl">
                ${this._pdsaPhaseCards()}
            </div>

            <h3 class="ex-view-title">
                <i class="fas fa-clipboard-list"></i>Development Plan
            </h3>
            <table>
                <thead><tr><th>Priority</th><th>Item</th><th>Status</th></tr></thead>
                <tbody>
                    <tr><td class="ex-priority-p1">P1</td><td>Publome schema + seed data (+ sectorBenchmark table)</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p1">P1</td><td>Metrics engine (+ forecast, distribution, significance testing)</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p1">P1</td><td>Summary: KPIs, sparklines, alert badges, benchmark bars, drill-through</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p2">P2</td><td>Early Warning: heatmap, comparison mode, prev year, student drill-down</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p2">P2</td><td>Performance: box plots, cohort tracking, significance stars, SVG line charts, PNG export</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p2">P2</td><td>Students: demographics, predictive risk, Sankey flow, biodata API</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p3">P3</td><td>Counts: forecast (linear regression), FTEN/returning, subsidy bands, capacity</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p3">P3</td><td>Assessment: histograms, TM↔Final correlation, calendar, moderation placeholder</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p3">P3</td><td>Strategy: Gantt (uiGantt), strategy map (uiGraphView), monitoring badges, evidence</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p3">P3</td><td>Export: Management Review Excel, enhanced print CSS</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p4">P4</td><td>DUT API live data adapter</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p4">P4</td><td>Service integration (audit, project, tag)</td><td class="ex-status-complete">Complete</td></tr>
                    <tr><td class="ex-priority-p4">P4</td><td>Playwright test suite</td><td class="ex-status-complete">Complete</td></tr>
                </tbody>
            </table>

            <h3 class="ex-view-title">
                <i class="fas fa-map-signs"></i>Tab-by-Tab Guide &amp; Enhancement Roadmap
            </h3>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-tachometer-alt ex-about-tab-icon ex-clr-warning"></i>Summary
            </h4>
            <p class="ex-about-body-sm ex-about-mt-0">
                <strong>Current:</strong> Full-width KPI dashboard with 12 ISO 21001 metrics grouped by category.
                Each metric shows value, target, trend sparkline (3-year), status colour, and alert badge (↓ X% when declining &gt;5%).
                Benchmark comparison bars in category overview. Click KPI card → navigates to relevant tab.
                PDF snapshot export and print view. Faculty comparison bar chart.
            </p>
            <p class="ex-about-body-muted">
                <strong>Deferred:</strong> Sector benchmark data from HEMIS (requires national dataset).
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-exclamation-triangle ex-about-tab-icon ex-clr-warning"></i>Early Warning
            </h4>
            <p class="ex-about-body-sm ex-about-mt-0">
                <strong>Current:</strong> Hierarchical drill-down (institution &rarr; faculty &rarr; programme &rarr; courses)
                with assessment type filter and denominator filter. Heatmap overlay (red/amber/green) on pass rate and mean cells.
                Comparison mode: side-by-side TM_1 vs TM_2 vs Final. Historical comparison: previous year delta columns.
                Student-level drill-down within a course. DataTables with export.
            </p>
            <p class="ex-about-body-muted">
                <strong>Deferred:</strong> Automated alert emails (requires server-side email service).
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-chart-bar ex-about-tab-icon ex-clr-primary"></i>Performance
            </h4>
            <p class="ex-about-body-sm ex-about-mt-0">
                <strong>Current:</strong> Five sub-views — Overview, Faculties, Programmes, Trends, Cohort. Box-and-whisker
                plots for metric distributions. SVG line charts with target/benchmark reference lines. Statistical significance
                stars (Z-test for proportions, p &lt; 0.05). Cohort tracking: multi-year pass rate + mean. PNG chart export.
            </p>
            <p class="ex-about-body-muted">
                <strong>Deferred:</strong> HEMIS national benchmarking (requires national dataset).
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-user-graduate ex-about-tab-icon ex-clr-success"></i>Students
            </h4>
            <p class="ex-about-body-sm ex-about-mt-0">
                <strong>Current:</strong> Four sub-views — Progression (with Sankey flow diagram: Registered &rarr; Retained &rarr;
                Passed &rarr; Graduated), By Faculty, At-Risk (with demographic breakdown bars: gender, language, age groups
                via student biodata API), Predictive Risk (rule-based TM1/TM2 &rarr; failure probability, risk distribution
                stacked bar, high-risk student table).
            </p>
            <p class="ex-about-body-muted">
                <strong>Deferred:</strong> CaseworkCounsellor integration (requires external system API).
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-users ex-about-tab-icon ex-clr-purple"></i>Counts
            </h4>
            <p class="ex-about-body-sm ex-about-mt-0">
                <strong>Current:</strong> Five sub-views — Overview (with FTEN vs returning bar, capacity utilisation circle),
                Faculties, Programmes, Year-over-Year, Forecast (linear regression with R² confidence, projected bars with
                striped pattern). DHET subsidy-band analysis by CESM category.
            </p>
            <p class="ex-about-body-muted">
                <strong>Deferred:</strong> Geographic distribution (requires student address data in API). Full PQM capacity data.
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-clipboard-check ex-about-tab-icon ex-clr-warning"></i>Assessment
            </h4>
            <p class="ex-about-body-sm ex-about-mt-0">
                <strong>Current:</strong> Five sub-views — Overview (with mark distribution histograms per type), Entity
                breakdown, Year-over-Year, Alignment (Pearson correlation TM1↔Final, TM2↔Final with interpretation),
                Calendar (semester schedule grid with assessment density). Live getAssessmentResults API connected.
            </p>
            <p class="ex-about-body-muted">
                <strong>Deferred:</strong> Full moderation tracking (requires pre/post moderation marks).
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-chess ex-about-tab-icon ex-clr-indigo"></i>Strategy
            </h4>
            <p class="ex-about-body-sm ex-about-mt-0">
                <strong>Current:</strong> Three stage views — Overview (category cards + intervention/PDSA summaries),
                Gantt Timeline (uiGantt component for PDSA cycles grouped by intervention), Strategy Map (uiGraphView
                showing metric↔intervention graph). Automated metric monitoring badges: On Track / Watch / Action Required
                based on value vs target/benchmark and consecutive year trends. Evidence field on PDSA cycles.
                Interventions + PDSA CRUD via UIBinding. Management Review Excel export.
            </p>
            <p class="ex-about-body-muted">
                <strong>Deferred:</strong> Full board-ready PDF generation (requires template engine).
            </p>

            <hr class="ex-about-hr">

            <h3 class="ex-view-title">
                <i class="fas fa-file-alt ex-clr-primary"></i>Downloadable Reports
            </h3>
            <p class="ex-about-body">
                The <strong>Reports</strong> tab generates downloadable assessment reports at four levels of detail,
                from a single-row institution summary to a full per-course breakdown. Each report can be filtered by
                assessment type (Final Mark, TM 1-3, Final Exam, Practical, Project) and denominator (Completed or
                Registered students). Reports export to multi-sheet Excel workbooks for distribution to stakeholders.
            </p>
            <table class="ex-table ex-mb-xl">
                <thead>
                    <tr><th>Report Type</th><th>Contents</th><th>Speed</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="emphasis">Institution Summary</td>
                        <td class="small">Single row with key KPIs: pass rate, mean, graduation, retention, dropout</td>
                        <td class="small">Instant (from Publome)</td>
                    </tr>
                    <tr>
                        <td class="emphasis">Faculty Breakdown</td>
                        <td class="small">One row per faculty with aggregated metrics</td>
                        <td class="small">Instant or API-based depending on filter</td>
                    </tr>
                    <tr>
                        <td class="emphasis">Programme Breakdown</td>
                        <td class="small">All programmes grouped by faculty</td>
                        <td class="small">Instant or API-based depending on filter</td>
                    </tr>
                    <tr>
                        <td class="emphasis">Course Report</td>
                        <td class="small">Per-course stats across all programmes, grouped by faculty</td>
                        <td class="small">API calls per programme (progress feedback shown)</td>
                    </tr>
                </tbody>
            </table>
            <p class="ex-about-body">
                When non-default assessment filters are selected (e.g. TM 1), the system fetches per-course results
                from the institution API with real-time progress tracking. The Excel export includes a Report Info
                sheet plus hierarchical data sheets appropriate to the selected report type. Note that institutional
                "departments" map to faculties in the entity hierarchy (institution &rarr; faculty &rarr; programme).
            </p>

            <hr class="ex-about-hr">

            <h3 class="ex-view-title">
                <i class="fas fa-eye"></i>Key Observations
            </h3>
            <ol class="ex-about-list">
                <li>The original monolith (7,922 lines) used BlUi/NewBlUi — the wrong UI system for Publon.Press.</li>
                <li>All data was in raw Maps/arrays with no Publome, PublonTable, or UIBinding integration.</li>
                <li>This rebuild decomposes into 10 focused classes following the established panel pattern.</li>
                <li>Publome schema provides 7 tables with proper FK relationships and schema-driven forms.</li>
                <li>UIBinding methods (bindTree, bindSelectEditor, bindMetric, bindCollection) replace all manual DOM.</li>
                <li>EventBus provides cross-panel reactivity (entity selection, year changes).</li>
                <li>ISO 21001 metrics are structured as first-class data, not hardcoded display.</li>
                <li>PDSA cycles are managed via Publome CRUD, not localStorage.</li>
                <li>Interventions are linked to metrics via FK, enabling automatic grouping.</li>
                <li>Seed data generates realistic 3-year trends with deterministic pseudo-randomness.</li>
                <li>The entity hierarchy (institution > faculty > programme) is stored as self-referencing table rows.</li>
                <li>Audit, tag, and project services are integrated via ExecServiceBridge following the EthiKit pattern.</li>
                <li>Interventions sync to projects and PDSA cycles sync to tasks via ExecProjectBridge.</li>
            </ol>

            <hr class="ex-about-hr">

            <h3 class="ex-view-title">
                <i class="fas fa-comments ex-clr-indigo"></i>Domain Debate Report
            </h3>
            <p class="ex-about-body-muted" style="font-style:italic;">
                Three-agent domain debate conducted March 2026. Three specialist agents — Domain Tools Scout,
                Domain Practice Expert, and Domain Novelty Agent — debated Executive Insight's visual approach,
                interaction patterns, and innovation potential across three rounds of structured challenge and convergence.
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-bullseye ex-about-tab-icon ex-clr-warning"></i>Core Finding
            </h4>
            <p class="ex-about-body">
                The central finding across all three agents is that <strong>executives do not explore data — they
                respond to situations</strong>. The best institutional dashboards answer "What should I worry about?"
                rather than "Here is some data." This has profound implications for Executive Insight's architecture:
                every pixel must earn its place by either surfacing a situation that needs attention or enabling
                a decision about that situation. The debate converged on an <strong>exception-driven architecture</strong>
                where problems surface automatically and users investigate on demand — inverting the typical
                exploration-oriented BI dashboard model.
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-layer-group ex-about-tab-icon ex-clr-primary"></i>Three-Layer Architecture
            </h4>
            <p class="ex-about-body">
                All three agents converged on a three-layer progressive disclosure model that mirrors how executives
                actually work: they scan for problems, investigate causes, and take action. The dashboard follows
                this cognitive flow rather than imposing a data-exploration paradigm.
            </p>
            <table>
                <thead><tr><th>Layer</th><th>Purpose</th><th>Time Budget</th><th>Key Visual</th></tr></thead>
                <tbody>
                    <tr>
                        <td><strong>Layer 1: Command Centre</strong></td>
                        <td>Answer "what needs my attention?" in under 30 seconds</td>
                        <td>8-second triage scan</td>
                        <td>Bullet chart KPI ribbon + prioritised exception feed</td>
                    </tr>
                    <tr>
                        <td><strong>Layer 2: Analytical Views</strong></td>
                        <td>Answer "why is this happening?" with evidence</td>
                        <td>5-15 min investigation</td>
                        <td>7 tabs: Flow, Programme Health, Early Warning, Performance, Equity, Compliance, Decision Rehearsal</td>
                    </tr>
                    <tr>
                        <td><strong>Layer 3: Operational Drill-Down</strong></td>
                        <td>Answer "what should we do about it?" with actions</td>
                        <td>On-demand detail</td>
                        <td>Slide-out panel with student/programme lists, action interface, audit trail</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-wrench ex-about-tab-icon ex-clr-success"></i>Technology Recommendations
            </h4>
            <p class="ex-about-body">
                The Tools Scout evaluated charting libraries, graph algorithm tools, and supporting infrastructure.
                The final recommendation centres on <strong>Apache ECharts as the single primary charting engine</strong>,
                covering all chart types needed — Sankey, sunburst, treemap, heatmap, box plot, calendar, gauge,
                line, bar, scatter, and custom series — through one coherent API. The "single library" strategy was
                validated by the Practice Expert for visual consistency and by the Novelty Agent for technical feasibility
                of all proposed innovations.
            </p>
            <table>
                <thead><tr><th>Layer</th><th>Library</th><th>Role</th></tr></thead>
                <tbody>
                    <tr><td>Primary Charting</td><td>Apache ECharts 5.5+</td><td>All visualisations (Sankey, heatmap, bullet charts, sparklines, time series)</td></tr>
                    <tr><td>Graph Algorithms</td><td>graphology</td><td>Curricular topology: betweenness centrality, shortest paths, community detection</td></tr>
                    <tr><td>Narrative Scrolling</td><td>Scrollama</td><td>Scroll-triggered narrative sections for institutional story mode</td></tr>
                    <tr><td>Offline Caching</td><td>Dexie.js</td><td>IndexedDB wrapper for low-bandwidth/offline resilience</td></tr>
                    <tr><td>PDF Export</td><td>jsPDF (lazy-loaded)</td><td>Senate Pack PDF generation from chart images + narrative</td></tr>
                    <tr><td>Excel Export</td><td>SheetJS (lazy-loaded)</td><td>Data table export for institutional researchers</td></tr>
                    <tr><td>Orchestration</td><td>Publon.Press EventBus</td><td>Cross-panel filtering and state management (no external state library needed)</td></tr>
                </tbody>
            </table>
            <p class="ex-about-body">
                Critical-path bundle: ~366 KB gzipped. Lazy-loaded exports add ~345 KB on demand only. The orchestration
                layer — the thing that turns independent charts into a coherent narrative — is built on Publon.Press
                primitives (EventBus + PublonTable reactive model), not imported state management. The Practice Expert
                emphasised that orchestration is 70% of the work; the Tools Scout confirmed that existing Publon.Press
                infrastructure handles this without additional dependencies.
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-chart-line ex-about-tab-icon ex-clr-warning"></i>Visual Elements — Debate Consensus
            </h4>
            <p class="ex-about-body">
                The debate validated several visual patterns while firmly rejecting others. The most contentious debates
                centred on the appropriate level of analytical complexity for executive users, the political sensitivity
                of demographic disaggregation in the South African context, and whether interactive scenario models
                would be used or ignored.
            </p>
            <table>
                <thead><tr><th>Visual Element</th><th>Source</th><th>Verdict</th><th>Rationale</th></tr></thead>
                <tbody>
                    <tr><td>Sankey for Student Flow</td><td>Tools Scout</td><td class="ex-status-complete">Adopted</td><td>Signature visual — answers "where are we losing students?" at a glance</td></tr>
                    <tr><td>Bullet Charts for KPIs</td><td>Tools Scout</td><td class="ex-status-complete">Adopted</td><td>Stephen Few pattern: actual vs target vs qualitative ranges. Replaces gauges.</td></tr>
                    <tr><td>Course-Semester Heatmap</td><td>Tools Scout</td><td class="ex-status-complete">Adopted</td><td>RAG traffic-light grid reveals persistent vs one-off trouble spots</td></tr>
                    <tr><td>Forecast with Confidence Bands</td><td>Tools Scout</td><td class="ex-status-complete">Adopted</td><td>Enrollment projection with R-squared display and widening uncertainty bands</td></tr>
                    <tr><td>Decision Rehearsal Panels</td><td>Novelty</td><td class="ex-status-complete">Adopted</td><td>Pre-computed bounded scenarios with radio buttons (not free-form sliders)</td></tr>
                    <tr><td>Algorithmic Institutional Narrative</td><td>Novelty</td><td class="ex-status-complete">Adopted</td><td>Template-based, auditable NLG for senate reports. No LLM dependency.</td></tr>
                    <tr><td>Institutional Rhythm Awareness</td><td>Novelty</td><td class="ex-status-complete">Adopted</td><td>Exception thresholds adjust for academic calendar seasonality</td></tr>
                    <tr><td>Equity &amp; Access View</td><td>Practice</td><td class="ex-status-complete">Adopted</td><td>Dedicated contextual view with framing — NOT a casual toggle overlay</td></tr>
                    <tr><td>Curricular Topology Maps</td><td>Novelty</td><td style="color:var(--ex-clr-warning);">Deferred</td><td>Valuable but requires clean prerequisite data; graphology + ECharts graph</td></tr>
                    <tr><td>Cohort Storylines</td><td>Novelty</td><td style="color:var(--ui-danger);">Rejected</td><td>NP-hard layout, cognitive overload, POPIA risk. Bump chart as 80% alternative.</td></tr>
                    <tr><td>Quality Metabolism Spiral</td><td>Novelty</td><td style="color:var(--ui-danger);">Rejected</td><td>Beautiful metaphor but confuses QA officers. Separate research paper only.</td></tr>
                    <tr><td>Equity as Universal Toggle</td><td>Novelty</td><td style="color:var(--ui-danger);">Rejected</td><td>Trivialises structural inequality. SA context demands dedicated framing.</td></tr>
                    <tr><td>Free-Form Scenario Sliders</td><td>Novelty</td><td style="color:var(--ui-danger);">Rejected</td><td>Executives interrogate, not explore. Bounded radio buttons instead.</td></tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-lightbulb ex-about-tab-icon ex-clr-indigo"></i>Three Adopted Innovations
            </h4>
            <p class="ex-about-body">
                <strong>1. Decision Rehearsal Panels.</strong> The debate's most contested and ultimately most valuable
                innovation. Executives frequently ask "what if" questions — "If we increase tutorial support by 20%,
                what happens to throughput?" — but today this requires a meeting with an institutional researcher and a
                2-week wait. Decision Rehearsal collapses that cycle to 30 seconds. The critical design constraint,
                imposed by the Practice Expert: these are NOT open-ended simulations. Each intervention parameter
                (tutoring capacity, early warning threshold, SI coverage) offers exactly three pre-computed settings —
                Current, Moderate, and Ambitious. The projected outcomes are pre-computed for all combinations, cached
                locally, and display with confidence levels and comparable benchmark data from other institutions.
                Every scenario shows its assumptions, data source, and model version. A narrative panel auto-generates
                governance-ready prose that can be copied directly into senate packs.
            </p>
            <p class="ex-about-body">
                <strong>2. Algorithmic Institutional Narrative.</strong> Template-based natural language generation that
                translates dashboard metrics into prose suitable for governance documents. The narrative is deterministic
                (not LLM-generated), fully auditable, and hyperlinked to underlying data points. Templates encode the
                specific rhetorical conventions of South African higher education governance — CHE self-evaluation
                reports, DHET submissions, senate packs, and ISO 21001 management reviews. Every sentence traces to a
                specific data point and template rule. The Practice Expert's critical insight: South African university
                governance runs on paper, and a dashboard that cannot produce a senate-ready summary is a dashboard
                that will not be used.
            </p>
            <p class="ex-about-body">
                <strong>3. Exception-Driven Command Centre with Rhythm Awareness.</strong> The Command Centre is not a
                grid of KPI cards — it is an exception-driven feed that surfaces only the metrics requiring attention,
                ranked by severity and urgency. The Novelty Agent's surviving contribution from the withdrawn Quality
                Metabolism concept: institutional rhythm awareness. The system knows the academic calendar (registration,
                assessment, graduation, audit cycles) and adjusts exception thresholds accordingly. A 5% drop in
                student satisfaction means something different in February (registration chaos) than in August (normal
                teaching). This contextualisation reduces false-positive alerts during expected seasonal variation
                while increasing sensitivity to genuine anomalies during normally stable periods.
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-users-cog ex-about-tab-icon ex-clr-primary"></i>UX Principles — Five Non-Negotiable Rules
            </h4>
            <ol class="ex-about-list">
                <li><strong>Exception-First, Not Exploration-First.</strong> The dashboard surfaces problems; users
                investigate them. Every screen must have a clear hierarchy: exceptions at top, context below, detail
                on demand. An executive who opens this dashboard and sees no clear signal of what needs attention has
                been failed by the design.</li>
                <li><strong>Every Click Has Exactly One Destination.</strong> No ambiguous interactions. Clicking a
                heatmap cell goes to one specific tab with one specific filter applied. Navigation is deterministic,
                not exploratory — a documentable table of (source element, destination, filter state) triples.</li>
                <li><strong>Data Provenance is Visible, Not Hidden.</strong> Every number shows its freshness, source
                system, and calculation method. Users must answer "where did this number come from?" without leaving
                the interface. A single incident where an executive presents a wrong number to Council can permanently
                destroy dashboard adoption.</li>
                <li><strong>Equity is Structural, Not Decorative.</strong> Equity analysis gets its own dedicated view
                with its own baselines and action pathways. It is never a toggle or filter applied to other views.
                South African higher education transformation is a constitutional imperative, not a reporting
                convenience.</li>
                <li><strong>Scenarios are Bounded, Authored, and Disclaimed.</strong> No free-form sliders that let
                users generate arbitrary projections. Every scenario comparison shows what it assumes, what data it
                uses, and where the uncertainty lies. The dashboard is a decision-support tool, not a crystal ball.</li>
            </ol>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-ban ex-about-tab-icon" style="color:var(--ui-danger);"></i>Anti-Patterns — What to Never Do
            </h4>
            <p class="ex-about-body">
                The Practice Expert identified ten anti-patterns from studying failed institutional dashboards.
                These represent the definitive "never do this" list for Executive Insight:
            </p>
            <ol class="ex-about-list">
                <li><strong>Data Lake Landing Page</strong> — Never open with a grid of 20 charts showing "everything." Executives respond to signals, not comprehensive data displays.</li>
                <li><strong>Toggle Overload</strong> — Never offer more than 3 simultaneous filter dimensions. Every toggle doubles cognitive load exponentially.</li>
                <li><strong>Equity Checkbox</strong> — Never reduce equity analysis to a demographic toggle on an existing chart. This trivialises structural inequality.</li>
                <li><strong>Prediction Without Provenance</strong> — Never show a projected value without method, data source, confidence interval, and assumptions.</li>
                <li><strong>Infinite Drill-Down</strong> — Never allow more than 3 levels of navigation depth. Dashboards are not data exploration environments.</li>
                <li><strong>Orphan Chart</strong> — Never place a visualisation without a linked action interface. A chart that cannot be acted upon is decoration.</li>
                <li><strong>Jargon Header</strong> — "Throughput Rate" not "Cohort Completion Efficiency Ratio." Tooltips can contain technical terms; headers must be plain language.</li>
                <li><strong>Surprise Scroll</strong> — Never require scrolling to see critical information at 1920x1080. Detail panels may scroll; primary visuals must not.</li>
                <li><strong>Stale-Data Silence</strong> — Never display data without freshness indicators. If data is more than 24 hours old, show amber. More than 7 days, show red.</li>
                <li><strong>Feature-Parity Trap</strong> — Never add a feature because "competing dashboards have it." Every feature must pass: "Would a DVC at a South African university use this?"</li>
            </ol>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-search ex-about-tab-icon ex-clr-success"></i>Cross-Cutting Concerns
            </h4>
            <p class="ex-about-body">
                The debate surfaced six critical concerns that neither the initial architecture nor the existing
                implementation fully address:
            </p>
            <table>
                <thead><tr><th>Concern</th><th>Requirement</th><th>Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td><strong>Senate Pack Export</strong></td>
                        <td>One-click PDF with KPIs, exceptions, narrative, and commentary field for DVC interpretation. Date-stamped, version-controlled.</td>
                        <td style="color:var(--ex-clr-warning);">Planned</td>
                    </tr>
                    <tr>
                        <td><strong>Data Provenance</strong></td>
                        <td>Every metric displays source system, last updated timestamp, and completeness percentage. Hover reveals calculation formula.</td>
                        <td style="color:var(--ex-clr-warning);">Planned</td>
                    </tr>
                    <tr>
                        <td><strong>Onboarding &amp; Glossary</strong></td>
                        <td>Guided tour on first login. Contextual tooltips on every metric definition. SA HE glossary (HEMIS, FTE, success rate vs throughput).</td>
                        <td style="color:var(--ex-clr-warning);">Planned</td>
                    </tr>
                    <tr>
                        <td><strong>Accessibility (WCAG AA)</strong></td>
                        <td>Screen reader support, keyboard navigation, decal patterns for colour-blind users, minimum contrast ratios, tabular data alternatives.</td>
                        <td style="color:var(--ex-clr-warning);">Planned</td>
                    </tr>
                    <tr>
                        <td><strong>Offline Resilience</strong></td>
                        <td>Cache-first strategy for unreliable networks (load-shedding, satellite campuses). Pre-rendered snapshots loadable on 2G.</td>
                        <td style="color:var(--ex-clr-warning);">Planned</td>
                    </tr>
                    <tr>
                        <td><strong>Multilingual Architecture</strong></td>
                        <td>All labels from locale files. Initial: English + isiZulu. Architecture supports Afrikaans, Sesotho without code changes.</td>
                        <td style="color:var(--ex-clr-warning);">Planned</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-graduation-cap ex-about-tab-icon ex-clr-indigo"></i>Publication Angle
            </h4>
            <p class="ex-about-body">
                The three agents debated two publication framings: the Novelty Agent proposed "From Dashboards to Decision Labs"
                (emphasising interactive scenario exploration), while the Practice Expert argued for "Exception-Driven Executive
                Dashboards" (emphasising practical adoption in SA governance workflows). The final synthesis merges both:
            </p>
            <p class="ex-about-body" style="border-left: 3px solid var(--ex-clr-primary); padding-left: 12px; font-style: italic;">
                <strong>"From Dashboards to Decision Labs: Exception-Driven Executive Analytics with Bounded Scenario
                Rehearsal in Higher Education Quality Management"</strong>
            </p>
            <p class="ex-about-body">
                The paper argues that current higher education quality dashboards fail executives in three ways — they are
                <em>retrospective</em> (showing only what happened), <em>mute</em> (presenting data without interpretation),
                and <em>passive</em> (offering no path from insight to action). The Decision Lab architecture addresses all
                three through: (1) exception-driven design with institutional rhythm awareness that makes dashboards
                <em>prospective</em>, (2) bounded decision rehearsal panels that make dashboards <em>interactive</em>, and
                (3) template-based algorithmic narrative that makes dashboards <em>communicative</em>. Target venues include
                <em>Quality in Higher Education</em> (Taylor &amp; Francis), <em>Studies in Higher Education</em>, or the
                <em>Journal of Learning Analytics</em>.
            </p>
            <p class="ex-about-body">
                Three novel contributions are identified: the exception-driven inversion of traditional dashboard architecture,
                the bounded pre-computation approach to scenario analysis (offering exactly three settings per intervention
                parameter), and the governance-specific NLG template library that formalises the rhetorical conventions of
                South African higher education reporting. A companion paper on Quality Metabolism — visualising ISO 21001
                compliance as a living system with observable vital signs — is recommended as a separate publication targeting
                quality management journals.
            </p>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-tasks ex-about-tab-icon ex-clr-warning"></i>Detailed Implementation Plan
            </h4>
            <p class="ex-about-body">
                <strong>Design Decision:</strong> The debate recommended Apache ECharts as the primary charting engine.
                However, the existing Executive Insight codebase uses custom SVG rendering, DataTables, and Publon.Press
                ui components (uiGantt, uiGraphView). <strong>Decision: build the innovation layer (exception engine,
                narrative engine, decision rehearsal) using existing Publon.Press infrastructure first.</strong> ECharts
                integration is deferred to a future phase when the architectural innovations are proven. This keeps the
                MVP lightweight and avoids introducing a major new dependency before the core ideas are validated.
            </p>

            <h4 class="ex-chart-title" style="margin-top:16px;">Phase 1: Exception Engine + Rhythm Calendar</h4>
            <p class="ex-about-body-sm">
                The foundation layer. Creates the analytical engine that scans all ExecMetrics data, computes exceptions
                ranked by severity, and applies academic calendar awareness for seasonal threshold adjustment.
            </p>
            <table>
                <thead><tr><th>Task</th><th>File</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td>1.1</td>
                        <td><code>class.ExecExceptionEngine.js</code></td>
                        <td>Core exception detection: scan all metrics, compare to targets/benchmarks, compute severity
                            scores, rank by severity x urgency x student-count-affected. Exception types: threshold breach,
                            trend decline (&gt;5% YoY), benchmark gap, programme review overdue.</td>
                        <td id="task-1-1" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>1.2</td>
                        <td><code>class.ExecRhythmCalendar.js</code></td>
                        <td>Academic calendar model: registration (Jan-Feb), assessment periods (Mar, May, Aug, Oct),
                            graduation (Apr, Sep), audit cycles. Provides expected seasonal baselines for each metric
                            so exception thresholds adjust contextually.</td>
                        <td id="task-1-2" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>1.3</td>
                        <td><code>class.ExecExceptionEngine.js</code></td>
                        <td>Wire rhythm calendar into exception scoring: contextualised severity =
                            (current - expected_for_period) / historical_std. Reduces false positives during expected
                            seasonal variation.</td>
                        <td id="task-1-3" class="ex-status-complete">Complete</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title" style="margin-top:16px;">Phase 2: Narrative Engine</h4>
            <p class="ex-about-body-sm">
                Template-based natural language generation. Deterministic, auditable, hyperlinked to data.
                No LLM dependency. Produces governance-ready prose for senate packs and CHE submissions.
            </p>
            <table>
                <thead><tr><th>Task</th><th>File</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td>2.1</td>
                        <td><code>class.ExecNarrativeEngine.js</code></td>
                        <td>Template engine core: conditional template selection based on metric conditions,
                            dot-path interpolation ({metric.current}, {metric.delta}), severity sorting
                            (critical first). ~20 templates covering all KPI dimensions.</td>
                        <td id="task-2-1" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>2.2</td>
                        <td><code>class.ExecNarrativeEngine.js</code></td>
                        <td>Governance template library: CHE self-evaluation, DHET submission, senate pack,
                            ISO 21001 management review. Each template encodes SA HE rhetorical conventions.</td>
                        <td id="task-2-2" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>2.3</td>
                        <td><code>class.ExecNarrativeEngine.js</code></td>
                        <td>Generate method: evaluate all templates against current data, produce ordered
                            narrative sections with severity, chartRef links, and provenance metadata.</td>
                        <td id="task-2-3" class="ex-status-complete">Complete</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title" style="margin-top:16px;">Phase 3: Enhanced Command Centre</h4>
            <p class="ex-about-body-sm">
                Transform ExecSummaryPanel from a KPI grid into an exception-driven command centre. Add exception
                feed, data freshness indicators, bullet chart rendering, and one-sentence algorithmic narrative.
            </p>
            <table>
                <thead><tr><th>Task</th><th>File</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td>3.1</td>
                        <td><code>class.ExecSummaryPanel.js</code></td>
                        <td>Add exception feed section: ranked list of 5-7 current concerns from ExecExceptionEngine.
                            Each item shows severity icon (CRITICAL/WARNING/INFO), description, faculty, trend arrow,
                            and click-to-investigate action.</td>
                        <td id="task-3-1" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>3.2</td>
                        <td><code>class.ExecSummaryPanel.js</code></td>
                        <td>Add data freshness indicator to header: "Data as of [date], [N]% complete" with
                            traffic-light colour (green &lt;24h, amber 1-7d, red &gt;7d).</td>
                        <td id="task-3-2" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>3.3</td>
                        <td><code>class.ExecSummaryPanel.js</code></td>
                        <td>Add one-sentence algorithmic narrative from ExecNarrativeEngine at top of dashboard.
                            Auto-generated summary of top concerns with hyperlinks to relevant tabs.</td>
                        <td id="task-3-3" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>3.4</td>
                        <td><code>class.ExecSummaryPanel.js</code></td>
                        <td>Enhance KPI cards with bullet chart rendering: qualitative ranges (poor/fair/good),
                            actual value bar, target marker line, benchmark reference. SVG-based, no ECharts.</td>
                        <td id="task-3-4" class="ex-status-complete">Complete</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title" style="margin-top:16px;">Phase 4: Decision Rehearsal Panel</h4>
            <p class="ex-about-body-sm">
                The debate's most innovative contribution. Bounded pre-computed scenario comparison with exactly
                three settings per intervention parameter (Current/Moderate/Ambitious). Radio buttons, not sliders.
            </p>
            <table>
                <thead><tr><th>Task</th><th>File</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td>4.1</td>
                        <td><code>class.ExecScenarioModel.js</code></td>
                        <td>Scenario model class: defines intervention parameters (tutoring capacity, SI coverage,
                            early warning threshold, advisor ratio, digital access), each with 3 pre-computed settings.
                            Regression-based outcome projection from seed/API data.</td>
                        <td id="task-4-1" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>4.2</td>
                        <td><code>class.ExecDecisionRehearsalPanel.js</code></td>
                        <td>Panel UI: radio button grid for parameter selection, projected outcomes table
                            (current vs projected with delta arrows), confidence indicator (R-squared),
                            comparable interventions section, cost impact row.</td>
                        <td id="task-4-2" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>4.3</td>
                        <td><code>class.ExecDecisionRehearsalPanel.js</code></td>
                        <td>Narrative integration: auto-generated prose summarising scenario impact, with
                            "Copy to Senate Pack" and "Export as PDF" actions. Model version and data
                            freshness in footer.</td>
                        <td id="task-4-3" class="ex-status-complete">Complete</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title" style="margin-top:16px;">Phase 5: Integration + Wiring</h4>
            <p class="ex-about-body-sm">
                Wire all new classes into the existing Executive Insight architecture. Add new tab for Decision
                Rehearsal. Update script loading in dev-dut.html.
            </p>
            <table>
                <thead><tr><th>Task</th><th>File</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td>5.1</td>
                        <td><code>class.AutoScholarApp.js</code></td>
                        <td>Wire ExecExceptionEngine and ExecNarrativeEngine into _initExecutive().
                            Pass to ExecSummaryPanel for command centre rendering.</td>
                        <td id="task-5-1" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>5.2</td>
                        <td><code>class.AutoScholarApp.js</code></td>
                        <td>Add "Decision Rehearsal" tab to executive sub-tabs. Wire ExecDecisionRehearsalPanel
                            with ExecScenarioModel and ExecNarrativeEngine.</td>
                        <td id="task-5-2" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>5.3</td>
                        <td><code>dut/dev-dut.html</code></td>
                        <td>Add script tags for new class files: ExecExceptionEngine, ExecRhythmCalendar,
                            ExecNarrativeEngine, ExecScenarioModel, ExecDecisionRehearsalPanel.</td>
                        <td id="task-5-3" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>5.4</td>
                        <td><code>class.ExecAboutPanel.js</code></td>
                        <td>Update architecture table with new components. Mark completed tasks in this plan.</td>
                        <td id="task-5-4" class="ex-status-complete">Complete</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title" style="margin-top:16px;">Future Phases (Post-MVP)</h4>
            <table>
                <thead><tr><th>Phase</th><th>Features</th><th>Status</th></tr></thead>
                <tbody>
                    <tr><td>V2</td><td>ECharts integration for Sankey, heatmap, bullet charts (replace custom SVG)</td><td>Planned</td></tr>
                    <tr><td>V2</td><td>Equity &amp; Access dedicated view with SA transformation framing</td><td>Planned</td></tr>
                    <tr><td>V2</td><td>Senate Pack PDF export (jsPDF + chart images + narrative)</td><td>Planned</td></tr>
                    <tr><td>V3</td><td>Curricular Topology (graphology + graph visualisation)</td><td>Planned</td></tr>
                    <tr><td>V3</td><td>Offline caching (Dexie.js for low-bandwidth resilience)</td><td>Planned</td></tr>
                    <tr><td>V3</td><td>WCAG AA accessibility audit + remediation</td><td>Planned</td></tr>
                    <tr><td>V3</td><td>Multilingual architecture (English + isiZulu)</td><td>Planned</td></tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-bug ex-about-tab-icon ex-clr-danger"></i>Quality Audit — Issue Tracker
            </h4>
            <p class="ex-about-body-sm">
                Issues identified from real-data testing with DUT API (2026-03-01 audit).
                Each item tested with Playwright against live data, verified with screenshots.
            </p>
            <table>
                <thead><tr><th>#</th><th>Issue</th><th>File</th><th>Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td>Q1</td>
                        <td>Data freshness shows today's date (2026/03/01) instead of the most recent observation year from the data. Misleading when viewing historical data.</td>
                        <td><code>ExecSummaryPanel.js</code></td>
                        <td id="task-q1" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>Q2</td>
                        <td>Bullet chart for score-type metrics (e.g. Stakeholder Satisfaction 3.7/5) uses 0-100 max scale, making the 3.7% bar width invisible. Needs unit-aware scale (0-5 for scores).</td>
                        <td><code>ExecSummaryPanel.js</code></td>
                        <td id="task-q2" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>Q3</td>
                        <td>Category overview: 2 metrics with values but no benchmark bars — ratio and score types excluded by unit filter (<code>unit === '%' || unit === 'score'</code>). Should include ratio type with adapted rendering.</td>
                        <td><code>ExecSummaryPanel.js</code></td>
                        <td id="task-q3" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>Q4</td>
                        <td>Progress bar widths unrounded (e.g. 94.42857142857142%) — cosmetic but sloppy. Round all computed percentages to 2 decimal places.</td>
                        <td><code>ExecSummaryPanel.js</code></td>
                        <td id="task-q4" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>Q5</td>
                        <td>Exception score displayed as raw integers (58, 26) with no context. Add a small visual severity bar or "/100" label so users understand the scale.</td>
                        <td><code>ExecSummaryPanel.js</code></td>
                        <td id="task-q5" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>Q6</td>
                        <td>Inline styles: 225 elements with style attributes in Exec panels. Move repeated patterns (icon colors, progress fill widths) to CSS classes where feasible.</td>
                        <td><code>exec-theme.css + panels</code></td>
                        <td id="task-q6" class="ex-status-complete">Complete</td>
                    </tr>
                    <tr>
                        <td>Q7</td>
                        <td>Cost per additional graduate shows "R0" when selected scenario doesn't affect graduation rate. Shows "N/A" instead, and narrative explains no graduation impact.</td>
                        <td><code>ExecDecisionRehearsalPanel.js + ExecScenarioModel.js</code></td>
                        <td id="task-q7" class="ex-status-complete">Complete</td>
                    </tr>
                </tbody>
            </table>

            <h4 class="ex-chart-title ex-about-tab-title">
                <i class="fas fa-book-open ex-about-tab-icon ex-clr-primary"></i>Key References from Debate Research
            </h4>
            <p class="ex-about-body">
                The Tools Scout surveyed the charting library landscape and identified Apache ECharts, Observable Plot,
                and graphology as the optimal stack. The Practice Expert studied leading platforms including
                <strong>EAB Navigate/Edify</strong>, <strong>Civitas Learning (Anthology)</strong>,
                <strong>Ellucian Insights</strong>, <strong>Starfish</strong>, <strong>HelioCampus</strong>,
                <strong>JISC Heidi Plus</strong>, <strong>Watermark (Taskstream/Tk20)</strong>, and
                <strong>Huron HEPA</strong>. The Novelty Agent drew on visualisation research including Tanahashi &amp; Ma's
                storyline visualisations, Heileman et al.'s curricular analytics framework, Bret Victor's explorable
                explanations, and Segel &amp; Heer's narrative visualisation taxonomy. SA-specific references include
                CHE quality assurance frameworks, DHET reporting requirements, and ISO 21001:2018 educational management
                system standards.
            </p>
            <p class="ex-about-body-muted">
                The full debate transcript with all three rounds of agent findings, challenges, and counter-arguments
                is archived in the MajorDomo session records.
            </p>
        `;

        container.appendChild(wrapper);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    _dataModelRows() {
        if (!this.publome) return '<tr><td colspan="3">No data loaded</td></tr>';

        const tables = this.publome.getTableNames();
        return tables.map(name => {
            const t = this.publome.table(name);
            const count = t.all().length;
            const cols = Object.keys(t.schema || {}).slice(0, 5).join(', ');
            return `<tr><td><code>${name}</code></td><td>${count}</td><td class="ex-about-col-sm">${cols}</td></tr>`;
        }).join('');
    }

    _pdsaPhaseCards() {
        const phases = [
            { phase: 'Plan', icon: 'lightbulb', color: 'var(--ex-clr-primary)', desc: 'Identify improvement goal, form hypothesis, define measures and baseline' },
            { phase: 'Do',   icon: 'play',      color: 'var(--ex-clr-success)', desc: 'Implement the change on a small scale, collect data, document observations' },
            { phase: 'Study', icon: 'search',    color: 'var(--ex-clr-warning)', desc: 'Analyze results against predictions, identify learnings and surprises' },
            { phase: 'Act',  icon: 'check',      color: 'var(--ex-clr-purple)', desc: 'Adopt, adapt, or abandon based on findings. Plan next cycle.' }
        ];

        return phases.map(p => `
            <div class="ex-card ex-card-sm ex-pdsa-card" style="border-left:3px solid ${p.color};">
                <div class="ex-pdsa-header">
                    <i class="fas fa-${p.icon} ex-pdsa-icon" style="color:${p.color};"></i>
                    <span class="ex-pdsa-label">${p.phase}</span>
                </div>
                <div class="ex-pdsa-desc">${p.desc}</div>
            </div>
        `).join('');
    }
}
