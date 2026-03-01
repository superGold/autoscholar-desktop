/**
 * StudentDiaryPanel - Study diary with mood tracking, tagging, and streak
 *
 * Extracted from AutoScholarStudent._renderDiary().
 * Uses DiaryService for entry CRUD and Tagger for tag management.
 */
class StudentDiaryPanel {
    constructor(settings = {}) {
        this.services = settings.services;
        this.currentUser = settings.currentUser;
        this.app = settings.app;
        this._diaryEntriesLoaded = 5;
        this._diarySelectedMood = null;
        this._diarySelectedTags = [];
        this._diaryFilterTags = [];
        this._diaryTagger = null;
    }

    render(container) {
        const diary = this.services.diary;
        const memberId = this.currentUser.idx;

        if (!diary) {
            container.add({ css: 'text-center py-8 text-muted', script: 'Diary service not available' });
            return;
        }

        this._initTagger();

        // Header with streak
        this._renderHeader(container, diary, memberId);

        // Entry form
        this._renderEntryForm(container, diary, memberId);

        // Tag filter chips
        this._filterContainer = container.add({ css: 'mt-4' });
        this._renderTagFilter();

        // Entries list
        this._entriesContainer = container.add({ css: 'mt-4' });
        this._renderEntriesList(diary, memberId);
    }

    _initTagger() {
        if (!this._diaryTagger && typeof Tagger !== 'undefined') {
            this._diaryTagger = new Tagger({ prefix: 'diary' });
            if (this._diaryTagger.getGroups().length === 0) {
                const academic = this._diaryTagger.createGroup({ label: 'Academic', color: 'var(--ui-primary)', icon: 'graduation-cap' });
                this._diaryTagger.createTag({ groupId: academic.idx, label: 'Exam prep', color: 'var(--ui-primary)' });
                this._diaryTagger.createTag({ groupId: academic.idx, label: 'Assignment', color: 'var(--ui-info)' });
                this._diaryTagger.createTag({ groupId: academic.idx, label: 'Study session', color: 'var(--ui-secondary)' });
                this._diaryTagger.createTag({ groupId: academic.idx, label: 'Lecture notes', color: 'var(--ui-secondary-600)' });

                const progress = this._diaryTagger.createGroup({ label: 'Progress', color: 'var(--ui-success)', icon: 'chart-line' });
                this._diaryTagger.createTag({ groupId: progress.idx, label: 'Breakthrough!', color: 'var(--ui-success)' });
                this._diaryTagger.createTag({ groupId: progress.idx, label: 'Making progress', color: 'var(--ui-success-400)' });
                this._diaryTagger.createTag({ groupId: progress.idx, label: 'Struggling', color: 'var(--ui-warning)' });
                this._diaryTagger.createTag({ groupId: progress.idx, label: 'Need help', color: 'var(--ui-danger)' });

                const personal = this._diaryTagger.createGroup({ label: 'Personal', color: 'var(--ui-secondary-400)', icon: 'heart' });
                this._diaryTagger.createTag({ groupId: personal.idx, label: 'Reflection', color: 'var(--ui-secondary-400)' });
                this._diaryTagger.createTag({ groupId: personal.idx, label: 'Goals', color: 'var(--ui-secondary)' });
                this._diaryTagger.createTag({ groupId: personal.idx, label: 'Wellness', color: 'var(--ui-accent)' });
            }
        }
    }

    _renderHeader(container, diary, memberId) {
        const header = container.add({ css: 'flex items-center justify-between mb-4' });
        const left = header.add({ css: 'flex items-center gap-3' });
        left.add({ tag: 'i', css: 'fas fa-book-open text-primary text-xl' });
        left.add({ css: 'text-xl font-semibold', script: 'My Diary' });

        const streak = diary.getWritingStreak?.(memberId);
        if (streak?.current > 0) {
            const streakBadge = header.add({ css: 'flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm' });
            streakBadge.add({ tag: 'i', css: 'fas fa-fire text-orange-500' });
            streakBadge.add({ script: `${streak.current} day streak` });
        }
    }

