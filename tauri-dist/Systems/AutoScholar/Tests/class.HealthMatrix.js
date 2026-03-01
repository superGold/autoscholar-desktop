/**
 * class.HealthMatrix.js — Programme Health Matrix
 *
 * Central visual for the AutoScholar Dashboard. Renders a heatmap-table hybrid:
 *   Rows = programmes (sorted worst-first by crisis count)
 *   Cols = health dimensions (metric categories)
 *   Cells = semantic color (success/warning/danger) + micro-trend arrow
 *
 * Clicks on a cell emit 'matrix:cellClicked' via EventBus for drill-down.
 *
 * Usage:
 *   const matrix = new HealthMatrix({ engine, publome, year, bus });
 *   matrix.render(container);
 */
class HealthMatrix {

    static HEALTH_COLORS = {
        success: { bg: 'var(--ui-green-100)', text: 'var(--ui-green-700)', border: 'var(--ui-green-300)' },
        warning: { bg: 'var(--ui-amber-100)', text: 'var(--ui-amber-700)', border: 'var(--ui-amber-300)' },
        danger:  { bg: 'var(--ui-red-100)',   text: 'var(--ui-red-700)',   border: 'var(--ui-red-300)' },
        unknown: { bg: 'var(--ui-gray-100)',  text: 'var(--ui-gray-500)',  border: 'var(--ui-gray-200)' }
    };

    static TREND_ARROWS = {
        up:   '↑',
        down: '↓',
        flat: '→'
    };

    constructor({ engine, publome, year, bus }) {
        this.engine  = engine;
        this.publome = publome;
        this.year    = year || new Date().getFullYear();
        this.bus     = bus;
        this._el     = null;
    }

    // ── Public ──────────────────────────────────────────────────────────────

    render(container) {
        this._el = container;
        this._el.innerHTML = '';

        const entityTable = this.publome.table('entity');
        const root = entityTable.all().find(e => !e.get('parentId'));
        if (!root) {
            this._renderEmpty(container, 'No institution entity found');
            return;
        }

        // Get all programme-level entities (type === 'programme')
        const programmes = this._getProgrammes(root.get('idx'));
        if (programmes.length === 0) {
            this._renderEmpty(container, 'No programme data available');
            return;
        }

        // Get health dimensions from metric categories
        const categories = this.engine.getMetricsByCategory(root.get('idx'), this.year);

        // Build matrix data: each programme → category health scores
        const rows = this._buildMatrixRows(programmes, categories);

        // Sort worst-first (most danger cells at top)
        rows.sort((a, b) => b.crisisCount - a.crisisCount);

        this._renderMatrix(container, rows, categories);
    }

    connectBus(bus) {
        this.bus = bus;
        if (bus) {
            bus.on('year:changed', ({ year }) => {
                this.year = year;
                if (this._el) this.render(this._el);
            });
            bus.on('exec:loaded', () => {
                if (this._el) this.render(this._el);
            });
        }
    }

    // ── Data ────────────────────────────────────────────────────────────────

    _getProgrammes(rootIdx) {
        const entityTable = this.publome.table('entity');
        const all = entityTable.all();

        // Collect all programme-type entities
        const programmes = all.filter(e => e.get('type') === 'programme');
        if (programmes.length > 0) return programmes;

        // Fallback: get direct children of root (faculties), then their children
        const faculties = all.filter(e => e.get('parentId') === rootIdx);
        const children = [];
        for (const fac of faculties) {
            const progs = all.filter(e => e.get('parentId') === fac.get('idx'));
            children.push(...progs);
        }
        return children.length > 0 ? children : faculties;
    }

    _buildMatrixRows(programmes, categories) {
        const years = this.engine.getYears();
        const prevYear = years.find(y => y < this.year) || null;

        return programmes.map(prog => {
            const eIdx = prog.get('idx');
            const catMetrics = this.engine.getMetricsByCategory(eIdx, this.year);

            let crisisCount = 0;
            const cells = catMetrics.map(cat => {
                // Aggregate category health: worst status of any metric in category
                const statuses = cat.metrics.map(m => m.status);
                const worst = this._worstStatus(statuses);
                if (worst === 'danger') crisisCount++;

                // Compute trend from previous year
                const trend = prevYear ? this._computeCategoryTrend(cat, eIdx, prevYear) : 'flat';

                // Average value for display
                const values = cat.metrics.filter(m => m.value !== null).map(m => m.value);
                const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null;

                return {
                    categoryIdx: cat.idx,
                    categoryName: cat.name,
                    status: worst,
                    trend,
                    avg,
                    metricCount: cat.metrics.length,
                    dangerCount: statuses.filter(s => s === 'danger').length
                };
            });

            return {
                idx: eIdx,
                name: prog.get('name'),
                code: prog.get('code'),
                type: prog.get('type'),
                students: prog.get('students') || 0,
                crisisCount,
                cells
            };
        });
    }

