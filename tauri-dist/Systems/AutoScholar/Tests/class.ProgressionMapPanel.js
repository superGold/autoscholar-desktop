/**
 * ProgressionMapPanel — Interactive prerequisite graph
 *
 * Courses as nodes (colored by pass rate, sized by downstream impact),
 * prerequisites as directed edges. Uses vis-network for rendering.
 * Highlights critical path and bottlenecks.
 */
class ProgressionMapPanel {

    constructor(config) {
        config = config || {};
        this._controlEl = null;
        this._stageEl = null;
        this._selectedProg = config.programme || 'NDIT';
        this._dataLoaded = false;
        this._network = null;
        this._colorBy = 'passRate';
        this._data = config.bridge || ProgAnalystData;
    }

    render(controlEl, stageEl) {
        this._controlEl = controlEl;
        this._stageEl = stageEl;
        this._buildControl();
        this._renderEmptyStage();
    }

    // ══════════════════════════════════════════════════════════════════════
    // CONTROL
    // ══════════════════════════════════════════════════════════════════════

    _buildControl() {
        var el = this._controlEl;
        while (el.firstChild) el.removeChild(el.firstChild);
        var self = this;

        var accordion = new uiAccordion({
            exclusive: true,
            content: {
                params: { label: '<i class="fas fa-sliders-h" style="margin-right:0.3rem;"></i>Parameters', open: true },
                critical: { label: '<i class="fas fa-route" style="margin-right:0.3rem;"></i>Critical Path' }
            },
            parent: el
        });

        var paramsEl = accordion.el.querySelector('.ui-accordion-item[data-key="params"] .ui-accordion-content');
        this._criticalEl = accordion.el.querySelector('.ui-accordion-item[data-key="critical"] .ui-accordion-content');

        // Programme
        this._addLabel(paramsEl, 'Programme');
        var progSelect = this._addSelect(paramsEl, this._data.PROGRAMMES.map(function(p) { return { value: p.code, label: p.name }; }), this._selectedProg);
        progSelect.addEventListener('change', function() { self._selectedProg = progSelect.value; });

        // Color by
        this._addLabel(paramsEl, 'Color By');
        var colorSelect = this._addSelect(paramsEl, [
            { value: 'passRate', label: 'Pass Rate' },
            { value: 'dfw', label: 'DFW Rate' },
            { value: 'year', label: 'Year Level' }
        ], this._colorBy);
        colorSelect.addEventListener('change', function() { self._colorBy = colorSelect.value; });

        // Load button
        var btnWrap = document.createElement('div');
        btnWrap.className = 'as-an-ctrl-btn-wrap';
        paramsEl.appendChild(btnWrap);
        new uiButton({
            label: 'Load Map', variant: 'primary', size: 'sm',
            icon: '<i class="fas fa-project-diagram"></i>',
            parent: btnWrap,
            onClick: function() {
                self._dataLoaded = true;
                self._renderDashboard();
                self._renderCriticalPath();
            }
        });

        this._renderCriticalPath();
    }

    _renderCriticalPath() {
        var el = this._criticalEl;
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
        if (!this._dataLoaded) {
            var hint = document.createElement('div');
            hint.className = 'as-an-ctrl-hint';
            hint.textContent = 'Load map to see critical path';
            el.appendChild(hint);
            return;
        }

        // Find longest prerequisite chain
        var path = this._findCriticalPath();
        var bottlenecks = this._findBottlenecks();

        var wrap = document.createElement('div');
        wrap.className = 'as-an-ctrl-stats';

        var chainLabel = document.createElement('div');
        chainLabel.className = 'as-an-ctrl-stats-label';
        chainLabel.textContent = 'Longest Chain:';
        wrap.appendChild(chainLabel);

        var chainValue = document.createElement('div');
        chainValue.className = 'as-an-ctrl-stats-value';
        chainValue.textContent = path.join(' \u2192 ');
        wrap.appendChild(chainValue);

        var bnLabel = document.createElement('div');
        bnLabel.className = 'as-an-ctrl-stats-label as-an-ctrl-stats-label-spaced';
        bnLabel.textContent = 'Top Bottlenecks:';
        wrap.appendChild(bnLabel);

        bottlenecks.forEach(function(b) {
            var row = document.createElement('div');
            var codeSpan = document.createElement('span');
            codeSpan.className = 'as-an-ctrl-stats-danger';
            codeSpan.textContent = b.code;
            row.appendChild(codeSpan);
            row.appendChild(document.createTextNode(' \u2014 ' + b.downstream + ' downstream'));
            wrap.appendChild(row);
        });

        el.appendChild(wrap);
    }

