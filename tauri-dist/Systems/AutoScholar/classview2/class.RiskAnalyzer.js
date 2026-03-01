/**
 * RiskAnalyzer - Pure functions for student performance analysis
 *
 * No UI dependencies - all methods are static and work with plain data.
 * All thresholds must be passed via config - NO hardcoded values.
 *
 * Usage:
 *   const result = RiskAnalyzer.analyzeClassPerformance(assembly, {
 *       atRiskThreshold: 60,
 *       highPerformingThreshold: 75,
 *       passThreshold: 50
 *   });
 */
class RiskAnalyzer {

    /**
     * Main analysis method - processes assembly data and returns categorized students
     * @param {Object} assembly - { assessmentResults, bio, courseResults }
     * @param {Object} config - Required configuration with thresholds
     */
    static analyzeClassPerformance(assembly, config) {
        // Validate required config
        RiskAnalyzer._validateConfig(config);

        const { assessmentResults, bio, courseResults } = assembly;

        if (!assessmentResults || assessmentResults.length() === 0) {
            return { error: 'No assessment data available' };
        }

        // Calculate assessment statistics
        const assessStats = RiskAnalyzer.calculateAssessmentStats(assessmentResults, config);

        // Build student index from bio data
        const bioIndex = bio ? RiskAnalyzer._buildIndex(bio, 'studentNumber') : {};

        // Analyze each student
        const studentAnalysis = RiskAnalyzer.analyzeStudents(
            assessmentResults, assessStats, bioIndex, config
        );

        // Categorize students
        const categorized = RiskAnalyzer.categorizeStudents(studentAnalysis, config);

        // Generate summary
        const summary = RiskAnalyzer.generateSummary(categorized, assessStats, config);

        return {
            config,  // Include config in result for transparency
            assessStats,
            students: categorized,
            highPerforming: categorized.filter(s => s.category === 'high-performing'),
            atRisk: categorized.filter(s => s.category === 'at-risk'),
            average: categorized.filter(s => s.category === 'average'),
            summary
        };
    }

    /**
     * Validate that required config values are provided
     */
    static _validateConfig(config) {
        const required = ['atRiskThreshold', 'highPerformingThreshold', 'passThreshold'];
        const missing = required.filter(key => config[key] === undefined);

        if (missing.length > 0) {
            throw new Error(`RiskAnalyzer: Missing required config: ${missing.join(', ')}`);
        }
    }

    /**
     * Calculate statistics for each assessment
     */
    static calculateAssessmentStats(assessmentResults, config) {
        const { includeZero = true, passThreshold } = config;

        // Use objIterate for Publon/bluMat objects
        const byAssessment = {};
        assessmentResults.objIterate(row => {
            const code = row.assessmentCode;
            if (!byAssessment[code]) byAssessment[code] = [];
            byAssessment[code].push(row);
        });

        const stats = [];

        for (const [code, rows] of Object.entries(byAssessment)) {
            const results = rows.map(row => {
                return parseFloat(row.result);
            }).filter(r => {
                if (!RiskAnalyzer._isNumeric(r)) return false;
                if (!includeZero && r === 0) return false;
                return true;
            });

            if (results.length === 0) continue;

            const n = results.length;
            const mean = RiskAnalyzer._mean(results);
            const sd = RiskAnalyzer._stdDev(results);
            const passed = results.filter(r => r >= passThreshold).length;

            stats.push({
                code,
                n,
                passed,
                passRate: RiskAnalyzer._round(100 * passed / n, 2),
                mean: RiskAnalyzer._round(mean, 2),
                sd: RiskAnalyzer._round(sd, 2),
                skewness: RiskAnalyzer._round(RiskAnalyzer._skewness(results), 2),
                kurtosis: RiskAnalyzer._round(RiskAnalyzer._kurtosis(results), 2)
            });
        }

        return stats;
    }

    /**
     * Analyze each student's performance across assessments
     */
    static analyzeStudents(assessmentResults, assessStats, bioIndex, config) {
        const { atRiskThreshold, includeZero = true } = config;

        // Index assessment stats by code
        const statsIndex = {};
        assessStats.forEach(s => statsIndex[s.code] = s);

        // Group assessments by student using objIterate
        const byStudent = {};
        assessmentResults.objIterate(row => {
            const stNo = row.studentNumber;
            if (!byStudent[stNo]) byStudent[stNo] = [];
            byStudent[stNo].push(row);
        });

        const students = [];

        for (const [studentNumber, rows] of Object.entries(byStudent)) {
            const alerts = [];
            const results = [];
            const resultDetails = [];

            for (const row of rows) {
                const assessmentCode = row.assessmentCode;
                const result = parseFloat(row.result);

                if (!RiskAnalyzer._isNumeric(result)) continue;
                if (!includeZero && result === 0) continue;

                results.push(result);
                const stat = statsIndex[assessmentCode];
                if (!stat) continue;

                const z = stat.sd > 0 ? (result - stat.mean) / stat.sd : 0;

                // Generate alerts based on config threshold
                if (result < atRiskThreshold) {
                    alerts.push({
                        type: 'below-threshold',
                        message: `Below ${atRiskThreshold}% on ${assessmentCode} (${result}%)`,
                        assessmentCode,
                        result
                    });
                }

                resultDetails.push({
                    assessmentCode,
                    result,
                    z: RiskAnalyzer._round(z, 2)
                });
            }

            // Get bio info
            const bio = bioIndex[studentNumber] || {};

            students.push({
                studentNumber,
                firstNames: bio.firstNames || '',
                lastName: bio.lastName || '',
                email: bio.email || '',
                campus: bio.campus || '',
                alerts,
                alertCount: alerts.length,
                resultDetails,
                totalMean: results.length > 0 ? RiskAnalyzer._round(RiskAnalyzer._mean(results), 2) : 0
            });
        }

        return students;
    }

