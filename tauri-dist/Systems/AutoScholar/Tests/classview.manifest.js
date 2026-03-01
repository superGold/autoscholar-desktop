/**
 * ClassViewManifest — File manifest for ClassView Connect
 *
 * Declares all files, services, panels, and dependencies.
 */
class ClassViewManifest {

    static manifest() {
        return {
            name: 'ClassView Connect',
            version: '2.0.0',
            type: 'subsystem',
            parent: 'AutoScholar',

            // Infrastructure
            schema: 'classview.schema.js',
            seed: 'classview.seed.js',
            config: 'classview.config.js',
            manifest: 'classview.manifest.js',

            // Entry point
            html: 'classview-connect.html',

            // Core files
            files: [
                'class.ClassViewConnect.js',
                'class.ClassViewConnectApp.js',
                'class.AutoScholarHubApp.js'
            ],

            // Analysis panels
            panels: [
                { key: 'risk',       file: 'class.RiskAssessmentPanel.js',      cls: 'RiskAssessmentPanel' },
                { key: 'roster',     file: 'class.ClassRosterPanel.js',         cls: 'ClassRosterPanel' },
                { key: 'gradebook',  file: 'class.GradebookPanel.js',           cls: 'GradebookPanel' },
                { key: 'attendance', file: 'class.AttendanceDPPanel.js',        cls: 'AttendanceDPPanel' },
                { key: 'historical', file: 'class.HistoricalPerformancePanel.js', cls: 'HistoricalPerformancePanel' },
                { key: 'peerCorr',   file: 'class.PeerCorrelationPanel.js',     cls: 'PeerCorrelationPanel' },
                { key: 'analytics',  file: 'class.ClassAnalyticsPanel.js',      cls: 'ClassAnalyticsPanel' },
                { key: 'polls',      file: 'class.QuickPollsPanel.js',          cls: 'QuickPollsPanel' },
                { key: 'regCheck',  file: 'class.RegistrationCheckPanel.js', cls: 'RegistrationCheckPanel' }
            ],

            // Tabs (including non-panel tabs)
            tabs: [
                { key: 'dashboard',  label: 'Dashboard',  icon: 'tachometer-alt' },
                { key: 'risk',       label: 'Risk',        icon: 'exclamation-triangle' },
                { key: 'roster',     label: 'Roster',      icon: 'users' },
                { key: 'gradebook',  label: 'Gradebook',   icon: 'clipboard-check' },
                { key: 'attendance', label: 'Attendance',  icon: 'calendar-check' },
                { key: 'historical', label: 'Historical',  icon: 'chart-line' },
                { key: 'peerCorr',   label: 'Peer Corr',   icon: 'balance-scale' },
                { key: 'analytics',  label: 'Analytics',   icon: 'chart-bar' },
                { key: 'polls',      label: 'Polls',       icon: 'poll' },
                { key: 'regCheck',  label: 'Registration', icon: 'clipboard-list' },
                { key: 'about',      label: 'About',       icon: 'info-circle' }
            ],

            // Services consumed
            services: ['member', 'messages', 'tag', 'audit', 'event', 'group'],

            // Test infrastructure
            tests: {
                spec: 'classview-connect.spec.js',
                config: 'classview-connect.config.js',
                testrig: 'testrig-classview.html'
            }
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassViewManifest;
}
if (typeof window !== 'undefined') {
    window.ClassViewManifest = ClassViewManifest;
}
