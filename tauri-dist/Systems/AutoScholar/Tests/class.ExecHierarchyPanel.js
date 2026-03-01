/**
 * ExecHierarchyPanel — Assessment Performance: institutional drill-down
 *
 * Drills through the institution hierarchy to compare assessment outcomes.
 * Navigate institution → faculties → programmes → courses, filtering by
 * assessment type (TM_1, TM_2, Final Exam, etc.) and denominator (completed/registered).
 *
 * Layout: uiControlStage — tree in control, detail + DataTables in stage
 * Emits: entity:selected via EventBus when user clicks a tree node
 *
 * Usage:
 *   const panel = new ExecHierarchyPanel({ publome, engine, year: 2025 });
 *   panel.render(container);
 */
class ExecHierarchyPanel {

    constructor(config = {}) {
        this.publome = config.publome;
        this.engine  = config.engine;
        this.year    = config.year || 2025;
        this._loader = config.loader;
        this._container = null;
        this._controlEl = null;
        this._stageEl = null;
        this._entityBinding = null;
        this._selectedIdx = null;
        this._markType = 'final';
        this._denominator = 'completed';
        this._comparisonMode = false;
        this._prevYearMode = false;
    }

    connectBus(bus) {
        this._bus = bus;
        bus.on('exec:loaded', () => {
            // Rebuild tree after data arrives (entity table now populated)
            if (this._controlEl) this._renderControl();
        });
        bus.on('year:changed', (data) => {
            this.year = data.year;
            this.engine.clearCache();
            this._refreshStage();
        });
        return this;
    }

    render(container) {
        this._container = container;
        container.innerHTML = '';

        // Create control-stage layout
        const cs = new uiControlStage({
            controlSize: 'md',
            template: 'unified',
            parent: container
        });

        this._controlEl = cs.getControlPanel();
        this._stageEl = cs.getStage();

        this._renderEmptyStage();
        this._renderControl();
    }

    // ── Control Panel ────────────────────────────────────────────────

    _renderControl() {
        const el = this._controlEl;
        el.innerHTML = '';

        // Clean up previous selection listener to avoid stacking
        if (this._unsubSelect) { this._unsubSelect(); this._unsubSelect = null; }

        // Header
        const header = document.createElement('div');
        header.className = 'ui-control-stage-header';
        header.innerHTML = '<i class="fas fa-chart-bar"></i>Assessment Performance';
        el.appendChild(header);

        // Entity tree using UIBinding.bindTree
        const treeContainer = document.createElement('div');
        el.appendChild(treeContainer);

        const entityTable = this.publome.table('entity');
        this._entityBinding = new UIBinding(entityTable, { publome: this.publome });
        this._entityBinding.bindTree(treeContainer, {
            parentField: 'parentId',
            map: (record) => ({
                label: record.get('name'),
                iconHtml: `<i class="fas fa-${record.get('icon') || 'circle'}" style="font-size:0.65rem;opacity:0.7;"></i>`,
                badge: record.get('students') ? String(record.get('students')) : null
            })
        });

        // Listen for selection on entity table
        this._unsubSelect = entityTable.on('selected', (data) => {
            const idx = data.record ? data.record.get('idx') : [...data.selected][0];
            this._selectedIdx = idx;
            if (this._bus) this._bus.emit('entity:selected', { idx });
            this._refreshStage();
        });

        // Auto-select institution root
        const inst = entityTable.all().find(e => e.get('type') === 'institution');
        if (inst) {
            entityTable.select(inst.get('idx'));
        }
    }

    // ── Stage Panel ──────────────────────────────────────────────────

    _renderEmptyStage() {
        this._stageEl.innerHTML = `
            <div class="ex-empty">
                <i class="fas fa-arrow-left"></i>Select an entity from the tree
            </div>
        `;
    }