    /**
     * Categorize students into high-performing, at-risk, and average
     * Based purely on absolute thresholds from config
     */
    static categorizeStudents(students, config) {
        const { atRiskThreshold, highPerformingThreshold } = config;

        return students.map(student => {
            const riskReasons = [];
            let category = 'average';

            // Check against absolute thresholds
            if (student.totalMean < atRiskThreshold) {
                riskReasons.push(`Below ${atRiskThreshold}%`);
                category = 'at-risk';
            } else if (student.totalMean >= highPerformingThreshold) {
                category = 'high-performing';
            }

            return {
                ...student,
                riskReasons,
                category
            };
        });
    }

    /**
     * Generate summary statistics for the class
     */
    static generateSummary(categorizedStudents, assessStats, config) {
        const totalStudents = categorizedStudents.length;
        const atRisk = categorizedStudents.filter(s => s.category === 'at-risk');
        const highPerforming = categorizedStudents.filter(s => s.category === 'high-performing');

        const avgMean = assessStats.length > 0
            ? RiskAnalyzer._round(RiskAnalyzer._mean(assessStats.map(a => a.mean)), 2)
            : 0;
        const avgPassRate = assessStats.length > 0
            ? RiskAnalyzer._round(RiskAnalyzer._mean(assessStats.map(a => a.passRate)), 2)
            : 0;

        return {
            totalStudents,
            totalAssessments: assessStats.length,
            highPerformingCount: highPerforming.length,
            highPerformingRate: totalStudents > 0 ? RiskAnalyzer._round(100 * highPerforming.length / totalStudents, 1) : 0,
            atRiskCount: atRisk.length,
            atRiskRate: totalStudents > 0 ? RiskAnalyzer._round(100 * atRisk.length / totalStudents, 1) : 0,
            averageMean: avgMean,
            averagePassRate: avgPassRate,
            config: {
                atRiskThreshold: config.atRiskThreshold,
                highPerformingThreshold: config.highPerformingThreshold,
                passThreshold: config.passThreshold
            }
        };
    }

    /**
     * Analyze historical performance trends
     */
    static analyzeHistoricalTrends(courseResults, config) {
        const { passThreshold } = config;

        // Group by year using objIterate
        const byYear = {};
        courseResults.objIterate(row => {
            const year = row.year;
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push(row);
        });

        const trends = [];

        for (const [year, rows] of Object.entries(byYear)) {
            const results = rows.map(row => {
                return parseFloat(row.result);
            }).filter(r => RiskAnalyzer._isNumeric(r));

            const wrote = results.length;
            const passed = results.filter(r => r >= passThreshold).length;

            trends.push({
                year: parseInt(year),
                n: rows.length,
                wrote,
                passed,
                passRate: wrote > 0 ? RiskAnalyzer._round(100 * passed / wrote, 2) : 0,
                mean: RiskAnalyzer._round(RiskAnalyzer._mean(results), 2),
                sd: RiskAnalyzer._round(RiskAnalyzer._stdDev(results), 2)
            });
        }

        return trends.sort((a, b) => a.year - b.year);
    }

    /**
     * Calculate Pearson correlation between two courses
     */
    static calculatePeerCorrelation(peerResults) {
        // Build student x course matrix
        const studentCourses = {};
        const courses = new Set();

        peerResults.objIterate(row => {
            const stNo = row.studentNumber;
            const course = row.courseCode;
            const result = row.result;

            if (!RiskAnalyzer._isNumeric(result)) return;

            if (!studentCourses[stNo]) studentCourses[stNo] = {};
            studentCourses[stNo][course] = result;
            courses.add(course);
        });

        const courseList = Array.from(courses);
        const correlations = [];

        // Calculate correlation for each pair
        for (let i = 0; i < courseList.length; i++) {
            const row = { code: courseList[i] };
            for (let j = 0; j < courseList.length; j++) {
                if (i === j) {
                    row[courseList[j]] = 1;
                } else {
                    const r = RiskAnalyzer._pearsonR(
                        studentCourses, courseList[i], courseList[j]
                    );
                    row[courseList[j]] = r !== null ? RiskAnalyzer._round(r, 3) : 0;
                }
            }
            correlations.push(row);
        }

        return { courses: courseList, correlations };
    }

    // ========================================
    // Simple array-based methods (for plain data without Publon objects)
    // ========================================

