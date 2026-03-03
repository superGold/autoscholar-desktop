/**
 * ExecSankeyPanel — Interactive Sankey diagram of student flow through academic stages
 *
 * Architecture: Programme nodes on the left feed into shared stage columns
 * (Enrolled → Retained → Assessed → Passed → Graduated). At each transition,
 * attrition splits off downward showing exactly where students are lost.
 *
 * Uses D3 + d3-sankey (both loaded in dev-dut.html).
 *
 * Usage:
 *   const panel = new ExecSankeyPanel({ publome, engine, year, bus });
 *   panel.connectBus(bus);
 *   panel.render(container);
 */
class ExecSankeyPanel {

    static STAGES = ['Enrolled', 'Retained', 'Assessed', 'Passed', 'Graduated'];

    constructor(config = {}) {
        this.publome = config.publome;
        this.engine  = config.engine;
        this.year    = config.year || 2025;
        this._bus    = config.bus || null;
        this._container = null;
        this._svgWrap = null;
        this._tooltip = null;
        this._selectedFaculty = null;
    }

    connectBus(bus) {
        this._bus = bus;
        if (bus) {
            bus.on('year:changed', ({ year }) => {
                this.year = year;
                this._rebuild();
            });
            bus.on('exec:loaded', () => this._rebuild());
        }
        return this;
    }

    render(container) {
        this._container = container;
        container.innerHTML = '';
        container.classList.add('ex-sankey-panel');

        this._buildFilterBar();

        const svgWrap = document.createElement('div');
        svgWrap.className = 'ex-sankey-svg-wrap';
        container.appendChild(svgWrap);
        this._svgWrap = svgWrap;

        this._tooltip = document.createElement('div');
        this._tooltip.className = 'ex-sankey-tooltip';
        container.appendChild(this._tooltip);

        this._buildLegend();
        this._rebuild();
    }

    // ── Filter Bar ────────────────────────────────────────────────────

    _buildFilterBar() {
        const bar = document.createElement('div');
        bar.className = 'ex-sankey-filters';

        const label = document.createElement('span');
        label.className = 'ex-sankey-filter-label';
        label.textContent = 'Faculty:';
        bar.appendChild(label);

        const select = document.createElement('select');
        select.className = 'ex-sankey-filter-select';

        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All Faculties';
        select.appendChild(allOpt);

        const entities = this.publome.table('entity').all();
        for (const f of entities.filter(e => e.get('type') === 'faculty')) {
            const opt = document.createElement('option');
            opt.value = f.get('idx');
            opt.textContent = f.get('name');
            select.appendChild(opt);
        }

        select.addEventListener('change', () => {
            this._selectedFaculty = select.value ? parseInt(select.value) : null;
            this._rebuild();
        });
        bar.appendChild(select);

        const chips = document.createElement('div');
        chips.className = 'ex-sankey-chips';
        bar.appendChild(chips);
        this._chipsEl = chips;

        this._container.appendChild(bar);
    }

    // ── Legend ─────────────────────────────────────────────────────────

    _buildLegend() {
        const legend = document.createElement('div');
        legend.className = 'ex-sankey-legend';

        const items = [
            { label: 'Programme flow', cls: 'ex-sankey-legend-flow' },
            { label: 'Attrition', cls: 'ex-sankey-legend-drop' }
        ];
        for (const item of items) {
            const el = document.createElement('span');
            el.className = 'ex-sankey-legend-item';
            el.innerHTML = `<span class="ex-sankey-legend-dot ${item.cls}"></span>${item.label}`;
            legend.appendChild(el);
        }

        this._container.appendChild(legend);
    }

    // ── Data ──────────────────────────────────────────────────────────

    _getProgrammes() {
        const entities = this.publome.table('entity').all();
        if (this._selectedFaculty) {
            return this.engine.getChildrenSummary(this._selectedFaculty, this.year);
        }
        const faculties = entities.filter(e => e.get('type') === 'faculty');
        const all = [];
        for (const f of faculties) {
            all.push(...this.engine.getChildrenSummary(f.get('idx'), this.year));
        }
        return all;
    }

