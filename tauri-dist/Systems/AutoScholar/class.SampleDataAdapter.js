/**
 * SampleDataAdapter - Loads hardcoded sample data for development/demo
 *
 * This adapter wraps the existing AutoScholarConfig sample data initialization
 * and provides a consistent interface for the DataAdapter pattern.
 */
class SampleDataAdapter extends DataAdapter {

    constructor(options = {}) {
        super(options);
        this.loadedData = null;
    }

    getType() {
        return 'sample';
    }

    async initialize() {
        this._progress('Initializing sample data adapter...');

        // Verify required services are available
        if (!this.services.member) {
            console.warn('[SampleDataAdapter] MemberService not available');
        }
        if (!this.services.academic) {
            console.warn('[SampleDataAdapter] AcademicService not available');
        }

        this.initialized = true;
        this._progress('Sample data adapter ready', 100);
        return true;
    }

    async loadAll() {
        if (!this.initialized) {
            await this.initialize();
        }

        const summary = {
            type: 'sample',
            loaded: {},
            timestamp: new Date().toISOString()
        };

        try {
            // 1. Load member/role data
            this._progress('Loading member roles and users...', 10);
            if (this.services.member && typeof AutoScholarConfig !== 'undefined') {
                const memberData = AutoScholarConfig.initialize(this.services.member, {
                    createSampleUsers: true
                });
                summary.loaded.roles = Object.keys(memberData.roles || {}).length;
                summary.loaded.users = Object.keys(memberData.users || {}).length;
            }

            // 2. Load academic data
            this._progress('Loading academic data...', 40);
            if (this.services.academic && typeof AutoScholarAcademicConfig !== 'undefined') {
                this.loadedData = AutoScholarAcademicConfig.initialize(
                    this.services.academic,
                    this.services.member,
                    this.services.logicEditor || null
                );

                summary.loaded.institution = 1;
                summary.loaded.faculties = 1;
                summary.loaded.departments = 1;
                summary.loaded.programmes = Object.keys(this.loadedData.programmes || {}).length;
                summary.loaded.courses = Object.keys(this.loadedData.courses || {}).length;
                summary.loaded.offerings = Object.keys(this.loadedData.offerings || {}).length;
                summary.loaded.enrolments = Object.keys(this.loadedData.enrolments || {}).length;
                summary.loaded.results = Object.keys(this.loadedData.results || {}).length;
            }

            // 3. Initialize event types
            this._progress('Initializing event types...', 70);
            if (this.services.event && typeof AutoScholarEventConfig !== 'undefined') {
                AutoScholarEventConfig.initialize(this.services.event);
                summary.loaded.eventTypes = 5;
            }

            // 4. Initialize risk indicators
            this._progress('Initializing risk indicators...', 85);
            if (this.services.risk && typeof AutoScholarRiskConfig !== 'undefined') {
                AutoScholarRiskConfig.initialize(this.services.risk);
                summary.loaded.riskIndicators = 8;
            }

            this._progress('Sample data loaded successfully', 100);
            summary.success = true;

        } catch (error) {
            console.error('[SampleDataAdapter] Error loading data:', error);
            summary.success = false;
            summary.error = error.message;
        }

        return summary;
    }

    async load(dataType, params = {}) {
        // For sample data, loadAll handles everything
        // This method allows partial reloading if needed

        if (!this.loadedData) {
            await this.loadAll();
        }

        switch (dataType) {
            case 'members':
                return this.services.member?.publon?.member?.rows || [];

            case 'programmes':
                return this.services.academic?.publon?.programme?.rows || [];

            case 'courses':
                return this.services.academic?.publon?.course?.rows || [];

            case 'offerings':
                return this.services.academic?.publon?.offering?.rows || [];

            case 'enrolments':
                return this.services.academic?.publon?.enrolment?.rows || [];

            case 'results':
                return this.services.academic?.publon?.result?.rows || [];

            default:
                console.warn(`[SampleDataAdapter] Unknown data type: ${dataType}`);
                return [];
        }
    }

    /**
     * Get the loaded sample data object
     * @returns {object} Data references from initialization
     */
    getLoadedData() {
        return this.loadedData;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SampleDataAdapter = SampleDataAdapter;
}
