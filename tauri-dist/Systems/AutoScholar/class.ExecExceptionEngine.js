/**
 * ExecExceptionEngine — Exception-driven analytics for Executive Insight
 *
 * Scans all ExecMetrics data, computes exceptions ranked by severity,
 * and applies academic calendar awareness via ExecRhythmCalendar.
 *
 * Exception types:
 *   - threshold_breach:  Value below target (or above for ratio metrics)
 *   - trend_decline:     >5% year-over-year decline
 *   - benchmark_gap:     Value below sector benchmark
 *   - stale_data:        No observation in current year
 *
 * Severity scoring:  severity × urgency × student_impact
 *   - severity:  how far from target (0-1 normalised)
 *   - urgency:   rhythm-adjusted calendar factor
 *   - impact:    student count affected (normalised)
 *
 * Usage:
 *   const engine = new ExecExceptionEngine(execMetrics, publome);
 *   engine.setCalendar(new ExecRhythmCalendar());
 *   const exceptions = engine.scan(entityIdx, year);
 *   const top5 = engine.getTopExceptions(entityIdx, year, 5);
 */
class ExecExceptionEngine {

    constructor(execMetrics, publome) {
        this.metrics  = execMetrics;
        this.publome  = publome;
        this.calendar = null;
        this._cache   = new Map();
    }

    /** Attach a rhythm calendar for seasonal threshold adjustment */
    setCalendar(calendar) {
        this.calendar = calendar;
        this._cache.clear();
    }

    /** Clear cached exception results (call when data changes) */
    clearCache() {
        this._cache.clear();
    }

    // ── Public API ───────────────────────────────────────────────────

