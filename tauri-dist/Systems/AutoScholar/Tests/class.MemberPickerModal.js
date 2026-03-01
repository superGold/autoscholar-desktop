/**
 * MemberPickerModal — Modal-based member picker with search, pagination, and role filtering
 *
 * Generic utility that works with any member role filter (Student, Staff, etc).
 * Uses uiModal + uiListSelector + uiButtonGroup from the curated ui system.
 * Mirrors GroupPickerModal structure exactly.
 *
 * @example
 * new MemberPickerModal({
 *     memberService: ms,
 *     roleFilter: 'Student',
 *     excludeIds: [1, 5],
 *     multiSelect: false,
 *     onSelect: ({ members }) => console.log('Selected:', members)
 * }).open();
 */
class MemberPickerModal {

    constructor(config = {}) {
        this._ms = config.memberService;
        this._roleFilter = config.roleFilter || null;
        this._title = config.title || (this._roleFilter ? `Select ${this._roleFilter}` : 'Select Member');
        this._excludeIds = new Set(config.excludeIds || []);
        this._multiSelect = config.multiSelect || false;
        this._onSelect = config.onSelect || null;

        this._modal = null;
        this._listSelector = null;
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
    }

    // ── Internal: Build Items ─────────────────────────────────────────────────

    _buildItems() {
        const members = this._ms.table('member').all();
        return members
            .filter(m => !this._excludeIds.has(m.idx))
            .filter(m => {
                if (!this._roleFilter) return true;
                return this._ms.getMemberRoles(m.idx)
                    .some(r => r.get('name') === this._roleFilter);
            })
            .map(m => {
                const roles = this._ms.getMemberRoles(m.idx);
                const roleName = roles.length ? roles.map(r => r.get('name')).join(', ') : 'No role';
                const displayName = m.get('displayName') || m.get('username') || 'Member ' + m.idx;
                return {
                    id: m.idx,
                    title: displayName,
                    subtitle: m.get('email') || '',
                    badge: { label: roleName, variant: 'primary' }
                };
            });
    }

    // ── Internal: Build Modal ─────────────────────────────────────────────────

    _buildModal() {
        this._modal = new uiModal({
            parent: document.body,
            template: 'default',
            title: this._title,
            size: 'md',
            showClose: true,
            closeOnBackdrop: true
        });

        const body = this._modal._modal.querySelector('.ui-modal-body');
        const footer = this._modal._modal.querySelector('.ui-modal-footer');

        const items = this._buildItems();
        this._listSelector = new uiListSelector({
            parent: body,
            template: 'default',
            items: items,
            multiSelect: this._multiSelect,
            showCheckbox: this._multiSelect,
            searchable: true,
            searchPlaceholder: 'Search by name or email...',
            pagination: true,
            perPage: 10
        });

        footer.className = 'as-modal-footer';

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

        const members = selectedIds.map(id => this._ms.table('member').read(id)).filter(Boolean);

        if (this._onSelect) {
            this._onSelect({ members });
        }

        this.close();
    }
}
