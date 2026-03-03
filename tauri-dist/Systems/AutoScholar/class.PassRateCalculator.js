/**
 * PassRateCalculator — Single source of truth for pass rate logic.
 *
 * South African ITS result codes:
 *   Pass:    P (pass), P* (pass with distinction)
 *   Fail:    FR (repeat), FS (supplementary), F, and any other non-absent/non-pending code
 *   Absent:  FA (fail absent), FX (fail excluded) — excluded from denominator
 *   Pending: PE, PR, empty, null — excluded entirely
 *
 * Mark threshold (>= 50) used ONLY as fallback when no resultCode is available.
 *
 * ITS "enrolled" definition (block-aware):
 *   The ITS counts enrollment INSTANCES, not unique students. A student registered
 *   in both semester 1 (BC=21) and semester 2 (BC=22) counts as 2 enrollments.
 *   Supplementary/repeat blocks (R-prefixed: R1, R2, R3) are excluded from enrollment
 *   but passes from those blocks still count toward the numerator.
 *   Formula: passRate = uniquePassers / SUM(uniqueStudentsPerMainBlock)
 *
 *   This systematically deflates pass rates for courses with high re-enrollment,
 *   because the denominator grows with each repeat semester while a pass only counts
 *   once. A proper outcome measure would use unique students as the denominator.
 */
class PassRateCalculator {

    static PASS_CODES    = new Set(['P', 'P*']);
    static ABSENT_CODES  = new Set(['FA', 'FX']);
    static PENDING_CODES = new Set(['PE', 'PR', '']);

    /**
     * Classify a result code into pass | fail | absent | pending.
     * @param {string|null|undefined} resultCode - ITS result code
     * @returns {'pass'|'fail'|'absent'|'pending'}
     */
    static classifyResult(resultCode) {
        const code = (resultCode == null ? '' : String(resultCode)).trim().toUpperCase();
        if (code === '' || code === null)             return 'pending';
        if (PassRateCalculator.PASS_CODES.has(code))    return 'pass';
        if (PassRateCalculator.ABSENT_CODES.has(code))  return 'absent';
        if (PassRateCalculator.PENDING_CODES.has(code)) return 'pending';
        return 'fail';
    }

    /**
     * Check if a result code indicates a pass.
     * @param {string|null|undefined} resultCode
     * @returns {boolean}
     */
    static isPass(resultCode) {
        const code = (resultCode == null ? '' : String(resultCode)).trim().toUpperCase();
        return code === 'P' || code === 'P*';
    }

    /**
     * Classify a single student result using result code with mark fallback.
     * @param {Object} result - Student result record
     * @param {Object} [options]
     * @param {number} [options.markThreshold=50] - Fallback mark threshold when no resultCode
     * @returns {'pass'|'fail'|'absent'|'pending'}
     */
    static classifyStudentResult(result, options = {}) {
        const threshold = options.markThreshold ?? 50;
        const code = (result.resultCode || result.result_code || result.passStatus || result.pass_status || '').toString().trim();

        // If we have a result code, use it
        if (code) {
            return PassRateCalculator.classifyResult(code);
        }

        // Fallback to mark-based classification (non-DUT institutions without result codes)
        const mark = parseFloat(result.result || result.finalMark || result.final_mark || result.mark || 0);
        if (mark <= 0)    return 'pending';
        if (mark >= threshold) return 'pass';
        return 'fail';
    }

    /** Priority order for deduplication: pass beats fail beats absent beats pending. */
    static _classRank = { pass: 3, fail: 2, absent: 1, pending: 0 };

    /**
     * Deduplicate results by student number, keeping the best outcome per student.
     * Students may appear multiple times (main exam + supplementary sessions).
     * @param {Array} results - Array of student result objects (may contain duplicates)
     * @param {Object} [options]
     * @param {number} [options.markThreshold=50] - Fallback mark threshold
     * @returns {Array<{studentNumber: string, classification: string, record: Object}>}
     */
    static deduplicateResults(results, options = {}) {
        const threshold = options.markThreshold ?? 50;
        const rank = PassRateCalculator._classRank;
        const best = new Map(); // studentNumber → { classification, record }

        for (const r of results) {
            const sn = r.studentNumber || r.student_number || r.studentNo || '';
            const cls = PassRateCalculator.classifyStudentResult(r, { markThreshold: threshold });

            if (!best.has(sn) || rank[cls] > rank[best.get(sn).classification]) {
                best.set(sn, { classification: cls, record: r });
            }
        }
        return Array.from(best.values());
    }