    _findCriticalPath() {
        var self = this;
        var prereqs = this._data.PREREQUISITES;
        var courses = this._data.COURSES;
        var courseMap = {};
        courses.forEach(function(c) { courseMap[c.code] = c; });

        // Find all courses with no downstream (leaf nodes)
        var allCodes = courses.map(function(c) { return c.code; });
        var hasDownstream = {};
        for (var code in prereqs) {
            prereqs[code].forEach(function(p) { hasDownstream[p] = true; });
        }
        var leaves = allCodes.filter(function(c) { return !hasDownstream[c] && !prereqs[c]; });
        // Also include courses with downstream but no further downstream themselves
        var endNodes = allCodes.filter(function(c) {
            return self._data.getDownstream(c).length === 0;
        });

        // BFS from each start to find longest path
        var longestPath = [];
        allCodes.forEach(function(startCode) {
            if (prereqs[startCode] && prereqs[startCode].length) return; // has prerequisites, not a start
            var stack = [[startCode]];
            while (stack.length) {
                var currentPath = stack.pop();
                var current = currentPath[currentPath.length - 1];
                var downstream = self._data.getDownstream(current);
                if (!downstream.length) {
                    if (currentPath.length > longestPath.length) longestPath = currentPath;
                } else {
                    downstream.forEach(function(next) {
                        if (currentPath.indexOf(next) === -1) {
                            stack.push(currentPath.concat([next]));
                        }
                    });
                }
            }
        });
        return longestPath.length ? longestPath : ['No chain found'];
    }

    _findBottlenecks() {
        var self = this;
        var courses = this._data.COURSES;
        return courses.map(function(c) {
            return { code: c.code, downstream: self._data.getAllDownstream(c.code).length, dfw: c.dfw };
        }).filter(function(b) { return b.downstream > 0; })
          .sort(function(a, b) { return b.downstream - a.downstream; })
          .slice(0, 3);
    }

    // ══════════════════════════════════════════════════════════════════════
    // STAGE
    // ══════════════════════════════════════════════════════════════════════

    _renderEmptyStage() {
        while (this._stageEl.firstChild) this._stageEl.removeChild(this._stageEl.firstChild);
        this._stageEl.className = 'as-an-stage-scroll';
        new uiAlert({
            color: 'info',
            title: 'Progression Map',
            message: 'Select a programme and click "Load Map" to visualize the course prerequisite graph with interactive node exploration.',
            parent: this._stageEl
        });
    }

    _renderDashboard() {
        var stage = this._stageEl;
        while (stage.firstChild) stage.removeChild(stage.firstChild);
        stage.className = 'as-an-stage';

        var wrap = document.createElement('div');
        wrap.className = 'as-an-stage-body';
        stage.appendChild(wrap);

        // Header
        var prog = this._data.PROGRAMMES.find(function(p) { return p.code === this._selectedProg; }.bind(this));
        var header = document.createElement('div');
        header.className = 'as-an-panel-header';

        var badge = document.createElement('span');
        badge.className = 'as-an-panel-badge as-an-panel-badge-progression';
        var badgeIcon = document.createElement('i');
        badgeIcon.className = 'fas fa-project-diagram';
        badge.appendChild(badgeIcon);
        badge.appendChild(document.createTextNode('Progression Map'));
        header.appendChild(badge);

        var progLabel = document.createElement('span');
        progLabel.className = 'as-an-panel-subtitle';
        progLabel.textContent = prog ? prog.name : '';
        header.appendChild(progLabel);

        wrap.appendChild(header);

        this._renderGraph(wrap);
        this._renderBottomPanel(wrap);
    }

    _renderGraph(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card as-an-graph-card';
        parent.appendChild(card);

        var hdr = document.createElement('div');
        hdr.className = 'as-an-card-header';

        var hdrIcon = document.createElement('i');
        hdrIcon.className = 'fas fa-project-diagram as-an-card-header-icon';
        hdr.appendChild(hdrIcon);

        var hdrTitle = document.createElement('span');
        hdrTitle.className = 'as-an-card-header-title';
        hdrTitle.textContent = 'Prerequisite Graph';
        hdr.appendChild(hdrTitle);

        var hdrHint = document.createElement('span');
        hdrHint.className = 'as-an-card-header-meta';
        hdrHint.textContent = 'Click nodes for details';
        hdr.appendChild(hdrHint);

        card.appendChild(hdr);

        var container = document.createElement('div');
        container.className = 'as-an-graph-container';
        card.appendChild(container);

        // Check if vis-network is available
        if (typeof vis === 'undefined' || !vis.Network) {
            var fallbackMsg = document.createElement('div');
            fallbackMsg.className = 'as-an-graph-fallback-msg';
            fallbackMsg.textContent = 'vis-network library not loaded. Add CDN to index.html.';
            container.appendChild(fallbackMsg);
            this._renderFallbackGraph(container);
            return;
        }

        this._buildVisNetwork(container);
    }

