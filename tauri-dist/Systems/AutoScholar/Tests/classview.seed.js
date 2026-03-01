/**
 * ClassViewSeed — Seed data for ClassView Connect Publome
 *
 * Two modes:
 *   ClassViewSeed.seed(publome, data)   — populate from API response data
 *   ClassViewSeed.seedDemo(publome)     — standalone demo data for testing
 */
class ClassViewSeed {

    /**
     * Seed from API/computed data.
     * @param {Publome} publome - Created via ClassViewSchema.create()
     * @param {Object} data - { courseResults, demoData, assessStats, panels }
     */
    static seed(publome, data) {
        var courseResults = data.courseResults || [];
        var demoData = data.demoData || {};
        var assessStats = data.assessStats || [];
        var panels = data.panels || [];

        // ── Students ──────────────────────────────────────────────────
        var students = [];
        courseResults.forEach(function(r, i) {
            var mark = parseFloat(r.result || r.mark || r.finalMark || 0);
            var status = mark >= 50 ? 'pass' : mark > 0 ? 'fail' : 'incomplete';
            students.push({
                idx: i + 1,
                studentNumber: r.studentNumber || '',
                firstName: r.firstName || r.first_name || '',
                lastName: r.lastName || r.last_name || '',
                programmeCode: r.programmeCode || r.programme_code || '',
                finalMark: mark,
                status: status
            });
        });
        publome.loadSeedData({ student: students });

        // ── Assessments ───────────────────────────────────────────────
        var assessments = [];
        assessStats.forEach(function(a, i) {
            assessments.push({
                idx: i + 1,
                code: a.code || a.assessmentCode || ('A' + (i + 1)),
                name: a.name || a.label || a.code || ('Assessment ' + (i + 1)),
                weight: a.weight || 0,
                mean: a.mean || a.average || 0,
                count: a.count || a.submissions || 0
            });
        });
        publome.loadSeedData({ assessment: assessments });

        // ── KPIs ──────────────────────────────────────────────────────
        ClassViewSeed._seedKPIs(publome, demoData);

        // ── Panel Status ──────────────────────────────────────────────
        ClassViewSeed._seedPanelStatus(publome, panels);
    }

    /**
     * Update KPI table records from demoData summary.
     * Can be called repeatedly when filters change.
     */
    static seedKPIs(publome, demoData) {
        ClassViewSeed._seedKPIs(publome, demoData);
    }

    static _seedKPIs(publome, d) {
        var kpiTable = publome.table('kpi');
        var kpis = ClassViewSeed._buildKPIRecords(d);

        // If table is empty, create records; otherwise update existing
        if (kpiTable.all().length === 0) {
            publome.loadSeedData({ kpi: kpis });
            // Select first record so bindView has a selected record
            if (kpiTable.all().length > 0) kpiTable.select(1);
        } else {
            kpis.forEach(function(k) {
                var existing = kpiTable.read(k.idx);
                if (existing) {
                    kpiTable.update(k.idx, { value: k.value, color: k.color });
                }
            });
        }
    }

    static _buildKPIRecords(d) {
        d = d || {};
        var avgMark = d.avgMark || 0;
        var passRate = d.passRate || 0;
        var atRisk = d.atRisk || 0;
        var attendance = d.attendance;

        return [
            { idx: 1, code: 'students',    label: 'Students',    value: String(d.totalStudents || 0), icon: 'fas fa-users',              color: 'var(--ui-info)' },
            { idx: 2, code: 'avgMark',     label: 'Avg Mark',    value: avgMark + '%',                 icon: 'fas fa-percentage',          color: parseFloat(avgMark) >= 55 ? 'var(--ui-success)' : 'var(--ui-warning)' },
            { idx: 3, code: 'passRate',    label: 'Pass Rate',   value: passRate + '%',                icon: 'fas fa-check-circle',        color: parseFloat(passRate) >= 70 ? 'var(--ui-success)' : 'var(--ui-warning)' },
            { idx: 4, code: 'failing',     label: 'Failing',     value: String(atRisk),                icon: 'fas fa-exclamation-triangle', color: atRisk > 5 ? 'var(--ui-danger)' : atRisk > 0 ? 'var(--ui-warning)' : 'var(--ui-success)' },
            { idx: 5, code: 'attendance',  label: 'Attendance',  value: attendance != null ? attendance + '%' : '\u2014', icon: 'fas fa-calendar-check', color: attendance != null ? (parseFloat(attendance) >= 75 ? 'var(--ui-success)' : 'var(--ui-warning)') : 'var(--ui-gray-400)' },
            { idx: 6, code: 'assessments', label: 'Assessments', value: String(d.assessments || 0),    icon: 'fas fa-clipboard-check',     color: 'var(--ui-info)' }
        ];
    }