    /**
     * Scan all metrics for an entity and return ranked exceptions.
     * @param {number} entityIdx - Entity to scan
     * @param {number} year - Academic year
     * @param {Date} [date] - Date for rhythm adjustment (defaults to now)
     * @returns {Array} Sorted exceptions, highest priority first
     */
    scan(entityIdx, year, date) {
        const key = `scan:${entityIdx}:${year}`;
        if (this._cache.has(key)) return this._cache.get(key);

        const exceptions = [];
        const metricTable = this.publome.table('metric');
        const allMetrics = metricTable.all();
        const entity = this.publome.table('entity').read(entityIdx);
        const students = entity ? (entity.get('students') || 0) : 0;
        const years = this.metrics.getYears();

        for (const m of allMetrics) {
            const mIdx = m.get('idx');
            const code = m.get('code');
            const name = m.get('name');
            const unit = m.get('unit');
            const target = m.get('target');
            const benchmark = m.get('benchmark');
            const value = this.metrics.getValue(mIdx, entityIdx, year);

            // Category info for display
            const catIdx = m.get('metricCategoryId');
            const cat = this.publome.table('metricCategory').read(catIdx);
            const categoryName = cat ? cat.get('name') : '';
            const categoryIcon = cat ? cat.get('icon') : 'chart-line';

            // Rhythm adjustment
            const rhythmFactor = this.calendar
                ? this.calendar.getThresholdAdjustment(code, date)
                : 1.0;
            const rhythmReason = this.calendar
                ? this.calendar.getAdjustmentReason(code, date)
                : null;

            // 1. Stale data check
            if (value === null) {
                exceptions.push(this._createException({
                    type: 'stale_data', metricId: mIdx, code, name, unit,
                    categoryName, categoryIcon,
                    entityIdx, students,
                    severity: 0.3, urgency: 0.5,
                    description: `No ${name} data recorded for ${year}`,
                    detail: 'Missing observation — data may not have been submitted or imported.',
                    rhythmReason
                }));
                continue;
            }

            const lowerIsBetter = unit === 'ratio';

            // 2. Threshold breach: value vs target
            if (target != null) {
                const breach = lowerIsBetter
                    ? (value - target) / target
                    : (target - value) / target;

                if (breach > 0) {
                    // Apply rhythm adjustment: relax the breach threshold
                    const adjustedBreach = breach / rhythmFactor;
                    if (adjustedBreach > 0.01) {  // >1% deviation after adjustment
                        const severity = Math.min(1.0, adjustedBreach);
                        exceptions.push(this._createException({
                            type: 'threshold_breach', metricId: mIdx, code, name, unit,
                            categoryName, categoryIcon,
                            entityIdx, students,
                            severity,
                            urgency: this._urgencyFromSeverity(severity),
                            value, target, benchmark,
                            description: `${name} at ${this._fmt(value, unit)} — target is ${this._fmt(target, unit)}`,
                            detail: `${lowerIsBetter ? 'Above' : 'Below'} target by ${Math.round(breach * 100)}%`,
                            rhythmReason
                        }));
                    }
                }
            }

            // 3. Trend decline: >5% YoY drop
            if (years.length >= 2) {
                const prevYear = years.find(y => y === year - 1) || years[1];
                const prevValue = this.metrics.getValue(mIdx, entityIdx, prevYear);
                if (prevValue !== null && prevValue !== 0) {
                    const pctChange = ((value - prevValue) / Math.abs(prevValue)) * 100;
                    const declining = lowerIsBetter ? pctChange > 5 : pctChange < -5;
                    if (declining) {
                        const declinePct = Math.abs(pctChange);
                        const severity = Math.min(1.0, declinePct / 20);  // 20% decline = max severity
                        // Rhythm adjustment: relax during expected seasonal dips
                        const adjustedSeverity = severity / rhythmFactor;
                        if (adjustedSeverity > 0.1) {
                            exceptions.push(this._createException({
                                type: 'trend_decline', metricId: mIdx, code, name, unit,
                                categoryName, categoryIcon,
                                entityIdx, students,
                                severity: Math.min(1.0, adjustedSeverity),
                                urgency: 0.7,
                                value, prevValue,
                                description: `${name} declined ${Math.round(declinePct)}% year-over-year`,
                                detail: `From ${this._fmt(prevValue, unit)} (${prevYear}) to ${this._fmt(value, unit)} (${year})`,
                                rhythmReason
                            }));
                        }
                    }
                }
            }

            // 4. Benchmark gap: below sector benchmark
            if (benchmark != null) {
                const gap = lowerIsBetter
                    ? (value - benchmark) / benchmark
                    : (benchmark - value) / benchmark;

                if (gap > 0) {
                    const severity = Math.min(1.0, gap * 1.5);
                    exceptions.push(this._createException({
                        type: 'benchmark_gap', metricId: mIdx, code, name, unit,
                        categoryName, categoryIcon,
                        entityIdx, students,
                        severity: severity * 0.7,  // Benchmarks are less urgent than targets
                        urgency: 0.4,
                        value, benchmark,
                        description: `${name} below sector benchmark (${this._fmt(benchmark, unit)})`,
                        detail: `Current: ${this._fmt(value, unit)} vs benchmark: ${this._fmt(benchmark, unit)}`,
                        rhythmReason
                    }));
                }
            }
        }

        // If ALL exceptions are stale_data, collapse into a single summary exception
        const staleCount = exceptions.filter(e => e.type === 'stale_data').length;
        if (staleCount > 0 && staleCount === exceptions.length) {
            const summary = this._createException({
                type: 'stale_data', metricId: null, code: '_all_stale', name: 'All Metrics',
                unit: null, categoryName: 'Data Quality', categoryIcon: 'database',
                entityIdx, students,
                severity: 0.4, urgency: 0.5,
                description: `No metric observations found for ${year} — all ${staleCount} metrics are unrecorded`,
                detail: 'This may indicate data has not been submitted for this academic year yet.',
                rhythmReason: null
            });
            summary.score = this._computeScore(summary);
            this._cache.set(key, [summary]);
            return [summary];
        }

        // Score and sort
        for (const ex of exceptions) {
            ex.score = this._computeScore(ex);
        }
        exceptions.sort((a, b) => b.score - a.score);

        this._cache.set(key, exceptions);
        return exceptions;
    }

    /**
     * Get top N exceptions for an entity.
     * Filters out low-priority items and deduplicates by metric.
     */
    getTopExceptions(entityIdx, year, count, date) {
        const all = this.scan(entityIdx, year, date);
        // Deduplicate: keep highest-scoring exception per metric
        const seen = new Map();
        const deduped = [];
        for (const ex of all) {
            if (!seen.has(ex.code)) {
                seen.set(ex.code, true);
                deduped.push(ex);
            }
        }
        return deduped.slice(0, count || 7);
    }

