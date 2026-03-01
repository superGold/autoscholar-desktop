/**
 * UIBinding - Bridges PublonTable ↔ EventBus ↔ ui components
 *
 * Extends PublonBinding to get origin tracking for free.
 * Provides bind* methods that create ui components wired to table events.
 *
 * @example
 * const binding = new UIBinding(usersTable, { publome: myPublome });
 * binding.bindSelectEditor(container);  // Full CRUD interface
 *
 * @example
 * // Auto-wire entire publome
 * UIBinding.bindPublome(publome, container);
 */

class UIBinding extends PublonBinding {

    constructor(table, config = {}) {
        super(table, { name: 'ui', ...config });
        this.publome = config.publome || null;
        this.fieldOverrides = config.fieldOverrides || {};
        this._components = [];
        this._subs = [];
        this._fkFilter = null;
        this._fkScopes = {};   // { fieldName: scopeField } — filter FK options by parent FK
        this._editingIdx = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Schema → Form Field Mapping
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolve FK table name from either schema format:
     * - Publome format: { refTable: 'department' }
     * - Service format: { ref: { table: 'department', service: 'member', field: 'idx' } }
     */
    _getRefTable(def) {
        return def.refTable || (def.ref && def.ref.table) || null;
    }

    _getTypeMap() {
        return {
            'string': 'text', 'text': 'textarea', 'number': 'number',
            'integer': 'number', 'decimal': 'number', 'float': 'number',
            'boolean': 'checkbox', 'bool': 'checkbox',
            'date': 'date', 'datetime': 'datetime-local', 'time': 'time',
            'email': 'email', 'url': 'url', 'password': 'password',
            'enum': 'select', 'json': 'textarea'
        };
    }

    _schemaToFormFields() {
        const typeMap = this._getTypeMap();
        const fields = {};

        for (const [name, def] of Object.entries(this.table.schema)) {
            if (def.primaryKey || name === this.table.primaryKey) continue;

            const override = this.fieldOverrides[name] || {};
            const fieldConfig = {
                label: override.label || def.label || name,
                type: override.type || typeMap[def.type] || 'text',
                value: def.default || '',
                ...override
            };

            // Enum/options — services use `options`, Publome schema uses `enum`
            // Skip if fieldOverrides explicitly set a type (e.g. 'hidden')
            const enumValues = def.enum || def.options;
            if (enumValues && Array.isArray(enumValues) && !override.type) {
                fieldConfig.type = 'select';
                fieldConfig.options = enumValues.map(v => ({ value: v, label: v }));
            }

            // FK — services use `ref: { table, service, field }`, Publome schema uses `refTable`
            // Skip if fieldOverrides explicitly set a type (e.g. 'hidden')
            const refTableName = this._getRefTable(def);
            if (refTableName) {
                if (!override.type) {
                    fieldConfig.type = 'select';
                }
                fieldConfig.options = this._getFkOptions(refTableName, name);
                fieldConfig._refTable = refTableName;
                fieldConfig._fieldName = name;
            }

            if (def.min !== undefined) fieldConfig.min = def.min;
            if (def.max !== undefined) fieldConfig.max = def.max;

            fields[name] = fieldConfig;
        }
        return fields;
    }

    _getFkOptions(refTableName, fieldName) {
        let refTable = null;
        if (this.publome) {
            refTable = this.publome.table(refTableName);
        }
        if (!refTable) {
            refTable = PublonRegistry.findTable(refTableName);
        }
        if (!refTable) return [];

        let records = refTable.all();

        // Apply FK scope: filter ref table by parent FK value
        if (fieldName && this._fkScopes[fieldName] && this._fkFilter) {
            const scopeField = this._fkScopes[fieldName];
            const scopeValue = String(this._fkFilter.value);
            records = records.filter(r =>
                String(r.get(scopeField)) === scopeValue
            );
        }

        return records.map(r => ({
            value: String(r.idx),
            label: refTable.getLabel(r)
        }));
    }

    _refreshFkOptions(form) {
        const fields = this._schemaToFormFields();
        for (const [name, config] of Object.entries(fields)) {
            if (!config._refTable) continue;
            const options = this._getFkOptions(config._refTable, config._fieldName || name);

            // cardSelect: update options and display
            const cardSelectEl = form.el ? form.el.querySelector(`[data-card-select="${name}"]`) : null;
            if (cardSelectEl && cardSelectEl._cardSelect) {
                cardSelectEl._cardSelect.setOptions(options);
                continue;
            }

            // Standard select dropdown
            const select = form.el ? form.el.querySelector(`[name="${name}"]`) : null;
            if (!select || select.tagName !== 'SELECT') continue;

            const currentVal = select.value;
            select.innerHTML = '<option value="">(None)</option>';
            for (const opt of options) {
                const optEl = document.createElement('option');
                optEl.value = opt.value;
                optEl.textContent = opt.label;
                select.appendChild(optEl);
            }
            select.value = currentVal;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // List Items Builder
    // ─────────────────────────────────────────────────────────────────────────

    _buildListItems() {
        const variants = ['primary', 'secondary', 'accent', 'success', 'warning', 'info'];
        let records = this.table.all();
        if (this._fkFilter) {
            records = records.filter(r =>
                String(r.get(this._fkFilter.field)) === String(this._fkFilter.value)
            );
        }
        return records.map((record, i) => {
            const label = this.table.getLabel(record);
            const initials = (label || '?').split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
            return {
                id: record.idx,
                title: label,
                subtitle: this.table.getSubtitle(record),
                avatar: { name: label, variant: variants[i % variants.length] }
            };
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Override PublonBinding event handlers
    // UIBinding always refreshes, even for self-initiated changes.
    // Unlike DB bindings, there's no loop risk — UIBinding only renders.
    // ─────────────────────────────────────────────────────────────────────────

    async _onTableCreated(e) {
        this._refreshAll();
    }

    async _onTableUpdated(e) {
        this._refreshAll();
    }

    async _onTableDeleted(e) {
        this._refreshAll();
    }

    async _onTableLoaded(e) {
        this._refreshAll();
    }

    async _onTableCleared(e) {
        this._refreshAll();
    }

    _refreshAll() {
        for (const ref of this._components) {
            if (ref.refresh) ref.refresh();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FK Scope — filter FK dropdown options by parent filter value
    // e.g. setFkScope('roleId', 'groupId') means: when building roleId
    // options, only show groupRole records where groupRole.groupId matches
    // this binding's current fkFilter value.
    // ─────────────────────────────────────────────────────────────────────────

    setFkScope(fkField, scopeField) {
        this._fkScopes[fkField] = scopeField;
    }

    // FK Filter (used by bindChildTable)
    // ─────────────────────────────────────────────────────────────────────────

    _setFkFilter(field, value) {
        this._fkFilter = { field, value };
        this._refreshAll();
    }

    _clearFkFilter() {
        this._fkFilter = null;
        this._refreshAll();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindSelector
    // ─────────────────────────────────────────────────────────────────────────

    bindSelector(container, options = {}) {
        const that = this;
        const items = this._buildListItems();

        const selector = new uiListSelector({
            parent: container,
            template: options.template || 'default',
            items: items,
            searchable: options.searchable !== false,
            editable: options.editable || false,
            pagination: options.pagination || false,
            perPage: options.perPage || 20
        });

        // Table → UI: refresh list
        const refresh = () => {
            const newItems = that._buildListItems();
            selector.update({ items: newItems });
            // Re-highlight current selection
            const sel = that.table.getSelectedOne();
            if (sel) selector.setSelected([sel.idx]);
        };

        // Table → UI: sync selection
        const unsubSel = this.table.on('selected', (e) => {
            if (e.origin === that) return;
            selector.setSelected([e.record.idx]);
        });

        const unsubDesel = this.table.on('deselected', () => {
            selector.clearSelection();
        });

        // UI → Table: user clicks a row
        selector.bus.on('select', (e) => {
            that.table.select(e.item.id, { origin: that });
        });

        this._subs.push(unsubSel, unsubDesel);

        const ref = { type: 'selector', selector, refresh };
        this._components.push(ref);

        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindEditor
    // ─────────────────────────────────────────────────────────────────────────

    bindEditor(container, options = {}) {
        const that = this;
        const mode = options.mode || 'inline';
        const fields = this._schemaToFormFields();

        // Build buttons
        const buttons = {};
        if (!options.hideCreate) {
            buttons.create = { label: 'Create', variant: 'primary', type: 'button' };
        }
        buttons.save = { label: 'Save', variant: 'primary', type: 'submit' };
        if (options.allowDelete !== false) {
            buttons.delete = { label: 'Delete', variant: 'danger', type: 'button' };
        }

        let modal = null;
        let formParent = container;

        if (mode === 'modal') {
            modal = new uiModal({
                parent: document.body,
                template: 'default',
                title: options.modalTitle || `Edit ${that.table.name}`,
                size: options.modalSize || 'md'
            });
            formParent = modal._modal.querySelector('.ui-modal-body');
        }

        const fieldCount = Object.keys(fields).length;
        const autoColumns = fieldCount >= 5 ? 2 : 1;

        const form = new uiForm({
            parent: formParent,
            template: options.formTemplate || 'default',
            fields: fields,
            buttons: buttons,
            size: options.size || 'md',
            columns: options.columns || autoColumns
        });

        // Field mapping: discriminator-driven field visibility
        let mapping = null;
        if (options.fieldMapping) {
            mapping = new uiFormMapping(form, options.fieldMapping);
        }

        // Table → UI: populate form on select
        const unsubSel = this.table.on('selected', (e) => {
            const data = e.record.getData();
            // Convert numeric FK values to strings for select elements
            for (const [name, def] of Object.entries(that.table.schema)) {
                if (that._getRefTable(def) && data[name] !== undefined) {
                    data[name] = String(data[name]);
                }
            }
            form.setData(data);
            if (mapping) mapping.sync();
            that._editingIdx = e.record.idx;
            that._refreshFkOptions(form);
        });

        const unsubDesel = this.table.on('deselected', () => {
            form.setData({});
            that._editingIdx = null;
        });

        // UI → Table: form submit (save/update)
        form.bus.on('submit', (e) => {
            const data = e.data;
            // Convert string FK values back to numbers
            for (const [name, def] of Object.entries(that.table.schema)) {
                if (that._getRefTable(def) && data[name]) {
                    data[name] = parseInt(data[name]) || data[name];
                }
                if ((def.type === 'number' || def.type === 'integer') && data[name] !== undefined) {
                    data[name] = def.type === 'integer' ? (parseInt(data[name]) || 0) : (parseFloat(data[name]) || 0);
                }
            }
            delete data.idx;

            if (that._editingIdx !== null) {
                that.table.update(that._editingIdx, data, { origin: that });
            } else {
                const rec = that.table.create(data, { origin: that });
                that.table.select(rec.idx, { origin: that });
            }

            if (modal && !options.keepOpen) modal.close();
        });

        // UI → Table: button clicks
        form.bus.on('buttonClick', (e) => {
            if (e.button === 'create') {
                that._editingIdx = null;
                that.table.clearSelection();
                form.setData({});
                that._refreshFkOptions(form);
                if (modal) modal.open();
            }
            if (e.button === 'delete' && that._editingIdx !== null) {
                that._confirmDelete(that._editingIdx, () => {
                    form.setData({});
                    that._editingIdx = null;
                    if (modal) modal.close();
                });
            }
        });

        this._subs.push(unsubSel, unsubDesel);

        const openCreate = (defaults) => {
            that._editingIdx = null;
            that.table.clearSelection();
            // Clear all form inputs
            if (form.el) {
                form.el.querySelectorAll('input, select, textarea').forEach(el => {
                    if (el.type === 'checkbox') el.checked = false;
                    else el.value = '';
                });
            }
            // Re-apply FK filter so new records stay scoped to parent
            if (that._fkFilter) {
                form.setData({ [that._fkFilter.field]: String(that._fkFilter.value) });
            }
            if (defaults) form.setData(defaults);
            if (mapping) mapping.sync();
            that._refreshFkOptions(form);
            if (modal) modal.open();
        };

        const openEdit = (idx) => {
            that.table.select(idx, { origin: that });
            that._refreshFkOptions(form);
            if (modal) modal.open();
        };

        const refresh = () => {
            that._refreshFkOptions(form);
        };

        const ref = { type: 'editor', form, modal, mapping, openCreate, openEdit, refresh };
        this._components.push(ref);

        return ref;
    }

    _confirmDelete(idx, callback) {
        const label = this.table.getLabel(idx);
        const modal = new uiModal({
            parent: document.body,
            template: 'confirm',
            title: 'Delete Record',
            content: `Delete "${label}"?`,
            confirmLabel: 'Delete',
            confirmVariant: 'danger'
        });
        modal.bus.on('confirm', () => {
            this.table.delete(idx, { origin: this });
            if (callback) callback();
            modal.destroy();
        });
        modal.bus.on('cancel', () => {
            modal.destroy();
        });
        modal.open();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindSelectEditor
    // ─────────────────────────────────────────────────────────────────────────

    bindSelectEditor(container, options = {}) {
        const editorMode = options.editor || 'modal';
        const that = this;

        if (editorMode === 'inline') {
            return this._bindSelectEditorInline(container, options);
        }
        return this._bindSelectEditorModal(container, options);
    }

    _bindSelectEditorModal(container, options = {}) {
        const that = this;

        // Selector with edit/delete buttons
        const selectorRef = this.bindSelector(container, {
            ...options,
            editable: true
        });

        // Editor in modal
        const editorRef = this.bindEditor(null, {
            mode: 'modal',
            hideCreate: true,
            keepOpen: options.keepOpen || false,
            ...options
        });

        // Wire selector add → editor create
        selectorRef.selector.bus.on('add', () => {
            editorRef.openCreate();
        });

        // Wire selector edit → editor edit
        selectorRef.selector.bus.on('edit', (e) => {
            editorRef.openEdit(e.item.id);
        });

        // Wire selector delete → confirm delete
        selectorRef.selector.bus.on('delete', (e) => {
            that._confirmDelete(e.item.id, () => {
                selectorRef.refresh();
            });
        });

        const refresh = () => {
            selectorRef.refresh();
            editorRef.refresh();
        };

        const ref = {
            type: 'selectEditor',
            selector: selectorRef.selector,
            editor: editorRef,
            refresh
        };
        this._components.push(ref);
        return ref;
    }

    _bindSelectEditorInline(container, options = {}) {
        const that = this;

        // Control-stage layout
        const layout = new uiControlStage({
            parent: container,
            template: options.template || (options.layout === 'stacked' ? 'stacked' : 'default'),
            controlTitle: options.controlTitle || this.table.name,
            stageTitle: options.stageTitle || '',
            controlSize: options.controlSize || 'md'
        });

        // Selector in control panel
        const selectorRef = this.bindSelector(layout.getControlPanel(), {
            ...options,
            editable: true
        });

        // Editor inline in stage
        const editorRef = this.bindEditor(layout.getStage(), {
            mode: 'inline',
            keepOpen: options.keepOpen || false,
            ...options
        });

        // Wire selector add → editor create
        selectorRef.selector.bus.on('add', () => {
            editorRef.openCreate();
        });

        // Wire selector edit → select + focus
        selectorRef.selector.bus.on('edit', (e) => {
            that.table.select(e.item.id, { origin: that });
        });

        // Wire selector delete → confirm
        selectorRef.selector.bus.on('delete', (e) => {
            that._confirmDelete(e.item.id, () => {
                selectorRef.refresh();
            });
        });

        const refresh = () => {
            selectorRef.refresh();
            editorRef.refresh();
        };

        const ref = {
            type: 'selectEditor',
            layout,
            selector: selectorRef.selector,
            editor: editorRef,
            refresh
        };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindChildTable
    // ─────────────────────────────────────────────────────────────────────────

    bindChildTable(childBinding, fkField) {
        const that = this;

        const unsubSel = this.table.on('selected', (e) => {
            const parentIdx = e.record.idx;
            childBinding._setFkFilter(fkField, parentIdx);

            // Auto-set FK value in child editor create forms
            for (const ref of childBinding._components) {
                if (ref.type === 'editor' && ref.form) {
                    ref.form.setData({ [fkField]: String(parentIdx) });
                }
            }
        });

        const unsubDesel = this.table.on('deselected', () => {
            childBinding._clearFkFilter();
        });

        // When parent data loads, refresh child FK dropdowns
        const unsubLoaded = this.table.on('loaded', () => {
            for (const ref of childBinding._components) {
                if (ref.type === 'editor' && ref.form) {
                    childBinding._refreshFkOptions(ref.form);
                }
            }
        });

        this._subs.push(unsubSel, unsubDesel, unsubLoaded);

        return () => {
            unsubSel();
            unsubDesel();
            unsubLoaded();
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindView
    // ─────────────────────────────────────────────────────────────────────────

    bindView(container, template) {
        const that = this;

        const viewEl = document.createElement('div');
        viewEl.className = 'ui-binding-view';
        container.appendChild(viewEl);

        const renderTemplate = (data) => {
            if (typeof template === 'function') return template(data);
            if (typeof template === 'string') {
                return template.replace(/\{(\w+)\}/g, (m, f) =>
                    data[f] !== undefined ? data[f] : m
                );
            }
            return JSON.stringify(data, null, 2);
        };

        const refresh = () => {
            const sel = that.table.getSelectedOne();
            if (sel) {
                viewEl.innerHTML = renderTemplate(sel.getData());
            } else {
                viewEl.innerHTML = '<em>No record selected</em>';
            }
        };

        const unsubSel = this.table.on('selected', refresh);
        const unsubUpd = this.table.on('updated', (e) => {
            if (that.table.isSelected(e.record.idx)) refresh();
        });
        const unsubDesel = this.table.on('deselected', refresh);

        this._subs.push(unsubSel, unsubUpd, unsubDesel);
        refresh();

        const ref = { type: 'view', container: viewEl, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindLabeller
    // ─────────────────────────────────────────────────────────────────────────

    bindLabeller(container) {
        const that = this;

        const labelEl = document.createElement('div');
        labelEl.className = 'ui-binding-label';
        container.appendChild(labelEl);

        const refresh = () => {
            const sel = that.table.getSelectedOne();
            labelEl.textContent = sel ? that.table.getLabel(sel) : '';
        };

        const unsubSel = this.table.on('selected', refresh);
        const unsubUpd = this.table.on('updated', (e) => {
            if (that.table.isSelected(e.record.idx)) refresh();
        });
        const unsubDesel = this.table.on('deselected', refresh);

        this._subs.push(unsubSel, unsubUpd, unsubDesel);
        refresh();

        const ref = { type: 'labeller', container: labelEl, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers (private)
    // ─────────────────────────────────────────────────────────────────────────

    _setButtonDisabled(btnGroup, index, disabled) {
        const buttons = (btnGroup.settings.buttons || []).map((b, i) =>
            i === index ? { ...b, disabled } : b
        );
        btnGroup.update({ buttons });
    }

    _defaultButtonLabel(action) {
        const labels = { create: 'New', edit: 'Edit', delete: 'Delete', custom: 'Action' };
        return labels[action] || 'Action';
    }

    _defaultButtonVariant(action) {
        const variants = { create: 'primary', edit: 'outline', delete: 'danger', custom: 'outline' };
        return variants[action] || 'outline';
    }

    _defaultCollectionMap(componentType) {
        const table = this.table;
        return (record) => ({
            title: table.getLabel(record),
            subtitle: table.getSubtitle(record)
        });
    }

    _buildTreeData(records, parentField, mapFn, sortFn, sortField) {
        const childrenOf = {};
        const roots = [];

        for (const record of records) {
            const parentVal = record.get(parentField);
            const isRoot = parentVal === null || parentVal === undefined || parentVal === 0 || parentVal === '0' || parentVal === '';
            const mapped = mapFn(record);
            const node = { ...mapped, _idx: record.idx, _sortOrder: sortField ? (record.get(sortField) || 0) : 0, children: [] };

            if (isRoot) {
                roots.push(node);
            } else {
                if (!childrenOf[parentVal]) childrenOf[parentVal] = [];
                childrenOf[parentVal].push(node);
            }
        }

        const attach = (nodes) => {
            if (sortFn) nodes.sort((a, b) => sortFn(a, b));
            for (const node of nodes) {
                const kids = childrenOf[node._idx] || [];
                node.children = kids;
                if (kids.length > 0) {
                    node.expanded = true;
                    attach(kids);
                }
            }
        };

        attach(roots);
        if (sortFn) roots.sort((a, b) => sortFn(a, b));
        return roots;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindButton
    // ─────────────────────────────────────────────────────────────────────────

    bindButton(container, options = {}) {
        const that = this;
        const action = options.action || 'create';
        const label = options.label || this._defaultButtonLabel(action);
        const icon = options.icon ? `<i class="${options.icon}"></i> ` : '';
        const variant = options.variant || this._defaultButtonVariant(action);
        const needsSelection = (action === 'edit' || action === 'delete');

        const btnGroup = new uiButtonGroup({
            parent: container,
            buttons: [{ label: icon + label, variant, disabled: needsSelection }]
        });

        // Lazy editor ref — created on first create/edit click
        let editorRef = null;

        const ensureEditor = () => {
            if (!editorRef) {
                editorRef = that.bindEditor(null, {
                    mode: 'modal',
                    hideCreate: true,
                    modalTitle: options.modalTitle || `${action === 'create' ? 'New' : 'Edit'} ${that.table.name}`
                });
            }
            return editorRef;
        };

        // Selection-aware: enable/disable when selection changes
        if (needsSelection) {
            const unsubSel = this.table.on('selected', () => {
                that._setButtonDisabled(btnGroup, 0, false);
            });
            const unsubDesel = this.table.on('deselected', () => {
                that._setButtonDisabled(btnGroup, 0, true);
            });
            this._subs.push(unsubSel, unsubDesel);
        }

        // Button click handler
        btnGroup.bus.on('click', () => {
            if (action === 'create') {
                ensureEditor().openCreate();
            } else if (action === 'edit') {
                const sel = that.table.getSelectedOne();
                if (sel) ensureEditor().openEdit(sel.idx);
            } else if (action === 'delete') {
                const sel = that.table.getSelectedOne();
                if (sel) that._confirmDelete(sel.idx, () => {});
            } else if (action === 'custom' && options.handler) {
                const sel = that.table.getSelectedOne();
                options.handler(sel, that);
            }
        });

        const refresh = () => {};
        const ref = { type: 'button', btnGroup, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindCollection
    // ─────────────────────────────────────────────────────────────────────────

    bindCollection(container, options = {}) {
        const that = this;
        const componentType = options.component || 'card';
        const mapFn = options.map || this._defaultCollectionMap(componentType);
        const filterFn = options.filter || null;
        const sortFn = options.sort || null;
        const onClick = options.onClick || 'select';
        const componentOptions = options.componentOptions || {};

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-collection';
        container.appendChild(wrapper);

        let currentComponent = null;

        const getRecords = () => {
            let records = that.table.all();
            if (that._fkFilter) {
                records = records.filter(r =>
                    String(r.get(that._fkFilter.field)) === String(that._fkFilter.value)
                );
            }
            if (filterFn) records = records.filter(filterFn);
            if (sortFn) records = records.sort(sortFn);
            return records;
        };

        const handleClick = (record) => {
            if (onClick === 'select') {
                that.table.select(record.idx, { origin: that });
            } else if (typeof onClick === 'function') {
                onClick(record);
            }
        };

        const renderCards = (records) => {
            wrapper.innerHTML = '';
            const grid = document.createElement('div');
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;';
            wrapper.appendChild(grid);

            for (const record of records) {
                const mapped = mapFn(record);
                const cardDiv = document.createElement('div');
                grid.appendChild(cardDiv);

                const card = new uiCard({
                    parent: cardDiv,
                    template: componentOptions.cardTemplate || 'task',
                    title: mapped.title || '',
                    subtitle: mapped.subtitle || '',
                    content: mapped.content || '',
                    hoverable: true,
                    ...componentOptions
                });

                card.el.style.cursor = 'pointer';
                card.el.addEventListener('click', () => handleClick(record));
            }
        };

        const renderKanban = (records) => {
            wrapper.innerHTML = '';
            const columns = componentOptions.columns || [{ id: 'default', label: 'All' }];
            const items = records.map(record => {
                const mapped = mapFn(record);
                return {
                    id: record.idx,
                    title: mapped.title || '',
                    subtitle: mapped.subtitle || '',
                    columnId: mapped.columnId || columns[0].id,
                    color: mapped.color,
                    badges: mapped.badges
                };
            });

            const kanban = new uiKanban({
                parent: wrapper,
                columns,
                items,
                ...componentOptions
            });

            kanban.bus.on('select', (e) => {
                const record = that.table.read(e.item.id);
                if (record) handleClick(record);
            });

            kanban.bus.on('move', (e) => {
                const statusField = componentOptions.statusField || 'status';
                that.table.update(e.item.id, { [statusField]: e.toColumnId }, { origin: that });
            });

            currentComponent = kanban;
        };

        const renderTimeline = (records) => {
            wrapper.innerHTML = '';
            const items = records.map(record => {
                const mapped = mapFn(record);
                return {
                    title: mapped.title || '',
                    time: mapped.time || '',
                    description: mapped.description || mapped.subtitle || '',
                    completed: mapped.completed || false
                };
            });

            const timeline = new uiTimeline({
                parent: wrapper,
                items,
                ...componentOptions
            });

            currentComponent = timeline;
        };

        const renderList = (records) => {
            wrapper.innerHTML = '';
            const items = records.map(record => ({
                id: record.idx,
                title: mapFn(record).title || that.table.getLabel(record),
                subtitle: mapFn(record).subtitle || that.table.getSubtitle(record)
            }));

            const selector = new uiListSelector({
                parent: wrapper,
                items,
                searchable: componentOptions.searchable !== false,
                ...componentOptions
            });

            selector.bus.on('select', (e) => {
                const record = that.table.read(e.item.id);
                if (record) handleClick(record);
            });

            currentComponent = selector;
        };

        const renderTable = (records) => {
            wrapper.innerHTML = '';
            const columns = componentOptions.columns || [];
            const data = records.map(record => {
                const mapped = mapFn(record);
                return mapped;
            });

            const table = new uiTable({
                parent: wrapper,
                template: componentOptions.tableTemplate || 'compact',
                columns,
                data,
                ...componentOptions
            });

            currentComponent = table;
        };

        const renderers = { card: renderCards, kanban: renderKanban, timeline: renderTimeline, list: renderList, table: renderTable };

        const refresh = () => {
            const records = getRecords();
            const renderer = renderers[componentType] || renderCards;
            renderer(records);
        };

        refresh();

        const ref = { type: 'collection', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindSortableCards
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render records as a vertical list of draggable cards with inline create.
     * Enter in the create input → creates a new record.
     * Drag a card → reorders by updating sortField on affected records.
     * Edit button → opens a modal editor. Delete button → confirms then deletes.
     *
     * @param {HTMLElement} container
     * @param {Object} [options]
     * @param {string} [options.createField='name'] - Field for inline create input
     * @param {string} [options.createPlaceholder='Add new...'] - Placeholder text
     * @param {string} [options.sortField='sortOrder'] - Integer field updated on drag
     * @param {Function} [options.map] - (record) => { title, subtitle }
     * @param {string} [options.onEdit='modal'] - Opens modal editor on edit click
     */
    bindSortableCards(container, options = {}) {
        const that = this;
        const createField = options.createField || 'name';
        const createPlaceholder = options.createPlaceholder || 'Add new...';
        const sortField = options.sortField || 'sortOrder';
        const mapFn = options.map || ((record) => ({
            title: that.table.getLabel(record),
            subtitle: that.table.getSubtitle(record)
        }));

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-sortable-cards';
        container.appendChild(wrapper);

        // Inline create row
        const createRow = document.createElement('div');
        createRow.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.75rem;';
        const createInput = document.createElement('input');
        createInput.type = 'text';
        createInput.placeholder = createPlaceholder;
        createInput.className = 'ui-input';
        createInput.style.cssText = 'flex: 1;';
        createRow.appendChild(createInput);
        wrapper.appendChild(createRow);

        createInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const val = createInput.value.trim();
            if (!val) return;

            // Shift existing sortOrders up
            const records = getRecords();
            for (const r of records) {
                const cur = r.get(sortField) || 0;
                that.table.update(r.idx, { [sortField]: cur + 1 }, { origin: that });
            }

            // Build create data with FK defaults
            const data = { [createField]: val, [sortField]: 0 };
            if (that._fkFilter) {
                data[that._fkFilter.field] = that._fkFilter.value;
            }
            that.table.create(data, { origin: that });
            createInput.value = '';
        });

        // Card list container
        const listEl = document.createElement('div');
        listEl.className = 'ui-sortable-card-list';
        wrapper.appendChild(listEl);

        // Modal editor (lazy — created once on first edit click)
        let editorRef = null;
        const ensureEditor = () => {
            if (editorRef) return editorRef;
            editorRef = that.bindEditor(null, {
                mode: 'modal',
                hideCreate: true,
                modalTitle: `Edit ${that.table.name}`
            });
            return editorRef;
        };

        const getRecords = () => {
            let records = that.table.all();
            if (that._fkFilter) {
                records = records.filter(r =>
                    String(r.get(that._fkFilter.field)) === String(that._fkFilter.value)
                );
            }
            records.sort((a, b) => (a.get(sortField) || 0) - (b.get(sortField) || 0));
            return records;
        };

        let dragSrcIdx = null;

        const refresh = () => {
            listEl.innerHTML = '';
            const records = getRecords();

            if (records.length === 0) {
                listEl.innerHTML = '<div style="color: #86868b; font-size: 13px; padding: 0.75rem 0;">No items</div>';
                return;
            }

            for (const record of records) {
                const mapped = mapFn(record);
                const card = document.createElement('div');
                card.className = 'ui-sortable-card';
                card.draggable = true;
                card.dataset.idx = record.idx;
                card.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border: none; border-radius: 8px; margin-bottom: 0.5rem; background: #fff; cursor: grab; box-shadow: 0 0.5px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05); transition: box-shadow 0.15s, opacity 0.15s;';

                // Drag handle
                const handle = document.createElement('span');
                handle.style.cssText = 'color: #b0b0b0; font-size: 13px; cursor: grab; user-select: none; flex-shrink: 0;';
                handle.textContent = '☰';
                card.appendChild(handle);

                // Optional icon/avatar
                if (mapped.icon) {
                    if (typeof mapped.icon === 'string') {
                        const iconWrap = document.createElement('span');
                        iconWrap.innerHTML = mapped.icon;
                        iconWrap.style.cssText = 'flex-shrink: 0; display: flex; align-items: center;';
                        card.appendChild(iconWrap);
                    } else if (mapped.icon instanceof HTMLElement) {
                        card.appendChild(mapped.icon);
                    }
                }

                // Title + subtitle
                const textCol = document.createElement('div');
                textCol.style.cssText = 'flex: 1; min-width: 0;';
                const titleEl = document.createElement('div');
                titleEl.style.cssText = 'font-size: 13px; font-weight: 500; color: #1d1d1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.01em;';
                titleEl.textContent = mapped.title || '';
                textCol.appendChild(titleEl);
                if (mapped.subtitle) {
                    const subEl = document.createElement('div');
                    subEl.style.cssText = 'font-size: 11px; color: #86868b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px;';
                    subEl.textContent = mapped.subtitle;
                    textCol.appendChild(subEl);
                }
                card.appendChild(textCol);

                // Edit button
                const editBtn = document.createElement('button');
                editBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost';
                editBtn.innerHTML = '✎';
                editBtn.title = 'Edit';
                editBtn.style.cssText = 'padding: 2px 6px; font-size: 13px; color: #86868b; border: none; background: none; cursor: pointer; border-radius: 4px; flex-shrink: 0;';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const ed = ensureEditor();
                    ed.openEdit(record.idx);
                });
                card.appendChild(editBtn);

                // Delete button
                const delBtn = document.createElement('button');
                delBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost';
                delBtn.innerHTML = '✕';
                delBtn.title = 'Delete';
                delBtn.style.cssText = 'padding: 2px 6px; font-size: 13px; color: #b0b0b0; border: none; background: none; cursor: pointer; border-radius: 4px; flex-shrink: 0;';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    that._confirmDelete(record.idx, () => {});
                });
                card.appendChild(delBtn);

                // ── Drag events (HTML5 native, same pattern as uiKanban) ──

                card.addEventListener('dragstart', (e) => {
                    dragSrcIdx = record.idx;
                    card.style.opacity = '0.4';
                    e.dataTransfer.effectAllowed = 'move';
                });

                card.addEventListener('dragend', () => {
                    card.style.opacity = '1';
                    dragSrcIdx = null;
                    listEl.querySelectorAll('.ui-sortable-card').forEach(c => {
                        c.style.boxShadow = '0 0.5px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)';
                    });
                });

                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    card.style.boxShadow = '0 0 0 2px rgba(0,122,255,0.4), 0 2px 8px rgba(0,0,0,0.1)';
                });

                card.addEventListener('dragleave', () => {
                    card.style.boxShadow = '0 0.5px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)';
                });

                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.style.boxShadow = '0 0.5px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)';
                    if (dragSrcIdx === null || dragSrcIdx === record.idx) return;

                    // Determine drop position (before or after target)
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const dropBefore = e.clientY < midY;

                    // Build new order
                    const ordered = getRecords().map(r => r.idx);
                    const fromPos = ordered.indexOf(dragSrcIdx);
                    if (fromPos === -1) return;
                    ordered.splice(fromPos, 1);
                    let toPos = ordered.indexOf(record.idx);
                    if (!dropBefore) toPos += 1;
                    ordered.splice(toPos, 0, dragSrcIdx);

                    // Write new sortOrder values
                    for (let i = 0; i < ordered.length; i++) {
                        that.table.update(ordered[i], { [sortField]: i }, { origin: that });
                    }
                });

                listEl.appendChild(card);
            }
        };

        refresh();

        const ref = { type: 'sortableCards', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindMetric
    // ─────────────────────────────────────────────────────────────────────────

    bindMetric(container, options = {}) {
        const that = this;
        const computeFn = options.compute || ((records) => records.length);
        const label = options.label || this.table.name;
        const template = options.template || 'chip';
        const icon = options.icon || '';
        const color = options.color || 'var(--ui-primary, #3b82f6)';

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-metric';
        container.appendChild(wrapper);

        let chipEl = null;
        let valueEl = null;

        const getRecords = () => {
            let records = that.table.all();
            if (that._fkFilter) {
                records = records.filter(r =>
                    String(r.get(that._fkFilter.field)) === String(that._fkFilter.value)
                );
            }
            return records;
        };

        const refresh = () => {
            const records = getRecords();
            const value = computeFn(records);
            const displayValue = String(value);

            if (template === 'badge') {
                wrapper.innerHTML = '';
                new uiBadge({
                    parent: wrapper,
                    label: `${label}: ${displayValue}`,
                    color: options.color || 'primary',
                    variant: options.badgeVariant || 'default'
                });
            } else if (template === 'text') {
                wrapper.textContent = `${label}: ${displayValue}`;
            } else {
                // Default: compact chip (replaces old fat stat cards)
                if (!chipEl) {
                    chipEl = document.createElement('span');
                    chipEl.className = 'ui-metric-chip';
                    if (icon) {
                        // Handle both HTML string icons and plain CSS class icons
                        let iconClass = icon;
                        const m = icon.match(/class="([^"]+)"/);
                        if (m) iconClass = m[1];
                        const iconEl = document.createElement('i');
                        iconEl.className = iconClass + ' ui-metric-chip-icon';
                        iconEl.style.color = color;
                        chipEl.appendChild(iconEl);
                    }
                    valueEl = document.createElement('span');
                    valueEl.className = 'ui-metric-chip-value';
                    valueEl.style.color = color;
                    valueEl.textContent = displayValue;
                    chipEl.appendChild(valueEl);
                    const labelEl = document.createElement('span');
                    labelEl.className = 'ui-metric-chip-label';
                    labelEl.textContent = label;
                    chipEl.appendChild(labelEl);
                    wrapper.appendChild(chipEl);
                } else {
                    if (valueEl) valueEl.textContent = displayValue;
                }
            }
        };

        refresh();

        const ref = { type: 'metric', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindCard — Card display bound to selected record
    // ─────────────────────────────────────────────────────────────────────────

    bindCard(container, options = {}) {
        const that = this;
        const titleOpt = options.title || '';
        const icon = options.icon || '';
        const iconColor = options.iconColor || 'var(--ui-gray-700)';
        const contentFn = options.content || (() => '');

        const cardEl = document.createElement('div');
        cardEl.className = 'ui-card ui-card-compact';
        container.appendChild(cardEl);

        const headerEl = document.createElement('div');
        headerEl.className = 'ui-card-header';
        if (iconColor) headerEl.style.setProperty('--icon-color', iconColor);
        cardEl.appendChild(headerEl);

        const bodyEl = document.createElement('div');
        bodyEl.className = 'ui-card-body';
        cardEl.appendChild(bodyEl);

        const renderFn = options.render || null;

        const refresh = () => {
            const sel = that.table.getSelectedOne();
            if (!sel) {
                bodyEl.innerHTML = '';
                return;
            }
            const data = sel.getData();
            const titleText = typeof titleOpt === 'function' ? titleOpt(data) : titleOpt;
            headerEl.innerHTML = (icon ? `<i class="${icon}"></i>` : '') +
                `<span class="ui-card-title">${titleText}</span>`;

            if (renderFn) {
                bodyEl.innerHTML = '';
                renderFn(bodyEl, sel);
            } else {
                bodyEl.innerHTML = contentFn(data, sel);
            }
        };

        const unsubSel = this.table.on('selected', refresh);
        const unsubUpd = this.table.on('updated', (e) => {
            if (that.table.isSelected(e.record.idx)) refresh();
        });
        const unsubDesel = this.table.on('deselected', refresh);

        this._subs.push(unsubSel, unsubUpd, unsubDesel);
        refresh();

        const ref = { type: 'card', container: cardEl, refresh, bodyEl };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindQR — QR code bound to selected record
    // ─────────────────────────────────────────────────────────────────────────

    bindQR(container, options = {}) {
        const that = this;
        const dataFn = options.dataFn || ((record) => record.get('code') || String(record.idx));
        const size = options.size || 80;
        const color = options.color || '#1565C0';

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-qr';
        container.appendChild(wrapper);

        const refresh = () => {
            wrapper.innerHTML = '';
            const sel = that.table.getSelectedOne();
            if (!sel) return;
            new uiQRCode({ parent: wrapper, data: dataFn(sel), size, color });
        };

        const unsubSel = this.table.on('selected', refresh);
        const unsubUpd = this.table.on('updated', (e) => {
            if (that.table.isSelected(e.record.idx)) refresh();
        });
        const unsubDesel = this.table.on('deselected', refresh);

        this._subs.push(unsubSel, unsubUpd, unsubDesel);
        refresh();

        const ref = { type: 'qr', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindStepper — Workflow stepper bound to selected record status
    // ─────────────────────────────────────────────────────────────────────────

    bindStepper(container, options = {}) {
        const that = this;
        const statusField = options.statusField || 'status';
        const steps = options.steps || [];
        const template = options.template || 'compact';

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-stepper';
        container.appendChild(wrapper);

        const refresh = () => {
            wrapper.innerHTML = '';
            const sel = that.table.getSelectedOne();
            if (!sel) return;

            const currentStatus = sel.get(statusField) || '';
            const stepValues = steps.map(s => s.value || s.label);
            const currentIdx = stepValues.indexOf(currentStatus);
            const stepItems = steps.map((s, i) => ({
                label: s.label || s.value,
                completed: i < currentIdx
            }));

            new uiStepper({
                parent: wrapper,
                steps: stepItems,
                currentStep: Math.max(0, currentIdx) + 1,
                template,
                clickable: options.clickable !== undefined ? options.clickable : false
            });
        };

        const unsubSel = this.table.on('selected', refresh);
        const unsubUpd = this.table.on('updated', (e) => {
            if (that.table.isSelected(e.record.idx)) refresh();
        });
        const unsubDesel = this.table.on('deselected', refresh);

        this._subs.push(unsubSel, unsubUpd, unsubDesel);
        refresh();

        const ref = { type: 'stepper', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindTree
    // ─────────────────────────────────────────────────────────────────────────

    bindTree(container, options = {}) {
        const that = this;
        const parentField = options.parentField || 'parentId';
        const template = options.template || 'default';
        const sortFn = options.sort || null;
        const onClick = options.onClick || 'select';
        const componentOptions = options.componentOptions || {};

        const defaultMap = (record) => ({
            label: that.table.getLabel(record),
            sublabel: that.table.getSubtitle(record)
        });
        const mapFn = options.map || defaultMap;

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-tree';
        container.appendChild(wrapper);

        let tree = null;

        const getRecords = () => {
            let records = that.table.all();
            if (that._fkFilter) {
                records = records.filter(r =>
                    String(r.get(that._fkFilter.field)) === String(that._fkFilter.value)
                );
            }
            return records;
        };

        const refresh = () => {
            wrapper.innerHTML = '';
            const records = getRecords();
            const data = that._buildTreeData(records, parentField, mapFn, sortFn);

            tree = new uiTreeView({
                parent: wrapper,
                template,
                data,
                selectable: true,
                ...componentOptions
            });

            tree.bus.on('select', (e) => {
                const idx = e.node._idx;
                if (onClick === 'select') {
                    that.table.select(idx, { origin: that });
                } else if (typeof onClick === 'function') {
                    const record = that.table.read(idx);
                    if (record) onClick(record);
                }
            });
        };

        refresh();

        const ref = { type: 'tree', container: wrapper, tree: () => tree, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindTreeEditor
    // ─────────────────────────────────────────────────────────────────────────

    bindTreeEditor(container, options = {}) {
        const editorMode = options.editor || 'modal';

        if (editorMode === 'inline') {
            return this._bindTreeEditorInline(container, options);
        }
        return this._bindTreeEditorModal(container, options);
    }

    _bindEditableTree(container, options = {}) {
        const that = this;
        const parentField = options.parentField || 'parentId';
        const sortField = options.sortField || 'sortOrder';
        const template = options.template || 'compact';
        const sortFn = options.sort || ((a, b) => (a._sortOrder || 0) - (b._sortOrder || 0));
        const componentOptions = options.componentOptions || {};

        const defaultMap = (record) => ({
            label: that.table.getLabel(record)
        });
        const mapFn = options.map || defaultMap;

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-tree';
        container.appendChild(wrapper);

        let tree = null;

        const getRecords = () => {
            let records = that.table.all();
            if (that._fkFilter) {
                records = records.filter(r =>
                    String(r.get(that._fkFilter.field)) === String(that._fkFilter.value)
                );
            }
            return records;
        };

        // ref declared early so move handler can call ref.refresh() (which may be wrapped externally)
        const ref = { type: 'tree', container: wrapper, tree: () => tree, refresh: null };

        const refresh = () => {
            wrapper.innerHTML = '';
            const records = getRecords();
            const data = that._buildTreeData(records, parentField, mapFn, sortFn, sortField);

            tree = new uiTreeView({
                parent: wrapper,
                template,
                data,
                selectable: true,
                searchable: true,
                editable: true,
                ...componentOptions
            });

            tree.bus.on('select', (e) => {
                that.table.select(e.node._idx, { origin: that });
            });

            // Drag-and-drop move handler
            tree.bus.on('move', (e) => {
                const { nodeIdx, targetIdx, zone } = e;
                const draggedRec = that.table.read(nodeIdx);
                const targetRec = that.table.read(targetIdx);
                if (!draggedRec || !targetRec) return;

                const oldParentId = draggedRec.get(parentField);
                let newParentId;

                if (zone === 'into') {
                    newParentId = targetIdx;
                } else {
                    newParentId = targetRec.get(parentField);
                }

                // Update parentId if changed
                const parentChanged = String(oldParentId || '') !== String(newParentId || '');
                if (parentChanged) {
                    that.table.update(nodeIdx, { [parentField]: newParentId || null }, { origin: that });
                }

                // Gather new siblings (all records sharing newParentId, excluding the dragged node)
                const allRecords = getRecords();
                const isRoot = (val) => val === null || val === undefined || val === 0 || val === '0' || val === '';
                const newSiblings = allRecords.filter(r => {
                    if (r.idx === nodeIdx) return false;
                    const pv = r.get(parentField);
                    if (isRoot(newParentId)) return isRoot(pv);
                    return String(pv) === String(newParentId);
                });

                // Sort current siblings by existing sortOrder
                newSiblings.sort((a, b) => (a.get(sortField) || 0) - (b.get(sortField) || 0));

                // Find insertion index based on target position
                let insertAt = newSiblings.length;
                for (let i = 0; i < newSiblings.length; i++) {
                    if (newSiblings[i].idx === targetIdx) {
                        insertAt = zone === 'before' ? i : i + 1;
                        break;
                    }
                }
                if (zone === 'into') insertAt = newSiblings.length;

                // Insert dragged record
                newSiblings.splice(insertAt, 0, draggedRec);

                // Write sequential sortOrder for all new siblings
                for (let i = 0; i < newSiblings.length; i++) {
                    that.table.update(newSiblings[i].idx, { [sortField]: i }, { origin: that });
                }

                // If parent changed, renumber old siblings too
                if (parentChanged) {
                    const oldSiblings = allRecords.filter(r => {
                        if (r.idx === nodeIdx) return false;
                        const pv = r.get(parentField);
                        if (isRoot(oldParentId)) return isRoot(pv);
                        return String(pv) === String(oldParentId);
                    });
                    oldSiblings.sort((a, b) => (a.get(sortField) || 0) - (b.get(sortField) || 0));
                    for (let i = 0; i < oldSiblings.length; i++) {
                        that.table.update(oldSiblings[i].idx, { [sortField]: i }, { origin: that });
                    }
                }

                // Call through ref.refresh so external wrappers (wireEvents) run
                ref.refresh();
            });
        };

        ref.refresh = refresh;
        refresh();

        // Table → UI: sync selection
        const unsubSel = this.table.on('selected', (e) => {
            if (e.origin === that) return;
            if (tree) tree.setSelected(e.record.idx);
        });

        const unsubDesel = this.table.on('deselected', () => {
            if (tree) tree.clearSelection();
        });

        this._subs.push(unsubSel, unsubDesel);

        this._components.push(ref);
        return ref;
    }

    _bindTreeEditorModal(container, options = {}) {
        const that = this;
        const parentField = options.parentField || 'parentId';

        // Editable tree
        const treeRef = this._bindEditableTree(container, options);

        // Editor in modal
        const editorRef = this.bindEditor(null, {
            mode: 'modal',
            hideCreate: true,
            keepOpen: options.keepOpen || false,
            ...options
        });

        // Wire tree add → editor create
        const wireEvents = () => {
            const tree = treeRef.tree();
            if (!tree) return;

            tree.bus.on('add', () => {
                editorRef.openCreate();
            });

            tree.bus.on('addChild', (e) => {
                editorRef.openCreate({ [parentField]: e.node._idx });
            });

            tree.bus.on('edit', (e) => {
                editorRef.openEdit(e.node._idx);
            });

            tree.bus.on('delete', (e) => {
                that._confirmDelete(e.node._idx, () => {
                    treeRef.refresh();
                });
            });
        };

        wireEvents();

        // Re-wire after refresh (tree gets recreated)
        const origRefresh = treeRef.refresh;
        treeRef.refresh = () => {
            origRefresh();
            wireEvents();
        };

        const refresh = () => {
            treeRef.refresh();
            editorRef.refresh();
        };

        const ref = {
            type: 'treeEditor',
            tree: treeRef.tree,
            editor: editorRef,
            refresh
        };
        // Replace the tree's own ref with our combined one
        const treeIdx = this._components.indexOf(treeRef);
        if (treeIdx !== -1) this._components[treeIdx] = ref;
        return ref;
    }

    _bindTreeEditorInline(container, options = {}) {
        const that = this;
        const parentField = options.parentField || 'parentId';

        // Control-stage layout
        const layout = new uiControlStage({
            parent: container,
            template: options.template || (options.layout === 'stacked' ? 'stacked' : 'default'),
            controlTitle: options.controlTitle || this.table.name,
            stageTitle: options.stageTitle || '',
            controlSize: options.controlSize || 'md'
        });

        // Tree in control panel
        const treeRef = this._bindEditableTree(layout.getControlPanel(), options);

        // Editor inline in stage
        const editorRef = this.bindEditor(layout.getStage(), {
            mode: 'inline',
            keepOpen: options.keepOpen || false,
            ...options
        });

        // Wire events
        const wireEvents = () => {
            const tree = treeRef.tree();
            if (!tree) return;

            tree.bus.on('add', () => {
                editorRef.openCreate();
            });

            tree.bus.on('addChild', (e) => {
                editorRef.openCreate({ [parentField]: e.node._idx });
            });

            tree.bus.on('edit', (e) => {
                that.table.select(e.node._idx, { origin: that });
            });

            tree.bus.on('delete', (e) => {
                that._confirmDelete(e.node._idx, () => {
                    treeRef.refresh();
                });
            });
        };

        wireEvents();

        const origRefresh = treeRef.refresh;
        treeRef.refresh = () => {
            origRefresh();
            wireEvents();
        };

        const refresh = () => {
            treeRef.refresh();
            editorRef.refresh();
        };

        const ref = {
            type: 'treeEditor',
            layout,
            tree: treeRef.tree,
            editor: editorRef,
            refresh
        };
        const treeIdx = this._components.indexOf(treeRef);
        if (treeIdx !== -1) this._components[treeIdx] = ref;
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindGraph
    // ─────────────────────────────────────────────────────────────────────────

    bindGraph(container, options = {}) {
        const that = this;
        const edgeTable = options.edgeTable;
        if (!edgeTable) {
            console.warn('bindGraph requires edgeTable option');
            return null;
        }

        const sourceField = options.sourceField || 'sourceNodeId';
        const targetField = options.targetField || 'targetNodeId';
        const onClick = options.onClick || 'select';
        const componentOptions = options.componentOptions || {};

        const defaultNodeMap = (record) => ({
            label: that.table.getLabel(record)
        });
        const defaultEdgeMap = () => ({});
        const nodeMapFn = options.nodeMap || defaultNodeMap;
        const edgeMapFn = options.edgeMap || defaultEdgeMap;

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-graph';
        container.appendChild(wrapper);

        let graph = null;

        const getNodeRecords = () => {
            let records = that.table.all();
            if (that._fkFilter) {
                records = records.filter(r =>
                    String(r.get(that._fkFilter.field)) === String(that._fkFilter.value)
                );
            }
            return records;
        };

        const refresh = () => {
            wrapper.innerHTML = '';
            const nodeRecords = getNodeRecords();
            const nodeIdxSet = new Set(nodeRecords.map(r => r.idx));

            const nodes = nodeRecords.map(r => ({
                id: r.idx,
                ...nodeMapFn(r)
            }));

            // Filter edges to only those connecting nodes in the current set
            const allEdges = edgeTable.all();
            const edges = [];
            for (const er of allEdges) {
                const src = er.get(sourceField);
                const tgt = er.get(targetField);
                if (nodeIdxSet.has(src) && nodeIdxSet.has(tgt)) {
                    edges.push({
                        source: src,
                        target: tgt,
                        ...edgeMapFn(er)
                    });
                }
            }

            graph = new uiGraphView({
                parent: wrapper,
                nodes,
                edges,
                ...componentOptions
            });

            graph.bus.on('selectNode', (e) => {
                const idx = e.node.id;
                if (onClick === 'select') {
                    that.table.select(idx, { origin: that });
                } else if (typeof onClick === 'function') {
                    const record = that.table.read(idx);
                    if (record) onClick(record);
                }
            });
        };

        // Subscribe to edge table events for auto-refresh
        const edgeEvents = ['created', 'updated', 'deleted', 'loaded'];
        const edgeSubs = edgeEvents.map(evt => edgeTable.on(evt, () => refresh()));
        this._subs.push(...edgeSubs);

        refresh();

        const ref = { type: 'graph', container: wrapper, graph: () => graph, refresh, _edgeSubs: edgeSubs };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindMnEditor
    // ─────────────────────────────────────────────────────────────────────────

    bindMnEditor(container, options = {}) {
        const that = this;

        // Auto-detect FK columns from schema
        const fkCols = [];
        for (const [name, def] of Object.entries(this.table.schema)) {
            if (def.primaryKey || name === this.table.primaryKey) continue;
            const refTable = this._getRefTable(def);
            if (refTable) fkCols.push({ field: name, refTable, def });
        }

        const links = options.links || {};
        if (fkCols.length >= 2 && Object.keys(links).length === 0) {
            for (const fk of fkCols) {
                let refTable = null;
                if (this.publome) refTable = this.publome.table(fk.refTable);
                if (!refTable) refTable = PublonRegistry.findTable(fk.refTable);
                if (refTable) links[fk.field] = { table: refTable };
            }
        }

        const linkKeys = Object.keys(links);
        if (linkKeys.length < 2) {
            console.warn('bindMnEditor requires at least 2 FK links');
            return null;
        }

        // Mode routing
        if (options.mode === 'toggle') {
            return this._buildMnToggle(container, fkCols, links, options);
        }
        if (options.mode === 'selector') {
            return this._buildMnSelector(container, fkCols, links, options);
        }
        // Default: kanban
        return this._buildMnKanban(container, fkCols, links, options);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // _buildMnSelector (internal — called by bindMnEditor with mode:'selector')
    // ─────────────────────────────────────────────────────────────────────────

    _buildMnSelector(container, fkCols, links, options) {
        const that = this;
        const linkKeys = Object.keys(links);

        // Build layout
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-mn-editor';
        container.appendChild(wrapper);

        // Title
        const title = document.createElement('div');
        title.style.cssText = 'font-weight: 600; margin-bottom: 0.5rem;';
        title.textContent = `${this.table.name} links`;
        wrapper.appendChild(title);

        // Entity panels side by side
        const panelsRow = document.createElement('div');
        panelsRow.style.cssText = 'display: flex; gap: 0.75rem; margin-bottom: 0.5rem;';
        wrapper.appendChild(panelsRow);

        const selections = {};
        const selectors = {};

        for (const key of linkKeys) {
            const refTable = links[key].table;
            const panelDiv = document.createElement('div');
            panelDiv.style.cssText = 'flex: 1; min-width: 0;';

            const panelLabel = document.createElement('div');
            panelLabel.style.cssText = 'font-size: 0.85rem; font-weight: 500; margin-bottom: 0.25rem;';
            panelLabel.textContent = refTable.name;
            panelDiv.appendChild(panelLabel);

            const selectorDiv = document.createElement('div');
            panelDiv.appendChild(selectorDiv);

            const items = refTable.all().map(r => ({
                id: r.idx,
                title: refTable.getLabel(r),
                subtitle: refTable.getSubtitle(r)
            }));

            const selector = new uiListSelector({
                parent: selectorDiv,
                template: 'compact',
                items: items,
                searchable: true
            });

            selector.bus.on('select', (e) => {
                selections[key] = e.item.id;
            });

            selectors[key] = { selector, refTable, div: selectorDiv };
            panelsRow.appendChild(panelDiv);
        }

        // Link button
        const linkBtn = document.createElement('button');
        linkBtn.className = 'ui-btn ui-btn-primary ui-btn-sm';
        linkBtn.dataset.color = 'primary';
        linkBtn.textContent = 'Link';
        linkBtn.style.cssText = 'margin-bottom: 0.5rem;';
        linkBtn.addEventListener('click', () => {
            if (linkKeys.some(k => !selections[k])) return;
            const data = {};
            for (const k of linkKeys) data[k] = selections[k];

            // Check for duplicate
            const existing = that.table.find(r => {
                return linkKeys.every(k => r.get(k) === data[k]);
            });
            if (existing) return;

            that.table.create(data, { origin: that });
        });
        wrapper.appendChild(linkBtn);

        // Existing links list via uiListSelector
        const linksLabel = document.createElement('div');
        linksLabel.className = 'ui-list-item-subtitle';
        linksLabel.textContent = 'Existing links';
        wrapper.appendChild(linksLabel);

        const linksDiv = document.createElement('div');
        wrapper.appendChild(linksDiv);

        const _mnColors = ['primary','secondary','accent','info','success','warning'];
        let linksList = null;

        const _buildLinkItems = () => {
            const records = that.table.all();
            return records.map((record, i) => {
                const labels = linkKeys.map(k => {
                    const refTable = links[k].table;
                    const refRecord = refTable.read(record.get(k));
                    return refRecord ? refTable.getLabel(refRecord) : `#${record.get(k)}`;
                });
                return {
                    id: record.idx,
                    title: labels.join(' ↔ '),
                    avatar: { name: labels[0] || '?', variant: _mnColors[i % _mnColors.length] }
                };
            });
        };

        const refresh = () => {
            const items = _buildLinkItems();
            if (linksList) {
                linksList.update({ items });
            } else {
                linksList = new uiListSelector({
                    parent: linksDiv,
                    template: 'compact',
                    items: items,
                    editable: true
                });
                // Hide the add/edit buttons — only delete is relevant for link removal
                const header = linksDiv.querySelector('.ui-list-header');
                if (header) header.style.display = 'none';
                linksList.bus.on('delete', (e) => {
                    that.table.delete(e.item.id, { origin: that });
                });
            }

            // Also refresh entity panels
            for (const key of linkKeys) {
                const s = selectors[key];
                const items = s.refTable.all().map(r => ({
                    id: r.idx,
                    title: s.refTable.getLabel(r),
                    subtitle: s.refTable.getSubtitle(r)
                }));
                s.selector.update({ items });
            }
        };

        refresh();

        // Re-render on any table change (create/delete)
        this.table.on('created', () => refresh());
        this.table.on('deleted', () => refresh());

        const ref = { type: 'mnSelector', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // _buildMnKanban (internal — called by bindMnEditor as default mode)
    // ─────────────────────────────────────────────────────────────────────────

    _buildMnKanban(container, fkCols, links, options) {
        const that = this;
        const linkKeys = Object.keys(links);
        const MAX_VISIBLE = options.maxVisible || 30;
        const _mnColors = ['primary','secondary','accent','info','success','warning'];

        // ── FK detection: which is groups (columns) and which is items (cards) ──
        let groupField = options.groupField || null;
        let itemField = options.itemField || null;

        if (!groupField || !itemField) {
            const fkFilter = this._fkFilter;
            if (fkFilter) {
                // Filtered FK = group, the other = items
                groupField = fkFilter.field;
                itemField = linkKeys.find(k => k !== groupField);
            } else {
                // FK with fewer ref table records = groups
                const counts = linkKeys.map(k => ({ field: k, count: links[k].table.all().length }));
                counts.sort((a, b) => a.count - b.count);
                groupField = counts[0].field;
                itemField = counts[1].field;
            }
        }

        const groupTable = links[groupField].table;
        const itemTable = links[itemField].table;

        // Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-mn-kanban';
        container.appendChild(wrapper);

        let searchTerm = '';

        function _getCardData(record, table) {
            if (options.map) return options.map(record, table);
            const label = table.getLabel(record);
            return {
                title: label,
                subtitle: table.getSubtitle(record) || '',
                avatarChar: label.charAt(0).toUpperCase()
            };
        }

        function _buildCard(record, table, colorIdx, opts) {
            const removable = opts && opts.removable;
            const data = _getCardData(record, table);

            const card = document.createElement('div');
            card.className = 'ui-kanban-card';
            card.setAttribute('draggable', 'true');
            card.dataset.itemIdx = String(record.idx);

            const inner = document.createElement('div');
            inner.className = 'ui-mn-kanban-card-inner';

            // Avatar
            const avatar = document.createElement('div');
            avatar.className = 'ui-avatar ui-avatar-xs ui-avatar-' + _mnColors[colorIdx % _mnColors.length];
            avatar.textContent = data.avatarChar;
            inner.appendChild(avatar);

            // Text
            const textDiv = document.createElement('div');
            textDiv.style.cssText = 'flex:1;min-width:0;';

            const titleEl = document.createElement('div');
            titleEl.className = 'ui-kanban-card-title';
            titleEl.textContent = data.title;
            textDiv.appendChild(titleEl);

            if (data.subtitle) {
                const subEl = document.createElement('div');
                subEl.className = 'ui-kanban-card-subtitle';
                subEl.textContent = data.subtitle;
                textDiv.appendChild(subEl);
            }
            inner.appendChild(textDiv);

            // Remove button (group columns only)
            if (removable) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'ui-btn-danger-ghost ui-mn-kanban-remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.title = 'Remove link';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (opts.onRemove) opts.onRemove(record.idx);
                });
                inner.appendChild(removeBtn);
            }

            card.appendChild(inner);

            // Drag events
            card.addEventListener('dragstart', (e) => {
                card.classList.add('ui-kanban-card-dragging');
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'mn-kanban',
                    itemIdx: record.idx,
                    sourceColumn: opts.sourceColumn || 'available'
                }));
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('ui-kanban-card-dragging');
            });

            return card;
        }

        function _buildColumn(label, cssClass, records, table, opts) {
            const col = document.createElement('div');
            col.className = 'ui-kanban-column' + (cssClass ? ' ' + cssClass : '');

            // Header
            const header = document.createElement('div');
            header.className = 'ui-kanban-column-header';

            const labelEl = document.createElement('span');
            labelEl.className = 'ui-kanban-column-label';
            labelEl.textContent = label;
            header.appendChild(labelEl);

            const countEl = document.createElement('span');
            countEl.className = 'ui-kanban-column-count';
            countEl.textContent = String(records.length);
            header.appendChild(countEl);

            col.appendChild(header);

            // List
            const list = document.createElement('div');
            list.className = 'ui-kanban-list';
            col.appendChild(list);

            if (records.length === 0) {
                const dropzone = document.createElement('div');
                dropzone.className = 'ui-mn-kanban-dropzone';
                dropzone.style.cssText = 'padding: var(--ui-space-3); margin: var(--ui-space-1);';
                dropzone.textContent = opts.emptyText || 'Drop here';
                list.appendChild(dropzone);
            } else {
                const visible = records.slice(0, MAX_VISIBLE);
                for (let i = 0; i < visible.length; i++) {
                    list.appendChild(_buildCard(visible[i], table, i, opts));
                }
                if (records.length > MAX_VISIBLE) {
                    const more = document.createElement('div');
                    more.className = 'ui-kanban-card-subtitle';
                    more.style.cssText = 'text-align:center; padding: var(--ui-space-2);';
                    more.textContent = `${records.length - MAX_VISIBLE} more...`;
                    list.appendChild(more);
                }
            }

            // Drop target events (only for group columns)
            if (opts.droppable) {
                list.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    list.classList.add('ui-kanban-list-dragover');
                });

                list.addEventListener('dragleave', (e) => {
                    if (!list.contains(e.relatedTarget)) {
                        list.classList.remove('ui-kanban-list-dragover');
                    }
                });

                list.addEventListener('drop', (e) => {
                    e.preventDefault();
                    list.classList.remove('ui-kanban-list-dragover');
                    try {
                        const payload = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (payload.type !== 'mn-kanban') return;
                        if (opts.onDrop) opts.onDrop(payload.itemIdx);
                    } catch (_) { /* ignore malformed */ }
                });
            }

            return col;
        }

        function refresh() {
            wrapper.innerHTML = '';

            const fkFilter = that._fkFilter;
            const allLinkRecords = that.table.all();

            // Determine which groups to show
            let groups;
            if (fkFilter && fkFilter.field === groupField) {
                // Filtered to a single group
                const rec = groupTable.read(fkFilter.value);
                groups = rec ? [rec] : [];
            } else {
                groups = groupTable.all();
            }

            // Build index: groupIdx → [itemRecords]
            const groupItems = {};
            for (const g of groups) groupItems[g.idx] = [];

            for (const linkRec of allLinkRecords) {
                const gId = linkRec.get(groupField);
                const iId = linkRec.get(itemField);
                if (groupItems[gId]) {
                    const itemRec = itemTable.read(iId);
                    if (itemRec) groupItems[gId].push({ itemRec, linkIdx: linkRec.idx });
                }
            }

            // ── Available column ──
            const allItems = itemTable.all();
            let filtered = allItems;

            if (options.searchable !== false) {
                // Search bar inside Available column
                const searchWrap = document.createElement('div');
                searchWrap.className = 'ui-kanban-column ui-mn-kanban-available';

                const searchHeader = document.createElement('div');
                searchHeader.className = 'ui-kanban-column-header';

                const searchLabel = document.createElement('span');
                searchLabel.className = 'ui-kanban-column-label';
                searchLabel.textContent = 'Available';
                searchHeader.appendChild(searchLabel);

                const searchCount = document.createElement('span');
                searchCount.className = 'ui-kanban-column-count';
                searchCount.textContent = String(allItems.length);
                searchHeader.appendChild(searchCount);

                searchWrap.appendChild(searchHeader);

                // Search input
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = 'Search...';
                searchInput.value = searchTerm;
                searchInput.className = 'ui-input ui-input-sm';
                searchInput.style.cssText = 'margin: var(--ui-space-2); width: calc(100% - var(--ui-space-4)); box-sizing: border-box;';
                searchInput.addEventListener('input', () => {
                    searchTerm = searchInput.value;
                    refresh();
                });
                searchWrap.appendChild(searchInput);

                const list = document.createElement('div');
                list.className = 'ui-kanban-list';

                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    filtered = allItems.filter(r => itemTable.getLabel(r).toLowerCase().includes(term));
                }

                if (filtered.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'ui-kanban-card-subtitle';
                    empty.style.cssText = 'text-align:center; padding: var(--ui-space-3);';
                    empty.textContent = allItems.length === 0 ? 'No items available' : 'No matches';
                    list.appendChild(empty);
                } else {
                    const visible = filtered.slice(0, MAX_VISIBLE);
                    for (let i = 0; i < visible.length; i++) {
                        list.appendChild(_buildCard(visible[i], itemTable, i, {
                            sourceColumn: 'available'
                        }));
                    }
                    if (filtered.length > MAX_VISIBLE) {
                        const more = document.createElement('div');
                        more.className = 'ui-kanban-card-subtitle';
                        more.style.cssText = 'text-align:center; padding: var(--ui-space-2);';
                        more.textContent = `${filtered.length - MAX_VISIBLE} more...`;
                        list.appendChild(more);
                    }
                }

                searchWrap.appendChild(list);
                wrapper.appendChild(searchWrap);

                // Re-focus search after refresh
                requestAnimationFrame(() => {
                    const newInput = wrapper.querySelector('.ui-mn-kanban-available input');
                    if (newInput && searchTerm) {
                        newInput.focus();
                        newInput.setSelectionRange(searchTerm.length, searchTerm.length);
                    }
                });
            }

            // ── Group columns ──
            for (const group of groups) {
                const items = groupItems[group.idx] || [];
                const itemRecords = items.map(i => i.itemRec);
                const groupLabel = groupTable.getLabel(group);

                const col = _buildColumn(groupLabel, '', itemRecords, itemTable, {
                    droppable: true,
                    removable: true,
                    sourceColumn: String(group.idx),
                    emptyText: 'Drop here',
                    onRemove: (itemIdx) => {
                        // Find the link record for this item in this group
                        const entry = items.find(i => i.itemRec.idx === itemIdx);
                        if (entry) that.table.delete(entry.linkIdx, { origin: that });
                    },
                    onDrop: (itemIdx) => {
                        // Duplicate check
                        const exists = that.table.find(r =>
                            String(r.get(groupField)) === String(group.idx) &&
                            String(r.get(itemField)) === String(itemIdx)
                        );
                        if (!exists) {
                            that.table.create({
                                [groupField]: group.idx,
                                [itemField]: itemIdx
                            }, { origin: that });
                        }
                    }
                });
                wrapper.appendChild(col);
            }
        }

        refresh();

        // Re-render on table changes
        this.table.on('created', () => refresh());
        this.table.on('deleted', () => refresh());
        groupTable.on('created', () => refresh());
        groupTable.on('deleted', () => refresh());
        itemTable.on('created', () => refresh());
        itemTable.on('deleted', () => refresh());

        const ref = { type: 'mnKanban', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // _buildMnToggle (internal — called by bindMnEditor with mode:'toggle')
    // ─────────────────────────────────────────────────────────────────────────

    _buildMnToggle(container, fkCols, links, options) {
        const that = this;
        const MAX_VISIBLE = 20;

        // Extra columns: non-PK, non-FK columns from the link table schema
        const fkFields = new Set(fkCols.map(fk => fk.field));
        const extraCols = [];
        for (const [name, def] of Object.entries(this.table.schema)) {
            if (def.primaryKey || name === this.table.primaryKey) continue;
            if (fkFields.has(name)) continue;
            extraCols.push({ field: name, def });
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-mn-toggle';
        wrapper.style.cssText = 'padding: 0.5rem;';
        container.appendChild(wrapper);

        let searchTerm = '';

        function refresh() {
            wrapper.innerHTML = '';

            // Resolve parentFk/itemFk each refresh (fkFilter changes on parent selection)
            const fkFilter = that._fkFilter;
            const parentFk = fkFilter
                ? fkCols.find(fk => fk.field === fkFilter.field)
                : null;
            const itemFk = parentFk
                ? fkCols.find(fk => fk.field !== fkFilter.field)
                : null;
            const itemTable = itemFk ? links[itemFk.field].table : null;

            if (!fkFilter || !parentFk || !itemTable) {
                wrapper.innerHTML = '<div style="color:#9ca3af;font-size:0.8rem;padding:0.5rem;">Select a record</div>';
                return;
            }

            const parentId = fkFilter.value;

            // Assigned: link records matching parent FK
            const linkRecords = that.table.all().filter(r =>
                String(r.get(fkFilter.field)) === String(parentId)
            );
            const assignedItemIds = new Set(linkRecords.map(r => r.get(itemFk.field)));

            // ── Assigned section ──
            const assignedHeader = document.createElement('div');
            assignedHeader.style.cssText = 'font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:0.5rem;';
            assignedHeader.textContent = `Assigned (${linkRecords.length})`;
            wrapper.appendChild(assignedHeader);

            const _mnColors = ['primary','secondary','accent','info','success','warning'];
            if (linkRecords.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'color:#9ca3af;font-size:0.75rem;padding:0.25rem 0;margin-bottom:0.75rem;';
                empty.textContent = 'None assigned';
                wrapper.appendChild(empty);
            } else {
                for (let _ai = 0; _ai < linkRecords.length; _ai++) {
                    const linkRec = linkRecords[_ai];
                    const itemId = linkRec.get(itemFk.field);
                    const itemRec = itemTable.read(itemId);
                    const label = itemRec ? itemTable.getLabel(itemRec) : `#${itemId}`;

                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.5rem;margin-bottom:0.25rem;background:var(--ui-gray-50,#f9fafb);border-radius:4px;font-size:0.8rem;';

                    // Avatar
                    const avatar = document.createElement('div');
                    avatar.className = 'ui-avatar ui-avatar-xs ui-avatar-' + _mnColors[_ai % _mnColors.length];
                    avatar.textContent = label.charAt(0).toUpperCase();
                    row.appendChild(avatar);

                    // Item label
                    const labelSpan = document.createElement('span');
                    labelSpan.className = 'ui-list-item-title';
                    labelSpan.style.cssText = 'flex:1;';
                    labelSpan.textContent = label;
                    row.appendChild(labelSpan);

                    // Extra column controls
                    for (const col of extraCols) {
                        const val = linkRec.get(col.field);
                        const opts = col.def.options || col.def.enum;
                        if (opts && Array.isArray(opts)) {
                            // Editable dropdown
                            const sel = document.createElement('select');
                            sel.style.cssText = 'font-size:0.7rem;padding:0.15rem 0.3rem;border:1px solid #d1d5db;border-radius:3px;background:#fff;color:#374151;';
                            for (const o of opts) {
                                const opt = document.createElement('option');
                                opt.value = o;
                                opt.textContent = o;
                                if (String(val) === String(o)) opt.selected = true;
                                sel.appendChild(opt);
                            }
                            sel.addEventListener('change', () => {
                                linkRec.set(col.field, sel.value, { origin: that });
                            });
                            row.appendChild(sel);
                        } else if (val !== undefined && val !== null && val !== '') {
                            // Read-only badge
                            const badge = document.createElement('span');
                            badge.style.cssText = 'font-size:0.65rem;background:#e5e7eb;color:#6b7280;padding:0.1rem 0.4rem;border-radius:3px;';
                            badge.textContent = val;
                            row.appendChild(badge);
                        }
                    }

                    // Remove button
                    const removeBtn = document.createElement('button');
                    removeBtn.style.cssText = 'background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.4rem;border-radius:3px;';
                    removeBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
                    removeBtn.addEventListener('click', () => {
                        that.table.delete(linkRec.idx, { origin: that });
                    });
                    row.appendChild(removeBtn);

                    wrapper.appendChild(row);
                }
            }

            // ── Available section ──
            const allItems = itemTable.all();
            const available = allItems.filter(r => !assignedItemIds.has(r.idx));

            const availHeader = document.createElement('div');
            availHeader.style.cssText = 'font-size:0.8rem;font-weight:600;color:#374151;margin:1rem 0 0.5rem;';
            availHeader.textContent = 'Available';
            wrapper.appendChild(availHeader);

            // Search input
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search...';
            searchInput.value = searchTerm;
            searchInput.style.cssText = 'width:100%;padding:0.3rem 0.5rem;font-size:0.8rem;border:1px solid #d1d5db;border-radius:4px;margin-bottom:0.5rem;box-sizing:border-box;';
            searchInput.addEventListener('input', () => {
                searchTerm = searchInput.value;
                renderAvailable();
            });
            wrapper.appendChild(searchInput);

            const availList = document.createElement('div');
            wrapper.appendChild(availList);

            function renderAvailable() {
                availList.innerHTML = '';
                const term = searchTerm.toLowerCase();
                const filtered = term
                    ? available.filter(r => itemTable.getLabel(r).toLowerCase().includes(term))
                    : available;

                const visible = filtered.slice(0, MAX_VISIBLE);
                for (let _vi = 0; _vi < visible.length; _vi++) {
                    const item = visible[_vi];
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.5rem;margin-bottom:0.25rem;background:var(--ui-gray-50,#f9fafb);border-radius:4px;font-size:0.8rem;border:1px dashed var(--ui-gray-200,#e5e7eb);';

                    // Avatar
                    const avLabel = itemTable.getLabel(item);
                    const av = document.createElement('div');
                    av.className = 'ui-avatar ui-avatar-xs ui-avatar-' + _mnColors[_vi % _mnColors.length];
                    av.style.opacity = '0.5';
                    av.textContent = avLabel.charAt(0).toUpperCase();
                    row.appendChild(av);

                    const lbl = document.createElement('span');
                    lbl.style.cssText = 'flex:1;color:var(--ui-gray-500,#6b7280);';
                    lbl.textContent = avLabel;
                    row.appendChild(lbl);

                    const addBtn = document.createElement('button');
                    addBtn.style.cssText = 'background:#10b981;color:white;border:none;cursor:pointer;font-size:0.65rem;padding:0.2rem 0.5rem;border-radius:3px;font-weight:600;';
                    addBtn.innerHTML = '<i class="fas fa-plus" style="margin-right:0.2rem;"></i>Add';
                    addBtn.addEventListener('click', () => {
                        const data = { [fkFilter.field]: parentId, [itemFk.field]: item.idx };
                        // Check for duplicate
                        const exists = that.table.find(r =>
                            String(r.get(fkFilter.field)) === String(parentId) &&
                            String(r.get(itemFk.field)) === String(item.idx)
                        );
                        if (!exists) that.table.create(data, { origin: that });
                    });
                    row.appendChild(addBtn);

                    availList.appendChild(row);
                }

                if (filtered.length > MAX_VISIBLE) {
                    const more = document.createElement('div');
                    more.style.cssText = 'color:#9ca3af;font-size:0.75rem;padding:0.25rem 0.5rem;';
                    more.textContent = `${filtered.length - MAX_VISIBLE} more...`;
                    availList.appendChild(more);
                }

                if (filtered.length === 0) {
                    const none = document.createElement('div');
                    none.style.cssText = 'color:#9ca3af;font-size:0.75rem;padding:0.25rem 0.5rem;';
                    none.textContent = available.length === 0 ? 'All items assigned' : 'No matches';
                    availList.appendChild(none);
                }
            }

            renderAvailable();
        }

        refresh();

        // Re-render on any table change (create/delete)
        this.table.on('created', () => refresh());
        this.table.on('deleted', () => refresh());

        const ref = { type: 'mnToggle', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bindToggleList
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Reusable "assigned vs available" toggle list, driven by a parent table's selection.
     *
     * When the parent record changes, the list splits items into two sections:
     * "Assigned" (with remove buttons) and "Available" (with add buttons).
     *
     * @param {HTMLElement} container - Target element
     * @param {Object} options
     * @param {PublonTable} options.parentTable - Table whose selection drives the filter
     * @param {PublonTable} options.itemTable - Source of all available items
     * @param {Function} options.getAssigned - (parentId) => Array of item records currently assigned
     * @param {Function} options.onAssign - (parentId, itemId) => void — called when user clicks Add
     * @param {Function} options.onRemove - (parentId, itemId) => void — called when user clicks Remove
     * @param {string} [options.assignedTitle] - Header for assigned section (default: 'Assigned')
     * @param {string} [options.availableTitle] - Header for available section (default: 'Available')
     * @param {string} [options.icon] - FontAwesome icon class (default: 'fa-tag')
     * @param {string} [options.emptyText] - Text when nothing assigned (default: 'None assigned')
     * @param {string} [options.noParentText] - Text when no parent selected
     * @returns {{ type: string, refresh: Function }}
     */
    bindToggleList(container, options = {}) {
        const that = this;
        const parentTable = options.parentTable;
        const itemTable = options.itemTable;
        const getAssigned = options.getAssigned;
        const onAssign = options.onAssign;
        const onRemove = options.onRemove;
        const assignedTitle = options.assignedTitle || 'Assigned';
        const availableTitle = options.availableTitle || 'Available';
        const icon = options.icon || 'fa-tag';
        const emptyText = options.emptyText || 'None assigned';
        const noParentText = options.noParentText || 'Select a record';

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-binding-toggle-list';
        wrapper.style.cssText = 'padding:0.5rem;';
        container.appendChild(wrapper);

        function refresh() {
            wrapper.innerHTML = '';
            const sel = parentTable.getSelectedOne();
            if (!sel) {
                wrapper.innerHTML = `<div style="color:#9ca3af;font-size:0.8rem;padding:0.5rem;">${noParentText}</div>`;
                return;
            }

            const parentId = sel.idx;
            const assigned = getAssigned(parentId);
            const assignedIds = new Set(assigned.map(r => r.idx));
            const allItems = itemTable.all();
            const available = allItems.filter(r => !assignedIds.has(r.idx));

            // ── Assigned section ──
            const curHeader = document.createElement('div');
            curHeader.style.cssText = 'font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:0.5rem;';
            curHeader.textContent = assignedTitle;
            wrapper.appendChild(curHeader);

            if (assigned.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'color:#9ca3af;font-size:0.75rem;padding:0.25rem 0;margin-bottom:0.75rem;';
                empty.textContent = emptyText;
                wrapper.appendChild(empty);
            } else {
                assigned.forEach(item => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.5rem;margin-bottom:0.25rem;background:#f0f9ff;border-radius:4px;font-size:0.8rem;';
                    row.innerHTML = `<i class="fas ${icon}" style="color:#3b82f6;font-size:0.7rem;"></i><span style="flex:1;color:#1e40af;font-weight:500;">${itemTable.getLabel(item)}</span>`;
                    const removeBtn = document.createElement('button');
                    removeBtn.style.cssText = 'background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.7rem;padding:0.2rem 0.4rem;border-radius:3px;';
                    removeBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
                    removeBtn.addEventListener('click', () => {
                        onRemove(parentId, item.idx);
                        refresh();
                    });
                    row.appendChild(removeBtn);
                    wrapper.appendChild(row);
                });
            }

            // ── Available section ──
            if (available.length > 0) {
                const availHeader = document.createElement('div');
                availHeader.style.cssText = 'font-size:0.8rem;font-weight:600;color:#374151;margin:1rem 0 0.5rem;';
                availHeader.textContent = availableTitle;
                wrapper.appendChild(availHeader);

                available.forEach(item => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.5rem;margin-bottom:0.25rem;background:#f9fafb;border-radius:4px;font-size:0.8rem;border:1px dashed #e5e7eb;';
                    row.innerHTML = `<i class="fas ${icon}" style="color:#9ca3af;font-size:0.7rem;"></i><span style="flex:1;color:#6b7280;">${itemTable.getLabel(item)}</span>`;
                    const addBtn = document.createElement('button');
                    addBtn.style.cssText = 'background:#10b981;color:white;border:none;cursor:pointer;font-size:0.65rem;padding:0.2rem 0.5rem;border-radius:3px;font-weight:600;';
                    addBtn.innerHTML = '<i class="fas fa-plus" style="margin-right:0.2rem;"></i>Assign';
                    addBtn.addEventListener('click', () => {
                        onAssign(parentId, item.idx);
                        refresh();
                    });
                    row.appendChild(addBtn);
                    wrapper.appendChild(row);
                });
            }
        }

        const unsubSel = parentTable.on('selected', () => refresh());
        const unsubDesel = parentTable.on('deselected', () => refresh());
        this._subs.push(unsubSel, unsubDesel);

        refresh();

        const ref = { type: 'toggleList', container: wrapper, refresh };
        this._components.push(ref);
        return ref;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Static: openCreateModal
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Open a modal to create a new record — general-purpose convenience.
     * Creates a UIBinding, binds editor in modal mode, opens for creation.
     * Form submission flows through UIBinding → table.create() → EventBus.
     */

    // ─────────────────────────────────────────────────────────────────────────
    // Static: renderMetricChip
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Render a static (non-reactive) metric chip into a container.
     * Use for pre-computed KPI values that don't bind to a table.
     * For reactive metrics bound to a table, use bindMetric() instead.
     *
     * @param {HTMLElement} container - Where to append the chip
     * @param {Object} options
     * @param {string} options.icon - FontAwesome class (e.g. 'fa-vial')
     * @param {string|number} options.value - The metric value
     * @param {string} options.label - Label text
     * @param {string} [options.color] - CSS color value (default: primary)
     * @returns {HTMLElement} The chip element
     */
    static renderMetricChip(container, { icon, value, label, color }) {
        const chip = document.createElement('div');
        chip.className = 'ui-metric-chip';
        const c = color || 'var(--ui-primary)';
        chip.innerHTML = `
            <span class="ui-metric-chip-icon-circle" style="--_mc-color:${c};">
                <i class="fas ${icon}"></i>
            </span>
            <span class="ui-metric-chip-value">${value}</span>
            <span class="ui-metric-chip-label">${label}</span>
        `;
        if (container) container.appendChild(chip);
        return chip;
    }

    /**
     * @param {PublonTable} table - The table to create a record in
     * @param {Object} [options]
     * @param {Publome} [options.publome] - Parent publome (for FK resolution)
     * @param {string} [options.title] - Modal title (defaults to "New {tableName}")
     * @param {string} [options.size] - Modal size ('sm'|'md'|'lg'), default 'lg'
     * @returns {{ binding: UIBinding, editor: Object }}
     *
     * @example
     * UIBinding.openCreateModal(services.specimen.table('specimen'), {
     *     publome: services.specimen,
     *     title: 'Register New Sample'
     * });
     */
    static openCreateModal(table, options = {}) {
        const binding = new UIBinding(table, { publome: options.publome });
        const editor = binding.bindEditor(null, {
            mode: 'modal',
            hideCreate: true,
            modalTitle: options.title || `New ${table.name}`,
            modalSize: options.size || 'lg'
        });
        editor.openCreate();
        return { binding, editor };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Static: bindPublome
    // ─────────────────────────────────────────────────────────────────────────

    static bindPublome(publome, container, options = {}) {
        const exclude = options.exclude || [];
        const overrides = options.overrides || {};
        const bindings = {};
        const childWiring = [];

        // Classify tables
        const tableNames = publome.getTableNames().filter(n => !exclude.includes(n));

        const tableTypes = {};
        for (const name of tableNames) {
            const table = publome.table(name);
            const fkCols = [];
            const dataCols = [];

            for (const [col, def] of Object.entries(table.schema)) {
                if (def.primaryKey || col === table.primaryKey) continue;
                const refTable = def.refTable || (def.ref && def.ref.table);
                if (refTable) {
                    fkCols.push({ field: col, refTable });
                } else {
                    dataCols.push(col);
                }
            }

            if (fkCols.length >= 2 && dataCols.length === 0) {
                tableTypes[name] = { type: 'link', fks: fkCols };
            } else if (fkCols.length > 0) {
                tableTypes[name] = { type: 'child', fks: fkCols };
            } else {
                tableTypes[name] = { type: 'standalone', fks: [] };
            }
        }

        // Create bindings for non-link tables
        const tabDefs = [];
        for (const name of tableNames) {
            const info = tableTypes[name];
            if (info.type === 'link') continue;

            const binding = new UIBinding(publome.table(name), {
                publome,
                ...overrides[name]
            });
            bindings[name] = binding;
            tabDefs.push({ name, binding, info });
        }

        // Wire parent-child relationships
        for (const { name, binding, info } of tabDefs) {
            if (info.type === 'child') {
                for (const fk of info.fks) {
                    if (bindings[fk.refTable]) {
                        bindings[fk.refTable].bindChildTable(binding, fk.field);
                    }
                }
            }
        }

        // Build UI: tabs for each non-link table, plus link tables
        const tabConfig = {};
        for (const { name } of tabDefs) {
            tabConfig[name] = name;
        }
        for (const name of tableNames) {
            if (tableTypes[name].type === 'link') {
                tabConfig[name] = name;
            }
        }

        // Create tabs if uiTabs available, otherwise stack sections
        const hasMultipleTabs = Object.keys(tabConfig).length > 1;
        let tabContainer = container;

        if (hasMultipleTabs && typeof uiTabs !== 'undefined') {
            const tabs = new uiTabs({
                parent: container,
                tabs: Object.keys(tabConfig).map(name => ({
                    id: name,
                    label: name
                }))
            });

            // Use first tab's content area
            tabContainer = tabs;
        }

        // Render each table's UI
        for (const name of Object.keys(tabConfig)) {
            const section = document.createElement('div');
            section.id = `uibinding-section-${name}`;
            section.style.cssText = 'padding: 0.5rem;';

            if (hasMultipleTabs && tabContainer.el) {
                // Find or create tab content
                const tabPanel = tabContainer.el.querySelector(`[data-tab="${name}"]`);
                if (tabPanel) {
                    tabPanel.appendChild(section);
                } else {
                    container.appendChild(section);
                }
            } else {
                const heading = document.createElement('h3');
                heading.textContent = name;
                heading.style.cssText = 'margin: 1rem 0 0.5rem; font-weight: 600;';
                container.appendChild(heading);
                container.appendChild(section);
            }

            if (tableTypes[name].type === 'link') {
                const binding = new UIBinding(publome.table(name), { publome });
                bindings[name] = binding;
                binding.bindMnEditor(section);
            } else {
                const opts = overrides[name] || {};
                bindings[name].bindSelectEditor(section, {
                    editor: opts.editor || 'modal',
                    ...opts
                });
            }
        }

        const refresh = () => {
            for (const b of Object.values(bindings)) b._refreshAll();
        };

        const destroy = () => {
            for (const b of Object.values(bindings)) b.destroy();
        };

        return { bindings, refresh, destroy };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    destroy() {
        this._subs.forEach(unsub => unsub());
        this._subs = [];
        this._components = [];
        super.destroy();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIBinding;
}
if (typeof window !== 'undefined') {
    window.UIBinding = UIBinding;
}
