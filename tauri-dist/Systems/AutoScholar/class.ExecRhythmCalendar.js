/**
 * ExecRhythmCalendar — Academic calendar model for seasonal threshold adjustment
 *
 * South African university academic calendar awareness. Provides expected seasonal
 * baselines for each metric so exception thresholds adjust contextually. A 5% drop
 * in satisfaction during February (registration chaos) is expected; during August
 * (normal teaching) it is a genuine anomaly.
 *
 * Usage:
 *   const calendar = new ExecRhythmCalendar();
 *   const context = calendar.getContext(new Date());
 *   const adjustment = calendar.getThresholdAdjustment('retention-rate', new Date());
 */
class ExecRhythmCalendar {

    constructor() {
        // Academic periods with month ranges (1-indexed)
        // Each period defines expected metric behaviour deviations
        this._periods = ExecRhythmCalendar._periods();
    }

    // ── Public API ───────────────────────────────────────────────────

    /** Get the current academic period context for a date */
    getContext(date) {
        const month = (date || new Date()).getMonth() + 1; // 1-indexed
        for (const period of this._periods) {
            if (month >= period.startMonth && month <= period.endMonth) {
                return {
                    name:        period.name,
                    icon:        period.icon,
                    description: period.description,
                    month,
                    sensitivity: period.sensitivity
                };
            }
        }
        return { name: 'Standard', icon: 'calendar', description: 'Normal academic period', month, sensitivity: 'normal' };
    }

    /**
     * Get threshold adjustment factor for a metric at a given date.
     * Returns a multiplier: >1 means relax threshold (expect worse), <1 means tighten (expect better).
     * A factor of 1.3 means "allow 30% more deviation before flagging an exception."
     */
    getThresholdAdjustment(metricCode, date) {
        const month = (date || new Date()).getMonth() + 1;
        const adjustments = this._getMetricAdjustments(metricCode);
        return adjustments[month] || 1.0;
    }

    /** Get human-readable explanation for why a threshold is adjusted */
    getAdjustmentReason(metricCode, date) {
        const month = (date || new Date()).getMonth() + 1;
        const context = this.getContext(date);
        const adjustment = this.getThresholdAdjustment(metricCode, date);

        if (adjustment === 1.0) return null;

        const direction = adjustment > 1.0 ? 'relaxed' : 'tightened';
        const pct = Math.round(Math.abs(adjustment - 1.0) * 100);
        return {
            direction,
            percentage: pct,
            period:     context.name,
            reason:     this._getReasonText(metricCode, month)
        };
    }

    /** Get all periods for display in the About panel or calendar view */
    getPeriods() {
        return this._periods.map(p => ({
            name:        p.name,
            icon:        p.icon,
            startMonth:  p.startMonth,
            endMonth:    p.endMonth,
            description: p.description,
            sensitivity: p.sensitivity
        }));
    }

    // ── Private ──────────────────────────────────────────────────────

    /**
     * Month-by-month adjustment factors for each metric code.
     * >1.0 = relax threshold (expect worse performance in this period)
     * <1.0 = tighten threshold (expect better, so deviations are more alarming)
     * 1.0  = standard threshold
     */
    _getMetricAdjustments(metricCode) {
        const adjustments = {
            // Student Success metrics
            'graduation-rate': {
                // Graduation data finalised Apr/Sep — expect noise beforehand
                1: 1.2, 2: 1.2, 3: 1.3, 4: 1.0, 5: 1.1, 6: 1.1,
                7: 1.2, 8: 1.3, 9: 1.0, 10: 1.0, 11: 1.0, 12: 1.1
            },
            'retention-rate': {
                // Registration chaos Jan-Feb causes temporary drops
                1: 1.4, 2: 1.3, 3: 1.1, 4: 1.0, 5: 1.0, 6: 1.0,
                7: 1.0, 8: 1.0, 9: 1.0, 10: 1.0, 11: 1.0, 12: 1.1
            },
            'course-pass-rate': {
                // Assessment months: pass rates only meaningful during/after exams
                1: 1.3, 2: 1.3, 3: 0.9, 4: 1.0, 5: 0.9, 6: 1.0,
                7: 1.1, 8: 0.9, 9: 1.0, 10: 0.9, 11: 1.0, 12: 1.1
            },
            'course-mean': {
                // Same pattern as pass rate — exam periods produce real data
                1: 1.3, 2: 1.3, 3: 0.9, 4: 1.0, 5: 0.9, 6: 1.0,
                7: 1.1, 8: 0.9, 9: 1.0, 10: 0.9, 11: 1.0, 12: 1.1
            },
            // Quality Assurance
            'stakeholder-satisfaction': {
                // Registration and exam periods cause expected dips
                1: 1.3, 2: 1.4, 3: 1.1, 4: 1.0, 5: 1.2, 6: 1.0,
                7: 1.0, 8: 1.0, 9: 1.0, 10: 1.1, 11: 1.0, 12: 1.1
            },
            'programme-accreditation': {
                // Accreditation reviews cluster around specific months
                1: 1.0, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.9, 6: 1.0,
                7: 1.0, 8: 1.0, 9: 0.9, 10: 0.9, 11: 1.0, 12: 1.0
            },
            'audit-completion': {
                // Audit cycles: pressure in Q1 and Q3
                1: 0.9, 2: 0.9, 3: 0.8, 4: 1.0, 5: 1.0, 6: 1.0,
                7: 0.9, 8: 0.9, 9: 0.8, 10: 1.0, 11: 1.0, 12: 1.1
            },
            // Teaching & Learning
            'student-staff-ratio': {
                // Ratio distorted during registration (high enrollment, unstable staffing)
                1: 1.4, 2: 1.3, 3: 1.1, 4: 1.0, 5: 1.0, 6: 1.0,
                7: 1.0, 8: 1.0, 9: 1.0, 10: 1.0, 11: 1.0, 12: 1.1
            },
            'teaching-evaluation': {
                // Evaluations happen mid-semester and end-semester
                1: 1.2, 2: 1.1, 3: 1.0, 4: 0.9, 5: 1.0, 6: 1.0,
                7: 1.1, 8: 1.0, 9: 0.9, 10: 1.0, 11: 1.0, 12: 1.2
            },
            'curriculum-currency': {
                // Curriculum reviews in quiet academic periods
                1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 0.9,
                7: 0.9, 8: 1.0, 9: 1.0, 10: 1.0, 11: 0.9, 12: 0.9
            },
            // Research
            'research-output': {
                // Research output measured annually — stable through year
                1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
                7: 1.0, 8: 1.0, 9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0
            },
            'grant-success': {
                // Grant deadlines cluster in Q1 and Q3
                1: 0.9, 2: 0.9, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
                7: 0.9, 8: 0.9, 9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0
            }
        };

        return adjustments[metricCode] || {};
    }

