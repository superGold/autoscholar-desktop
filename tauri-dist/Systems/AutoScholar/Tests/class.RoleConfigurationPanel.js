/**
 * RoleConfigurationPanel - AutoScholar role & permission template editor
 *
 * Compound-pattern panel (render(controlEl, stageEl)) that provides:
 * - Visual role browser with level indicators and permission counts
 * - Per-role permission editor (grouped checkboxes with select-all)
 * - Permission coverage heatmap across all roles
 * - Role comparison (side-by-side diff)
 * - Member assignment view per role
 * - Role CRUD (create, clone, delete)
 *
 * Integrates with MemberService (RBAC) and UserManagementPanel.RBAC_CONFIG.
 *
 * Usage:
 *   const panel = new RoleConfigurationPanel();
 *   panel.render(controlEl, stageEl);
 */
class RoleConfigurationPanel {

    // ── Level colors & labels ────────────────────────────────────────────────

    static LEVEL_COLORS = {
        1: { bg: 'var(--as-level-1-bg)', border: 'var(--as-level-1-border)', text: 'var(--as-level-1-text)', label: 'Super Admin' },
        2: { bg: 'var(--as-level-2-bg)', border: 'var(--as-level-2-border)', text: 'var(--as-level-2-text)', label: 'Admin' },
        3: { bg: 'var(--as-level-3-bg)', border: 'var(--as-level-3-border)', text: 'var(--as-level-3-text)', label: 'Supervisor' },
        4: { bg: 'var(--as-level-4-bg)', border: 'var(--as-level-4-border)', text: 'var(--as-level-4-text)', label: 'Staff' },
        5: { bg: 'var(--as-level-5-bg)', border: 'var(--as-level-5-border)', text: 'var(--as-level-5-text)', label: 'Basic' },
        6: { bg: 'var(--as-level-6-bg)', border: 'var(--as-level-6-border)', text: 'var(--as-level-6-text)', label: 'Restricted' }
    };

    static PERM_GROUP_ICONS = {
        classroom: 'fa-chalkboard-teacher', student: 'fa-user-graduate',
        programme: 'fa-sitemap', casework: 'fa-clipboard-list',
        accreditation: 'fa-certificate', executive: 'fa-chart-line',
        admin: 'fa-cogs', tools: 'fa-wrench', advanced: 'fa-brain'
    };

    static PERM_GROUP_COLORS = {
        classroom: 'var(--as-perm-classroom)', student: 'var(--as-perm-student)', programme: 'var(--as-perm-programme)',
        casework: 'var(--as-perm-casework)', accreditation: 'var(--as-perm-accreditation)', executive: 'var(--as-perm-executive)',
        admin: 'var(--as-perm-admin)', tools: 'var(--as-perm-tools)', advanced: 'var(--as-perm-advanced)'
    };

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(config = {}) {
        this._controlEl = null;
        this._stageEl = null;
        this._accordion = null;
        this._statusBadge = null;
        this._selectedRoleIdx = null;
        this._compareRoleIdx = null;

        this._memberService = null;
        this._groupService = null;
        this._bound = false;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._initServices();
        this._buildControl();
        this._renderDashboard();
    }

    // ── Service Initialization ───────────────────────────────────────────────

    _initServices() {
        this._memberService = new MemberService();
        this._groupService = new GroupService();

        // Use the RBAC config from UserManagementPanel if available
        const config = (typeof UserManagementPanel !== 'undefined')
            ? UserManagementPanel.RBAC_CONFIG
            : this._defaultConfig();

        this._memberService.bindToSystem(config);
        this._memberService.bindGroupContext(
            this._groupService,
            (typeof UserManagementPanel !== 'undefined') ? UserManagementPanel.SCOPE_RULES : {}
        );

        this._bound = true;
    }

    _defaultConfig() {
        return {
            permissions: { view: {}, action: {} },
            roles: {
                admin:  { label: 'Administrator', level: 1, permissions: ['*'] },
                viewer: { label: 'Viewer',        level: 5, permissions: ['data:*:read', 'view:*'] }
            }
        };
    }

    _getRbacConfig() {
        return (typeof UserManagementPanel !== 'undefined')
            ? UserManagementPanel.RBAC_CONFIG
            : this._defaultConfig();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    _getLevelStyle(level) {
        return RoleConfigurationPanel.LEVEL_COLORS[level]
            || RoleConfigurationPanel.LEVEL_COLORS[6];
    }

    _getPermCount(rolePerms) {
        if (!rolePerms || !rolePerms.length) return 0;
        if (rolePerms.includes('*')) return '&#x221e;'; // infinity
        return rolePerms.length;
    }

    _resolveRolePerms(roleRecord) {
        let perms = roleRecord.get('permissions');
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { perms = []; }
        }
        return Array.isArray(perms) ? perms : [];
    }

    _getAllPermCodes() {
        const registry = this._memberService.getPermissionRegistry();
        const codes = [];
        for (const catPerms of Object.values(registry)) {
            for (const code of Object.keys(catPerms)) {
                codes.push(code);
            }
        }
        return codes;
    }

    /**
     * Group permission codes by their second segment (e.g. 'classroom' from 'view:classroom:risk').
     * Returns { groupKey: [{ code, label, category }] }
     */
    _groupPermissions() {
        const registry = this._memberService.getPermissionRegistry();
        const grouped = {};

        for (const [cat, perms] of Object.entries(registry)) {
            for (const [code, def] of Object.entries(perms)) {
                const parts = code.split(':');
                // view:classroom:risk → group='classroom', action:export → group='action'
                let groupKey;
                if (cat === 'view' && parts.length >= 3) {
                    groupKey = parts[1]; // 'classroom', 'student', etc.
                } else if (cat === 'action') {
                    groupKey = '_actions';
                } else {
                    groupKey = '_data';
                }
                if (!grouped[groupKey]) grouped[groupKey] = [];
                grouped[groupKey].push({ code, label: def.label || code, category: cat });
            }
        }

        return grouped;
    }

    // ── Control Panel ────────────────────────────────────────────────────────

    _buildControl() {
        this._controlEl.innerHTML = '';

        // Status
        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'rc-badge-wrap';
        this._controlEl.appendChild(badgeWrap);
        this._statusBadge = new uiBadge({
            label: `${this._memberService.table('memberRole').all().length} roles`,
            color: 'primary',
            size: 'sm',
            parent: badgeWrap
        });

        // Accordion
        const accWrap = document.createElement('div');
        this._controlEl.appendChild(accWrap);
        this._accordion = new uiAccordion({
            parent: accWrap,
            exclusive: true,
            content: {
                roles:   { label: '<i class="fas fa-shield-alt" style="margin-right:0.3rem;"></i>Roles', open: true },
                actions: { label: '<i class="fas fa-bolt" style="margin-right:0.3rem;"></i>Actions' },
                stats:   { label: '<i class="fas fa-chart-pie" style="margin-right:0.3rem;"></i>Coverage' }
            }
        });

        this._renderRolesPane();
        this._renderActionsPane();
        this._renderCoveragePane();
    }

