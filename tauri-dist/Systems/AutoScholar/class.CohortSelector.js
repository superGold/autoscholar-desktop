/**
 * CohortSelector - Reusable cohort picker modal
 * Shows label, entry year, programme, student count, expected graduation
 * Supports search/filter, multi-select, loading states, and keyboard navigation
 *
 * Extends BaseSelector for standardized selector behavior
 */
class CohortSelector extends BaseSelector {
    constructor(settings = {}) {
        // Map cohort-specific settings to base settings
        super({
            ...settings,
            items: settings.cohorts || settings.items || [],
            selected: settings.selected || null,
            selectedItems: settings.selectedCohorts || settings.selectedItems || [],
            title: settings.title || 'Select Cohort',
            searchPlaceholder: 'Search by year or programme...',
            emptyMessage: 'No cohorts found',
            itemLabel: 'cohorts',
            searchContext: 'cohorts'
        });

        // Backward compatibility: expose cohorts property
        this._cohorts = this.items;
    }

    // Backward compatibility getters/setters
    get cohorts() { return this.items; }
    set cohorts(val) { this.items = val; this._cohorts = val; }

    get selectedCohort() { return this.selectedItem; }
    set selectedCohort(val) { this.selectedItem = val; }

    get selectedCohorts() { return this.selectedItems; }
    set selectedCohorts(val) { this.selectedItems = val; }

    /**
     * Set cohorts to display (backward compatible)
     */
    setCohorts(cohorts) {
        this.setItems(cohorts);
        this._cohorts = cohorts;
    }

    /**
     * Override open to add accessibility enhancements
     */
    open() {
        super.open();

        // Register modal with accessibility manager for focus trap and Escape key
        if (typeof AutoScholarA11y !== 'undefined' && this.modal) {
            AutoScholarA11y.setActiveModal(this.modal);
        }

        // Set aria-multiselectable on the list container
        if (this.itemList && this.multiSelect) {
            this.itemList.domElement.setAttribute('aria-multiselectable', 'true');
        }
    }

    /**
     * Get searchable text for a cohort
     */
    _getSearchableText(cohort) {
        const label = cohort.label || '';
        const year = cohort.entryYear ? String(cohort.entryYear) : '';
        const programme = cohort.programmeCode || cohort.programmeName || '';
        return `${label} ${year} ${programme}`;
    }

