/**
 * ExecScenarioModel — Pre-computed bounded scenario comparison
 *
 * Defines intervention parameters, each with exactly 3 settings:
 * Current, Moderate, Ambitious. Pre-computes projected outcomes
 * for all combinations. No free-form sliders — bounded, authored,
 * and disclaimed.
 *
 * Usage:
 *   const model = new ExecScenarioModel(execMetrics, publome);
 *   const params = model.getParameters();
 *   model.setSelection('tutoring', 'moderate');
 *   const projection = model.project(entityIdx, year);
 */
class ExecScenarioModel {

    constructor(execMetrics, publome) {
        this.metrics = execMetrics;
        this.publome = publome;
        this._selections = {};  // { paramKey: 'current' | 'moderate' | 'ambitious' }
        this._cache = new Map();
    }

    // ── Public API ───────────────────────────────────────────────────

    /** Get all intervention parameters with their settings */
    getParameters() {
        return ExecScenarioModel._parameters();
    }

    /** Set a parameter selection */
    setSelection(paramKey, level) {
        if (['current', 'moderate', 'ambitious'].indexOf(level) === -1) return;
        this._selections[paramKey] = level;
        this._cache.clear();
    }

    /** Get current selections */
    getSelections() {
        const params = this.getParameters();
        const result = {};
        for (const p of params) {
            result[p.key] = this._selections[p.key] || 'current';
        }
        return result;
    }

    /** Reset all selections to 'current' */
    reset() {
        this._selections = {};
        this._cache.clear();
    }

    /** Clear projection cache (call when underlying data changes) */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Project outcomes for current parameter selections.
     * @returns {Object} { metrics: [{code, name, current, projected, delta, confidence}], modelInfo }
     */
    project(entityIdx, year) {
        const selKey = JSON.stringify(this._selections) + ':' + entityIdx + ':' + year;
        if (this._cache.has(selKey)) return this._cache.get(selKey);

        const kpis = this.metrics.getKPIs(entityIdx, year);
        const params = this.getParameters();
        const selections = this.getSelections();

        // Calculate aggregate intervention effect
        const effects = this._computeEffects(selections, params);

        // Project each metric
        const projections = [];
        const targetMetrics = ['course-pass-rate', 'retention-rate', 'graduation-rate', 'course-mean'];

        for (const code of targetMetrics) {
            const kpi = kpis[code];
            if (!kpi || kpi.value === null) continue;

            const effect = effects[code] || 0;
            const projected = Math.min(100, Math.max(0, kpi.value + effect));
            const delta = projected - kpi.value;

            // Confidence based on evidence level and effect magnitude
            const confidence = this._computeConfidence(selections, params, Math.abs(effect));

            projections.push({
                code,
                name:       kpi.name,
                unit:       kpi.unit,
                current:    kpi.value,
                target:     kpi.target,
                benchmark:  kpi.benchmark,
                projected:  Math.round(projected * 10) / 10,
                delta:      Math.round(delta * 10) / 10,
                confidence,
                status:     projected >= kpi.target ? 'success' :
                            projected >= kpi.benchmark ? 'warning' : 'danger'
            });
        }

        // Cost impact estimation
        const costImpact = this._estimateCost(selections, params, kpis._entity);

        const result = {
            metrics: projections,
            costImpact,
            modelInfo: {
                version: '1.0',
                method: 'Linear regression with intervention coefficients',
                dataSource: 'Institutional metrics ' + year,
                assumptions: this._getAssumptions(selections, params),
                disclaimer: 'Projections are estimates based on published intervention effectiveness research. ' +
                    'Actual outcomes depend on implementation quality, institutional context, and student population characteristics.'
            }
        };

        this._cache.set(selKey, result);
        return result;
    }