    /** Contextual explanation for why a threshold is adjusted */
    _getReasonText(metricCode, month) {
        const reasons = {
            'retention-rate':  { 1: 'Registration period — late enrollments distort retention figures',
                                 2: 'Late registration still in progress' },
            'course-pass-rate': { 3: 'First assessment period — results expected to be volatile',
                                  5: 'Mid-year exam period', 8: 'Second semester assessments',
                                  10: 'Year-end exam period' },
            'course-mean':      { 3: 'First assessment period', 5: 'Mid-year exams',
                                  8: 'Second semester assessments', 10: 'Year-end exams' },
            'stakeholder-satisfaction': { 1: 'Registration frustrations expected',
                                          2: 'Post-registration adjustment period',
                                          5: 'Exam stress period' },
            'student-staff-ratio': { 1: 'Enrollment numbers not yet stable',
                                     2: 'Late registration inflates ratio temporarily' },
            'graduation-rate': { 3: 'Pre-graduation data still being processed',
                                 8: 'Pre-September graduation processing' }
        };

        const metricReasons = reasons[metricCode];
        if (!metricReasons) return 'Seasonal academic calendar adjustment';
        return metricReasons[month] || 'Seasonal academic calendar adjustment';
    }

    // ── Static Data ─────────────────────────────────────────────────

    /** SA university academic calendar periods */
    static _periods() {
        return [
            {
                name: 'Registration',
                icon: 'user-plus',
                startMonth: 1, endMonth: 2,
                description: 'Student registration, late enrollment, orientation. High administrative load. Retention and satisfaction metrics expected to be volatile.',
                sensitivity: 'low'
            },
            {
                name: 'Semester 1 Teaching',
                icon: 'chalkboard-teacher',
                startMonth: 3, endMonth: 4,
                description: 'First semester teaching block. First assessments begin in March. Teaching evaluations conducted mid-semester.',
                sensitivity: 'normal'
            },
            {
                name: 'Mid-Year Assessment',
                icon: 'file-alt',
                startMonth: 5, endMonth: 6,
                description: 'Mid-year examinations and supplementary assessments. Course pass rates become meaningful. Graduation ceremonies (April/May).',
                sensitivity: 'high'
            },
            {
                name: 'Semester 2 Start',
                icon: 'play-circle',
                startMonth: 7, endMonth: 7,
                description: 'Second semester begins. Recess period for some programmes. New student intake for mid-year entry programmes.',
                sensitivity: 'normal'
            },
            {
                name: 'Semester 2 Teaching',
                icon: 'chalkboard-teacher',
                startMonth: 8, endMonth: 9,
                description: 'Second semester teaching block. Continuous assessments. September graduation ceremonies. HEMIS data submission preparation.',
                sensitivity: 'normal'
            },
            {
                name: 'Year-End Assessment',
                icon: 'clipboard-check',
                startMonth: 10, endMonth: 11,
                description: 'Final examinations. Year-end metrics finalised. Accreditation review period. Annual audit cycle closes.',
                sensitivity: 'high'
            },
            {
                name: 'Recess & Planning',
                icon: 'umbrella-beach',
                startMonth: 12, endMonth: 12,
                description: 'Academic recess. Results processing. Next-year planning. Curriculum review. Data quality checks.',
                sensitivity: 'low'
            }
        ];
    }
}
