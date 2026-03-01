/**
 * class.AsEmptyState.js — Reusable empty state component for AutoScholar
 *
 * Renders a centered icon + message + optional action CTA.
 * Used when a panel, tab, or container has no data to display.
 *
 * Usage:
 *   AsEmptyState.render(container, {
 *       icon: 'fas fa-user-graduate',
 *       title: 'No student selected',
 *       message: 'Select a student from the list to view their profile.',
 *       action: { label: 'Search Students', onClick: () => {...} }
 *   });
 *
 *   AsEmptyState.loading(container);    // show skeleton loading
 *   AsEmptyState.clear(container);      // remove empty state
 */
class AsEmptyState {

    static PRESETS = {
        'no-student':    { icon: 'fas fa-user-graduate',   title: 'No student selected',     message: 'Select a student from the list to view their profile.' },
        'no-case':       { icon: 'fas fa-hands-helping',   title: 'No cases yet',            message: 'Create a new case to start tracking student support.' },
        'no-programme':  { icon: 'fas fa-sitemap',         title: 'No programme selected',   message: 'Choose a programme to view its structure and performance.' },
        'no-class':      { icon: 'fas fa-chalkboard',      title: 'No classes loaded',       message: 'Select a course to view its class roster and analytics.' },
        'no-report':     { icon: 'fas fa-file-alt',        title: 'No reports generated',    message: 'Generate a report using the controls on the left.' },
        'no-data':       { icon: 'fas fa-database',        title: 'No data available',       message: 'Data will appear here once loaded from the institution API.' },
        'no-results':    { icon: 'fas fa-search',          title: 'No results found',        message: 'Try adjusting your search or filter criteria.' },
        'no-connection': { icon: 'fas fa-wifi',            title: 'Not connected',           message: 'Unable to reach the institution API. Check your VPN connection.' },
        'error':         { icon: 'fas fa-exclamation-triangle', title: 'Something went wrong', message: 'An error occurred loading this panel.' },
        'loading':       { icon: 'fas fa-spinner fa-spin', title: 'Loading...',              message: '' }
    };

    /**
     * Render an empty state into a container.
     * @param {HTMLElement} container
     * @param {Object|string} opts - Options object or preset key
     */
    static render(container, opts = {}) {
        if (typeof opts === 'string') {
            opts = { ...AsEmptyState.PRESETS[opts] } || {};
        }

        const icon = opts.icon || 'fas fa-inbox';
        const title = opts.title || 'Nothing here';
        const message = opts.message || '';

        const el = document.createElement('div');
        el.className = 'as-empty-state';

        el.innerHTML =
            `<i class="${icon} as-empty-state-icon"></i>` +
            `<div class="as-empty-state-title">${title}</div>` +
            (message ? `<div class="as-empty-state-text">${message}</div>` : '');

        if (opts.action) {
            const btn = document.createElement('button');
            btn.className = 'as-empty-state-action';
            btn.innerHTML = opts.action.icon ? `<i class="${opts.action.icon}"></i> ` : '';
            btn.innerHTML += opts.action.label || 'Take action';
            btn.addEventListener('click', opts.action.onClick);
            el.appendChild(btn);
        }

        container.appendChild(el);
        return el;
    }

    /**
     * Render skeleton loading state.
     * @param {HTMLElement} container
     * @param {string} template - 'metrics' | 'table' | 'cards' | 'detail'
     * @param {number} count - Number of skeleton items
     */
    static loading(container, template = 'table', count = 5) {
        const el = document.createElement('div');
        el.className = 'as-skeleton-container';

        switch (template) {
            case 'metrics':
                el.innerHTML = Array(count).fill(0).map(() =>
                    '<div class="as-skeleton as-skeleton-chip"></div>'
                ).join('');
                break;
            case 'table':
                el.innerHTML =
                    '<div class="as-skeleton as-skeleton-header"></div>' +
                    Array(count).fill(0).map(() =>
                        '<div class="as-skeleton as-skeleton-row"></div>'
                    ).join('');
                break;
            case 'cards':
                el.innerHTML = Array(count).fill(0).map(() =>
                    '<div class="as-skeleton as-skeleton-card"></div>'
                ).join('');
                break;
            case 'detail':
                el.innerHTML =
                    '<div class="as-skeleton as-skeleton-title"></div>' +
                    '<div class="as-skeleton as-skeleton-line"></div>' +
                    '<div class="as-skeleton as-skeleton-line" style="width:75%"></div>' +
                    '<div class="as-skeleton as-skeleton-line" style="width:60%"></div>';
                break;
        }

        container.appendChild(el);
        return el;
    }

    /** Remove all empty states from a container */
    static clear(container) {
        container.querySelectorAll('.as-empty-state, .as-skeleton-container').forEach(el => el.remove());
    }
}
