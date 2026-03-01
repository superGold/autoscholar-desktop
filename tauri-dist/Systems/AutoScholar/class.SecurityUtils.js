/**
 * SecurityUtils - Security utilities for AutoScholar
 *
 * Provides centralized security functions for:
 * - Input sanitization (XSS prevention)
 * - Output encoding (safe DOM insertion)
 * - CSRF token generation and validation
 * - Session security helpers
 * - Password strength validation
 *
 * @author Agent 10 - Security & Admin Optimizer
 * @date 2026-01-07
 */

class SecurityUtils {

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    static CONFIG = {
        // CSRF token expiry in milliseconds (30 minutes)
        csrfTokenExpiry: 30 * 60 * 1000,

        // Session idle timeout in milliseconds (30 minutes)
        sessionIdleTimeout: 30 * 60 * 1000,

        // Max login attempts before lockout
        maxLoginAttempts: 5,

        // Lockout duration in milliseconds (15 minutes)
        lockoutDuration: 15 * 60 * 1000,

        // Minimum password length
        minPasswordLength: 8,

        // Input max lengths
        maxInputLength: {
            username: 100,
            email: 255,
            text: 1000,
            longText: 10000
        }
    };

    // -------------------------------------------------------------------------
    // Input Sanitization
    // -------------------------------------------------------------------------

    /**
     * Sanitize string input by removing/escaping dangerous characters
     * @param {string} input - Raw user input
     * @param {Object} options - Sanitization options
     * @returns {string} Sanitized string
     */
    static sanitizeString(input, options = {}) {
        if (input == null) return '';
        if (typeof input !== 'string') input = String(input);

        const maxLength = options.maxLength || SecurityUtils.CONFIG.maxInputLength.text;

        // Trim and limit length
        let sanitized = input.trim().substring(0, maxLength);

        // Remove null bytes
        sanitized = sanitized.replace(/\0/g, '');

        // Optionally strip HTML tags
        if (options.stripHtml !== false) {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }

        // Optionally normalize whitespace
        if (options.normalizeWhitespace !== false) {
            sanitized = sanitized.replace(/\s+/g, ' ');
        }

        return sanitized;
    }

    /**
     * Sanitize email address
     * @param {string} email - Raw email input
     * @returns {string|null} Sanitized email or null if invalid
     */
    static sanitizeEmail(email) {
        if (!email) return null;

        const sanitized = SecurityUtils.sanitizeString(email, {
            maxLength: SecurityUtils.CONFIG.maxInputLength.email,
            stripHtml: true
        }).toLowerCase();

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
            return null;
        }

