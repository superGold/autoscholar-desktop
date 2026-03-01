/**
 * TestResultsRenderer - Renders test results into DOM
 * Produces pass/fail cards, timing badges, data previews,
 * summary bars, and progress indicators.
 *
 * @module TestResultsRenderer
 */

class TestResultsRenderer {
    /**
     * @param {HTMLElement} container - Target container for results
     */
    constructor(container) {
        this.container = container;
        this._resultCount = 0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Suite Header
    // ─────────────────────────────────────────────────────────────────────────

    renderSuiteHeader(name, description) {
        const el = document.createElement('div');
        el.className = 'tr-suite-header';
        el.innerHTML = `
            <div class="tr-suite-name">${this._esc(name)}</div>
            ${description ? `<div class="tr-suite-desc">${this._esc(description)}</div>` : ''}
        `;
        this.container.appendChild(el);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Result Card
    // ─────────────────────────────────────────────────────────────────────────

    renderTestResult(result) {
        this._resultCount++;
        const el = document.createElement('div');
        el.className = `tr-result tr-${result.status}`;

        const icon = result.status === 'passed' ? '\u2713'
            : result.status === 'failed' ? '\u2717'
            : '\u2192';

        el.innerHTML = `
            <div class="tr-result-header">
                <span class="tr-icon">${icon}</span>
                <span class="tr-name">${this._esc(result.name)}</span>
                ${this.renderTiming(result.duration)}
            </div>
            ${result.error ? this.renderError(result.error) : ''}
            ${result.data ? this._renderDataInline(result.data) : ''}
        `;

        this.container.appendChild(el);
        // Auto-scroll to latest
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Summary Bar
    // ─────────────────────────────────────────────────────────────────────────

    renderSummary(summary) {
        const el = document.createElement('div');
        el.className = 'tr-summary';

        const passRate = summary.total > 0
            ? Math.round((summary.passed / summary.total) * 100)
            : 0;

        const allPassed = summary.failed === 0 && summary.total > 0;

        el.innerHTML = `
            <div class="tr-summary-bar ${allPassed ? 'tr-all-passed' : 'tr-has-failures'}">
                <div class="tr-summary-title">${this._esc(summary.name || 'Results')}</div>
                <div class="tr-summary-stats">
                    <span class="tr-stat tr-stat-pass">${summary.passed} passed</span>
                    ${summary.failed > 0 ? `<span class="tr-stat tr-stat-fail">${summary.failed} failed</span>` : ''}
                    ${summary.skipped > 0 ? `<span class="tr-stat tr-stat-skip">${summary.skipped} skipped</span>` : ''}
                    <span class="tr-stat tr-stat-total">${summary.total} total</span>
                    <span class="tr-stat">${passRate}%</span>
                    <span class="tr-stat">${this._formatMs(summary.duration)}</span>
                </div>
            </div>
        `;

        this.container.appendChild(el);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Data Preview (collapsible)
    // ─────────────────────────────────────────────────────────────────────────

    renderDataPreview(data, maxRows = 5) {
        const el = document.createElement('div');
        el.className = 'tr-data-preview';

        if (Array.isArray(data)) {
            el.innerHTML = this._renderArray(data, maxRows);
        } else if (typeof data === 'object' && data !== null) {
            el.innerHTML = this._renderObject(data);
        } else {
            el.textContent = String(data);
        }

        this.container.appendChild(el);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Timing Badge
    // ─────────────────────────────────────────────────────────────────────────

    renderTiming(duration) {
        if (duration === undefined || duration === null) return '';

        let cls = 'tr-timing-fast';    // green: <200ms
        if (duration > 1000) cls = 'tr-timing-slow';      // red: >1s
        else if (duration > 200) cls = 'tr-timing-medium'; // yellow: 200ms-1s

        return `<span class="tr-timing ${cls}">${this._formatMs(duration)}</span>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Error Display
    // ─────────────────────────────────────────────────────────────────────────

    renderError(error) {
        return `<div class="tr-error">${this._esc(typeof error === 'string' ? error : error.message || String(error))}</div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Progress Bar
    // ─────────────────────────────────────────────────────────────────────────

    renderProgressBar(current, total) {
        let bar = this.container.querySelector('.tr-progress');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'tr-progress';
            bar.innerHTML = '<div class="tr-progress-fill"></div><div class="tr-progress-text"></div>';
            this.container.insertBefore(bar, this.container.firstChild);
        }

        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        bar.querySelector('.tr-progress-fill').style.width = `${pct}%`;
        bar.querySelector('.tr-progress-text').textContent = `${current} / ${total}`;
    }

    /**
     * Remove the progress bar
     */
    removeProgressBar() {
        const bar = this.container.querySelector('.tr-progress');
        if (bar) bar.remove();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Clear
    // ─────────────────────────────────────────────────────────────────────────

    clearResults() {
        this.container.innerHTML = '';
        this._resultCount = 0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    _esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    _formatMs(ms) {
        if (ms < 1) return '<1ms';
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    }

    _renderDataInline(data) {
        if (!data) return '';
        const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        const truncated = json.length > 300 ? json.slice(0, 300) + '...' : json;
        return `<details class="tr-data-detail"><summary>Response preview</summary><pre class="tr-data-pre">${this._esc(truncated)}</pre></details>`;
    }

    _renderArray(arr, maxRows) {
        if (arr.length === 0) return '<em>Empty array</em>';

        const rows = arr.slice(0, maxRows);
        const keys = Object.keys(rows[0] || {}).slice(0, 8);

        let html = `<div class="tr-data-count">${arr.length} record${arr.length !== 1 ? 's' : ''}</div>`;
        html += '<table class="tr-data-table"><thead><tr>';
        keys.forEach(k => { html += `<th>${this._esc(k)}</th>`; });
        html += '</tr></thead><tbody>';

        rows.forEach(row => {
            html += '<tr>';
            keys.forEach(k => {
                let val = row[k];
                if (val === null || val === undefined) val = '';
                else if (typeof val === 'object') val = JSON.stringify(val);
                else val = String(val);
                if (val.length > 40) val = val.slice(0, 40) + '...';
                html += `<td>${this._esc(val)}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        if (arr.length > maxRows) {
            html += `<div class="tr-data-more">...and ${arr.length - maxRows} more</div>`;
        }
        return html;
    }

    _renderObject(obj) {
        const entries = Object.entries(obj).slice(0, 10);
        let html = '<div class="tr-data-obj">';
        entries.forEach(([k, v]) => {
            let val = v;
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            else val = String(val ?? '');
            if (val.length > 60) val = val.slice(0, 60) + '...';
            html += `<div class="tr-data-row"><strong>${this._esc(k)}:</strong> ${this._esc(val)}</div>`;
        });
        html += '</div>';
        return html;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Static: inject styles (call once)
    // ─────────────────────────────────────────────────────────────────────────

    static injectStyles() {
        if (document.getElementById('tr-styles')) return;
        const style = document.createElement('style');
        style.id = 'tr-styles';
        style.textContent = `
            /* Suite header */
            .tr-suite-header { margin-bottom: 0.75rem; }
            .tr-suite-name { font-size: 1.1rem; font-weight: 600; color: #1f2937; }
            .tr-suite-desc { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }

            /* Result card */
            .tr-result {
                padding: 0.5rem 0.75rem;
                border-left: 3px solid #d1d5db;
                margin-bottom: 0.35rem;
                border-radius: 0 4px 4px 0;
                background: white;
                font-size: 0.85rem;
            }
            .tr-result.tr-passed { border-left-color: #22c55e; }
            .tr-result.tr-failed { border-left-color: #ef4444; background: #fef2f2; }
            .tr-result.tr-skipped { border-left-color: #f59e0b; opacity: 0.7; }

            .tr-result-header { display: flex; align-items: center; gap: 0.5rem; }
            .tr-icon { font-weight: 700; font-size: 0.9rem; }
            .tr-passed .tr-icon { color: #22c55e; }
            .tr-failed .tr-icon { color: #ef4444; }
            .tr-skipped .tr-icon { color: #f59e0b; }
            .tr-name { flex: 1; }

            /* Timing badge */
            .tr-timing {
                font-size: 0.7rem;
                padding: 0.1rem 0.4rem;
                border-radius: 9999px;
                font-weight: 500;
                white-space: nowrap;
            }
            .tr-timing-fast { background: #dcfce7; color: #15803d; }
            .tr-timing-medium { background: #fef3c7; color: #b45309; }
            .tr-timing-slow { background: #fee2e2; color: #b91c1c; }

            /* Error */
            .tr-error {
                margin-top: 0.25rem;
                padding: 0.35rem 0.5rem;
                background: #fee2e2;
                border-radius: 3px;
                color: #991b1b;
                font-size: 0.78rem;
                font-family: monospace;
                word-break: break-all;
            }

            /* Summary */
            .tr-summary { margin-top: 0.75rem; }
            .tr-summary-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.6rem 1rem;
                border-radius: 6px;
                font-size: 0.85rem;
            }
            .tr-all-passed { background: #dcfce7; border: 1px solid #86efac; }
            .tr-has-failures { background: #fee2e2; border: 1px solid #fca5a5; }
            .tr-summary-title { font-weight: 600; }
            .tr-summary-stats { display: flex; gap: 0.75rem; }
            .tr-stat { font-size: 0.8rem; }
            .tr-stat-pass { color: #15803d; font-weight: 600; }
            .tr-stat-fail { color: #b91c1c; font-weight: 600; }
            .tr-stat-skip { color: #b45309; }

            /* Progress */
            .tr-progress {
                height: 22px;
                background: #f3f4f6;
                border-radius: 4px;
                position: relative;
                margin-bottom: 0.5rem;
                overflow: hidden;
            }
            .tr-progress-fill {
                height: 100%;
                background: #3b82f6;
                border-radius: 4px;
                transition: width 0.2s;
            }
            .tr-progress-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 0.7rem;
                font-weight: 600;
                color: #374151;
            }

            /* Data preview */
            .tr-data-detail { margin-top: 0.25rem; }
            .tr-data-detail summary {
                font-size: 0.75rem;
                color: #6b7280;
                cursor: pointer;
            }
            .tr-data-pre {
                font-size: 0.7rem;
                background: #f9fafb;
                padding: 0.4rem;
                border-radius: 3px;
                overflow-x: auto;
                max-height: 200px;
                margin-top: 0.25rem;
            }

            .tr-data-preview { margin-top: 0.5rem; }
            .tr-data-count { font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; }
            .tr-data-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.75rem;
            }
            .tr-data-table th {
                background: #f3f4f6;
                padding: 0.25rem 0.5rem;
                text-align: left;
                font-weight: 600;
                border-bottom: 1px solid #e5e7eb;
            }
            .tr-data-table td {
                padding: 0.2rem 0.5rem;
                border-bottom: 1px solid #f3f4f6;
                max-width: 180px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .tr-data-more { font-size: 0.7rem; color: #9ca3af; margin-top: 0.15rem; }
            .tr-data-obj {}
            .tr-data-row { font-size: 0.78rem; margin-bottom: 0.1rem; }
        `;
        document.head.appendChild(style);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.TestResultsRenderer = TestResultsRenderer;
}
