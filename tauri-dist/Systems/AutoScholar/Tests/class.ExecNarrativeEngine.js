/**
 * ExecNarrativeEngine — Template-based NLG for governance-ready prose
 *
 * Deterministic, auditable, hyperlinked to underlying data points.
 * No LLM dependency. Templates encode the rhetorical conventions of
 * South African higher education governance — CHE self-evaluation reports,
 * DHET submissions, senate packs, and ISO 21001 management reviews.
 *
 * Usage:
 *   const narrative = new ExecNarrativeEngine(execMetrics, publome);
 *   narrative.setExceptionEngine(exceptionEngine);
 *   const sections = narrative.generate(entityIdx, year);
 *   const summary = narrative.generateOneLiner(entityIdx, year);
 *   const senatePack = narrative.generateGovernanceReport(entityIdx, year, 'senate');
 */
class ExecNarrativeEngine {

    constructor(execMetrics, publome) {
        this.metrics   = execMetrics;
        this.publome   = publome;
        this.exception = null;
    }

    /** Attach exception engine for severity-driven narrative ordering */
    setExceptionEngine(exceptionEngine) {
        this.exception = exceptionEngine;
    }

    // ── Public API ───────────────────────────────────────────────────

    /**
     * Generate a single-sentence summary for the command centre header.
     * @returns {string} Plain text summary
     */
    generateOneLiner(entityIdx, year) {
        const kpis = this.metrics.getKPIs(entityIdx, year);
        const entity = kpis._entity;
        if (!entity) return 'No data available.';

        const codes = Object.keys(kpis).filter(k => !k.startsWith('_'));
        const withData = codes.filter(k => kpis[k].value !== null);
        const onTarget = codes.filter(k => kpis[k].status === 'success').length;
        const atRisk = codes.filter(k => kpis[k].status === 'danger').length;
        const total = codes.length;

        // If no data at all for this year, suggest switching
        if (withData.length === 0) {
            return `No metric data available for ${entity.name} in ${year}. Data may not yet have been submitted for this academic year.`;
        }

        if (atRisk === 0) {
            return `${entity.name} has ${onTarget} of ${total} metrics on target for ${year} — no immediate concerns.`;
        }

        // Find the most critical metric
        const dangerMetrics = codes.filter(k => kpis[k].status === 'danger')
            .map(k => kpis[k])
            .sort((a, b) => {
                const gapA = a.target ? Math.abs(a.value - a.target) / a.target : 0;
                const gapB = b.target ? Math.abs(b.value - b.target) / b.target : 0;
                return gapB - gapA;
            });

        const worst = dangerMetrics[0];
        const worstGap = worst.target ? Math.round(Math.abs(worst.value - worst.target) / worst.target * 100) : 0;

        if (atRisk >= 3) {
            return `${entity.name} has ${atRisk} metrics below target — ` +
                `most urgent: ${worst.name} (${worstGap}% off target). Immediate review recommended.`;
        }

        return `${entity.name}: ${onTarget} of ${total} metrics on target. ` +
            `${worst.name} requires attention (${this._fmtVal(worst.value, worst.unit)} vs target ${this._fmtVal(worst.target, worst.unit)}).`;
    }

    /**
     * Generate structured narrative sections for display or export.
     * Returns array of { title, icon, severity, paragraphs, dataRefs }
     */
    generate(entityIdx, year) {
        const kpis = this.metrics.getKPIs(entityIdx, year);
        const entity = kpis._entity;
        if (!entity) return [];

        const sections = [];

        // 1. Executive overview
        sections.push(this._overviewSection(entityIdx, year, kpis, entity));

        // 2. Category-level narratives
        const categories = this.metrics.getMetricsByCategory(entityIdx, year);
        for (const cat of categories) {
            const section = this._categorySection(cat, entityIdx, year, entity);
            if (section) sections.push(section);
        }

        // 3. Exception-driven alerts (if exception engine is available)
        if (this.exception) {
            const alertSection = this._alertSection(entityIdx, year);
            if (alertSection) sections.push(alertSection);
        }

        // 4. Year-over-year trend narrative
        const trendSection = this._trendSection(entityIdx, year, kpis);
        if (trendSection) sections.push(trendSection);

        // Sort by severity (critical sections first)
        const sevOrder = { critical: 0, warning: 1, info: 2, success: 3 };
        sections.sort((a, b) => (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3));

        return sections;
    }