    _computeFlowData() {
        const programmes = this._getProgrammes().filter(p => (p.students || 0) > 0);
        if (programmes.length === 0) return null;

        // Compute per-programme stage counts
        const progFlows = programmes.map(p => {
            const enrolled  = p.students;
            const retRate   = p['retention-rate'] || 80;
            const passRate  = p['course-pass-rate'] || 65;
            const gradRate  = p['graduation-rate'] || 60;
            const retained  = Math.round(enrolled * retRate / 100);
            const assessed  = Math.round(retained * 0.95);
            const passed    = Math.round(assessed * passRate / 100);
            const graduated = Math.round(enrolled * gradRate / 100);
            return {
                code: p.code || p.name,
                name: p.name,
                stages: [enrolled, retained, assessed, passed, graduated]
            };
        });

        // Sort by enrolled descending for visual weight
        progFlows.sort((a, b) => b.stages[0] - a.stages[0]);

        // Build nodes: programme source nodes + stage aggregate nodes + attrition nodes
        const nodes = [];
        const links = [];
        let nIdx = 0;

        // Programme source nodes (column 0)
        const progNodeIdx = {};
        for (const p of progFlows) {
            progNodeIdx[p.code] = nIdx;
            nodes.push({ idx: nIdx, name: p.code, fullName: p.name, type: 'programme', value: p.stages[0] });
            nIdx++;
        }

        // Stage aggregate nodes (columns 1–5)
        const stageNodeIdx = {};
        for (const stage of ExecSankeyPanel.STAGES) {
            stageNodeIdx[stage] = nIdx;
            nodes.push({ idx: nIdx, name: stage, type: 'stage', value: 0 });
            nIdx++;
        }

        // Attrition nodes between stages (4 transitions)
        const attritionNodeIdx = {};
        const transitions = ['Enrolled→Retained', 'Retained→Assessed', 'Assessed→Passed', 'Passed→Graduated'];
        for (const t of transitions) {
            attritionNodeIdx[t] = nIdx;
            nodes.push({ idx: nIdx, name: `Lost (${t.split('→')[0]}→${t.split('→')[1]})`, type: 'attrition', value: 0 });
            nIdx++;
        }

        // Links: programme → Enrolled
        let totalEnrolled = 0, totalGraduated = 0;
        for (const p of progFlows) {
            links.push({ source: progNodeIdx[p.code], target: stageNodeIdx['Enrolled'], value: p.stages[0], programme: p.code });
            totalEnrolled += p.stages[0];
            totalGraduated += p.stages[4];
        }

        // Aggregate stage totals
        const stageTotals = [0, 0, 0, 0, 0];
        for (const p of progFlows) {
            for (let i = 0; i < 5; i++) stageTotals[i] += p.stages[i];
        }

        // Links: stage → next stage (continuing students) + stage → attrition (lost students)
        for (let i = 0; i < 4; i++) {
            const fromStage = ExecSankeyPanel.STAGES[i];
            const toStage   = ExecSankeyPanel.STAGES[i + 1];
            const continuing = stageTotals[i + 1];
            const lost = stageTotals[i] - stageTotals[i + 1];

            links.push({ source: stageNodeIdx[fromStage], target: stageNodeIdx[toStage], value: Math.max(1, continuing), isFlow: true });
            if (lost > 0) {
                links.push({ source: stageNodeIdx[fromStage], target: attritionNodeIdx[transitions[i]], value: lost, isAttrition: true });
            }
        }

        // Update node values
        nodes[stageNodeIdx['Enrolled']].value = stageTotals[0];

        const throughput = totalEnrolled > 0 ? Math.round(totalGraduated / totalEnrolled * 100) : 0;

        return {
            nodes, links, progFlows,
            summary: { programmes: progFlows.length, enrolled: totalEnrolled, graduated: totalGraduated, throughput },
            stageTotals
        };
    }

    // ── Rendering ─────────────────────────────────────────────────────

    _rebuild() {
        if (!this._svgWrap) return;
        this._svgWrap.innerHTML = '';

        const data = this._computeFlowData();
        if (!data) {
            this._svgWrap.innerHTML = '<div class="ex-sankey-empty"><i class="fas fa-project-diagram"></i><br>No flow data available</div>';
            return;
        }

        this._updateChips(data.summary);
        this._renderSankey(data);
    }

    _updateChips(s) {
        if (!this._chipsEl) return;
        this._chipsEl.innerHTML = '';
        const chips = [
            { label: 'Programmes', value: s.programmes, icon: 'fas fa-sitemap' },
            { label: 'Enrolled', value: this._fmt(s.enrolled), icon: 'fas fa-user-plus' },
            { label: 'Graduated', value: this._fmt(s.graduated), icon: 'fas fa-graduation-cap' },
            { label: 'Throughput', value: `${s.throughput}%`, icon: 'fas fa-chart-line' }
        ];
        for (const c of chips) {
            const el = document.createElement('span');
            el.className = 'ex-sankey-chip';
            el.innerHTML = `<i class="${c.icon}"></i> ${c.label}: <strong>${c.value}</strong>`;
            this._chipsEl.appendChild(el);
        }
    }

