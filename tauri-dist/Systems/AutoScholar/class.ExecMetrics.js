/**
 * ExecMetrics — Metrics calculation engine for Executive Insight
 *
 * Works with a Publome instance containing the ExecSchema tables.
 * Calculates KPIs, deltas, comparisons, and aggregates at all entity levels.
 *
 * Usage:
 *   const engine = new ExecMetrics(publome);
 *   const kpis = engine.getKPIs(entityIdx, year);
 *   const comparison = engine.compare(entityIdx, baselineIdx, year);
 */
class ExecMetrics {

    constructor(publome) {
        this.publome = publome;
        this._cache = new Map();
    }

    // ── Public API ───────────────────────────────────────────────────

    /** Get all metric values for an entity in a given year */
    getObservations(entityIdx, year) {
        const key = `obs:${entityIdx}:${year}`;
        if (this._cache.has(key)) return this._cache.get(key);

        const obsTable = this.publome.table('metricObservation');
        const result = obsTable.all().filter(o =>
            o.get('entityId') === entityIdx && o.get('year') === year
        );
        const mapped = result.map(o => ({
            metricId: o.get('metricId'),
            value:    o.get('value'),
            note:     o.get('note')
        }));
        this._cache.set(key, mapped);
        return mapped;
    }

    /** Get a single metric value for an entity in a year */
    getValue(metricId, entityIdx, year) {
        const obs = this.getObservations(entityIdx, year);
        const found = obs.find(o => o.metricId === metricId);
        return found ? found.value : null;
    }

    /** Get KPI dashboard data for an entity */
    getKPIs(entityIdx, year) {
        const key = `kpi:${entityIdx}:${year}`;
        if (this._cache.has(key)) return this._cache.get(key);

        const metricTable = this.publome.table('metric');
        const allMetrics = metricTable.all();
        const obs = this.getObservations(entityIdx, year);
        const entity = this.publome.table('entity').read(entityIdx);

        const kpis = {};
        for (const m of allMetrics) {
            const mIdx = m.get('idx');
            const code = m.get('code');
            const ob = obs.find(o => o.metricId === mIdx);
            kpis[code] = {
                metricId:  mIdx,
                name:      m.get('name'),
                code:      code,
                unit:      m.get('unit'),
                target:    m.get('target'),
                benchmark: m.get('benchmark'),
                value:     ob ? ob.value : null,
                status:    ob ? this._status(ob.value, m.get('target'), m.get('benchmark'), m.get('unit')) : 'unknown'
            };
        }

        // Add entity summary fields
        kpis._entity = entity ? {
            name: entity.get('name'),
            type: entity.get('type'),
            code: entity.get('code'),
            students: entity.get('students') || 0
        } : null;

        this._cache.set(key, kpis);
        return kpis;
    }

    /** Compare an entity against a baseline entity */
    compare(entityIdx, baselineIdx, year) {
        const entityKpis = this.getKPIs(entityIdx, year);
        const baseKpis = this.getKPIs(baselineIdx, year);
        const result = {};

        for (const [code, kpi] of Object.entries(entityKpis)) {
            if (code.startsWith('_')) continue;
            const baseVal = baseKpis[code]?.value;
            result[code] = {
                ...kpi,
                baseline: baseVal,
                delta: (kpi.value !== null && baseVal !== null) ? kpi.value - baseVal : null
            };
        }
        return result;
    }

    /** Get year-over-year trend for a metric at an entity */
    getTrend(metricId, entityIdx, years) {
        return years.map(y => ({
            year: y,
            value: this.getValue(metricId, entityIdx, y)
        }));
    }

    /** Get all children entities of a given parent */
    getChildren(parentIdx) {
        return this.publome.table('entity').all()
            .filter(e => e.get('parentId') === parentIdx);
    }

    /** Get entity hierarchy path (institution > faculty > programme) */
    getBreadcrumb(entityIdx) {
        const entityTable = this.publome.table('entity');
        const path = [];
        let current = entityTable.read(entityIdx);
        while (current) {
            path.unshift({
                idx:  current.get('idx'),
                name: current.get('name'),
                type: current.get('type'),
                code: current.get('code')
            });
            const parentId = current.get('parentId');
            current = parentId ? entityTable.read(parentId) : null;
        }
        return path;
    }

