/**
 * FacultySelector - Reusable faculty/staff picker modal
 * Shows name, department, email, position
 * Supports search/filter, multi-select, loading states, and keyboard navigation
 *
 * Extends BaseSelector for standardized selector behavior
 */
class FacultySelector extends BaseSelector {
    constructor(settings = {}) {
        // Map faculty-specific settings to base settings
        super({
            ...settings,
            items: settings.faculty || settings.items || [],
            selected: settings.selected || null,
            selectedItems: settings.selectedFaculty || settings.selectedItems || [],
            title: settings.title || 'Select Faculty Member',
            searchPlaceholder: 'Search by name or department...',
            emptyMessage: 'No faculty members found',
            itemLabel: 'faculty members',
            searchContext: 'faculty'
        });

        // Backward compatibility: expose faculty property
        this._faculty = this.items;
    }

    // Backward compatibility getters/setters
    get faculty() { return this.items; }
    set faculty(val) { this.items = val; this._faculty = val; }

    get selectedFaculty() { return this.selectedItem; }
    set selectedFaculty(val) { this.selectedItem = val; }

    /**
     * Set faculty to display (backward compatible)
     */
    setFaculty(faculty) {
        this.setItems(faculty);
        this._faculty = faculty;
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
     * Get searchable text for a faculty member
     */
    _getSearchableText(member) {
        const name = `${member.title || ''} ${member.firstName || ''} ${member.lastName || ''}`;
        const department = member.departmentName || member.department || '';
        const email = member.email || '';
        const position = member.position || member.role || '';
        return `${name} ${department} ${email} ${position}`;
    }

    /**
     * Render a faculty card
     */
    _renderItem(member, isSelected, index) {
        const card = document.createElement('div');
        card.className = `card p-3 cursor-pointer hover:border-primary transition-colors focus-ring ${isSelected ? 'border-primary border-2 bg-primary/5' : ''}`;

        const fullName = `${member.title || ''} ${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || 'Unknown';

        // Set aria-label for screen readers
        card.setAttribute('aria-label', `${fullName}, ${member.departmentName || member.department || 'No department'}`);

        // Header row with name and badges
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between';

        // Avatar and name area
        const nameArea = document.createElement('div');
        nameArea.className = 'flex items-center gap-3';

        // Multi-select checkbox
        if (this.multiSelect) {
            const checkbox = document.createElement('span');
            checkbox.className = isSelected ? 'text-primary' : 'text-gray-300';
            checkbox.innerHTML = isSelected
                ? '<i class="fas fa-check-circle"></i>'
                : '<i class="far fa-circle"></i>';
            nameArea.appendChild(checkbox);
        }

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white text-sm font-medium';
        avatar.textContent = this._getInitials(member);
        nameArea.appendChild(avatar);

        // Name and position
        const nameCol = document.createElement('div');

        const nameEl = document.createElement('div');
        nameEl.className = 'font-medium';
        nameEl.innerHTML = this._highlightText(fullName, this.currentSearchTerm);
        nameCol.appendChild(nameEl);

        if (member.position || member.role) {
            const posEl = document.createElement('div');
            posEl.className = 'text-xs text-muted';
            posEl.textContent = member.position || member.role;
            nameCol.appendChild(posEl);
        }

        nameArea.appendChild(nameCol);
        header.appendChild(nameArea);

        // Badges
        const badges = document.createElement('div');
        badges.className = 'flex items-center gap-2';

        // Course count badge
        if (member.courseCount > 0) {
            const courseBadge = document.createElement('span');
            courseBadge.className = 'badge badge-info badge-sm';
            courseBadge.textContent = `${member.courseCount} courses`;
            badges.appendChild(courseBadge);
        }

        header.appendChild(badges);
        card.appendChild(header);

        // Department (with highlighting)
        if (member.departmentName || member.department) {
            const deptText = member.departmentName || member.department;
            const deptEl = document.createElement('div');
            deptEl.className = 'text-sm text-muted mt-1 flex items-center gap-2';
            deptEl.innerHTML = `<i class="fas fa-building text-xs"></i> ${this._highlightText(deptText, this.currentSearchTerm)}`;
            card.appendChild(deptEl);
        }

        // Email (with highlighting)
        if (member.email) {
            const emailEl = document.createElement('div');
            emailEl.className = 'text-xs text-muted mt-1 flex items-center gap-2';
            emailEl.innerHTML = `<i class="fas fa-envelope text-xs"></i> ${this._highlightText(member.email, this.currentSearchTerm)}`;
            card.appendChild(emailEl);
        }

        return card;
    }

    /**
     * Get initials from faculty name (override base class)
     */
    _getInitials(member) {
        const first = (member.firstName || member.username || '?').charAt(0);
        const last = (member.lastName || '').charAt(0);
        return (first + last).toUpperCase() || '?';
    }

    /**
     * Static helper to create and open selector
     */
    static select(settings) {
        const selector = new FacultySelector(settings);
        selector.open();
        return selector;
    }

    /**
     * Get faculty from member service with enriched data
     */
    static getFacultyFromService(memberService, academicService, options = {}) {
        if (!memberService) return [];

        // Get all members with lecturer/faculty roles
        const members = memberService.publon?.member?.rows?.filter(m => m) || [];
        const memberRoles = memberService.publon?.memberRole?.rows?.filter(mr => mr) || [];
        const roles = memberService.publon?.role?.rows?.filter(r => r) || [];

        // Find lecturer/faculty role IDs
        const facultyRoleNames = ['lecturer', 'faculty', 'instructor', 'professor', 'coordinator'];
        const facultyRoleIds = roles
            .filter(r => facultyRoleNames.some(name => r.name?.toLowerCase().includes(name)))
            .map(r => r.idx);

        // Filter to only faculty
        const facultyMemberIds = facultyRoleIds.length > 0
            ? memberRoles.filter(mr => facultyRoleIds.includes(mr.roleId)).map(mr => mr.memberId)
            : [];

        let faculty = facultyMemberIds.length > 0
            ? members.filter(m => facultyMemberIds.includes(m.idx))
            : []; // Return empty if no faculty roles found

        // Enrich with academic data if available
        if (academicService) {
            const offerings = academicService.publon?.offering?.rows?.filter(o => o) || [];
            const departments = academicService.publon?.department?.rows?.filter(d => d) || [];

            faculty = faculty.map(member => {
                const memberOfferings = offerings.filter(o => o.lecturerId === member.idx);
                const department = departments.find(d => d.idx === member.departmentId);

                return {
                    ...member,
                    courseCount: memberOfferings.length,
                    departmentName: department?.name || department?.label
                };
            });
        }

        return faculty;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.FacultySelector = FacultySelector;
}