    _buildVisNetwork(container) {
        var courses = this._data.COURSES;
        var prereqs = this._data.PREREQUISITES;
        var self = this;

        // Build nodes
        var nodes = courses.map(function(c) {
            var downstream = self._data.getAllDownstream(c.code).length;
            var passRate = c.enrolled > 0 ? (c.passed / c.enrolled * 100) : 0;
            var color = self._getNodeColor(c, passRate);
            var size = 15 + downstream * 4;

            return {
                id: c.code,
                label: c.code + '\n' + passRate.toFixed(0) + '%',
                title: c.name + ' | Pass: ' + passRate.toFixed(1) + '% | DFW: ' + c.dfw.toFixed(1) + '% | Downstream: ' + downstream,
                color: { background: color, border: color, highlight: { background: color, border: '#1a1a2e' } },
                size: size,
                level: c.year,
                font: { size: 10, color: '#fff', face: 'monospace', bold: { color: '#fff' } },
                shape: 'box',
                borderWidth: c.dfw > 30 ? 3 : 1,
                borderWidthSelected: 3
            };
        });

        // Build edges
        var edges = [];
        for (var code in prereqs) {
            prereqs[code].forEach(function(prereq) {
                edges.push({
                    from: prereq,
                    to: code,
                    arrows: 'to',
                    color: { color: '#9ca3af', highlight: '#1d4ed8' },
                    width: 1.5
                });
            });
        }

        var data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        var options = {
            layout: {
                hierarchical: {
                    direction: 'LR',
                    sortMethod: 'directed',
                    levelSeparation: 180,
                    nodeSpacing: 80
                }
            },
            physics: false,
            interaction: { hover: true, tooltipDelay: 100 },
            nodes: {
                shape: 'box',
                margin: { top: 5, bottom: 5, left: 8, right: 8 },
                font: { size: 10, face: 'system-ui', color: '#fff' }
            },
            edges: {
                smooth: { type: 'cubicBezier', forceDirection: 'horizontal' }
            }
        };

        this._network = new vis.Network(container, data, options);

        // Node click handler
        this._network.on('click', function(params) {
            if (params.nodes.length) {
                var courseCode = params.nodes[0];
                var course = courses.find(function(c) { return c.code === courseCode; });
                if (course) self._showNodeDetail(course);
            }
        });
    }

    _renderFallbackGraph(container) {
        // Fallback: simple HTML representation when vis-network is unavailable
        while (container.firstChild) container.removeChild(container.firstChild);
        var courses = this._data.COURSES;
        var prereqs = this._data.PREREQUISITES;
        var self = this;

        var grid = document.createElement('div');
        grid.className = 'as-an-fallback-grid';
        container.appendChild(grid);

        [1, 2, 3].forEach(function(year) {
            var col = document.createElement('div');
            col.className = 'as-an-fallback-col';

            var yearLabel = document.createElement('div');
            yearLabel.className = 'as-an-fallback-year-label';
            yearLabel.textContent = 'Year ' + year;
            col.appendChild(yearLabel);

            var yrCourses = courses.filter(function(c) { return c.year === year; });
            yrCourses.forEach(function(c) {
                var passRate = c.enrolled > 0 ? (c.passed / c.enrolled * 100) : 0;
                var color = self._getNodeColor(c, passRate);
                var downstream = self._data.getAllDownstream(c.code).length;

                var node = document.createElement('div');
                node.className = 'as-an-fallback-node' + (c.dfw > 30 ? ' as-an-fallback-node-danger' : '');
                node.style.background = color;

                var codeDiv = document.createElement('div');
                codeDiv.className = 'as-an-fallback-node-code';
                codeDiv.textContent = c.code;
                node.appendChild(codeDiv);

                var infoDiv = document.createElement('div');
                infoDiv.className = 'as-an-fallback-node-info';
                infoDiv.textContent = passRate.toFixed(0) + '% pass' + (downstream > 0 ? ' \u00b7 \u2193' + downstream : '');
                node.appendChild(infoDiv);

                node.title = c.name;
                node.addEventListener('click', function() { self._showNodeDetail(c); });
                col.appendChild(node);
            });
            grid.appendChild(col);
        });
    }