    _renderEntryForm(container, diary, memberId) {
        const formCard = container.add({ css: 'card p-4' });

        const titleInput = formCard.add({
            tag: 'input',
            css: 'w-full p-2 border-0 border-b text-lg font-medium placeholder-gray-400 focus:outline-none focus:border-primary mb-3',
            attr: { type: 'text', placeholder: 'Title (optional)...' }
        });

        const contentArea = formCard.add({
            tag: 'textarea',
            css: 'w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50',
            attr: { rows: '4', placeholder: "What's on your mind today? How are your studies going?" }
        });

        // Tag picker
        const tagRow = formCard.add({ css: 'mt-3' });
        this._renderTagPicker(tagRow);

        // Bottom row: mood + save
        const bottomRow = formCard.add({ css: 'flex items-center justify-between mt-3' });

        // Mood selector
        const moodRow = bottomRow.add({ css: 'flex items-center gap-1' });
        moodRow.add({ css: 'text-sm text-muted mr-2', script: 'Mood:' });
        const moodEmojis = ['\u{1F622}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F60A}'];
        moodEmojis.forEach((emoji, i) => {
            const moodBtn = moodRow.add({
                tag: 'button',
                css: 'w-9 h-9 rounded-full border-2 border-transparent hover:border-primary hover:bg-primary hover:bg-opacity-10 text-xl transition-all mood-btn',
                attr: { type: 'button', 'data-mood': i + 1 },
                script: emoji
            });
            moodBtn.domElement.onclick = () => {
                moodRow.domElement.querySelectorAll('.mood-btn').forEach(b => {
                    b.classList.remove('border-primary', 'bg-primary', 'bg-opacity-20');
                    b.classList.add('border-transparent');
                });
                moodBtn.domElement.classList.remove('border-transparent');
                moodBtn.domElement.classList.add('border-primary', 'bg-primary', 'bg-opacity-20');
                this._diarySelectedMood = i + 1;
            };
        });

        // Save button
        if (typeof uiButton !== 'undefined') {
            new uiButton({
                parent: bottomRow, label: 'Save Entry', icon: 'check', variant: 'primary',
                onClick: () => {
                    const title = titleInput.domElement.value.trim();
                    const content = contentArea.domElement.value.trim();
                    if (!content) {
                        if (typeof uiToast !== 'undefined') ElToast.show('Please write something first', 'warning');
                        return;
                    }
                    const entry = diary.createEntry({ memberId, title: title || null, content, mood: this._diarySelectedMood });
                    if (entry && this._diaryTagger && this._diarySelectedTags.length > 0) {
                        this._diarySelectedTags.forEach(tagId => this._diaryTagger.tag('diaryEntry', entry.idx, tagId));
                    }
                    titleInput.domElement.value = '';
                    contentArea.domElement.value = '';
                    this._diarySelectedMood = null;
                    this._diarySelectedTags = [];
                    moodRow.domElement.querySelectorAll('.mood-btn').forEach(b => {
                        b.classList.remove('border-primary', 'bg-primary', 'bg-opacity-20');
                        b.classList.add('border-transparent');
                    });
                    this._renderTagPicker(tagRow);
                    this._renderEntriesList(diary, memberId);
                    if (typeof uiToast !== 'undefined') ElToast.show('Entry saved!', 'success');
                }
            });
        }
    }