    _refreshStage() {
        if (!this._stageEl || !this._selectedIdx) return;
        const stage = this._stageEl;
        stage.innerHTML = '';

        const entityTable = this.publome.table('entity');
        const entity = entityTable.read(this._selectedIdx);
        if (!entity) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'ex-stage-wrap';

        // ── Breadcrumb ───────────────────────────────────────────
        const breadcrumb = this.engine.getBreadcrumb(this._selectedIdx);
        const bcEl = document.createElement('div');
        bcEl.className = 'ex-breadcrumb';
        bcEl.innerHTML = breadcrumb.map((b, i) => {
            const isLast = i === breadcrumb.length - 1;
            const cls = isLast ? 'ex-breadcrumb-item active' : 'ex-breadcrumb-item';
            return `<span class="${cls}" data-idx="${b.idx}">${b.name}</span>${!isLast ? '<i class="fas fa-chevron-right ex-breadcrumb-sep"></i>' : ''}`;
        }).join('');
        // Breadcrumb click navigation
        bcEl.querySelectorAll('span[data-idx]').forEach(span => {
            span.addEventListener('click', () => {
                const idx = parseInt(span.dataset.idx, 10);
                entityTable.select(idx);
            });
        });
        wrapper.appendChild(bcEl);

        // ── Entity Header ────────────────────────────────────────
        const headerEl = document.createElement('div');
        headerEl.className = 'ex-row ex-mb-xl';
        headerEl.style.gap = '0.6rem';
        const iconName = entity.get('icon') || 'building';
        const typeBadgeColor = entity.get('type') === 'institution' ? 'var(--ex-clr-purple)' :
                               entity.get('type') === 'faculty' ? 'var(--ex-clr-primary)' : 'var(--ex-clr-success)';
        headerEl.innerHTML = `
            <div class="ex-entity-icon-box-lg" style="background:${typeBadgeColor}15;">
                <i class="fas fa-${iconName}" style="font-size:1rem;color:${typeBadgeColor};"></i>
            </div>
            <div>
                <div class="ex-entity-name">${entity.get('name')}</div>
                <div class="ex-entity-detail">${entity.get('code')} | ${entity.get('type')} | ${entity.get('students') || 0} students</div>
            </div>
        `;
        wrapper.appendChild(headerEl);

        // ── Key Metrics Row ──────────────────────────────────────
        const kpis = this.engine.getKPIs(this._selectedIdx, this.year);
        const keyMetrics = ['course-pass-rate', 'course-mean', 'graduation-rate', 'retention-rate'];
        const metricsRow = document.createElement('div');
        metricsRow.className = 'ex-kpi-row';
        for (const code of keyMetrics) {
            const kpi = kpis[code];
            if (!kpi) continue;
            const statusClr = kpi.status === 'success' ? 'var(--ex-clr-success)' : kpi.status === 'warning' ? 'var(--ex-clr-warning)' : 'var(--ex-clr-danger)';
            const val = kpi.value !== null ? (kpi.unit === 'score' ? kpi.value.toFixed(1) : Math.round(kpi.value)) : '—';
            const unit = kpi.unit === 'ratio' ? ':1' : kpi.unit === 'score' ? '/5' : kpi.unit || '';
            const card = document.createElement('div');
            card.className = 'ex-kpi-card';
            card.innerHTML = `
                <div class="ex-kpi-card-label">${kpi.name}</div>
                <div class="ex-kpi-value-md">${val}<span class="ex-kpi-unit">${unit}</span></div>
                <div class="ex-progress">
                    <div class="ex-progress-fill" style="width:${Math.min(100, (kpi.value / kpi.target) * 100)}%;background:${statusClr};"></div>
                </div>
            `;
            metricsRow.appendChild(card);
        }
        wrapper.appendChild(metricsRow);

        // ── Filter Bar (for faculty + programme views) ────────────
        const entityType = entity.get('type');
        if (entityType === 'faculty' || entityType === 'programme') {
            this._renderFilterBar(wrapper);
        }

        // ── Comparison mode for programmes ──────────────────────────
        if (this._comparisonMode && entityType === 'programme' && this._loader) {
            this._renderComparisonView(wrapper, entity);
            stage.appendChild(wrapper);
            return;
        }

        // ── Children Table / Course Drill-Down ─────────────────────
        const children = this.engine.getChildrenSummary(this._selectedIdx, this.year);
        const hasNonDefaultFilter = this._markType !== 'final' || this._denominator !== 'completed';

        if (children.length > 0 && hasNonDefaultFilter && entityType === 'faculty' && this._loader) {
            // Faculty with non-default filters — recompute programme stats from course data
            this._renderFilteredFacultyChildren(wrapper, children, entityTable);
        } else if (children.length > 0) {
            this._renderChildrenTable(wrapper, children, entityTable);
        } else if (entityType === 'programme' && this._loader) {
            // Programme with no children — fetch course drill-down
            this._renderCourseDrillDown(wrapper, entity);
        } else if (entityType === 'programme') {
            // No loader — show programme summary from engine data
            this._renderProgrammeSummary(wrapper, entity);
        }

        stage.appendChild(wrapper);
    }

