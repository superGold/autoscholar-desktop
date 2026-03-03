/**
 * ApiDataAdapter - Loads data from live institution APIs
 *
 * This adapter connects to institution-specific APIs (DUT, UKZN, VUT, CPUT)
 * and maps API responses to AutoScholar Publon tables.
 *
 * Configuration:
 * - config.api.endpoint: API base URL
 * - config.dev.credentials: Auth credentials for dev mode
 * - config.institution.code: Institution identifier
 */
class ApiDataAdapter extends DataAdapter {

    constructor(options = {}) {
        super(options);
        this.auth = null;
        this.apiMappings = null;
        this.loadedData = {};
        this.serviceBackend = null;
        this.linkedMember = null;
        this.useInstApi = false;
    }

    getType() {
        return this.useInstApi ? 'instapi' : 'api';
    }

    /**
     * Get the API endpoint based on data source type
     */
    _getEndpoint() {
        if (this.config.dataSource === 'instapi' && this.config.instapi?.endpoint) {
            return this.config.instapi.endpoint;
        }
        return this.config.api?.endpoint;
    }

    /**
     * Get the API mappings path based on data source type
     */
    _getMappingsPath() {
        if (this.config.dataSource === 'instapi' && this.config.instapi?.mappingsPath) {
            return this.config.instapi.mappingsPath;
        }
        return this.config.api?.mappingsPath;
    }

    async initialize() {
        // Determine if we're using instapi (local PostgreSQL) or remote API
        this.useInstApi = this.config.dataSource === 'instapi';
        const adapterType = this.useInstApi ? 'InstAPI (PostgreSQL)' : 'Remote API';
        this._progress(`Initializing ${adapterType} data adapter...`);

        // Check for pre-authenticated session (DUT dev mode)
        if (window.DUT_AUTH && window.DUT_AUTH.sessionId) {
            this.auth = {
                sessionId: window.DUT_AUTH.sessionId,
                logToken: window.DUT_AUTH.logToken,
                userId: window.DUT_AUTH.userId,
                institution: this.config.institution?.code || 'DUT'
            };
            this._progress('Using pre-authenticated session', 50);

            // Link to AutoScholar member for service persistence
            await this._linkMember(this.auth.userId);
        }
        // Auto-login if dev mode enabled
        else if (this.config.dev?.enabled && this.config.dev?.autoLogin) {
            this._progress('Authenticating via dev credentials...', 20);
            await this._authenticate();
        }

        if (!this.auth) {
            console.warn('[ApiDataAdapter] Not authenticated - will use limited functionality');
        }

        // Load API mappings (optional - for field translation)
        const mappingsPath = this._getMappingsPath();
        if (mappingsPath) {
            try {
                const response = await fetch(mappingsPath);
                this.apiMappings = await response.json();
                this._progress('Loaded API mappings', 80);
            } catch (e) {
                console.warn('[ApiDataAdapter] Could not load API mappings:', e.message);
            }
        }

        this.initialized = true;
        this._progress(`${adapterType} adapter ready`, 100);
        return true;
    }

    /**
     * Authenticate with the API endpoint
     */
    async _authenticate() {
        const creds = this.config.dev?.credentials;
        if (!creds) {
            throw new Error('No credentials configured');
        }

        const endpoint = this._getEndpoint();
        if (!endpoint) {
            throw new Error('No API endpoint configured');
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': this.useInstApi ? 'application/json' : 'text/plain' },
                body: JSON.stringify({
                    action: 'logIn',
                    userId: creds.userId,
                    pwd: creds.password
                })
            });

            const data = await response.json();

