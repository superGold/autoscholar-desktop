/**
 * Tagger - Thin wrapper around TagService for namespaced tagging
 *
 * Used by Student Central diary and goals panels to provide
 * isolated tag groups with a prefix namespace.
 *
 * @example
 *   const tagger = new Tagger({ prefix: 'diary' });
 *   const group = tagger.createGroup({ label: 'Academic', color: '#3B82F6' });
 *   const tag = tagger.createTag({ groupId: group.idx, label: 'Exam prep', color: '#3B82F6' });
 *   tagger.tag('diaryEntry', entryIdx, tag.idx);
 */
class Tagger {
    constructor(settings = {}) {
        this.prefix = settings.prefix || 'default';
        this._service = new TagService();
    }

    // ── Group Management ───────────────────────────────────────────────────

    createGroup(data) {
        return this._service.createGroup({
            ...data,
            description: data.description || `${this.prefix} tag group`
        });
    }

    getGroups(parentId) {
        return this._service.getGroups(parentId);
    }

    getRootGroups() {
        return this._service.getRootGroups();
    }

    // ── Tag Management ─────────────────────────────────────────────────────

    createTag(data) {
        return this._service.createTag(data);
    }

    getAllTags() {
        const tags = this._service.table('tag').all();
        // Enrich with usage count
        return tags.map(t => {
            const links = this._service.table('tagLink').all()
                .filter(l => l.get('tagId') === t.idx);
            return {
                idx: t.idx,
                label: t.get('label'),
                color: t.get('color'),
                icon: t.get('icon'),
                groupId: t.get('groupId'),
                usageCount: links.length
            };
        });
    }

    getTagsInGroup(groupId) {
        return this._service.getTagsInGroup(groupId);
    }

    findTag(label, groupId) {
        return this._service.findTag(label, groupId);
    }

    searchTags(query) {
        return this._service.searchTags(query);
    }

    // ── Tagging Operations ─────────────────────────────────────────────────

    getTags(targetTable, targetIdx) {
        const tags = this._service.getTagsFor(targetTable, targetIdx);
        return tags.map(t => ({
            idx: t.idx,
            label: t.get('label'),
            color: t.get('color'),
            icon: t.get('icon'),
            groupId: t.get('groupId')
        }));
    }

    getTagIds(targetTable, targetIdx) {
        const tags = this._service.getTagsFor(targetTable, targetIdx);
        return tags.map(t => t.idx);
    }

    tag(targetTable, targetIdx, tagId) {
        return this._service.tag(targetTable, targetIdx, tagId);
    }

    untag(targetTable, targetIdx, tagId) {
        return this._service.untag(targetTable, targetIdx, tagId);
    }

    setTags(targetTable, targetIdx, tagIds) {
        return this._service.setTags(targetTable, targetIdx, tagIds);
    }

    hasTag(targetTable, targetIdx, tagId) {
        return this._service.hasTag(targetTable, targetIdx, tagId);
    }

    // ── Bulk Operations (delegates to TagService) ─────────────────────────────

    bulkTag(targetTable, idxArray, tagId, targetService) {
        return this._service.bulkTag(targetTable, idxArray, tagId, targetService);
    }

    bulkUntag(targetTable, idxArray, tagId, targetService) {
        return this._service.bulkUntag(targetTable, idxArray, tagId, targetService);
    }

    // ── Query Operations (delegates to TagService) ───────────────────────────

    /**
     * Filter entities by tags (AND/OR).
     * Accepts a table name string or a PublonTable instance.
     */
    filterPublon(targetTable, tagIds, mode) {
        const tableName = typeof targetTable === 'string'
            ? targetTable
            : (targetTable.schema?.name || targetTable.name || 'unknown');
        return this._service.filterByTags(tableName, tagIds, mode || 'any');
    }

    /**
     * Get all entities with a specific tag.
     * Returns {publon, service, idx} objects for BenchStamp compatibility.
     */
    getTaggedItems(tagId) {
        return this._service.getEntitiesWithTag(tagId).map(e => ({
            publon: e.table,
            service: e.service,
            idx: e.idx
        }));
    }

    /**
     * Get tags in a group (alias for getTagsInGroup).
     */
    getTagsByGroup(groupId) {
        return this._service.getTagsInGroup(groupId);
    }

    // ── UI Helpers (delegates to TagService) ─────────────────────────────────

    /**
     * Render tag chips for an entity.
     */
    renderTags(container, targetTable, targetIdx, options) {
        return this._service.renderEntityTags(container, targetTable, targetIdx, options || {});
    }

    /**
     * Open a tag picker modal for an entity.
     */
    openTagPicker(targetTable, targetIdx, options) {
        return this._service._openTagPicker(targetTable, targetIdx, options?.targetService || null);
    }

    /**
     * Create a filter panel.
     */
    createFilterPanel(container, options) {
        return this._service.renderFilterPanel(container, options || {});
    }

    // ── Analytics (delegates to TagService) ──────────────────────────────────

    /**
     * Get tag usage analytics.
     */
    getTagUsage() {
        return this._service.getTagUsage();
    }
}
