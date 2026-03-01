/**
 * BaseSelector - Abstract base class for selector components
 *
 * Provides common functionality for CourseSelector, StudentSelector, FacultySelector:
 * - Debounced search with highlighting
 * - Recent searches
 * - Multi-select mode support
 * - Loading states
 * - Keyboard navigation
 *
 * Subclasses must implement:
 * - _getSearchableText(item) - Return searchable string for an item
 * - _renderItem(item, isSelected) - Render an item card element
 */
class BaseSelector {
    constructor(settings = {}) {
        this.services = settings.services;
        this.onSelect = settings.onSelect;
        this.title = settings.title || 'Select Item';
        this.items = settings.items || [];
        this.selectedItem = settings.selected || null;
        this.multiSelect = settings.multiSelect || false;
        this.selectedItems = settings.selectedItems || [];
        this.searchPlaceholder = settings.searchPlaceholder || 'Search...';
        this.emptyMessage = settings.emptyMessage || 'No items found';
        this.itemLabel = settings.itemLabel || 'items';
        this.searchContext = settings.searchContext || 'items';
        this.minSearchLength = settings.minSearchLength || 0;

        this.modal = null;
        this.searchInput = null;
        this.itemList = null;
        this.countInfo = null;
        this.currentSearchTerm = '';
        this.focusedIndex = -1;
        this._loaderId = null;

        // Create debounced filter function
        this._debouncedFilter = typeof AutoScholarUtils !== 'undefined'
            ? AutoScholarUtils.debounce((term) => this._filterItems(term), 250)
            : (term) => this._filterItems(term);
    }