    _getNodeColor(course, passRate) {
        if (this._colorBy === 'dfw') {
            return course.dfw >= 35 ? '#dc2626' : course.dfw >= 25 ? '#d97706' : course.dfw >= 15 ? '#1d4ed8' : '#059669';
        } else if (this._colorBy === 'year') {
            return course.year === 1 ? '#1d4ed8' : course.year === 2 ? '#7c3aed' : '#059669';
        }
        // passRate (default)
        return passRate >= 80 ? '#059669' : passRate >= 65 ? '#1d4ed8' : passRate >= 50 ? '#d97706' : '#dc2626';
    }

    _renderBottomPanel(parent) {
        var card = document.createElement('div');
        card.className = 'as-an-section-card as-mt-3';
        parent.appendChild(card);

        var body = document.createElement('div');
        body.className = 'as-an-card-body as-grid-3col';
        card.appendChild(body);

        // Critical path
        var path = this._findCriticalPath();
        var pathEl = document.createElement('div');

        var pathHeader = document.createElement('div');
        pathHeader.className = 'as-an-upper-label as-mb-2';
        pathHeader.textContent = 'Critical Path (' + path.length + ' courses)';
        pathEl.appendChild(pathHeader);

        var pathBody = document.createElement('div');
        pathBody.className = 'as-an-rec-body';
        path.forEach(function(code, i) {
            var codeSpan = document.createElement('span');
            codeSpan.className = 'as-text-bold as-status-graduated';
            codeSpan.textContent = code;
            pathBody.appendChild(codeSpan);
            if (i < path.length - 1) {
                var arrow = document.createElement('span');
                arrow.className = 'as-text-muted';
                arrow.textContent = ' \u2192 ';
                pathBody.appendChild(arrow);
            }
        });
        pathEl.appendChild(pathBody);
        body.appendChild(pathEl);

        // Top bottlenecks
        var bottlenecks = this._findBottlenecks();
        var bnEl = document.createElement('div');

        var bnHeader = document.createElement('div');
        bnHeader.className = 'as-an-upper-label as-mb-2';
        bnHeader.textContent = 'Top Bottlenecks';
        bnEl.appendChild(bnHeader);

        bottlenecks.forEach(function(b) {
            var row = document.createElement('div');
            row.className = 'as-an-bottleneck-row';
            var codeSpan = document.createElement('span');
            codeSpan.className = 'as-text-bold as-risk-critical';
            codeSpan.textContent = b.code;
            row.appendChild(codeSpan);
            var detailSpan = document.createElement('span');
            detailSpan.className = 'as-text-muted';
            detailSpan.textContent = '\u2192 ' + b.downstream + ' downstream, DFW ' + b.dfw.toFixed(1) + '%';
            row.appendChild(detailSpan);
            bnEl.appendChild(row);
        });
        body.appendChild(bnEl);

        // Chain throughput
        var chainTP = this._computeChainThroughput(path);
        var tpEl = document.createElement('div');

        var tpHeader = document.createElement('div');
        tpHeader.className = 'as-an-upper-label as-mb-2';
        tpHeader.textContent = 'Chain Throughput';
        tpEl.appendChild(tpHeader);

        var tpValue = document.createElement('div');
        tpValue.className = 'as-an-kpi-value';
        tpValue.style.color = chainTP >= 50 ? 'var(--ui-green-600)' : 'var(--ui-red-600)';
        tpValue.textContent = chainTP.toFixed(1) + '%';
        tpEl.appendChild(tpValue);

        var tpDesc = document.createElement('div');
        tpDesc.className = 'as-an-upper-label-gray';
        tpDesc.textContent = 'Cumulative pass rate through critical path';
        tpEl.appendChild(tpDesc);

        body.appendChild(tpEl);
    }

    _computeChainThroughput(path) {
        var courses = this._data.COURSES;
        var throughput = 100;
        path.forEach(function(code) {
            var c = courses.find(function(c) { return c.code === code; });
            if (c && c.enrolled > 0) {
                throughput *= (c.passed / c.enrolled);
            }
        });
        return throughput;
    }

