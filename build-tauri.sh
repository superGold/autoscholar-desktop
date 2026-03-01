#!/bin/bash
# build-tauri.sh — Assemble tauri-dist/ for AutoScholar Tauri build
# Run from: Systems/AutoScholar/
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST="$SCRIPT_DIR/tauri-dist"
AS_DIST="$DIST/Systems/AutoScholar"
VENDOR="$AS_DIST/vendor"

echo "=== AutoScholar Tauri Build ==="
echo "Publon.Press root: $PP_ROOT"
echo "Dist output:       $DIST"
echo ""

# ─── Step 1: Clean and create dist structure ────────────────────────
echo "[1/4] Creating dist directory structure..."
rm -rf "$DIST"
mkdir -p "$DIST/UI"
mkdir -p "$DIST/Core"
mkdir -p "$DIST/Services"
mkdir -p "$AS_DIST/dut"
mkdir -p "$AS_DIST/panels"
mkdir -p "$AS_DIST/MicroServices"
mkdir -p "$AS_DIST/classview2"
mkdir -p "$AS_DIST/legacy"
mkdir -p "$AS_DIST/Tests"
mkdir -p "$VENDOR/font-awesome/css"
mkdir -p "$VENDOR/font-awesome/webfonts"

# ─── Step 2: Copy Publon.Press files ────────────────────────────────
echo "[2/4] Copying Publon.Press files..."

# UI
cp "$PP_ROOT/UI/class.ui.js" "$DIST/UI/"
cp "$PP_ROOT/UI/class.ui.css" "$DIST/UI/"

# Core (only files referenced by index.html)
for f in PublonRegistry.js Publon.js PublonTable.js Publome.js PublonBinding.js DbBinding.js UIBinding.js; do
    cp "$PP_ROOT/Core/$f" "$DIST/Core/"
done

# Services (only files referenced by index.html)
for f in ServiceRegistry.js member.service.js group.service.js event.service.js messages.service.js tag.service.js logicComposer.service.js accreditation.service.js; do
    cp "$PP_ROOT/Services/$f" "$DIST/Services/"
done

# AutoScholar root JS/CSS files
cp "$SCRIPT_DIR"/autoscholar.config.js "$AS_DIST/"
cp "$SCRIPT_DIR"/autoscholar.theme.css "$AS_DIST/"
cp "$SCRIPT_DIR"/class.*.js "$AS_DIST/"

# Panels
cp "$SCRIPT_DIR"/panels/class.*.js "$AS_DIST/panels/"

