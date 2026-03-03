/**
 * StudentCentralApp - Application shell for Student Central test rig
 *
 * Extracted from StudentCentral.html inline JS to satisfy thin-client rules.
 * Manages the overlay (prompt card / spinner), student number input,
 * and wires the StudentCentralPanel into a uiControlStage.
 */
class StudentCentralApp {

    constructor(appSelector) {
        this._appEl = document.querySelector(appSelector);
        this._panel = null;
        this._overlay = null;
        this._promptCard = null;
        this._spinnerArea = null;
        this._spinnerLabel = null;
        this._errorMsg = null;
        this._studentInput = null;

        this._init();
    }

    _init() {
        var appEl = this._appEl;
        if (!appEl) throw new Error('StudentCentralApp: app element not found');
        appEl.classList.add('sc-app-host');

        // Auth status
        var authStatus = document.getElementById('auth-status');
        if (authStatus) authStatus.textContent = (window.AS_SESSION && window.AS_SESSION.userId) || 'authenticated';

        // Control-stage (renders behind overlay)
        var cs = new uiControlStage({ controlSize: 'md', parent: appEl });
        this._panel = new StudentCentralPanel();
        this._panel.render(cs.getControlPanel(), cs.getStage());

        // Build overlay
        this._buildOverlay(appEl);

        // Wire panel callback
        var self = this;
        this._panel.onLoaded = function(result) {
            if (result.status === 'ready') {
                self._hideOverlay();
            } else {
                self._showPrompt();
                self._errorMsg.textContent = result.error || 'Failed to load student';
                self._errorMsg.classList.add('is-visible');
            }
        };

        // Focus input
        if (this._studentInput) this._studentInput.focus();
    }

    // ── Overlay construction ────────────────────────────────────────────────

    _buildOverlay(appEl) {
        var overlay = document.createElement('div');
        overlay.id = 'sc-overlay';
        this._overlay = overlay;

        // State A: Prompt card
        var promptCard = document.createElement('div');
        promptCard.className = 'sc-prompt-card';
        promptCard.innerHTML =
            '<div class="sc-prompt-icon"><i class="fas fa-user-graduate"></i></div>' +
            '<div class="sc-prompt-title">Student Central</div>' +
            '<div class="sc-prompt-subtitle">Enter a student number to load their profile</div>';
        this._promptCard = promptCard;

        var studentInput = document.createElement('input');
        studentInput.type = 'text';
        studentInput.className = 'sc-prompt-input';
        studentInput.placeholder = 'e.g. 22345678';
        promptCard.appendChild(studentInput);
        this._studentInput = studentInput;

        var loadBtn = document.createElement('button');
        loadBtn.className = 'ui-btn ui-btn-primary sc-prompt-btn-full';
        loadBtn.innerHTML = '<i class="fas fa-search" style="margin-right:0.4rem;"></i>Load Student';
        promptCard.appendChild(loadBtn);

        var errorMsg = document.createElement('div');
        errorMsg.className = 'sc-prompt-error';
        promptCard.appendChild(errorMsg);
        this._errorMsg = errorMsg;

        var divider = document.createElement('div');
        divider.className = 'sc-prompt-divider';
        divider.textContent = 'or';
        promptCard.appendChild(divider);

        var sampleBtn = document.createElement('button');
        sampleBtn.className = 'ui-btn ui-btn-ghost sc-prompt-btn-full';
        sampleBtn.innerHTML = '<i class="fas fa-dice" style="margin-right:0.4rem;"></i>Load Sample Student';
        promptCard.appendChild(sampleBtn);

        overlay.appendChild(promptCard);

        // State B: Spinner
        var spinnerArea = document.createElement('div');
        spinnerArea.className = 'sc-spinner-area';
        new uiSpinner({ template: 'dots', size: 'lg', parent: spinnerArea });
        var spinnerLabel = document.createElement('div');
        spinnerLabel.className = 'sc-loading-label';
        spinnerLabel.textContent = 'Loading student data...';
        spinnerArea.appendChild(spinnerLabel);
        this._spinnerArea = spinnerArea;
        this._spinnerLabel = spinnerLabel;

        overlay.appendChild(spinnerArea);
        appEl.appendChild(overlay);

        // Wire events
        var self = this;
        loadBtn.addEventListener('click', function() { self._doLoad(studentInput.value); });
        studentInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') self._doLoad(studentInput.value); });
        sampleBtn.addEventListener('click', function() {
            self._showSpinner('Fetching sample student...');
            self._panel.loadStudent(null);
        });
    }

    // ── Overlay transitions ─────────────────────────────────────────────────

    _doLoad(studentNumber) {
        var num = (studentNumber || '').trim();
        if (!num) {
            this._errorMsg.textContent = 'Please enter a student number';
            this._errorMsg.classList.add('is-visible');
            return;
        }
        this._showSpinner('Loading student ' + num + '...');
        this._panel.loadStudent(num);
    }

    _showSpinner(label) {
        this._promptCard.classList.add('is-hidden');
        this._spinnerLabel.textContent = label || 'Loading student data...';
        this._spinnerArea.classList.add('is-visible');
        this._errorMsg.classList.remove('is-visible');
    }

    _showPrompt() {
        this._promptCard.classList.remove('is-hidden');
        this._spinnerArea.classList.remove('is-visible');
    }

    _hideOverlay() {
        this._overlay.classList.add('is-hidden');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentCentralApp;
}
if (typeof window !== 'undefined') {
    window.StudentCentralApp = StudentCentralApp;
}
