/**
 * class.AsCommandPalette.js — Command palette + keyboard shortcuts for AutoScholar
 *
 * Overlay modal with search input and keyboard navigation.
 * Prefixes: > (actions), @ (students), # (cases), / (settings)
 *
 * Keyboard shortcuts (global):
 *   Cmd+K        Toggle command palette
 *   Cmd+F        Focus header search bar
 *   Cmd+/        Show keyboard shortcuts help
 *   1-8          Jump to view (when not typing)
 *   J/K          Navigate table rows (when not typing)
 *   Escape       Close palette / modal / overlay
 *
 * Usage:
 *   const palette = new AsCommandPalette({ app, bus });
 *   palette.install();  // Binds Cmd+K globally
 *
 *   // Register actions from any module
 *   palette.register({ label: 'Create Case', icon: 'fas fa-plus', action: () => {...}, group: 'actions' });
 */
class AsCommandPalette {

    constructor({ app, bus }) {
        this._app = app;
        this._bus = bus;
        this._el = null;
        this._input = null;
        this._list = null;
        this._helpEl = null;
        this._visible = false;
        this._helpVisible = false;
        this._selectedIdx = 0;
        this._items = [];
        this._filteredItems = [];
        this._registeredActions = [];
    }

    // ── Public ──────────────────────────────────────────────────────────

    install() {
        this._buildDOM();
        this._bindGlobalKeys();
        this._registerDefaultActions();
    }

    register(action) {
        this._registeredActions.push(action);
    }

    open() {
        if (this._visible) return;
        this._visible = true;
        this._el.classList.add('as-cmd-visible');
        this._input.value = '';
        this._selectedIdx = 0;
        this._buildItems();
        this._filter('');
        this._input.focus();
    }

    close() {
        if (!this._visible) return;
        this._visible = false;
        this._el.classList.remove('as-cmd-visible');
    }

    toggle() {
        this._visible ? this.close() : this.open();
    }

    // ── DOM ─────────────────────────────────────────────────────────────

    _buildDOM() {
        const overlay = document.createElement('div');
        overlay.className = 'as-cmd-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        const dialog = document.createElement('div');
        dialog.className = 'as-cmd-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-label', 'Command palette');

        // Search input
        const inputWrap = document.createElement('div');
        inputWrap.className = 'as-cmd-input-wrap';
        inputWrap.innerHTML = '<i class="fas fa-search as-cmd-search-icon"></i>';

        this._input = document.createElement('input');
        this._input.className = 'as-cmd-input';
        this._input.type = 'text';
        this._input.placeholder = 'Type a command or search...';
        this._input.setAttribute('autocomplete', 'off');
        this._input.addEventListener('input', () => this._onInput());
        this._input.addEventListener('keydown', (e) => this._onKeydown(e));
        inputWrap.appendChild(this._input);

        const hint = document.createElement('span');
        hint.className = 'as-cmd-hint';
        hint.textContent = 'ESC to close';
        inputWrap.appendChild(hint);

        dialog.appendChild(inputWrap);

