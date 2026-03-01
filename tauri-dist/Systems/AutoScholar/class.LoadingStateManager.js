/**
 * LoadingStateManager - Centralized loading state management for AutoScholar
 *
 * Provides consistent loading UI across all components:
 * - Spinner overlays for quick operations
 * - Skeleton screens for content that takes time to load
 * - Progress bars for batch operations
 * - Error states with retry functionality
 *
 * Usage:
 *   // Show spinner
 *   const loader = LoadingStateManager.showSpinner(container, { message: 'Loading...' });
 *   await fetchData();
 *   LoadingStateManager.hide(loader);
 *
 *   // Show skeleton
 *   const skeleton = LoadingStateManager.showSkeleton(container, 'cards', { count: 3 });
 *   await fetchData();
 *   LoadingStateManager.hide(skeleton);
 *
 *   // Show progress
 *   const progress = LoadingStateManager.showProgress(container, { total: 100 });
 *   for (let i = 0; i < 100; i++) {
 *     await processItem(i);
 *     LoadingStateManager.updateProgress(progress, i + 1);
 *   }
 *   LoadingStateManager.hide(progress);
 */

class LoadingStateManager {
    // Track active loaders to prevent memory leaks
    static _activeLoaders = new Map();
    static _idCounter = 0;

    /**
     * Show a spinner overlay
     * @param {HTMLElement|El} container - Container to show spinner in
     * @param {Object} options - Options
     * @param {string} options.message - Loading message
     * @param {string} options.size - Spinner size (sm, md, lg, xl)
     * @param {boolean} options.overlay - Show as overlay (preserves content behind)
     * @param {number} options.minDuration - Minimum display time in ms
     * @returns {string} Loader ID for later removal
     */
    static showSpinner(container, options = {}) {
        const {
            message = 'Loading...',
            size = 'md',
            overlay = false,
            minDuration = 0
        } = options;

        const id = `loader-${++this._idCounter}`;
        const el = this._getElement(container);

        // Store original content if not overlay
        const originalContent = overlay ? null : el.innerHTML;

        // Create spinner element
        const spinnerHtml = this._createSpinnerHtml(message, size, overlay);

        if (overlay) {
            // Create overlay that sits on top of content
            const overlayEl = document.createElement('div');
            overlayEl.id = id;
            overlayEl.className = 'loading-overlay';
            overlayEl.innerHTML = spinnerHtml;
            el.classList.add('as-overlay-parent');
            el.appendChild(overlayEl);
        } else {
            el.innerHTML = spinnerHtml;
        }

        // Store loader info
        this._activeLoaders.set(id, {
            container: el,
            originalContent,
            overlay,
            startTime: Date.now(),
            minDuration
        });

        return id;
    }

    /**
     * Show skeleton placeholder screens
     * @param {HTMLElement|El} container - Container to show skeleton in
     * @param {string} type - Skeleton type: 'cards', 'table', 'list', 'text', 'form', 'stats'
     * @param {Object} options - Options
     * @param {number} options.count - Number of skeleton items
     * @param {number} options.columns - Number of columns for grid layouts
     * @returns {string} Loader ID for later removal
     */
    static showSkeleton(container, type = 'text', options = {}) {
        const id = `loader-${++this._idCounter}`;
        const el = this._getElement(container);
        const originalContent = el.innerHTML;

        const skeletonHtml = this._createSkeletonHtml(type, options);
        el.innerHTML = skeletonHtml;

        this._activeLoaders.set(id, {
            container: el,
            originalContent,
            overlay: false,
            startTime: Date.now(),
            minDuration: options.minDuration || 0
        });

        return id;
    }

