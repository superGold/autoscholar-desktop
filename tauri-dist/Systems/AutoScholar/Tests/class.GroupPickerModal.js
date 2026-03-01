/**
 * GroupPickerModal — Modal-based group picker with search, pagination, and role selection
 *
 * Generic utility that works with any group type (course, programme, faculty, department).
 * Uses uiModal + uiListSelector + uiButtonGroup from the curated ui system.
 *
 * @example
 * const picker = new GroupPickerModal({
 *     groupService: gs,
 *     groupType: 'course',
 *     title: 'Select Course',
 *     excludeIds: [3, 7],
 *     multiSelect: false,
 *     showRoleSelect: true,
 *     roles: ['member', 'admin', 'viewer', 'owner'],
 *     defaultRole: 'member',
 *     onSelect: ({ groups, role }) => console.log('Selected:', groups, role)
 * });
 * picker.open();
 */
class GroupPickerModal {

    constructor(config = {}) {
        this._gs = config.groupService;
        this._groupType = config.groupType || 'course';
        this._title = config.title || `Select ${this._groupType.charAt(0).toUpperCase() + this._groupType.slice(1)}`;
        this._excludeIds = new Set(config.excludeIds || []);
        this._multiSelect = config.multiSelect || false;
        this._showRoleSelect = config.showRoleSelect || false;
        this._roles = config.roles || ['member', 'admin', 'viewer', 'owner'];
        this._defaultRole = config.defaultRole || 'member';
        this._onSelect = config.onSelect || null;

        this._modal = null;
        this._listSelector = null;
        this._roleSelect = null;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    open() {
        this._buildModal();
        this._modal.open();
    }

    close() {
        if (this._modal) {
            this._modal.close();
            this._modal.destroy();
            this._modal = null;
        }
        this._listSelector = null;
        this._roleSelect = null;
    }

    // ── Internal: Build Items ─────────────────────────────────────────────────

    _buildItems() {
        const groups = this._gs.getByType(this._groupType);
        return groups
            .filter(g => !this._excludeIds.has(g.idx))
            .map(g => {
                const members = this._gs.getMembers(g.idx);
                return {
                    id: g.idx,
                    title: g.get('code') || g.get('name'),
                    subtitle: g.get('code') ? g.get('name') : '',
                    badge: { label: String(members.length), variant: 'primary' }
                };
            });
    }

    // ── Internal: Build Modal ─────────────────────────────────────────────────

    _buildModal() {
        // Create modal shell
        this._modal = new uiModal({
            parent: document.body,
            template: 'default',
            title: this._title,
            size: 'md',
            showClose: true,
            closeOnBackdrop: true
        });

        // Get the modal body and footer DOM elements
        const body = this._modal._modal.querySelector('.ui-modal-body');
        const footer = this._modal._modal.querySelector('.ui-modal-footer');

        // Build list selector inside body
        const items = this._buildItems();
        this._listSelector = new uiListSelector({
            parent: body,
            template: 'default',
            items: items,
            multiSelect: this._multiSelect,
            showCheckbox: this._multiSelect,
            searchable: true,
            searchPlaceholder: `Search by code or name...`,
            pagination: true,
            perPage: 10
        });

        // Build footer with optional role select + buttons
        footer.className = 'as-modal-footer';

        if (this._showRoleSelect) {
            const roleLabel = document.createElement('label');
            roleLabel.textContent = 'Role:';
            roleLabel.className = 'as-modal-role-label';
            footer.appendChild(roleLabel);

            this._roleSelect = document.createElement('select');
            this._roleSelect.className = 'as-modal-role-select';
            this._roles.forEach(role => {
                const opt = document.createElement('option');
                opt.value = role;
                opt.textContent = role;
                if (role === this._defaultRole) opt.selected = true;
                this._roleSelect.appendChild(opt);
            });
            footer.appendChild(this._roleSelect);
        }

        // Cancel / Select buttons
        const btnContainer = document.createElement('div');
        new uiButtonGroup({
            parent: btnContainer,
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'ghost',
                    onClick: () => this.close()
                },
                {
                    label: this._multiSelect ? 'Select All Checked' : 'Select',
                    color: 'primary',
                    onClick: () => this._handleConfirm()
                }
            ]
        });
        footer.appendChild(btnContainer);
    }

    // ── Internal: Handle Confirm ──────────────────────────────────────────────

    _handleConfirm() {
        const selectedIds = this._listSelector.getSelected();
        if (selectedIds.length === 0) return;

        const groups = selectedIds.map(id => this._gs.table('group').read(id)).filter(Boolean);
        const role = this._roleSelect ? this._roleSelect.value : this._defaultRole;

        if (this._onSelect) {
            this._onSelect({ groups, role });
        }

        this.close();
    }
}
