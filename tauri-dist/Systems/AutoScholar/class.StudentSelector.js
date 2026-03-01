/**
 * StudentSelector - Reusable student picker modal
 * Shows name, student number, programme, year of study
 * Supports search/filter, multi-select, loading states, and keyboard navigation
 *
 * Extends BaseSelector for standardized selector behavior
 */
class StudentSelector extends BaseSelector {
    constructor(settings = {}) {
        // Map student-specific settings to base settings
        super({
            ...settings,
            items: settings.students || settings.items || [],
            selected: settings.selected || null,
            selectedItems: settings.selectedStudents || settings.selectedItems || [],
            title: settings.title || 'Select Student',
            searchPlaceholder: 'Search by name or student number...',
            emptyMessage: 'No students found',
            itemLabel: 'students',
            searchContext: 'students'
        });

        // Backward compatibility: expose students property
        this._students = this.items;
    }

    // Backward compatibility getters/setters
    get students() { return this.items; }
    set students(val) { this.items = val; this._students = val; }

    get selectedStudent() { return this.selectedItem; }
    set selectedStudent(val) { this.selectedItem = val; }

    get selectedStudents() { return this.selectedItems; }
    set selectedStudents(val) { this.selectedItems = val; }

    /**
     * Set students to display (backward compatible)
     */
    setStudents(students) {
        this.setItems(students);
        this._students = students;
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
     * Get searchable text for a student
     */
    _getSearchableText(student) {
        const name = `${student.firstName || ''} ${student.lastName || ''}`;
        const studentNumber = student.studentNumber || '';
        const email = student.email || '';
        return `${name} ${studentNumber} ${email}`;
    }

    /**
     * Render a student card
     */
    _renderItem(student, isSelected, index) {
        const card = document.createElement('div');
        card.className = `card p-3 cursor-pointer hover:border-primary transition-colors focus-ring ${isSelected ? 'border-primary border-2 bg-primary/5' : ''}`;

        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'Unknown';
        const studentNum = student.studentNumber || `ID: ${student.idx}`;

        // Set aria-label for screen readers
        card.setAttribute('aria-label', `${fullName}, ${studentNum}`);

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
        avatar.className = 'w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium';
        avatar.textContent = this._getInitials(student);
        nameArea.appendChild(avatar);

        // Name and student number
        const nameCol = document.createElement('div');

        const nameEl = document.createElement('div');
        nameEl.className = 'font-medium';
        nameEl.innerHTML = this._highlightText(fullName, this.currentSearchTerm);
        nameCol.appendChild(nameEl);

        const numEl = document.createElement('div');
        numEl.className = 'text-xs text-muted font-mono';
        numEl.innerHTML = this._highlightText(studentNum, this.currentSearchTerm);
        nameCol.appendChild(numEl);

        nameArea.appendChild(nameCol);
        header.appendChild(nameArea);

        // Badges
        const badges = document.createElement('div');
        badges.className = 'flex items-center gap-2';

        // Year of study badge
        if (student.yearOfStudy) {
            const yearBadge = document.createElement('span');
            yearBadge.className = 'badge badge-secondary badge-sm';
            yearBadge.textContent = `Year ${student.yearOfStudy}`;
            badges.appendChild(yearBadge);
        }

        // Risk indicator badge
        if (student.riskCategory) {
            const riskBadge = document.createElement('span');
            const riskVariant = student.riskCategory === 'at-risk' ? 'danger'
                : student.riskCategory === 'high-performing' ? 'success'
                : 'warning';
            riskBadge.className = `badge badge-${riskVariant} badge-sm`;
            riskBadge.textContent = student.riskCategory.replace('-', ' ');
            badges.appendChild(riskBadge);
        }

        header.appendChild(badges);
        card.appendChild(header);

        // Programme info if available
        if (student.programmeName || student.programme) {
            const progEl = document.createElement('div');
            progEl.className = 'text-xs text-muted mt-1';
            progEl.textContent = student.programmeName || student.programme;
            card.appendChild(progEl);
        }

        return card;
    }

    /**
     * Get initials from student name (override base class)
     */
    _getInitials(student) {
        const first = (student.firstName || student.username || '?').charAt(0);
        const last = (student.lastName || '').charAt(0);
        return (first + last).toUpperCase() || '?';
    }

    /**
     * Static helper to create and open selector
     */
    static select(settings) {
        const selector = new StudentSelector(settings);
        selector.open();
        return selector;
    }

    /**
     * Get students from member service with enriched data
     */
    static getStudentsFromService(memberService, academicService, options = {}) {
        if (!memberService) return [];

        // Get all members with student role
        const members = memberService.publon?.member?.rows?.filter(m => m) || [];
        const memberRoles = memberService.publon?.memberRole?.rows?.filter(mr => mr) || [];
        const roles = memberService.publon?.role?.rows?.filter(r => r) || [];

        // Find student role ID
        const studentRole = roles.find(r => r.name?.toLowerCase().includes('student'));
        const studentRoleId = studentRole?.idx;

        // Filter to only students
        const studentMemberIds = studentRoleId
            ? memberRoles.filter(mr => mr.roleId === studentRoleId).map(mr => mr.memberId)
            : [];

        let students = studentMemberIds.length > 0
            ? members.filter(m => studentMemberIds.includes(m.idx))
            : members; // Fallback: return all members if no role filtering

        // Enrich with academic data if available
        if (academicService) {
            const enrolments = academicService.publon?.enrolment?.rows?.filter(e => e) || [];
            const programmes = academicService.publon?.programme?.rows?.filter(p => p) || [];

            students = students.map(student => {
                const studentEnrolments = enrolments.filter(e => e.studentId === student.idx);
                // Try to get programme from enrolment or student record
                const programmeId = student.programmeId || studentEnrolments[0]?.programmeId;
                const programme = programmes.find(p => p.idx === programmeId);

                return {
                    ...student,
                    enrolmentCount: studentEnrolments.length,
                    programmeName: programme?.name || programme?.label,
                    programmeCode: programme?.code
                };
            });
        }

        return students;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.StudentSelector = StudentSelector;
}
