/**
 * AccreditationAutomatePanel - Thin-client wrapper for Accreditation Automate
 *
 * Standalone panel that seeds sample accreditation data and renders
 * a control-stage interface with compliance dashboard, GA matrix,
 * criteria overview, and evaluation results.
 *
 * Usage:
 *   new AccreditationAutomatePanel().render(controlEl, stageEl);
 */
class AccreditationAutomatePanel {

    static BODIES = [
        { code: 'ECSA', label: 'ECSA', fullName: 'Engineering Council of South Africa' },
        { code: 'CHE',  label: 'CHE',  fullName: 'Council on Higher Education' },
        { code: 'HEQSF', label: 'HEQSF', fullName: 'Higher Education Qualifications Sub-Framework' }
    ];

    static GA_LABELS = [
        'Problem Solving', 'Application of Scientific Knowledge', 'Engineering Design',
        'Investigations', 'Engineering Methods & Tools', 'Professional & Technical Communication',
        'Sustainability & Impact', 'Individual, Teamwork & Leadership', 'Independent Learning',
        'Engineering Professionalism', 'Engineering Management'
    ];

    static VIEWS = [
        { key: 'dashboard',  label: 'Dashboard',   icon: 'chart-pie' },
        { key: 'matrix',     label: 'GA Matrix',   icon: 'th' },
        { key: 'criteria',   label: 'Criteria',    icon: 'list-check' },
        { key: 'evaluation', label: 'Evaluation',  icon: 'clipboard-check' },
        { key: 'schedule',   label: 'Schedule',    icon: 'calendar-alt' },
        { key: 'about',      label: 'About',       icon: 'info-circle' }
    ];

    constructor() {
        this._controlEl = null;
        this._stageEl = null;
        this._activeView = null;
        this._navItems = {};
        this._selectedBody = 'ECSA';
        this._selectedProg = null;
        this._programmes = this._getSampleProgrammes();
        this._gaMatrix = this._getSampleGAMatrix();
        this._evaluations = this._getSampleEvaluations();
        this._schedule = this._getSampleSchedule();
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._switchView('dashboard');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CONTROL PANEL
    // ══════════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        el.innerHTML = '';
        var self = this;

        // Header
        var header = document.createElement('div');
        header.className = 'aa-ctrl-header';
        header.innerHTML =
            '<div class="aa-ctrl-header-row">' +
            '<div class="aa-ctrl-header-icon"><i class="fas fa-certificate"></i></div>' +
            '<div><div class="aa-ctrl-header-title">Accreditation AutoMate</div>' +
            '<div class="aa-ctrl-header-sub">Compliance & Evidence</div></div></div>';
        el.appendChild(header);

        // Body selector
        var bodySection = document.createElement('div');
        bodySection.className = 'aa-ctrl-section';
        el.appendChild(bodySection);

        var bodyLabel = document.createElement('div');
        bodyLabel.className = 'as-ctrl-label';
        bodyLabel.textContent = 'Accreditation Body';
        bodySection.appendChild(bodyLabel);

        AccreditationAutomatePanel.BODIES.forEach(function(b) {
            var chip = document.createElement('div');
            var isActive = b.code === self._selectedBody;
            chip.className = 'aa-ctrl-chip' + (isActive ? ' aa-ctrl-chip-active' : '');
            chip.textContent = b.code;
            chip.addEventListener('click', function() {
                self._selectedBody = b.code;
                self._buildControl();
                self._switchView(self._activeView || 'dashboard');
            });
            bodySection.appendChild(chip);
        });

        // Programme selector
        var progSection = document.createElement('div');
        progSection.className = 'aa-ctrl-section';
        el.appendChild(progSection);

        var progLabel = document.createElement('div');
        progLabel.className = 'as-ctrl-label';
        progLabel.textContent = 'Programme';
        progSection.appendChild(progLabel);

        this._programmes.forEach(function(p) {
            var item = document.createElement('div');
            var isActive = self._selectedProg === p.code;
            item.className = 'aa-ctrl-prog-item' + (isActive ? ' aa-ctrl-prog-item-active' : '');
            var dotClass = p.compliance >= 80 ? 'aa-ctrl-prog-dot-green' : p.compliance >= 60 ? 'aa-ctrl-prog-dot-amber' : 'aa-ctrl-prog-dot-red';
            item.innerHTML =
                '<span class="aa-ctrl-prog-dot ' + dotClass + '"></span>' +
                '<span class="aa-ctrl-prog-code">' + p.code + '</span>' +
                '<span class="aa-ctrl-prog-pct">' + p.compliance + '%</span>';
            item.addEventListener('click', function() {
                self._selectedProg = p.code;
                self._buildControl();
                self._switchView(self._activeView || 'dashboard');
            });
            progSection.appendChild(item);
        });

        // Navigation
        var navLabel = document.createElement('div');
        navLabel.className = 'as-ctrl-label';
        navLabel.textContent = 'Views';
        el.appendChild(navLabel);

        AccreditationAutomatePanel.VIEWS.forEach(function(v) {
            var item = document.createElement('div');
            var isActive = self._activeView === v.key;
            item.className = 'aa-ctrl-nav-item' + (isActive ? ' aa-ctrl-nav-item-active' : '');
            item.innerHTML =
                '<i class="fas fa-' + v.icon + ' aa-ctrl-nav-icon"></i>' +
                '<span class="aa-ctrl-nav-label">' + v.label + '</span>';
            item.addEventListener('click', function() { self._switchView(v.key); });
            self._navItems[v.key] = item;
            el.appendChild(item);
        });
    }

