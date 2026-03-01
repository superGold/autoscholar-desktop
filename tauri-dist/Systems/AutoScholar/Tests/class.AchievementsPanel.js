/**
 * AchievementsPanel - Badges, streaks, leaderboards & gamification
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Self-contained demo data — badge wall, points, streaks, leaderboard,
 * challenges, level progression.
 *
 * Usage:
 *   const panel = new AchievementsPanel();
 *   panel.render(controlEl, stageEl);
 */
class AchievementsPanel {

    // ── Static Data ─────────────────────────────────────────────────────────

    static DEMO_STUDENTS = [
        { id: '220101', name: 'Thabo', surname: 'Mokoena' }, { id: '220102', name: 'Naledi', surname: 'Dlamini' },
        { id: '220103', name: 'Sipho', surname: 'Nkosi' }, { id: '220104', name: 'Zanele', surname: 'Khumalo' },
        { id: '220105', name: 'Bongani', surname: 'Mthembu' }, { id: '220106', name: 'Lindiwe', surname: 'Ngcobo' },
        { id: '220107', name: 'Mandla', surname: 'Zulu' }, { id: '220108', name: 'Ayanda', surname: 'Mkhize' },
        { id: '220109', name: 'Nomvula', surname: 'Sithole' }, { id: '220110', name: 'Sibusiso', surname: 'Ndlovu' },
        { id: '220111', name: 'Palesa', surname: 'Mahlangu' }, { id: '220112', name: 'Kagiso', surname: 'Molefe' },
        { id: '220113', name: 'Dineo', surname: 'Maseko' }, { id: '220114', name: 'Tshiamo', surname: 'Botha' },
        { id: '220115', name: 'Lerato', surname: 'Pretorius' }, { id: '220116', name: 'Mpho', surname: 'Van der Merwe' },
        { id: '220117', name: 'Nompilo', surname: 'Shabalala' }, { id: '220118', name: 'Lethabo', surname: 'Joubert' },
        { id: '220119', name: 'Keabetswe', surname: 'Tshabalala' }, { id: '220120', name: 'Thandeka', surname: 'Radebe' },
        { id: '220121', name: 'Amahle', surname: 'Mbeki' }, { id: '220122', name: 'Siyabonga', surname: 'Vilakazi' },
        { id: '220123', name: 'Nokuthula', surname: 'Cele' }, { id: '220124', name: 'Lwazi', surname: 'Phiri' },
        { id: '220125', name: 'Busisiwe', surname: 'Ntuli' }, { id: '220126', name: 'Thulani', surname: 'Mabaso' },
        { id: '220127', name: 'Refilwe', surname: 'Motaung' }, { id: '220128', name: 'Andile', surname: 'Govender' }
    ];

    static DEMO_PROFILE = {
        level: 4, levelName: 'Scholar',
        xp: 1240, xpNext: 2000,
        totalBadges: 6, totalPoints: 1240,
        streak: 7, longestStreak: 14
    };

    static DEMO_LEVELS = [
        { level: 1, name: 'Novice', xpReq: 0 },
        { level: 2, name: 'Learner', xpReq: 200 },
        { level: 3, name: 'Student', xpReq: 500 },
        { level: 4, name: 'Scholar', xpReq: 1000 },
        { level: 5, name: 'Expert', xpReq: 2000 },
        { level: 6, name: 'Master', xpReq: 4000 },
        { level: 7, name: 'Legend', xpReq: 8000 }
    ];

