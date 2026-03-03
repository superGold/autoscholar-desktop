/**
 * CascadeRiskEngine — Failure percolation model over a prerequisite DAG
 *
 * Treats the prerequisite graph as a failure propagation network. When a
 * course's DFW rate increases, failure "percolates" downstream through
 * dependent courses with configurable blocking and delay factors.
 *
 * Novel contribution: No prior work exists in education analytics that
 * models prerequisite chains as percolation networks. This engine enables
 * what-if simulation of targeted interventions and cascade risk scoring.
 *
 * Usage:
 *   var engine = new CascadeRiskEngine(dagNodes, dagEdges);
 *   var result = engine.simulateShock('MATH101', 0.15);
 *   result.affected    // [{code, baseDFW, shockedDFW, delta}, ...]
 *   result.cci         // Cascading Criticality Index for the shocked node
 */
class CascadeRiskEngine {

    /**
     * @param {Array} nodes — [{code, dfw, enrolled, year, semester, credits}]
     * @param {Array} edges — [{from, to}] where from=prerequisite, to=dependent
     */
    constructor(nodes, edges) {
        this._nodes = {};
        this._adjacency = {};   // from → [to]
        this._parents = {};     // to → [from]
        nodes.forEach(function(n) {
            this._nodes[n.code] = { code: n.code, dfw: n.dfw || 0, enrolled: n.enrolled || 0, year: n.year || 1, semester: n.semester || 'S1', credits: n.credits || 0 };
            this._adjacency[n.code] = [];
            this._parents[n.code] = [];
        }.bind(this));
        edges.forEach(function(e) {
            if (this._adjacency[e.from]) this._adjacency[e.from].push(e.to);
            if (this._parents[e.to]) this._parents[e.to].push(e.from);
        }.bind(this));
        this._sorted = this._topologicalSort();
    }

    /** All node codes in topological order */
    get sortedCodes() { return this._sorted.slice(); }

    /** Get a node by code */
    node(code) { return this._nodes[code] || null; }

    /** Direct children (downstream dependents) */
    children(code) { return (this._adjacency[code] || []).slice(); }

    /** Direct parents (prerequisites) */
    parents(code) { return (this._parents[code] || []).slice(); }

    // ── Topological Sort (Kahn's algorithm) ──────────────────────────────────

    _topologicalSort() {
        var inDegree = {};
        var codes = Object.keys(this._nodes);
        var adj = this._adjacency;
        codes.forEach(function(c) { inDegree[c] = 0; });
        codes.forEach(function(c) {
            adj[c].forEach(function(child) { inDegree[child]++; });
        });
        var queue = codes.filter(function(c) { return inDegree[c] === 0; });
        var sorted = [];
        while (queue.length) {
            var current = queue.shift();
            sorted.push(current);
            adj[current].forEach(function(child) {
                inDegree[child]--;
                if (inDegree[child] === 0) queue.push(child);
            });
        }
        return sorted;
    }

    // ── Deterministic Cascade Propagation ────────────────────────────────────

    /**
     * Simulate a DFW shock on a single course and propagate downstream.
     *
     * Model: When a course's DFW increases by Δ, each downstream dependent
     * receives a fraction of that increase based on:
     *   - blockingFactor: How much the prerequisite "blocks" the dependent (0.4 default)
     *   - depthDecay: Signal attenuates per hop (0.7 default)
     *
     * @param {string} sourceCode — The course to shock
     * @param {number} dfwDelta — Additional DFW% to add (e.g., 0.15 = +15%)
     * @param {Object} [opts] — { blockingFactor: 0.4, depthDecay: 0.7 }
     * @returns {{ source, delta, affected: Array, cci: number }}
     */
    simulateShock(sourceCode, dfwDelta, opts) {
        opts = opts || {};
        var blockingFactor = opts.blockingFactor !== undefined ? opts.blockingFactor : 0.4;
        var depthDecay = opts.depthDecay !== undefined ? opts.depthDecay : 0.7;
        var shockedDFW = {};
        var self = this;

        // Initialize all nodes at baseline
        Object.keys(this._nodes).forEach(function(c) {
            shockedDFW[c] = self._nodes[c].dfw;
        });

        // Apply initial shock
        shockedDFW[sourceCode] = Math.min(100, this._nodes[sourceCode].dfw + dfwDelta * 100);

        // Propagate in topological order
        var affected = [];
        this._sorted.forEach(function(code) {
            if (code === sourceCode) return;
            var parents = self._parents[code];
            if (!parents.length) return;
            var maxParentDelta = 0;
            parents.forEach(function(p) {
                var parentDelta = shockedDFW[p] - self._nodes[p].dfw;
                if (parentDelta > maxParentDelta) maxParentDelta = parentDelta;
            });
            if (maxParentDelta > 0) {
                var propagated = maxParentDelta * blockingFactor * depthDecay;
                shockedDFW[code] = Math.min(100, self._nodes[code].dfw + propagated);
                affected.push({
                    code: code,
                    baseDFW: self._nodes[code].dfw,
                    shockedDFW: shockedDFW[code],
                    delta: shockedDFW[code] - self._nodes[code].dfw
                });
            }
        });

        // CCI = sum of (delta * enrolled) across all affected / total enrolled
        var totalEnrolled = 0;
        var weightedDelta = 0;
        Object.keys(this._nodes).forEach(function(c) {
            totalEnrolled += self._nodes[c].enrolled;
        });
        affected.forEach(function(a) {
            var node = self._nodes[a.code];
            weightedDelta += a.delta * node.enrolled;
        });
        var sourceNode = this._nodes[sourceCode];
        weightedDelta += dfwDelta * 100 * sourceNode.enrolled;
        var cci = totalEnrolled > 0 ? weightedDelta / totalEnrolled : 0;

        return {
            source: sourceCode,
            delta: dfwDelta,
            affected: affected.filter(function(a) { return a.delta > 0.01; }),
            cci: cci,
            shockedDFW: shockedDFW
        };
    }

    /**
     * Compute CCI for every node (batch analysis).
     * Returns sorted array [{code, cci, downstream}] highest-risk first.
     */
    computeAllCCI(dfwDelta, opts) {
        var self = this;
        var results = [];
        Object.keys(this._nodes).forEach(function(code) {
            var sim = self.simulateShock(code, dfwDelta || 0.10, opts);
            results.push({
                code: code,
                cci: sim.cci,
                downstream: sim.affected.length,
                baseDFW: self._nodes[code].dfw
            });
        });
        return results.sort(function(a, b) { return b.cci - a.cci; });
    }

    /**
     * BFS traversal from source for animation sequencing.
     * Returns array of arrays: [[source], [depth1_nodes], [depth2_nodes], ...]
     */
    bfsLayers(sourceCode) {
        var visited = {};
        visited[sourceCode] = true;
        var layers = [[sourceCode]];
        var currentLayer = [sourceCode];
        while (currentLayer.length) {
            var nextLayer = [];
            var adj = this._adjacency;
            currentLayer.forEach(function(code) {
                (adj[code] || []).forEach(function(child) {
                    if (!visited[child]) {
                        visited[child] = true;
                        nextLayer.push(child);
                    }
                });
            });
            if (nextLayer.length) layers.push(nextLayer);
            currentLayer = nextLayer;
        }
        return layers;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CascadeRiskEngine;
}
if (typeof window !== 'undefined') {
    window.CascadeRiskEngine = CascadeRiskEngine;
}