    // ── Course Drill-Down ────────────────────────────────────────────

    _renderCourseDrillDown(wrapper, entity) {
        const progCode = entity.get('code');

        // Spinner placeholder
        const spinnerWrap = document.createElement('div');
        spinnerWrap.className = 'ex-empty';
        new uiSpinner({ template: 'dots', size: 'md', parent: spinnerWrap });
        const spinLabel = document.createElement('div');
        spinLabel.className = 'ex-empty-msg';
        spinLabel.textContent = 'Loading courses...';
        spinnerWrap.appendChild(spinLabel);
        wrapper.appendChild(spinnerWrap);

        // Track which entity we're loading for (guard against stale responses)
        const loadIdx = this._selectedIdx;

        const statsOpts = { markType: this._markType, denominator: this._denominator };
        const fetches = [this._loader.getCourseStats(progCode, this.year, statsOpts)];
        if (this._prevYearMode) fetches.push(this._loader.getCourseStats(progCode, this.year - 1, statsOpts));
        Promise.all(fetches).then(([courseStats, prevYearStats]) => {
            if (this._selectedIdx !== loadIdx) return;
            spinnerWrap.remove();
            this._renderCourseTable(wrapper, courseStats, prevYearStats || null);
        }).catch((err) => {
            console.error('[ExecHierarchy] Course data fetch failed:', err);
            if (this._selectedIdx !== loadIdx) return;
            spinnerWrap.remove();
            const errEl = document.createElement('div');
            errEl.className = 'ex-empty';
            errEl.textContent = 'Could not load course data: ' + (err.message || err);
            wrapper.appendChild(errEl);
        });
    }

    /** Fallback when no loader — show programme metrics summary */
    _renderProgrammeSummary(wrapper, entity) {
        const kpis = this.engine.getKPIs(entity.get('idx'), this.year);
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ex-section-title';
        sectionTitle.textContent = 'Programme Metrics Summary';
        wrapper.appendChild(sectionTitle);

        const infoEl = document.createElement('div');
        infoEl.className = 'ex-info-box ex-mb-lg';
        infoEl.innerHTML = '<i class="fas fa-info-circle" style="margin-right:0.4rem;color:var(--ui-primary);"></i>' +
            'Course-level drill-down requires a data connection. Showing programme-level metrics.';
        wrapper.appendChild(infoEl);

        // Show all available KPIs as a detailed list
        const allMetrics = Object.values(kpis).filter(k => k.value !== null);
        if (allMetrics.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'ex-empty';
            emptyEl.textContent = 'No metric data available for this programme.';
            wrapper.appendChild(emptyEl);
            return;
        }

        const tableWrap = document.createElement('div');
        wrapper.appendChild(tableWrap);

        new uiTable({
            template: 'compact',
            paging: false, searching: false, info: false,
            columns: [
                { key: 'name', label: 'Metric' },
                { key: 'value', label: 'Value', render: (d, t) => {
                    if (t !== 'display') return d ?? -1;
                    return d != null ? `<span style="font-weight:600;">${typeof d === 'number' ? Math.round(d * 10) / 10 : d}</span>` : '\u2014';
                }},
                { key: 'target', label: 'Target' },
                { key: 'status', label: 'Status', render: (d, t) => {
                    if (t !== 'display') return d || '';
                    const cls = d === 'success' ? 'ex-clr-success' : d === 'warning' ? 'ex-clr-warning' : 'ex-clr-danger';
                    return `<span style="color:var(--${cls});font-weight:600;text-transform:capitalize;">${d || '\u2014'}</span>`;
                }}
            ],
            data: allMetrics.map(k => ({ name: k.name, value: k.value, target: k.target, status: k.status })),
            parent: tableWrap
        });
    }

