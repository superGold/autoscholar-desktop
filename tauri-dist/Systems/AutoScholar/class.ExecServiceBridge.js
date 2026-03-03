/**
 * ExecServiceBridge — Wires audit, tag, and project services to ExecSchema tables
 *
 * Follows the EthiKit system.ethikit.js pattern:
 *   1. _initServices() — registers core services via ServiceRegistry
 *   2. _bindAuditService() — table events → audit.logCreate/Update/Delete()
 *   3. _bindTagService() — seeds 4 tag groups with domain-specific tags
 *
 * Usage:
 *   var bridge = new ExecServiceBridge({ publome: execPublome, bus: execBus });
 *   bridge.init();
 */
class ExecServiceBridge {

    constructor(config = {}) {
        this.publome = config.publome;
        this.bus = config.bus;
        this._loading = false;
        this._tagMap = {};     // label → tagIdx for quick lookup
        this._groupMap = {};   // group label → groupIdx
    }

    init() {
        this._initServices();
        this._bindAuditService();
        this._bindTagService();
    }

    // ── Service Registration ─────────────────────────────────────────

    _initServices() {
        var services = [
            ['audit',   typeof AuditService   !== 'undefined' ? AuditService   : null],
            ['tag',     typeof TagService      !== 'undefined' ? TagService      : null],
            ['project', typeof ProjectService  !== 'undefined' ? ProjectService  : null]
        ];

        for (var i = 0; i < services.length; i++) {
            var name = services[i][0];
            var Ctor = services[i][1];
            if (!ServiceRegistry.has(name) && Ctor) {
                var service = new Ctor();
                ServiceRegistry.register(name, service, { alias: name + ' Service' });
            }
        }
    }

    // ── Audit Binding ────────────────────────────────────────────────

    _bindAuditService() {
        var audit = ServiceRegistry.has('audit') ? ServiceRegistry.get('audit') : null;
        if (!audit) return;

        var self = this;
        var tables = ['intervention', 'pdsaCycle', 'note', 'sectorBenchmark', 'metricObservation'];

        for (var i = 0; i < tables.length; i++) {
            (function(tableName) {
                var table = self.publome.table(tableName);
                if (!table) return;

                table.on('created', function(e) {
                    if (self._loading) return;
                    var data = e.record ? e.record.getData() : {};
                    var idx = e.record ? e.record.get('idx') : null;
                    audit.logCreate(tableName, idx, data, null);
                });

                table.on('updated', function(e) {
                    if (self._loading) return;
                    var data = e.record ? e.record.getData() : {};
                    var idx = e.record ? e.record.get('idx') : null;
                    audit.logUpdate(tableName, idx, {}, data, null);
                });

                table.on('deleted', function(e) {
                    if (self._loading) return;
                    audit.logDelete(tableName, e.idx, {}, null);
                });
            })(tables[i]);
        }
    }

    // ── Tag Binding ──────────────────────────────────────────────────

    _bindTagService() {
        var tagService = ServiceRegistry.has('tag') ? ServiceRegistry.get('tag') : null;
        if (!tagService) return;

        var groups = [
            { label: 'Priority',          color: '#F44336', allowMultiple: false,
              tags: ['Critical', 'High', 'Medium', 'Low'] },
            { label: 'Status',            color: '#4CAF50', allowMultiple: false,
              tags: ['On Track', 'Watch', 'At Risk', 'Intervention Required'] },
            { label: 'Review Cycle',      color: '#2196F3', allowMultiple: true,
              tags: ['Q1', 'Q2', 'Mid-Year', 'Annual'] },
            { label: 'Intervention Type', color: '#FF9800', allowMultiple: true,
              tags: ['Academic', 'Support', 'Curriculum', 'Assessment', 'Technology'] }
        ];

        for (var g = 0; g < groups.length; g++) {
            var groupDef = groups[g];
            var group = tagService.createGroup({
                label: groupDef.label,
                color: groupDef.color,
                allowMultiple: groupDef.allowMultiple
            });
            var groupId = group ? (group.idx || (group.get ? group.get('idx') : null)) : null;
            if (!groupId) continue;

            this._groupMap[groupDef.label] = groupId;

            for (var t = 0; t < groupDef.tags.length; t++) {
                var tag = tagService.createTag({
                    groupId: groupId,
                    label: groupDef.tags[t],
                    color: groupDef.color
                });
                var tagIdx = tag ? (tag.idx || (tag.get ? tag.get('idx') : null)) : null;
                if (tagIdx) this._tagMap[groupDef.tags[t]] = tagIdx;
            }
        }
    }

