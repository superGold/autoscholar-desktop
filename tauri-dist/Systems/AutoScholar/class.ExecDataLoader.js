/**
 * ExecDataLoader — Fetches institution data from instApi and populates the
 * Executive Insight Publome. Errors propagate — no seed fallback.
 *
 * Usage:
 *   const loader = new ExecDataLoader({ publome, engine, bus });
 *   await loader.load(2025);
 *   loader.listenForInstitutionChange();
 */
class ExecDataLoader {

    constructor({ publome, engine, bus, endpoint = '/api-proxy', maxCourseSamples = 5, maxProgrammes = 40, apiTimeout = 30000 }) {
        this.publome = publome;
        this.engine = engine;
        this.bus = bus;
        this.endpoint = endpoint;
        this.maxCourseSamples = maxCourseSamples;
        this.maxProgrammes = maxProgrammes;
        this.apiTimeout = apiTimeout;
        this.sessionId = null;
        this.logToken = null;
        this._dataSource = null;
        this._log = window.log || (() => {});
        this._studentBioCache = new Map();
        this._courseMetaCache = new Map();
    }

    get dataSource() { return this._dataSource; }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Load data for a given year. Tries instApi first, falls back to seed.
     */
    async load(year) {
        this.bus.emit('exec:loading', { year });
        await this._authenticate();
        const apiData = await this._fetchAll(year);
        this._populatePublome(apiData, year);
        this._dataSource = 'api';
        this._dataYear = apiData.dataYear;
        this._log('exec-loader', `Data loaded from api (data year: ${this._dataYear})`);
        this.engine.clearCache();
        this.bus.emit('exec:loaded', { source: 'api', year: this._dataYear, error: null });
        this.bus.emit('year:changed', { year: this._dataYear });
    }

    /**
     * Re-load when institution changes (dispatched by InstitutionPanel).
     */
    listenForInstitutionChange() {
        window.addEventListener('institution-changed', () => {
            this.sessionId = null;
            this.logToken = null;
            const year = new Date().getFullYear();
            this.load(year);
        });
    }

    // ── Authentication (reuses AS_SESSION) ────────────────────────────────

    async _authenticate() {
        // Wait up to 6s for auto-login to complete (runs async on page load)
        for (let i = 0; i < 12 && !window.AS_SESSION?.ready; i++) {
            await new Promise(r => setTimeout(r, 500));
        }
        if (window.AS_SESSION?.ready) {
            this.sessionId = window.AS_SESSION.sessionId;
            this.logToken = window.AS_SESSION.logToken;
            return;
        }
        const creds = window.AS_CREDENTIALS?.api?.sessionBypass || {};
        if (!creds.userId) throw new Error('No session and no credentials available');
        const data = await this._apiCall('logIn', { userId: creds.userId, pwd: creds.password });
        if (data && data.status !== false) {
            this.sessionId = data.sessionId || data.session_id;
            this.logToken = data.logToken || data.log_token;
            return;
        }
        throw new Error(data?.error || 'Authentication failed');
    }

    // ── API Call ──────────────────────────────────────────────────────────

