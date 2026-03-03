/**
 * ProgAnalystData — Shared static demo data for all Programme Analyst panels
 *
 * Extracted from ProgOverviewPanel and extended with prerequisite rules,
 * GA-course matrix, and richer cohort data for the 6 additional panels.
 */
class ProgAnalystData {

    // ── Programmes ────────────────────────────────────────────────────────

    static PROGRAMMES = [
        { code: 'NDIT', name: 'ND: Information Technology', nqf: 6, years: 3, department: 'Information Technology', faculty: 'Applied Sciences' },
        { code: 'NDEE', name: 'ND: Electrical Engineering', nqf: 6, years: 3, department: 'Electrical Engineering', faculty: 'Engineering' },
        { code: 'BSCS', name: 'BSc: Computer Science', nqf: 7, years: 3, department: 'Computer Science', faculty: 'Science' },
        { code: 'NDAC', name: 'ND: Accounting', nqf: 6, years: 3, department: 'Accounting', faculty: 'Commerce' }
    ];

    // ── Courses (18 courses with DFW/marks) ──────────────────────────────

    static COURSES = [
        // Year 1 S1
        { code: 'ITPR101', name: 'Programming 1A', year: 1, semester: 'S1', credits: 20, type: 'core', enrolled: 185, passed: 128, avgMark: 56.2, atRisk: 42, dfw: 30.8, dfwHistory: [32.1, 31.5, 30.8] },
        { code: 'MATH101', name: 'Mathematics 1', year: 1, semester: 'S1', credits: 15, type: 'core', enrolled: 185, passed: 112, avgMark: 49.1, atRisk: 58, dfw: 39.5, dfwHistory: [41.2, 40.0, 39.5] },
        { code: 'COMM101', name: 'Communication Skills', year: 1, semester: 'S1', credits: 10, type: 'core', enrolled: 185, passed: 168, avgMark: 64.8, atRisk: 12, dfw: 9.2, dfwHistory: [10.5, 9.8, 9.2] },
        { code: 'LIFE101', name: 'Life Skills', year: 1, semester: 'S1', credits: 5, type: 'elective', enrolled: 185, passed: 176, avgMark: 68.4, atRisk: 5, dfw: 4.9, dfwHistory: [5.8, 5.2, 4.9] },
        // Year 1 S2
        { code: 'ITPR102', name: 'Programming 1B', year: 1, semester: 'S2', credits: 20, type: 'core', enrolled: 158, passed: 118, avgMark: 58.7, atRisk: 32, dfw: 25.3, dfwHistory: [27.0, 26.1, 25.3] },
        { code: 'ITWB101', name: 'Web Development 1', year: 1, semester: 'S2', credits: 20, type: 'core', enrolled: 158, passed: 136, avgMark: 62.4, atRisk: 18, dfw: 13.9, dfwHistory: [15.2, 14.5, 13.9] },
        { code: 'ITDB101', name: 'Database Fundamentals', year: 1, semester: 'S2', credits: 20, type: 'core', enrolled: 158, passed: 122, avgMark: 55.9, atRisk: 28, dfw: 22.8, dfwHistory: [24.5, 23.8, 22.8] },
        // Year 2 S1
        { code: 'ITSD201', name: 'Software Development 2', year: 2, semester: 'S1', credits: 20, type: 'core', enrolled: 124, passed: 96, avgMark: 60.3, atRisk: 22, dfw: 22.6, dfwHistory: [24.0, 23.2, 22.6] },
        { code: 'ITDA201', name: 'Data Structures', year: 2, semester: 'S1', credits: 20, type: 'core', enrolled: 124, passed: 88, avgMark: 54.6, atRisk: 30, dfw: 29.0, dfwHistory: [31.2, 30.0, 29.0] },
        { code: 'MATH201', name: 'Mathematics 2', year: 2, semester: 'S1', credits: 15, type: 'core', enrolled: 124, passed: 78, avgMark: 48.2, atRisk: 42, dfw: 37.1, dfwHistory: [38.8, 37.9, 37.1] },
        { code: 'ITDB201', name: 'Database Design', year: 2, semester: 'S1', credits: 20, type: 'core', enrolled: 124, passed: 98, avgMark: 58.1, atRisk: 20, dfw: 21.0, dfwHistory: [22.5, 21.8, 21.0] },
        // Year 2 S2
        { code: 'ITSD202', name: 'Software Development 3', year: 2, semester: 'S2', credits: 20, type: 'core', enrolled: 108, passed: 86, avgMark: 61.8, atRisk: 16, dfw: 20.4, dfwHistory: [22.0, 21.1, 20.4] },
        { code: 'ITNW201', name: 'Networking 2', year: 2, semester: 'S2', credits: 20, type: 'elective', enrolled: 108, passed: 82, avgMark: 55.4, atRisk: 22, dfw: 24.1, dfwHistory: [26.0, 25.0, 24.1] },
        { code: 'ITIA201', name: 'Information Analysis', year: 2, semester: 'S2', credits: 15, type: 'elective', enrolled: 108, passed: 92, avgMark: 63.2, atRisk: 10, dfw: 14.8, dfwHistory: [16.5, 15.6, 14.8] },
        // Year 3 S1
        { code: 'ITPR301', name: 'Project Management', year: 3, semester: 'S1', credits: 15, type: 'core', enrolled: 86, passed: 74, avgMark: 64.1, atRisk: 8, dfw: 14.0, dfwHistory: [15.5, 14.8, 14.0] },
        { code: 'ITSW301', name: 'Software Engineering', year: 3, semester: 'S1', credits: 20, type: 'core', enrolled: 86, passed: 68, avgMark: 58.9, atRisk: 14, dfw: 20.9, dfwHistory: [22.5, 21.6, 20.9] },
        { code: 'ITSP301', name: 'Industry Project', year: 3, semester: 'S1', credits: 30, type: 'core', enrolled: 86, passed: 72, avgMark: 62.5, atRisk: 10, dfw: 16.3, dfwHistory: [18.0, 17.1, 16.3] },
        // Year 3 S2
        { code: 'ITWI301', name: 'Work-Integrated Learning', year: 3, semester: 'S2', credits: 60, type: 'core', enrolled: 78, passed: 72, avgMark: 68.3, atRisk: 4, dfw: 7.7, dfwHistory: [9.0, 8.3, 7.7] }
    ];

