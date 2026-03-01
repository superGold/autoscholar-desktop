/**
 * AnalystService - Programme Analyst microservice
 *
 * Manages programme structure, course performance analytics, cohort tracking,
 * prerequisite chains, and graduate attribute mapping for the Programme
 * Analyst module of AutoScholar.
 *
 * Tables (6):
 *   programme, course, cohort, gaAttribute, gaCourseMapping, prerequisite
 *
 * @example
 *   const svc = new AnalystService();
 *   svc.seedDefaults();
 *   const courses = svc.getCoursesByProgramme(1);
 *   const analytics = svc.getProgrammeAnalytics(1);
 */

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class AnalystService extends Publome {
    constructor(config = {}) {
        super(AnalystSchema, config);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Data
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load default seed data from AnalystSeed
     */
    seedDefaults() {
        this.loadSeedData(AnalystSeed.data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Programme Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all programmes
     * @returns {Array<Publon>}
     */
    getAllProgrammes() {
        return this.table('programme').all();
    }

    /**
     * Get a programme by code
     * @param {string} code - e.g. 'NDIT'
     * @returns {Publon|undefined}
     */
    getProgrammeByCode(code) {
        return this.table('programme').all()
            .find(p => p.get('code') === code);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Course Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all courses for a programme
     * @param {number} programmeId - Programme idx
     * @returns {Array<Publon>}
     */
    getCoursesByProgramme(programmeId) {
        return this.table('course').all()
            .filter(c => c.get('programmeId') === programmeId);
    }

    /**
     * Get courses for a specific year level
     * @param {number} programmeId - Programme idx
     * @param {number} year - Year level (1-4)
     * @returns {Array<Publon>}
     */
    getCoursesByYear(programmeId, year) {
        return this.getCoursesByProgramme(programmeId)
            .filter(c => c.get('year') === year);
    }

    /**
     * Get courses by semester within a year
     * @param {number} programmeId - Programme idx
     * @param {number} year - Year level
     * @param {string} semester - 'S1', 'S2', or 'Y'
     * @returns {Array<Publon>}
     */
    getCoursesBySemester(programmeId, year, semester) {
        return this.getCoursesByYear(programmeId, year)
            .filter(c => c.get('semester') === semester);
    }

    /**
     * Find a course by code
     * @param {string} code - e.g. 'ITPR101'
     * @returns {Publon|undefined}
     */
    getCourseByCode(code) {
        return this.table('course').all()
            .find(c => c.get('code') === code);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gatekeeper Analysis
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Identify gatekeeper courses — high DFW + many downstream dependents
     * @param {number} programmeId - Programme idx
     * @param {number} [dfwThreshold=20] - Minimum DFW% to flag
     * @returns {Array<Object>} Sorted by gatekeeper score descending
     */
    getGatekeeperCourses(programmeId, dfwThreshold = 20) {
        const courses = this.getCoursesByProgramme(programmeId);
        const prereqs = this.table('prerequisite').all();
        const results = [];

        courses.forEach(course => {
            const dfw = course.get('dfw') || 0;
            if (dfw < dfwThreshold) return;

            const courseIdx = course.get('idx');
            const downstream = this._getDownstreamCount(courseIdx, prereqs);
            const score = Math.round(dfw * (1 + downstream * 0.5) * 10) / 10;

            results.push({
                idx: courseIdx,
                code: course.get('code'),
                name: course.get('name'),
                dfw,
                downstream,
                enrolled: course.get('enrolled') || 0,
                atRisk: course.get('atRisk') || 0,
                score
            });
        });

        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Count courses that depend (directly or transitively) on a given course
     * @param {number} courseId - Course idx
     * @param {Array<Publon>} [prereqs] - Optional preloaded prerequisites
     * @returns {number}
     */
    _getDownstreamCount(courseId, prereqs) {
        if (!prereqs) prereqs = this.table('prerequisite').all();
        const visited = new Set();
        const queue = [courseId];

        while (queue.length > 0) {
            const current = queue.shift();
            prereqs.forEach(p => {
                const depCourse = p.get('prereqCourseId');
                const target = p.get('courseId');
                if (depCourse === current && !visited.has(target)) {
                    visited.add(target);
                    queue.push(target);
                }
            });
        }

        return visited.size;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Prerequisite Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get direct prerequisites for a course
     * @param {number} courseId - Course idx
     * @returns {Array<Publon>}
     */
    getPrerequisites(courseId) {
        return this.table('prerequisite').all()
            .filter(p => p.get('courseId') === courseId);
    }

    /**
     * Get full prerequisite chain (transitive closure)
     * @param {number} courseId - Course idx
     * @returns {Array<number>} All prerequisite course IDs (recursive)
     */
    getPrerequisiteChain(courseId) {
        const prereqs = this.table('prerequisite').all();
        const visited = new Set();
        const queue = [courseId];

        while (queue.length > 0) {
            const current = queue.shift();
            prereqs.forEach(p => {
                if (p.get('courseId') === current) {
                    const prereqId = p.get('prereqCourseId');
                    if (!visited.has(prereqId)) {
                        visited.add(prereqId);
                        queue.push(prereqId);
                    }
                }
            });
        }

        return Array.from(visited);
    }

    /**
     * Build the full prerequisite graph for a programme
     * @param {number} programmeId - Programme idx
     * @returns {Object} { nodes: [{idx, code, name, year}], edges: [{from, to}] }
     */
    getPrerequisiteGraph(programmeId) {
        const courses = this.getCoursesByProgramme(programmeId);
        const courseIds = new Set(courses.map(c => c.get('idx')));
        const prereqs = this.table('prerequisite').all()
            .filter(p => courseIds.has(p.get('courseId')));

        const nodes = courses.map(c => ({
            idx: c.get('idx'),
            code: c.get('code'),
            name: c.get('name'),
            year: c.get('year')
        }));

        const edges = prereqs.map(p => ({
            from: p.get('prereqCourseId'),
            to: p.get('courseId')
        }));

        return { nodes, edges };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cohort Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get cohorts for a programme, ordered by year descending
     * @param {number} programmeId - Programme idx
     * @returns {Array<Publon>}
     */
    getCohortsByProgramme(programmeId) {
        return this.table('cohort').all()
            .filter(c => c.get('programmeId') === programmeId)
            .sort((a, b) => (b.get('year') || 0) - (a.get('year') || 0));
    }

    /**
     * Get a specific cohort by entry year
     * @param {number} programmeId - Programme idx
     * @param {number} year - Entry year
     * @returns {Publon|undefined}
     */
    getCohortByYear(programmeId, year) {
        return this.table('cohort').all()
            .find(c => c.get('programmeId') === programmeId && c.get('year') === year);
    }

    /**
     * Compute cohort throughput rates
     * @param {number} programmeId - Programme idx
     * @returns {Array<Object>} Per-cohort retention, graduation, dropout rates
     */
    getCohortThroughput(programmeId) {
        return this.getCohortsByProgramme(programmeId).map(c => {
            const intake = c.get('intake') || 1;
            return {
                year: c.get('year'),
                intake,
                y1Retention: Math.round((c.get('y1End') || 0) / intake * 100),
                y2Retention: Math.round((c.get('y2End') || 0) / intake * 100),
                y3Retention: Math.round((c.get('y3End') || 0) / intake * 100),
                graduationRate: Math.round((c.get('graduated') || 0) / intake * 100),
                dropoutRate: Math.round((c.get('dropouts') || 0) / intake * 100),
                avgYears: c.get('avgYearsToComplete') || 0
            };
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Graduate Attribute Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all graduate attributes
     * @returns {Array<Publon>}
     */
    getAllGAAttributes() {
        return this.table('gaAttribute').all();
    }

    /**
     * Get GA-course mappings for a specific attribute
     * @param {number} gaAttributeId - GA attribute idx
     * @returns {Array<Publon>}
     */
    getMappingsByGA(gaAttributeId) {
        return this.table('gaCourseMapping').all()
            .filter(m => m.get('gaAttributeId') === gaAttributeId);
    }

    /**
     * Get GA-course mappings for a specific course
     * @param {number} courseId - Course idx
     * @returns {Array<Publon>}
     */
    getMappingsByCourse(courseId) {
        return this.table('gaCourseMapping').all()
            .filter(m => m.get('courseId') === courseId);
    }

    /**
     * Build NxM GA coverage matrix for a programme
     * @param {number} programmeId - Programme idx
     * @returns {Object} { attributes: [...], courses: [...], matrix: {[gaIdx]: {[courseIdx]: level}} }
     */
    getGACoverageMatrix(programmeId) {
        const courses = this.getCoursesByProgramme(programmeId);
        const courseIds = new Set(courses.map(c => c.get('idx')));
        const attributes = this.getAllGAAttributes();
        const mappings = this.table('gaCourseMapping').all()
            .filter(m => courseIds.has(m.get('courseId')));

        const matrix = {};
        attributes.forEach(ga => {
            matrix[ga.get('idx')] = {};
        });

        mappings.forEach(m => {
            const gaId = m.get('gaAttributeId');
            const courseId = m.get('courseId');
            if (matrix[gaId]) {
                matrix[gaId][courseId] = m.get('level');
            }
        });

        return {
            attributes: attributes.map(a => ({
                idx: a.get('idx'),
                code: a.get('code'),
                name: a.get('name')
            })),
            courses: courses.map(c => ({
                idx: c.get('idx'),
                code: c.get('code'),
                name: c.get('name'),
                year: c.get('year')
            })),
            matrix
        };
    }

    /**
     * Identify GA coverage gaps — attributes with no 'A' (Apply) mapping
     * @param {number} programmeId - Programme idx
     * @returns {Array<Object>} Gaps with attribute info and missing levels
     */
    getGACoverageGaps(programmeId) {
        const coverage = this.getGACoverageMatrix(programmeId);
        const gaps = [];

        coverage.attributes.forEach(ga => {
            const levels = Object.values(coverage.matrix[ga.idx] || {});
            const hasIntroduce = levels.includes('I');
            const hasReinforce = levels.includes('R');
            const hasApply = levels.includes('A');

            if (!hasApply || !hasReinforce || !hasIntroduce) {
                gaps.push({
                    code: ga.code,
                    name: ga.name,
                    missingLevels: [
                        !hasIntroduce ? 'I' : null,
                        !hasReinforce ? 'R' : null,
                        !hasApply ? 'A' : null
                    ].filter(Boolean),
                    mappedCourses: levels.length,
                    totalCourses: coverage.courses.length
                });
            }
        });

        return gaps;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Programme Analytics (Aggregate)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Compute comprehensive analytics for a programme
     * @param {number} programmeId - Programme idx
     * @returns {Object} Full analytics summary
     */
    getProgrammeAnalytics(programmeId) {
        const programme = this.table('programme').read(programmeId);
        if (!programme) return null;

        const courses = this.getCoursesByProgramme(programmeId);
        const cohorts = this.getCohortsByProgramme(programmeId);
        const gatekeepers = this.getGatekeeperCourses(programmeId);
        const throughput = this.getCohortThroughput(programmeId);
        const gaGaps = this.getGACoverageGaps(programmeId);

        // Course stats
        const totalEnrolled = courses.reduce((sum, c) => sum + (c.get('enrolled') || 0), 0);
        const totalPassed = courses.reduce((sum, c) => sum + (c.get('passed') || 0), 0);
        const totalAtRisk = courses.reduce((sum, c) => sum + (c.get('atRisk') || 0), 0);
        const avgDfw = courses.length > 0
            ? Math.round(courses.reduce((sum, c) => sum + (c.get('dfw') || 0), 0) / courses.length * 10) / 10
            : 0;

        // Latest cohort
        const latestCohort = cohorts[0];
        const graduationRate = latestCohort
            ? Math.round((latestCohort.get('graduated') || 0) / (latestCohort.get('intake') || 1) * 100)
            : 0;

        // Credit totals per year
        const creditsByYear = {};
        courses.forEach(c => {
            const yr = c.get('year');
            creditsByYear[yr] = (creditsByYear[yr] || 0) + (c.get('credits') || 0);
        });

        return {
            programme: {
                code: programme.get('code'),
                name: programme.get('name'),
                nqf: programme.get('nqf'),
                years: programme.get('years')
            },
            courses: {
                total: courses.length,
                core: courses.filter(c => c.get('type') === 'core').length,
                elective: courses.filter(c => c.get('type') === 'elective').length,
                totalEnrolled,
                totalPassed,
                passRate: totalEnrolled > 0 ? Math.round(totalPassed / totalEnrolled * 100) : 0,
                totalAtRisk,
                avgDfw,
                creditsByYear
            },
            cohorts: {
                count: cohorts.length,
                latestGraduationRate: graduationRate,
                throughput
            },
            gatekeepers: {
                count: gatekeepers.length,
                top3: gatekeepers.slice(0, 3)
            },
            gaCompliance: {
                gapCount: gaGaps.length,
                gaps: gaGaps
            }
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalystService, AnalystSchema };
}
if (typeof window !== 'undefined') {
    window.AnalystService = AnalystService;
}