    _renderCourseTable(wrapper, courseStats, prevYearStats) {
        if (!courseStats || courseStats.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'ex-empty';
            emptyEl.textContent = 'No course results available.';
            wrapper.appendChild(emptyEl);
            return;
        }

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ex-section-title';
        sectionTitle.textContent = `Courses (${courseStats.length})`;
        wrapper.appendChild(sectionTitle);

        // Merge previous year data if available
        const prevMap = new Map();
        if (prevYearStats) {
            for (const c of prevYearStats) prevMap.set(c.courseCode, c);
        }
        const data = courseStats.map(c => {
            const prev = prevMap.get(c.courseCode);
            return {
                ...c,
                deltaPR: prev && c.passRate != null && prev.passRate != null ? Math.round((c.passRate - prev.passRate) * 10) / 10 : null,
                deltaMn: prev && c.mean != null && prev.mean != null ? Math.round((c.mean - prev.mean) * 10) / 10 : null
            };
        });

        const tableWrap = document.createElement('div');
        wrapper.appendChild(tableWrap);

        const columns = [
            { key: 'courseCode', label: 'Code' },
            { key: 'courseLabel', label: 'Course' },
            { key: 'students', label: 'Students' },
            { key: 'passRate', label: 'Pass Rate', render: (d, type) => {
                if (type !== 'display') return d != null ? d : -1;
                return d != null ? `<span class="${this._heatmapClass(d, 'pass')}" style="padding:0.1rem 0.3rem;border-radius:2px;color:${this._valColor(d, 70, 60)};font-weight:600;">${d}%</span>` : '\u2014';
            }},
            { key: 'mean', label: 'Mean', render: (d, type) => {
                if (type !== 'display') return d != null ? d : -1;
                return d != null ? `<span class="${this._heatmapClass(d, 'mean')}" style="padding:0.1rem 0.3rem;border-radius:2px;color:${this._valColor(d, 60, 50)};font-weight:600;">${d}</span>` : '\u2014';
            }}
        ];

        if (prevYearStats) {
            columns.push(
                { key: 'deltaPR', label: '\u0394 Pass', render: (d, t) => {
                    if (t !== 'display') return d ?? 0;
                    if (d == null) return '\u2014';
                    return `<span style="font-size:0.65rem;color:${d >= 0 ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)'}">${d >= 0 ? '+' : ''}${d}</span>`;
                }},
                { key: 'deltaMn', label: '\u0394 Mean', render: (d, t) => {
                    if (t !== 'display') return d ?? 0;
                    if (d == null) return '\u2014';
                    return `<span style="font-size:0.65rem;color:${d >= 0 ? 'var(--ex-clr-success)' : 'var(--ex-clr-danger)'}">${d >= 0 ? '+' : ''}${d}</span>`;
                }}
            );
        }

        const tbl = new uiTable({
            template: 'compact', paging: data.length > 25, pageLength: 25,
            searching: data.length > 10, info: data.length > 25,
            columns, data, parent: tableWrap
        });

        // Student drill-down: click a course row
        if (this._loader) {
            const entity = this.publome.table('entity').read(this._selectedIdx);
            const progCode = entity ? entity.get('code') : null;
            if (progCode) {
                this._bindTableRowClick(tbl, (cellData) => {
                    const code = cellData ? cellData[0] : null;
                    if (!code) return;
                    // Toggle: remove existing drill-down or add new one
                    const existing = tableWrap.querySelector('.ex-student-drilldown');
                    if (existing) { existing.remove(); return; }
                    const dd = document.createElement('div');
                    dd.className = 'ex-student-drilldown';
                    const ddTitle = document.createElement('div');
                    ddTitle.className = 'ex-drilldown-title';
                    ddTitle.textContent = `Students — ${code}`;
                    dd.appendChild(ddTitle);
                    this._renderStudentDrillDown(dd, code, progCode);
                    tableWrap.appendChild(dd);
                });
            }
        }
    }

    // ── Children Table (default) ──────────────────────────────────

