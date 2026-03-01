/**
 * PickerDemoPanel — Generic demo panel for picker service cards
 *
 * Single class with a static CONFIGS registry — avoids 4 near-identical panel files.
 * Each config defines label, icon, pickerType ('group' or 'member'),
 * groupType or roleFilter, and demo seed data.
 *
 * @example
 * new PickerDemoPanel('faculty').render(controlEl, stageEl);
 * new PickerDemoPanel('student').render(controlEl, stageEl);
 */
class PickerDemoPanel {

    static CONFIGS = {
        faculty: {
            label: 'Faculty',
            icon: 'university',
            pickerType: 'group',
            groupType: 'faculty',
            demoData: [
                { code: 'FAC-ENG', name: 'Faculty of Engineering' },
                { code: 'FAC-SCI', name: 'Faculty of Science' },
                { code: 'FAC-HUM', name: 'Faculty of Humanities' },
                { code: 'FAC-COM', name: 'Faculty of Commerce' },
                { code: 'FAC-LAW', name: 'Faculty of Law' }
            ]
        },
        department: {
            label: 'Department',
            icon: 'building',
            pickerType: 'group',
            groupType: 'department',
            demoData: [
                { code: 'DEP-CS',   name: 'Computer Science' },
                { code: 'DEP-MATH', name: 'Mathematics' },
                { code: 'DEP-PHYS', name: 'Physics' },
                { code: 'DEP-CHEM', name: 'Chemistry' },
                { code: 'DEP-ELEC', name: 'Electrical Engineering' },
                { code: 'DEP-MECH', name: 'Mechanical Engineering' }
            ]
        },
        student: {
            label: 'Student',
            icon: 'user-graduate',
            pickerType: 'member',
            roleFilter: 'Student',
            demoUsers: [
                { username: 'alice.ndaba',    displayName: 'Alice Ndaba',     email: 'alice.ndaba@demo.ac.za' },
                { username: 'brian.mokoena',  displayName: 'Brian Mokoena',   email: 'brian.mokoena@demo.ac.za' },
                { username: 'chloe.vanwyk',   displayName: 'Chloe van Wyk',   email: 'chloe.vanwyk@demo.ac.za' },
                { username: 'david.pillay',   displayName: 'David Pillay',    email: 'david.pillay@demo.ac.za' },
                { username: 'emily.botha',    displayName: 'Emily Botha',     email: 'emily.botha@demo.ac.za' },
                { username: 'farai.chikosi',  displayName: 'Farai Chikosi',   email: 'farai.chikosi@demo.ac.za' }
            ]
        },
        staff: {
            label: 'Staff',
            icon: 'chalkboard-teacher',
            pickerType: 'member',
            roleFilter: 'Staff',
            demoUsers: [
                { username: 's.molefe',    displayName: 'Dr Sarah Molefe',   email: 's.molefe@demo.ac.za' },
                { username: 'j.pretorius', displayName: 'Prof John Pretorius', email: 'j.pretorius@demo.ac.za' },
                { username: 't.dlamini',   displayName: 'Ms Thandi Dlamini', email: 't.dlamini@demo.ac.za' },
                { username: 'a.patel',     displayName: 'Mr Ahmed Patel',    email: 'a.patel@demo.ac.za' }
            ]
        }
    };

    constructor(configKey) {
        const cfg = PickerDemoPanel.CONFIGS[configKey];
        if (!cfg) throw new Error(`PickerDemoPanel: unknown config "${configKey}"`);
        this._cfg = cfg;
        this._key = configKey;
        this._controlEl = null;
        this._stageEl = null;
        this._service = null;
        this._logArea = null;
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._initService();
        this._buildControl();
        this._buildStage();
    }

    // ── Init service + seed demo data ─────────────────────────────────────────