        // Results list
        this._list = document.createElement('div');
        this._list.className = 'as-cmd-list';
        this._list.setAttribute('role', 'listbox');
        dialog.appendChild(this._list);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this._el = overlay;
    }

    // ── Items ───────────────────────────────────────────────────────────

    _registerDefaultActions() {
        const tabs = this._app?.constructor?.TAB_REGISTRY || {};
        Object.entries(tabs).forEach(([key, def], i) => {
            this.register({
                label: `Go to ${def.label}`,
                icon: `fas fa-${def.icon}`,
                group: 'navigation',
                shortcut: `${i + 1}`,
                action: () => {
                    const tabEl = this._app?._mainTabs?.el?.querySelector(`.ui-tabs-tab[data-tab="${key}"]`);
                    if (tabEl) tabEl.click();
                }
            });
        });

        this.register({ label: 'Search Students', icon: 'fas fa-user-graduate', group: 'search', prefix: '@',
            action: () => {
                const tabEl = this._app?._mainTabs?.el?.querySelector('.ui-tabs-tab[data-tab="students"]');
                if (tabEl) tabEl.click();
            }
        });
        this.register({ label: 'Search Cases', icon: 'fas fa-hands-helping', group: 'search', prefix: '#',
            action: () => {
                const tabEl = this._app?._mainTabs?.el?.querySelector('.ui-tabs-tab[data-tab="casework"]');
                if (tabEl) tabEl.click();
            }
        });
        this.register({ label: 'Open Settings', icon: 'fas fa-cog', group: 'navigation', prefix: '/',
            action: () => {
                const tabEl = this._app?._mainTabs?.el?.querySelector('.ui-tabs-tab[data-tab="settings"]');
                if (tabEl) tabEl.click();
            }
        });
    }

    _buildItems() {
        this._items = [...this._registeredActions];
    }

    // ── Filter & Render ─────────────────────────────────────────────────

    _filter(query) {
        const q = query.toLowerCase().trim();

        if (!q) {
            this._filteredItems = [...this._items];
        } else {
            // Check prefix
            let prefix = null;
            let search = q;
            if (q.startsWith('>')) { prefix = 'actions'; search = q.slice(1).trim(); }
            else if (q.startsWith('@')) { prefix = 'search'; search = q.slice(1).trim(); }
            else if (q.startsWith('#')) { prefix = 'search'; search = q.slice(1).trim(); }
            else if (q.startsWith('/')) { prefix = 'navigation'; search = q.slice(1).trim(); }

            this._filteredItems = this._items.filter(item => {
                if (prefix && item.group !== prefix) return false;
                if (!search) return true;
                return item.label.toLowerCase().includes(search);
            });
        }

        this._selectedIdx = 0;
        this._renderList();
    }

    _renderList() {
        this._list.innerHTML = '';

        if (this._filteredItems.length === 0) {
            this._list.innerHTML = '<div class="as-cmd-empty">No results found</div>';
            return;
        }

        // Group by category
        const groups = {};
        for (const item of this._filteredItems) {
            const g = item.group || 'other';
            if (!groups[g]) groups[g] = [];
            groups[g].push(item);
        }

        const groupLabels = { navigation: 'Navigation', actions: 'Actions', search: 'Search' };

        for (const [group, items] of Object.entries(groups)) {
            const header = document.createElement('div');
            header.className = 'as-cmd-group-header';
            header.textContent = groupLabels[group] || group;
            this._list.appendChild(header);

            items.forEach((item, i) => {
                const row = document.createElement('div');
                row.className = 'as-cmd-item';
                row.setAttribute('role', 'option');

                const globalIdx = this._filteredItems.indexOf(item);
                if (globalIdx === this._selectedIdx) row.classList.add('as-cmd-item-selected');

                row.innerHTML = `
                    <i class="${item.icon || 'fas fa-circle'} as-cmd-item-icon"></i>
                    <span class="as-cmd-item-label">${item.label}</span>
                    ${item.shortcut ? `<span class="as-cmd-item-shortcut">${item.shortcut}</span>` : ''}
                `;

                row.addEventListener('click', () => this._execute(item));
                row.addEventListener('mouseenter', () => {
                    this._selectedIdx = globalIdx;
                    this._highlightSelected();
                });

                this._list.appendChild(row);
            });
        }
    }

    _highlightSelected() {
        const items = this._list.querySelectorAll('.as-cmd-item');
        items.forEach((el, i) => {
            const globalIdx = this._filteredItems.indexOf(this._filteredItems[i]);
            el.classList.toggle('as-cmd-item-selected', i === this._selectedIdx);
        });
    }

    // ── Keyboard ────────────────────────────────────────────────────────

    _bindGlobalKeys() {
        document.addEventListener('keydown', (e) => {
            // Cmd+K / Ctrl+K — toggle palette
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
                return;
            }

            // Cmd+F / Ctrl+F — focus header search
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                const searchInput = this._app?._parent?.querySelector('.as-header-search input');
                if (searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                    searchInput.select();
                }
                return;
            }

            // Cmd+/ / Ctrl+/ — toggle shortcuts help
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                this._toggleHelp();
                return;
            }

            // Escape — close help, palette, or any open ui modal
            if (e.key === 'Escape') {
                if (this._helpVisible) {
                    e.preventDefault();
                    this._closeHelp();
                    return;
                }
                if (this._visible) {
                    e.preventDefault();
                    this.close();
                    return;
                }
                // Close any open ui modal
                const modal = document.querySelector('.ui-modal-backdrop');
                if (modal) {
                    e.preventDefault();
                    const closeBtn = modal.querySelector('.ui-modal-close, [data-dismiss="modal"]');
                    if (closeBtn) closeBtn.click();
                }
                return;
            }

            // Shortcuts below only fire when not typing and no overlay is open
            if (this._visible || this._helpVisible) return;
            const active = document.activeElement;
            const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isTyping) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            // Number keys 1-8 — view jump
            if (e.key >= '1' && e.key <= '8') {
                const tabs = Object.keys(this._app?.constructor?.TAB_REGISTRY || {});
                const idx = parseInt(e.key) - 1;
                if (idx < tabs.length) {
                    const tabEl = this._app?._mainTabs?.el?.querySelector(`.ui-tabs-tab[data-tab="${tabs[idx]}"]`);
                    if (tabEl) tabEl.click();
                }
                return;
            }

            // J/K — navigate DataTable rows
            if (e.key === 'j' || e.key === 'k') {
                this._navigateTableRow(e.key === 'j' ? 1 : -1);
                return;
            }

            // ? — show shortcuts help (without Cmd)
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                this._toggleHelp();
                return;
            }
        });
    }

    _onInput() {
        this._filter(this._input.value);
    }

    _onKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this._selectedIdx = Math.min(this._selectedIdx + 1, this._filteredItems.length - 1);
            this._highlightSelected();
            this._scrollToSelected();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
            this._highlightSelected();
            this._scrollToSelected();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = this._filteredItems[this._selectedIdx];
            if (item) this._execute(item);
        }
    }

    _scrollToSelected() {
        const items = this._list.querySelectorAll('.as-cmd-item');
        if (items[this._selectedIdx]) {
            items[this._selectedIdx].scrollIntoView({ block: 'nearest' });
        }
    }

    _execute(item) {
        this.close();
        if (item.action) item.action();
    }

    // ── Table Row Navigation (J/K) ───────────────────────────────────

    _navigateTableRow(direction) {
        // Find visible DataTable in the active tab panel
        const activePanel = this._app?._mainTabs?.el?.querySelector('.ui-tabs-panel.active, .ui-tabs-panel[style*="display: block"], .ui-tabs-panel:not([style*="display: none"])');
        if (!activePanel) return;

        const table = activePanel.querySelector('table.dataTable, .dataTables_wrapper table');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        if (!rows.length) return;

        // Find currently selected row
        let currentIdx = -1;
        rows.forEach((row, i) => {
            if (row.classList.contains('selected') || row.classList.contains('active')) currentIdx = i;
        });

        const nextIdx = Math.max(0, Math.min(rows.length - 1, currentIdx + direction));
        if (nextIdx === currentIdx && currentIdx !== -1) return;

        // Click the target row to select it
        rows[nextIdx].click();
        rows[nextIdx].scrollIntoView({ block: 'nearest' });
    }

    // ── Shortcuts Help Overlay ───────────────────────────────────────

    _toggleHelp() {
        this._helpVisible ? this._closeHelp() : this._openHelp();
    }

    _openHelp() {
        if (this._helpVisible) return;
        if (this._visible) this.close();
        this._helpVisible = true;
        this._buildHelp();
    }

    _closeHelp() {
        if (!this._helpVisible) return;
        this._helpVisible = false;
        if (this._helpEl) {
            this._helpEl.classList.remove('as-cmd-visible');
            setTimeout(() => { if (this._helpEl) this._helpEl.remove(); this._helpEl = null; }, 200);
        }
    }

    _buildHelp() {
        const overlay = document.createElement('div');
        overlay.className = 'as-cmd-overlay as-shortcuts-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this._closeHelp();
        });

        const dialog = document.createElement('div');
        dialog.className = 'as-cmd-dialog as-shortcuts-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-label', 'Keyboard shortcuts');

        const title = document.createElement('div');
        title.className = 'as-shortcuts-title';
        title.innerHTML = '<i class="fas fa-keyboard"></i> Keyboard Shortcuts';
        dialog.appendChild(title);

        const sections = [
            { name: 'Navigation', shortcuts: [
                { keys: ['1', '-', '8'], desc: 'Jump to view' },
                { keys: ['\u2318', 'K'], desc: 'Open command palette' },
                { keys: ['\u2318', 'F'], desc: 'Focus search bar' },
                { keys: ['\u2318', '/'], desc: 'Show this help' },
                { keys: ['?'], desc: 'Show this help' }
            ]},
            { name: 'Data', shortcuts: [
                { keys: ['J'], desc: 'Next table row' },
                { keys: ['K'], desc: 'Previous table row' }
            ]},
            { name: 'General', shortcuts: [
                { keys: ['Esc'], desc: 'Close overlay / modal' },
                { keys: ['\u2191', '\u2193'], desc: 'Navigate palette items' },
                { keys: ['\u21B5'], desc: 'Execute selected action' }
            ]}
        ];

        const grid = document.createElement('div');
        grid.className = 'as-shortcuts-grid';

        for (const section of sections) {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'as-shortcuts-section';

            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'as-shortcuts-section-title';
            sectionTitle.textContent = section.name;
            sectionEl.appendChild(sectionTitle);

            for (const shortcut of section.shortcuts) {
                const row = document.createElement('div');
                row.className = 'as-shortcuts-row';

                const keysEl = document.createElement('span');
                keysEl.className = 'as-shortcuts-keys';
                shortcut.keys.forEach((key, i) => {
                    if (key === '-') {
                        keysEl.appendChild(document.createTextNode(' \u2013 '));
                    } else {
                        const kbd = document.createElement('kbd');
                        kbd.textContent = key;
                        keysEl.appendChild(kbd);
                        if (i < shortcut.keys.length - 1 && shortcut.keys[i + 1] !== '-') {
                            keysEl.appendChild(document.createTextNode(' '));
                        }
                    }
                });

                const descEl = document.createElement('span');
                descEl.className = 'as-shortcuts-desc';
                descEl.textContent = shortcut.desc;

                row.appendChild(keysEl);
                row.appendChild(descEl);
                sectionEl.appendChild(row);
            }

            grid.appendChild(sectionEl);
        }

        dialog.appendChild(grid);

        const hint = document.createElement('div');
        hint.className = 'as-shortcuts-footer';
        hint.textContent = 'Press Esc to close';
        dialog.appendChild(hint);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this._helpEl = overlay;

        requestAnimationFrame(() => overlay.classList.add('as-cmd-visible'));
    }
}