# MicroServices
cp "$SCRIPT_DIR"/MicroServices/*.js "$AS_DIST/MicroServices/"

# classview2
cp "$SCRIPT_DIR"/classview2/*.js "$AS_DIST/classview2/"

# legacy (only class.El.js referenced by index.html)
cp "$SCRIPT_DIR/legacy/class.El.js" "$AS_DIST/legacy/"

# Tests — only the specific files referenced by index.html
TESTS_FILES=(
    autoscholar.exec-theme.css
    class.TestRunner.js class.TestResultsRenderer.js
    class.InstApiTestSuite.js class.DbApiTestSuite.js class.StaffAuthTestSuite.js class.ComponentTestSuite.js
    class.StaffAdminPanel.js class.EmailPanel.js class.AutoScholarServicesPanel.js
    class.RiskAssessmentPanel.js class.HistoricalPerformancePanel.js class.PeerCorrelationPanel.js
    class.ClassAnalyticsPanel.js class.QuickPollsPanel.js class.UserManagementPanel.js
    class.GroupPickerModal.js class.CoursePickerPanel.js class.ProgrammePickerPanel.js
    class.MemberPickerModal.js class.PickerDemoPanel.js class.RoleConfigurationPanel.js
    class.SystemIntegrationsPanel.js class.ClassRosterPanel.js class.GradebookPanel.js
    class.AttendanceDPPanel.js class.RegistrationCheckPanel.js
    class.CareerHubPanel.js class.StudentDashPanel.js class.MyResultsPanel.js
    class.DegreeProgressPanel.js class.CumLaudePanel.js class.EvidencePortfolioPanel.js
    class.StudyDiaryPanel.js class.AchievementsPanel.js class.StudentCentralPanel.js
    class.ProgAnalystBridge.js class.ProgAnalystData.js class.ProgOverviewPanel.js
    class.GatekeeperPanel.js class.CohortTrackerPanel.js class.CohortComparePanel.js
    class.ProgressionMapPanel.js class.OutcomeMappingPanel.js class.CurriculumEditorPanel.js
    class.CascadeRiskEngine.js class.ProgAnalystPanel.js
    classview.schema.js classview.seed.js classview.manifest.js class.ClassViewConnect.js
    class.CaseworkBridge.js class.CaseworkCounsellorPanel.js
    class.InstitutionPanel.js class.ApiSpecPanel.js
    class.ExecSchema.js class.ExecMetrics.js class.ExecRhythmCalendar.js
    class.ExecExceptionEngine.js class.ExecNarrativeEngine.js class.ExecScenarioModel.js
    class.ExecDataLoader.js class.ExecSummaryPanel.js class.ExecDecisionRehearsalPanel.js
    class.ExecHierarchyPanel.js class.ExecPerformancePanel.js class.ExecStudentsPanel.js
    class.ExecCountsPanel.js class.ExecAssessmentPanel.js class.ExecStrategyPanel.js
    class.ExecAboutPanel.js class.ExecReportsPanel.js class.ExecSankeyPanel.js
    class.ExecutiveInsightPanel.js
    class.AccreditationAutomatePanel.js
    class.FunnelStrip.js class.HealthMatrix.js
)

for f in "${TESTS_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/Tests/$f" ]; then
        cp "$SCRIPT_DIR/Tests/$f" "$AS_DIST/Tests/"
    else
        echo "  WARNING: Tests/$f not found"
    fi
done

echo "  Copied $(find "$DIST" -type f | wc -l | tr -d ' ') files"

# ─── Step 3: Download CDN libraries (cached) ────────────────────────
echo "[3/4] Downloading vendor libraries..."

download() {
    local url="$1"
    local dest="$2"
    if [ -f "$dest" ]; then
        echo "  cached: $(basename "$dest")"
        return
    fi
    echo "  downloading: $(basename "$dest")"
    curl -sL "$url" -o "$dest"
}

# jQuery
download "https://code.jquery.com/jquery-3.7.1.min.js" "$VENDOR/jquery-3.7.1.min.js"

# DataTables
download "https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js" "$VENDOR/jquery.dataTables.min.js"
download "https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css" "$VENDOR/jquery.dataTables.min.css"

# ApexCharts
download "https://cdn.jsdelivr.net/npm/apexcharts@3.49.0/dist/apexcharts.min.js" "$VENDOR/apexcharts.min.js"

# QR Code Styling
download "https://unpkg.com/qr-code-styling@1.6.0-rc.1/lib/qr-code-styling.js" "$VENDOR/qr-code-styling.js"

# vis-network
download "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js" "$VENDOR/vis-network.min.js"

# Cytoscape + dagre
download "https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.4/cytoscape.min.js" "$VENDOR/cytoscape.min.js"
download "https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js" "$VENDOR/dagre.min.js"
download "https://unpkg.com/cytoscape-dagre@2.5.0/cytoscape-dagre.js" "$VENDOR/cytoscape-dagre.js"

# D3 + d3-sankey
download "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js" "$VENDOR/d3.min.js"
download "https://unpkg.com/d3-sankey@0.12.3/dist/d3-sankey.min.js" "$VENDOR/d3-sankey.min.js"

# Chart.js
download "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" "$VENDOR/chart.umd.min.js"

# Plotly
download "https://cdn.plot.ly/plotly-2.35.0.min.js" "$VENDOR/plotly-2.35.0.min.js"

# FullCalendar
download "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js" "$VENDOR/fullcalendar.global.min.js"

# Font Awesome
download "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" "$VENDOR/font-awesome/css/all.min.css"

# Font Awesome webfonts — download the main woff2 files
for wf in fa-solid-900.woff2 fa-regular-400.woff2 fa-brands-400.woff2; do
    download "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/$wf" "$VENDOR/font-awesome/webfonts/$wf"
done

# Fix Font Awesome CSS paths (CDN uses ../webfonts, we need the same relative structure)
# The directory structure font-awesome/css/all.min.css + font-awesome/webfonts/ preserves this.

echo "  Vendor download complete"

# ─── Step 4: Generate modified index.html ────────────────────────────
echo "[4/4] Generating dut/index.html with local vendor paths..."

cat > "$AS_DIST/dut/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoScholar — DUT</title>
    <link rel="stylesheet" href="../../../UI/class.ui.css">
    <link rel="stylesheet" href="../vendor/font-awesome/css/all.min.css">
    <link rel="stylesheet" href="../vendor/jquery.dataTables.min.css">
    <script src="../vendor/jquery-3.7.1.min.js"></script>
    <script src="../vendor/jquery.dataTables.min.js"></script>
    <script src="../vendor/apexcharts.min.js"></script>
    <link rel="stylesheet" href="../Tests/autoscholar.exec-theme.css">
    <link rel="stylesheet" href="../autoscholar.theme.css">
</head>
<body>
    <div id="app"></div>

    <!-- Tauri fetch shim — intercepts /api-proxy calls and routes through Rust backend -->
    <script>
    if (window.__TAURI__) {
        const _origFetch = window.fetch;
        window.fetch = function(url, opts) {
            if (typeof url === 'string' && url.includes('api-proxy')) {
                // Determine institution API URL from the page config
                var apiUrl = 'https://autoscholar.dut.ac.za/api.query5.php';
                if (window.AutoScholarConfig && window.AutoScholarConfig.apiUrl) {
                    apiUrl = window.AutoScholarConfig.apiUrl;
                }
                return window.__TAURI__.core.invoke('api_proxy', {
                    url: apiUrl,
                    body: opts && opts.body ? opts.body : ''
                }).then(function(text) {
                    return new Response(text, {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                });
            }
            return _origFetch.call(window, url, opts);
        };
    }
    </script>

    <!-- UI system -->
    <script src="../../../UI/class.ui.js"></script>

    <!-- Core -->
    <script src="../../../Core/PublonRegistry.js"></script>
    <script src="../../../Core/Publon.js"></script>
    <script src="../../../Core/PublonTable.js"></script>
    <script src="../../../Core/Publome.js"></script>
    <script src="../../../Core/PublonBinding.js"></script>
    <script src="../../../Core/DbBinding.js"></script>
    <script src="../../../Core/UIBinding.js"></script>

    <!-- Services -->
    <script src="../../../Services/ServiceRegistry.js"></script>
    <script src="../../../Services/member.service.js"></script>
    <script src="../../../Services/group.service.js"></script>
    <script src="../../../Services/event.service.js"></script>
    <script src="../../../Services/messages.service.js"></script>
    <script src="../../../Services/tag.service.js"></script>
    <script src="../../../Services/logicComposer.service.js"></script>
    <script src="../../../Services/accreditation.service.js"></script>

    <!-- QR code library -->
    <script src="../vendor/qr-code-styling.js"></script>

    <!-- AutoScholar config & domain classes -->
    <script src="../autoscholar.config.js"></script>
    <script src="../class.Tagger.js"></script>
    <script src="../class.CareerViews.js"></script>
    <script src="../class.TimetableViews.js"></script>

    <!-- Student Central panels -->
    <script src="../panels/class.StudentDashboardPanel.js"></script>
    <script src="../panels/class.StudentResultsPanel.js"></script>
    <script src="../panels/class.StudentSchedulePanel.js"></script>
    <script src="../panels/class.StudentProgressPanel.js"></script>
    <script src="../panels/class.StudentDiaryPanel.js"></script>
    <script src="../panels/class.StudentGoalsPanel.js"></script>
    <script src="../panels/class.StudentCareerPanel.js"></script>
    <script src="../panels/class.StudentSupportPanel.js"></script>
    <script src="../panels/class.StudentAboutPanel.js"></script>
    <script src="../panels/class.StudentFinancesPanel.js"></script>
    <script src="../panels/class.StudentDegreeMapPanel.js"></script>

    <!-- AutoScholar support classes -->
    <script src="../class.ServiceBackend.js"></script>
    <script src="../class.ServiceBackendAdapter.js"></script>
    <script src="../class.StaffAccessService.js"></script>
    <script src="../class.DataAdapter.js"></script>
    <script src="../class.ApiDataAdapter.js"></script>
    <script src="../class.SampleDataAdapter.js"></script>
    <script src="../class.ServiceCallManager.js"></script>
    <script src="../class.ServiceLoader.js"></script>
    <script src="../class.BaseSelector.js"></script>
    <script src="../class.StudentSelector.js"></script>
    <script src="../class.CourseSelector.js"></script>
    <script src="../class.FacultySelector.js"></script>
    <script src="../class.DepartmentSelector.js"></script>
    <script src="../class.ProgrammeSelector.js"></script>
    <script src="../class.CohortSelector.js"></script>
    <script src="../class.AutoScholarAbout.js"></script>
    <script src="../class.AutoScholarUtils.js"></script>
    <script src="../class.AutoScholarErrors.js"></script>
    <script src="../class.SecurityUtils.js"></script>
    <script src="../class.LoadingStateManager.js"></script>
    <script src="../class.AdapterUtils.js"></script>

    <!-- Risk analysis -->
    <script src="../classview2/class.RiskAnalyzer.js"></script>

    <!-- Test rig panels -->
    <script src="../Tests/class.TestRunner.js"></script>
    <script src="../Tests/class.TestResultsRenderer.js"></script>
    <script src="../Tests/class.InstApiTestSuite.js"></script>
    <script src="../Tests/class.DbApiTestSuite.js"></script>
    <script src="../Tests/class.StaffAuthTestSuite.js"></script>
    <script src="../Tests/class.ComponentTestSuite.js"></script>
    <script src="../Tests/class.StaffAdminPanel.js"></script>
    <script src="../Tests/class.EmailPanel.js"></script>
    <script src="../Tests/class.AutoScholarServicesPanel.js"></script>
    <script src="../Tests/class.RiskAssessmentPanel.js"></script>
    <script src="../Tests/class.HistoricalPerformancePanel.js"></script>
    <script src="../Tests/class.PeerCorrelationPanel.js"></script>
    <script src="../Tests/class.ClassAnalyticsPanel.js"></script>
    <script src="../Tests/class.QuickPollsPanel.js"></script>
    <script src="../Tests/class.UserManagementPanel.js"></script>
    <script src="../Tests/class.GroupPickerModal.js"></script>
    <script src="../Tests/class.CoursePickerPanel.js"></script>
    <script src="../Tests/class.ProgrammePickerPanel.js"></script>
    <script src="../Tests/class.MemberPickerModal.js"></script>
    <script src="../Tests/class.PickerDemoPanel.js"></script>
    <script src="../Tests/class.RoleConfigurationPanel.js"></script>
    <script src="../Tests/class.SystemIntegrationsPanel.js"></script>
    <script src="../Tests/class.ClassRosterPanel.js"></script>
    <script src="../Tests/class.GradebookPanel.js"></script>
    <script src="../Tests/class.AttendanceDPPanel.js"></script>
    <script src="../Tests/class.RegistrationCheckPanel.js"></script>

    <!-- Career Hub MicroServices -->
    <script src="../MicroServices/ms.career.js"></script>
    <script src="../MicroServices/ms.qualification.js"></script>
    <script src="../Tests/class.CareerHubPanel.js"></script>
    <script src="../Tests/class.StudentDashPanel.js"></script>
    <script src="../Tests/class.MyResultsPanel.js"></script>
    <script src="../Tests/class.DegreeProgressPanel.js"></script>
    <script src="../Tests/class.CumLaudePanel.js"></script>
    <script src="../Tests/class.EvidencePortfolioPanel.js"></script>
    <script src="../Tests/class.StudyDiaryPanel.js"></script>
    <script src="../Tests/class.AchievementsPanel.js"></script>
    <script src="../Tests/class.StudentCentralPanel.js"></script>

    <!-- vis-network for progression maps -->
    <script src="../vendor/vis-network.min.js"></script>

    <!-- Cytoscape.js + dagre layout -->
    <script src="../vendor/cytoscape.min.js"></script>
    <script src="../vendor/dagre.min.js"></script>
    <script src="../vendor/cytoscape-dagre.js"></script>

    <!-- D3.js + d3-sankey -->
    <script src="../vendor/d3.min.js"></script>
    <script src="../vendor/d3-sankey.min.js"></script>

    <!-- Programme Analyst -->
    <script src="../MicroServices/analyst.schema.js"></script>
    <script src="../MicroServices/analyst.seed.js"></script>
    <script src="../MicroServices/ms.analyst.js"></script>
    <script src="../Tests/class.ProgAnalystBridge.js"></script>
    <script src="../Tests/class.ProgAnalystData.js"></script>
    <script src="../Tests/class.ProgOverviewPanel.js"></script>
    <script src="../Tests/class.GatekeeperPanel.js"></script>
    <script src="../Tests/class.CohortTrackerPanel.js"></script>
    <script src="../Tests/class.CohortComparePanel.js"></script>
    <script src="../Tests/class.ProgressionMapPanel.js"></script>
    <script src="../Tests/class.OutcomeMappingPanel.js"></script>
    <script src="../Tests/class.CurriculumEditorPanel.js"></script>
    <script src="../Tests/class.CascadeRiskEngine.js"></script>
    <script src="../Tests/class.ProgAnalystPanel.js"></script>

    <!-- ClassView Connect -->
    <script src="../Tests/classview.schema.js"></script>
    <script src="../Tests/classview.seed.js"></script>
    <script src="../Tests/classview.manifest.js"></script>
    <script src="../Tests/class.ClassViewConnect.js"></script>

    <!-- Chart.js -->
    <script src="../vendor/chart.umd.min.js"></script>

    <!-- Plotly.js for risk assessment and class roster charts -->
    <script src="../vendor/plotly-2.35.0.min.js"></script>

    <!-- FullCalendar -->
    <script src="../vendor/fullcalendar.global.min.js"></script>

    <!-- Casework Counsellor -->
    <script src="../MicroServices/casework.schema.js"></script>
    <script src="../MicroServices/casework.seed.js"></script>
    <script src="../MicroServices/ms.casework.js"></script>
    <script src="../Tests/class.CaseworkBridge.js"></script>
    <script src="../Tests/class.CaseworkCounsellorPanel.js"></script>

    <!-- Multi-institution panels -->
    <script src="../Tests/class.InstitutionPanel.js"></script>
    <script src="../Tests/class.ApiSpecPanel.js"></script>

    <!-- Executive Insight -->
    <script src="../MicroServices/ms.executive.js"></script>
    <script src="../Tests/class.ExecSchema.js"></script>
    <script src="../Tests/class.ExecMetrics.js"></script>
    <script src="../Tests/class.ExecRhythmCalendar.js"></script>
    <script src="../Tests/class.ExecExceptionEngine.js"></script>
    <script src="../Tests/class.ExecNarrativeEngine.js"></script>
    <script src="../Tests/class.ExecScenarioModel.js"></script>
    <script src="../Tests/class.ExecDataLoader.js"></script>
    <script src="../Tests/class.ExecSummaryPanel.js"></script>
    <script src="../Tests/class.ExecDecisionRehearsalPanel.js"></script>
    <script src="../Tests/class.ExecHierarchyPanel.js"></script>
    <script src="../Tests/class.ExecPerformancePanel.js"></script>
    <script src="../Tests/class.ExecStudentsPanel.js"></script>
    <script src="../Tests/class.ExecCountsPanel.js"></script>
    <script src="../Tests/class.ExecAssessmentPanel.js"></script>
    <script src="../Tests/class.ExecStrategyPanel.js"></script>
    <script src="../Tests/class.ExecAboutPanel.js"></script>
    <script src="../Tests/class.ExecReportsPanel.js"></script>
    <script src="../Tests/class.ExecSankeyPanel.js"></script>
    <script src="../Tests/class.ExecutiveInsightPanel.js"></script>

    <!-- Accreditation -->
    <script src="../Tests/class.AccreditationAutomatePanel.js"></script>

    <!-- Interaction system -->
    <script src="../class.AsToast.js"></script>
    <script src="../class.AsEmptyState.js"></script>
    <script src="../class.AsCommandPalette.js"></script>
    <script src="../Tests/class.FunnelStrip.js"></script>
    <script src="../Tests/class.HealthMatrix.js"></script>

    <!-- El — lightweight DOM builder -->
    <script src="../legacy/class.El.js"></script>

    <!-- AutoScholarApp + EntryFlow -->
    <script src="../class.AutoScholarApp.js"></script>
    <script src="../class.AutoScholarEntryFlow.js"></script>

    <script>
    document.addEventListener('DOMContentLoaded', () => {
        new AutoScholarEntryFlow({
            container: document.getElementById('app'),
            endpoint: '/api-proxy',
            institution: 'DUT',
            institutionName: 'Durban University of Technology'
        }).start();
    });
    </script>
</body>
</html>
HTMLEOF

echo ""
echo "=== Build complete ==="
echo "Files: $(find "$DIST" -type f | wc -l | tr -d ' ')"
echo "Size:  $(du -sh "$DIST" | cut -f1)"
echo ""
echo "Next steps:"
echo "  cd src-tauri && cargo tauri dev    # Test in dev mode"
echo "  cd src-tauri && cargo tauri build  # Build .app + .dmg"