    _renderChildrenTable(wrapper, children, entityTable) {
        const entity = this.publome.table('entity').read(this._selectedIdx);
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ex-section-title';
        sectionTitle.textContent = entity.get('type') === 'institution' ? 'Faculties' :
                                  entity.get('type') === 'faculty' ? 'Programmes' : 'Sub-entities';
        wrapper.appendChild(sectionTitle);

        const tableWrap = document.createElement('div');
        wrapper.appendChild(tableWrap);

        // Prepare data with flat keys for uiTable
        const data = children.map(c => ({
            _idx: c.idx, name: c.name, students: c.students,
            passRate: c['course-pass-rate'] != null ? Math.round(c['course-pass-rate'] * 10) / 10 : null,
            mean: c['course-mean'] != null ? Math.round(c['course-mean'] * 10) / 10 : null,
            gradRate: c['graduation-rate'] != null ? Math.round(c['graduation-rate'] * 10) / 10 : null,
            retRate: c['retention-rate'] != null ? Math.round(c['retention-rate'] * 10) / 10 : null
        }));

        const tbl = new uiTable({
            template: 'compact',
            paging: data.length > 25,
            pageLength: 25,
            searching: data.length > 10,
            info: data.length > 25,
            colReorder: false,
            colVisibility: false,
            columns: [
                { key: '_idx', label: '_idx', visible: false },
                { key: 'name', label: 'Name' },
                { key: 'students', label: 'Students' },
                { key: 'passRate', label: 'Pass Rate', render: (d, type) => {
                    if (type !== 'display') return d != null ? d : -1;
                    return d != null ? `<span class="${this._heatmapClass(d, 'pass')}" style="padding:0.1rem 0.3rem;border-radius:2px;color:${this._valColor(d, 70, 60)};font-weight:600;">${Math.round(d)}%</span>` : '—';
                }},
                { key: 'mean', label: 'Mean', render: (d, type) => {
                    if (type !== 'display') return d != null ? d : -1;
                    return d != null ? `<span class="${this._heatmapClass(d, 'mean')}" style="padding:0.1rem 0.3rem;border-radius:2px;color:${this._valColor(d, 60, 50)};font-weight:600;">${Math.round(d)}%</span>` : '—';
                }},
                { key: 'gradRate', label: 'Graduation', render: (d, type) => {
                    if (type !== 'display') return d != null ? d : -1;
                    return d != null ? `<span style="color:${this._valColor(d, 75, 65)};font-weight:600;">${Math.round(d)}%</span>` : '—';
                }},
                { key: 'retRate', label: 'Retention', render: (d, type) => {
                    if (type !== 'display') return d != null ? d : -1;
                    return d != null ? `<span style="color:${this._valColor(d, 85, 75)};font-weight:600;">${Math.round(d)}%</span>` : '—';
                }}
            ],
            data,
            parent: tableWrap
        });

        // Row click navigates to child entity — read hidden _idx column (col 0)
        this._bindTableRowClick(tbl, (cellData) => {
            const idx = cellData ? parseInt(cellData[0], 10) : null;
            if (idx) entityTable.select(idx);
        });
    }

    // ── Filtered Faculty Children (recomputed from course data) ──

    _renderFilteredFacultyChildren(wrapper, children, entityTable) {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ex-section-title';
        sectionTitle.textContent = 'Programmes';
        wrapper.appendChild(sectionTitle);

        // Spinner while loading
        const spinnerWrap = document.createElement('div');
        spinnerWrap.className = 'ex-empty';
        new uiSpinner({ template: 'dots', size: 'md', parent: spinnerWrap });
        const spinLabel = document.createElement('div');
        spinLabel.className = 'ex-empty-msg';
        spinLabel.textContent = 'Recomputing stats...';
        spinnerWrap.appendChild(spinLabel);
        wrapper.appendChild(spinnerWrap);

        const loadIdx = this._selectedIdx;
        const statsOpts = { markType: this._markType, denominator: this._denominator };

        // Fetch per-course stats for each child programme, then aggregate
        Promise.all(children.map(async (child) => {
            const courseStats = await this._loader.getCourseStats(child.code, this.year, statsOpts);
            let totalStudents = 0, passSum = 0, passDenom = 0, meanSum = 0, meanDenom = 0;
            for (const c of courseStats) {
                totalStudents += c.students || 0;
                if (c.passRate != null) { passSum += c.passRate * c.students; passDenom += c.students; }
                if (c.mean != null) { meanSum += c.mean * c.students; meanDenom += c.students; }
            }
            return {
                idx: child.idx, name: child.name, students: child.students,
                passRate: passDenom > 0 ? Math.round((passSum / passDenom) * 10) / 10 : null,
                mean: meanDenom > 0 ? Math.round((meanSum / meanDenom) * 10) / 10 : null
            };
        })).then(rows => {
            if (this._selectedIdx !== loadIdx) return;
            spinnerWrap.remove();

            const tableWrap = document.createElement('div');
            wrapper.appendChild(tableWrap);

            const tbl = new uiTable({
                template: 'compact',
                paging: rows.length > 25,
                pageLength: 25,
                searching: rows.length > 10,
                info: rows.length > 25,
                colReorder: false,
                colVisibility: false,
                columns: [
                    { key: 'idx', label: 'idx', visible: false },
                    { key: 'name', label: 'Name' },
                    { key: 'students', label: 'Students' },
                    { key: 'passRate', label: 'Pass Rate', render: (d, type) => {
                        if (type !== 'display') return d != null ? d : -1;
                        return d != null ? `<span class="${this._heatmapClass(d, 'pass')}" style="padding:0.1rem 0.3rem;border-radius:2px;color:${this._valColor(d, 70, 60)};font-weight:600;">${d}%</span>` : '—';
                    }},
                    { key: 'mean', label: 'Mean', render: (d, type) => {
                        if (type !== 'display') return d != null ? d : -1;
                        return d != null ? `<span class="${this._heatmapClass(d, 'mean')}" style="padding:0.1rem 0.3rem;border-radius:2px;color:${this._valColor(d, 60, 50)};font-weight:600;">${d}</span>` : '—';
                    }}
                ],
                data: rows,
                parent: tableWrap
            });

            // Row click navigates to child entity — read hidden idx column (col 0)
            this._bindTableRowClick(tbl, (cellData) => {
                const idx = cellData ? parseInt(cellData[0], 10) : null;
                if (idx) entityTable.select(idx);
            });
        }).catch(() => {
            if (this._selectedIdx !== loadIdx) return;
            spinnerWrap.remove();
            const errEl = document.createElement('div');
            errEl.className = 'ex-empty';
            errEl.textContent = 'Could not recompute programme stats.';
            wrapper.appendChild(errEl);
        });
    }