    // ── Tag Picker Helper ────────────────────────────────────────────

    /**
     * Render an inline tag picker + existing tags for a target entity
     * @param {HTMLElement} container
     * @param {string} targetTable - e.g. 'entity', 'intervention'
     * @param {number} targetIdx - record idx
     * @param {string[]} [groupLabels] - restrict to these tag groups
     */
    renderTagPicker(container, targetTable, targetIdx, groupLabels) {
        var tagService = ServiceRegistry.has('tag') ? ServiceRegistry.get('tag') : null;
        if (!tagService || !container) return;

        container.innerHTML = '';
        var self = this;

        // Current tags
        var currentTags = tagService.getTagsFor(targetTable, targetIdx, 'execInsight');
        var chipsEl = document.createElement('span');
        chipsEl.className = 'ex-tag-chips';

        for (var i = 0; i < currentTags.length; i++) {
            (function(tag) {
                var chip = document.createElement('span');
                chip.className = 'ex-tag-chip';
                chip.style.background = (tag.get('color') || '#6b7280') + '20';
                chip.style.color = tag.get('color') || '#6b7280';
                chip.textContent = tag.get('label');
                var x = document.createElement('span');
                x.textContent = '\u00d7';
                x.className = 'ex-tag-chip-x';
                chip.appendChild(x);
                chip.title = 'Click to remove';
                chip.addEventListener('click', function() {
                    tagService.untag(targetTable, targetIdx, tag.get('idx'), 'execInsight');
                    self.renderTagPicker(container, targetTable, targetIdx, groupLabels);
                });
                chipsEl.appendChild(chip);
            })(currentTags[i]);
        }
        container.appendChild(chipsEl);

        // Add button + dropdown
        var addBtn = document.createElement('span');
        addBtn.className = 'ex-tag-add-btn';
        addBtn.textContent = '+';
        addBtn.title = 'Add tag';

        var dropdown = document.createElement('div');
        dropdown.className = 'ex-tag-dropdown';

        // Build dropdown options from allowed groups
        var allowedGroups = groupLabels || Object.keys(this._groupMap);
        for (var g = 0; g < allowedGroups.length; g++) {
            var groupLabel = allowedGroups[g];
            var groupId = this._groupMap[groupLabel];
            if (!groupId) continue;

            var groupTitle = document.createElement('div');
            groupTitle.className = 'ex-tag-group-title';
            groupTitle.textContent = groupLabel;
            dropdown.appendChild(groupTitle);

            var tags = tagService.getTagsInGroup(groupId);
            for (var t = 0; t < tags.length; t++) {
                (function(tag) {
                    // Skip already applied
                    var alreadyApplied = currentTags.some(function(ct) { return ct.get('idx') === tag.get('idx'); });
                    if (alreadyApplied) return;

                    var opt = document.createElement('div');
                    opt.className = 'ex-tag-option';
                    opt.textContent = tag.get('label');
                    opt.addEventListener('click', function() {
                        tagService.tag(targetTable, targetIdx, tag.get('idx'), 'execInsight');
                        dropdown.style.display = 'none';
                        self.renderTagPicker(container, targetTable, targetIdx, groupLabels);
                    });
                    dropdown.appendChild(opt);
                })(tags[t]);
            }
        }

        addBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Close on outside click
        document.addEventListener('click', function handler() {
            dropdown.style.display = 'none';
        }, { once: true });

        var wrapper = document.createElement('span');
        wrapper.className = 'ex-tag-picker-wrap';
        wrapper.appendChild(addBtn);
        wrapper.appendChild(dropdown);
        container.appendChild(wrapper);
    }
}
