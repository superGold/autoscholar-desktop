/**
 * CareerHubPanel - Career development portal for students
 *
 * Standalone panel following the compound pattern.
 * Students build CVs, browse opportunities (jobs, bursaries, internships),
 * and track applications. Uses sample data for testrig demonstration.
 *
 * Usage:
 *   const panel = new CareerHubPanel();
 *   panel.render(controlEl, stageEl);
 */
class CareerHubPanel {

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._apiData = config.studentData || null;
        this._hasRealIdentity = !!(this._apiData && this._apiData.studentNumber);
        this._activeView = 'cv';
        this._inputs = {};

        // Service integration
        this._careerService = config.careerService || null;
        this._memberId = config.memberId || 1;

        // CV block visibility
        this._cvBlocks = {
            contact: true, programme: true, results: true, summary: true,
            skills: true, experience: true, projects: false, achievements: false, references: false
        };

        // Filters
        this._filters = { type: 'all', matchMin: 0, deadline: 'open' };

        // Initialize data from service or sample data
        if (this._careerService) {
            this._initFromService();
        } else {
            this._initSampleData();
        }

        // Overlay real student identity when available
        if (this._hasRealIdentity) this._overlayRealIdentity();

        this._initPublome();
        this._loadPublomeData();
    }

    /**
     * Initialize data from CareerService
     */
    _initFromService() {
        const svc = this._careerService;
        const mid = this._memberId;
        const profile = svc.getOrCreateProfile(mid);
        const progData = svc.getStudentProgrammeData(profile.idx);

        this._profile = {
            name: profile.get('headline') ? profile.get('headline').split('|')[0]?.trim() : 'Student',
            studentId: String(mid),
            email: 'student@university.ac.za',
            phone: '',
            headline: profile.get('headline') || '',
            bio: profile.get('bio') || '',
            programme: progData ? progData.get('programmeName') : '',
            faculty: progData ? progData.get('faculty') : '',
            department: progData ? progData.get('department') : '',
            nqfLevel: progData ? progData.get('nqfLevel') : 0,
            yearOfStudy: progData ? progData.get('yearOfStudy') : 0,
            creditsCompleted: progData ? progData.get('creditsCompleted') : 0,
            creditsRequired: progData ? progData.get('creditsRequired') : 0,
            gpa: profile.get('gpa') || 0,
            expectedGraduation: progData ? progData.get('expectedGraduation') : '',
            location: '',
            linkedin: '',
            github: ''
        };

        // Skills — map from Publon records to plain objects
        this._skills = svc.getSkills(mid).map(s => ({
            idx: s.idx, name: s.get('skillName'),
            proficiency: s.get('proficiency'), category: s.get('category')
        }));

        // Experience
        this._experience = svc.getExperience(mid).map(e => ({
            idx: e.idx, title: e.get('title'),
            org: e.get('organization'), type: e.get('type'),
            start: e.get('startDate'), end: e.get('endDate'),
            desc: e.get('description')
        }));

        // Results
        const results = svc.getVerifiedResults(profile.idx);
        this._results = results.map(r => ({
            code: r.get('courseCode'), name: r.get('courseName'),
            mark: r.get('mark'), status: r.get('status'),
            year: r.get('year'), semester: r.get('semester')
        }));

        // Opportunities with matching
        const matched = svc.getMatchingOpportunities(profile.idx);
        this._opportunities = matched.map(o => ({
            idx: o.idx, type: o.type, title: o.title,
            provider: o.providerName, matchScore: o.matchScore,
            deadline: o.deadline, location: o.location,
            remote: o.isRemote, salary: o.salaryMin ? `R${o.salaryMin.toLocaleString()} - R${(o.salaryMax || o.salaryMin).toLocaleString()}/month` : null,
            funding: o.fundingAmount, coverage: o.coverage,
            description: o.description || '',
            requirements: svc.getOpportunityRequirements(o.idx).map(r => `${r.get('requirementType')}: ${r.get('value') || r.get('minValue') || ''}`),
            status: o.status
        }));

        // Applications
        this._applications = svc.getApplications(mid).map(a => {
            const opp = svc.table('opportunity').read(a.get('targetId'));
            return {
                idx: a.idx, opportunityIdx: a.get('targetId'),
                title: opp ? opp.get('title') : 'Unknown',
                provider: opp ? opp.get('providerName') : '',
                type: opp ? opp.get('type') : '',
                appliedDate: (a.get('appliedAt') || '').slice(0, 10),
                status: a.get('status'),
                coverLetter: a.get('coverLetter')
            };
        });
    }

    /**
     * Initialize with hardcoded sample data (backward compatibility)
     */
    _initSampleData() {
        this._profile = {
            name: 'Thabo Nkosi',
            studentId: '22001001',
            email: 'thabo.nkosi@student.ac.za',
            phone: '+27 82 123 4567',
            headline: 'Computer Science Student | Aspiring Software Developer',
            bio: 'Passionate about software development with a focus on web technologies and machine learning. Seeking internship opportunities to apply classroom learning to real-world problems.',
            programme: 'ND: Information Technology',
            faculty: 'Applied Sciences',
            department: 'IT',
            nqfLevel: 6,
            yearOfStudy: 2,
            creditsCompleted: 240,
            creditsRequired: 480,
            gpa: 68,
            expectedGraduation: '2027-06',
            location: 'Pretoria, Gauteng',
            linkedin: 'linkedin.com/in/thabo-nkosi',
            github: 'github.com/tnkosi'
        };

        this._skills = [
            { idx: 1, name: 'Python', proficiency: 'advanced', category: 'technical' },
            { idx: 2, name: 'JavaScript', proficiency: 'intermediate', category: 'technical' },
            { idx: 3, name: 'SQL', proficiency: 'intermediate', category: 'technical' },
            { idx: 4, name: 'React', proficiency: 'beginner', category: 'technical' },
            { idx: 5, name: 'Machine Learning', proficiency: 'beginner', category: 'technical' },
            { idx: 6, name: 'Communication', proficiency: 'advanced', category: 'soft' },
            { idx: 7, name: 'Problem Solving', proficiency: 'advanced', category: 'soft' },
            { idx: 8, name: 'Teamwork', proficiency: 'intermediate', category: 'soft' }
        ];

        this._experience = [
            { idx: 1, title: 'IT Tutor', org: 'Student Academic Support', type: 'work', start: '2026-02', end: null, desc: 'Tutoring first-year students in programming fundamentals and data structures.' },
            { idx: 2, title: 'Web Developer Intern', org: 'TechStartup SA', type: 'internship', start: '2025-06', end: '2025-08', desc: 'Built responsive web applications using React and Node.js. Participated in agile sprints.' },
            { idx: 3, title: 'Community Tech Workshop Facilitator', org: 'Code4Change NPO', type: 'volunteer', start: '2025-01', end: '2025-12', desc: 'Taught basic coding skills to high school learners in underserved communities.' }
        ];

        this._results = [
            { code: 'ITDA201', name: 'Data Structures', mark: 72, status: 'Passed', year: 2025, semester: 'S2' },
            { code: 'ITSD201', name: 'Software Development 2', mark: 78, status: 'Passed', year: 2025, semester: 'S2' },
            { code: 'ITDB201', name: 'Database Design', mark: 65, status: 'Passed', year: 2025, semester: 'S1' },
            { code: 'ITPR201', name: 'Programming 2', mark: 81, status: 'Passed', year: 2025, semester: 'S1' },
            { code: 'MATH201', name: 'Mathematics 2', mark: 55, status: 'Passed', year: 2025, semester: 'S1' },
            { code: 'ITPR101', name: 'Programming 1', mark: 74, status: 'Passed', year: 2024, semester: 'S2' },
            { code: 'ITWB101', name: 'Web Development 1', mark: 82, status: 'Passed', year: 2024, semester: 'S2' },
            { code: 'MATH101', name: 'Mathematics 1', mark: 58, status: 'Passed', year: 2024, semester: 'S1' }
        ];

        this._opportunities = [
            { idx: 1, type: 'bursary', title: 'Sasol Bursary for IT Students', provider: 'Sasol Ltd', matchScore: 92, deadline: '2026-03-31', location: 'Sasolburg', remote: false, funding: 'R85,000/year', coverage: 'Full', nqfMin: 6, field: 'Computer & Information Sciences', description: 'Full bursary covering tuition, accommodation, and a monthly stipend for IT students at South African universities.', requirements: ['SA citizen', 'NQF Level 6+', 'Computer Science or IT', 'Minimum 60% average'], status: 'published' },
            { idx: 2, type: 'job', title: 'Junior Software Developer', provider: 'Dimension Data', matchScore: 85, deadline: '2026-04-15', location: 'Johannesburg', remote: true, salary: 'R18,000 - R25,000/month', description: 'Join our development team building enterprise cloud solutions. Graduate programme with mentorship.', requirements: ['BSc/ND in IT or Computer Science', 'Python or JavaScript', 'Problem-solving ability'], status: 'published' },
            { idx: 3, type: 'internship', title: 'Data Science Intern', provider: 'Standard Bank', matchScore: 78, deadline: '2026-03-20', location: 'Johannesburg', remote: false, salary: 'R12,000/month', description: 'Work with our data science team on customer analytics and ML model development. 6-month programme.', requirements: ['Studying IT, Computer Science, or Statistics', 'Python proficiency', 'Basic ML knowledge'], status: 'published' },
            { idx: 4, type: 'bursary', title: 'MTN Foundation ICT Scholarship', provider: 'MTN Group', matchScore: 88, deadline: '2026-04-30', location: 'Nationwide', remote: false, funding: 'R70,000/year', coverage: 'Tuition + Books', nqfMin: 5, field: 'Computer & Information Sciences', description: 'Scholarship for students pursuing ICT qualifications at universities and universities of technology.', requirements: ['SA citizen', 'ICT-related programme', 'Financial need', 'Minimum 55% average'], status: 'published' },
            { idx: 5, type: 'learnership', title: 'AWS Cloud Practitioner Learnership', provider: 'Altron', matchScore: 72, deadline: '2026-05-15', location: 'Midrand', remote: true, salary: 'R8,500/month + certification', description: '12-month learnership combining AWS certification with practical cloud infrastructure work.', requirements: ['Interest in cloud computing', 'Basic IT knowledge', 'NQF Level 5+'], status: 'published' },
            { idx: 6, type: 'job', title: 'Graduate IT Support Analyst', provider: 'Discovery', matchScore: 65, deadline: '2026-04-01', location: 'Sandton', remote: false, salary: 'R15,000 - R20,000/month', description: 'Provide first and second-line IT support. Excellent starting role for IT graduates.', requirements: ['ND/Degree in IT', 'Strong communication skills', 'A+ or N+ certification advantageous'], status: 'published' },
            { idx: 7, type: 'internship', title: 'UX Research Intern', provider: 'Takealot', matchScore: 58, deadline: '2026-03-25', location: 'Cape Town', remote: true, salary: 'R10,000/month', description: 'Help our UX team conduct user research and usability testing for South Africa\'s largest online retailer.', requirements: ['Interest in UX/UI design', 'Strong analytical skills', 'Good communication'], status: 'published' },
            { idx: 8, type: 'bursary', title: 'CHIETA Bursary Programme', provider: 'CHIETA SETA', matchScore: 45, deadline: '2026-06-30', location: 'Nationwide', remote: false, funding: 'R60,000/year', coverage: 'Tuition', nqfMin: 5, field: 'Engineering', description: 'SETA bursary for students in Chemical Industries related fields.', requirements: ['SA citizen', 'Chemical Engineering or related', 'Financial need'], status: 'published' }
        ];

        this._applications = [
            { idx: 1, opportunityIdx: 1, title: 'Sasol Bursary for IT Students', provider: 'Sasol Ltd', type: 'bursary', appliedDate: '2026-01-15', status: 'shortlisted', coverLetter: 'I am a dedicated IT student with strong academic performance...' },
            { idx: 2, opportunityIdx: 3, title: 'Data Science Intern', provider: 'Standard Bank', type: 'internship', appliedDate: '2026-01-28', status: 'reviewed', coverLetter: 'My passion for data science and machine learning...' },
            { idx: 3, opportunityIdx: 5, title: 'AWS Cloud Practitioner Learnership', provider: 'Altron', type: 'learnership', appliedDate: '2026-02-05', status: 'pending', coverLetter: 'I am eager to develop cloud computing skills...' }
        ];
    }

    /**
     * Overlay real student identity onto the sample profile
     */
    _overlayRealIdentity() {
        var d = this._apiData;
        var name = ((d.firstName || '') + ' ' + (d.surname || d.lastName || '')).trim();
        if (name) this._profile.name = name;
        if (d.studentNumber) this._profile.studentId = d.studentNumber;
        if (d.email) this._profile.email = d.email;
        if (d.programme) this._profile.programme = d.programme;
        if (d.faculty) this._profile.faculty = d.faculty;
        if (d.department) this._profile.department = d.department;
        if (d.yearOfStudy) this._profile.yearOfStudy = parseInt(d.yearOfStudy) || this._profile.yearOfStudy;
        // Compute GPA from results if available
        var results = d.results || [];
        if (results.length > 0) {
            var marks = results.map(function(r) { return parseFloat(r.result) || 0; }).filter(function(m) { return m > 0; });
            if (marks.length > 0) this._profile.gpa = Math.round(marks.reduce(function(a,b) { return a+b; }, 0) / marks.length);
        }
        // Clear fake contact info when real identity is active
        this._profile.phone = d.phone || '';
        this._profile.location = d.location || '';
        this._profile.linkedin = '';
        this._profile.github = '';
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [
                {
                    name: 'skill',
                    columns: {
                        idx: { type: 'number', primaryKey: true },
                        name: { type: 'string', label: 'Skill' },
                        proficiency: { type: 'string', label: 'Proficiency' },
                        category: { type: 'string', label: 'Category' }
                    },
                    labeller: '{name}',
                    selectionMode: 'single'
                },
                {
                    name: 'experience',
                    columns: {
                        idx: { type: 'number', primaryKey: true },
                        title: { type: 'string', label: 'Title' },
                        org: { type: 'string', label: 'Organization' },
                        type: { type: 'string', label: 'Type' },
                        start: { type: 'string', label: 'Start' },
                        end: { type: 'string', label: 'End' },
                        desc: { type: 'string', label: 'Description' }
                    },
                    labeller: '{title} at {org}',
                    selectionMode: 'single'
                },
                {
                    name: 'opportunity',
                    columns: {
                        idx: { type: 'number', primaryKey: true },
                        type: { type: 'string', label: 'Type' },
                        title: { type: 'string', label: 'Title' },
                        provider: { type: 'string', label: 'Provider' },
                        matchScore: { type: 'number', label: 'Match %' },
                        deadline: { type: 'string', label: 'Deadline' },
                        location: { type: 'string', label: 'Location' },
                        status: { type: 'string', label: 'Status' }
                    },
                    labeller: '{title}',
                    selectionMode: 'single'
                },
                {
                    name: 'application',
                    columns: {
                        idx: { type: 'number', primaryKey: true },
                        title: { type: 'string', label: 'Title' },
                        provider: { type: 'string', label: 'Provider' },
                        type: { type: 'string', label: 'Type' },
                        appliedDate: { type: 'string', label: 'Applied' },
                        status: { type: 'string', label: 'Status' }
                    },
                    labeller: '{title}',
                    selectionMode: 'single'
                }
            ]
        });
        this._bindings = {};
    }

    _binding(name) {
        if (!this._bindings[name]) {
            this._bindings[name] = new UIBinding(this._publome.table(name), { publome: this._publome });
        }
        return this._bindings[name];
    }

    _loadPublomeData() {
        // Skills
        const st = this._publome.table('skill');
        st.all().forEach(r => st.delete(r.idx));
        this._skills.forEach(s => st.create({ idx: s.idx, name: s.name, proficiency: s.proficiency, category: s.category }));

        // Experience
        const et = this._publome.table('experience');
        et.all().forEach(r => et.delete(r.idx));
        this._experience.forEach(e => et.create({ idx: e.idx, title: e.title, org: e.org, type: e.type, start: e.start, end: e.end || '', desc: e.desc }));

        // Opportunities
        const ot = this._publome.table('opportunity');
        ot.all().forEach(r => ot.delete(r.idx));
        this._opportunities.forEach(o => ot.create({ idx: o.idx, type: o.type, title: o.title, provider: o.provider, matchScore: o.matchScore, deadline: o.deadline, location: o.location, status: o.status }));

        // Applications
        const at = this._publome.table('application');
        at.all().forEach(r => at.delete(r.idx));
        this._applications.forEach(a => at.create({ idx: a.idx, title: a.title, provider: a.provider, type: a.type, appliedDate: a.appliedDate, status: a.status }));
    }

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderView();
    }

    // ── Control Panel ────────────────────────────────────────────────────────

    _buildControl() {
        const el = this._controlEl;
        el.innerHTML = '';

        // Profile summary card
        const profileCard = document.createElement('div');
        profileCard.className = 'as-cw-section-divider';
        el.appendChild(profileCard);

        // Avatar + name
        const avatarRow = document.createElement('div');
        avatarRow.className = 'as-flex-row-center';
        avatarRow.style.marginBottom = '0.4rem';
        avatarRow.innerHTML = `
            <div class="as-avatar as-avatar-md as-cw-avatar-gradient">TN</div>
            <div>
                <div class="as-cw-name">${this._profile.name}</div>
                <div class="as-cw-role">${this._profile.studentId}</div>
            </div>`;
        profileCard.appendChild(avatarRow);

        // Programme badge
        const progRow = document.createElement('div');
        progRow.style.margin = '0.35rem 0';
        profileCard.appendChild(progRow);
        new uiBadge({ label: this._profile.programme, color: 'primary', size: 'xs', parent: progRow });

        // Progress bar
        const pct = Math.round((this._profile.creditsCompleted / this._profile.creditsRequired) * 100);
        const progBarWrap = document.createElement('div');
        progBarWrap.style.marginTop = '0.3rem';
        progBarWrap.innerHTML = `
            <div class="as-cw-student-detail" style="margin-bottom:2px;">Credits: ${this._profile.creditsCompleted}/${this._profile.creditsRequired} (${pct}%)</div>
            <div class="as-progress-track as-progress-track-sm">
                <div class="as-progress-fill" style="width: ${pct}%; background: var(--ui-primary-400);"></div>
            </div>`;
        profileCard.appendChild(progBarWrap);

        // Profile completion
        const completion = this._calcProfileCompletion();
        const compWrap = document.createElement('div');
        compWrap.style.marginTop = '0.35rem';
        compWrap.innerHTML = `
            <div class="as-cw-student-detail" style="margin-bottom:2px;">Profile: ${completion}%</div>
            <div class="as-progress-track as-progress-track-sm">
                <div class="as-progress-fill" style="width: ${completion}%; background: ${completion >= 80 ? 'var(--ui-green-500)' : completion >= 50 ? 'var(--ui-orange-400)' : 'var(--ui-red-400)'};"></div>
            </div>`;
        profileCard.appendChild(compWrap);

        // Accordion for navigation + filters
        const accordion = new uiAccordion({
            exclusive: true,
            content: {
                nav:     { label: '<i class="fas fa-compass" style="margin-right:0.3rem;"></i>Navigation', open: true },
                filters: { label: '<i class="fas fa-filter" style="margin-right:0.3rem;"></i>Opportunity Filters' },
                stats:   { label: '<i class="fas fa-chart-pie" style="margin-right:0.3rem;"></i>Quick Stats' }
            },
            parent: el
        });

        // ── Nav section ──
        const navEl = accordion.el.querySelector('.ui-accordion-item[data-key="nav"] .ui-accordion-content');
        this._renderNavButtons(navEl);

        // ── Filters section ──
        const filterEl = accordion.el.querySelector('.ui-accordion-item[data-key="filters"] .ui-accordion-content');
        this._renderFilters(filterEl);

        // ── Stats section ──
        const statsEl = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        this._renderQuickStats(statsEl);
    }

    _renderNavButtons(el) {
        el.innerHTML = '';
        const views = [
            { key: 'cv', label: 'My CV', icon: 'fa-file-alt' },
            { key: 'opportunities', label: 'Opportunities', icon: 'fa-search' },
            { key: 'applications', label: 'Applications', icon: 'fa-paper-plane' }
        ];

        views.forEach(v => {
            const btn = document.createElement('div');
            const isActive = this._activeView === v.key;
            btn.className = isActive ? 'ch-nav-btn-active' : 'ch-nav-btn';
            btn.innerHTML = `<i class="fas ${v.icon}" style="width: 14px; text-align: center; font-size: 0.7rem;"></i>${v.label}`;
            btn.addEventListener('click', () => {
                this._activeView = v.key;
                this._buildControl();
                this._renderView();
            });
            el.appendChild(btn);
        });

        // Application count badge
        const pendingCount = this._applications.filter(a => a.status === 'pending').length;
        if (pendingCount > 0) {
            const appBtn = el.querySelector('div:last-child');
            if (appBtn) {
                const badge = document.createElement('span');
                badge.className = 'as-badge';
                badge.style.cssText = 'margin-left: auto; background: var(--ui-orange-400); color: white;';
                badge.textContent = pendingCount;
                appBtn.appendChild(badge);
            }
        }
    }

    _renderFilters(el) {
        el.innerHTML = '';

        // Type filter
        const typeLabel = document.createElement('label');
        typeLabel.className = 'as-ctrl-label';
        typeLabel.textContent = 'Type';
        el.appendChild(typeLabel);

        const typeWrap = document.createElement('div');
        typeWrap.className = 'ui-input-wrapper';
        el.appendChild(typeWrap);
        const typeSel = document.createElement('select');
        typeSel.className = 'ui-input ui-input-sm';
        [['all','All Types'],['job','Jobs'],['bursary','Bursaries'],['internship','Internships'],['learnership','Learnerships']].forEach(([v,l]) => {
            const o = document.createElement('option'); o.value = v; o.textContent = l; typeSel.appendChild(o);
        });
        typeSel.value = this._filters.type;
        typeSel.addEventListener('change', () => {
            this._filters.type = typeSel.value;
            if (this._activeView === 'opportunities') this._renderView();
        });
        typeWrap.appendChild(typeSel);
        this._inputs.typeFilter = typeSel;

        // Match minimum
        const matchLabel = document.createElement('label');
        matchLabel.className = 'as-ctrl-label';
        matchLabel.style.marginTop = '0.4rem';
        matchLabel.textContent = 'Minimum Match';
        el.appendChild(matchLabel);

        const matchWrap = document.createElement('div');
        matchWrap.className = 'ui-input-wrapper';
        el.appendChild(matchWrap);
        const matchSel = document.createElement('select');
        matchSel.className = 'ui-input ui-input-sm';
        [['0','All (0%+)'],['50','Fair (50%+)'],['70','Good (70%+)'],['85','Excellent (85%+)']].forEach(([v,l]) => {
            const o = document.createElement('option'); o.value = v; o.textContent = l; matchSel.appendChild(o);
        });
        matchSel.value = String(this._filters.matchMin);
        matchSel.addEventListener('change', () => {
            this._filters.matchMin = parseInt(matchSel.value, 10);
            if (this._activeView === 'opportunities') this._renderView();
        });
        matchWrap.appendChild(matchSel);
        this._inputs.matchFilter = matchSel;

        // Deadline filter
        const dlLabel = document.createElement('label');
        dlLabel.className = 'as-ctrl-label';
        dlLabel.style.marginTop = '0.4rem';
        dlLabel.textContent = 'Deadline';
        el.appendChild(dlLabel);

        const dlWrap = document.createElement('div');
        dlWrap.className = 'ui-input-wrapper';
        el.appendChild(dlWrap);
        const dlSel = document.createElement('select');
        dlSel.className = 'ui-input ui-input-sm';
        [['open','Open Only'],['soon','Closing Soon (30d)'],['all','All']].forEach(([v,l]) => {
            const o = document.createElement('option'); o.value = v; o.textContent = l; dlSel.appendChild(o);
        });
        dlSel.value = this._filters.deadline;
        dlSel.addEventListener('change', () => {
            this._filters.deadline = dlSel.value;
            if (this._activeView === 'opportunities') this._renderView();
        });
        dlWrap.appendChild(dlSel);
        this._inputs.deadlineFilter = dlSel;
    }

    _renderQuickStats(el) {
        el.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'ch-stats-grid';
        el.appendChild(grid);

        this._binding('skill').bindMetric(grid, {
            compute: () => this._profile.gpa + '%',
            label: 'GPA', icon: 'fas fa-graduation-cap', color: this._profile.gpa >= 60 ? 'var(--ex-clr-success)' : 'var(--ex-clr-warning)'
        });
        this._binding('skill').bindMetric(grid, {
            compute: recs => String(recs.length),
            label: 'Skills', icon: 'fas fa-tools', color: 'var(--ex-clr-primary)'
        });
        this._binding('application').bindMetric(grid, {
            compute: recs => String(recs.length),
            label: 'Applications', icon: 'fas fa-paper-plane', color: 'var(--ex-clr-primary)'
        });
        this._binding('application').bindMetric(grid, {
            compute: recs => String(recs.filter(r => r.get('status') === 'shortlisted').length),
            label: 'Shortlisted', icon: 'fas fa-star', color: 'var(--ex-clr-success)'
        });
    }

    // ── Stage Rendering ──────────────────────────────────────────────────────

    _renderView() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-wrap';
        this._stageEl.style.overflowY = 'auto';

        if (this._activeView === 'cv') this._renderCV();
        else if (this._activeView === 'opportunities') this._renderOpportunities();
        else if (this._activeView === 'applications') this._renderApplications();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MY CV
    // ══════════════════════════════════════════════════════════════════════════

    _renderCV() {
        const el = this._stageEl;

        // Header row
        const header = document.createElement('div');
        header.className = 'as-flex-row-between as-mb-3';
        el.appendChild(header);

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `
            <div class="as-cw-view-title">My CV</div>
            <div class="as-text-sm as-text-muted">Build and manage your professional profile</div>`;
        header.appendChild(titleDiv);

        const btnRow = document.createElement('div');
        btnRow.className = 'as-flex-row';
        header.appendChild(btnRow);

        new uiButton({
            label: 'Preview', variant: 'outline', size: 'xs',
            icon: '<i class="fas fa-eye"></i>',
            parent: btnRow,
            onClick: () => this._showCVPreview()
        });
        new uiButton({
            label: 'Export PDF', variant: 'primary', size: 'xs',
            icon: '<i class="fas fa-file-pdf"></i>',
            parent: btnRow,
            onClick: () => this._showToast('PDF export would be generated here', 'info')
        });

        // CV Blocks
        this._renderCVBlock_Contact(el);
        this._renderCVBlock_Programme(el);
        this._renderCVBlock_Summary(el);
        this._renderCVBlock_Skills(el);
        this._renderCVBlock_Experience(el);
        this._renderCVBlock_Results(el);
    }

    _cvBlockHeader(parent, icon, title, verified, actions) {
        const block = document.createElement('div');
        block.className = 'ch-cv-block';
        parent.appendChild(block);

        const hdr = document.createElement('div');
        hdr.className = 'ch-cv-block-header';
        hdr.innerHTML = `<i class="fas fa-${icon} ch-cv-block-icon"></i>
            <span class="ch-cv-block-title">${title}</span>`;
        if (verified) {
            hdr.innerHTML += '<span class="ch-verified-badge"><i class="fas fa-check-circle" style="margin-right: 0.2rem;"></i>Verified</span>';
        }
        block.appendChild(hdr);

        if (actions) {
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'as-flex-row';
            actionsWrap.style.marginLeft = 'auto';
            hdr.appendChild(actionsWrap);
            actions(actionsWrap);
        }

        const body = document.createElement('div');
        body.className = 'ch-cv-block-body';
        block.appendChild(body);

        return body;
    }

    _renderCVBlock_Contact(parent) {
        const body = this._cvBlockHeader(parent, 'address-card', 'Contact Information', false, (wrap) => {
            new uiButton({
                label: 'Edit', variant: 'ghost', size: 'xs',
                icon: '<i class="fas fa-pen"></i>',
                parent: wrap,
                onClick: () => this._editContactModal()
            });
        });

        const grid = document.createElement('div');
        grid.className = 'as-grid-2col';
        grid.style.gap = '0.4rem 1.5rem';
        body.appendChild(grid);

        const fields = [
            { icon: 'envelope', label: 'Email', value: this._profile.email },
            { icon: 'phone', label: 'Phone', value: this._profile.phone },
            { icon: 'map-marker-alt', label: 'Location', value: this._profile.location },
            { icon: 'graduation-cap', label: 'Expected Graduation', value: this._profile.expectedGraduation }
        ];

        fields.forEach(f => {
            const item = document.createElement('div');
            item.className = 'ch-contact-field';
            item.innerHTML = `<i class="fas fa-${f.icon} ch-contact-icon"></i>
                <span class="ch-contact-label">${f.label}:</span>
                <span class="ch-contact-value">${f.value}</span>`;
            grid.appendChild(item);
        });

        // Social links
        const socialRow = document.createElement('div');
        socialRow.className = 'as-flex-row as-mt-2';
        socialRow.style.cssText = 'padding-top: 0.4rem; border-top: 1px solid var(--ui-gray-100); gap: 0.75rem;';
        body.appendChild(socialRow);

        if (this._profile.linkedin) {
            const li = document.createElement('a');
            li.className = 'ch-social-link';
            li.style.color = 'var(--ui-primary-500)';
            li.innerHTML = `<i class="fab fa-linkedin" style="font-size: 0.85rem;"></i>${this._profile.linkedin}`;
            socialRow.appendChild(li);
        }
        if (this._profile.github) {
            const gh = document.createElement('a');
            gh.className = 'ch-social-link';
            gh.style.color = 'var(--ui-gray-600)';
            gh.innerHTML = `<i class="fab fa-github" style="font-size: 0.85rem;"></i>${this._profile.github}`;
            socialRow.appendChild(gh);
        }
    }

    _renderCVBlock_Programme(parent) {
        const body = this._cvBlockHeader(parent, 'university', 'Programme', true);
        const p = this._profile;

        const grid = document.createElement('div');
        grid.className = 'ch-prog-grid';
        body.appendChild(grid);

        // Programme name (span 2)
        const progCard = document.createElement('div');
        progCard.className = 'ch-prog-highlight';
        progCard.style.gridColumn = 'span 2';
        progCard.innerHTML = `
            <div class="ch-detail-label" style="color: var(--ui-primary-600);">Programme</div>
            <div class="ch-detail-value" style="font-size: 0.85rem; margin-top: 0.15rem;">${p.programme}</div>
            <div class="as-text-xs as-text-muted" style="margin-top: 0.1rem;">${p.faculty} &middot; ${p.department}</div>`;
        grid.appendChild(progCard);

        // NQF Level
        const nqfCard = document.createElement('div');
        nqfCard.className = 'ch-detail-cell-center';
        nqfCard.innerHTML = `
            <div class="ch-detail-label">NQF Level</div>
            <div class="ch-detail-value" style="font-size: 1.4rem; font-weight: 800; color: var(--ui-primary-600);">${p.nqfLevel}</div>`;
        grid.appendChild(nqfCard);

        // Credits progress
        const creditsPct = Math.round((p.creditsCompleted / p.creditsRequired) * 100);
        const credCard = document.createElement('div');
        credCard.className = 'ch-detail-cell';
        credCard.innerHTML = `
            <div class="ch-detail-label">Credits</div>
            <div class="ch-detail-value" style="font-size: 1rem; margin-top: 0.15rem;">${p.creditsCompleted} / ${p.creditsRequired}</div>
            <div class="as-progress-track as-progress-track-md" style="margin-top: 0.3rem;">
                <div class="as-progress-fill" style="width: ${creditsPct}%; background: var(--ui-primary-400);"></div>
            </div>`;
        grid.appendChild(credCard);

        // Year of study + GPA + Expected graduation
        const metaRow = document.createElement('div');
        metaRow.className = 'as-flex-row';
        metaRow.style.gridColumn = 'span 2';
        grid.appendChild(metaRow);

        [
            { label: 'Year of Study', value: `${p.yearOfStudy}` },
            { label: 'GPA', value: `${p.gpa}%` },
            { label: 'Expected Graduation', value: p.expectedGraduation }
        ].forEach(m => {
            const mCard = document.createElement('div');
            mCard.className = 'ch-detail-cell-center';
            mCard.style.flex = '1';
            mCard.innerHTML = `
                <div class="ch-detail-label" style="font-size: 0.55rem;">${m.label}</div>
                <div class="ch-detail-value" style="font-size: 0.85rem;">${m.value}</div>`;
            metaRow.appendChild(mCard);
        });
    }

    _renderCVBlock_Summary(parent) {
        const body = this._cvBlockHeader(parent, 'user', 'Profile Summary', false, (wrap) => {
            new uiButton({
                label: 'Edit', variant: 'ghost', size: 'xs',
                icon: '<i class="fas fa-pen"></i>',
                parent: wrap,
                onClick: () => this._editSummaryModal()
            });
        });

        const headline = document.createElement('div');
        headline.className = 'ch-headline';
        headline.textContent = this._profile.headline;
        body.appendChild(headline);

        const bio = document.createElement('div');
        bio.className = 'ch-bio';
        bio.textContent = this._profile.bio;
        body.appendChild(bio);
    }

    _renderCVBlock_Skills(parent) {
        const body = this._cvBlockHeader(parent, 'tools', 'Skills', false, (wrap) => {
            new uiButton({
                label: 'Add', variant: 'ghost', size: 'xs',
                icon: '<i class="fas fa-plus"></i>',
                parent: wrap,
                onClick: () => this._addSkillModal()
            });
        });

        this._binding('skill').bindCollection(body, {
            component: 'card',
            map: r => ({
                title: r.get('name'),
                subtitle: r.get('proficiency'),
                content: r.get('category')
            })
        });
    }

    _renderCVBlock_Experience(parent) {
        const body = this._cvBlockHeader(parent, 'briefcase', 'Experience', false, (wrap) => {
            new uiButton({
                label: 'Add', variant: 'ghost', size: 'xs',
                icon: '<i class="fas fa-plus"></i>',
                parent: wrap,
                onClick: () => this._addExperienceModal()
            });
        });

        this._binding('experience').bindCollection(body, {
            component: 'card',
            map: r => ({
                title: r.get('title'),
                subtitle: r.get('org') + ' \u00b7 ' + r.get('type') + ' \u00b7 ' + r.get('start') + ' \u2013 ' + (r.get('end') || 'Present'),
                content: r.get('desc')
            })
        });
    }

    _renderCVBlock_Results(parent) {
        const body = this._cvBlockHeader(parent, 'certificate', 'Academic Results', true);

        // Group by year/semester
        const grouped = {};
        this._results.forEach(r => {
            const key = `${r.year} ${r.semester}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(r);
        });

        const sortedKeys = Object.keys(grouped).sort().reverse();
        sortedKeys.forEach(key => {
            const groupLabel = document.createElement('div');
            groupLabel.className = 'ch-skill-group-label';
            groupLabel.style.margin = '0.5rem 0 0.25rem 0';
            groupLabel.textContent = key;
            body.appendChild(groupLabel);

            grouped[key].forEach(r => {
                const row = document.createElement('div');
                row.className = 'ch-result-row as-hover-row';

                const markColor = r.mark >= 75 ? 'var(--ui-green-600)' : r.mark >= 50 ? 'var(--ui-gray-800)' : 'var(--ui-red-600)';
                row.innerHTML = `
                    <code class="ch-result-code">${r.code}</code>
                    <span class="ch-result-name">${r.name}</span>
                    <span class="ch-result-mark" style="color: ${markColor};">${r.mark}%</span>
                    <i class="fas fa-check-circle" style="color: var(--ui-green-400); font-size: 0.6rem;" title="Verified"></i>`;
                body.appendChild(row);
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // OPPORTUNITIES
    // ══════════════════════════════════════════════════════════════════════════

    _renderOpportunities() {
        const el = this._stageEl;

        // Header
        const header = document.createElement('div');
        header.className = 'as-flex-row-between as-mb-3';
        el.appendChild(header);

        const filtered = this._getFilteredOpportunities();

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `
            <div class="as-cw-view-title">Opportunities</div>
            <div class="as-text-sm as-text-muted">${filtered.length} matching opportunities</div>`;
        header.appendChild(titleDiv);

        // KPI row
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        el.appendChild(kpiRow);

        const ob = this._binding('opportunity');
        ob.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => r.get('type') === 'bursary').length), label: 'Bursaries', icon: 'fas fa-graduation-cap', color: 'var(--ex-clr-success)' });
        ob.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => r.get('type') === 'job').length), label: 'Jobs', icon: 'fas fa-briefcase', color: 'var(--ui-blue-700)' });
        ob.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => r.get('type') === 'internship').length), label: 'Internships', icon: 'fas fa-building', color: 'var(--ex-clr-purple)' });
        ob.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => r.get('type') === 'learnership').length), label: 'Learnerships', icon: 'fas fa-user-graduate', color: 'var(--ex-clr-warning)' });

        // Card grid — use rich opportunity cards with Apply/Details actions
        const grid = document.createElement('div');
        grid.className = 'as-grid-auto';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(18rem, 1fr))';
        el.appendChild(grid);

        filtered.sort((a, b) => b.matchScore - a.matchScore);

        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'as-loading-state';
            empty.style.gridColumn = '1 / -1';
            empty.innerHTML = '<i class="fas fa-search as-loading-icon"></i><span class="as-loading-text">No matching opportunities</span>';
            grid.appendChild(empty);
        } else {
            filtered.forEach(opp => grid.appendChild(this._createOpportunityCard(opp)));
        }
    }

    _getFilteredOpportunities() {
        return this._opportunities.filter(o => {
            if (this._filters.type !== 'all' && o.type !== this._filters.type) return false;
            if (o.matchScore < this._filters.matchMin) return false;
            if (this._filters.deadline === 'open') {
                if (new Date(o.deadline) < new Date()) return false;
            } else if (this._filters.deadline === 'soon') {
                const dl = new Date(o.deadline);
                const now = new Date();
                const daysLeft = (dl - now) / (1000 * 60 * 60 * 24);
                if (daysLeft < 0 || daysLeft > 30) return false;
            }
            return true;
        });
    }

    _createOpportunityCard(opp) {
        const card = document.createElement('div');
        card.className = 'ch-opp-card';

        const typeLabels = {
            bursary: { label: 'Bursary', color: 'var(--ex-clr-success)', bg: 'var(--ui-green-50, #f0fdf4)', border: 'var(--ui-green-200, #bbf7d0)' },
            job: { label: 'Job', color: 'var(--ui-blue-700)', bg: 'var(--ui-blue-50, #eff6ff)', border: 'var(--ui-blue-200, #bfdbfe)' },
            internship: { label: 'Internship', color: 'var(--ex-clr-purple)', bg: 'var(--ui-purple-50, #f5f3ff)', border: 'var(--ui-purple-200, #c4b5fd)' },
            learnership: { label: 'Learnership', color: 'var(--ex-clr-warning)', bg: 'var(--ui-amber-50, #fffbeb)', border: 'var(--ui-amber-200, #fde68a)' }
        };
        const ti = typeLabels[opp.type] || typeLabels.job;

        // Top row: type badge + match score
        const matchClass = opp.matchScore >= 80 ? 'ch-match-high' : opp.matchScore >= 60 ? 'ch-match-medium' : 'ch-match-low';
        const topRow = document.createElement('div');
        topRow.className = 'ch-opp-top';
        topRow.innerHTML = `
            <span class="ch-type-badge" style="background: ${ti.bg}; color: ${ti.color}; border-color: ${ti.border};">${ti.label}</span>
            <span class="ch-match-score ${matchClass}" title="Match score">${opp.matchScore}% match</span>`;
        card.appendChild(topRow);

        // Title
        const title = document.createElement('div');
        title.className = 'ch-opp-title';
        title.textContent = opp.title;
        card.appendChild(title);

        // Provider
        const provider = document.createElement('div');
        provider.className = 'ch-opp-provider';
        provider.textContent = opp.provider;
        card.appendChild(provider);

        // Meta row
        const meta = document.createElement('div');
        meta.className = 'ch-opp-meta';
        meta.innerHTML = `<span><i class="fas fa-map-marker-alt" style="margin-right: 0.2rem;"></i>${opp.location}${opp.remote ? ' (Remote)' : ''}</span>`;
        if (opp.salary) meta.innerHTML += `<span><i class="fas fa-coins" style="margin-right: 0.2rem;"></i>${opp.salary}</span>`;
        if (opp.funding) meta.innerHTML += `<span><i class="fas fa-wallet" style="margin-right: 0.2rem;"></i>${opp.funding}</span>`;
        card.appendChild(meta);

        // Deadline
        const dl = new Date(opp.deadline);
        const now = new Date();
        const daysLeft = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
        const deadlineClass = daysLeft <= 14 ? 'ch-deadline-urgent' : daysLeft <= 30 ? 'ch-deadline-soon' : 'ch-deadline-safe';
        const dlDiv = document.createElement('div');
        dlDiv.className = `ch-opp-deadline ${deadlineClass}`;
        dlDiv.innerHTML = `<i class="fas fa-clock" style="margin-right: 0.2rem;"></i>${daysLeft > 0 ? daysLeft + ' days left' : 'Closed'}`;
        card.appendChild(dlDiv);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'ch-opp-actions';
        card.appendChild(actions);

        const hasApplied = this._applications.some(a => a.opportunityIdx === opp.idx);

        new uiButton({
            label: hasApplied ? 'Applied' : 'Apply',
            variant: hasApplied ? 'outline' : 'primary',
            size: 'xs',
            icon: hasApplied ? '<i class="fas fa-check"></i>' : '<i class="fas fa-paper-plane"></i>',
            parent: actions,
            disabled: hasApplied,
            onClick: () => { if (!hasApplied) this._applyModal(opp); }
        });

        new uiButton({
            label: 'Details', variant: 'ghost', size: 'xs',
            icon: '<i class="fas fa-info-circle"></i>',
            parent: actions,
            onClick: () => this._opportunityDetailModal(opp)
        });

        return card;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // APPLICATIONS
    // ══════════════════════════════════════════════════════════════════════════

    _renderApplications() {
        const el = this._stageEl;

        // Header
        const header = document.createElement('div');
        header.className = 'as-flex-row-between as-mb-3';
        el.appendChild(header);

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `
            <div class="as-cw-view-title">My Applications</div>
            <div class="as-text-sm as-text-muted">Track the status of your submitted applications</div>`;
        header.appendChild(titleDiv);

        // Status KPIs
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        el.appendChild(kpiRow);

        const ab = this._binding('application');
        ab.bindMetric(kpiRow, { compute: recs => String(recs.length), label: 'Total', icon: 'fas fa-file-alt', color: 'var(--ui-gray-700)' });
        ab.bindMetric(kpiRow, { compute: recs => String(recs.filter(r => ['pending', 'reviewed', 'shortlisted'].includes(r.get('status'))).length), label: 'Active', icon: 'fas fa-spinner', color: 'var(--ex-clr-purple)' });

        // Applications list
        this._binding('application').bindCollection(el, {
            component: 'card',
            map: r => ({
                title: r.get('title'),
                subtitle: r.get('provider') + ' \u00b7 ' + r.get('type') + ' \u00b7 Applied ' + r.get('appliedDate'),
                content: 'Status: ' + r.get('status')
            })
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MODALS
    // ══════════════════════════════════════════════════════════════════════════

    _editContactModal() {
        const fields = [
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'location', label: 'Location', type: 'text' },
            { key: 'expectedGraduation', label: 'Expected Graduation', type: 'text' },
            { key: 'linkedin', label: 'LinkedIn', type: 'text' },
            { key: 'github', label: 'GitHub', type: 'text' }
        ];

        const modal = new uiModal({
            title: 'Edit Contact Information',
            size: 'md'
        });

        const form = new uiForm({
            fields: fields.map(f => ({
                key: f.key, label: f.label, type: f.type,
                value: this._profile[f.key] || ''
            })),
            parent: modal.getBody(),
            onSubmit: (data) => {
                Object.assign(this._profile, data);
                modal.close();
                this._renderView();
                this._showToast('Contact information updated', 'success');
            },
            onCancel: () => modal.close(),
            submitLabel: 'Save'
        });

        modal.open();
    }

    _editSummaryModal() {
        const modal = new uiModal({
            title: 'Edit Profile Summary',
            size: 'md'
        });

        const form = new uiForm({
            fields: [
                { key: 'headline', label: 'Headline', type: 'text', value: this._profile.headline },
                { key: 'bio', label: 'Bio / Summary', type: 'textarea', value: this._profile.bio }
            ],
            parent: modal.getBody(),
            onSubmit: (data) => {
                Object.assign(this._profile, data);
                modal.close();
                this._renderView();
                this._showToast('Profile summary updated', 'success');
            },
            onCancel: () => modal.close(),
            submitLabel: 'Save'
        });

        modal.open();
    }

    _addSkillModal() {
        const modal = new uiModal({
            title: 'Add Skill',
            size: 'sm'
        });

        const form = new uiForm({
            fields: [
                { key: 'name', label: 'Skill Name', type: 'text', required: true },
                { key: 'proficiency', label: 'Proficiency', type: 'select', options: [
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' },
                    { value: 'expert', label: 'Expert' }
                ], value: 'intermediate' },
                { key: 'category', label: 'Category', type: 'select', options: [
                    { value: 'technical', label: 'Technical' },
                    { value: 'soft', label: 'Soft Skill' }
                ], value: 'technical' }
            ],
            parent: modal.getBody(),
            onSubmit: (data) => {
                if (this._careerService) {
                    const skill = this._careerService.addSkill(this._memberId, data.name, data.proficiency, data.category);
                    this._skills.push({ idx: skill.idx, name: data.name, proficiency: data.proficiency, category: data.category });
                } else {
                    this._skills.push({ idx: this._skills.length + 1, ...data });
                }
                modal.close();
                this._renderView();
                this._showToast(`Skill "${data.name}" added`, 'success');
            },
            onCancel: () => modal.close(),
            submitLabel: 'Add Skill'
        });

        modal.open();
    }

    _addExperienceModal() {
        const modal = new uiModal({
            title: 'Add Experience',
            size: 'md'
        });

        const form = new uiForm({
            fields: [
                { key: 'title', label: 'Title / Role', type: 'text', required: true },
                { key: 'org', label: 'Organization', type: 'text', required: true },
                { key: 'type', label: 'Type', type: 'select', options: [
                    { value: 'work', label: 'Work' },
                    { value: 'internship', label: 'Internship' },
                    { value: 'volunteer', label: 'Volunteer' },
                    { value: 'project', label: 'Project' }
                ], value: 'work' },
                { key: 'start', label: 'Start Date', type: 'text', placeholder: 'YYYY-MM' },
                { key: 'end', label: 'End Date', type: 'text', placeholder: 'YYYY-MM or leave blank for current' },
                { key: 'desc', label: 'Description', type: 'textarea' }
            ],
            parent: modal.getBody(),
            onSubmit: (data) => {
                if (this._careerService) {
                    const exp = this._careerService.addExperience(this._memberId, {
                        title: data.title, organization: data.org, type: data.type,
                        startDate: data.start, endDate: data.end || null, description: data.desc
                    });
                    this._experience.push({ idx: exp.idx, ...data });
                } else {
                    this._experience.push({ idx: this._experience.length + 1, ...data });
                }
                modal.close();
                this._renderView();
                this._showToast(`Experience "${data.title}" added`, 'success');
            },
            onCancel: () => modal.close(),
            submitLabel: 'Add Experience'
        });

        modal.open();
    }

    _opportunityDetailModal(opp) {
        const modal = new uiModal({
            title: opp.title,
            size: 'lg'
        });

        const body = modal.getBody();
        body.className = 'as-p-3 as-text-sm';
        body.style.lineHeight = '1.6';

        const typeLabels = {
            bursary: { label: 'Bursary', color: 'var(--ex-clr-success)', bg: 'var(--ui-green-50, #f0fdf4)' },
            job: { label: 'Job', color: 'var(--ui-blue-700)', bg: 'var(--ui-blue-50, #eff6ff)' },
            internship: { label: 'Internship', color: 'var(--ex-clr-purple)', bg: 'var(--ui-purple-50, #f5f3ff)' },
            learnership: { label: 'Learnership', color: 'var(--ex-clr-warning)', bg: 'var(--ui-amber-50, #fffbeb)' }
        };
        const ti = typeLabels[opp.type] || typeLabels.job;

        body.innerHTML = `
            <div class="as-flex-row-center as-mb-2">
                <span class="as-badge" style="background:${ti.bg};color:${ti.color};text-transform:uppercase;">${ti.label}</span>
                <span class="as-text-sm as-text-muted">${opp.provider}</span>
                <span class="as-text-bold" style="margin-left:auto;color:${opp.matchScore >= 80 ? 'var(--ex-clr-success)' : 'var(--ex-clr-warning)'};">${opp.matchScore}% match</span>
            </div>
            <p style="color:var(--ui-gray-700);">${opp.description}</p>
            <div class="as-grid-2col" style="margin:0.75rem 0;gap:0.5rem;">
                <div class="ch-detail-cell">
                    <div class="ch-detail-label">Location</div>
                    <div class="ch-detail-value">${opp.location}${opp.remote ? ' (Remote)' : ''}</div>
                </div>
                <div class="ch-detail-cell">
                    <div class="ch-detail-label">Deadline</div>
                    <div class="ch-detail-value">${opp.deadline}</div>
                </div>
                ${opp.salary ? `<div class="ch-detail-cell"><div class="ch-detail-label">Salary</div><div class="ch-detail-value">${opp.salary}</div></div>` : ''}
                ${opp.funding ? `<div class="ch-detail-cell"><div class="ch-detail-label">Funding</div><div class="ch-detail-value">${opp.funding} (${opp.coverage})</div></div>` : ''}
            </div>
            <div class="as-text-bold" style="margin:0.75rem 0 0.3rem;">Requirements</div>
            <div class="as-mb-2">
                ${opp.requirements.map(r => `<div class="as-flex-row-center" style="padding:0.2rem 0;font-size:0.78rem;gap:0.3rem;"><i class="fas fa-check-circle" style="color:var(--ui-green-400);font-size:0.7rem;"></i>${r}</div>`).join('')}
            </div>`;

        const hasApplied = this._applications.some(a => a.opportunityIdx === opp.idx);
        const btnRow = document.createElement('div');
        btnRow.className = 'as-cw-modal-actions';
        btnRow.style.justifyContent = 'flex-end';
        body.appendChild(btnRow);

        new uiButton({
            label: 'Close', variant: 'outline', size: 'sm',
            parent: btnRow,
            onClick: () => modal.close()
        });

        if (!hasApplied) {
            new uiButton({
                label: 'Apply Now', variant: 'primary', size: 'sm',
                icon: '<i class="fas fa-paper-plane"></i>',
                parent: btnRow,
                onClick: () => { modal.close(); this._applyModal(opp); }
            });
        }

        modal.open();
    }

    _applyModal(opp) {
        const modal = new uiModal({
            title: `Apply: ${opp.title}`,
            size: 'md'
        });

        const body = modal.getBody();
        body.className = 'as-p-3';

        new uiAlert({
            color: 'info',
            title: 'Application',
            message: `You are applying to "${opp.title}" at ${opp.provider}. Your CV will be attached automatically.`,
            parent: body
        });

        const form = new uiForm({
            fields: [
                { key: 'coverLetter', label: 'Cover Letter', type: 'textarea', placeholder: 'Write a brief cover letter explaining your interest and qualifications...' }
            ],
            parent: body,
            onSubmit: (data) => {
                let appIdx;
                if (this._careerService) {
                    const app = this._careerService.applyTo(this._memberId, 'opportunity', opp.idx, data.coverLetter || '');
                    appIdx = app.idx;
                } else {
                    appIdx = this._applications.length + 1;
                }
                this._applications.push({
                    idx: appIdx,
                    opportunityIdx: opp.idx,
                    title: opp.title,
                    provider: opp.provider,
                    type: opp.type,
                    appliedDate: new Date().toISOString().slice(0, 10),
                    status: 'pending',
                    coverLetter: data.coverLetter || ''
                });
                modal.close();
                this._buildControl();
                this._renderView();
                this._showToast(`Application submitted for "${opp.title}"`, 'success');
            },
            onCancel: () => modal.close(),
            submitLabel: 'Submit Application'
        });

        modal.open();
    }

    _applicationDetailModal(app) {
        const modal = new uiModal({
            title: app.title,
            size: 'md'
        });

        const body = modal.getBody();
        body.className = 'as-p-3 as-text-sm';
        body.style.lineHeight = '1.6';

        const statusConfig = {
            pending:     { label: 'Pending', color: 'var(--ex-clr-warning)', bg: 'var(--ui-amber-50, #fffbeb)', border: 'var(--ui-amber-200, #fde68a)', icon: 'hourglass-half' },
            reviewed:    { label: 'Reviewed', color: 'var(--ui-blue-700)', bg: 'var(--ui-blue-50, #eff6ff)', border: 'var(--ui-blue-200, #bfdbfe)', icon: 'eye' },
            shortlisted: { label: 'Shortlisted', color: 'var(--ex-clr-purple)', bg: 'var(--ui-purple-50, #f5f3ff)', border: 'var(--ui-purple-200, #c4b5fd)', icon: 'star' },
            accepted:    { label: 'Accepted', color: 'var(--ex-clr-success)', bg: 'var(--ui-green-50, #f0fdf4)', border: 'var(--ui-green-200, #bbf7d0)', icon: 'check-circle' },
            rejected:    { label: 'Rejected', color: 'var(--ex-clr-danger)', bg: 'var(--ui-red-50, #fef2f2)', border: 'var(--ui-red-200, #fecaca)', icon: 'times-circle' }
        };
        const sc = statusConfig[app.status] || statusConfig.pending;

        body.innerHTML = `
            <div class="as-flex-row-center as-mb-2">
                <span class="as-text-sm as-text-muted">${app.provider}</span>
                <span class="as-text-xs" style="text-transform:capitalize;color:var(--ui-gray-400);">${app.type}</span>
                <span class="as-badge" style="margin-left:auto;background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};">${sc.label}</span>
            </div>
            <div class="as-grid-2col as-mb-2" style="gap:0.5rem;">
                <div class="ch-detail-cell">
                    <div class="ch-detail-label">Applied</div>
                    <div class="ch-detail-value">${app.appliedDate}</div>
                </div>
                <div class="ch-detail-cell" style="background:${sc.bg};">
                    <div class="ch-detail-label">Status</div>
                    <div class="ch-detail-value" style="color:${sc.color};text-transform:capitalize;">${app.status}</div>
                </div>
            </div>
            ${app.coverLetter ? `
                <div class="as-text-bold" style="margin-bottom:0.3rem;">Cover Letter</div>
                <div class="as-cw-modal-desc">${app.coverLetter}</div>
            ` : ''}`;

        const btnRow = document.createElement('div');
        btnRow.className = 'as-cw-modal-actions';
        btnRow.style.justifyContent = 'flex-end';
        body.appendChild(btnRow);

        new uiButton({
            label: 'Close', variant: 'outline', size: 'sm',
            parent: btnRow,
            onClick: () => modal.close()
        });

        if (app.status === 'pending') {
            new uiButton({
                label: 'Withdraw', variant: 'danger', size: 'sm',
                icon: '<i class="fas fa-times"></i>',
                parent: btnRow,
                onClick: () => {
                    if (this._careerService) {
                        this._careerService.table('application').delete(app.idx);
                    }
                    this._applications = this._applications.filter(a => a.idx !== app.idx);
                    modal.close();
                    this._buildControl();
                    this._renderView();
                    this._showToast('Application withdrawn', 'warning');
                }
            });
        }

        modal.open();
    }

    _showCVPreview() {
        const modal = new uiModal({
            title: 'CV Preview',
            size: 'lg'
        });

        const body = modal.getBody();
        // CV preview uses a document-style serif layout (intentionally distinct from app UI)
        body.style.cssText = 'padding: 2rem; font-family: Georgia, serif; max-width: 600px; margin: 0 auto; line-height: 1.6; font-size: 0.85rem;';

        const p = this._profile;
        let html = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h1 style="font-size: 1.5rem; margin: 0; font-weight: 700;">${p.name}</h1>
                <div style="color: #666; margin-top: 0.3rem;">${p.headline}</div>
                <div style="font-size: 0.75rem; color: #888; margin-top: 0.3rem;">${p.email} | ${p.phone} | ${p.location}</div>
            </div>

            <div style="margin-bottom: 1rem;">
                <h2 style="font-size: 0.9rem; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Profile Summary</h2>
                <p style="margin: 0;">${p.bio}</p>
            </div>

            <div style="margin-bottom: 1rem;">
                <h2 style="font-size: 0.9rem; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Education</h2>
                <div><strong>${p.programme}</strong> — ${p.faculty}</div>
                <div style="color: #666;">NQF Level ${p.nqfLevel} | Year ${p.yearOfStudy} | GPA: ${p.gpa}% | Credits: ${p.creditsCompleted}/${p.creditsRequired}</div>
            </div>

            <div style="margin-bottom: 1rem;">
                <h2 style="font-size: 0.9rem; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Skills</h2>
                <div>${this._skills.map(s => s.name).join(' | ')}</div>
            </div>`;

        if (this._experience.length) {
            html += `<div style="margin-bottom: 1rem;"><h2 style="font-size: 0.9rem; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Experience</h2>`;
            this._experience.forEach(e => {
                html += `<div style="margin-bottom: 0.6rem;"><strong>${e.title}</strong> — ${e.org} (${e.start} \u2013 ${e.end || 'Present'})<div style="color: #555; font-size: 0.8rem;">${e.desc}</div></div>`;
            });
            html += `</div>`;
        }

        html += `<div><h2 style="font-size: 0.9rem; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Academic Results</h2>`;
        this._results.slice(0, 6).forEach(r => {
            html += `<div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 0.15rem 0;"><span>${r.code} — ${r.name}</span><strong>${r.mark}%</strong></div>`;
        });
        html += `</div>`;

        body.innerHTML = html;

        const footer = document.createElement('div');
        footer.className = 'as-cw-modal-actions';
        footer.style.justifyContent = 'flex-end';
        modal.getBody().parentElement.appendChild(footer);

        new uiButton({
            label: 'Close', variant: 'outline', size: 'sm',
            parent: footer,
            onClick: () => modal.close()
        });

        modal.open();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _calcProfileCompletion() {
        let score = 0, total = 8;
        if (this._profile.headline) score++;
        if (this._profile.bio) score++;
        if (this._profile.phone) score++;
        if (this._profile.location) score++;
        if (this._profile.linkedin) score++;
        if (this._skills.length >= 3) score++;
        if (this._experience.length > 0) score++;
        if (this._results.length > 0) score++;
        return Math.round((score / total) * 100);
    }

    _showToast(message, type) {
        // Visual feedback via uiAlert
        const variant = type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'error' ? 'danger' : 'info';
        new uiAlert({ variant, message, parent: this._stageEl, dismissible: true, autoClose: 3000 });
        // Also log to testrig
        if (typeof log === 'function') {
            log('CareerHub', message);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CareerHubPanel;
}
if (typeof window !== 'undefined') {
    window.CareerHubPanel = CareerHubPanel;
}
