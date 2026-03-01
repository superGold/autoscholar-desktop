/**
 * ExecutiveService - Institutional executive insight microservice
 *
 * Wraps ExecSchema tables in a Publome subclass and delegates
 * all metric calculations to ExecMetrics engine.
 *
 * Tables (8):
 *   entity, metricCategory, metric, metricObservation,
 *   intervention, pdsaCycle, sectorBenchmark, note
 *
 * @example
 *   const svc = new ExecutiveService();
 *   svc.seedDemoData();
 *   const kpis = svc.getKPIs(1, 2025);
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition (mirrors ExecSchema.schema() in Publome format)
// ─────────────────────────────────────────────────────────────────────────────

const ExecutiveServiceSchema = {
    name: 'executive',
    prefix: 'exec',
    alias: 'Executive Insight',
    version: '1.0.0',

    tables: [
        {
            name: 'entity',
            alias: 'Entities',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'name', label: 'Name', type: 'string', required: true },
                { name: 'type', label: 'Type', type: 'string' },
                { name: 'parentId', label: 'Parent', type: 'integer', ref: { table: 'entity', field: 'idx' } },
                { name: 'icon', label: 'Icon', type: 'string' },
                { name: 'students', label: 'Students', type: 'integer' }
            ]
        },
        {
            name: 'metricCategory',
            alias: 'Metric Categories',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'name', label: 'Category', type: 'string', required: true },
                { name: 'icon', label: 'Icon', type: 'string' },
                { name: 'color', label: 'Color', type: 'string' }
            ]
        },
        {
            name: 'metric',
            alias: 'Metrics',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'code', label: 'Code', type: 'string', required: true },
                { name: 'name', label: 'Metric', type: 'string', required: true },
                { name: 'metricCategoryId', label: 'Category', type: 'integer', ref: { table: 'metricCategory', field: 'idx' } },
                { name: 'unit', label: 'Unit', type: 'string' },
                { name: 'target', label: 'Target', type: 'number' },
                { name: 'benchmark', label: 'Benchmark', type: 'number' },
                { name: 'description', label: 'Description', type: 'string' }
            ]
        },
        {
            name: 'metricObservation',
            alias: 'Observations',
            primaryKey: 'idx',
            labeller: '{value}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'metricId', label: 'Metric', type: 'integer', ref: { table: 'metric', field: 'idx' } },
                { name: 'entityId', label: 'Entity', type: 'integer', ref: { table: 'entity', field: 'idx' } },
                { name: 'year', label: 'Year', type: 'integer' },
                { name: 'value', label: 'Value', type: 'number' },
                { name: 'note', label: 'Notes', type: 'string' }
            ]
        },
        {
            name: 'intervention',
            alias: 'Interventions',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'metricId', label: 'Target Metric', type: 'integer', ref: { table: 'metric', field: 'idx' } },
                { name: 'name', label: 'Intervention', type: 'string', required: true },
                { name: 'category', label: 'Category', type: 'string' },
                { name: 'evidenceLevel', label: 'Evidence', type: 'string' },
                { name: 'description', label: 'Description', type: 'string' },
                { name: 'status', label: 'Status', type: 'string' }
            ]
        },
        {
            name: 'pdsaCycle',
            alias: 'PDSA Cycles',
            primaryKey: 'idx',
            labeller: '{phase}: {plan}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'interventionId', label: 'Intervention', type: 'integer', ref: { table: 'intervention', field: 'idx' } },
                { name: 'entityId', label: 'Entity', type: 'integer', ref: { table: 'entity', field: 'idx' } },
                { name: 'phase', label: 'Phase', type: 'string' },
                { name: 'plan', label: 'Plan', type: 'string' },
                { name: 'doNotes', label: 'Do Notes', type: 'string' },
                { name: 'studyFindings', label: 'Study Findings', type: 'string' },
                { name: 'actDecision', label: 'Act Decision', type: 'string' },
                { name: 'startDate', label: 'Start Date', type: 'string' },
                { name: 'endDate', label: 'End Date', type: 'string' },
                { name: 'evidence', label: 'Evidence', type: 'string' },
                { name: 'status', label: 'Status', type: 'string' }
            ]
        },
        {
            name: 'sectorBenchmark',
            alias: 'Sector Benchmarks',
            primaryKey: 'idx',
            labeller: '{value}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'metricId', label: 'Metric', type: 'integer', ref: { table: 'metric', field: 'idx' } },
                { name: 'year', label: 'Year', type: 'integer' },
                { name: 'value', label: 'Value', type: 'number' },
                { name: 'source', label: 'Source', type: 'string' }
            ]
        },
        {
            name: 'note',
            alias: 'Notes',
            primaryKey: 'idx',
            labeller: '{content}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'entityId', label: 'Entity', type: 'integer', ref: { table: 'entity', field: 'idx' } },
                { name: 'metricId', label: 'Metric', type: 'integer', ref: { table: 'metric', field: 'idx' } },
                { name: 'content', label: 'Content', type: 'string', required: true },
                { name: 'author', label: 'Author', type: 'string' },
                { name: 'createdAt', label: 'Created', type: 'string' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class ExecutiveService extends Publome {
    constructor(config = {}) {
        super(ExecutiveServiceSchema, config);
        this._engine = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Metrics Engine (lazy)
    // ─────────────────────────────────────────────────────────────────────────

    getEngine() {
        if (!this._engine) {
            this._engine = new ExecMetrics(this);
        }
        return this._engine;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Domain Methods — delegate to ExecMetrics
    // ─────────────────────────────────────────────────────────────────────────

    getKPIs(entityIdx, year) {
        return this.getEngine().getKPIs(entityIdx, year);
    }

    compare(entityIdx, baselineIdx, year) {
        return this.getEngine().compare(entityIdx, baselineIdx, year);
    }

    getTrend(metricId, entityIdx, years) {
        return this.getEngine().getTrend(metricId, entityIdx, years);
    }

    getRanking(parentIdx, metricId, year) {
        return this.getEngine().getRanking(parentIdx, metricId, year);
    }

    getChildren(parentIdx) {
        return this.getEngine().getChildren(parentIdx);
    }

    getBreadcrumb(entityIdx) {
        return this.getEngine().getBreadcrumb(entityIdx);
    }

    getMetricsByCategory(entityIdx, year) {
        return this.getEngine().getMetricsByCategory(entityIdx, year);
    }

    getChildrenSummary(parentIdx, year) {
        return this.getEngine().getChildrenSummary(parentIdx, year);
    }

    getInterventions(metricId) {
        return this.getEngine().getInterventions(metricId);
    }

    getNotes(entityIdx, metricId) {
        return this.getEngine().getNotes(entityIdx, metricId);
    }

    getYears() {
        return this.getEngine().getYears();
    }

    getDistribution(parentIdx, metricCode, year) {
        return this.getEngine().getDistribution(parentIdx, metricCode, year);
    }

    forecast(entityIdx, years, projectionYears) {
        return this.getEngine().forecast(entityIdx, years, projectionYears);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Entity Helpers
    // ─────────────────────────────────────────────────────────────────────────

    getInstitutionIdx() {
        const entities = this.table('entity').all();
        const inst = entities.find(e => e.get('type') === 'institution');
        return inst ? inst.get('idx') : null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Data
    // ─────────────────────────────────────────────────────────────────────────

    seedDemoData() {
        if (typeof ExecSchema === 'undefined') {
            console.warn('ExecutiveService.seedDemoData: ExecSchema not loaded');
            return;
        }
        const data = ExecSchema._seedData();
        this.loadSeedData(data);
        if (this._engine) this._engine.clearCache();
    }

    seedFromApi(apiData) {
        if (typeof ExecSchema === 'undefined') {
            console.warn('ExecutiveService.seedFromApi: ExecSchema not loaded');
            return;
        }
        ExecSchema.seedFromApi(this, apiData);
        if (this._engine) this._engine.clearCache();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExecutiveService, ExecutiveServiceSchema };
}
if (typeof window !== 'undefined') {
    window.ExecutiveService = ExecutiveService;
}
