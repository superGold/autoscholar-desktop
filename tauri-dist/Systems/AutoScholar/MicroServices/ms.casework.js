/**
 * CaseworkService - Student casework counselling microservice
 *
 * Manages student cases, counsellor interventions, referrals, and
 * case notes for the Casework Counsellor module of AutoScholar.
 *
 * Tables (7):
 *   caseCategory, case, intervention, referral, caseNote, appointment, riskSnapshot
 *
 * @example
 *   const svc = new CaseworkService();
 *   svc.seedDefaults();
 *   const active = svc.getActiveCases();
 *   const analytics = svc.getCaseloadAnalytics();
 */

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class CaseworkService extends Publome {
    constructor(config = {}) {
        super(CaseworkSchema, config);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Data
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load default seed data from CaseworkSeed
     */
    seedDefaults() {
        this.loadSeedData(CaseworkSeed.data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Case Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all non-resolved cases
     * @returns {Array<Publon>}
     */
    getActiveCases() {
        return this.table('case').all()
            .filter(c => c.get('status') !== 'Resolved');
    }

    /**
     * Get cases for a specific student
     * @param {number} studentId - Student idx
     * @returns {Array<Publon>}
     */
    getCasesByStudent(studentId) {
        return this.table('case').all()
            .filter(c => c.get('studentId') === studentId);
    }

    /**
     * Get cases filtered by status
     * @param {string} status - One of: Open, In Progress, Pending Review, Resolved
     * @returns {Array<Publon>}
     */
    getCasesByStatus(status) {
        return this.table('case').all()
            .filter(c => c.get('status') === status);
    }

    /**
     * Get cases assigned to a specific counsellor
     * @param {number} counsellorId - Counsellor ID
     * @returns {Array<Publon>}
     */
    getCasesByCounsellor(counsellorId) {
        return this.table('case').all()
            .filter(c => c.get('counsellorId') === counsellorId);
    }

    /**
     * Get students who appear in high-priority or critical open cases
     * @returns {Array<Object>} Array of { studentId, caseCount, highestPriority }
     */
    getAtRiskStudents() {
        const activeCases = this.getActiveCases();
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        const studentMap = {};

        activeCases.forEach(c => {
            const sid = c.get('studentId');
            const priority = c.get('priority');
            if (!studentMap[sid]) {
                studentMap[sid] = { studentId: sid, caseCount: 0, highestPriority: 'Low' };
            }
            studentMap[sid].caseCount++;
            if ((priorityOrder[priority] || 0) > (priorityOrder[studentMap[sid].highestPriority] || 0)) {
                studentMap[sid].highestPriority = priority;
            }
        });

        return Object.values(studentMap)
            .filter(s => s.highestPriority === 'High' || s.highestPriority === 'Critical' || s.caseCount > 1)
            .sort((a, b) => (priorityOrder[b.highestPriority] || 0) - (priorityOrder[a.highestPriority] || 0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Intervention Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get interventions for a specific case
     * @param {number} caseId - Case idx
     * @returns {Array<Publon>}
     */
    getInterventionsByCaseId(caseId) {
        return this.table('intervention').all()
            .filter(i => i.get('caseId') === caseId)
            .sort((a, b) => (b.get('date') || '').localeCompare(a.get('date') || ''));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Referral Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get referrals for a specific student
     * @param {number} studentId - Student idx
     * @returns {Array<Publon>}
     */
    getReferralsByStudent(studentId) {
        return this.table('referral').all()
            .filter(r => r.get('studentId') === studentId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Case Note Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get notes for a specific case, ordered most recent first
     * @param {number} caseId - Case idx
     * @returns {Array<Publon>}
     */
    getCaseNotes(caseId) {
        return this.table('caseNote').all()
            .filter(n => n.get('caseId') === caseId)
            .sort((a, b) => (b.get('date') || '').localeCompare(a.get('date') || ''));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Appointment Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all appointments, sorted by date+time
     * @returns {Array<Publon>}
     */
    getAppointments() {
        return this.table('appointment').all()
            .sort((a, b) => {
                var cmp = (a.get('date') || '').localeCompare(b.get('date') || '');
                return cmp !== 0 ? cmp : (a.get('time') || '').localeCompare(b.get('time') || '');
            });
    }

    /**
     * Get upcoming appointments (status = Scheduled or Confirmed)
     * @returns {Array<Publon>}
     */
    getUpcomingAppointments() {
        return this.getAppointments()
            .filter(a => a.get('status') === 'Scheduled' || a.get('status') === 'Confirmed');
    }

    /**
     * Get appointments for a specific student
     * @param {number} studentId
     * @returns {Array<Publon>}
     */
    getAppointmentsByStudent(studentId) {
        return this.getAppointments()
            .filter(a => a.get('studentId') === studentId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Risk History Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get risk score history for a student, sorted chronologically
     * @param {number} studentId
     * @returns {Array<Publon>}
     */
    getRiskHistory(studentId) {
        return this.table('riskSnapshot').all()
            .filter(r => r.get('studentId') === studentId)
            .sort((a, b) => (a.get('date') || '').localeCompare(b.get('date') || ''));
    }

    /**
     * Get the latest risk score for a student
     * @param {number} studentId
     * @returns {number|null}
     */
    getLatestRiskScore(studentId) {
        var history = this.getRiskHistory(studentId);
        return history.length > 0 ? history[history.length - 1].get('riskScore') : null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Analytics
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Compute caseload KPI data across the service
     * @returns {Object} Analytics summary with counts, breakdowns, averages
     */
    getCaseloadAnalytics() {
        const allCases = this.table('case').all();
        const allInterventions = this.table('intervention').all();
        const allReferrals = this.table('referral').all();

        // Status breakdown
        const statusCounts = { 'Open': 0, 'In Progress': 0, 'Pending Review': 0, 'Resolved': 0 };
        allCases.forEach(c => {
            const status = c.get('status');
            if (statusCounts[status] !== undefined) statusCounts[status]++;
        });

        // Priority breakdown
        const priorityCounts = { 'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0 };
        allCases.forEach(c => {
            const priority = c.get('priority');
            if (priorityCounts[priority] !== undefined) priorityCounts[priority]++;
        });

        // Category breakdown
        const categoryCounts = {};
        const categories = this.table('caseCategory').all();
        categories.forEach(cat => { categoryCounts[cat.get('name')] = 0; });
        allCases.forEach(c => {
            const catId = c.get('categoryId');
            const cat = this.table('caseCategory').read(catId);
            if (cat) {
                const catName = cat.get('name');
                categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
            }
        });

        // Average days open for active cases
        const activeCases = allCases.filter(c => c.get('status') !== 'Resolved');
        const avgDaysOpen = activeCases.length > 0
            ? Math.round(activeCases.reduce((sum, c) => sum + (c.get('daysOpen') || 0), 0) / activeCases.length)
            : 0;

        // Intervention outcome breakdown
        const outcomeCounts = { 'Improved': 0, 'Unchanged': 0, 'Declined': 0, 'Pending': 0 };
        allInterventions.forEach(i => {
            const outcome = i.get('outcome');
            if (outcomeCounts[outcome] !== undefined) outcomeCounts[outcome]++;
        });

        // Referral status breakdown
        const referralStatusCounts = { 'Pending': 0, 'Attended': 0, 'No-Show': 0, 'Ongoing': 0 };
        allReferrals.forEach(r => {
            const status = r.get('status');
            if (referralStatusCounts[status] !== undefined) referralStatusCounts[status]++;
        });

        return {
            totalCases: allCases.length,
            activeCases: activeCases.length,
            resolvedCases: statusCounts['Resolved'],
            totalInterventions: allInterventions.length,
            totalReferrals: allReferrals.length,
            avgDaysOpen,
            statusCounts,
            priorityCounts,
            categoryCounts,
            outcomeCounts,
            referralStatusCounts
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CaseworkService, CaseworkSchema };
}
if (typeof window !== 'undefined') {
    window.CaseworkService = CaseworkService;
}
