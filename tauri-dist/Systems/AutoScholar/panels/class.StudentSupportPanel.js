/**
 * StudentSupportPanel - Student Support and Help Center
 *
 * Provides access to:
 * - My Cases: Create/view support cases via casework service
 * - Messages: Recent conversations via messenger service
 * - Risk Alerts: Flags from risk service
 * - Resources: Static support resource cards
 *
 * Degrades gracefully when services are unavailable.
 */
class StudentSupportPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
        this._apiData = settings.studentData || null;
    }

    render(container) {
        // Header
        const header = container.add({ css: 'flex items-center gap-3 mb-5' });
        header.add({ tag: 'i', css: 'fas fa-life-ring text-primary text-xl' });
        header.add({ tag: 'h2', css: 'text-xl font-bold', script: 'Student Support' });

        // If no services available, show resources directly
        if (!this.currentUser && !this.services) {
            this._renderResources(container);
            this._renderContactInfo(container);
            return;
        }

        // Main grid: Cases + Messages
        const mainGrid = container.add({ css: 'grid md:grid-cols-2 gap-4 mb-5' });
        this._renderMyCases(mainGrid);
        this._renderMessages(mainGrid);

        // Bottom grid: Risk Alerts + Resources
        const bottomGrid = container.add({ css: 'grid md:grid-cols-2 gap-4' });
        this._renderRiskAlerts(bottomGrid);
        this._renderResources(bottomGrid);
    }

    _renderContactInfo(container) {
        const card = container.add({ css: 'card p-4 mt-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-phone text-green-500' });
        header.add({ css: 'font-semibold', script: 'Contact Information' });

        const contacts = [
            { label: 'Student Services', phone: '031 373 2000', email: 'studentservices@dut.ac.za' },
            { label: 'Financial Aid Office', phone: '031 373 2100', email: 'financialaid@dut.ac.za' },
            { label: 'IT Help Desk', phone: '031 373 2222', email: 'ithelpdesk@dut.ac.za' },
            { label: 'Counselling Centre', phone: '031 373 2266', email: 'counselling@dut.ac.za' }
        ];

        const grid = card.add({ css: 'grid md:grid-cols-2 gap-3' });
        contacts.forEach(c => {
            const row = grid.add({ css: 'p-3 bg-gray-50 rounded' });
            row.add({ css: 'text-sm font-semibold text-gray-800 mb-1', script: c.label });
            row.add({ css: 'text-xs text-gray-600', script: c.phone + ' | ' + c.email });
        });
    }

    // ── My Cases ────────────────────────────────────────────────────

    _renderMyCases(container) {
        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center justify-between mb-4 pb-2 border-b' });
        const headerLeft = header.add({ css: 'flex items-center gap-2' });
        headerLeft.add({ tag: 'i', css: 'fas fa-clipboard-list text-blue-500' });
        headerLeft.add({ css: 'font-semibold', script: 'My Cases' });

        const casework = this.services?.casework;

        if (!casework) {
            const empty = card.add({ css: 'text-center py-4 text-sm text-muted' });
            empty.add({ tag: 'i', css: 'fas fa-plug text-gray-300 text-2xl mb-2' });
            empty.add({ tag: 'p', script: 'Casework service not available' });
            return;
        }

        // New case button
        const newCaseBtn = header.add({
            css: 'px-3 py-1 bg-primary text-white rounded text-sm cursor-pointer hover:opacity-90 transition-opacity'
        });
        newCaseBtn.add({ tag: 'i', css: 'fas fa-plus mr-1' });
        newCaseBtn.add({ script: 'New Case' });
        newCaseBtn.domElement.addEventListener('click', () => this._openNewCaseForm(card));

        // Fetch student cases
        const studentId = this.currentUser?.idx;
        const cases = (casework.publon?.case?.rows || [])
            .filter(c => c && (c.studentId === studentId || c.createdBy === studentId))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        if (cases.length === 0) {
            card.add({ css: 'text-center py-4 text-sm text-muted', script: 'No support cases. Create one if you need help.' });
            return;
        }

        const list = card.add({ css: 'space-y-2 max-h-64 overflow-auto' });
        cases.slice(0, 8).forEach(c => {
            const statusColors = {
                open: 'bg-blue-100 text-blue-700',
                'in-progress': 'bg-amber-100 text-amber-700',
                resolved: 'bg-green-100 text-green-700',
                closed: 'bg-gray-100 text-gray-600'
            };
            const statusCls = statusColors[c.status] || statusColors.open;

            const row = list.add({ css: 'p-2 rounded border hover:bg-gray-50 cursor-pointer' });
            const topRow = row.add({ css: 'flex items-center justify-between gap-2' });
            topRow.add({ css: 'font-medium text-sm truncate', script: c.title || c.subject || `Case #${c.idx}` });
            topRow.add({ css: `px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusCls}`, script: c.status || 'open' });

            const metaRow = row.add({ css: 'flex items-center gap-2 mt-1 text-xs text-muted' });
            if (c.category) metaRow.add({ script: c.category });
            if (c.createdAt) {
                metaRow.add({ script: new Date(c.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) });
            }

            row.domElement.onclick = () => this._showCaseDetail(c);
        });

        if (cases.length > 8) {
            const viewAll = card.add({ css: 'text-center mt-2 text-sm text-primary cursor-pointer hover:underline', script: `View all ${cases.length} cases` });
            viewAll.domElement.onclick = () => {
                list.domElement.innerHTML = '';
                cases.forEach(c => {
                    const statusCls = ({
                        open: 'bg-blue-100 text-blue-700',
                        'in-progress': 'bg-amber-100 text-amber-700',
                        resolved: 'bg-green-100 text-green-700',
                        closed: 'bg-gray-100 text-gray-600'
                    })[c.status] || 'bg-blue-100 text-blue-700';

                    const row = list.add({ css: 'p-2 rounded border hover:bg-gray-50 cursor-pointer' });
                    const topRow = row.add({ css: 'flex items-center justify-between gap-2' });
                    topRow.add({ css: 'font-medium text-sm truncate', script: c.title || c.subject || `Case #${c.idx}` });
                    topRow.add({ css: `px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusCls}`, script: c.status || 'open' });
                    row.domElement.onclick = () => this._showCaseDetail(c);
                });
                list.domElement.classList.add('as-list-scroll-none');
                viewAll.domElement.remove();
            };
        }
    }

    _openNewCaseForm(parentCard) {
        const casework = this.services?.casework;
        if (!casework) return;

        // Use casework service create method if available
        if (casework.createCase) {
            casework.createCase({ studentId: this.currentUser?.idx });
            return;
        }

        // Fallback: inline form
        const form = parentCard.add({ css: 'p-3 bg-blue-50 rounded-lg border border-blue-200 mt-3' });
        form.add({ css: 'font-medium text-sm mb-2', script: 'New Support Case' });

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.placeholder = 'Subject';
        titleInput.className = 'ui-input w-full mb-2';
        form.domElement.appendChild(titleInput);

        const catSelect = document.createElement('select');
        catSelect.className = 'ui-input w-full mb-2';
        ['Academic', 'Financial', 'Technical', 'Personal', 'Other'].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.toLowerCase();
            option.textContent = opt;
            catSelect.appendChild(option);
        });
        form.domElement.appendChild(catSelect);

        const descInput = document.createElement('textarea');
        descInput.placeholder = 'Describe your issue...';
        descInput.rows = 3;
        descInput.className = 'ui-input w-full mb-2';
        form.domElement.appendChild(descInput);

        const btnRow = form.add({ css: 'flex gap-2 justify-end' });
        const cancelBtn = btnRow.add({ css: 'px-3 py-1 bg-gray-200 rounded text-sm cursor-pointer hover:bg-gray-300', script: 'Cancel' });
        cancelBtn.domElement.onclick = () => form.domElement.remove();

        const submitBtn = btnRow.add({ css: 'px-3 py-1 bg-primary text-white rounded text-sm cursor-pointer hover:opacity-90', script: 'Submit' });
        submitBtn.domElement.onclick = () => {
            const title = titleInput.value.trim();
            const desc = descInput.value.trim();
            if (!title) { titleInput.focus(); return; }

            if (casework.publon?.case) {
                casework.publon.case.create({
                    title: title,
                    description: desc,
                    category: catSelect.value,
                    status: 'open',
                    studentId: this.currentUser?.idx,
                    createdBy: this.currentUser?.idx,
                    createdAt: new Date().toISOString()
                });
            }
            form.domElement.remove();
        };
    }

    _showCaseDetail(caseData) {
        const title = caseData.title || caseData.subject || 'Case #' + caseData.idx;
        const desc = caseData.description || 'No description provided.';
        const status = caseData.status || 'open';
        const created = caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString('en-ZA') : 'Unknown';

        // Safe DOM construction — no innerHTML with user data
        const overlay = document.createElement('div');
        overlay.className = 'ui-modal-backdrop ui-active';
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.className = 'ui-modal ui-modal-sm ui-active';
        overlay.appendChild(modal);

        const modalBody = document.createElement('div');
        modalBody.className = 'ui-modal-body';
        modal.appendChild(modalBody);

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'ui-modal-header';
        modal.insertBefore(headerDiv, modalBody);
        const h3 = document.createElement('h3');
        h3.className = 'ui-modal-title';
        h3.textContent = title;
        headerDiv.appendChild(h3);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ui-modal-close';
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', () => overlay.remove());
        headerDiv.appendChild(closeBtn);

        // Meta row
        const metaDiv = document.createElement('div');
        metaDiv.className = 'text-sm text-muted mb-3';
        const parts = ['Status: ' + status, 'Created: ' + created];
        if (caseData.category) parts.push(caseData.category);
        metaDiv.textContent = parts.join(' \u00b7 ');
        modalBody.appendChild(metaDiv);

        // Description
        const descP = document.createElement('p');
        descP.className = 'text-sm';
        descP.textContent = desc;
        modalBody.appendChild(descP);

        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        const escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
    }

    // ── Messages ────────────────────────────────────────────────────

    _renderMessages(container) {
        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-comments text-green-500' });
        header.add({ css: 'font-semibold', script: 'Messages' });

        const messenger = this.services?.messenger || this.services?.messages;

        if (!messenger) {
            const empty = card.add({ css: 'text-center py-4 text-sm text-muted' });
            empty.add({ tag: 'i', css: 'fas fa-envelope text-gray-300 text-2xl mb-2' });
            empty.add({ tag: 'p', script: 'Messaging service not available' });
            return;
        }

        const studentId = this.currentUser?.idx;

        // Get conversations involving this student
        const conversations = (messenger.publon?.conversation?.rows || [])
            .filter(c => {
                if (!c) return false;
                return c.participantIds?.includes(studentId) ||
                       c.createdBy === studentId ||
                       c.studentId === studentId;
            })
            .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

        if (conversations.length === 0) {
            card.add({ css: 'text-center py-4 text-sm text-muted', script: 'No messages yet.' });
            return;
        }

        const list = card.add({ css: 'space-y-2 max-h-64 overflow-auto' });
        conversations.slice(0, 6).forEach(conv => {
            const row = list.add({ css: 'p-2 rounded hover:bg-gray-50 cursor-pointer flex items-start gap-3' });

            // Avatar
            const avatar = row.add({ css: 'w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold flex-shrink-0' });
            const initials = (conv.title || conv.subject || '??').substring(0, 2).toUpperCase();
            avatar.add({ script: initials });

            const info = row.add({ css: 'flex-1 min-w-0' });
            info.add({ css: 'font-medium text-sm truncate', script: conv.title || conv.subject || 'Conversation' });

            // Last message preview
            const messages = (messenger.publon?.message?.rows || [])
                .filter(m => m && m.conversationId === conv.idx)
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            const lastMsg = messages[0];
            if (lastMsg) {
                info.add({ css: 'text-xs text-muted truncate', script: lastMsg.content?.substring(0, 60) || '' });
            }

            const dateStr = conv.updatedAt || conv.createdAt;
            if (dateStr) {
                row.add({ css: 'text-xs text-muted flex-shrink-0', script: new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) });
            }

            // Click to expand conversation messages
            row.domElement.onclick = () => {
                const existing = row.domElement.querySelector('.conv-detail');
                if (existing) { existing.remove(); return; }
                const detail = document.createElement('div');
                detail.className = 'conv-detail mt-2 pt-2 border-t space-y-1';
                const allMsgs = (messenger.publon?.message?.rows || [])
                    .filter(m => m && m.conversationId === conv.idx)
                    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
                if (allMsgs.length === 0) {
                    detail.innerHTML = '<div class="text-xs text-muted">No messages in this conversation.</div>';
                } else {
                    allMsgs.slice(-10).forEach(m => {
                        const msgEl = document.createElement('div');
                        msgEl.className = 'text-xs p-1 rounded bg-gray-50 mb-1';
                        msgEl.textContent = m.content?.substring(0, 200) || '';
                        detail.appendChild(msgEl);
                    });
                }
                row.domElement.appendChild(detail);
            };
        });
    }

    // ── Risk Alerts ─────────────────────────────────────────────────

    _renderRiskAlerts(container) {
        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-exclamation-triangle text-orange-500' });
        header.add({ css: 'font-semibold', script: 'Risk Alerts' });

        const risk = this.services?.risk;

        if (!risk) {
            const empty = card.add({ css: 'text-center py-4 text-sm text-muted' });
            empty.add({ tag: 'i', css: 'fas fa-shield-alt text-gray-300 text-2xl mb-2' });
            empty.add({ tag: 'p', script: 'Risk monitoring service not available' });
            return;
        }

        const studentId = this.currentUser?.idx;
        const flags = (risk.publon?.riskFlag?.rows || [])
            .filter(f => f && f.studentId === studentId && f.status !== 'resolved')
            .sort((a, b) => {
                const severityOrder = { high: 0, medium: 1, low: 2 };
                return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
            });

        if (flags.length === 0) {
            const emptyState = card.add({ css: 'text-center py-4' });
            emptyState.add({ tag: 'i', css: 'fas fa-check-circle text-green-500 text-2xl mb-2' });
            emptyState.add({ css: 'text-sm text-muted', script: 'No active risk alerts.' });
            return;
        }

        const list = card.add({ css: 'space-y-2' });
        flags.forEach(flag => {
            const severityColors = {
                high: 'bg-red-50 border-red-200 text-red-700',
                medium: 'bg-amber-50 border-amber-200 text-amber-700',
                low: 'bg-yellow-50 border-yellow-200 text-yellow-700'
            };
            const cls = severityColors[flag.severity] || severityColors.medium;

            const item = list.add({ css: `p-3 rounded border ${cls}` });
            const titleRow = item.add({ css: 'flex items-center gap-2 font-medium text-sm' });
            const icon = flag.severity === 'high' ? 'exclamation-circle' : 'exclamation-triangle';
            titleRow.add({ tag: 'i', css: `fas fa-${icon}` });
            titleRow.add({ script: flag.title || flag.type || 'Risk Alert' });

            if (flag.description || flag.message) {
                item.add({ css: 'text-xs mt-1 opacity-80', script: flag.description || flag.message });
            }

            if (flag.recommendation) {
                const recRow = item.add({ css: 'flex items-start gap-1 mt-2 text-xs' });
                recRow.add({ tag: 'i', css: 'fas fa-lightbulb mt-0.5' });
                recRow.add({ script: flag.recommendation });
            }
        });
    }

    // ── Resources ───────────────────────────────────────────────────

    _renderResources(container) {
        const card = container.add({ css: 'card p-4' });
        const header = card.add({ css: 'flex items-center gap-2 mb-4 pb-2 border-b' });
        header.add({ tag: 'i', css: 'fas fa-book-reader text-purple-500' });
        header.add({ css: 'font-semibold', script: 'Support Resources' });

        const resources = [
            { icon: 'user-friends', label: 'Academic Advisor', desc: 'Schedule a meeting with your assigned advisor', color: 'blue' },
            { icon: 'brain', label: 'Counselling Services', desc: 'Confidential mental health and wellness support', color: 'green' },
            { icon: 'money-bill-wave', label: 'Financial Aid', desc: 'Bursaries, loans, and fee assistance', color: 'purple' },
            { icon: 'laptop', label: 'IT Help Desk', desc: 'Technical support for systems and access', color: 'orange' },
            { icon: 'building', label: 'Student Affairs', desc: 'Housing, transport, and campus life', color: 'blue' },
            { icon: 'universal-access', label: 'Disability Services', desc: 'Accommodations and accessibility support', color: 'green' }
        ];

        const grid = card.add({ css: 'flex flex-wrap gap-3' });

        resources.forEach(res => {
            const colorMap = {
                blue: 'bg-blue-50 border-blue-200 text-blue-600',
                green: 'bg-green-50 border-green-200 text-green-600',
                purple: 'bg-purple-50 border-purple-200 text-purple-600',
                orange: 'bg-orange-50 border-orange-200 text-orange-600'
            };
            const cls = colorMap[res.color] || colorMap.blue;

            const resCard = grid.add({ css: `p-3 rounded-lg border as-flex-card-md ${cls}` });

            const titleRow = resCard.add({ css: 'flex items-center gap-2 mb-1' });
            titleRow.add({ tag: 'i', css: `fas fa-${res.icon}` });
            titleRow.add({ css: 'font-medium text-sm text-gray-800', script: res.label });
            resCard.add({ css: 'text-xs text-gray-600', script: res.desc });
        });
    }
}
