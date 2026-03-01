/**
 * DepartmentSelector - Reusable department picker modal
 * Shows code, name, faculty, programme count, course count, staff count
 * Supports search/filter, multi-select, loading states, and keyboard navigation
 *
 * Extends BaseSelector for standardized selector behavior
 */
class DepartmentSelector extends BaseSelector {
    constructor(settings = {}) {
        // Map department-specific settings to base settings
        super({
            ...settings,
            items: settings.departments || settings.items || [],
            selected: settings.selected || null,
            selectedItems: settings.selectedDepartments || settings.selectedItems || [],
            title: settings.title || 'Select Department',
            searchPlaceholder: 'Search by code or name...',
            emptyMessage: 'No departments found',
            itemLabel: 'departments',
            searchContext: 'departments'
        });

        // Backward compatibility: expose departments property
        this._departments = this.items;
    }

    // Backward compatibility getters/setters
    get departments() { return this.items; }
    set departments(val) { this.items = val; this._departments = val; }

    get selectedDepartment() { return this.selectedItem; }
    set selectedDepartment(val) { this.selectedItem = val; }

    get selectedDepartments() { return this.selectedItems; }
    set selectedDepartments(val) { this.selectedItems = val; }

    /**
     * Set departments to display (backward compatible)
     */
    setDepartments(departments) {
        this.setItems(departments);
        this._departments = departments;
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
     * Get searchable text for a department
     */
    _getSearchableText(department) {
        const code = department.code || '';
        const name = department.name || department.label || '';
        const faculty = department.facultyName || '';
        return `${code} ${name} ${faculty}`;
    }

    /**
     * Render a department card
     */
    _renderItem(department, isSelected, index) {
        const card = document.createElement('div');
        card.className = `card p-3 cursor-pointer hover:border-primary transition-colors focus-ring ${isSelected ? 'border-primary border-2 bg-primary/5' : ''}`;

        const codeText = department.code || 'Unknown';
        const nameText = department.name || department.label || '';

        // Set aria-label for screen readers
        card.setAttribute('aria-label', `${codeText}: ${nameText}`);

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

        // Programme count badge
        if (department.programmeCount > 0) {
            const progBadge = document.createElement('span');
            progBadge.className = 'badge badge-primary badge-sm';
            progBadge.textContent = `${department.programmeCount} prog`;
            badges.appendChild(progBadge);
        }

        // Course count badge
        if (department.courseCount > 0) {
            const courseBadge = document.createElement('span');
            courseBadge.className = 'badge badge-secondary badge-sm';
            courseBadge.textContent = `${department.courseCount} courses`;
            badges.appendChild(courseBadge);
        }

        // Staff count badge
        if (department.staffCount > 0) {
            const staffBadge = document.createElement('span');
            staffBadge.className = 'badge badge-info badge-sm';
            staffBadge.textContent = `${department.staffCount} staff`;
            badges.appendChild(staffBadge);
        }

        header.appendChild(badges);
        card.appendChild(header);

        // Department name (with highlighting)
        if (nameText) {
            const nameEl = document.createElement('div');
            nameEl.className = 'text-sm text-muted';
            nameEl.innerHTML = this._highlightText(nameText, this.currentSearchTerm);
            card.appendChild(nameEl);
        }

        // Faculty info (with highlighting)
        if (department.facultyName) {
            const facultyEl = document.createElement('div');
            facultyEl.className = 'text-xs text-muted mt-1 flex items-center gap-2';
            facultyEl.innerHTML = `<i class="fas fa-university text-xs"></i> ${this._highlightText(department.facultyName, this.currentSearchTerm)}`;
            card.appendChild(facultyEl);
        }

        // Head of department if available
        if (department.hodName) {
            const hodEl = document.createElement('div');
            hodEl.className = 'text-xs text-muted mt-1 flex items-center gap-2';
            hodEl.innerHTML = `<i class="fas fa-user-tie text-xs"></i> ${department.hodName}`;
            card.appendChild(hodEl);
        }

        return card;
    }

    /**
     * Static helper to create and open selector
     */
    static select(settings) {
        const selector = new DepartmentSelector(settings);
        selector.open();
        return selector;
    }

    /**
     * Get departments from academic service with enriched data
     */
    static getDepartmentsFromService(academicService, memberService, options = {}) {
        if (!academicService) return [];

        const departments = academicService.publon?.department?.rows?.filter(d => d) || [];
        const faculties = academicService.publon?.faculty?.rows?.filter(f => f) || [];
        const programmes = academicService.publon?.programme?.rows?.filter(p => p) || [];
        const courses = academicService.publon?.course?.rows?.filter(c => c) || [];

        // Get staff from member service if available
        const members = memberService?.publon?.member?.rows?.filter(m => m) || [];

        // Enrich departments
        return departments.map(department => {
            const faculty = faculties.find(f => f.idx === department.facultyId);
            const deptProgrammes = programmes.filter(p => p.departmentId === department.idx);
            const deptCourses = courses.filter(c => c.departmentId === department.idx);
            const deptStaff = members.filter(m => m.departmentId === department.idx);

            return {
                ...department,
                facultyName: faculty?.name || faculty?.label,
                facultyCode: faculty?.code,
                programmeCount: deptProgrammes.length,
                courseCount: deptCourses.length,
                staffCount: deptStaff.length
            };
        });
    }

    /**
     * Get departments for a specific faculty
     */
    static getFacultyDepartments(academicService, facultyId, memberService) {
        if (!academicService || !facultyId) return [];

        const allDepartments = DepartmentSelector.getDepartmentsFromService(academicService, memberService);
        return allDepartments.filter(d => d.facultyId === facultyId);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DepartmentSelector = DepartmentSelector;
}