    static DEMO_BADGES = [
        { idx: 1, name: 'First Login', icon: 'fa-door-open', rarity: 'common', earned: true, date: '2024-02-01', description: 'Logged in for the first time', points: 10 },
        { idx: 2, name: 'Week Warrior', icon: 'fa-calendar-week', rarity: 'common', earned: true, date: '2024-02-08', description: 'Studied for 7 consecutive days', points: 50 },
        { idx: 3, name: 'Bookworm', icon: 'fa-book', rarity: 'uncommon', earned: true, date: '2024-03-15', description: 'Logged 50+ study hours in a month', points: 100 },
        { idx: 4, name: 'Goal Getter', icon: 'fa-bullseye', rarity: 'uncommon', earned: true, date: '2024-05-20', description: 'Completed 10 weekly goals', points: 100 },
        { idx: 5, name: 'Code Master', icon: 'fa-code', rarity: 'rare', earned: true, date: '2025-06-10', description: 'Scored 80%+ in 3 programming courses', points: 200 },
        { idx: 6, name: 'Team Player', icon: 'fa-users', rarity: 'uncommon', earned: true, date: '2025-08-15', description: 'Completed 5 group projects', points: 100 },
        { idx: 7, name: 'Perfectionist', icon: 'fa-star', rarity: 'rare', earned: false, date: null, description: 'Score 100% on any assessment', points: 250 },
        { idx: 8, name: 'Iron Will', icon: 'fa-dumbbell', rarity: 'rare', earned: false, date: null, description: 'Study streak of 30 days', points: 300 },
        { idx: 9, name: 'Portfolio Pro', icon: 'fa-folder-open', rarity: 'epic', earned: false, date: null, description: 'Complete all GA evidence requirements', points: 500 },
        { idx: 10, name: 'Distinction Hero', icon: 'fa-crown', rarity: 'legendary', earned: false, date: null, description: 'Achieve overall distinction (75%+)', points: 1000 },
        { idx: 11, name: 'Night Owl', icon: 'fa-moon', rarity: 'common', earned: true, date: '2025-04-12', description: 'Logged a study session after 10pm', points: 20 },
        { idx: 12, name: 'Early Bird', icon: 'fa-sun', rarity: 'common', earned: false, date: null, description: 'Log a study session before 7am', points: 20 }
    ];

    static DEMO_LEADERBOARD = [
        { rank: 1, id: '220122', name: 'Siyabonga Vilakazi', points: 2450, level: 5 },
        { rank: 2, id: '220104', name: 'Zanele Khumalo', points: 2180, level: 5 },
        { rank: 3, id: '220106', name: 'Lindiwe Ngcobo', points: 1890, level: 4 },
        { rank: 4, id: '220115', name: 'Lerato Pretorius', points: 1560, level: 4 },
        { rank: 5, id: '220102', name: 'Naledi Dlamini', points: 1240, level: 4 },
        { rank: 6, id: '220101', name: 'Thabo Mokoena', points: 1100, level: 4 },
        { rank: 7, id: '220108', name: 'Ayanda Mkhize', points: 980, level: 3 },
        { rank: 8, id: '220113', name: 'Dineo Maseko', points: 870, level: 3 },
        { rank: 9, id: '220120', name: 'Thandeka Radebe', points: 720, level: 3 },
        { rank: 10, id: '220128', name: 'Andile Govender', points: 650, level: 3 }
    ];

