/**
 * AnalystSchema — Programme Analyst schema definition
 *
 * Defines the data model for programme structure, course performance,
 * cohort tracking, prerequisite chains, and graduate attribute mapping.
 * Uses an_ namespace prefix.
 *
 * Tables (6):
 *   programme, course, cohort, gaAttribute, gaCourseMapping, prerequisite
 */

const AnalystSchema = {
    name: 'analyst',
    prefix: 'an',
    alias: 'Programme Analyst',
    version: '1.0.0',

    tables: [
        {
            name: 'programme',
            alias: 'Programmes',
            primaryKey: 'idx',
            labeller: '{name} ({code})',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'name', label: 'Programme Name', type: 'string', required: true },
                { name: 'nqf', label: 'NQF Level', type: 'integer' },
                { name: 'years', label: 'Duration (years)', type: 'integer', default: 3 },
                { name: 'department', label: 'Department', type: 'string' },
                { name: 'faculty', label: 'Faculty', type: 'string' }
            ]
        },
        {
            name: 'course',
            alias: 'Courses',
            primaryKey: 'idx',
            labeller: '{code} — {name}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'programmeId', label: 'Programme', type: 'integer', required: true,
                    ref: { table: 'programme', field: 'idx' } },
                { name: 'code', label: 'Course Code', type: 'string', required: true },
                { name: 'name', label: 'Course Name', type: 'string', required: true },
                { name: 'year', label: 'Year Level', type: 'integer', required: true,
                    enum: [1, 2, 3, 4] },
                { name: 'semester', label: 'Semester', type: 'string', required: true,
                    enum: ['S1', 'S2', 'Y'] },
                { name: 'credits', label: 'Credits', type: 'integer', required: true },
                { name: 'type', label: 'Type', type: 'string', required: true,
                    enum: ['core', 'elective'] },
                { name: 'enrolled', label: 'Enrolled', type: 'integer', default: 0 },
                { name: 'passed', label: 'Passed', type: 'integer', default: 0 },
                { name: 'avgMark', label: 'Average Mark', type: 'number', default: 0 },
                { name: 'atRisk', label: 'At-Risk Count', type: 'integer', default: 0 },
                { name: 'dfw', label: 'DFW Rate (%)', type: 'number', default: 0 },
                { name: 'dfwHistory', label: 'DFW History', type: 'string' }
            ]
        },
        {
            name: 'cohort',
            alias: 'Cohorts',
            primaryKey: 'idx',
            labeller: '{year} Cohort',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'programmeId', label: 'Programme', type: 'integer', required: true,
                    ref: { table: 'programme', field: 'idx' } },
                { name: 'year', label: 'Entry Year', type: 'integer', required: true },
                { name: 'intake', label: 'Intake', type: 'integer', required: true },
                { name: 'y1End', label: 'End Y1', type: 'integer', default: 0 },
                { name: 'y2End', label: 'End Y2', type: 'integer', default: 0 },
                { name: 'y3End', label: 'End Y3', type: 'integer', default: 0 },
                { name: 'graduated', label: 'Graduated', type: 'integer', default: 0 },
                { name: 'dropouts', label: 'Dropouts', type: 'integer', default: 0 },
                { name: 'repeat', label: 'Repeaters', type: 'integer', default: 0 },
                { name: 'excluded', label: 'Excluded', type: 'integer', default: 0 },
                { name: 'avgYearsToComplete', label: 'AYOS', type: 'number', default: 0 }
            ]
        },
        {
            name: 'gaAttribute',
            alias: 'Graduate Attributes',
            primaryKey: 'idx',
            labeller: '{code} — {name}',
            selectionMode: 'single',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'name', label: 'Attribute Name', type: 'string', required: true },
                { name: 'accBody', label: 'Accreditation Body', type: 'string',
                    enum: ['ECSA', 'CHE', 'SAQA'] },
                { name: 'totalCourses', label: 'Total Courses', type: 'integer', default: 0 },
                { name: 'mappedCourses', label: 'Mapped Courses', type: 'integer', default: 0 }
            ]
        },
        {
            name: 'gaCourseMapping',
            alias: 'GA-Course Mappings',
            primaryKey: 'idx',
            labeller: '{gaCode} → {courseCode} ({level})',
            selectionMode: 'none',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'gaAttributeId', label: 'Graduate Attribute', type: 'integer', required: true,
                    ref: { table: 'gaAttribute', field: 'idx' } },
                { name: 'courseId', label: 'Course', type: 'integer', required: true,
                    ref: { table: 'course', field: 'idx' } },
                { name: 'gaCode', label: 'GA Code', type: 'string' },
                { name: 'courseCode', label: 'Course Code', type: 'string' },
                { name: 'level', label: 'Level', type: 'string', required: true,
                    enum: ['I', 'R', 'A'] }
            ]
        },
        {
            name: 'prerequisite',
            alias: 'Prerequisites',
            primaryKey: 'idx',
            labeller: '{courseCode} requires {prereqCode}',
            selectionMode: 'none',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'courseId', label: 'Course', type: 'integer', required: true,
                    ref: { table: 'course', field: 'idx' } },
                { name: 'prereqCourseId', label: 'Prerequisite', type: 'integer', required: true,
                    ref: { table: 'course', field: 'idx' } },
                { name: 'courseCode', label: 'Course Code', type: 'string' },
                { name: 'prereqCode', label: 'Prerequisite Code', type: 'string' }
            ]
        }
    ]
};

// Export
if (typeof module !== 'undefined' && module.exports) { module.exports = AnalystSchema; }
if (typeof window !== 'undefined') { window.AnalystSchema = AnalystSchema; }
