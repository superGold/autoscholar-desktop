/**
 * class.FunnelStrip.js — Compact horizontal funnel for Dashboard orientation
 *
 * Renders a horizontal pipeline: Enrolled → Retained → Assessed → Passed → Graduated
 * Each segment shows count + percentage, colored by health status.
 * Click segment emits funnel:segmentClicked via EventBus.
 *
 * Usage:
 *   const funnel = new FunnelStrip({ engine, publome, year, bus });
 *   funnel.render(container);
 */
class FunnelStrip {

    static STAGES = [
        { key: 'enrolled',  label: 'Enrolled',  icon: 'fas fa-user-plus',     metric: null },
        { key: 'retained',  label: 'Retained',  icon: 'fas fa-users',         metric: 'retention-rate' },
        { key: 'assessed',  label: 'Assessed',  icon: 'fas fa-file-alt',      metric: 'course-pass-rate', factor: 0.95 },
        { key: 'passed',    label: 'Passed',     icon: 'fas fa-check-circle', metric: 'course-pass-rate' },
        { key: 'graduated', label: 'Graduated', icon: 'fas fa-graduation-cap', metric: 'graduation-rate' }
    ];

    constructor({ engine, publome, year, bus }) {
        this._engine = engine;
        this._publome = publome;
        this._year = year;
        this._bus = bus;
        this._el = null;
    }

    connectBus(bus) {
        this._bus = bus;
        if (bus) {
            bus.on('year:changed', ({ year }) => {
                this._year = year;
                this._update();
            });
            bus.on('exec:loaded', () => this._update());
        }
    }

    render(parent) {
        this._el = document.createElement('div');
        this._el.className = 'as-funnel-strip';
        parent.appendChild(this._el);
        this._update();
    }

    _update() {
        if (!this._el) return;
        this._el.innerHTML = '';

        const data = this._computeStages();
        const maxCount = data[0]?.count || 1;

        data.forEach((stage, i) => {
            const segment = document.createElement('div');
            segment.className = 'as-funnel-segment';
            segment.dataset.stage = stage.key;

            // Width proportional to count (min 12% so all stages visible)
            const pct = Math.max(12, (stage.count / maxCount) * 100);
            segment.style.setProperty('--funnel-width', `${pct}%`);

            // Status color
            const statusClass = stage.status === 'danger' ? 'as-funnel-danger'
                              : stage.status === 'warning' ? 'as-funnel-warning'
                              : 'as-funnel-success';
            segment.classList.add(statusClass);

            segment.innerHTML =
                `<div class="as-funnel-segment-icon"><i class="${stage.icon}"></i></div>` +
                `<div class="as-funnel-segment-body">` +
                    `<div class="as-funnel-segment-count">${this._formatCount(stage.count)}</div>` +
                    `<div class="as-funnel-segment-label">${stage.label}</div>` +
                `</div>` +
                (stage.rate !== null ? `<div class="as-funnel-segment-rate">${stage.rate}%</div>` : '');

            // Arrow connector between segments
            if (i < data.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'as-funnel-arrow';
                arrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
                segment.appendChild(arrow);
            }

            segment.addEventListener('click', () => {
                if (this._bus) {
                    this._bus.emit('funnel:segmentClicked', { stage: stage.key, count: stage.count, rate: stage.rate });
                }
            });

            this._el.appendChild(segment);
        });
    }

    _computeStages() {
        // Get institution-level entity (type === 'institution')
        const entities = this._publome.table('entity').all();
        const inst = entities.find(e => e.get('type') === 'institution');
        if (!inst) return FunnelStrip.STAGES.map(s => ({ ...s, count: 0, rate: null, status: 'unknown' }));

        const instIdx = inst.get('idx');
        const totalStudents = inst.get('students') || 0;
        const kpis = this._engine.getKPIs(instIdx, this._year);

        const retentionRate = kpis['retention-rate']?.value || 80;
        const passRate = kpis['course-pass-rate']?.value || 65;
        const gradRate = kpis['graduation-rate']?.value || 60;

        const enrolled = totalStudents;
        const retained = Math.round(enrolled * retentionRate / 100);
        const assessed = Math.round(retained * 0.95);
        const passed = Math.round(assessed * passRate / 100);
        const graduated = Math.round(enrolled * gradRate / 100);

        return [
            { key: 'enrolled',  label: 'Enrolled',  icon: FunnelStrip.STAGES[0].icon, count: enrolled,  rate: null,                status: 'success' },
            { key: 'retained',  label: 'Retained',  icon: FunnelStrip.STAGES[1].icon, count: retained,  rate: retentionRate,       status: kpis['retention-rate']?.status || 'success' },
            { key: 'assessed',  label: 'Assessed',  icon: FunnelStrip.STAGES[2].icon, count: assessed,  rate: Math.round(assessed / enrolled * 100), status: 'success' },
            { key: 'passed',    label: 'Passed',     icon: FunnelStrip.STAGES[3].icon, count: passed,    rate: passRate,            status: kpis['course-pass-rate']?.status || 'warning' },
            { key: 'graduated', label: 'Graduated', icon: FunnelStrip.STAGES[4].icon, count: graduated, rate: gradRate,            status: kpis['graduation-rate']?.status || 'warning' }
        ];
    }

    _formatCount(n) {
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return String(n);
    }
}