    /**
     * Generate narrative summary of scenario projection.
     * @returns {string} Governance-ready prose
     */
    generateNarrative(entityIdx, year) {
        const projection = this.project(entityIdx, year);
        const selections = this.getSelections();
        const params = this.getParameters();
        const entity = this.metrics.getKPIs(entityIdx, year)._entity;
        const entityName = entity ? entity.name : 'the institution';

        const activeChanges = params.filter(p => selections[p.key] !== 'current');
        if (activeChanges.length === 0) {
            return 'No interventions have been selected. Adjust parameters above to model projected outcomes.';
        }

        const parts = [];

        // Opening
        const interventionNames = activeChanges.map(p => {
            const level = selections[p.key];
            const setting = p.settings[level];
            return `${p.name} to ${setting.label}`;
        });
        parts.push(
            `If ${entityName} were to adjust ${this._joinList(interventionNames)}, ` +
            `the following projected changes are estimated:`
        );

        // Metric projections
        for (const m of projection.metrics) {
            if (Math.abs(m.delta) < 0.5) continue;
            const direction = m.delta > 0 ? 'increase' : 'decrease';
            const deltaAbs = Math.abs(m.delta);
            parts.push(
                `${m.name}: projected ${direction} of ${deltaAbs.toFixed(1)} percentage points ` +
                `(from ${m.current.toFixed(1)}% to ${m.projected.toFixed(1)}%). ` +
                `Confidence: ${Math.round(m.confidence * 100)}%.`
            );
        }

        // Cost
        if (projection.costImpact.totalAnnual > 0) {
            const costText = `Estimated additional annual cost: R${(projection.costImpact.totalAnnual / 1000).toFixed(0)}k.`;
            if (projection.costImpact.costPerGraduate > 0) {
                parts.push(costText + ` Cost per additional graduate: R${projection.costImpact.costPerGraduate.toLocaleString()}.`);
            } else {
                parts.push(costText + ' Selected interventions do not directly affect graduation rate; cost-per-graduate cannot be estimated.');
            }
        }

        // Disclaimer
        parts.push(projection.modelInfo.disclaimer);

        return parts.join('\n\n');
    }

    // ── Private: Effect Computation ────────────────────────────────

    /**
     * Compute projected effects on each metric based on parameter selections.
     * Uses evidence-based intervention coefficients from published research.
     */
    _computeEffects(selections, params) {
        const effects = {
            'course-pass-rate': 0,
            'retention-rate': 0,
            'graduation-rate': 0,
            'course-mean': 0
        };

        for (const p of params) {
            const level = selections[p.key] || 'current';
            if (level === 'current') continue;
            const setting = p.settings[level];
            if (!setting || !setting.effects) continue;

            for (const [metric, effect] of Object.entries(setting.effects)) {
                if (effects[metric] !== undefined) {
                    effects[metric] += effect;
                }
            }
        }

        // Diminishing returns: cap combined effects
        for (const key of Object.keys(effects)) {
            effects[key] = effects[key] * this._diminishingFactor(effects[key]);
        }

        return effects;
    }

    /** Diminishing returns factor: large combined effects are reduced */
    _diminishingFactor(totalEffect) {
        const abs = Math.abs(totalEffect);
        if (abs <= 5) return 1.0;
        if (abs <= 10) return 0.9;
        if (abs <= 15) return 0.8;
        return 0.7;
    }

    _computeConfidence(selections, params, effectMagnitude) {
        let totalEvidence = 0;
        let count = 0;

        for (const p of params) {
            const level = selections[p.key] || 'current';
            if (level === 'current') continue;
            totalEvidence += p.evidenceStrength;
            count++;
        }

        if (count === 0) return 1.0;
        const avgEvidence = totalEvidence / count;

        // Confidence decreases with larger projected effects
        const magnitudeDiscount = Math.max(0.5, 1.0 - effectMagnitude * 0.02);

        return Math.round(avgEvidence * magnitudeDiscount * 100) / 100;
    }