    _switchView(key) {
        var self = this;
        this._activeView = key;

        // Update nav highlight
        AccreditationAutomatePanel.VIEWS.forEach(function(v) {
            var item = self._navItems[v.key];
            if (!item) return;
            if (v.key === key) {
                item.className = 'aa-ctrl-nav-item aa-ctrl-nav-item-active';
            } else {
                item.className = 'aa-ctrl-nav-item';
            }
        });

        this._stageEl.innerHTML = '';
        this._stageEl.className = 'aa-stage';

        switch (key) {
            case 'dashboard':  this._renderDashboard(); break;
            case 'matrix':     this._renderMatrix(); break;
            case 'criteria':   this._renderCriteria(); break;
            case 'evaluation': this._renderEvaluation(); break;
            case 'schedule':   this._renderSchedule(); break;
            case 'about':      this._renderAbout(); break;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEWS
    // ══════════════════════════════════════════════════════════════════════════

    _renderDashboard() {
        var el = this._stageEl;
        var progs = this._programmes;

        var totalProgs = progs.length;
        var compliant = progs.filter(function(p) { return p.compliance >= 80; }).length;
        var atRisk = progs.filter(function(p) { return p.compliance >= 50 && p.compliance < 80; }).length;
        var nonCompliant = progs.filter(function(p) { return p.compliance < 50; }).length;

        // Compact metric chips row
        var chipRow = document.createElement('div');
        chipRow.className = 'aa-metric-row';
        [[totalProgs, 'Programmes', 'aa-chip-blue'], [compliant, 'Compliant', 'aa-chip-green'], [atRisk, 'At Risk', 'aa-chip-amber'], [nonCompliant, 'Non-Compliant', 'aa-chip-red']].forEach(function(kpi) {
            var chip = document.createElement('span');
            chip.className = 'aa-metric-chip ' + kpi[2];
            chip.innerHTML = '<span class="aa-metric-chip-value">' + kpi[0] + '</span><span class="aa-metric-chip-label">' + kpi[1] + '</span>';
            chipRow.appendChild(chip);
        });
        el.appendChild(chipRow);

        // Programme compliance cards
        var title = document.createElement('div');
        title.className = 'po-section-title';
        title.textContent = 'Programme Compliance — ' + this._selectedBody;
        el.appendChild(title);

        progs.forEach(function(p) {
            var card = document.createElement('div');
            card.className = 'aa-card';

            var pctClass = p.compliance >= 80 ? 'aa-pct-green' : p.compliance >= 60 ? 'aa-pct-amber' : 'aa-pct-red';
            var fillClass = p.compliance >= 80 ? 'aa-fill-green' : p.compliance >= 60 ? 'aa-fill-amber' : 'aa-fill-red';
            card.innerHTML =
                '<div class="aa-card-row">' +
                    '<div><span class="aa-card-title">' + p.code + '</span> <span class="aa-card-sub">' + p.name + '</span></div>' +
                    '<span class="' + pctClass + '">' + p.compliance + '%</span>' +
                '</div>' +
                '<div class="aa-progress-bar"><div class="aa-progress-fill ' + fillClass + '" style="width:' + p.compliance + '%;"></div></div>' +
                '<div class="aa-card-meta">' +
                    '<span>' + p.courses + ' courses</span><span>' + p.gasCovered + '/' + AccreditationAutomatePanel.GA_LABELS.length + ' GAs covered</span>' +
                    '<span>Next review: ' + p.nextReview + '</span>' +
                '</div>';
            el.appendChild(card);
        });
    }

    _renderMatrix() {
        var el = this._stageEl;
        var prog = this._selectedProg || this._programmes[0].code;
        var matrix = this._gaMatrix[prog] || {};

        var title = document.createElement('div');
        title.className = 'po-section-title';
        title.textContent = 'GA Coverage Matrix — ' + prog;
        el.appendChild(title);

        // Legend
        var legend = document.createElement('div');
        legend.className = 'aa-legend-row';
        [['aa-td-demonstrated', 'Demonstrated'], ['aa-td-reinforced', 'Reinforced'], ['aa-td-introduced', 'Introduced'], ['aa-td-uncovered', 'Not Covered']].forEach(function(l) {
            var span = document.createElement('span');
            var swatch = document.createElement('span');
            swatch.className = 'aa-legend-swatch ' + l[0];
            span.appendChild(swatch);
            span.appendChild(document.createTextNode(l[1]));
            legend.appendChild(span);
        });
        el.appendChild(legend);

        // Build table
        var table = document.createElement('table');
        table.className = 'aa-table';

        var headerRow = '<tr><th class="aa-th">Course</th>';
        AccreditationAutomatePanel.GA_LABELS.forEach(function(ga, i) {
            headerRow += '<th class="aa-th-center" title="' + ga + '">GA' + (i + 1) + '</th>';
        });
        headerRow += '</tr>';
        table.innerHTML = headerRow;

        var courses = Object.keys(matrix);
        courses.forEach(function(course) {
            var row = document.createElement('tr');
            row.innerHTML = '<td class="aa-td">' + course + '</td>';
            AccreditationAutomatePanel.GA_LABELS.forEach(function(ga, i) {
                var level = (matrix[course] && matrix[course][i]) || 0;
                var bgClass = level >= 3 ? 'aa-td-demonstrated' : level >= 2 ? 'aa-td-reinforced' : level >= 1 ? 'aa-td-introduced' : 'aa-td-uncovered';
                var label = level >= 3 ? 'D' : level >= 2 ? 'R' : level >= 1 ? 'I' : '';
                row.innerHTML += '<td class="aa-td-center ' + bgClass + '">' + label + '</td>';
            });
            table.appendChild(row);
        });
        el.appendChild(table);
    }

    _renderCriteria() {
        var el = this._stageEl;

        var title = document.createElement('div');
        title.className = 'po-section-title';
        title.textContent = this._selectedBody + ' Criteria Overview';
        el.appendChild(title);

        AccreditationAutomatePanel.GA_LABELS.forEach(function(ga, i) {
            var card = document.createElement('div');
            card.className = 'aa-card';
            card.innerHTML =
                '<div class="aa-ga-card">' +
                '<div class="aa-ga-badge">GA' + (i + 1) + '</div>' +
                '<span class="aa-card-title">' + ga + '</span></div>' +
                '<div class="aa-ga-desc">Demonstrates competence in ' + ga.toLowerCase() + ' through coursework, projects, and assessments mapped to this graduate attribute.</div>';
            el.appendChild(card);
        });
    }

    _renderEvaluation() {
        var el = this._stageEl;

        var title = document.createElement('div');
        title.className = 'po-section-title';
        title.textContent = 'Evaluation History';
        el.appendChild(title);

        this._evaluations.forEach(function(ev) {
            var card = document.createElement('div');
            card.className = 'aa-card';
            var statusClass = ev.score >= 80 ? 'aa-status-green' : ev.score >= 60 ? 'aa-status-amber' : 'aa-status-red';
            var statusLabel = ev.score >= 80 ? 'Compliant' : ev.score >= 60 ? 'Partially Compliant' : 'Non-Compliant';
            card.innerHTML =
                '<div class="aa-card-row">' +
                '<div><span class="aa-card-title">' + ev.programme + '</span> <span class="aa-card-sub">vs ' + ev.body + '</span></div>' +
                '<span class="aa-status-badge ' + statusClass + '">' + statusLabel + '</span></div>' +
                '<div class="aa-card-meta">' +
                '<span><i class="fas fa-calendar"></i> ' + ev.date + '</span>' +
                '<span><i class="fas fa-chart-bar"></i> ' + ev.score + '% coverage</span>' +
                '<span><i class="fas fa-exclamation-triangle"></i> ' + ev.gaps + ' gaps</span></div>';
            el.appendChild(card);
        });
    }

    _renderSchedule() {
        var el = this._stageEl;

        var title = document.createElement('div');
        title.className = 'po-section-title';
        title.textContent = 'Accreditation Schedule';
        el.appendChild(title);

        this._schedule.forEach(function(s) {
            var card = document.createElement('div');
            card.className = 'aa-card aa-schedule-row';
            var iconClass = s.status === 'Upcoming' ? 'aa-schedule-icon-blue' : s.status === 'In Progress' ? 'aa-schedule-icon-amber' : 'aa-schedule-icon-green';
            var statusClass = s.status === 'Upcoming' ? 'aa-status-badge aa-status-green' : s.status === 'In Progress' ? 'aa-status-badge aa-status-amber' : 'aa-status-badge aa-status-green';
            card.innerHTML =
                '<div class="aa-schedule-icon ' + iconClass + '"><i class="fas fa-calendar-check"></i></div>' +
                '<div class="aa-schedule-body">' +
                '<div class="aa-schedule-title">' + s.programme + ' — ' + s.body + '</div>' +
                '<div class="aa-schedule-date">' + s.date + '</div></div>' +
                '<span class="' + statusClass + '">' + s.status + '</span>';
            el.appendChild(card);
        });
    }

    _renderAbout() {
        var el = this._stageEl;
        el.classList.add('as-stage-about');
        el.innerHTML =
            '<h2>Accreditation AutoMate</h2>' +

            '<p>Accreditation AutoMate is the automated compliance evaluation engine for South African higher education programmes. ' +
            'It manages the full lifecycle of accreditation — from defining what an accreditation body requires, to evaluating ' +
            'individual students and entire cohorts against those requirements, to generating the detailed reports that accreditation ' +
            'review panels need to make their decisions.</p>' +

            '<p>The system is built on two services that work in concert. The <strong>Logic Composer</strong> service provides the ' +
            'general-purpose engine for composing and evaluating nested logic trees. The <strong>Accreditation AutoMate</strong> service ' +
            'layers domain knowledge on top — accreditation bodies, graduate attributes, achievement bands, and the criterion sets that ' +
            'link them together.</p>' +

            '<h3>How Accreditation Works</h3>' +

            '<p>An accreditation body like ECSA defines a set of high-level attributes — for engineering programmes, these are the 11 ' +
            'Graduate Attributes (GA1–GA11) covering everything from Problem Solving to Engineering Management. Each attribute is ' +
            'assessed at multiple bands or levels of achievement. ECSA uses three: Emerging (introductory exposure through foundational ' +
            'coursework), Developed (reinforced practice across multiple courses), and Exit Level (independent demonstration at professional ' +
            'standard). Other bodies may define more or fewer bands.</p>' +

            '<p>The combination of attributes and bands creates a matrix. For ECSA with 11 attributes and 3 bands, that is 33 criterion ' +
            'sets. Each cell in this matrix asks a specific question: "Has the student demonstrated GA3 (Engineering Design) at the ' +
            'Developed level?" To answer this, you need a precise definition of what counts as demonstrating GA3 at the Developed level — ' +
            'and that is where Logic Composer comes in.</p>' +

            '<h3>Logic Composition</h3>' +

            '<p>Each criterion set maps to a Logic Composer composition — a tree of evaluation nodes. The tree supports five node types. ' +
            '<strong>AND</strong> requires all children to pass. <strong>OR</strong> requires at least one. <strong>anyNof</strong> requires ' +
            'at least N out of M children to pass — useful for criteria like "pass any 3 of these 5 elective courses." ' +
            '<strong>atLeastTotal</strong> aggregates a metric across children and checks a threshold — essential for criteria like ' +
            '"accumulate at least 60 credits from this group of courses" or "achieve an average mark of at least 55% across these modules." ' +
            'Finally, <strong>criterion</strong> is the leaf node: a single comparison against an entity attribute using dot-notation paths ' +
            'like <code>courseResult.ENEL4DP.designReport</code>.</p>' +

            '<p>These nodes can nest arbitrarily deep. A typical Exit Level criterion for GA3 might read: "Pass Capstone Design AND ' +
            'score at least 50% on the design report AND pass Group Design Project AND (either score 60% on the group design report ' +
            'OR both score 50% on problem analysis AND 40% on impact assessment)." The tree captures this logic precisely and evaluates ' +
            'it recursively.</p>' +

            '<h3>Report-Generating Evaluation</h3>' +

            '<p>The critical innovation is that the evaluator does not just return pass or fail. As it recursively exits each node, it ' +
            'collects positive notes (criteria that were met) and negative notes (criteria that were not). At connector nodes, these notes ' +
            'are composed into natural language. An AND node that fails might report: "Although Pass Circuit Analysis and Pass Engineering ' +
            'Maths I were met, High Physics was NOT met (actual 48%, expected >= 50%)." An anyNof node reports: "3 out of 4 criteria were ' +
            'met (required 3): Pass Maths I, Pass Chemistry, Pass Circuit Analysis." An atLeastTotal failure reports: "Only 48 of required ' +
            '60 credits achieved. Contributing: ENEL2TD (16 credits), ENEL2EL (16 credits). Deficient: ENEL3GP (16 credits)."</p>' +

            '<p>This means every evaluation — whether for one student against one criterion set, or an entire cohort against all 33 ECSA ' +
            'criterion sets — produces a detailed narrative explaining exactly where the strengths and deficiencies lie. For a student who ' +
            'fails, the report identifies not just which attributes are unmet, but precisely which courses and assessments need improvement. ' +
            'For an accreditation panel, this replaces hours of manual evidence checking with an automated, auditable, traceable evaluation.</p>' +

            '<h3>Cohort Analysis</h3>' +

            '<p>Beyond individual evaluation, the system can assess an entire student cohort. This produces per-student results plus aggregate ' +
            'statistics: pass rates by attribute and band, identification of systemic weaknesses (attributes where fewer than 70% of students ' +
            'pass), and a summary narrative suitable for the accreditation self-evaluation report. If GA4 (Investigations) at Exit Level has ' +
            'only a 45% pass rate across the cohort, that is a programme design issue, not an individual student issue — and the system surfaces ' +
            'this distinction clearly.</p>' +

            '<h3>Rule Versioning and Transition</h3>' +

            '<p>Accreditation criteria change over time. When ECSA updates its standards, the system must handle the transition fairly. ' +
            'Accreditation AutoMate tracks rule versions with effective dates and three transition policies. <strong>Grandfathered</strong>: ' +
            'students enrolled before the rule change continue to be evaluated under the old rules until they graduate. <strong>Phase-out</strong>: ' +
            'old rules apply until a specified date, after which everyone moves to the new rules. <strong>Immediate</strong>: the new rules ' +
            'apply to everyone from the effective date. The system determines which rule version applies to each entity based on their enrolment ' +
            'date and the transition policy in effect.</p>' +

            '<h3>Scenario Planning</h3>' +

            '<p>Before implementing a rule change, the system can run a scenario analysis. You specify the proposed changes to criterion sets, ' +
            'evaluate the full cohort under both current and proposed rules, and see the impact: how many students improve, how many regress, ' +
            'what the new overall pass rate would be, and which specific students are affected. This supports evidence-based decision-making ' +
            'about curriculum changes and accreditation criteria adjustments.</p>' +

            '<h3>Evidence Document Management</h3>' +

            '<p>Accreditation visits require extensive documentation — course outlines, assessment rubrics, student portfolios, moderator ' +
            'reports. The document management system associates PDFs and images to specific courses, students, programmes, or criterion sets. ' +
            'When preparing for a review, all relevant evidence can be retrieved by accreditation body, attribute, or band.</p>' +

            '<h3>Guest Access for Reviewers</h3>' +

            '<p>External reviewers can be granted read-only access to evaluations, reports, and documents through the member service\'s ' +
            'reviewer role. This allows accreditation panel members to examine the evidence independently, at their own pace, without ' +
            'requiring institution staff to manually compile and distribute review materials.</p>' +

            '<h3>Service Architecture</h3>' +

            '<table class="ui-table">' +
            '<thead><tr><th>Service</th><th>Tables</th><th>Purpose</th></tr></thead>' +
            '<tbody>' +
            '<tr><td><strong>Logic Composer</strong><br><code>logicComposer.service.js</code></td>' +
            '<td>lcComposer, lcNode, lcTemplate, lcEvalRun, lcEvalResult, lcVersion</td>' +
            '<td>General-purpose tree-based logic composition and report-generating evaluation. Not accreditation-specific — any system can use it for rule-based evaluation.</td></tr>' +
            '<tr><td><strong>Accreditation AutoMate</strong><br><code>accreditation.service.js</code></td>' +
            '<td>accredBody, accredAttribute, accredBand, accredCriterionSet, accredEvaluation, accredEvalDetail, accredDocument, accredRuleVersion</td>' +
            '<td>Domain service for accreditation. Manages bodies, attributes, bands, criterion sets, evaluations, documents, rule versioning, and scenario planning.</td></tr>' +
            '</tbody></table>' +

            '<h3>Supported Accreditation Bodies</h3>' +

            '<table class="ui-table">' +
            '<thead><tr><th>Code</th><th>Body</th><th>Attributes</th><th>Bands</th><th>Focus</th></tr></thead>' +
            '<tbody>' +
            '<tr><td><code>ECSA</code></td><td>Engineering Council of South Africa</td><td>GA1–GA11 (11)</td><td>Emerging, Developed, Exit Level (3)</td><td>Engineering programme accreditation</td></tr>' +
            '<tr><td><code>CHE</code></td><td>Council on Higher Education</td><td>4 quality areas</td><td>Basic, Proficient, Advanced (3)</td><td>General higher education quality</td></tr>' +
            '<tr><td><code>HEQSF</code></td><td>HE Qualifications Sub-Framework</td><td>4 alignment areas</td><td>NQF5–NQF8 (4)</td><td>Qualifications framework compliance</td></tr>' +
            '</tbody></table>' +

            '<h3>Key Methods</h3>' +

            '<table class="ui-table">' +
            '<thead><tr><th>Method</th><th>Service</th><th>Purpose</th></tr></thead>' +
            '<tbody>' +
            '<tr><td><code>evaluate(composerId, data)</code></td><td>Logic Composer</td><td>Evaluate entity against a single logic tree with report generation</td></tr>' +
            '<tr><td><code>evaluateBatch(composerId, entities)</code></td><td>Logic Composer</td><td>Batch evaluate multiple entities</td></tr>' +
            '<tr><td><code>evaluateEntity(bodyCode, data, lc)</code></td><td>Accreditation</td><td>Evaluate entity against ALL criterion sets of a body</td></tr>' +
            '<tr><td><code>evaluateCohort(bodyCode, entities, lc)</code></td><td>Accreditation</td><td>Evaluate a full cohort with aggregate statistics</td></tr>' +
            '<tr><td><code>runScenario(bodyCode, changes, entities, lc)</code></td><td>Accreditation</td><td>Compare current vs proposed rules across a cohort</td></tr>' +
            '<tr><td><code>getCriterionMatrix(bodyId)</code></td><td>Accreditation</td><td>Get the attribute x band matrix of criterion sets</td></tr>' +
            '<tr><td><code>createRuleVersion(bodyCode, data)</code></td><td>Accreditation</td><td>Snapshot current rules and create a new version</td></tr>' +
            '<tr><td><code>getApplicableRuleVersion(bodyCode, date)</code></td><td>Accreditation</td><td>Determine which rule version applies to an entity</td></tr>' +
            '</tbody></table>';
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SAMPLE DATA
    // ══════════════════════════════════════════════════════════════════════════

    _getSampleProgrammes() {
        return [
            { code: 'BNCME1', name: 'B.Eng Civil Engineering',       compliance: 87, courses: 42, gasCovered: 11, nextReview: '2027-03' },
            { code: 'BNELE1', name: 'B.Eng Electrical Engineering',   compliance: 82, courses: 38, gasCovered: 10, nextReview: '2027-03' },
            { code: 'BNMCE1', name: 'B.Eng Mechanical Engineering',   compliance: 74, courses: 40, gasCovered: 9,  nextReview: '2026-09' },
            { code: 'NDIT',   name: 'National Diploma in IT',         compliance: 68, courses: 32, gasCovered: 7,  nextReview: '2026-06' },
            { code: 'BNCSE1', name: 'B.Eng Chemical Engineering',     compliance: 91, courses: 44, gasCovered: 11, nextReview: '2028-03' },
            { code: 'BNISE1', name: 'B.Eng Industrial Engineering',   compliance: 45, courses: 36, gasCovered: 6,  nextReview: '2026-03' }
        ];
    }

    _getSampleGAMatrix() {
        var matrix = {};
        var self = this;
        this._getSampleProgrammes().forEach(function(p) {
            matrix[p.code] = {};
            var courses = ['Math 1', 'Math 2', 'Physics 1', 'Design 1', 'Design 2', 'Materials', 'Mechanics', 'Ethics', 'Project', 'Lab Work', 'Communication'];
            courses.forEach(function(c) {
                matrix[p.code][c] = [];
                for (var i = 0; i < AccreditationAutomatePanel.GA_LABELS.length; i++) {
                    matrix[p.code][c].push(Math.floor(Math.random() * 4));
                }
            });
        });
        return matrix;
    }

    _getSampleEvaluations() {
        return [
            { programme: 'BNCME1', body: 'ECSA', date: '2025-11-15', score: 87, gaps: 2 },
            { programme: 'BNELE1', body: 'ECSA', date: '2025-10-20', score: 82, gaps: 3 },
            { programme: 'BNMCE1', body: 'ECSA', date: '2025-09-05', score: 74, gaps: 5 },
            { programme: 'NDIT',   body: 'CHE',  date: '2025-08-12', score: 68, gaps: 7 },
            { programme: 'BNCSE1', body: 'ECSA', date: '2025-07-28', score: 91, gaps: 1 },
            { programme: 'BNISE1', body: 'ECSA', date: '2025-06-10', score: 45, gaps: 11 }
        ];
    }

    _getSampleSchedule() {
        return [
            { programme: 'BNISE1', body: 'ECSA', date: 'March 2026',    status: 'Upcoming' },
            { programme: 'NDIT',   body: 'CHE',  date: 'June 2026',     status: 'Upcoming' },
            { programme: 'BNMCE1', body: 'ECSA', date: 'September 2026', status: 'Upcoming' },
            { programme: 'BNCME1', body: 'ECSA', date: 'March 2027',    status: 'Upcoming' },
            { programme: 'BNELE1', body: 'ECSA', date: 'March 2027',    status: 'Upcoming' },
            { programme: 'BNCSE1', body: 'ECSA', date: 'March 2028',    status: 'Upcoming' }
        ];
    }
}

if (typeof window !== 'undefined') window.AccreditationAutomatePanel = AccreditationAutomatePanel;
