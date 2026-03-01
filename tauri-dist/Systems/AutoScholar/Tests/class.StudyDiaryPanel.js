/**
 * StudyDiaryPanel - Reflection journal, goals & study tracking
 *
 * Standalone compound-pattern panel (render(controlEl, stageEl)).
 * Self-contained demo data — journal entries, goal setting, study hour tracking,
 * mood/energy check-in, weekly heatmap.
 *
 * Usage:
 *   const panel = new StudyDiaryPanel();
 *   panel.render(controlEl, stageEl);
 */
class StudyDiaryPanel {

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

    static DEMO_ENTRIES = [
        { idx: 1, date: '2026-02-12', title: 'Data Structures prep', hours: 2.5, course: 'ITDA201', mood: 'focused', energy: 'high', note: 'Reviewed binary search trees and heaps. Feeling more confident about the upcoming test.' },
        { idx: 2, date: '2026-02-11', title: 'Math tutorial practice', hours: 1.5, course: 'MATH201', mood: 'struggling', energy: 'low', note: 'Struggled with integration by parts. Need to book a tutor session.' },
        { idx: 3, date: '2026-02-11', title: 'SD2 assignment work', hours: 3.0, course: 'ITSD201', mood: 'productive', energy: 'medium', note: 'Made good progress on the MVC refactoring. Unit tests passing.' },
        { idx: 4, date: '2026-02-10', title: 'Group project meeting', hours: 1.0, course: 'ITSD201', mood: 'collaborative', energy: 'high', note: 'Discussed API design with team. Assigned database module to myself.' },
        { idx: 5, date: '2026-02-10', title: 'Programming practice', hours: 2.0, course: 'ITDA201', mood: 'focused', energy: 'medium', note: 'Solved 5 LeetCode problems on graph algorithms.' },
        { idx: 6, date: '2026-02-09', title: 'Web dev research', hours: 1.5, course: 'ITWB101', mood: 'curious', energy: 'high', note: 'Explored React hooks and state management patterns.' },
        { idx: 7, date: '2026-02-08', title: 'Exam revision plan', hours: 0.5, course: 'General', mood: 'anxious', energy: 'low', note: 'Created a revision timetable for the upcoming test week.' },
        { idx: 8, date: '2026-02-07', title: 'Database normalization', hours: 2.0, course: 'ITDB101', mood: 'productive', energy: 'medium', note: 'Completed 3NF exercises from textbook chapter 7.' }
    ];

    static DEMO_GOALS = [
        { idx: 1, title: 'Study 15 hours this week', target: 15, current: 12, unit: 'hours', period: 'weekly', status: 'active' },
        { idx: 2, title: 'Complete ITDA201 assignment', target: 100, current: 75, unit: '%', period: 'weekly', status: 'active' },
        { idx: 3, title: 'Read 2 textbook chapters', target: 2, current: 1, unit: 'chapters', period: 'weekly', status: 'active' },
        { idx: 4, title: 'Attend all lectures this week', target: 8, current: 7, unit: 'lectures', period: 'weekly', status: 'active' },
        { idx: 5, title: 'Maintain 60%+ GPA', target: 60, current: 64, unit: '%', period: 'semester', status: 'active' },
        { idx: 6, title: 'Solve 50 coding challenges', target: 50, current: 32, unit: 'problems', period: 'semester', status: 'active' }
    ];

    static DEMO_CHECKINS = [
        { date: '2026-02-12', mood: 4, energy: 4, confidence: 3, note: 'Good day! Productive study session.' },
        { date: '2026-02-11', mood: 2, energy: 2, confidence: 2, note: 'Math is stressing me out.' },
        { date: '2026-02-10', mood: 4, energy: 3, confidence: 4, note: 'Team meeting went well.' },
        { date: '2026-02-09', mood: 3, energy: 4, confidence: 3, note: 'Average day but got some reading done.' },
        { date: '2026-02-08', mood: 2, energy: 2, confidence: 2, note: 'Feeling anxious about upcoming tests.' },
        { date: '2026-02-07', mood: 3, energy: 3, confidence: 3, note: 'Steady day of work.' },
        { date: '2026-02-06', mood: 4, energy: 4, confidence: 4, note: 'Great progress on database work!' }
    ];