    _initService() {
        if (this._cfg.pickerType === 'group') {
            this._service = new GroupService();
            this._cfg.demoData.forEach(d => {
                const g = this._service.createGroup({ name: d.name, type: this._cfg.groupType, code: d.code, visibility: 'public' });
                const count = Math.floor(Math.random() * 4) + 1;
                for (let i = 0; i < count; i++) this._service.addMember(g.idx, 3000 + g.idx * 10 + i, 'member');
            });
        } else {
            this._service = new MemberService();
            const role = this._service.table('memberRole').create({
                name: this._cfg.roleFilter,
                description: `Demo ${this._cfg.roleFilter} role`,
                level: 0
            });
            this._cfg.demoUsers.forEach(u => {
                const member = this._service.table('member').create({
                    username: u.username,
                    email: u.email,
                    displayName: u.displayName,
                    status: 'active'
                });
                this._service.assignRole(member.idx, role.idx);
            });
        }
    }

    // ── Control: single button ────────────────────────────────────────────────

    _buildControl() {
        this._controlEl.innerHTML = '';
        new uiButton({
            label: `Open ${this._cfg.label} Picker`,
            icon: `<i class="fas fa-${this._cfg.icon}"></i>`,
            color: 'primary',
            size: 'sm',
            parent: this._controlEl,
            onClick: () => this._openPicker()
        });
    }

    // ── Stage: selection log ──────────────────────────────────────────────────

    _buildStage() {
        this._stageEl.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'picker-stage';
        this._stageEl.appendChild(wrap);

        const title = document.createElement('h3');
        title.className = 'picker-title';
        title.innerHTML = `<i class="fas fa-${this._cfg.icon}" style="margin-right:0.4rem;color:var(--ui-primary-600);"></i>${this._cfg.label} Picker — Selection Log`;
        wrap.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'picker-desc';
        desc.textContent = `Click "Open ${this._cfg.label} Picker" to launch the modal. Selections appear below.`;
        wrap.appendChild(desc);

        this._logArea = document.createElement('div');
        this._logArea.className = 'picker-log';
        this._logArea.innerHTML = '<div class="picker-log-muted">No selections yet.</div>';
        wrap.appendChild(this._logArea);
    }

    // ── Open the appropriate picker modal ─────────────────────────────────────

    _openPicker() {
        if (this._cfg.pickerType === 'group') {
            new GroupPickerModal({
                groupService: this._service,
                groupType: this._cfg.groupType,
                onSelect: (result) => this._logGroupResult(result)
            }).open();
        } else {
            new MemberPickerModal({
                memberService: this._service,
                roleFilter: this._cfg.roleFilter,
                onSelect: (result) => this._logMemberResult(result)
            }).open();
        }
    }

    // ── Log results ───────────────────────────────────────────────────────────

    _clearPlaceholder() {
        const placeholder = this._logArea.querySelector('.picker-log-muted');
        if (placeholder) this._logArea.innerHTML = '';
    }

    _logGroupResult(result) {
        this._clearPlaceholder();
        const entry = document.createElement('div');
        entry.className = 'picker-log-entry';
        const names = result.groups.map(g => {
            const code = g.get('code') || '';
            const name = g.get('name') || '';
            const members = this._service.getMembers(g.idx).length;
            return `<strong>${code}</strong> ${name} <span class="picker-log-muted">(${members} members)</span>`;
        }).join(', ');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        entry.innerHTML = `<span class="picker-log-time">${time}</span> ${names}`;
        this._logArea.prepend(entry);
    }

    _logMemberResult(result) {
        this._clearPlaceholder();
        const entry = document.createElement('div');
        entry.className = 'picker-log-entry';
        const names = result.members.map(m => {
            const display = m.get('displayName') || m.get('username') || 'Member ' + m.idx;
            const email = m.get('email') || '';
            return `<strong>${display}</strong> <span class="picker-log-muted">${email}</span>`;
        }).join(', ');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        entry.innerHTML = `<span class="picker-log-time">${time}</span> ${names}`;
        this._logArea.prepend(entry);
    }
}