    /**
     * Generate a governance report in a specific format.
     * @param {string} format - 'senate' | 'che' | 'dhet' | 'iso21001'
     * @returns {Object} { title, date, sections, footer }
     */
    generateGovernanceReport(entityIdx, year, format) {
        const templates = this._governanceTemplates();
        const tmpl = templates[format];
        if (!tmpl) return null;

        const kpis = this.metrics.getKPIs(entityIdx, year);
        const entity = kpis._entity;
        const sections = this.generate(entityIdx, year);

        return {
            title:    this._interpolate(tmpl.title, { entity, year }),
            subtitle: this._interpolate(tmpl.subtitle, { entity, year }),
            date:     new Date().toISOString().slice(0, 10),
            format,
            preamble: this._interpolate(tmpl.preamble, { entity, year, kpis }),
            sections: sections.map(s => ({
                heading: s.title,
                body:    s.paragraphs.join('\n\n'),
                severity: s.severity
            })),
            closing:  this._interpolate(tmpl.closing, { entity, year, kpis }),
            footer:   tmpl.footer
        };
    }

    // ── Section Generators ──────────────────────────────────────────

    _overviewSection(entityIdx, year, kpis, entity) {
        const codes = Object.keys(kpis).filter(k => !k.startsWith('_'));
        const success = codes.filter(k => kpis[k].status === 'success').length;
        const warning = codes.filter(k => kpis[k].status === 'warning').length;
        const danger = codes.filter(k => kpis[k].status === 'danger').length;
        const total = codes.length;

        const paragraphs = [];

        // Opening sentence
        if (danger === 0 && warning === 0) {
            paragraphs.push(
                `${entity.name} demonstrates strong performance across all ${total} monitored metrics ` +
                `for the ${year} academic year, with all indicators meeting or exceeding their targets.`
            );
        } else if (danger === 0) {
            paragraphs.push(
                `${entity.name} shows generally positive performance for ${year}, with ${success} of ` +
                `${total} metrics on target. ${warning} metric${warning > 1 ? 's require' : ' requires'} ` +
                `monitoring but ${warning > 1 ? 'remain' : 'remains'} within acceptable bounds.`
            );
        } else {
            paragraphs.push(
                `${entity.name} reports ${danger} metric${danger > 1 ? 's' : ''} below target for ${year}, ` +
                `alongside ${success} on-target and ${warning} requiring monitoring. ` +
                `Targeted interventions are recommended for the underperforming areas identified below.`
            );
        }

        // Student context
        if (entity.students > 0) {
            paragraphs.push(
                `The ${entity.type} serves approximately ${entity.students.toLocaleString()} students. ` +
                `Performance metrics are weighted by student count to ensure resource allocation ` +
                `reflects the scale of impact.`
            );
        }

        return {
            title: 'Executive Overview',
            icon: 'chart-line',
            severity: danger > 0 ? 'warning' : 'success',
            paragraphs,
            dataRefs: codes.map(k => ({ code: k, value: kpis[k].value, status: kpis[k].status }))
        };
    }