    /**
     * Categorize students from a simple array of objects with marks
     * Use this when you don't have Publon/assembly format data
     *
     * @param {Array} students - Array of { studentNumber, mark, ... }
     * @param {Object} config - { atRiskThreshold, highPerformingThreshold, passThreshold }
     * @param {string} markField - Field name containing the mark (default: 'mark')
     * @returns {Object} { atRisk: [], average: [], highPerforming: [], summary: {} }
     */
    static categorizeStudentsFromArray(students, config, markField = 'mark') {
        RiskAnalyzer._validateConfig(config);

        const { atRiskThreshold, highPerformingThreshold } = config;
        const result = { atRisk: [], average: [], highPerforming: [] };

        const categorized = students.map(student => {
            const mark = parseFloat(student[markField] || student.result || student.avgMark || 0);
            const riskReasons = [];
            let category = 'average';

            if (mark > 0 && mark < atRiskThreshold) {
                riskReasons.push(`Below ${atRiskThreshold}%`);
                category = 'at-risk';
            } else if (mark >= highPerformingThreshold) {
                category = 'high-performing';
            }

            return {
                ...student,
                avgMark: Math.round(mark),
                riskReasons,
                riskCategory: category,
                category
            };
        });

        // Split into categories
        categorized.forEach(student => {
            if (student.category === 'at-risk') {
                result.atRisk.push(student);
            } else if (student.category === 'high-performing') {
                result.highPerforming.push(student);
            } else {
                result.average.push(student);
            }
        });

        // Generate summary
        const totalStudents = students.length;
        const marks = students.map(s => parseFloat(s[markField] || s.result || s.avgMark || 0)).filter(m => m > 0);

        result.summary = {
            totalStudents,
            atRiskCount: result.atRisk.length,
            atRiskRate: totalStudents > 0 ? RiskAnalyzer._round(100 * result.atRisk.length / totalStudents, 1) : 0,
            highPerformingCount: result.highPerforming.length,
            highPerformingRate: totalStudents > 0 ? RiskAnalyzer._round(100 * result.highPerforming.length / totalStudents, 1) : 0,
            averageCount: result.average.length,
            classMean: marks.length > 0 ? RiskAnalyzer._round(RiskAnalyzer._mean(marks), 1) : 0,
            classStdDev: marks.length > 0 ? RiskAnalyzer._round(RiskAnalyzer._stdDev(marks), 1) : 0,
            classMin: marks.length > 0 ? Math.min(...marks) : 0,
            classMax: marks.length > 0 ? Math.max(...marks) : 0,
            config: {
                atRiskThreshold,
                highPerformingThreshold,
                passThreshold: config.passThreshold
            }
        };

        return result;
    }

    // ========================================
    // Utility methods (pure math, no config)
    // ========================================

    static _buildIndex(publon, keyField) {
        const index = {};
        publon.objIterate(obj => {
            index[obj[keyField]] = obj;
        });
        return index;
    }

    static _isNumeric(val) {
        return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    }

    static _mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    static _stdDev(arr) {
        if (arr.length < 2) return 0;
        const mean = RiskAnalyzer._mean(arr);
        const squareDiffs = arr.map(val => Math.pow(val - mean, 2));
        return Math.sqrt(RiskAnalyzer._mean(squareDiffs));
    }

    static _skewness(arr) {
        if (arr.length < 3) return 0;
        const mean = RiskAnalyzer._mean(arr);
        const sd = RiskAnalyzer._stdDev(arr);
        if (sd === 0) return 0;
        const n = arr.length;
        const cubed = arr.map(x => Math.pow((x - mean) / sd, 3));
        return (n / ((n - 1) * (n - 2))) * cubed.reduce((a, b) => a + b, 0);
    }

    static _kurtosis(arr) {
        if (arr.length < 4) return 0;
        const mean = RiskAnalyzer._mean(arr);
        const sd = RiskAnalyzer._stdDev(arr);
        if (sd === 0) return 0;
        const n = arr.length;
        const fourth = arr.map(x => Math.pow((x - mean) / sd, 4));
        const sum = fourth.reduce((a, b) => a + b, 0);
        return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum
             - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    }

    static _pearsonR(studentCourses, course1, course2) {
        const pairs = [];
        for (const stNo in studentCourses) {
            const c1 = studentCourses[stNo][course1];
            const c2 = studentCourses[stNo][course2];
            if (RiskAnalyzer._isNumeric(c1) && RiskAnalyzer._isNumeric(c2)) {
                pairs.push([c1, c2]);
            }
        }
        if (pairs.length < 3) return null;

        const x = pairs.map(p => p[0]);
        const y = pairs.map(p => p[1]);
        const meanX = RiskAnalyzer._mean(x);
        const meanY = RiskAnalyzer._mean(y);

        let num = 0, denX = 0, denY = 0;
        for (let i = 0; i < pairs.length; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            num += dx * dy;
            denX += dx * dx;
            denY += dy * dy;
        }

        const den = Math.sqrt(denX * denY);
        return den > 0 ? num / den : 0;
    }

    static _round(num, decimals) {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskAnalyzer;
}