    /**
     * Scan all children of a parent entity and return aggregated exceptions.
     * Useful for institution-level view: "which faculties have the most issues?"
     */
    scanChildren(parentIdx, year, date) {
        const children = this.metrics.getChildren(parentIdx);
        const results = [];
        for (const child of children) {
            const childIdx = child.get('idx');
            const exceptions = this.scan(childIdx, year, date);
            if (exceptions.length > 0) {
                results.push({
                    entityIdx: childIdx,
                    entityName: child.get('name'),
                    entityCode: child.get('code'),
                    entityType: child.get('type'),
                    students: child.get('students') || 0,
                    exceptionCount: exceptions.length,
                    criticalCount: exceptions.filter(e => e.level === 'critical').length,
                    warningCount: exceptions.filter(e => e.level === 'warning').length,
                    topException: exceptions[0],
                    maxScore: exceptions[0].score
                });
            }
        }
        results.sort((a, b) => b.maxScore - a.maxScore);
        return results;
    }

    /**
     * Get a one-sentence summary of the exception landscape.
     * Used by ExecSummaryPanel for the command centre header.
     */
    getSummary(entityIdx, year, date) {
        const exceptions = this.scan(entityIdx, year, date);
        const critical = exceptions.filter(e => e.level === 'critical');
        const warning = exceptions.filter(e => e.level === 'warning');
        const info = exceptions.filter(e => e.level === 'info');

        if (exceptions.length === 0) {
            return { text: 'All metrics are on target. No exceptions detected.', level: 'success', count: 0 };
        }

        const parts = [];
        if (critical.length > 0) parts.push(`${critical.length} critical`);
        if (warning.length > 0) parts.push(`${warning.length} warning`);
        if (info.length > 0) parts.push(`${info.length} advisory`);

        const topMetric = exceptions[0];
        const text = `${parts.join(', ')} exception${exceptions.length > 1 ? 's' : ''} detected. ` +
            `Top concern: ${topMetric.description}.`;

        return {
            text,
            level: critical.length > 0 ? 'critical' : (warning.length > 0 ? 'warning' : 'info'),
            count: exceptions.length,
            criticalCount: critical.length,
            warningCount: warning.length,
            infoCount: info.length
        };
    }

    /**
     * Get rhythm context for display.
     */
    getRhythmContext(date) {
        if (!this.calendar) return null;
        return this.calendar.getContext(date);
    }

    // ── Private ──────────────────────────────────────────────────────

    _createException(opts) {
        const level = opts.severity >= 0.6 ? 'critical' :
                      opts.severity >= 0.3 ? 'warning' : 'info';
        return {
            type:         opts.type,
            level,
            metricId:     opts.metricId,
            code:         opts.code,
            name:         opts.name,
            unit:         opts.unit,
            categoryName: opts.categoryName,
            categoryIcon: opts.categoryIcon,
            entityIdx:    opts.entityIdx,
            students:     opts.students,
            severity:     opts.severity,
            urgency:      opts.urgency,
            value:        opts.value || null,
            target:       opts.target || null,
            benchmark:    opts.benchmark || null,
            prevValue:    opts.prevValue || null,
            description:  opts.description,
            detail:       opts.detail,
            rhythmReason: opts.rhythmReason,
            score:        0  // computed later
        };
    }

    /** Compute composite score: severity × urgency × student_impact */
    _computeScore(exception) {
        const maxStudents = this._getMaxStudents();
        const studentImpact = maxStudents > 0
            ? 0.3 + 0.7 * (exception.students / maxStudents)  // 0.3 base + 0.7 scaled
            : 1.0;

        return Math.round(exception.severity * exception.urgency * studentImpact * 1000) / 1000;
    }

    /** Get maximum student count across all entities for normalisation */
    _getMaxStudents() {
        if (this._maxStudents !== undefined) return this._maxStudents;
        const entities = this.publome.table('entity').all();
        this._maxStudents = Math.max(1, ...entities.map(e => e.get('students') || 0));
        return this._maxStudents;
    }

    _urgencyFromSeverity(severity) {
        if (severity >= 0.7) return 0.9;
        if (severity >= 0.4) return 0.7;
        return 0.5;
    }

    /** Format a value with its unit for display */
    _fmt(value, unit) {
        if (value === null || value === undefined) return '—';
        if (unit === 'ratio') return value.toFixed(1) + ':1';
        if (unit === 'score') return value.toFixed(1) + '/5';
        if (unit === '%') return Math.round(value) + '%';
        return String(value);
    }
}