    // ── Cohorts (5 years with repeat/drop detail) ────────────────────────

    static COHORTS = [
        { year: 2024, intake: 210, y1End: 162, y2End: 112, y3End: 84, graduated: 78, dropouts: 132, repeat: 18, excluded: 14, avgYearsToComplete: 3.8 },
        { year: 2023, intake: 195, y1End: 156, y2End: 108, y3End: 82, graduated: 76, dropouts: 119, repeat: 15, excluded: 10, avgYearsToComplete: 3.6 },
        { year: 2022, intake: 188, y1End: 148, y2End: 98, y3End: 74, graduated: 68, dropouts: 120, repeat: 20, excluded: 12, avgYearsToComplete: 3.9 },
        { year: 2021, intake: 175, y1End: 138, y2End: 92, y3End: 68, graduated: 62, dropouts: 113, repeat: 16, excluded: 11, avgYearsToComplete: 4.0 },
        { year: 2020, intake: 165, y1End: 132, y2End: 88, y3End: 64, graduated: 58, dropouts: 107, repeat: 14, excluded: 9, avgYearsToComplete: 3.7 }
    ];

    // ── Graduate Attributes ──────────────────────────────────────────────

    static GA_ATTRIBUTES = [
        { code: 'GA1', name: 'Problem Solving', courses: 12, mapped: 10 },
        { code: 'GA2', name: 'Application of Scientific Knowledge', courses: 12, mapped: 8 },
        { code: 'GA3', name: 'Engineering Design', courses: 12, mapped: 7 },
        { code: 'GA4', name: 'Investigations & Experiments', courses: 12, mapped: 6 },
        { code: 'GA5', name: 'Engineering Methods & Tools', courses: 12, mapped: 11 },
        { code: 'GA6', name: 'Professional & Technical Communication', courses: 12, mapped: 9 },
        { code: 'GA7', name: 'Sustainability & Impact', courses: 12, mapped: 5 },
        { code: 'GA8', name: 'Individual & Teamwork', courses: 12, mapped: 10 },
        { code: 'GA9', name: 'Independent Learning', courses: 12, mapped: 8 },
        { code: 'GA10', name: 'Engineering Professionalism', courses: 12, mapped: 7 }
    ];

    // ── Prerequisites (course → required courses) ────────────────────────