    /**
     * Check whether a block code is a main exam block (not supplementary/repeat).
     * Main blocks: numeric codes (11, 21, 22, P0, E1, E2, ET) — original enrollment.
     * Supplementary blocks: R-prefixed (R1, R2, R3) — re-sit attempts.
     * @param {string} blockCode
     * @returns {boolean}
     */
    static isMainBlock(blockCode) {
        const bc = (blockCode == null ? '' : String(blockCode)).trim().toUpperCase();
        return bc !== '' && !bc.startsWith('R');
    }

    /**
     * Compute block-aware enrolled count (ITS official definition).
     *
     * Enrolled = SUM of unique students per main exam block. A student in both
     * semester 1 (BC=21) and semester 2 (BC=22) counts as 2 enrollments.
     * Supplementary/repeat blocks (R-prefixed) are excluded from enrollment.
     *
     * @param {Array} results - Raw result records (must include blockCode field)
     * @returns {number} Block-aware enrolled count
     */
    static computeBlockEnrolled(results) {
        const blockStudents = {}; // blockCode → Set of studentNumbers
        for (const r of results) {
            const bc = (r.blockCode || r.block_code || r.IAHBC || '').toString().trim();
            if (!PassRateCalculator.isMainBlock(bc)) continue;
            const sn = r.studentNumber || r.student_number || r.studentNo || '';
            if (!sn) continue;
            if (!blockStudents[bc]) blockStudents[bc] = new Set();
            blockStudents[bc].add(sn);
        }
        let total = 0;
        for (const bc in blockStudents) {
            total += blockStudents[bc].size;
        }
        return total;
    }

    /**
     * Compute pass rate from an array of student results.
     *
     * Denominator modes:
     *   'assessed'    — passes + fails (excludes absent and pending)
     *   'registered'  — all non-pending (passes + fails + absent)
     *   'itsOfficial' — block-aware enrolled (SUM of unique students per main block).
     *                   This matches the official ITS pass rate formula.
     *                   Requires blockCode field in result records.
     *
     * By default uses 'itsOfficial' when blockCode data is available, else 'assessed'.
     *
     * @param {Array} results - Array of student result objects
     * @param {Object} [options]
     * @param {number} [options.markThreshold=50] - Fallback mark threshold
     * @param {string} [options.denominator='itsOfficial'] - 'assessed', 'registered', or 'itsOfficial'
     * @param {boolean} [options.deduplicate=false] - Deduplicate by studentNumber before counting
     * @returns {{ enrolled: number, assessed: number, passes: number, fails: number, absent: number, pending: number, passRate: number|null, totalRecords: number, blockEnrolled: number|null }}
     */
    static computePassRate(results, options = {}) {
        const threshold = options.markThreshold ?? 50;
        const denomMode = options.denominator || 'itsOfficial';

        // Always deduplicate passes — a student who passes in any block counts once
        const deduped = PassRateCalculator.deduplicateResults(results, { markThreshold: threshold });
        let passes = 0, fails = 0, absent = 0, pending = 0;
        for (const entry of deduped) {
            switch (entry.classification) {
                case 'pass':    passes++;  break;
                case 'fail':    fails++;   break;
                case 'absent':  absent++;  break;
                case 'pending': pending++; break;
            }
        }

        // Block-aware enrolled count (ITS official)
        const blockEnrolled = PassRateCalculator.computeBlockEnrolled(results);

        const uniqueStudents = deduped.length;
        const assessed = passes + fails;
        const registered = passes + fails + absent;

        let denom;
        if (denomMode === 'itsOfficial' && blockEnrolled > 0) {
            denom = blockEnrolled;
        } else if (denomMode === 'registered') {
            denom = registered;
        } else {
            denom = assessed;
        }

        const passRate = denom > 0 ? Math.round((passes / denom) * 1000) / 10 : null;

        return {
            enrolled: blockEnrolled > 0 ? blockEnrolled : uniqueStudents,
            assessed,
            passes,
            fails,
            absent,
            pending,
            passRate,
            totalRecords: results.length,
            blockEnrolled: blockEnrolled > 0 ? blockEnrolled : null,
            uniqueStudents
        };
    }
}
