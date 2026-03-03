/**
 * AutoScholarHubApp - Module launcher PageFrame
 *
 * Extends uiPageFrame. Displays a grid of AutoScholar module cards.
 * Clicking a module card fires the onLaunch callback so the outer
 * controller can swap to the appropriate PageFrame app.
 *
 * Usage:
 *   const hub = new AutoScholarHubApp({
 *       parent: document.body,
 *       onLaunch: (moduleKey) => { ... }
 *   });
 */
class AutoScholarHubApp extends uiPageFrame {

    constructor(settings = {}) {
        super({
            title: 'AutoScholar',
            subtitle: 'Module Hub',
            logoIcon: 'graduation-cap',
            color: 'dark',
            ...settings
        });

        // Set auth from global session if available
        if (window.AS_SESSION?.ready) {
            this.setUser({
                name: window.AS_SESSION.userId || 'AutoScholar User',
                email: '',
                role: 'Authenticated'
            });
        }
    }

    // ── Module Definitions ───────────────────────────────────────────────

    static MODULES = [
        {
            key: 'classview',
            label: 'ClassView Connect',
            icon: 'chalkboard-teacher',
            color: '#1a237e',
            description: 'Unified class dashboard — risk, roster, gradebook, attendance, and analytics from one form.',
            status: 'ready'
        },
        {
            key: 'student',
            label: 'Student Central',
            icon: 'user-graduate',
            color: '#00695c',
            description: 'Self-service portal for academic tracking, results, and career development.',
            status: 'ready'
        },
        {
            key: 'programme',
            label: 'Programme Analyst',
            icon: 'project-diagram',
            color: '#4a148c',
            description: 'Cohort tracking, curriculum analysis, and programme health dashboards.',
            status: 'ready'
        },
        {
            key: 'casework',
            label: 'Casework Counsellor',
            icon: 'hands-helping',
            color: '#bf360c',
            description: 'Case management, interventions, and student support coordination.',
            status: 'ready'
        },
        {
            key: 'accreditation',
            label: 'Accreditation AutoMate',
            icon: 'certificate',
            color: '#1b5e20',
            description: 'Evidence collection, GA mapping, and compliance reporting.',
            status: 'ready'
        },
        {
            key: 'executive',
            label: 'Executive Insight',
            icon: 'tachometer-alt',
            color: '#e65100',
            description: 'Institutional KPIs, strategic analytics, and performance dashboards.',
            status: 'ready'
        }
    ];

    // ── PageFrame Hooks ──────────────────────────────────────────────────

    setBody() {
        return [{
            id: 'modules',
            label: 'Modules',
            icon: '<i class="fas fa-th-large"></i>',
            render: (el) => this._renderModuleGrid(el)
        }];
    }

    setFooter() {
        return {
            columns: [
                {
                    title: 'AutoScholar',
                    links: [
                        { label: 'Higher Education Analytics Platform' },
                        { label: 'Built with Publon.Press' }
                    ]
                },
                {
                    title: 'Modules',
                    links: [
                        { label: 'ClassView Connect' },
                        { label: 'Student Central' },
                        { label: 'Programme Analyst' }
                    ]
                }
            ],
            copyright: '\u00A9 ' + new Date().getFullYear() + ' AutoScholar. All rights reserved.'
        };
    }

    // ── Module Grid ──────────────────────────────────────────────────────

    _renderModuleGrid(el) {
        el.className = 'hub-stage';

        // Welcome header
        const header = document.createElement('div');
        header.className = 'hub-welcome';
        header.innerHTML =
            '<h1>AutoScholar Hub</h1>' +
            '<p>Select a module to launch</p>';
        el.appendChild(header);

        // Module grid
        const grid = document.createElement('div');
        grid.className = 'hub-grid';
        el.appendChild(grid);

        AutoScholarHubApp.MODULES.forEach(mod => {
            const card = document.createElement('div');
            const isDisabled = mod.status === 'coming';
            card.className = isDisabled ? 'hub-card-disabled' : 'hub-card';

            if (!isDisabled) {
                card.addEventListener('click', () => {
                    if (this.settings.onLaunch) {
                        this.settings.onLaunch(mod.key);
                    }
                });
            }

            // Icon circle — background color is data-driven per module
            const iconCircle = document.createElement('div');
            iconCircle.className = 'hub-icon';
            iconCircle.style.background = mod.color;
            iconCircle.innerHTML = '<i class="fas fa-' + mod.icon + '"></i>';
            card.appendChild(iconCircle);

            // Title
            const title = document.createElement('div');
            title.className = 'hub-card-title';
            title.textContent = mod.label;
            card.appendChild(title);

            // Description
            const desc = document.createElement('div');
            desc.className = 'hub-card-desc';
            desc.textContent = mod.description;
            card.appendChild(desc);

            // Status badge
            const badge = document.createElement('div');
            badge.className = isDisabled ? 'hub-badge-coming' : 'hub-badge-ready';
            badge.textContent = isDisabled ? 'Coming Soon' : 'Ready';
            card.appendChild(badge);

            grid.appendChild(card);
        });
    }
}
