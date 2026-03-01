/**
 * El — Minimal DOM element builder for AutoScholar
 *
 * Provides the NewBlUi-compatible API used throughout AutoScholar:
 *   new El({ parent, css, tag, script, style, attr, onclick })
 *   .add({ css, tag, script, attr })  → child El
 *   .domElement                        → HTMLElement
 *   .clear(clearDom)                   → remove children
 *   .update({ script, css, style })    → update content
 *   El.from(element)                   → wrap existing DOM element
 *
 * Aliased as window.NewBlUi for backward compatibility.
 */
class El {

    // ── Constructor ──────────────────────────────────────────────────────

    constructor(settings = {}) {
        this.settings = settings;
        this.parent = settings.parent || null;
        this.css = settings.css || '';
        this.style = settings.style || '';
        this.script = settings.script || '';
        this.children = {};
        this._id = 'el_' + Math.random().toString(36).substr(2, 9);
        this._listeners = {};

        // Create DOM element
        const tag = settings.tag || 'div';
        this.domElement = document.createElement(tag);
        this.domElement.id = this._id;

        // Apply styling
        if (this.css) this.domElement.className = this.css;
        if (this.style) this.domElement.style.cssText = this.style;

        // Apply attributes
        const attrs = settings.attr || settings.attrs;
        if (attrs) {
            for (const [key, val] of Object.entries(attrs)) {
                this.domElement.setAttribute(key, val);
            }
        }

        // Apply content
        if (this.script) {
            if (this.script instanceof HTMLElement) {
                this.domElement.appendChild(this.script);
            } else {
                this.domElement.innerHTML = this.script;
            }
        }

        // Apply onclick
        if (settings.onclick) {
            this.domElement.onclick = settings.onclick;
        }

        // Attach to parent
        if (this.parent) {
            if (this.parent.domElement) {
                this.parent.domElement.appendChild(this.domElement);
                this.parent.children[this._id] = this;
            } else if (this.parent instanceof HTMLElement) {
                this.parent.appendChild(this.domElement);
            }
        }
    }

    // ── Public API ───────────────────────────────────────────────────────

    /** Add a child element */
    add(settings = {}) {
        settings.parent = this;
        const ChildClass = settings.type || El;
        return new ChildClass(settings);
    }

    /** Update content/style */
    update(newSettings = {}) {
        if (newSettings.css !== undefined) {
            this.css = newSettings.css;
            this.domElement.className = this.css;
        }
        if (newSettings.style !== undefined) {
            this.style = newSettings.style;
            this.domElement.style.cssText = this.style;
        }
        if (newSettings.script !== undefined) {
            this.script = newSettings.script;
            this.domElement.innerHTML = '';
            if (this.script) {
                if (this.script instanceof HTMLElement) {
                    this.domElement.appendChild(this.script);
                } else {
                    this.domElement.innerHTML = this.script;
                }
            }
        }
        this.emit('update', { component: this, settings: newSettings });
    }

    /** Remove all children */
    clear(clearDom) {
        for (const child of Object.values(this.children)) {
            if (child.destroy) child.destroy();
        }
        this.children = {};
        if (clearDom && this.domElement) {
            this.domElement.innerHTML = '';
        }
        return this;
    }

    /** Remove this element from the DOM */
    remove() {
        if (this.domElement && this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
        }
    }

    /** Destroy: clear children, remove from DOM, clean up listeners */
    destroy() {
        this.clear(true);
        this.remove();
        this._listeners = {};
    }

    /** Show/hide */
    setVisible(visible) {
        this.domElement.style.display = visible ? '' : 'none';
    }

    // ── Events (minimal pub/sub) ─────────────────────────────────────────

    on(event, handler) {
        if (!this._listeners[event]) this._listeners[event] = new Set();
        this._listeners[event].add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        if (this._listeners[event]) this._listeners[event].delete(handler);
    }

    emit(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(fn => {
                try { fn(data); } catch (e) { console.error(`[El] Event error "${event}":`, e); }
            });
        }
    }

    once(event, handler) {
        const wrapper = (data) => { this.off(event, wrapper); handler(data); };
        return this.on(event, wrapper);
    }

    // ── Lifecycle hook (no-op, subclasses can override) ──────────────────

    init() {}

    // ── Static helpers ───────────────────────────────────────────────────

    /** Wrap an existing DOM element */
    static from(domElement) {
        if (!domElement) return null;
        const wrapper = Object.create(El.prototype);
        wrapper.domElement = domElement;
        wrapper.children = {};
        wrapper._listeners = {};
        wrapper._id = domElement.id || 'el_wrap_' + Math.random().toString(36).substr(2, 9);
        return wrapper;
    }
}

// DEPRECATED alias — use El directly
// window.NewBlUi = El;