    _renderRolesPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="roles"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        const ms = this._memberService;
        const roles = ms.table('memberRole').all()
            .sort((a, b) => (a.get('level') || 99) - (b.get('level') || 99));

        if (roles.length === 0) {
            el.innerHTML = '<div class="ui-text-xs rc-no-data-sm">No roles defined.</div>';
            return;
        }

        roles.forEach(role => {
            const perms = this._resolveRolePerms(role);
            const permCount = this._getPermCount(perms);
            const level = role.get('level') || 99;
            const ls = this._getLevelStyle(level);
            const isSelected = this._selectedRoleIdx === role.idx;
            const isSystem = role.get('isSystem');

            // Count members with this role
            const memberLinks = ms.table('memberRoleLink').all().filter(l => l.get('roleId') === role.idx);

            const item = document.createElement('div');
            item.className = `ui-flex ui-items-center ui-gap-2 as-rounded-md as-hover-row`;
            item.style.cssText = `padding:0.35rem 0.5rem;margin-bottom:0.2rem;border:1px solid ${isSelected ? ls.border : 'transparent'};background:${isSelected ? ls.bg : 'transparent'};`;
            item.innerHTML = `
                <div class="as-level-badge as-level-badge-sm" style="background:${ls.bg};border:1px solid ${ls.border};color:${ls.text};">${level}</div>
                <div class="as-flex-1 as-min-w-0">
                    <div class="as-truncate ui-font-semibold rc-role-name-text">
                        ${role.get('name')}
                        ${isSystem ? '<span class="rc-sys-tag">SYS</span>' : ''}
                    </div>
                    <div class="rc-sub-label">${permCount} perms &middot; ${memberLinks.length} users</div>
                </div>
            `;
            item.onclick = () => {
                this._selectedRoleIdx = role.idx;
                this._renderRolesPane();
                this._renderRoleDetail(role.idx);
            };
            el.appendChild(item);
        });
    }

    _renderActionsPane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="actions"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        const btnWrap = document.createElement('div');
        btnWrap.className = 'ui-flex ui-flex-col ui-gap-1';
        el.appendChild(btnWrap);

        const btns = [
            { label: 'New Role', icon: 'fa-plus', color: 'primary', fn: () => this._showNewRoleForm() },
            { label: 'Reload from Config', icon: 'fa-sync-alt', color: 'secondary', fn: () => {
                this._initServices();
                this._statusBadge.update({ label: `${this._memberService.table('memberRole').all().length} roles`, color: 'primary' });
                this._renderRolesPane();
                this._renderCoveragePane();
                this._renderDashboard();
            }},
            { label: 'Dashboard', icon: 'fa-th-large', color: 'secondary', fn: () => {
                this._selectedRoleIdx = null;
                this._renderRolesPane();
                this._renderDashboard();
            }}
        ];

        btns.forEach(b => {
            const d = document.createElement('div');
            btnWrap.appendChild(d);
            new uiButtonGroup({
                parent: d,
                buttons: [{
                    label: b.label,
                    icon: `<i class="fas ${b.icon}"></i>`,
                    color: b.color,
                    variant: b.color === 'primary' ? 'solid' : 'outline',
                    size: 'sm',
                    onClick: b.fn
                }]
            });
        });
    }

    _renderCoveragePane() {
        const el = this._accordion.el.querySelector('.ui-accordion-item[data-key="stats"] .ui-accordion-content');
        if (!el) return;
        el.innerHTML = '';

        const ms = this._memberService;
        const allPerms = this._getAllPermCodes();
        const roles = ms.table('memberRole').all();
        const config = this._getRbacConfig();

        // For each perm: how many roles grant it?
        const permCoverage = {};
        allPerms.forEach(perm => {
            let count = 0;
            roles.forEach(role => {
                const rPerms = this._resolveRolePerms(role);
                if (MemberService.roleHasPermission(rPerms, perm)) count++;
            });
            permCoverage[perm] = count;
        });

        const covered = allPerms.filter(p => permCoverage[p] > 0).length;
        const total = allPerms.length;
        const pct = total > 0 ? Math.round(covered / total * 100) : 0;

        // Summary
        const summary = document.createElement('div');
        summary.className = 'rc-summary-gap';
        summary.innerHTML = `
            <div class="ui-flex ui-justify-between rc-coverage-label">
                <span>Coverage</span><span>${covered}/${total} (${pct}%)</span>
            </div>
            <div class="as-progress-track as-progress-track-md">
                <div class="as-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--as-brand-navy),var(--as-perm-student));"></div>
            </div>
        `;
        el.appendChild(summary);

        // Uncovered permissions
        const uncovered = allPerms.filter(p => permCoverage[p] === 0);
        if (uncovered.length > 0 && uncovered.length <= 15) {
            const uncTitle = document.createElement('div');
            uncTitle.className = 'ui-font-bold rc-uncovered-title';
            uncTitle.textContent = `Uncovered (${uncovered.length})`;
            el.appendChild(uncTitle);

            uncovered.forEach(p => {
                const chip = document.createElement('div');
                chip.className = 'as-truncate rc-uncovered-chip';
                chip.textContent = p.split(':').slice(1).join(':');
                el.appendChild(chip);
            });
        } else if (uncovered.length > 15) {
            const note = document.createElement('div');
            note.className = 'rc-uncovered-note';
            note.textContent = `${uncovered.length} permissions not assigned to any role`;
            el.appendChild(note);
        }

        // Per-category mini bars
        const categories = {};
        allPerms.forEach(p => {
            const cat = p.split(':')[0];
            if (!categories[cat]) categories[cat] = { total: 0, covered: 0 };
            categories[cat].total++;
            if (permCoverage[p] > 0) categories[cat].covered++;
        });

        const catColors = { view: 'var(--as-status-connected-color)', action: 'var(--as-status-testing-color)', data: 'var(--as-status-configured-color)' };
        Object.entries(categories).forEach(([cat, info]) => {
            const catPct = info.total > 0 ? Math.round(info.covered / info.total * 100) : 0;
            const row = document.createElement('div');
            row.className = 'rc-cat-gap';
            row.innerHTML = `
                <div class="ui-flex ui-justify-between rc-cat-label">
                    <span>${cat}</span><span>${catPct}%</span>
                </div>
                <div class="as-progress-track as-progress-track-sm">
                    <div class="as-progress-fill" style="width:${catPct}%;background:${catColors[cat] || 'var(--as-muted)'};"></div>
                </div>
            `;
            el.appendChild(row);
        });
    }

    // ── Stage: Dashboard ─────────────────────────────────────────────────────

    _renderDashboard() {
        this._stageEl.innerHTML = '';
        const ms = this._memberService;
        const roles = ms.table('memberRole').all()
            .sort((a, b) => (a.get('level') || 99) - (b.get('level') || 99));
        const allPerms = this._getAllPermCodes();
        const config = this._getRbacConfig();

        const wrap = document.createElement('div');
        wrap.className = 'rc-stage-wrap';
        this._stageEl.appendChild(wrap);

        // Header
        const header = document.createElement('div');
        header.className = 'ui-flex ui-items-center ui-gap-2 rc-stage-header';
        header.innerHTML = `
            <i class="fas fa-user-shield" style="font-size:1.5rem;color:var(--as-brand-navy);"></i>
            <div>
                <div class="ui-font-bold ui-text-base">Role Configuration</div>
                <div class="ui-text-xs" style="color:var(--as-text-secondary);">${roles.length} roles &middot; ${allPerms.length} permission codes</div>
            </div>
        `;
        wrap.appendChild(header);

        // KPI row
        const kpiRow = document.createElement('div');
        kpiRow.className = 'as-kpi-row';
        wrap.appendChild(kpiRow);

        const memberCount = ms.table('member').all().length;
        const linkCount = ms.table('memberRoleLink').all().length;
        const covered = allPerms.filter(p => {
            return roles.some(r => MemberService.roleHasPermission(this._resolveRolePerms(r), p));
        }).length;
        const coveragePct = allPerms.length > 0 ? Math.round(covered / allPerms.length * 100) : 0;

        [
            { label: 'Roles', value: roles.length, icon: 'fa-shield-alt', color: 'var(--as-brand-navy)' },
            { label: 'Permissions', value: allPerms.length, icon: 'fa-key', color: 'var(--as-perm-student)' },
            { label: 'Coverage', value: `${coveragePct}%`, icon: 'fa-check-double', color: coveragePct >= 90 ? 'var(--as-status-connected-color)' : coveragePct >= 70 ? 'var(--as-status-testing-color)' : 'var(--as-status-error-color)' },
            { label: 'Assignments', value: linkCount, icon: 'fa-user-tag', color: 'var(--as-perm-programme)' },
            { label: 'Users', value: memberCount, icon: 'fa-users', color: 'var(--as-perm-casework)' }
        ].forEach(k => {
            const card = document.createElement('div');
            card.className = 'rc-kpi-card';
            card.innerHTML = `
                <i class="fas ${k.icon}" style="color:${k.color};font-size:0.9rem;"></i>
                <div class="ui-font-bold" style="font-size:1.1rem;color:${k.color};margin-top:0.15rem;">${k.value}</div>
                <div class="rc-sub-label">${k.label}</div>
            `;
            kpiRow.appendChild(card);
        });

        // Tabs
        const tabWrap = document.createElement('div');
        wrap.appendChild(tabWrap);
        const contentWrap = document.createElement('div');
        wrap.appendChild(contentWrap);

        const tabs = new uiTabs({
            parent: tabWrap,
            tabs: [
                { label: 'Role Cards', icon: '<i class="fas fa-th-large"></i>' },
                { label: 'Permission Matrix', icon: '<i class="fas fa-border-all"></i>' },
                { label: 'Coverage Heatmap', icon: '<i class="fas fa-fire"></i>' },
                { label: 'Role Comparison', icon: '<i class="fas fa-columns"></i>' }
            ]
        });

        const renderTab = (index) => {
            contentWrap.innerHTML = '';
            switch (index) {
                case 0: this._renderRoleCards(contentWrap); break;
                case 1: this._renderMatrix(contentWrap); break;
                case 2: this._renderHeatmap(contentWrap); break;
                case 3: this._renderComparison(contentWrap); break;
            }
        };

        tabs.bus.on('tab-changed', ({ index }) => renderTab(index));
        renderTab(0);
    }

    // ── Dashboard Tab: Role Cards ────────────────────────────────────────────

    _renderRoleCards(container) {
        const ms = this._memberService;
        const roles = ms.table('memberRole').all()
            .sort((a, b) => (a.get('level') || 99) - (b.get('level') || 99));
        const config = this._getRbacConfig();
        const allPerms = this._getAllPermCodes();
        const grouped = this._groupPermissions();

        roles.forEach(role => {
            const perms = this._resolveRolePerms(role);
            const level = role.get('level') || 99;
            const ls = this._getLevelStyle(level);
            const memberLinks = ms.table('memberRoleLink').all().filter(l => l.get('roleId') === role.idx);

            // Find matching config role for description
            const matchKey = Object.keys(config.roles || {}).find(k => config.roles[k].label === role.get('name'));
            const desc = matchKey ? config.roles[matchKey].description : role.get('description') || '';

            // Per-group granted counts
            const groupCounts = {};
            for (const [gKey, gPerms] of Object.entries(grouped)) {
                const granted = gPerms.filter(p => MemberService.roleHasPermission(perms, p.code)).length;
                groupCounts[gKey] = { granted, total: gPerms.length };
            }

            const card = document.createElement('div');
            card.className = 'as-hover-card as-rounded-lg rc-card-border-left';
            card.style.cssText = `border:1px solid ${ls.border};border-left:4px solid ${ls.border};`;
            card.onclick = () => {
                this._selectedRoleIdx = role.idx;
                this._renderRolesPane();
                this._renderRoleDetail(role.idx);
            };

            // Header row
            const hdr = document.createElement('div');
            hdr.className = 'ui-flex ui-items-center ui-justify-between rc-card-header-gap';
            hdr.innerHTML = `
                <div class="ui-flex ui-items-center ui-gap-2">
                    <div class="as-level-badge as-level-badge-md" style="background:${ls.bg};border:1px solid ${ls.border};color:${ls.text};">${level}</div>
                    <div>
                        <div class="ui-font-bold" style="font-size:0.85rem;">${role.get('name')}</div>
                        <div class="rc-sub-label">${ls.label} &middot; ${memberLinks.length} user${memberLinks.length !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                <span class="as-status-pill" style="background:${ls.bg};color:${ls.text};border-color:${ls.border};font-size:0.6rem;">${this._getPermCount(perms)} perms</span>
            `;
            card.appendChild(hdr);

            if (desc) {
                const descEl = document.createElement('div');
                descEl.className = 'rc-role-desc';
                descEl.textContent = desc;
                card.appendChild(descEl);
            }

            // Permission group bars
            const barsWrap = document.createElement('div');
            barsWrap.className = 'ui-flex ui-flex-wrap ui-gap-1';
            card.appendChild(barsWrap);

            for (const [gKey, counts] of Object.entries(groupCounts)) {
                if (gKey.startsWith('_')) continue; // skip _actions, _data for now
                const pct = counts.total > 0 ? Math.round(counts.granted / counts.total * 100) : 0;
                if (pct === 0) continue;

                const color = RoleConfigurationPanel.PERM_GROUP_COLORS[gKey] || 'var(--as-text-secondary)';
                const chip = document.createElement('span');
                chip.className = 'as-perm-chip';
                chip.style.cssText = `background:${ls.bg};color:${color};border-color:transparent;`;
                chip.innerHTML = `<i class="fas ${RoleConfigurationPanel.PERM_GROUP_ICONS[gKey] || 'fa-circle'}" style="font-size:0.45rem;"></i>${gKey} ${counts.granted}/${counts.total}`;
                barsWrap.appendChild(chip);
            }

            // Action perms
            if (groupCounts._actions) {
                const ac = groupCounts._actions;
                if (ac.granted > 0) {
                    const chip = document.createElement('span');
                    chip.className = 'as-perm-chip rc-perm-chip-action';
                    chip.innerHTML = `<i class="fas fa-bolt" style="font-size:0.45rem;"></i>actions ${ac.granted}/${ac.total}`;
                    barsWrap.appendChild(chip);
                }
            }

            container.appendChild(card);
        });
    }

    // ── Dashboard Tab: Permission Matrix ─────────────────────────────────────

    _renderMatrix(container) {
        this._memberService.views.renderPermissionMatrix(container);
    }

    // ── Dashboard Tab: Coverage Heatmap ──────────────────────────────────────

    _renderHeatmap(container) {
        const ms = this._memberService;
        const roles = ms.table('memberRole').all()
            .sort((a, b) => (a.get('level') || 99) - (b.get('level') || 99));
        const grouped = this._groupPermissions();

        const desc = document.createElement('div');
        desc.className = 'rc-desc-text';
        desc.textContent = 'Cell intensity shows what percentage of permissions in each group are granted to each role. Darker = more coverage.';
        container.appendChild(desc);

        // Build heatmap table
        const tableWrap = document.createElement('div');
        tableWrap.className = 'rc-heatmap-wrap';
        container.appendChild(tableWrap);

        const table = document.createElement('table');
        table.className = 'rc-heatmap-table';

        // Header
        const thead = document.createElement('thead');
        const hRow = document.createElement('tr');
        hRow.innerHTML = '<th class="rc-heatmap-th">Group</th>';
        roles.forEach(r => {
            const level = r.get('level') || 99;
            const ls = this._getLevelStyle(level);
            hRow.innerHTML += `<th class="rc-heatmap-th-role">
                <span style="background:${ls.bg};color:${ls.text};border:1px solid ${ls.border};padding:0.1rem 0.3rem;border-radius:3px;font-size:0.55rem;">${r.get('name')}</span>
            </th>`;
        });
        thead.appendChild(hRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        // Group order
        const groupOrder = ['classroom', 'student', 'programme', 'casework', 'accreditation', 'executive', 'admin', 'tools', 'advanced', '_actions'];

        groupOrder.forEach(gKey => {
            const perms = grouped[gKey];
            if (!perms || perms.length === 0) return;

            const tr = document.createElement('tr');
            const icon = RoleConfigurationPanel.PERM_GROUP_ICONS[gKey] || (gKey === '_actions' ? 'fa-bolt' : 'fa-circle');
            const color = RoleConfigurationPanel.PERM_GROUP_COLORS[gKey] || '#666';
            const label = gKey === '_actions' ? 'Actions' : gKey;

            tr.innerHTML = `<td class="rc-heatmap-td-group" style="color:${color};">
                <i class="fas ${icon}" style="margin-right:0.3rem;font-size:0.55rem;"></i>${label} <span class="rc-group-count-dim">(${perms.length})</span>
            </td>`;

            roles.forEach(r => {
                const rPerms = this._resolveRolePerms(r);
                const granted = perms.filter(p => MemberService.roleHasPermission(rPerms, p.code)).length;
                const pct = Math.round(granted / perms.length * 100);

                // Color intensity: 0% = white, 100% = deep navy
                const intensity = pct / 100;
                const r1 = Math.round(255 - intensity * (255 - 26));
                const g1 = Math.round(255 - intensity * (255 - 35));
                const b1 = Math.round(255 - intensity * (255 - 126));
                const textColor = intensity > 0.5 ? 'white' : '#333';

                tr.innerHTML += `<td class="rc-heatmap-td-cell" style="background:rgb(${r1},${g1},${b1});color:${textColor};font-weight:${pct > 0 ? '600' : '400'};">
                    ${pct > 0 ? `${pct}%` : '&mdash;'}
                </td>`;
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableWrap.appendChild(table);
    }

    // ── Dashboard Tab: Role Comparison ────────────────────────────────────────

    _renderComparison(container) {
        const ms = this._memberService;
        const roles = ms.table('memberRole').all()
            .sort((a, b) => (a.get('level') || 99) - (b.get('level') || 99));

        if (roles.length < 2) {
            container.innerHTML = '<div class="rc-no-data">Need at least 2 roles to compare.</div>';
            return;
        }

        // Selectors
        const selectorRow = document.createElement('div');
        selectorRow.className = 'ui-flex ui-items-center ui-gap-3 rc-stage-header';

        const makeSelect = (selected) => {
            const sel = document.createElement('select');
            sel.className = 'rc-compare-select';
            roles.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.idx;
                opt.textContent = `${r.get('name')} (Level ${r.get('level') || '?'})`;
                if (r.idx === selected) opt.selected = true;
                sel.appendChild(opt);
            });
            return sel;
        };

        const selA = makeSelect(roles[0]?.idx);
        const selB = makeSelect(roles.length > 1 ? roles[1].idx : roles[0]?.idx);

        const labelA = document.createElement('span');
        labelA.className = 'ui-font-semibold rc-compare-label';
        labelA.textContent = 'Role A:';
        const vsLabel = document.createElement('span');
        vsLabel.className = 'rc-compare-vs';
        vsLabel.textContent = 'vs';
        const labelB = document.createElement('span');
        labelB.className = 'ui-font-semibold rc-compare-label';
        labelB.textContent = 'Role B:';

        selectorRow.appendChild(labelA);
        selectorRow.appendChild(selA);
        selectorRow.appendChild(vsLabel);
        selectorRow.appendChild(labelB);
        selectorRow.appendChild(selB);

        container.appendChild(selectorRow);

        const diffWrap = document.createElement('div');
        container.appendChild(diffWrap);

        const renderDiff = () => {
            diffWrap.innerHTML = '';
            const roleA = ms.table('memberRole').read(Number(selA.value));
            const roleB = ms.table('memberRole').read(Number(selB.value));
            if (!roleA || !roleB) return;

            const permsA = this._resolveRolePerms(roleA);
            const permsB = this._resolveRolePerms(roleB);
            const allPerms = this._getAllPermCodes();

            const onlyA = [];
            const onlyB = [];
            const both = [];
            const neither = [];

            allPerms.forEach(p => {
                const hasA = MemberService.roleHasPermission(permsA, p);
                const hasB = MemberService.roleHasPermission(permsB, p);
                if (hasA && hasB) both.push(p);
                else if (hasA) onlyA.push(p);
                else if (hasB) onlyB.push(p);
                else neither.push(p);
            });

            // Summary
            const sumRow = document.createElement('div');
            sumRow.className = 'ui-flex ui-gap-2 ui-flex-wrap rc-diff-summary';
            sumRow.innerHTML = `
                <span class="as-rounded-sm ui-font-semibold rc-diff-pill rc-diff-pill-shared">Shared: ${both.length}</span>
                <span class="as-rounded-sm ui-font-semibold rc-diff-pill rc-diff-pill-only-a">Only ${roleA.get('name')}: ${onlyA.length}</span>
                <span class="as-rounded-sm ui-font-semibold rc-diff-pill rc-diff-pill-only-b">Only ${roleB.get('name')}: ${onlyB.length}</span>
                <span class="as-rounded-sm rc-diff-pill rc-diff-pill-neither">Neither: ${neither.length}</span>
            `;
            diffWrap.appendChild(sumRow);

            // Diff table
            const grouped = this._groupPermissions();
            const groupOrder = ['classroom', 'student', 'programme', 'casework', 'accreditation', 'executive', 'admin', 'tools', 'advanced', '_actions'];

            groupOrder.forEach(gKey => {
                const perms = grouped[gKey];
                if (!perms) return;

                // Filter to only perms where there's a difference
                const diffPerms = perms.filter(p => {
                    const hasA = MemberService.roleHasPermission(permsA, p.code);
                    const hasB = MemberService.roleHasPermission(permsB, p.code);
                    return hasA || hasB; // show anything either has
                });
                if (diffPerms.length === 0) return;

                const label = gKey === '_actions' ? 'Actions' : gKey;
                const color = RoleConfigurationPanel.PERM_GROUP_COLORS[gKey] || '#666';
                const section = document.createElement('div');
                section.className = 'rc-diff-section';
                section.innerHTML = `<div class="rc-diff-section-header" style="color:${color};">${label}</div>`;

                diffPerms.forEach(p => {
                    const hasA = MemberService.roleHasPermission(permsA, p.code);
                    const hasB = MemberService.roleHasPermission(permsB, p.code);

                    let bgClass = '';
                    let iconA, iconB;
                    if (hasA && hasB) {
                        iconA = '<i class="fas fa-check" style="color:var(--ex-clr-success);"></i>';
                        iconB = '<i class="fas fa-check" style="color:var(--ex-clr-success);"></i>';
                    } else if (hasA) {
                        iconA = '<i class="fas fa-check" style="color:var(--ex-clr-success);"></i>';
                        iconB = '<i class="fas fa-times" style="color:var(--ui-gray-300);"></i>';
                        bgClass = ' rc-diff-row-a';
                    } else {
                        iconA = '<i class="fas fa-times" style="color:var(--ui-gray-300);"></i>';
                        iconB = '<i class="fas fa-check" style="color:var(--ex-clr-success);"></i>';
                        bgClass = ' rc-diff-row-b';
                    }

                    const row = document.createElement('div');
                    row.className = `rc-diff-row${bgClass}`;
                    row.innerHTML = `
                        <span class="rc-diff-icon">${iconA}</span>
                        <span class="rc-diff-label">${p.label}</span>
                        <span class="rc-diff-icon">${iconB}</span>
                    `;
                    section.appendChild(row);
                });

                diffWrap.appendChild(section);
            });
        };

        selA.onchange = renderDiff;
        selB.onchange = renderDiff;
        renderDiff();
    }

    // ── Stage: Role Detail ───────────────────────────────────────────────────

    _renderRoleDetail(roleIdx) {
        this._stageEl.innerHTML = '';
        const ms = this._memberService;
        const role = ms.table('memberRole').read(roleIdx);
        if (!role) return;

        const perms = this._resolveRolePerms(role);
        const level = role.get('level') || 99;
        const ls = this._getLevelStyle(level);
        const config = this._getRbacConfig();
        const matchKey = Object.keys(config.roles || {}).find(k => config.roles[k].label === role.get('name'));
        const desc = matchKey ? config.roles[matchKey].description : role.get('description') || '';

        const wrap = document.createElement('div');
        wrap.className = 'rc-stage-wrap';
        this._stageEl.appendChild(wrap);

        // Header
        const header = document.createElement('div');
        header.className = 'ui-flex ui-items-center ui-gap-3 rc-role-header-border';
        header.style.cssText = `border-bottom:2px solid ${ls.border};`;
        header.innerHTML = `
            <div class="as-level-badge as-level-badge-lg" style="background:${ls.bg};border:2px solid ${ls.border};color:${ls.text};">${level}</div>
            <div class="as-flex-1">
                <div class="ui-font-bold ui-text-base">${role.get('name')}</div>
                <div class="ui-text-xs" style="color:var(--as-text-secondary);">${ls.label} &middot; ${this._getPermCount(perms)} permissions &middot; ${desc}</div>
            </div>
            <div id="rc-back-btn"></div>
        `;
        wrap.appendChild(header);

        new uiButtonGroup({
            parent: header.querySelector('#rc-back-btn'),
            buttons: [{
                label: 'Dashboard', icon: '<i class="fas fa-arrow-left"></i>', color: 'secondary', variant: 'outline', size: 'sm',
                onClick: () => {
                    this._selectedRoleIdx = null;
                    this._renderRolesPane();
                    this._renderDashboard();
                }
            }]
        });

        // Tabs
        const tabWrap = document.createElement('div');
        wrap.appendChild(tabWrap);
        const contentWrap = document.createElement('div');
        contentWrap.className = 'rc-content-gap';
        wrap.appendChild(contentWrap);

        const tabs = new uiTabs({
            parent: tabWrap,
            tabs: [
                { label: 'Permissions', icon: '<i class="fas fa-key"></i>' },
                { label: 'Members', icon: '<i class="fas fa-users"></i>' },
                { label: 'Scope Rules', icon: '<i class="fas fa-layer-group"></i>' },
                { label: 'Clone / Edit', icon: '<i class="fas fa-copy"></i>' }
            ]
        });

        const renderTab = (index) => {
            contentWrap.innerHTML = '';
            switch (index) {
                case 0: this._renderPermissionsTab(contentWrap, role); break;
                case 1: this._renderMembersTab(contentWrap, role); break;
                case 2: this._renderScopeRulesTab(contentWrap, role); break;
                case 3: this._renderCloneTab(contentWrap, role); break;
            }
        };

        tabs.bus.on('tab-changed', ({ index }) => renderTab(index));
        renderTab(0);
    }

    // ── Role Detail: Permissions Tab ─────────────────────────────────────────

    _renderPermissionsTab(container, role) {
        const ms = this._memberService;
        let perms = this._resolveRolePerms(role);
        const grouped = this._groupPermissions();
        const isSuperAdmin = perms.includes('*');

        if (isSuperAdmin) {
            const note = document.createElement('div');
            note.className = 'as-rounded-lg rc-note-box rc-note-danger';
            note.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-right:0.3rem;"></i><strong>Wildcard (*)</strong> — This role has unrestricted access to all permissions.';
            container.appendChild(note);
        }

        // Summary bar
        const allCodes = this._getAllPermCodes();
        const grantedCount = allCodes.filter(c => MemberService.roleHasPermission(perms, c)).length;
        const sumBar = document.createElement('div');
        sumBar.className = 'ui-flex ui-items-center ui-gap-2 rc-summary-bar';
        sumBar.innerHTML = `
            <span class="ui-font-semibold" style="font-size:0.75rem;color:var(--as-text-body);">${grantedCount}/${allCodes.length} granted</span>
            <div class="as-flex-1 as-progress-track as-progress-track-md">
                <div class="as-progress-fill" style="width:${allCodes.length > 0 ? Math.round(grantedCount / allCodes.length * 100) : 0}%;background:var(--as-brand-navy);"></div>
            </div>
        `;
        container.appendChild(sumBar);

        // Grouped permission checkboxes
        const groupOrder = ['classroom', 'student', 'programme', 'casework', 'accreditation', 'executive', 'admin', 'tools', 'advanced', '_actions'];

        groupOrder.forEach(gKey => {
            const gPerms = grouped[gKey];
            if (!gPerms || gPerms.length === 0) return;

            const label = gKey === '_actions' ? 'Actions' : gKey;
            const icon = RoleConfigurationPanel.PERM_GROUP_ICONS[gKey] || (gKey === '_actions' ? 'fa-bolt' : 'fa-circle');
            const color = RoleConfigurationPanel.PERM_GROUP_COLORS[gKey] || '#666';

            const grantedInGroup = gPerms.filter(p => MemberService.roleHasPermission(perms, p.code)).length;
            const allInGroup = gPerms.length;

            const section = document.createElement('div');
            section.className = 'rc-perm-section';

            // Section header with select-all toggle
            const hdr = document.createElement('div');
            hdr.className = 'ui-flex ui-items-center ui-justify-between';
            hdr.style.cssText = `padding:0.35rem 0;border-bottom:2px solid ${color};margin-bottom:0.3rem;`;
            hdr.innerHTML = `
                <div class="ui-flex ui-items-center ui-gap-1">
                    <i class="fas ${icon}" style="color:${color};font-size:0.65rem;"></i>
                    <span class="as-section-header" style="font-size:0.75rem;color:${color};">${label}</span>
                    <span class="rc-perm-count-span">(${grantedInGroup}/${allInGroup})</span>
                </div>
                <label class="ui-flex ui-items-center ui-gap-1 rc-select-all-label">
                    <input type="checkbox" class="rc-select-all" data-group="${gKey}" ${grantedInGroup === allInGroup ? 'checked' : ''}> all
                </label>
            `;
            section.appendChild(hdr);

            // Checkbox grid
            const grid = document.createElement('div');
            grid.className = 'rc-perm-grid';

            gPerms.forEach(p => {
                const isChecked = MemberService.roleHasPermission(perms, p.code);
                const row = document.createElement('label');
                row.className = `ui-flex ui-items-center ui-gap-1 as-rounded-sm rc-perm-row${isChecked ? ' rc-perm-row-checked' : ''}`;
                row.innerHTML = `<input type="checkbox" data-perm="${p.code}" ${isChecked ? 'checked' : ''}> <span style="color:var(--as-text-secondary);">${p.label}</span>`;

                const checkbox = row.querySelector('input');
                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        if (!perms.includes(p.code)) perms.push(p.code);
                    } else {
                        perms = perms.filter(x => x !== p.code);
                    }
                    role.set('permissions', JSON.stringify(perms));
                    row.classList.toggle('rc-perm-row-checked', checkbox.checked);
                    // Update group header count
                    const newGranted = gPerms.filter(gp => MemberService.roleHasPermission(perms, gp.code)).length;
                    hdr.querySelector('span:last-child').previousElementSibling.querySelector('span:last-child') || null;
                    // Update select-all
                    const selectAll = hdr.querySelector('.rc-select-all');
                    if (selectAll) selectAll.checked = (newGranted === allInGroup);
                    // Update summary bar
                    const newTotal = allCodes.filter(c => MemberService.roleHasPermission(perms, c)).length;
                    sumBar.querySelector('span').textContent = `${newTotal}/${allCodes.length} granted`;
                    sumBar.querySelector('div > div').style.width = `${allCodes.length > 0 ? Math.round(newTotal / allCodes.length * 100) : 0}%`;
                };
                grid.appendChild(row);
            });

            section.appendChild(grid);

            // Wire select-all
            const selectAllCb = hdr.querySelector('.rc-select-all');
            if (selectAllCb) {
                selectAllCb.onchange = () => {
                    const boxes = grid.querySelectorAll('input[type="checkbox"]');
                    boxes.forEach(cb => {
                        const code = cb.dataset.perm;
                        if (selectAllCb.checked) {
                            if (!perms.includes(code)) perms.push(code);
                            cb.checked = true;
                            cb.closest('label').classList.add('rc-perm-row-checked');
                        } else {
                            perms = perms.filter(x => x !== code);
                            cb.checked = false;
                            cb.closest('label').classList.remove('rc-perm-row-checked');
                        }
                    });
                    role.set('permissions', JSON.stringify(perms));
                    const newTotal = allCodes.filter(c => MemberService.roleHasPermission(perms, c)).length;
                    sumBar.querySelector('span').textContent = `${newTotal}/${allCodes.length} granted`;
                    sumBar.querySelector('div > div').style.width = `${allCodes.length > 0 ? Math.round(newTotal / allCodes.length * 100) : 0}%`;
                };
            }

            container.appendChild(section);
        });
    }

    // ── Role Detail: Members Tab ─────────────────────────────────────────────

    _renderMembersTab(container, role) {
        const ms = this._memberService;
        const links = ms.table('memberRoleLink').all().filter(l => l.get('roleId') === role.idx);

        const title = document.createElement('div');
        title.className = 'rc-section-title';
        title.textContent = `Members with "${role.get('name')}" (${links.length})`;
        container.appendChild(title);

        if (links.length === 0) {
            container.innerHTML += '<div class="rc-no-data-sm">No members assigned to this role.</div>';
        } else {
            const tableData = links.map(l => {
                const member = ms.table('member').read(l.get('memberId'));
                if (!member) return null;
                const grantedBy = l.get('grantedBy') ? ms.table('member').read(l.get('grantedBy')) : null;
                return {
                    id: member.idx,
                    displayName: member.get('displayName') || member.get('username'),
                    email: member.get('email'),
                    status: member.get('status') || 'active',
                    grantedBy: grantedBy ? (grantedBy.get('displayName') || grantedBy.get('username')) : '-',
                    grantedAt: l.get('grantedAt') ? new Date(l.get('grantedAt')).toLocaleDateString() : '-'
                };
            }).filter(Boolean);

            new uiTable({
                parent: container,
                columns: [
                    { key: 'displayName', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'status', label: 'Status' },
                    { key: 'grantedBy', label: 'Granted By' },
                    { key: 'grantedAt', label: 'Date' }
                ],
                data: tableData,
                paging: false,
                searching: true,
                ordering: true
            });
        }

        // Quick assign section
        const assignTitle = document.createElement('div');
        assignTitle.className = 'rc-section-title';
        assignTitle.textContent = 'Quick Assign';
        container.appendChild(assignTitle);

        const allMembers = ms.table('member').all();
        const assignedIds = links.map(l => l.get('memberId'));
        const unassigned = allMembers.filter(m => !assignedIds.includes(m.idx));

        if (unassigned.length === 0) {
            container.innerHTML += '<div class="rc-no-data-sm">All members have this role.</div>';
            return;
        }

        const assignRow = document.createElement('div');
        assignRow.className = 'ui-flex ui-items-center ui-gap-2';

        const sel = document.createElement('select');
        sel.className = 'rc-assign-select';
        unassigned.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.idx;
            opt.textContent = m.get('displayName') || m.get('username');
            sel.appendChild(opt);
        });
        assignRow.appendChild(sel);

        const btnDiv = document.createElement('div');
        assignRow.appendChild(btnDiv);
        new uiButtonGroup({
            parent: btnDiv,
            buttons: [{
                label: 'Assign', icon: '<i class="fas fa-plus"></i>', color: 'primary', variant: 'outline', size: 'sm',
                onClick: () => {
                    const memberId = Number(sel.value);
                    if (memberId) {
                        ms.assignRole(memberId, role.idx);
                        container.innerHTML = '';
                        this._renderMembersTab(container, role);
                        this._renderRolesPane();
                    }
                }
            }]
        });
        container.appendChild(assignRow);
    }

    // ── Role Detail: Scope Rules Tab ─────────────────────────────────────────

    _renderScopeRulesTab(container, role) {
        const ms = this._memberService;
        const config = this._getRbacConfig();
        const perms = this._resolveRolePerms(role);
        const rules = ms.getScopeRules();

        const title = document.createElement('div');
        title.className = 'rc-section-title';
        title.textContent = 'Context Scope Rules';
        container.appendChild(title);

        const desc = document.createElement('div');
        desc.className = 'rc-desc-text';
        desc.textContent = 'Shows how this role\'s view permissions map to context scopes. Scoped groups require group membership for access; unrestricted groups allow full access.';
        container.appendChild(desc);

        if (Object.keys(rules).length === 0) {
            container.innerHTML += '<div class="rc-no-data-sm">No scope rules configured.</div>';
            return;
        }

        Object.entries(rules).forEach(([scopeKey, rule]) => {
            // Check if this role has any views in this scope
            const viewPrefix = `view:${scopeKey}:`;
            const scopePerms = this._getAllPermCodes().filter(c => c.startsWith(viewPrefix));
            const hasAny = scopePerms.some(c => MemberService.roleHasPermission(perms, c));
            const hasAll = scopePerms.length > 0 && scopePerms.every(c => MemberService.roleHasPermission(perms, c));

            const typeLabel = rule.unrestricted ? 'Unrestricted'
                : rule.identifierKey ? `Self (${rule.identifierKey})`
                : rule.inherited ? `Inherited${rule.inheritFrom ? ' from ' + rule.inheritFrom : ''}`
                : rule.groupType ? `Group: ${rule.groupType}` : 'None';

            const typeIcon = rule.unrestricted ? 'fa-globe' : rule.identifierKey ? 'fa-user' : rule.inherited ? 'fa-link' : 'fa-layer-group';
            const typeColor = rule.unrestricted ? 'var(--as-status-connected-color)' : rule.identifierKey ? 'var(--as-status-testing-color)' : rule.inherited ? 'var(--as-status-disconnected-color)' : 'var(--as-brand-navy)';

            const row = document.createElement('div');
            row.className = 'ui-flex ui-items-center ui-gap-2 as-rounded-lg rc-scope-row';
            if (!hasAny) row.style.opacity = '0.5';
            row.innerHTML = `
                <i class="fas ${typeIcon}" style="color:${typeColor};font-size:0.8rem;width:1.2rem;text-align:center;"></i>
                <div class="as-flex-1 as-min-w-0">
                    <div class="ui-font-semibold" style="font-size:0.75rem;color:var(--as-text-body);">${scopeKey}</div>
                    <div class="rc-sub-label">${typeLabel}</div>
                </div>
                <div class="ui-flex ui-items-center ui-gap-1">
                    ${hasAll ? '<span class="as-rounded-sm ui-font-semibold rc-scope-badge-all">ALL</span>'
                        : hasAny ? '<span class="as-rounded-sm ui-font-semibold rc-scope-badge-partial">PARTIAL</span>'
                        : '<span class="as-rounded-sm rc-scope-badge-none">NONE</span>'}
                    <span class="rc-sub-label">${scopePerms.filter(c => MemberService.roleHasPermission(perms, c)).length}/${scopePerms.length}</span>
                </div>
            `;

            // If group-scoped, explain what this means
            if (rule.groupType && hasAny) {
                const explain = document.createElement('div');
                explain.className = 'rc-scope-explain';
                explain.innerHTML = `Users with this role need to be added to <strong>${rule.groupType}</strong> groups to determine which ${rule.groupType} codes they can access.`;
                row.appendChild(explain);
            }

            container.appendChild(row);
        });
    }

    // ── Role Detail: Clone / Edit Tab ────────────────────────────────────────

    _renderCloneTab(container, role) {
        const ms = this._memberService;
        const perms = this._resolveRolePerms(role);

        // Role info (editable)
        const infoTitle = document.createElement('div');
        infoTitle.className = 'rc-section-title';
        infoTitle.textContent = 'Role Properties';
        container.appendChild(infoTitle);

        const formGrid = document.createElement('div');
        formGrid.className = 'rc-form-grid';

        const makeField = (label, value, key) => {
            const field = document.createElement('div');
            field.innerHTML = `
                <div class="rc-form-label">${label}</div>
                <input type="${key === 'level' ? 'number' : 'text'}" value="${value || ''}" data-key="${key}" class="rc-form-input">
            `;
            return field;
        };

        formGrid.appendChild(makeField('Name', role.get('name'), 'name'));
        formGrid.appendChild(makeField('Level', role.get('level'), 'level'));
        formGrid.appendChild(makeField('Description', role.get('description'), 'description'));
        container.appendChild(formGrid);

        // Save button
        const saveBtnDiv = document.createElement('div');
        saveBtnDiv.className = 'rc-save-gap';
        container.appendChild(saveBtnDiv);

        new uiButtonGroup({
            parent: saveBtnDiv,
            buttons: [{
                label: 'Save Changes', icon: '<i class="fas fa-save"></i>', color: 'primary', size: 'sm',
                onClick: () => {
                    const inputs = formGrid.querySelectorAll('input');
                    inputs.forEach(inp => {
                        const key = inp.dataset.key;
                        if (key === 'level') {
                            role.set(key, Number(inp.value) || 0);
                        } else {
                            role.set(key, inp.value);
                        }
                    });
                    this._renderRolesPane();
                    if (typeof uiToast !== 'undefined') {
                        new uiToast({ parent: document.body, message: 'Role updated', type: 'success', duration: 2000 });
                    }
                }
            }]
        });

        // Clone section
        const cloneTitle = document.createElement('div');
        cloneTitle.className = 'rc-section-title';
        cloneTitle.textContent = 'Clone This Role';
        container.appendChild(cloneTitle);

        const cloneDesc = document.createElement('div');
        cloneDesc.className = 'rc-role-desc';
        cloneDesc.textContent = 'Creates a new role with the same permissions. You can then modify it independently.';
        container.appendChild(cloneDesc);

        const cloneRow = document.createElement('div');
        cloneRow.className = 'ui-flex ui-items-center ui-gap-2 rc-clone-row';
        cloneRow.innerHTML = `<input type="text" placeholder="New role name" value="${role.get('name')} (Copy)" class="rc-clone-input">`;
        const cloneBtnDiv = document.createElement('div');
        cloneRow.appendChild(cloneBtnDiv);
        container.appendChild(cloneRow);

        new uiButtonGroup({
            parent: cloneBtnDiv,
            buttons: [{
                label: 'Clone', icon: '<i class="fas fa-copy"></i>', color: 'secondary', variant: 'outline', size: 'sm',
                onClick: () => {
                    const newName = cloneRow.querySelector('input').value.trim();
                    if (!newName) return;
                    const newRole = ms.table('memberRole').create({
                        name: newName,
                        description: role.get('description'),
                        level: role.get('level'),
                        permissions: JSON.stringify(perms),
                        isSystem: false,
                        createdAt: new Date().toISOString()
                    });
                    this._statusBadge.update({ label: `${ms.table('memberRole').all().length} roles`, color: 'primary' });
                    this._renderRolesPane();
                    this._renderCoveragePane();
                    this._selectedRoleIdx = newRole.idx;
                    this._renderRolesPane();
                    this._renderRoleDetail(newRole.idx);
                }
            }]
        });

        // Delete section
        if (!role.get('isSystem')) {
            const delTitle = document.createElement('div');
            delTitle.className = 'rc-section-title';
            delTitle.style.color = 'var(--ex-clr-danger)'; // dynamic override for danger context
            delTitle.textContent = 'Danger Zone';
            container.appendChild(delTitle);

            const delBtnDiv = document.createElement('div');
            container.appendChild(delBtnDiv);

            new uiButtonGroup({
                parent: delBtnDiv,
                buttons: [{
                    label: 'Delete Role', icon: '<i class="fas fa-trash"></i>', color: 'danger', variant: 'outline', size: 'sm',
                    onClick: () => {
                        // Remove all role links first
                        const links = ms.table('memberRoleLink').all().filter(l => l.get('roleId') === role.idx);
                        links.forEach(l => ms.table('memberRoleLink').delete(l.idx));
                        ms.table('memberRole').delete(role.idx);
                        this._selectedRoleIdx = null;
                        this._statusBadge.update({ label: `${ms.table('memberRole').all().length} roles`, color: 'primary' });
                        this._renderRolesPane();
                        this._renderCoveragePane();
                        this._renderDashboard();
                    }
                }]
            });
        } else {
            const sysNote = document.createElement('div');
            sysNote.className = 'rc-sys-note';
            sysNote.innerHTML = '<i class="fas fa-lock" style="margin-right:0.25rem;"></i>System roles cannot be deleted. Clone it to create a modifiable copy.';
            container.appendChild(sysNote);
        }

        // Permission export (raw JSON)
        const exportTitle = document.createElement('div');
        exportTitle.className = 'rc-section-title';
        exportTitle.textContent = 'Raw Permissions';
        container.appendChild(exportTitle);

        const pre = document.createElement('pre');
        pre.className = 'as-pre';
        pre.textContent = JSON.stringify(perms, null, 2);
        container.appendChild(pre);
    }

    // ── New Role Form ────────────────────────────────────────────────────────

    _showNewRoleForm() {
        this._stageEl.innerHTML = '';
        const ms = this._memberService;

        const wrap = document.createElement('div');
        wrap.className = 'rc-new-role-wrap';
        this._stageEl.appendChild(wrap);

        const title = document.createElement('h3');
        title.className = 'rc-new-role-title';
        title.innerHTML = '<i class="fas fa-plus-circle" style="margin-right:0.4rem;"></i>Create New Role';
        wrap.appendChild(title);

        const formDiv = document.createElement('div');
        wrap.appendChild(formDiv);

        new uiForm({
            parent: formDiv,
            fields: {
                name:        { label: 'Role Name',   type: 'text', required: true },
                description: { label: 'Description',  type: 'text' },
                level:       { label: 'Level (1=highest)', type: 'number', value: 4 }
            }
        });

        const btnDiv = document.createElement('div');
        btnDiv.className = 'ui-flex ui-gap-2 rc-btn-row';
        wrap.appendChild(btnDiv);

        new uiButtonGroup({
            parent: btnDiv,
            buttons: [
                {
                    label: 'Create', icon: '<i class="fas fa-check"></i>', color: 'primary',
                    onClick: () => {
                        const inputs = formDiv.querySelectorAll('input');
                        const name = inputs[0]?.value?.trim() || '';
                        const description = inputs[1]?.value?.trim() || '';
                        const level = Number(inputs[2]?.value) || 4;

                        if (!name) {
                            new uiAlert({ parent: wrap, type: 'warning', message: 'Role name is required.', dismissible: true });
                            return;
                        }

                        const newRole = ms.table('memberRole').create({
                            name, description, level,
                            permissions: JSON.stringify([]),
                            isSystem: false,
                            createdAt: new Date().toISOString()
                        });

                        this._statusBadge.update({ label: `${ms.table('memberRole').all().length} roles`, color: 'primary' });
                        this._renderRolesPane();
                        this._renderCoveragePane();
                        this._selectedRoleIdx = newRole.idx;
                        this._renderRolesPane();
                        this._renderRoleDetail(newRole.idx);
                    }
                },
                {
                    label: 'Cancel', color: 'secondary', variant: 'outline',
                    onClick: () => this._renderDashboard()
                }
            ]
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoleConfigurationPanel };
}
