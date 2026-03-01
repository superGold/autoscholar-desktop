/**
 * ServiceBackend - API client for AutoScholar persistent services
 *
 * Connects to the Publon.Press unified API to persist service data:
 * - Diary entries, goals, check-ins
 * - Career profiles, skills, applications
 * - Concession requests
 * - Risk flags, interventions
 * - Attendance records
 * - Casework
 *
 * Supports two backend types:
 *   - PHP:  db-api.php (POST directly to URL)
 *   - Rust: /api/v1/query (POST to URL + /query)
 *
 * URL detection priority:
 *   1. Explicit config.apiUrl
 *   2. window.AS_CREDENTIALS.database.apiUrl (production)
 *   3. window.AS_CREDENTIALS.database.localApiUrl (dev)
 *   4. Auto-detect from hostname
 *
 * @module ServiceBackend
 * @version 1.1.0
 */

class ServiceBackend {
    /**
     * Create a ServiceBackend instance
     * @param {Object} config - Configuration options
     * @param {string} config.apiUrl - Base URL for the API (default: auto-detect)
     * @param {string} config.institutionCode - Institution code (e.g., 'DUT')
     */
    constructor(config = {}) {
        this.apiUrl = config.apiUrl || this._detectApiUrl();
        this.institutionCode = config.institutionCode ||
            (typeof window !== 'undefined' && window.AS_INSTITUTION?.institution?.code) || 'DUT';
        this.memberId = null;
        this.authToken = null;

        console.log(`[ServiceBackend] Initialized with API: ${this.apiUrl} (${this.institutionCode})`);
    }