    // Weekly heatmap data (hours per day)
    static DEMO_HEATMAP = [
        { day: 'Mon', hours: 3.5 }, { day: 'Tue', hours: 2.0 },
        { day: 'Wed', hours: 4.0 }, { day: 'Thu', hours: 1.5 },
        { day: 'Fri', hours: 0.5 }, { day: 'Sat', hours: 3.0 },
        { day: 'Sun', hours: 2.5 }
    ];

    // ── Constructor ─────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._bridge = config.bridge || null;
        this._dataLoaded = false;
        this._activeView = 'This Week';
        this._inputs = {};
        this._initPublome();
    }

    // ── Publome Setup ─────────────────────────────────────────────────────

    _initPublome() {
        this._publome = new Publome({
            tables: [{
                name: 'diaryEntry',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    date: { type: 'string', label: 'Date' },
                    title: { type: 'string', label: 'Title' },
                    hours: { type: 'number', label: 'Hours' },
                    course: { type: 'string', label: 'Course' },
                    mood: { type: 'string', label: 'Mood' },
                    energy: { type: 'string', label: 'Energy' },
                    note: { type: 'string', label: 'Note' }
                },
                labeller: '{title}',
                selectionMode: 'single'
            }, {
                name: 'studyGoal',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    title: { type: 'string', label: 'Title' },
                    target: { type: 'number', label: 'Target' },
                    current: { type: 'number', label: 'Current' },
                    unit: { type: 'string', label: 'Unit' },
                    period: { type: 'string', label: 'Period' },
                    status: { type: 'string', label: 'Status' }
                },
                labeller: '{title}',
                selectionMode: 'single'
            }, {
                name: 'dailyCheckin',
                columns: {
                    idx: { type: 'number', primaryKey: true },
                    date: { type: 'string', label: 'Date' },
                    mood: { type: 'number', label: 'Mood' },
                    energy: { type: 'number', label: 'Energy' },
                    confidence: { type: 'number', label: 'Confidence' },
                    note: { type: 'string', label: 'Note' }
                },
                labeller: '{date}',
                selectionMode: 'single'
            }]
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
        this._dataLoaded = true;
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
        ['This Week', 'Goals', 'Entries', 'Check-Ins'].forEach(opt => {
            const option = document.createElement('option');
            option.textContent = opt;
            option.value = opt;
            this._inputs.view.appendChild(option);
        });
        this._inputs.view.value = 'This Week';
        viewWrap.appendChild(this._inputs.view);

        const btnWrap = document.createElement('div');
        btnWrap.className = 'as-ctrl-btn-wrap';
        el.appendChild(btnWrap);

        new uiButton({
            label: 'Load Diary', variant: 'primary', size: 'sm', parent: btnWrap,
            icon: '<i class="fas fa-book"></i>',
            onClick: () => {
                this._activeView = this._inputs.view ? this._inputs.view.value : 'This Week';
                this._dataLoaded = true;
                this._renderDashboard();
                this._renderStatsPane(this._statsEl);
            }
        });
    }

    _renderStatsPane(el) {
        if (!el) return;
        el.innerHTML = '';
        if (!this._dataLoaded) {
            el.innerHTML = '<div class="as-ctrl-stats-hint">Load data to see stats</div>';
            return;
        }
        const totalHours = StudyDiaryPanel.DEMO_ENTRIES.reduce((s, e) => s + e.hours, 0);
        const avgMood = (StudyDiaryPanel.DEMO_CHECKINS.reduce((s, c) => s + c.mood, 0) / StudyDiaryPanel.DEMO_CHECKINS.length).toFixed(1);
        const activeGoals = StudyDiaryPanel.DEMO_GOALS.filter(g => g.status === 'active').length;

        el.innerHTML = `
            <div class="as-ctrl-stats-text">
                <div>Entries: <strong>${StudyDiaryPanel.DEMO_ENTRIES.length}</strong></div>
                <div>Total Hours: <strong>${totalHours}h</strong></div>
                <div>Avg Mood: <strong class="as-ctrl-stat-success">${avgMood}/5</strong></div>
                <div>Active Goals: <strong>${activeGoals}</strong></div>
                <div>Check-ins: <strong>${StudyDiaryPanel.DEMO_CHECKINS.length}</strong></div>
            </div>`;
    }

    // ── Stage: Empty ────────────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = '';
        this._stageEl.className = 'as-panel-wrap';

        new uiAlert({
            color: 'info',
            title: 'Study Diary',
            message: 'Select a view and click "Load Diary" to track study sessions, set goals, write reflections, and check in on your wellbeing.',
            parent: this._stageEl
        });

        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        this._stageEl.appendChild(kpiRow);

        const b = this._binding('diaryEntry');
        b.bindMetric(kpiRow, { compute: recs => recs.length ? recs.reduce((s, r) => s + r.get('hours'), 0) + 'h' : '\u2014', label: 'Hours', icon: 'fas fa-clock', color: 'var(--ui-gray-400)' });
        this._binding('studyGoal').bindMetric(kpiRow, { compute: recs => recs.length ? recs.filter(r => r.get('status') === 'active').length : '\u2014', label: 'Goals', icon: 'fas fa-bullseye', color: 'var(--ui-gray-400)' });
        this._binding('dailyCheckin').bindMetric(kpiRow, { compute: recs => {
            if (!recs.length) return '\u2014';
            return (recs.reduce((s, r) => s + r.get('mood'), 0) / recs.length).toFixed(1);
        }, label: 'Mood', icon: 'fas fa-smile', color: 'var(--ui-gray-400)' });
    }

    // ── Stage: Dashboard ────────────────────────────────────────────────────

    _renderDashboard() {
        const stage = this._stageEl;
        stage.innerHTML = '';
        stage.className = 'as-panel-stage';

        const wrap = document.createElement('div');
        wrap.className = 'as-panel-wrap';
        stage.appendChild(wrap);

        // Populate Publome
        const et = this._publome.table('diaryEntry');
        et.all().forEach(r => et.delete(r.idx));
        StudyDiaryPanel.DEMO_ENTRIES.forEach(e => {
            et.create({ idx: e.idx, date: e.date, title: e.title, hours: e.hours, course: e.course, mood: e.mood, energy: e.energy, note: e.note });
        });
        const gt = this._publome.table('studyGoal');
        gt.all().forEach(r => gt.delete(r.idx));
        StudyDiaryPanel.DEMO_GOALS.forEach(g => {
            gt.create({ idx: g.idx, title: g.title, target: g.target, current: g.current, unit: g.unit, period: g.period, status: g.status });
        });
        const ct = this._publome.table('dailyCheckin');
        ct.all().forEach(r => ct.delete(r.idx));
        StudyDiaryPanel.DEMO_CHECKINS.forEach((c, i) => {
            ct.create({ idx: i + 1, date: c.date, mood: c.mood, energy: c.energy, confidence: c.confidence, note: c.note });
        });

        // Header
        const header = document.createElement('div');
        header.className = 'as-panel-header';
        header.innerHTML = `
            <span class="as-brand-badge">Study Diary</span>
            <span class="as-panel-subtitle">Naledi Dlamini — Week of 6-12 Feb 2026</span>`;
        wrap.appendChild(header);

        // Summary KPIs
        this._renderSummaryKPIs(wrap);

        // View-specific content
        if (this._activeView === 'This Week') {
            this._renderHeatmap(wrap);
            this._renderGoals(wrap);
            this._renderEntries(wrap);
        } else if (this._activeView === 'Goals') {
            this._renderGoals(wrap);
        } else if (this._activeView === 'Entries') {
            this._renderEntries(wrap);
        } else if (this._activeView === 'Check-Ins') {
            this._renderCheckIns(wrap);
        }
    }

    _renderSummaryKPIs(wrap) {
        const row = document.createElement('div');
        row.className = 'as-kpi-row';
        wrap.appendChild(row);

        const b = this._binding('diaryEntry');
        b.bindMetric(row, {
            compute: recs => {
                const totalHours = StudyDiaryPanel.DEMO_HEATMAP.reduce((s, d) => s + d.hours, 0);
                return totalHours + 'h';
            },
            label: 'Study Hours', icon: 'fas fa-clock', color: '#2563eb'
        });
        b.bindMetric(row, { compute: recs => String(recs.length), label: 'Entries This Week', icon: 'fas fa-pen', color: '#7c3aed' });
        this._binding('dailyCheckin').bindMetric(row, {
            compute: recs => {
                if (!recs.length) return '\u2014';
                const avg = (recs.reduce((s, r) => s + r.get('mood'), 0) / recs.length).toFixed(1);
                const emojis = ['', '\ud83d\ude1e', '\ud83d\ude10', '\ud83d\ude42', '\ud83d\ude0a', '\ud83e\udd29'];
                return emojis[Math.round(avg)] + ' ' + avg;
            },
            label: 'Avg Mood', icon: 'fas fa-smile', color: '#059669'
        });
        this._binding('diaryEntry').bindMetric(row, { compute: () => '7 days', label: 'Streak', icon: 'fas fa-fire', color: '#f59e0b' });
    }

    _renderHeatmap(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'sd2-section-title';
        secTitle.innerHTML = '<i class="fas fa-fire" style="margin-right:0.4rem;color:#f59e0b;"></i>Weekly Study Heatmap';
        wrap.appendChild(secTitle);

        const heroCard = document.createElement('div');
        heroCard.className = 'sd2-heatmap-hero';
        wrap.appendChild(heroCard);

        const heatmap = document.createElement('div');
        heatmap.className = 'sd2-heatmap';
        heroCard.appendChild(heatmap);

        const maxH = Math.max(...StudyDiaryPanel.DEMO_HEATMAP.map(d => d.hours));
        StudyDiaryPanel.DEMO_HEATMAP.forEach(d => {
            const barH = maxH > 0 ? Math.round((d.hours / maxH) * 120) : 0;
            const intensity = d.hours / maxH;
            const color = intensity > 0.7 ? '#059669' : intensity > 0.4 ? '#34d399' : intensity > 0 ? '#a7f3d0' : '#e5e7eb';
            const col = document.createElement('div');
            col.className = 'sd2-heatmap-col';
            col.innerHTML =
                '<span class="sd2-heatmap-label">' + d.hours + 'h</span>' +
                '<div class="sd2-heatmap-bar" style="height:' + barH + 'px;background:' + color + ';"></div>' +
                '<span class="sd2-heatmap-day">' + d.day + '</span>';
            heatmap.appendChild(col);
        });
    }

    _renderGoals(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'sd2-section-title';
        secTitle.innerHTML = '<i class="fas fa-bullseye" style="margin-right:0.4rem;color:#7c3aed;"></i>Goals';
        wrap.appendChild(secTitle);

        const collWrap = document.createElement('div');
        wrap.appendChild(collWrap);
        this._binding('studyGoal').bindCollection(collWrap, {
            component: 'card',
            map: r => {
                const pct = Math.min(100, Math.round((r.get('current') / r.get('target')) * 100));
                return {
                    title: r.get('title'),
                    subtitle: r.get('current') + ' / ' + r.get('target') + ' ' + r.get('unit') + ' (' + pct + '%)',
                    content: r.get('period')
                };
            }
        });
    }

    _renderEntries(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'sd2-section-title';
        secTitle.innerHTML = '<i class="fas fa-pen" style="margin-right:0.4rem;color:#2563eb;"></i>Journal Entries';
        wrap.appendChild(secTitle);

        const moodEmojis = { focused: '🎯', struggling: '😤', productive: '💪', collaborative: '🤝', curious: '🔍', anxious: '😰' };
        const energyColors = { high: '#059669', medium: '#d97706', low: '#dc2626' };

        const collWrap = document.createElement('div');
        wrap.appendChild(collWrap);
        this._binding('diaryEntry').bindCollection(collWrap, {
            component: 'card',
            map: r => ({
                title: r.get('title'),
                subtitle: r.get('date') + ' \u00b7 ' + r.get('hours') + 'h \u00b7 ' + r.get('course'),
                content: r.get('note')
            })
        });
    }

    _renderCheckIns(wrap) {
        const secTitle = document.createElement('div');
        secTitle.className = 'sd2-section-title';
        secTitle.innerHTML = '<i class="fas fa-heart" style="margin-right:0.4rem;color:#ec4899;"></i>Daily Check-Ins';
        wrap.appendChild(secTitle);

        const collWrap = document.createElement('div');
        wrap.appendChild(collWrap);
        this._binding('dailyCheckin').bindCollection(collWrap, {
            component: 'card',
            map: r => {
                const moodLabels = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Great'];
                const moodEmojis = ['', '\ud83d\ude1e', '\ud83d\ude10', '\ud83d\ude42', '\ud83d\ude0a', '\ud83e\udd29'];
                return {
                    title: r.get('date') + ' ' + moodEmojis[r.get('mood')],
                    subtitle: 'Mood: ' + moodLabels[r.get('mood')] + ' \u00b7 Energy: ' + moodLabels[r.get('energy')] + ' \u00b7 Confidence: ' + moodLabels[r.get('confidence')],
                    content: r.get('note') ? '"' + r.get('note') + '"' : ''
                };
            }
        });
    }
}