            if (data.sessionId && data.logToken) {
                this.auth = {
                    sessionId: data.sessionId,
                    logToken: data.logToken,
                    userId: creds.userId,
                    institution: this.config.institution?.code || 'DUT'
                };
                console.log('[ApiDataAdapter] Authentication successful:', this.auth.userId);

                // Link to AutoScholar member for service persistence
                await this._linkMember(creds.userId);

                return true;
            } else if (data.status === 'success' && data.sessionId) {
                // InstAPI format
                this.auth = {
                    sessionId: data.sessionId,
                    logToken: data.logToken || '',
                    userId: creds.userId,
                    institution: this.config.institution?.code || 'DUT'
                };
                console.log('[ApiDataAdapter] InstAPI authentication successful:', this.auth.userId);
                await this._linkMember(creds.userId);
                return true;
            } else {
                console.error('[ApiDataAdapter] Authentication failed:', data);
                return false;
            }
        } catch (e) {
            console.error('[ApiDataAdapter] Authentication error:', e);
            return false;
        }
    }

    /**
     * Link institution user to AutoScholar member for service data persistence
     */
    async _linkMember(userId) {
        // Initialize ServiceBackend if available
        if (typeof ServiceBackend === 'undefined') {
            console.warn('[ApiDataAdapter] ServiceBackend not loaded - service data will not persist');
            return null;
        }

        try {
            this.serviceBackend = new ServiceBackend({
                institutionCode: this.config.institution?.code || 'DUT'
            });

            // Determine student number:
            // - If userId looks like a student number (digits only), use it
            // - Otherwise use defaultStudent from config (dev mode)
            let studentNumber = userId;
            if (!/^\d+$/.test(userId)) {
                studentNumber = this.config.dev?.defaultStudent;
                if (!studentNumber) {
                    console.warn('[ApiDataAdapter] No student number available for member linking');
                    return null;
                }
                console.log('[ApiDataAdapter] Using default student:', studentNumber);
            }

            // Get student bio data from institution API
            const bioData = await this._getStudentBio(studentNumber);

            // Find or create AutoScholar member
            this.linkedMember = await this.serviceBackend.findOrCreateMember(studentNumber, {
                firstName: bioData?.firstNames || '',
                lastName: bioData?.lastName || '',
                email: bioData?.email || `${studentNumber}@${this.auth.institution.toLowerCase()}.ac.za`
            });

            console.log('[ApiDataAdapter] Member linked:', this.linkedMember?.idx);

            // Expose serviceBackend globally for easy access
            window.autoScholarBackend = this.serviceBackend;

            return this.linkedMember;

        } catch (e) {
            console.warn('[ApiDataAdapter] Member linking failed:', e.message);
            return null;
        }
    }

    /**
     * Get student bio data from institution API
     */
    async _getStudentBio(studentNumber) {
        try {
            const response = await this._apiCall('getStudentBioData', { studentNumber });
            return response?.[0] || null;
        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to get student bio:', e.message);
            return null;
        }
    }

    /**
     * Make an API call to the institution endpoint
     * @param {string} action - API action name
     * @param {object} params - Action parameters
     * @param {object} options - Options (useCache, cacheTTL, skipRetry, timeout)
     * @returns {Promise<any>} Parsed response data
     */
    async _apiCall(action, params = {}, options = {}) {
        if (!this.auth) {
            throw new Error('Not authenticated');
        }

        const endpoint = this._getEndpoint();
        if (!endpoint) {
            throw new Error('No API endpoint configured');
        }

        // Check cache first (for cacheable actions)
        const useCache = options.useCache !== false && this._isCacheableAction(action);
        if (useCache) {
            const cached = this._cacheGet(action, params);
            if (cached !== null) {
                return cached;
            }
        }

        // Execute with retry logic
        const executeRequest = async () => {
            return this._executeApiRequest(endpoint, action, params, options);
        };

        const result = options.skipRetry
            ? await executeRequest()
            : await this._withRetry(executeRequest, { maxRetries: 3 });

        // Cache the result if cacheable
        if (useCache && result) {
            const ttl = options.cacheTTL || this._getCacheTTL(action);
            this._cacheSet(action, params, result, ttl);
        }

        return result;
    }

    /**
     * Execute the actual API request with timeout
     */
    async _executeApiRequest(endpoint, action, params, options = {}) {
        const timeout = options.timeout || 30000; // 30 second default timeout

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': this.useInstApi ? 'application/json' : 'text/plain' },
                body: JSON.stringify({
                    action,
                    sessionId: this.auth.sessionId,
                    logToken: this.auth.logToken,
                    institution: this.auth.institution || window.AS_INSTITUTION?.institution?.code,
                    ...params
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                throw error;
            }

            const data = await response.json();
            if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
                throw new Error('Session expired');
            }
            return this._parseResponse(data);

        } catch (error) {
            clearTimeout(timeoutId);

            // Enrich error with context
            error.action = action;
            error.params = params;
            error.endpoint = endpoint;

            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Request timeout after ${timeout}ms for action: ${action}`);
                timeoutError.name = 'TimeoutError';
                timeoutError.action = action;
                throw timeoutError;
            }

            throw error;
        }
    }

    /**
     * Determine if an action should be cached
     * @param {string} action - Action name
     * @returns {boolean}
     */
    _isCacheableAction(action) {
        // Reference data actions are cacheable
        const cacheableActions = [
            'getInstitution', 'getSampleValues',
            'getColleges', 'getCollegeFaculties', 'getFacultyDisciplines',
            'getDisciplineProgrammes', 'getInstProgrammes',
            'getCourseMeta', 'getProgrammeMeta', 'getProgrammeStructure',
            'getCourseCounts', 'getProgrammeCounts'
        ];
        return cacheableActions.includes(action);
    }

    /**
     * Get cache TTL for specific action types
     * @param {string} action - Action name
     * @returns {number} TTL in milliseconds
     */
    _getCacheTTL(action) {
        // Structure data can be cached longer (1 hour)
        const longCacheActions = [
            'getInstitution', 'getColleges', 'getCollegeFaculties',
            'getFacultyDisciplines', 'getDisciplineProgrammes'
        ];
        if (longCacheActions.includes(action)) {
            return 3600000; // 1 hour
        }

        // Programme/course metadata (15 minutes)
        const mediumCacheActions = [
            'getCourseMeta', 'getProgrammeMeta', 'getProgrammeStructure',
            'getInstProgrammes'
        ];
        if (mediumCacheActions.includes(action)) {
            return 900000; // 15 minutes
        }

        // Default cache TTL (5 minutes)
        return 300000;
    }

    /**
     * Override retryable error check for API-specific errors
     */
    _isRetryableError(error) {
        // Auth errors should not be retried
        if (error.message?.includes('Not authenticated') ||
            error.message?.includes('Session expired') ||
            error.status === 401 || error.status === 403) {
            return false;
        }
        // Use base class logic for other errors
        return super._isRetryableError(error);
    }

    /**
     * Perform health check specific to API adapter
     */
    async healthCheck() {
        try {
            // Try to get institution info as a simple health check
            const result = await this._apiCall('getInstitution', {}, {
                skipRetry: true,
                timeout: 5000,
                useCache: false
            });
            return {
                isHealthy: true,
                lastCheck: new Date().toISOString(),
                message: 'API connection successful',
                institution: this.config.institution?.code
            };
        } catch (error) {
            return {
                isHealthy: false,
                lastCheck: new Date().toISOString(),
                message: error.message,
                institution: this.config.institution?.code
            };
        }
    }

    /**
     * Parse API response - handle various wrapper formats
     */
    _parseResponse(data) {
        // Check for error
        if (data.error) {
            throw new Error(data.error);
        }

        // Standard format: { fields: [...], data: [...] }
        if (data.fields && data.data) {
            return this._fieldsDataToRecords(data.fields, data.data);
        }

        // Wrapped format: { results: { fields, data } }
        if (data.results?.fields && data.results?.data) {
            return this._fieldsDataToRecords(data.results.fields, data.results.data);
        }

        // Check for other common wrappers
        const wrapperKeys = [
            'students', 'registrations', 'colleges', 'disciplines',
            'courseCount', 'programmeCount', 'programmes', 'studentBioData',
            'courses', 'courseInfo', 'faculties', 'assessmentResults'
        ];

        for (const key of wrapperKeys) {
            if (data[key]?.fields && data[key]?.data) {
                return this._fieldsDataToRecords(data[key].fields, data[key].data);
            }
        }

        // Return raw data if no recognized format
        return data;
    }

    /**
     * Convert fields+data array format to array of objects
     */
    _fieldsDataToRecords(fields, data) {
        return data.map(row => {
            const record = {};
            fields.forEach((field, i) => {
                record[field] = row[i];
            });
            return record;
        });
    }

    /**
     * Load all data into Publon tables
     */
    async loadAll() {
        if (!this.initialized) {
            await this.initialize();
        }

        const summary = {
            type: 'api',
            institution: this.config.institution?.code,
            loaded: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Initialize roles first (static - same for all institutions)
            this._progress('Initializing roles...', 5);
            if (this.services.member && typeof AutoScholarConfig !== 'undefined') {
                // In dev mode, create sample users for role switching
                const isDevMode = this.config.dev?.enabled || false;
                const memberData = AutoScholarConfig.initialize(this.services.member, {
                    createSampleUsers: isDevMode
                });
                summary.loaded.roles = Object.keys(memberData.roles || {}).length;
                summary.loaded.users = isDevMode ? 13 : 0; // Sample users count
            }

            // Load the default student into member service (for API mode)
            if (this.config.dev?.defaultStudent && this.services.member) {
                this._progress('Loading default student...', 10);
                const defaultStudent = this.config.dev.defaultStudent;
                await this._loadMembers({ studentNumber: defaultStudent });
                console.log('[ApiDataAdapter] Default student loaded:', defaultStudent);

                // Load the student's academic records
                this._progress('Loading student academic records...', 12);
                const studentRecords = await this._loadStudentAcademicRecords(defaultStudent);
                summary.loaded.studentEnrolments = studentRecords.enrolments;
                summary.loaded.studentResults = studentRecords.results;
                console.log('[ApiDataAdapter] Student records loaded:', studentRecords);

                // Load sample data for other services (Diary, Career, Timetable)
                this._progress('Loading sample service data...', 14);
                const studentMember = this.services.member?.publon?.member?.rows?.find(
                    m => m && m.username === defaultStudent
                );
                if (studentMember) {
                    await this._loadSampleServiceData(studentMember.idx);
                }
            }

            // Load institution structure
            this._progress('Loading institution structure...', 15);
            await this._loadInstitutionStructure();
            summary.loaded.institution = 1;

            // Load faculties
            this._progress('Loading faculties...', 25);
            const faculties = await this._loadFaculties();
            summary.loaded.faculties = faculties.length;

            // Load departments/disciplines
            this._progress('Loading departments...', 35);
            const departments = await this._loadDepartments();
            summary.loaded.departments = departments.length;

            // Load programmes
            this._progress('Loading programmes...', 45);
            const programmes = await this._loadProgrammes();
            summary.loaded.programmes = programmes.length;

            // Load courses (optional - can be loaded on demand)
            this._progress('Loading courses...', 55);
            const courses = await this._loadCourses();
            summary.loaded.courses = courses.length;

            // Initialize event types (static)
            this._progress('Initializing event types...', 75);
            if (this.services.event && typeof AutoScholarEventConfig !== 'undefined') {
                AutoScholarEventConfig.initialize(this.services.event);
                summary.loaded.eventTypes = 5;
            }

            // Initialize risk indicators (static)
            this._progress('Initializing risk indicators...', 85);
            if (this.services.risk && typeof AutoScholarRiskConfig !== 'undefined') {
                AutoScholarRiskConfig.initialize(this.services.risk);
                summary.loaded.riskIndicators = 8;
            }

            this._progress('API data loaded successfully', 100);
            summary.success = true;

        } catch (error) {
            console.error('[ApiDataAdapter] Error loading data:', error);
            summary.success = false;
            summary.error = error.message;
        }

        return summary;
    }

    /**
     * Load institution structure from config
     */
    async _loadInstitutionStructure() {
        if (!this.services.academic) return;

        const inst = this.services.academic.publon.institution.create({ data: {
            name: this.config.institution?.name || 'Institution',
            code: this.config.institution?.code || 'INST',
            type: 'university',
            country: 'ZA',
            settings: JSON.stringify({
                academicYear: this.config.defaults?.academicYear || 2024,
                semesterSystem: 'semester'
            })
        }});

        this.loadedData.institution = inst;
        return inst;
    }

    /**
     * Load faculties from API
     */
    async _loadFaculties() {
        if (!this.services.academic || !this.auth) return [];

        try {
            const response = await this._apiCall('getCollegeFaculties');
            const faculties = [];

            for (const fac of response) {
                const faculty = this.services.academic.publon.faculty.create({ data: {
                    institutionId: this.loadedData.institution?.idx,
                    name: fac.facultyLabel || fac.name,
                    code: fac.facultyCode || fac.code,
                    deanId: null
                }});
                faculties.push(faculty);
            }

            this.loadedData.faculties = faculties;
            return faculties;

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load faculties:', e.message);
            return [];
        }
    }

    /**
     * Load departments/disciplines from API
     */
    async _loadDepartments() {
        if (!this.services.academic || !this.auth) return [];

        try {
            const response = await this._apiCall('getFacultyDisciplines');
            const departments = [];

            // Create faculty lookup
            const facultyLookup = {};
            for (const fac of (this.loadedData.faculties || [])) {
                facultyLookup[fac.code] = fac.idx;
            }

            for (const disc of response) {
                const facultyId = facultyLookup[disc.facultyCode] || null;
                const dept = this.services.academic.publon.department.create({ data: {
                    facultyId: facultyId,
                    name: disc.disciplineLabel || disc.name,
                    code: disc.disciplineCode || disc.code,
                    hodId: null
                }});
                departments.push(dept);
            }

            this.loadedData.departments = departments;
            return departments;

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load departments:', e.message);
            return [];
        }
    }

    /**
     * Load programmes from API
     */
    async _loadProgrammes() {
        if (!this.services.academic || !this.auth) return [];

        try {
            const year = this.config.defaults?.academicYear || 2024;
            const response = await this._apiCall('getInstProgrammes', { year });
            const programmes = [];

            // Create department lookup
            const deptLookup = {};
            for (const dept of (this.loadedData.departments || [])) {
                deptLookup[dept.code] = dept.idx;
            }

            for (const prog of response) {
                const departmentId = deptLookup[prog.disciplineCode] || null;
                const programme = this.services.academic.publon.programme.create({ data: {
                    departmentId: departmentId,
                    code: prog.programmeCode,
                    label: prog.programmeLabel,
                    nqfLevel: 7, // Default, could be derived from code
                    totalCredits: 360, // Default for 3-year degree
                    minDuration: 3,
                    maxDuration: 6,
                    status: 'active'
                }});
                programmes.push(programme);
            }

            this.loadedData.programmes = programmes;
            return programmes;

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load programmes:', e.message);
            return [];
        }
    }

    /**
     * Load courses from API
     * Note: This can be slow for large institutions - consider loading on demand
     */
    async _loadCourses() {
        if (!this.services.academic || !this.auth) return [];

        // For now, return empty - courses can be loaded on demand per programme
        // Uncomment below to load all courses (slow)
        /*
        try {
            const response = await this._apiCall('getCourseCounts', {
                year: this.config.defaults?.academicYear || 2024
            });
            // Would need to call getCourseInfo for each unique course
        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load courses:', e.message);
        }
        */

        return [];
    }

    /**
     * Load specific data type
     */
    async load(dataType, params = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        switch (dataType) {
            case 'members':
                return this._loadMembers(params);

            case 'programmes':
                return this._loadProgrammes();

            case 'courses':
                return this._loadCoursesForProgramme(params.programmeCode);

            case 'offerings':
                return this._loadOfferings(params);

            case 'enrolments':
                return this._loadEnrolments(params);

            case 'results':
                return this._loadResults(params);

            default:
                console.warn(`[ApiDataAdapter] Unknown data type: ${dataType}`);
                return [];
        }
    }

    /**
     * Load members (students) from API
     */
    async _loadMembers(params = {}) {
        if (!this.auth) return [];

        try {
            if (params.studentNumber) {
                // Load single student
                const response = await this._apiCall('getStudentBioData', {
                    studentNumber: params.studentNumber
                });

                if (response.length > 0) {
                    const student = response[0];
                    return this._createMemberFromBioData(student);
                }
            } else if (params.lastName) {
                // Search by name
                const response = await this._apiCall('searchStudents', {
                    lastName: params.lastName
                });
                return response;
            }

            return [];

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load members:', e.message);
            return [];
        }
    }

    /**
     * Create member record from student bio data
     */
    _createMemberFromBioData(bioData) {
        if (!this.services.member) return null;

        // Check if already exists
        const existing = this.services.member.getMemberByEmail(bioData.email);
        if (existing) return existing;

        // Register new member
        const member = this.services.member.register({
            email: bioData.email || `${bioData.studentNumber}@${this.auth.institution.toLowerCase()}.ac.za`,
            username: bioData.studentNumber,
            password: 'temp123' // Placeholder - actual auth via LDAP
        });

        if (member) {
            // Update profile
            this.services.member.updateProfile(member.idx, {
                firstName: bioData.firstNames,
                lastName: bioData.lastName,
                studentNumber: bioData.studentNumber
            });

            // Assign student role
            const roles = this.services.member.getRoles();
            const studentRole = roles.find(r => r.name === 'Student');
            if (studentRole) {
                this.services.member.assignRole(member.idx, studentRole.idx);
            }
        }

        return member;
    }

    /**
     * Load a student's complete academic records (courses, enrolments, results)
     * @param {string} studentNumber - Student number
     * @returns {Object} Summary of loaded data
     */
    async _loadStudentAcademicRecords(studentNumber) {
        if (!this.auth || !studentNumber || !this.services.academic) {
            return { enrolments: 0, results: 0 };
        }

        try {
            // Get all course results for this student
            const courseResults = await this._apiCall('getCourseResults', {
                studentNumber: studentNumber
            });

            if (!courseResults || courseResults.length === 0) {
                console.log('[ApiDataAdapter] No course results found for student');
                return { enrolments: 0, results: 0 };
            }

            console.log(`[ApiDataAdapter] Found ${courseResults.length} course results`);

            // Find the student member
            const studentMember = this.services.member?.publon?.member?.rows?.find(
                m => m && m.username === studentNumber
            );
            if (!studentMember) {
                console.warn('[ApiDataAdapter] Student member not found:', studentNumber);
                return { enrolments: 0, results: 0 };
            }

            // Fetch course metadata for each unique course code
            const courseCodes = [...new Set(courseResults.map(r => r.courseCode))];
            let courseMeta = {};
            try {
                // Fetch metadata for each course (API requires individual codes)
                const metaPromises = courseCodes.map(code =>
                    this._apiCall('getCourseMeta', { courseCode: code })
                        .then(result => ({ code, result: result?.[0] || null }))
                        .catch(() => ({ code, result: null }))
                );
                const metaResults = await Promise.all(metaPromises);
                metaResults.forEach(({ code, result }) => {
                    if (result) courseMeta[code] = result;
                });
                console.log(`[ApiDataAdapter] Loaded metadata for ${Object.keys(courseMeta).length} of ${courseCodes.length} courses`);
            } catch (e) {
                console.warn('[ApiDataAdapter] Could not load course metadata:', e.message);
            }

            let enrolmentCount = 0;
            let resultCount = 0;

            // Process each course result
            for (const record of courseResults) {
                const courseCode = record.courseCode;
                const year = parseInt(record.year) || new Date().getFullYear();
                const mark = parseFloat(record.result) || null;
                const meta = courseMeta[courseCode] || {};

                // Create or find course
                let course = this.services.academic.publon.course.rows.find(
                    c => c && c.code === courseCode
                );
                if (!course) {
                    course = this.services.academic.publon.course.create({ data: {
                        code: courseCode,
                        label: meta.courseLabel || record.courseName || courseCode,
                        credits: parseInt(meta.credits) || parseInt(record.credits) || 16,
                        level: parseInt(courseCode.match(/\d/)?.[0]) || 1
                    }});
                }

                // Create or find offering for this year
                let offering = this.services.academic.publon.offering.rows.find(
                    o => o && o.courseId === course.idx && o.year === year
                );
                if (!offering) {
                    offering = this.services.academic.publon.offering.create({ data: {
                        courseId: course.idx,
                        year: year,
                        semester: 1,
                        status: 'completed'
                    }});
                }

                // Create enrolment
                const existingEnrolment = this.services.academic.publon.enrolment.rows.find(
                    e => e && e.offeringId === offering.idx && e.studentId === studentMember.idx
                );
                if (!existingEnrolment) {
                    const enrolment = this.services.academic.publon.enrolment.create({ data: {
                        offeringId: offering.idx,
                        studentId: studentMember.idx,
                        status: mark >= 50 ? 'completed' : 'enrolled',
                        enrolmentDate: `${year}-02-01`
                    }});
                    enrolmentCount++;

                    // Create result if mark exists
                    if (mark !== null && mark !== undefined) {
                        this.services.academic.publon.result.create({ data: {
                            enrolmentId: enrolment.idx,
                            mark: mark,
                            grade: this._markToGrade(mark),
                            resultType: 'final',
                            resultDate: `${year}-06-15`
                        }});
                        resultCount++;
                    }
                }
            }

            return { enrolments: enrolmentCount, results: resultCount };

        } catch (e) {
            console.error('[ApiDataAdapter] Error loading student records:', e);
            return { enrolments: 0, results: 0, error: e.message };
        }
    }

    /**
     * Load courses for a specific programme
     */
    async _loadCoursesForProgramme(programmeCode) {
        if (!this.auth || !programmeCode) return [];

        try {
            const year = this.config.defaults?.academicYear || 2024;
            const response = await this._apiCall('getProgrammeStructure', {
                programmeCode,
                year
            });

            const courseCodes = [...new Set(response.map(r => r.courseCode))];
            if (courseCodes.length === 0) return [];

            // Get course info for all codes
            const courseInfo = await this._apiCall('getCourseInfo', {
                courseList: courseCodes
            });

            const courses = [];
            for (const info of courseInfo) {
                const course = this.services.academic.publon.course.create({ data: {
                    departmentId: null, // Could look up from programme
                    code: info.courseCode,
                    label: info.courseLabel,
                    credits: 16, // Default - could get from getCourseMeta
                    nqfLevel: 6,
                    passMark: this.config.defaults?.passMark || 50,
                    dpRequired: true
                }});
                courses.push(course);
            }

            return courses;

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load courses:', e.message);
            return [];
        }
    }

    /**
     * Load enrolments and results for a course
     */
    async _loadEnrolments(params = {}) {
        if (!this.auth) return [];

        try {
            const { courseCode, year } = params;
            const response = await this._apiCall('getCourseResults', {
                courseCode,
                year: year || this.config.defaults?.academicYear
            });

            const enrolments = [];
            for (const record of response) {
                // Create or find student member
                const member = await this._loadMembers({ studentNumber: record.studentNumber });

                if (member && this.services.academic) {
                    // Find or create offering
                    let offering = this._findOffering(courseCode, record.year);
                    if (!offering) {
                        offering = this._createOffering(courseCode, record.year);
                    }

                    // Create enrolment
                    const enrolment = this.services.academic.publon.enrolment.create({ data: {
                        offeringId: offering?.idx,
                        studentId: member.idx,
                        status: record.result >= 50 ? 'completed' : 'enrolled',
                        enrolmentDate: `${record.year}-02-01`
                    }});

                    // Create result
                    if (record.result !== null && record.result !== undefined) {
                        this.services.academic.publon.result.create({ data: {
                            enrolmentId: enrolment.idx,
                            mark: record.result,
                            grade: this._markToGrade(record.result),
                            resultType: 'final',
                            resultDate: `${record.year}-06-15`,
                            capturedBy: null
                        }});
                    }

                    enrolments.push(enrolment);
                }
            }

            return enrolments;

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load enrolments:', e.message);
            return [];
        }
    }

    /**
     * Load results for a course
     */
    async _loadResults(params = {}) {
        if (!this.auth) return [];

        try {
            const { courseCode, year } = params;
            const response = await this._apiCall('getAssessmentResults', {
                courseCode,
                year: year || this.config.defaults?.academicYear
            });

            return response;

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to load results:', e.message);
            return [];
        }
    }

    /**
     * Find existing offering
     */
    _findOffering(courseCode, year) {
        const offerings = this.services.academic?.publon?.offering?.rows || [];
        const courses = this.services.academic?.publon?.course?.rows || [];

        const course = courses.find(c => c && c.code === courseCode);
        if (!course) return null;

        return offerings.find(o => o && o.courseId === course.idx && o.year === year);
    }

    /**
     * Create offering for a course
     */
    _createOffering(courseCode, year) {
        if (!this.services.academic) return null;

        const courses = this.services.academic.publon.course.rows || [];
        const course = courses.find(c => c && c.code === courseCode);
        if (!course) return null;

        return this.services.academic.publon.offering.create({ data: {
            courseId: course.idx,
            year: year,
            semester: 1,
            lecturerId: null,
            venue: 'TBC',
            maxEnrolment: 100
        }});
    }

    /**
     * Convert mark to grade
     */
    _markToGrade(mark) {
        if (mark >= 75) return 'A';
        if (mark >= 60) return 'B';
        if (mark >= 50) return 'C';
        return 'F';
    }

    /**
     * Get course statistics (pass rates, means)
     */
    async getCourseStats(courseCode, year) {
        if (!this.auth) return null;

        try {
            const response = await this._apiCall('getCourseMean', {
                courseCode,
                year: year || this.config.defaults?.academicYear
            });

            if (response.length > 0) {
                return response[0];
            }

            return null;

        } catch (e) {
            console.warn('[ApiDataAdapter] Failed to get course stats:', e.message);
            return null;
        }
    }

    /**
     * Get loaded data object
     */
    getLoadedData() {
        return this.loadedData;
    }

    /**
     * Get authentication status
     */
    getAuth() {
        return this.auth;
    }

    /**
     * Direct API access (for advanced use)
     */
    async api(action, params = {}) {
        return this._apiCall(action, params);
    }

    /**
     * Load sample data for services (Diary, Goals, Career, Timetable)
     * Called after student academic data is loaded
     */
    async _loadSampleServiceData(memberId) {
        if (!memberId) return;

        console.log('[ApiDataAdapter] Loading sample service data for member:', memberId);

        // ════════════════════════════════════════════════════════════════
        // DIARY SERVICE - Journal entries, goals, prompts
        // ════════════════════════════════════════════════════════════════
        if (this.services.diary?.publon) {
            const diary = this.services.diary.publon;

            // Helper for relative dates
            const today = new Date();
            const dateOffset = (days) => {
                const d = new Date(today);
                d.setDate(d.getDate() + days);
                return d.toISOString().split('T')[0];
            };

            // Sample diary entries - use relative dates
            if (diary.diaryEntry) {
                const entries = [
                    { memberId, entryDate: dateOffset(-2), entryType: 'reflection', title: 'Great progress this semester!',
                      content: 'Feeling confident about my academic progress. The Applied Physical Conditioning course is going well and I\'m maintaining good marks across all subjects.',
                      mood: 4, energyLevel: 4, academicConfidence: 4, tags: 'progress,motivation', isPrivate: true, status: 'active' },
                    { memberId, entryDate: dateOffset(-7), entryType: 'challenge', title: 'Struggling with time management',
                      content: 'Finding it hard to balance coursework with practical sessions. Need to create a better study schedule.',
                      mood: 2, energyLevel: 2, academicConfidence: 3, tags: 'challenge,time-management', isPrivate: true, status: 'active' },
                    { memberId, entryDate: dateOffset(-14), entryType: 'achievement', title: 'Passed Exercise Physiology assessment!',
                      content: 'Got 75% on the practical assessment. All that extra practice paid off!',
                      mood: 5, energyLevel: 5, academicConfidence: 5, tags: 'achievement,exams', isPrivate: false, status: 'active' },
                    { memberId, entryDate: dateOffset(-21), entryType: 'reflection', title: 'Career thoughts',
                      content: 'Starting to think about internship opportunities for next year. Should focus on sports management companies.',
                      mood: 3, energyLevel: 3, academicConfidence: 4, tags: 'career,planning', isPrivate: true, status: 'active' },
                    { memberId, entryDate: dateOffset(-30), entryType: 'gratitude', title: 'Grateful for support',
                      content: 'Really appreciate my study group helping me understand the nutrition module. Teamwork makes a difference!',
                      mood: 4, energyLevel: 4, academicConfidence: 4, tags: 'gratitude,support', isPrivate: false, status: 'active' }
                ];
                entries.forEach(e => diary.diaryEntry.create({ data: e }));
            }

            // Sample goals - use relative dates (from today)
            if (diary.diaryGoal) {
                const goals = [
                    { memberId, goalType: 'academic', title: 'Maintain 75%+ average',
                      description: 'Keep semester average above 75% for distinction',
                      targetDate: dateOffset(45), targetValue: 75, currentValue: 72, unit: 'percent',
                      priority: 'high', status: 'active' },
                    { memberId, goalType: 'academic', title: 'Complete all assignments on time',
                      description: 'Submit every assignment before the deadline',
                      targetDate: dateOffset(30), targetValue: 12, currentValue: 10, unit: 'assignments',
                      priority: 'high', status: 'active' },
                    { memberId, goalType: 'career', title: 'Apply for internships',
                      description: 'Submit applications to 5 sports companies',
                      targetDate: dateOffset(60), targetValue: 5, currentValue: 1, unit: 'applications',
                      priority: 'medium', status: 'active' },
                    { memberId, goalType: 'personal', title: 'Improve fitness level',
                      description: 'Train consistently 4 times per week',
                      targetDate: dateOffset(90), targetValue: 16, currentValue: 12, unit: 'sessions/month',
                      priority: 'medium', status: 'active' },
                    { memberId, goalType: 'academic', title: 'Read 2 research papers monthly',
                      description: 'Stay current with sports science literature',
                      targetDate: dateOffset(60), targetValue: 6, currentValue: 4, unit: 'papers',
                      priority: 'low', status: 'active' }
                ];
                goals.forEach(g => diary.diaryGoal.create({ data: g }));
            }

            // Sample lecturer prompts (check-ins) - use relative dates
            if (diary.lecturerPrompt) {
                const prompts = [
                    { memberId, promptText: 'How are you finding the practical components of Exercise Physiology?',
                      courseCode: 'EXPH301', status: 'pending', expiresAt: dateOffset(7) },
                    { memberId, promptText: 'What aspects of Sport Management are you most interested in exploring for your career?',
                      courseCode: 'SMEF301', response: 'I\'m really interested in event management and sports marketing.',
                      respondedAt: dateOffset(-5), status: 'responded' }
                ];
                prompts.forEach(p => diary.lecturerPrompt.create({ data: p }));
            }

            console.log('[ApiDataAdapter] Diary sample data loaded');
        }

        // ════════════════════════════════════════════════════════════════
        // CAREER SERVICE - Profile, skills, bursaries, jobs
        // ════════════════════════════════════════════════════════════════
        if (this.services.career?.publon) {
            const career = this.services.career.publon;

            // Student profile
            if (career.studentProfile) {
                career.studentProfile.create({ data: {
                    memberId,
                    headline: 'Sport Management Student | Aspiring Sports Administrator',
                    bio: 'Final year Sport Management student at DUT with strong interests in event coordination and athlete development. Passionate about combining business acumen with sports expertise.',
                    skills: 'Event Management, Sports Analytics, Team Leadership, Communication',
                    interests: 'Sports Marketing, Athlete Development, Fitness Industry, Event Coordination',
                    gpa: 3.24,  // 81% average
                    fieldOfStudy: 'Sport Management',
                    expectedGraduation: '2025-06-30',
                    financialNeed: 'medium',
                    isPublic: true
                }});
            }

            // Skills
            if (career.skillEntry) {
                const skills = [
                    { memberId, skillName: 'Event Planning', proficiency: 'advanced', category: 'professional', endorsements: 3 },
                    { memberId, skillName: 'Sports Analytics', proficiency: 'intermediate', category: 'technical', endorsements: 2 },
                    { memberId, skillName: 'Microsoft Office', proficiency: 'advanced', category: 'technical', endorsements: 5 },
                    { memberId, skillName: 'Team Leadership', proficiency: 'advanced', category: 'soft-skill', endorsements: 4 },
                    { memberId, skillName: 'Public Speaking', proficiency: 'intermediate', category: 'soft-skill', endorsements: 2 },
                    { memberId, skillName: 'Social Media Marketing', proficiency: 'intermediate', category: 'professional', endorsements: 1 }
                ];
                skills.forEach(s => career.skillEntry.create({ data: s }));
            }

            // Bursaries
            if (career.bursary) {
                const bursaries = [
                    { name: 'Sport Excellence Bursary', providerId: 1, description: 'For students excelling in sport-related studies',
                      amount: 50000, currency: 'ZAR', deadline: '2025-03-15',
                      eligibilityCriteria: 'Sport Management students with 70%+ average',
                      fieldsOfStudy: 'Sport Management, Sports Science', minGpa: 2.8, yearOfStudy: '3,4',
                      financialNeedRequired: false, status: 'open', applicationUrl: 'https://bursaries.dut.ac.za/sport' },
                    { name: 'Academic Merit Award', providerId: 1, description: 'Rewarding academic excellence',
                      amount: 35000, currency: 'ZAR', deadline: '2025-02-28',
                      eligibilityCriteria: 'Students with distinction average (75%+)',
                      fieldsOfStudy: 'All', minGpa: 3.0, yearOfStudy: 'All',
                      financialNeedRequired: false, status: 'open', applicationUrl: 'https://bursaries.dut.ac.za/merit' },
                    { name: 'SASCOC Development Fund', providerId: 2, description: 'Supporting future sports administrators',
                      amount: 40000, currency: 'ZAR', deadline: '2025-04-30',
                      eligibilityCriteria: 'Final year students in sports programmes',
                      fieldsOfStudy: 'Sport Management, Sports Science', minGpa: 2.5, yearOfStudy: '4',
                      financialNeedRequired: true, status: 'open', applicationUrl: 'https://sascoc.co.za/bursaries' },
                    { name: 'Discovery Vitality Bursary', providerId: 3, description: 'For health and wellness focused students',
                      amount: 45000, currency: 'ZAR', deadline: '2025-01-31',
                      eligibilityCriteria: 'Health sciences with wellness focus',
                      fieldsOfStudy: 'Sport Management, Exercise Science', minGpa: 2.7, yearOfStudy: '2,3,4',
                      financialNeedRequired: false, status: 'open', applicationUrl: 'https://discovery.co.za/bursaries' }
                ];
                bursaries.forEach(b => career.bursary.create({ data: b }));
            }

            // Job listings
            if (career.jobListing) {
                const jobs = [
                    { employerId: 1, companyName: 'Virgin Active South Africa', title: 'Fitness Coordinator Intern',
                      description: 'Assist with member fitness assessments and programme design', jobType: 'internship',
                      location: 'Durban', isRemote: false, salaryMin: 8000, salaryMax: 12000,
                      requiredSkills: 'Fitness Assessment, Communication, Customer Service',
                      preferredFields: 'Sport Management, Exercise Science', deadline: '2025-02-15',
                      status: 'open', applicationUrl: 'https://virginactive.co.za/careers' },
                    { employerId: 2, companyName: 'Comrades Marathon Association', title: 'Event Assistant',
                      description: 'Support event planning and logistics for major running events', jobType: 'part-time',
                      location: 'Pietermaritzburg', isRemote: false, salaryMin: 5000, salaryMax: 8000,
                      requiredSkills: 'Event Planning, Logistics, Teamwork',
                      preferredFields: 'Sport Management', deadline: '2025-03-01',
                      status: 'open', applicationUrl: 'https://comrades.com/jobs' },
                    { employerId: 3, companyName: 'SuperSport', title: 'Sports Content Intern',
                      description: 'Assist with sports content creation and social media management', jobType: 'internship',
                      location: 'Johannesburg', isRemote: true, salaryMin: 10000, salaryMax: 15000,
                      requiredSkills: 'Content Writing, Social Media, Sports Knowledge',
                      preferredFields: 'Sport Management, Marketing', deadline: '2025-01-31',
                      status: 'open', applicationUrl: 'https://supersport.com/careers' },
                    { employerId: 4, companyName: 'Planet Fitness', title: 'Club Operations Trainee',
                      description: 'Learn gym operations management and member services', jobType: 'graduate',
                      location: 'Multiple Locations', isRemote: false, salaryMin: 15000, salaryMax: 20000,
                      requiredSkills: 'Management, Customer Service, Fitness',
                      preferredFields: 'Sport Management, Business', deadline: '2025-04-15',
                      status: 'open', applicationUrl: 'https://planetfitness.co.za/careers' }
                ];
                jobs.forEach(j => career.jobListing.create({ data: j }));
            }

            // Sample application
            if (career.application) {
                career.application.create({ data: {
                    memberId, targetType: 'job', targetId: 1,
                    coverLetter: 'I am excited to apply for the Fitness Coordinator Intern position...',
                    status: 'submitted', appliedAt: '2024-11-18'
                }});
            }

            console.log('[ApiDataAdapter] Career sample data loaded');
        }

        // ════════════════════════════════════════════════════════════════
        // TIMETABLE SERVICE - Buildings, venues, periods, slots
        // ════════════════════════════════════════════════════════════════
        if (this.services.timetable?.publon) {
            const tt = this.services.timetable.publon;

            // Buildings
            if (tt.building) {
                const buildings = [
                    { code: 'MAIN', name: 'Main Academic Building', campus: 'Steve Biko', address: 'Steve Biko Campus, Durban', floors: 4, status: 'active' },
                    { code: 'SPORT', name: 'Sport Sciences Complex', campus: 'Steve Biko', address: 'Sport Complex, Steve Biko Campus', floors: 2, status: 'active' },
                    { code: 'GYM', name: 'Indoor Sports Centre', campus: 'Steve Biko', address: 'Indoor Arena, Steve Biko Campus', floors: 1, status: 'active' }
                ];
                buildings.forEach(b => tt.building.create({ data: b }));
            }

            // Venues
            if (tt.venue) {
                const venues = [
                    { buildingId: 1, code: 'LT1', name: 'Lecture Theatre 1', venueType: 'lecture_hall', capacity: 200, floor: 1, wheelchairAccess: true, hasProjector: true, hasWhiteboard: true },
                    { buildingId: 1, code: 'LT2', name: 'Lecture Theatre 2', venueType: 'lecture_hall', capacity: 150, floor: 1, wheelchairAccess: true, hasProjector: true, hasWhiteboard: true },
                    { buildingId: 1, code: 'TR101', name: 'Tutorial Room 101', venueType: 'tutorial_room', capacity: 40, floor: 1, wheelchairAccess: true, hasProjector: true, hasWhiteboard: true },
                    { buildingId: 2, code: 'PHYSLAB', name: 'Exercise Physiology Lab', venueType: 'lab', capacity: 30, floor: 1, wheelchairAccess: true, hasProjector: true, specialNotes: 'Fitness testing equipment' },
                    { buildingId: 2, code: 'SEMINAR', name: 'Sport Seminar Room', venueType: 'seminar_room', capacity: 50, floor: 2, wheelchairAccess: false, hasProjector: true, hasWhiteboard: true },
                    { buildingId: 3, code: 'HALL', name: 'Indoor Sports Hall', venueType: 'sports_hall', capacity: 100, floor: 1, wheelchairAccess: true, specialNotes: 'Multi-purpose sports surface' }
                ];
                venues.forEach(v => tt.venue.create({ data: v }));
            }

            // Time periods
            if (tt.period) {
                const periods = [
                    { code: 'P1', label: '08:00 - 09:45', startTime: '08:00', endTime: '09:45', durationMinutes: 105 },
                    { code: 'P2', label: '10:00 - 11:45', startTime: '10:00', endTime: '11:45', durationMinutes: 105 },
                    { code: 'P3', label: '12:00 - 12:45', startTime: '12:00', endTime: '12:45', durationMinutes: 45 },
                    { code: 'P4', label: '13:00 - 14:45', startTime: '13:00', endTime: '14:45', durationMinutes: 105 },
                    { code: 'P5', label: '15:00 - 16:45', startTime: '15:00', endTime: '16:45', durationMinutes: 105 }
                ];
                periods.forEach(p => tt.period.create({ data: p }));
            }

            // Get some offerings to link slots to
            const offerings = this.services.academic?.publon?.offering?.rows?.filter(o => o) || [];

            // Timetable slots (link offerings to periods and venues)
            if (tt.slot && offerings.length > 0) {
                const slots = [
                    // Monday
                    { offeringId: offerings[0]?.idx, periodId: 1, venueId: 1, dayOfWeek: 1, groupType: 'lecture', capacity: 150 },
                    { offeringId: offerings[1]?.idx, periodId: 2, venueId: 4, dayOfWeek: 1, groupType: 'practical', capacity: 30 },
                    // Tuesday
                    { offeringId: offerings[2]?.idx, periodId: 1, venueId: 2, dayOfWeek: 2, groupType: 'lecture', capacity: 120 },
                    { offeringId: offerings[3]?.idx, periodId: 4, venueId: 5, dayOfWeek: 2, groupType: 'seminar', capacity: 40 },
                    // Wednesday
                    { offeringId: offerings[0]?.idx, periodId: 2, venueId: 3, dayOfWeek: 3, groupType: 'tutorial', capacity: 35 },
                    { offeringId: offerings[4]?.idx, periodId: 4, venueId: 6, dayOfWeek: 3, groupType: 'practical', capacity: 50 },
                    // Thursday
                    { offeringId: offerings[1]?.idx, periodId: 1, venueId: 1, dayOfWeek: 4, groupType: 'lecture', capacity: 150 },
                    { offeringId: offerings[5]?.idx, periodId: 2, venueId: 5, dayOfWeek: 4, groupType: 'lecture', capacity: 45 },
                    // Friday
                    { offeringId: offerings[2]?.idx, periodId: 1, venueId: 4, dayOfWeek: 5, groupType: 'practical', capacity: 30 },
                    { offeringId: offerings[3]?.idx, periodId: 2, venueId: 2, dayOfWeek: 5, groupType: 'lecture', capacity: 100 }
                ];
                slots.filter(s => s.offeringId).forEach(s => tt.slot.create({ data: s }));
            }

            console.log('[ApiDataAdapter] Timetable sample data loaded');
        }

        console.log('[ApiDataAdapter] All sample service data loaded');
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ApiDataAdapter = ApiDataAdapter;
}