    /**
     * Detect API URL from credentials or environment.
     * Priority: credentials.database.apiUrl → credentials.database.localApiUrl → hostname fallback
     */
    _detectApiUrl() {
        // 1. Check institution credentials (set by test rig or app)
        if (typeof window !== 'undefined' && window.AS_CREDENTIALS?.database) {
            const db = window.AS_CREDENTIALS.database;
            const hostname = window.location?.hostname || '';
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
            // Use localApiUrl for dev, apiUrl for production
            const url = isLocal ? (db.localApiUrl || db.apiUrl) : db.apiUrl;
            if (url) return url;
        }

        // 2. Fallback: detect from hostname
        const hostname = (typeof window !== 'undefined') ? window.location.hostname : 'localhost';
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8082/api/v1';
        } else if (hostname.includes('publon.press')) {
            return 'https://publon.press/api/v1';
        }
        return '/api/v1';
    }

    /**
     * Set authentication token for API calls
     * @param {string} token - JWT token
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Set current member ID (after login/linking)
     * @param {number} memberId - AutoScholar member ID
     */
    setMemberId(memberId) {
        this.memberId = memberId;
    }

    /**
     * Make an API request
     * @param {Object} body - Request body
     * @returns {Promise<Object>} API response
     */
    async _request(body) {
        // PHP endpoint (db-api.php) is called directly; Rust endpoint appends /query
        const url = this.apiUrl.endsWith('.php') ? this.apiUrl : `${this.apiUrl}/query`;
        console.log(`[ServiceBackend] _request to ${url}`, body);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        try {
            // Add timeout to catch hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log(`[ServiceBackend] Response status: ${response.status}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[ServiceBackend] Response data:`, data);

            if (data.status !== 'ok') {
                throw new Error(data.msg || 'API request failed');
            }

            return data;
        } catch (e) {
            console.error(`[ServiceBackend] Request failed:`, e);
            throw e;
        }
    }

    // ============================================================================
    // MEMBER MANAGEMENT
    // ============================================================================

    /**
     * Format date for PostgreSQL timestamp column
     */
    _formatTimestamp(date = new Date()) {
        // Format: YYYY-MM-DD HH:MM:SS (PostgreSQL compatible)
        return date.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
    }

    /**
     * Find or create a member by institution link
     * @param {string} studentNumber - Institution student number
     * @param {Object} profile - Profile data from institution
     * @returns {Promise<Object>} Member record
     */
    async findOrCreateMember(studentNumber, profile = {}) {
        // First, try to find existing member
        const existing = await this._request({
            action: 'read',
            tableName: 'as_member',
            where: {
                institutioncode: this.institutionCode,
                studentnumber: studentNumber
            }
        });

        if (existing.results && existing.results.length > 0) {
            const member = existing.results[0];
            this.memberId = member.idx;

            // Update last login (use lowercase column name for PostgreSQL)
            try {
                await this._request({
                    action: 'update',
                    tableName: 'as_member',
                    where: { idx: member.idx },
                    vals: { lastloginat: this._formatTimestamp() }
                });
            } catch (e) {
                console.warn('[ServiceBackend] Failed to update last login:', e.message);
            }

            console.log(`[ServiceBackend] Found existing member: ${member.idx}`);
            return member;
        }

        // Create new member (use lowercase column names)
        await this._request({
            action: 'create',
            tableName: 'as_member',
            vals: {
                institutioncode: this.institutionCode,
                studentnumber: studentNumber,
                firstname: profile.firstName || '',
                lastname: profile.lastName || '',
                email: profile.email || '',
                isactive: true,
                createdat: this._formatTimestamp(),
                lastloginat: this._formatTimestamp()
            }
        });

        // Fetch the created member to get the idx
        const created = await this._request({
            action: 'read',
            tableName: 'as_member',
            where: {
                institutioncode: this.institutionCode,
                studentnumber: studentNumber
            }
        });

        if (created.results && created.results.length > 0) {
            this.memberId = created.results[0].idx;
            console.log(`[ServiceBackend] Created new member: ${this.memberId}`);
            return created.results[0];
        }

        throw new Error('Failed to create member');
    }

    /**
     * Get current member profile
     */
    async getMember() {
        if (!this.memberId) {
            throw new Error('No member ID set');
        }

        const result = await this._request({
            action: 'read',
            tableName: 'as_member',
            where: { idx: this.memberId }
        });

        return result.results?.[0] || null;
    }

    // ============================================================================
    // GENERIC CRUD OPERATIONS
    // ============================================================================

    /**
     * Create a record in a service table
     * @param {string} table - Table name without 'as_' prefix (e.g., 'diaryEntry')
     * @param {Object} data - Record data
     */
    async create(table, data) {
        const tableName = table.startsWith('as_') ? table : `as_${table.toLowerCase()}`;

        // Auto-add memberId if not present
        if (!data.memberId && this.memberId) {
            data.memberId = this.memberId;
        }

        // Add timestamp
        if (!data.createdAt) {
            data.createdAt = new Date().toISOString();
        }

        const result = await this._request({
            action: 'create',
            tableName,
            vals: data
        });

        return result;
    }

    /**
     * Read records from a service table
     * @param {string} table - Table name without 'as_' prefix
     * @param {Object} where - Filter conditions
     * @param {Object} options - Additional options (limit, orderBy, etc.)
     */
    async read(table, where = {}, options = {}) {
        const tableName = table.startsWith('as_') ? table : `as_${table.toLowerCase()}`;

        // Auto-filter by memberId if not specified
        if (!where.memberId && this.memberId && !options.skipMemberFilter) {
            where.memberId = this.memberId;
        }

        const body = {
            action: 'read',
            tableName,
            where
        };

        if (options.limit) body.limit = options.limit;
        if (options.orderBy) body.orderBy = options.orderBy;
        if (options.orderDirection) body.orderDirection = options.orderDirection;

        const result = await this._request(body);
        return result.results || [];
    }

    /**
     * Update a record in a service table
     * @param {string} table - Table name without 'as_' prefix
     * @param {Object} where - Filter conditions
     * @param {Object} data - Fields to update
     */
    async update(table, where, data) {
        const tableName = table.startsWith('as_') ? table : `as_${table.toLowerCase()}`;

        // Add timestamp
        data.updatedAt = new Date().toISOString();

        const result = await this._request({
            action: 'update',
            tableName,
            where,
            vals: data
        });

        return result;
    }

    /**
     * Delete a record from a service table
     * @param {string} table - Table name without 'as_' prefix
     * @param {Object} where - Filter conditions
     */
    async delete(table, where) {
        const tableName = table.startsWith('as_') ? table : `as_${table.toLowerCase()}`;

        const result = await this._request({
            action: 'delete',
            tableName,
            where
        });

        return result;
    }

    // ============================================================================
    // DIARY SERVICE HELPERS
    // ============================================================================

    async getDiaryEntries(options = {}) {
        return this.read('diaryentry', {}, {
            orderBy: 'entryDate',
            orderDirection: 'DESC',
            ...options
        });
    }

    async createDiaryEntry(entry) {
        return this.create('diaryentry', entry);
    }

    async getGoals(status = 'active') {
        return this.read('diarygoal', { status });
    }

    async createGoal(goal) {
        return this.create('diarygoal', goal);
    }

    async updateGoalProgress(goalId, currentValue) {
        const update = { currentValue };

        // Check if goal is completed
        const goals = await this.read('diarygoal', { idx: goalId }, { skipMemberFilter: true });
        if (goals.length > 0 && goals[0].targetValue && currentValue >= goals[0].targetValue) {
            update.status = 'completed';
            update.completedAt = new Date().toISOString();
        }

        return this.update('diarygoal', { idx: goalId }, update);
    }

    // ============================================================================
    // CAREER SERVICE HELPERS
    // ============================================================================

    async getCareerProfile() {
        const profiles = await this.read('careerprofile', {});
        return profiles[0] || null;
    }

    async createOrUpdateCareerProfile(profile) {
        const existing = await this.getCareerProfile();

        if (existing) {
            return this.update('careerprofile', { idx: existing.idx }, profile);
        } else {
            return this.create('careerprofile', profile);
        }
    }

    async getCareerSkills() {
        const profile = await this.getCareerProfile();
        if (!profile) return [];

        return this.read('careerskill', { profileId: profile.idx }, { skipMemberFilter: true });
    }

    async addCareerSkill(skill) {
        const profile = await this.getCareerProfile();
        if (!profile) {
            throw new Error('Create a career profile first');
        }

        return this.create('careerskill', { ...skill, profileId: profile.idx });
    }

    async getCareerApplications() {
        return this.read('careerapplication', {}, {
            orderBy: 'appliedAt',
            orderDirection: 'DESC'
        });
    }

    async createCareerApplication(application) {
        return this.create('careerapplication', application);
    }

    // ============================================================================
    // CONCESSION SERVICE HELPERS
    // ============================================================================

    async getConcessions(status = null) {
        const where = status ? { status } : {};
        return this.read('concession', where, {
            orderBy: 'submittedAt',
            orderDirection: 'DESC'
        });
    }

    async createConcession(concession) {
        return this.create('concession', {
            ...concession,
            submittedAt: new Date().toISOString(),
            status: 'pending'
        });
    }

    async updateConcessionStatus(concessionId, status, reviewNotes = '', reviewerId = null) {
        return this.update('concession', { idx: concessionId }, {
            status,
            reviewNotes,
            reviewedBy: reviewerId,
            reviewedAt: new Date().toISOString()
        });
    }

    // ============================================================================
    // RISK SERVICE HELPERS
    // ============================================================================

    async getRiskFlags(activeOnly = true) {
        const where = activeOnly ? { isActive: true } : {};
        return this.read('riskflag', where, {
            orderBy: 'flaggedAt',
            orderDirection: 'DESC'
        });
    }

    async createRiskFlag(flag) {
        return this.create('riskflag', {
            ...flag,
            isActive: true,
            flaggedAt: new Date().toISOString()
        });
    }

    async resolveRiskFlag(flagId, resolutionNotes, resolvedBy) {
        return this.update('riskflag', { idx: flagId }, {
            isActive: false,
            resolvedAt: new Date().toISOString(),
            resolvedBy,
            resolutionNotes
        });
    }

    async createIntervention(intervention) {
        return this.create('intervention', {
            ...intervention,
            performedAt: new Date().toISOString()
        });
    }

    // ============================================================================
    // ATTENDANCE SERVICE HELPERS
    // ============================================================================

    async getAttendance(courseCode = null) {
        const where = courseCode ? { courseCode } : {};
        return this.read('attendance', where, {
            orderBy: 'eventDate',
            orderDirection: 'DESC'
        });
    }

    async recordAttendance(record) {
        return this.create('attendance', record);
    }

    // ============================================================================
    // GAMIFICATION HELPERS
    // ============================================================================

    async getGamificationStats() {
        const stats = await this.read('gamification', {});
        return stats[0] || null;
    }

    async updateGamificationStats(updates) {
        const existing = await this.getGamificationStats();

        if (existing) {
            return this.update('gamification', { idx: existing.idx }, updates);
        } else {
            return this.create('gamification', updates);
        }
    }

    async getBadges() {
        return this.read('badge', {});
    }

    async awardBadge(badgeCode, badgeName, description, reason) {
        // Check if already has this badge
        const existing = await this.read('badge', { badgeCode });
        if (existing.length > 0) {
            console.log(`[ServiceBackend] Badge ${badgeCode} already awarded`);
            return null;
        }

        return this.create('badge', {
            badgeCode,
            badgeName,
            badgeDescription: description,
            awardedFor: reason,
            awardedAt: new Date().toISOString()
        });
    }

    // ============================================================================
    // PROGRAMME STRUCTURE
    // ============================================================================

    /**
     * Get programme metadata by code
     * @param {string} programmeCode - Programme code (e.g., 'BNCME1')
     * @returns {Promise<Object|null>} Programme record or null
     */
    async getProgramme(programmeCode) {
        console.log(`[ServiceBackend] getProgramme(${programmeCode}) - calling API at ${this.apiUrl}/query`);
        try {
            const result = await this._request({
                action: 'read',
                tableName: 'as_programme',
                where: { programmecode: programmeCode }
            });
            console.log(`[ServiceBackend] getProgramme result:`, result);
            return result.results?.[0] || null;
        } catch (e) {
            console.error('[ServiceBackend] Failed to get programme:', e);
            return null;
        }
    }

    /**
     * Get programme structure (courses) by programme code
     * @param {string} programmeCode - Programme code
     * @returns {Promise<Object>} Structure data with meta, courses, and prerequisites
     */
    async getProgrammeStructure(programmeCode) {
        console.log(`[ServiceBackend] getProgrammeStructure(${programmeCode})`);
        try {
            // Get programme meta
            const programme = await this.getProgramme(programmeCode);
            console.log(`[ServiceBackend] Programme result:`, programme);
            if (!programme) {
                console.log(`[ServiceBackend] No programme found for ${programmeCode}`);
                return null;
            }

            // Get structure (courses)
            const structureResult = await this._request({
                action: 'read',
                tableName: 'as_programme_structure',
                where: { programmeid: programme.idx }
            });

            // Get prerequisites (optional - table may not exist)
            let prerequisites = [];
            try {
                const prereqResult = await this._request({
                    action: 'read',
                    tableName: 'as_prerequisite',
                    where: { programmeid: programme.idx }
                });
                prerequisites = prereqResult.results || [];
            } catch (e) {
                console.log('[ServiceBackend] Prerequisites table not available:', e.message);
            }

            return {
                meta: programme,
                structure: structureResult.results || [],
                prerequisites: prerequisites,
                status: programme.structuretype || 'verified'
            };
        } catch (e) {
            console.warn('[ServiceBackend] Failed to get programme structure:', e.message);
            return null;
        }
    }

    // ============================================================================
    // BATCH OPERATIONS
    // ============================================================================

    /**
     * Create multiple records in a single batch
     * Processes sequentially to avoid overwhelming the API
     * @param {string} table - Table name without 'as_' prefix
     * @param {Array<Object>} records - Array of record data
     * @param {Object} options - Options: onProgress callback
     * @returns {Promise<Object>} Results with success/failure counts
     */
    async batchCreate(table, records, options = {}) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < records.length; i++) {
            try {
                await this.create(table, records[i]);
                results.success++;

                if (options.onProgress) {
                    options.onProgress(i + 1, records.length, 'success');
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ index: i, error: error.message });

                if (options.onProgress) {
                    options.onProgress(i + 1, records.length, 'error');
                }
            }

            // Small delay to avoid overwhelming API
            if (i < records.length - 1) {
                await this._delay(50);
            }
        }

        console.log(`[ServiceBackend] batchCreate complete: ${results.success} success, ${results.failed} failed`);
        return results;
    }

    /**
     * Update multiple records in a batch
     * @param {string} table - Table name without 'as_' prefix
     * @param {Array<Object>} updates - Array of { where, data } objects
     * @param {Object} options - Options: onProgress callback
     * @returns {Promise<Object>} Results with success/failure counts
     */
    async batchUpdate(table, updates, options = {}) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < updates.length; i++) {
            try {
                const { where, data } = updates[i];
                await this.update(table, where, data);
                results.success++;

                if (options.onProgress) {
                    options.onProgress(i + 1, updates.length, 'success');
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ index: i, error: error.message });

                if (options.onProgress) {
                    options.onProgress(i + 1, updates.length, 'error');
                }
            }

            if (i < updates.length - 1) {
                await this._delay(50);
            }
        }

        console.log(`[ServiceBackend] batchUpdate complete: ${results.success} success, ${results.failed} failed`);
        return results;
    }

    /**
     * Read multiple records by IDs
     * @param {string} table - Table name without 'as_' prefix
     * @param {Array<number>} ids - Array of record IDs (idx values)
     * @returns {Promise<Array>} Array of records
     */
    async batchRead(table, ids) {
        // For small batches, do individual reads
        // A proper IN clause would need backend support
        const results = [];

        for (const id of ids) {
            try {
                const records = await this.read(table, { idx: id }, { skipMemberFilter: true });
                if (records.length > 0) {
                    results.push(records[0]);
                }
            } catch (error) {
                console.warn(`[ServiceBackend] Failed to read ${table} id ${id}:`, error.message);
            }
        }

        return results;
    }

    /**
     * Delay helper for batch operations
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================================================
    // ENHANCED ERROR HANDLING
    // ============================================================================

    /**
     * Make an API request with retry logic
     * @param {Object} body - Request body
     * @param {Object} options - Retry options: retries, retryDelay
     * @returns {Promise<Object>} API response
     */
    async _requestWithRetry(body, options = {}) {
        const { retries = 3, retryDelay = 1000 } = options;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await this._request(body);
            } catch (error) {
                const isRetryable = this._isRetryableError(error);

                if (attempt === retries || !isRetryable) {
                    throw this._enhanceError(error, body, attempt);
                }

                console.warn(`[ServiceBackend] Attempt ${attempt} failed, retrying in ${retryDelay * attempt}ms...`);
                await this._delay(retryDelay * attempt);
            }
        }
    }

    /**
     * Check if an error is retryable
     */
    _isRetryableError(error) {
        // Network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true;
        }

        // Abort/timeout errors
        if (error.name === 'AbortError') {
            return true;
        }

        // Server errors (5xx) are retryable
        if (error.message.includes('5') && error.message.includes('API error')) {
            return true;
        }

        // Rate limiting
        if (error.message.includes('429')) {
            return true;
        }

        return false;
    }

    /**
     * Enhance error with context information
     */
    _enhanceError(error, body, attempt = 1) {
        error.context = {
            table: body.tableName,
            action: body.action,
            attempt,
            timestamp: new Date().toISOString()
        };

        // Add user-friendly message
        if (error.name === 'AbortError') {
            error.userMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('fetch')) {
            error.userMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('401')) {
            error.userMessage = 'Session expired. Please log in again.';
        } else if (error.message.includes('403')) {
            error.userMessage = 'Access denied. You may not have permission for this action.';
        } else if (error.message.includes('5')) {
            error.userMessage = 'Server error. Please try again later.';
        } else {
            error.userMessage = 'An error occurred. Please try again.';
        }

        return error;
    }

    // ============================================================================
    // COURSE STATISTICS HELPERS
    // ============================================================================

    /**
     * Get pre-calculated course statistics
     * @param {string} courseCode - Course code
     * @param {number} year - Academic year
     * @param {Object} options - Optional: semester, assessmentCode
     * @returns {Promise<Object|null>} Statistics record
     */
    async getCourseStats(courseCode, year, options = {}) {
        const where = {
            institutioncode: this.institutionCode,
            coursecode: courseCode,
            year
        };

        if (options.semester) where.semester = options.semester;
        if (options.assessmentCode) where.assessmentcode = options.assessmentCode;

        const results = await this.read('course_stats', where, { skipMemberFilter: true });
        return results[0] || null;
    }

    /**
     * Get all course statistics for a year
     * @param {number} year - Academic year
     * @param {Object} options - Optional: semester
     * @returns {Promise<Array>} Statistics records
     */
    async getAllCourseStats(year, options = {}) {
        const where = {
            institutioncode: this.institutionCode,
            year
        };

        if (options.semester) where.semester = options.semester;

        return this.read('course_stats', where, { skipMemberFilter: true });
    }

    /**
     * Save or update course statistics
     * @param {Object} stats - Statistics object with courseCode, year, and computed values
     * @returns {Promise<Object>} Result of save operation
     */
    async saveCourseStats(stats) {
        // Validate required fields
        if (!stats.courseCode || !stats.year) {
            throw new Error('courseCode and year are required');
        }

        // Prepare record with lowercase column names for PostgreSQL
        const record = {
            institutioncode: this.institutionCode,
            coursecode: stats.courseCode,
            year: stats.year,
            semester: stats.semester || null,
            assessmentcode: stats.assessmentCode || null,
            studentcount: stats.studentCount || 0,
            mean: stats.mean || 0,
            standarddev: stats.standardDev || stats.stdDev || 0,
            median: stats.median || null,
            passcount: stats.passCount || 0,
            failcount: stats.failCount || 0,
            passrate: stats.passRate || 0,
            calculatedat: new Date().toISOString()
        };

        // Try to delete existing record first (upsert pattern)
        try {
            await this.delete('course_stats', {
                institutioncode: record.institutioncode,
                coursecode: record.coursecode,
                year: record.year,
                semester: record.semester,
                assessmentcode: record.assessmentcode
            });
        } catch (e) {
            // Ignore delete errors (record may not exist)
        }

        // Create new record
        return this.create('course_stats', record);
    }

    /**
     * Batch save course statistics
     * @param {Array} statsArray - Array of statistics objects
     * @param {Object} options - Options: onProgress callback
     * @returns {Promise<Object>} Results summary
     */
    async batchSaveCourseStats(statsArray, options = {}) {
        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < statsArray.length; i++) {
            try {
                await this.saveCourseStats(statsArray[i]);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({ index: i, error: error.message });
            }

            if (options.onProgress) {
                options.onProgress(i + 1, statsArray.length);
            }

            // Small delay to avoid overwhelming API
            if (i < statsArray.length - 1 && i % 10 === 0) {
                await this._delay(50);
            }
        }

        console.log(`[ServiceBackend] batchSaveCourseStats: ${results.success} saved, ${results.failed} failed`);
        return results;
    }

    /**
     * Get student's position in a course
     * @param {string} studentNumber - Student number
     * @param {string} courseCode - Course code
     * @param {number} year - Academic year
     * @returns {Promise<Object|null>} Position record
     */
    async getStudentPosition(studentNumber, courseCode, year) {
        const where = {
            institutioncode: this.institutionCode,
            studentnumber: studentNumber,
            coursecode: courseCode,
            year
        };

        const results = await this.read('student_position', where, { skipMemberFilter: true });
        return results[0] || null;
    }

    /**
     * Get student's positions in all courses for a year
     * @param {string} studentNumber - Student number
     * @param {number} year - Academic year
     * @returns {Promise<Array>} Position records
     */
    async getStudentPositions(studentNumber, year) {
        const where = {
            institutioncode: this.institutionCode,
            studentnumber: studentNumber,
            year
        };

        return this.read('student_position', where, { skipMemberFilter: true });
    }

    /**
     * Get percentile text for display (e.g., "Top 15%")
     * @param {string} studentNumber - Student number
     * @param {string} courseCode - Course code
     * @param {number} year - Academic year
     * @returns {Promise<string|null>} Percentile text
     */
    async getStudentRankText(studentNumber, courseCode, year) {
        const pos = await this.getStudentPosition(studentNumber, courseCode, year);
        if (!pos) return null;

        const percentile = Math.ceil(pos.percentile);
        if (percentile <= 10) return 'Top 10%';
        if (percentile <= 25) return 'Top 25%';
        if (percentile <= 50) return 'Top half';
        return `Bottom ${100 - percentile}%`;
    }

    // ============================================================================
    // HEALTH CHECK
    // ============================================================================

    /**
     * Check if the API is reachable
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        const start = Date.now();

        try {
            // PHP backend supports a dedicated health action with richer info
            if (this.apiUrl.endsWith('.php')) {
                const data = await this._request({ action: 'health' });
                return {
                    status: 'healthy',
                    latency: data.latency_ms || (Date.now() - start),
                    apiUrl: this.apiUrl,
                    tables: data.tables,
                    database: data.database,
                    backend: 'php'
                };
            }

            // Rust backend — simple read to test connectivity
            await this._request({
                action: 'read',
                tableName: 'as_member',
                limit: 1,
                where: { idx: -1 }
            });

            return {
                status: 'healthy',
                latency: Date.now() - start,
                apiUrl: this.apiUrl,
                backend: 'rust'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                latency: Date.now() - start,
                apiUrl: this.apiUrl
            };
        }
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.ServiceBackend = ServiceBackend;
}