    _renderTagPicker(container) {
        container.clear(true);
        if (!this._diaryTagger) return;

        const wrapper = container.add({ css: 'flex items-center gap-2 flex-wrap' });
        wrapper.add({ tag: 'i', css: 'fas fa-tags text-muted text-sm' });
        wrapper.add({ css: 'text-sm text-muted', script: 'Tags:' });

        this._diaryTagger.getAllTags().forEach(tag => {
            const isSelected = this._diarySelectedTags.includes(tag.idx);
            const chip = wrapper.add({
                css: `text-xs px-2 py-1 rounded-full cursor-pointer transition-all ${isSelected ? 'text-white as-tag-colored' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
                attr: { style: isSelected ? `--tag-color: ${tag.color}` : '' },
                script: tag.label
            });
            chip.domElement.onclick = () => {
                if (isSelected) {
                    this._diarySelectedTags = this._diarySelectedTags.filter(id => id !== tag.idx);
                } else {
                    this._diarySelectedTags.push(tag.idx);
                }
                this._renderTagPicker(container);
            };
        });
    }

    _renderTagFilter() {
        const container = this._filterContainer;
        container.clear(true);
        if (!this._diaryTagger) return;

        const usedTags = this._diaryTagger.getAllTags().filter(t => t.usageCount > 0);
        if (usedTags.length === 0) return;

        const wrapper = container.add({ css: 'flex items-center gap-2 flex-wrap' });
        wrapper.add({ css: 'text-xs text-muted', script: 'Filter:' });

        const allSelected = this._diaryFilterTags.length === 0;
        const allChip = wrapper.add({
            css: `text-xs px-2 py-1 rounded-full cursor-pointer ${allSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
            script: 'All'
        });
        allChip.domElement.onclick = () => {
            this._diaryFilterTags = [];
            this._renderTagFilter();
            this._renderEntriesList(this.services.diary, this.currentUser.idx);
        };

        usedTags.forEach(tag => {
            const isSelected = this._diaryFilterTags.includes(tag.idx);
            const chip = wrapper.add({
                css: `text-xs px-2 py-1 rounded-full cursor-pointer transition-all ${isSelected ? 'text-white as-tag-colored' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
                attr: { style: isSelected ? `--tag-color: ${tag.color}` : '' },
                script: `${tag.label} (${tag.usageCount})`
            });
            chip.domElement.onclick = () => {
                if (isSelected) {
                    this._diaryFilterTags = this._diaryFilterTags.filter(id => id !== tag.idx);
                } else {
                    this._diaryFilterTags.push(tag.idx);
                }
                this._renderTagFilter();
                this._renderEntriesList(this.services.diary, this.currentUser.idx);
            };
        });
    }

    _renderEntriesList(diary, memberId) {
        const container = this._entriesContainer;
        container.clear(true);

        let entries = diary.getEntries(memberId);

        // Filter by tags
        if (this._diaryTagger && this._diaryFilterTags.length > 0) {
            entries = entries.filter(entry => {
                const entryTagIds = this._diaryTagger.getTagIds('diaryEntry', entry.idx);
                return this._diaryFilterTags.some(filterTagId => entryTagIds.includes(filterTagId));
            });
        }

        const totalFiltered = entries.length;
        entries = entries.slice(0, this._diaryEntriesLoaded);

        if (entries.length === 0) {
            const msg = this._diaryFilterTags.length > 0
                ? 'No entries match the selected tags.'
                : 'No entries yet. Start journaling above!';
            container.add({ css: 'text-center py-8 text-muted', script: msg });
            return;
        }

        container.add({ css: 'text-sm font-semibold text-muted mb-3', script: 'Recent Entries' });

        // Group by date
        const groups = this._groupByDate(entries);
        Object.entries(groups).forEach(([dateLabel, groupEntries]) => {
            container.add({ css: 'text-xs font-medium text-gray-500 uppercase tracking-wide mt-4 mb-2', script: dateLabel });
            groupEntries.forEach(entry => this._renderEntryCard(container, entry));
        });

        // Load more
        if (entries.length < totalFiltered) {
            const loadMoreRow = container.add({ css: 'text-center mt-4' });
            if (typeof uiButton !== 'undefined') {
                new uiButton({
                    parent: loadMoreRow, label: `Load More (${totalFiltered - entries.length} more)`,
                    variant: 'ghost', size: 'sm',
                    onClick: () => { this._diaryEntriesLoaded += 5; this._renderEntriesList(diary, memberId); }
                });
            }
        }

        this._renderTagFilter();
    }

    _renderEntryCard(container, entry) {
        const card = container.add({ css: 'card p-3 mb-2 hover:shadow-md transition-shadow cursor-pointer' });
        const topRow = card.add({ css: 'flex items-start gap-3' });

        const moodEmojis = ['', '\u{1F622}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F60A}'];
        const mood = entry.mood ? moodEmojis[entry.mood] : '\u{1F4DD}';
        topRow.add({ css: 'text-2xl', script: mood });

        const content = topRow.add({ css: 'flex-1 min-w-0' });
        const title = entry.title || (entry.content?.split('\n')[0]?.substring(0, 50) + (entry.content?.length > 50 ? '...' : ''));
        content.add({ css: 'font-medium text-sm truncate', script: title || 'Untitled' });
        if (entry.content) {
            const preview = entry.content.substring(0, 100).replace(/\n/g, ' ');
            content.add({ css: 'text-xs text-gray-500 truncate mt-1', script: preview + (entry.content.length > 100 ? '...' : '') });
        }

        const dateStr = new Date(entry.entryDate || entry.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        topRow.add({ css: 'text-xs text-muted whitespace-nowrap', script: dateStr });

        // Tags — use Tagger.renderTags for consistent chip styling
        if (this._diaryTagger) {
            const tagsRow = card.add({ css: 'mt-2 ml-9' });
            this._diaryTagger.renderTags(tagsRow.domElement, 'diaryEntry', entry.idx, { editable: false });
        }

        card.domElement.onclick = () => this._showEntryDetail(entry);
    }

    _showEntryDetail(entry) {
        if (typeof ElModal === 'undefined') { alert(entry.content); return; }

        const modal = new ElModal({ title: entry.title || 'Diary Entry', size: 'md' });
        const content = modal.getContent();
        const c = new El({ parent: content });

        const header = c.add({ css: 'flex items-center gap-3 mb-4 pb-3 border-b' });
        const moodEmojis = ['', '\u{1F622}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F60A}'];
        if (entry.mood) header.add({ css: 'text-3xl', script: moodEmojis[entry.mood] });
        header.add({ css: 'text-sm text-muted', script: new Date(entry.entryDate || entry.createdAt).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })});

        c.add({ css: 'whitespace-pre-wrap text-gray-700', script: entry.content || '' });

        // Editable tags — use Tagger.renderTags with editing enabled
        if (this._diaryTagger) {
            const tagsRow = c.add({ css: 'mt-4 pt-4 border-t' });
            this._diaryTagger.renderTags(tagsRow.domElement, 'diaryEntry', entry.idx, { editable: true });
        }

        modal.open();
    }

    _groupByDate(entries) {
        const groups = {};
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

        entries.forEach(entry => {
            const d = new Date(entry.entryDate || entry.createdAt); d.setHours(0, 0, 0, 0);
            let label;
            if (d.getTime() === today.getTime()) label = 'Today';
            else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
            else if (d > weekAgo) label = 'This Week';
            else label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!groups[label]) groups[label] = [];
            groups[label].push(entry);
        });
        return groups;
    }
}