    _estimateCost(selections, params, entity) {
        let totalAnnual = 0;
        const items = [];

        for (const p of params) {
            const level = selections[p.key] || 'current';
            if (level === 'current') continue;
            const setting = p.settings[level];
            if (!setting || !setting.annualCost) continue;

            const scaledCost = setting.annualCost * ((entity ? entity.students : 1000) / 1000);
            totalAnnual += scaledCost;
            items.push({ name: p.name, level, cost: Math.round(scaledCost) });
        }

        // Estimate additional graduates from graduation rate improvement
        const students = entity ? entity.students : 1000;
        const gradEffect = this._computeEffects(selections, params)['graduation-rate'] || 0;
        const additionalGrads = Math.round(students * gradEffect / 100);
        const costPerGrad = additionalGrads > 0 ? Math.round(totalAnnual / additionalGrads) : 0;

        return {
            totalAnnual: Math.round(totalAnnual),
            items,
            additionalGraduates: additionalGrads,
            costPerGraduate: costPerGrad
        };
    }

    _getAssumptions(selections, params) {
        const assumptions = [];
        for (const p of params) {
            const level = selections[p.key] || 'current';
            if (level === 'current') continue;
            const setting = p.settings[level];
            assumptions.push(`${p.name} adjusted to "${setting.label}" — assumes ${setting.assumption}`);
        }
        if (assumptions.length === 0) assumptions.push('No interventions selected — current trajectory maintained.');
        return assumptions;
    }

    _joinList(items) {
        if (items.length === 0) return '';
        if (items.length === 1) return items[0];
        if (items.length === 2) return items[0] + ' and ' + items[1];
        return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
    }

    // ── Static: Parameter Definitions ───────────────────────────────