    /**
     * Show progress bar for batch operations
     * @param {HTMLElement|El} container - Container to show progress in
     * @param {Object} options - Options
     * @param {number} options.total - Total items to process
     * @param {string} options.message - Progress message template (use {current} and {total} placeholders)
     * @returns {string} Loader ID for later updates/removal
     */
    static showProgress(container, options = {}) {
        const {
            total = 100,
            message = 'Processing {current} of {total}...'
        } = options;

        const id = `loader-${++this._idCounter}`;
        const el = this._getElement(container);
        const originalContent = el.innerHTML;

        const progressHtml = `
            <div class="loading-progress p-4 text-center">
                <div class="loading-progress-bar mb-3">
                    <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div id="${id}-bar" class="bg-primary h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>
                <div id="${id}-text" class="text-sm text-muted">
                    ${message.replace('{current}', '0').replace('{total}', total)}
                </div>
            </div>
        `;

        el.innerHTML = progressHtml;

        this._activeLoaders.set(id, {
            container: el,
            originalContent,
            overlay: false,
            startTime: Date.now(),
            total,
            message,
            current: 0
        });

        return id;
    }

    /**
     * Update progress bar value
     * @param {string} loaderId - Loader ID from showProgress
     * @param {number} current - Current progress value
     * @param {string} customMessage - Optional custom message override
     */
    static updateProgress(loaderId, current, customMessage = null) {
        const loader = this._activeLoaders.get(loaderId);
        if (!loader) return;

        loader.current = current;
        const percent = Math.min(100, Math.round((current / loader.total) * 100));

        const bar = document.getElementById(`${loaderId}-bar`);
        const text = document.getElementById(`${loaderId}-text`);

        if (bar) bar.setAttribute('style', `width:${percent}%`);
        if (text) {
            const msg = customMessage || loader.message;
            text.textContent = msg.replace('{current}', current).replace('{total}', loader.total);
        }
    }

