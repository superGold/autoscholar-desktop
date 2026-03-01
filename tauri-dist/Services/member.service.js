/**
 * MemberService - Core identity & RBAC service
 *
 * Manages users, roles, sessions, profiles, and permissions. This is the foundational
 * service that all other services reference for ownership (createdBy, modifiedBy).
 *
 * Identity layer (tables):
 * - member: User accounts
 * - memberRole: Role definitions with permission arrays
 * - memberRoleLink: Member-to-role assignments (M:N)
 * - memberSession: Active sessions
 * - memberProfile: Extended profile data
 *
 * RBAC layer (methods):
 * - bindToSystem(config): Auto-generate data permissions from ServiceRegistry,
 *   merge custom view/action permissions, create role records from config
 * - login(memberId): Set current member, resolve permissions, emit event
 * - hasPermission(perm): Wildcard-aware permission check
 * - canView/canData/canAction: Shorthand permission checks
 * - getPermissionRegistry/Matrix: Admin introspection
 *
 * Group-context layer (methods):
 * - bindGroupContext(groupService, scopeRules): Link a GroupService for context-scoped access.
 *   Context scoping extends binary permissions with dimensional constraints — e.g. "this user
 *   can view:classroom:*, but ONLY for course codes COMP101 and MATH201."
 * - getMemberScope(memberId, scopeKey): Returns { type, codes[], identifier, unrestricted, groupRole }
 * - hasScopeAccess(memberId, scopeKey, code): Check access to a specific scope code
 * - canViewInScope(viewCode, code): Combines permission + scope check for current session
 * - getScopeGroupsForMember(memberId, groupType): Get all groups of a type for a member
 * - isContextBound / getScopeRules: Introspection flags
 *
 * Scope types (configured via scopeRules):
 * - 'scoped': Member has access to specific codes via GroupService group membership.
 *   Uses groupType to query groups (e.g. groupType:'course' → course-code groups).
 *   GroupMember role (owner/admin/member/viewer) determines access depth.
 * - 'self': Member has access only to their own data. Uses identifierKey to read
 *   a value from memberProfile.metadata (e.g. identifierKey:'studentNumber').
 * - 'unrestricted': No scope filtering — member sees all data (e.g. executives).
 * - 'inherited': Inherits scope from the member's primary scoped group (e.g. tools
 *   inherit from whatever courses/programmes the user has access to).
 *
 * How to use groups for context-scoped access (pattern for any system):
 *
 * 1. Create GroupService groups with typed codes:
 *    groupService.createGroup({ name: 'COMP101', type: 'course', code: 'COMP101' });
 *    groupService.createGroup({ name: 'BSc CS',  type: 'programme', code: 'BSc-CS' });
 *
 * 2. Assign members to groups with a role:
 *    groupService.addMember(comp101Idx, lecturerIdx, 'admin');   // full access
 *    groupService.addMember(comp101Idx, studentIdx,  'viewer');  // read-only
 *
 * 3. Configure scope rules in bindGroupContext():
 *    memberService.bindGroupContext(groupService, {
 *        classroom:  { groupType: 'course' },        // scoped by course-code groups
 *        programme:  { groupType: 'programme' },      // scoped by programme-code groups
 *        student:    { identifierKey: 'studentNumber' }, // self-scoped via profile metadata
 *        executive:  { unrestricted: true },           // sees everything
 *        tools:      { inherited: true }               // inherits from primary scope
 *    });
 *
 * 4. At runtime, resolve scope before rendering a panel:
 *    const scope = memberService.getMemberScope(memberId, 'classroom');
 *    // → { type:'scoped', codes:['COMP101','MATH201'], groupRole:'admin', ... }
 *    // Pass scope.codes to the panel to restrict its data queries.
 *
 * 5. For quick boolean checks:
 *    memberService.hasScopeAccess(memberId, 'classroom', 'COMP101'); // true
 *    memberService.canViewInScope('classroom:risk', 'COMP101');      // permission + scope
 *
 * Views layer:
 * - views.renderLogin, renderProfile, renderDirectory, renderRoleEditor,
 *   renderRoleAssignments, renderPermissionMatrix, renderUserSwitcher,
 *   renderMemberManager, renderContextAssignments, renderAbout,
 *   renderAccessOverview, renderScopeMap
 *
 * @example
 * const memberService = new MemberService();
 * ServiceRegistry.register('member', memberService, { alias: 'Member Service' });
 * memberService.bindToSystem({
 *     permissions: { view: { admin: { label: 'Admin' } }, action: { export: { label: 'Export' } } },
 *     roles: { admin: { label: 'Administrator', level: 1, permissions: ['*'] } }
 * });
 * memberService.login(1);
 * memberService.hasPermission('data:specimen:read'); // true
 *
 * // With group-context scoping:
 * memberService.bindGroupContext(groupService, {
 *     classroom: { groupType: 'course' },
 *     student:   { identifierKey: 'studentNumber' }
 * });
 * memberService.getMemberScope(lecturerId, 'classroom');
 * // → { type:'scoped', codes:['COMP101','MATH201'], groupRole:'admin', unrestricted:false, identifier:null }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const MemberServiceSchema = {
    name: 'member',
    prefix: 'mbr',
    alias: 'Member Service',
    version: '3.0.0',

    tables: [
        {
            name: 'member',
            alias: 'Members',
            primaryKey: 'idx',
            labeller: '{username} ({email})',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'username', label: 'Username', type: 'string', required: true, unique: true },
                { name: 'email', label: 'Email', type: 'string', required: true, unique: true },
                { name: 'displayName', label: 'Display Name', type: 'string' },
                { name: 'avatar', label: 'Avatar URL', type: 'string' },
                { name: 'status', label: 'Status', type: 'string', default: 'active',
                    options: ['active', 'inactive', 'suspended', 'pending'] },
                { name: 'lastLoginAt', label: 'Last Login', type: 'datetime' },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'modifiedAt', label: 'Modified', type: 'datetime' }
            ]
        },
        {
            name: 'memberRole',
            alias: 'Roles',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'name', label: 'Role Name', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'level', label: 'Level', type: 'integer', default: 0 },
                { name: 'permissions', label: 'Permissions', type: 'json' },
                { name: 'isSystem', label: 'System Role', type: 'boolean', default: false },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'memberRoleLink',
            alias: 'Role Assignments',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'roleId', label: 'Role', type: 'integer', required: true,
                    ref: { table: 'memberRole', field: 'idx' } },
                { name: 'grantedBy', label: 'Granted By', type: 'integer' },
                { name: 'grantedAt', label: 'Granted', type: 'datetime' },
                { name: 'expiresAt', label: 'Expires', type: 'datetime' }
            ]
        },
        {
            name: 'memberSession',
            alias: 'Sessions',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'token', label: 'Token', type: 'string', required: true },
                { name: 'ipAddress', label: 'IP Address', type: 'string' },
                { name: 'userAgent', label: 'User Agent', type: 'string' },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'expiresAt', label: 'Expires', type: 'datetime' },
                { name: 'lastActivityAt', label: 'Last Activity', type: 'datetime' }
            ]
        },
        {
            name: 'memberProfile',
            alias: 'Profiles',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true, unique: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'firstName', label: 'First Name', type: 'string' },
                { name: 'lastName', label: 'Last Name', type: 'string' },
                { name: 'phone', label: 'Phone', type: 'string' },
                { name: 'timezone', label: 'Timezone', type: 'string' },
                { name: 'locale', label: 'Locale', type: 'string', default: 'en' },
                { name: 'bio', label: 'Bio', type: 'text' },
                { name: 'metadata', label: 'Metadata', type: 'json' },
                { name: 'primaryGroupId', label: 'Primary Group', type: 'integer',
                    ref: { service: 'group', table: 'group', field: 'idx' } },
                { name: 'modifiedAt', label: 'Modified', type: 'datetime' }
            ]
        },
        {
            name: 'memberPermissionOverride',
            alias: 'Permission Overrides',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'memberId', label: 'Member', type: 'integer', required: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'permission', label: 'Permission', type: 'string', required: true },
                { name: 'type', label: 'Type', type: 'string', required: true,
                    options: ['grant', 'deny'] },
                { name: 'reason', label: 'Reason', type: 'text' },
                { name: 'grantedBy', label: 'Granted By', type: 'integer',
                    ref: { table: 'member', field: 'idx' } },
                { name: 'grantedAt', label: 'Granted At', type: 'datetime' },
                { name: 'expiresAt', label: 'Expires At', type: 'datetime' }
            ]
        },
        {
            name: 'memberApiKey',
            alias: 'API Keys',
            primaryKey: 'idx',
            labeller: '{name} ({prefix})',
            columns: [
                { name: 'idx',           label: 'ID',             type: 'integer', auto: true },
                { name: 'memberId',      label: 'Member',         type: 'integer', required: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'name',          label: 'Key Name',       type: 'string',  required: true },
                { name: 'prefix',        label: 'Key Prefix',     type: 'string',  required: true },
                { name: 'keyHash',       label: 'Key Hash',       type: 'string',  required: true },
                { name: 'scopes',        label: 'Scopes',         type: 'json',    required: true },
                { name: 'status',        label: 'Status',         type: 'string',  default: 'active',
                    options: ['active', 'rotated', 'revoked', 'expired'] },
                { name: 'rateLimit',     label: 'Rate Limit',     type: 'integer', default: 1000 },
                { name: 'lastUsedAt',    label: 'Last Used',      type: 'datetime' },
                { name: 'lastIpAddress', label: 'Last IP',        type: 'string' },
                { name: 'expiresAt',     label: 'Expires',        type: 'datetime' },
                { name: 'revokedAt',     label: 'Revoked',        type: 'datetime' },
                { name: 'revokedBy',     label: 'Revoked By',     type: 'integer',
                    ref: { table: 'member', field: 'idx' } },
                { name: 'rotatedToId',   label: 'Rotated To',     type: 'integer',
                    ref: { table: 'memberApiKey', field: 'idx' } },
                { name: 'createdAt',     label: 'Created',        type: 'datetime' },
                { name: 'createdBy',     label: 'Created By',     type: 'integer',
                    ref: { table: 'member', field: 'idx' } }
            ]
        },
        {
            name: 'memberWebhook',
            alias: 'Webhooks',
            primaryKey: 'idx',
            labeller: '{url} ({event})',
            columns: [
                { name: 'idx',              label: 'ID',                type: 'integer', auto: true },
                { name: 'memberId',         label: 'Member',            type: 'integer', required: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'apiKeyId',         label: 'API Key',           type: 'integer',
                    ref: { table: 'memberApiKey', field: 'idx' } },
                { name: 'url',              label: 'Endpoint URL',      type: 'string',  required: true },
                { name: 'event',            label: 'Event Pattern',     type: 'string',  required: true },
                { name: 'secret',           label: 'Signing Secret',    type: 'string',  required: true },
                { name: 'status',           label: 'Status',            type: 'string',  default: 'active',
                    options: ['active', 'paused', 'failed'] },
                { name: 'failCount',        label: 'Consecutive Fails', type: 'integer', default: 0 },
                { name: 'lastDeliveredAt',  label: 'Last Delivered',    type: 'datetime' },
                { name: 'lastStatusCode',   label: 'Last Status',      type: 'integer' },
                { name: 'createdAt',        label: 'Created',           type: 'datetime' }
            ]
        },
        {
            name: 'memberOAuthProvider',
            alias: 'OAuth Providers',
            primaryKey: 'idx',
            labeller: '{name} ({type})',
            columns: [
                { name: 'idx',            label: 'ID',              type: 'integer', auto: true },
                { name: 'name',           label: 'Provider Name',   type: 'string',  required: true },
                { name: 'type',           label: 'Type',            type: 'string',  required: true,
                    options: ['oauth2', 'oidc', 'saml'] },
                { name: 'clientId',       label: 'Client ID',       type: 'string',  required: true },
                { name: 'clientSecret',   label: 'Client Secret',   type: 'string' },
                { name: 'authorizeUrl',   label: 'Authorize URL',   type: 'string',  required: true },
                { name: 'tokenUrl',       label: 'Token URL',       type: 'string',  required: true },
                { name: 'userInfoUrl',    label: 'User Info URL',   type: 'string' },
                { name: 'scopes',         label: 'Scopes',          type: 'string',  default: 'openid profile email' },
                { name: 'discoveryUrl',   label: 'Discovery URL',   type: 'string' },
                { name: 'icon',           label: 'Icon Class',      type: 'string',  default: 'fa-key' },
                { name: 'color',          label: 'Brand Color',     type: 'string',  default: '#4285f4' },
                { name: 'autoRegister',   label: 'Auto-Register',   type: 'boolean', default: false },
                { name: 'defaultRoleId',  label: 'Default Role',    type: 'integer',
                    ref: { table: 'memberRole', field: 'idx' } },
                { name: 'status',         label: 'Status',          type: 'string',  default: 'active',
                    options: ['active', 'inactive', 'testing'] },
                { name: 'createdAt',      label: 'Created',         type: 'datetime' },
                { name: 'modifiedAt',     label: 'Modified',        type: 'datetime' }
            ]
        },
        {
            name: 'memberOAuthLink',
            alias: 'OAuth Links',
            primaryKey: 'idx',
            labeller: '{externalId} via provider #{providerId}',
            columns: [
                { name: 'idx',            label: 'ID',              type: 'integer', auto: true },
                { name: 'memberId',       label: 'Member',          type: 'integer', required: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'providerId',     label: 'Provider',        type: 'integer', required: true,
                    ref: { table: 'memberOAuthProvider', field: 'idx' } },
                { name: 'externalId',     label: 'External ID',     type: 'string',  required: true },
                { name: 'externalEmail',  label: 'External Email',  type: 'string' },
                { name: 'externalName',   label: 'External Name',   type: 'string' },
                { name: 'externalAvatar', label: 'External Avatar', type: 'string' },
                { name: 'metadata',       label: 'Provider Data',   type: 'json' },
                { name: 'linkedAt',       label: 'Linked At',       type: 'datetime' },
                { name: 'lastUsedAt',     label: 'Last Used',       type: 'datetime' }
            ]
        },
        {
            name: 'memberOAuthToken',
            alias: 'OAuth Tokens',
            primaryKey: 'idx',
            columns: [
                { name: 'idx',            label: 'ID',              type: 'integer', auto: true },
                { name: 'linkId',         label: 'OAuth Link',      type: 'integer', required: true,
                    ref: { table: 'memberOAuthLink', field: 'idx' } },
                { name: 'accessToken',    label: 'Access Token',    type: 'string',  required: true },
                { name: 'refreshToken',   label: 'Refresh Token',   type: 'string' },
                { name: 'tokenType',      label: 'Token Type',      type: 'string',  default: 'Bearer' },
                { name: 'scopes',         label: 'Granted Scopes',  type: 'string' },
                { name: 'expiresAt',      label: 'Expires At',      type: 'datetime' },
                { name: 'createdAt',      label: 'Created',         type: 'datetime' },
                { name: 'revokedAt',      label: 'Revoked At',      type: 'datetime' }
            ]
        },
        {
            name: 'memberLoginLog',
            alias: 'Login History',
            primaryKey: 'idx',
            columns: [
                { name: 'idx',         label: 'ID',          type: 'integer', auto: true },
                { name: 'memberId',    label: 'Member',       type: 'integer',
                    ref: { table: 'member', field: 'idx' } },
                { name: 'method',      label: 'Method',       type: 'string',  required: true,
                    options: ['direct', 'oauth', 'apiKey', 'sessionRestore'] },
                { name: 'providerId',  label: 'Provider',     type: 'integer',
                    ref: { table: 'memberOAuthProvider', field: 'idx' } },
                { name: 'success',     label: 'Success',      type: 'boolean', required: true },
                { name: 'ipAddress',   label: 'IP Address',   type: 'string' },
                { name: 'userAgent',   label: 'User Agent',   type: 'string' },
                { name: 'failReason',  label: 'Fail Reason',  type: 'string' },
                { name: 'timestamp',   label: 'Timestamp',    type: 'datetime', required: true }
            ]
        },
        {
            name: 'memberInvitation',
            alias: 'Invitations',
            primaryKey: 'idx',
            labeller: '{email} ({status})',
            columns: [
                { name: 'idx',         label: 'ID',          type: 'integer', auto: true },
                { name: 'email',       label: 'Email',        type: 'string',  required: true },
                { name: 'roleId',      label: 'Assigned Role', type: 'integer',
                    ref: { table: 'memberRole', field: 'idx' } },
                { name: 'token',       label: 'Invite Token', type: 'string',  required: true },
                { name: 'message',     label: 'Message',      type: 'text' },
                { name: 'invitedBy',   label: 'Invited By',   type: 'integer',
                    ref: { table: 'member', field: 'idx' } },
                { name: 'status',      label: 'Status',       type: 'string',  default: 'pending',
                    options: ['pending', 'accepted', 'expired', 'revoked'] },
                { name: 'expiresAt',   label: 'Expires',      type: 'datetime' },
                { name: 'acceptedAt',  label: 'Accepted',     type: 'datetime' },
                { name: 'createdAt',   label: 'Created',      type: 'datetime' }
            ]
        },
        {
            name: 'memberAccessRequest',
            alias: 'Access Requests',
            primaryKey: 'idx',
            labeller: '{type}: {targetLabel} ({status})',
            columns: [
                { name: 'idx',           label: 'ID',              type: 'integer', auto: true },
                { name: 'memberId',      label: 'Requester',       type: 'integer', required: true,
                    ref: { table: 'member', field: 'idx' } },
                { name: 'type',          label: 'Request Type',    type: 'string',  required: true,
                    options: ['permission', 'role'] },
                { name: 'targetKey',     label: 'Target Key',      type: 'string',  required: true },
                { name: 'targetLabel',   label: 'Target Label',    type: 'string' },
                { name: 'roleId',        label: 'Requested Role',  type: 'integer',
                    ref: { table: 'memberRole', field: 'idx' } },
                { name: 'reason',        label: 'Reason',          type: 'text',    required: true },
                { name: 'status',        label: 'Status',          type: 'string',  default: 'pending',
                    options: ['pending', 'approved', 'denied', 'expired', 'cancelled'] },
                { name: 'reviewedBy',    label: 'Reviewed By',     type: 'integer',
                    ref: { table: 'member', field: 'idx' } },
                { name: 'reviewNotes',   label: 'Review Notes',    type: 'text' },
                { name: 'reviewedAt',    label: 'Reviewed At',     type: 'datetime' },
                { name: 'expiresAt',     label: 'Expires',         type: 'datetime' },
                { name: 'createdAt',     label: 'Created',         type: 'datetime' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class MemberService extends Publome {
    constructor(config = {}) {
        super(MemberServiceSchema, config);
        this._currentMember = null;
        this._currentPermissions = [];
        this._currentRoleKeys = [];
        this._currentOverrideGrants = [];
        this._currentOverrideDenials = [];
        this._permissionRegistry = { data: {}, view: {}, action: {} };
        this._roleDefinitions = {};
        this._systemBound = false;

        // Group-context scoping state
        this._groupService = null;
        this._scopeRules = {};
        this._contextBound = false;

        // Custom labellers that resolve FK references
        this.table('memberRoleLink').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            const role = this.table('memberRole').read(data.roleId);
            return role ? this.table('memberRole').getLabel(role) : `Role #${data.roleId}`;
        };
        this.table('memberPermissionOverride').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            return `${data.type}: ${data.permission}`;
        };
        this.table('memberApiKey').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            return `${data.name} (${data.prefix})`;
        };
        this.table('memberWebhook').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            return `${data.url} (${data.event})`;
        };
        this.table('memberOAuthProvider').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            return `${data.name} (${data.type})`;
        };
        this.table('memberOAuthLink').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            const provider = this.table('memberOAuthProvider').read(data.providerId);
            const provName = provider ? provider.get('name') : `Provider #${data.providerId}`;
            return `${data.externalEmail || data.externalId} via ${provName}`;
        };
        this.table('memberInvitation').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            return `${data.email} (${data.status})`;
        };
        this.table('memberAccessRequest').labeller = (record) => {
            const data = record.getData ? record.getData() : record;
            return `${data.type}: ${data.targetLabel || data.targetKey} (${data.status})`;
        };

        // Self-reference for views closure
        const svc = this;
        this.views = {
            renderLogin:              (c, opts) => svc._renderLogin(c, opts),
            renderProfile:            (c, opts) => svc._renderProfile(c, opts),
            renderDirectory:          (c, opts) => svc._renderDirectory(c, opts),
            renderRoleEditor:         (c, opts) => svc._renderRoleEditor(c, opts),
            renderRoleAssignments:    (c, opts) => svc._renderRoleAssignments(c, opts),
            renderPermissionMatrix:   (c, opts) => svc._renderPermissionMatrix(c, opts),
            renderUserSwitcher:       (c, opts) => svc._renderUserSwitcher(c, opts),
            renderMemberManager:      (c, opts) => svc._renderMemberManager(c, opts),
            renderContextAssignments: (c, opts) => svc._renderContextAssignments(c, opts),
            renderStats:              (c, opts) => svc._renderStats(c, opts),
            renderAbout:              (c, opts) => svc._renderAbout(c, opts),
            renderAccessOverview:     (c, opts) => svc._renderAccessOverview(c, opts),
            renderScopeMap:           (c, opts) => svc._renderScopeMap(c, opts),
            renderApiKeys:            (c, opts) => svc._renderApiKeys(c, opts),
            renderOAuthProviders:     (c, opts) => svc._renderOAuthProviders(c, opts),
            renderLinkedAccounts:     (c, opts) => svc._renderLinkedAccounts(c, opts),
            renderOAuthLogin:         (c, opts) => svc._renderOAuthLogin(c, opts),
            renderSessionManager:     (c, opts) => svc._renderSessionManager(c, opts),
            renderLoginHistory:       (c, opts) => svc._renderLoginHistory(c, opts),
            renderInvitations:        (c, opts) => svc._renderInvitations(c, opts),
            renderAccountControls:    (c, opts) => svc._renderAccountControls(c, opts),
            renderRequestAccess:      (c, opts) => svc._renderRequestAccess(c, opts),
            renderApprovalQueue:      (c, opts) => svc._renderApprovalQueue(c, opts)
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Authentication Helpers (backwards-compatible)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Set the current logged-in member (identity only, no permission resolution).
     * Kept for backwards compatibility — prefer login() for RBAC-aware sessions.
     * @param {number} memberId - Member idx
     * @returns {Publon|null}
     */
    setCurrentMember(memberId) {
        const member = this.table('member').read(memberId);
        this._currentMember = member;
        return member;
    }

    /**
     * Get the current logged-in member
     * @returns {Publon|null}
     */
    getCurrentMember() {
        return this._currentMember;
    }

    /**
     * Find member by username or email
     * @param {string} identifier - Username or email
     * @returns {Publon|null}
     */
    findMember(identifier) {
        const members = this.table('member');
        return members.all().find(m =>
            m.get('username') === identifier || m.get('email') === identifier
        ) || null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RBAC — System Binding
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Bind this service to a system's RBAC configuration.
     * Auto-generates data:table:crud permissions from ServiceRegistry,
     * merges custom view/action permissions, and creates role records.
     *
     * @param {Object} config - System RBAC configuration
     * @param {Object} [config.permissions] - Custom permissions { view: {}, action: {} }
     * @param {Object} [config.roles] - Role definitions { key: { label, level, permissions[] } }
     * @example
     * memberService.bindToSystem({
     *     permissions: {
     *         view: { admin: { label: 'Admin Tab' } },
     *         action: { export: { label: 'Export Data' } }
     *     },
     *     roles: {
     *         admin: { label: 'Administrator', level: 1, permissions: ['*'] },
     *         viewer: { label: 'Viewer', level: 6, permissions: ['data:*:read'] }
     *     }
     * });
     */
    bindToSystem(config = {}) {
        // 1. Auto-generate data permissions from all registered services
        this._permissionRegistry = { data: {}, view: {}, action: {} };

        if (typeof ServiceRegistry !== 'undefined') {
            const services = ServiceRegistry.list();
            for (const svc of services) {
                const tableList = svc.tables || [];
                for (const tableName of tableList) {
                    for (const op of ['create', 'read', 'update', 'delete']) {
                        const code = `data:${tableName}:${op}`;
                        this._permissionRegistry.data[code] = {
                            label: `${op} ${tableName}`,
                            description: `${op} records in ${tableName} (${svc.name} service)`,
                            service: svc.name,
                            table: tableName,
                            operation: op
                        };
                    }
                }
            }
        }

        // 2. Merge custom permissions from config (supports arbitrary categories)
        const custom = config.permissions || {};
        for (const [category, perms] of Object.entries(custom)) {
            if (!this._permissionRegistry[category]) {
                this._permissionRegistry[category] = {};
            }
            for (const [code, def] of Object.entries(perms)) {
                this._permissionRegistry[category][`${category}:${code}`] = def;
            }
        }

        // 3. Create/update memberRole records from config roles
        this._roleDefinitions = config.roles || {};
        const roleTable = this.table('memberRole');
        for (const [key, roleDef] of Object.entries(this._roleDefinitions)) {
            const existing = roleTable.all().find(r => r.get('name') === roleDef.label);
            if (existing) {
                existing.set('level', roleDef.level);
                existing.set('permissions', JSON.stringify(roleDef.permissions));
            } else {
                roleTable.create({
                    name: roleDef.label,
                    description: roleDef.description || '',
                    level: roleDef.level,
                    permissions: JSON.stringify(roleDef.permissions),
                    isSystem: true,
                    createdAt: new Date().toISOString()
                });
            }
        }

        this._systemBound = true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RBAC — Session Methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Login a member — sets current member, loads roles, resolves permissions, emits event.
     * @param {number} memberId - Member idx
     * @returns {Publon|null} The member record
     * @example
     * memberService.login(5);
     * console.log(memberService.isLoggedIn()); // true
     * console.log(memberService.getCurrentPermissions()); // ['*']
     */
    login(memberId) {
        const member = this.table('member').read(memberId);
        if (!member) return null;

        this._currentMember = member;
        member.set('lastLoginAt', new Date().toISOString());

        // Load roles via service
        const memberRoles = this.getMemberRoles(memberId);
        const configRoles = this._roleDefinitions;

        this._currentRoleKeys = [];
        this._currentPermissions = [];

        memberRoles.forEach(role => {
            const roleName = role.get('name');

            // Match config role by label
            const roleKey = Object.keys(configRoles).find(k => configRoles[k].label === roleName);
            if (roleKey) {
                this._currentRoleKeys.push(roleKey);
                const perms = configRoles[roleKey].permissions || [];
                perms.forEach(p => {
                    if (!this._currentPermissions.includes(p)) {
                        this._currentPermissions.push(p);
                    }
                });
            } else {
                // Fallback: parse permissions from role record's JSON field
                let perms = role.get('permissions');
                if (typeof perms === 'string') {
                    try { perms = JSON.parse(perms); } catch (e) { perms = []; }
                }
                if (Array.isArray(perms)) {
                    perms.forEach(p => {
                        if (!this._currentPermissions.includes(p)) {
                            this._currentPermissions.push(p);
                        }
                    });
                }
            }
        });

        // Load permission overrides
        const overrides = this.getMemberOverrides(memberId);
        this._currentOverrideGrants = overrides.grants.map(o => o.get('permission'));
        this._currentOverrideDenials = overrides.denials.map(o => o.get('permission'));

        // Persist session cookie
        this._persistSession(memberId);

        this._eventBus.emit('login', { memberId, member, permissions: this._currentPermissions });

        // Record login in audit log
        this.recordLoginAttempt({ memberId, method: 'direct', success: true });

        return member;
    }

    /**
     * Logout — clears current session and permissions, emits event.
     */
    logout() {
        const memberId = this._currentMember?.idx;
        this._clearSession();
        this._currentMember = null;
        this._currentPermissions = [];
        this._currentRoleKeys = [];
        this._currentOverrideGrants = [];
        this._currentOverrideDenials = [];
        this._eventBus.emit('logout', { memberId });
    }

    /**
     * Check if a member is currently logged in.
     * @returns {boolean}
     */
    isLoggedIn() {
        return this._currentMember !== null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cookie-Based Session Persistence
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Persist session to a cookie and memberSession table.
     * Called automatically by login().
     * @param {number} memberId
     * @private
     */
    _persistSession(memberId) {
        try {
            if (typeof document === 'undefined') return;
            const token = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2) + Date.now().toString(36);
            const now = new Date().toISOString();
            const expires = new Date(Date.now() + 86400000).toISOString(); // +24h

            this.table('memberSession').create({
                memberId,
                token,
                createdAt: now,
                expiresAt: expires,
                lastActivityAt: now
            });

            document.cookie = `bt_session=${token}; path=/; max-age=86400; SameSite=Strict`;
        } catch (e) {
            // Cookie persistence is best-effort
        }
    }

    /**
     * Clear session cookie and optionally the session record.
     * Called automatically by logout().
     * @private
     */
    _clearSession() {
        try {
            if (typeof document === 'undefined') return;
            document.cookie = 'bt_session=; path=/; max-age=0';
        } catch (e) {
            // Best-effort
        }
    }

    /**
     * Attempt to restore a session from a cookie on page load.
     * Looks up the bt_session cookie, finds the matching memberSession record,
     * and if valid (not expired), calls login() to re-establish the session.
     * @returns {Publon|null} The restored member, or null
     */
    tryRestoreSession() {
        try {
            if (typeof document === 'undefined') return null;
            const cookies = document.cookie.split(';');
            let token = null;
            for (const c of cookies) {
                const trimmed = c.trim();
                if (trimmed.startsWith('bt_session=')) {
                    token = trimmed.substring('bt_session='.length);
                    break;
                }
            }
            if (!token) return null;

            const sessions = this.table('memberSession').all();
            const session = sessions.find(s => s.get('token') === token);
            if (!session) return null;

            // Check expiry
            const expiresAt = session.get('expiresAt');
            if (expiresAt && new Date(expiresAt) < new Date()) {
                this._clearSession();
                return null;
            }

            const memberId = session.get('memberId');
            return this.login(memberId);
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the resolved permission strings for the current session.
     * @returns {string[]}
     */
    getCurrentPermissions() {
        return this._currentPermissions;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Session Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all active (non-expired) sessions, optionally filtered by member.
     * @param {number} [memberId] - Filter to a specific member
     * @returns {Publon[]}
     */
    getActiveSessions(memberId) {
        const now = new Date().toISOString();
        return this.table('memberSession').all().filter(s => {
            const exp = s.get('expiresAt');
            if (exp && exp < now) return false;
            if (memberId && s.get('memberId') !== memberId) return false;
            return true;
        });
    }

    /**
     * Revoke a specific session by idx.
     * @param {number} sessionIdx
     */
    revokeSession(sessionIdx) {
        const session = this.table('memberSession').read(sessionIdx);
        if (!session) return;
        this.table('memberSession').update(sessionIdx, {
            expiresAt: new Date(0).toISOString()
        });
        this._eventBus.emit('session:revoked', {
            sessionIdx,
            memberId: session.get('memberId'),
            revokedBy: this._currentMember?.idx
        });
    }

    /**
     * Revoke all sessions for a member (force logout everywhere).
     * @param {number} memberId
     * @returns {number} Count of revoked sessions
     */
    revokeAllSessions(memberId) {
        const sessions = this.getActiveSessions(memberId);
        const expired = new Date(0).toISOString();
        sessions.forEach(s => {
            this.table('memberSession').update(s.idx, { expiresAt: expired });
        });
        this._eventBus.emit('session:revokedAll', {
            memberId,
            count: sessions.length,
            revokedBy: this._currentMember?.idx
        });
        return sessions.length;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RBAC — Permission Checking
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Wildcard-aware permission check against the current user's permissions.
     * Supports: "*" (superadmin), "data:*", "data:specimen:*", "data:*:read"
     *
     * @param {string} permission - Permission string to check (e.g. "data:specimen:read")
     * @returns {boolean}
     * @example
     * memberService.hasPermission('data:specimen:read'); // true if user has data:*, data:specimen:*, etc.
     */
    hasPermission(permission) {
        if (!permission) return true;
        // Priority: deny override > grant override > role-based
        if (MemberService.roleHasPermission(this._currentOverrideDenials, permission)) return false;
        if (MemberService.roleHasPermission(this._currentOverrideGrants, permission)) return true;
        return MemberService.roleHasPermission(this._currentPermissions, permission);
    }

    /**
     * Shorthand: check if user can view a named view.
     * @param {string} viewCode - View code (e.g. "admin", "dashboard")
     * @returns {boolean}
     */
    canView(viewCode) {
        return this.hasPermission(`view:${viewCode}`);
    }

    /**
     * Shorthand: check if user can perform a data operation on a table.
     * @param {string} table - Table name
     * @param {string} op - Operation: "create", "read", "update", "delete"
     * @returns {boolean}
     */
    canData(table, op) {
        return this.hasPermission(`data:${table}:${op}`);
    }

    /**
     * Shorthand: check if user can perform a named action.
     * @param {string} code - Action code (e.g. "register_sample")
     * @returns {boolean}
     */
    canAction(code) {
        return this.hasPermission(`action:${code}`);
    }

    /**
     * Check if a permission array grants a specific permission (wildcard-aware).
     * Static so it can be used for role introspection without a session.
     *
     * @param {string[]} perms - Array of granted permission strings
     * @param {string} permission - Permission to check
     * @returns {boolean}
     * @example
     * MemberService.roleHasPermission(['data:*'], 'data:specimen:read'); // true
     */
    static roleHasPermission(perms, permission) {
        if (!perms || !perms.length) return false;
        if (perms.includes('*')) return true;
        if (perms.includes(permission)) return true;

        // Normalize separators: support both ':' and '.' conventions
        const sep = /[.:]/;
        const parts = permission.split(sep);

        for (const perm of perms) {
            const permParts = perm.split(sep);

            // Match patterns like "data:*" against "data:specimen:read"
            // and "data:*:read" against "data:specimen:read"
            if (permParts.length <= parts.length) {
                let match = true;
                for (let i = 0; i < permParts.length; i++) {
                    if (permParts[i] !== '*' && permParts[i] !== parts[i]) {
                        match = false;
                        break;
                    }
                }
                // If granted pattern is shorter (e.g. "data:*"), last part must be "*"
                if (match && permParts.length < parts.length && permParts[permParts.length - 1] !== '*') {
                    match = false;
                }
                if (match) return true;
            }

            // Handle same-length wildcard patterns: "data:*:read" vs "data:specimen:read"
            if (permParts.length === parts.length) {
                let match = true;
                for (let i = 0; i < parts.length; i++) {
                    if (permParts[i] !== '*' && permParts[i] !== parts[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) return true;
            }
        }

        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RBAC — Role / Hierarchy Methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get the lowest (most powerful) role level of the current user.
     * Lower numbers = more authority.
     * @returns {number} Role level (99 if no roles)
     */
    getRoleLevel() {
        const configRoles = this._roleDefinitions;
        let lowest = 99;
        this._currentRoleKeys.forEach(key => {
            const role = configRoles[key];
            if (role && role.level < lowest) lowest = role.level;
        });
        return lowest;
    }

    /**
     * Is the current user at supervisor level (level <= 3)?
     * @returns {boolean}
     */
    isSupervisor() {
        return this.getRoleLevel() <= 3;
    }

    /**
     * Is the current user an admin (level <= 2)?
     * @returns {boolean}
     */
    isAdmin() {
        return this.getRoleLevel() <= 2;
    }

    /**
     * Get the human-readable label of the current user's highest role.
     * @returns {string}
     */
    getCurrentRoleLabel() {
        const configRoles = this._roleDefinitions;
        if (!this._currentRoleKeys.length) return 'No Role';
        let best = null;
        this._currentRoleKeys.forEach(key => {
            const role = configRoles[key];
            if (!best || (role && role.level < best.level)) {
                best = role;
            }
        });
        return best ? best.label : 'Unknown';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RBAC — Registry / Matrix Methods
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get the full permission registry: all auto-generated + custom permissions.
     * @returns {{ data: Object, view: Object, action: Object }}
     */
    getPermissionRegistry() {
        return this._permissionRegistry;
    }

    /**
     * Get permissions grouped by category for UI display.
     * @returns {Array<{ category: string, icon: string, permissions: Array<{ code: string, label: string }> }>}
     */
    getPermissionsByCategory() {
        const icons = { data: 'fa-database', view: 'fa-eye', action: 'fa-bolt' };
        return Object.entries(this._permissionRegistry).map(([cat, perms]) => ({
            category: cat,
            icon: icons[cat] || 'fa-circle',
            permissions: Object.entries(perms).map(([code, def]) => ({
                code,
                label: def.label || code
            }))
        }));
    }

    /**
     * Get roles x permissions grid for admin UI.
     * @returns {{ roles: Object, permissions: string[] }}
     */
    getPermissionMatrix() {
        const configRoles = this._roleDefinitions;
        const allPerms = [];

        // Collect all permission codes
        for (const perms of Object.values(this._permissionRegistry)) {
            for (const code of Object.keys(perms)) {
                allPerms.push(code);
            }
        }

        const matrix = {};
        Object.entries(configRoles).forEach(([roleKey, roleDef]) => {
            matrix[roleKey] = {
                label: roleDef.label,
                level: roleDef.level,
                permissions: {}
            };
            allPerms.forEach(perm => {
                matrix[roleKey].permissions[perm] = MemberService.roleHasPermission(
                    roleDef.permissions, perm
                );
            });
        });

        return { roles: matrix, permissions: allPerms };
    }

    /**
     * Get role definitions sorted by level (most powerful first).
     * @returns {Object}
     */
    getRoleDefinitions() {
        const sorted = Object.entries(this._roleDefinitions)
            .sort((a, b) => a[1].level - b[1].level);
        const result = {};
        sorted.forEach(([key, def]) => { result[key] = def; });
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Role Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get roles for a member
     * @param {number} memberId - Member idx
     * @returns {Array<Publon>} Role records
     */
    getMemberRoles(memberId) {
        const links = this.table('memberRoleLink').all()
            .filter(link => link.get('memberId') === memberId);

        return links.map(link => this.table('memberRole').read(link.get('roleId')))
            .filter(Boolean);
    }

    /**
     * Check if member has a specific role
     * @param {number} memberId - Member idx
     * @param {string} roleName - Role name
     * @returns {boolean}
     */
    hasRole(memberId, roleName) {
        const roles = this.getMemberRoles(memberId);
        return roles.some(r => r.get('name') === roleName);
    }

    /**
     * Assign a role to a member
     * @param {number} memberId - Member idx
     * @param {number} roleId - Role idx
     * @param {number} [grantedBy] - Who granted the role
     */
    assignRole(memberId, roleId, grantedBy = null) {
        const existing = this.table('memberRoleLink').all().find(link =>
            link.get('memberId') === memberId && link.get('roleId') === roleId
        );

        if (existing) return existing;

        const link = this.table('memberRoleLink').create({
            memberId,
            roleId,
            grantedBy: grantedBy || this._currentMember?.idx,
            grantedAt: new Date().toISOString()
        });
        const role = this.table('memberRole').read(roleId);
        this._eventBus.emit('rbac:roleAssigned', {
            memberId, roleId,
            roleName: role ? role.get('name') : null,
            grantedBy: grantedBy || this._currentMember?.idx
        });
        return link;
    }

    /**
     * Remove a role from a member
     * @param {number} memberId - Member idx
     * @param {number} roleId - Role idx
     */
    removeRole(memberId, roleId) {
        const link = this.table('memberRoleLink').all().find(l =>
            l.get('memberId') === memberId && l.get('roleId') === roleId
        );
        if (link) {
            this.table('memberRoleLink').delete(link.idx);
            const role = this.table('memberRole').read(roleId);
            this._eventBus.emit('rbac:roleRemoved', {
                memberId, roleId,
                roleName: role ? role.get('name') : null,
                removedBy: this._currentMember?.idx
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Profile Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get or create profile for a member
     * @param {number} memberId - Member idx
     * @returns {Publon}
     */
    getProfile(memberId) {
        const profiles = this.table('memberProfile');
        let profile = profiles.all().find(p => p.get('memberId') === memberId);

        if (!profile) {
            profile = profiles.create({ memberId });
        }

        return profile;
    }

    /**
     * Update member profile
     * @param {number} memberId - Member idx
     * @param {Object} data - Profile data to update
     * @returns {Publon}
     */
    updateProfile(memberId, data) {
        const profile = this.getProfile(memberId);
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'idx' && key !== 'memberId') {
                profile.set(key, value);
            }
        });
        profile.set('modifiedAt', new Date().toISOString());
        return profile;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Member Status Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Change a member's account status.
     * @param {number} memberId
     * @param {string} status - 'active' | 'inactive' | 'suspended' | 'pending'
     * @param {string} [reason] - Why the status changed
     * @returns {Publon|null}
     */
    setMemberStatus(memberId, status, reason) {
        const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
        if (!validStatuses.includes(status)) return null;

        const member = this.table('member').read(memberId);
        if (!member) return null;

        const previousStatus = member.get('status');
        member.set('status', status);
        member.set('modifiedAt', new Date().toISOString());

        // If suspending/deactivating, revoke all sessions
        if (status === 'suspended' || status === 'inactive') {
            this.revokeAllSessions(memberId);
        }

        this._eventBus.emit('member:statusChanged', {
            memberId, previousStatus, newStatus: status,
            reason: reason || null,
            changedBy: this._currentMember?.idx
        });

        return member;
    }

    /**
     * Get members filtered by status.
     * @param {string} status - 'active' | 'inactive' | 'suspended' | 'pending'
     * @returns {Publon[]}
     */
    getMembersByStatus(status) {
        return this.table('member').all().filter(m => m.get('status') === status);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Permission Override Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get active (non-expired) permission overrides for a member.
     * @param {number} memberId
     * @returns {{ grants: Array<Publon>, denials: Array<Publon> }}
     */
    getMemberOverrides(memberId) {
        const now = new Date().toISOString();
        const all = this.table('memberPermissionOverride').all()
            .filter(o => o.get('memberId') === memberId)
            .filter(o => {
                const exp = o.get('expiresAt');
                return !exp || exp > now;
            });
        return {
            grants: all.filter(o => o.get('type') === 'grant'),
            denials: all.filter(o => o.get('type') === 'deny')
        };
    }

    /**
     * Add or update a permission override for a member.
     * Self-protection: prevents denying yourself critical admin permissions.
     * @param {number} memberId
     * @param {string} permission - e.g. "data:specimen:delete"
     * @param {string} type - 'grant' or 'deny'
     * @param {Object} [options] - { reason, expiresAt }
     * @returns {Publon|null}
     */
    addPermissionOverride(memberId, permission, type, options = {}) {
        // Self-protection guard
        const protectedPerms = ['view:admin', 'action:manage_overrides', 'action:manage_members'];
        if (type === 'deny' && this._currentMember && this._currentMember.idx === memberId) {
            if (protectedPerms.includes(permission)) return null;
        }

        const table = this.table('memberPermissionOverride');
        // Upsert: remove existing override for same member+permission
        const existing = table.all().find(o =>
            o.get('memberId') === memberId && o.get('permission') === permission
        );
        if (existing) table.delete(existing.idx);

        const record = table.create({
            memberId,
            permission,
            type,
            reason: options.reason || '',
            grantedBy: this._currentMember?.idx || null,
            grantedAt: new Date().toISOString(),
            expiresAt: options.expiresAt || null
        });
        this._eventBus.emit('rbac:overrideAdded', {
            memberId, permission, type,
            reason: options.reason || '',
            grantedBy: this._currentMember?.idx
        });
        return record;
    }

    /**
     * Remove a permission override by idx.
     * @param {number} overrideIdx
     */
    removePermissionOverride(overrideIdx) {
        const record = this.table('memberPermissionOverride').read(overrideIdx);
        if (record) {
            const data = record.getData ? record.getData() : record;
            this.table('memberPermissionOverride').delete(overrideIdx);
            this._eventBus.emit('rbac:overrideRemoved', {
                memberId: data.memberId,
                permission: data.permission,
                type: data.type,
                removedBy: this._currentMember?.idx
            });
        } else {
            this.table('memberPermissionOverride').delete(overrideIdx);
        }
    }

    /**
     * Get effective permissions for a member: all permission codes with source info.
     * @param {number} memberId
     * @returns {Array<{ permission: string, granted: boolean, source: string }>}
     */
    getEffectivePermissions(memberId) {
        // Collect all known permission codes
        const allPerms = [];
        for (const perms of Object.values(this._permissionRegistry)) {
            for (const code of Object.keys(perms)) {
                allPerms.push(code);
            }
        }

        // Resolve role permissions for this member
        const memberRoles = this.getMemberRoles(memberId);
        const configRoles = this._roleDefinitions;
        const rolePerms = [];
        memberRoles.forEach(role => {
            const roleName = role.get('name');
            const roleKey = Object.keys(configRoles).find(k => configRoles[k].label === roleName);
            if (roleKey) {
                (configRoles[roleKey].permissions || []).forEach(p => {
                    if (!rolePerms.includes(p)) rolePerms.push(p);
                });
            } else {
                let perms = role.get('permissions');
                if (typeof perms === 'string') {
                    try { perms = JSON.parse(perms); } catch (e) { perms = []; }
                }
                if (Array.isArray(perms)) {
                    perms.forEach(p => { if (!rolePerms.includes(p)) rolePerms.push(p); });
                }
            }
        });

        // Get overrides
        const overrides = this.getMemberOverrides(memberId);
        const grantPerms = overrides.grants.map(o => o.get('permission'));
        const denyPerms = overrides.denials.map(o => o.get('permission'));

        return allPerms.map(perm => {
            if (MemberService.roleHasPermission(denyPerms, perm)) {
                return { permission: perm, granted: false, source: 'denied' };
            }
            if (MemberService.roleHasPermission(grantPerms, perm)) {
                return { permission: perm, granted: true, source: 'granted' };
            }
            if (MemberService.roleHasPermission(rolePerms, perm)) {
                return { permission: perm, granted: true, source: 'role' };
            }
            return { permission: perm, granted: false, source: 'none' };
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group-Context Scoping
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Bind a GroupService instance for context-scoped access control.
     *
     * Context scoping extends binary permissions (has/doesn't have) with
     * dimensional constraints: "this user can access ClassView, but ONLY
     * for course codes COMP101 and MATH201."
     *
     * Groups act as scope containers. Each group has a `type` (e.g. 'course',
     * 'programme') and a `code` (e.g. 'COMP101', 'BSc-CS'). Members are added
     * to the groups they can access, with a role (owner/admin/member/viewer)
     * that determines access depth.
     *
     * Scope rules map your system's permission groups to GroupService group types:
     *
     * - { groupType: 'course' }        → scoped by group membership (type='course')
     * - { identifierKey: 'studentNo' } → self-scoped via memberProfile.metadata
     * - { unrestricted: true }          → no scope restriction (sees all data)
     * - { inherited: true }             → inherits scope from a related rule
     *
     * @param {GroupService} groupService - A bound GroupService instance
     * @param {Object} scopeRules - Map of scope keys to rule objects
     * @param {string} [scopeRules[key].groupType] - GroupService group type to query
     * @param {string} [scopeRules[key].identifierKey] - Profile metadata key for self-scope
     * @param {boolean} [scopeRules[key].unrestricted] - If true, no scope filtering
     * @param {boolean} [scopeRules[key].inherited] - If true, inherits from related scope
     * @param {string} [scopeRules[key].inheritFrom] - Scope key to inherit from (with inherited:true)
     *
     * @example
     * memberService.bindGroupContext(groupService, {
     *     classroom:  { groupType: 'course' },
     *     programme:  { groupType: 'programme' },
     *     student:    { identifierKey: 'studentNumber' },
     *     executive:  { unrestricted: true },
     *     tools:      { inherited: true, inheritFrom: 'classroom' }
     * });
     */
    bindGroupContext(groupService, scopeRules = {}) {
        this._groupService = groupService;
        this._scopeRules = scopeRules;
        this._contextBound = true;
    }

    /**
     * Whether group-context binding has been configured.
     * @returns {boolean}
     */
    isContextBound() {
        return this._contextBound;
    }

    /**
     * Get the bound GroupService instance.
     * @returns {GroupService|null}
     */
    getGroupService() {
        return this._groupService;
    }

    /**
     * Get the configured scope rules.
     * @returns {Object}
     */
    getScopeRules() {
        return { ...this._scopeRules };
    }

    /**
     * Get the allowed scope for a member within a given scope key.
     *
     * Returns an object describing what the member can access:
     * - type: 'scoped' | 'self' | 'unrestricted' | 'inherited' | 'none'
     * - codes: string[] of allowed codes (null if unrestricted)
     * - identifier: string for self-scoped (e.g. student number)
     * - unrestricted: boolean
     * - groupRole: best group-membership role (owner > admin > moderator > member > viewer)
     *
     * @param {number} memberId - Member idx
     * @param {string} scopeKey - Scope key from scopeRules (e.g. 'classroom', 'programme')
     * @returns {{ type: string, codes: string[]|null, identifier: string|null, unrestricted: boolean, groupRole: string|null }}
     *
     * @example
     * const scope = memberService.getMemberScope(5, 'classroom');
     * // → { type:'scoped', codes:['COMP101','MATH201'], identifier:null, unrestricted:false, groupRole:'admin' }
     *
     * const studentScope = memberService.getMemberScope(12, 'student');
     * // → { type:'self', codes:['220012345'], identifier:'220012345', unrestricted:false, groupRole:'viewer' }
     */
    getMemberScope(memberId, scopeKey) {
        const rule = this._scopeRules[scopeKey];
        if (!rule) {
            return { type: 'unknown', codes: null, identifier: null, unrestricted: false, groupRole: null };
        }

        // Unrestricted: member sees all data
        if (rule.unrestricted) {
            return { type: 'unrestricted', codes: null, identifier: null, unrestricted: true, groupRole: null };
        }

        // Self-scoped: member sees only their own data via profile metadata
        if (rule.identifierKey) {
            const profile = this.getProfile(memberId);
            let meta = profile.get('metadata');
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            if (!meta || typeof meta !== 'object') meta = {};
            const id = meta[rule.identifierKey] || null;
            return { type: 'self', codes: id ? [String(id)] : [], identifier: id, unrestricted: false, groupRole: 'viewer' };
        }

        // Inherited: resolve from another scope rule
        if (rule.inherited) {
            const from = rule.inheritFrom;
            if (from && this._scopeRules[from]) {
                return this.getMemberScope(memberId, from);
            }
            // No inheritFrom specified: collect all scoped codes across all group-typed rules
            const allCodes = [];
            let bestRole = null;
            const roleOrder = ['owner', 'admin', 'moderator', 'member', 'viewer'];
            for (const [key, r] of Object.entries(this._scopeRules)) {
                if (r.groupType && this._groupService) {
                    const sub = this.getMemberScope(memberId, key);
                    if (sub.codes) allCodes.push(...sub.codes);
                    if (sub.groupRole && (!bestRole || roleOrder.indexOf(sub.groupRole) < roleOrder.indexOf(bestRole))) {
                        bestRole = sub.groupRole;
                    }
                }
            }
            return { type: 'inherited', codes: allCodes.length ? allCodes : null, identifier: null, unrestricted: allCodes.length === 0, groupRole: bestRole };
        }

        // Group-scoped: resolve from GroupService membership
        if (rule.groupType && this._groupService) {
            const groups = this._groupService.getMemberGroups(memberId);
            const matched = groups.filter(g => g.group && g.group.get('type') === rule.groupType);
            const codes = matched.map(g => g.group.get('code')).filter(Boolean);

            // Determine best role across matched groups
            const roleOrder = ['owner', 'admin', 'moderator', 'member', 'viewer'];
            let bestRole = null;
            matched.forEach(g => {
                const r = g.role;
                if (r && (!bestRole || roleOrder.indexOf(r) < roleOrder.indexOf(bestRole))) {
                    bestRole = r;
                }
            });

            return { type: 'scoped', codes, identifier: null, unrestricted: false, groupRole: bestRole };
        }

        return { type: 'none', codes: [], identifier: null, unrestricted: false, groupRole: null };
    }

    /**
     * Check if a member has access to a specific code within a scope.
     *
     * @param {number} memberId - Member idx
     * @param {string} scopeKey - Scope key (e.g. 'classroom')
     * @param {string} code - The specific code to check (e.g. 'COMP101')
     * @returns {boolean}
     *
     * @example
     * memberService.hasScopeAccess(5, 'classroom', 'COMP101'); // true
     * memberService.hasScopeAccess(5, 'classroom', 'PHYS301'); // false
     */
    hasScopeAccess(memberId, scopeKey, code) {
        const scope = this.getMemberScope(memberId, scopeKey);
        if (scope.unrestricted) return true;
        if (scope.type === 'self') return scope.identifier === code || scope.identifier === String(code);
        if (scope.codes) return scope.codes.includes(code);
        return false;
    }

    /**
     * Combined permission + scope check for the current logged-in session.
     *
     * Given a view code like 'classroom:risk' and an optional scope code like 'COMP101',
     * checks both:
     * 1. memberService.canView('classroom:risk') → binary permission
     * 2. memberService.hasScopeAccess(memberId, 'classroom', 'COMP101') → scope constraint
     *
     * If no scopeCode is provided, only the permission check is performed.
     *
     * @param {string} viewCode - View permission code (e.g. 'classroom:risk')
     * @param {string} [scopeCode] - Optional scope code (e.g. 'COMP101')
     * @returns {boolean}
     *
     * @example
     * memberService.canViewInScope('classroom:risk', 'COMP101'); // permission + scope
     * memberService.canViewInScope('classroom:risk');             // permission only
     */
    canViewInScope(viewCode, scopeCode) {
        if (!this.canView(viewCode)) return false;
        if (!scopeCode || !this._contextBound) return true;

        if (!this._currentMember) return false;
        const scopeKey = viewCode.split(':')[0]; // 'classroom' from 'classroom:risk'
        return this.hasScopeAccess(this._currentMember.idx, scopeKey, scopeCode);
    }

    /**
     * Get all groups of a given type that a member belongs to.
     * Convenience wrapper around GroupService.getMemberGroups() with type filter.
     *
     * @param {number} memberId - Member idx
     * @param {string} groupType - Group type (e.g. 'course', 'programme', 'department')
     * @returns {Array<{ group: Publon, role: string, code: string }>}
     *
     * @example
     * memberService.getScopeGroupsForMember(5, 'course');
     * // → [{ group: Publon, role: 'admin', code: 'COMP101' }, ...]
     */
    getScopeGroupsForMember(memberId, groupType) {
        if (!this._groupService) return [];
        const groups = this._groupService.getMemberGroups(memberId);
        return groups
            .filter(g => g.group && g.group.get('type') === groupType)
            .map(g => ({
                group: g.group,
                role: g.roleId || 'member',
                code: g.group.get('code')
            }));
    }

    /**
     * Get a summary of all scope assignments for a member across all scope rules.
     * Useful for admin UIs showing a member's full access profile.
     *
     * @param {number} memberId - Member idx
     * @returns {Object} Map of scopeKey → scope result
     *
     * @example
     * memberService.getMemberScopeSummary(5);
     * // → { classroom: { type:'scoped', codes:['COMP101'] }, student: { type:'self', ... }, ... }
     */
    getMemberScopeSummary(memberId) {
        const summary = {};
        for (const key of Object.keys(this._scopeRules)) {
            summary[key] = this.getMemberScope(memberId, key);
        }
        return summary;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Context Assignments
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render context/scope assignment UI for a member.
     * Shows all scope rules and their assigned groups, with add/remove controls.
     *
     * @param {HTMLElement} container - Target element
     * @param {Object} [options] - { memberId }
     */
    _renderContextAssignments(container, options = {}) {
        const svc = this;
        const memberId = options.memberId;
        container.innerHTML = '';

        if (!this._contextBound) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#6b7280;padding:1rem;">Context scoping requires bindGroupContext() to be called first.</div>';
            return;
        }

        if (!memberId) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#6b7280;padding:1rem;">No member selected.</div>';
            return;
        }

        const member = this.table('member').read(memberId);
        if (!member) return;

        const summary = this.getMemberScopeSummary(memberId);

        Object.entries(this._scopeRules).forEach(([scopeKey, rule]) => {
            const scope = summary[scopeKey];
            const section = document.createElement('div');
            section.style.cssText = 'margin-bottom:1rem;';
            container.appendChild(section);

            const header = document.createElement('div');
            header.style.cssText = 'font-size:0.8rem;font-weight:700;color:#1a237e;text-transform:uppercase;letter-spacing:0.03em;padding:0.4rem 0;border-bottom:1px solid #e5e7eb;margin-bottom:0.4rem;display:flex;align-items:center;justify-content:space-between;';
            const typeIcon = rule.unrestricted ? 'fa-globe' : rule.identifierKey ? 'fa-user' : rule.inherited ? 'fa-link' : 'fa-layer-group';
            header.innerHTML = `<span><i class="fas ${typeIcon}" style="margin-right:0.4rem;"></i>${scopeKey}</span>
                <span class="ui-badge ui-badge-${scope.unrestricted ? 'green' : scope.type === 'self' ? 'amber' : scope.codes && scope.codes.length ? 'primary' : 'secondary'}" style="font-size:0.55rem;">${scope.type}</span>`;
            section.appendChild(header);

            // Unrestricted — just show a note
            if (rule.unrestricted) {
                const note = document.createElement('div');
                note.style.cssText = 'font-size:0.7rem;color:#10b981;padding:0.25rem 0;';
                note.innerHTML = '<i class="fas fa-check-circle" style="margin-right:0.3rem;"></i>Unrestricted access — sees all data';
                section.appendChild(note);
                return;
            }

            // Self-scoped — show identifier + editor
            if (rule.identifierKey) {
                const profile = this.getProfile(memberId);
                let meta = profile.get('metadata');
                if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (e) { meta = {}; } }
                if (!meta || typeof meta !== 'object') meta = {};
                const currentVal = meta[rule.identifierKey] || '';

                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;';
                row.innerHTML = `
                    <span style="font-size:0.7rem;color:#4b5563;min-width:6rem;">${rule.identifierKey}:</span>
                    <input type="text" value="${currentVal}" placeholder="Enter ${rule.identifierKey}" style="flex:1;padding:0.25rem 0.4rem;border:1px solid #d1d5db;border-radius:4px;font-size:0.7rem;">
                    <div id="ctx-save-${scopeKey}"></div>
                `;
                section.appendChild(row);

                const input = row.querySelector('input');
                new uiButtonGroup({
                    parent: row.querySelector(`#ctx-save-${scopeKey}`),
                    buttons: [{
                        label: 'Save', color: 'primary', variant: 'outline', size: 'xs',
                        onClick: () => {
                            meta[rule.identifierKey] = input.value.trim();
                            svc.updateProfile(memberId, { metadata: JSON.stringify(meta) });
                            if (typeof uiToast !== 'undefined') {
                                new uiToast({ parent: document.body, message: `${rule.identifierKey} updated`, type: 'success', duration: 2000 });
                            }
                        }
                    }]
                });
                return;
            }

            // Inherited — show a note about what it inherits
            if (rule.inherited) {
                const from = rule.inheritFrom || 'all scoped rules';
                const note = document.createElement('div');
                note.style.cssText = 'font-size:0.7rem;color:#6b7280;padding:0.25rem 0;';
                note.innerHTML = `<i class="fas fa-link" style="margin-right:0.3rem;"></i>Inherits scope from: <strong>${from}</strong>`;
                section.appendChild(note);
                if (scope.codes && scope.codes.length) {
                    const codeList = document.createElement('div');
                    codeList.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.25rem;';
                    scope.codes.forEach(c => {
                        codeList.innerHTML += `<span style="background:#e8eaf6;color:#1a237e;font-size:0.6rem;padding:0.15rem 0.4rem;border-radius:3px;">${c}</span>`;
                    });
                    section.appendChild(codeList);
                }
                return;
            }

            // Group-scoped — show current assignments + add/remove
            if (rule.groupType && this._groupService) {
                const memberGroups = this.getScopeGroupsForMember(memberId, rule.groupType);
                const allGroups = this._groupService.getByType(rule.groupType);

                // Current assignments
                if (memberGroups.length === 0) {
                    const empty = document.createElement('div');
                    empty.style.cssText = 'font-size:0.7rem;color:#6b7280;padding:0.25rem 0;';
                    empty.textContent = 'No assignments';
                    section.appendChild(empty);
                } else {
                    memberGroups.forEach(mg => {
                        const row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.3rem 0.5rem;background:#f0fdf4;border-radius:4px;margin-bottom:0.25rem;';
                        row.innerHTML = `
                            <div>
                                <span style="font-size:0.7rem;font-weight:600;">${mg.code}</span>
                                <span style="font-size:0.6rem;color:#6b7280;margin-left:0.4rem;">${mg.group.get('name') || ''}</span>
                                <span style="background:#1a237e;color:white;font-size:0.5rem;padding:0.05rem 0.25rem;border-radius:3px;margin-left:0.3rem;">${mg.role}</span>
                            </div>
                            <div id="ctx-rm-${scopeKey}-${mg.group.idx}"></div>
                        `;
                        section.appendChild(row);

                        new uiButtonGroup({
                            parent: row.querySelector(`#ctx-rm-${scopeKey}-${mg.group.idx}`),
                            buttons: [{
                                label: 'Remove', color: 'danger', variant: 'ghost', size: 'xs',
                                onClick: () => {
                                    svc._groupService.removeMember(mg.group.idx, memberId);
                                    svc._renderContextAssignments(container, options);
                                }
                            }]
                        });
                    });
                }

                // Add new assignment
                const assignedIds = memberGroups.map(mg => mg.group.idx);

                if (options.groupPicker) {
                    // Modal picker path — scalable search + pagination
                    const addRow = document.createElement('div');
                    addRow.style.cssText = 'margin-top:0.35rem;';
                    section.appendChild(addRow);

                    new uiButtonGroup({
                        parent: addRow,
                        buttons: [{
                            label: `Assign ${rule.groupType}`, icon: '<i class="fas fa-plus"></i>', color: 'primary', variant: 'outline', size: 'xs',
                            onClick: () => {
                                options.groupPicker(rule.groupType, assignedIds, ({ groups, role }) => {
                                    groups.forEach(g => svc._groupService.addMember(g.idx, memberId, role));
                                    svc._renderContextAssignments(container, options);
                                });
                            }
                        }]
                    });
                } else {
                    // Fallback: plain <select> dropdown (backward-compatible)
                    const available = allGroups.filter(g => !assignedIds.includes(g.idx));

                    if (available.length > 0) {
                        const addRow = document.createElement('div');
                        addRow.style.cssText = 'display:flex;align-items:center;gap:0.4rem;margin-top:0.35rem;';
                        addRow.innerHTML = `
                            <select style="flex:1;padding:0.25rem 0.4rem;border:1px solid #d1d5db;border-radius:4px;font-size:0.7rem;">
                                ${available.map(g => `<option value="${g.idx}">${g.get('code') || g.get('name')}</option>`).join('')}
                            </select>
                            <select style="width:5rem;padding:0.25rem 0.3rem;border:1px solid #d1d5db;border-radius:4px;font-size:0.7rem;">
                                <option value="member">member</option>
                                <option value="admin">admin</option>
                                <option value="viewer">viewer</option>
                                <option value="owner">owner</option>
                            </select>
                            <div id="ctx-add-${scopeKey}"></div>
                        `;
                        section.appendChild(addRow);

                        const groupSelect = addRow.querySelectorAll('select')[0];
                        const roleSelect = addRow.querySelectorAll('select')[1];
                        new uiButtonGroup({
                            parent: addRow.querySelector(`#ctx-add-${scopeKey}`),
                            buttons: [{
                                label: 'Add', icon: '<i class="fas fa-plus"></i>', color: 'primary', variant: 'outline', size: 'xs',
                                onClick: () => {
                                    const gId = Number(groupSelect.value);
                                    const role = roleSelect.value;
                                    if (gId) {
                                        svc._groupService.addMember(gId, memberId, role);
                                        svc._renderContextAssignments(container, options);
                                    }
                                }
                            }]
                        });
                    }
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Stats (compact metrics + role distribution)
    // ─────────────────────────────────────────────────────────────────────────

    _renderStats(container, options = {}) {
        container.innerHTML = '';
        const svc = this;
        const members = svc.table('member').all();
        const roles = svc.table('memberRole').all();
        const groupService = options.groupService || svc._groupService;
        const groupCount = groupService ? groupService.table('group').all().length : 0;

        // ── Metric chips row ──
        const chipRow = document.createElement('div');
        chipRow.style.cssText = 'display:flex;gap:var(--ui-space-2);flex-wrap:wrap;margin-bottom:var(--ui-space-4);';
        container.appendChild(chipRow);

        const stats = [
            { label: 'Users',  value: members.length, icon: 'fas fa-users',       color: 'primary' },
            { label: 'Roles',  value: roles.length,   icon: 'fas fa-shield-alt',  color: 'secondary' },
            { label: 'Groups', value: groupCount,      icon: 'fas fa-layer-group', color: 'accent' },
            { label: 'Active', value: members.filter(m => m.get('status') === 'active').length, icon: 'fas fa-check-circle', color: 'primary' }
        ];

        stats.forEach(s => {
            const chip = document.createElement('div');
            container.appendChild(chip);
            new UIBinding(svc.table('member'), { publome: svc })
                .bindMetric(chip, { compute: () => s.value, label: s.label, icon: s.icon, color: s.color });
        });

        // ── Role Distribution ──
        if (members.length > 0) {
            const roleCounts = {};
            members.forEach(m => {
                const mRoles = svc.getMemberRoles(m.idx);
                const name = mRoles.length ? mRoles[0].get('name') : 'No role';
                roleCounts[name] = (roleCounts[name] || 0) + 1;
            });

            const distHeader = document.createElement('div');
            distHeader.style.cssText = 'font-size:var(--ui-text-xs);font-weight:var(--ui-font-semibold);text-transform:uppercase;letter-spacing:0.03em;color:var(--ui-gray-500);margin-top:var(--ui-space-3);padding-top:var(--ui-space-2);border-top:var(--ui-border-width) solid var(--ui-gray-200);';
            distHeader.textContent = 'Role Distribution';
            container.appendChild(distHeader);

            Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
                const pct = Math.round(count / members.length * 100);
                const row = document.createElement('div');
                row.style.cssText = 'padding:var(--ui-space-1) 0;';
                row.innerHTML = `
                    <div style="display:flex;justify-content:space-between;font-size:var(--ui-text-xs);color:var(--ui-gray-700);">
                        <span>${name}</span><span>${count} (${pct}%)</span>
                    </div>
                    <div style="height:4px;background:var(--ui-gray-200);margin-top:var(--ui-space-1);border-radius:var(--ui-radius-sm);">
                        <div style="width:${pct}%;height:100%;background:var(--ui-primary);border-radius:var(--ui-radius-sm);"></div>
                    </div>
                `;
                container.appendChild(row);
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — About / Architecture Documentation
    // ─────────────────────────────────────────────────────────────────────────

    _renderAbout(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        // Compute stats
        const memberTableCount = this.getTableNames().length;
        const groupTableCount = this._contextBound && this._groupService ? this._groupService.getTableNames().length : 0;
        const totalTableCount = memberTableCount + groupTableCount;
        const viewCount = Object.keys(this.views).length;
        const permCount = Object.values(this._permissionRegistry).reduce((sum, cat) => sum + Object.keys(cat).length, 0);

        // ── Stats chips ──
        const statsRow = document.createElement('div');
        statsRow.style.cssText = 'display:flex;gap:var(--ui-space-2);flex-wrap:wrap;margin-bottom:var(--ui-space-4);';
        container.appendChild(statsRow);

        const tableDetail = this._contextBound ? `${memberTableCount} identity + ${groupTableCount} context` : `${memberTableCount} identity`;
        [
            { label: 'Tables', value: totalTableCount, icon: 'fa-database', color: 'var(--ui-primary)', detail: tableDetail },
            { label: 'Views', value: viewCount, icon: 'fa-eye', color: 'var(--ui-secondary)', detail: 'Render methods' },
            { label: 'Permissions', value: permCount, icon: 'fa-key', color: 'var(--ui-accent-600)', detail: 'Registered codes' }
        ].forEach(s => {
            const chip = document.createElement('span');
            chip.className = 'ui-metric-chip';
            chip.innerHTML = `<i class="fas ${s.icon}" style="color:${s.color};margin-right:0.25rem;"></i>${s.label}: <strong>${s.value}</strong> <span style="color:var(--ui-gray-400);">(${s.detail})</span>`;
            statsRow.appendChild(chip);
        });

        // ── Summary alert ──
        new uiAlert({
            parent: container,
            type: 'info',
            message: 'MemberService provides a 2-layer security model: global RBAC (identity + wildcard permissions + overrides) and context management (group ownership + object-level permissions via GroupService).'
        });

        // ── Architecture accordion ──
        const accordionDiv = document.createElement('div');
        accordionDiv.style.cssText = 'margin-top:var(--ui-space-4);';
        container.appendChild(accordionDiv);

        // Build layer 1 content
        const layer1Tables = ['member', 'memberProfile', 'memberSession'];
        let layer1Html = '<div style="font-size:0.8rem;color:#374151;line-height:1.6;">';
        layer1Html += '<p style="margin:0 0 0.5rem;">Core identity tables manage who users are and their active sessions.</p>';
        layer1Html += '<table style="width:100%;font-size:0.75rem;border-collapse:collapse;">';
        layer1Html += '<tr style="background:#f0f4ff;"><th style="text-align:left;padding:0.3rem 0.5rem;border-bottom:1px solid #e5e7eb;">Table</th><th style="text-align:left;padding:0.3rem 0.5rem;border-bottom:1px solid #e5e7eb;">Columns</th><th style="text-align:left;padding:0.3rem 0.5rem;border-bottom:1px solid #e5e7eb;">Purpose</th></tr>';
        const purposes = { member: 'User accounts', memberProfile: 'Extended profile + metadata', memberSession: 'Active login sessions' };
        layer1Tables.forEach(tName => {
            const t = svc.table(tName);
            const colCount = t.schema?.columns ? t.schema.columns.length : '—';
            layer1Html += `<tr><td style="padding:0.3rem 0.5rem;border-bottom:1px solid #f3f4f6;font-weight:500;color:#1e40af;">${tName}</td><td style="padding:0.3rem 0.5rem;border-bottom:1px solid #f3f4f6;">${colCount}</td><td style="padding:0.3rem 0.5rem;border-bottom:1px solid #f3f4f6;color:#6b7280;">${purposes[tName] || ''}</td></tr>`;
        });
        layer1Html += '</table></div>';

        // Build layer 2 content
        const layer2Tables = ['memberRole', 'memberRoleLink', 'memberPermissionOverride'];
        let layer2Html = '<div style="font-size:0.8rem;color:#374151;line-height:1.6;">';
        layer2Html += '<p style="margin:0 0 0.5rem;">Global RBAC provides binary access control with wildcard patterns and a deny &gt; grant &gt; role priority chain.</p>';
        layer2Html += '<table style="width:100%;font-size:0.75rem;border-collapse:collapse;">';
        layer2Html += '<tr style="background:#fef3c7;"><th style="text-align:left;padding:0.3rem 0.5rem;border-bottom:1px solid #e5e7eb;">Table</th><th style="text-align:left;padding:0.3rem 0.5rem;border-bottom:1px solid #e5e7eb;">Columns</th><th style="text-align:left;padding:0.3rem 0.5rem;border-bottom:1px solid #e5e7eb;">Purpose</th></tr>';
        const purposes2 = { memberRole: 'Role definitions with permission arrays', memberRoleLink: 'Member-to-role M:N assignments', memberPermissionOverride: 'Per-member grant/deny overrides' };
        layer2Tables.forEach(tName => {
            const t = svc.table(tName);
            const colCount = t.schema?.columns ? t.schema.columns.length : '—';
            layer2Html += `<tr><td style="padding:0.3rem 0.5rem;border-bottom:1px solid #f3f4f6;font-weight:500;color:#92400e;">${tName}</td><td style="padding:0.3rem 0.5rem;border-bottom:1px solid #f3f4f6;">${colCount}</td><td style="padding:0.3rem 0.5rem;border-bottom:1px solid #f3f4f6;color:#6b7280;">${purposes2[tName] || ''}</td></tr>`;
        });
        layer2Html += '</table>';
        layer2Html += '<div style="margin-top:0.5rem;padding:0.5rem;background:#fffbeb;border-radius:4px;font-size:0.7rem;"><strong>Wildcard patterns:</strong> <code>*</code> (superadmin), <code>data:*</code> (all data), <code>data:*:read</code> (read any table), <code>data:specimen:*</code> (all ops on specimen)</div>';
        layer2Html += '</div>';

        // Build layer 3 content
        let layer3Html = '<div style="font-size:0.8rem;color:#374151;line-height:1.6;">';
        if (svc._contextBound && svc._groupService) {
            const gs = svc._groupService;
            const groupCount = gs.table('group').all().length;
            const objectCount = gs.table('groupObject').all().length;
            const membershipCount = gs.table('groupMember').all().length;
            const rules = svc.getScopeRules();
            const ruleKeys = Object.keys(rules);

            layer3Html += '<p style="margin:0 0 0.5rem;"><span class="ui-badge ui-badge-green" style="font-size:0.6rem;">ACTIVE</span> Context management is bound via GroupService.</p>';
            layer3Html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:0.75rem;">`;
            layer3Html += `<div style="text-align:center;padding:0.5rem;background:#f0fdf4;border-radius:4px;"><div style="font-size:1.2rem;font-weight:700;color:#16a34a;">${groupCount}</div><div style="font-size:0.65rem;color:#6b7280;">Groups</div></div>`;
            layer3Html += `<div style="text-align:center;padding:0.5rem;background:#f0fdf4;border-radius:4px;"><div style="font-size:1.2rem;font-weight:700;color:#16a34a;">${objectCount}</div><div style="font-size:0.65rem;color:#6b7280;">Objects</div></div>`;
            layer3Html += `<div style="text-align:center;padding:0.5rem;background:#f0fdf4;border-radius:4px;"><div style="font-size:1.2rem;font-weight:700;color:#16a34a;">${membershipCount}</div><div style="font-size:0.65rem;color:#6b7280;">Memberships</div></div>`;
            layer3Html += '</div>';

            // Scope rules
            layer3Html += '<div style="font-size:0.75rem;font-weight:600;margin-bottom:0.3rem;">Scope Rules</div>';
            layer3Html += '<table style="width:100%;font-size:0.7rem;border-collapse:collapse;">';
            layer3Html += '<tr style="background:#ecfdf5;"><th style="text-align:left;padding:0.25rem 0.4rem;">Key</th><th style="text-align:left;padding:0.25rem 0.4rem;">Type</th><th style="text-align:left;padding:0.25rem 0.4rem;">Config</th></tr>';
            ruleKeys.forEach(k => {
                const r = rules[k];
                const rType = r.unrestricted ? 'unrestricted' : r.identifierKey ? 'self' : r.inherited ? 'inherited' : r.groupType ? 'scoped' : 'unknown';
                const config = r.groupType ? `groupType: ${r.groupType}` : r.identifierKey ? `key: ${r.identifierKey}` : r.inherited ? (r.inheritFrom ? `from: ${r.inheritFrom}` : 'all scoped') : '—';
                layer3Html += `<tr><td style="padding:0.25rem 0.4rem;border-bottom:1px solid #f3f4f6;font-weight:500;">${k}</td><td style="padding:0.25rem 0.4rem;border-bottom:1px solid #f3f4f6;"><span class="ui-badge ui-badge-${rType === 'scoped' ? 'primary' : rType === 'self' ? 'amber' : rType === 'unrestricted' ? 'green' : 'secondary'}" style="font-size:0.55rem;">${rType}</span></td><td style="padding:0.25rem 0.4rem;border-bottom:1px solid #f3f4f6;color:#6b7280;">${config}</td></tr>`;
            });
            layer3Html += '</table>';

            // Permission model
            layer3Html += '<div style="margin-top:0.75rem;padding:0.5rem;background:#f0f4ff;border-radius:4px;font-size:0.7rem;">';
            layer3Html += '<strong>Permission Model:</strong> effective = min(role-ceiling, object-permission)<br>';
            layer3Html += '<span style="color:#6b7280;">Owner(100)&rarr;admin, Admin(80)&rarr;manage, Member(40)&rarr;edit, Viewer(10)&rarr;view</span>';
            layer3Html += '</div>';
        } else {
            layer3Html += '<p style="margin:0 0 0.5rem;"><span class="ui-badge ui-badge-secondary" style="font-size:0.6rem;">NOT BOUND</span> Context management is not active.</p>';
            layer3Html += '<div style="padding:0.5rem;background:#f9fafb;border-radius:4px;font-size:0.7rem;color:#6b7280;">';
            layer3Html += 'To enable, load GroupService and call:<br><code style="background:#e5e7eb;padding:0.1rem 0.3rem;border-radius:3px;">memberService.bindGroupContext(groupService, scopeRules)</code>';
            layer3Html += '</div>';
        }
        layer3Html += '</div>';

        new uiAccordion({
            parent: accordionDiv,
            exclusive: false,
            content: {
                identity: { label: 'Layer 1: Identity', content: layer1Html },
                rbac:     { label: 'Layer 2: Global RBAC', content: layer2Html },
                context:  { label: 'Layer 3: Context Management', content: layer3Html, open: true }
            }
        });

        // ── Resolution chain stepper ──
        const stepperLabel = document.createElement('div');
        stepperLabel.style.cssText = 'font-size:var(--ui-text-sm);font-weight:var(--ui-font-semibold);color:var(--ui-gray-800);margin:var(--ui-space-5) 0 var(--ui-space-2);';
        stepperLabel.innerHTML = '<i class="fas fa-route" style="margin-right:0.4rem;color:var(--ui-secondary);"></i>Resolution Chain';
        container.appendChild(stepperLabel);

        const stepperDiv = document.createElement('div');
        container.appendChild(stepperDiv);

        new uiStepper({
            parent: stepperDiv,
            template: 'vertical',
            showDescriptions: true,
            clickable: false,
            currentStep: svc._contextBound ? 6 : 4,
            steps: [
                { label: 'Identity Check', description: 'isLoggedIn() — verify active session exists' },
                { label: 'Global Permission', description: 'hasPermission() — deny overrides > grant overrides > role-based wildcards' },
                { label: 'Scope Resolution', description: 'getMemberScope() — scoped / self / unrestricted / inherited' },
                { label: 'Object Access', description: 'canAccess() — group membership + object ownership via GroupService' },
                { label: 'Effective Level', description: 'getEffectivePermission() = min(role-ceiling, object-permission)' }
            ]
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Access Overview (per-permission access with scope annotations)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render an access overview for the current (or specified) member.
     * Groups all registered view permissions by their second segment,
     * shows granted/denied status, and annotates each group with scope info.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options] - { memberId, groupLabels }
     */
    _renderAccessOverview(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const memberId = options.memberId || (svc._currentMember ? svc._currentMember.idx : null);
        if (!memberId) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#6b7280;padding:1rem;">No member selected.</div>';
            return;
        }
        const member = svc.table('member').read(memberId);
        if (!member) return;

        // Build groups from the view permission registry
        const viewPerms = this._permissionRegistry.view || {};
        const groups = {};
        Object.entries(viewPerms).forEach(([code, def]) => {
            // code format: "view:classroom:risk" — stored as key "classroom:risk" in registry
            const parts = code.split(':');
            const groupKey = parts[0]; // first segment is the group
            if (!groups[groupKey]) groups[groupKey] = [];
            const fullViewCode = code;
            const canAccess = svc.hasPermission('view:' + fullViewCode);
            groups[groupKey].push({ code: fullViewCode, label: def.label || code, canAccess });
        });

        const groupLabels = options.groupLabels || {};

        Object.entries(groups).forEach(([group, perms]) => {
            const accessCount = perms.filter(p => p.canAccess).length;
            const section = document.createElement('div');
            section.style.cssText = 'margin-bottom:0.75rem;';

            const hdr = document.createElement('div');
            hdr.style.cssText = 'font-size:0.85rem;font-weight:700;color:#1e293b;margin:0 0 0.4rem;padding-bottom:0.3rem;border-bottom:1px solid #e5e7eb;';
            hdr.innerHTML = `${groupLabels[group] || group} <span style="font-weight:400;color:#6b7280;">(${accessCount}/${perms.length})</span>`;
            section.appendChild(hdr);

            // Scope info (if context-bound)
            if (svc._contextBound) {
                const scope = svc.getMemberScope(memberId, group);
                if (scope.type !== 'unknown') {
                    const scopeInfo = document.createElement('div');
                    scopeInfo.style.cssText = 'font-size:0.65rem;color:#6b7280;margin-bottom:0.35rem;';
                    if (scope.unrestricted) {
                        scopeInfo.innerHTML = '<i class="fas fa-globe" style="color:#10b981;margin-right:0.25rem;"></i>Unrestricted scope';
                    } else if (scope.type === 'self') {
                        scopeInfo.innerHTML = `<i class="fas fa-user" style="color:#f59e0b;margin-right:0.25rem;"></i>Self only: ${scope.identifier || 'not set'}`;
                    } else if (scope.type === 'scoped' && scope.codes) {
                        scopeInfo.innerHTML = `<i class="fas fa-layer-group" style="color:#1a237e;margin-right:0.25rem;"></i>Scoped: ${scope.codes.join(', ') || 'none'} <span style="background:#e8eaf6;color:#1a237e;padding:0.05rem 0.25rem;font-size:0.55rem;border-radius:3px;">${scope.groupRole || ''}</span>`;
                    } else if (scope.type === 'inherited') {
                        scopeInfo.innerHTML = `<i class="fas fa-link" style="color:#6b7280;margin-right:0.25rem;"></i>Inherited ${scope.codes ? '(' + scope.codes.join(', ') + ')' : ''}`;
                    }
                    section.appendChild(scopeInfo);
                }
            }

            // Permission chips
            const grid = document.createElement('div');
            grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.25rem;';
            perms.forEach(p => {
                const chip = document.createElement('span');
                chip.style.cssText = p.canAccess
                    ? 'display:inline-flex;align-items:center;gap:0.2rem;font-size:0.55rem;padding:0.15rem 0.35rem;border-radius:3px;border:1px solid #bbf7d0;background:#f0fdf4;color:#065f46;'
                    : 'display:inline-flex;align-items:center;gap:0.2rem;font-size:0.55rem;padding:0.15rem 0.35rem;border-radius:3px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;opacity:0.6;';
                chip.innerHTML = `<i class="fas fa-${p.canAccess ? 'check' : 'lock'}" style="font-size:0.5rem;"></i>${p.label}`;
                grid.appendChild(chip);
            });
            section.appendChild(grid);

            container.appendChild(section);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Scope Map (scope rules visualization with group membership)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render a scope map showing all configured scope rules, their types,
     * and the groups/members within each. Requires bindGroupContext().
     * @param {HTMLElement} container - Target element
     * @param {Object} [options] - Reserved for future use
     */
    _renderScopeMap(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        if (!this._contextBound) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#6b7280;padding:1rem;">Context scoping requires bindGroupContext() to be called first.</div>';
            return;
        }

        const gs = this._groupService;

        Object.entries(this._scopeRules).forEach(([scopeKey, rule]) => {
            const section = document.createElement('div');
            section.style.cssText = 'margin-bottom:1rem;';

            const hdr = document.createElement('div');
            hdr.style.cssText = 'font-size:0.85rem;font-weight:700;color:#1e293b;margin:0 0 0.4rem;padding-bottom:0.3rem;border-bottom:1px solid #e5e7eb;';
            const typeLabel = rule.unrestricted ? 'unrestricted' : rule.identifierKey ? `self (${rule.identifierKey})` : rule.inherited ? `inherited${rule.inheritFrom ? ' from ' + rule.inheritFrom : ''}` : `group (${rule.groupType})`;
            hdr.innerHTML = `${scopeKey} <span style="font-weight:400;color:#6b7280;">&mdash; ${typeLabel}</span>`;
            section.appendChild(hdr);

            if (rule.groupType && gs) {
                const groups = gs.getByType(rule.groupType);
                if (groups.length === 0) {
                    section.innerHTML += '<div style="font-size:0.7rem;color:#6b7280;padding:0.25rem 0;">No groups of this type.</div>';
                } else {
                    const tableDiv = document.createElement('div');
                    tableDiv.style.cssText = 'overflow-x:auto;';
                    section.appendChild(tableDiv);

                    const tData = groups.map(g => {
                        const members = gs.getMembers(g.idx);
                        const memberNames = members.map(gm => {
                            const m = svc.table('member').read(gm.memberId);
                            const roleName = gm.roleId ? (gs.table('groupRole').read(gm.roleId)?.get('name') || gm.roleId) : 'member';
                            return m ? `${m.get('displayName') || m.get('username')} (${roleName})` : `#${gm.memberId}`;
                        });
                        return {
                            code: g.get('code') || g.get('name'),
                            name: g.get('name'),
                            memberCount: members.length,
                            members: memberNames.join(', ') || 'No members'
                        };
                    });

                    new uiTable({
                        parent: tableDiv,
                        columns: [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Name' },
                            { key: 'memberCount', label: 'Members' },
                            { key: 'members', label: 'Assigned Users' }
                        ],
                        data: tData,
                        paging: false,
                        searching: false,
                        ordering: true
                    });
                }
            } else if (rule.identifierKey) {
                const members = svc.table('member').all();
                const rows = [];
                members.forEach(m => {
                    const scope = svc.getMemberScope(m.idx, scopeKey);
                    if (scope.identifier) {
                        rows.push({
                            user: m.get('displayName') || m.get('username'),
                            identifier: scope.identifier,
                            type: scope.type
                        });
                    }
                });

                if (rows.length) {
                    const tbl = document.createElement('div');
                    section.appendChild(tbl);
                    new uiTable({
                        parent: tbl,
                        columns: [
                            { key: 'user', label: 'User' },
                            { key: 'identifier', label: rule.identifierKey },
                            { key: 'type', label: 'Scope Type' }
                        ],
                        data: rows,
                        paging: false,
                        searching: false
                    });
                } else {
                    section.innerHTML += '<div style="font-size:0.7rem;color:#6b7280;padding:0.25rem 0;">No self-scoped members.</div>';
                }
            } else if (rule.unrestricted) {
                const note = document.createElement('div');
                note.style.cssText = 'font-size:0.7rem;color:#10b981;padding:0.25rem 0;';
                note.innerHTML = '<i class="fas fa-check-circle" style="margin-right:0.3rem;"></i>All users with this group permission have unrestricted access.';
                section.appendChild(note);
            } else if (rule.inherited) {
                const note = document.createElement('div');
                note.style.cssText = 'font-size:0.7rem;color:#6b7280;padding:0.25rem 0;';
                note.innerHTML = `<i class="fas fa-link" style="margin-right:0.3rem;"></i>Scope is inherited from <strong>${rule.inheritFrom || 'all scoped rules'}</strong>.`;
                section.appendChild(note);
            }

            container.appendChild(section);
        });
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
     * @param {string} [config.apiEndpoint='/api/v1/member'] - Base endpoint path
     * @returns {Object} Map of table name → ApiBinding instance
     */
    connectApi(config = {}) {
        if (!config.apiUrl) throw new Error('apiUrl is required');
        const baseEndpoint = config.apiEndpoint || '/api/v1/member';
        const bindings = {};

        ['member', 'memberRole', 'memberRoleLink', 'memberSession', 'memberProfile', 'memberPermissionOverride', 'memberApiKey', 'memberWebhook', 'memberOAuthProvider', 'memberOAuthLink', 'memberOAuthToken', 'memberLoginLog', 'memberInvitation', 'memberAccessRequest'].forEach(tableName => {
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

    /**
     * Load default seed data
     */
    seedDefaults() {
        // Default roles (lower level = more authority, matching bindToSystem convention)
        const roles = this.table('memberRole');
        if (roles.all().length === 0) {
            roles.create({ name: 'admin', description: 'Full system access', level: 1, isSystem: true });
            roles.create({ name: 'manager', description: 'Manage users and content', level: 2 });
            roles.create({ name: 'user', description: 'Standard user access', level: 3 });
            roles.create({ name: 'guest', description: 'Read-only access', level: 4 });
        }

        // Default admin user
        const members = this.table('member');
        if (members.all().length === 0) {
            const admin = members.create({
                username: 'admin',
                email: 'admin@system.local',
                displayName: 'System Administrator',
                status: 'active',
                createdAt: new Date().toISOString()
            });

            // Assign admin role
            const adminRole = roles.all().find(r => r.get('name') === 'admin');
            if (adminRole) {
                this.assignRole(admin.idx, adminRole.idx);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Login / Session
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render login/logout UI into a container.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options] - { onLogin, onLogout }
     */
    _renderLogin(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'max-width:440px;';
        container.appendChild(wrapper);

        function render() {
            wrapper.innerHTML = '';

            if (svc.isLoggedIn()) {
                const member = svc.getCurrentMember();
                const roles = svc.getMemberRoles(member.idx);
                const roleNames = roles.map(r => r.get('name')).join(', ') || 'No role';
                const initials = (member.get('displayName') || member.get('username') || '?')
                    .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                const activeSessions = svc.getActiveSessions(member.idx).length;
                const linkedAccounts = svc.getExternalIdentities(member.idx).length;
                const pendingRequests = svc.getAccessRequests({ memberId: member.idx, status: 'pending' }).length;
                const lastLogin = member.get('lastLoginAt') ? new Date(member.get('lastLoginAt')).toLocaleString() : 'Just now';

                const card = document.createElement('div');
                card.className = 'ui-card';
                card.style.cssText = 'padding:var(--ui-space-5);';
                wrapper.appendChild(card);

                // Identity header
                card.innerHTML = `
                    <div style="display:flex;align-items:center;gap:var(--ui-space-4);margin-bottom:var(--ui-space-4);">
                        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--ui-primary),var(--ui-secondary));color:white;display:flex;align-items:center;justify-content:center;font-size:var(--ui-text-xl);font-weight:var(--ui-font-bold);">${initials}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:var(--ui-text-lg);font-weight:var(--ui-font-bold);">${member.get('displayName') || member.get('username')}</div>
                            <div style="font-size:var(--ui-text-sm);color:var(--ui-gray-500);">${member.get('email')}</div>
                            <div style="margin-top:var(--ui-space-1);display:flex;gap:var(--ui-space-2);align-items:center;flex-wrap:wrap;">
                                <span class="ui-badge ui-badge-primary" style="font-size:var(--ui-text-2xs);">${svc.getCurrentRoleLabel()}</span>
                                <span style="font-size:var(--ui-text-2xs);color:var(--ui-gray-400);">Level ${svc.getRoleLevel()}</span>
                                <span class="ui-badge" style="font-size:var(--ui-text-2xs);background:var(--ui-accent-100);color:var(--ui-accent-700);">${member.get('status')}</span>
                            </div>
                        </div>
                    </div>
                `;

                // Session & access summary chips
                const chipRow = document.createElement('div');
                chipRow.style.cssText = 'display:flex;gap:var(--ui-space-2);flex-wrap:wrap;margin-bottom:var(--ui-space-4);';
                [
                    { icon: 'fa-key', label: 'Roles', value: roleNames, color: 'var(--ui-primary)' },
                    { icon: 'fa-shield-halved', label: 'Permissions', value: svc.getCurrentPermissions().length, color: 'var(--ui-accent-600)' },
                    { icon: 'fa-plug', label: 'Sessions', value: activeSessions, color: 'var(--ui-secondary-600)' },
                    { icon: 'fa-link', label: 'Linked', value: linkedAccounts, color: 'var(--ui-primary)' }
                ].forEach(m => {
                    const chip = document.createElement('span');
                    chip.className = 'ui-metric-chip';
                    chip.innerHTML = `<i class="fas ${m.icon}" style="color:${m.color};margin-right:0.25rem;"></i>${m.label}: <strong>${m.value}</strong>`;
                    chipRow.appendChild(chip);
                });
                card.appendChild(chipRow);

                // Pending requests notification
                if (pendingRequests > 0) {
                    const notice = document.createElement('div');
                    notice.style.cssText = 'background:var(--ui-secondary-50);border:1px solid var(--ui-secondary-200);border-radius:var(--ui-radius-md);padding:var(--ui-space-2) var(--ui-space-3);margin-bottom:var(--ui-space-3);font-size:var(--ui-text-xs);color:var(--ui-secondary-700);display:flex;align-items:center;gap:var(--ui-space-2);';
                    notice.innerHTML = `<i class="fas fa-clock"></i>${pendingRequests} access request${pendingRequests > 1 ? 's' : ''} pending review`;
                    card.appendChild(notice);
                }

                // Last login info
                const meta = document.createElement('div');
                meta.style.cssText = 'font-size:var(--ui-text-xs);color:var(--ui-gray-400);margin-bottom:var(--ui-space-4);';
                meta.textContent = `Last login: ${lastLogin}`;
                card.appendChild(meta);

                // Action buttons
                const btnDiv = document.createElement('div');
                btnDiv.style.cssText = 'display:flex;gap:var(--ui-space-2);';
                card.appendChild(btnDiv);

                new uiButtonGroup({
                    parent: btnDiv,
                    buttons: [
                        { label: 'Logout', icon: '<i class="fas fa-sign-out-alt"></i>', color: 'danger', variant: 'outline',
                            onClick: () => { svc.logout(); render(); if (options.onLogout) options.onLogout(); } }
                    ]
                });
            } else {
                // ── Login form ──
                const card = document.createElement('div');
                card.className = 'ui-card';
                card.style.cssText = 'padding:var(--ui-space-5);';
                wrapper.appendChild(card);

                card.innerHTML = `
                    <div style="text-align:center;margin-bottom:var(--ui-space-4);">
                        <div style="width:64px;height:64px;margin:0 auto var(--ui-space-3);border-radius:50%;background:var(--ui-gray-100);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-user-lock" style="font-size:var(--ui-text-xl);color:var(--ui-gray-400);"></i>
                        </div>
                        <div style="font-size:var(--ui-text-lg);font-weight:var(--ui-font-bold);">Sign In</div>
                        <div style="font-size:var(--ui-text-sm);color:var(--ui-gray-400);">Select your account to continue</div>
                    </div>
                    <div id="member-login-form"></div>
                    <div id="member-login-btn" style="margin-top:var(--ui-space-3);"></div>
                    <div id="member-oauth-section"></div>
                `;

                const formEl = card.querySelector('#member-login-form');
                const members = svc.table('member').all().filter(m => m.get('status') === 'active');
                const selectOptions = members.map(m => ({
                    value: String(m.idx),
                    label: `${m.get('displayName') || m.get('username')} (${m.get('email')})`
                }));

                new uiForm({
                    parent: formEl,
                    fields: {
                        memberId: {
                            label: 'Account',
                            type: 'select',
                            options: selectOptions,
                            value: selectOptions.length ? selectOptions[0].value : ''
                        }
                    }
                });

                new uiButtonGroup({
                    parent: card.querySelector('#member-login-btn'),
                    buttons: [
                        { label: 'Sign In', icon: '<i class="fas fa-sign-in-alt"></i>', color: 'primary',
                            onClick: () => {
                                const select = formEl.querySelector('select');
                                const id = Number(select?.value);
                                if (id) {
                                    svc.login(id);
                                    render();
                                    if (options.onLogin) options.onLogin(id);
                                }
                            }
                        }
                    ]
                });

                // OAuth provider buttons
                svc._renderOAuthLogin(card.querySelector('#member-oauth-section'), options);
            }
        }

        render();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Profile
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render current member's profile with editor.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options]
     */
    _renderProfile(container, options = {}) {
        container.innerHTML = '';

        if (!this.isLoggedIn()) {
            container.innerHTML = '<div style="padding:var(--ui-space-4);color:var(--ui-gray-500);">Please log in to view your profile.</div>';
            return;
        }

        const member = this.getCurrentMember();
        const initials = (member.get('displayName') || member.get('username') || '?')
            .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
        const roles = this.getMemberRoles(member.idx);

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:var(--ui-space-5);margin-bottom:var(--ui-space-5);padding-bottom:var(--ui-space-5);border-bottom:var(--ui-border-width) solid var(--ui-gray-200);';
        header.innerHTML = `
            <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--ui-primary),var(--ui-secondary));color:white;display:flex;align-items:center;justify-content:center;font-size:var(--ui-text-2xl);font-weight:var(--ui-font-bold);">${initials}</div>
            <div style="flex:1;">
                <h2 style="margin:0 0 var(--ui-space-1);">${member.get('displayName') || member.get('username')}</h2>
                <div style="color:var(--ui-gray-600);">${member.get('email')}</div>
                <div style="margin-top:var(--ui-space-2);display:flex;gap:var(--ui-space-2);">
                    ${roles.map(r => `<span class="ui-badge ui-badge-primary">${r.get('name')}</span>`).join('')}
                </div>
            </div>
        `;
        container.appendChild(header);

        // Member info (read-only view)
        const viewDiv = document.createElement('div');
        viewDiv.style.marginBottom = 'var(--ui-space-5)';
        container.appendChild(viewDiv);

        const memberBinding = new UIBinding(this.table('member'), { publome: this });
        this.table('member').select(member.idx);
        memberBinding.bindView(viewDiv);

        // Profile editor
        const profileDiv = document.createElement('div');
        container.appendChild(profileDiv);
        const profileLabel = document.createElement('h3');
        profileLabel.style.cssText = 'margin:0 0 var(--ui-space-3);font-size:var(--ui-text-base);';
        profileLabel.textContent = 'Edit Profile';
        profileDiv.appendChild(profileLabel);

        const editorDiv = document.createElement('div');
        profileDiv.appendChild(editorDiv);

        const profileBinding = new UIBinding(this.table('memberProfile'), {
            publome: this,
            hiddenColumns: ['idx', 'memberId', 'metadata', 'primaryGroupId', 'modifiedAt']
        });
        const profile = this.getProfile(member.idx);
        this.table('memberProfile').select(profile.idx);
        profileBinding.bindEditor(editorDiv, { mode: 'inline' });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Directory
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render member directory with full CRUD.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options]
     */
    _renderDirectory(container, options = {}) {
        container.innerHTML = '';
        const binding = new UIBinding(this.table('member'), { publome: this });
        binding.bindSelectEditor(container, { editor: 'modal' });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Role Editor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render role editor with permission checklist.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options]
     */
    _renderRoleEditor(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        // Left: role list via bindSelectEditor
        const roleDiv = document.createElement('div');
        container.appendChild(roleDiv);

        const binding = new UIBinding(this.table('memberRole'), { publome: this });
        binding.bindSelectEditor(roleDiv, { editor: 'inline' });

        // Right: permission checklist for selected role
        const permDiv = document.createElement('div');
        permDiv.style.cssText = 'margin-top:1.5rem;';
        container.appendChild(permDiv);

        function renderPermChecklist(roleRecord) {
            permDiv.innerHTML = '';
            if (!roleRecord) {
                permDiv.innerHTML = '<div style="color:#6b7280;font-size:0.8rem;">Select a role to edit permissions</div>';
                return;
            }

            const title = document.createElement('h3');
            title.style.cssText = 'margin:0 0 0.75rem;font-size:1rem;';
            title.textContent = `Permissions for: ${roleRecord.get('name')}`;
            permDiv.appendChild(title);

            let currentPerms = roleRecord.get('permissions');
            if (typeof currentPerms === 'string') {
                try { currentPerms = JSON.parse(currentPerms); } catch (e) { currentPerms = []; }
            }
            if (!Array.isArray(currentPerms)) currentPerms = [];

            const categories = svc.getPermissionsByCategory();
            const accordionContent = {};
            categories.forEach(cat => {
                if (cat.permissions.length === 0) return;
                accordionContent[cat.category] = {
                    label: `<i class="fas ${cat.icon}" style="margin-right:0.4rem;"></i>${cat.category.toUpperCase()} (${cat.permissions.length})`
                };
            });

            const accordion = new uiAccordion({
                parent: permDiv,
                template: 'minimal',
                content: accordionContent,
                exclusive: false
            });

            categories.forEach(cat => {
                if (cat.permissions.length === 0) return;
                const sectionEl = accordion.el.querySelector(`.ui-accordion-item[data-key="${cat.category}"] .ui-accordion-content`);
                if (!sectionEl) return;
                sectionEl.innerHTML = '';

                cat.permissions.forEach(perm => {
                    const isChecked = MemberService.roleHasPermission(currentPerms, perm.code);
                    const row = document.createElement('label');
                    row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.2rem 0;font-size:0.75rem;cursor:pointer;';
                    row.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} data-perm="${perm.code}"> ${perm.label}`;
                    row.querySelector('input').onchange = (e) => {
                        if (e.target.checked) {
                            if (!currentPerms.includes(perm.code)) currentPerms.push(perm.code);
                        } else {
                            currentPerms = currentPerms.filter(p => p !== perm.code);
                        }
                        roleRecord.set('permissions', JSON.stringify(currentPerms));
                    };
                    sectionEl.appendChild(row);
                });
            });
        }

        // Listen for role selection
        this.table('memberRole').on('selected', ({ record }) => {
            renderPermChecklist(record);
        });

        renderPermChecklist(null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Role Assignments
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render member-role link management via bindMnEditor.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options]
     */
    _renderRoleAssignments(container, options = {}) {
        container.innerHTML = '';
        const binding = new UIBinding(this.table('memberRoleLink'), { publome: this });
        binding.bindMnEditor(container);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Permission Matrix
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render read-only permission matrix (roles x permissions grid).
     * @param {HTMLElement} container - Target element
     * @param {Object} [options]
     */
    _renderPermissionMatrix(container, options = {}) {
        container.innerHTML = '';

        if (!this._systemBound) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#6b7280;padding:1rem;">Permission matrix requires bindToSystem() to be called first.</div>';
            return;
        }

        const { roles, permissions } = this.getPermissionMatrix();

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'overflow:auto;';
        container.appendChild(wrapper);

        const table = document.createElement('table');
        table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.65rem;';

        // Header row
        const thead = document.createElement('thead');
        const hRow = document.createElement('tr');
        hRow.innerHTML = '<th style="padding:0.3rem;text-align:left;border-bottom:2px solid #e5e7eb;color:#4b5563;position:sticky;left:0;background:white;min-width:160px;">Permission</th>';
        Object.entries(roles).forEach(([key, role]) => {
            hRow.innerHTML += `<th style="padding:0.3rem;text-align:center;border-bottom:2px solid #e5e7eb;color:#4b5563;white-space:nowrap;" title="Level ${role.level}">${role.label}</th>`;
        });
        thead.appendChild(hRow);
        table.appendChild(thead);

        // Group permissions by category
        const catColors = { data: '#3b82f6', view: '#10b981', action: '#f59e0b' };
        const categories = { data: [], view: [], action: [] };
        permissions.forEach(p => {
            const cat = p.split(':')[0];
            if (categories[cat]) categories[cat].push(p);
        });

        const tbody = document.createElement('tbody');
        Object.entries(categories).forEach(([cat, perms]) => {
            if (perms.length === 0) return;

            // Category header
            const catRow = document.createElement('tr');
            catRow.innerHTML = `<td colspan="${Object.keys(roles).length + 1}" style="padding:0.4rem;font-weight:700;color:${catColors[cat] || '#666'};background:#f8f9fa;text-transform:uppercase;font-size:0.6rem;letter-spacing:0.05em;">${cat}</td>`;
            tbody.appendChild(catRow);

            perms.forEach(perm => {
                const tr = document.createElement('tr');
                const label = perm.split(':').slice(1).join(':');
                tr.innerHTML = `<td style="padding:0.2rem 0.3rem;border-bottom:1px solid #f3f4f6;color:#4b5563;position:sticky;left:0;background:white;">${label}</td>`;
                Object.entries(roles).forEach(([key, role]) => {
                    const has = role.permissions[perm];
                    tr.innerHTML += `<td style="padding:0.2rem;text-align:center;border-bottom:1px solid #f3f4f6;">${has ? '<i class="fas fa-check" style="color:#10b981;"></i>' : '<span style="color:#e5e7eb;">&#8212;</span>'}</td>`;
                });
                tbody.appendChild(tr);
            });
        });
        table.appendChild(tbody);
        wrapper.appendChild(table);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — User Switcher
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render quick-switch dropdown for demo/testing.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options] - { onSwitch: (memberId) => {} }
     */
    _renderUserSwitcher(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'background:#f0f7ff;border-radius:8px;padding:0.75rem;';
        container.appendChild(wrapper);

        const title = document.createElement('div');
        title.style.cssText = 'font-size:0.75rem;font-weight:700;color:#1565C0;margin-bottom:0.5rem;';
        title.innerHTML = '<i class="fas fa-user-circle" style="margin-right:0.3rem;"></i>Switch User';
        wrapper.appendChild(title);

        const members = this.table('member').all();
        const memberRoleMap = {};
        members.forEach(m => {
            const mRoles = this.getMemberRoles(m.idx);
            memberRoleMap[m.idx] = mRoles.map(r => r.get('name')).join(', ') || 'No role';
        });

        const select = document.createElement('select');
        select.style.cssText = 'font-size:0.75rem;padding:0.3rem 0.5rem;border:1px solid #d1d5db;border-radius:4px;width:100%;';
        members.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.idx;
            opt.textContent = `${m.get('displayName') || m.get('username')} \u2014 ${memberRoleMap[m.idx]}`;
            if (svc._currentMember && svc._currentMember.idx === m.idx) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = () => {
            const id = Number(select.value);
            svc.login(id);
            renderInfo();
            if (options.onSwitch) options.onSwitch(id);
            if (typeof uiToast !== 'undefined') {
                new uiToast({
                    parent: document.body,
                    message: `Switched to ${svc.table('member').read(id)?.get('displayName') || 'user'}`,
                    type: 'info',
                    duration: 2000
                });
            }
        };
        wrapper.appendChild(select);

        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'font-size:0.65rem;color:#4b5563;margin-top:0.4rem;';
        wrapper.appendChild(infoDiv);

        function renderInfo() {
            if (svc.isLoggedIn()) {
                infoDiv.textContent = `Current: ${svc.getCurrentRoleLabel()} (Level ${svc.getRoleLevel()}) \u2014 ${svc.getCurrentPermissions().length} permissions`;
            } else {
                infoDiv.textContent = 'No user logged in';
            }
        }

        renderInfo();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Member Manager (comprehensive RBAC management)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render unified member management view with Profile, Roles, Overrides, Effective tabs.
     * Uses UIBinding throughout — bindSelector for member list, bindView/bindEditor for
     * profile, bindSelectEditor + bindChildTable for roles and overrides.
     * @param {HTMLElement} container - Target element
     * @param {Object} [options]
     */
    _renderMemberManager(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        // Main layout: member selector (left) + tabbed detail (right)
        const layout = document.createElement('div');
        layout.style.cssText = 'display:flex;gap:1rem;min-height:600px;height:calc(100vh - 200px);';
        container.appendChild(layout);

        // ── Left panel: member selector via UIBinding.bindSelector ──
        const leftPanel = document.createElement('div');
        leftPanel.style.cssText = 'width:280px;min-width:280px;display:flex;flex-direction:column;';
        layout.appendChild(leftPanel);

        const memberBinding = new UIBinding(svc.table('member'), { publome: svc });
        memberBinding.bindSelector(leftPanel);

        // ── Right panel: tabbed detail ──
        const rightPanel = document.createElement('div');
        rightPanel.style.cssText = 'flex:1;min-width:0;background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;display:flex;flex-direction:column;';
        layout.appendChild(rightPanel);

        // Tabs — uiTabs expects content as {key: {label, icon, content}}
        const tabsDiv = document.createElement('div');
        tabsDiv.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
        rightPanel.appendChild(tabsDiv);

        const tabContent = {
            profile:   { label: 'Profile',   icon: '<i class="fas fa-user"></i>',         content: '' },
            roles:     { label: 'Roles',     icon: '<i class="fas fa-shield-alt"></i>',   content: '' },
            overrides: { label: 'Overrides', icon: '<i class="fas fa-sliders-h"></i>',    content: '' },
            effective: { label: 'Effective', icon: '<i class="fas fa-check-double"></i>', content: '' }
        };
        if (svc._contextBound) {
            tabContent.context = { label: 'Context', icon: '<i class="fas fa-layer-group"></i>', content: '' };
        }

        const tabs = new uiTabs({ parent: tabsDiv, content: tabContent });

        // Make the tabs element fill its container and panels scroll
        tabs.el.style.cssText = 'display:flex;flex-direction:column;flex:1;overflow:hidden;';
        tabs.el.querySelectorAll('.ui-tabs-panel').forEach(p => {
            p.style.overflow = 'auto';
        });

        // Grab the rendered tab panel elements (use .ui-tabs-panel to avoid matching buttons)
        const panels = {
            profile:   tabs.el.querySelector('.ui-tabs-panel[data-tab="profile"]'),
            roles:     tabs.el.querySelector('.ui-tabs-panel[data-tab="roles"]'),
            overrides: tabs.el.querySelector('.ui-tabs-panel[data-tab="overrides"]'),
            effective: tabs.el.querySelector('.ui-tabs-panel[data-tab="effective"]')
        };
        if (svc._contextBound) {
            panels.context = tabs.el.querySelector('.ui-tabs-panel[data-tab="context"]');
        }

        // Make active panel fill available space
        Object.values(panels).forEach(p => {
            if (p) p.style.flex = '1';
        });

        // ── Profile tab — bindView (member) + bindEditor (memberProfile as child) ──
        const memberViewDiv = document.createElement('div');
        memberViewDiv.style.marginBottom = '1rem';
        panels.profile.appendChild(memberViewDiv);
        memberBinding.bindView(memberViewDiv, (data) => {
            const name = data.displayName || data.username || 'Unknown';
            const email = data.email || '';
            const status = data.status || 'unknown';
            const statusColor = status === 'active' ? '#10b981' : status === 'suspended' ? '#ef4444' : '#f59e0b';
            const login = data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : 'Never';
            return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <div style="width:40px;height:40px;border-radius:50%;background:#1565C0;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;">${name.charAt(0).toUpperCase()}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.9rem;color:#1e293b;">${name}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${email}</div>
                </div>
                <div style="text-align:right;">
                    <span style="background:${statusColor};color:white;font-size:0.6rem;padding:0.15rem 0.4rem;border-radius:3px;font-weight:600;text-transform:uppercase;">${status}</span>
                    <div style="font-size:0.65rem;color:#94a3b8;margin-top:0.25rem;">Last login: ${login}</div>
                </div>
            </div>`;
        });

        const profileLabel = document.createElement('h3');
        profileLabel.style.cssText = 'margin:0 0 0.75rem;font-size:0.9rem;color:#1565C0;';
        profileLabel.innerHTML = '<i class="fas fa-edit" style="margin-right:0.3rem;"></i>Profile Details';
        panels.profile.appendChild(profileLabel);

        const profileEditorDiv = document.createElement('div');
        panels.profile.appendChild(profileEditorDiv);
        const profileBinding = new UIBinding(svc.table('memberProfile'), { publome: svc });
        profileBinding.bindEditor(profileEditorDiv, { mode: 'inline' });
        memberBinding.bindChildTable(profileBinding, 'memberId');

        // Auto-select profile record when member changes
        svc.table('member').on('selected', ({ record }) => {
            if (!record) return;
            const profile = svc.getProfile(record.idx);
            svc.table('memberProfile').select(profile.idx);
        });

        // ── Roles tab — current roles + available roles ──
        svc._renderRolesTab(panels.roles, memberBinding);

        // ── Overrides tab — 2-level cascading selector + current overrides list ──
        svc._renderOverridesTab(panels.overrides, memberBinding);

        // ── Effective tab — read-only, only shows active permissions ──
        svc.table('member').on('selected', ({ record }) => {
            if (!record) return;
            this._renderEffectivePermissions(panels.effective, record.idx);
        });

        // ── Context tab (if context-bound) ──
        if (svc._contextBound) {
            svc.table('member').on('selected', ({ record }) => {
                if (!record) return;
                panels.context.innerHTML = '';
                svc._renderContextAssignments(panels.context, { memberId: record.idx, groupPicker: options.groupPicker });
            });
        }
    }

    /**
     * Render the Roles tab — shows current roles with remove, available roles with add.
     * Re-renders on member selection change.
     */
    _renderRolesTab(container, memberBinding) {
        const svc = this;
        memberBinding.bindToggleList(container, {
            parentTable: svc.table('member'),
            itemTable: svc.table('memberRole'),
            getAssigned: (memberId) => svc.getMemberRoles(memberId),
            onAssign: (memberId, roleId) => svc.assignRole(memberId, roleId),
            onRemove: (memberId, roleId) => svc.removeRole(memberId, roleId),
            assignedTitle: 'Current Roles',
            availableTitle: 'Available Roles',
            icon: 'fa-shield-alt',
            emptyText: 'No roles assigned',
            noParentText: 'Select a member'
        });
    }

    /**
     * Render the Overrides tab with 2-level cascading selector.
     * Level 1: permission category prefix (data, view, action)
     * Level 2: specific permissions within that category
     * Plus current overrides list with remove buttons.
     */
    _renderOverridesTab(container, memberBinding) {
        const svc = this;

        // Current overrides list (refreshes on member selection)
        const currentList = document.createElement('div');
        const addSection = document.createElement('div');
        addSection.style.cssText = 'border-top:1px solid #e5e7eb;padding-top:0.75rem;margin-top:0.75rem;';

        container.appendChild(currentList);
        container.appendChild(addSection);

        function refreshOverrides() {
            const sel = svc.table('member').getSelectedOne();
            if (!sel) { currentList.innerHTML = '<div style="color:#9ca3af;font-size:0.8rem;padding:0.5rem;">Select a member</div>'; return; }
            const overrides = svc.getMemberOverrides(sel.idx);
            const all = [...overrides.grants, ...overrides.denials];

            currentList.innerHTML = '';
            if (all.length === 0) {
                currentList.innerHTML = '<div style="color:#9ca3af;font-size:0.8rem;padding:0.5rem;">No overrides for this member</div>';
                return;
            }

            const title = document.createElement('div');
            title.style.cssText = 'font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:0.5rem;';
            title.textContent = 'Current Overrides';
            currentList.appendChild(title);

            all.forEach(o => {
                const row = document.createElement('div');
                const type = o.get('type');
                const perm = o.get('permission');
                const reason = o.get('reason');
                const isGrant = type === 'grant';
                row.style.cssText = `display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.5rem;margin-bottom:0.25rem;border-radius:4px;font-size:0.75rem;background:${isGrant ? '#f0fdf4' : '#fef2f2'};`;
                row.innerHTML = `
                    <span style="background:${isGrant ? '#10b981' : '#ef4444'};color:white;font-size:0.6rem;padding:0.1rem 0.35rem;border-radius:3px;font-weight:600;text-transform:uppercase;">${type}</span>
                    <span style="flex:1;color:#374151;" title="${reason || ''}">${perm}</span>
                `;
                const removeBtn = document.createElement('button');
                removeBtn.style.cssText = 'background:none;border:none;color:#9ca3af;cursor:pointer;font-size:0.7rem;padding:0.2rem;';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', () => {
                    svc.removePermissionOverride(o.idx);
                    refreshOverrides();
                    refreshEffective();
                });
                row.appendChild(removeBtn);
                currentList.appendChild(row);
            });
        }

        // Effective refresh helper (if effective tab is rendered)
        function refreshEffective() {
            const effPanel = container.closest('.ui-tabs')?.querySelector('.ui-tabs-panel[data-tab="effective"]');
            const sel = svc.table('member').getSelectedOne();
            if (effPanel && sel) svc._renderEffectivePermissions(effPanel, sel.idx);
        }

        // ── Add Override section: 2-level cascading selectors ──
        const addTitle = document.createElement('div');
        addTitle.style.cssText = 'font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:0.5rem;';
        addTitle.textContent = 'Add Override';
        addSection.appendChild(addTitle);

        const selectRow = document.createElement('div');
        selectRow.style.cssText = 'display:flex;gap:0.5rem;align-items:flex-end;';
        addSection.appendChild(selectRow);

        // Level 1: Category selector
        const cat1Wrap = document.createElement('div');
        cat1Wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.2rem;min-width:130px;';
        cat1Wrap.innerHTML = '<label style="font-size:0.65rem;color:#6b7280;font-weight:500;">Category</label>';
        const catSelect = document.createElement('select');
        catSelect.className = 'ui-input';
        catSelect.style.cssText = 'font-size:0.75rem;padding:0.3rem 0.5rem;';
        catSelect.innerHTML = '<option value="">—</option>';
        const categories = svc.getPermissionsByCategory();
        categories.forEach(cat => {
            if (cat.permissions.length === 0) return;
            catSelect.innerHTML += `<option value="${cat.category}">${cat.category.toUpperCase()} (${cat.permissions.length})</option>`;
        });
        cat1Wrap.appendChild(catSelect);
        selectRow.appendChild(cat1Wrap);

        // Level 2: Permission selector
        const cat2Wrap = document.createElement('div');
        cat2Wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.2rem;flex:1;min-width:180px;';
        cat2Wrap.innerHTML = '<label style="font-size:0.65rem;color:#6b7280;font-weight:500;">Permission</label>';
        const permSelect = document.createElement('select');
        permSelect.className = 'ui-input';
        permSelect.style.cssText = 'font-size:0.75rem;padding:0.3rem 0.5rem;';
        permSelect.innerHTML = '<option value="">— select category first —</option>';
        permSelect.disabled = true;
        cat2Wrap.appendChild(permSelect);
        selectRow.appendChild(cat2Wrap);

        // Cascade: when category changes, populate permission selector
        catSelect.addEventListener('change', () => {
            const catKey = catSelect.value;
            permSelect.innerHTML = '';
            if (!catKey) {
                permSelect.innerHTML = '<option value="">— select category first —</option>';
                permSelect.disabled = true;
                return;
            }
            const cat = categories.find(c => c.category === catKey);
            permSelect.innerHTML = '<option value="">— select —</option>';
            (cat?.permissions || []).forEach(p => {
                const shortLabel = p.code.split(':').slice(1).join(':');
                permSelect.innerHTML += `<option value="${p.code}">${shortLabel}</option>`;
            });
            permSelect.disabled = false;
        });

        // Grant / Deny buttons
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:0.3rem;flex-shrink:0;';

        const grantBtn = document.createElement('button');
        grantBtn.className = 'ui-btn ui-btn-sm';
        grantBtn.style.cssText = 'background:#10b981;color:white;border:none;font-size:0.7rem;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;';
        grantBtn.textContent = 'Grant';
        grantBtn.addEventListener('click', () => addOverride('grant'));

        const denyBtn = document.createElement('button');
        denyBtn.className = 'ui-btn ui-btn-sm';
        denyBtn.style.cssText = 'background:#ef4444;color:white;border:none;font-size:0.7rem;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;';
        denyBtn.textContent = 'Deny';
        denyBtn.addEventListener('click', () => addOverride('deny'));

        btnRow.appendChild(grantBtn);
        btnRow.appendChild(denyBtn);
        selectRow.appendChild(btnRow);

        function addOverride(type) {
            const sel = svc.table('member').getSelectedOne();
            const perm = permSelect.value;
            if (!sel || !perm) return;
            svc.addPermissionOverride(sel.idx, perm, type);
            refreshOverrides();
            refreshEffective();
            // Reset selectors
            permSelect.value = '';
        }

        // Refresh on member selection
        svc.table('member').on('selected', () => refreshOverrides());
        refreshOverrides();
    }

    /**
     * Render read-only effective permissions for a member.
     * Only shows permissions that are actually active (role, granted, denied) — omits 'none'.
     */
    _renderEffectivePermissions(container, memberId) {
        container.innerHTML = '';
        const effective = this.getEffectivePermissions(memberId);
        // Only show permissions that are active (not 'none')
        const active = effective.filter(e => e.source !== 'none');
        const categories = {};

        active.forEach(e => {
            const cat = e.permission.split(':')[0];
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(e);
        });

        if (active.length === 0) {
            container.innerHTML = '<div style="color:#9ca3af;font-size:0.8rem;padding:0.5rem;">No effective permissions</div>';
            return;
        }

        const catColors = { data: '#3b82f6', view: '#10b981', action: '#f59e0b', lab: '#8b5cf6' };

        Object.entries(categories).forEach(([cat, perms]) => {
            if (perms.length === 0) return;

            const catHeader = document.createElement('div');
            catHeader.style.cssText = `font-size:0.7rem;font-weight:700;color:${catColors[cat]};text-transform:uppercase;letter-spacing:0.05em;padding:0.5rem 0 0.25rem;border-bottom:2px solid ${catColors[cat]};margin-bottom:0.25rem;`;
            catHeader.textContent = `${cat.toUpperCase()} (${perms.length})`;
            container.appendChild(catHeader);

            perms.forEach(e => {
                const row = document.createElement('div');
                const label = e.permission.split(':').slice(1).join(':');
                let icon, color, bgColor, badge;

                switch (e.source) {
                    case 'role':
                        icon = '<i class="fas fa-check" style="color:#10b981;"></i>';
                        color = '#555';
                        bgColor = '';
                        badge = '<span style="font-size:0.55rem;color:#9ca3af;margin-left:0.3rem;">role</span>';
                        break;
                    case 'granted':
                        icon = '<i class="fas fa-check" style="color:#10b981;"></i>';
                        color = '#065f46';
                        bgColor = 'background:#f0fdf4;';
                        badge = '<span style="background:#10b981;color:white;font-size:0.5rem;padding:0.05rem 0.25rem;border-radius:3px;margin-left:0.3rem;">override</span>';
                        break;
                    case 'denied':
                        icon = '<i class="fas fa-times" style="color:#ef4444;"></i>';
                        color = '#991b1b';
                        bgColor = 'background:#fef2f2;';
                        badge = '<span style="background:#ef4444;color:white;font-size:0.5rem;padding:0.05rem 0.25rem;border-radius:3px;margin-left:0.3rem;">override</span>';
                        break;
                }

                row.style.cssText = `display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0.4rem;border-bottom:1px solid #f3f4f6;font-size:0.7rem;${bgColor}`;
                row.innerHTML = `
                    <span style="width:16px;text-align:center;">${icon}</span>
                    <span style="flex:1;color:${color};">${label}${badge}</span>
                `;
                container.appendChild(row);
            });
        });
    }

    // _openOverrideManager removed — replaced by inline _renderOverridesTab with 2-level cascading selector
    _deprecated_openOverrideManager(memberId) {
        const svc = this;
        const member = svc.table('member').read(memberId);
        if (!member) return;

        const memberLabel = svc.table('member').getLabel(member);
        const categories = svc.getPermissionsByCategory();
        const overrides = svc.getMemberOverrides(memberId);

        // Build lookup: permission → 'grant' | 'deny'
        const currentState = {};
        overrides.grants.forEach(o => { currentState[o.get('permission')] = 'grant'; });
        overrides.denials.forEach(o => { currentState[o.get('permission')] = 'deny'; });

        // Pending state (clone of current, user modifies this)
        const pendingState = { ...currentState };

        // Create modal
        const modal = new uiModal({
            parent: document.body,
            template: 'default',
            title: `Permission Overrides — ${memberLabel}`,
            size: 'lg',
            content: ''
        });

        const body = modal._modal.querySelector('.ui-modal-body');
        body.innerHTML = '';
        body.style.cssText = 'padding:0;display:flex;flex-direction:column;max-height:70vh;';

        // Search bar
        const searchWrap = document.createElement('div');
        searchWrap.style.cssText = 'padding:0.75rem 1rem;border-bottom:1px solid #e5e7eb;flex-shrink:0;';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filter permissions...';
        searchInput.className = 'ui-input';
        searchInput.style.cssText = 'width:100%;font-size:0.8rem;';
        searchWrap.appendChild(searchInput);
        body.appendChild(searchWrap);

        // Scrollable content
        const content = document.createElement('div');
        content.style.cssText = 'flex:1;overflow-y:auto;padding:0.5rem 1rem;';
        body.appendChild(content);

        // Category colors
        const catColors = { data: '#3b82f6', view: '#10b981', action: '#f59e0b' };
        const catIcons = { data: 'fa-database', view: 'fa-eye', action: 'fa-bolt' };
        const allRows = [];

        categories.forEach(cat => {
            if (cat.permissions.length === 0) return;

            const section = document.createElement('div');
            section.style.marginBottom = '0.75rem';

            const header = document.createElement('div');
            const color = catColors[cat.category] || '#6b7280';
            header.style.cssText = `font-size:0.7rem;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.05em;padding:0.4rem 0;border-bottom:2px solid ${color};margin-bottom:0.25rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem;`;
            header.innerHTML = `<i class="fas ${catIcons[cat.category] || 'fa-circle'}" style="font-size:0.65rem;"></i>${cat.category.toUpperCase()} <span style="font-weight:400;opacity:0.6;">(${cat.permissions.length})</span>`;
            section.appendChild(header);

            const rowsContainer = document.createElement('div');
            section.appendChild(rowsContainer);

            // Toggle section collapse
            let collapsed = false;
            header.addEventListener('click', () => {
                collapsed = !collapsed;
                rowsContainer.style.display = collapsed ? 'none' : 'block';
            });

            cat.permissions.forEach(perm => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0.25rem;border-bottom:1px solid #f9fafb;font-size:0.75rem;transition:background 0.15s;';
                row.dataset.permission = perm.code;

                // Permission label
                const label = document.createElement('span');
                label.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#374151;';
                label.textContent = perm.code.split(':').slice(1).join(':');
                label.title = perm.code;
                row.appendChild(label);

                // 3-state radio group
                const radioGroup = document.createElement('div');
                radioGroup.style.cssText = 'display:flex;gap:2px;flex-shrink:0;';

                ['grant', 'deny', 'none'].forEach(state => {
                    const btn = document.createElement('button');
                    const isActive = state === 'none'
                        ? !pendingState[perm.code]
                        : pendingState[perm.code] === state;

                    let bg, fg, text;
                    if (state === 'grant') {
                        bg = isActive ? '#10b981' : '#f3f4f6';
                        fg = isActive ? '#fff' : '#9ca3af';
                        text = 'Grant';
                    } else if (state === 'deny') {
                        bg = isActive ? '#ef4444' : '#f3f4f6';
                        fg = isActive ? '#fff' : '#9ca3af';
                        text = 'Deny';
                    } else {
                        bg = isActive ? '#6b7280' : '#f3f4f6';
                        fg = isActive ? '#fff' : '#9ca3af';
                        text = 'None';
                    }

                    btn.style.cssText = `background:${bg};color:${fg};border:none;padding:0.15rem 0.5rem;font-size:0.6rem;font-weight:600;cursor:pointer;border-radius:3px;transition:all 0.15s;`;
                    btn.textContent = text;
                    btn.dataset.state = state;

                    btn.addEventListener('click', () => {
                        if (state === 'none') {
                            delete pendingState[perm.code];
                        } else {
                            pendingState[perm.code] = state;
                        }
                        // Re-render this row's buttons
                        updateRowButtons(row, perm.code);
                        // Update row background
                        updateRowBg(row, perm.code);
                    });

                    radioGroup.appendChild(btn);
                });

                row.appendChild(radioGroup);
                rowsContainer.appendChild(row);
                allRows.push(row);

                updateRowBg(row, perm.code);
            });

            content.appendChild(section);
        });

        function updateRowButtons(row, permCode) {
            const buttons = row.querySelectorAll('button');
            buttons.forEach(btn => {
                const state = btn.dataset.state;
                const isActive = state === 'none'
                    ? !pendingState[permCode]
                    : pendingState[permCode] === state;

                if (state === 'grant') {
                    btn.style.background = isActive ? '#10b981' : '#f3f4f6';
                    btn.style.color = isActive ? '#fff' : '#9ca3af';
                } else if (state === 'deny') {
                    btn.style.background = isActive ? '#ef4444' : '#f3f4f6';
                    btn.style.color = isActive ? '#fff' : '#9ca3af';
                } else {
                    btn.style.background = isActive ? '#6b7280' : '#f3f4f6';
                    btn.style.color = isActive ? '#fff' : '#9ca3af';
                }
            });
        }

        function updateRowBg(row, permCode) {
            if (pendingState[permCode] === 'grant') {
                row.style.background = '#f0fdf4';
            } else if (pendingState[permCode] === 'deny') {
                row.style.background = '#fef2f2';
            } else {
                row.style.background = '';
            }
        }

        // Search filtering
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            allRows.forEach(row => {
                row.style.display = row.dataset.permission.toLowerCase().includes(q) ? 'flex' : 'none';
            });
        });

        // Footer with Cancel / Apply
        const footer = modal._modal.querySelector('.ui-modal-footer');
        footer.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;padding:0.75rem 1rem;border-top:1px solid #e5e7eb;';
        footer.innerHTML = '';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'ui-btn ui-btn-ghost';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => modal.close());
        footer.appendChild(cancelBtn);

        const applyBtn = document.createElement('button');
        applyBtn.className = 'ui-btn ui-btn-primary';
        applyBtn.innerHTML = '<i class="fas fa-check" style="margin-right:0.3rem;"></i>Apply Changes';
        applyBtn.addEventListener('click', () => {
            // Diff current vs pending
            const allPerms = new Set([...Object.keys(currentState), ...Object.keys(pendingState)]);
            allPerms.forEach(perm => {
                const was = currentState[perm] || null;
                const now = pendingState[perm] || null;
                if (was === now) return; // no change

                if (now === null) {
                    // Remove override
                    const existing = svc.table('memberPermissionOverride').all().find(o =>
                        o.get('memberId') === memberId && o.get('permission') === perm
                    );
                    if (existing) svc.removePermissionOverride(existing.idx);
                } else {
                    // Add or update override
                    svc.addPermissionOverride(memberId, perm, now);
                }
            });

            modal.close();
            // Refresh the effective permissions tab if visible
            const effPanel = document.querySelector('.ui-tabs-panel[data-tab="effective"]');
            if (effPanel) svc._renderEffectivePermissions(effPanel, memberId);
        });
        footer.appendChild(applyBtn);

        modal.open();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Key Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate a random hex string of given byte length.
     * @param {number} bytes - Number of random bytes
     * @returns {string} Hex string
     * @private
     */
    _randomHex(bytes) {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const arr = new Uint8Array(bytes);
            crypto.getRandomValues(arr);
            return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
        }
        let hex = '';
        for (let i = 0; i < bytes; i++) hex += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        return hex;
    }

    /**
     * SHA-256 hash a string. Returns hex digest.
     * Works in browser (SubtleCrypto) and falls back to a simple hash for non-crypto environments.
     * @param {string} input
     * @returns {Promise<string>} Hex hash
     * @private
     */
    async _sha256(input) {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const data = new TextEncoder().encode(input);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
        }
        // Fallback: simple string hash (not cryptographic, but functional for dev/demo)
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }

    /**
     * Generate a new API key for a member.
     * Returns the raw key ONCE — only the hash is stored.
     *
     * @param {number} memberId - Member idx
     * @param {string} name - Human-readable key name (e.g. "Production Integration")
     * @param {string[]} scopes - Permission scopes (e.g. ["data:application:read", "data:review:*"])
     * @param {Object} [options]
     * @param {number} [options.rateLimit=1000] - Requests per hour
     * @param {string} [options.expiresAt] - ISO date for expiry
     * @param {number} [options.createdBy] - Member who created the key
     * @returns {Promise<{rawKey: string, record: Publon}>} The raw key (show once) and stored record
     */
    async generateApiKey(memberId, name, scopes = ['*'], options = {}) {
        const randomPart = this._randomHex(24);
        const rawKey = `pk_live_${randomPart}`;
        const prefix = rawKey.substring(0, 16); // "pk_live_" + first 8 hex chars
        const keyHash = await this._sha256(rawKey);

        const record = this.table('memberApiKey').create({
            memberId,
            name,
            prefix,
            keyHash,
            scopes: JSON.stringify(scopes),
            status: 'active',
            rateLimit: options.rateLimit || 1000,
            expiresAt: options.expiresAt || null,
            createdAt: new Date().toISOString(),
            createdBy: options.createdBy || memberId
        });

        return { rawKey, record };
    }

    /**
     * Revoke an API key immediately.
     * @param {number} keyIdx - API key idx
     * @param {number} [revokedBy] - Member who revoked
     * @returns {Publon|null} Updated record
     */
    revokeApiKey(keyIdx, revokedBy) {
        const key = this.table('memberApiKey').read(keyIdx);
        if (!key) return null;
        this.table('memberApiKey').update(keyIdx, {
            status: 'revoked',
            revokedAt: new Date().toISOString(),
            revokedBy: revokedBy || null
        });
        return key;
    }

    /**
     * Rotate an API key: create a new key, mark the old one as rotated.
     * The old key remains active during a grace period (default 1 hour).
     *
     * @param {number} oldKeyIdx - API key idx to rotate
     * @param {Object} [options]
     * @param {number} [options.gracePeriodMs=3600000] - Grace period in ms (default 1h)
     * @param {number} [options.rotatedBy] - Member who initiated rotation
     * @returns {Promise<{rawKey: string, newRecord: Publon, oldRecord: Publon}>}
     */
    async rotateApiKey(oldKeyIdx, options = {}) {
        const oldKey = this.table('memberApiKey').read(oldKeyIdx);
        if (!oldKey) throw new Error('API key not found');

        const memberId = oldKey.get('memberId');
        let scopes = oldKey.get('scopes');
        if (typeof scopes === 'string') {
            try { scopes = JSON.parse(scopes); } catch (e) { scopes = ['*']; }
        }

        // Generate replacement key with same scopes and rate limit
        const { rawKey, record: newRecord } = await this.generateApiKey(
            memberId,
            oldKey.get('name') + ' (rotated)',
            scopes,
            {
                rateLimit: oldKey.get('rateLimit'),
                createdBy: options.rotatedBy || memberId
            }
        );

        // Mark old key as rotated, pointing to the new one
        this.table('memberApiKey').update(oldKeyIdx, {
            status: 'rotated',
            rotatedToId: newRecord.idx
        });

        // Schedule grace period expiry
        const gracePeriod = options.gracePeriodMs || 3600000;
        const graceExpiry = new Date(Date.now() + gracePeriod).toISOString();
        this.table('memberApiKey').update(oldKeyIdx, { expiresAt: graceExpiry });

        return { rawKey, newRecord, oldRecord: oldKey };
    }

    /**
     * Get all API keys for a member (optionally filtered by status).
     * @param {number} memberId
     * @param {string} [status] - Filter by status ('active', 'revoked', etc.)
     * @returns {Publon[]}
     */
    getApiKeysForMember(memberId, status) {
        return this.table('memberApiKey').all().filter(k => {
            if (k.get('memberId') !== memberId) return false;
            if (status && k.get('status') !== status) return false;
            return true;
        });
    }

    /**
     * Get all webhooks for a member or API key.
     * @param {number} memberId
     * @param {number} [apiKeyId] - Optional: filter to specific key
     * @returns {Publon[]}
     */
    getWebhooksForMember(memberId, apiKeyId) {
        return this.table('memberWebhook').all().filter(w => {
            if (w.get('memberId') !== memberId) return false;
            if (apiKeyId && w.get('apiKeyId') !== apiKeyId) return false;
            return true;
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OAuth2 / Federation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Register an OAuth2/OIDC provider.
     * @param {Object} config - Provider configuration
     * @param {string} config.name - Display name (e.g. 'Google', 'Microsoft', 'DUT SAML')
     * @param {string} config.type - 'oauth2' | 'oidc' | 'saml'
     * @param {string} config.clientId
     * @param {string} [config.clientSecret]
     * @param {string} config.authorizeUrl
     * @param {string} config.tokenUrl
     * @param {string} [config.userInfoUrl]
     * @param {string} [config.scopes='openid profile email']
     * @param {string} [config.discoveryUrl] - OIDC discovery endpoint
     * @param {string} [config.icon='fa-key'] - FontAwesome icon class
     * @param {string} [config.color='#4285f4'] - Brand color
     * @param {boolean} [config.autoRegister=false] - Auto-create member on first login
     * @param {number} [config.defaultRoleId] - Role to assign on auto-register
     * @returns {Publon}
     */
    registerOAuthProvider(config) {
        const record = this.table('memberOAuthProvider').create({
            name: config.name,
            type: config.type || 'oauth2',
            clientId: config.clientId,
            clientSecret: config.clientSecret || '',
            authorizeUrl: config.authorizeUrl,
            tokenUrl: config.tokenUrl,
            userInfoUrl: config.userInfoUrl || '',
            scopes: config.scopes || 'openid profile email',
            discoveryUrl: config.discoveryUrl || '',
            icon: config.icon || 'fa-key',
            color: config.color || '#4285f4',
            autoRegister: config.autoRegister || false,
            defaultRoleId: config.defaultRoleId || null,
            status: 'active',
            createdAt: new Date().toISOString()
        });
        this._eventBus.emit('oauth:providerRegistered', { providerId: record.idx, name: config.name });
        return record;
    }

    /**
     * Get all registered OAuth providers (optionally filtered by status).
     * @param {string} [status] - Filter by status
     * @returns {Publon[]}
     */
    getOAuthProviders(status) {
        return this.table('memberOAuthProvider').all().filter(p => {
            if (status && p.get('status') !== status) return false;
            return true;
        });
    }

    /**
     * Generate an OAuth2 authorization URL for a provider.
     * Creates a state token for CSRF protection and stores it temporarily.
     * @param {number} providerId
     * @param {string} redirectUri - Callback URL
     * @param {Object} [options] - { nonce, additionalScopes }
     * @returns {{ url: string, state: string }}
     */
    initiateOAuthFlow(providerId, redirectUri, options = {}) {
        const provider = this.table('memberOAuthProvider').read(providerId);
        if (!provider) throw new Error('OAuth provider not found');

        const state = this._randomHex(32);
        const nonce = options.nonce || this._randomHex(16);
        const scopes = provider.get('scopes') || 'openid profile email';
        const finalScopes = options.additionalScopes
            ? `${scopes} ${options.additionalScopes}`
            : scopes;

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: provider.get('clientId'),
            redirect_uri: redirectUri,
            scope: finalScopes,
            state: state,
            nonce: nonce
        });

        // Store state for validation on callback
        this._pendingOAuthState = this._pendingOAuthState || {};
        this._pendingOAuthState[state] = {
            providerId,
            redirectUri,
            nonce,
            createdAt: Date.now()
        };

        const url = `${provider.get('authorizeUrl')}?${params.toString()}`;
        return { url, state };
    }

    /**
     * Handle OAuth2 callback — exchange authorization code for tokens.
     * In a browser-only environment, the actual HTTP exchange must be done
     * by the system's API proxy. This method handles the Publon-side bookkeeping.
     *
     * @param {string} code - Authorization code from provider
     * @param {string} state - State parameter for CSRF validation
     * @param {Object} tokenResponse - Token response from provider (via API proxy)
     * @param {string} tokenResponse.access_token
     * @param {string} [tokenResponse.refresh_token]
     * @param {string} [tokenResponse.token_type]
     * @param {number} [tokenResponse.expires_in]
     * @param {Object} userInfo - User info from provider
     * @param {string} userInfo.id - External user ID
     * @param {string} [userInfo.email]
     * @param {string} [userInfo.name]
     * @param {string} [userInfo.avatar]
     * @returns {{ member: Publon, link: Publon, isNewMember: boolean }}
     */
    handleOAuthCallback(code, state, tokenResponse, userInfo) {
        // Validate state
        const pending = (this._pendingOAuthState || {})[state];
        if (!pending) throw new Error('Invalid or expired OAuth state');

        const providerId = pending.providerId;
        delete this._pendingOAuthState[state];

        const provider = this.table('memberOAuthProvider').read(providerId);
        if (!provider) throw new Error('OAuth provider not found');

        // Check if this external identity is already linked
        let link = this.table('memberOAuthLink').all().find(l =>
            l.get('providerId') === providerId && l.get('externalId') === userInfo.id
        );

        let member = null;
        let isNewMember = false;

        if (link) {
            // Existing link — update and login
            member = this.table('member').read(link.get('memberId'));
            link.set('lastUsedAt', new Date().toISOString());
            if (userInfo.email) link.set('externalEmail', userInfo.email);
            if (userInfo.name) link.set('externalName', userInfo.name);
            if (userInfo.avatar) link.set('externalAvatar', userInfo.avatar);
        } else if (provider.get('autoRegister')) {
            // Auto-register: create new member + link
            member = this.table('member').create({
                username: userInfo.email || `oauth_${userInfo.id}`,
                email: userInfo.email || '',
                displayName: userInfo.name || '',
                avatar: userInfo.avatar || '',
                status: 'active',
                createdAt: new Date().toISOString()
            });
            isNewMember = true;

            // Assign default role if configured
            const defaultRoleId = provider.get('defaultRoleId');
            if (defaultRoleId) {
                this.assignRole(member.idx, defaultRoleId);
            }

            // Create the link
            link = this.table('memberOAuthLink').create({
                memberId: member.idx,
                providerId,
                externalId: userInfo.id,
                externalEmail: userInfo.email || '',
                externalName: userInfo.name || '',
                externalAvatar: userInfo.avatar || '',
                linkedAt: new Date().toISOString(),
                lastUsedAt: new Date().toISOString()
            });
        } else {
            // No auto-register — try to find existing member by email
            if (userInfo.email) {
                member = this.findMember(userInfo.email);
            }
            if (!member) {
                throw new Error('No linked account found. Ask an administrator to link your identity or enable auto-registration.');
            }

            // Auto-link the found member
            link = this.table('memberOAuthLink').create({
                memberId: member.idx,
                providerId,
                externalId: userInfo.id,
                externalEmail: userInfo.email || '',
                externalName: userInfo.name || '',
                externalAvatar: userInfo.avatar || '',
                linkedAt: new Date().toISOString(),
                lastUsedAt: new Date().toISOString()
            });
        }

        // Store tokens
        const now = new Date();
        const expiresAt = tokenResponse.expires_in
            ? new Date(now.getTime() + tokenResponse.expires_in * 1000).toISOString()
            : null;

        this.table('memberOAuthToken').create({
            linkId: link.idx,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || '',
            tokenType: tokenResponse.token_type || 'Bearer',
            scopes: tokenResponse.scope || provider.get('scopes') || '',
            expiresAt,
            createdAt: now.toISOString()
        });

        // Login the member
        this.login(member.idx);

        this._eventBus.emit('oauth:login', {
            memberId: member.idx,
            providerId,
            providerName: provider.get('name'),
            isNewMember
        });

        // Log it
        this.table('memberLoginLog').create({
            memberId: member.idx,
            method: 'oauth',
            providerId,
            success: true,
            timestamp: now.toISOString()
        });

        return { member, link, isNewMember };
    }

    /**
     * Manually link an external identity to an existing member.
     * @param {number} memberId
     * @param {number} providerId
     * @param {string} externalId
     * @param {Object} [info] - { email, name, avatar }
     * @returns {Publon}
     */
    linkExternalIdentity(memberId, providerId, externalId, info = {}) {
        const existing = this.table('memberOAuthLink').all().find(l =>
            l.get('providerId') === providerId && l.get('externalId') === externalId
        );
        if (existing) throw new Error('This external identity is already linked to another account');

        const link = this.table('memberOAuthLink').create({
            memberId,
            providerId,
            externalId,
            externalEmail: info.email || '',
            externalName: info.name || '',
            externalAvatar: info.avatar || '',
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString()
        });

        this._eventBus.emit('oauth:identityLinked', { memberId, providerId, externalId });
        return link;
    }

    /**
     * Unlink an external identity.
     * @param {number} linkIdx
     */
    unlinkExternalIdentity(linkIdx) {
        const link = this.table('memberOAuthLink').read(linkIdx);
        if (!link) return;

        // Revoke associated tokens
        this.table('memberOAuthToken').all()
            .filter(t => t.get('linkId') === linkIdx)
            .forEach(t => {
                t.set('revokedAt', new Date().toISOString());
            });

        const data = link.getData ? link.getData() : link;
        this.table('memberOAuthLink').delete(linkIdx);
        this._eventBus.emit('oauth:identityUnlinked', {
            memberId: data.memberId,
            providerId: data.providerId,
            externalId: data.externalId
        });
    }

    /**
     * Get all external identities linked to a member.
     * @param {number} memberId
     * @returns {Array<{link: Publon, provider: Publon}>}
     */
    getExternalIdentities(memberId) {
        return this.table('memberOAuthLink').all()
            .filter(l => l.get('memberId') === memberId)
            .map(link => ({
                link,
                provider: this.table('memberOAuthProvider').read(link.get('providerId'))
            }));
    }

    /**
     * Revoke all OAuth tokens for a member across all providers.
     * @param {number} memberId
     * @returns {number} Count of revoked tokens
     */
    revokeAllOAuthTokens(memberId) {
        const links = this.table('memberOAuthLink').all()
            .filter(l => l.get('memberId') === memberId);
        const linkIds = links.map(l => l.idx);
        const now = new Date().toISOString();
        let count = 0;

        this.table('memberOAuthToken').all()
            .filter(t => linkIds.includes(t.get('linkId')) && !t.get('revokedAt'))
            .forEach(t => {
                t.set('revokedAt', now);
                count++;
            });

        this._eventBus.emit('oauth:allTokensRevoked', { memberId, count });
        return count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invitation Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a member invitation.
     * @param {string} email
     * @param {number} [roleId] - Role to assign when accepted
     * @param {Object} [options] - { message, expiresInDays }
     * @returns {Publon}
     */
    createInvitation(email, roleId, options = {}) {
        const token = this._randomHex(32);
        const expiresInDays = options.expiresInDays || 7;
        const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

        const record = this.table('memberInvitation').create({
            email,
            roleId: roleId || null,
            token,
            message: options.message || '',
            invitedBy: this._currentMember?.idx || null,
            status: 'pending',
            expiresAt,
            createdAt: new Date().toISOString()
        });

        this._eventBus.emit('member:invited', { email, invitationIdx: record.idx });
        return record;
    }

    /**
     * Accept an invitation and create a member account.
     * @param {string} token - Invitation token
     * @param {Object} memberData - { username, displayName, ... }
     * @returns {{ member: Publon, invitation: Publon }}
     */
    acceptInvitation(token, memberData) {
        const invitation = this.table('memberInvitation').all()
            .find(i => i.get('token') === token && i.get('status') === 'pending');
        if (!invitation) throw new Error('Invalid or expired invitation');

        const expiresAt = invitation.get('expiresAt');
        if (expiresAt && new Date(expiresAt) < new Date()) {
            invitation.set('status', 'expired');
            throw new Error('Invitation has expired');
        }

        const member = this.table('member').create({
            username: memberData.username || invitation.get('email').split('@')[0],
            email: invitation.get('email'),
            displayName: memberData.displayName || '',
            status: 'active',
            createdAt: new Date().toISOString()
        });

        if (invitation.get('roleId')) {
            this.assignRole(member.idx, invitation.get('roleId'));
        }

        invitation.set('status', 'accepted');
        invitation.set('acceptedAt', new Date().toISOString());

        this._eventBus.emit('member:invitationAccepted', {
            memberId: member.idx,
            invitationIdx: invitation.idx,
            email: invitation.get('email')
        });

        return { member, invitation };
    }

    /**
     * Get pending invitations.
     * @returns {Publon[]}
     */
    getPendingInvitations() {
        const now = new Date().toISOString();
        return this.table('memberInvitation').all().filter(i => {
            if (i.get('status') !== 'pending') return false;
            const exp = i.get('expiresAt');
            if (exp && exp < now) {
                i.set('status', 'expired');
                return false;
            }
            return true;
        });
    }

    /**
     * Revoke a pending invitation.
     * @param {number} invitationIdx
     */
    revokeInvitation(invitationIdx) {
        const inv = this.table('memberInvitation').read(invitationIdx);
        if (inv && inv.get('status') === 'pending') {
            inv.set('status', 'revoked');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Login Audit Log
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Record a login attempt in the audit log.
     * Called automatically by login() and handleOAuthCallback().
     * @param {Object} entry - { memberId, method, providerId, success, ipAddress, userAgent, failReason }
     * @returns {Publon}
     */
    recordLoginAttempt(entry) {
        return this.table('memberLoginLog').create({
            memberId: entry.memberId || null,
            method: entry.method || 'direct',
            providerId: entry.providerId || null,
            success: entry.success !== false,
            ipAddress: entry.ipAddress || '',
            userAgent: entry.userAgent || '',
            failReason: entry.failReason || '',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get login history for a member.
     * @param {number} memberId
     * @param {number} [limit=50]
     * @returns {Publon[]}
     */
    getLoginHistory(memberId, limit = 50) {
        return this.table('memberLoginLog').all()
            .filter(l => l.get('memberId') === memberId)
            .sort((a, b) => (b.get('timestamp') || '').localeCompare(a.get('timestamp') || ''))
            .slice(0, limit);
    }

    /**
     * Get recent failed login attempts (security monitoring).
     * @param {number} [minutes=30]
     * @returns {Publon[]}
     */
    getRecentFailedLogins(minutes = 30) {
        const cutoff = new Date(Date.now() - minutes * 60000).toISOString();
        return this.table('memberLoginLog').all().filter(l =>
            !l.get('success') && l.get('timestamp') > cutoff
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Access Request Workflow
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Request a permission or role. Creates a pending access request.
     * @param {'permission'|'role'} type
     * @param {string} targetKey - Permission string (e.g. 'action:export') or role name
     * @param {string} reason - Why the user needs this
     * @param {Object} [options] - { roleId }
     * @returns {Publon}
     */
    requestAccess(type, targetKey, reason, options = {}) {
        if (!this._currentMember) throw new Error('Must be logged in to request access');
        if (!['permission', 'role'].includes(type)) throw new Error('Type must be "permission" or "role"');

        // Prevent duplicate pending requests
        const existing = this.table('memberAccessRequest').all().find(r =>
            r.get('memberId') === this._currentMember.idx &&
            r.get('type') === type &&
            r.get('targetKey') === targetKey &&
            r.get('status') === 'pending'
        );
        if (existing) return existing;

        // Resolve a human-readable label
        let targetLabel = targetKey;
        if (type === 'role') {
            const role = this.table('memberRole').all().find(r => r.get('name') === targetKey);
            if (role) targetLabel = role.get('name');
        } else {
            const registry = this._permissionRegistry;
            for (const cat of Object.values(registry)) {
                if (cat[targetKey]) { targetLabel = cat[targetKey].label || targetKey; break; }
            }
        }

        const record = this.table('memberAccessRequest').create({
            memberId: this._currentMember.idx,
            type,
            targetKey,
            targetLabel,
            roleId: options.roleId || null,
            reason,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        this._eventBus.emit('access:requested', {
            requestIdx: record.idx,
            memberId: this._currentMember.idx,
            type, targetKey, targetLabel
        });

        return record;
    }

    /**
     * Approve an access request. Grants the permission or role.
     * @param {number} requestIdx
     * @param {string} [notes] - Approver notes
     * @returns {Publon}
     */
    approveAccessRequest(requestIdx, notes) {
        const request = this.table('memberAccessRequest').read(requestIdx);
        if (!request) throw new Error('Request not found');
        if (request.get('status') !== 'pending') throw new Error('Request is not pending');

        const memberId = request.get('memberId');
        const type = request.get('type');
        const targetKey = request.get('targetKey');

        // Grant the requested access
        if (type === 'permission') {
            this.addPermissionOverride(memberId, targetKey, 'grant', {
                reason: `Approved request #${requestIdx}: ${notes || ''}`
            });
        } else if (type === 'role') {
            const roleId = request.get('roleId');
            if (roleId) {
                this.assignRole(memberId, roleId, this._currentMember?.idx);
            } else {
                const role = this.table('memberRole').all().find(r => r.get('name') === targetKey);
                if (role) this.assignRole(memberId, role.idx, this._currentMember?.idx);
            }
        }

        this.table('memberAccessRequest').update(requestIdx, {
            status: 'approved',
            reviewedBy: this._currentMember?.idx || null,
            reviewNotes: notes || '',
            reviewedAt: new Date().toISOString()
        });

        this._eventBus.emit('access:approved', {
            requestIdx, memberId, type, targetKey,
            approvedBy: this._currentMember?.idx
        });

        return request;
    }

    /**
     * Deny an access request.
     * @param {number} requestIdx
     * @param {string} [notes] - Reason for denial
     * @returns {Publon}
     */
    denyAccessRequest(requestIdx, notes) {
        const request = this.table('memberAccessRequest').read(requestIdx);
        if (!request) throw new Error('Request not found');
        if (request.get('status') !== 'pending') throw new Error('Request is not pending');

        this.table('memberAccessRequest').update(requestIdx, {
            status: 'denied',
            reviewedBy: this._currentMember?.idx || null,
            reviewNotes: notes || '',
            reviewedAt: new Date().toISOString()
        });

        this._eventBus.emit('access:denied', {
            requestIdx,
            memberId: request.get('memberId'),
            type: request.get('type'),
            targetKey: request.get('targetKey'),
            deniedBy: this._currentMember?.idx
        });

        return request;
    }

    /**
     * Cancel own pending request.
     * @param {number} requestIdx
     */
    cancelAccessRequest(requestIdx) {
        const request = this.table('memberAccessRequest').read(requestIdx);
        if (!request) return;
        if (request.get('memberId') !== this._currentMember?.idx) return;
        if (request.get('status') !== 'pending') return;
        this.table('memberAccessRequest').update(requestIdx, { status: 'cancelled' });
    }

    /**
     * Get access requests with optional filters.
     * @param {Object} [filters] - { memberId, status, type }
     * @returns {Publon[]}
     */
    getAccessRequests(filters = {}) {
        return this.table('memberAccessRequest').all().filter(r => {
            if (filters.memberId && r.get('memberId') !== filters.memberId) return false;
            if (filters.status && r.get('status') !== filters.status) return false;
            if (filters.type && r.get('type') !== filters.type) return false;
            return true;
        }).sort((a, b) => (b.get('createdAt') || '').localeCompare(a.get('createdAt') || ''));
    }

    /**
     * Get count of pending requests (for badge display).
     * @returns {number}
     */
    getPendingRequestCount() {
        return this.table('memberAccessRequest').all()
            .filter(r => r.get('status') === 'pending').length;
    }

    /**
     * Get permissions the current user does NOT have (for the request form).
     * @returns {Array<{code: string, label: string, category: string}>}
     */
    getRequestablePermissions() {
        const result = [];
        for (const [cat, perms] of Object.entries(this._permissionRegistry)) {
            for (const [code, def] of Object.entries(perms)) {
                if (!this.hasPermission(code)) {
                    result.push({ code, label: def.label || code, category: cat });
                }
            }
        }
        return result;
    }

    /**
     * Get roles the current user does NOT have (for the request form).
     * @returns {Array<{idx: number, name: string, description: string}>}
     */
    getRequestableRoles() {
        if (!this._currentMember) return [];
        const currentRoles = this.getMemberRoles(this._currentMember.idx);
        const currentRoleNames = currentRoles.map(r => r.get('name'));
        return this.table('memberRole').all()
            .filter(r => !currentRoleNames.includes(r.get('name')))
            .map(r => ({
                idx: r.idx,
                name: r.get('name'),
                description: r.get('description') || ''
            }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — API Key Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render API key management interface.
     * Left: key list via bindSelector. Right: key detail + webhooks.
     * Includes create-key modal that shows raw key once.
     *
     * @param {HTMLElement} container
     * @param {Object} [options]
     */
    _renderApiKeys(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        // Main layout: key list (left) + detail (right)
        const layout = document.createElement('div');
        layout.style.cssText = 'display:flex;gap:1rem;min-height:500px;height:calc(100vh - 250px);';
        container.appendChild(layout);

        // ── Left panel: key list + create button ──
        const leftPanel = document.createElement('div');
        leftPanel.style.cssText = 'width:300px;min-width:300px;display:flex;flex-direction:column;';
        layout.appendChild(leftPanel);

        // Create Key button
        const createBtn = document.createElement('button');
        createBtn.className = 'ui-btn ui-btn-primary';
        createBtn.style.cssText = 'margin-bottom:0.75rem;width:100%;';
        createBtn.innerHTML = '<i class="fas fa-plus" style="margin-right:0.4rem;"></i>Generate API Key';
        createBtn.addEventListener('click', () => svc._showCreateKeyModal());
        leftPanel.appendChild(createBtn);

        // Key selector
        const selectorDiv = document.createElement('div');
        selectorDiv.style.cssText = 'flex:1;overflow:auto;';
        leftPanel.appendChild(selectorDiv);

        const keyBinding = new UIBinding(svc.table('memberApiKey'), { publome: svc });
        keyBinding.bindSelector(selectorDiv);

        // ── Right panel: key detail + webhooks ──
        const rightPanel = document.createElement('div');
        rightPanel.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:1rem;overflow:auto;';
        layout.appendChild(rightPanel);

        // Key detail area
        const detailDiv = document.createElement('div');
        detailDiv.style.cssText = 'background:var(--ui-white);border-radius:var(--ui-radius-lg);padding:var(--ui-space-4);box-shadow:var(--ui-shadow-sm);';
        rightPanel.appendChild(detailDiv);

        // Webhook area
        const webhookDiv = document.createElement('div');
        webhookDiv.style.cssText = 'background:var(--ui-white);border-radius:var(--ui-radius-lg);padding:var(--ui-space-4);box-shadow:var(--ui-shadow-sm);flex:1;';
        rightPanel.appendChild(webhookDiv);

        // Render detail when key selected
        function renderKeyDetail(record) {
            detailDiv.innerHTML = '';
            if (!record) {
                detailDiv.innerHTML = '<div style="color:var(--ui-gray-400);padding:2rem;text-align:center;"><i class="fas fa-key" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>Select an API key to view details</div>';
                webhookDiv.innerHTML = '';
                return;
            }

            const data = record.getData ? record.getData() : record;
            const statusColors = { active: '#10b981', rotated: '#f59e0b', revoked: '#ef4444', expired: '#6b7280' };
            const statusColor = statusColors[data.status] || '#6b7280';

            // Resolve member name
            const member = svc.table('member').read(data.memberId);
            const memberName = member ? (member.get('displayName') || member.get('username')) : `Member #${data.memberId}`;

            let scopesDisplay = data.scopes;
            if (typeof scopesDisplay === 'string') {
                try { scopesDisplay = JSON.parse(scopesDisplay); } catch (e) { /* keep as string */ }
            }
            const scopesList = Array.isArray(scopesDisplay) ? scopesDisplay : [scopesDisplay];

            detailDiv.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <div style="width:36px;height:36px;border-radius:8px;background:#1565C0;color:white;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-key"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:1rem;color:var(--ui-gray-900);">${data.name}</div>
                        <div style="font-size:0.75rem;color:var(--ui-gray-500);">Owner: ${memberName}</div>
                    </div>
                    <span style="background:${statusColor};color:white;font-size:0.65rem;padding:0.15rem 0.5rem;border-radius:3px;font-weight:600;text-transform:uppercase;">${data.status}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.8rem;">
                    <div><strong>Prefix:</strong> <code style="background:var(--ui-gray-100);padding:0.1rem 0.3rem;border-radius:3px;">${data.prefix}...</code></div>
                    <div><strong>Rate Limit:</strong> ${data.rateLimit}/hr</div>
                    <div><strong>Created:</strong> ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '—'}</div>
                    <div><strong>Last Used:</strong> ${data.lastUsedAt ? new Date(data.lastUsedAt).toLocaleString() : 'Never'}</div>
                    <div><strong>Expires:</strong> ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'Never'}</div>
                    <div><strong>Last IP:</strong> ${data.lastIpAddress || '—'}</div>
                </div>
                <div style="margin-top:0.75rem;">
                    <strong style="font-size:0.8rem;">Scopes:</strong>
                    <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.3rem;">
                        ${scopesList.map(s => `<span style="background:var(--ui-gray-100);color:var(--ui-gray-700);font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:3px;font-family:monospace;">${s}</span>`).join('')}
                    </div>
                </div>
            `;

            // Action buttons
            if (data.status === 'active') {
                const actions = document.createElement('div');
                actions.style.cssText = 'display:flex;gap:0.5rem;margin-top:1rem;border-top:1px solid var(--ui-gray-100);padding-top:0.75rem;';

                const rotateBtn = document.createElement('button');
                rotateBtn.className = 'ui-btn ui-btn-ghost';
                rotateBtn.style.fontSize = '0.75rem';
                rotateBtn.innerHTML = '<i class="fas fa-sync-alt" style="margin-right:0.3rem;"></i>Rotate';
                rotateBtn.addEventListener('click', async () => {
                    const { rawKey } = await svc.rotateApiKey(record.idx, {
                        rotatedBy: svc._currentMember?.idx
                    });
                    svc._showRawKeyModal(rawKey, 'Rotated Key');
                });
                actions.appendChild(rotateBtn);

                const revokeBtn = document.createElement('button');
                revokeBtn.className = 'ui-btn ui-btn-ghost';
                revokeBtn.style.cssText = 'font-size:0.75rem;color:#ef4444;';
                revokeBtn.innerHTML = '<i class="fas fa-ban" style="margin-right:0.3rem;"></i>Revoke';
                revokeBtn.addEventListener('click', () => {
                    svc.revokeApiKey(record.idx, svc._currentMember?.idx);
                });
                actions.appendChild(revokeBtn);

                detailDiv.appendChild(actions);
            }

            // Render webhooks for this key
            renderWebhooks(record);
        }

        function renderWebhooks(keyRecord) {
            webhookDiv.innerHTML = '';

            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;';
            header.innerHTML = '<div style="font-weight:600;font-size:0.9rem;color:var(--ui-gray-900);"><i class="fas fa-satellite-dish" style="margin-right:0.4rem;color:#1565C0;"></i>Webhooks</div>';
            webhookDiv.appendChild(header);

            // Webhook list for this key's member
            const webhookListDiv = document.createElement('div');
            webhookDiv.appendChild(webhookListDiv);

            const webhookBinding = new UIBinding(svc.table('memberWebhook'), { publome: svc });
            webhookBinding.bindSelectEditor(webhookListDiv, { editor: 'inline' });

            // Filter to this key's member
            const memberId = keyRecord.get('memberId');
            const keyIdx = keyRecord.idx;
            webhookBinding._fkFilter = (record) => {
                return record.get('memberId') === memberId;
            };
        }

        // Listen for key selection
        svc.table('memberApiKey').on('selected', ({ record }) => renderKeyDetail(record));

        // Initial state
        renderKeyDetail(null);
    }

    /**
     * Show modal to create a new API key.
     * @private
     */
    _showCreateKeyModal() {
        const svc = this;
        const currentMember = svc._currentMember;
        const memberId = currentMember ? currentMember.idx : 1;

        const modal = new uiModal({
            title: 'Generate New API Key',
            size: 'md'
        });

        const body = modal.el.querySelector('.ui-modal-body');
        body.innerHTML = '';
        body.style.padding = 'var(--ui-space-4)';

        // Form fields
        const fields = [
            { id: 'keyName', label: 'Key Name', placeholder: 'e.g. Production Integration', type: 'text' },
            { id: 'keyScopes', label: 'Scopes (comma-separated)', placeholder: 'data:*:read, data:application:*', type: 'text' },
            { id: 'keyRateLimit', label: 'Rate Limit (req/hr)', placeholder: '1000', type: 'number' }
        ];

        fields.forEach(f => {
            const group = document.createElement('div');
            group.style.marginBottom = '1rem';
            group.innerHTML = `
                <label style="display:block;font-size:0.8rem;font-weight:600;color:var(--ui-gray-700);margin-bottom:0.3rem;">${f.label}</label>
                <input id="create-key-${f.id}" type="${f.type}" placeholder="${f.placeholder}"
                    style="width:100%;padding:0.5rem;border:1px solid var(--ui-gray-200);border-radius:var(--ui-radius-md);font-size:0.85rem;">
            `;
            body.appendChild(group);
        });

        // Footer
        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;padding:var(--ui-space-3) var(--ui-space-4);border-top:1px solid var(--ui-gray-100);';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'ui-btn ui-btn-ghost';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => modal.close());
        footer.appendChild(cancelBtn);

        const generateBtn = document.createElement('button');
        generateBtn.className = 'ui-btn ui-btn-primary';
        generateBtn.innerHTML = '<i class="fas fa-key" style="margin-right:0.3rem;"></i>Generate';
        generateBtn.addEventListener('click', async () => {
            const name = body.querySelector('#create-key-keyName').value.trim();
            if (!name) { alert('Key name is required'); return; }

            const scopesStr = body.querySelector('#create-key-keyScopes').value.trim();
            const scopes = scopesStr ? scopesStr.split(',').map(s => s.trim()).filter(Boolean) : ['*'];
            const rateLimit = parseInt(body.querySelector('#create-key-keyRateLimit').value) || 1000;

            const { rawKey } = await svc.generateApiKey(memberId, name, scopes, {
                rateLimit,
                createdBy: memberId
            });

            modal.close();
            svc._showRawKeyModal(rawKey, name);
        });
        footer.appendChild(generateBtn);

        modal.el.querySelector('.ui-modal-content').appendChild(footer);
        modal.open();
    }

    /**
     * Show modal with raw API key (displayed once only).
     * @param {string} rawKey
     * @param {string} keyName
     * @private
     */
    _showRawKeyModal(rawKey, keyName) {
        const modal = new uiModal({
            title: 'API Key Generated',
            size: 'md'
        });

        const body = modal.el.querySelector('.ui-modal-body');
        body.innerHTML = '';
        body.style.padding = 'var(--ui-space-4)';

        body.innerHTML = `
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:var(--ui-radius-md);padding:0.75rem;margin-bottom:1rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;font-weight:600;color:#92400e;font-size:0.85rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Copy this key now — it won't be shown again
                </div>
            </div>
            <div style="font-size:0.8rem;color:var(--ui-gray-600);margin-bottom:0.5rem;">Key: <strong>${keyName}</strong></div>
            <div style="background:var(--ui-gray-900);color:#4ade80;padding:0.75rem;border-radius:var(--ui-radius-md);font-family:monospace;font-size:0.85rem;word-break:break-all;cursor:pointer;user-select:all;" title="Click to select">${rawKey}</div>
            <div style="font-size:0.7rem;color:var(--ui-gray-400);margin-top:0.5rem;text-align:center;">Click the key to select it for copying</div>
        `;

        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:flex-end;padding:var(--ui-space-3) var(--ui-space-4);border-top:1px solid var(--ui-gray-100);';

        const doneBtn = document.createElement('button');
        doneBtn.className = 'ui-btn ui-btn-primary';
        doneBtn.textContent = 'Done';
        doneBtn.addEventListener('click', () => modal.close());
        footer.appendChild(doneBtn);

        modal.el.querySelector('.ui-modal-content').appendChild(footer);
        modal.open();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — OAuth2 Provider Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin view: manage OAuth2 provider configurations.
     */
    _renderOAuthProviders(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const layout = document.createElement('div');
        layout.className = 'ui-control-stage';
        container.appendChild(layout);

        const controlPanel = document.createElement('div');
        controlPanel.className = 'ui-control-panel';
        layout.appendChild(controlPanel);

        const stagePanel = document.createElement('div');
        stagePanel.className = 'ui-stage-panel';
        layout.appendChild(stagePanel);

        // Provider list with CRUD
        const providerBinding = new UIBinding(svc.table('memberOAuthProvider'), { publome: svc });
        providerBinding.bindSelectEditor(controlPanel, { editor: 'modal' });

        // Provider detail view
        providerBinding.bindView(stagePanel, (record) => {
            const data = record.getData ? record.getData() : record;
            const statusColors = { active: 'var(--ui-accent-600)', inactive: 'var(--ui-gray-400)', testing: 'var(--ui-secondary-500)' };
            return `
                <div style="display:flex;align-items:center;gap:var(--ui-space-3);margin-bottom:var(--ui-space-4);">
                    <div style="width:48px;height:48px;border-radius:var(--ui-radius-lg);background:${data.color || '#4285f4'};color:white;display:flex;align-items:center;justify-content:center;font-size:1.25rem;">
                        <i class="fas ${data.icon || 'fa-key'}"></i>
                    </div>
                    <div>
                        <div style="font-size:var(--ui-text-lg);font-weight:var(--ui-font-bold);">${data.name}</div>
                        <div style="font-size:var(--ui-text-sm);color:var(--ui-gray-500);">${data.type.toUpperCase()}</div>
                    </div>
                    <span class="ui-badge" style="background:${statusColors[data.status] || 'var(--ui-gray-400)'};color:white;margin-left:auto;">${data.status}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--ui-space-3);font-size:var(--ui-text-sm);">
                    <div><strong>Client ID:</strong><br><code style="font-size:var(--ui-text-xs);word-break:break-all;">${data.clientId}</code></div>
                    <div><strong>Scopes:</strong><br><code style="font-size:var(--ui-text-xs);">${data.scopes}</code></div>
                    <div><strong>Authorize URL:</strong><br><code style="font-size:var(--ui-text-xs);word-break:break-all;">${data.authorizeUrl}</code></div>
                    <div><strong>Token URL:</strong><br><code style="font-size:var(--ui-text-xs);word-break:break-all;">${data.tokenUrl}</code></div>
                    ${data.userInfoUrl ? `<div><strong>User Info URL:</strong><br><code style="font-size:var(--ui-text-xs);word-break:break-all;">${data.userInfoUrl}</code></div>` : ''}
                    ${data.discoveryUrl ? `<div><strong>Discovery URL:</strong><br><code style="font-size:var(--ui-text-xs);word-break:break-all;">${data.discoveryUrl}</code></div>` : ''}
                </div>
                <div style="margin-top:var(--ui-space-3);font-size:var(--ui-text-xs);color:var(--ui-gray-400);">
                    Auto-register: ${data.autoRegister ? 'Yes' : 'No'}
                    ${data.defaultRoleId ? ` | Default role: #${data.defaultRoleId}` : ''}
                </div>
            `;
        });
    }

    /**
     * User view: manage linked external accounts.
     */
    _renderLinkedAccounts(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const memberId = options.memberId || svc._currentMember?.idx;
        if (!memberId) {
            container.innerHTML = '<div style="color:var(--ui-gray-400);padding:var(--ui-space-4);text-align:center;">Login required to view linked accounts.</div>';
            return;
        }

        const identities = svc.getExternalIdentities(memberId);
        const providers = svc.getOAuthProviders('active');

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'max-width:600px;';
        container.appendChild(wrapper);

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--ui-space-4);';
        header.innerHTML = `<div style="font-size:var(--ui-text-lg);font-weight:var(--ui-font-bold);"><i class="fas fa-link" style="margin-right:var(--ui-space-2);color:var(--ui-primary);"></i>Linked Accounts</div>`;
        wrapper.appendChild(header);

        if (identities.length === 0) {
            wrapper.innerHTML += '<div style="color:var(--ui-gray-400);padding:var(--ui-space-4);text-align:center;border:1px dashed var(--ui-gray-200);border-radius:var(--ui-radius-lg);">No external accounts linked yet.</div>';
        }

        // Use bindCollection for linked identity cards
        const identityTable = svc.table('memberExternalIdentity');
        const identityBinding = new UIBinding(identityTable, { publome: svc });
        const listDiv = document.createElement('div');
        wrapper.appendChild(listDiv);

        identityBinding.bindCollection(listDiv, {
            component: 'list',
            filter: (record) => record.get('memberId') === memberId,
            map: (record) => {
                const data = record.getData ? record.getData() : record;
                const provider = svc.table('memberOAuthProvider').read(data.providerId);
                const provName = provider ? provider.get('name') : 'Unknown';
                const provIcon = provider ? provider.get('icon') : 'fa-key';
                return {
                    title: provName,
                    subtitle: data.externalEmail || data.externalId,
                    icon: `<i class="fas ${provIcon}"></i>`,
                    badge: data.lastUsedAt ? new Date(data.lastUsedAt).toLocaleDateString() : 'Never used',
                    actions: [
                        { label: 'Unlink', icon: '<i class="fas fa-unlink"></i>', color: 'danger', variant: 'outline',
                          onClick: () => { svc.unlinkExternalIdentity(record.idx); } }
                    ]
                };
            }
        });

        // Show available providers to link
        const unlinkedProviders = providers.filter(p =>
            !identities.some(i => i.provider && i.provider.idx === p.idx)
        );
        if (unlinkedProviders.length > 0) {
            const addSection = document.createElement('div');
            addSection.style.cssText = 'margin-top:var(--ui-space-4);padding-top:var(--ui-space-3);border-top:var(--ui-border-width) solid var(--ui-gray-100);';
            addSection.innerHTML = '<div style="font-size:var(--ui-text-sm);font-weight:var(--ui-font-semibold);margin-bottom:var(--ui-space-2);">Available Providers</div>';

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:var(--ui-space-2);flex-wrap:wrap;';
            addSection.appendChild(btnRow);

            unlinkedProviders.forEach(p => {
                const btn = document.createElement('button');
                btn.className = 'ui-btn ui-btn-sm ui-btn-outline';
                btn.innerHTML = `<i class="fas ${p.get('icon')}" style="color:${p.get('color')};margin-right:0.3rem;"></i>${p.get('name')}`;
                btn.addEventListener('click', () => {
                    const { url } = svc.initiateOAuthFlow(p.idx, window.location.href);
                    window.location.href = url;
                });
                btnRow.appendChild(btn);
            });
            wrapper.appendChild(addSection);
        }
    }

    /**
     * Login view: show OAuth provider buttons alongside standard login.
     */
    _renderOAuthLogin(container, options = {}) {
        const svc = this;
        const providers = svc.getOAuthProviders('active');
        if (providers.length === 0) return;

        const divider = document.createElement('div');
        divider.style.cssText = 'display:flex;align-items:center;gap:var(--ui-space-3);margin:var(--ui-space-4) 0;';
        divider.innerHTML = '<div style="flex:1;height:1px;background:var(--ui-gray-200);"></div><span style="font-size:var(--ui-text-xs);color:var(--ui-gray-400);">or sign in with</span><div style="flex:1;height:1px;background:var(--ui-gray-200);"></div>';
        container.appendChild(divider);

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;flex-direction:column;gap:var(--ui-space-2);';
        container.appendChild(btnGroup);

        providers.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'ui-btn ui-btn-outline';
            btn.style.cssText = 'width:100%;justify-content:center;';
            btn.innerHTML = `<i class="fas ${p.get('icon')}" style="color:${p.get('color')};"></i> ${p.get('name')}`;
            btn.addEventListener('click', () => {
                const redirectUri = options.redirectUri || window.location.href;
                const { url } = svc.initiateOAuthFlow(p.idx, redirectUri);
                window.location.href = url;
            });
            btnGroup.appendChild(btn);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Session Management (Admin)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin view: list and manage active sessions.
     */
    _renderSessionManager(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const sessions = svc.getActiveSessions();
        const wrapper = document.createElement('div');
        container.appendChild(wrapper);

        // Metrics row
        const metricsRow = document.createElement('div');
        metricsRow.style.cssText = 'display:flex;gap:var(--ui-space-3);margin-bottom:var(--ui-space-4);flex-wrap:wrap;';
        wrapper.appendChild(metricsRow);

        const totalMembers = new Set(sessions.map(s => s.get('memberId'))).size;
        [
            { label: 'Active Sessions', value: sessions.length, icon: 'fa-plug', color: 'var(--ui-accent-600)' },
            { label: 'Unique Members', value: totalMembers, icon: 'fa-users', color: 'var(--ui-primary)' }
        ].forEach(m => {
            const chip = document.createElement('span');
            chip.className = 'ui-metric-chip';
            chip.innerHTML = `<i class="fas ${m.icon}" style="color:${m.color};margin-right:0.3rem;"></i>${m.label}: <strong>${m.value}</strong>`;
            metricsRow.appendChild(chip);
        });

        // Session list
        const sessionBinding = new UIBinding(svc.table('memberSession'), { publome: svc });
        const listDiv = document.createElement('div');
        wrapper.appendChild(listDiv);
        sessionBinding.bindCollection(listDiv, {
            component: 'list',
            map: (record) => {
                const data = record.getData ? record.getData() : record;
                const member = svc.table('member').read(data.memberId);
                const memberName = member ? (member.get('displayName') || member.get('username')) : `#${data.memberId}`;
                const expired = data.expiresAt && new Date(data.expiresAt) < new Date();
                return {
                    title: memberName,
                    subtitle: `${data.ipAddress || 'Unknown IP'} | ${data.userAgent ? data.userAgent.substring(0, 40) + '...' : 'Unknown agent'}`,
                    badge: expired ? 'Expired' : 'Active',
                    badgeColor: expired ? 'var(--ui-gray-400)' : 'var(--ui-accent-600)'
                };
            }
        });

        // Bulk revoke button
        const revokeAllBtn = document.createElement('button');
        revokeAllBtn.className = 'ui-btn ui-btn-sm ui-btn-danger ui-btn-outline';
        revokeAllBtn.style.cssText = 'margin-top:var(--ui-space-3);';
        revokeAllBtn.innerHTML = '<i class="fas fa-ban" style="margin-right:0.3rem;"></i>Revoke All Sessions';
        revokeAllBtn.addEventListener('click', () => {
            sessions.forEach(s => svc.revokeSession(s.idx));
            svc._renderSessionManager(container, options);
        });
        wrapper.appendChild(revokeAllBtn);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Login History
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render login history for current or specified member.
     */
    _renderLoginHistory(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const memberId = options.memberId || svc._currentMember?.idx;
        if (!memberId) {
            container.innerHTML = '<div style="color:var(--ui-gray-400);padding:var(--ui-space-4);text-align:center;">Login required.</div>';
            return;
        }

        const logs = svc.getLoginHistory(memberId, options.limit || 50);
        const wrapper = document.createElement('div');
        container.appendChild(wrapper);

        const header = document.createElement('div');
        header.style.cssText = 'font-size:var(--ui-text-lg);font-weight:var(--ui-font-bold);margin-bottom:var(--ui-space-3);';
        header.innerHTML = '<i class="fas fa-history" style="margin-right:var(--ui-space-2);color:var(--ui-primary);"></i>Login History';
        wrapper.appendChild(header);

        if (logs.length === 0) {
            wrapper.innerHTML += '<div style="color:var(--ui-gray-400);padding:var(--ui-space-4);text-align:center;">No login history recorded.</div>';
            return;
        }

        const listBinding = new UIBinding(svc.table('memberLoginLog'), { publome: svc });
        const listDiv = document.createElement('div');
        wrapper.appendChild(listDiv);
        listBinding.bindCollection(listDiv, {
            component: 'list',
            map: (record) => {
                const data = record.getData ? record.getData() : record;
                const methodIcons = { direct: 'fa-key', oauth: 'fa-globe', apiKey: 'fa-code', sessionRestore: 'fa-redo' };
                return {
                    title: `${data.method} login — ${data.success ? 'Success' : 'Failed'}`,
                    subtitle: `${data.timestamp ? new Date(data.timestamp).toLocaleString() : ''} | ${data.ipAddress || ''}`,
                    icon: `<i class="fas ${methodIcons[data.method] || 'fa-sign-in-alt'}" style="color:${data.success ? 'var(--ui-accent-600)' : '#ef4444'};"></i>`,
                    badge: data.success ? 'OK' : data.failReason || 'Failed',
                    badgeColor: data.success ? 'var(--ui-accent-600)' : '#ef4444'
                };
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Invitations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render invitation management panel.
     */
    _renderInvitations(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        const layout = document.createElement('div');
        layout.className = 'ui-control-stage';
        container.appendChild(layout);

        const controlPanel = document.createElement('div');
        controlPanel.className = 'ui-control-panel';
        layout.appendChild(controlPanel);

        const stagePanel = document.createElement('div');
        stagePanel.className = 'ui-stage-panel';
        layout.appendChild(stagePanel);

        const invBinding = new UIBinding(svc.table('memberInvitation'), { publome: svc });
        invBinding.bindSelectEditor(controlPanel, { editor: 'modal' });
        invBinding.bindView(stagePanel, (record) => {
            const data = record.getData ? record.getData() : record;
            const statusColors = { pending: 'var(--ui-secondary-500)', accepted: 'var(--ui-accent-600)', expired: 'var(--ui-gray-400)', revoked: '#ef4444' };
            const inviter = data.invitedBy ? svc.table('member').read(data.invitedBy) : null;
            const inviterName = inviter ? (inviter.get('displayName') || inviter.get('username')) : 'System';
            return `
                <div style="display:flex;align-items:center;gap:var(--ui-space-3);margin-bottom:var(--ui-space-3);">
                    <span style="font-size:var(--ui-text-lg);font-weight:var(--ui-font-bold);">${data.email}</span>
                    <span class="ui-badge" style="background:${statusColors[data.status] || 'var(--ui-gray-400)'};color:white;">${data.status}</span>
                </div>
                <div style="font-size:var(--ui-text-sm);color:var(--ui-gray-500);">
                    Invited by: ${inviterName}<br>
                    Created: ${data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}<br>
                    Expires: ${data.expiresAt ? new Date(data.expiresAt).toLocaleString() : 'N/A'}
                    ${data.acceptedAt ? `<br>Accepted: ${new Date(data.acceptedAt).toLocaleString()}` : ''}
                    ${data.message ? `<br><br><em>"${data.message}"</em>` : ''}
                </div>
            `;
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Account Controls (user-facing hub)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render account controls — a user-facing hub for managing their own account.
     * Accordion sections: Profile, Linked Accounts, Sessions, Login History, Permissions, API Keys.
     */
    _renderAccountControls(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        if (!svc.isLoggedIn()) {
            container.innerHTML = '<div class="ui-empty-state"><i class="fas fa-user-lock"></i><p>Please log in to manage your account.</p></div>';
            return;
        }

        const member = svc.getCurrentMember();
        const roles = svc.getMemberRoles(member.idx);
        const roleLabel = roles.map(r => r.get('name')).join(', ') || 'No role';
        const initials = (member.get('displayName') || member.get('username') || '?')
            .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

        const wrapper = document.createElement('div');
        container.appendChild(wrapper);

        // Account header card
        const headerCard = document.createElement('div');
        headerCard.className = 'ui-card';
        headerCard.style.cssText = 'padding:var(--ui-space-4);margin-bottom:var(--ui-space-4);';
        headerCard.innerHTML = `
            <div style="display:flex;align-items:center;gap:var(--ui-space-3);">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--ui-primary),var(--ui-secondary));color:white;display:flex;align-items:center;justify-content:center;font-size:var(--ui-text-base);font-weight:var(--ui-font-bold);">${initials}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:var(--ui-text-base);font-weight:var(--ui-font-bold);">${member.get('displayName') || member.get('username')}</div>
                    <div style="font-size:var(--ui-text-xs);color:var(--ui-gray-500);">${member.get('email')} &middot; ${roleLabel}</div>
                </div>
                <span class="ui-badge" style="background:var(--ui-accent-100);color:var(--ui-accent-700);font-size:var(--ui-text-2xs);">${member.get('status')}</span>
            </div>
        `;
        wrapper.appendChild(headerCard);

        // Accordion sections
        const sections = [
            { key: 'profile', label: 'Profile', icon: 'fa-id-card', description: 'Edit your personal information' },
            { key: 'linked', label: 'Linked Accounts', icon: 'fa-link', description: 'External identity providers' },
            { key: 'sessions', label: 'Active Sessions', icon: 'fa-plug', description: 'Where you\'re signed in' },
            { key: 'history', label: 'Login History', icon: 'fa-history', description: 'Recent sign-in activity' },
            { key: 'permissions', label: 'My Permissions', icon: 'fa-shield-halved', description: 'Current access rights' },
            { key: 'apikeys', label: 'API Keys', icon: 'fa-key', description: 'Manage programmatic access' }
        ];

        const accordionDiv = document.createElement('div');
        wrapper.appendChild(accordionDiv);

        const accordion = new uiAccordion({
            parent: accordionDiv,
            exclusive: true,
            sections: sections.map(s => ({
                key: s.key,
                title: `<i class="fas ${s.icon}" style="margin-right:var(--ui-space-2);color:var(--ui-primary);"></i>${s.label}`,
                subtitle: s.description
            }))
        });

        // Lazy-load section content on open
        accordion.on('open', (key) => {
            const panel = accordion.getPanel(key);
            if (!panel || panel.dataset.loaded) return;
            panel.dataset.loaded = 'true';

            switch (key) {
                case 'profile':
                    svc._renderAccountProfileSection(panel, member);
                    break;
                case 'linked':
                    svc._renderLinkedAccounts(panel, { memberId: member.idx });
                    break;
                case 'sessions': {
                    const mySessions = svc.getActiveSessions(member.idx);
                    const listDiv = document.createElement('div');
                    panel.appendChild(listDiv);
                    if (mySessions.length === 0) {
                        listDiv.innerHTML = '<div style="color:var(--ui-gray-400);padding:var(--ui-space-3);text-align:center;">No active sessions.</div>';
                    } else {
                        const sessionBinding = new UIBinding(svc.table('memberSession'), { publome: svc });
                        sessionBinding.bindCollection(listDiv, {
                            component: 'list',
                            filter: (record) => {
                                const d = record.getData ? record.getData() : record;
                                return d.memberId === member.idx && (!d.expiresAt || new Date(d.expiresAt) > new Date());
                            },
                            map: (record) => {
                                const d = record.getData ? record.getData() : record;
                                return {
                                    title: d.ipAddress || 'Current device',
                                    subtitle: d.userAgent ? d.userAgent.substring(0, 50) + '...' : 'Unknown',
                                    badge: 'Active',
                                    badgeColor: 'var(--ui-accent-600)'
                                };
                            }
                        });
                    }
                    break;
                }
                case 'history':
                    svc._renderLoginHistory(panel, { memberId: member.idx, limit: 20 });
                    break;
                case 'permissions': {
                    const perms = svc.getCurrentPermissions();
                    const effective = svc.getEffectivePermissions(member.idx);
                    const permList = document.createElement('div');
                    permList.style.cssText = 'display:flex;flex-wrap:wrap;gap:var(--ui-space-2);padding:var(--ui-space-3);';
                    panel.appendChild(permList);
                    if (perms.length === 0) {
                        permList.innerHTML = '<div style="color:var(--ui-gray-400);">No permissions assigned.</div>';
                    } else {
                        perms.forEach(p => {
                            const source = effective.find(e => e.permission === p);
                            const sourceLabel = source ? source.source : 'role';
                            const isOverride = sourceLabel.includes('override');
                            const chip = document.createElement('span');
                            chip.className = 'ui-badge';
                            chip.style.cssText = `font-size:var(--ui-text-2xs);background:${isOverride ? 'var(--ui-secondary-100)' : 'var(--ui-primary-100)'};color:${isOverride ? 'var(--ui-secondary-700)' : 'var(--ui-primary-700)'};`;
                            chip.textContent = p;
                            chip.title = `Source: ${sourceLabel}`;
                            permList.appendChild(chip);
                        });
                    }
                    break;
                }
                case 'apikeys': {
                    const keys = svc.getApiKeysForMember(member.idx, 'active');
                    const keyDiv = document.createElement('div');
                    panel.appendChild(keyDiv);
                    if (keys.length === 0) {
                        keyDiv.innerHTML = '<div style="color:var(--ui-gray-400);padding:var(--ui-space-3);text-align:center;">No API keys. Visit API Key Manager to generate one.</div>';
                    } else {
                        const apiBinding = new UIBinding(svc.table('memberApiKey'), { publome: svc });
                        apiBinding.bindCollection(keyDiv, {
                            component: 'list',
                            filter: (record) => {
                                const d = record.getData ? record.getData() : record;
                                return d.memberId === member.idx && d.status === 'active';
                            },
                            map: (record) => {
                                const d = record.getData ? record.getData() : record;
                                return {
                                    title: d.name || 'API Key',
                                    subtitle: `Created: ${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'N/A'} | Last used: ${d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleDateString() : 'Never'}`,
                                    badge: d.status,
                                    badgeColor: d.status === 'active' ? 'var(--ui-accent-600)' : 'var(--ui-gray-400)'
                                };
                            }
                        });
                    }
                    break;
                }
            }
        });
    }

    /**
     * Render the profile section within account controls accordion.
     * Shows key profile fields with an inline editor for the profile table.
     */
    _renderAccountProfileSection(container, member) {
        const svc = this;
        const profile = svc.getProfile(member.idx);

        // Show basic info
        const info = document.createElement('div');
        info.style.cssText = 'padding:var(--ui-space-3);';
        info.innerHTML = `
            <div style="display:grid;grid-template-columns:auto 1fr;gap:var(--ui-space-2) var(--ui-space-4);font-size:var(--ui-text-sm);align-items:center;">
                <span style="color:var(--ui-gray-500);font-weight:var(--ui-font-medium);">Username</span>
                <span>${member.get('username')}</span>
                <span style="color:var(--ui-gray-500);font-weight:var(--ui-font-medium);">Display Name</span>
                <span>${member.get('displayName') || '—'}</span>
                <span style="color:var(--ui-gray-500);font-weight:var(--ui-font-medium);">Email</span>
                <span>${member.get('email')}</span>
                <span style="color:var(--ui-gray-500);font-weight:var(--ui-font-medium);">Status</span>
                <span>${member.get('status')}</span>
                ${profile ? `
                <span style="color:var(--ui-gray-500);font-weight:var(--ui-font-medium);">Bio</span>
                <span>${profile.get('bio') || '—'}</span>
                <span style="color:var(--ui-gray-500);font-weight:var(--ui-font-medium);">Phone</span>
                <span>${profile.get('phone') || '—'}</span>
                ` : ''}
            </div>
        `;
        container.appendChild(info);

        // Profile editor
        if (profile) {
            const editorDiv = document.createElement('div');
            editorDiv.style.cssText = 'margin-top:var(--ui-space-3);';
            container.appendChild(editorDiv);
            const profileBinding = new UIBinding(svc.table('memberProfile'), {
                publome: svc,
                editableColumns: ['bio', 'phone', 'avatarUrl', 'timezone', 'locale']
            });
            svc.table('memberProfile').select(profile.idx);
            profileBinding.bindEditor(editorDiv, { mode: 'inline' });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Request Access (user-facing)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render the access request form — lets users request permissions or roles they don't have.
     * Shows available permissions/roles, request form, and request history.
     */
    _renderRequestAccess(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        if (!svc.isLoggedIn()) {
            container.innerHTML = '<div class="ui-empty-state"><i class="fas fa-user-lock"></i><p>Please log in to request access.</p></div>';
            return;
        }

        const member = svc.getCurrentMember();

        const layout = document.createElement('div');
        layout.className = 'ui-control-stage';
        container.appendChild(layout);

        const controlPanel = document.createElement('div');
        controlPanel.className = 'ui-control-panel';
        layout.appendChild(controlPanel);

        const stagePanel = document.createElement('div');
        stagePanel.className = 'ui-stage-panel';
        layout.appendChild(stagePanel);

        // ── Control panel: New request form ──
        const formHeader = document.createElement('div');
        formHeader.style.cssText = 'font-size:var(--ui-text-base);font-weight:var(--ui-font-bold);margin-bottom:var(--ui-space-3);';
        formHeader.innerHTML = '<i class="fas fa-hand-point-up" style="margin-right:var(--ui-space-2);color:var(--ui-primary);"></i>New Request';
        controlPanel.appendChild(formHeader);

        // Build available options
        const requestablePerms = svc.getRequestablePermissions();
        const requestableRoles = svc.getRequestableRoles();

        // Request type selector
        const formDiv = document.createElement('div');
        controlPanel.appendChild(formDiv);

        const typeOptions = [];
        if (requestablePerms.length > 0) typeOptions.push({ value: 'permission', label: `Permission (${requestablePerms.length} available)` });
        if (requestableRoles.length > 0) typeOptions.push({ value: 'role', label: `Role (${requestableRoles.length} available)` });

        if (typeOptions.length === 0) {
            formDiv.innerHTML = '<div style="color:var(--ui-gray-400);padding:var(--ui-space-3);text-align:center;font-size:var(--ui-text-sm);">You already have all available permissions and roles.</div>';
        } else {
            let selectedType = typeOptions[0].value;
            let selectedTarget = '';

            const form = new uiForm({
                parent: formDiv,
                fields: {
                    type: {
                        label: 'Request Type',
                        type: 'select',
                        options: typeOptions,
                        value: selectedType
                    },
                    target: {
                        label: 'Target',
                        type: 'select',
                        options: svc._getRequestTargetOptions(selectedType, requestablePerms, requestableRoles),
                        value: ''
                    },
                    reason: {
                        label: 'Justification',
                        type: 'textarea',
                        placeholder: 'Why do you need this access?',
                        value: ''
                    }
                },
                onChange: (field, value) => {
                    if (field === 'type') {
                        selectedType = value;
                        const targetSelect = formDiv.querySelectorAll('select')[1];
                        if (targetSelect) {
                            const newOpts = svc._getRequestTargetOptions(value, requestablePerms, requestableRoles);
                            targetSelect.innerHTML = newOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
                        }
                    }
                }
            });

            // Submit button
            const submitDiv = document.createElement('div');
            submitDiv.style.cssText = 'margin-top:var(--ui-space-3);';
            controlPanel.appendChild(submitDiv);

            new uiButtonGroup({
                parent: submitDiv,
                buttons: [
                    {
                        label: 'Submit Request',
                        icon: '<i class="fas fa-paper-plane"></i>',
                        color: 'primary',
                        onClick: () => {
                            const selects = formDiv.querySelectorAll('select');
                            const textarea = formDiv.querySelector('textarea');
                            const type = selects[0]?.value;
                            const target = selects[1]?.value;
                            const reason = textarea?.value?.trim();

                            if (!target) {
                                alert('Please select what to request.');
                                return;
                            }
                            if (!reason) {
                                alert('Please provide a justification.');
                                return;
                            }

                            try {
                                svc.requestAccess(type, target, reason);
                                svc._renderRequestAccess(container, options);
                            } catch (e) {
                                alert(e.message);
                            }
                        }
                    }
                ]
            });
        }

        // ── Stage panel: Request history ──
        const stageHeader = document.createElement('div');
        stageHeader.style.cssText = 'font-size:var(--ui-text-base);font-weight:var(--ui-font-bold);margin-bottom:var(--ui-space-3);';
        stageHeader.innerHTML = '<i class="fas fa-list" style="margin-right:var(--ui-space-2);color:var(--ui-secondary);"></i>My Requests';
        stagePanel.appendChild(stageHeader);

        const myRequests = svc.getAccessRequests({ memberId: member.idx });
        if (myRequests.length === 0) {
            stagePanel.innerHTML += '<div style="color:var(--ui-gray-400);padding:var(--ui-space-4);text-align:center;">No access requests yet.</div>';
        } else {
            const reqBinding = new UIBinding(svc.table('memberAccessRequest'), { publome: svc });
            const listDiv = document.createElement('div');
            stagePanel.appendChild(listDiv);
            reqBinding.bindCollection(listDiv, {
                component: 'list',
                filter: (record) => {
                    const d = record.getData ? record.getData() : record;
                    return d.memberId === member.idx;
                },
                map: (record) => {
                    const d = record.getData ? record.getData() : record;
                    const statusColors = { pending: 'var(--ui-secondary-500)', approved: 'var(--ui-accent-600)', denied: '#ef4444', expired: 'var(--ui-gray-400)', cancelled: 'var(--ui-gray-400)' };
                    return {
                        title: `${d.type}: ${d.targetLabel || d.targetKey}`,
                        subtitle: `${d.reason || ''} — ${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}`,
                        badge: d.status,
                        badgeColor: statusColors[d.status] || 'var(--ui-gray-400)'
                    };
                }
            });

            // Cancel button for pending requests
            const pendingReqs = myRequests.filter(r => r.get('status') === 'pending');
            if (pendingReqs.length > 0) {
                const cancelDiv = document.createElement('div');
                cancelDiv.style.cssText = 'margin-top:var(--ui-space-3);';
                stagePanel.appendChild(cancelDiv);
                new uiButtonGroup({
                    parent: cancelDiv,
                    buttons: [
                        {
                            label: `Cancel ${pendingReqs.length} Pending`,
                            icon: '<i class="fas fa-times"></i>',
                            color: 'danger',
                            variant: 'outline',
                            onClick: () => {
                                pendingReqs.forEach(r => svc.cancelAccessRequest(r.idx));
                                svc._renderRequestAccess(container, options);
                            }
                        }
                    ]
                });
            }
        }
    }

    /**
     * Helper: build target options for the request form based on type.
     */
    _getRequestTargetOptions(type, requestablePerms, requestableRoles) {
        if (type === 'permission') {
            return requestablePerms.map(p => ({ value: p, label: p }));
        } else {
            return requestableRoles.map(r => ({ value: r.get('name'), label: `${r.get('name')} (level ${r.get('level')})` }));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — Approval Queue (admin-facing)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render the approval queue — admin view for reviewing and acting on access requests.
     * Control-stage layout: filters on left, request cards on right with approve/deny actions.
     */
    _renderApprovalQueue(container, options = {}) {
        const svc = this;
        container.innerHTML = '';

        if (!svc.isLoggedIn()) {
            container.innerHTML = '<div class="ui-empty-state"><i class="fas fa-user-lock"></i><p>Please log in to review requests.</p></div>';
            return;
        }

        const layout = document.createElement('div');
        layout.className = 'ui-control-stage';
        container.appendChild(layout);

        const controlPanel = document.createElement('div');
        controlPanel.className = 'ui-control-panel';
        layout.appendChild(controlPanel);

        const stagePanel = document.createElement('div');
        stagePanel.className = 'ui-stage-panel';
        layout.appendChild(stagePanel);

        // ── Control panel: Metrics + Filters ──
        const pendingCount = svc.getPendingRequestCount();
        const allRequests = svc.getAccessRequests();
        const approvedCount = allRequests.filter(r => r.get('status') === 'approved').length;
        const deniedCount = allRequests.filter(r => r.get('status') === 'denied').length;

        // Metrics
        const metricsRow = document.createElement('div');
        metricsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:var(--ui-space-2);margin-bottom:var(--ui-space-4);';
        [
            { icon: 'fa-clock', label: 'Pending', value: pendingCount, color: 'var(--ui-secondary-500)' },
            { icon: 'fa-check', label: 'Approved', value: approvedCount, color: 'var(--ui-accent-600)' },
            { icon: 'fa-times', label: 'Denied', value: deniedCount, color: '#ef4444' }
        ].forEach(m => {
            const chip = document.createElement('span');
            chip.className = 'ui-metric-chip';
            chip.innerHTML = `<i class="fas ${m.icon}" style="color:${m.color};margin-right:0.25rem;"></i>${m.label}: <strong>${m.value}</strong>`;
            metricsRow.appendChild(chip);
        });
        controlPanel.appendChild(metricsRow);

        // Filter form
        let currentFilter = options.filter || 'pending';
        const filterDiv = document.createElement('div');
        controlPanel.appendChild(filterDiv);

        new uiForm({
            parent: filterDiv,
            fields: {
                status: {
                    label: 'Filter by Status',
                    type: 'select',
                    options: [
                        { value: 'pending', label: 'Pending' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'denied', label: 'Denied' },
                        { value: 'all', label: 'All' }
                    ],
                    value: currentFilter
                },
                type: {
                    label: 'Filter by Type',
                    type: 'select',
                    options: [
                        { value: 'all', label: 'All Types' },
                        { value: 'permission', label: 'Permission' },
                        { value: 'role', label: 'Role' }
                    ],
                    value: 'all'
                }
            },
            onChange: () => {
                renderStage();
            }
        });

        function renderStage() {
            stagePanel.innerHTML = '';

            const selects = filterDiv.querySelectorAll('select');
            const statusFilter = selects[0]?.value || 'pending';
            const typeFilter = selects[1]?.value || 'all';

            let filtered = allRequests;
            if (statusFilter !== 'all') filtered = filtered.filter(r => r.get('status') === statusFilter);
            if (typeFilter !== 'all') filtered = filtered.filter(r => r.get('type') === typeFilter);

            if (filtered.length === 0) {
                stagePanel.innerHTML = '<div style="color:var(--ui-gray-400);padding:var(--ui-space-4);text-align:center;">No requests match the current filter.</div>';
                return;
            }

            filtered.forEach(request => {
                const d = request.getData ? request.getData() : request;
                const requester = svc.table('member').read(d.memberId);
                const requesterName = requester ? (requester.get('displayName') || requester.get('username')) : `#${d.memberId}`;
                const reviewer = d.reviewedBy ? svc.table('member').read(d.reviewedBy) : null;
                const statusColors = { pending: 'var(--ui-secondary-500)', approved: 'var(--ui-accent-600)', denied: '#ef4444', expired: 'var(--ui-gray-400)', cancelled: 'var(--ui-gray-400)' };

                const card = document.createElement('div');
                card.className = 'ui-card';
                card.style.cssText = 'padding:var(--ui-space-3);margin-bottom:var(--ui-space-3);';
                card.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--ui-space-2);">
                        <div>
                            <div style="font-weight:var(--ui-font-bold);font-size:var(--ui-text-sm);">${requesterName}</div>
                            <div style="font-size:var(--ui-text-xs);color:var(--ui-gray-500);">requests ${d.type}: <strong>${d.targetLabel || d.targetKey}</strong></div>
                        </div>
                        <span class="ui-badge" style="background:${statusColors[d.status] || 'var(--ui-gray-400)'};color:white;font-size:var(--ui-text-2xs);">${d.status}</span>
                    </div>
                    ${d.reason ? `<div style="font-size:var(--ui-text-xs);color:var(--ui-gray-600);margin-bottom:var(--ui-space-2);padding:var(--ui-space-2);background:var(--ui-gray-50);border-radius:var(--ui-radius-sm);"><em>"${d.reason}"</em></div>` : ''}
                    <div style="font-size:var(--ui-text-2xs);color:var(--ui-gray-400);">
                        Requested: ${d.createdAt ? new Date(d.createdAt).toLocaleString() : 'N/A'}
                        ${reviewer ? ` | Reviewed by: ${reviewer.get('displayName') || reviewer.get('username')}` : ''}
                        ${d.reviewNotes ? ` | Notes: ${d.reviewNotes}` : ''}
                    </div>
                `;
                stagePanel.appendChild(card);

                // Action buttons for pending requests
                if (d.status === 'pending') {
                    const actionDiv = document.createElement('div');
                    actionDiv.style.cssText = 'display:flex;gap:var(--ui-space-2);margin-top:var(--ui-space-2);';
                    card.appendChild(actionDiv);

                    new uiButtonGroup({
                        parent: actionDiv,
                        buttons: [
                            {
                                label: 'Approve',
                                icon: '<i class="fas fa-check"></i>',
                                color: 'success',
                                size: 'sm',
                                onClick: () => {
                                    const notes = prompt('Approval notes (optional):');
                                    svc.approveAccessRequest(request.idx, notes || undefined);
                                    svc._renderApprovalQueue(container, options);
                                }
                            },
                            {
                                label: 'Deny',
                                icon: '<i class="fas fa-times"></i>',
                                color: 'danger',
                                variant: 'outline',
                                size: 'sm',
                                onClick: () => {
                                    const notes = prompt('Denial reason (optional):');
                                    svc.denyAccessRequest(request.idx, notes || undefined);
                                    svc._renderApprovalQueue(container, options);
                                }
                            }
                        ]
                    });
                }
            });
        }

        renderStage();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // QR Locator Encode / Decode (static utilities)
    // DEPRECATED — use QrService.encodeQRLocator / QrService.decodeQRLocator
    // Kept for backward compatibility with code that doesn't have QR service loaded.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @deprecated Use QrService.encodeQRLocator(prefix, params) instead.
     * Encode a QR locator string from structured params.
     * Format: BT|t=specimen|c=SOIL-2024-003|p=data:specimen:read
     *
     * @param {Object} params
     * @param {string} params.type - Entity type (specimen, equipment, certificate, etc.)
     * @param {string} params.code - Entity code/identifier
     * @param {string} [params.permission] - Required permission string
     * @param {string} [params.service] - Service name override
     * @param {string} [params.extra] - Extra metadata
     * @returns {string} Pipe-delimited QR locator string
     */
    static encodeQRLocator(params) {
        const parts = ['BT', `t=${params.type}`, `c=${params.code}`];
        if (params.permission) parts.push(`p=${params.permission}`);
        if (params.service) parts.push(`s=${params.service}`);
        if (params.extra) parts.push(`x=${params.extra}`);
        return parts.join('|');
    }

    /**
     * @deprecated Use QrService.decodeQRLocator(qrString) instead.
     * Decode a QR locator string into structured params.
     * Returns null if the string is not a valid BT locator.
     *
     * @param {string} str - QR locator string
     * @returns {{ type: string, code: string, permission?: string, service?: string, extra?: string }|null}
     */
    static decodeQRLocator(str) {
        if (!str || !str.startsWith('BT|')) return null;
        const parts = str.split('|').slice(1);
        const result = {};
        parts.forEach(p => {
            const [k, ...v] = p.split('=');
            result[k] = v.join('=');
        });
        return {
            type: result.t,
            code: result.c,
            permission: result.p,
            service: result.s,
            extra: result.x
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Binding Registry & Capability Discovery
    // ─────────────────────────────────────────────────────────────────────────

    getBindingRegistry() {
        const svc = this;
        return [
            {
                key: 'directory',
                label: 'Directory',
                description: 'Searchable member directory with profile cards.',
                type: 'specialized',
                tables: ['member'],
                methods: ['bindCollection'],
                tags: ['browse', 'search', 'directory', 'profiles'],
                intent: 'Browse and search the member directory',
                builder: (svc, container) => { svc.views.renderDirectory(container); }
            },
            {
                key: 'login',
                label: 'Login / Session',
                description: 'Login form with session persistence and user switching.',
                type: 'specialized',
                tables: ['member', 'memberSession'],
                methods: ['bindView', 'bindButton'],
                tags: ['login', 'session', 'authentication', 'identity'],
                intent: 'Authenticate a member and manage session state',
                builder: (svc, container) => { svc.views.renderLogin(container); }
            },
            {
                key: 'profile',
                label: 'Profile Editor',
                description: 'View and edit member profile fields.',
                type: 'crud',
                tables: ['member', 'memberProfile'],
                methods: ['bindEditor', 'bindView'],
                tags: ['profile', 'member', 'edit', 'personal'],
                intent: 'View or update a member profile',
                builder: (svc, container) => { svc.views.renderProfile(container); }
            },
            {
                key: 'roleEditor',
                label: 'Role Editor',
                description: 'CRUD interface for managing role definitions and permission arrays.',
                type: 'crud',
                tables: ['memberRole'],
                methods: ['bindSelectEditor'],
                tags: ['roles', 'permissions', 'management', 'rbac'],
                intent: 'Create and edit roles with permission assignments',
                builder: (svc, container) => { svc.views.renderRoleEditor(container); }
            },
            {
                key: 'roleAssignments',
                label: 'Role Assignments',
                description: 'Assign and remove roles for members via M:N link editor.',
                type: 'crud',
                tables: ['memberRoleLink'],
                methods: ['bindMnEditor'],
                tags: ['roles', 'assignment', 'members', 'rbac'],
                intent: 'Manage which roles are assigned to which members',
                builder: (svc, container) => { svc.views.renderRoleAssignments(container); }
            },
            {
                key: 'permissionMatrix',
                label: 'Permissions',
                description: 'Matrix view of roles vs permissions with toggle controls.',
                type: 'specialized',
                tables: ['memberRole'],
                methods: ['bindToggleList'],
                tags: ['permissions', 'rbac', 'matrix', 'audit'],
                intent: 'View and manage the role-permission matrix',
                builder: (svc, container) => { svc.views.renderPermissionMatrix(container); }
            },
            {
                key: 'apiKeys',
                label: 'API Key Manager',
                description: 'Generate, revoke, and list API keys and webhooks.',
                type: 'specialized',
                tables: ['memberApiKey', 'memberWebhook'],
                methods: ['bindCollection', 'bindEditor'],
                tags: ['api', 'keys', 'webhooks', 'integration', 'security'],
                intent: 'Manage API keys and webhook endpoints for programmatic access',
                builder: (svc, container) => { svc.views.renderApiKeys(container); }
            },
            {
                key: 'accessOverview',
                label: 'Access Overview',
                description: 'Consolidated view of a member\'s effective permissions, role, and scope.',
                type: 'specialized',
                tables: ['member', 'memberRole'],
                methods: ['bindView'],
                tags: ['access', 'overview', 'permissions', 'audit', 'scope'],
                intent: 'Review the complete access profile for a member',
                builder: (svc, container) => { svc.views.renderAccessOverview(container); }
            },
            {
                key: 'oauthProviders',
                label: 'OAuth Providers',
                description: 'Manage OAuth2/OIDC provider configurations for federated authentication.',
                type: 'crud',
                tables: ['memberOAuthProvider'],
                methods: ['bindSelectEditor', 'bindView'],
                tags: ['oauth', 'oidc', 'saml', 'federation', 'identity', 'sso'],
                intent: 'Configure and manage OAuth2/OIDC identity providers',
                builder: (svc, container) => { svc.views.renderOAuthProviders(container); }
            },
            {
                key: 'linkedAccounts',
                label: 'Linked Accounts',
                description: 'View and manage external identity links for a member.',
                type: 'specialized',
                tables: ['memberOAuthLink', 'memberOAuthProvider'],
                methods: ['bindCollection'],
                tags: ['oauth', 'identity', 'accounts', 'federation', 'sso'],
                intent: 'Link or unlink external identity provider accounts',
                builder: (svc, container) => { svc.views.renderLinkedAccounts(container); }
            },
            {
                key: 'sessionManager',
                label: 'Session Manager',
                description: 'View and revoke active sessions across all members.',
                type: 'specialized',
                tables: ['memberSession'],
                methods: ['bindCollection', 'bindMetric'],
                tags: ['sessions', 'security', 'admin', 'revoke'],
                intent: 'Monitor and manage active user sessions',
                builder: (svc, container) => { svc.views.renderSessionManager(container); }
            },
            {
                key: 'loginHistory',
                label: 'Login History',
                description: 'Audit trail of login attempts with method, IP, and success/failure.',
                type: 'specialized',
                tables: ['memberLoginLog'],
                methods: ['bindCollection'],
                tags: ['audit', 'security', 'login', 'history', 'monitoring'],
                intent: 'Review login audit trail for security monitoring',
                builder: (svc, container) => { svc.views.renderLoginHistory(container); }
            },
            {
                key: 'invitations',
                label: 'Invitations',
                description: 'Create and manage member invitations with role assignment.',
                type: 'crud',
                tables: ['memberInvitation'],
                methods: ['bindSelectEditor', 'bindView'],
                tags: ['invite', 'onboarding', 'members', 'admin'],
                intent: 'Invite new members via email with pre-assigned roles',
                builder: (svc, container) => { svc.views.renderInvitations(container); }
            },
            {
                key: 'overrideManager',
                label: 'Permission Overrides',
                description: 'Grant or deny specific permissions per member, overriding role-based defaults.',
                type: 'crud',
                tables: ['memberPermissionOverride'],
                methods: ['bindSelectEditor'],
                tags: ['permissions', 'override', 'grant', 'deny', 'rbac'],
                intent: 'Manage per-member permission grants and denials',
                builder: (svc, container) => {
                    const binding = new UIBinding(svc.table('memberPermissionOverride'), { publome: svc });
                    binding.bindSelectEditor(container, { editor: 'inline' });
                }
            },
            {
                key: 'accountControls',
                label: 'Account Controls',
                description: 'User-facing account hub with profile, sessions, permissions, linked accounts, and API keys.',
                type: 'specialized',
                tables: ['member', 'memberProfile', 'memberSession', 'memberOAuthLink', 'memberApiKey'],
                methods: ['bindCollection', 'bindEditor', 'bindView'],
                tags: ['account', 'profile', 'self-service', 'user', 'settings'],
                intent: 'Manage your own account settings, sessions, and access',
                builder: (svc, container) => { svc.views.renderAccountControls(container); }
            },
            {
                key: 'requestAccess',
                label: 'Request Access',
                description: 'User-facing form to request additional permissions or roles with justification.',
                type: 'specialized',
                tables: ['memberAccessRequest'],
                methods: ['bindCollection'],
                tags: ['access', 'request', 'permissions', 'roles', 'self-service'],
                intent: 'Request additional permissions or roles with a justification',
                builder: (svc, container) => { svc.views.renderRequestAccess(container); }
            },
            {
                key: 'approvalQueue',
                label: 'Approval Queue',
                description: 'Admin view for reviewing, approving, or denying access requests.',
                type: 'specialized',
                tables: ['memberAccessRequest'],
                methods: ['bindCollection', 'bindMetric'],
                tags: ['approval', 'admin', 'requests', 'review', 'rbac'],
                intent: 'Review and approve or deny pending access requests',
                builder: (svc, container) => { svc.views.renderApprovalQueue(container); }
            }
        ];
    }

    getCapabilities() {
        return {
            name: 'member',
            alias: 'Member Service',
            icon: 'fa-user',
            intent: 'Core identity, authentication, RBAC, OAuth2 federation, session management, and scope-based access control.',
            keywords: ['users', 'authentication', 'roles', 'permissions', 'rbac', 'identity', 'login', 'sessions', 'access-control', 'api-keys', 'oauth2', 'oidc', 'saml', 'federation', 'sso', 'invitations', 'audit-log'],
            capabilities: ['rbac', 'session-management', 'permission-matrix', 'scope-based-access', 'group-context', 'api-key-management', 'wildcard-permissions', 'oauth2-federation', 'login-audit', 'member-invitations', 'account-status-management', 'access-request-workflow', 'self-service-account'],
            useCases: [
                'Manage user accounts, profiles, and account status',
                'Define roles with granular permission arrays',
                'Implement row-level security via scope-based access',
                'Authenticate users via direct login or OAuth2/OIDC federation',
                'Generate and manage API keys for programmatic access',
                'Invite new members with pre-assigned roles',
                'Monitor login history and active sessions for security auditing',
                'Link external identity providers (Google, Microsoft, institutional SAML)',
                'Self-service account management (profile, sessions, linked accounts)',
                'Request additional permissions or roles with admin approval workflow'
            ],
            consumers: ['AutoScholar', 'BenchStamp', 'BenchTest', 'EthiKit', 'InfraTrack', 'LibreFlow', 'NeuroCraft', 'NeuroPlay', 'ProjectHub'],
            domainMethods: [
                // ── Identity ──
                { name: 'setCurrentMember', signature: '(memberId)', description: 'Set the current logged-in member', category: 'identity' },
                { name: 'getCurrentMember', signature: '()', description: 'Get the current logged-in member', category: 'identity' },
                { name: 'findMember', signature: '(identifier)', description: 'Find member by username or email', category: 'identity' },
                { name: 'login', signature: '(memberId)', description: 'Login and resolve permissions', category: 'identity' },
                { name: 'logout', signature: '()', description: 'End current session', category: 'identity' },
                { name: 'isLoggedIn', signature: '()', description: 'Check if a member is logged in', category: 'identity' },
                { name: 'tryRestoreSession', signature: '()', description: 'Attempt to restore a persisted session', category: 'identity' },

                // ── Permission Checks ──
                { name: 'hasPermission', signature: '(perm)', description: 'Wildcard-aware permission check', category: 'permissions' },
                { name: 'canView', signature: '(viewCode)', description: 'Check view permission', category: 'permissions' },
                { name: 'canData', signature: '(table, action)', description: 'Check data CRUD permission', category: 'permissions' },
                { name: 'canAction', signature: '(actionCode)', description: 'Check action permission', category: 'permissions' },
                { name: 'getCurrentPermissions', signature: '()', description: 'Get resolved permissions for current session', category: 'permissions' },

                // ── Role Introspection ──
                { name: 'getRoleLevel', signature: '()', description: 'Get numeric level of current role', category: 'roleIntrospection' },
                { name: 'isSupervisor', signature: '()', description: 'Check if current member is supervisor+', category: 'roleIntrospection' },
                { name: 'isAdmin', signature: '()', description: 'Check if current member is admin', category: 'roleIntrospection' },
                { name: 'getCurrentRoleLabel', signature: '()', description: 'Get display label of current role', category: 'roleIntrospection' },
                { name: 'getPermissionRegistry', signature: '()', description: 'Get all registered permissions', category: 'roleIntrospection' },
                { name: 'getPermissionsByCategory', signature: '()', description: 'Get permissions grouped by category', category: 'roleIntrospection' },

                // ── Role Admin ──
                { name: 'getPermissionMatrix', signature: '()', description: 'Get role-permission matrix for admin view', category: 'roleAdmin' },
                { name: 'getRoleDefinitions', signature: '()', description: 'Get all role definitions', category: 'roleAdmin' },
                { name: 'getMemberRoles', signature: '(memberId)', description: 'Get roles assigned to a member', category: 'roleAdmin' },
                { name: 'hasRole', signature: '(memberId, roleName)', description: 'Check if member has a specific role', category: 'roleAdmin' },
                { name: 'assignRole', signature: '(memberId, roleId, grantedBy)', description: 'Assign a role to a member', category: 'roleAdmin' },
                { name: 'removeRole', signature: '(memberId, roleId)', description: 'Remove a role from a member', category: 'roleAdmin' },

                // ── Profile ──
                { name: 'getProfile', signature: '(memberId)', description: 'Get extended profile data', category: 'profile' },
                { name: 'updateProfile', signature: '(memberId, data)', description: 'Update profile fields', category: 'profile' },

                // ── Permission Overrides ──
                { name: 'getMemberOverrides', signature: '(memberId)', description: 'Get permission overrides for a member', category: 'overrides' },
                { name: 'addPermissionOverride', signature: '(memberId, permission, type, options)', description: 'Add a grant/deny override', category: 'overrides' },
                { name: 'removePermissionOverride', signature: '(overrideIdx)', description: 'Remove an override', category: 'overrides' },
                { name: 'getEffectivePermissions', signature: '(memberId)', description: 'Compute effective permissions (role + overrides)', category: 'overrides' },

                // ── Group-Context Scoping ──
                { name: 'bindGroupContext', signature: '(groupService, scopeRules)', description: 'Link a GroupService for scope-based access', category: 'scoping' },
                { name: 'isContextBound', signature: '()', description: 'Check if group context is bound', category: 'scoping' },
                { name: 'getGroupService', signature: '()', description: 'Get the bound GroupService', category: 'scoping' },
                { name: 'getScopeRules', signature: '()', description: 'Get configured scope rules', category: 'scoping' },
                { name: 'getMemberScope', signature: '(memberId, scopeKey)', description: 'Resolve scope for a member and key', category: 'scoping' },
                { name: 'hasScopeAccess', signature: '(memberId, scopeKey, code)', description: 'Check access to a specific scope code', category: 'scoping' },
                { name: 'canViewInScope', signature: '(viewCode, scopeCode)', description: 'Combined permission + scope check', category: 'scoping' },
                { name: 'getScopeGroupsForMember', signature: '(memberId, groupType)', description: 'Get groups of a type for a member', category: 'scoping' },
                { name: 'getMemberScopeSummary', signature: '(memberId)', description: 'Get full scope summary across all keys', category: 'scoping' },

                // ── System Binding ──
                { name: 'bindToSystem', signature: '(config)', description: 'Bind RBAC to a system configuration', category: 'system' },

                // ── API Keys ──
                { name: 'generateApiKey', signature: '(memberId, name, scopes, options)', description: 'Generate a new API key', category: 'apiKeys' },
                { name: 'revokeApiKey', signature: '(keyIdx, revokedBy)', description: 'Revoke an API key', category: 'apiKeys' },
                { name: 'getApiKeysForMember', signature: '(memberId, status)', description: 'List API keys for a member', category: 'apiKeys' },
                { name: 'getWebhooksForMember', signature: '(memberId, apiKeyId)', description: 'List webhooks for a member\'s key', category: 'apiKeys' },

                // ── Session Management ──
                { name: 'getActiveSessions', signature: '(memberId?)', description: 'Get active sessions, optionally for a member', category: 'sessions' },
                { name: 'revokeSession', signature: '(sessionIdx)', description: 'Revoke a specific session', category: 'sessions' },
                { name: 'revokeAllSessions', signature: '(memberId)', description: 'Force logout from all sessions', category: 'sessions' },

                // ── Member Status ──
                { name: 'setMemberStatus', signature: '(memberId, status, reason)', description: 'Change account status (active/inactive/suspended/pending)', category: 'admin' },
                { name: 'getMembersByStatus', signature: '(status)', description: 'Get members filtered by status', category: 'admin' },

                // ── OAuth2 / Federation ──
                { name: 'registerOAuthProvider', signature: '(config)', description: 'Register an OAuth2/OIDC provider', category: 'oauth' },
                { name: 'getOAuthProviders', signature: '(status?)', description: 'List registered OAuth providers', category: 'oauth' },
                { name: 'initiateOAuthFlow', signature: '(providerId, redirectUri, options?)', description: 'Generate OAuth authorization URL', category: 'oauth' },
                { name: 'handleOAuthCallback', signature: '(code, state, tokenResponse, userInfo)', description: 'Handle OAuth callback and create/login member', category: 'oauth' },
                { name: 'linkExternalIdentity', signature: '(memberId, providerId, externalId, info?)', description: 'Manually link an external identity', category: 'oauth' },
                { name: 'unlinkExternalIdentity', signature: '(linkIdx)', description: 'Unlink an external identity', category: 'oauth' },
                { name: 'getExternalIdentities', signature: '(memberId)', description: 'Get linked external accounts', category: 'oauth' },
                { name: 'revokeAllOAuthTokens', signature: '(memberId)', description: 'Revoke all OAuth tokens for a member', category: 'oauth' },

                // ── Invitations ──
                { name: 'createInvitation', signature: '(email, roleId?, options?)', description: 'Create a member invitation', category: 'invitations' },
                { name: 'acceptInvitation', signature: '(token, memberData)', description: 'Accept invitation and create account', category: 'invitations' },
                { name: 'getPendingInvitations', signature: '()', description: 'Get pending invitations', category: 'invitations' },
                { name: 'revokeInvitation', signature: '(invitationIdx)', description: 'Revoke a pending invitation', category: 'invitations' },

                // ── Login Audit ──
                { name: 'recordLoginAttempt', signature: '(entry)', description: 'Record a login attempt in audit log', category: 'audit' },
                { name: 'getLoginHistory', signature: '(memberId, limit?)', description: 'Get login history for a member', category: 'audit' },
                { name: 'getRecentFailedLogins', signature: '(minutes?)', description: 'Get recent failed logins for security monitoring', category: 'audit' },

                // ── Access Requests ──
                { name: 'requestAccess', signature: '(type, targetKey, reason, options?)', description: 'Submit a permission or role request', category: 'accessRequests' },
                { name: 'approveAccessRequest', signature: '(requestIdx, notes?)', description: 'Approve a pending access request', category: 'accessRequests' },
                { name: 'denyAccessRequest', signature: '(requestIdx, notes?)', description: 'Deny a pending access request', category: 'accessRequests' },
                { name: 'cancelAccessRequest', signature: '(requestIdx)', description: 'Cancel own pending request', category: 'accessRequests' },
                { name: 'getAccessRequests', signature: '(filters?)', description: 'Get access requests with optional filters', category: 'accessRequests' },
                { name: 'getPendingRequestCount', signature: '()', description: 'Get count of pending requests', category: 'accessRequests' },
                { name: 'getRequestablePermissions', signature: '()', description: 'Get permissions the current user can request', category: 'accessRequests' },
                { name: 'getRequestableRoles', signature: '()', description: 'Get roles the current user can request', category: 'accessRequests' }
            ],
            bindings: this.getBindingRegistry()
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemberService, MemberServiceSchema };
}