    static PREREQUISITES = {
        'ITPR102': ['ITPR101'],
        'ITWB101': ['ITPR101'],
        'ITDB101': ['COMM101'],
        'ITSD201': ['ITPR102', 'ITDB101'],
        'ITDA201': ['ITPR102', 'MATH101'],
        'MATH201': ['MATH101'],
        'ITDB201': ['ITDB101'],
        'ITSD202': ['ITSD201', 'ITDA201'],
        'ITNW201': ['ITSD201'],
        'ITIA201': ['ITDB201'],
        'ITPR301': ['ITSD202'],
        'ITSW301': ['ITSD202', 'ITDA201'],
        'ITSP301': ['ITSW301', 'ITPR301'],
        'ITWI301': ['ITSP301']
    };

    // ── GA-Course Matrix (I=Introduced, R=Reinforced, A=Assessed) ────────

    static GA_COURSE_MATRIX = {
        'GA1':  { 'ITPR101':'I', 'MATH101':'I', 'ITPR102':'R', 'ITDA201':'R', 'ITSD201':'R', 'MATH201':'R', 'ITSD202':'A', 'ITSW301':'A', 'ITSP301':'A', 'ITWI301':'A' },
        'GA2':  { 'MATH101':'I', 'ITPR101':'I', 'MATH201':'R', 'ITDA201':'R', 'ITSD201':'R', 'ITSW301':'A', 'ITSP301':'A', 'ITWI301':'A' },
        'GA3':  { 'ITPR102':'I', 'ITWB101':'I', 'ITSD201':'R', 'ITDB201':'R', 'ITSD202':'A', 'ITSW301':'A', 'ITSP301':'A' },
        'GA4':  { 'ITDB101':'I', 'ITDA201':'I', 'ITDB201':'R', 'ITIA201':'R', 'ITSP301':'A', 'ITWI301':'A' },
        'GA5':  { 'ITPR101':'I', 'ITWB101':'I', 'ITDB101':'I', 'ITPR102':'R', 'ITSD201':'R', 'ITDB201':'R', 'ITDA201':'R', 'ITSD202':'A', 'ITNW201':'A', 'ITSW301':'A', 'ITSP301':'A' },
        'GA6':  { 'COMM101':'I', 'LIFE101':'I', 'ITIA201':'R', 'ITPR301':'R', 'ITSP301':'A', 'ITWI301':'A', 'ITSW301':'R', 'ITSD202':'R', 'ITWB101':'R' },
        'GA7':  { 'LIFE101':'I', 'COMM101':'I', 'ITPR301':'R', 'ITSW301':'A', 'ITWI301':'A' },
        'GA8':  { 'LIFE101':'I', 'COMM101':'I', 'ITWB101':'R', 'ITSD201':'R', 'ITSD202':'R', 'ITPR301':'R', 'ITSP301':'A', 'ITWI301':'A', 'ITSW301':'A', 'ITDA201':'R' },
        'GA9':  { 'LIFE101':'I', 'ITPR101':'I', 'ITPR102':'R', 'ITSD201':'R', 'ITSD202':'R', 'ITSP301':'A', 'ITWI301':'A', 'ITSW301':'A' },
        'GA10': { 'LIFE101':'I', 'COMM101':'I', 'ITPR301':'R', 'ITSW301':'R', 'ITSP301':'A', 'ITWI301':'A', 'ITIA201':'R' }
    };

    // ── Helpers ───────────────────────────────────────────────────────────

    /** Get courses that depend on the given course code */
    static getDownstream(courseCode) {
        var result = [];
        var prereqs = ProgAnalystData.PREREQUISITES;
        for (var code in prereqs) {
            if (prereqs[code].indexOf(courseCode) !== -1) {
                result.push(code);
            }
        }
        return result;
    }

    /** Get all transitive downstream courses */
    static getAllDownstream(courseCode) {
        var visited = {};
        var queue = [courseCode];
        while (queue.length) {
            var current = queue.shift();
            var direct = ProgAnalystData.getDownstream(current);
            for (var i = 0; i < direct.length; i++) {
                if (!visited[direct[i]]) {
                    visited[direct[i]] = true;
                    queue.push(direct[i]);
                }
            }
        }
        return Object.keys(visited);
    }

    /** Compute gatekeeper score: DFW% × downstream count */
    static gatekeeperScore(course) {
        return course.dfw * ProgAnalystData.getAllDownstream(course.code).length;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgAnalystData;
}
if (typeof window !== 'undefined') {
    window.ProgAnalystData = ProgAnalystData;
}
