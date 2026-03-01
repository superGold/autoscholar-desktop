/**
 * StudentCareerPanel - Career Hub with profile, CV builder, bursaries, jobs
 *
 * Extracted from AutoScholarStudent._renderCareerHub().
 * Uses CareerViews for dashboard/bursaries/jobs/applications static renders.
 * Includes profile editing, skill/experience CRUD, and CV builder integration.
 */
class StudentCareerPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
    }

    render(container) {
        const career = this.services.career;
        const memberId = this.currentUser.idx;

        if (!career) {
            container.add({ css: 'text-center py-8 text-muted', script: 'Career service not available' });
            return;
        }

        // Initialize sample data if needed
        if (career.initialize) career.initialize();

        // Sub-tabs for career sections
        if (typeof uiTabs !== 'undefined') {
            const careerTabs = new uiTabs({
                parent: container,
                template: 'pills',
                size: 'sm',
                content: {
                    dashboard: { label: 'Dashboard' },
                    profile: { label: 'My Profile' },
                    cv: { label: 'CV Builder' },
                    bursaries: { label: 'Bursaries' },
                    jobs: { label: 'Jobs' },
                    applications: { label: 'My Applications' }
                },
                activeTab: 'dashboard'
            });

            const dashPane = El.from(careerTabs.el.querySelector('.ui-tabs-panel[data-tab="dashboard"]'));
            if (dashPane) {
                if (typeof CareerViews !== 'undefined') {
                    CareerViews.renderDashboard(dashPane, career, memberId);
                } else {
                    dashPane.add({ css: 'text-muted text-center py-4', script: 'CareerViews not loaded' });
                }
            }

            const profilePane = El.from(careerTabs.el.querySelector('.ui-tabs-panel[data-tab="profile"]'));
            if (profilePane) this._renderProfile(profilePane, career, memberId);

            const cvPane = El.from(careerTabs.el.querySelector('.ui-tabs-panel[data-tab="cv"]'));
            if (cvPane) this._renderCVBuilder(cvPane, career, memberId);

            const bursaryPane = El.from(careerTabs.el.querySelector('.ui-tabs-panel[data-tab="bursaries"]'));
            if (bursaryPane && typeof CareerViews !== 'undefined') {
                CareerViews.renderBursariesList(bursaryPane, career, memberId);
            }

            const jobsPane = El.from(careerTabs.el.querySelector('.ui-tabs-panel[data-tab="jobs"]'));
            if (jobsPane && typeof CareerViews !== 'undefined') {
                CareerViews.renderJobsList(jobsPane, career, memberId);
            }

            const appsPane = El.from(careerTabs.el.querySelector('.ui-tabs-panel[data-tab="applications"]'));
            if (appsPane && typeof CareerViews !== 'undefined') {
                CareerViews.renderApplications(appsPane, career, memberId);
            }
        } else {
            // Fallback without tabs — render dashboard only
            const careerHeader = container.add({ css: 'flex items-center gap-2 mb-4 pb-3 border-b' });
            careerHeader.add({ tag: 'i', css: 'fas fa-briefcase text-xl text-primary' });
            careerHeader.add({ tag: 'h2', css: 'text-lg font-semibold', script: 'Career Hub' });
            if (typeof CareerViews !== 'undefined') {
                CareerViews.renderDashboard(container, career, memberId);
            }
        }
    }

    // ── Profile ─────────────────────────────────────────────────────

    _renderProfile(container, career, memberId) {
        const careerProfile = career.getOrCreateProfile(memberId);
        const memberProfile = this.services.member?.getProfile?.(memberId);
        const memberName = memberProfile
            ? `${memberProfile.firstName || ''} ${memberProfile.lastName || ''}`.trim()
            : (this.currentUser?.displayName || this.currentUser?.username || 'Student');

        // Profile Card
        const profileCard = container.add({ css: 'card p-4 mb-4' });
        const profileHeader = profileCard.add({ css: 'flex items-center justify-between mb-4' });

        const profileInfo = profileHeader.add({ css: 'flex items-center gap-4' });
        profileInfo.add({ tag: 'i', css: 'fas fa-user-circle text-5xl text-primary' });
        const details = profileInfo.add({});
        details.add({ css: 'text-xl font-bold', script: memberName });
        details.add({ css: 'text-muted', script: careerProfile.headline || 'Add a headline to stand out' });
        details.add({ css: 'text-sm text-muted', script: careerProfile.fieldOfStudy || 'Field of study not set' });

        if (typeof uiButton !== 'undefined') {
            new uiButton({
                parent: profileHeader, label: 'Edit Profile', icon: 'fas fa-edit', variant: 'secondary',
                onClick: () => this._showProfileEditor(career, memberId, () => {
                    container.clear(true);
                    this._renderProfile(container, career, memberId);
                })
            });
        }

        // Detail grid
        const detailsGrid = profileCard.add({ css: 'flex flex-wrap gap-4 mt-4 pt-4 border-t' });
        [
            { label: 'GPA', value: careerProfile.gpa ? careerProfile.gpa.toFixed(2) : 'Not set', icon: 'graduation-cap' },
            { label: 'Financial Need', value: careerProfile.financialNeed || 'Not specified', icon: 'dollar-sign' },
            { label: 'Expected Graduation', value: careerProfile.expectedGraduation ? new Date(careerProfile.expectedGraduation).toLocaleDateString() : 'Not set', icon: 'calendar' }
        ].forEach(item => {
            const box = detailsGrid.add({ css: 'text-center as-flex-kpi' });
            box.add({ tag: 'i', css: `fas fa-${item.icon} text-gray-400 text-xl mb-1` });
            box.add({ css: 'text-sm text-muted', script: item.label });
            box.add({ css: 'font-medium capitalize', script: item.value });
        });

        // Skills Section
        const skillsCard = container.add({ css: 'card p-4 mb-4' });
        const skillsHeader = skillsCard.add({ css: 'flex items-center justify-between mb-3' });
        skillsHeader.add({ css: 'font-semibold text-lg', script: 'Skills' });
        if (typeof uiButton !== 'undefined') {
            new uiButton({
                parent: skillsHeader, label: 'Add Skill', icon: 'fas fa-plus', variant: 'ghost', size: 'sm',
                onClick: () => this._showAddSkillModal(career, memberId, () => {
                    container.clear(true);
                    this._renderProfile(container, career, memberId);
                })
            });
        }

        const skills = career.getSkills?.(memberId) || [];
        if (skills.length === 0) {
            skillsCard.add({ css: 'text-muted text-sm', script: 'No skills added yet. Add your skills to get better job matches!' });
        } else {
            const skillsGrid = skillsCard.add({ css: 'flex flex-wrap gap-2' });
            skills.forEach(skill => {
                const badge = skillsGrid.add({ css: 'px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2' });
                badge.add({ script: skill.skillName });
                const levelColors = { beginner: 'bg-gray-400', intermediate: 'bg-blue-400', advanced: 'bg-green-400', expert: 'bg-purple-400' };
                badge.add({ css: `w-2 h-2 rounded-full ${levelColors[skill.proficiency] || 'bg-gray-400'}` });
            });
        }

        // Experience Section
        const expCard = container.add({ css: 'card p-4' });
        const expHeader = expCard.add({ css: 'flex items-center justify-between mb-3' });
        expHeader.add({ css: 'font-semibold text-lg', script: 'Experience' });
        if (typeof uiButton !== 'undefined') {
            new uiButton({
                parent: expHeader, label: 'Add Experience', icon: 'fas fa-plus', variant: 'ghost', size: 'sm',
                onClick: () => this._showAddExperienceModal(career, memberId, () => {
                    container.clear(true);
                    this._renderProfile(container, career, memberId);
                })
            });
        }

        const experiences = career.getExperience?.(memberId) || [];
        if (experiences.length === 0) {
            expCard.add({ css: 'text-muted text-sm', script: 'No experience added yet. Add work experience, internships, or projects!' });
        } else {
            experiences.forEach(exp => {
                const expItem = expCard.add({ css: 'border-l-2 border-blue-400 pl-3 mb-3' });
                expItem.add({ css: 'font-medium', script: exp.title });
                expItem.add({ css: 'text-sm text-muted', script: exp.organization });
                const dates = [
                    exp.startDate ? new Date(exp.startDate).toLocaleDateString() : '',
                    exp.isCurrent ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString() : '')
                ].filter(d => d).join(' - ');
                expItem.add({ css: 'text-xs text-gray-500', script: dates });
                if (exp.description) expItem.add({ css: 'text-sm mt-1', script: exp.description });
            });
        }
    }

    // ── CV Builder ──────────────────────────────────────────────────

    _renderCVBuilder(container, career, memberId) {
        const profile = career.getOrCreateProfile(memberId);

        if (typeof CVBlockEditor !== 'undefined') {
            const cvEditor = new CVBlockEditor({
                parent: container,
                careerService: career,
                profileId: profile.idx,
                memberId: memberId,
                academicService: this.services.academic,
                memberService: this.services.member,
                onSave: () => {
                    if (typeof uiToast !== 'undefined') ElToast.show('CV saved!', 'success');
                }
            });
            cvEditor.render();
        } else {
            container.add({ css: 'text-center py-8 text-muted', script: 'CV Builder component not available' });
        }
    }

    // ── Modals ──────────────────────────────────────────────────────

    _showProfileEditor(career, memberId, onSave) {
        if (typeof ElModal === 'undefined') return;

        const profile = career.getOrCreateProfile(memberId);
        const modal = new ElModal({ title: 'Edit Profile', size: 'lg' });
        const content = modal.getContent();
        const form = content.add({ tag: 'form', css: 'space-y-4' });

        // Headline
        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Headline' });
        const headlineInput = form.add({
            tag: 'input', css: 'w-full p-2 border rounded mb-4',
            attr: { type: 'text', placeholder: 'e.g., Aspiring Software Developer', value: profile.headline || '' }
        });

        // Field of Study
        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Field of Study' });
        const fieldInput = form.add({
            tag: 'input', css: 'w-full p-2 border rounded mb-4',
            attr: { type: 'text', placeholder: 'e.g., Computer Science', value: profile.fieldOfStudy || '' }
        });

        // GPA + Financial Need row
        const row1 = form.add({ css: 'grid grid-cols-2 gap-4 mb-4' });
        const gpaGroup = row1.add({});
        gpaGroup.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'GPA' });
        const gpaInput = gpaGroup.add({
            tag: 'input', css: 'w-full p-2 border rounded',
            attr: { type: 'number', step: '0.01', min: '0', max: '4', value: profile.gpa || '' }
        });

        const needGroup = row1.add({});
        needGroup.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Financial Need' });
        const needSelect = needGroup.add({ tag: 'select', css: 'w-full p-2 border rounded' });
        [{ value: '', label: 'Not specified' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]
            .forEach(opt => {
                needSelect.add({ tag: 'option', script: opt.label, attr: { value: opt.value, selected: profile.financialNeed === opt.value ? 'selected' : null } });
            });

        // Expected Graduation
        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Expected Graduation' });
        const gradInput = form.add({
            tag: 'input', css: 'w-full p-2 border rounded mb-4',
            attr: { type: 'date', value: profile.expectedGraduation || '' }
        });

        // Bio
        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Bio' });
        const bioInput = form.add({
            tag: 'textarea', css: 'w-full p-2 border rounded mb-4',
            attr: { rows: '3', placeholder: 'Tell employers about yourself...' },
            script: profile.bio || ''
        });

        // Buttons
        const buttons = form.add({ css: 'flex gap-2 pt-4 border-t' });
        new uiButton({
            parent: buttons, label: 'Save', variant: 'primary', fullWidth: true,
            onClick: () => {
                career.updateProfile(memberId, {
                    headline: headlineInput.domElement.value,
                    fieldOfStudy: fieldInput.domElement.value,
                    gpa: gpaInput.domElement.value ? parseFloat(gpaInput.domElement.value) : null,
                    financialNeed: needSelect.domElement.value,
                    expectedGraduation: gradInput.domElement.value,
                    bio: bioInput.domElement.value
                });
                modal.close();
                if (typeof uiToast !== 'undefined') ElToast.show('Profile updated!', 'success');
                if (onSave) onSave();
            }
        });
        new uiButton({ parent: buttons, label: 'Cancel', variant: 'secondary', onClick: () => modal.close() });

        modal.open();
    }

    _showAddSkillModal(career, memberId, onSave) {
        if (typeof ElModal === 'undefined') return;

        const modal = new ElModal({ title: 'Add Skill', size: 'md' });
        const content = modal.getContent();
        const form = content.add({ css: 'space-y-4' });

        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Skill Name' });
        const nameInput = form.add({
            tag: 'input', css: 'w-full p-2 border rounded mb-4',
            attr: { type: 'text', placeholder: 'e.g., Python, JavaScript, Excel' }
        });

        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Proficiency Level' });
        const profSelect = form.add({ tag: 'select', css: 'w-full p-2 border rounded mb-4' });
        [{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' },
         { value: 'advanced', label: 'Advanced' }, { value: 'expert', label: 'Expert' }]
            .forEach(opt => profSelect.add({ tag: 'option', script: opt.label, attr: { value: opt.value } }));

        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Category' });
        const catSelect = form.add({ tag: 'select', css: 'w-full p-2 border rounded mb-4' });
        [{ value: 'technical', label: 'Technical' }, { value: 'soft', label: 'Soft Skills' },
         { value: 'language', label: 'Language' }, { value: 'other', label: 'Other' }]
            .forEach(opt => catSelect.add({ tag: 'option', script: opt.label, attr: { value: opt.value } }));

        const buttons = form.add({ css: 'flex gap-2 pt-4 border-t' });
        new uiButton({
            parent: buttons, label: 'Add Skill', variant: 'primary', fullWidth: true,
            onClick: () => {
                const skillName = nameInput.domElement.value.trim();
                if (!skillName) {
                    if (typeof uiToast !== 'undefined') ElToast.show('Please enter a skill name', 'warning');
                    return;
                }
                career.addSkill(memberId, skillName, profSelect.domElement.value, catSelect.domElement.value);
                modal.close();
                if (typeof uiToast !== 'undefined') ElToast.show('Skill added!', 'success');
                if (onSave) onSave();
            }
        });
        new uiButton({ parent: buttons, label: 'Cancel', variant: 'secondary', onClick: () => modal.close() });

        modal.open();
    }

    _showAddExperienceModal(career, memberId, onSave) {
        if (typeof ElModal === 'undefined') return;

        const modal = new ElModal({ title: 'Add Experience', size: 'lg' });
        const content = modal.getContent();
        const form = content.add({ css: 'space-y-4' });

        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Type' });
        const typeSelect = form.add({ tag: 'select', css: 'w-full p-2 border rounded mb-4' });
        [{ value: 'work', label: 'Work Experience' }, { value: 'internship', label: 'Internship' },
         { value: 'volunteer', label: 'Volunteer Work' }, { value: 'project', label: 'Project' },
         { value: 'education', label: 'Education' }]
            .forEach(opt => typeSelect.add({ tag: 'option', script: opt.label, attr: { value: opt.value } }));

        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Title / Role' });
        const titleInput = form.add({
            tag: 'input', css: 'w-full p-2 border rounded mb-4',
            attr: { type: 'text', placeholder: 'e.g., Software Developer Intern' }
        });

        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Organization' });
        const orgInput = form.add({
            tag: 'input', css: 'w-full p-2 border rounded mb-4',
            attr: { type: 'text', placeholder: 'e.g., TechCorp' }
        });

        const datesRow = form.add({ css: 'grid grid-cols-2 gap-4 mb-4' });
        const startGroup = datesRow.add({});
        startGroup.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Start Date' });
        const startInput = startGroup.add({ tag: 'input', css: 'w-full p-2 border rounded', attr: { type: 'date' } });

        const endGroup = datesRow.add({});
        endGroup.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'End Date' });
        const endInput = endGroup.add({ tag: 'input', css: 'w-full p-2 border rounded', attr: { type: 'date' } });

        const currentRow = form.add({ css: 'flex items-center gap-2 mb-4' });
        const currentCheckbox = currentRow.add({ tag: 'input', attr: { type: 'checkbox', id: 'career-isCurrent' } });
        currentRow.add({ tag: 'label', css: 'text-sm', attr: { for: 'career-isCurrent' }, script: 'I currently work here' });

        form.add({ tag: 'label', css: 'block text-sm font-medium mb-1', script: 'Description' });
        const descInput = form.add({
            tag: 'textarea', css: 'w-full p-2 border rounded mb-4',
            attr: { rows: '3', placeholder: 'Describe your responsibilities and achievements...' }
        });

        const buttons = form.add({ css: 'flex gap-2 pt-4 border-t' });
        new uiButton({
            parent: buttons, label: 'Add Experience', variant: 'primary', fullWidth: true,
            onClick: () => {
                const title = titleInput.domElement.value.trim();
                const organization = orgInput.domElement.value.trim();
                if (!title || !organization) {
                    if (typeof uiToast !== 'undefined') ElToast.show('Please fill in title and organization', 'warning');
                    return;
                }
                career.addExperience(memberId, {
                    entryType: typeSelect.domElement.value,
                    title, organization,
                    startDate: startInput.domElement.value,
                    endDate: endInput.domElement.value,
                    isCurrent: currentCheckbox.domElement.checked,
                    description: descInput.domElement.value
                });
                modal.close();
                if (typeof uiToast !== 'undefined') ElToast.show('Experience added!', 'success');
                if (onSave) onSave();
            }
        });
        new uiButton({ parent: buttons, label: 'Cancel', variant: 'secondary', onClick: () => modal.close() });

        modal.open();
    }
}
