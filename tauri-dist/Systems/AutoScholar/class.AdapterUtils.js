/**
 * AdapterUtils - Shared utilities for AutoScholar data adapters
 *
 * Provides:
 * - Data validation
 * - Input sanitization
 * - Response schema validation
 * - Common transformations
 */

// ═══════════════════════════════════════════════════════════════════════════
// DATA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate input parameters against a schema
 * Provides comprehensive validation for adapter inputs with common academic patterns
 */
class AdapterValidator {

    // Common validation patterns for South African academic context
    static patterns = {
        studentNumber: /^[0-9]{8,10}$/,              // 8-10 digit student number
        courseCode: /^[A-Z]{3,4}\d{3}[A-Z]?$/,       // e.g., SMEF301, MATH101A
        programmeCode: /^[A-Z0-9]{4,10}$/,           // Programme/qualification code
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,         // Basic email pattern
        phoneZA: /^(\+27|0)[0-9]{9}$/,               // South African phone
        idNumber: /^[0-9]{13}$/,                     // SA ID number
        year: /^(19|20)\d{2}$/,                      // Valid year 1900-2099
        semester: /^[12]$/,                          // Semester 1 or 2
        nqfLevel: /^[4-9]|10$/                       // NQF Level 4-10
    };

    /**
     * Validate a student number
     * @param {string} value - Student number to validate
     * @returns {boolean} - True if valid
     */
    static isValidStudentNumber(value) {
        if (!value) return false;
        return AdapterValidator.patterns.studentNumber.test(String(value).trim());
    }

    /**
     * Validate a course code
     * @param {string} value - Course code to validate
     * @returns {boolean} - True if valid
     */
    static isValidCourseCode(value) {
        if (!value) return false;
        return AdapterValidator.patterns.courseCode.test(String(value).trim().toUpperCase());
    }

    /**
     * Validate an email address
     * @param {string} value - Email to validate
     * @returns {boolean} - True if valid
     */
    static isValidEmail(value) {
        if (!value) return false;
        return AdapterValidator.patterns.email.test(String(value).trim());
    }

    /**
     * Validate a date value
     * @param {any} value - Date to validate
     * @returns {boolean} - True if valid date
     */
    static isValidDate(value) {
        if (!value) return false;
        const d = value instanceof Date ? value : new Date(value);
        return !isNaN(d.getTime());
    }

    /**
     * Validate an academic year
     * @param {number|string} value - Year to validate
     * @returns {boolean} - True if valid
     */
    static isValidYear(value) {
        const year = parseInt(value, 10);
        if (isNaN(year)) return false;
        return year >= 1900 && year <= 2100;
    }

    /**
     * Validate a percentage value (0-100)
     * @param {number|string} value - Percentage to validate
     * @returns {boolean} - True if valid
     */
    static isValidPercentage(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        return num >= 0 && num <= 100;
    }

    /**
     * Validate a mark value (0-100, can be null for incomplete)
     * @param {number|string|null} value - Mark to validate
     * @returns {boolean} - True if valid
     */
    static isValidMark(value) {
        if (value === null || value === undefined || value === '') return true; // Allow null marks
        return AdapterValidator.isValidPercentage(value);
    }

    /**
     * Validate NQF level (4-10 for higher education)
     * @param {number|string} value - NQF level to validate
     * @returns {boolean} - True if valid
     */
    static isValidNQFLevel(value) {
        const level = parseInt(value, 10);
        if (isNaN(level)) return false;
        return level >= 4 && level <= 10;
    }

    /**
     * Validate credit value (positive integer, typically 8/12/16/24/36 etc.)
     * @param {number|string} value - Credits to validate
     * @returns {boolean} - True if valid
     */
    static isValidCredits(value) {
        const credits = parseInt(value, 10);
        if (isNaN(credits)) return false;
        return credits > 0 && credits <= 360; // Max 360 credits for a qualification
    }

