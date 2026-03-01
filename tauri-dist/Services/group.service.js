/**
 * GroupService - Team, role, and permission management
 *
 * Tables:
 * - group:           Group/team definitions
 * - groupRole:       Per-group role definitions (child of group)
 * - groupMember:     Memberships with role FK (child of group)
 * - groupInvitation: Pending invitations (child of group)
 * - groupObject:     Polymorphic links to objects the group controls (child of group)
 *
 * @example
 * const groupService = new GroupService();
 * ServiceRegistry.register('group', groupService, { alias: 'Group Service' });
 * groupService.seedDefaults();
 *
 * const team = groupService.createGroup({ name: 'Engineering', type: 'team' }, creatorId);
 * const adminRole = groupService.getRoleByName(team.idx, 'Admin');
 * groupService.addMember(team.idx, memberId, adminRole.idx);
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const GroupServiceSchema = {
    name: 'group',
    prefix: 'grp',
    alias: 'Group Service',
    version: '3.0.0',

    tables: [
        {
            name: 'group',
            alias: 'Groups',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'parentId', label: 'Parent Group', type: 'integer',
                    ref: { table: 'group', field: 'idx' } },
                { name: 'name', label: 'Name', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'type', label: 'Type', type: 'string', default: 'group',
                    options: ['group', 'team', 'department', 'organization', 'project'] },
                { name: 'code', label: 'Code', type: 'string', unique: true },
                { name: 'icon', label: 'Icon', type: 'string' },
                { name: 'color', label: 'Color', type: 'string' },
                { name: 'visibility', label: 'Visibility', type: 'string', default: 'private',
                    options: ['public', 'private', 'secret'] },
                { name: 'joinMode', label: 'Join Mode', type: 'string', default: 'direct',
                    options: ['direct', 'invitation', 'approval'] },
                { name: 'settings', label: 'Settings', type: 'json' },
                { name: 'ownerId', label: 'Owner', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'modifiedAt', label: 'Modified', type: 'datetime' }
            ]
        },
        {
            name: 'groupRole',
            alias: 'Group Roles',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'groupId', label: 'Group', type: 'integer', required: true,
                    ref: { table: 'group', field: 'idx' } },
                { name: 'name', label: 'Role Name', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'level', label: 'Level', type: 'integer', default: 0 },
                { name: 'color', label: 'Color', type: 'string' },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'groupMember',
            alias: 'Members',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'groupId', label: 'Group', type: 'integer', required: true,
                    ref: { table: 'group', field: 'idx' } },
                { name: 'memberId', label: 'Member', type: 'integer', required: true,
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'roleId', label: 'Role', type: 'integer',
                    ref: { table: 'groupRole', field: 'idx' } },
                { name: 'status', label: 'Status', type: 'string', default: 'active',
                    options: ['active', 'suspended', 'invited'] },
                { name: 'joinedAt', label: 'Joined', type: 'datetime' },
                { name: 'invitedBy', label: 'Invited By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } }
            ]
        },
        {
            name: 'groupInvitation',
            alias: 'Invitations',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'groupId', label: 'Group', type: 'integer', required: true,
                    ref: { table: 'group', field: 'idx' } },
                { name: 'memberId', label: 'Member', type: 'integer', required: true,
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'roleId', label: 'Role', type: 'integer',
                    ref: { table: 'groupRole', field: 'idx' } },
                { name: 'status', label: 'Status', type: 'string', default: 'pending',
                    options: ['pending', 'accepted', 'declined', 'expired'] },
                { name: 'message', label: 'Message', type: 'text' },
                { name: 'invitedBy', label: 'Invited By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'expiresAt', label: 'Expires', type: 'datetime' }
            ]
        },
        {
            name: 'groupObject',
            alias: 'Group Objects',
            primaryKey: 'idx',
            labeller: '{label}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'groupId', label: 'Group', type: 'integer', required: true,
                    ref: { table: 'group', field: 'idx' } },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'objectService', label: 'Service', type: 'string' },
                { name: 'objectTable', label: 'Table', type: 'string' },
                { name: 'objectIdx', label: 'Object ID', type: 'integer' },
                { name: 'permission', label: 'Permission', type: 'string', default: 'view',
                    options: ['view', 'edit', 'manage', 'admin'] },
                { name: 'grantedBy', label: 'Granted By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Default roles created for every new group
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ROLES = [
    { name: 'Owner',   description: 'Full control, can delete group', level: 100 },
    { name: 'Admin',   description: 'Manage members and roles',      level: 80 },
    { name: 'Member',  description: 'Standard access',               level: 40 },
    { name: 'Viewer',  description: 'Read-only access',              level: 10 }
];

const PERMISSION_LEVELS = { view: 10, edit: 40, manage: 80, admin: 100 };

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class GroupService extends Publome {
    constructor(config = {}) {
        super(GroupServiceSchema, config);

        // groupMember labeller: resolve member name + role name
        this.table('groupMember').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            const name = this._resolveMemberLabel(data.memberId);
            const roleName = data.roleId ? this._resolveLabel('groupRole', data.roleId) : '';
            return roleName ? `${name} (${roleName})` : name;
        };

        // groupInvitation labeller: member name + status
        this.table('groupInvitation').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            const name = this._resolveMemberLabel(data.memberId);
            return `${name} — ${data.status || 'pending'}`;
        };

        const svc = this;
        this.views = {
            renderManager:      (c, opts) => svc._renderManager(c, opts),
            renderGroupSummary: (c, opts) => svc._renderGroupSummary(c, opts),
            renderGroupCreator: (c, opts) => svc._renderGroupCreator(c, opts),
            renderGroupTree:    (c, opts) => svc._renderGroupTree(c, opts),
            renderMemberView:   (c, opts) => svc._renderMemberView(c, opts),
            renderInvitations:  (c, opts) => svc._renderInvitations(c, opts),
            renderRoles:        (c, opts) => svc._renderRoles(c, opts),
            renderObjectPerms:  (c, opts) => svc._renderObjectPerms(c, opts),
            renderAccessCheck:  (c, opts) => svc._renderAccessCheck(c, opts)
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Permission Level Helpers
    // ─────────────────────────────────────────────────────────────────────────

    static permissionLevel(permission) {
        return PERMISSION_LEVELS[permission] || 0;
    }

    static levelToPermission(level) {
        const entries = Object.entries(PERMISSION_LEVELS).sort((a, b) => b[1] - a[1]);
        for (const [name, threshold] of entries) {
            if (level >= threshold) return name;
        }
        return 'view';
    }

    _getPermissionCeiling(roleLevel) {
        if (!roleLevel || roleLevel <= 0) return 'view';
        return GroupService.levelToPermission(roleLevel);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group CRUD
    // ─────────────────────────────────────────────────────────────────────────

    createGroup(data, createdBy = null) {
        const now = new Date().toISOString();
        const group = this.table('group').create({
            ...data,
            ownerId: createdBy || data.ownerId,
            createdBy: createdBy,
            createdAt: now,
            modifiedAt: now
        });
        this._ensureDefaultRoles(group.idx);
        return group;
    }

    getByCode(code) {
        return this.table('group').all().find(g => g.get('code') === code) || null;
    }

    getChildren(parentId) {
        return this.table('group').all().filter(g => g.get('parentId') === parentId);
    }

    getAncestors(groupId) {
        const ancestors = [];
        let current = this.table('group').read(groupId);
        while (current) {
            const parentId = current.get('parentId');
            if (!parentId) break;
            const parent = this.table('group').read(parentId);
            if (!parent) break;
            ancestors.unshift(parent);
            current = parent;
        }
        return ancestors;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Role Management
    // ─────────────────────────────────────────────────────────────────────────

    createRole(groupId, data) {
        return this.table('groupRole').create({
            ...data,
            groupId,
            createdAt: new Date().toISOString()
        });
    }

    getRoles(groupId) {
        return this.table('groupRole').all()
            .filter(r => r.get('groupId') === groupId)
            .sort((a, b) => (b.get('level') || 0) - (a.get('level') || 0));
    }

    getRoleByName(groupId, name) {
        return this.table('groupRole').all().find(r =>
            r.get('groupId') === groupId && r.get('name') === name
        ) || null;
    }

    _ensureDefaultRoles(groupId) {
        const existing = this.getRoles(groupId);
        if (existing.length > 0) return;
        for (const def of DEFAULT_ROLES) {
            this.createRole(groupId, def);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Membership Management
    // ─────────────────────────────────────────────────────────────────────────

    addMember(groupId, memberId, roleId = null, invitedBy = null) {
        const existing = this.getMembership(groupId, memberId);
        if (existing) {
            if (roleId && existing.get('roleId') !== roleId) {
                existing.set('roleId', roleId);
            }
            return existing;
        }
        return this.table('groupMember').create({
            groupId, memberId, roleId,
            status: 'active',
            invitedBy,
            joinedAt: new Date().toISOString()
        });
    }

    removeMember(groupId, memberId) {
        const membership = this.getMembership(groupId, memberId);
        if (membership) this.table('groupMember').delete(membership.idx);
    }

    getMembership(groupId, memberId) {
        return this.table('groupMember').all().find(gm =>
            gm.get('groupId') === groupId && gm.get('memberId') === memberId
        ) || null;
    }

    getMembers(groupId) {
        return this.table('groupMember').all()
            .filter(gm => gm.get('groupId') === groupId)
            .map(gm => ({
                membership: gm,
                memberId: gm.get('memberId'),
                roleId: gm.get('roleId')
            }));
    }

    getMemberGroups(memberId) {
        return this.table('groupMember').all()
            .filter(gm => gm.get('memberId') === memberId)
            .map(gm => ({
                group: this.table('group').read(gm.get('groupId')),
                roleId: gm.get('roleId')
            }))
            .filter(item => item.group);
    }

    isMember(groupId, memberId, checkHierarchy = false) {
        if (this.getMembership(groupId, memberId)) return true;
        if (!checkHierarchy) return false;
        const group = this.table('group').read(groupId);
        if (group && group.get('parentId')) {
            return this.isMember(group.get('parentId'), memberId, true);
        }
        return false;
    }

    hasRole(groupId, memberId, roleNames) {
        const membership = this.getMembership(groupId, memberId);
        if (!membership) return false;
        const roleId = membership.get('roleId');
        if (!roleId) return false;
        const role = this.table('groupRole').read(roleId);
        if (!role) return false;
        const required = Array.isArray(roleNames) ? roleNames : [roleNames];
        return required.includes(role.get('name'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invitation Management
    // ─────────────────────────────────────────────────────────────────────────

    inviteMember(groupId, memberId, roleId = null, opts = {}) {
        return this.table('groupInvitation').create({
            groupId, memberId, roleId,
            status: 'pending',
            message: opts.message || '',
            invitedBy: opts.invitedBy || null,
            createdAt: new Date().toISOString(),
            expiresAt: opts.expiresAt || null
        });
    }

    acceptInvitation(invitationIdx) {
        const inv = this.table('groupInvitation').read(invitationIdx);
        if (!inv || inv.get('status') !== 'pending') return null;
        inv.set('status', 'accepted');
        return this.addMember(
            inv.get('groupId'),
            inv.get('memberId'),
            inv.get('roleId'),
            inv.get('invitedBy')
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Object Permission Management
    // ─────────────────────────────────────────────────────────────────────────

    addObject(groupId, data) {
        return this.table('groupObject').create({
            ...data,
            groupId,
            createdAt: new Date().toISOString()
        });
    }

    getObjects(groupId) {
        return this.table('groupObject').all()
            .filter(o => o.get('groupId') === groupId);
    }

    removeObject(groupId, objectIdOrFilter) {
        const table = this.table('groupObject');
        if (typeof objectIdOrFilter === 'number') {
            const record = table.read(objectIdOrFilter);
            if (record && record.get('groupId') === groupId) {
                table.delete(objectIdOrFilter);
            }
            return;
        }
        const { objectService, objectTable, objectIdx } = objectIdOrFilter;
        const match = table.all().find(o =>
            o.get('groupId') === groupId &&
            o.get('objectService') === objectService &&
            o.get('objectTable') === objectTable &&
            o.get('objectIdx') === objectIdx
        );
        if (match) table.delete(match.idx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Permission Enforcement
    // ─────────────────────────────────────────────────────────────────────────

    getEffectivePermission(memberId, objectService, objectTable, objectIdx) {
        const objects = this.table('groupObject').all().filter(o =>
            o.get('objectService') === objectService &&
            o.get('objectTable') === objectTable &&
            o.get('objectIdx') === objectIdx
        );
        if (objects.length === 0) return null;

        let highestLevel = -1;
        let bestPermission = null;

        for (const obj of objects) {
            const groupId = obj.get('groupId');
            const membership = this.getMembership(groupId, memberId);
            if (!membership) continue;

            const roleId = membership.get('roleId');
            let roleLevel = 0;
            if (roleId) {
                const role = this.table('groupRole').read(roleId);
                if (role) roleLevel = role.get('level') || 0;
            }

            const ceiling = this._getPermissionCeiling(roleLevel);
            const ceilingLevel = GroupService.permissionLevel(ceiling);
            const objectPermLevel = GroupService.permissionLevel(obj.get('permission') || 'view');
            const effectiveLevel = Math.min(ceilingLevel, objectPermLevel);

            if (effectiveLevel > highestLevel) {
                highestLevel = effectiveLevel;
                bestPermission = GroupService.levelToPermission(effectiveLevel);
            }
        }

        return bestPermission;
    }

    canAccess(memberId, objectService, objectTable, objectIdx, requiredPermission) {
        const effective = this.getEffectivePermission(memberId, objectService, objectTable, objectIdx);
        if (!effective) return false;
        return GroupService.permissionLevel(effective) >= GroupService.permissionLevel(requiredPermission);
    }

    getAccessibleObjects(memberId, filter = {}) {
        const memberGroups = this.getMemberGroups(memberId);
        if (memberGroups.length === 0) return [];

        const dedup = {};

        for (const { group, roleId } of memberGroups) {
            const groupId = group.idx;
            let roleLevel = 0;
            if (roleId) {
                const role = this.table('groupRole').read(roleId);
                if (role) roleLevel = role.get('level') || 0;
            }
            const ceiling = this._getPermissionCeiling(roleLevel);
            const ceilingLevel = GroupService.permissionLevel(ceiling);

            const objects = this.getObjects(groupId);
            for (const obj of objects) {
                const svc = obj.get('objectService');
                const tbl = obj.get('objectTable');
                const idx = obj.get('objectIdx');

                if (filter.objectService && svc !== filter.objectService) continue;
                if (filter.objectTable && tbl !== filter.objectTable) continue;

                const objectPermLevel = GroupService.permissionLevel(obj.get('permission') || 'view');
                const effectiveLevel = Math.min(ceilingLevel, objectPermLevel);
                const effectivePerm = GroupService.levelToPermission(effectiveLevel);

                if (filter.minPermission && effectiveLevel < GroupService.permissionLevel(filter.minPermission)) continue;

                const key = `${svc}:${tbl}:${idx}`;
                if (!dedup[key] || GroupService.permissionLevel(dedup[key].permission) < effectiveLevel) {
                    dedup[key] = {
                        objectService: svc,
                        objectTable: tbl,
                        objectIdx: idx,
                        label: obj.get('label'),
                        permission: effectivePerm,
                        groupId,
                        groupName: group.get('name')
                    };
                }
            }
        }

        return Object.values(dedup);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────────

    getByType(type) {
        return this.table('group').all().filter(g => g.get('type') === type);
    }

    search(query) {
        const q = query.toLowerCase();
        return this.table('group').all().filter(g =>
            g.get('name')?.toLowerCase().includes(q) ||
            g.get('description')?.toLowerCase().includes(q) ||
            g.get('code')?.toLowerCase().includes(q)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Manager (single unified interface)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Single uiControlStage interface:
     * - Control panel: groups (top), roles for selected group (bottom)
     * - Stage: two columns — members (left), objects (right)
     * All tables cascade from the selected group via bindChildTable.
     */
    _renderManager(container, options = {}) {
        container.innerHTML = '';
        const svc = this;

        // Outer layout: control (groups+roles) | stage (members+objects)
        const cs = new uiControlStage({
            parent: container,
            template: 'unified',
            controlTitle: 'Groups',
            stageTitle: '',
            controlSize: 'md'
        });

        // ── Control: Groups ──
        const groupBinding = new UIBinding(svc.table('group'), { publome: svc });
        groupBinding.bindSelectEditor(cs.getControlPanel(), { editor: 'modal' });

        // ── Control: Roles (cascaded from group) ──
        const roleBinding = new UIBinding(svc.table('groupRole'), { publome: svc });
        roleBinding._setFkFilter('groupId', -1);  // Start empty until group selected
        roleBinding.bindSelectEditor(cs.getControlPanel(), { editor: 'modal' });
        groupBinding.bindChildTable(roleBinding, 'groupId');

        // ── Stage: two-column layout using nested control-stage ──
        const inner = new uiControlStage({
            parent: cs.getStage(),
            template: 'default',
            controlTitle: 'Members',
            stageTitle: 'Objects & Permissions',
            controlSize: 'lg'
        });

        // Left column: Members (cascaded from group)
        const memberBinding = new UIBinding(svc.table('groupMember'), { publome: svc });
        memberBinding._setFkFilter('groupId', -1);  // Start empty until group selected
        memberBinding.setFkScope('roleId', 'groupId');  // Role dropdown filtered by selected group
        memberBinding.bindSelectEditor(inner.getControlPanel(), { editor: 'modal' });
        groupBinding.bindChildTable(memberBinding, 'groupId');

        // Right column: Objects (cascaded from group)
        const objectBinding = new UIBinding(svc.table('groupObject'), { publome: svc });
        objectBinding._setFkFilter('groupId', -1);  // Start empty until group selected
        objectBinding.bindSelectEditor(inner.getStage(), { editor: 'modal' });
        groupBinding.bindChildTable(objectBinding, 'groupId');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Group Tree (editable hierarchy)
    // ─────────────────────────────────────────────────────────────────────────

    _renderGroupTree(container, options = {}) {
        container.innerHTML = '';
        const binding = new UIBinding(this.table('group'), { publome: this });
        binding.bindTreeEditor(container, {
            editor: 'modal',
            parentField: 'parentId',
            map: (r) => ({
                label: r.get('name'),
                sublabel: r.get('type') || ''
            })
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Member View (group selector → cascaded member editor)
    // ─────────────────────────────────────────────────────────────────────────

    _renderMemberView(container, options = {}) {
        container.innerHTML = '';
        const cs = new uiControlStage({
            parent: container,
            template: 'default',
            controlTitle: 'Groups',
            stageTitle: 'Members',
            controlSize: 'sm'
        });

        const groupBinding = new UIBinding(this.table('group'), { publome: this });
        groupBinding.bindSelector(cs.getControlPanel());

        const memberBinding = new UIBinding(this.table('groupMember'), { publome: this });
        memberBinding._setFkFilter('groupId', -1);
        memberBinding.setFkScope('roleId', 'groupId');
        memberBinding.bindSelectEditor(cs.getStage(), { editor: 'modal' });
        groupBinding.bindChildTable(memberBinding, 'groupId');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Invitations (group selector → cascaded invitation editor)
    // ─────────────────────────────────────────────────────────────────────────

    _renderInvitations(container, options = {}) {
        container.innerHTML = '';
        const cs = new uiControlStage({
            parent: container,
            template: 'default',
            controlTitle: 'Groups',
            stageTitle: 'Invitations',
            controlSize: 'sm'
        });

        const groupBinding = new UIBinding(this.table('group'), { publome: this });
        groupBinding.bindSelector(cs.getControlPanel());

        const invBinding = new UIBinding(this.table('groupInvitation'), { publome: this });
        invBinding._setFkFilter('groupId', -1);
        invBinding.setFkScope('roleId', 'groupId');
        invBinding.bindSelectEditor(cs.getStage(), { editor: 'modal' });
        groupBinding.bindChildTable(invBinding, 'groupId');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Roles (group selector → cascaded role editor)
    // ─────────────────────────────────────────────────────────────────────────

    _renderRoles(container, options = {}) {
        container.innerHTML = '';
        const cs = new uiControlStage({
            parent: container,
            template: 'default',
            controlTitle: 'Groups',
            stageTitle: 'Roles',
            controlSize: 'sm'
        });

        const groupBinding = new UIBinding(this.table('group'), { publome: this });
        groupBinding.bindSelector(cs.getControlPanel());

        const roleBinding = new UIBinding(this.table('groupRole'), { publome: this });
        roleBinding._setFkFilter('groupId', -1);
        roleBinding.bindSelectEditor(cs.getStage(), { editor: 'modal' });
        groupBinding.bindChildTable(roleBinding, 'groupId');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Object Permissions (group selector → cascaded object editor)
    // ─────────────────────────────────────────────────────────────────────────

    _renderObjectPerms(container, options = {}) {
        container.innerHTML = '';
        const cs = new uiControlStage({
            parent: container,
            template: 'default',
            controlTitle: 'Groups',
            stageTitle: 'Object Permissions',
            controlSize: 'sm'
        });

        const groupBinding = new UIBinding(this.table('group'), { publome: this });
        groupBinding.bindSelector(cs.getControlPanel());

        const objBinding = new UIBinding(this.table('groupObject'), { publome: this });
        objBinding._setFkFilter('groupId', -1);
        objBinding.bindSelectEditor(cs.getStage(), { editor: 'modal' });
        groupBinding.bindChildTable(objBinding, 'groupId');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Access Check (metrics + permission matrix)
    // ─────────────────────────────────────────────────────────────────────────

    _renderAccessCheck(container, options = {}) {
        container.innerHTML = '';
        const svc = this;

        // Metrics row
        const metricsRow = document.createElement('div');
        metricsRow.style.cssText = 'display:flex;gap:var(--ui-space-3);margin-bottom:var(--ui-space-4);flex-wrap:wrap;';
        container.appendChild(metricsRow);

        const groupBinding = new UIBinding(svc.table('group'), { publome: svc });
        groupBinding.bindMetric(metricsRow, { label: 'Groups', icon: 'fa-layer-group', color: 'primary',
            compute: (records) => records.length });

        const memberBinding = new UIBinding(svc.table('groupMember'), { publome: svc });
        memberBinding.bindMetric(metricsRow, { label: 'Memberships', icon: 'fa-users', color: 'secondary',
            compute: (records) => records.length });

        const objBinding = new UIBinding(svc.table('groupObject'), { publome: svc });
        objBinding.bindMetric(metricsRow, { label: 'Objects', icon: 'fa-shield-alt', color: 'accent',
            compute: (records) => records.length });

        // Permission matrix: groups × objects showing effective permission level
        const matrixDiv = document.createElement('div');
        matrixDiv.style.cssText = 'overflow-x:auto;';
        container.appendChild(matrixDiv);

        const groups = svc.table('group').all();
        const objects = svc.table('groupObject').all();

        if (groups.length === 0 || objects.length === 0) {
            matrixDiv.innerHTML = '<p style="color:var(--ui-gray-400);font-size:var(--ui-text-sm);">No groups or objects to display.</p>';
            return;
        }

        const permColors = { admin: 'var(--ui-primary-600)', manage: 'var(--ui-secondary-600)',
            edit: 'var(--ui-accent-600)', view: 'var(--ui-gray-400)' };

        let html = '<table style="width:100%;border-collapse:collapse;font-size:var(--ui-text-xs);">';
        html += '<tr style="background:var(--ui-gray-100);"><th style="text-align:left;padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-200);">Object</th>';
        html += '<th style="text-align:left;padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-200);">Service</th>';
        html += '<th style="text-align:left;padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-200);">Group</th>';
        html += '<th style="text-align:left;padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-200);">Permission</th></tr>';

        objects.forEach(obj => {
            const perm = obj.get('permission') || 'view';
            const groupId = obj.get('groupId');
            const group = svc.table('group').read(groupId);
            const groupName = group ? group.get('name') : '#' + groupId;
            const color = permColors[perm] || 'var(--ui-gray-400)';

            html += '<tr>';
            html += '<td style="padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-100);font-weight:var(--ui-font-medium);">' + (obj.get('label') || '—') + '</td>';
            html += '<td style="padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-100);color:var(--ui-gray-500);">' + (obj.get('objectService') || '—') + '</td>';
            html += '<td style="padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-100);">' + groupName + '</td>';
            html += '<td style="padding:var(--ui-space-1) var(--ui-space-2);border-bottom:1px solid var(--ui-gray-100);"><span style="color:' + color + ';font-weight:var(--ui-font-semibold);text-transform:uppercase;font-size:var(--ui-text-2xs);">' + perm + '</span></td>';
            html += '</tr>';
        });
        html += '</table>';
        matrixDiv.innerHTML = html;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    _resolveLabel(tableName, idx) {
        if (!idx) return '\u2014';
        const record = this.table(tableName).read(idx);
        return record ? (record.get('name') || `#${idx}`) : `#${idx}`;
    }

    _resolveMemberLabel(idx) {
        if (!idx) return '\u2014';
        try {
            const memberSvc = ServiceRegistry.get('member');
            if (memberSvc) {
                const record = memberSvc.table('member').read(idx);
                if (record) return record.get('displayName') || record.get('username') || `#${idx}`;
            }
        } catch (e) {}
        return `Member #${idx}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Binding
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Connect to a REST API for data synchronization.
     * Wires ApiBinding on all tables so CRUD operations sync to the server.
     *
     * @param {Object} config - API configuration
     * @param {string} config.apiUrl - Base API URL (e.g. 'https://api.example.com')
     * @param {string} [config.apiToken] - Authentication token
     * @param {string} [config.apiEndpoint='/api/v1/group'] - Base endpoint path
     * @returns {Object} Map of table name → ApiBinding instance
     */
    connectApi(config = {}) {
        if (!config.apiUrl) throw new Error('apiUrl is required');
        const baseEndpoint = config.apiEndpoint || '/api/v1/group';
        const bindings = {};

        ['group', 'groupRole', 'groupMember', 'groupInvitation', 'groupObject'].forEach(tableName => {
            bindings[tableName] = new ApiBinding(this.table(tableName), {
                apiUrl: config.apiUrl,
                endpoint: `${baseEndpoint}/${tableName}`,
                apiToken: config.apiToken
            });
        });

        return bindings;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Data
    // ─────────────────────────────────────────────────────────────────────────

    seedDefaults() {
        const groups = this.table('group');
        if (groups.all().length === 0) {
            this.createGroup({
                name: 'Everyone',
                code: 'EVERYONE',
                type: 'organization',
                visibility: 'public',
                description: 'All members of the system'
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Group Summary (compact list by type with member counts)
    // ─────────────────────────────────────────────────────────────────────────

    _renderGroupSummary(container, options = {}) {
        container.innerHTML = '';
        const svc = this;
        const groups = svc.table('group').all();
        const typeColors = options.typeColors || GroupService.TYPE_COLORS;

        if (groups.length === 0) {
            container.innerHTML = '<div style="font-size:var(--ui-text-xs);color:var(--ui-gray-400);padding:var(--ui-space-1);">No groups.</div>';
            return;
        }

        const byType = {};
        groups.forEach(g => {
            const t = g.get('type') || 'other';
            if (!byType[t]) byType[t] = [];
            byType[t].push(g);
        });

        Object.entries(byType).forEach(([type, grps]) => {
            const header = document.createElement('div');
            header.style.cssText = `font-size:var(--ui-text-2xs);font-weight:var(--ui-font-semibold);text-transform:uppercase;letter-spacing:0.03em;color:${typeColors[type] || 'var(--ui-gray-400)'};padding:var(--ui-space-1) 0 var(--ui-space-1);`;
            header.textContent = `${type} (${grps.length})`;
            container.appendChild(header);

            grps.forEach(g => {
                const memberCount = svc.getMembers(g.idx).length;
                const item = document.createElement('div');
                item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:var(--ui-space-1) var(--ui-space-1);font-size:var(--ui-text-2xs);color:var(--ui-gray-300);border-bottom:1px solid var(--ui-gray-800);';
                item.innerHTML = `
                    <span>${g.get('code') || g.get('name')}</span>
                    <span style="background:var(--ui-gray-800);color:${typeColors[type] || 'var(--ui-gray-400)'};padding:0.05rem var(--ui-space-1);border-radius:var(--ui-radius-full);font-size:var(--ui-text-2xs);">${memberCount}</span>
                `;
                container.appendChild(item);
            });
        });
    }

    static TYPE_COLORS = {
        group: 'var(--ui-primary-400)', team: 'var(--ui-accent-400)',
        department: 'var(--ui-secondary-400)', organization: 'var(--ui-gray-400)',
        project: 'var(--ui-primary-300)', course: 'var(--ui-primary-400)',
        programme: 'var(--ui-accent-400)', faculty: 'var(--ui-secondary-400)'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Group Creator (form for creating a new group)
    // ─────────────────────────────────────────────────────────────────────────

    _renderGroupCreator(container, options = {}) {
        container.innerHTML = '';
        const svc = this;

        const title = document.createElement('h3');
        title.style.cssText = 'margin:0 0 1rem;font-size:1rem;color:var(--ui-primary-700, #1565C0);';
        title.innerHTML = '<i class="fas fa-folder-plus" style="margin-right:0.4rem;"></i>Create Scope Group';
        container.appendChild(title);

        const formDiv = document.createElement('div');
        container.appendChild(formDiv);

        const groupTypes = options.groupTypes || [
            { value: 'course', label: 'Course' },
            { value: 'programme', label: 'Programme' },
            { value: 'department', label: 'Department' },
            { value: 'organization', label: 'Organization' }
        ];

        const form = new uiForm({
            parent: formDiv,
            fields: {
                code: { label: 'Code', type: 'text', required: true, placeholder: 'e.g. COMP101 or BSc-CS' },
                name: { label: 'Name', type: 'text', required: true, placeholder: 'Full name' },
                type: { label: 'Type', type: 'select', options: groupTypes }
            },
            buttons: {
                create: { label: 'Create', variant: 'primary', type: 'submit' },
                cancel: { label: 'Cancel', variant: 'outline', type: 'button' }
            }
        });

        form.bus.on('submit', ({ data }) => {
            if (!data.code || !data.name) {
                new uiAlert({ parent: container, type: 'warning', message: 'Code and name are required.', dismissible: true });
                return;
            }
            svc.createGroup({ code: data.code, name: data.name, type: data.type || 'course', visibility: 'public' });
            if (options.onCreated) options.onCreated();
        });

        form.bus.on('button', ({ key }) => {
            if (key === 'cancel' && options.onCancel) options.onCancel();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Binding Registry & Capability Discovery
    // ─────────────────────────────────────────────────────────────────────────

    getBindingRegistry() {
        const svc = this;
        return [
            {
                key: 'manager',
                label: 'Manager',
                description: 'Full group management interface with member list and role assignments.',
                type: 'composite',
                tables: ['group', 'groupMember', 'groupRole'],
                methods: ['bindSelectEditor', 'bindChildTable'],
                tags: ['management', 'crud', 'roles', 'membership'],
                intent: 'Manage groups, members, and role assignments',
                builder: (svc, container) => { svc.views.renderManager(container); }
            },
            {
                key: 'groupTree',
                label: 'Tree',
                description: 'Hierarchical tree of groups with parent-child nesting.',
                type: 'tree',
                tables: ['group'],
                methods: ['bindTree'],
                tags: ['hierarchy', 'navigation', 'structure'],
                intent: 'Navigate group hierarchy as a tree',
                builder: (svc, container) => {
                    const binding = new UIBinding(svc.table('group'), { publome: svc });
                    binding.bindTree(container, { parentField: 'parentId', map: (r) => ({ label: r.get('name'), sublabel: r.get('type') || '' }) });
                }
            },
            {
                key: 'allGroups',
                label: 'All Groups',
                description: 'Card collection of all groups.',
                type: 'collection',
                tables: ['group'],
                methods: ['bindCollection'],
                tags: ['browse', 'overview'],
                intent: 'View all groups as cards',
                builder: null
            },
            {
                key: 'memberView',
                label: 'Members',
                description: 'Group selector with cascaded member editor.',
                type: 'composite',
                tables: ['group', 'groupMember'],
                methods: ['bindSelector', 'bindSelectEditor', 'bindChildTable'],
                tags: ['membership', 'crud'],
                intent: 'Manage group memberships',
                builder: (svc, container) => { svc.views.renderMemberView(container); }
            },
            {
                key: 'invitations',
                label: 'Invitations',
                description: 'Group selector with cascaded invitation editor.',
                type: 'composite',
                tables: ['group', 'groupInvitation'],
                methods: ['bindSelector', 'bindSelectEditor', 'bindChildTable'],
                tags: ['invitations', 'workflow'],
                intent: 'Manage group invitations',
                builder: (svc, container) => { svc.views.renderInvitations(container); }
            },
            {
                key: 'roles',
                label: 'Roles',
                description: 'Group selector with cascaded role editor.',
                type: 'composite',
                tables: ['group', 'groupRole'],
                methods: ['bindSelector', 'bindSelectEditor', 'bindChildTable'],
                tags: ['roles', 'access'],
                intent: 'Manage per-group roles',
                builder: (svc, container) => { svc.views.renderRoles(container); }
            },
            {
                key: 'objectPerms',
                label: 'Object Permissions',
                description: 'Group selector with cascaded object permission editor.',
                type: 'composite',
                tables: ['group', 'groupObject'],
                methods: ['bindSelector', 'bindSelectEditor', 'bindChildTable'],
                tags: ['permissions', 'objects'],
                intent: 'Manage object-level permissions',
                builder: (svc, container) => { svc.views.renderObjectPerms(container); }
            },
            {
                key: 'accessCheck',
                label: 'Access Check',
                description: 'Metrics and permission matrix for all group objects.',
                type: 'analysis',
                tables: ['group', 'groupMember', 'groupObject'],
                methods: ['bindMetric'],
                tags: ['audit', 'permissions', 'overview'],
                intent: 'Review permission assignments across groups',
                builder: (svc, container) => { svc.views.renderAccessCheck(container); }
            }
        ];
    }

    getCapabilities() {
        return {
            name: 'group',
            alias: 'Group Service',
            icon: 'fa-users',
            intent: 'Team and group management with hierarchical nesting, role-based membership, and object-level permissions.',
            keywords: ['teams', 'groups', 'membership', 'roles', 'permissions', 'hierarchy', 'departments', 'organizations'],
            capabilities: ['hierarchical-groups', 'role-based-membership', 'polymorphic-objects', 'invitation-workflow', 'permission-levels'],
            useCases: [
                'Organize users into teams or departments with role-based access',
                'Build hierarchical organizational structures',
                'Control object-level permissions through group membership',
                'Manage invitations and approval workflows for joining groups'
            ],
            consumers: ['AutoScholar', 'BenchStamp', 'EthiKit', 'InfraTrack'],
            domainMethods: [
                // Group CRUD
                { name: 'createGroup', signature: '(data, createdBy)', description: 'Create a group with auto-generated default roles', category: 'Group CRUD' },
                { name: 'getByCode', signature: '(code)', description: 'Find group by unique code', category: 'Group CRUD' },
                { name: 'getChildren', signature: '(parentId)', description: 'Get child groups', category: 'Group CRUD' },
                { name: 'getAncestors', signature: '(groupId)', description: 'Get ancestor chain to root', category: 'Group CRUD' },
                // Role Management
                { name: 'createRole', signature: '(groupId, data)', description: 'Create a custom role for a group', category: 'Role Management' },
                { name: 'getRoles', signature: '(groupId)', description: 'Get all roles for a group sorted by level', category: 'Role Management' },
                { name: 'getRoleByName', signature: '(groupId, name)', description: 'Find role by name within a group', category: 'Role Management' },
                // Membership
                { name: 'addMember', signature: '(groupId, memberId, roleId)', description: 'Add a member to a group with a role', category: 'Membership' },
                { name: 'removeMember', signature: '(groupId, memberId)', description: 'Remove a member from a group', category: 'Membership' },
                { name: 'getMembership', signature: '(groupId, memberId)', description: 'Get membership record for a member', category: 'Membership' },
                { name: 'getMembers', signature: '(groupId)', description: 'Get all members of a group', category: 'Membership' },
                { name: 'getMemberGroups', signature: '(memberId)', description: 'Get all groups a member belongs to', category: 'Membership' },
                { name: 'isMember', signature: '(groupId, memberId, checkHierarchy)', description: 'Check if a member belongs to a group', category: 'Membership' },
                { name: 'hasRole', signature: '(groupId, memberId, roleNames)', description: 'Check if member has a specific role', category: 'Membership' },
                // Invitations
                { name: 'inviteMember', signature: '(groupId, memberId, roleId, opts)', description: 'Create a pending invitation', category: 'Invitations' },
                { name: 'acceptInvitation', signature: '(invitationIdx)', description: 'Accept invitation and create membership', category: 'Invitations' },
                // Object Permissions
                { name: 'addObject', signature: '(groupId, data)', description: 'Attach an object to a group with permission level', category: 'Object Permissions' },
                { name: 'getObjects', signature: '(groupId)', description: 'Get objects controlled by a group', category: 'Object Permissions' },
                { name: 'removeObject', signature: '(groupId, objectIdOrFilter)', description: 'Remove an object by ID or filter', category: 'Object Permissions' },
                // Permission Enforcement
                { name: 'getEffectivePermission', signature: '(memberId, svc, tbl, idx)', description: 'Compute highest effective permission for a member on an object', category: 'Permission Enforcement' },
                { name: 'canAccess', signature: '(memberId, svc, tbl, idx, perm)', description: 'Check if member has required permission level', category: 'Permission Enforcement' },
                { name: 'getAccessibleObjects', signature: '(memberId, filter)', description: 'Get all objects accessible to a member with deduplication', category: 'Permission Enforcement' },
                // Queries
                { name: 'getByType', signature: '(type)', description: 'Get all groups of a specific type', category: 'Queries' },
                { name: 'search', signature: '(query)', description: 'Search groups by name, description, or code', category: 'Queries' }
            ],
            bindings: this.getBindingRegistry()
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GroupService, GroupServiceSchema };
}
