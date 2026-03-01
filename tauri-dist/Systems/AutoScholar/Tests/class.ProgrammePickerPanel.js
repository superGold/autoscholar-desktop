/**
 * ProgrammePickerPanel — Service card panel for the Programme Picker utility
 *
 * Control: "Open Programme Picker" button
 * Stage: Selection log showing picked programmes with code, name, and member count
 * Uses GroupPickerModal internally with groupType: 'programme'
 */
class ProgrammePickerPanel {

    static DEMO_PROGRAMMES = [
        { code: 'BSc-CS',   name: 'BSc Computer Science' },
        { code: 'BSc-IT',   name: 'BSc Information Technology' },
        { code: 'BEng-EE',  name: 'BEng Electrical Engineering' },
        { code: 'BCom-ACC', name: 'BCom Accounting' }
    ];

    constructor() {
        this._controlEl = null;
        this._stageEl = null;
        this._gs = null;
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._initService();
        this._buildControl();
        this._buildStage();
    }

    _initService() {
        this._gs = new GroupService();
        ProgrammePickerPanel.DEMO_PROGRAMMES.forEach(p => {
            const g = this._gs.createGroup({ name: p.name, type: 'programme', code: p.code, visibility: 'public' });
            const count = Math.floor(Math.random() * 4) + 1;
            for (let i = 0; i < count; i++) this._gs.addMember(g.idx, 2000 + g.idx * 10 + i, 'member');
        });
    }

    _buildControl() {
        this._controlEl.innerHTML = '';
        new uiButton({
            label: 'Open Programme Picker',
            icon: '<i class="fas fa-graduation-cap"></i>',
            color: 'primary',
            size: 'sm',
            parent: this._controlEl,
            onClick: () => this._openPicker()
        });
    }

    _buildStage() {
        this._stageEl.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'as-picker-wrap';
        this._stageEl.appendChild(wrap);

        const title = document.createElement('h3');
        title.className = 'as-picker-title';
        title.innerHTML = '<i class="fas fa-graduation-cap" style="margin-right:0.4rem;color:var(--ui-primary-600);"></i>Programme Picker — Selection Log';
        wrap.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'as-picker-desc';
        desc.textContent = 'Click "Open Programme Picker" to launch the modal. Selections appear below.';
        wrap.appendChild(desc);

        this._logArea = document.createElement('div');
        this._logArea.className = 'as-picker-log-area';
        this._logArea.innerHTML = '<div class="as-picker-log-placeholder">No selections yet.</div>';
        wrap.appendChild(this._logArea);
    }

    _openPicker() {
        const picker = new GroupPickerModal({
            groupService: this._gs,
            groupType: 'programme',
            onSelect: (result) => this._logResult(result)
        });
        picker.open();
    }

    _logResult(result) {
        const placeholder = this._logArea.querySelector('.as-picker-log-placeholder');
        if (placeholder) this._logArea.innerHTML = '';

        const entry = document.createElement('div');
        entry.className = 'as-picker-log-entry';
        const names = result.groups.map(g => {
            const code = g.get('code') || '';
            const name = g.get('name') || '';
            const members = this._gs.getMembers(g.idx).length;
            return `<strong>${code}</strong> ${name} <span class="as-picker-log-muted">(${members} members)</span>`;
        }).join(', ');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        entry.innerHTML = `<span class="as-picker-log-timestamp">${time}</span> ${names}`;
        this._logArea.prepend(entry);
    }
}
