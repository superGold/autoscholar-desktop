/**
 * StaffAccessService - Staff-course access management
 *
 * Publome subclass that manages which staff members have access to which courses.
 * Staff are identified by userId (institutional ID string, e.g. "bkdr3").
 * Courses are identified by courseCode + year (courses live in DUT Oracle API).
 *
 * @example
 * const service = new StaffAccessService();
 * service.assignStaff('bkdr3', 'CEDA201', 2024, 'primary', 'admin1');
 * const courses = service.getCoursesForUser('bkdr3');
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const StaffAccessSchema = {
    name: 'staffAccess',
    prefix: 'as',
    alias: 'Staff Access',
    version: '1.0.0',

    tables: [
        {
            name: 'staffCourse',
            alias: 'Staff Course Access',
            primaryKey: 'idx',
            labeller: '{userId} \u2192 {courseCode} ({year})',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'userId', label: 'User ID', type: 'string', required: true },
                { name: 'courseCode', label: 'Course Code', type: 'string', required: true },
                { name: 'year', label: 'Year', type: 'integer', required: true },
                { name: 'roleType', label: 'Role', type: 'string', required: true,
                    options: ['primary', 'co-instructor', 'tutor'] },
                { name: 'isActive', label: 'Active', type: 'boolean', default: true },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'createdBy', label: 'Created By', type: 'string' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class StaffAccessService extends Publome {
    constructor(config = {}) {
        super(StaffAccessSchema, config);
    }

    /**
     * Get all active course assignments for a user
     * @param {string} userId - Institutional staff ID
     * @returns {Array<Publon>}
     */
    getCoursesForUser(userId) {
        return this.table('staffCourse').all().filter(r =>
            r.get('userId') === userId && r.get('isActive') !== false
        );
    }

    /**
     * Get all staff assigned to a course
     * @param {string} courseCode - Course code
     * @param {number} year - Academic year
     * @returns {Array<Publon>}
     */
    getStaffForCourse(courseCode, year) {
        return this.table('staffCourse').all().filter(r =>
            r.get('courseCode') === courseCode &&
            r.get('year') === year &&
            r.get('isActive') !== false
        );
    }

    /**
     * Assign a staff member to a course
     * @param {string} userId - Staff user ID
     * @param {string} courseCode - Course code
     * @param {number} year - Academic year
     * @param {string} roleType - Role type (primary, co-instructor, tutor)
     * @param {string} createdBy - Who granted access
     * @returns {Publon}
     */
    assignStaff(userId, courseCode, year, roleType = 'primary', createdBy = null) {
        return this.table('staffCourse').create({
            userId,
            courseCode,
            year,
            roleType,
            isActive: true,
            createdAt: new Date().toISOString(),
            createdBy
        });
    }

    /**
     * Revoke access by setting isActive to false
     * @param {number} idx - Record idx
     * @returns {Publon|null}
     */
    revokeAccess(idx) {
        return this.table('staffCourse').update(idx, { isActive: false });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StaffAccessService, StaffAccessSchema };
}
if (typeof window !== 'undefined') {
    window.StaffAccessService = StaffAccessService;
    window.StaffAccessSchema = StaffAccessSchema;
}