    /**
     * Open the selector modal
     */
    open() {
        this.modal = new uiModal({
            title: this.title,
            size: 'md'
        });
        const body = this.modal.getBody();

        // Search bar
        const searchRow = document.createElement('div');
        searchRow.className = 'as-mb-3';
        body.appendChild(searchRow);
        this.searchInput = new uiInput({
            parent: searchRow,
            placeholder: this.searchPlaceholder,
            icon: 'search'
        });

        // Get the actual input element
        const inputEl = this.searchInput.el.tagName === 'INPUT'
            ? this.searchInput.el
            : this.searchInput.el.querySelector('input') || this.searchInput.el;

        // Search input handler
        inputEl.addEventListener('input', (e) => {
            this._debouncedFilter(e.target.value);
        });

        // Keyboard navigation
        inputEl.addEventListener('keydown', (e) => this._handleKeyDown(e));

        // Hook for subclass browse UI (e.g. CourseSelector browse-by-faculty)
        this._renderBrowseArea(body);

        // Item count info
        this.countInfo = document.createElement('div');
        this.countInfo.className = 'as-text-sm as-text-muted as-mb-2';
        body.appendChild(this.countInfo);
        this._updateCountInfo();

        // Item list container with ARIA attributes
        const listWrap = document.createElement('div');
        listWrap.className = 'as-flex-col as-scrollable as-list-scroll-sm';
        listWrap.setAttribute('role', 'listbox');
        listWrap.setAttribute('aria-label', this.title);
        body.appendChild(listWrap);
        this.itemList = { domElement: listWrap };

        // Show loading if items are empty (might be loading)
        if (this.items.length === 0) {
            this._showLoading();
        } else if (this.minSearchLength) {
            this._showSearchPrompt();
        } else {
            this._renderItems(this.items);
        }

        // Multi-select footer
        if (this.multiSelect) {
            const footer = this._createFooter();
            body.appendChild(footer);
        }

        this.modal.open();

        // Focus search input
        setTimeout(() => inputEl.focus(), 100);
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            this.modal.close();
        }
    }

    /**
     * Set items to display
     */
    setItems(items) {
        this.items = items;
        this._hideLoading();
        this._updateCountInfo();
        if (this.itemList) {
            this._renderItems(items);
        }
    }

    /**
     * Show loading state in the item list
     */
    _showLoading() {
        if (!this.itemList) return;

        if (typeof LoadingStateManager !== 'undefined') {
            this._loaderId = LoadingStateManager.showSkeleton(this.itemList, 'list', { count: 3 });
        } else {
            this.itemList.domElement.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8">
                    <i class="fas fa-spinner fa-spin text-primary text-xl mb-3"></i>
                    <div class="text-muted text-sm">Loading...</div>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    _hideLoading() {
        if (this._loaderId && typeof LoadingStateManager !== 'undefined') {
            LoadingStateManager.hide(this._loaderId);
            this._loaderId = null;
        }
    }

    /**
     * Create footer for multi-select mode
     */
    _createFooter() {
        const footer = document.createElement('div');
        footer.className = 'flex justify-between items-center';

        const countSpan = document.createElement('span');
        countSpan.className = 'text-sm text-muted';
        countSpan.id = `${this._getUniqueId()}-selected-count`;
        countSpan.textContent = `${this.selectedItems.length} selected`;
        footer.appendChild(countSpan);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary btn-sm';
        confirmBtn.textContent = 'Confirm Selection';
        confirmBtn.addEventListener('click', () => {
            if (this.onSelect) {
                this.onSelect(this.selectedItems);
            }
            this.close();
        });
        footer.appendChild(confirmBtn);

        return footer;
    }

    /**
     * Update count info
     */
    _updateCountInfo() {
        if (this.countInfo) {
            this.countInfo.textContent = `${this.items.length} ${this.itemLabel}`;
        }
    }

    /**
     * Filter items by search term
     */
    _filterItems(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        this.currentSearchTerm = term;
        this.focusedIndex = -1;

        if (!term || (this.minSearchLength && term.length < this.minSearchLength)) {
            if (this.minSearchLength && (!term || term.length < this.minSearchLength)) {
                this._showSearchPrompt();
            } else {
                this._renderItems(this.items);
            }
            return;
        }

        // Save to recent searches
        if (typeof AutoScholarUtils !== 'undefined' && term.length >= 2) {
            AutoScholarUtils.saveRecentSearch(this.searchContext, term);
        }

        const filtered = this.items.filter(item => {
            const searchText = this._getSearchableText(item).toLowerCase();
            return searchText.includes(term);
        });

        this._renderItems(filtered);
    }

    /**
     * Show search prompt when minSearchLength is set and user hasn't typed enough
     */
    _showSearchPrompt() {
        if (!this.itemList) return;
        this.itemList.domElement.innerHTML = '';
        const prompt = document.createElement('div');
        prompt.className = 'as-loading-state';
        prompt.innerHTML = '<i class="fas fa-search"></i>'
            + '<span class="as-loading-state-text">Type to search ' + this.itemLabel + '</span>'
            + '<span class="as-text-xs as-text-muted">Enter at least ' + this.minSearchLength + ' characters</span>';
        this.itemList.domElement.appendChild(prompt);
    }

    /**
     * Hook for subclass browse UI — no-op by default
     */
    _renderBrowseArea(body) {}

    /**
     * Get searchable text for an item - MUST be implemented by subclass
     * @param {Object} item - Item to get searchable text from
     * @returns {string} - Concatenated searchable fields
     */
    _getSearchableText(item) {
        throw new Error('_getSearchableText must be implemented by subclass');
    }

    /**
     * Render an item card - MUST be implemented by subclass
     * @param {Object} item - Item to render
     * @param {boolean} isSelected - Whether item is selected
     * @param {number} index - Item index for keyboard navigation
     * @returns {HTMLElement} - Rendered card element
     */
    _renderItem(item, isSelected, index) {
        throw new Error('_renderItem must be implemented by subclass');
    }

    /**
     * Render the item list
     */
    _renderItems(items) {
        if (!this.itemList) return;
        this.itemList.domElement.innerHTML = '';
        this._filteredItems = items; // Store for keyboard navigation

        if (items.length === 0) {
            this.itemList.add({
                css: 'text-center py-8 text-muted',
                script: this.emptyMessage
            });
            return;
        }

        items.forEach((item, index) => {
            const isSelected = this.multiSelect
                ? this.selectedItems.some(s => s.idx === item.idx)
                : (this.selectedItem && this.selectedItem.idx === item.idx);

            const card = this._renderItem(item, isSelected, index);

            if (card) {
                // Add ARIA attributes
                card.setAttribute('role', 'option');
                card.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                card.setAttribute('tabindex', index === this.focusedIndex ? '0' : '-1');
                card.setAttribute('data-index', index);

                // Click handler
                card.addEventListener('click', () => this._handleItemClick(item, items));

                // Keyboard handler on item
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this._handleItemClick(item, items);
                    }
                });

                this.itemList.domElement.appendChild(card);
            }
        });
    }

    /**
     * Handle item click/selection
     */
    _handleItemClick(item, currentItems) {
        if (this.multiSelect) {
            this._toggleSelection(item);
            this._renderItems(currentItems); // Re-render to update selection state
        } else {
            this.selectedItem = item;
            if (this.onSelect) {
                this.onSelect(item);
            }
            this.close();
        }
    }

    /**
     * Toggle selection in multi-select mode
     */
    _toggleSelection(item) {
        const index = this.selectedItems.findIndex(s => s.idx === item.idx);
        if (index >= 0) {
            this.selectedItems.splice(index, 1);
        } else {
            this.selectedItems.push(item);
        }

        // Update footer count
        const countEl = document.getElementById(`${this._getUniqueId()}-selected-count`);
        if (countEl) {
            countEl.textContent = `${this.selectedItems.length} selected`;
        }
    }

    /**
     * Handle keyboard navigation
     */
    _handleKeyDown(e) {
        const items = this._filteredItems || this.items;
        if (items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._moveFocus(1, items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._moveFocus(-1, items);
                break;
            case 'Enter':
                if (this.focusedIndex >= 0 && this.focusedIndex < items.length) {
                    e.preventDefault();
                    this._handleItemClick(items[this.focusedIndex], items);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    /**
     * Move focus to next/previous item
     */
    _moveFocus(direction, items) {
        const newIndex = this.focusedIndex + direction;

        if (newIndex < 0) {
            this.focusedIndex = items.length - 1;
        } else if (newIndex >= items.length) {
            this.focusedIndex = 0;
        } else {
            this.focusedIndex = newIndex;
        }

        // Update visual focus
        const allCards = this.itemList.domElement.querySelectorAll('[role="option"]');
        allCards.forEach((card, idx) => {
            if (idx === this.focusedIndex) {
                card.setAttribute('tabindex', '0');
                card.focus();
                card.classList.add('ring-2', 'ring-primary');
            } else {
                card.setAttribute('tabindex', '-1');
                card.classList.remove('ring-2', 'ring-primary');
            }
        });
    }

    /**
     * Get initials from name fields
     */
    _getInitials(item) {
        const first = (item.firstName || item.name || item.username || item.code || '?').charAt(0);
        const last = (item.lastName || '').charAt(0);
        return (first + last).toUpperCase() || '?';
    }

    /**
     * Highlight matching text
     */
    _highlightText(text, searchTerm) {
        if (!searchTerm || !text) return text || '';
        if (typeof AutoScholarUtils !== 'undefined') {
            return AutoScholarUtils.highlightMatch(text, searchTerm);
        }
        return text;
    }

    /**
     * Get unique ID for this selector instance
     */
    _getUniqueId() {
        if (!this._uniqueId) {
            this._uniqueId = `selector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return this._uniqueId;
    }

    /**
     * Static helper to create and open selector - implemented by subclass
     */
    static select(settings) {
        throw new Error('select() must be implemented by subclass');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.BaseSelector = BaseSelector;
}