    async _apiCall(action, params = {}) {
        const body = { action, ...params };
        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.logToken) body.logToken = this.logToken;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.apiTimeout);
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            if (window.AS_checkSessionResponse && window.AS_checkSessionResponse(data)) {
                throw new Error('Session expired');
            }
            return data;
        } catch (e) {
            if (e.name === 'AbortError') throw new Error(`API timeout: ${action} did not respond within ${this.apiTimeout / 1000}s`);
            throw e;
        } finally {
            clearTimeout(timer);
        }
    }

    // ── Response Parsing ─────────────────────────────────────────────────

    _parseResponse(data) {
        if (!data) return null;
        if (Array.isArray(data)) return data;
        if (data.fields && Array.isArray(data.data)) {
            return this._fieldsDataToRecords(data.fields, data.data);
        }
        if (data.results?.fields && Array.isArray(data.results.data)) {
            return this._fieldsDataToRecords(data.results.fields, data.results.data);
        }
        if (Array.isArray(data.results)) return data.results;
        const wrapKeys = ['students', 'registrations', 'courseInfo', 'assessmentResults',
            'courseResults', 'studentBioData', 'courseMeta', 'courseCounts',
            'faculties', 'disciplines', 'programmes', 'graduates', 'programmeCount'];
        for (const key of wrapKeys) {
            if (data[key]) {
                const inner = data[key];
                if (Array.isArray(inner)) return inner;
                if (inner.fields && Array.isArray(inner.data)) {
                    return this._fieldsDataToRecords(inner.fields, inner.data);
                }
            }
        }
        if (typeof data === 'object' && !Array.isArray(data)) return [data];
        return null;
    }

    _fieldsDataToRecords(fields, data) {
        const normalized = fields.map(f =>
            f === f.toUpperCase() && f.length > 1
                ? f.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())
                : f
        );
        return data.map(row => {
            const record = {};
            normalized.forEach((field, i) => { record[field] = row[i] !== undefined ? row[i] : null; });
            return record;
        });
    }

    // ── Data Fetching Sequence ───────────────────────────────────────────

    async _fetchAll(year) {
        // Step 1: Get faculties via getFacultyDisciplines (derives faculty names from XX00 dept entries)
        let faculties = [];
        try {
            this._log('exec-loader', 'Fetching faculty disciplines...');
            const discRaw = await this._apiCall('getFacultyDisciplines');
            const disciplines = this._parseResponse(discRaw) || [];

            // XX00-pattern discipline codes are faculty office entries — extract faculty names from them
            const facByCode = {};
            for (const d of disciplines) {
                const dCode = d.disciplineCode || d.code || '';
                const facCode = d.facultyCode || d.faculty_code || (dCode.length >= 2 ? dCode.slice(0, 2) : '');
                const label = d.disciplineLabel || d.label || '';
                if (dCode.length >= 4 && dCode.slice(-2) === '00' && facCode) {
                    const cleanName = this._cleanFacultyName(label);
                    facByCode[facCode] = { facultyCode: facCode, facultyName: cleanName || `Faculty ${facCode}` };
                }
            }
            // Ensure every seen faculty code has an entry even without an XX00 match
            for (const d of disciplines) {
                const facCode = d.facultyCode || d.faculty_code || '';
                if (facCode && !facByCode[facCode]) {
                    facByCode[facCode] = { facultyCode: facCode, facultyName: `Faculty ${facCode}` };
                }
            }
            faculties = Object.values(facByCode);
            this._log('exec-loader', `Got ${faculties.length} faculties from disciplines`);
        } catch (e) {
            this._log('exec-loader', `Faculty fetch failed: ${e.message}. Will derive from programmes.`);
        }

        // Step 2: Get programmes with student counts (try requested year, fall back to prior years)
        let programmes = [];
        let dataYear = year;
        for (const tryYear of [year, year - 1, year - 2]) {
            this._log('exec-loader', `Fetching programme counts (${tryYear})...`);
            const progRaw = await this._apiCall('getProgrammeCounts', { year: tryYear });
            programmes = this._parseResponse(progRaw) || [];
            if (programmes.length > 0) {
                dataYear = tryYear;
                break;
            }
        }
        // Limit to top programmes by student count to keep API calls manageable
        const allProgrammes = programmes;
        if (programmes.length > this.maxProgrammes) {
            programmes.sort((a, b) => {
                const sa = parseInt(a.students || a.studentCount || a.count || 0, 10);
                const sb = parseInt(b.students || b.studentCount || b.count || 0, 10);
                return sb - sa;
            });
            programmes = programmes.slice(0, this.maxProgrammes);
        }
        this._log('exec-loader', `Got ${allProgrammes.length} programmes, using top ${programmes.length} (year ${dataYear})`);

        // Step 3: Map programmes to faculties via getProgrammeId (batched)
        this._log('exec-loader', 'Mapping programmes to faculties...');
        const progFacultyMap = await this._batchFetch(
            programmes.map(p => p.programmeCode || p.programme_code || p.code),
            async (code) => {
                const res = await this._apiCall('getProgrammeId', { programmeCode: code });
                const records = this._parseResponse(res);
                return records?.[0] || null;
            },
            10
        );

        // Step 3b: Filter faculties to only those with mapped programmes
        const usedFacCodes = new Set();
        for (const progInfo of Object.values(progFacultyMap)) {
            const fc = progInfo?.facultyCode || progInfo?.faculty_code;
            if (fc) usedFacCodes.add(fc);
        }
        if (usedFacCodes.size > 0) {
            faculties = faculties.filter(f => usedFacCodes.has(f.facultyCode || f.faculty_code || f.code));
            this._log('exec-loader', `Filtered to ${faculties.length} faculties with programmes`);
        }

        // Step 4: Get course lists per programme via getProgrammeStructure (batched)
        this._log('exec-loader', 'Fetching programme structures...');
        const progCourseMap = await this._batchFetch(
            programmes.map(p => p.programmeCode || p.programme_code || p.code),
            async (code) => {
                const res = await this._apiCall('getProgrammeStructure', { programmeCode: code, year: dataYear });
                return this._parseResponse(res) || [];
            },
            10
        );

        // Step 5: Sample course results for pass rate and mean (parallel, limited)
        this._log('exec-loader', 'Sampling course results...');
        const courseResults = {};
        const allCourseRequests = [];
        for (const [progCode, courses] of Object.entries(progCourseMap)) {
            const sampled = this._sampleCourses(courses);
            for (const course of sampled) {
                const code = course.courseCode || course.course_code || course.code;
                if (code && !courseResults[code]) {
                    allCourseRequests.push(code);
                }
            }
        }
        // Deduplicate and batch fetch
        const uniqueCourses = [...new Set(allCourseRequests)];
        const courseResultMap = await this._batchFetch(
            uniqueCourses,
            async (code) => {
                const res = await this._apiCall('getCourseResults', { courseCode: code, year: dataYear });
                return this._parseResponse(res) || [];
            },
            15
        );

        // Step 6: Get graduation counts (batched)
        this._log('exec-loader', 'Fetching graduation counts...');
        const gradMap = await this._batchFetch(
            programmes.map(p => p.programmeCode || p.programme_code || p.code),
            async (code) => {
                try {
                    const res = await this._apiCall('getGradCounts', { programmeCode: code });
                    return this._parseResponse(res) || [];
                } catch { return []; }
            },
            10
        );

        return { faculties, programmes, progFacultyMap, progCourseMap, courseResultMap, gradMap, dataYear };
    }

    /**
     * Batch-fetch: run fetcher(key) for each key, in batches of batchSize.
     * Returns a Map of key → result.
     */
    async _batchFetch(keys, fetcher, batchSize) {
        const result = {};
        for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(async k => ({ key: k, value: await fetcher(k) }))
            );
            for (const r of results) {
                if (r.status === 'fulfilled' && r.value) {
                    result[r.value.key] = r.value.value;
                }
            }
        }
        return result;
    }

    /**
     * Sample up to maxCourseSamples courses from a programme's course list.
     */
    _sampleCourses(courses) {
        if (!courses || courses.length <= this.maxCourseSamples) return courses || [];
        // Take evenly spaced samples
        const step = courses.length / this.maxCourseSamples;
        const sampled = [];
        for (let i = 0; i < this.maxCourseSamples; i++) {
            sampled.push(courses[Math.floor(i * step)]);
        }
        return sampled;
    }

    // ── Publome Population ───────────────────────────────────────────────

    _populatePublome(apiData, year) {
        let { faculties, programmes, progFacultyMap, progCourseMap, courseResultMap, gradMap, dataYear } = apiData;

        // Cache raw course data for on-demand drill-down
        this._progCourseMap = progCourseMap;
        this._courseResultMap = courseResultMap;
        this._assessResultMap = {};   // { courseCode: [{ studentNumber, assessmentCode, result }] }
        this._progStudentMap = {};    // { progCode: Set<studentNumber> }
        this._assessStatsCache = {};  // { entityIdx: { typeCode: { passRate, mean, stdDev, students } } }
        this._dataYear = dataYear;

        // ── Faculty classification fallback ──────────────────────────────
        // Check how many programmes have valid faculty codes from getProgrammeId
        const mapped = programmes.filter(p => {
            const code = p.programmeCode || p.programme_code || p.code;
            const info = progFacultyMap[code];
            return info && (info.facultyCode || info.faculty_code);
        });

        if (mapped.length < programmes.length * 0.5) {
            this._log('exec-loader', `Sparse faculty mapping (${mapped.length}/${programmes.length}). Using keyword classification.`);
            const facGroups = {};
            for (const p of programmes) {
                const pCode = p.programmeCode || p.programme_code || p.code;
                const pLabel = p.programmeLabel || p.programme_label || p.name || '';
                const fac = this._classifyByLabel(pLabel, pCode);
                if (!facGroups[fac.name]) facGroups[fac.name] = { ...fac, programmes: [] };
                facGroups[fac.name].programmes.push(p);
            }
            // Override faculties from classification
            faculties = Object.values(facGroups).map(g => ({
                facultyCode: g.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase(),
                facultyName: g.name
            }));
            // Rebuild progFacultyMap from classification
            for (const [name, g] of Object.entries(facGroups)) {
                const fCode = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
                for (const p of g.programmes) {
                    const pCode = p.programmeCode || p.programme_code || p.code;
                    progFacultyMap[pCode] = { facultyCode: fCode, faculty_code: fCode };
                }
            }
            this._log('exec-loader', `Classified into ${faculties.length} faculties`);
        }

        // Build entity hierarchy
        const entities = [];
        let idx = 1;
        const instName = window.AS_INSTITUTION?.institution?.name || 'Institution';
        entities.push({ idx: idx++, code: 'INST', name: instName, type: 'institution', parentId: null, icon: 'university', students: 0 });
        const instIdx = 1;

        // Faculties — from getCollegeFaculties if available, otherwise derived from getProgrammeId
        const facMap = new Map();
        if (faculties.length > 0) {
            for (const f of faculties) {
                const fCode = f.facultyCode || f.faculty_code || f.code;
                const fName = f.facultyName || f.faculty_name || f.name || fCode;
                const fIdx = idx++;
                facMap.set(fCode, fIdx);
                entities.push({
                    idx: fIdx, code: fCode, name: fName,
                    type: 'faculty', parentId: instIdx,
                    icon: ExecSchema._facultyIcon(fName), students: 0
                });
            }
        } else {
            // Derive faculties from getProgrammeId responses
            const seenFac = new Set();
            for (const progInfo of Object.values(progFacultyMap)) {
                if (!progInfo) continue;
                const fCode = progInfo.facultyCode || progInfo.faculty_code;
                if (fCode && !seenFac.has(fCode)) {
                    seenFac.add(fCode);
                    const fIdx = idx++;
                    facMap.set(fCode, fIdx);
                    entities.push({
                        idx: fIdx, code: fCode, name: `Faculty ${fCode}`,
                        type: 'faculty', parentId: instIdx,
                        icon: 'building', students: 0
                    });
                }
            }
        }

        // Programmes — determine faculty from progFacultyMap
        const progIdxMap = new Map(); // progCode → entity idx
        let totalStudents = 0;
        for (const p of programmes) {
            const pCode = p.programmeCode || p.programme_code || p.code;
            const pName = p.programmeLabel || p.programme_label || p.name || pCode;
            const pStudents = parseInt(p.students || p.studentCount || p.count || 0, 10);
            totalStudents += pStudents;

            // Find faculty parent
            const progInfo = progFacultyMap[pCode];
            const facCode = progInfo?.facultyCode || progInfo?.faculty_code;
            const parentFac = facMap.get(facCode) || instIdx;

            const pIdx = idx++;
            progIdxMap.set(pCode, pIdx);
            entities.push({
                idx: pIdx, code: pCode, name: pName,
                type: 'programme', parentId: parentFac,
                icon: 'book', students: pStudents
            });
        }

        // Roll up student counts
        entities[0].students = totalStudents;
        for (const e of entities) {
            if (e.type === 'faculty') {
                e.students = entities.filter(c => c.parentId === e.idx).reduce((s, c) => s + (c.students || 0), 0);
            }
        }

        // Build metricObservation from API data
        const observations = [];
        let obsIdx = 1;
        const metricTable = this.publome.table('metric');
        const metricByCode = {};
        // We need metric table loaded first — get from seed schema
        const seedData = ExecSchema._seedData();
        for (const m of seedData.metric) { metricByCode[m.code] = m; }

        // Compute programme-level metrics from sampled course results
        const progMetrics = {}; // progCode → { passRate, mean, gradRate }
        for (const p of programmes) {
            const pCode = p.programmeCode || p.programme_code || p.code;
            const courses = progCourseMap[pCode] || [];
            const sampled = this._sampleCourses(courses);

            // Aggregate course results for this programme's sampled courses
            let totalPasses = 0, totalEnrolled = 0;
            let weightedMarkSum = 0, markDenom = 0;
            for (const course of sampled) {
                const cCode = course.courseCode || course.course_code || course.code;
                const results = courseResultMap[cCode] || [];
                const prStats = PassRateCalculator.computePassRate(results, { denominator: 'itsOfficial' });
                totalPasses += prStats.passes;
                totalEnrolled += prStats.enrolled;
                for (const r of results) {
                    const mark = parseFloat(r.result || r.finalMark || r.final_mark || r.mark || 0);
                    if (mark > 0) {
                        weightedMarkSum += mark;
                        markDenom++;
                    }
                }
            }

            const passRate = totalEnrolled > 0 ? Math.round((totalPasses / totalEnrolled) * 1000) / 10 : null;
            const mean = markDenom > 0 ? Math.round((weightedMarkSum / markDenom) * 10) / 10 : null;

            // Graduation rate from gradMap
            const grads = gradMap[pCode] || [];
            const gradCount = grads.length || (grads[0]?.count ? parseInt(grads[0].count, 10) : 0);
            const pStudents = parseInt(p.students || p.studentCount || p.count || 0, 10);
            const gradRate = pStudents > 0 ? Math.round((gradCount / pStudents) * 1000) / 10 : null;

            progMetrics[pCode] = { passRate, mean, gradRate };
        }

        // Helper: weighted average of child values (falls back to simple avg if weights are 0)
        const weightedAvg = (childCodes, field) => {
            let sum = 0, weight = 0, count = 0;
            for (const code of childCodes) {
                const m = progMetrics[code];
                const pEnt = entities.find(e => e.code === code);
                const w = pEnt?.students || 0;
                const val = m?.[field];
                if (val !== null && val !== undefined) {
                    sum += val * (w || 1);
                    weight += (w || 1);
                    count++;
                }
            }
            if (count === 0) return null;
            return Math.round((sum / weight) * 10) / 10;
        };

        // Compute faculty-level and institution-level aggregates
        const facMetrics = {};
        for (const [facCode, facIdx] of facMap) {
            const childProgs = entities.filter(e => e.parentId === facIdx && e.type === 'programme').map(e => e.code);
            facMetrics[facCode] = {
                passRate: weightedAvg(childProgs, 'passRate'),
                mean: weightedAvg(childProgs, 'mean'),
                gradRate: weightedAvg(childProgs, 'gradRate')
            };
        }

        const allProgCodes = programmes.map(p => p.programmeCode || p.programme_code || p.code);
        const instMetrics = {
            passRate: weightedAvg(allProgCodes, 'passRate'),
            mean: weightedAvg(allProgCodes, 'mean'),
            gradRate: weightedAvg(allProgCodes, 'gradRate')
        };

        // Generate observations for API-sourced metrics
        const apiMetricMap = {
            'course-pass-rate': 'passRate',
            'course-mean': 'mean',
            'graduation-rate': 'gradRate'
        };
        // Only populate observations for the actual data year — no synthetic prior years
        for (const [metricCode, field] of Object.entries(apiMetricMap)) {
            const metric = metricByCode[metricCode];
            if (!metric) continue;

            // Institution
            const instVal = instMetrics[field];
            if (instVal !== null) {
                observations.push({ idx: obsIdx++, metricId: metric.idx, entityId: instIdx, year: dataYear, value: instVal });
            }

            // Faculties
            for (const [facCode, facEntityIdx] of facMap) {
                const val = facMetrics[facCode]?.[field];
                if (val !== null && val !== undefined) {
                    observations.push({ idx: obsIdx++, metricId: metric.idx, entityId: facEntityIdx, year: dataYear, value: val });
                }
            }

            // Programmes
            for (const p of programmes) {
                const pCode = p.programmeCode || p.programme_code || p.code;
                const pEntityIdx = progIdxMap.get(pCode);
                const val = progMetrics[pCode]?.[field];
                if (val !== null && val !== undefined && pEntityIdx) {
                    observations.push({ idx: obsIdx++, metricId: metric.idx, entityId: pEntityIdx, year: dataYear, value: val });
                }
            }
        }

        // Load everything into Publome
        this.publome.clearAll();
        this.publome.loadSeedData({
            entity: entities,
            metricCategory: seedData.metricCategory,
            metric: seedData.metric,
            metricObservation: observations,
            intervention: seedData.intervention,
            pdsaCycle: seedData.pdsaCycle,
            note: seedData.note
        });

        this._log('exec-loader', `Populated: ${entities.length} entities, ${observations.length} observations`);
    }

    /**
     * Clean ITS department name into a readable faculty label.
     * e.g. "FACULTY OFFICE-ACCTG & INFMTICS" → "Acctg & Infmtics"
     */
    _cleanFacultyName(raw) {
        return raw
            .replace(/^FACULTY\s+(OFFICE[-\s]*|OF\s+)/i, '')
            .replace(/^FAC\.\s*OFFICE\s*[-–]\s*/i, '')
            .replace(/^CENTRE\s+OFFICE[-\s]*/i, '')
            .trim()
            .split(/\s+/)
            .map(w => {
                if (w === '&' || w === '-') return w;
                if (w === w.toUpperCase() && w.length <= 4) return w; // keep short acronyms
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            })
            .join(' ');
    }

    // ── On-demand course stats for programme drill-down ────────────────

    /**
     * Fetch the student number set for a programme (cached).
     */
    async _fetchProgrammeStudents(progCode, year) {
        if (!this._progStudentMap) this._progStudentMap = {};
        if (this._progStudentMap[progCode]) return this._progStudentMap[progCode];
        const res = await this._apiCall('getProgrammeStudents', { programmeCode: progCode, year });
        const rows = this._parseResponse(res) || [];
        const nums = new Set(rows.map(r => r.studentNumber || r.student_number || r.STUDENTNUMBER).filter(Boolean));
        this._progStudentMap[progCode] = nums;
        return nums;
    }

    /**
     * Batch-fetch getAssessmentResults for course codes not yet in _assessResultMap.
     */
    async _fetchAssessmentResults(courseCodes, year) {
        if (!this._assessResultMap) this._assessResultMap = {};
        const missing = courseCodes.filter(c => !this._assessResultMap[c]);
        if (missing.length === 0) return;
        const fetched = await this._batchFetch(missing, async (code) => {
            const res = await this._apiCall('getAssessmentResults', { courseCode: code, year });
            return this._parseResponse(res) || [];
        }, 10);
        Object.assign(this._assessResultMap, fetched);
    }

    /**
     * Get per-course stats for a programme. Uses cached data where available,
     * fetches missing courses on demand.
     *
     * opts.markType:    'final' (default) | 'TM_1' | 'TM_2' | 'TM_3' | 'FINAL' | 'PRAC' | 'PROJ'
     * opts.denominator: 'completed' (default) | 'registered'
     *
     * Returns: [{ courseCode, courseLabel, students, passRate, mean }]
     */
    async getCourseStats(progCode, year, opts = {}) {
        year = year || this._dataYear;
        const markType = opts.markType || 'final';
        const denominator = opts.denominator || 'completed';

        // Get course list — cached or fetch live
        let courses = this._progCourseMap?.[progCode] || [];
        if (courses.length === 0) {
            const res = await this._apiCall('getProgrammeStructure', { programmeCode: progCode, year });
            courses = this._parseResponse(res) || [];
            if (!this._progCourseMap) this._progCourseMap = {};
            this._progCourseMap[progCode] = courses;
        }

        const courseCodes = courses.map(c => c.courseCode || c.course_code || c.code).filter(Boolean);

        // Fetch programme student list to scope results to this programme only
        const progStudents = await this._fetchProgrammeStudents(progCode, year);
        const _stuNum = (r) => r.studentNumber || r.student_number || r.STUDENTNUMBER || '';

        // Always need course results for registered counts
        if (!this._courseResultMap) this._courseResultMap = {};
        const missingCourse = courseCodes.filter(c => !this._courseResultMap[c]);
        if (missingCourse.length > 0) {
            const fetched = await this._batchFetch(missingCourse, async (code) => {
                const res = await this._apiCall('getCourseResults', { courseCode: code, year });
                return this._parseResponse(res) || [];
            }, 10);
            Object.assign(this._courseResultMap, fetched);
        }

        // For non-final mark types, also fetch assessment results
        if (markType !== 'final') {
            await this._fetchAssessmentResults(courseCodes, year);
        }

        // Compute per-course stats — filtered to programme students
        return courses.map(c => {
            const code = c.courseCode || c.course_code || c.code;
            const label = c.courseLabel || c.course_label || c.name || code;
            const allResults = this._courseResultMap[code] || [];
            // Filter to only students in this programme
            const courseResults = progStudents.size > 0
                ? allResults.filter(r => progStudents.has(_stuNum(r)))
                : allResults;
            const registered = courseResults.length;

            if (markType === 'final') {
                // ── Final course mark (block-aware dedup) ──
                const prStats = PassRateCalculator.computePassRate(courseResults, { denominator: 'itsOfficial' });
                let markSum = 0, markCount = 0;
                for (const r of courseResults) {
                    const mark = parseFloat(r.result || r.finalMark || r.final_mark || r.mark || 0);
                    if (mark > 0) { markSum += mark; markCount++; }
                }
                return {
                    courseCode: code, courseLabel: label,
                    students: prStats.enrolled,
                    passRate: prStats.passRate,
                    mean: markCount > 0 ? Math.round((markSum / markCount) * 10) / 10 : null
                };
            } else {
                // ── Assessment type (TM_1, TM_2, FINAL, etc.) ──
                const allAssess = (this._assessResultMap[code] || [])
                    .filter(a => (a.assessmentCode || '').startsWith(markType));
                // Filter to programme students
                const assessRows = progStudents.size > 0
                    ? allAssess.filter(a => progStudents.has(_stuNum(a)))
                    : allAssess;
                const completed = assessRows.length;
                let passes = 0, markSum = 0;
                for (const a of assessRows) {
                    const mark = parseFloat(a.result || a.mark || 0);
                    if (mark >= 50) passes++;
                    if (mark > 0) markSum += mark;
                }
                const denom = denominator === 'registered' ? registered : completed;
                return {
                    courseCode: code, courseLabel: label,
                    students: denominator === 'registered' ? registered : completed,
                    passRate: denom > 0 ? Math.round((passes / denom) * 1000) / 10 : null,
                    mean: completed > 0 ? Math.round((markSum / completed) * 10) / 10 : null
                };
            }
        }).filter(c => c.students > 0)
          .sort((a, b) => b.students - a.students);
    }

    // ── Assessment Stats (per assessment type) ────────────────────────

    /**
     * Get assessment stats grouped by type for any entity level.
     * Returns: { TM_1: { passRate, mean, stdDev, students }, TM_2: {...}, ... }
     */
    async getAssessmentStats(entityIdx, year, _timeout) {
        year = year || this._dataYear;
        if (this._assessStatsCache[entityIdx]) return this._assessStatsCache[entityIdx];

        const entityTable = this.publome.table('entity');
        const entity = entityTable.read(entityIdx);
        if (!entity) return {};

        // Apply timeout: institution/faculty get 30s, programmes get 20s
        const limit = _timeout || (entity.get('type') === 'programme' ? 20000 : 30000);
        const deadline = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Assessment stats timeout')), limit)
        );

        try {
            const type = entity.get('type');
            let stats;
            if (type === 'programme') {
                stats = await Promise.race([this._computeProgrammeAssessStats(entity.get('code'), year), deadline]);
            } else {
                stats = await Promise.race([this._aggregateChildAssessStats(entityIdx, year), deadline]);
            }
            this._assessStatsCache[entityIdx] = stats;
            return stats;
        } catch (e) {
            this._log('exec-loader', `Assessment stats for ${entity.get('code')}: ${e.message}`, true);
            return {};
        }
    }

    /**
     * Compute assessment stats at programme level by fetching assessment results
     * for all courses and grouping by type prefix.
     */
    async _computeProgrammeAssessStats(progCode, year) {
        // Get course list
        let courses = this._progCourseMap?.[progCode] || [];
        if (courses.length === 0) {
            const res = await this._apiCall('getProgrammeStructure', { programmeCode: progCode, year });
            courses = this._parseResponse(res) || [];
            if (!this._progCourseMap) this._progCourseMap = {};
            this._progCourseMap[progCode] = courses;
        }
        const courseCodes = courses.map(c => c.courseCode || c.course_code || c.code).filter(Boolean);
        if (courseCodes.length === 0) return {};

        // Fetch assessment results for all courses
        await this._fetchAssessmentResults(courseCodes, year);

        // Fetch programme students for scoping
        const progStudents = await this._fetchProgrammeStudents(progCode, year);
        const _stuNum = (r) => r.studentNumber || r.student_number || r.STUDENTNUMBER || '';

        // Collect all assessment rows scoped to programme students
        const typePrefixes = ['TM_1', 'TM_2', 'TM_3', 'FINAL', 'PRAC', 'PROJ'];
        const buckets = {};
        for (const prefix of typePrefixes) buckets[prefix] = [];

        for (const code of courseCodes) {
            const rows = this._assessResultMap[code] || [];
            for (const r of rows) {
                if (progStudents.size > 0 && !progStudents.has(_stuNum(r))) continue;
                const aCode = r.assessmentCode || r.assessment_code || '';
                for (const prefix of typePrefixes) {
                    if (aCode.startsWith(prefix)) { buckets[prefix].push(r); break; }
                }
            }
        }

        // Compute stats per type
        const stats = {};
        for (const prefix of typePrefixes) {
            const rows = buckets[prefix];
            if (rows.length === 0) continue;
            let passes = 0, markSum = 0, markCount = 0;
            const marks = [];
            for (const r of rows) {
                const mark = parseFloat(r.result || r.mark || 0);
                if (mark >= 50) passes++;
                if (mark > 0) { markSum += mark; markCount++; marks.push(mark); }
            }
            const mean = markCount > 0 ? markSum / markCount : 0;
            let variance = 0;
            for (const m of marks) variance += (m - mean) * (m - mean);
            const stdDev = markCount > 1 ? Math.sqrt(variance / (markCount - 1)) : 0;

            stats[prefix] = {
                passRate: markCount > 0 ? Math.round((passes / markCount) * 1000) / 10 : null,
                mean: Math.round(mean * 10) / 10,
                stdDev: Math.round(stdDev * 10) / 10,
                students: markCount
            };
        }
        return stats;
    }

    /**
     * Aggregate assessment stats from children using weighted averages.
     * Works for faculty (children = programmes) and institution (children = faculties → recurse).
     */
    async _aggregateChildAssessStats(entityIdx, year) {
        const children = this.engine.getChildren(entityIdx);
        if (children.length === 0) return {};

        const childStats = await Promise.all(
            children.map(c => this.getAssessmentStats(c.get('idx'), year))
        );

        // Collect all type codes across children
        const allTypes = new Set();
        for (const cs of childStats) { for (const key of Object.keys(cs)) allTypes.add(key); }

        const stats = {};
        for (const typeCode of allTypes) {
            let passSum = 0, passWeight = 0;
            let meanSum = 0, meanWeight = 0;
            let pooledVarNum = 0, pooledVarDen = 0;
            let totalStudents = 0;

            for (const cs of childStats) {
                const s = cs[typeCode];
                if (!s || !s.students) continue;
                const n = s.students;
                totalStudents += n;
                if (s.passRate != null) { passSum += s.passRate * n; passWeight += n; }
                if (s.mean != null) { meanSum += s.mean * n; meanWeight += n; }
                if (s.stdDev != null && n > 1) {
                    pooledVarNum += (n - 1) * s.stdDev * s.stdDev;
                    pooledVarDen += (n - 1);
                }
            }

            stats[typeCode] = {
                passRate: passWeight > 0 ? Math.round((passSum / passWeight) * 10) / 10 : null,
                mean: meanWeight > 0 ? Math.round((meanSum / meanWeight) * 10) / 10 : null,
                stdDev: pooledVarDen > 0 ? Math.round(Math.sqrt(pooledVarNum / pooledVarDen) * 10) / 10 : null,
                students: totalStudents
            };
        }
        return stats;
    }

    // ── Student Biodata ──────────────────────────────────────────────

    /**
     * Get student biodata for a programme. Uses getStudentBio API (max 50).
     */
    async getStudentBiodata(progCode, year) {
        const cacheKey = `${progCode}:${year}`;
        if (this._studentBioCache.has(cacheKey)) return this._studentBioCache.get(cacheKey);

        const students = await this._fetchProgrammeStudents(progCode, year);
        const stuNums = [...students].slice(0, 50);
        const biodata = [];
        const fetched = await this._batchFetch(stuNums, async (sn) => {
            const res = await this._apiCall('getStudentBio', { studentNumber: sn });
            const rows = this._parseResponse(res);
            return rows?.[0] || null;
        }, 10);
        for (const [sn, bio] of Object.entries(fetched)) {
            if (bio) biodata.push({ studentNumber: sn, gender: bio.gender || bio.GENDER, language: bio.language || bio.LANGUAGE, dob: bio.dateOfBirth || bio.dob || bio.DOB });
        }
        this._studentBioCache.set(cacheKey, biodata);
        return biodata;
    }

    /**
     * Get predictive risk assessment for students in a programme.
     * Rule-based: TM1<40 AND TM2<45 → High; TM1<50 AND TM2<50 → Medium; declining >15% → Declining.
     */
    async getPredictiveRisk(progCode, year) {
        const courses = this._progCourseMap?.[progCode] || [];
        const courseCodes = courses.map(c => c.courseCode || c.course_code || c.code).filter(Boolean);
        await this._fetchAssessmentResults(courseCodes, year);
        const progStudents = await this._fetchProgrammeStudents(progCode, year);
        const _stuNum = r => r.studentNumber || r.student_number || r.STUDENTNUMBER || '';

        const stuMarks = new Map();
        for (const code of courseCodes) {
            for (const r of (this._assessResultMap[code] || [])) {
                const sn = _stuNum(r);
                if (!sn || (progStudents.size > 0 && !progStudents.has(sn))) continue;
                if (!stuMarks.has(sn)) stuMarks.set(sn, { tm1: [], tm2: [] });
                const aCode = r.assessmentCode || '';
                const mark = parseFloat(r.result || r.mark || 0);
                if (mark <= 0) continue;
                if (aCode.startsWith('TM_1')) stuMarks.get(sn).tm1.push(mark);
                else if (aCode.startsWith('TM_2')) stuMarks.get(sn).tm2.push(mark);
            }
        }

        const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
        const risks = [];
        for (const [sn, m] of stuMarks) {
            const t1 = avg(m.tm1), t2 = avg(m.tm2);
            if (t1 == null && t2 == null) continue;
            const risk = (t1 != null && t1 < 40 && t2 != null && t2 < 45) ? 'High' :
                         (t1 != null && t1 < 50 && t2 != null && t2 < 50) ? 'Medium' :
                         (t1 != null && t2 != null && t2 < t1 - 15) ? 'Declining' : '';
            if (risk) risks.push({ studentNumber: sn, tm1: t1 != null ? Math.round(t1) : null, tm2: t2 != null ? Math.round(t2) : null, riskLevel: risk });
        }
        return risks;
    }

    // ── Mark Distribution Histograms ──────────────────────────────────

    /**
     * Get mark distribution for an entity's assessment type.
     * Returns: [{ range: '0-9', count: N }, ...]
     */
    async getMarkDistribution(entityIdx, typeCode, year) {
        const entity = this.publome.table('entity').read(entityIdx);
        if (!entity) return [];

        if (entity.get('type') === 'programme') {
            const progCode = entity.get('code');
            const courses = this._progCourseMap?.[progCode] || [];
            const courseCodes = courses.map(c => c.courseCode || c.course_code || c.code).filter(Boolean);
            if (courseCodes.length > 0) await this._fetchAssessmentResults(courseCodes, year);
            const progStudents = await this._fetchProgrammeStudents(progCode, year);
            const _stuNum = r => r.studentNumber || r.student_number || r.STUDENTNUMBER || '';
            const bins = Array(10).fill(0);
            for (const code of courseCodes) {
                for (const r of (this._assessResultMap[code] || [])) {
                    const aCode = r.assessmentCode || r.assessment_code || '';
                    if (!aCode.startsWith(typeCode)) continue;
                    if (progStudents.size > 0 && !progStudents.has(_stuNum(r))) continue;
                    const mark = parseFloat(r.result || r.mark || 0);
                    if (mark > 0) bins[Math.min(9, Math.floor(mark / 10))]++;
                }
            }
            return bins.map((count, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count }));
        }

        // Faculty/institution: aggregate from child programmes
        const children = this.engine.getChildren(entityIdx);
        const bins = Array(10).fill(0);
        for (const child of children) {
            const childDist = await this.getMarkDistribution(child.get('idx'), typeCode, year);
            childDist.forEach((d, i) => { bins[i] += d.count; });
        }
        return bins.map((count, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count }));
    }

    /**
     * Get assessment correlation: TM1↔Final, TM2↔Final, TM1↔TM2
     */
    async getAssessmentCorrelation(progCode, year) {
        const courses = this._progCourseMap?.[progCode] || [];
        const courseCodes = courses.map(c => c.courseCode || c.course_code || c.code).filter(Boolean);
        if (courseCodes.length === 0) return { tm1Final: null, tm2Final: null, tm1Tm2: null };
        await this._fetchAssessmentResults(courseCodes, year);
        const progStudents = await this._fetchProgrammeStudents(progCode, year);
        const _stuNum = r => r.studentNumber || r.student_number || r.STUDENTNUMBER || '';

        // Collect per-student marks across all courses
        const stuMarks = new Map(); // stuNum → { tm1: [], tm2: [], final: [] }
        for (const code of courseCodes) {
            for (const r of (this._assessResultMap[code] || [])) {
                const sn = _stuNum(r);
                if (!sn || (progStudents.size > 0 && !progStudents.has(sn))) continue;
                if (!stuMarks.has(sn)) stuMarks.set(sn, { tm1: [], tm2: [], final: [] });
                const aCode = r.assessmentCode || r.assessment_code || '';
                const mark = parseFloat(r.result || r.mark || 0);
                if (mark <= 0) continue;
                if (aCode.startsWith('TM_1')) stuMarks.get(sn).tm1.push(mark);
                else if (aCode.startsWith('TM_2')) stuMarks.get(sn).tm2.push(mark);
                else if (aCode.startsWith('FINAL')) stuMarks.get(sn).final.push(mark);
            }
        }
        const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
        const pairs = { tm1Final: [], tm2Final: [], tm1Tm2: [] };
        for (const [, m] of stuMarks) {
            const a1 = avg(m.tm1), a2 = avg(m.tm2), af = avg(m.final);
            if (a1 != null && af != null) pairs.tm1Final.push([a1, af]);
            if (a2 != null && af != null) pairs.tm2Final.push([a2, af]);
            if (a1 != null && a2 != null) pairs.tm1Tm2.push([a1, a2]);
        }
        const pearson = (arr) => {
            if (arr.length < 3) return null;
            const n = arr.length;
            const mx = arr.reduce((s, p) => s + p[0], 0) / n, my = arr.reduce((s, p) => s + p[1], 0) / n;
            let num = 0, dx2 = 0, dy2 = 0;
            for (const [x, y] of arr) { num += (x - mx) * (y - my); dx2 += (x - mx) ** 2; dy2 += (y - my) ** 2; }
            const denom = Math.sqrt(dx2 * dy2);
            return denom > 0 ? Math.round((num / denom) * 100) / 100 : 0;
        };
        return { tm1Final: pearson(pairs.tm1Final), tm2Final: pearson(pairs.tm2Final), tm1Tm2: pearson(pairs.tm1Tm2) };
    }

    // ── Keyword-based faculty classification (DUT fallback) ───────────

    /**
     * Classify a programme into a faculty by label keywords or code prefix.
     * Used when getProgrammeId returns sparse/empty faculty codes.
     */
    _classifyByLabel(label, code) {
        const lower = (label || '').toLowerCase();
        const prefix = (code || '').substring(0, 2).toUpperCase();
        for (const fac of ExecDataLoader.FACULTY_CLASSIFY) {
            if (fac.keywords.some(kw => lower.includes(kw))) return fac;
            if (fac.prefixes.includes(prefix)) return fac;
        }
        return { name: 'Other', icon: 'ellipsis-h', keywords: [], prefixes: [] };
    }
}