    /** Get ranking of entities within a parent by a metric */
    getRanking(parentIdx, metricId, year, order = 'desc') {
        const children = this.getChildren(parentIdx);
        const ranked = children.map(e => ({
            idx:   e.get('idx'),
            name:  e.get('name'),
            code:  e.get('code'),
            value: this.getValue(metricId, e.get('idx'), year)
        })).filter(r => r.value !== null);

        ranked.sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);
        return ranked;
    }

    /** Get summary table: all children with all metrics */
    getChildrenSummary(parentIdx, year) {
        const children = this.getChildren(parentIdx);
        const metricTable = this.publome.table('metric');
        const allMetrics = metricTable.all();

        return children.map(e => {
            const eIdx = e.get('idx');
            const row = {
                idx:      eIdx,
                name:     e.get('name'),
                code:     e.get('code'),
                type:     e.get('type'),
                students: e.get('students') || 0
            };
            for (const m of allMetrics) {
                row[m.get('code')] = this.getValue(m.get('idx'), eIdx, year);
            }
            return row;
        });
    }

    /** Get category-grouped metrics with observations for an entity */
    getMetricsByCategory(entityIdx, year) {
        const catTable = this.publome.table('metricCategory');
        const metricTable = this.publome.table('metric');
        const categories = catTable.all();

        return categories.map(cat => {
            const catIdx = cat.get('idx');
            const metrics = metricTable.all()
                .filter(m => m.get('metricCategoryId') === catIdx)
                .map(m => {
                    const mIdx = m.get('idx');
                    const value = this.getValue(mIdx, entityIdx, year);
                    const target = m.get('target');
                    const benchmark = m.get('benchmark');
                    return {
                        idx:       mIdx,
                        code:      m.get('code'),
                        name:      m.get('name'),
                        unit:      m.get('unit'),
                        target,
                        benchmark,
                        value,
                        status:    this._status(value, target, benchmark, m.get('unit'))
                    };
                });

            return {
                idx:   catIdx,
                name:  cat.get('name'),
                icon:  cat.get('icon'),
                color: cat.get('color'),
                metrics
            };
        });
    }

    /** Get interventions for a metric with their PDSA cycles */
    getInterventions(metricId) {
        const intTable = this.publome.table('intervention');
        const pdsaTable = this.publome.table('pdsaCycle');

        return intTable.all()
            .filter(i => i.get('metricId') === metricId)
            .map(i => {
                const iIdx = i.get('idx');
                const cycles = pdsaTable.all()
                    .filter(p => p.get('interventionId') === iIdx)
                    .map(p => ({
                        idx:           p.get('idx'),
                        phase:         p.get('phase'),
                        plan:          p.get('plan'),
                        doNotes:       p.get('doNotes'),
                        studyFindings: p.get('studyFindings'),
                        actDecision:   p.get('actDecision'),
                        startDate:     p.get('startDate'),
                        endDate:       p.get('endDate'),
                        status:        p.get('status'),
                        entityId:      p.get('entityId')
                    }));

                return {
                    idx:           iIdx,
                    name:          i.get('name'),
                    category:      i.get('category'),
                    evidenceLevel: i.get('evidenceLevel'),
                    description:   i.get('description'),
                    status:        i.get('status'),
                    cycles
                };
            });
    }

    /** Get notes for an entity, optionally filtered by metric */
    getNotes(entityIdx, metricId = null) {
        const noteTable = this.publome.table('note');
        return noteTable.all()
            .filter(n => {
                if (n.get('entityId') !== entityIdx) return false;
                if (metricId !== null && n.get('metricId') !== metricId) return false;
                return true;
            })
            .map(n => ({
                idx:       n.get('idx'),
                content:   n.get('content'),
                author:    n.get('author'),
                createdAt: n.get('createdAt'),
                metricId:  n.get('metricId')
            }));
    }

    /** Get available years from observations */
    getYears() {
        const obsTable = this.publome.table('metricObservation');
        const years = new Set();
        for (const o of obsTable.all()) {
            years.add(o.get('year'));
        }
        return [...years].sort((a, b) => b - a);
    }

    /** Compute aggregate stats from raw course data (for API-driven mode) */
    static computeCourseStats(courses) {
        if (!courses || courses.length === 0) {
            return { students: 0, assessed: 0, passes: 0, fails: 0, absent: 0, passRate: 0, mean: 0, stdDev: 0, courseCount: 0 };
        }

        let totalStudents = 0, passes = 0, fails = 0, absent = 0;
        let weightedMeanSum = 0, meanCount = 0;
        const means = [];

        for (const c of courses) {
            const n = c.numStudents || 0;
            totalStudents += n;
            passes += c.passes || 0;
            fails += c.fails || 0;
            absent += c.absent || 0;
            if (c.mean != null && n > 0) {
                weightedMeanSum += c.mean * n;
                meanCount += n;
                means.push(c.mean);
            }
        }

        const assessed = passes + fails;
        const passRate = assessed > 0 ? (passes / assessed) * 100 : 0;
        const mean = meanCount > 0 ? weightedMeanSum / meanCount : 0;

        // Std dev of course means
        let stdDev = 0;
        if (means.length > 1) {
            const avg = means.reduce((s, v) => s + v, 0) / means.length;
            const variance = means.reduce((s, v) => s + (v - avg) ** 2, 0) / means.length;
            stdDev = Math.sqrt(variance);
        }

        return {
            students:    totalStudents,
            assessed,
            passes,
            fails,
            absent,
            passRate:    Math.round(passRate * 10) / 10,
            mean:        Math.round(mean * 10) / 10,
            stdDev:      Math.round(stdDev * 10) / 10,
            courseCount:  courses.length
        };
    }

    /** Compute Credit Accumulation Rate for a student */
    static computeCAR(creditsPassed, semesters) {
        if (!semesters || semesters <= 0) return 0;
        return Math.round((creditsPassed / semesters) * 10) / 10;
    }

    /** Compute distribution stats { min, q1, median, q3, max } from child entity values */
    getDistribution(parentIdx, metricCode, year) {
        const metricTable = this.publome.table('metric');
        const metric = metricTable.all().find(m => m.get('code') === metricCode);
        if (!metric) return null;
        const children = this.getChildren(parentIdx);
        const vals = children.map(c => this.getValue(metric.get('idx'), c.get('idx'), year)).filter(v => v !== null).sort((a, b) => a - b);
        if (vals.length < 2) return null;
        const q = (arr, p) => { const i = (arr.length - 1) * p; const lo = Math.floor(i); return lo === i ? arr[lo] : arr[lo] + (arr[lo + 1] - arr[lo]) * (i - lo); };
        return { min: vals[0], q1: q(vals, 0.25), median: q(vals, 0.5), q3: q(vals, 0.75), max: vals[vals.length - 1], n: vals.length };
    }

    /** Linear regression forecast: projects metric values forward */
    forecast(entityIdx, years, projectionYears = 2) {
        const metricTable = this.publome.table('metric');
        const entity = this.publome.table('entity').read(entityIdx);
        if (!entity) return [];
        const stuMetric = metricTable.all().find(m => m.get('code') === 'course-pass-rate');
        if (!stuMetric) return [];

        const data = years.map(y => ({ year: y, value: this.getValue(stuMetric.get('idx'), entityIdx, y) })).filter(d => d.value !== null);
        if (data.length < 2) return data.map(d => ({ ...d, projected: null }));

        // Least squares: y = mx + b
        const n = data.length;
        const sumX = data.reduce((s, d) => s + d.year, 0);
        const sumY = data.reduce((s, d) => s + d.value, 0);
        const sumXY = data.reduce((s, d) => s + d.year * d.value, 0);
        const sumXX = data.reduce((s, d) => s + d.year * d.year, 0);
        const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - m * sumX) / n;

        // R-squared
        const meanY = sumY / n;
        const ssRes = data.reduce((s, d) => s + (d.value - (m * d.year + b)) ** 2, 0);
        const ssTot = data.reduce((s, d) => s + (d.value - meanY) ** 2, 0);
        const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

        const result = data.map(d => ({ year: d.year, actual: d.value, projected: null, rSquared }));
        const lastYear = years[0]; // years are desc
        for (let i = 1; i <= projectionYears; i++) {
            const yr = lastYear + i;
            result.push({ year: yr, actual: null, projected: Math.round((m * yr + b) * 10) / 10, rSquared });
        }
        return result.sort((a, b) => a.year - b.year);
    }

    /** Z-test for proportions: is pA significantly different from pB? */
    static isSignificant(pA, pB, nA, nB) {
        if (nA < 5 || nB < 5 || pA == null || pB == null) return { significant: false, zScore: 0, pValue: 1 };
        const p1 = pA / 100, p2 = pB / 100;
        const pPool = (p1 * nA + p2 * nB) / (nA + nB);
        const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
        if (se === 0) return { significant: false, zScore: 0, pValue: 1 };
        const z = (p1 - p2) / se;
        // Approximate two-tailed p-value from z-score
        const absZ = Math.abs(z);
        const pValue = absZ > 3.5 ? 0.0005 : absZ > 2.58 ? 0.01 : absZ > 1.96 ? 0.05 : absZ > 1.645 ? 0.1 : 1;
        return { significant: absZ >= 1.96, zScore: Math.round(z * 100) / 100, pValue };
    }

    /** Clear calculation cache (call when data changes) */
    clearCache() {
        this._cache.clear();
    }

    // ── Private ──────────────────────────────────────────────────────

    _status(value, target, benchmark, unit) {
        if (value === null || value === undefined) return 'unknown';

        // For ratio metrics where lower is better (student-staff ratio)
        const lowerIsBetter = unit === 'ratio';

        if (lowerIsBetter) {
            if (value <= target)    return 'success';
            if (value <= benchmark) return 'warning';
            return 'danger';
        }

        // For all other metrics, higher is better
        if (value >= target)    return 'success';
        if (value >= benchmark) return 'warning';
        return 'danger';
    }

    // ── Static Shared Utilities ─────────────────────────────────────

    /** Value-based color: green above good, amber above ok, red below */
    static valColor(val, good, ok) {
        if (val == null) return 'var(--ui-gray-400)';
        if (val >= good) return 'var(--ex-clr-success)';
        if (val >= ok)   return 'var(--ex-clr-warning)';
        return 'var(--ex-clr-danger)';
    }

    /** Heatmap CSS class for pass rate or mean score cells */
    static heatmapClass(value, type) {
        if (value == null) return '';
        const shift = type === 'mean' ? -10 : 0;
        if (value < 50 + shift) return 'ex-heatmap-red';
        if (value < 60 + shift) return 'ex-heatmap-amber';
        if (value < 70 + shift) return 'ex-heatmap-light-green';
        return 'ex-heatmap-green';
    }
}