    /**
     * Render a cohort card
     */
    _renderItem(cohort, isSelected, index) {
        const card = document.createElement('div');
        card.className = `card p-3 cursor-pointer hover:border-primary transition-colors focus-ring ${isSelected ? 'border-primary border-2 bg-primary/5' : ''}`;

        const labelText = cohort.label || `${cohort.entryYear} Cohort`;
        const entryYear = cohort.entryYear || 'Unknown';

        // Set aria-label for screen readers
        card.setAttribute('aria-label', labelText);

        // Header row with year and badges
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-1';

        // Year and checkbox (for multi-select)
        const yearLabel = document.createElement('div');
        yearLabel.className = 'flex items-center gap-2';

        if (this.multiSelect) {
            const checkbox = document.createElement('span');
            checkbox.className = isSelected ? 'text-primary' : 'text-gray-300';
            checkbox.innerHTML = isSelected
                ? '<i class="fas fa-check-circle"></i>'
                : '<i class="far fa-circle"></i>';
            yearLabel.appendChild(checkbox);
        }

        const yearEl = document.createElement('span');
        yearEl.className = 'font-semibold text-primary text-lg';
        yearEl.innerHTML = this._highlightText(String(entryYear), this.currentSearchTerm);
        yearLabel.appendChild(yearEl);

        // Status indicator
        if (cohort.status) {
            const statusDot = document.createElement('span');
            const statusColor = cohort.status === 'active' ? 'bg-success'
                : cohort.status === 'graduated' ? 'bg-info'
                : 'bg-gray-400';
            statusDot.className = `w-2 h-2 rounded-full ${statusColor}`;
            statusDot.title = cohort.status;
            yearLabel.appendChild(statusDot);
        }

        header.appendChild(yearLabel);

        // Badges container
        const badges = document.createElement('div');
        badges.className = 'flex items-center gap-2';

        // Student count badge
        if (cohort.studentCount > 0) {
            const studentBadge = document.createElement('span');
            studentBadge.className = 'badge badge-primary badge-sm';
            studentBadge.textContent = `${cohort.studentCount} students`;
            badges.appendChild(studentBadge);
        }

        // Year level badge (for active cohorts)
        if (cohort.currentYearLevel) {
            const yearLevelBadge = document.createElement('span');
            yearLevelBadge.className = 'badge badge-secondary badge-sm';
            yearLevelBadge.textContent = `Year ${cohort.currentYearLevel}`;
            badges.appendChild(yearLevelBadge);
        }

        // Status badge
        if (cohort.status && cohort.status !== 'active') {
            const statusBadge = document.createElement('span');
            const statusVariant = cohort.status === 'graduated' ? 'success' : 'warning';
            statusBadge.className = `badge badge-${statusVariant} badge-sm`;
            statusBadge.textContent = cohort.status;
            badges.appendChild(statusBadge);
        }

        header.appendChild(badges);
        card.appendChild(header);

        // Cohort label (with highlighting)
        const labelEl = document.createElement('div');
        labelEl.className = 'text-sm font-medium';
        labelEl.innerHTML = this._highlightText(labelText, this.currentSearchTerm);
        card.appendChild(labelEl);

        // Programme info (with highlighting)
        if (cohort.programmeName || cohort.programmeCode) {
            const progText = cohort.programmeName || cohort.programmeCode;
            const progEl = document.createElement('div');
            progEl.className = 'text-xs text-muted mt-1 flex items-center gap-2';
            progEl.innerHTML = `<i class="fas fa-graduation-cap text-xs"></i> ${this._highlightText(progText, this.currentSearchTerm)}`;
            card.appendChild(progEl);
        }

        // Expected graduation
        if (cohort.expectedGraduation) {
            const gradEl = document.createElement('div');
            gradEl.className = 'text-xs text-muted mt-1 flex items-center gap-2';
            gradEl.innerHTML = `<i class="fas fa-calendar-check text-xs"></i> Expected graduation: ${cohort.expectedGraduation}`;
            card.appendChild(gradEl);
        }

        return card;
    }

    /**
     * Static helper to create and open selector
     */
    static select(settings) {
        const selector = new CohortSelector(settings);
        selector.open();
        return selector;
    }

    /**
     * Get cohorts from academic service with enriched data
     */
    static getCohortsFromService(academicService, options = {}) {
        if (!academicService) return [];

        const cohorts = academicService.publon?.cohort?.rows?.filter(c => c) || [];
        const programmes = academicService.publon?.programme?.rows?.filter(p => p) || [];
        const enrolments = academicService.publon?.enrolment?.rows?.filter(e => e) || [];

        const currentYear = new Date().getFullYear();

        // Enrich cohorts
        return cohorts.map(cohort => {
            const programme = programmes.find(p => p.idx === cohort.programmeId);
            const cohortEnrolments = enrolments.filter(e => e.cohortId === cohort.idx && e.status === 'enrolled');

            // Calculate current year level
            const yearsElapsed = currentYear - cohort.entryYear;
            const minDuration = programme?.minDuration || 4;
            const currentYearLevel = Math.min(yearsElapsed + 1, minDuration);

            // Determine status
            let status = 'active';
            if (yearsElapsed >= minDuration) {
                status = 'graduated';
            } else if (yearsElapsed < 0) {
                status = 'upcoming';
            }

            return {
                ...cohort,
                programmeName: programme?.label || programme?.name,
                programmeCode: programme?.code,
                studentCount: cohortEnrolments.length,
                currentYearLevel: status === 'active' ? currentYearLevel : null,
                expectedGraduation: cohort.entryYear + minDuration,
                status: cohort.status || status
            };
        });
    }

    /**
     * Get cohorts for a specific programme
     */
    static getProgrammeCohorts(academicService, programmeId) {
        if (!academicService || !programmeId) return [];

        const allCohorts = CohortSelector.getCohortsFromService(academicService);
        return allCohorts.filter(c => c.programmeId === programmeId);
    }

    /**
     * Get active cohorts only
     */
    static getActiveCohorts(academicService) {
        const allCohorts = CohortSelector.getCohortsFromService(academicService);
        return allCohorts.filter(c => c.status === 'active');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CohortSelector = CohortSelector;
}