    /**
     * Show error state with optional retry button
     * @param {HTMLElement|El} container - Container to show error in
     * @param {Object} options - Options
     * @param {string} options.message - Error message
     * @param {Function} options.onRetry - Retry callback function
     * @param {string} options.retryLabel - Retry button label
     * @returns {string} Loader ID for later removal
     */
    static showError(container, options = {}) {
        const {
            message = 'An error occurred. Please try again.',
            onRetry = null,
            retryLabel = 'Retry'
        } = options;

        const id = `loader-${++this._idCounter}`;
        const el = this._getElement(container);
        const originalContent = el.innerHTML;

        let errorHtml = `
            <div class="loading-error p-6 text-center">
                <div class="text-red-500 mb-3">
                    <i class="fas fa-exclamation-circle text-3xl"></i>
                </div>
                <div class="text-gray-700 mb-4">${message}</div>
        `;

        if (onRetry) {
            errorHtml += `
                <button id="${id}-retry" class="btn btn-primary btn-sm">
                    <i class="fas fa-redo mr-2"></i>${retryLabel}
                </button>
            `;
        }

        errorHtml += '</div>';
        el.innerHTML = errorHtml;

        // Attach retry handler
        if (onRetry) {
            setTimeout(() => {
                const retryBtn = document.getElementById(`${id}-retry`);
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        this.hide(id);
                        onRetry();
                    });
                }
            }, 0);
        }

        this._activeLoaders.set(id, {
            container: el,
            originalContent,
            overlay: false,
            startTime: Date.now()
        });

        return id;
    }

    /**
     * Hide a loader and restore original content
     * @param {string} loaderId - Loader ID to hide
     * @param {boolean} restoreContent - Whether to restore original content (default: false)
     */
    static hide(loaderId, restoreContent = false) {
        const loader = this._activeLoaders.get(loaderId);
        if (!loader) return;

        const { container, originalContent, overlay, startTime, minDuration } = loader;

        // Ensure minimum duration if specified
        const elapsed = Date.now() - startTime;
        if (minDuration && elapsed < minDuration) {
            setTimeout(() => this.hide(loaderId, restoreContent), minDuration - elapsed);
            return;
        }

        if (overlay) {
            // Remove overlay element
            const overlayEl = document.getElementById(loaderId);
            if (overlayEl) {
                overlayEl.remove();
            }
        } else if (restoreContent && originalContent !== null) {
            // Restore original content
            container.innerHTML = originalContent;
        } else {
            // Clear content (caller will populate)
            container.innerHTML = '';
        }

        this._activeLoaders.delete(loaderId);
    }

    /**
     * Hide all active loaders
     */
    static hideAll() {
        for (const id of this._activeLoaders.keys()) {
            this.hide(id);
        }
    }

    /**
     * Check if a loader is active
     * @param {string} loaderId - Loader ID to check
     * @returns {boolean}
     */
    static isActive(loaderId) {
        return this._activeLoaders.has(loaderId);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Get DOM element from container (handles Newui components)
     */
    static _getElement(container) {
        if (container instanceof HTMLElement) {
            return container;
        }
        if (container.domElement) {
            return container.domElement;
        }
        throw new Error('LoadingStateManager: Invalid container');
    }

    /**
     * Create spinner HTML
     */
    static _createSpinnerHtml(message, size, overlay) {
        const sizeClass = {
            sm: 'text-base',
            md: 'text-xl',
            lg: 'text-3xl',
            xl: 'text-5xl'
        }[size] || 'text-xl';

        const containerClass = overlay
            ? 'absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10'
            : 'flex flex-col items-center justify-center py-8';

        return `
            <div class="${containerClass}">
                <i class="fas fa-spinner fa-spin text-primary ${sizeClass} mb-3"></i>
                <div class="text-muted text-sm">${message}</div>
            </div>
        `;
    }

    /**
     * Create skeleton HTML based on type
     */
    static _createSkeletonHtml(type, options = {}) {
        const { count = 3, columns = 3 } = options;

        switch (type) {
            case 'cards':
                return this._createCardSkeletons(count, columns);

            case 'table':
                return this._createTableSkeleton(options.rows || 5, options.cols || 4);

            case 'list':
                return this._createListSkeleton(count);

            case 'text':
                return this._createTextSkeleton(count);

            case 'form':
                return this._createFormSkeleton(options.fields || 4);

            case 'stats':
                return this._createStatsSkeleton(count);

            case 'timeline':
                return this._createTimelineSkeleton(count);

            default:
                return this._createTextSkeleton(count);
        }
    }

    static _createCardSkeletons(count, columns) {
        const gridClass = `grid grid-cols-${Math.min(columns, 4)} gap-4`;
        let html = `<div class="${gridClass}">`;

        for (let i = 0; i < count; i++) {
            html += `
                <div class="card p-4 animate-pulse">
                    <div class="flex items-start gap-3">
                        <div class="skeleton skeleton-circle w-12 h-12"></div>
                        <div class="flex-1">
                            <div class="skeleton skeleton-text w-3/4 mb-2"></div>
                            <div class="skeleton skeleton-text w-1/2"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    static _createTableSkeleton(rows, cols) {
        let html = '<div class="animate-pulse">';

        // Header
        html += '<div class="flex gap-4 p-3 bg-gray-100 rounded-t">';
        for (let c = 0; c < cols; c++) {
            html += `<div class="skeleton skeleton-text flex-1 h-4"></div>`;
        }
        html += '</div>';

        // Rows
        for (let r = 0; r < rows; r++) {
            html += '<div class="flex gap-4 p-3 border-b">';
            for (let c = 0; c < cols; c++) {
                const width = c === 0 ? 'w-1/4' : 'flex-1';
                html += `<div class="skeleton skeleton-text ${width} h-4"></div>`;
            }
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    static _createListSkeleton(count) {
        let html = '<div class="space-y-3 animate-pulse">';

        for (let i = 0; i < count; i++) {
            html += `
                <div class="flex items-center gap-3 p-3 border rounded">
                    <div class="skeleton skeleton-circle w-10 h-10"></div>
                    <div class="flex-1">
                        <div class="skeleton skeleton-text w-2/3 mb-2"></div>
                        <div class="skeleton skeleton-text w-1/3 h-3"></div>
                    </div>
                    <div class="skeleton skeleton-rect w-20 h-8 rounded"></div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    static _createTextSkeleton(lines) {
        let html = '<div class="space-y-3 animate-pulse">';

        const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
        for (let i = 0; i < lines; i++) {
            const width = widths[i % widths.length];
            html += `<div class="skeleton skeleton-text ${width} h-4"></div>`;
        }

        html += '</div>';
        return html;
    }

    static _createFormSkeleton(fields) {
        let html = '<div class="space-y-4 animate-pulse">';

        for (let i = 0; i < fields; i++) {
            html += `
                <div>
                    <div class="skeleton skeleton-text w-1/4 h-4 mb-2"></div>
                    <div class="skeleton skeleton-rect w-full h-10 rounded"></div>
                </div>
            `;
        }

        // Submit button
        html += `
            <div class="pt-4">
                <div class="skeleton skeleton-button w-32 h-10"></div>
            </div>
        `;

        html += '</div>';
        return html;
    }

    static _createStatsSkeleton(count) {
        const gridClass = `grid grid-cols-${Math.min(count, 4)} gap-4`;
        let html = `<div class="${gridClass} animate-pulse">`;

        for (let i = 0; i < count; i++) {
            html += `
                <div class="card p-4">
                    <div class="skeleton skeleton-text w-1/2 h-3 mb-3"></div>
                    <div class="skeleton skeleton-text w-3/4 h-8 mb-2"></div>
                    <div class="skeleton skeleton-text w-1/3 h-3"></div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    static _createTimelineSkeleton(count) {
        let html = '<div class="space-y-2 animate-pulse">';

        for (let i = 0; i < count; i++) {
            html += `
                <div class="p-3 rounded border">
                    <div class="flex items-center justify-between mb-2">
                        <div class="skeleton skeleton-text w-16 h-5"></div>
                        <div class="skeleton skeleton-text w-12 h-5 rounded-full"></div>
                    </div>
                    <div class="skeleton skeleton-rect w-full h-1.5 rounded-full mb-2"></div>
                    <div class="flex justify-between">
                        <div class="skeleton skeleton-text w-20 h-3"></div>
                        <div class="skeleton skeleton-text w-12 h-3"></div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }
}

// =========================================================================
// UTILITY FUNCTIONS FOR COMMON PATTERNS
// =========================================================================

/**
 * Wrapper for async operations with automatic loading state
 * @param {HTMLElement|El} container - Container element
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Loading options
 * @returns {Promise<any>} Result of async function
 */
LoadingStateManager.withLoading = async function(container, asyncFn, options = {}) {
    const {
        type = 'spinner',
        skeleton = 'text',
        message = 'Loading...',
        errorMessage = 'Failed to load data',
        onError = null,
        minDuration = 300
    } = options;

    let loaderId;

    if (type === 'skeleton') {
        loaderId = this.showSkeleton(container, skeleton, { minDuration });
    } else {
        loaderId = this.showSpinner(container, { message, minDuration });
    }

    try {
        const result = await asyncFn();
        this.hide(loaderId);
        return result;
    } catch (error) {
        this.hide(loaderId);

        if (onError) {
            this.showError(container, {
                message: errorMessage,
                onRetry: () => this.withLoading(container, asyncFn, options)
            });
        }

        throw error;
    }
};

/**
 * Wrapper for batch operations with progress indicator
 * @param {HTMLElement|El} container - Container element
 * @param {Array} items - Items to process
 * @param {Function} processFn - Async function to process each item
 * @param {Object} options - Options
 * @returns {Promise<Array>} Results array
 */
LoadingStateManager.withProgress = async function(container, items, processFn, options = {}) {
    const {
        message = 'Processing {current} of {total}...',
        onError = null
    } = options;

    const loaderId = this.showProgress(container, {
        total: items.length,
        message
    });

    const results = [];
    let errors = [];

    for (let i = 0; i < items.length; i++) {
        try {
            const result = await processFn(items[i], i);
            results.push(result);
        } catch (error) {
            errors.push({ index: i, item: items[i], error });
            if (onError) onError(error, items[i], i);
        }

        this.updateProgress(loaderId, i + 1);
    }

    this.hide(loaderId);

    return { results, errors };
};

// Export for browser
if (typeof window !== 'undefined') {
    window.LoadingStateManager = LoadingStateManager;
}