    _categorySection(cat, entityIdx, year, entity) {
        const onTarget = cat.metrics.filter(m => m.status === 'success');
        const atRisk = cat.metrics.filter(m => m.status === 'danger');
        const cautionary = cat.metrics.filter(m => m.status === 'warning');

        if (cat.metrics.every(m => m.value === null)) return null;

        const paragraphs = [];

        // Category opening
        if (atRisk.length === 0) {
            paragraphs.push(
                `**${cat.name}**: All ${cat.metrics.length} metrics in this category are performing ` +
                `at or above target levels, indicating sound institutional practice.`
            );
        } else {
            paragraphs.push(
                `**${cat.name}**: ${atRisk.length} of ${cat.metrics.length} metrics in this category ` +
                `fall below target, requiring management attention and possible intervention.`
            );
        }

        // Detail on at-risk metrics
        for (const m of atRisk) {
            const gap = m.target ? Math.round(Math.abs(m.value - m.target) / m.target * 100) : 0;
            paragraphs.push(
                `${m.name} stands at ${this._fmtVal(m.value, m.unit)}, which is ${gap}% below ` +
                `the target of ${this._fmtVal(m.target, m.unit)}. ` +
                (m.benchmark ? `The sector benchmark is ${this._fmtVal(m.benchmark, m.unit)}.` : '')
            );
        }

        // Note cautionary metrics
        if (cautionary.length > 0) {
            const names = cautionary.map(m => m.name).join(', ');
            paragraphs.push(
                `${names} ${cautionary.length > 1 ? 'are' : 'is'} performing above benchmark ` +
                `but below target — continued monitoring is advised.`
            );
        }

        return {
            title: cat.name,
            icon: cat.icon,
            severity: atRisk.length > 0 ? 'warning' : (cautionary.length > 0 ? 'info' : 'success'),
            paragraphs,
            dataRefs: cat.metrics.map(m => ({ code: m.code, value: m.value, status: m.status }))
        };
    }

    _alertSection(entityIdx, year) {
        const exceptions = this.exception.getTopExceptions(entityIdx, year, 5);
        if (exceptions.length === 0) return null;

        const critical = exceptions.filter(e => e.level === 'critical');
        const paragraphs = [];

        paragraphs.push(
            `The exception engine has identified ${exceptions.length} items requiring attention, ` +
            `of which ${critical.length} are classified as critical.`
        );

        for (const ex of exceptions.slice(0, 3)) {
            let text = `**${ex.level.toUpperCase()}**: ${ex.description}.`;
            if (ex.rhythmReason) {
                text += ` Note: threshold is ${ex.rhythmReason.direction} by ${ex.rhythmReason.percentage}% ` +
                    `due to ${ex.rhythmReason.period} (${ex.rhythmReason.reason}).`;
            }
            paragraphs.push(text);
        }

        return {
            title: 'Active Exceptions',
            icon: 'exclamation-triangle',
            severity: critical.length > 0 ? 'critical' : 'warning',
            paragraphs,
            dataRefs: exceptions.map(e => ({ code: e.code, type: e.type, severity: e.severity }))
        };
    }

    _trendSection(entityIdx, year, kpis) {
        const years = this.metrics.getYears();
        if (years.length < 2) return null;

        const improving = [];
        const declining = [];
        const codes = Object.keys(kpis).filter(k => !k.startsWith('_'));

        for (const code of codes) {
            const kpi = kpis[code];
            if (kpi.value === null || !kpi.metricId) continue;
            const lowerIsBetter = kpi.unit === 'ratio';
            const prevValue = this.metrics.getValue(kpi.metricId, entityIdx, years[1]);
            if (prevValue === null) continue;

            const pctChange = ((kpi.value - prevValue) / Math.abs(prevValue)) * 100;
            const isImproving = lowerIsBetter ? pctChange < -2 : pctChange > 2;
            const isDeclining = lowerIsBetter ? pctChange > 2 : pctChange < -2;

            if (isImproving) improving.push({ name: kpi.name, pct: Math.abs(Math.round(pctChange)) });
            if (isDeclining) declining.push({ name: kpi.name, pct: Math.abs(Math.round(pctChange)) });
        }

        if (improving.length === 0 && declining.length === 0) return null;

        const paragraphs = [];

        if (improving.length > 0) {
            const names = improving.map(m => `${m.name} (+${m.pct}%)`).join(', ');
            paragraphs.push(`Year-over-year improvements observed in: ${names}.`);
        }

        if (declining.length > 0) {
            const names = declining.map(m => `${m.name} (-${m.pct}%)`).join(', ');
            paragraphs.push(`Year-over-year declines observed in: ${names}. These trends warrant investigation.`);
        }

        return {
            title: 'Year-over-Year Trends',
            icon: 'chart-line',
            severity: declining.length > 0 ? 'warning' : 'success',
            paragraphs,
            dataRefs: [...improving, ...declining].map(m => ({ name: m.name, pct: m.pct }))
        };
    }