    static DEMO_CHALLENGES = [
        { idx: 1, title: 'Study Marathon', description: 'Study 20 hours this week', target: 20, current: 12, unit: 'hours', reward: 150, deadline: '2026-02-16', status: 'active' },
        { idx: 2, title: 'Perfect Week', description: 'Complete all weekly goals', target: 4, current: 2, unit: 'goals', reward: 200, deadline: '2026-02-16', status: 'active' },
        { idx: 3, title: 'Social Learner', description: 'Study with 3 different classmates', target: 3, current: 1, unit: 'sessions', reward: 100, deadline: '2026-02-23', status: 'active' },
        { idx: 4, title: 'Early Submission', description: 'Submit an assignment 3 days early', target: 1, current: 0, unit: 'submissions', reward: 75, deadline: '2026-03-01', status: 'active' }
    ];

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._dataLoaded = false;
        this._activeView = 'Badges';
        this._inputs = {};
        this._initPublome();
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [
                {
                    name: 'badge',
                    columns: {
                        idx: { type: 'number', primaryKey: true },
                        name: { type: 'string', label: 'Name' },
                        description: { type: 'string', label: 'Description' },
                        icon: { type: 'string', label: 'Icon' },
                        rarity: { type: 'string', label: 'Rarity' },
                        points: { type: 'number', label: 'Points' },
                        earned: { type: 'boolean', label: 'Earned' },
                        date: { type: 'string', label: 'Date' }
                    },
                    labeller: '{name}',
                    selectionMode: 'single'
                },
                {
                    name: 'challenge',
                    columns: {
                        idx: { type: 'number', primaryKey: true },
                        title: { type: 'string', label: 'Title' },
                        description: { type: 'string', label: 'Description' },
                        target: { type: 'number', label: 'Target' },
                        current: { type: 'number', label: 'Current' },
                        unit: { type: 'string', label: 'Unit' },
                        reward: { type: 'number', label: 'Reward' },
                        deadline: { type: 'string', label: 'Deadline' },
                        status: { type: 'string', label: 'Status' }
                    },
                    labeller: '{title}',
                    selectionMode: 'single'
                },
                {
                    name: 'leaderEntry',
                    columns: {
                        idx: { type: 'number', primaryKey: true },
                        rank: { type: 'number', label: 'Rank' },
                        studentId: { type: 'string', label: 'Student ID' },
                        name: { type: 'string', label: 'Name' },
                        level: { type: 'number', label: 'Level' },
                        points: { type: 'number', label: 'Points' }
                    },
                    labeller: '{name}',
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

    // ── Public API ──────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildAccordion();
        this._loadData();
        this._renderDashboard();
        this._renderStatsPane(this._statsEl);
    }

    // ── Control Accordion ───────────────────────────────────────────────────

    _buildAccordion() {
        const el = this._controlEl;
        el.innerHTML = '';

        const content = {
            params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
            stats: { label: '<i class="fas fa-chart-bar" style="margin-right:0.3rem;"></i>Quick Stats' }
        };

        const accordion = new uiAccordion({ exclusive: true, content, parent: el });

        const paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._renderParamsPane(paramsEl);

        this._statsEl = accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        this._renderStatsPane(this._statsEl);
    }

    _renderParamsPane(el) {
        el.innerHTML = '';

        new uiBadge({ label: '220102 — Naledi Dlamini', color: 'primary', size: 'sm', parent: el });

        const spacer = document.createElement('div');
        spacer.className = 'as-ctrl-spacer-sm';
        el.appendChild(spacer);

        const viewWrap = document.createElement('div');
        viewWrap.className = 'ui-input-wrapper as-ctrl-wrap';
        el.appendChild(viewWrap);
        const viewLabel = document.createElement('label');
        viewLabel.className = 'as-ctrl-inline-label';
        viewLabel.textContent = 'View';
        viewWrap.appendChild(viewLabel);
        this._inputs.view = document.createElement('select');
        this._inputs.view.className = 'ui-input as-ctrl-select';
        ['Badges', 'Leaderboard', 'Challenges', 'Streaks'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.view.appendChild(option);
        });
        this._inputs.view.value = 'Badges';
        viewWrap.appendChild(this._inputs.view);

        const btnWrap = document.createElement('div');
        btnWrap.className = 'as-ctrl-btn-wrap';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Achievements', variant: 'primary', size: 'sm', parent: btnWrap,
            icon: '<i class="fas fa-trophy"></i>',
            onClick: () => {
                this._activeView = this._inputs.view ? this._inputs.view.value : 'Badges';
                this._loadData();
                this._renderDashboard();
                this._renderStatsPane(this._statsEl);
            }
        });
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    _loadData() {
        this._dataLoaded = true;
        // Clear and populate badge table
        const bt = this._publome.table('badge');
        bt.all().forEach(r => bt.delete(r.idx));
        AchievementsPanel.DEMO_BADGES.forEach(b => {
            bt.create({ idx: b.idx, name: b.name, description: b.description, icon: b.icon, rarity: b.rarity, points: b.points, earned: b.earned, date: b.date || '' });
        });
        // Clear and populate challenge table
        const ct = this._publome.table('challenge');
        ct.all().forEach(r => ct.delete(r.idx));
        AchievementsPanel.DEMO_CHALLENGES.forEach(c => {
            ct.create({ idx: c.idx, title: c.title, description: c.description, target: c.target, current: c.current, unit: c.unit, reward: c.reward, deadline: c.deadline, status: c.status });
        });
        // Clear and populate leaderEntry table
        const lt = this._publome.table('leaderEntry');
        lt.all().forEach(r => lt.delete(r.idx));
        AchievementsPanel.DEMO_LEADERBOARD.forEach((s, i) => {
            lt.create({ idx: i + 1, rank: s.rank, studentId: s.id, name: s.name, level: s.level, points: s.points });
        });
    }

    _renderStatsPane(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div class="as-ctrl-stats-hint">Load data to see stats</div>';
            return;
        }
        const p = AchievementsPanel.DEMO_PROFILE;
        const earned = AchievementsPanel.DEMO_BADGES.filter(b => b.earned).length;
        const total = AchievementsPanel.DEMO_BADGES.length;

        el.innerHTML = `
            <div class="as-ctrl-stats-text">
                <div>Level: <strong style="color:var(--ui-violet-600);">${p.level} — ${p.levelName}</strong></div>
                <div>XP: <strong>${p.xp} / ${p.xpNext}</strong></div>
                <div>Points: <strong style="color:var(--ui-emerald-400);">${p.totalPoints}</strong></div>
                <div>Badges: <strong>${earned} / ${total}</strong></div>
                <div>Streak: <strong style="color:var(--ui-amber-500);">${p.streak} days</strong></div>
                <div>Rank: <strong>#5</strong></div>
            </div>`;
    }

    // ── Stage: Empty ────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-inner';

        new uiAlert({
            color: 'info',
            title: 'Achievements',
            message: 'Click "Load Achievements" to view your badges, points, streaks, position on the leaderboard, and active challenges.',
            parent: this._stageEl
        });

        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        this._stageEl.appendChild(kpiRow);

        const b = this._binding('badge');
        b.bindMetric(kpiRow, {
            compute: recs => recs.length ? 'L' + AchievementsPanel.DEMO_PROFILE.level : '\u2014',
            label: 'Level', icon: 'fas fa-trophy', color: 'var(--ui-gray-400)'
        });
        b.bindMetric(kpiRow, {
            compute: recs => recs.filter(r => r.get('earned')).length || '\u2014',
            label: 'Badges', icon: 'fas fa-medal', color: 'var(--ui-gray-400)'
        });
        b.bindMetric(kpiRow, {
            compute: recs => recs.length ? String(AchievementsPanel.DEMO_PROFILE.totalPoints) : '\u2014',
            label: 'Points', icon: 'fas fa-star', color: 'var(--ui-gray-400)'
        });
    }

    // ── Stage: Dashboard ────────────────────────────────────────────────────

    _renderDashboard() {
        const stage = this._stageEl;
        stage.innerHTML = '';
        stage.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-wrap';
        stage.appendChild(wrap);

        const p = AchievementsPanel.DEMO_PROFILE;

        // Header with level
        const header = document.createElement('div');
        header.className = 'ach-header';
        header.innerHTML = `
            <div class="as-avatar as-avatar-lg ach-level-avatar">L${p.level}</div>
            <div>
                <div class="ach-student-name">Naledi Dlamini</div>
                <div class="ach-level-label">${p.levelName} (Level ${p.level})</div>
            </div>
            <div class="ach-points-wrap">
                <div class="ach-total-points">${p.totalPoints}</div>
                <div class="ach-total-points-label">Total Points</div>
            </div>`;
        wrap.appendChild(header);

        // Level progress bar
        const levelPct = Math.round(((p.xp - 1000) / (p.xpNext - 1000)) * 100);
        const levelBar = document.createElement('div');
        levelBar.className = 'ach-level-bar';
        levelBar.innerHTML = `
            <div class="ach-level-labels">
                <span>Level ${p.level}: ${p.levelName}</span>
                <span>${p.xp} / ${p.xpNext} XP</span>
                <span>Level ${p.level + 1}: Expert</span>
            </div>
            <div class="ach-level-track">
                <div class="ach-level-fill" style="width:${levelPct}%;"></div>
                <span class="ach-level-pct">${levelPct}%</span>
            </div>`;
        wrap.appendChild(levelBar);

        // View-specific content
        if (this._activeView === 'Badges') {
            this._renderBadgeWall(wrap);
        } else if (this._activeView === 'Leaderboard') {
            this._renderLeaderboard(wrap);
        } else if (this._activeView === 'Challenges') {
            this._renderChallenges(wrap);
        } else if (this._activeView === 'Streaks') {
            this._renderStreaks(wrap);
        }
    }

    _renderBadgeWall(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'ach-section-title';
        secTitle.innerHTML = '<i class="fas fa-medal" style="color:var(--ui-amber-500);"></i>Badge Wall';
        wrap.appendChild(secTitle);

        const grid = document.createElement('div');
        grid.className = 'ach-badge-tile-grid';
        wrap.appendChild(grid);

        const rarityColors = { common: 'var(--ui-gray-400)', uncommon: '#16a34a', rare: '#2563eb', epic: '#7c3aed', legendary: '#d4af37' };

        AchievementsPanel.DEMO_BADGES.forEach(b => {
            const tile = document.createElement('div');
            tile.className = 'ach-badge-tile' + (!b.earned ? ' ach-badge-tile-locked' : '');
            const iconColor = rarityColors[b.rarity] || 'var(--ui-gray-400)';
            tile.innerHTML =
                '<i class="fas ' + b.icon + ' ach-badge-tile-icon" style="color:' + iconColor + ';"></i>' +
                '<div class="ach-badge-tile-name">' + b.name + '</div>' +
                '<div class="ach-badge-tile-rarity ach-rarity-' + b.rarity + '">' + b.rarity + '</div>' +
                '<div class="sc-meta-label">' + b.points + ' pts</div>';
            grid.appendChild(tile);
        });
    }

    _renderLeaderboard(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'ach-section-title';
        secTitle.innerHTML = '<i class="fas fa-trophy" style="color:var(--ui-amber-500);"></i>Leaderboard — Top 10';
        wrap.appendChild(secTitle);

        const container = document.createElement('div');
        container.className = 'ach-leaderboard-collection';
        wrap.appendChild(container);

        this._binding('leaderEntry').bindCollection(container, {
            component: 'card',
            map: r => ({
                title: '#' + r.get('rank') + ' ' + r.get('name') + (r.get('studentId') === '220102' ? ' (You)' : ''),
                subtitle: 'Level ' + r.get('level'),
                content: r.get('points').toLocaleString() + ' pts'
            }),
            sort: (a, b) => a.get('rank') - b.get('rank')
        });
    }

    _renderChallenges(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'ach-section-title';
        secTitle.innerHTML = '<i class="fas fa-fire" style="color:var(--ui-red-600);"></i>Active Challenges';
        wrap.appendChild(secTitle);

        const challengeContainer = document.createElement('div');
        challengeContainer.className = 'ach-challenge-collection';
        wrap.appendChild(challengeContainer);

        this._binding('challenge').bindCollection(challengeContainer, {
            component: 'card',
            map: r => {
                const pct = Math.min(100, Math.round((r.get('current') / r.get('target')) * 100));
                const daysLeft = Math.max(0, Math.ceil((new Date(r.get('deadline')) - new Date()) / (1000 * 60 * 60 * 24)));
                return {
                    title: r.get('title') + ' \u2b50 ' + r.get('reward') + ' pts',
                    subtitle: r.get('current') + '/' + r.get('target') + ' ' + r.get('unit') + ' (' + pct + '%)',
                    content: r.get('description') + '\n' + daysLeft + ' days left'
                };
            }
        });
    }

    _renderStreaks(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'ach-section-title';
        secTitle.innerHTML = '<i class="fas fa-fire" style="color:var(--ui-amber-500);"></i>Streak Calendar';
        wrap.appendChild(secTitle);

        const p = AchievementsPanel.DEMO_PROFILE;

        // Streak summary
        const summary = document.createElement('div');
        summary.className = 'ach-streak-summary';
        wrap.appendChild(summary);

        this._binding('badge').bindMetric(summary, {
            compute: () => AchievementsPanel.DEMO_PROFILE.streak + ' days',
            label: 'Current Streak', icon: 'fas fa-fire', color: '#f59e0b'
        });
        this._binding('badge').bindMetric(summary, {
            compute: () => AchievementsPanel.DEMO_PROFILE.longestStreak + ' days',
            label: 'Longest Streak', icon: 'fas fa-trophy', color: '#7c3aed'
        });

        // Calendar grid (last 28 days)
        const calTitle = document.createElement('div');
        calTitle.className = 'ach-cal-title';
        calTitle.textContent = 'Last 28 Days';
        wrap.appendChild(calTitle);

        const grid = document.createElement('div');
        grid.className = 'ach-streak-grid';
        wrap.appendChild(grid);

        // Day headers
        ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(d => {
            const h = document.createElement('div');
            h.className = 'ach-streak-day-header';
            h.textContent = d;
            grid.appendChild(h);
        });

        // Generate 28 days of streak data
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const active = i < p.streak;
            const isToday = i === 0;

            const cell = document.createElement('div');
            cell.className = `ach-streak-cell ${active ? 'ach-streak-active' : 'ach-streak-inactive'}${isToday ? ' ach-streak-today' : ''}`;
            cell.textContent = d.getDate();
            cell.title = `${d.toLocaleDateString('en-ZA')}${active ? ' - Active' : ''}`;
            grid.appendChild(cell);
        }
    }
}
