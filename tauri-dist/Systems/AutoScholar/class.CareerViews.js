/**
 * CareerViews - Static render methods for Career Hub panels
 *
 * Called by AutoScholarStudent._renderCareerHub() to render:
 * - Dashboard overview with matching bursaries/jobs
 * - Bursaries list with filter/card grid
 * - Jobs list with filter/card grid
 * - Applications tracker with status tabs
 *
 * Delegates to CareerService for data access.
 */
class CareerViews {

    // ── Dashboard ──────────────────────────────────────────────────────────

    static renderDashboard(container, career, memberId) {
        const profile = career.getOrCreateProfile(memberId);
        const skills = career.getSkills?.(memberId) || [];
        const applications = career.getApplications?.(memberId) || [];
        const bursaries = career.getBursaries?.() || [];
        const jobs = career.getJobs?.() || [];

        // KPI row
        const kpiRow = container.add({ css: 'flex flex-wrap gap-3 mb-4' });
        CareerViews._renderKPI(kpiRow, 'user-circle', 'Profile', profile.headline ? 'Complete' : 'Incomplete',
            profile.headline ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50');
        CareerViews._renderKPI(kpiRow, 'code', 'Skills', String(skills.length), 'text-blue-600 bg-blue-50');
        CareerViews._renderKPI(kpiRow, 'graduation-cap', 'Bursaries', String(bursaries.length), 'text-purple-600 bg-purple-50');
        CareerViews._renderKPI(kpiRow, 'briefcase', 'Jobs', String(jobs.length), 'text-indigo-600 bg-indigo-50');
        CareerViews._renderKPI(kpiRow, 'paper-plane', 'Applications', String(applications.length), 'text-teal-600 bg-teal-50');

        // Matching opportunities section
        const matchSection = container.add({ css: 'mb-4' });
        matchSection.add({ css: 'font-semibold text-lg mb-3 flex items-center gap-2' })
            .domElement.innerHTML = '<i class="fas fa-star text-yellow-500"></i> Top Matches';

        // Match bursaries to student profile
        const matchedBursaries = CareerViews._matchOpportunities(bursaries, profile, skills);
        const matchedJobs = CareerViews._matchOpportunities(jobs, profile, skills);
        const topMatches = [...matchedBursaries, ...matchedJobs]
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
            .slice(0, 4);

        if (topMatches.length > 0) {
            const grid = matchSection.add({ css: 'flex flex-wrap gap-3' });
            topMatches.forEach(opp => CareerViews._renderOpportunityCard(grid, opp, career, memberId));
        } else {
            matchSection.add({ css: 'text-center py-6 text-muted' })
                .domElement.innerHTML = '<i class="fas fa-search text-3xl mb-2 opacity-50"></i><p>Add skills to your profile to get matched opportunities</p>';
        }

        // Recent applications
        if (applications.length > 0) {
            const appsSection = container.add({ css: 'mt-4' });
            appsSection.add({ css: 'font-semibold text-lg mb-3 flex items-center gap-2' })
                .domElement.innerHTML = '<i class="fas fa-clock text-blue-500"></i> Recent Applications';

            const appsList = appsSection.add({ css: 'space-y-2' });
            applications.slice(0, 3).forEach(app => {
                const row = appsList.add({ css: 'card p-3 flex items-center justify-between' });
                const info = row.add({ css: 'flex items-center gap-3' });
                const icon = app.type === 'bursary' ? 'graduation-cap text-green-500' : 'briefcase text-blue-500';
                info.add({ tag: 'i', css: `fas fa-${icon}` });
                info.add({ css: 'font-medium text-sm', script: app.title || app.opportunityTitle || 'Application' });

                const statusColors = {
                    pending: 'bg-yellow-100 text-yellow-700',
                    submitted: 'bg-blue-100 text-blue-700',
                    accepted: 'bg-green-100 text-green-700',
                    rejected: 'bg-red-100 text-red-700',
                    interview: 'bg-purple-100 text-purple-700'
                };
                const statusCss = statusColors[app.status] || 'bg-gray-100 text-gray-700';
                row.add({ css: `text-xs px-2 py-1 rounded-full capitalize ${statusCss}`, script: app.status || 'pending' });
            });
        }
    }

    // ── Bursaries List ─────────────────────────────────────────────────────

    static renderBursariesList(container, career, memberId) {
        const bursaries = career.getBursaries?.() || [];
        const profile = career.getOrCreateProfile(memberId);
        const skills = career.getSkills?.(memberId) || [];

        // Header
        const header = container.add({ css: 'flex items-center justify-between mb-4' });
        header.add({ css: 'flex items-center gap-2' })
            .domElement.innerHTML = '<i class="fas fa-graduation-cap text-green-500 text-xl"></i><span class="text-lg font-semibold">Bursaries</span>';
        header.add({ css: 'text-sm text-muted', script: `${bursaries.length} available` });

        if (bursaries.length === 0) {
            container.add({ css: 'text-center py-8 text-muted' })
                .domElement.innerHTML = '<i class="fas fa-graduation-cap text-4xl mb-3 opacity-50"></i><p>No bursaries available at this time</p>';
            return;
        }

        // Filter row
        CareerViews._renderFilterRow(container, bursaries, 'bursary');

        // Cards grid
        const grid = container.add({ css: 'flex flex-wrap gap-3 mt-3' });
        const matched = CareerViews._matchOpportunities(bursaries, profile, skills);
        matched.forEach(opp => CareerViews._renderOpportunityCard(grid, opp, career, memberId));
    }

    // ── Jobs List ──────────────────────────────────────────────────────────

    static renderJobsList(container, career, memberId) {
        const jobs = career.getJobs?.() || [];
        const profile = career.getOrCreateProfile(memberId);
        const skills = career.getSkills?.(memberId) || [];

        // Header
        const header = container.add({ css: 'flex items-center justify-between mb-4' });
        header.add({ css: 'flex items-center gap-2' })
            .domElement.innerHTML = '<i class="fas fa-briefcase text-blue-500 text-xl"></i><span class="text-lg font-semibold">Jobs & Internships</span>';
        header.add({ css: 'text-sm text-muted', script: `${jobs.length} available` });

        if (jobs.length === 0) {
            container.add({ css: 'text-center py-8 text-muted' })
                .domElement.innerHTML = '<i class="fas fa-briefcase text-4xl mb-3 opacity-50"></i><p>No jobs available at this time</p>';
            return;
        }

        // Filter row
        CareerViews._renderFilterRow(container, jobs, 'job');

        // Cards grid
        const grid = container.add({ css: 'flex flex-wrap gap-3 mt-3' });
        const matched = CareerViews._matchOpportunities(jobs, profile, skills);
        matched.forEach(opp => CareerViews._renderOpportunityCard(grid, opp, career, memberId));
    }

    // ── Applications ───────────────────────────────────────────────────────

    static renderApplications(container, career, memberId) {
        const applications = career.getApplications?.(memberId) || [];

        // Header
        const header = container.add({ css: 'flex items-center justify-between mb-4' });
        header.add({ css: 'flex items-center gap-2' })
            .domElement.innerHTML = '<i class="fas fa-paper-plane text-teal-500 text-xl"></i><span class="text-lg font-semibold">My Applications</span>';
        header.add({ css: 'text-sm text-muted', script: `${applications.length} total` });

        if (applications.length === 0) {
            container.add({ css: 'text-center py-8 text-muted' })
                .domElement.innerHTML = '<i class="fas fa-inbox text-4xl mb-3 opacity-50"></i><p>No applications yet. Browse bursaries and jobs to apply!</p>';
            return;
        }

        // Status tabs
        const statuses = ['all', 'pending', 'submitted', 'interview', 'accepted', 'rejected'];
        const tabRow = container.add({ css: 'flex gap-1 mb-4 flex-wrap' });
        statuses.forEach(status => {
            const count = status === 'all' ? applications.length :
                applications.filter(a => a.status === status).length;
            if (count === 0 && status !== 'all') return;

            const tab = tabRow.add({
                css: 'px-3 py-1 rounded-full text-sm cursor-pointer transition-all bg-gray-100 text-gray-600 hover:bg-gray-200',
                script: `${status.charAt(0).toUpperCase() + status.slice(1)} (${count})`
            });

            tab.domElement.onclick = () => {
                // Filter applications
                const filtered = status === 'all' ? applications :
                    applications.filter(a => a.status === status);

                // Re-render list
                const listEl = container.domElement.querySelector('[data-apps-list]');
                if (listEl) {
                    listEl.innerHTML = '';
                    const listContainer = { add: (opts) => {
                        const el = document.createElement('div');
                        if (opts.css) el.className = opts.css;
                        if (opts.script) el.textContent = opts.script;
                        listEl.appendChild(el);
                        return { domElement: el, add: (o) => {
                            const c = document.createElement(o.tag || 'div');
                            if (o.css) c.className = o.css;
                            if (o.script) c.textContent = o.script;
                            el.appendChild(c);
                            return { domElement: c };
                        }};
                    }};
                    filtered.forEach(app => CareerViews._renderApplicationRow(listContainer, app));
                }

                // Update active tab
                tabRow.domElement.querySelectorAll('div').forEach(t => {
                    t.classList.remove('bg-primary', 'text-white');
                    t.classList.add('bg-gray-100', 'text-gray-600');
                });
                tab.domElement.classList.remove('bg-gray-100', 'text-gray-600');
                tab.domElement.classList.add('bg-primary', 'text-white');
            };
        });

        // Activate "All" tab
        if (tabRow.domElement.firstChild) {
            tabRow.domElement.firstChild.classList.remove('bg-gray-100', 'text-gray-600');
            tabRow.domElement.firstChild.classList.add('bg-primary', 'text-white');
        }

        // Applications list
        const list = container.add({ css: 'space-y-2', attr: { 'data-apps-list': 'true' } });
        applications.forEach(app => CareerViews._renderApplicationRow(list, app));
    }

    // ── Shared Helpers ─────────────────────────────────────────────────────

    static _renderKPI(container, icon, label, value, colorCss) {
        const card = container.add({
            css: `card p-3 text-center`,
            style: 'flex: 1 1 100px; min-width: 90px;'
        });
        card.add({ tag: 'i', css: `fas fa-${icon} text-xl mb-1 ${colorCss.split(' ')[0]}` });
        card.add({ css: 'text-lg font-bold', script: value });
        card.add({ css: 'text-xs text-muted', script: label });
    }

    static _renderFilterRow(container, items, type) {
        const filterRow = container.add({ css: 'flex items-center gap-2 flex-wrap' });
        filterRow.add({ css: 'text-sm text-muted', script: 'Sort:' });

        const sorts = [
            { label: 'Match', key: 'matchScore' },
            { label: 'Deadline', key: 'deadline' },
            { label: 'Newest', key: 'createdAt' }
        ];
        sorts.forEach(sort => {
            filterRow.add({
                css: 'text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600',
                script: sort.label
            });
        });
    }

    static _matchOpportunities(opportunities, profile, skills) {
        const skillNames = skills.map(s => (s.skillName || s.name || '').toLowerCase());

        return opportunities.map(opp => {
            let matchScore = 0;
            const requiredSkills = opp.requiredSkills || opp.requirements || [];
            const reqArray = Array.isArray(requiredSkills) ? requiredSkills :
                (typeof requiredSkills === 'string' ? requiredSkills.split(',').map(s => s.trim()) : []);

            if (reqArray.length > 0) {
                const matched = reqArray.filter(req => skillNames.includes(req.toLowerCase()));
                matchScore = Math.round((matched.length / reqArray.length) * 100);
            } else {
                matchScore = 50; // Default for opportunities with no skill requirements
            }

            return { ...opp, matchScore };
        }).sort((a, b) => b.matchScore - a.matchScore);
    }

    static _renderOpportunityCard(grid, opp, career, memberId) {
        const card = grid.add({
            css: 'card p-3',
            style: 'flex: 1 1 220px; min-width: 200px; max-width: 320px;'
        });

        // Type icon + title
        const header = card.add({ css: 'flex items-start gap-2 mb-2' });
        const icon = opp.type === 'bursary' ? 'graduation-cap text-green-500' :
                     opp.type === 'internship' ? 'building text-purple-500' :
                     'briefcase text-blue-500';
        header.add({ tag: 'i', css: `fas fa-${icon} mt-1` });

        const info = header.add({ css: 'flex-1 min-w-0' });
        info.add({ css: 'font-semibold text-sm truncate', script: opp.title || 'Opportunity', attr: { title: opp.title } });
        info.add({ css: 'text-xs text-muted truncate', script: opp.organization || opp.provider || '' });

        // Match score badge
        if (opp.matchScore > 0) {
            const matchColor = opp.matchScore >= 70 ? 'bg-green-100 text-green-700' :
                               opp.matchScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                               'bg-gray-100 text-gray-600';
            header.add({ css: `text-xs px-2 py-0.5 rounded-full ${matchColor}`, script: `${opp.matchScore}%` });
        }

        // Details
        const details = card.add({ css: 'text-xs text-muted space-y-1' });
        if (opp.value || opp.salary) {
            details.add({ css: 'flex items-center gap-1' })
                .domElement.innerHTML = `<i class="fas fa-coins text-yellow-500"></i> ${opp.value || opp.salary}`;
        }
        if (opp.deadline || opp.closingDate) {
            const deadline = new Date(opp.deadline || opp.closingDate);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
            const urgency = daysLeft <= 7 ? 'text-red-600' : daysLeft <= 14 ? 'text-orange-600' : 'text-muted';
            details.add({ css: `flex items-center gap-1 ${urgency}` })
                .domElement.innerHTML = `<i class="fas fa-calendar"></i> ${daysLeft > 0 ? daysLeft + ' days left' : 'Closed'}`;
        }
        if (opp.location) {
            details.add({ css: 'flex items-center gap-1' })
                .domElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${opp.location}`;
        }

        // Quick apply button
        const actions = card.add({ css: 'mt-2 pt-2 border-t flex justify-end' });
        if (typeof uiButton !== 'undefined') {
            new uiButton({
                parent: actions,
                label: 'Apply',
                variant: 'primary',
                size: 'sm',
                onClick: (e) => {
                    e?.stopPropagation?.();
                    career.apply?.(memberId, opp.idx, { type: opp.type });
                    if (typeof uiToast !== 'undefined') ElToast.show('Application submitted!', 'success');
                }
            });
        }
    }

    static _renderApplicationRow(container, app) {
        const row = container.add({ css: 'card p-3 flex items-center gap-3' });

        // Status icon
        const statusIcons = {
            pending: 'clock text-yellow-500',
            submitted: 'paper-plane text-blue-500',
            interview: 'comments text-purple-500',
            accepted: 'check-circle text-green-500',
            rejected: 'times-circle text-red-500'
        };
        const iconCss = statusIcons[app.status] || 'question-circle text-gray-400';
        row.add({ tag: 'i', css: `fas fa-${iconCss} text-lg` });

        // Info
        const info = row.add({ css: 'flex-1 min-w-0' });
        info.add({ css: 'font-medium text-sm truncate', script: app.title || app.opportunityTitle || 'Application' });
        const meta = info.add({ css: 'text-xs text-muted flex items-center gap-2' });
        meta.add({ script: app.organization || '' });
        if (app.appliedDate || app.createdAt) {
            meta.add({ script: '·' });
            meta.add({ script: new Date(app.appliedDate || app.createdAt).toLocaleDateString() });
        }

        // Status badge
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-700',
            submitted: 'bg-blue-100 text-blue-700',
            interview: 'bg-purple-100 text-purple-700',
            accepted: 'bg-green-100 text-green-700',
            rejected: 'bg-red-100 text-red-700'
        };
        const statusCss = statusColors[app.status] || 'bg-gray-100 text-gray-700';
        row.add({ css: `text-xs px-2 py-1 rounded-full capitalize ${statusCss}`, script: app.status || 'pending' });
    }
}
