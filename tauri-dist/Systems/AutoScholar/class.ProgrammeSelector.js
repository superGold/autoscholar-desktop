/**
 * ProgrammeSelector - Reusable programme picker modal
 * Shows code, label, NQF level, credits, duration, department
 * Supports search/filter, multi-select, loading states, and keyboard navigation
 *
 * Extends BaseSelector for standardized selector behavior
 */
class ProgrammeSelector extends BaseSelector {
    constructor(settings = {}) {
        // Map programme-specific settings to base settings
        super({
            ...settings,
            items: settings.programmes || settings.items || [],
            selected: settings.selected || null,
            selectedItems: settings.selectedProgrammes || settings.selectedItems || [],
            title: settings.title || 'Select Programme',
            searchPlaceholder: 'Search by code or name...',
            emptyMessage: 'No programmes found',
            itemLabel: 'programmes',
            searchContext: 'programmes'
        });

        // Backward compatibility: expose programmes property
        this._programmes = this.items;
    }

    // Backward compatibility getters/setters
    get programmes() { return this.items; }
    set programmes(val) { this.items = val; this._programmes = val; }

    get selectedProgramme() { return this.selectedItem; }
    set selectedProgramme(val) { this.selectedItem = val; }

    get selectedProgrammes() { return this.selectedItems; }
    set selectedProgrammes(val) { this.selectedItems = val; }

    /**
     * Set programmes to display (backward compatible)
     */
    setProgrammes(programmes) {
        this.setItems(programmes);
        this._programmes = programmes;
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
     * Get searchable text for a programme
     */
    _getSearchableText(programme) {
        const code = programme.code || '';
        const label = programme.label || programme.name || '';
        const department = programme.departmentName || programme.department || '';
        return `${code} ${label} ${department}`;
    }

    /**
     * Render a programme card
     */
    _renderItem(programme, isSelected, index) {
        const card = document.createElement('div');
        card.className = `card p-3 cursor-pointer hover:border-primary transition-colors focus-ring ${isSelected ? 'border-primary border-2 bg-primary/5' : ''}`;

        const codeText = programme.code || 'Unknown';
        const labelText = programme.label || programme.name || '';

        // Set aria-label for screen readers
        card.setAttribute('aria-label', `${codeText}: ${labelText}`);

        // Header row with code and badges
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-1';

        // Code and checkbox (for multi-select)
        const codeLabel = document.createElement('div');
        codeLabel.className = 'flex items-center gap-2';

        if (this.multiSelect) {
            const checkbox = document.createElement('span');
            checkbox.className = isSelected ? 'text-primary' : 'text-gray-300';
            checkbox.innerHTML = isSelected
                ? '<i class="fas fa-check-circle"></i>'
                : '<i class="far fa-circle"></i>';
            codeLabel.appendChild(checkbox);
        }

        const codeEl = document.createElement('span');
        codeEl.className = 'font-semibold text-primary';
        codeEl.innerHTML = this._highlightText(codeText, this.currentSearchTerm);
        codeLabel.appendChild(codeEl);

        header.appendChild(codeLabel);

        // Badges container
        const badges = document.createElement('div');
        badges.className = 'flex items-center gap-2';

        // NQF Level badge
        if (programme.nqfLevel) {
            const nqfBadge = document.createElement('span');
            nqfBadge.className = 'badge badge-primary badge-sm';
            nqfBadge.textContent = `NQF ${programme.nqfLevel}`;
            badges.appendChild(nqfBadge);
        }

        // Total credits badge
        if (programme.totalCredits) {
            const creditsBadge = document.createElement('span');
            creditsBadge.className = 'badge badge-secondary badge-sm';
            creditsBadge.textContent = `${programme.totalCredits} cr`;
            badges.appendChild(creditsBadge);
        }

        // Student count badge
        if (programme.studentCount > 0) {
            const studentBadge = document.createElement('span');
            studentBadge.className = 'badge badge-info badge-sm';
            studentBadge.textContent = `${programme.studentCount} students`;
            badges.appendChild(studentBadge);
        }

        // Status badge (if not active)
        if (programme.status && programme.status !== 'active') {
            const statusBadge = document.createElement('span');
            const statusVariant = programme.status === 'phasing-out' ? 'warning' : 'danger';
            statusBadge.className = `badge badge-${statusVariant} badge-sm`;
            statusBadge.textContent = programme.status;
            badges.appendChild(statusBadge);
        }

        header.appendChild(badges);
        card.appendChild(header);

        // Programme label (with highlighting)
        if (labelText) {
            const labelEl = document.createElement('div');
            labelEl.className = 'text-sm text-muted';
            labelEl.innerHTML = this._highlightText(labelText, this.currentSearchTerm);
            card.appendChild(labelEl);
        }

        // Duration info
        if (programme.minDuration) {
            const durationEl = document.createElement('div');
            durationEl.className = 'text-xs text-muted mt-1 flex items-center gap-2';
            const durationText = programme.maxDuration && programme.maxDuration !== programme.minDuration
                ? `${programme.minDuration}-${programme.maxDuration} years`
                : `${programme.minDuration} years`;
            durationEl.innerHTML = `<i class="fas fa-clock text-xs"></i> ${durationText}`;
            card.appendChild(durationEl);
        }

        // Department info (with highlighting)
        if (programme.departmentName || programme.department) {
            const deptText = programme.departmentName || programme.department;
            const deptEl = document.createElement('div');
            deptEl.className = 'text-xs text-muted mt-1 flex items-center gap-2';
            deptEl.innerHTML = `<i class="fas fa-building text-xs"></i> ${this._highlightText(deptText, this.currentSearchTerm)}`;
            card.appendChild(deptEl);
        }

        return card;
    }

    /**
     * Static helper to create and open selector
     */
    static select(settings) {
        const selector = new ProgrammeSelector(settings);
        selector.open();
        return selector;
    }

    /**
     * Get programmes from academic service with enriched data
     */
    static getProgrammesFromService(academicService, options = {}) {
        if (!academicService) return [];

        const programmes = academicService.publon?.programme?.rows?.filter(p => p) || [];
        const departments = academicService.publon?.department?.rows?.filter(d => d) || [];
        const enrolments = academicService.publon?.enrolment?.rows?.filter(e => e) || [];

        // Enrich programmes with department and student count
        return programmes.map(programme => {
            const department = departments.find(d => d.idx === programme.departmentId);

            // Count students enrolled in this programme
            const programmeEnrolments = enrolments.filter(e => e.programmeId === programme.idx && e.status === 'enrolled');

            return {
                ...programme,
                departmentName: department?.name || department?.label,
                departmentCode: department?.code,
                studentCount: programmeEnrolments.length
            };
        });
    }

    /**
     * Get programmes for a specific department
     */
    static getDepartmentProgrammes(academicService, departmentId) {
        if (!academicService || !departmentId) return [];

        const allProgrammes = ProgrammeSelector.getProgrammesFromService(academicService);
        return allProgrammes.filter(p => p.departmentId === departmentId);
    }

    /**
     * Get active programmes only
     */
    static getActiveProgrammes(academicService) {
        const allProgrammes = ProgrammeSelector.getProgrammesFromService(academicService);
        return allProgrammes.filter(p => !p.status || p.status === 'active');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ProgrammeSelector = ProgrammeSelector;
}
