/**
 * StudentGoalsPanel - Goal tracking with task trees and progress
 *
 * Extracted from AutoScholarStudent._renderGoalsPanel().
 * Uses DiaryService for goal/task CRUD and Tagger for tag management.
 */
class StudentGoalsPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
        this._goalsTagger = null;
    }

    render(container) {
        const diary = this.services.diary;
        const memberId = this.currentUser.idx;

        const panelHeader = container.add({ css: 'flex items-center gap-2 mb-4 pb-3 border-b' });
        panelHeader.add({ tag: 'i', css: 'fas fa-bullseye text-xl text-secondary' });
        panelHeader.add({ tag: 'h2', css: 'text-lg font-semibold', script: 'My Goals' });

        if (!diary) {
            container.add({ css: 'text-center py-8 text-muted', script: 'Goals service not available' });
            return;
        }

        this._initTagger();

        // KPI row
        const goals = diary.getGoals?.(memberId) || [];
        const completedGoals = goals.filter(g => {
            const progress = diary.calculateTaskProgress?.(g.idx);
            return progress && progress.total > 0 && progress.percentage >= 100;
        });
        const kpiRow = container.add({ css: 'flex flex-wrap gap-3 mb-4' });
        this._renderKPI(kpiRow, 'bullseye', 'Total Goals', String(goals.length), 'text-purple-600');
        this._renderKPI(kpiRow, 'check-circle', 'Completed', String(completedGoals.length), 'text-green-600');
        this._renderKPI(kpiRow, 'spinner', 'In Progress', String(goals.length - completedGoals.length), 'text-blue-600');

        // Add goal button
        const header = container.add({ css: 'flex justify-end mb-4' });
        if (typeof uiButton !== 'undefined') {
            new uiButton({
                parent: header, label: 'New Goal', icon: 'plus', variant: 'primary', size: 'sm',
                onClick: () => this._showAddGoalModal(diary, memberId)
            });
        }

        // Goals list container
        this._goalsListContainer = container.add({ css: '' });
        this._renderGoalsList(diary, memberId);
    }

    _initTagger() {
        if (!this._goalsTagger && typeof Tagger !== 'undefined') {
            this._goalsTagger = new Tagger({ prefix: 'goals' });
            if (this._goalsTagger.getGroups().length === 0) {
                const academic = this._goalsTagger.createGroup({ label: 'Academic', color: 'var(--ui-primary)' });
                this._goalsTagger.createTag({ groupId: academic.idx, label: 'Exam prep', color: 'var(--ui-primary)' });
                this._goalsTagger.createTag({ groupId: academic.idx, label: 'Assignment', color: 'var(--ui-info)' });
                this._goalsTagger.createTag({ groupId: academic.idx, label: 'Study session', color: 'var(--ui-secondary)' });

                const progress = this._goalsTagger.createGroup({ label: 'Progress', color: 'var(--ui-success)' });
                this._goalsTagger.createTag({ groupId: progress.idx, label: 'Breakthrough!', color: 'var(--ui-success)' });
                this._goalsTagger.createTag({ groupId: progress.idx, label: 'Making progress', color: 'var(--ui-success-400)' });
                this._goalsTagger.createTag({ groupId: progress.idx, label: 'Struggling', color: 'var(--ui-warning)' });

                const personal = this._goalsTagger.createGroup({ label: 'Personal', color: 'var(--ui-secondary-400)' });
                this._goalsTagger.createTag({ groupId: personal.idx, label: 'Reflection', color: 'var(--ui-secondary-400)' });
                this._goalsTagger.createTag({ groupId: personal.idx, label: 'Goals', color: 'var(--ui-secondary)' });
                this._goalsTagger.createTag({ groupId: personal.idx, label: 'Wellness', color: 'var(--ui-accent)' });
            }
        }
    }

    _renderGoalsList(diary, memberId) {
        const container = this._goalsListContainer;
        container.clear(true);

        const goals = diary.getGoals?.(memberId) || [];
        if (goals.length === 0) {
            const empty = container.add({ css: 'text-center py-6 text-muted' });
            empty.add({ tag: 'i', css: 'fas fa-bullseye text-3xl mb-2 opacity-50 block' });
            empty.add({ tag: 'p', script: 'No goals set yet. Add a goal to track your progress!' });
            return;
        }

        const grid = container.add({ css: 'flex flex-wrap gap-4' });
        goals.forEach(goal => this._renderGoalCard(grid, goal, diary, memberId));
    }

    _renderGoalCard(container, goal, diary, memberId) {
        const card = container.add({ css: 'card p-4 as-flex-card-lg' });

        // Header: title + tags
        const header = card.add({ css: 'flex items-start justify-between mb-3' });
        const titleRow = header.add({ css: 'flex items-center gap-2 flex-1' });
        titleRow.add({ tag: 'i', css: 'fas fa-bullseye text-green-500' });
        titleRow.add({ css: 'font-semibold', script: goal.title || goal.description || 'Untitled Goal' });

        // Tags — use Tagger.renderTags for consistent chip styling
        if (this._goalsTagger) {
            const tagsRow = header.add({ css: '' });
            this._goalsTagger.renderTags(tagsRow.domElement, 'diaryGoal', goal.idx, { editable: false });
        }

        // Actions list
        this._renderGoalActions(card, goal, diary, memberId);

        // Add action input
        this._renderAddActionInput(card, goal, diary, memberId);

        // Progress bar
        this._renderGoalProgress(card, goal, diary);
    }

    _renderGoalActions(card, goal, diary, memberId) {
        const actionsContainer = card.add({ css: 'space-y-1 mb-3' });
        const actions = diary.getGoalTasks?.(goal.idx) || [];

        if (actions.length === 0) {
            const placeholder = actionsContainer.add({ css: 'flex items-center gap-2 py-1 text-gray-400 italic text-sm' });
            placeholder.add({ tag: 'i', css: 'far fa-circle text-gray-300' });
            placeholder.add({ script: 'Click + below to add steps...' });
            return;
        }

        actions.forEach(action => {
            const metadata = action.metadata ? (typeof action.metadata === 'string' ? JSON.parse(action.metadata) : action.metadata) : {};
            const isCompleted = metadata.completed === true;

            const row = actionsContainer.add({ css: 'flex items-center gap-2 py-1 group' });

            const checkbox = row.add({
                tag: 'button',
                css: `w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`,
                attr: { type: 'button' }
            });
            if (isCompleted) checkbox.add({ tag: 'i', css: 'fas fa-check text-xs' });

            row.add({ css: `flex-1 text-sm ${isCompleted ? 'line-through text-gray-400' : ''}`, script: action.label });

            const deleteBtn = row.add({
                tag: 'button',
                css: 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity',
                attr: { type: 'button' }
            });
            deleteBtn.add({ tag: 'i', css: 'fas fa-times text-xs' });

            checkbox.domElement.onclick = () => {
                diary.toggleTaskComplete?.(action.idx);
                this._refreshGoalCard(card, goal, diary, memberId);
            };
            deleteBtn.domElement.onclick = (e) => {
                e.stopPropagation();
                diary.deleteGoalTask?.(action.idx);
                this._refreshGoalCard(card, goal, diary, memberId);
            };
        });
    }

    _renderAddActionInput(card, goal, diary, memberId) {
        const inputRow = card.add({ css: 'flex items-center gap-2 mt-2 pt-2 border-t border-dashed' });
        inputRow.add({ tag: 'i', css: 'fas fa-plus text-gray-400 text-sm' });

        const input = inputRow.add({
            tag: 'input',
            css: 'flex-1 text-sm p-1 border-0 outline-none placeholder-gray-400',
            attr: { type: 'text', placeholder: 'Add an action step...' }
        });

        const addAction = () => {
            if (input.domElement.value.trim()) {
                diary.addGoalTask?.(goal.idx, { label: input.domElement.value.trim() });
                input.domElement.value = '';
                this._refreshGoalCard(card, goal, diary, memberId);
            }
        };

        input.domElement.onkeydown = (e) => { if (e.key === 'Enter') addAction(); };

        const addBtn = inputRow.add({ tag: 'button', css: 'text-green-500 hover:text-green-600 px-2', attr: { type: 'button' } });
        addBtn.add({ tag: 'i', css: 'fas fa-check' });
        addBtn.domElement.onclick = addAction;
    }

    _renderGoalProgress(card, goal, diary) {
        const progress = diary.calculateTaskProgress?.(goal.idx) || { completed: 0, total: 0, percentage: 0 };
        if (progress.total === 0) return;

        const progressRow = card.add({ css: 'flex items-center gap-2 mt-3 pt-2 border-t' });
        const barWrap = progressRow.add({ css: 'flex-1' });
        AutoScholarConfig.renderProgress(barWrap, progress.percentage, { thresholdKey: 'completion' });
        progressRow.add({ css: 'text-xs text-muted whitespace-nowrap', script: `${progress.completed}/${progress.total} (${Math.round(progress.percentage)}%)` });
    }

    _refreshGoalCard(card, goal, diary, memberId) {
        card.clear(true);
        const header = card.add({ css: 'flex items-start justify-between mb-3' });
        const titleRow = header.add({ css: 'flex items-center gap-2 flex-1' });
        titleRow.add({ tag: 'i', css: 'fas fa-bullseye text-green-500' });
        titleRow.add({ css: 'font-semibold', script: goal.title || goal.description || 'Untitled Goal' });

        if (this._goalsTagger) {
            const tagsRow = header.add({ css: '' });
            this._goalsTagger.renderTags(tagsRow.domElement, 'diaryGoal', goal.idx, { editable: false });
        }

        this._renderGoalActions(card, goal, diary, memberId);
        this._renderAddActionInput(card, goal, diary, memberId);
        this._renderGoalProgress(card, goal, diary);
    }

    _showAddGoalModal(diary, memberId) {
        if (typeof ElModal === 'undefined') {
            const title = prompt('Goal title:');
            if (title && title.trim()) {
                const goal = diary.createGoal?.({ memberId, title: title.trim() });
                if (goal && diary.addGoalTask) diary.addGoalTask(goal.idx, { label: 'List steps to progress this goal' });
                this._renderGoalsList(diary, memberId);
                if (typeof uiToast !== 'undefined') ElToast.show('Goal added!', 'success');
            }
            return;
        }

        const modal = new ElModal({ title: 'New Goal', size: 'sm' });
        const content = modal.getContent();
        const c = new El({ parent: content, css: 'space-y-4' });

        c.add({ css: 'text-sm font-medium', script: 'Goal Title' });
        const titleInput = c.add({
            tag: 'input', css: 'w-full p-2 border rounded',
            attr: { type: 'text', placeholder: 'e.g., Pass APCO301 with 75%' }
        });

        // Tag picker
        const selectedTags = [];
        if (this._goalsTagger) {
            c.add({ css: 'text-sm font-medium mt-3', script: 'Tags (optional)' });
            const tagsRow = c.add({ css: 'flex flex-wrap gap-1' });
            this._goalsTagger.getAllTags().forEach(tag => {
                const chip = tagsRow.add({
                    css: 'text-xs px-2 py-1 rounded-full cursor-pointer bg-gray-100 text-gray-600 hover:bg-gray-200',
                    script: tag.label
                });
                chip.domElement.onclick = () => {
                    const idx = selectedTags.indexOf(tag.idx);
                    if (idx >= 0) {
                        selectedTags.splice(idx, 1);
                        chip.domElement.setAttribute('style', '');
                        chip.domElement.classList.remove('as-tag-colored', 'text-white');
                        chip.domElement.classList.add('bg-gray-100', 'text-gray-600');
                    } else {
                        selectedTags.push(tag.idx);
                        chip.domElement.classList.remove('bg-gray-100', 'text-gray-600');
                        chip.domElement.classList.add('as-tag-colored', 'text-white');
                        chip.domElement.setAttribute('style', '--tag-color:' + tag.color);
                    }
                };
            });
        }

        const btnRow = c.add({ css: 'flex justify-end gap-2 mt-4' });
        new uiButton({ parent: btnRow, label: 'Cancel', variant: 'ghost', onClick: () => modal.close() });
        new uiButton({
            parent: btnRow, label: 'Create Goal', variant: 'primary',
            onClick: () => {
                const title = titleInput.domElement.value.trim();
                if (!title) { ElToast.show('Please enter a goal title', 'warning'); return; }
                const goal = diary.createGoal?.({ memberId, title });
                if (goal && diary.addGoalTask) diary.addGoalTask(goal.idx, { label: 'List steps to progress this goal' });
                if (goal && this._goalsTagger && selectedTags.length > 0) {
                    selectedTags.forEach(tagId => this._goalsTagger.tag('diaryGoal', goal.idx, tagId));
                }
                modal.close();
                this._renderGoalsList(diary, memberId);
                ElToast.show('Goal created!', 'success');
            }
        });

        modal.open();
        titleInput.domElement.focus();
    }

    _renderKPI(container, icon, label, value, colorCss) {
        const card = container.add({ css: 'card p-3 text-center as-flex-kpi' });
        card.add({ tag: 'i', css: `fas fa-${icon} text-xl mb-1 ${colorCss}` });
        card.add({ css: 'text-lg font-bold', script: value });
        card.add({ css: 'text-xs text-muted', script: label });
    }
}