    _showNodeDetail(course) {
        var passRate = course.enrolled > 0 ? ((course.passed / course.enrolled) * 100).toFixed(1) : '0';
        var downstream = this._data.getAllDownstream(course.code);
        var prereqCodes = this._data.PREREQUISITES[course.code] || [];

        var content = document.createElement('div');
        content.className = 'as-an-modal-content-sm';

        // Header row: code + name
        var headerRow = document.createElement('div');
        headerRow.className = 'as-flex-row-center as-mb-3';
        var codeEl = document.createElement('code');
        codeEl.className = 'as-an-modal-code';
        codeEl.textContent = course.code;
        headerRow.appendChild(codeEl);
        var nameEl = document.createElement('span');
        nameEl.className = 'as-an-card-header-title';
        nameEl.textContent = course.name;
        headerRow.appendChild(nameEl);
        content.appendChild(headerRow);

        var metricsGrid = document.createElement('div');
        metricsGrid.className = 'as-an-metrics-grid';
        [
            { label: 'Pass Rate', value: passRate + '%', color: parseFloat(passRate) >= 70 ? 'var(--ui-green-600)' : 'var(--ui-amber-600)' },
            { label: 'DFW Rate', value: course.dfw.toFixed(1) + '%', color: course.dfw <= 20 ? 'var(--ui-green-600)' : 'var(--ui-red-600)' },
            { label: 'Enrolled', value: String(course.enrolled), color: 'var(--ui-blue-700)' },
            { label: 'Prerequisites', value: String(prereqCodes.length), color: 'var(--ui-purple-600)' },
            { label: 'Downstream', value: String(downstream.length), color: 'var(--ui-amber-600)' },
            { label: 'Year ' + course.year + ' ' + course.semester, value: course.credits + ' cr', color: 'var(--ui-gray-500)' }
        ].forEach(function(m) {
            var cell = document.createElement('div');
            cell.className = 'as-an-metric-cell';
            var labelDiv = document.createElement('div');
            labelDiv.className = 'as-an-metric-label';
            labelDiv.textContent = m.label;
            cell.appendChild(labelDiv);
            var valueDiv = document.createElement('div');
            valueDiv.className = 'as-an-metric-value';
            valueDiv.style.color = m.color;
            valueDiv.textContent = m.value;
            cell.appendChild(valueDiv);
            metricsGrid.appendChild(cell);
        });
        content.appendChild(metricsGrid);

        if (prereqCodes.length) {
            var prereqLabel = document.createElement('div');
            prereqLabel.className = 'as-an-upper-label as-mb-2';
            prereqLabel.textContent = 'Prerequisites';
            content.appendChild(prereqLabel);
            var prereqWrap = document.createElement('div');
            prereqWrap.className = 'as-an-info-wrap as-mb-2';
            prereqCodes.forEach(function(c) {
                var badge = document.createElement('span');
                badge.className = 'as-an-badge-sm as-an-badge-blue';
                badge.textContent = c;
                prereqWrap.appendChild(badge);
            });
            content.appendChild(prereqWrap);
        }
        if (downstream.length) {
            var dsLabel = document.createElement('div');
            dsLabel.className = 'as-an-upper-label as-mb-2';
            dsLabel.textContent = 'Downstream Courses';
            content.appendChild(dsLabel);
            var dsWrap = document.createElement('div');
            dsWrap.className = 'as-an-info-wrap';
            downstream.forEach(function(c) {
                var badge = document.createElement('span');
                badge.className = 'as-an-badge-sm as-an-badge-amber';
                badge.textContent = c;
                dsWrap.appendChild(badge);
            });
            content.appendChild(dsWrap);
        }

        new uiModal({
            title: course.code + ' \u2014 Course Detail',
            size: 'md',
            body: content,
            buttons: [{ label: 'Close', variant: 'ghost', onClick: function(modal) { modal.close(); } }]
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    _addLabel(parent, text) {
        var label = document.createElement('label');
        label.className = 'as-an-ctrl-label';
        label.textContent = text;
        parent.appendChild(label);
        return label;
    }

    _addSelect(parent, options, value) {
        var wrap = document.createElement('div');
        wrap.className = 'ui-input-wrapper as-an-ctrl-wrap';
        parent.appendChild(wrap);
        var select = document.createElement('select');
        select.className = 'ui-input as-an-ctrl-select';
        options.forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            select.appendChild(opt);
        });
        select.value = value;
        wrap.appendChild(select);
        return select;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) { module.exports = ProgressionMapPanel; }
if (typeof window !== 'undefined') { window.ProgressionMapPanel = ProgressionMapPanel; }