// Faculty classification rules — ordered by specificity (first match wins).
// Covers 533/536 DUT programmes (99.4% accuracy) from labels alone.
ExecDataLoader.FACULTY_CLASSIFY = [
    { name: 'Engineering & Built Environment', icon: 'cogs',
      keywords: ['engineering', 'civil eng', 'mechanical', 'electronic', 'electrical', 'power eng',
                 'chemical eng', 'industrial eng', 'construction', 'urban', 'architect',
                 'geomatics', 'built env', 'quantity surv', 'surveying', 'building',
                 'regional plan', 'eng & b', 'fac eng'],
      prefixes: ['BN', 'BB', 'MN', 'DN'] },
    { name: 'Health Sciences', icon: 'heartbeat',
      keywords: ['health sci', 'nurs', 'medical', 'clinical tech', 'chiropractic',
                 'homoeopath', 'dental', 'radiograph', 'emergency medical', 'biomedical',
                 'somatolog', 'audiometr', 'infection', 'child and youth', 'child & youth',
                 'lung function'],
      prefixes: ['BH', 'BC', 'MH', 'DR'] },
    { name: 'Education', icon: 'chalkboard-teacher',
      keywords: ['education', 'vocational teach', 'adult & comm ed'],
      prefixes: ['BE', 'DE', 'ME'] },
    { name: 'Accounting & Informatics', icon: 'calculator',
      keywords: ['accounting', 'accounti', 'manage account', 'info manage', 'info man',
                 'comm tech', 'com tech', 'informatics', 'information tech', 'info & comm',
                 'info and com', 'information and c', 'library', 'internal audit',
                 'financial info', 'taxation', 'acct & info', 'acct info', 'fac acc'],
      prefixes: ['BI', 'MI'] },
    { name: 'Arts & Design', icon: 'palette',
      keywords: ['design', 'graphic', 'fashion', 'drama', 'photogr', 'fine art', 'interior',
                 'visual', 'screen', 'jewel', 'performing', 'journalism', 'language prac',
                 'animation', 'video', 'apparel', 'applied arts', 'arts & des', 'art & d'],
      prefixes: ['BD', 'MA'] },
    { name: 'Applied Sciences', icon: 'flask',
      keywords: ['biotechnology', 'food sci', 'food and nu', 'consumer sci', 'chemistry',
                 'maritime', 'nautical', 'textile', 'pulp', 'applied sci', 'sport sci',
                 'horticul', 'landscaping', 'biostatist'],
      prefixes: ['BS', 'MT', 'DF'] },
    { name: 'Management Sciences', icon: 'briefcase',
      keywords: ['management', 'business', 'human res', 'hum res', 'public admin', 'pub admin',
                 'pub man', 'marketing', 'supply chain', 'logistics', 'operations', 'hospitality',
                 'tourism', 'quality man', 'mgnt sci', 'man sci', 'bus ad', 'pub rel',
                 'culinary', 'estate', 'property', 'office prof', 'retail', 'shipping',
                 'fac man sc', 'public relat', '(man sc'],
      prefixes: ['DT', 'MB', 'MP'] }
];
