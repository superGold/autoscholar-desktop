/**
 * AutoScholarUtils - Shared utilities for AutoScholar components
 *
 * Provides common utility functions used across multiple AutoScholar components:
 * - API response parsing
 * - Date/time formatting
 * - Number formatting
 * - String manipulation
 * - Data formatting helpers
 * - Common calculation utilities
 * - Array/object utilities
 *
 * Usage:
 *   const data = AutoScholarUtils.parseApiResponse(response, 'students');
 *   const formatted = AutoScholarUtils.formatPercentage(0.756);
 *   const dateStr = AutoScholarUtils.formatDate(new Date(), 'short');
 *   const initials = AutoScholarUtils.initials('John', 'Doe'); // 'JD'
 */

class AutoScholarUtils {
    /**
     * Parse DUT/Institution API response into normalized array of objects
     * Handles various response formats: fields/data arrays, direct arrays, nested objects
     *
     * @param {Object|string} response - API response (object or JSON string)
     * @param {string} key - Expected data key (e.g., 'students', 'results', 'registrations')
     * @returns {Array} - Normalized array of objects
     */
    static parseApiResponse(response, key) {
        if (!response) return [];

        // Handle string responses
        if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch(e) { return []; }
        }

        // Get the data object (may be nested under key or at top level)
        const dataObj = response[key] || response.results || response;

        // Check for fields/data format (common in DUT API)
        if (dataObj?.fields && Array.isArray(dataObj.data)) {
            const fields = dataObj.fields;
            return dataObj.data.map(row => {
                const obj = {};
                fields.forEach((field, idx) => {
                    obj[field] = row[idx];
                });
                return obj;
            });
        }

        // If already an array, return as-is
        if (Array.isArray(dataObj)) {
            return dataObj;
        }