    /**
     * Seed panel status from TAB_REGISTRY.
     */
    static _seedPanelStatus(publome, panels) {
        var registry = (typeof ClassViewConnect !== 'undefined' && ClassViewConnect.TAB_REGISTRY)
            ? ClassViewConnect.TAB_REGISTRY : [];
        var panelMap = (typeof ClassViewConnect !== 'undefined' && ClassViewConnect.PANEL_MAP)
            ? ClassViewConnect.PANEL_MAP : {};

        var statusRows = [];
        var idx = 1;
        registry.forEach(function(t) {
            if (t.key === 'dashboard' || t.key === 'about') return;
            var pm = panelMap[t.key];
            var loaded = pm ? !!(typeof window !== 'undefined' && window[pm.cls]) : false;
            var active = panels.indexOf(t.key) >= 0;
            statusRows.push({
                idx: idx++,
                key: t.key,
                label: t.label,
                icon: t.icon,
                loaded: loaded,
                active: active,
                status: active ? 'active' : loaded ? 'ready' : 'not-loaded'
            });
        });
        publome.loadSeedData({ panelStatus: statusRows });
    }

    /**
     * Standalone demo data for testing without API.
     */
    static seedDemo(publome) {
        // Demo students
        var students = [
            { idx: 1,  studentNumber: '21900001', firstName: 'Sipho',    lastName: 'Nkosi',    programmeCode: 'BTMBA1', finalMark: 72, status: 'pass' },
            { idx: 2,  studentNumber: '21900002', firstName: 'Thandiwe', lastName: 'Dlamini',  programmeCode: 'BTMBA1', finalMark: 85, status: 'pass' },
            { idx: 3,  studentNumber: '21900003', firstName: 'Bongani',  lastName: 'Mthembu',  programmeCode: 'BTMBA1', finalMark: 45, status: 'fail' },
            { idx: 4,  studentNumber: '21900004', firstName: 'Nomvula',  lastName: 'Zulu',     programmeCode: 'BTMSB1', finalMark: 62, status: 'pass' },
            { idx: 5,  studentNumber: '21900005', firstName: 'Andile',   lastName: 'Cele',     programmeCode: 'BTMBA1', finalMark: 38, status: 'fail' },
            { idx: 6,  studentNumber: '21900006', firstName: 'Zanele',   lastName: 'Mkhize',   programmeCode: 'BTMBA1', finalMark: 55, status: 'pass' },
            { idx: 7,  studentNumber: '21900007', firstName: 'Thabo',    lastName: 'Sithole',  programmeCode: 'BTMSB1', finalMark: 91, status: 'pass' },
            { idx: 8,  studentNumber: '21900008', firstName: 'Ayanda',   lastName: 'Ngcobo',   programmeCode: 'BTMBA1', finalMark: 67, status: 'pass' },
            { idx: 9,  studentNumber: '21900009', firstName: 'Lungelo',  lastName: 'Khumalo',  programmeCode: 'BTMBA1', finalMark: 42, status: 'fail' },
            { idx: 10, studentNumber: '21900010', firstName: 'Nompilo',  lastName: 'Ndlovu',   programmeCode: 'BTMSB1', finalMark: 78, status: 'pass' }
        ];

        // Demo assessments
        var assessments = [
            { idx: 1, code: 'TM_1', name: 'Test Mark 1', weight: 25, mean: 62.5, count: 10 },
            { idx: 2, code: 'TM_2', name: 'Test Mark 2', weight: 25, mean: 58.3, count: 10 },
            { idx: 3, code: 'TM_3', name: 'Test Mark 3', weight: 25, mean: 55.0, count: 10 },
            { idx: 4, code: 'TM_4', name: 'Test Mark 4', weight: 25, mean: 60.1, count: 10 }
        ];

        // Demo KPIs
        var kpis = ClassViewSeed._buildKPIRecords({
            totalStudents: 10, avgMark: 63.5, passRate: 70, atRisk: 3,
            attendance: 82, assessments: 4
        });

        // Demo panel status
        var panelStatus = [
            { idx: 1, key: 'risk',       label: 'Risk',        icon: 'exclamation-triangle', loaded: true, active: false, status: 'ready' },
            { idx: 2, key: 'roster',     label: 'Roster',      icon: 'users',                loaded: true, active: false, status: 'ready' },
            { idx: 3, key: 'gradebook',  label: 'Gradebook',   icon: 'clipboard-check',      loaded: true, active: false, status: 'ready' },
            { idx: 4, key: 'attendance', label: 'Attendance',  icon: 'calendar-check',       loaded: true, active: false, status: 'ready' },
            { idx: 5, key: 'historical', label: 'Historical',  icon: 'chart-line',           loaded: true, active: false, status: 'ready' },
            { idx: 6, key: 'peerCorr',   label: 'Peer Corr',   icon: 'balance-scale',        loaded: true, active: false, status: 'ready' },
            { idx: 7, key: 'analytics',  label: 'Analytics',   icon: 'chart-bar',            loaded: true, active: false, status: 'ready' },
            { idx: 8, key: 'polls',      label: 'Polls',       icon: 'poll',                 loaded: true, active: false, status: 'ready' },
            { idx: 9, key: 'regCheck',  label: 'Registration', icon: 'clipboard-list',       loaded: true, active: false, status: 'ready' }
        ];

        publome.loadSeedData({ student: students, assessment: assessments, kpi: kpis, panelStatus: panelStatus });
        // Select first KPI so bindView has a selected record
        if (publome.table('kpi').all().length > 0) publome.table('kpi').select(1);
        return publome;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassViewSeed;
}
if (typeof window !== 'undefined') {
    window.ClassViewSeed = ClassViewSeed;
}
