/**
 * TagService - Universal tagging system
 *
 * Provides polymorphic tagging for any entity across any service.
 * Supports hierarchical tag groups for organization.
 *
 * Tables:
 * - tagGroup: Hierarchical grouping of tags
 * - tag: Individual tags with label, color, icon
 * - tagLink: Polymorphic links to any entity
 *
 * @example
 * const tagService = new TagService();
 * ServiceRegistry.register('tag', tagService, { alias: 'Tag Service' });
 *
 * // Create a tag group and tag
 * const group = tagService.createGroup({ label: 'Priority' });
 * const tag = tagService.createTag({ groupId: group.idx, label: 'High', color: '#F44336' });
 *
 * // Tag any entity
 * tagService.tag('project', 42, tag.idx);
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const TagServiceSchema = {
    name: 'tag',
    prefix: 'tag',
    alias: 'Tag Service',
    version: '2.0.0',

    tables: [
        {
            name: 'tagGroup',
            alias: 'Tag Groups',
            primaryKey: 'idx',
            labeller: '{label}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'parentId', label: 'Parent', type: 'integer',
                    ref: { table: 'tagGroup', field: 'idx' } },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'color', label: 'Color', type: 'string',
                    options: ['#2196F3', '#4CAF50', '#9C27B0', '#FF9800', '#F44336', '#00BCD4', '#607D8B', '#795548'] },
                { name: 'icon', label: 'Icon', type: 'string' },
                { name: 'allowMultiple', label: 'Allow Multiple', type: 'boolean', default: true },
                { name: 'sortOrder', label: 'Sort Order', type: 'integer', default: 0 },
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'tag',
            alias: 'Tags',
            primaryKey: 'idx',
            labeller: '{label}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'groupId', label: 'Group', type: 'integer',
                    ref: { table: 'tagGroup', field: 'idx' } },
                { name: 'label', label: 'Label', type: 'string', required: true },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'color', label: 'Color', type: 'string',
                    options: ['#2196F3', '#4CAF50', '#9C27B0', '#FF9800', '#F44336', '#00BCD4', '#FFEB3B', '#E91E63', '#607D8B', '#795548'] },
                { name: 'icon', label: 'Icon', type: 'string' },
                { name: 'sortOrder', label: 'Sort Order', type: 'integer', default: 0 },
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },
        {
            name: 'tagLink',
            alias: 'Tag Links',
            primaryKey: 'idx',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'tagId', label: 'Tag', type: 'integer', required: true,
                    ref: { table: 'tag', field: 'idx' } },
                { name: 'targetService', label: 'Target Service', type: 'string' },
                { name: 'targetTable', label: 'Target Table', type: 'string', required: true },
                { name: 'targetIdx', label: 'Target ID', type: 'integer', required: true },
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class TagService extends Publome {
    constructor(config = {}) {
        super(TagServiceSchema, config);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a tag group
     * @param {Object} data - Group data
     * @param {number} [createdBy] - Creator member idx
     * @returns {Publon}
     */
    createGroup(data, createdBy = null) {
        return this.table('tagGroup').create({
            ...data,
            createdBy,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Get groups (optionally by parent)
     * @param {number} [parentId] - Filter by parent (null for root groups)
     * @returns {Array<Publon>}
     */
    getGroups(parentId = undefined) {
        const groups = this.table('tagGroup').all();
        if (parentId === undefined) return groups;
        return groups.filter(g => g.get('parentId') === parentId);
    }

    /**
     * Get root groups (no parent)
     * @returns {Array<Publon>}
     */
    getRootGroups() {
        return this.table('tagGroup').all().filter(g => !g.get('parentId'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tag Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a tag
     * @param {Object} data - Tag data (must include groupId)
     * @param {number} [createdBy] - Creator member idx
     * @returns {Publon}
     */
    createTag(data, createdBy = null) {
        return this.table('tag').create({
            ...data,
            createdBy,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Get tags in a group
     * @param {number} groupId - Group idx
     * @returns {Array<Publon>}
     */
    getTagsInGroup(groupId) {
        return this.table('tag').all().filter(t => t.get('groupId') === groupId);
    }

    /**
     * Find tag by label
     * @param {string} label - Tag label
     * @param {number} [groupId] - Optional group filter
     * @returns {Publon|null}
     */
    findTag(label, groupId = null) {
        const tags = this.table('tag').all();
        return tags.find(t =>
            t.get('label').toLowerCase() === label.toLowerCase() &&
            (groupId === null || t.get('groupId') === groupId)
        ) || null;
    }

    /**
     * Search tags
     * @param {string} query - Search query
     * @returns {Array<Publon>}
     */
    searchTags(query) {
        const q = query.toLowerCase();
        return this.table('tag').all().filter(t =>
            t.get('label')?.toLowerCase().includes(q) ||
            t.get('description')?.toLowerCase().includes(q)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tagging Operations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Tag an entity
     * @param {string} targetTable - Target table name
     * @param {number} targetIdx - Target record idx
     * @param {number} tagId - Tag idx
     * @param {string} [targetService] - Target service name
     * @param {number} [createdBy] - Who tagged it
     * @returns {Publon}
     */
    tag(targetTable, targetIdx, tagId, targetService = null, createdBy = null) {
        // Check if already tagged
        const existing = this.getTagLink(targetTable, targetIdx, tagId, targetService);
        if (existing) return existing;

        // Check group's allowMultiple setting
        const tag = this.table('tag').read(tagId);
        if (tag) {
            const group = this.table('tagGroup').read(tag.get('groupId'));
            if (group && !group.get('allowMultiple')) {
                // Remove existing tags from this group on THIS entity only
                const groupTagIds = new Set(this.getTagsInGroup(group.idx).map(t => t.idx));
                const entityLinks = this.table('tagLink').all().filter(link =>
                    link.get('targetTable') === targetTable &&
                    link.get('targetIdx') === targetIdx &&
                    (targetService === null || link.get('targetService') === targetService) &&
                    groupTagIds.has(link.get('tagId'))
                );
                entityLinks.forEach(link => this.table('tagLink').delete(link.idx));
            }
        }

        return this.table('tagLink').create({
            tagId,
            targetService,
            targetTable,
            targetIdx,
            createdBy,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Remove a tag from an entity
     * @param {string} targetTable - Target table name
     * @param {number} targetIdx - Target record idx
     * @param {number} tagId - Tag idx
     * @param {string} [targetService] - Target service name
     */
    untag(targetTable, targetIdx, tagId, targetService = null) {
        const link = this.getTagLink(targetTable, targetIdx, tagId, targetService);
        if (link) {
            this.table('tagLink').delete(link.idx);
        }
    }

    /**
     * Get tag link record
     * @param {string} targetTable
     * @param {number} targetIdx
     * @param {number} tagId
     * @param {string} [targetService]
     * @returns {Publon|null}
     */
    getTagLink(targetTable, targetIdx, tagId, targetService = null) {
        return this.table('tagLink').all().find(link =>
            link.get('targetTable') === targetTable &&
            link.get('targetIdx') === targetIdx &&
            link.get('tagId') === tagId &&
            (targetService === null || link.get('targetService') === targetService)
        ) || null;
    }

    /**
     * Get all tags for an entity
     * @param {string} targetTable - Target table name
     * @param {number} targetIdx - Target record idx
     * @param {string} [targetService] - Target service name
     * @returns {Array<Publon>} Tag records
     */
    getTagsFor(targetTable, targetIdx, targetService = null) {
        const links = this.table('tagLink').all().filter(link =>
            link.get('targetTable') === targetTable &&
            link.get('targetIdx') === targetIdx &&
            (targetService === null || link.get('targetService') === targetService)
        );

        return links.map(link => this.table('tag').read(link.get('tagId'))).filter(Boolean);
    }

    /**
     * Get all entities with a specific tag
     * @param {number} tagId - Tag idx
     * @returns {Array<{service: string, table: string, idx: number}>}
     */
    getEntitiesWithTag(tagId) {
        return this.table('tagLink').all()
            .filter(link => link.get('tagId') === tagId)
            .map(link => ({
                service: link.get('targetService'),
                table: link.get('targetTable'),
                idx: link.get('targetIdx')
            }));
    }

    /**
     * Check if entity has a specific tag
     * @param {string} targetTable
     * @param {number} targetIdx
     * @param {number} tagId
     * @param {string} [targetService]
     * @returns {boolean}
     */
    hasTag(targetTable, targetIdx, tagId, targetService = null) {
        return !!this.getTagLink(targetTable, targetIdx, tagId, targetService);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Batch Operations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Set tags for an entity (replaces existing)
     * @param {string} targetTable
     * @param {number} targetIdx
     * @param {number[]} tagIds - Array of tag idx
     * @param {string} [targetService]
     * @param {number} [createdBy]
     */
    setTags(targetTable, targetIdx, tagIds, targetService = null, createdBy = null) {
        // Get current tags
        const currentLinks = this.table('tagLink').all().filter(link =>
            link.get('targetTable') === targetTable &&
            link.get('targetIdx') === targetIdx &&
            (targetService === null || link.get('targetService') === targetService)
        );

        const currentTagIds = currentLinks.map(l => l.get('tagId'));

        // Remove tags not in new list
        currentLinks.forEach(link => {
            if (!tagIds.includes(link.get('tagId'))) {
                this.table('tagLink').delete(link.idx);
            }
        });

        // Add new tags
        tagIds.forEach(tagId => {
            if (!currentTagIds.includes(tagId)) {
                this.tag(targetTable, targetIdx, tagId, targetService, createdBy);
            }
        });
    }

    /**
     * Clear all tags from an entity
     * @param {string} targetTable
     * @param {number} targetIdx
     * @param {string} [targetService]
     */
    clearTags(targetTable, targetIdx, targetService = null) {
        this.setTags(targetTable, targetIdx, [], targetService);
    }

    /**
     * Apply a single tag to multiple entities at once.
     * Respects exclusive group semantics on each entity.
     * @param {string} targetTable - Table name
     * @param {number[]} idxArray - Entity idx values to tag
     * @param {number} tagId - Tag to apply
     * @param {string} [targetService] - Service name
     * @param {number} [createdBy] - Who tagged
     * @returns {number} Count of newly created links
     */
    bulkTag(targetTable, idxArray, tagId, targetService = null, createdBy = null) {
        let count = 0;
        idxArray.forEach(idx => {
            const existing = this.getTagLink(targetTable, idx, tagId, targetService);
            if (!existing) {
                this.tag(targetTable, idx, tagId, targetService, createdBy);
                count++;
            }
        });
        return count;
    }

    /**
     * Remove a single tag from multiple entities at once.
     * @param {string} targetTable - Table name
     * @param {number[]} idxArray - Entity idx values to untag
     * @param {number} tagId - Tag to remove
     * @param {string} [targetService] - Service name
     * @returns {number} Count of removed links
     */
    bulkUntag(targetTable, idxArray, tagId, targetService = null) {
        let count = 0;
        idxArray.forEach(idx => {
            const link = this.getTagLink(targetTable, idx, tagId, targetService);
            if (link) {
                this.table('tagLink').delete(link.idx);
                count++;
            }
        });
        return count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query Operations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Filter entities by tags (AND/OR)
     * @param {string} targetTable - Table to filter
     * @param {number[]} tagIds - Tags to filter by
     * @param {string} [mode='any'] - 'any' = match any tag (OR), 'all' = match all tags (AND)
     * @param {string} [targetService] - Optional service filter
     * @returns {Array<{service: string, table: string, idx: number}>}
     */
    filterByTags(targetTable, tagIds, mode = 'any', targetService = null) {
        if (!tagIds || tagIds.length === 0) return [];

        const links = this.table('tagLink').all().filter(link =>
            link.get('targetTable') === targetTable &&
            (targetService === null || link.get('targetService') === targetService)
        );

        const entityTags = new Map();
        links.forEach(link => {
            const idx = link.get('targetIdx');
            if (!entityTags.has(idx)) entityTags.set(idx, new Set());
            entityTags.get(idx).add(link.get('tagId'));
        });

        const tagIdSet = new Set(tagIds);
        const results = [];

        entityTags.forEach((tags, idx) => {
            const match = mode === 'all'
                ? [...tagIdSet].every(id => tags.has(id))
                : [...tagIdSet].some(id => tags.has(id));
            if (match) {
                results.push({ service: targetService, table: targetTable, idx });
            }
        });

        return results;
    }

    /**
     * Get tags for multiple entities in one pass
     * @param {string} targetTable - Table name
     * @param {number[]} idxArray - Array of entity idx values
     * @param {string} [targetService] - Optional service filter
     * @returns {Map<number, Array<Publon>>} Map of idx → tag records
     */
    getTagsForMultiple(targetTable, idxArray, targetService = null) {
        const idxSet = new Set(idxArray);
        const links = this.table('tagLink').all().filter(link =>
            link.get('targetTable') === targetTable &&
            idxSet.has(link.get('targetIdx')) &&
            (targetService === null || link.get('targetService') === targetService)
        );

        const result = new Map();
        idxArray.forEach(idx => result.set(idx, []));

        links.forEach(link => {
            const tag = this.table('tag').read(link.get('tagId'));
            if (tag) {
                const idx = link.get('targetIdx');
                if (result.has(idx)) result.get(idx).push(tag);
            }
        });

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Analytics
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get tag usage analytics — frequency counts, rankings, unused tags, group stats.
     * @returns {{ tags: Array, groups: Array, unusedTags: Array, totalLinks: number }}
     */
    getTagUsage() {
        const links = this.table('tagLink').all();
        const allTags = this.table('tag').all();
        const allGroups = this.table('tagGroup').all();

        // Count links per tag
        const tagCounts = new Map();
        allTags.forEach(t => tagCounts.set(t.idx, 0));
        links.forEach(link => {
            const tagId = link.get('tagId');
            tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
        });

        // Per-tag usage sorted by count desc
        const tags = allTags.map(t => ({
            idx: t.idx,
            label: t.get('label'),
            color: t.get('color') || '#607D8B',
            groupId: t.get('groupId'),
            count: tagCounts.get(t.idx) || 0
        })).sort((a, b) => b.count - a.count);

        // Unused tags
        const unusedTags = tags.filter(t => t.count === 0);

        // Per-group stats
        const groups = allGroups.map(g => {
            const groupTags = tags.filter(t => t.groupId === g.idx);
            const totalUsage = groupTags.reduce((sum, t) => sum + t.count, 0);
            return {
                idx: g.idx,
                label: g.get('label'),
                color: g.get('color') || '#607D8B',
                tagCount: groupTags.length,
                totalUsage,
                avgUsage: groupTags.length > 0 ? +(totalUsage / groupTags.length).toFixed(1) : 0,
                topTag: groupTags.length > 0 ? groupTags[0] : null
            };
        }).sort((a, b) => b.totalUsage - a.totalUsage);

        // Distinct entity count
        const entityKeys = new Set();
        links.forEach(link => {
            entityKeys.add(link.get('targetService') + '.' + link.get('targetTable') + '.' + link.get('targetIdx'));
        });

        return {
            tags,
            groups,
            unusedTags,
            totalLinks: links.length,
            totalTags: allTags.length,
            totalGroups: allGroups.length,
            distinctEntities: entityKeys.size
        };
    }

    /**
     * Compute Shannon entropy per tag group.
     * Measures how evenly tags are distributed within each group.
     * H=0 means one tag dominates; H=max means perfectly even distribution.
     * @returns {Array<{idx, label, color, entropy, maxEntropy, normalized, interpretation, tagCount, distribution}>}
     */
    getGroupEntropy() {
        const links = this.table('tagLink').all();
        const allGroups = this.table('tagGroup').all();

        // Count links per tag
        const tagCounts = new Map();
        links.forEach(link => {
            const tagId = link.get('tagId');
            tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
        });

        return allGroups.map(g => {
            const groupTags = this.getTagsInGroup(g.idx);
            const counts = groupTags.map(t => tagCounts.get(t.idx) || 0);
            const total = counts.reduce((s, c) => s + c, 0);

            let entropy = 0;
            if (total > 0 && groupTags.length > 1) {
                counts.forEach(c => {
                    if (c > 0) {
                        const p = c / total;
                        entropy -= p * Math.log2(p);
                    }
                });
            }

            const maxEntropy = groupTags.length > 1 ? Math.log2(groupTags.length) : 0;
            const normalized = maxEntropy > 0 ? +(entropy / maxEntropy).toFixed(3) : 0;

            let interpretation = 'empty';
            if (total === 0) interpretation = 'unused';
            else if (normalized >= 0.8) interpretation = 'healthy';
            else if (normalized >= 0.5) interpretation = 'moderate';
            else interpretation = 'skewed';

            return {
                idx: g.idx,
                label: g.get('label'),
                color: g.get('color') || '#607D8B',
                entropy: +entropy.toFixed(3),
                maxEntropy: +maxEntropy.toFixed(3),
                normalized,
                interpretation,
                tagCount: groupTags.length,
                distribution: groupTags.map(t => ({
                    label: t.get('label'), color: t.get('color') || '#607D8B',
                    count: tagCounts.get(t.idx) || 0
                }))
            };
        });
    }

    /**
     * Compute tag co-occurrence — which tags appear together on the same entities.
     * Returns pairs sorted by strength (co-occurrence count).
     * @returns {{ pairs: Array<{tagA, tagB, labelA, labelB, colorA, colorB, count}>, matrix: Map }}
     */
    getCoOccurrence() {
        const links = this.table('tagLink').all();

        // Group tags by entity key
        const entityTags = new Map();
        links.forEach(link => {
            const key = (link.get('targetService') || '') + '.' + link.get('targetTable') + '.' + link.get('targetIdx');
            if (!entityTags.has(key)) entityTags.set(key, new Set());
            entityTags.get(key).add(link.get('tagId'));
        });

        // Count co-occurrences
        const pairCounts = new Map();
        entityTags.forEach(tagSet => {
            const tagIds = [...tagSet].sort((a, b) => a - b);
            for (let i = 0; i < tagIds.length; i++) {
                for (let j = i + 1; j < tagIds.length; j++) {
                    const key = tagIds[i] + ':' + tagIds[j];
                    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
                }
            }
        });

        // Build sorted pairs with labels
        const pairs = [...pairCounts.entries()].map(([key, count]) => {
            const [idA, idB] = key.split(':').map(Number);
            const tagA = this.table('tag').read(idA);
            const tagB = this.table('tag').read(idB);
            return {
                tagA: idA, tagB: idB,
                labelA: tagA ? tagA.get('label') : '?',
                labelB: tagB ? tagB.get('label') : '?',
                colorA: tagA ? (tagA.get('color') || '#607D8B') : '#607D8B',
                colorB: tagB ? (tagB.get('color') || '#607D8B') : '#607D8B',
                count
            };
        }).sort((a, b) => b.count - a.count);

        return { pairs, entityCount: entityTags.size };
    }

    /**
     * Compute tag coverage — what fraction of tagged entities have tags from each group.
     * @returns {Array<{idx, label, color, entitiesCovered, totalEntities, coveragePct}>}
     */
    getGroupCoverage() {
        const links = this.table('tagLink').all();
        const allGroups = this.table('tagGroup').all();

        // All distinct entities
        const allEntityKeys = new Set();
        links.forEach(link => {
            allEntityKeys.add((link.get('targetService') || '') + '.' + link.get('targetTable') + '.' + link.get('targetIdx'));
        });
        const totalEntities = allEntityKeys.size;

        // Build tag→group map
        const tagToGroup = new Map();
        this.table('tag').all().forEach(t => tagToGroup.set(t.idx, t.get('groupId')));

        // Per group: which entities have at least one tag from this group
        return allGroups.map(g => {
            const groupTagIds = new Set(this.getTagsInGroup(g.idx).map(t => t.idx));
            const coveredEntities = new Set();

            links.forEach(link => {
                if (groupTagIds.has(link.get('tagId'))) {
                    const key = (link.get('targetService') || '') + '.' + link.get('targetTable') + '.' + link.get('targetIdx');
                    coveredEntities.add(key);
                }
            });

            return {
                idx: g.idx,
                label: g.get('label'),
                color: g.get('color') || '#607D8B',
                entitiesCovered: coveredEntities.size,
                totalEntities,
                coveragePct: totalEntities > 0 ? +((coveredEntities.size / totalEntities) * 100).toFixed(1) : 0
            };
        }).sort((a, b) => b.coveragePct - a.coveragePct);
    }

    /**
     * Health diagnostics — identifies taxonomy issues.
     * Returns categorized issues: orphans, near-duplicates, dormant tags, skewed groups.
     * @returns {{ issues: Array, warnings: Array, strengths: Array, score: number }}
     */
    getHealthDiagnostics() {
        const usage = this.getTagUsage();
        const entropy = this.getGroupEntropy();
        const coverage = this.getGroupCoverage();
        const coOccurrence = this.getCoOccurrence();

        const issues = [];
        const warnings = [];
        const strengths = [];

        // Orphan tags (zero usage)
        if (usage.unusedTags.length > 0) {
            issues.push({
                type: 'orphan', severity: 'warning',
                label: usage.unusedTags.length + ' unused tag' + (usage.unusedTags.length > 1 ? 's' : ''),
                detail: usage.unusedTags.map(t => t.label).join(', '),
                action: 'Consider retiring or removing unused tags'
            });
        }

        // Skewed groups (low entropy)
        entropy.forEach(g => {
            if (g.interpretation === 'skewed' && g.tagCount > 1) {
                const dominant = g.distribution.sort((a, b) => b.count - a.count)[0];
                warnings.push({
                    type: 'skewed', severity: 'warning',
                    label: g.label + ' group is skewed',
                    detail: dominant ? (dominant.label + ' holds ' + dominant.count + ' of ' + g.distribution.reduce((s, d) => s + d.count, 0) + ' uses') : '',
                    action: 'Review if additional tags are needed or if dominant tag should be split'
                });
            }
        });

        // Low coverage groups
        coverage.forEach(g => {
            if (g.coveragePct < 30 && g.totalEntities > 0) {
                warnings.push({
                    type: 'low-coverage', severity: 'info',
                    label: g.label + ' covers only ' + g.coveragePct + '% of entities',
                    detail: g.entitiesCovered + ' of ' + g.totalEntities + ' entities tagged',
                    action: 'Consider if this group should apply to more entity types'
                });
            }
        });

        // Near-duplicate detection (Levenshtein-like simple check)
        const allTags = this.table('tag').all();
        for (let i = 0; i < allTags.length; i++) {
            for (let j = i + 1; j < allTags.length; j++) {
                const a = allTags[i].get('label').toLowerCase();
                const b = allTags[j].get('label').toLowerCase();
                if (a === b || (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a)))) {
                    warnings.push({
                        type: 'near-duplicate', severity: 'info',
                        label: 'Possible duplicate: "' + allTags[i].get('label') + '" / "' + allTags[j].get('label') + '"',
                        detail: 'Similar labels may confuse users',
                        action: 'Consider merging with mergeTag()'
                    });
                }
            }
        }

        // Strong co-occurrence (merge candidates)
        coOccurrence.pairs.forEach(p => {
            if (p.count >= 3 && p.count === usage.tags.find(t => t.idx === p.tagA)?.count) {
                warnings.push({
                    type: 'tight-coupling', severity: 'info',
                    label: '"' + p.labelA + '" always appears with "' + p.labelB + '"',
                    detail: 'Co-occur ' + p.count + ' times (100% overlap)',
                    action: 'Consider merging or creating a combined tag'
                });
            }
        });

        // Strengths
        entropy.forEach(g => {
            if (g.interpretation === 'healthy') {
                strengths.push({
                    type: 'healthy-distribution',
                    label: g.label + ' group has healthy distribution',
                    detail: 'Entropy ' + g.normalized + ' (normalized)'
                });
            }
        });

        if (usage.totalLinks > 0 && usage.unusedTags.length === 0) {
            strengths.push({
                type: 'full-utilization',
                label: 'All tags are in use',
                detail: usage.totalTags + ' tags, ' + usage.totalLinks + ' links'
            });
        }

        // Simple health score: 0-100
        const maxIssues = Math.max(usage.totalTags, 5);
        const issueWeight = issues.length * 10 + warnings.length * 5;
        const score = Math.max(0, Math.min(100, 100 - (issueWeight / maxIssues * 100)));

        return {
            issues,
            warnings,
            strengths,
            score: Math.round(score)
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Merge / Rename
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Rename a tag.
     * @param {number} tagId - Tag to rename
     * @param {string} newLabel - New label
     * @returns {Publon|null} Updated tag record, or null if not found
     */
    renameTag(tagId, newLabel) {
        const tag = this.table('tag').read(tagId);
        if (!tag) return null;
        tag.set('label', newLabel);
        return tag;
    }

    /**
     * Merge source tag into target tag: moves all links from source to target,
     * removes duplicates, then deletes the source tag.
     * @param {number} sourceTagId - Tag to merge from (will be deleted)
     * @param {number} targetTagId - Tag to merge into (will be kept)
     * @returns {{ linksMoved: number, duplicatesSkipped: number }|null} Stats, or null if invalid
     */
    mergeTag(sourceTagId, targetTagId) {
        if (sourceTagId === targetTagId) return null;
        const source = this.table('tag').read(sourceTagId);
        const target = this.table('tag').read(targetTagId);
        if (!source || !target) return null;

        const sourceLinks = this.table('tagLink').all().filter(l => l.get('tagId') === sourceTagId);
        let linksMoved = 0;
        let duplicatesSkipped = 0;

        sourceLinks.forEach(link => {
            const targetTable = link.get('targetTable');
            const targetIdx = link.get('targetIdx');
            const targetService = link.get('targetService');

            // Check if target tag already has a link to this entity
            const existing = this.getTagLink(targetTable, targetIdx, targetTagId, targetService);
            if (existing) {
                // Duplicate — just delete the source link
                this.table('tagLink').delete(link.idx);
                duplicatesSkipped++;
            } else {
                // Move: update the tagId to point to target
                link.set('tagId', targetTagId);
                linksMoved++;
            }
        });

        // Delete the source tag
        this.table('tag').delete(sourceTagId);

        return { linksMoved, duplicatesSkipped };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Export / Import
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Export tag structure (groups + tags + optionally links) as a plain object.
     * @param {{ includeLinks?: boolean }} options
     * @returns {{ groups: Array, tags: Array, links?: Array }}
     */
    exportTags(options = {}) {
        const groups = this.table('tagGroup').all().map(g => {
            const data = {};
            const schema = g._table?.schema || {};
            Object.keys(schema).forEach(col => { data[col] = g.get(col); });
            return data;
        });

        const tags = this.table('tag').all().map(t => {
            const data = {};
            const schema = t._table?.schema || {};
            Object.keys(schema).forEach(col => { data[col] = t.get(col); });
            return data;
        });

        const result = { groups, tags };

        if (options.includeLinks) {
            result.links = this.table('tagLink').all().map(l => {
                const data = {};
                const schema = l._table?.schema || {};
                Object.keys(schema).forEach(col => { data[col] = l.get(col); });
                return data;
            });
        }

        return result;
    }

    /**
     * Import tag structure from an export object.
     * Re-maps idx references so imported data merges cleanly with existing data.
     * @param {{ groups: Array, tags: Array, links?: Array }} data
     * @returns {{ groupsCreated: number, tagsCreated: number, linksCreated: number }}
     */
    importTags(data) {
        if (!data || !data.groups || !data.tags) return { groupsCreated: 0, tagsCreated: 0, linksCreated: 0 };

        const groupIdMap = new Map(); // old idx → new idx
        const tagIdMap = new Map();

        // Import groups (handle parentId remapping)
        // Sort so root groups (no parentId) come first
        const sortedGroups = [...data.groups].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));

        sortedGroups.forEach(g => {
            const oldIdx = g.idx;
            const newData = { ...g };
            delete newData.idx;
            if (newData.parentId && groupIdMap.has(newData.parentId)) {
                newData.parentId = groupIdMap.get(newData.parentId);
            } else {
                delete newData.parentId;
            }
            const created = this.createGroup(newData);
            groupIdMap.set(oldIdx, created.idx);
        });

        // Import tags (remap groupId)
        data.tags.forEach(t => {
            const oldIdx = t.idx;
            const newData = { ...t };
            delete newData.idx;
            if (newData.groupId && groupIdMap.has(newData.groupId)) {
                newData.groupId = groupIdMap.get(newData.groupId);
            }
            const created = this.createTag(newData);
            tagIdMap.set(oldIdx, created.idx);
        });

        // Import links (remap tagId)
        let linksCreated = 0;
        if (data.links) {
            data.links.forEach(l => {
                const newTagId = tagIdMap.get(l.tagId) || l.tagId;
                this.tag(l.targetTable, l.targetIdx, newTagId, l.targetService || null, l.createdBy || null);
                linksCreated++;
            });
        }

        return {
            groupsCreated: groupIdMap.size,
            tagsCreated: tagIdMap.size,
            linksCreated
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Binding
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Connect to a REST API for data synchronization.
     * Wires ApiBinding on all tables so CRUD operations sync to the server.
     *
     * @param {Object} config - API configuration
     * @param {string} config.apiUrl - Base API URL (e.g. 'https://api.example.com')
     * @param {string} [config.apiToken] - Authentication token
     * @param {string} [config.apiEndpoint='/api/v1/tag'] - Base endpoint path
     * @returns {Object} Map of table name → ApiBinding instance
     */
    connectApi(config = {}) {
        if (!config.apiUrl) throw new Error('apiUrl is required');
        const baseEndpoint = config.apiEndpoint || '/api/v1/tag';
        const bindings = {};

        ['tagGroup', 'tag', 'tagLink'].forEach(tableName => {
            bindings[tableName] = new ApiBinding(this.table(tableName), {
                apiUrl: config.apiUrl,
                endpoint: `${baseEndpoint}/${tableName}`,
                apiToken: config.apiToken
            });
        });

        return bindings;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Data
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load default seed data
     */
    seedDefaults() {
        const groups = this.table('tagGroup');

        if (groups.all().length === 0) {
            // Priority tags
            const priority = groups.create({
                label: 'Priority',
                color: '#F44336',
                allowMultiple: false,
                sortOrder: 1,
                createdAt: new Date().toISOString()
            });

            this.createTag({ groupId: priority.idx, label: 'Critical', color: '#B71C1C', sortOrder: 1 });
            this.createTag({ groupId: priority.idx, label: 'High', color: '#F44336', sortOrder: 2 });
            this.createTag({ groupId: priority.idx, label: 'Medium', color: '#FF9800', sortOrder: 3 });
            this.createTag({ groupId: priority.idx, label: 'Low', color: '#4CAF50', sortOrder: 4 });

            // Status tags
            const status = groups.create({
                label: 'Status',
                color: '#2196F3',
                allowMultiple: false,
                sortOrder: 2,
                createdAt: new Date().toISOString()
            });

            this.createTag({ groupId: status.idx, label: 'Active', color: '#4CAF50', sortOrder: 1 });
            this.createTag({ groupId: status.idx, label: 'On Hold', color: '#FF9800', sortOrder: 2 });
            this.createTag({ groupId: status.idx, label: 'Completed', color: '#2196F3', sortOrder: 3 });
            this.createTag({ groupId: status.idx, label: 'Archived', color: '#607D8B', sortOrder: 4 });

            // Category tags
            const category = groups.create({
                label: 'Category',
                color: '#9C27B0',
                allowMultiple: true,
                sortOrder: 3,
                createdAt: new Date().toISOString()
            });

            this.createTag({ groupId: category.idx, label: 'Documentation', color: '#9C27B0', sortOrder: 1 });
            this.createTag({ groupId: category.idx, label: 'Feature', color: '#00BCD4', sortOrder: 2 });
            this.createTag({ groupId: category.idx, label: 'Bug', color: '#F44336', sortOrder: 3 });
            this.createTag({ groupId: category.idx, label: 'Research', color: '#FFEB3B', sortOrder: 4 });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render tag chips for an entity with optional inline editing.
     * Shows colored tag chips; if editable, adds remove buttons and an "Add" button
     * that opens a group-organized tag picker modal.
     *
     * @param {HTMLElement} container - Target element
     * @param {string} targetTable - Entity table name
     * @param {number} targetIdx - Entity record idx
     * @param {Object} [options]
     * @param {string} [options.targetService] - Entity service name
     * @param {boolean} [options.editable=true] - Allow add/remove
     * @param {Function} [options.onUpdate] - Called after any tag change
     * @returns {{ refresh: Function, destroy: Function }}
     */
    renderEntityTags(container, targetTable, targetIdx, options = {}) {
        const { targetService = null, editable = true, onUpdate = null } = options;
        const svc = this;

        const render = () => {
            container.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: var(--ui-space-1); align-items: center;';

            const tags = svc.getTagsFor(targetTable, targetIdx, targetService);

            tags.forEach(tag => {
                const color = tag.get('color') || '#607D8B';
                const chip = document.createElement('span');
                chip.style.cssText = `display: inline-flex; align-items: center; gap: 2px; padding: 0px 4px; border-radius: var(--ui-radius-full); font-size: 10px; font-weight: var(--ui-font-medium); background: ${color}1a; color: ${color}; border: var(--ui-border-width) solid ${color}33; line-height: 1.5;`;

                const dot = document.createElement('span');
                dot.style.cssText = `width: 3px; height: 3px; border-radius: var(--ui-radius-full); background: ${color}; flex-shrink: 0;`;
                chip.appendChild(dot);

                chip.appendChild(document.createTextNode(tag.get('label')));

                if (editable) {
                    const remove = document.createElement('span');
                    remove.textContent = '\u00d7';
                    remove.style.cssText = 'cursor: pointer; margin-left: 1px; opacity: 0.5; font-size: 9px; line-height: 1;';
                    remove.addEventListener('click', (e) => {
                        e.stopPropagation();
                        svc.untag(targetTable, targetIdx, tag.idx, targetService);
                        if (onUpdate) onUpdate();
                    });
                    chip.appendChild(remove);
                }

                wrapper.appendChild(chip);
            });

            if (editable) {
                const addBtn = document.createElement('span');
                addBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: var(--ui-radius-full); background: var(--ui-gray-100); color: var(--ui-gray-400); cursor: pointer; font-size: 6px; border: var(--ui-border-width) dashed var(--ui-gray-300);';
                addBtn.innerHTML = '<i class="fas fa-plus"></i>';
                addBtn.title = 'Add tag';
                addBtn.addEventListener('click', () => svc._openTagPicker(targetTable, targetIdx, targetService));
                wrapper.appendChild(addBtn);
            }

            if (tags.length === 0 && !editable) {
                const empty = document.createElement('span');
                empty.style.cssText = 'font-size: var(--ui-text-2xs); color: var(--ui-gray-400); font-style: italic;';
                empty.textContent = 'No tags';
                wrapper.appendChild(empty);
            }

            container.appendChild(wrapper);
        };

        render();
        const unsub = svc.table('tagLink').on('change', render);
        return { refresh: render, destroy: () => unsub() };
    }

    /**
     * Open a tag picker modal organized by group.
     * Tags toggle on/off; exclusive groups auto-enforce single selection.
     * @private
     */
    _openTagPicker(targetTable, targetIdx, targetService) {
        const svc = this;
        const contentEl = document.createElement('div');
        contentEl.style.cssText = 'display: flex; flex-direction: column; gap: var(--ui-space-4); max-height: 400px; overflow-y: auto; padding: var(--ui-space-2);';

        const buildContent = () => {
            contentEl.innerHTML = '';
            const currentTagIds = new Set(
                svc.getTagsFor(targetTable, targetIdx, targetService).map(t => t.idx)
            );
            const allGroups = svc.table('tagGroup').all();
            const rootGroups = allGroups.filter(g => !g.get('parentId'));

            const renderGroup = (group, depth) => {
                const tags = svc.getTagsInGroup(group.idx);
                const childGroups = allGroups.filter(g => g.get('parentId') === group.idx);
                if (tags.length === 0 && childGroups.length === 0) return;

                const section = document.createElement('div');
                if (depth > 0) section.style.paddingLeft = 'var(--ui-space-4)';

                const header = document.createElement('div');
                const color = group.get('color') || '#607D8B';
                header.style.cssText = 'font-size: var(--ui-text-2xs); font-weight: var(--ui-font-semibold); color: var(--ui-gray-500); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: var(--ui-space-1); display: flex; align-items: center; gap: var(--ui-space-1);';

                const dot = document.createElement('span');
                dot.style.cssText = `width: 5px; height: 5px; border-radius: var(--ui-radius-full); background: ${color}; flex-shrink: 0;`;
                header.appendChild(dot);
                header.appendChild(document.createTextNode(group.get('label')));

                if (group.get('allowMultiple') === false) {
                    const badge = document.createElement('span');
                    badge.style.cssText = 'font-size: 9px; color: var(--ui-gray-400); font-weight: normal; font-style: italic;';
                    badge.textContent = '(pick one)';
                    header.appendChild(badge);
                }
                section.appendChild(header);

                if (tags.length > 0) {
                    const tagRow = document.createElement('div');
                    tagRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: var(--ui-space-1); margin-bottom: var(--ui-space-2);';

                    tags.forEach(tag => {
                        const active = currentTagIds.has(tag.idx);
                        const tc = tag.get('color') || '#607D8B';
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.style.cssText = active
                            ? `display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: var(--ui-radius-full); font-size: var(--ui-text-2xs); cursor: pointer; border: var(--ui-border-width) solid ${tc}; background: ${tc}; color: white; font-weight: var(--ui-font-medium);`
                            : `display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: var(--ui-radius-full); font-size: var(--ui-text-2xs); cursor: pointer; border: var(--ui-border-width) solid var(--ui-gray-200); background: var(--ui-white); color: var(--ui-gray-600);`;

                        const tdot = document.createElement('span');
                        tdot.style.cssText = `width: 4px; height: 4px; border-radius: var(--ui-radius-full); background: ${active ? 'white' : tc}; flex-shrink: 0;`;
                        btn.appendChild(tdot);
                        btn.appendChild(document.createTextNode(tag.get('label')));

                        if (active) {
                            const check = document.createElement('i');
                            check.className = 'fas fa-check';
                            check.style.cssText = 'font-size: 7px; margin-left: 1px;';
                            btn.appendChild(check);
                        }

                        btn.addEventListener('click', () => {
                            if (active) svc.untag(targetTable, targetIdx, tag.idx, targetService);
                            else svc.tag(targetTable, targetIdx, tag.idx, targetService);
                            buildContent();
                        });
                        tagRow.appendChild(btn);
                    });
                    section.appendChild(tagRow);
                }

                childGroups.forEach(cg => renderGroup(cg, depth + 1));
                contentEl.appendChild(section);
            };

            rootGroups.forEach(g => renderGroup(g, 0));
        };

        buildContent();
        const pickerModal = new uiModal({
            parent: document.body,
            title: 'Select Tags',
            size: 'sm'
        });
        const pickerBody = pickerModal._modal.querySelector('.ui-modal-body');
        pickerBody.innerHTML = '';
        pickerBody.appendChild(contentEl);
        pickerModal.open();
    }

    /**
     * Render a tag filter panel with group-organized toggle buttons and AND/OR mode.
     * Calls onChange with { tagIds, mode, results } when selection changes.
     *
     * @param {HTMLElement} container - Target element
     * @param {Object} [options]
     * @param {string} [options.targetTable] - Table to filter (enables automatic filterByTags)
     * @param {string} [options.targetService] - Service filter
     * @param {string} [options.mode='any'] - Initial mode: 'any' or 'all'
     * @param {Function} [options.onChange] - Called with { tagIds, mode, results }
     * @returns {{ refresh: Function, getSelectedTags: Function, getMode: Function }}
     */
    renderFilterPanel(container, options = {}) {
        const { targetTable = null, targetService = null, mode = 'any', onChange = null } = options;
        const svc = this;
        const selectedTags = new Set();
        let currentMode = mode;

        const fireChange = () => {
            if (!onChange) return;
            const tagIds = [...selectedTags];
            if (tagIds.length === 0) {
                onChange({ tagIds: [], mode: currentMode, results: [] });
                return;
            }
            if (targetTable) {
                const results = svc.filterByTags(targetTable, tagIds, currentMode, targetService);
                onChange({ tagIds, mode: currentMode, results });
            } else {
                onChange({ tagIds, mode: currentMode });
            }
        };

        const render = () => {
            container.innerHTML = '';

            // Mode toggle bar
            const modeBar = document.createElement('div');
            modeBar.style.cssText = 'display: flex; gap: var(--ui-space-1); margin-bottom: var(--ui-space-3); align-items: center;';

            const modeLabel = document.createElement('span');
            modeLabel.style.cssText = 'font-size: 10px; color: var(--ui-gray-400); margin-right: 4px;';
            modeLabel.textContent = 'Filter:';
            modeBar.appendChild(modeLabel);

            ['any', 'all'].forEach(m => {
                const active = currentMode === m;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = m === 'any' ? 'Any' : 'All';
                btn.style.cssText = `padding: 0px 6px; border-radius: var(--ui-radius-full); font-size: 10px; cursor: pointer; border: var(--ui-border-width) solid ${active ? 'var(--ui-primary)' : 'var(--ui-gray-200)'}; background: ${active ? 'var(--ui-primary-50)' : 'var(--ui-white)'}; color: ${active ? 'var(--ui-primary)' : 'var(--ui-gray-500)'}; font-weight: ${active ? 'var(--ui-font-semibold)' : 'normal'};`;
                btn.addEventListener('click', () => { currentMode = m; render(); fireChange(); });
                modeBar.appendChild(btn);
            });

            if (selectedTags.size > 0) {
                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.textContent = 'Clear';
                clearBtn.style.cssText = 'margin-left: auto; font-size: 10px; color: var(--ui-gray-400); background: none; border: none; cursor: pointer; text-decoration: underline;';
                clearBtn.addEventListener('click', () => { selectedTags.clear(); render(); fireChange(); });
                modeBar.appendChild(clearBtn);
            }
            container.appendChild(modeBar);

            // Group sections with tag toggle buttons
            const groups = svc.getRootGroups();
            groups.forEach(group => {
                const tags = svc.getTagsInGroup(group.idx);
                if (tags.length === 0) return;

                const section = document.createElement('div');
                section.style.cssText = 'margin-bottom: var(--ui-space-3);';

                const header = document.createElement('div');
                const color = group.get('color') || '#607D8B';
                header.style.cssText = 'font-size: 9px; font-weight: var(--ui-font-semibold); color: var(--ui-gray-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;';
                const dot = document.createElement('span');
                dot.style.cssText = `width: 4px; height: 4px; border-radius: var(--ui-radius-full); background: ${color}; flex-shrink: 0;`;
                header.appendChild(dot);
                header.appendChild(document.createTextNode(group.get('label')));
                section.appendChild(header);

                const tagRow = document.createElement('div');
                tagRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 3px;';

                tags.forEach(tag => {
                    const active = selectedTags.has(tag.idx);
                    const tc = tag.get('color') || '#607D8B';
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.style.cssText = active
                        ? `display: inline-flex; align-items: center; gap: 2px; padding: 1px 6px; border-radius: var(--ui-radius-full); font-size: 10px; cursor: pointer; border: var(--ui-border-width) solid ${tc}; background: ${tc}; color: white; font-weight: var(--ui-font-medium);`
                        : `display: inline-flex; align-items: center; gap: 2px; padding: 1px 6px; border-radius: var(--ui-radius-full); font-size: 10px; cursor: pointer; border: var(--ui-border-width) solid var(--ui-gray-200); background: var(--ui-white); color: var(--ui-gray-600);`;

                    const tdot = document.createElement('span');
                    tdot.style.cssText = `width: 3px; height: 3px; border-radius: var(--ui-radius-full); background: ${active ? 'white' : tc}; flex-shrink: 0;`;
                    btn.appendChild(tdot);
                    btn.appendChild(document.createTextNode(tag.get('label')));

                    btn.addEventListener('click', () => {
                        if (active) selectedTags.delete(tag.idx);
                        else selectedTags.add(tag.idx);
                        render();
                        fireChange();
                    });
                    tagRow.appendChild(btn);
                });

                section.appendChild(tagRow);
                container.appendChild(section);
            });
        };

        render();
        return { refresh: render, getSelectedTags: () => [...selectedTags], getMode: () => currentMode };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Binding Registry & Capability Discovery
    // ─────────────────────────────────────────────────────────────────────────

    getBindingRegistry() {
        const svc = this;
        return [
            {
                key: 'tagCloud',
                label: 'Tag Cloud',
                description: 'Group selector + tag cards filtered by group.',
                type: 'composite',
                tables: ['tagGroup', 'tag'],
                methods: ['bindSelector', 'bindCollection', 'bindChildTable'],
                tags: ['navigation', 'browse', 'filter', 'visual'],
                intent: 'Browse and filter tags organized by group',
                builder: (svc, container) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'dm-split-panel';
                    const left = document.createElement('div'); left.className = 'dm-split-sidebar';
                    const right = document.createElement('div'); right.className = 'dm-split-main';
                    wrapper.appendChild(left); wrapper.appendChild(right);
                    container.appendChild(wrapper);
                    const groupBinding = new UIBinding(svc.table('tagGroup'), { publome: svc });
                    const tagBinding = new UIBinding(svc.table('tag'), { publome: svc });
                    groupBinding.bindSelector(left);
                    tagBinding.bindCollection(right, { component: 'card', map: (r) => ({ title: r.get('label'), subtitle: r.get('color') || '' }) });
                    groupBinding.bindChildTable(tagBinding, 'groupId');
                }
            },
            {
                key: 'allTags',
                label: 'All Tags',
                description: 'Card collection of all tags across groups.',
                type: 'collection',
                tables: ['tag'],
                methods: ['bindCollection'],
                tags: ['browse', 'overview'],
                intent: 'View all tags as cards',
                builder: null
            },
            {
                key: 'groups',
                label: 'Groups',
                description: 'Card collection of tag groups.',
                type: 'collection',
                tables: ['tagGroup'],
                methods: ['bindCollection'],
                tags: ['browse', 'organization'],
                intent: 'View all tag groups',
                builder: null
            },
            {
                key: 'entityTagger',
                label: 'Entity Tagger',
                description: 'Inline tag chips with add/remove for any entity. Opens a group-organized picker modal.',
                type: 'composite',
                tables: ['tag', 'tagGroup', 'tagLink'],
                methods: ['renderEntityTags'],
                tags: ['tagging', 'inline', 'crud', 'chips'],
                intent: 'Tag any entity with colored chips and a group-organized picker',
                builder: (svc, container) => {
                    const info = document.createElement('p');
                    info.style.cssText = 'font-size: var(--ui-text-sm); color: var(--ui-gray-500); margin: 0 0 var(--ui-space-3);';
                    info.textContent = 'Click + to add tags, \u00d7 to remove. Exclusive groups enforce single selection.';
                    container.appendChild(info);

                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; flex-direction: column; gap: var(--ui-space-3);';
                    container.appendChild(row);

                    // Show entityTagger for seed-linked entities
                    const demoEntities = [
                        { table: 'task', idx: 1, service: 'project', label: 'project.task #1' },
                        { table: 'task', idx: 2, service: 'project', label: 'project.task #2' },
                        { table: 'specimen', idx: 3, service: 'specimen', label: 'specimen.specimen #3' },
                        { table: 'equipment', idx: 1, service: 'equipment', label: 'equipment.equipment #1' }
                    ];

                    demoEntities.forEach(ent => {
                        const line = document.createElement('div');
                        line.style.cssText = 'display: flex; align-items: center; gap: var(--ui-space-3); padding: var(--ui-space-2); border: var(--ui-border-width) solid var(--ui-gray-100); border-radius: var(--ui-radius-md);';

                        const lbl = document.createElement('code');
                        lbl.style.cssText = 'font-size: var(--ui-text-xs); color: var(--ui-gray-500); min-width: 160px; flex-shrink: 0;';
                        lbl.textContent = ent.label;
                        line.appendChild(lbl);

                        const tagContainer = document.createElement('div');
                        tagContainer.style.cssText = 'flex: 1; min-width: 0;';
                        line.appendChild(tagContainer);

                        svc.renderEntityTags(tagContainer, ent.table, ent.idx, { targetService: ent.service });
                        row.appendChild(line);
                    });
                }
            },
            {
                key: 'tagFilter',
                label: 'Tag Filter',
                description: 'Group-organized tag filter panel with AND/OR mode toggle.',
                type: 'composite',
                tables: ['tag', 'tagGroup', 'tagLink'],
                methods: ['renderFilterPanel', 'filterByTags'],
                tags: ['filter', 'search', 'faceted', 'navigation'],
                intent: 'Filter entities by tags with AND/OR logic',
                builder: (svc, container) => {
                    const split = document.createElement('div');
                    split.style.cssText = 'display: flex; gap: var(--ui-space-4); min-height: 200px;';

                    const filterPane = document.createElement('div');
                    filterPane.style.cssText = 'flex: 0 0 280px; border-right: var(--ui-border-width) solid var(--ui-gray-200); padding-right: var(--ui-space-4);';
                    split.appendChild(filterPane);

                    const resultsPane = document.createElement('div');
                    resultsPane.style.cssText = 'flex: 1; min-width: 0;';
                    split.appendChild(resultsPane);
                    container.appendChild(split);

                    const renderResults = ({ tagIds, mode, results }) => {
                        if (!tagIds || tagIds.length === 0) {
                            resultsPane.innerHTML = '<p style="font-size: var(--ui-text-sm); color: var(--ui-gray-400); font-style: italic;">Select tags to filter entities</p>';
                            return;
                        }
                        const selectedLabels = tagIds.map(id => {
                            const t = svc.table('tag').read(id);
                            return t ? t.get('label') : '?';
                        }).join(mode === 'all' ? ' AND ' : ' OR ');

                        let html = `<div style="font-size: var(--ui-text-xs); color: var(--ui-gray-400); margin-bottom: var(--ui-space-2);">${selectedLabels}</div>`;
                        if (results && results.length > 0) {
                            html += results.map(r =>
                                `<div style="display: flex; align-items: center; gap: var(--ui-space-2); padding: var(--ui-space-1) 0; font-size: var(--ui-text-sm);"><i class="fas fa-circle" style="font-size: 6px; color: var(--ui-primary);"></i><code>${(r.service || '') + '.' + r.table}#${r.idx}</code></div>`
                            ).join('');
                        } else {
                            html += '<p style="font-size: var(--ui-text-sm); color: var(--ui-gray-400);">No matching entities</p>';
                        }
                        resultsPane.innerHTML = html;
                    };

                    svc.renderFilterPanel(filterPane, {
                        targetTable: 'task',
                        targetService: 'project',
                        onChange: renderResults
                    });

                    renderResults({ tagIds: [], mode: 'any', results: [] });
                }
            }
        ];
    }

    getCapabilities() {
        return {
            name: 'tag',
            alias: 'Tag Service',
            icon: 'fa-tags',
            intent: 'Universal polymorphic tagging for categorizing any entity across any service.',
            keywords: ['tagging', 'classification', 'categorization', 'labels', 'taxonomy', 'groups', 'filtering'],
            capabilities: ['polymorphic-linking', 'hierarchical-groups', 'cross-service-tagging', 'multi-select', 'exclusive-groups'],
            useCases: [
                'Classify records by priority, status, or custom categories',
                'Tag entities across different services with shared vocabulary',
                'Build tag clouds and faceted navigation',
                'Enforce single-tag-per-group constraints'
            ],
            consumers: ['BenchStamp', 'InfraTrack', 'AutoScholar', 'EthiKit'],
            domainMethods: [
                { name: 'createGroup', signature: '(data, createdBy)', description: 'Create a tag group' },
                { name: 'getGroups', signature: '(parentId?)', description: 'Get groups, optionally filtered by parent' },
                { name: 'getRootGroups', signature: '()', description: 'Get root groups (no parent)' },
                { name: 'createTag', signature: '(data, createdBy)', description: 'Create a tag in a group' },
                { name: 'getTagsInGroup', signature: '(groupId)', description: 'Get all tags in a group' },
                { name: 'findTag', signature: '(label, groupId?)', description: 'Find tag by label' },
                { name: 'searchTags', signature: '(query)', description: 'Search tags by label/description' },
                { name: 'tag', signature: '(targetTable, targetIdx, tagId, targetService?, createdBy?)', description: 'Tag any entity' },
                { name: 'untag', signature: '(targetTable, targetIdx, tagId, targetService?)', description: 'Remove a tag from an entity' },
                { name: 'getTagsFor', signature: '(targetTable, targetIdx, targetService?)', description: 'Get all tags for an entity' },
                { name: 'getEntitiesWithTag', signature: '(tagId)', description: 'Get all entities with a specific tag' },
                { name: 'hasTag', signature: '(targetTable, targetIdx, tagId, targetService?)', description: 'Check if entity has a tag' },
                { name: 'setTags', signature: '(targetTable, targetIdx, tagIds, targetService?, createdBy?)', description: 'Replace all tags for an entity' },
                { name: 'clearTags', signature: '(targetTable, targetIdx, targetService?)', description: 'Remove all tags from an entity' },
                { name: 'bulkTag', signature: '(targetTable, idxArray, tagId, targetService?, createdBy?)', description: 'Apply a tag to multiple entities at once' },
                { name: 'bulkUntag', signature: '(targetTable, idxArray, tagId, targetService?)', description: 'Remove a tag from multiple entities at once' },
                { name: 'filterByTags', signature: '(targetTable, tagIds, mode?, targetService?)', description: 'Filter entities by tags with AND/OR logic' },
                { name: 'getTagsForMultiple', signature: '(targetTable, idxArray, targetService?)', description: 'Batch fetch tags for multiple entities' },
                { name: 'getTagUsage', signature: '()', description: 'Tag usage analytics — frequency, rankings, unused tags, group stats' },
                { name: 'renameTag', signature: '(tagId, newLabel)', description: 'Rename a tag while preserving all links' },
                { name: 'mergeTag', signature: '(sourceTagId, targetTagId)', description: 'Merge source tag into target — moves links, removes dupes, deletes source' },
                { name: 'exportTags', signature: '(options?)', description: 'Export tag structure (groups, tags, optionally links) as plain object' },
                { name: 'importTags', signature: '(data)', description: 'Import tag structure with idx remapping for clean merge' },
                { name: 'renderEntityTags', signature: '(container, targetTable, targetIdx, options?)', description: 'Render inline tag chips with add/remove editing' },
                { name: 'renderFilterPanel', signature: '(container, options?)', description: 'Render group-organized tag filter with AND/OR toggle' },
                { name: 'getGroupEntropy', signature: '()', description: 'Shannon entropy per group — measures tag distribution health' },
                { name: 'getCoOccurrence', signature: '()', description: 'Tag co-occurrence pairs sorted by strength' },
                { name: 'getGroupCoverage', signature: '()', description: 'Per-group coverage — fraction of entities tagged' },
                { name: 'getHealthDiagnostics', signature: '()', description: 'Taxonomy health: orphans, duplicates, dormant, skewed groups' }
            ],
            bindings: this.getBindingRegistry()
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TagService, TagServiceSchema };
}
