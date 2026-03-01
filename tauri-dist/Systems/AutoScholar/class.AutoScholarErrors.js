/**
 * AutoScholarErrors - Centralized error handling utility
 *
 * Provides consistent error handling across all AutoScholar components:
 * - User-friendly error messages (never show raw technical errors)
 * - Developer logging for debugging
 * - Toast notifications for user feedback
 * - Retry helpers for transient failures
 */
class AutoScholarErrors {

    /**
     * Convert technical error to user-friendly message
     * @param {Error} error - The error object
     * @returns {string} User-friendly message
     */
    static getUserMessage(error) {
        if (!error) {
            return 'An unexpected error occurred.';
        }

        const message = error.message?.toLowerCase() || '';
        const errorName = error.name?.toLowerCase() || '';

        // Timeout errors
        if (errorName === 'aborterror' || errorName === 'timeouterror' || message.includes('timeout')) {
            return 'The request took too long. Please try again.';
        }

        // Network errors
        if (message.includes('fetch') || message.includes('network') ||
            message.includes('econnreset') || message.includes('econnrefused')) {
            return 'Unable to connect. Please check your internet connection.';
        }

        // Authentication errors
        if (error.status === 401 || message.includes('401') ||
            message.includes('not authenticated') || message.includes('session expired')) {
            return 'Your session has expired. Please log in again.';
        }

        // Authorization errors
        if (error.status === 403 || message.includes('403') ||
            message.includes('access denied') || message.includes('forbidden')) {
            return 'You do not have permission for this action.';
        }

        // Not found errors
        if (error.status === 404 || message.includes('404') || message.includes('not found')) {
            return 'The requested resource was not found.';
        }

        // Validation errors
        if (error.status === 400 || message.includes('400') ||
            message.includes('invalid') || message.includes('validation')) {
            return error.userMessage || 'Please check your input and try again.';
        }

        // Server errors
        if (error.status >= 500 || message.includes('500') ||
            message.includes('server error') || message.includes('internal error')) {
            return 'A server error occurred. Please try again later.';
        }

        // Rate limiting
        if (error.status === 429 || message.includes('429') || message.includes('rate limit')) {
            return 'Too many requests. Please wait a moment and try again.';
        }

        // Use custom user message if provided
        if (error.userMessage) {
            return error.userMessage;
        }

        // Default message
        return 'Something went wrong. Please try again.';
    }

    /**
     * Log error for developers with context
     * @param {Error} error - The error object
     * @param {Object} context - Additional context (component, action, etc.)
     */
    static logError(error, context = {}) {
        const logEntry = {
            message: error?.message || 'Unknown error',
            name: error?.name,
            stack: error?.stack,
            status: error?.status,
            context: {
                ...context,
                ...(error?.context || {})
            },
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        console.error('[AutoScholar Error]', logEntry);

        // Store in session for debugging (keep last 50 errors)
        try {
            const errorLog = JSON.parse(sessionStorage.getItem('autoscholar_errors') || '[]');
            errorLog.unshift(logEntry);
            sessionStorage.setItem('autoscholar_errors', JSON.stringify(errorLog.slice(0, 50)));
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Show error to user via toast and log for developer
     * @param {Error} error - The error object
     * @param {string} context - Context description (e.g., "loading student data")
     */
    static showError(error, context = '') {
        const userMessage = this.getUserMessage(error);

        // Show toast if available
        if (typeof uiToast !== 'undefined') {
            ElToast.show(userMessage, 'error');
        } else {
            // Fallback to alert
            console.warn('uiToast not available, using console');
        }

        // Log for developers
        this.logError(error, { displayContext: context });
    }

    /**
     * Show a warning (not a hard error)
     * @param {string} message - Warning message for user
     * @param {string} context - Context for logging
     */
    static showWarning(message, context = '') {
        if (typeof uiToast !== 'undefined') {
            ElToast.show(message, 'warning');
        }
        console.warn('[AutoScholar Warning]', { message, context, timestamp: new Date().toISOString() });
    }

    /**
     * Handle an async operation with consistent error handling
     * @param {Function} operation - Async function to execute
     * @param {Object} options - Options: context, onError, showToast
     * @returns {Promise<{success: boolean, data: any, error: Error}>}
     */
    static async handleAsync(operation, options = {}) {
        const { context = '', onError = null, showToast = true } = options;

        try {
            const data = await operation();
            return { success: true, data, error: null };
        } catch (error) {
            if (showToast) {
                this.showError(error, context);
            } else {
                this.logError(error, { context });
            }

            if (onError) {
                onError(error);
            }

            return { success: false, data: null, error };
        }
    }

    /**
     * Create a wrapped version of an async function with error handling
     * @param {Function} fn - Function to wrap
     * @param {string} context - Context description
     * @returns {Function} Wrapped function
     */
    static withErrorHandling(fn, context = '') {
        return async (...args) => {
            return this.handleAsync(() => fn(...args), { context });
        };
    }

    /**
     * Assert a condition with a helpful error
     * @param {boolean} condition - Condition to check
     * @param {string} message - Error message if condition fails
     * @param {string} context - Additional context
     */
    static assert(condition, message, context = '') {
        if (!condition) {
            const error = new Error(message);
            error.name = 'AssertionError';
            this.logError(error, { context, isAssertion: true });
            throw error;
        }
    }

    /**
     * Safely access nested object properties
     * @param {Object} obj - Object to access
     * @param {string} path - Dot-separated path (e.g., 'services.member.publon')
     * @param {any} defaultValue - Default value if path not found
     * @returns {any} Value at path or default
     */
    static safeGet(obj, path, defaultValue = null) {
        if (obj == null || !path) return defaultValue;

        try {
            const parts = path.split('.');
            let current = obj;

            for (const part of parts) {
                if (current == null) return defaultValue;
                current = current[part];
            }

            return current ?? defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    /**
     * Safely access Publon rows with null filtering
     * @param {Object} services - Services object
     * @param {string} serviceName - Service name (e.g., 'member')
     * @param {string} tableName - Table name (e.g., 'member')
     * @returns {Array} Filtered rows array
     */
    static safeRows(services, serviceName, tableName) {
        const rows = this.safeGet(services, `${serviceName}.publon.${tableName}.rows`, []);
        return Array.isArray(rows) ? rows.filter(r => r != null) : [];
    }

    /**
     * Get stored error log for debugging
     * @returns {Array} Array of recent errors
     */
    static getErrorLog() {
        try {
            return JSON.parse(sessionStorage.getItem('autoscholar_errors') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Clear stored error log
     */
    static clearErrorLog() {
        sessionStorage.removeItem('autoscholar_errors');
    }

    /**
     * Check if an error is retryable (transient)
     * @param {Error} error - The error to check
     * @returns {boolean} True if error is retryable
     */
    static isRetryable(error) {
        if (!error) return false;

        const message = error.message?.toLowerCase() || '';
        const errorName = error.name?.toLowerCase() || '';

        // Timeout and abort errors are retryable
        if (errorName === 'aborterror' || errorName === 'timeouterror') {
            return true;
        }

        // Network errors are retryable
        if (message.includes('fetch') || message.includes('network') ||
            message.includes('econnreset') || message.includes('econnrefused')) {
            return true;
        }

        // Server errors (5xx) are retryable
        if (error.status >= 500 && error.status < 600) {
            return true;
        }

        // Rate limiting is retryable (after delay)
        if (error.status === 429) {
            return true;
        }

        return false;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AutoScholarErrors = AutoScholarErrors;
}