    _renderSankey(data) {
        const width = Math.max(800, this._svgWrap.clientWidth || 900);
        const height = Math.max(500, data.progFlows.length * 35 + 120);

        const svg = d3.select(this._svgWrap)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('class', 'ex-sankey-svg');

        const sankeyLayout = d3.sankey()
            .nodeId(d => d.idx)
            .nodeWidth(20)
            .nodePadding(8)
            .nodeAlign(d3.sankeyLeft)
            .extent([[120, 30], [width - 60, height - 30]]);

        const graph = sankeyLayout({
            nodes: data.nodes.map(d => ({ ...d })),
            links: data.links.map(d => ({ ...d }))
        });

        // Column headers
        const colLabels = {};
        for (const n of graph.nodes) {
            const col = Math.round(n.x0);
            if (!colLabels[col]) colLabels[col] = n;
        }

        // Links
        const link = svg.append('g').attr('fill', 'none')
            .selectAll('path')
            .data(graph.links)
            .enter()
            .append('path')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke-width', d => Math.max(1.5, d.width))
            .attr('class', d => d.isAttrition ? 'ex-sankey-link ex-sankey-link-drop' : 'ex-sankey-link');

        // Link tooltip
        const tooltip = this._tooltip;
        link.on('mouseenter', function(event, d) {
            d3.select(this).classed('ex-sankey-link-hover', true);
            const src = d.source.name;
            const tgt = d.target.name;
            tooltip.textContent = d.isAttrition
                ? `${d.value} students lost at ${src} stage`
                : d.programme
                    ? `${d.programme}: ${d.value} students → ${tgt}`
                    : `${d.value} students: ${src} → ${tgt}`;
            tooltip.classList.add('ex-sankey-tooltip-visible');
        })
        .on('mousemove', function(event) {
            const rect = event.currentTarget.closest('svg').getBoundingClientRect();
            tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
            tooltip.style.top = (event.clientY - rect.top - 28) + 'px';
        })
        .on('mouseleave', function() {
            d3.select(this).classed('ex-sankey-link-hover', false);
            tooltip.classList.remove('ex-sankey-tooltip-visible');
        });

        // Nodes
        const node = svg.append('g')
            .selectAll('g')
            .data(graph.nodes)
            .enter()
            .append('g')
            .attr('class', d => `ex-sankey-node ex-sankey-node-${d.type}`);

        node.append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => Math.max(2, d.y1 - d.y0))
            .attr('rx', 3)
            .attr('ry', 3);

        // Labels — programmes on left, stages above, attrition on right
        node.filter(d => d.type === 'programme')
            .append('text')
            .attr('x', d => d.x0 - 8)
            .attr('y', d => (d.y0 + d.y1) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('class', 'ex-sankey-label-prog')
            .text(d => d.name);

        node.filter(d => d.type === 'stage')
            .append('text')
            .attr('x', d => (d.x0 + d.x1) / 2)
            .attr('y', d => d.y0 - 10)
            .attr('text-anchor', 'middle')
            .attr('class', 'ex-sankey-label-stage')
            .text(d => `${d.name} (${this._fmt(d.value)})`);

        node.filter(d => d.type === 'attrition' && (d.y1 - d.y0) > 10)
            .append('text')
            .attr('x', d => d.x1 + 8)
            .attr('y', d => (d.y0 + d.y1) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'start')
            .attr('class', 'ex-sankey-label-attrition')
            .text(d => {
                const match = d.name.match(/\((.+)\)/);
                return match ? `−${this._fmt(d.value)}` : d.name;
            });

        // Node tooltip
        node.on('mouseenter', function(event, d) {
            const label = d.type === 'programme' ? `${d.fullName || d.name}: ${d.value} enrolled`
                        : d.type === 'attrition' ? `${d.value} students ${d.name.toLowerCase()}`
                        : `${d.name}: ${d.value} students`;
            tooltip.textContent = label;
            tooltip.classList.add('ex-sankey-tooltip-visible');
        })
        .on('mousemove', function(event) {
            const rect = event.currentTarget.closest('svg').getBoundingClientRect();
            tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
            tooltip.style.top = (event.clientY - rect.top - 28) + 'px';
        })
        .on('mouseleave', function() {
            tooltip.classList.remove('ex-sankey-tooltip-visible');
        });

        // Click → bus event
        node.filter(d => d.type === 'programme')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                if (this._bus) {
                    this._bus.emit('sankey:programmeClicked', { code: d.name, name: d.fullName });
                }
            });
    }

    _fmt(n) {
        if (n == null) return '0';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return String(n);
    }
}