        return [];
    }

    /**
     * Alias for parseApiResponse (backward compatibility)
     */
    static parseDutResponse(response, key) {
        return AutoScholarUtils.parseApiResponse(response, key);
    }

    /**
     * Format a decimal as a percentage string
     * @param {number} value - Decimal value (0-1 or 0-100)
     * @param {number} decimals - Number of decimal places
     * @returns {string} - Formatted percentage string
     */
    static formatPercentage(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) return '-';
        // If value is 0-1 range, multiply by 100
        const pct = value <= 1 ? value * 100 : value;
        return pct.toFixed(decimals) + '%';
    }

    /**
     * Format a number with thousands separators
     * @param {number} value - Numeric value
     * @returns {string} - Formatted number string
     */
    static formatNumber(value) {
        if (value === null || value === undefined || isNaN(value)) return '-';
        return value.toLocaleString();
    }

    /**
     * Calculate pass rate from results array
     * @param {Array} results - Array of result objects with 'result' or 'grade' field
     * @param {number} passThreshold - Minimum passing grade (default 50)
     * @returns {number} - Pass rate as decimal (0-1)
     */
    static calculatePassRate(results, passThreshold = 50) {
        if (!results || results.length === 0) return 0;

        const validResults = results.filter(r => {
            const grade = r.result ?? r.grade ?? r.mark;
            return grade !== null && grade !== undefined && !isNaN(grade);
        });

        if (validResults.length === 0) return 0;

        const passed = validResults.filter(r => {
            const grade = r.result ?? r.grade ?? r.mark;
            return parseFloat(grade) >= passThreshold;
        });

        return passed.length / validResults.length;
    }

    /**
     * Calculate average from results array
     * @param {Array} results - Array of result objects
     * @param {string} field - Field name to average (default 'result')
     * @returns {number} - Average value
     */
    static calculateAverage(results, field = 'result') {
        if (!results || results.length === 0) return 0;

        const validResults = results.filter(r => {
            const value = r[field] ?? r.grade ?? r.mark;
            return value !== null && value !== undefined && !isNaN(value);
        });

        if (validResults.length === 0) return 0;

        const sum = validResults.reduce((acc, r) => {
            const value = r[field] ?? r.grade ?? r.mark;
            return acc + parseFloat(value);
        }, 0);

        return sum / validResults.length;
    }

    /**
     * Get symbol grade from numeric mark
     * @param {number} mark - Numeric mark (0-100)
     * @returns {string|null} - Letter grade (A, B+, B, C, F) or null
     */
    static getSymbolGrade(mark) {
        if (mark === null || mark === undefined) return null;
        if (mark >= 75) return 'A';
        if (mark >= 70) return 'B+';
        if (mark >= 60) return 'B';
        if (mark >= 50) return 'C';
        return 'F';
    }

    /**
     * Get color class for a pass rate
     * @param {number} rate - Pass rate (0-1 or 0-100)
     * @returns {string} - CSS color class
     */
    static getPassRateColorClass(rate) {
        // Normalize to 0-100 range
        const pct = rate <= 1 ? rate * 100 : rate;
        if (pct >= 80) return 'text-green-600';
        if (pct >= 60) return 'text-yellow-600';
        if (pct >= 50) return 'text-orange-600';
        return 'text-red-600';
    }

    /**
     * Get badge variant for a risk level
     * @param {string} level - Risk level (high, medium, low)
     * @returns {string} - Badge variant
     */
    static getRiskBadgeVariant(level) {
        const map = {
            'high': 'danger',
            'medium': 'warning',
            'low': 'success',
            'critical': 'danger',
            'moderate': 'warning',
            'normal': 'success'
        };
        return map[level?.toLowerCase()] || 'secondary';
    }

    /**
     * Debounce a function call
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Highlight matching text in a string for search results
     * @param {string} text - Text to highlight in
     * @param {string} searchTerm - Search term to highlight
     * @param {string} highlightClass - CSS class for highlight (default: bg-yellow-200)
     * @returns {string} - HTML string with highlighted matches
     */
    static highlightMatch(text, searchTerm, highlightClass = 'bg-yellow-200') {
        if (!searchTerm || !text) return text || '';
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return String(text).replace(regex, `<mark class="${highlightClass}">$1</mark>`);
    }

    /**
     * Save recent search to localStorage
     * @param {string} context - Search context key (e.g., 'students', 'courses')
     * @param {string} term - Search term to save
     * @param {number} maxItems - Maximum items to keep (default: 10)
     */
    static saveRecentSearch(context, term, maxItems = 10) {
        if (!term || term.trim().length < 2) return;
        const key = `autoscholar_search_${context}`;
        let recent = [];
        try {
            recent = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { recent = []; }

        // Remove if already exists and add to front
        recent = recent.filter(s => s.toLowerCase() !== term.toLowerCase());
        recent.unshift(term.trim());
        recent = recent.slice(0, maxItems);

        try {
            localStorage.setItem(key, JSON.stringify(recent));
        } catch (e) { /* localStorage full */ }
    }

    /**
     * Get recent searches from localStorage
     * @param {string} context - Search context key
     * @returns {Array} - Array of recent search terms
     */
    static getRecentSearches(context) {
        const key = `autoscholar_search_${context}`;
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { return []; }
    }

    /**
     * Clear recent searches for a context
     * @param {string} context - Search context key
     */
    static clearRecentSearches(context) {
        const key = `autoscholar_search_${context}`;
        localStorage.removeItem(key);
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} - Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Group an array by a key
     * @param {Array} array - Array to group
     * @param {string|Function} key - Key to group by (string or function)
     * @returns {Object} - Grouped object
     */
    static groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = typeof key === 'function' ? key(item) : item[key];
            (result[groupKey] = result[groupKey] || []).push(item);
            return result;
        }, {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATE/TIME FORMATTING UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Format a date with various format options
     * @param {Date|string|number} date - Date to format
     * @param {string} format - Format type: 'short', 'medium', 'long', 'iso', 'relative'
     * @param {string} locale - Locale for formatting (default: 'en-ZA')
     * @returns {string} - Formatted date string
     * @example
     *   formatDate(new Date(), 'short')   // '08/01/2026'
     *   formatDate(new Date(), 'medium')  // '8 Jan 2026'
     *   formatDate(new Date(), 'long')    // '8 January 2026'
     *   formatDate(new Date(), 'iso')     // '2026-01-08'
     */
    static formatDate(date, format = 'medium', locale = 'en-ZA') {
        if (!date) return '-';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '-';

        switch (format) {
            case 'short':
                return d.toLocaleDateString(locale);
            case 'medium':
                return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
            case 'long':
                return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
            case 'iso':
                return d.toISOString().split('T')[0];
            case 'relative':
                return AutoScholarUtils.formatRelativeTime(d);
            case 'monthYear':
                return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
            case 'dayMonth':
                return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
            default:
                return d.toLocaleDateString(locale);
        }
    }

    /**
     * Format time from a date
     * @param {Date|string|number} date - Date to extract time from
     * @param {boolean} includeSeconds - Whether to include seconds
     * @param {string} locale - Locale for formatting (default: 'en-ZA')
     * @returns {string} - Formatted time string (e.g., '14:30' or '2:30 PM')
     */
    static formatTime(date, includeSeconds = false, locale = 'en-ZA') {
        if (!date) return '-';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '-';

        const options = { hour: '2-digit', minute: '2-digit' };
        if (includeSeconds) options.second = '2-digit';

        return d.toLocaleTimeString(locale, options);
    }

    /**
     * Format a date and time together
     * @param {Date|string|number} date - Date to format
     * @param {string} locale - Locale for formatting (default: 'en-ZA')
     * @returns {string} - Formatted date and time string
     */
    static formatDateTime(date, locale = 'en-ZA') {
        if (!date) return '-';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '-';

        return d.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format a date as relative time (e.g., '2 hours ago', 'in 3 days')
     * @param {Date|string|number} date - Date to format
     * @returns {string} - Relative time string
     */
    static formatRelativeTime(date) {
        if (!date) return '-';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '-';

        const now = new Date();
        const diffMs = d.getTime() - now.getTime();
        const diffSec = Math.round(diffMs / 1000);
        const diffMin = Math.round(diffSec / 60);
        const diffHour = Math.round(diffMin / 60);
        const diffDay = Math.round(diffHour / 24);
        const diffWeek = Math.round(diffDay / 7);
        const diffMonth = Math.round(diffDay / 30);

        // Past
        if (diffMs < 0) {
            if (diffSec > -60) return 'just now';
            if (diffMin > -60) return `${-diffMin} minute${-diffMin !== 1 ? 's' : ''} ago`;
            if (diffHour > -24) return `${-diffHour} hour${-diffHour !== 1 ? 's' : ''} ago`;
            if (diffDay > -7) return `${-diffDay} day${-diffDay !== 1 ? 's' : ''} ago`;
            if (diffWeek > -4) return `${-diffWeek} week${-diffWeek !== 1 ? 's' : ''} ago`;
            if (diffMonth > -12) return `${-diffMonth} month${-diffMonth !== 1 ? 's' : ''} ago`;
            return AutoScholarUtils.formatDate(d, 'medium');
        }

        // Future
        if (diffSec < 60) return 'in a moment';
        if (diffMin < 60) return `in ${diffMin} minute${diffMin !== 1 ? 's' : ''}`;
        if (diffHour < 24) return `in ${diffHour} hour${diffHour !== 1 ? 's' : ''}`;
        if (diffDay < 7) return `in ${diffDay} day${diffDay !== 1 ? 's' : ''}`;
        if (diffWeek < 4) return `in ${diffWeek} week${diffWeek !== 1 ? 's' : ''}`;
        if (diffMonth < 12) return `in ${diffMonth} month${diffMonth !== 1 ? 's' : ''}`;
        return AutoScholarUtils.formatDate(d, 'medium');
    }

    /**
     * Format a date range
     * @param {Date|string|number} start - Start date
     * @param {Date|string|number} end - End date
     * @param {string} locale - Locale for formatting (default: 'en-ZA')
     * @returns {string} - Formatted date range (e.g., '5 Jan - 12 Jan 2026')
     */
    static formatDateRange(start, end, locale = 'en-ZA') {
        if (!start || !end) return '-';
        const s = start instanceof Date ? start : new Date(start);
        const e = end instanceof Date ? end : new Date(end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return '-';

        const sameYear = s.getFullYear() === e.getFullYear();
        const sameMonth = sameYear && s.getMonth() === e.getMonth();

        if (sameMonth) {
            return `${s.getDate()} - ${e.getDate()} ${e.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}`;
        }
        if (sameYear) {
            return `${s.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        return `${AutoScholarUtils.formatDate(s, 'medium', locale)} - ${AutoScholarUtils.formatDate(e, 'medium', locale)}`;
    }

    /**
     * Get the academic year for a given date
     * Academic year typically runs Feb-Nov in South Africa
     * @param {Date|string|number} date - Date to check (default: now)
     * @returns {number} - Academic year
     */
    static getAcademicYear(date = new Date()) {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return new Date().getFullYear();

        // Academic year starts in February
        // If before February, it's the previous year's academic year
        return d.getMonth() < 1 ? d.getFullYear() - 1 : d.getFullYear();
    }

    /**
     * Get the semester for a given date
     * @param {Date|string|number} date - Date to check (default: now)
     * @returns {number} - Semester number (1 or 2)
     */
    static getSemester(date = new Date()) {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) d = new Date();

        // Semester 1: Feb-Jun (months 1-5)
        // Semester 2: Jul-Nov (months 6-10)
        const month = d.getMonth();
        return month >= 6 && month <= 10 ? 2 : 1;
    }

    /**
     * Get days until a date
     * @param {Date|string|number} date - Target date
     * @returns {number} - Number of days (negative if past)
     */
    static getDaysUntil(date) {
        if (!date) return null;
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NUMBER FORMATTING UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Format a number as currency
     * @param {number} value - Numeric value
     * @param {string} currency - Currency code (default: 'ZAR')
     * @param {string} locale - Locale for formatting (default: 'en-ZA')
     * @returns {string} - Formatted currency string
     * @example
     *   formatCurrency(1234.56)        // 'R 1 234,56'
     *   formatCurrency(1234.56, 'USD') // '$1,234.56'
     */
    static formatCurrency(value, currency = 'ZAR', locale = 'en-ZA') {
        if (value === null || value === undefined || isNaN(value)) return '-';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(value);
    }

    /**
     * Format a number as an ordinal (1st, 2nd, 3rd, etc.)
     * @param {number} n - Number to format
     * @returns {string} - Ordinal string
     * @example
     *   formatOrdinal(1)  // '1st'
     *   formatOrdinal(22) // '22nd'
     *   formatOrdinal(3)  // '3rd'
     */
    static formatOrdinal(n) {
        if (n === null || n === undefined || isNaN(n)) return '-';
        const num = Math.floor(n);
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = num % 100;
        return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    }

    /**
     * Format credits with suffix
     * @param {number} value - Credit value
     * @returns {string} - Formatted credits (e.g., '16 credits')
     */
    static formatCredits(value) {
        if (value === null || value === undefined || isNaN(value)) return '-';
        return `${value} credit${value !== 1 ? 's' : ''}`;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Clamped value
     */
    static clamp(value, min, max) {
        if (typeof value !== 'number' || isNaN(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Round a number to specified decimal places
     * @param {number} value - Value to round
     * @param {number} decimals - Number of decimal places
     * @returns {number} - Rounded value
     */
    static roundTo(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) return 0;
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    /**
     * Generate an array of numbers in a range
     * @param {number} start - Start value (inclusive)
     * @param {number} end - End value (inclusive)
     * @param {number} step - Step value (default: 1)
     * @returns {number[]} - Array of numbers
     * @example
     *   range(1, 5)     // [1, 2, 3, 4, 5]
     *   range(0, 10, 2) // [0, 2, 4, 6, 8, 10]
     */
    static range(start, end, step = 1) {
        const result = [];
        for (let i = start; i <= end; i += step) {
            result.push(i);
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STRING MANIPULATION UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Truncate a string with ellipsis
     * @param {string} str - String to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to append (default: '...')
     * @returns {string} - Truncated string
     * @example
     *   truncate('Hello World', 8) // 'Hello...'
     */
    static truncate(str, length, suffix = '...') {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length - suffix.length) + suffix;
    }

    /**
     * Capitalize the first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} - Capitalized string
     * @example
     *   capitalize('hello') // 'Hello'
     */
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Convert string to Title Case
     * @param {string} str - String to convert
     * @returns {string} - Title cased string
     * @example
     *   titleCase('hello world') // 'Hello World'
     */
    static titleCase(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Convert string to URL-safe slug
     * @param {string} str - String to slugify
     * @returns {string} - Slugified string
     * @example
     *   slugify('Hello World!') // 'hello-world'
     */
    static slugify(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Get initials from first and last name
     * @param {string} firstName - First name
     * @param {string} lastName - Last name (optional)
     * @returns {string} - Initials (uppercase)
     * @example
     *   initials('John', 'Doe')   // 'JD'
     *   initials('John')          // 'J'
     *   initials('John Paul', '') // 'JP'
     */
    static initials(firstName, lastName = '') {
        const first = (firstName || '').trim();
        const last = (lastName || '').trim();

        if (!first && !last) return '';

        // Handle space-separated first name (e.g., 'John Paul')
        const firstParts = first.split(/\s+/);
        if (firstParts.length > 1 && !last) {
            return (firstParts[0][0] + (firstParts[1][0] || '')).toUpperCase();
        }

        return ((first[0] || '') + (last[0] || '')).toUpperCase();
    }

    /**
     * Pluralize a word based on count
     * @param {number} count - Count to check
     * @param {string} singular - Singular form
     * @param {string} plural - Plural form (optional, defaults to singular + 's')
     * @returns {string} - Formatted string with count and word
     * @example
     *   pluralize(1, 'student')         // '1 student'
     *   pluralize(5, 'student')         // '5 students'
     *   pluralize(2, 'person', 'people') // '2 people'
     */
    static pluralize(count, singular, plural = null) {
        const n = count === null || count === undefined ? 0 : count;
        const word = n === 1 ? singular : (plural || singular + 's');
        return `${n} ${word}`;
    }

    /**
     * Check if a string is empty or only whitespace
     * @param {string} str - String to check
     * @returns {boolean} - True if empty
     */
    static isBlank(str) {
        return !str || str.trim().length === 0;
    }

    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    static escapeHtml(str) {
        if (!str) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;'
        };
        return str.replace(/[&<>"']/g, m => map[m]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if a value is empty (null, undefined, empty string, empty array, empty object)
     * @param {any} value - Value to check
     * @returns {boolean} - True if empty
     */
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Check if a value is a valid email address
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid
     */
    static isValidEmail(email) {
        if (!email) return false;
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }

    /**
     * Check if a value is numeric
     * @param {any} value - Value to check
     * @returns {boolean} - True if numeric
     */
    static isNumeric(value) {
        if (value === null || value === undefined || value === '') return false;
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Check if a value is a valid date
     * @param {any} value - Value to check
     * @returns {boolean} - True if valid date
     */
    static isValidDate(value) {
        if (!value) return false;
        const d = value instanceof Date ? value : new Date(value);
        return !isNaN(d.getTime());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ARRAY/OBJECT UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get unique values from an array
     * @param {Array} array - Array to deduplicate
     * @param {string|Function} key - Optional key or function for uniqueness
     * @returns {Array} - Array with unique values
     * @example
     *   unique([1, 2, 2, 3])                    // [1, 2, 3]
     *   unique([{id: 1}, {id: 1}, {id: 2}], 'id') // [{id: 1}, {id: 2}]
     */
    static unique(array, key = null) {
        if (!array || !Array.isArray(array)) return [];
        if (!key) {
            return [...new Set(array)];
        }
        const seen = new Set();
        return array.filter(item => {
            const k = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    /**
     * Sort an array by a key
     * @param {Array} array - Array to sort
     * @param {string|Function} key - Key or function to sort by
     * @param {string} direction - 'asc' or 'desc' (default: 'asc')
     * @returns {Array} - Sorted array (new array, does not mutate original)
     */
    static sortBy(array, key, direction = 'asc') {
        if (!array || !Array.isArray(array)) return [];
        const sorted = [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
        });
        return direction === 'desc' ? sorted.reverse() : sorted;
    }

    /**
     * Pick specific keys from an object
     * @param {Object} obj - Source object
     * @param {string[]} keys - Keys to pick
     * @returns {Object} - New object with picked keys
     */
    static pick(obj, keys) {
        if (!obj || typeof obj !== 'object') return {};
        return keys.reduce((result, key) => {
            if (key in obj) {
                result[key] = obj[key];
            }
            return result;
        }, {});
    }

    /**
     * Omit specific keys from an object
     * @param {Object} obj - Source object
     * @param {string[]} keys - Keys to omit
     * @returns {Object} - New object without omitted keys
     */
    static omit(obj, keys) {
        if (!obj || typeof obj !== 'object') return {};
        const keysSet = new Set(keys);
        return Object.keys(obj).reduce((result, key) => {
            if (!keysSet.has(key)) {
                result[key] = obj[key];
            }
            return result;
        }, {});
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object to merge
     * @returns {Object} - Merged object (new object, does not mutate originals)
     */
    static merge(target, source) {
        if (!target) return source ? AutoScholarUtils.deepClone(source) : {};
        if (!source) return AutoScholarUtils.deepClone(target);

        const result = AutoScholarUtils.deepClone(target);

        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = AutoScholarUtils.merge(result[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ID GENERATION UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Generate a unique ID with optional prefix
     * @param {string} prefix - Optional prefix
     * @returns {string} - Unique ID
     * @example
     *   generateId()        // 'a1b2c3d4'
     *   generateId('user')  // 'user_a1b2c3d4'
     */
    static generateId(prefix = '') {
        const id = Math.random().toString(36).substring(2, 10);
        return prefix ? `${prefix}_${id}` : id;
    }

    /**
     * Generate a simple UUID v4
     * @returns {string} - UUID string
     * @example
     *   uuid() // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
     */
    static uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ========== DATA ACCESS UTILITIES ==========
    // These methods consolidate common data access patterns used across components
    // to reduce code duplication and ensure consistency.

    /**
     * Get course by ID from services
     * @param {Object} services - AutoScholar services object
     * @param {number} courseId - Course ID
     * @returns {Object|null} - Course object or null
     */
    static getCourseById(services, courseId) {
        return services?.academic?.publon?.course?.rows?.find(c => c?.idx === courseId) || null;
    }

    /**
     * Get offering by ID from services
     * @param {Object} services - AutoScholar services object
     * @param {number} offeringId - Offering ID
     * @returns {Object|null} - Offering object or null
     */
    static getOfferingById(services, offeringId) {
        return services?.academic?.publon?.offering?.rows?.find(o => o?.idx === offeringId) || null;
    }

    /**
     * Get enrolment by ID from services
     * @param {Object} services - AutoScholar services object
     * @param {number} enrolmentId - Enrolment ID
     * @returns {Object|null} - Enrolment object or null
     */
    static getEnrolmentById(services, enrolmentId) {
        return services?.academic?.publon?.enrolment?.rows?.find(e => e?.idx === enrolmentId) || null;
    }

    /**
     * Get all enrolments for a student
     * @param {Object} services - AutoScholar services object
     * @param {number} studentId - Student member ID
     * @returns {Array} - Array of enrolment objects
     */
    static getStudentEnrolments(services, studentId) {
        if (!services?.academic || !studentId) return [];
        return (services.academic.publon?.enrolment?.rows || []).filter(e => e && e.studentId === studentId);
    }

    /**
     * Get all enrolments for an offering (enrolled status only)
     * @param {Object} services - AutoScholar services object
     * @param {number} offeringId - Offering ID
     * @returns {Array} - Array of enrolment objects
     */
    static getOfferingEnrolments(services, offeringId) {
        if (!services?.academic) return [];
        return (services.academic.publon?.enrolment?.rows || []).filter(
            e => e && e.offeringId === offeringId && e.status === 'enrolled'
        );
    }

    /**
     * Get all offerings for a lecturer
     * @param {Object} services - AutoScholar services object
     * @param {number} lecturerId - Lecturer member ID
     * @returns {Array} - Array of offering objects
     */
    static getLecturerOfferings(services, lecturerId) {
        if (!services?.academic || !lecturerId) return [];
        return (services.academic.publon?.offering?.rows || []).filter(o => o && o.lecturerId === lecturerId);
    }

    /**
     * Get course for an enrolment (combines multiple lookups)
     * @param {Object} services - AutoScholar services object
     * @param {Object} enrolment - Enrolment object
     * @returns {Object|null} - Course object or null
     */
    static getCourseForEnrolment(services, enrolment) {
        if (!enrolment) return null;
        const offering = AutoScholarUtils.getOfferingById(services, enrolment.offeringId);
        return offering ? AutoScholarUtils.getCourseById(services, offering.courseId) : null;
    }

    /**
     * Get member by ID from services
     * @param {Object} services - AutoScholar services object
     * @param {number} memberId - Member ID
     * @returns {Object|null} - Member object or null
     */
    static getMemberById(services, memberId) {
        return services?.member?.publon?.member?.rows?.find(m => m?.idx === memberId) || null;
    }

    /**
     * Get all members from services
     * @param {Object} services - AutoScholar services object
     * @returns {Array} - Array of member objects (filtered for null values)
     */
    static getMembers(services) {
        return (services?.member?.publon?.member?.rows || []).filter(m => m);
    }

    /**
     * Get all courses from services
     * @param {Object} services - AutoScholar services object
     * @returns {Array} - Array of course objects (filtered for null values)
     */
    static getCourses(services) {
        return (services?.academic?.publon?.course?.rows || []).filter(c => c);
    }

    /**
     * Get all offerings from services
     * @param {Object} services - AutoScholar services object
     * @returns {Array} - Array of offering objects (filtered for null values)
     */
    static getOfferings(services) {
        return (services?.academic?.publon?.offering?.rows || []).filter(o => o);
    }

    /**
     * Get results for an enrolment
     * @param {Object} services - AutoScholar services object
     * @param {number} enrolmentId - Enrolment ID
     * @returns {Array} - Array of result objects
     */
    static getEnrolmentResults(services, enrolmentId) {
        if (!services?.academic || !enrolmentId) return [];
        return (services.academic.publon?.result?.rows || []).filter(r => r && r.enrolmentId === enrolmentId);
    }

    /**
     * Get all results for a student (across all enrolments)
     * @param {Object} services - AutoScholar services object
     * @param {number} studentId - Student member ID
     * @returns {Array} - Array of result objects
     */
    static getStudentResults(services, studentId) {
        const enrolments = AutoScholarUtils.getStudentEnrolments(services, studentId);
        const enrolmentIds = enrolments.map(e => e.idx);
        if (!services?.academic || enrolmentIds.length === 0) return [];
        return (services.academic.publon?.result?.rows || []).filter(r => r && enrolmentIds.includes(r.enrolmentId));
    }

    // ========== PERFORMANCE UTILITIES ==========

    /**
     * Throttle a function call - ensures function runs at most once per limit
     * Use for scroll handlers, resize events, mousemove, etc.
     * @param {Function} func - Function to throttle
     * @param {number} limit - Minimum time between calls in milliseconds
     * @returns {Function} - Throttled function
     */
    static throttle(func, limit = 100) {
        let inThrottle = false;
        return function throttledFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Batch DOM updates using requestAnimationFrame
     * Groups multiple DOM operations into single frame to prevent layout thrashing
     * @param {Function} callback - Function containing DOM operations
     */
    static batchDOMUpdates(callback) {
        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(callback);
        } else {
            callback();
        }
    }

    /**
     * Create a document fragment for batch DOM insertion
     * Building DOM in a fragment prevents multiple reflows
     * @returns {DocumentFragment}
     */
    static createDocFragment() {
        return document.createDocumentFragment();
    }

    /**
     * Memoize a function - cache results based on arguments
     * Use for expensive pure functions that are called repeatedly with same args
     * @param {Function} fn - Function to memoize
     * @param {Function} keyFn - Optional key generator function
     * @returns {Function} - Memoized function
     */
    static memoize(fn, keyFn = null) {
        const cache = new Map();
        return function memoized(...args) {
            const key = keyFn ? keyFn(...args) : JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }

    /**
     * Create a memoized function with TTL (time-to-live) cache expiry
     * Use for API responses or data that may become stale
     * @param {Function} fn - Function to memoize
     * @param {number} ttl - Cache TTL in milliseconds (default 5 minutes)
     * @returns {Function} - Memoized function with expiry
     */
    static memoizeWithTTL(fn, ttl = 300000) {
        const cache = new Map();
        return function memoizedWithTTL(...args) {
            const key = JSON.stringify(args);
            const cached = cache.get(key);
            if (cached && Date.now() - cached.timestamp < ttl) {
                return cached.value;
            }
            const result = fn.apply(this, args);
            cache.set(key, { value: result, timestamp: Date.now() });
            return result;
        };
    }

    /**
     * Render a list of items efficiently using document fragments
     * @param {HTMLElement} container - Container to render into
     * @param {Array} items - Array of items to render
     * @param {Function} renderItem - Function that creates DOM element for each item
     * @param {Object} options - Options: { clear: true, batchSize: 50 }
     */
    static renderListEfficient(container, items, renderItem, options = {}) {
        const { clear = true, batchSize = 50 } = options;

        if (clear) {
            container.innerHTML = '';
        }

        const fragment = document.createDocumentFragment();

        // Batch rendering for very large lists
        if (items.length > batchSize) {
            // First batch immediately
            items.slice(0, batchSize).forEach((item, idx) => {
                const el = renderItem(item, idx);
                if (el) fragment.appendChild(el);
            });
            container.appendChild(fragment);

            // Remaining batches via requestIdleCallback or setTimeout
            let offset = batchSize;
            const renderNextBatch = () => {
                if (offset >= items.length) return;

                const batchFragment = document.createDocumentFragment();
                const end = Math.min(offset + batchSize, items.length);
                for (let i = offset; i < end; i++) {
                    const el = renderItem(items[i], i);
                    if (el) batchFragment.appendChild(el);
                }
                container.appendChild(batchFragment);
                offset = end;

                if (offset < items.length) {
                    if (typeof requestIdleCallback !== 'undefined') {
                        requestIdleCallback(renderNextBatch);
                    } else {
                        setTimeout(renderNextBatch, 0);
                    }
                }
            };

            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(renderNextBatch);
            } else {
                setTimeout(renderNextBatch, 0);
            }
        } else {
            // Small list - render all at once
            items.forEach((item, idx) => {
                const el = renderItem(item, idx);
                if (el) fragment.appendChild(el);
            });
            container.appendChild(fragment);
        }
    }
}

/**
 * EventManager - Helper class for managing event listeners with proper cleanup
 * Prevents memory leaks by tracking and removing all listeners on destroy
 *
 * Usage:
 *   this._events = new EventManager();
 *   this._events.add(element, 'click', handler);
 *   // Later:
 *   this._events.destroy(); // Removes all listeners
 */
class EventManager {
    constructor() {
        this._listeners = [];
    }

    /**
     * Add an event listener (will be tracked for cleanup)
     */
    add(element, event, handler, options) {
        if (!element) return;
        element.addEventListener(event, handler, options);
        this._listeners.push({ element, event, handler, options });
    }

    /**
     * Remove a specific listener
     */
    remove(element, event, handler) {
        const idx = this._listeners.findIndex(l =>
            l.element === element && l.event === event && l.handler === handler
        );
        if (idx >= 0) {
            const { element: el, event: ev, handler: h, options } = this._listeners[idx];
            el.removeEventListener(ev, h, options);
            this._listeners.splice(idx, 1);
        }
    }

    /**
     * Remove all tracked listeners (call on component destroy)
     */
    destroy() {
        this._listeners.forEach(({ element, event, handler, options }) => {
            if (element) {
                element.removeEventListener(event, handler, options);
            }
        });
        this._listeners = [];
    }

    /**
     * Get count of active listeners (for debugging)
     */
    get count() {
        return this._listeners.length;
    }
}

// Make available globally
window.AutoScholarUtils = AutoScholarUtils;
window.EventManager = EventManager;
