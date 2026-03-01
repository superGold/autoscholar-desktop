/**
 * class.AsToast.js — Toast notification system for AutoScholar
 *
 * 4-tier feedback severity per design spec:
 *   T1 Low-stakes    → Optimistic + toast (4s auto-dismiss)
 *   T2 Medium        → Optimistic + undo toast (6s)
 *   T3 High-stakes   → Confirm dialog + toast (6s)
 *   T4 Destructive   → Typed confirmation + toast (8s)
 *
 * Position: top-right, 16px from edge. Max 3 stacked. Width 360px.
 *
 * Usage:
 *   AsToast.info('Filter applied');
 *   AsToast.success('Record saved');
 *   AsToast.warning('Connection unstable');
 *   AsToast.error('Failed to delete record');
 *   AsToast.show({ type: 'success', message: 'Saved', undoAction: () => {...} });
 */
class AsToast {

    static _container = null;
    static _queue = [];
    static MAX_VISIBLE = 3;

    static DEFAULTS = {
        info:    { icon: 'fas fa-info-circle',       duration: 4000, color: 'var(--ui-primary-500)' },
        success: { icon: 'fas fa-check-circle',      duration: 4000, color: 'var(--ui-green-500)' },
        warning: { icon: 'fas fa-exclamation-circle', duration: 6000, color: 'var(--ui-amber-500)' },
        error:   { icon: 'fas fa-times-circle',      duration: 8000, color: 'var(--ui-red-500)' }
    };

    // ── Convenience methods ─────────────────────────────────────────────

    static info(message, opts = {})    { return AsToast.show({ type: 'info', message, ...opts }); }
    static success(message, opts = {}) { return AsToast.show({ type: 'success', message, ...opts }); }
    static warning(message, opts = {}) { return AsToast.show({ type: 'warning', message, ...opts }); }
    static error(message, opts = {})   { return AsToast.show({ type: 'error', message, ...opts }); }

    // ── Core API ────────────────────────────────────────────────────────

    /**
     * @param {Object} opts
     * @param {string} opts.type        - 'info' | 'success' | 'warning' | 'error'
     * @param {string} opts.message     - Toast message
     * @param {number} [opts.duration]  - Override auto-dismiss (ms). 0 = manual dismiss.
     * @param {Function} [opts.undoAction] - If provided, shows Undo button (T2 pattern)
     * @param {string} [opts.actionLabel]  - Custom action button label (default 'Undo')
     */
    static show(opts = {}) {
        AsToast._ensureContainer();

        const type = opts.type || 'info';
        const defaults = AsToast.DEFAULTS[type] || AsToast.DEFAULTS.info;
        const duration = opts.duration !== undefined ? opts.duration : defaults.duration;

        const toast = document.createElement('div');
        toast.className = `as-toast as-toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        // Icon
        const icon = document.createElement('i');
        icon.className = `${defaults.icon} as-toast-icon`;
        icon.style.color = defaults.color;
        toast.appendChild(icon);

        // Content
        const content = document.createElement('div');
        content.className = 'as-toast-content';

        const msg = document.createElement('span');
        msg.className = 'as-toast-message';
        msg.textContent = opts.message || '';
        content.appendChild(msg);

        // Undo/action button (T2 pattern)
        if (opts.undoAction) {
            const btn = document.createElement('button');
            btn.className = 'as-toast-action';
            btn.textContent = opts.actionLabel || 'Undo';
            btn.addEventListener('click', () => {
                opts.undoAction();
                AsToast._dismiss(toast);
            });
            content.appendChild(btn);
        }

        toast.appendChild(content);

        // Close button
        const close = document.createElement('button');
        close.className = 'as-toast-close';
        close.innerHTML = '<i class="fas fa-times"></i>';
        close.setAttribute('aria-label', 'Dismiss');
        close.addEventListener('click', () => AsToast._dismiss(toast));
        toast.appendChild(close);

        // Progress bar (for timed toasts)
        if (duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'as-toast-progress';
            const bar = document.createElement('div');
            bar.className = `as-toast-progress-bar as-toast-progress-${type}`;
            bar.style.animationDuration = `${duration}ms`;
            progress.appendChild(bar);
            toast.appendChild(progress);
        }

        // Add to container
        AsToast._container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('as-toast-visible'));

        // Auto-dismiss
        if (duration > 0) {
            toast._timer = setTimeout(() => AsToast._dismiss(toast), duration);
        }

        // Enforce max visible
        AsToast._enforceMax();

        return toast;
    }

    // ── Internal ────────────────────────────────────────────────────────

    static _ensureContainer() {
        if (AsToast._container) return;
        const c = document.createElement('div');
        c.className = 'as-toast-container';
        c.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(c);
        AsToast._container = c;
    }

    static _dismiss(toast) {
        if (toast._dismissed) return;
        toast._dismissed = true;
        if (toast._timer) clearTimeout(toast._timer);
        toast.classList.remove('as-toast-visible');
        toast.classList.add('as-toast-exit');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 200);
    }

    static _enforceMax() {
        const toasts = AsToast._container.querySelectorAll('.as-toast:not(.as-toast-exit)');
        if (toasts.length > AsToast.MAX_VISIBLE) {
            // Dismiss oldest
            AsToast._dismiss(toasts[0]);
        }
    }

    /** Clear all toasts */
    static clear() {
        if (!AsToast._container) return;
        const toasts = AsToast._container.querySelectorAll('.as-toast');
        toasts.forEach(t => AsToast._dismiss(t));
    }
}
