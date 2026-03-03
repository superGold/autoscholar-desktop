/**
 * ExecProjectBridge — Maps interventions to projects and PDSA cycles to tasks
 *
 * Uses the project service to create structured project records from
 * Executive Insight interventions, enabling full project management
 * (milestones, team, task tracking) for improvement initiatives.
 *
 * Usage:
 *   var bridge = new ExecProjectBridge({ publome, projectService });
 *   bridge.syncIntervention(intervention);  // creates/updates project
 *   bridge.syncPdsaCycle(pdsa, intervention); // creates/updates task
 */
class ExecProjectBridge {

    constructor(config = {}) {
        this.publome = config.publome;
        this.projectService = config.projectService;
        this._projectMap = {};  // interventionIdx → projectIdx
        this._taskMap = {};     // pdsaCycleIdx → taskIdx
    }

    /**
     * Create or update a project from an intervention record
     * @param {Object} intervention - intervention data (from engine.getInterventions or publome record)
     * @returns {Publon} the project record
     */
    syncIntervention(intervention) {
        if (!this.projectService) return null;
        var projTable = this.projectService.table('project');

        var intIdx = intervention.idx || (intervention.get ? intervention.get('idx') : null);
        var intName = intervention.name || (intervention.get ? intervention.get('name') : '');
        var intStatus = intervention.status || (intervention.get ? intervention.get('status') : 'proposed');

        // Map intervention status → project status
        var statusMap = { proposed: 'planning', active: 'active', completed: 'completed', paused: 'on-hold' };
        var projStatus = statusMap[intStatus] || 'planning';

        // Check if project already exists
        var existingIdx = this._projectMap[intIdx];
        if (existingIdx) {
            var existing = projTable.read(existingIdx);
            if (existing) {
                projTable.update(existingIdx, { name: intName, status: projStatus });
                return existing;
            }
        }

        // Create new project
        var project = projTable.create({
            code: 'INT-' + intIdx,
            name: intName,
            status: projStatus,
            projectType: 'research',
            createdAt: new Date().toISOString()
        });

        if (project) {
            var projIdx = project.idx || (project.get ? project.get('idx') : null);
            this._projectMap[intIdx] = projIdx;

            // Sync existing PDSA cycles as tasks
            this._syncPdsaCyclesForIntervention(intIdx, projIdx);
        }

        return project;
    }

    /**
     * Create or update a task from a PDSA cycle
     * @param {Object} pdsa - pdsaCycle data
     * @param {number} projectIdx - linked project idx
     * @returns {Publon} the task record
     */
    syncPdsaCycle(pdsa, projectIdx) {
        if (!this.projectService || !projectIdx) return null;
        var taskTable = this.projectService.table('task');

        var pdsaIdx = pdsa.idx || (pdsa.get ? pdsa.get('idx') : null);
        var phase = pdsa.phase || (pdsa.get ? pdsa.get('phase') : 'Plan');
        var plan = pdsa.plan || (pdsa.get ? pdsa.get('plan') : '');
        var pdsaStatus = pdsa.status || (pdsa.get ? pdsa.get('status') : 'active');
        var startDate = pdsa.startDate || (pdsa.get ? pdsa.get('startDate') : null);
        var endDate = pdsa.endDate || (pdsa.get ? pdsa.get('endDate') : null);

        // Map PDSA status → task status
        var statusMap = { active: 'in-progress', completed: 'done', abandoned: 'cancelled' };
        var taskStatus = statusMap[pdsaStatus] || 'todo';

        // Check if task already exists
        var existingIdx = this._taskMap[pdsaIdx];
        if (existingIdx) {
            var existing = taskTable.read(existingIdx);
            if (existing) {
                taskTable.update(existingIdx, {
                    name: phase + ': ' + plan,
                    status: taskStatus,
                    startTime: startDate,
                    endTime: endDate
                });
                return existing;
            }
        }

        // Create new task
        var task = taskTable.create({
            projectId: projectIdx,
            name: phase + ': ' + plan,
            status: taskStatus,
            startTime: startDate,
            endTime: endDate,
            code: 'PDSA-' + pdsaIdx,
            createdAt: new Date().toISOString()
        });

        if (task) {
            this._taskMap[pdsaIdx] = task.idx || (task.get ? task.get('idx') : null);
        }

        return task;
    }

    /**
     * Find the project linked to an intervention
     * @param {number} interventionIdx
     * @returns {Publon|null}
     */
    getProjectForIntervention(interventionIdx) {
        if (!this.projectService) return null;
        var projIdx = this._projectMap[interventionIdx];
        return projIdx ? this.projectService.table('project').read(projIdx) : null;
    }

    /**
     * Find tasks linked to an intervention's PDSA cycles
     * @param {number} interventionIdx
     * @returns {Array<Publon>}
     */
    getTasksForIntervention(interventionIdx) {
        if (!this.projectService) return [];
        var projIdx = this._projectMap[interventionIdx];
        if (!projIdx) return [];
        return this.projectService.table('task').all().filter(function(t) {
            return t.get('projectId') === projIdx;
        });
    }

    // ── Internal ─────────────────────────────────────────────────────

    _syncPdsaCyclesForIntervention(interventionIdx, projectIdx) {
        var pdsaTable = this.publome.table('pdsaCycle');
        if (!pdsaTable) return;

        var cycles = pdsaTable.all().filter(function(p) {
            return p.get('interventionId') === interventionIdx;
        });

        for (var i = 0; i < cycles.length; i++) {
            this.syncPdsaCycle(cycles[i], projectIdx);
        }
    }
}
