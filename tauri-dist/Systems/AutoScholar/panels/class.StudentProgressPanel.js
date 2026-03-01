/**
 * StudentProgressPanel - Degree progress tracking and prerequisite visualization
 *
 * Shows credit accumulation, prerequisite tree, registration advisor integration,
 * and recommended courses from ProgrammeEstimator.
 */
class StudentProgressPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
    }

    render(container) {
        const academic = this.services.academic;
        if (!academic) {
            container.add({ css: 'text-center py-8 text-muted', script: 'Academic service not available' });
            return;
        }

        // Header
        const header = container.add({ css: 'flex items-center gap-2 mb-4' });
        header.add({ tag: 'i', css: 'fas fa-chart-line text-primary text-xl' });
        header.add({ tag: 'h2', css: 'text-lg font-semibold', script: 'Degree Progress' });

        // Calculate progress
        const results = this._getStudentResults();
        const passedResults = results.filter(r => r.mark >= 50);
        const creditsEarned = passedResults.reduce((sum, r) => {
            const course = this._getCourseFromEnrolment(r.enrolmentId);
            return sum + (parseInt(course?.credits) || 0);
        }, 0);
        const yearOfStudy = Math.floor(creditsEarned / 128) + 1;
        const totalCreditsRequired = 360; // Standard 3-year degree
        const completionPct = Math.min(100, Math.round((creditsEarned / totalCreditsRequired) * 100));

        // KPI Row via UIBinding (mini-Publome pattern)
        const progPublome = new Publome();
        progPublome.loadSchema({ tables: [{ name: 'kpi', columns: {
            idx: { type: 'number', primaryKey: true },
            value: { type: 'string' }
        }}]});
        const progKpiTable = progPublome.table('kpi');
        progKpiTable.create({ idx: 1, value: `Year ${yearOfStudy}` });
        progKpiTable.create({ idx: 2, value: String(creditsEarned) });
        progKpiTable.create({ idx: 3, value: String(totalCreditsRequired) });
        progKpiTable.create({ idx: 4, value: `${completionPct}%` });
        progKpiTable.create({ idx: 5, value: this._calculateGPA() });

        const kpiRow = container.add({ css: 'flex flex-wrap gap-3 mb-4' });
        const pkb = new UIBinding(progKpiTable, { publome: progPublome });
        pkb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 1); return r ? r.get('value') : '—'; },
            label: 'Year of Study', icon: 'fas fa-graduation-cap', color: 'var(--ui-primary)'
        });
        pkb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 2); return r ? r.get('value') : '—'; },
            label: 'Credits Earned', icon: 'fas fa-book', color: 'var(--ui-accent)'
        });
        pkb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 3); return r ? r.get('value') : '—'; },
            label: 'Credits Required', icon: 'fas fa-flag-checkered', color: 'var(--ui-primary)'
        });
        pkb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 4); return r ? r.get('value') : '—'; },
            label: 'Completion', icon: 'fas fa-percentage',
            color: completionPct >= 60 ? 'var(--ui-accent)' : 'var(--ui-secondary)'
        });
        pkb.bindMetric(kpiRow.domElement, {
            compute: recs => { const r = recs.find(x => x.get('idx') === 5); return r ? r.get('value') : '—'; },
            label: 'GPA', icon: 'fas fa-chart-line', color: 'var(--ui-primary)'
        });

        // Progress bar
        const progressSection = container.add({ css: 'card p-4 mb-4' });
        progressSection.add({ css: 'font-semibold mb-2', script: 'Degree Completion' });
        AutoScholarConfig.renderProgress(progressSection, completionPct, { thresholdKey: 'completion' });
        const creditsSummary = progressSection.add({ css: 'flex justify-between text-xs text-muted mt-2' });
        creditsSummary.add({ tag: 'span', script: `${creditsEarned} credits earned` });
        creditsSummary.add({ tag: 'span', script: `${totalCreditsRequired - creditsEarned} remaining` });

        // Credit breakdown by year
        this._renderCreditBreakdown(container);

        // Course status grid
        this._renderCourseStatusGrid(container, creditsEarned, yearOfStudy);
    }

    _renderCreditBreakdown(container) {
        const section = container.add({ css: 'card p-4 mb-4' });
        section.add({ css: 'font-semibold mb-3', script: 'Credits by Year Level' });

        const enrolments = this._getStudentEnrolments();
        const results = this._getStudentResults();
        const yearCredits = {};

        enrolments.forEach(enrol => {
            const offering = this._getOffering(enrol.offeringId);
            if (!offering) return;
            const course = this._getCourse(offering.courseId);
            const year = offering.year || new Date().getFullYear();
            if (!yearCredits[year]) yearCredits[year] = { earned: 0, enrolled: 0, total: 0 };

            const credits = parseInt(course?.credits) || 0;
            yearCredits[year].total += credits;

            const result = results.find(r => r.enrolmentId === enrol.idx);
            if (result?.mark >= 50) {
                yearCredits[year].earned += credits;
            }
            yearCredits[year].enrolled += credits;
        });

        const years = Object.keys(yearCredits).sort();
        if (years.length === 0) {
            section.add({ css: 'text-sm text-muted', script: 'No credit data available' });
            return;
        }

        const grid = section.add({ css: 'space-y-2' });
        years.forEach(year => {
            const data = yearCredits[year];
            const pct = data.enrolled > 0 ? Math.round((data.earned / data.enrolled) * 100) : 0;
            const row = grid.add({ css: 'flex items-center gap-3' });
            row.add({ css: 'w-12 text-sm font-medium', script: year });
            const barWrap = row.add({ css: 'flex-1' });
            AutoScholarConfig.renderProgress(barWrap, pct, { thresholdKey: 'pass' });
            row.add({ css: 'w-24 text-xs text-right text-muted', script: `${data.earned}/${data.enrolled} cr (${pct}%)` });
        });
    }

    _renderCourseStatusGrid(container, creditsEarned, yearOfStudy) {
        const section = container.add({ css: 'card p-4' });
        section.add({ css: 'font-semibold mb-3', script: 'Course Status Overview' });

        const courses = this.services.academic?.publon?.course?.rows?.filter(c => c) || [];
        const enrolments = this._getStudentEnrolments();
        const results = this._getStudentResults();

        const passedIds = new Set();
        const enrolledIds = new Set();

        enrolments.forEach(e => {
            const offering = this._getOffering(e.offeringId);
            if (!offering) return;
            enrolledIds.add(offering.courseId);
            const result = results.find(r => r.enrolmentId === e.idx);
            if (result?.mark >= 50) passedIds.add(offering.courseId);
        });

        // Status counts
        const passed = courses.filter(c => passedIds.has(c.idx));
        const inProgress = courses.filter(c => enrolledIds.has(c.idx) && !passedIds.has(c.idx));
        const remaining = courses.filter(c => !enrolledIds.has(c.idx));

        const statusRow = section.add({ css: 'flex flex-wrap gap-3 mb-3' });
        this._renderStatusBadge(statusRow, 'Passed', passed.length, 'bg-green-100 text-green-700');
        this._renderStatusBadge(statusRow, 'In Progress', inProgress.length, 'bg-blue-100 text-blue-700');
        this._renderStatusBadge(statusRow, 'Remaining', remaining.length, 'bg-gray-100 text-gray-600');

        // Course chips
        const chipGrid = section.add({ css: 'flex flex-wrap gap-1 mt-3' });
        passed.forEach(c => {
            chipGrid.add({ css: 'px-2 py-0.5 text-xs rounded bg-green-100 text-green-700', script: c.code || '?' });
        });
        inProgress.forEach(c => {
            chipGrid.add({ css: 'px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700', script: c.code || '?' });
        });
        remaining.slice(0, 20).forEach(c => {
            chipGrid.add({ css: 'px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500', script: c.code || '?' });
        });
        if (remaining.length > 20) {
            chipGrid.add({ css: 'px-2 py-0.5 text-xs rounded text-gray-400', script: `+${remaining.length - 20} more` });
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    _renderKPI(container, icon, label, value, colorCss) {
        const card = container.add({ css: 'card p-3 text-center as-flex-kpi' });
        card.add({ tag: 'i', css: `fas fa-${icon} text-xl mb-1 ${colorCss}` });
        card.add({ css: 'text-lg font-bold', script: value });
        card.add({ css: 'text-xs text-muted', script: label });
    }

    _renderStatusBadge(container, label, count, css) {
        const badge = container.add({ css: `px-3 py-1 rounded-full text-sm font-medium ${css}` });
        badge.add({ script: `${label}: ${count}` });
    }

    _getStudentEnrolments() {
        if (!this.services.academic) return [];
        const studentId = this.currentUser?.idx;
        if (!studentId) return [];
        return (this.services.academic.publon.enrolment.rows || []).filter(e => e && e.studentId === studentId);
    }

    _getStudentResults() {
        const enrolments = this._getStudentEnrolments();
        const enrolmentIds = enrolments.map(e => e.idx);
        if (!this.services.academic) return [];
        return (this.services.academic.publon.result?.rows || []).filter(r => r && enrolmentIds.includes(r.enrolmentId));
    }

    _getCourse(courseId) {
        return this.services.academic?.publon?.course?.rows?.find(c => c?.idx === courseId);
    }

    _getOffering(offeringId) {
        return this.services.academic?.publon?.offering?.rows?.find(o => o?.idx === offeringId);
    }

    _getCourseFromEnrolment(enrolmentId) {
        const enrol = this.services.academic?.publon?.enrolment?.rows?.find(e => e?.idx === enrolmentId);
        if (!enrol) return null;
        const offering = this._getOffering(enrol.offeringId);
        return offering ? this._getCourse(offering.courseId) : null;
    }

    _calculateGPA() {
        const results = this._getStudentResults();
        if (results.length === 0) return '0.0';
        const points = results.map(r => {
            if (r.mark >= 75) return 4.0;
            if (r.mark >= 70) return 3.5;
            if (r.mark >= 60) return 3.0;
            if (r.mark >= 50) return 2.0;
            return 0;
        });
        return (points.reduce((a, b) => a + b, 0) / points.length).toFixed(1);
    }
}
