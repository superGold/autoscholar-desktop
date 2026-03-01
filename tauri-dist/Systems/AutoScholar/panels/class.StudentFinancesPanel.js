/**
 * StudentFinancesPanel - NSFAS funding tracker + account overview
 *
 * Phase 1D deliverables from domain debate:
 *  - NSFAS stepper tracker (Domino's Pizza Tracker pattern)
 *  - Account balance display
 *  - Payment history list
 *
 * Renders into control-stage layout provided by StudentCentralPanel shell.
 */
class StudentFinancesPanel {

    constructor(settings = {}) {
        this._bridge = settings.bridge || null;
        this._apiData = settings.studentData || null;
        this._hasRealData = !!(this._apiData && this._apiData.studentNumber);
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._renderControls();
        if (this._hasRealData) {
            this._renderNoFinanceData();
        } else {
            this._renderStage();
        }
    }

    _renderNoFinanceData() {
        var el = this._stageEl;
        el.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'as-fin-empty';
        var icon = document.createElement('i');
        icon.className = 'fas fa-wallet as-fin-empty-icon';
        wrap.appendChild(icon);
        var title = document.createElement('div');
        title.className = 'as-fin-empty-title';
        title.textContent = 'Financial Data Not Available';
        wrap.appendChild(title);
        var msg = document.createElement('div');
        msg.className = 'as-fin-empty-msg';
        msg.textContent = 'The DUT API does not currently provide financial or NSFAS data. ' +
            'When financial endpoints become available, this panel will show your NSFAS application status, ' +
            'account balance, and payment history.';
        wrap.appendChild(msg);
        var hint = document.createElement('div');
        hint.className = 'as-fin-empty-hint';
        hint.textContent = 'For NSFAS queries, visit myNSFAS.org.za or contact DUT Financial Aid.';
        wrap.appendChild(hint);
        el.appendChild(wrap);
    }

    // ── Controls ──────────────────────────────────────────────────────

    _renderControls() {
        var el = this._controlEl;
        el.innerHTML = '';
        var label = document.createElement('div');
        label.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2';
        label.textContent = 'Financial Overview';
        el.appendChild(label);

        var hint = document.createElement('div');
        hint.className = 'text-xs text-gray-400';
        hint.textContent = 'NSFAS status, account balance, and payment history';
        el.appendChild(hint);
    }

    // ── Stage ─────────────────────────────────────────────────────────

    _renderStage() {
        var el = this._stageEl;
        el.innerHTML = '';

        // NSFAS Stepper Tracker
        this._renderNSFASStepper(el);

        // Account Balance
        this._renderAccountBalance(el);

        // Payment History
        this._renderPaymentHistory(el);
    }

    // ── NSFAS Stepper (Domino's Pizza Tracker pattern) ────────────────

    _renderNSFASStepper(parent) {
        var section = document.createElement('div');
        section.className = 'mb-5';
        parent.appendChild(section);

        var title = document.createElement('div');
        title.className = 'flex items-center gap-2 mb-3';
        title.innerHTML = '<i class="fas fa-clipboard-check as-fin-section-title-icon"></i>' +
            '<span class="font-semibold as-fin-section-title-text">NSFAS Application Status</span>';
        section.appendChild(title);

        var steps = [
            { label: 'Application Submitted', date: '15 Oct 2025', status: 'complete', icon: 'fa-paper-plane' },
            { label: 'Documents Verified', date: '28 Oct 2025', status: 'complete', icon: 'fa-file-check' },
            { label: 'Means Test Approved', date: '12 Nov 2025', status: 'complete', icon: 'fa-calculator' },
            { label: 'Institution Confirmation', date: '20 Jan 2026', status: 'active', icon: 'fa-university' },
            { label: 'Funding Allocated', date: 'Pending', status: 'pending', icon: 'fa-coins' },
            { label: 'Allowances Disbursed', date: 'Pending', status: 'pending', icon: 'fa-wallet' }
        ];

        var stepper = document.createElement('div');
        stepper.className = 'as-fin-stepper';
        section.appendChild(stepper);

        steps.forEach(function(step, i) {
            var row = document.createElement('div');
            row.className = 'as-fin-step-row' + (i >= steps.length - 1 ? ' as-fin-step-row--last' : '');

            // Vertical line (except last)
            if (i < steps.length - 1) {
                var line = document.createElement('div');
                line.className = 'as-fin-step-line ' + (step.status === 'complete' ? 'as-fin-step-line--complete' : 'as-fin-step-line--pending');
                row.appendChild(line);
            }

            // Circle
            var circle = document.createElement('div');
            var circleClass = step.status === 'complete' ? 'as-fin-circle--complete' :
                              step.status === 'active' ? 'as-fin-circle--active' : 'as-fin-circle--pending';
            circle.className = 'as-fin-circle ' + circleClass;

            if (step.status === 'complete') {
                circle.innerHTML = '<i class="fas fa-check as-fin-circle-check"></i>';
            } else if (step.status === 'active') {
                circle.innerHTML = '<div class="as-fin-circle-dot--active"></div>';
            } else {
                circle.innerHTML = '<div class="as-fin-circle-dot--pending"></div>';
            }
            row.appendChild(circle);

            // Text
            var textBlock = document.createElement('div');
            textBlock.className = 'as-fin-step-text';
            var nameEl = document.createElement('div');
            var labelClass = step.status === 'active' ? 'as-fin-step-label--active' :
                             step.status === 'pending' ? 'as-fin-step-label--pending' : 'as-fin-step-label--complete';
            nameEl.className = 'as-fin-step-label ' + labelClass;
            nameEl.textContent = step.label;
            textBlock.appendChild(nameEl);

            var dateEl = document.createElement('div');
            dateEl.className = 'as-fin-step-date';
            dateEl.textContent = step.date;
            textBlock.appendChild(dateEl);

            row.appendChild(textBlock);

            // RAG badge for active step
            if (step.status === 'active') {
                var badge = document.createElement('span');
                badge.className = 'as-fin-active-badge';
                badge.textContent = 'In Progress';
                row.appendChild(badge);
            }

            stepper.appendChild(row);
        });
    }