    // ── Governance Templates ────────────────────────────────────────

    _governanceTemplates() {
        return {
            senate: {
                title: '{entity.name} — Academic Performance Report',
                subtitle: 'Senate Pack: {year} Academic Year',
                preamble: 'This report presents the key performance indicators for {entity.name} ' +
                    'for the {year} academic year, aligned with the institution\'s strategic plan ' +
                    'and ISO 21001:2018 Educational Organizations Management System framework. ' +
                    'All metrics are drawn from verified institutional data sources.',
                closing: 'The Senate is invited to note the contents of this report and to provide ' +
                    'guidance on the recommended interventions identified above. Data sources and ' +
                    'calculation methodologies are available on request from the Office of ' +
                    'Institutional Planning.',
                footer: 'Generated by Executive Insight | Data as of {date} | ISO 21001 EOMS Aligned'
            },
            che: {
                title: 'CHE Self-Evaluation: {entity.name}',
                subtitle: 'Quality Assurance Performance Indicators — {year}',
                preamble: 'In accordance with the Council on Higher Education (CHE) quality assurance ' +
                    'framework, this self-evaluation report presents quantitative performance data for ' +
                    '{entity.name}. The indicators align with the CHE Institutional Audits criteria ' +
                    'and the Higher Education Qualifications Sub-Framework (HEQSF).',
                closing: 'This self-evaluation demonstrates the institution\'s commitment to continuous ' +
                    'quality improvement through evidence-based practice and the Plan-Do-Study-Act ' +
                    'improvement cycle methodology.',
                footer: 'CHE Self-Evaluation | {entity.name} | {year}'
            },
            dhet: {
                title: 'DHET Annual Report: {entity.name}',
                subtitle: 'Department of Higher Education and Training — {year} Submission',
                preamble: 'This submission to the Department of Higher Education and Training presents ' +
                    'the annual performance data for {entity.name} as required by the Higher Education ' +
                    'Act and HEMIS reporting requirements.',
                closing: 'The institution confirms the accuracy of the data presented and undertakes ' +
                    'to address the areas of concern identified through targeted interventions and ' +
                    'enhanced monitoring.',
                footer: 'DHET Submission | HEMIS Data | {year}'
            },
            iso21001: {
                title: 'ISO 21001 Management Review: {entity.name}',
                subtitle: 'Educational Organizations Management System — {year}',
                preamble: 'This management review report evaluates the performance of {entity.name}\'s ' +
                    'educational management system against the requirements of ISO 21001:2018. ' +
                    'The review covers Clauses 4-10 through the lens of measurable quality objectives.',
                closing: 'Management is requested to review the findings, approve the proposed ' +
                    'corrective actions, and allocate resources as identified. The next management ' +
                    'review is scheduled for the following reporting period.',
                footer: 'ISO 21001:2018 Management Review | {entity.name} | {year}'
            }
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /** Simple template interpolation: {entity.name}, {year}, {date} */
    _interpolate(template, data) {
        return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
            const parts = path.split('.');
            let val = data;
            for (const p of parts) {
                if (val && typeof val === 'object') val = val[p];
                else return match;
            }
            if (path === 'date') return new Date().toISOString().slice(0, 10);
            return val != null ? String(val) : match;
        });
    }

    _fmtVal(value, unit) {
        if (value === null || value === undefined) return '—';
        if (unit === 'ratio') return value.toFixed(1) + ':1';
        if (unit === 'score') return value.toFixed(1) + '/5';
        if (unit === '%') return Math.round(value) + '%';
        return String(value);
    }
}