        return sanitized;
    }

    /**
     * Sanitize username
     * @param {string} username - Raw username input
     * @returns {string|null} Sanitized username or null if invalid
     */
    static sanitizeUsername(username) {
        if (!username) return null;

        const sanitized = SecurityUtils.sanitizeString(username, {
            maxLength: SecurityUtils.CONFIG.maxInputLength.username,
            stripHtml: true
        });

        // Allow alphanumeric, underscore, hyphen only
        const cleaned = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');

        if (cleaned.length < 3) return null;

        return cleaned;
    }

    /**
     * Sanitize a number input
     * @param {*} input - Raw input
     * @param {Object} options - { min, max, default }
     * @returns {number} Sanitized number
     */
    static sanitizeNumber(input, options = {}) {
        let num = parseFloat(input);

        if (isNaN(num)) {
            return options.default !== undefined ? options.default : 0;
        }

        if (options.min !== undefined && num < options.min) {
            num = options.min;
        }

        if (options.max !== undefined && num > options.max) {
            num = options.max;
        }

        if (options.integer) {
            num = Math.floor(num);
        }

        return num;
    }

    /**
     * Sanitize SQL-like identifier (table/column names)
     * @param {string} identifier - Raw identifier
     * @returns {string|null} Sanitized identifier or null if invalid
     */
    static sanitizeIdentifier(identifier) {
        if (!identifier) return null;

        // Allow only alphanumeric and underscore
        const sanitized = String(identifier).replace(/[^a-zA-Z0-9_]/g, '');

        // Must start with letter or underscore
        if (!/^[a-zA-Z_]/.test(sanitized)) {
            return null;
        }

        return sanitized.substring(0, 64);
    }

    // -------------------------------------------------------------------------
    // Output Encoding (XSS Prevention)
    // -------------------------------------------------------------------------

    /**
     * Encode string for safe HTML output
     * @param {string} str - String to encode
     * @returns {string} HTML-encoded string
     */
    static encodeHtml(str) {
        if (str == null) return '';

        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Encode string for safe attribute value
     * @param {string} str - String to encode
     * @returns {string} Attribute-encoded string
     */
    static encodeAttribute(str) {
        if (str == null) return '';

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Encode string for safe JavaScript string context
     * @param {string} str - String to encode
     * @returns {string} JS-encoded string
     */
    static encodeJs(str) {
        if (str == null) return '';

        return JSON.stringify(String(str)).slice(1, -1);
    }

    /**
     * Create a safe text node (never treated as HTML)
     * @param {string} str - String content
     * @returns {Text} Text node
     */
    static createSafeTextNode(str) {
        return document.createTextNode(str || '');
    }

    /**
     * Safely set element text content (XSS-safe)
     * @param {Element} element - DOM element
     * @param {string} text - Text to set
     */
    static setTextContent(element, text) {
        if (element) {
            element.textContent = text || '';
        }
    }

    // -------------------------------------------------------------------------
    // CSRF Protection
    // -------------------------------------------------------------------------

    /**
     * Generate a CSRF token
     * @returns {string} CSRF token
     */
    static generateCsrfToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        // Store token with timestamp
        const tokenData = {
            token: token,
            created: Date.now()
        };

        // Store in sessionStorage (cleared when browser closes)
        const tokens = SecurityUtils._getCsrfTokens();
        tokens.push(tokenData);

        // Keep only recent tokens
        const cutoff = Date.now() - SecurityUtils.CONFIG.csrfTokenExpiry;
        const validTokens = tokens.filter(t => t.created > cutoff);
        sessionStorage.setItem('_csrf_tokens', JSON.stringify(validTokens));

        return token;
    }

    /**
     * Validate a CSRF token
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid
     */
    static validateCsrfToken(token) {
        if (!token) return false;

        const tokens = SecurityUtils._getCsrfTokens();
        const cutoff = Date.now() - SecurityUtils.CONFIG.csrfTokenExpiry;

        // Find matching valid token
        const validIndex = tokens.findIndex(t =>
            t.token === token && t.created > cutoff
        );

        if (validIndex >= 0) {
            // Remove used token (one-time use)
            tokens.splice(validIndex, 1);
            sessionStorage.setItem('_csrf_tokens', JSON.stringify(tokens));
            return true;
        }

        return false;
    }

    /**
     * Get stored CSRF tokens
     * @private
     */
    static _getCsrfTokens() {
        try {
            return JSON.parse(sessionStorage.getItem('_csrf_tokens') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Add CSRF token to a form
     * @param {HTMLFormElement} form - Form element
     */
    static addCsrfToForm(form) {
        if (!form) return;

        // Remove existing CSRF field if any
        const existing = form.querySelector('input[name="_csrf"]');
        if (existing) existing.remove();

        const token = SecurityUtils.generateCsrfToken();
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_csrf';
        input.value = token;
        form.appendChild(input);
    }

    /**
     * Get CSRF token header for AJAX requests
     * @returns {Object} Headers object with CSRF token
     */
    static getCsrfHeaders() {
        return {
            'X-CSRF-Token': SecurityUtils.generateCsrfToken()
        };
    }

    // -------------------------------------------------------------------------
    // Session Security
    // -------------------------------------------------------------------------

    /**
     * Generate a session fingerprint (browser + IP hash)
     * @returns {string} Session fingerprint
     */
    static generateSessionFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ];

        const fingerprint = components.join('|');
        return SecurityUtils._simpleHash(fingerprint);
    }

    /**
     * Simple hash function for non-cryptographic purposes
     * @private
     */
    static _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Update session activity timestamp
     */
    static updateSessionActivity() {
        sessionStorage.setItem('_last_activity', Date.now().toString());
    }

    /**
     * Check if session is idle (should timeout)
     * @returns {boolean} True if session should timeout
     */
    static isSessionIdle() {
        const lastActivity = parseInt(sessionStorage.getItem('_last_activity') || '0');
        const idleTime = Date.now() - lastActivity;
        return idleTime > SecurityUtils.CONFIG.sessionIdleTimeout;
    }

    /**
     * Start session activity monitoring
     * @param {Function} onTimeout - Callback when session times out
     */
    static startSessionMonitoring(onTimeout) {
        SecurityUtils.updateSessionActivity();

        // Update activity on user interaction
        const updateActivity = SecurityUtils._debounce(() => {
            SecurityUtils.updateSessionActivity();
        }, 1000);

        document.addEventListener('mousemove', updateActivity);
        document.addEventListener('keydown', updateActivity);
        document.addEventListener('click', updateActivity);
        document.addEventListener('scroll', updateActivity);

        // Check for timeout periodically
        const checkInterval = setInterval(() => {
            if (SecurityUtils.isSessionIdle()) {
                clearInterval(checkInterval);
                if (typeof onTimeout === 'function') {
                    onTimeout();
                }
            }
        }, 60000); // Check every minute

        // Return cleanup function
        return () => {
            clearInterval(checkInterval);
            document.removeEventListener('mousemove', updateActivity);
            document.removeEventListener('keydown', updateActivity);
            document.removeEventListener('click', updateActivity);
            document.removeEventListener('scroll', updateActivity);
        };
    }

    /**
     * Simple debounce helper
     * @private
     */
    static _debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // -------------------------------------------------------------------------
    // Password Validation
    // -------------------------------------------------------------------------

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} { valid: boolean, errors: string[], strength: string }
     */
    static validatePassword(password) {
        const errors = [];
        let strength = 0;

        if (!password || password.length < SecurityUtils.CONFIG.minPasswordLength) {
            errors.push(`Password must be at least ${SecurityUtils.CONFIG.minPasswordLength} characters`);
        } else {
            strength += 1;
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain a lowercase letter');
        } else {
            strength += 1;
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain an uppercase letter');
        } else {
            strength += 1;
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain a number');
        } else {
            strength += 1;
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            // Not an error, but affects strength
        } else {
            strength += 1;
        }

        // Common password check (basic)
        const common = ['password', '12345678', 'qwerty', 'admin'];
        if (common.some(c => password.toLowerCase().includes(c))) {
            errors.push('Password is too common');
            strength = Math.max(0, strength - 2);
        }

        const strengthLabels = ['weak', 'weak', 'fair', 'good', 'strong', 'very strong'];

        return {
            valid: errors.length === 0,
            errors: errors,
            strength: strengthLabels[strength] || 'weak',
            score: strength
        };
    }

    // -------------------------------------------------------------------------
    // Rate Limiting
    // -------------------------------------------------------------------------

    /**
     * Track login attempts for rate limiting
     * @param {string} identifier - Username or IP
     * @param {boolean} success - Whether login succeeded
     * @returns {Object} { allowed: boolean, remaining: number, lockoutUntil: number|null }
     */
    static trackLoginAttempt(identifier, success) {
        const key = '_login_attempts_' + SecurityUtils._simpleHash(identifier);
        let data = {};

        try {
            data = JSON.parse(localStorage.getItem(key) || '{}');
        } catch (e) {
            data = {};
        }

        const now = Date.now();

        // Clear old lockout
        if (data.lockoutUntil && data.lockoutUntil < now) {
            data = { attempts: [], lockoutUntil: null };
        }

        // Check if currently locked out
        if (data.lockoutUntil && data.lockoutUntil > now) {
            return {
                allowed: false,
                remaining: 0,
                lockoutUntil: data.lockoutUntil
            };
        }

        if (!data.attempts) data.attempts = [];

        if (success) {
            // Clear on success
            localStorage.removeItem(key);
            return { allowed: true, remaining: SecurityUtils.CONFIG.maxLoginAttempts, lockoutUntil: null };
        }

        // Add failed attempt
        data.attempts.push(now);

        // Keep only recent attempts (within lockout duration)
        const cutoff = now - SecurityUtils.CONFIG.lockoutDuration;
        data.attempts = data.attempts.filter(t => t > cutoff);

        // Check if should lock out
        if (data.attempts.length >= SecurityUtils.CONFIG.maxLoginAttempts) {
            data.lockoutUntil = now + SecurityUtils.CONFIG.lockoutDuration;
        }

        localStorage.setItem(key, JSON.stringify(data));

        return {
            allowed: data.attempts.length < SecurityUtils.CONFIG.maxLoginAttempts,
            remaining: Math.max(0, SecurityUtils.CONFIG.maxLoginAttempts - data.attempts.length),
            lockoutUntil: data.lockoutUntil
        };
    }

    // -------------------------------------------------------------------------
    // URL Validation
    // -------------------------------------------------------------------------

    /**
     * Validate and sanitize URL
     * @param {string} url - URL to validate
     * @param {Object} options - { allowedProtocols, allowedHosts }
     * @returns {string|null} Sanitized URL or null if invalid
     */
    static sanitizeUrl(url, options = {}) {
        if (!url) return null;

        try {
            const parsed = new URL(url);

            // Check protocol
            const allowedProtocols = options.allowedProtocols || ['https:', 'http:'];
            if (!allowedProtocols.includes(parsed.protocol)) {
                return null;
            }

            // Check host if specified
            if (options.allowedHosts && options.allowedHosts.length > 0) {
                if (!options.allowedHosts.includes(parsed.host)) {
                    return null;
                }
            }

            // Return sanitized URL (removes any javascript: in path)
            return parsed.href;

        } catch (e) {
            return null;
        }
    }

    /**
     * Check if URL is a safe redirect target
     * @param {string} url - URL to check
     * @returns {boolean} True if safe
     */
    static isSafeRedirect(url) {
        if (!url) return false;

        // Relative URLs are safe
        if (url.startsWith('/') && !url.startsWith('//')) {
            return true;
        }

        // Check for same origin
        try {
            const parsed = new URL(url, window.location.origin);
            return parsed.origin === window.location.origin;
        } catch (e) {
            return false;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityUtils;
}
