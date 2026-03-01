/**
 * ProgAnalystBridge — Wraps AnalystService to produce ProgAnalystData-compatible format
 *
 * Creates an AnalystService, seeds it, and translates idx-based Publon records
 * into the plain-object arrays that ProgAnalystPanel expects. Exposes the
 * programme PublonTable for UIBinding.bindSelector.
 *
 * Usage:
 *   var bridge = new ProgAnalystBridge();
 *   bridge.selectProgramme('NDIT');
 *   bridge.COURSES  // → array of plain objects identical to ProgAnalystData.COURSES
 */
class ProgAnalystBridge {

    constructor() {
        this._service = new AnalystService();
        this._service.seedDefaults();
        this._programmeCode = null;
        this._programmeIdx = null;
        this._cache = {};
    }

    /** The underlying AnalystService */
    get service() { return this._service; }

    /** The programme PublonTable (for UIBinding.bindSelector) */
    get programmeTable() { return this._service.table('programme'); }

    // ── Programme Selection ─────────────────────────────────────────────────

    selectProgramme(code) {
        if (code === this._programmeCode) return;
        this._programmeCode = code;
        this._cache = {};
        var prog = this._service.getProgrammeByCode(code);
        this._programmeIdx = prog ? prog.get('idx') : null;
        if (prog) {
            this.programmeTable.select(prog.get('idx'));
        }
    }

    // ── ProgAnalystData-compatible Properties ───────────────────────────────

    get PROGRAMMES() {
        if (this._cache.programmes) return this._cache.programmes;
        this._cache.programmes = this._service.getAllProgrammes().map(function(p) {
            return {
                code: p.get('code'),
                name: p.get('name'),
                nqf: p.get('nqf'),
                years: p.get('years'),
                department: p.get('department'),
                faculty: p.get('faculty')
            };
        });
        return this._cache.programmes;
    }

    get COURSES() {
        if (this._cache.courses) return this._cache.courses;
        if (!this._programmeIdx) { this._cache.courses = []; return []; }
        var courses = this._service.getCoursesByProgramme(this._programmeIdx);
        this._cache.courses = courses.map(function(c) {
            var hist = c.get('dfwHistory') || '';
            return {
                code: c.get('code'),
                name: c.get('name'),
                year: c.get('year'),
                semester: c.get('semester'),
                credits: c.get('credits'),
                type: c.get('type'),
                enrolled: c.get('enrolled') || 0,
                passed: c.get('passed') || 0,
                avgMark: c.get('avgMark') || 0,
                atRisk: c.get('atRisk') || 0,
                dfw: c.get('dfw') || 0,
                dfwHistory: hist ? hist.split(',').map(Number) : []
            };
        });
        return this._cache.courses;
    }

    get COHORTS() {
        if (this._cache.cohorts) return this._cache.cohorts;
        if (!this._programmeIdx) { this._cache.cohorts = []; return []; }
        var cohorts = this._service.getCohortsByProgramme(this._programmeIdx);
        this._cache.cohorts = cohorts.map(function(c) {
            return {
                year: c.get('year'),
                intake: c.get('intake'),
                y1End: c.get('y1End'),
                y2End: c.get('y2End'),
                y3End: c.get('y3End'),
                graduated: c.get('graduated'),
                dropouts: c.get('dropouts'),
                repeat: c.get('repeat'),
                excluded: c.get('excluded'),
                avgYearsToComplete: c.get('avgYearsToComplete')
            };
        });
        return this._cache.cohorts;
    }

    get GA_ATTRIBUTES() {
        if (this._cache.gaAttributes) return this._cache.gaAttributes;
        var attrs = this._service.getAllGAAttributes();
        this._cache.gaAttributes = attrs.map(function(a) {
            return {
                code: a.get('code'),
                name: a.get('name'),
                courses: a.get('totalCourses') || 12,
                mapped: a.get('mappedCourses') || 0
            };
        });
        return this._cache.gaAttributes;
    }

    get GA_COURSE_MATRIX() {
        if (this._cache.gaMatrix) return this._cache.gaMatrix;
        if (!this._programmeIdx) { this._cache.gaMatrix = {}; return {}; }
        var coverage = this._service.getGACoverageMatrix(this._programmeIdx);
        var matrix = {};
        var courseIdxToCode = {};
        coverage.courses.forEach(function(c) { courseIdxToCode[c.idx] = c.code; });
        var gaIdxToCode = {};
        coverage.attributes.forEach(function(a) { gaIdxToCode[a.idx] = a.code; });
        coverage.attributes.forEach(function(ga) {
            var gaCode = ga.code;
            matrix[gaCode] = {};
            var row = coverage.matrix[ga.idx] || {};
            for (var courseIdx in row) {
                var courseCode = courseIdxToCode[courseIdx];
                if (courseCode) matrix[gaCode][courseCode] = row[courseIdx];
            }
        });
        this._cache.gaMatrix = matrix;
        return matrix;
    }

    get PREREQUISITES() {
        if (this._cache.prereqs) return this._cache.prereqs;
        var prereqRecords = this._service.table('prerequisite').all();
        var map = {};
        prereqRecords.forEach(function(p) {
            var courseCode = p.get('courseCode');
            var prereqCode = p.get('prereqCode');
            if (!courseCode || !prereqCode) return;
            if (!map[courseCode]) map[courseCode] = [];
            map[courseCode].push(prereqCode);
        });
        this._cache.prereqs = map;
        return map;
    }

    // ── DAG / Cascade Engine ────────────────────────────────────────────────

    /** Nodes for CascadeRiskEngine — one per course */
    get DAG_NODES() {
        return this.COURSES.map(function(c) {
            return { code: c.code, dfw: c.dfw, enrolled: c.enrolled, year: c.year, semester: c.semester, credits: c.credits };
        });
    }

    /** Edges for CascadeRiskEngine — prerequisite → dependent */
    get DAG_EDGES() {
        var prereqs = this.PREREQUISITES;
        var edges = [];
        for (var code in prereqs) {
            prereqs[code].forEach(function(prereqCode) {
                edges.push({ from: prereqCode, to: code });
            });
        }
        return edges;
    }

    /** Lazy-created CascadeRiskEngine instance */
    get cascadeEngine() {
        if (!this._cascadeEngine || this._cascadeEngineProg !== this._programmeCode) {
            this._cascadeEngine = new CascadeRiskEngine(this.DAG_NODES, this.DAG_EDGES);
            this._cascadeEngineProg = this._programmeCode;
        }
        return this._cascadeEngine;
    }

    // ── Helper Methods (mirror ProgAnalystData static methods) ──────────────

    getDownstream(courseCode) {
        var prereqs = this.PREREQUISITES;
        var result = [];
        for (var code in prereqs) {
            if (prereqs[code].indexOf(courseCode) !== -1) {
                result.push(code);
            }
        }
        return result;
    }

    getAllDownstream(courseCode) {
        var visited = {};
        var queue = [courseCode];
        while (queue.length) {
            var current = queue.shift();
            var direct = this.getDownstream(current);
            for (var i = 0; i < direct.length; i++) {
                if (!visited[direct[i]]) {
                    visited[direct[i]] = true;
                    queue.push(direct[i]);
                }
            }
        }
        return Object.keys(visited);
    }

    gatekeeperScore(course) {
        return course.dfw * this.getAllDownstream(course.code).length;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgAnalystBridge;
}
if (typeof window !== 'undefined') {
    window.ProgAnalystBridge = ProgAnalystBridge;
}