    // ── Account Balance ───────────────────────────────────────────────

    _renderAccountBalance(parent) {
        var section = document.createElement('div');
        section.className = 'as-fin-balance-grid';
        parent.appendChild(section);

        var balances = [
            { label: 'Tuition Fees', amount: 'R 45,600.00', paid: 'R 38,250.00', status: 'partial', icon: 'fa-graduation-cap' },
            { label: 'Accommodation', amount: 'R 32,000.00', paid: 'R 32,000.00', status: 'paid', icon: 'fa-building' },
            { label: 'Book Allowance', amount: 'R 5,460.00', paid: 'R 0.00', status: 'pending', icon: 'fa-book' },
            { label: 'Transport Allowance', amount: 'R 7,200.00', paid: 'R 3,600.00', status: 'partial', icon: 'fa-bus' }
        ];

        balances.forEach(function(b) {
            var card = document.createElement('div');
            card.className = 'as-fin-balance-card';

            var headerRow = document.createElement('div');
            headerRow.className = 'as-fin-balance-header';
            headerRow.innerHTML = '<i class="fas ' + b.icon + ' as-fin-balance-icon"></i>' +
                '<span class="as-fin-balance-label">' + b.label + '</span>';
            card.appendChild(headerRow);

            var amountEl = document.createElement('div');
            amountEl.className = 'as-fin-balance-amount';
            amountEl.textContent = b.amount;
            card.appendChild(amountEl);

            var paidRow = document.createElement('div');
            paidRow.className = 'as-fin-balance-footer';

            var paidLabel = document.createElement('span');
            paidLabel.className = 'as-fin-balance-paid';
            paidLabel.textContent = 'Paid: ' + b.paid;
            paidRow.appendChild(paidLabel);

            var statusBadge = document.createElement('span');
            statusBadge.className = 'as-fin-status-badge as-fin-status-badge--' + b.status;
            statusBadge.textContent = b.status;
            paidRow.appendChild(statusBadge);

            card.appendChild(paidRow);
            section.appendChild(card);
        });
    }

    // ── Payment History ───────────────────────────────────────────────

    _renderPaymentHistory(parent) {
        var section = document.createElement('div');
        parent.appendChild(section);

        var title = document.createElement('div');
        title.className = 'flex items-center gap-2 mb-3';
        title.innerHTML = '<i class="fas fa-history as-fin-section-title-icon"></i>' +
            '<span class="font-semibold as-fin-section-title-text">Payment History</span>';
        section.appendChild(title);

        var payments = [
            { date: '2026-01-20', desc: 'NSFAS Tuition Payment', amount: '+ R 38,250.00', type: 'credit' },
            { date: '2026-01-20', desc: 'NSFAS Accommodation Deposit', amount: '+ R 32,000.00', type: 'credit' },
            { date: '2026-02-15', desc: 'NSFAS Transport Allowance (Feb)', amount: '+ R 1,200.00', type: 'credit' },
            { date: '2026-03-01', desc: 'NSFAS Transport Allowance (Mar)', amount: '+ R 1,200.00', type: 'credit' },
            { date: '2026-03-01', desc: 'NSFAS Transport Allowance (Apr)', amount: '+ R 1,200.00', type: 'credit' },
            { date: '2026-01-15', desc: 'Registration Fee', amount: '- R 3,500.00', type: 'debit' }
        ];

        var table = document.createElement('div');
        table.className = 'as-rounded-card';
        section.appendChild(table);

        // Header
        var headerRow = document.createElement('div');
        headerRow.className = 'as-fin-payment-header';
        headerRow.innerHTML = '<span>Date</span><span>Description</span><span style="text-align:right;">Amount</span>';
        table.appendChild(headerRow);

        payments.forEach(function(p) {
            var row = document.createElement('div');
            row.className = 'as-fin-payment-row';

            var dateEl = document.createElement('span');
            dateEl.className = 'as-fin-payment-date';
            dateEl.textContent = p.date;
            row.appendChild(dateEl);

            var descEl = document.createElement('span');
            descEl.className = 'as-fin-payment-desc';
            descEl.textContent = p.desc;
            row.appendChild(descEl);

            var amountEl = document.createElement('span');
            amountEl.className = 'as-fin-payment-amount ' + (p.type === 'credit' ? 'as-fin-payment-amount--credit' : 'as-fin-payment-amount--debit');
            amountEl.textContent = p.amount;
            row.appendChild(amountEl);

            table.appendChild(row);
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) module.exports = StudentFinancesPanel;
if (typeof window !== 'undefined') window.StudentFinancesPanel = StudentFinancesPanel;