    // ── Filter Bar ─────────────────────────────────────────────────

    _renderFilterBar(wrapper) {
        const bar = document.createElement('div');
        bar.className = 'ex-filter-bar';

        const markTypes = [
            { value: 'final', label: 'Final Mark' },
            { value: 'TM_1',  label: 'TM 1' },
            { value: 'TM_2',  label: 'TM 2' },
            { value: 'TM_3',  label: 'TM 3' },
            { value: 'FINAL', label: 'Final Exam' },
            { value: 'PRAC',  label: 'Practical' },
            { value: 'PROJ',  label: 'Project' }
        ];
        const denoms = [
            { value: 'completed',  label: 'Completed' },
            { value: 'registered', label: 'Registered' }
        ];

        // Mark type row
        const mtRow = document.createElement('div');
        mtRow.className = 'ex-filter-row';
        mtRow.innerHTML = '<span class="ex-filter-label">Mark Type</span>';
        for (const mt of markTypes) {
            const btn = document.createElement('span');
            btn.className = 'ex-filter-btn' + (this._markType === mt.value ? ' active' : '');
            btn.textContent = mt.label;
            btn.addEventListener('click', () => {
                this._markType = mt.value;
                this._refreshStage();
            });
            mtRow.appendChild(btn);
        }
        bar.appendChild(mtRow);

        // Denominator row
        const dRow = document.createElement('div');
        dRow.className = 'ex-filter-row';
        dRow.innerHTML = '<span class="ex-filter-label">Based on</span>';
        for (const d of denoms) {
            const btn = document.createElement('span');
            btn.className = 'ex-filter-btn' + (this._denominator === d.value ? ' active' : '');
            btn.textContent = d.label;
            btn.addEventListener('click', () => {
                this._denominator = d.value;
                this._refreshStage();
            });
            dRow.appendChild(btn);
        }
        bar.appendChild(dRow);

        // Toggle buttons row: Compare mode + Previous Year
        const toggleRow = document.createElement('div');
        toggleRow.className = 'ex-filter-row';
        toggleRow.style.marginTop = '0.2rem';
        toggleRow.innerHTML = '<span class="ex-filter-label">Modes</span>';

        const compBtn = document.createElement('span');
        compBtn.className = 'ex-filter-btn' + (this._comparisonMode ? ' active' : '');
        compBtn.innerHTML = '<i class="fas fa-columns" style="margin-right:0.2rem;font-size:0.55rem;"></i>Compare';
        compBtn.addEventListener('click', () => { this._comparisonMode = !this._comparisonMode; this._prevYearMode = false; this._refreshStage(); });
        toggleRow.appendChild(compBtn);

        const prevBtn = document.createElement('span');
        prevBtn.className = 'ex-filter-btn' + (this._prevYearMode ? ' active' : '');
        prevBtn.innerHTML = '<i class="fas fa-history" style="margin-right:0.2rem;font-size:0.55rem;"></i>vs. Previous Year';
        prevBtn.addEventListener('click', () => { this._prevYearMode = !this._prevYearMode; this._comparisonMode = false; this._refreshStage(); });
        toggleRow.appendChild(prevBtn);

        bar.appendChild(toggleRow);

        wrapper.appendChild(bar);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Bind row click on a uiTable (works with DataTables pagination/sorting).
     * Callback receives the row's cell data array.
     */
    _bindTableRowClick(tbl, callback) {
        const tableEl = tbl._table || tbl.el?.querySelector('table');
        if (!tableEl) return;

        // CSS cursor for all rows (including future paginated rows)
        tableEl.style.cssText += ';cursor:pointer;';
        const style = document.createElement('style');
        style.textContent = `#${tableEl.id} tbody tr { cursor: pointer; }`;
        tableEl.parentNode.insertBefore(style, tableEl);

        if (tbl._dtInstance && typeof jQuery !== 'undefined') {
            // DataTables: delegated event + row().data() for sort-safe access
            jQuery(tableEl).on('click', 'tbody tr', function() {
                const cellData = tbl._dtInstance.row(this).data();
                if (cellData) callback(cellData);
            });
        } else {
            // Fallback: plain DOM click
            tableEl.addEventListener('click', (e) => {
                const row = e.target.closest('tbody tr');
                if (!row) return;
                const cells = [...row.querySelectorAll('td')].map(td => td.textContent);
                callback(cells);
            });
        }
    }

    _valColor(val, good, ok) { return ExecMetrics.valColor(val, good, ok); }

    _heatmapClass(value, type) { return ExecMetrics.heatmapClass(value, type); }

    /** Render comparison view: TM_1 vs TM_2 vs Final side-by-side */
    _renderComparisonView(wrapper, entity) {
        const progCode = entity.get('code');
        const spinnerWrap = document.createElement('div');
        spinnerWrap.className = 'ex-empty';
        new uiSpinner({ template: 'dots', size: 'md', parent: spinnerWrap });
        spinnerWrap.appendChild(Object.assign(document.createElement('div'), {
            className: 'ex-empty-msg', textContent: 'Loading comparison...'
        }));
        wrapper.appendChild(spinnerWrap);
        const loadIdx = this._selectedIdx;

        Promise.all([
            this._loader.getCourseStats(progCode, this.year, { markType: 'TM_1' }),
            this._loader.getCourseStats(progCode, this.year, { markType: 'TM_2' }),
            this._loader.getCourseStats(progCode, this.year, { markType: 'final' })
        ]).then(([tm1, tm2, final]) => {
            if (this._selectedIdx !== loadIdx) return;
            spinnerWrap.remove();
            // Merge by courseCode
            const codeMap = new Map();
            for (const c of final) codeMap.set(c.courseCode, { code: c.courseCode, label: c.courseLabel, fPr: c.passRate, fMn: c.mean });
            for (const c of tm1) { const r = codeMap.get(c.courseCode) || { code: c.courseCode, label: c.courseLabel }; r.t1Pr = c.passRate; r.t1Mn = c.mean; codeMap.set(c.courseCode, r); }
            for (const c of tm2) { const r = codeMap.get(c.courseCode) || { code: c.courseCode, label: c.courseLabel }; r.t2Pr = c.passRate; r.t2Mn = c.mean; codeMap.set(c.courseCode, r); }

            const data = [...codeMap.values()];
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'ex-section-title';
            sectionTitle.textContent = `Assessment Comparison (${data.length} courses)`;
            wrapper.appendChild(sectionTitle);

            const tableWrap = document.createElement('div');
            wrapper.appendChild(tableWrap);
            new uiTable({
                template: 'compact', paging: data.length > 25, pageLength: 25,
                searching: data.length > 10, info: data.length > 25,
                columns: [
                    { key: 'code', label: 'Code' },
                    { key: 'label', label: 'Course' },
                    { key: 't1Pr', label: 'TM1 Pass%', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span class="${this._heatmapClass(d, 'pass')}" style="padding:0.1rem 0.3rem;border-radius:2px;font-weight:600;color:${this._valColor(d,70,60)}">${d}%</span>` : '\u2014' },
                    { key: 't1Mn', label: 'TM1 Mean', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span class="${this._heatmapClass(d, 'mean')}" style="padding:0.1rem 0.3rem;border-radius:2px;">${d}</span>` : '\u2014' },
                    { key: 't2Pr', label: 'TM2 Pass%', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span class="${this._heatmapClass(d, 'pass')}" style="padding:0.1rem 0.3rem;border-radius:2px;font-weight:600;color:${this._valColor(d,70,60)}">${d}%</span>` : '\u2014' },
                    { key: 't2Mn', label: 'TM2 Mean', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span class="${this._heatmapClass(d, 'mean')}" style="padding:0.1rem 0.3rem;border-radius:2px;">${d}</span>` : '\u2014' },
                    { key: 'fPr', label: 'Final Pass%', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span class="${this._heatmapClass(d, 'pass')}" style="padding:0.1rem 0.3rem;border-radius:2px;font-weight:600;color:${this._valColor(d,70,60)}">${d}%</span>` : '\u2014' },
                    { key: 'fMn', label: 'Final Mean', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span class="${this._heatmapClass(d, 'mean')}" style="padding:0.1rem 0.3rem;border-radius:2px;">${d}</span>` : '\u2014' }
                ],
                data, parent: tableWrap
            });
        }).catch(() => { if (this._selectedIdx !== loadIdx) return; spinnerWrap.remove(); });
    }

    /** Render student drill-down for a course row */
    _renderStudentDrillDown(wrapper, courseCode, progCode) {
        if (this._loader?.dataSource !== 'api') {
            wrapper.innerHTML = '<div class="ex-empty"><i class="fas fa-info-circle"></i>Student drill-down requires live API connection</div>';
            return;
        }
        const spinnerWrap = document.createElement('div');
        spinnerWrap.className = 'ex-empty';
        new uiSpinner({ template: 'dots', size: 'sm', parent: spinnerWrap });
        spinnerWrap.appendChild(Object.assign(document.createElement('span'), { className: 'ex-empty-msg', textContent: 'Loading students...' }));
        wrapper.appendChild(spinnerWrap);

        Promise.all([
            this._loader._apiCall('getAssessmentResults', { courseCode, year: this.year }),
            this._loader._fetchProgrammeStudents(progCode, this.year)
        ]).then(([rawRes, progStudents]) => {
            spinnerWrap.remove();
            const allResults = this._loader._parseResponse(rawRes) || [];
            const stuNum = r => r.studentNumber || r.student_number || r.STUDENTNUMBER || '';
            const filtered = progStudents.size > 0 ? allResults.filter(r => progStudents.has(stuNum(r))) : allResults;

            // Group by student
            const stuMap = new Map();
            for (const r of filtered) {
                const sn = stuNum(r);
                if (!sn) continue;
                if (!stuMap.has(sn)) stuMap.set(sn, { studentNumber: sn });
                const code = r.assessmentCode || r.assessment_code || '';
                const mark = parseFloat(r.result || r.mark || 0);
                const stu = stuMap.get(sn);
                if (code.startsWith('TM_1')) stu.tm1 = mark;
                else if (code.startsWith('TM_2')) stu.tm2 = mark;
                else if (code.startsWith('FINAL')) stu.final = mark;
            }

            const data = [...stuMap.values()].map(s => {
                const risk = (s.tm1 != null && s.tm1 < 40 && s.tm2 != null && s.tm2 < 45) ? 'High' :
                             (s.tm1 != null && s.tm1 < 50 && s.tm2 != null && s.tm2 < 50) ? 'Medium' :
                             (s.tm1 != null && s.tm2 != null && s.tm2 < s.tm1 - 15) ? 'Declining' : '';
                return { ...s, risk };
            });

            if (data.length === 0) { wrapper.innerHTML += '<div class="ex-empty">No student results found</div>'; return; }

            new uiTable({
                template: 'compact', paging: data.length > 20, pageLength: 20, searching: data.length > 10,
                columns: [
                    { key: 'studentNumber', label: 'Student' },
                    { key: 'tm1', label: 'TM1', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span style="color:${d < 50 ? 'var(--ex-clr-danger)' : 'inherit'}">${d}</span>` : '\u2014' },
                    { key: 'tm2', label: 'TM2', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span style="color:${d < 50 ? 'var(--ex-clr-danger)' : 'inherit'}">${d}</span>` : '\u2014' },
                    { key: 'final', label: 'Final', render: (d, t) => t !== 'display' ? (d ?? -1) : d != null ? `<span style="font-weight:600;color:${d < 50 ? 'var(--ex-clr-danger)' : 'var(--ex-clr-success)'}">${d}</span>` : '\u2014' },
                    { key: 'risk', label: 'Risk', render: (d, t) => {
                        if (t !== 'display') return d || '';
                        if (!d) return '';
                        const cls = d === 'High' ? 'ex-severity-critical' : d === 'Medium' ? 'ex-severity-warning' : 'ex-severity-declining';
                        return `<span class="ex-severity-badge ${cls}">${d}</span>`;
                    }}
                ],
                data, parent: wrapper
            });
        }).catch(() => { spinnerWrap.remove(); });
    }
}