    /**
     * Validate parameters against a schema
     * @param {object} params - Parameters to validate
     * @param {object} schema - Validation schema
     * @returns {object} { valid: boolean, errors: string[] }
     */
    static validateParams(params, schema) {
        const errors = [];

        for (const [key, rules] of Object.entries(schema)) {
            const value = params[key];

            // Required check
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`Parameter '${key}' is required`);
                continue;
            }

            // Skip further validation if value is empty and not required
            if (value === undefined || value === null) continue;

            // Type check
            if (rules.type) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (rules.type === 'array' && !Array.isArray(value)) {
                    errors.push(`Parameter '${key}' must be an array`);
                } else if (rules.type !== 'array' && actualType !== rules.type) {
                    errors.push(`Parameter '${key}' must be of type ${rules.type}, got ${actualType}`);
                }
            }

            // Pattern check (for strings)
            if (rules.pattern && typeof value === 'string') {
                const regex = new RegExp(rules.pattern);
                if (!regex.test(value)) {
                    errors.push(`Parameter '${key}' does not match required pattern`);
                }
            }

            // Min/max for numbers
            if (typeof value === 'number') {
                if (rules.min !== undefined && value < rules.min) {
                    errors.push(`Parameter '${key}' must be at least ${rules.min}`);
                }
                if (rules.max !== undefined && value > rules.max) {
                    errors.push(`Parameter '${key}' must be at most ${rules.max}`);
                }
            }

            // MinLength/maxLength for strings
            if (typeof value === 'string') {
                if (rules.minLength !== undefined && value.length < rules.minLength) {
                    errors.push(`Parameter '${key}' must be at least ${rules.minLength} characters`);
                }
                if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                    errors.push(`Parameter '${key}' must be at most ${rules.maxLength} characters`);
                }
            }

            // Enum check
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`Parameter '${key}' must be one of: ${rules.enum.join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate API response structure
     * @param {any} response - Response to validate
     * @param {string[]} requiredFields - Required field names
     * @returns {object} { valid: boolean, errors: string[], data: any }
     */
    static validateResponse(response, requiredFields = []) {
        const errors = [];

        if (!response) {
            return { valid: false, errors: ['Empty response'], data: null };
        }

        if (!Array.isArray(response)) {
            // Single object response
            for (const field of requiredFields) {
                if (response[field] === undefined) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
            return { valid: errors.length === 0, errors, data: response };
        }

        // Array response - check first record
        if (response.length > 0 && requiredFields.length > 0) {
            const sample = response[0];
            for (const field of requiredFields) {
                if (sample[field] === undefined) {
                    errors.push(`Missing required field in response: ${field}`);
                }
            }
        }

        return { valid: errors.length === 0, errors, data: response };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitize and clean input values
 */
class AdapterSanitizer {

    /**
     * Sanitize a string value
     * @param {string} value - Value to sanitize
     * @param {object} options - Sanitization options
     * @returns {string}
     */
    static sanitizeString(value, options = {}) {
        if (typeof value !== 'string') return value;

        let result = value;

        // Trim whitespace
        if (options.trim !== false) {
            result = result.trim();
        }

        // Limit length
        if (options.maxLength && result.length > options.maxLength) {
            result = result.substring(0, options.maxLength);
        }

        // Convert case
        if (options.uppercase) {
            result = result.toUpperCase();
        } else if (options.lowercase) {
            result = result.toLowerCase();
        }

        // Remove special characters (basic XSS prevention)
        if (options.stripHtml) {
            result = result.replace(/<[^>]*>/g, '');
        }

        return result;
    }

    /**
     * Sanitize a student number
     * @param {string} studentNumber - Student number to sanitize
     * @returns {string}
     */
    static sanitizeStudentNumber(studentNumber) {
        if (!studentNumber) return '';
        // Remove non-alphanumeric characters, convert to uppercase
        return String(studentNumber).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    /**
     * Sanitize a course code
     * @param {string} courseCode - Course code to sanitize
     * @returns {string}
     */
    static sanitizeCourseCode(courseCode) {
        if (!courseCode) return '';
        // Remove non-alphanumeric characters except hyphen, convert to uppercase
        return String(courseCode).replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    }

    /**
     * Sanitize year value
     * @param {any} year - Year value to sanitize
     * @returns {number|null}
     */
    static sanitizeYear(year) {
        const numYear = parseInt(year, 10);
        if (isNaN(numYear)) return null;
        // Reasonable year range
        if (numYear < 1900 || numYear > 2100) return null;
        return numYear;
    }

    /**
     * Sanitize parameters object
     * @param {object} params - Parameters to sanitize
     * @param {object} fieldTypes - Field type specifications
     * @returns {object}
     */
    static sanitizeParams(params, fieldTypes = {}) {
        const result = {};

        for (const [key, value] of Object.entries(params)) {
            const type = fieldTypes[key] || 'string';

            switch (type) {
                case 'studentNumber':
                    result[key] = this.sanitizeStudentNumber(value);
                    break;
                case 'courseCode':
                    result[key] = this.sanitizeCourseCode(value);
                    break;
                case 'year':
                    result[key] = this.sanitizeYear(value);
                    break;
                case 'integer':
                    result[key] = parseInt(value, 10) || null;
                    break;
                case 'float':
                    result[key] = parseFloat(value) || null;
                    break;
                case 'boolean':
                    result[key] = Boolean(value);
                    break;
                case 'string':
                default:
                    result[key] = this.sanitizeString(value);
            }
        }

        return result;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common parameter validation schemas for AutoScholar adapters
 * Covers student, course, programme, and assessment data structures
 */
const AdapterSchemas = {

    // Student lookup parameters
    studentLookup: {
        studentNumber: { type: 'string', pattern: '^[0-9A-Z]+$', maxLength: 20 },
        firstName: { type: 'string', maxLength: 100 },
        lastName: { type: 'string', maxLength: 100 }
    },

    // Course results parameters
    courseResults: {
        studentNumber: { type: 'string', pattern: '^[0-9A-Z]+$' },
        courseCode: { type: 'string', pattern: '^[A-Z0-9-]+$' },
        year: { type: 'number', min: 1900, max: 2100 }
    },

    // Programme parameters
    programmeParams: {
        programmeCode: { type: 'string', pattern: '^[A-Z0-9]+$' },
        year: { type: 'number', min: 1900, max: 2100 }
    },

    // Assessment results parameters
    assessmentResults: {
        courseCode: { type: 'string', required: true },
        year: { type: 'number', required: true },
        assessmentCode: { type: 'string' },
        studentNumber: { type: 'string' }
    },

    // Enrolment parameters
    enrolment: {
        studentId: { type: 'number', required: true },
        offeringId: { type: 'number', required: true },
        status: { type: 'string', enum: ['pending', 'enrolled', 'withdrawn', 'completed', 'failed'] }
    },

    // Offering parameters
    offering: {
        courseId: { type: 'number', required: true },
        year: { type: 'number', required: true, min: 1900, max: 2100 },
        semester: { type: 'number', enum: [1, 2] },
        lecturerId: { type: 'number' }
    },

    // Member (student/staff) parameters
    member: {
        firstName: { type: 'string', required: true, minLength: 1, maxLength: 100 },
        lastName: { type: 'string', required: true, minLength: 1, maxLength: 100 },
        email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
        studentNumber: { type: 'string', pattern: '^[0-9]{8,10}$' }
    },

    // Result entry parameters
    result: {
        enrolmentId: { type: 'number', required: true },
        mark: { type: 'number', min: 0, max: 100 },
        grade: { type: 'string', maxLength: 10 },
        status: { type: 'string', enum: ['pending', 'submitted', 'moderated', 'published'] }
    },

    // Attendance parameters
    attendance: {
        enrolmentId: { type: 'number', required: true },
        sessionId: { type: 'number', required: true },
        status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA TRANSFORMATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common data transformations
 */
class AdapterTransformer {

    /**
     * Convert mark percentage to grade letter
     * @param {number} mark - Percentage mark
     * @param {object} gradeScale - Grade scale configuration
     * @returns {string}
     */
    static markToGrade(mark, gradeScale = null) {
        const scale = gradeScale || {
            75: 'A', 60: 'B', 50: 'C', 40: 'D', 0: 'F'
        };

        const thresholds = Object.keys(scale).map(Number).sort((a, b) => b - a);
        for (const threshold of thresholds) {
            if (mark >= threshold) {
                return scale[threshold];
            }
        }
        return 'F';
    }

    /**
     * Normalize date to ISO format
     * @param {any} date - Date value (string, Date, timestamp)
     * @returns {string} ISO date string (YYYY-MM-DD)
     */
    static normalizeDate(date) {
        if (!date) return null;

        let d;
        if (date instanceof Date) {
            d = date;
        } else if (typeof date === 'number') {
            d = new Date(date);
        } else if (typeof date === 'string') {
            // Handle various formats
            d = new Date(date);
        } else {
            return null;
        }

        if (isNaN(d.getTime())) return null;

        return d.toISOString().split('T')[0];
    }

    /**
     * Normalize name (proper case)
     * @param {string} name - Name to normalize
     * @returns {string}
     */
    static normalizeName(name) {
        if (!name) return '';
        return name.trim()
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Extract year from course code
     * @param {string} courseCode - Course code (e.g., SMEF301)
     * @returns {number|null}
     */
    static extractYearFromCourseCode(courseCode) {
        if (!courseCode) return null;
        // Look for digit at position 4-5 (e.g., SMEF3XX -> 3)
        const match = courseCode.match(/[A-Z]+(\d)/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Calculate GPA from marks
     * @param {number[]} marks - Array of percentage marks
     * @param {number[]} credits - Array of credits (optional)
     * @returns {number}
     */
    static calculateGPA(marks, credits = null) {
        if (!marks || marks.length === 0) return 0;

        if (!credits || credits.length !== marks.length) {
            // Simple average
            return marks.reduce((sum, m) => sum + m, 0) / marks.length;
        }

        // Weighted average by credits
        let totalWeight = 0;
        let weightedSum = 0;
        for (let i = 0; i < marks.length; i++) {
            weightedSum += marks[i] * credits[i];
            totalWeight += credits[i];
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Calculate pass rate from an array of marks
     * @param {number[]} marks - Array of marks
     * @param {number} passThreshold - Pass mark (default: 50)
     * @returns {number} - Pass rate as percentage (0-100)
     */
    static calculatePassRate(marks, passThreshold = 50) {
        if (!marks || marks.length === 0) return 0;
        const validMarks = marks.filter(m => m !== null && m !== undefined && !isNaN(m));
        if (validMarks.length === 0) return 0;
        const passed = validMarks.filter(m => m >= passThreshold);
        return (passed.length / validMarks.length) * 100;
    }

    /**
     * Calculate statistics for an array of values
     * @param {number[]} values - Array of numeric values
     * @returns {object} - { min, max, mean, median, stdDev, count }
     */
    static calculateStats(values) {
        if (!values || values.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, count: 0 };
        }

        const nums = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        if (nums.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, count: 0 };
        }

        const sorted = [...nums].sort((a, b) => a - b);
        const count = nums.length;
        const min = sorted[0];
        const max = sorted[count - 1];
        const mean = nums.reduce((a, b) => a + b, 0) / count;

        // Median
        const mid = Math.floor(count / 2);
        const median = count % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        // Standard deviation
        const squareDiffs = nums.map(v => Math.pow(v - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / count;
        const stdDev = Math.sqrt(avgSquareDiff);

        return { min, max, mean, median, stdDev, count };
    }

    /**
     * Format a phone number in South African format
     * @param {string} phone - Phone number
     * @returns {string} - Formatted phone number
     */
    static formatPhoneNumber(phone) {
        if (!phone) return '';
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10 && digits.startsWith('0')) {
            return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        }
        if (digits.length === 11 && digits.startsWith('27')) {
            return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
        }
        return phone;
    }

    /**
     * Convert semester number to label
     * @param {number} semester - Semester number (1 or 2)
     * @param {number} year - Optional year
     * @returns {string} - Semester label
     */
    static semesterLabel(semester, year = null) {
        const semLabel = semester === 1 ? 'Semester 1' : semester === 2 ? 'Semester 2' : 'Unknown';
        return year ? `${semLabel} ${year}` : semLabel;
    }

    /**
     * Extract department code from course code
     * @param {string} courseCode - Course code (e.g., 'SMEF301')
     * @returns {string} - Department code (e.g., 'SMEF')
     */
    static extractDepartmentCode(courseCode) {
        if (!courseCode) return '';
        const match = courseCode.match(/^([A-Z]+)/);
        return match ? match[1] : '';
    }

    /**
     * Extract level from course code
     * @param {string} courseCode - Course code (e.g., 'SMEF301')
     * @returns {number|null} - Level (e.g., 3)
     */
    static extractCourseLevel(courseCode) {
        if (!courseCode) return null;
        const match = courseCode.match(/[A-Z]+(\d)/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Determine NQF level from course level
     * @param {number} courseLevel - Course year level (1, 2, 3, etc.)
     * @returns {number} - NQF level
     */
    static courseToNQFLevel(courseLevel) {
        // South African NQF mapping
        const mapping = { 1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10 };
        return mapping[courseLevel] || 5;
    }

    /**
     * Normalize a result object to standard format
     * @param {object} result - Result object from various sources
     * @returns {object} - Normalized result
     */
    static normalizeResult(result) {
        if (!result) return null;

        return {
            mark: parseFloat(result.mark ?? result.result ?? result.grade ?? result.final_mark) || null,
            grade: result.symbol ?? result.letterGrade ?? AdapterTransformer.markToGrade(result.mark ?? result.result),
            status: result.status ?? (result.mark >= 50 ? 'passed' : 'failed'),
            credits: parseInt(result.credits ?? result.credit_value, 10) || 0,
            year: parseInt(result.year ?? result.academic_year, 10) || null,
            semester: parseInt(result.semester ?? result.sem, 10) || null,
            courseCode: result.courseCode ?? result.course_code ?? result.module_code ?? ''
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom error classes for adapters
 */
class AdapterError extends Error {
    constructor(message, code = 'ADAPTER_ERROR') {
        super(message);
        this.name = 'AdapterError';
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}

class NetworkError extends AdapterError {
    constructor(message, originalError = null) {
        super(message, 'NETWORK_ERROR');
        this.name = 'NetworkError';
        this.originalError = originalError;
    }
}

class AuthenticationError extends AdapterError {
    constructor(message) {
        super(message, 'AUTH_ERROR');
        this.name = 'AuthenticationError';
    }
}

class ValidationError extends AdapterError {
    constructor(message, errors = []) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.validationErrors = errors;
    }
}

class DataError extends AdapterError {
    constructor(message, action = null, params = null) {
        super(message, 'DATA_ERROR');
        this.name = 'DataError';
        this.action = action;
        this.params = params;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AdapterValidator = AdapterValidator;
    window.AdapterSanitizer = AdapterSanitizer;
    window.AdapterSchemas = AdapterSchemas;
    window.AdapterTransformer = AdapterTransformer;
    window.AdapterError = AdapterError;
    window.NetworkError = NetworkError;
    window.AuthenticationError = AuthenticationError;
    window.ValidationError = ValidationError;
    window.DataError = DataError;
}