    /**
     * Intervention parameters with three bounded settings each.
     * Evidence-based effect sizes from published HE research.
     */
    static _parameters() {
        return [
            {
                key: 'tutoring',
                name: 'Tutorial Support',
                icon: 'users',
                description: 'Structured peer tutoring and academic support sessions for at-risk modules.',
                evidenceStrength: 0.85,
                settings: {
                    current: {
                        label: 'Current Level',
                        description: 'Existing tutorial programme (limited coverage)',
                        effects: {},
                        annualCost: 0,
                        assumption: 'no change to current tutorial provision'
                    },
                    moderate: {
                        label: 'Expand to All Gateway Modules',
                        description: 'Tutorials for all modules with <60% pass rate',
                        effects: { 'course-pass-rate': 3.5, 'course-mean': 2.0, 'retention-rate': 1.5 },
                        annualCost: 450000,
                        assumption: 'trained tutors available, attendance at 60% of eligible students'
                    },
                    ambitious: {
                        label: 'Universal SI Programme',
                        description: 'Supplemental Instruction for all first-year and gateway modules',
                        effects: { 'course-pass-rate': 7.0, 'course-mean': 4.0, 'retention-rate': 3.0, 'graduation-rate': 2.0 },
                        annualCost: 1200000,
                        assumption: 'full SI programme with trained leaders, attendance at 70%'
                    }
                }
            },
            {
                key: 'earlyWarning',
                name: 'Early Warning System',
                icon: 'bell',
                description: 'Automated identification and intervention for students at risk of failure.',
                evidenceStrength: 0.80,
                settings: {
                    current: {
                        label: 'Manual Identification',
                        description: 'Lecturers manually flag at-risk students',
                        effects: {},
                        annualCost: 0,
                        assumption: 'current ad-hoc identification continues'
                    },
                    moderate: {
                        label: 'Automated Alerts + Advisor Referral',
                        description: 'System flags students missing >2 assessments, auto-refers to advisor',
                        effects: { 'retention-rate': 3.0, 'course-pass-rate': 2.0 },
                        annualCost: 300000,
                        assumption: 'advisors have capacity to handle 30% more referrals'
                    },
                    ambitious: {
                        label: 'Predictive Analytics + Proactive Outreach',
                        description: 'ML-based risk scoring with proactive peer mentor assignment',
                        effects: { 'retention-rate': 5.5, 'course-pass-rate': 3.5, 'graduation-rate': 2.5 },
                        annualCost: 800000,
                        assumption: 'predictive model trained on 3+ years of institutional data'
                    }
                }
            },
            {
                key: 'advisorRatio',
                name: 'Academic Advisor Ratio',
                icon: 'user-tie',
                description: 'Student-to-advisor ratio for academic support and guidance.',
                evidenceStrength: 0.75,
                settings: {
                    current: {
                        label: 'Current Ratio (~500:1)',
                        description: 'Existing advisor complement',
                        effects: {},
                        annualCost: 0,
                        assumption: 'no additional advisors appointed'
                    },
                    moderate: {
                        label: 'Improved Ratio (300:1)',
                        description: 'Additional advisors for high-risk programmes',
                        effects: { 'retention-rate': 2.0, 'graduation-rate': 1.5 },
                        annualCost: 600000,
                        assumption: 'qualified advisors available for appointment'
                    },
                    ambitious: {
                        label: 'Optimal Ratio (150:1)',
                        description: 'Comprehensive advising programme meeting NACADA standards',
                        effects: { 'retention-rate': 4.0, 'graduation-rate': 3.0, 'course-pass-rate': 1.5 },
                        annualCost: 1800000,
                        assumption: 'full advisory infrastructure including training and supervision'
                    }
                }
            },
            {
                key: 'digitalAccess',
                name: 'Digital Access & Resources',
                icon: 'laptop',
                description: 'Student access to devices, connectivity, and digital learning materials.',
                evidenceStrength: 0.70,
                settings: {
                    current: {
                        label: 'Current Provision',
                        description: 'Computer labs and limited Wi-Fi',
                        effects: {},
                        annualCost: 0,
                        assumption: 'current digital infrastructure maintained'
                    },
                    moderate: {
                        label: 'Enhanced Lab Access + Data Allowance',
                        description: 'Extended lab hours, 2GB monthly data for all students',
                        effects: { 'course-pass-rate': 1.5, 'course-mean': 1.0 },
                        annualCost: 500000,
                        assumption: 'data costs negotiated at institutional rate'
                    },
                    ambitious: {
                        label: 'Device Loan + Full Connectivity',
                        description: 'Laptop loan scheme for NSFAS students, campus-wide fibre',
                        effects: { 'course-pass-rate': 3.0, 'course-mean': 2.0, 'retention-rate': 1.5 },
                        annualCost: 2000000,
                        assumption: 'device procurement and insurance funded, Wi-Fi infrastructure upgraded'
                    }
                }
            },
            {
                key: 'siCoverage',
                name: 'Supplemental Instruction Coverage',
                icon: 'chalkboard-teacher',
                description: 'Structured peer-led study sessions attached to high-risk modules.',
                evidenceStrength: 0.90,
                settings: {
                    current: {
                        label: 'Pilot Modules Only',
                        description: 'SI attached to 5-8 gateway modules',
                        effects: {},
                        annualCost: 0,
                        assumption: 'current pilot continues unchanged'
                    },
                    moderate: {
                        label: 'All Gateway + First-Year Modules',
                        description: 'SI expanded to all modules with <65% pass rate and all first-year modules',
                        effects: { 'course-pass-rate': 4.0, 'course-mean': 2.5, 'retention-rate': 2.0 },
                        annualCost: 700000,
                        assumption: 'sufficient SI leaders recruited and trained'
                    },
                    ambitious: {
                        label: 'Full Programme Coverage',
                        description: 'SI for all modules across all levels with leader development programme',
                        effects: { 'course-pass-rate': 6.5, 'course-mean': 3.5, 'retention-rate': 3.5, 'graduation-rate': 2.5 },
                        annualCost: 1500000,
                        assumption: 'institutional SI centre established with dedicated coordinator'
                    }
                }
            }
        ];
    }
}