    _worstStatus(statuses) {
        if (statuses.includes('danger')) return 'danger';
        if (statuses.includes('warning')) return 'warning';
        if (statuses.includes('success')) return 'success';
        return 'unknown';
    }

    _computeCategoryTrend(category, entityIdx, prevYear) {
        let currentSum = 0, prevSum = 0, count = 0;
        for (const m of category.metrics) {
            const current = m.value;
            const prev = this.engine.getValue(m.idx, entityIdx, prevYear);
            if (current !== null && prev !== null) {
                currentSum += current;
                prevSum += prev;
                count++;
            }
        }
        if (count === 0) return 'flat';
        const delta = (currentSum / count) - (prevSum / count);
        if (delta > 1) return 'up';
        if (delta < -1) return 'down';
        return 'flat';
    }

    // ── Render ──────────────────────────────────────────────────────────────

    _renderMatrix(container, rows, categories) {
        const wrapper = document.createElement('div');
        wrapper.className = 'as-health-matrix';

        // Header
        const header = document.createElement('div');
        header.className = 'as-health-matrix-header';
        header.innerHTML = `
            <div class="as-health-matrix-title">
                <i class="fas fa-th"></i> Programme Health Matrix
            </div>
            <div class="as-health-matrix-legend">
                <span class="as-health-legend-item" style="--legend-color:var(--ui-green-500);">Good</span>
                <span class="as-health-legend-item" style="--legend-color:var(--ui-amber-500);">Warning</span>
                <span class="as-health-legend-item" style="--legend-color:var(--ui-red-500);">Crisis</span>
            </div>
        `;
        wrapper.appendChild(header);

        // Table
        const table = document.createElement('table');
        table.className = 'as-health-matrix-table';

        // Thead
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        headRow.innerHTML = '<th class="as-health-matrix-th-prog">Programme</th>';
        if (rows.length > 0 && rows[0].cells.length > 0) {
            for (const cell of rows[0].cells) {
                headRow.innerHTML += `<th class="as-health-matrix-th-cat">${cell.categoryName}</th>`;
            }
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Tbody
        const tbody = document.createElement('tbody');
        for (const row of rows) {
            const tr = document.createElement('tr');
            tr.className = row.crisisCount > 0 ? 'as-health-matrix-row-crisis' : '';

            // Programme name cell
            const nameCell = document.createElement('td');
            nameCell.className = 'as-health-matrix-prog';
            nameCell.innerHTML = `
                <span class="as-health-matrix-prog-name">${row.name}</span>
                <span class="as-health-matrix-prog-meta">${row.code || ''} · ${row.students} students</span>
            `;
            tr.appendChild(nameCell);

            // Health dimension cells
            for (const cell of row.cells) {
                const td = document.createElement('td');
                const colors = HealthMatrix.HEALTH_COLORS[cell.status];
                td.className = 'as-health-matrix-cell as-clickable';
                td.style.cssText = `background:${colors.bg};color:${colors.text};border-color:${colors.border};`;

                const arrow = HealthMatrix.TREND_ARROWS[cell.trend] || '';
                const arrowClass = cell.trend === 'up' ? 'as-trend-up' : cell.trend === 'down' ? 'as-trend-down' : 'as-trend-flat';

                td.innerHTML = `
                    <span class="as-health-matrix-value">${cell.avg !== null ? cell.avg + '%' : '—'}</span>
                    <span class="as-health-matrix-trend ${arrowClass}">${arrow}</span>
                `;

                // Drill-down click
                td.addEventListener('click', () => {
                    if (this.bus) {
                        this.bus.emit('matrix:cellClicked', {
                            entityIdx: row.idx,
                            entityName: row.name,
                            categoryIdx: cell.categoryIdx,
                            categoryName: cell.categoryName,
                            status: cell.status
                        });
                    }
                });

                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        wrapper.appendChild(table);
        container.appendChild(wrapper);
    }

    _renderEmpty(container, message) {
        container.innerHTML = `
            <div class="as-empty-state">
                <i class="fas fa-th as-empty-state-icon"></i>
                <div class="as-empty-state-text">${message}</div>
            </div>
        `;
    }
}
