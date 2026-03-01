/**
 * UI Component System
 * A modern, class-based UI component library with self-describing components,
 * auto-generated edit forms, and event-driven architecture.
 */

// ============================================
// EVENT BUS
// ============================================

class EventBus {
  constructor() {
    this._events = new Map();
  }

  on(event, callback) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this._events.has(event)) {
      this._events.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this._events.has(event)) {
      this._events.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event handler for "${event}":`, e);
        }
      });
    }
  }

  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }

  clear() {
    this._events.clear();
  }
}

// Global event bus
const globalBus = new EventBus();

// ============================================
// BASE UI CLASS
// ============================================

class ui {
  // Static registry for all component types
  static registry = {};

  // Global event bus
  static bus = globalBus;

  // Edit mode state
  static editMode = false;
  static selectedComponent = null;
  static propertiesPanel = null;

  // ID counter for auto-generated IDs
  static _idCounter = 0;

  // ----------------------------------------
  // Variant Presets (styling)
  // ----------------------------------------
  static variantPresets = {
    default:  { radius: 'md', shadow: 'sm', border: 'subtle' },
    minimal:  { radius: 'none', shadow: 'none', border: 'none' },
    soft:     { radius: 'lg', shadow: 'none', border: 'none', bg: 'light' },
    outlined: { radius: 'md', shadow: 'none', border: 'solid' },
    elevated: { radius: 'md', shadow: 'lg', border: 'none' },
    flat:     { radius: 'sm', shadow: 'none', border: 'none', bg: 'muted' },
    rounded:  { radius: 'full', shadow: 'sm', border: 'subtle' },
    glass:    { radius: 'lg', shadow: 'md', border: 'none', bg: 'glass' }
  };

  // ----------------------------------------
  // Size Presets (scaling)
  // ----------------------------------------
  static sizePresets = {
    xs: { scale: 0.75, fontSize: 'xs', titleSize: 'sm', padding: 'xs', gap: 'xs' },
    sm: { scale: 0.875, fontSize: 'sm', titleSize: 'base', padding: 'sm', gap: 'sm' },
    md: { scale: 1, fontSize: 'base', titleSize: 'lg', padding: 'md', gap: 'md' },
    lg: { scale: 1.125, fontSize: 'lg', titleSize: 'xl', padding: 'lg', gap: 'lg' },
    xl: { scale: 1.25, fontSize: 'xl', titleSize: '2xl', padding: 'xl', gap: 'xl' }
  };

  // ----------------------------------------
  // Theme Presets (hyper-parameter based)
  // ----------------------------------------
  static themePresets = {
    default:  { 'hp-density': 1, 'hp-corner-scale': 1.0, 'hp-shadow-intensity': 0.05, 'hp-shadow-blur': 0.8, 'hp-border-scale': 0.5, 'hp-text-scale': 1 },
    refined:  { 'hp-density': 0.9, 'hp-text-scale': 0.875, 'hp-range': 0.85, 'hp-corner-scale': 1.25, 'hp-border-scale': 0.3, 'hp-shadow-intensity': 0.03, 'hp-shadow-blur': 0.6, 'hp-hover-intensity': 0.3, 'hp-line-height': 1.45, 'hp-style-weight': 0.6, 'hp-sharpness': 1.2, 'hp-transition-speed': 0.8 },
    compact:  { 'hp-density': 0.8, 'hp-corner-scale': 0.5, 'hp-shadow-intensity': 0.06, 'hp-border-scale': 0.5, 'hp-text-scale': 1 },
    spacious: { 'hp-density': 1.25, 'hp-corner-scale': 1.0, 'hp-shadow-intensity': 0.08, 'hp-border-scale': 0.3, 'hp-text-scale': 1 },
    minimal:  { 'hp-density': 1, 'hp-corner-scale': 0.25, 'hp-shadow-intensity': 0, 'hp-border-scale': 0, 'hp-text-scale': 1 },
    rounded:  { 'hp-density': 1, 'hp-corner-scale': 1.5, 'hp-shadow-intensity': 0.06, 'hp-border-scale': 0.3, 'hp-text-scale': 1 },
    sharp:    { 'hp-density': 0.9, 'hp-corner-scale': 0, 'hp-shadow-intensity': 0.04, 'hp-border-scale': 1.0, 'hp-text-scale': 1 }
  };

  // Current theme state
  static _theme = {
    darkMode: false
  };

  /**
   * Set theme configuration via hyper-parameters
   * @param {Object|string} config - Theme preset name or object with --hp-* values
   * @example
   *   ui.setTheme('compact');
   *   ui.setTheme({ 'hp-density': 0.8, 'hp-corner-scale': 0.5, darkMode: true });
   */
  static setTheme(config) {
    // If string, use preset
    if (typeof config === 'string') {
      config = ui.themePresets[config] || ui.themePresets.default;
    }

    // Merge with current theme
    ui._theme = { ...ui._theme, ...config };
    const root = document.documentElement;

    // Apply all --hp-* values directly to root
    Object.entries(config).forEach(([key, value]) => {
      if (key.startsWith('hp-')) {
        root.style.setProperty(`--${key}`, value);
      }
    });

    // Apply dark mode
    if (config.darkMode !== undefined) {
      if (config.darkMode) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.removeAttribute('data-theme');
      }
    }

    // Apply custom fonts
    if (config.fontHeading) {
      root.style.setProperty('--ui-font-heading', config.fontHeading);
    }
    if (config.fontBody) {
      root.style.setProperty('--ui-font-body', config.fontBody);
    }

    // Emit theme change event
    ui.bus.emit('themeChanged', { theme: ui._theme });
  }

  /**
   * Get current theme
   */
  static getTheme() {
    return { ...ui._theme };
  }

  /**
   * Toggle dark mode
   */
  static toggleDarkMode() {
    ui.setTheme({ darkMode: !ui._theme.darkMode });
  }

  // ----------------------------------------
  // Template Configs (override in subclasses)
  // ----------------------------------------
  static templateConfigs = {
    default: {
      fields: [],  // Fields specific to this template
      defaults: {} // Default values for this template
    }
  };

  // Config schema - override in subclasses
  static configSchema = {
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  constructor(settings = {}) {
    // Generate unique ID if not provided
    this.id = settings.id || `ui-${++ui._idCounter}`;

    // Store original settings
    this.settings = { ...settings };

    // Component type
    this.type = settings.type || this.constructor.name;

    // Resolve settings (template → variant → props)
    this._resolved = this._resolveSettings(settings);

    // Parent reference
    this.parent = null;
    if (settings.parentId) {
      this.parent = document.getElementById(settings.parentId);
    } else if (settings.parent) {
      // Auto-unwrap El/wrapper objects to their DOM element
      this.parent = settings.parent.domElement || settings.parent;
    }

    // Children map
    this.children = new Map();

    // Component-level event bus
    this.bus = new EventBus();

    // DOM element (created on render)
    this.el = null;

    // State
    this._mounted = false;
    this._destroyed = false;

    // Auto-render if parent is provided
    if (this.parent) {
      this.render();
    }
  }

  // ----------------------------------------
  // Settings Resolution
  // ----------------------------------------

  /**
   * Resolve settings with template → variant → props priority
   * @param {Object} settings - Raw settings from constructor
   * @returns {Object} - Fully resolved settings
   */
  _resolveSettings(settings) {
    const schema = this.constructor.configSchema || {};
    const templateConfigs = this.constructor.templateConfigs || {};

    // 1. Start with schema defaults
    const defaults = this._getSchemaDefaults(schema);

    // 2. Get template (use setting or default)
    const template = settings.template || defaults.template || 'default';
    const templateConfig = templateConfigs[template] || templateConfigs.default || {};
    const templateDefaults = templateConfig.defaults || {};

    // 3. Get variant (use setting or default)
    const variant = settings.variant || templateDefaults.variant || defaults.variant || 'default';
    const variantPreset = ui.variantPresets[variant] || {};

    // 4. Get size preset
    const size = settings.size || templateDefaults.size || defaults.size || 'md';
    const sizePreset = ui.sizePresets[size] || ui.sizePresets.md;

    // 5. Merge in order: defaults < template < variant < size < explicit settings
    return {
      ...defaults,
      ...templateDefaults,
      ...variantPreset,
      ...sizePreset,
      ...settings,
      template,
      variant,
      size
    };
  }

  /**
   * Get default values from configSchema
   */
  _getSchemaDefaults(schema) {
    const defaults = {};
    for (const [key, config] of Object.entries(schema)) {
      if (config.default !== undefined) {
        defaults[key] = config.default;
      }
    }
    return defaults;
  }

  /**
   * Get visible fields for current template (for edit mode)
   * @returns {string[]} - Array of field names to show
   */
  _getVisibleFields() {
    const schema = this.constructor.configSchema || {};
    const templateConfigs = this.constructor.templateConfigs || {};
    const currentTemplate = this._resolved.template || 'default';
    const templateConfig = templateConfigs[currentTemplate] || {};
    const templateFields = templateConfig.fields || [];

    const visibleFields = [];

    for (const [key, config] of Object.entries(schema)) {
      // Always show template and variant selectors
      if (key === 'template' || key === 'variant' || key === 'size') {
        visibleFields.push(key);
        continue;
      }

      // Show if field has no template restriction
      if (!config.templates) {
        visibleFields.push(key);
        continue;
      }

      // Show if field's templates array includes current template
      if (config.templates.includes(currentTemplate)) {
        visibleFields.push(key);
        continue;
      }

      // Show if field is in templateConfig.fields
      if (templateFields.includes(key)) {
        visibleFields.push(key);
      }
    }

    return visibleFields;
  }

  /**
   * Get fields grouped by their group property
   * @returns {Object} - { groupName: [fields...] }
   */
  _getFieldsByGroup() {
    const schema = this.constructor.configSchema || {};
    const visibleFields = this._getVisibleFields();
    const groups = {
      structure: [],
      content: [],
      appearance: [],
      advanced: []
    };

    for (const fieldName of visibleFields) {
      const config = schema[fieldName];
      if (!config) continue;

      const group = config.group || 'content';
      if (!groups[group]) groups[group] = [];
      groups[group].push({ name: fieldName, ...config });
    }

    return groups;
  }

  /**
   * Apply theme classes to element based on resolved settings
   */
  _applyThemeClasses(el) {
    const s = this._resolved;

    // Apply radius
    if (s.radius && s.radius !== 'none') {
      el.classList.add(`ui-radius-${s.radius}`);
    }

    // Apply shadow
    if (s.shadow && s.shadow !== 'none') {
      el.classList.add(`ui-shadow-${s.shadow}`);
    }

    // Apply color scheme
    if (s.colorScheme) {
      el.classList.add(`ui-color-${s.colorScheme}`);
    }

    // Apply size
    if (s.size) {
      el.classList.add(`ui-size-${s.size}`);
    }

    // Apply font size
    if (s.fontSize) {
      el.classList.add(`ui-text-${s.fontSize}`);
    }
  }

  // ----------------------------------------
  // Core Methods
  // ----------------------------------------

  /**
   * Add a child component
   */
  add(config) {
    if (this._destroyed) {
      console.warn('Cannot add to destroyed component');
      return null;
    }

    const type = config.type || 'ui';
    const ComponentClass = ui.registry[type] || ui;

    // Create child with this component as parent
    const child = new ComponentClass({
      ...config,
      parent: this.el
    });

    // Store in children map
    this.children.set(child.id, child);

    // Emit event
    this.bus.emit('childAdded', { parent: this, child });
    ui.bus.emit('componentAdded', { parent: this, child });

    return child;
  }

  /**
   * Remove a child component
   */
  remove(id) {
    const child = this.children.get(id);
    if (child) {
      child.destroy();
      this.children.delete(id);
      this.bus.emit('childRemoved', { parent: this, childId: id });
    }
  }

  /**
   * Get a child by ID
   */
  get(id) {
    return this.children.get(id);
  }

  /**
   * Update component configuration
   */
  update(newConfig) {
    const oldConfig = { ...this.settings };
    this.settings = { ...this.settings, ...newConfig };

    // Re-resolve settings (template → variant → props)
    this._resolved = this._resolveSettings(this.settings);

    // Lifecycle hook
    this.onUpdate(oldConfig, this.settings);

    // Re-render
    if (this.el) {
      const newEl = this._createEl();
      this.el.replaceWith(newEl);
      this.el = newEl;
      this._bindEvents();
    }

    this.bus.emit('updated', { component: this, oldConfig, newConfig: this.settings });
  }

  /**
   * Render the component to DOM
   */
  render() {
    if (this._destroyed) {
      console.warn('Cannot render destroyed component');
      return;
    }

    // Lifecycle hook
    this.beforeRender();

    // Create element
    this.el = this._createEl();

    // Append to parent
    if (this.parent) {
      this.parent.appendChild(this.el);
    }

    // Lifecycle hook
    this.afterRender();

    // Bind events
    this._bindEvents();

    // Mark as mounted
    if (!this._mounted) {
      this._mounted = true;
      this.onMount();
      this.bus.emit('mounted', { component: this });
      ui.bus.emit('componentMounted', { component: this });
    }

    return this.el;
  }

  /** Alias for el — backward compat with BlUi component pattern */
  get domElement() { return this.el; }

  /**
   * Destroy the component
   */
  destroy() {
    if (this._destroyed) return;

    // Lifecycle hook
    this.onDestroy();

    // Destroy all children
    this.children.forEach(child => child.destroy());
    this.children.clear();

    // Remove from DOM
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }

    // Clear event bus
    this.bus.clear();

    // Mark as destroyed
    this._destroyed = true;
    this._mounted = false;

    ui.bus.emit('componentDestroyed', { component: this });
  }

  // ----------------------------------------
  // Lifecycle Hooks (override in subclasses)
  // ----------------------------------------

  beforeRender() {}
  afterRender() {}
  onMount() {}
  onUpdate(oldConfig, newConfig) {}
  onDestroy() {}

  // ----------------------------------------
  // Internal Methods
  // ----------------------------------------

  /**
   * Create the DOM element - override in subclasses
   */
  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.className = this._buildClassName();
    el.setAttribute('data-component-type', this.type);

    // In edit mode, add component class for selection
    if (ui.editMode) {
      el.classList.add('ui-component');
    }

    return el;
  }

  /**
   * Build CSS class string
   */
  _buildClassName() {
    const classes = ['ui'];

    // Add component-specific class
    const typeName = this.type.replace(/^ui/, '').toLowerCase();
    if (typeName) {
      classes.push('ui-' + typeName);
    }

    // Add custom classes from settings
    if (this.settings.css) {
      classes.push(this.settings.css);
    }

    return classes.join(' ');
  }

  /**
   * Bind event listeners
   */
  _bindEvents() {
    if (!this.el) return;

    // Standard events
    this.el.addEventListener('click', (e) => {
      this.bus.emit('click', { component: this, event: e });
      ui.bus.emit('componentClick', { component: this, event: e });

      // Edit mode selection
      if (ui.editMode) {
        e.stopPropagation();
        ui.selectComponent(this);
      }
    });

    this.el.addEventListener('mouseenter', (e) => {
      this.bus.emit('hover', { component: this, event: e, entering: true });
    });

    this.el.addEventListener('mouseleave', (e) => {
      this.bus.emit('hover', { component: this, event: e, entering: false });
    });
  }

  // ----------------------------------------
  // Static Methods
  // ----------------------------------------

  /**
   * Register a component type
   */
  static register(name, componentClass) {
    ui.registry[name] = componentClass;
  }

  /**
   * Create a component instance by name
   * @param {string} name - Component class name (e.g., 'uiButton')
   * @param {Object} options - Configuration options for the component
   * @returns {Object} Component instance with .el property
   * @example
   *   const btn = ui.create('uiButton', { label: 'Click', variant: 'primary' });
   *   container.appendChild(btn.el);
   */
  static create(name, options = {}) {
    // First check registry
    let ComponentClass = ui.registry[name];
    
    // If not in registry, try global
    if (!ComponentClass && typeof window !== 'undefined') {
      ComponentClass = window[name];
    }
    
    if (!ComponentClass) {
      throw new Error(`Unknown component: ${name}. Did you forget to register it?`);
    }
    
    return new ComponentClass(options);
  }

  /**
   * Enable edit mode
   */
  static enableEditMode() {
    ui.editMode = true;
    document.body.classList.add('ui-edit-mode');
    ui.showPropertiesPanel();
    ui.bus.emit('editModeEnabled');
  }

  /**
   * Disable edit mode
   */
  static disableEditMode() {
    ui.editMode = false;
    document.body.classList.remove('ui-edit-mode');
    ui.hidePropertiesPanel();
    if (ui.selectedComponent) {
      ui.selectedComponent.el?.classList.remove('ui-selected');
      ui.selectedComponent = null;
    }
    ui.bus.emit('editModeDisabled');
  }

  /**
   * Toggle edit mode
   */
  static toggleEditMode() {
    if (ui.editMode) {
      ui.disableEditMode();
    } else {
      ui.enableEditMode();
    }
  }

  /**
   * Select a component for editing
   */
  static selectComponent(component) {
    // Deselect previous
    if (ui.selectedComponent) {
      ui.selectedComponent.el?.classList.remove('ui-selected');
    }

    // Select new
    ui.selectedComponent = component;
    component.el?.classList.add('ui-selected');

    // Update properties panel
    ui.updatePropertiesPanel(component);

    ui.bus.emit('componentSelected', { component });
  }

  /**
   * Show the properties panel
   */
  static showPropertiesPanel() {
    if (ui.propertiesPanel) return;

    const panel = document.createElement('div');
    panel.className = 'ui-properties-panel';
    panel.innerHTML = `
      <div class="ui-properties-header">
        <h3 class="ui-properties-title">Properties</h3>
        <button class="ui-modal-close" onclick="ui.toggleEditMode()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="ui-properties-body">
        <p class="ui-text-gray ui-text-sm">Click a component to edit its properties.</p>
      </div>
    `;

    document.body.appendChild(panel);
    ui.propertiesPanel = panel;
  }

  /**
   * Hide the properties panel
   */
  static hidePropertiesPanel() {
    if (ui.propertiesPanel) {
      ui.propertiesPanel.remove();
      ui.propertiesPanel = null;
    }
  }

  /**
   * Update the properties panel with component config
   */
  static updatePropertiesPanel(component) {
    if (!ui.propertiesPanel) return;

    const body = ui.propertiesPanel.querySelector('.ui-properties-body');
    const title = ui.propertiesPanel.querySelector('.ui-properties-title');

    title.textContent = component.type;
    body.innerHTML = '';

    // Generate form from configSchema
    const form = ui.generateEditForm(component);
    body.appendChild(form);
  }

  /**
   * Generate an edit form from a component's configSchema
   * Uses grouped sections and template-aware field visibility
   */
  static generateEditForm(component) {
    const schema = component.constructor.configSchema || {};
    const templateConfigs = component.constructor.templateConfigs || {};
    const form = document.createElement('form');
    form.className = 'ui-edit-form';
    form.addEventListener('submit', (e) => e.preventDefault());

    // Get fields grouped by section
    const groups = component._getFieldsByGroup();

    // Group labels for UI
    const groupLabels = {
      structure: 'Structure',
      content: 'Content',
      appearance: 'Appearance',
      advanced: 'Advanced'
    };

    // Build form by groups
    for (const [groupName, fields] of Object.entries(groups)) {
      if (fields.length === 0) continue;

      // Create section
      const section = document.createElement('div');
      section.className = 'ui-edit-section';
      section.dataset.group = groupName;

      // Section header (collapsible for advanced)
      const header = document.createElement('div');
      header.className = 'ui-edit-section-header';
      if (groupName === 'advanced') {
        header.classList.add('collapsible');
        header.innerHTML = `<span class="ui-edit-section-icon">▶</span> ${groupLabels[groupName] || groupName}`;
        header.addEventListener('click', () => {
          section.classList.toggle('collapsed');
          header.querySelector('.ui-edit-section-icon').textContent =
            section.classList.contains('collapsed') ? '▶' : '▼';
        });
        section.classList.add('collapsed');
      } else {
        header.textContent = groupLabels[groupName] || groupName;
      }
      section.appendChild(header);

      // Section body
      const body = document.createElement('div');
      body.className = 'ui-edit-section-body';

      // Sort fields by order if specified
      const sortedFields = [...fields].sort((a, b) => (a.order || 999) - (b.order || 999));

      for (const field of sortedFields) {
        const key = field.name;
        const config = field;

        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'ui-form-group';
        fieldGroup.dataset.field = key;

        const label = document.createElement('label');
        label.className = 'ui-form-label';
        label.textContent = config.label || key;
        label.setAttribute('for', 'edit-' + key);
        fieldGroup.appendChild(label);

        const input = ui._createFormField(key, config, component.settings[key]);
        input.id = 'edit-' + key;

        // Special handling for template dropdown - refresh form on change
        if (key === 'template') {
          input.addEventListener('change', (e) => {
            const value = ui._getFieldValue(input, config.type);
            component.update({ [key]: value });
            // Refresh the entire form to show/hide template-specific fields
            ui._refreshEditForm(form, component);
          });
        } else {
          // Standard two-way binding
          input.addEventListener('change', (e) => {
            const value = ui._getFieldValue(input, config.type);
            component.update({ [key]: value });
          });

          input.addEventListener('input', (e) => {
            if (config.type === 'text' || config.type === 'textarea' || config.type === 'number') {
              const value = ui._getFieldValue(input, config.type);
              component.update({ [key]: value });
            }
          });
        }

        fieldGroup.appendChild(input);

        if (config.description) {
          const hint = document.createElement('p');
          hint.className = 'ui-form-hint';
          hint.textContent = config.description;
          fieldGroup.appendChild(hint);
        }

        body.appendChild(fieldGroup);
      }

      section.appendChild(body);
      form.appendChild(section);
    }

    return form;
  }

  /**
   * Refresh edit form when template changes
   * Shows/hides fields based on new template selection
   */
  static _refreshEditForm(form, component) {
    const visibleFields = component._getVisibleFields();

    // Update visibility of all field groups
    const fieldGroups = form.querySelectorAll('.ui-form-group[data-field]');
    fieldGroups.forEach(group => {
      const fieldName = group.dataset.field;
      if (visibleFields.includes(fieldName)) {
        group.style.display = '';
      } else {
        group.style.display = 'none';
      }
    });
  }

  /**
   * Create a form field based on config type
   */
  static _createFormField(name, config, value) {
    const type = config.type || 'text';
    let input;

    switch (type) {
      case 'select':
        input = document.createElement('select');
        input.className = 'ui-select';
        (config.options || []).forEach(opt => {
          const option = document.createElement('option');
          // Support both string options and {value, label} objects
          if (typeof opt === 'object' && opt !== null) {
            option.value = opt.value ?? opt;
            option.textContent = opt.label ?? opt.value ?? opt;
            if (value === opt.value) option.selected = true;
          } else {
            option.value = opt;
            option.textContent = opt;
            if (value === opt) option.selected = true;
          }
          input.appendChild(option);
        });
        break;

      case 'checkbox':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!value;
        break;

      case 'textarea':
        input = document.createElement('textarea');
        input.className = 'ui-input';
        input.rows = 3;
        input.value = value ?? config.default ?? '';
        break;

      case 'number':
        input = document.createElement('input');
        input.type = 'number';
        input.className = 'ui-input';
        input.value = value ?? config.default ?? 0;
        if (config.min !== undefined) input.min = config.min;
        if (config.max !== undefined) input.max = config.max;
        if (config.step !== undefined) input.step = config.step;
        break;

      case 'color':
        input = document.createElement('input');
        input.type = 'color';
        input.value = value ?? config.default ?? '#000000';
        break;

      case 'slider':
        input = document.createElement('input');
        input.type = 'range';
        input.value = value ?? config.default ?? 50;
        if (config.min !== undefined) input.min = config.min;
        if (config.max !== undefined) input.max = config.max;
        if (config.step !== undefined) input.step = config.step;
        break;

      case 'hidden':
        input = document.createElement('input');
        input.type = 'hidden';
        input.value = value ?? config.default ?? '';
        break;

      case 'cardSelect':
        input = ui._createCardSelectField(name, config, value);
        break;

      case 'date':
      case 'datetime-local':
      case 'time':
      case 'email':
      case 'url':
      case 'password':
        input = document.createElement('input');
        input.type = type;
        input.className = 'ui-input';
        input.value = value ?? config.default ?? '';
        break;

      case 'text':
      default:
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'ui-input';
        input.value = value ?? config.default ?? '';
        break;
    }

    input.name = name;
    return input;
  }

  /**
   * Get value from a form field
   */
  static _getFieldValue(input, type) {
    switch (type) {
      case 'checkbox':
        return input.checked;
      case 'number':
      case 'slider':
        return parseFloat(input.value);
      default:
        return input.value;
    }
  }

  /**
   * Create a cardSelect field — single card that opens a picker modal.
   * Returns a wrapper div containing a hidden input + one display card.
   * Click the card → modal with search + paginated card grid.
   */
  static _createCardSelectField(name, config, value) {
    const options = config.options || [];
    const perPage = config.perPage || 10;

    // Wrapper — just a single clickable card
    const wrapper = document.createElement('div');
    wrapper.className = 'ui-card-select';
    wrapper.dataset.cardSelect = name;

    // Hidden input for form data
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = name;
    hidden.value = value ?? config.default ?? '';
    wrapper.appendChild(hidden);

    // Controller
    const ctrl = {
      options: options,
      perPage: perPage,
      updateDisplay() {
        const val = hidden.value;
        // Remove everything except the hidden input
        while (wrapper.children.length > 1) wrapper.removeChild(wrapper.lastChild);

        if (!val) {
          // Empty state: search icon card
          wrapper.innerHTML = '';
          wrapper.appendChild(hidden);
          const icon = document.createElement('div');
          icon.className = 'ui-card-select-icon';
          icon.innerHTML = '<i class="fas fa-search"></i>';
          wrapper.appendChild(icon);
          return;
        }
        const item = ctrl.options.find(o => String(o.value) === String(val));
        if (!item) {
          wrapper.innerHTML = '';
          wrapper.appendChild(hidden);
          const icon = document.createElement('div');
          icon.className = 'ui-card-select-icon';
          icon.innerHTML = '<i class="fas fa-question"></i>';
          wrapper.appendChild(icon);
          return;
        }
        // Selected state: show the item as a card
        const initials = (item.label || '?').split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const avatar = document.createElement('div');
        avatar.className = 'ui-card-select-avatar';
        avatar.textContent = initials;
        wrapper.appendChild(avatar);

        const info = document.createElement('div');
        info.className = 'ui-card-select-info';
        const title = document.createElement('div');
        title.className = 'ui-card-select-title';
        title.textContent = item.label;
        info.appendChild(title);
        if (item.subtitle) {
          const sub = document.createElement('div');
          sub.className = 'ui-card-select-subtitle';
          sub.textContent = item.subtitle;
          info.appendChild(sub);
        }
        wrapper.appendChild(info);

        // Search icon on the right
        const icon = document.createElement('div');
        icon.className = 'ui-card-select-icon';
        icon.innerHTML = '<i class="fas fa-search"></i>';
        wrapper.appendChild(icon);
      },
      setOptions(newOptions) {
        ctrl.options = newOptions;
        ctrl.updateDisplay();
      },
      openPicker() {
        ui._openCardSelectPicker(hidden, ctrl);
      }
    };
    wrapper._cardSelect = ctrl;

    // Initial display
    ctrl.updateDisplay();

    // Click anywhere on the card → open picker
    wrapper.addEventListener('click', () => ctrl.openPicker());

    // Watch for external value changes (from setData)
    const origDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(hidden, 'value', {
      get() { return origDescriptor.get.call(this); },
      set(v) {
        origDescriptor.set.call(this, v);
        ctrl.updateDisplay();
      }
    });

    return wrapper;
  }

  /**
   * HTML-escape helper
   */
  static _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  /**
   * Open the card select picker modal
   */
  static _openCardSelectPicker(hiddenInput, ctrl) {
    const options = ctrl.options;
    const perPage = ctrl.perPage;
    let searchTerm = '';
    let currentPage = 1;

    // Create modal
    const modal = new uiModal({
      parent: document.body,
      template: 'default',
      title: 'Select',
      size: 'lg'
    });

    const body = modal.getBody();
    body.innerHTML = '';

    // Search bar
    const searchWrap = document.createElement('div');
    searchWrap.className = 'ui-card-select-search';
    searchWrap.innerHTML = '<i class="fas fa-search"></i>';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Type to search...';
    searchWrap.appendChild(searchInput);
    body.appendChild(searchWrap);

    // Count info
    const countEl = document.createElement('div');
    countEl.className = 'ui-card-select-count';
    body.appendChild(countEl);

    // Card grid
    const grid = document.createElement('div');
    grid.className = 'ui-card-select-grid';
    body.appendChild(grid);

    // Pagination container
    const paginationWrap = document.createElement('div');
    paginationWrap.style.cssText = 'display:flex;justify-content:center;padding:var(--ui-space-2) 0';
    body.appendChild(paginationWrap);

    let pagination = null;

    function getFiltered() {
      if (!searchTerm) return options;
      const term = searchTerm.toLowerCase();
      return options.filter(o =>
        (o.label || '').toLowerCase().includes(term) ||
        (o.subtitle || '').toLowerCase().includes(term)
      );
    }

    function render() {
      const filtered = getFiltered();
      const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * perPage;
      const page = filtered.slice(start, start + perPage);

      // Count
      countEl.textContent = searchTerm
        ? filtered.length + ' of ' + options.length + ' results'
        : options.length + ' total';

      // Grid
      grid.innerHTML = '';
      if (page.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:var(--ui-space-4);color:var(--ui-gray-400);font-size:var(--ui-text-sm)">No matches found</div>';
      }
      page.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'ui-card-select-item';
        if (String(opt.value) === String(hiddenInput.value)) card.classList.add('active');

        const initials = (opt.label || '?').split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
        card.innerHTML =
          '<div class="ui-card-select-avatar">' + initials + '</div>' +
          '<div class="ui-card-select-info">' +
            '<div class="ui-card-select-title">' + ui._esc(opt.label) + '</div>' +
            (opt.subtitle ? '<div class="ui-card-select-subtitle">' + ui._esc(opt.subtitle) + '</div>' : '') +
          '</div>';

        card.addEventListener('click', () => {
          hiddenInput.value = opt.value;
          hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
          modal.close();
          setTimeout(() => modal.destroy(), 300);
        });
        grid.appendChild(card);
      });

      // Pagination
      paginationWrap.innerHTML = '';
      if (totalPages > 1) {
        pagination = new uiPagination({
          parent: paginationWrap,
          template: 'compact',
          totalPages: totalPages,
          currentPage: currentPage,
          size: 'sm'
        });
        pagination.bus.on('change', (e) => {
          currentPage = e.page;
          render();
        });
      }
    }

    // Search debounce
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchTerm = searchInput.value.trim();
        currentPage = 1;
        render();
      }, 200);
    });

    render();
    modal.open();

    // Focus search
    setTimeout(() => searchInput.focus(), 100);
  }

  /**
   * Serialize component tree to JSON
   */
  static toJSON(component) {
    const json = {
      type: component.type,
      id: component.id,
      settings: { ...component.settings },
      children: []
    };

    component.children.forEach(child => {
      json.children.push(ui.toJSON(child));
    });

    return json;
  }

  /**
   * Create component tree from JSON
   */
  static fromJSON(json, parent) {
    const ComponentClass = ui.registry[json.type] || ui;
    const component = new ComponentClass({
      ...json.settings,
      id: json.id,
      parent
    });

    if (json.children) {
      json.children.forEach(childJson => {
        ui.fromJSON(childJson, component.el);
      });
    }

    return component;
  }
}

// ============================================
// BUTTON COMPONENT
// ============================================

class uiButton extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: {
      fields: ['label', 'icon'],
      defaults: {}
    },
    'icon-only': {
      fields: ['icon'],
      defaults: {}
    },
    'icon-left': {
      fields: ['label', 'icon'],
      defaults: {}
    },
    'icon-right': {
      fields: ['label', 'icon'],
      defaults: {}
    },
    block: {
      fields: ['label', 'icon'],
      defaults: {}
    }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'icon-only', 'icon-left', 'icon-right', 'block'],
      default: 'default',
      description: 'Button layout',
      group: 'structure',
      order: 0
    },

    // ===== CONTENT =====
    label: {
      type: 'text',
      default: 'Button',
      description: 'Button text',
      group: 'content',
      templates: ['default', 'icon-left', 'icon-right', 'block']
    },
    icon: {
      type: 'text',
      default: '',
      description: 'Icon (emoji or symbol)',
      group: 'content'
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['primary', 'secondary', 'success', 'danger', 'warning', 'outline', 'ghost'],
      default: 'primary',
      description: 'Button color',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Button size',
      group: 'appearance',
      order: 2
    },
    elevated: {
      type: 'checkbox',
      default: false,
      description: 'Add shadow and hover lift',
      group: 'appearance'
    },
    disabled: {
      type: 'checkbox',
      default: false,
      description: 'Disable button',
      group: 'appearance'
    },

    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    },
    onClick: {
      type: 'function',
      default: null,
      description: 'Click handler function',
      group: 'advanced'
    }
  };

  _createEl() {
    const btn = document.createElement('button');
    btn.id = this.id;
    btn.type = 'button';
    btn.setAttribute('data-component-type', this.type);

    // Bind onClick handler
    const onClick = this.settings.onClick;
    if (onClick && typeof onClick === 'function') {
      btn.addEventListener('click', onClick);
    }

    // Use resolved settings
    const s = this._resolved;
    const template = s.template || 'default';

    btn.disabled = s.disabled || false;

    // Build classes
    const classes = ['ui-btn'];
    const variant = s.variant || 'primary';
    const colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning'];
    if (colorVariants.includes(variant)) {
      btn.dataset.color = variant;
    }
    classes.push('ui-btn-' + variant);

    // Size class
    if (s.size && s.size !== 'md') {
      classes.push('ui-btn-' + s.size);
    }

    // Template classes
    if (template === 'icon-only') {
      classes.push('ui-btn-icon');
    } else if (template === 'block') {
      classes.push('ui-btn-block');
    }

    // Elevated style
    if (s.elevated) {
      classes.push('ui-btn-elevated');
    }

    // Custom CSS
    if (s.css) {
      classes.push(s.css);
    }

    // Edit mode
    if (ui.editMode) {
      classes.push('ui-component');
    }

    btn.className = classes.join(' ');

    // Apply theme classes
    this._applyThemeClasses(btn);

    // Build content based on template
    let html = '';
    if (template === 'icon-only') {
      html = '<span class="ui-btn-icon-inner">' + (s.icon || '⚡') + '</span>';
    } else if (template === 'icon-left') {
      if (s.icon) html += '<span class="ui-btn-icon-inner">' + s.icon + '</span>';
      html += (s.label || 'Button');
    } else if (template === 'icon-right') {
      html += (s.label || 'Button');
      if (s.icon) html += '<span class="ui-btn-icon-inner">' + s.icon + '</span>';
    } else {
      // default and block
      if (s.icon) html += '<span class="ui-btn-icon-inner">' + s.icon + '</span>';
      html += (s.label || 'Button');
    }

    btn.innerHTML = html;
    return btn;
  }
}

// ============================================
// CARD COMPONENT
// ============================================

class uiCard extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: {
      fields: ['title', 'content', 'footer'],
      defaults: { padding: 'md' }
    },
    image: {
      fields: ['image', 'badge', 'title', 'content', 'footer'],
      defaults: { padding: 'none' }
    },
    stat: {
      fields: ['icon', 'value', 'label'],
      defaults: { padding: 'lg', textAlign: 'center' }
    },
    profile: {
      fields: ['avatar', 'name', 'role', 'content', 'footer'],
      defaults: { padding: 'lg', textAlign: 'center' }
    },
    task: {
      fields: ['avatar', 'title', 'subtitle', 'content', 'progress', 'actions'],
      defaults: { padding: 'md' }
    },
    horizontal: {
      fields: ['image', 'title', 'content', 'footer'],
      defaults: { padding: 'md' }
    }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'image', 'stat', 'profile', 'task', 'horizontal'],
      default: 'default',
      description: 'Card layout structure',
      group: 'structure',
      order: 0
    },

    // ===== CONTENT (template-specific) =====
    title: {
      type: 'text',
      default: '',
      description: 'Card title',
      group: 'content',
      templates: ['default', 'image', 'task', 'horizontal']
    },
    content: {
      type: 'textarea',
      default: '',
      description: 'Card body content',
      group: 'content',
      templates: ['default', 'image', 'profile', 'task', 'horizontal']
    },
    footer: {
      type: 'text',
      default: '',
      description: 'Card footer content',
      group: 'content',
      templates: ['default', 'image', 'profile', 'horizontal']
    },
    // Image template
    image: {
      type: 'text',
      default: '',
      description: 'Image URL',
      group: 'content',
      templates: ['image', 'horizontal']
    },
    badge: {
      type: 'text',
      default: '',
      description: 'Badge text overlay on image',
      group: 'content',
      templates: ['image']
    },
    // Stat template
    icon: {
      type: 'text',
      default: '📊',
      description: 'Icon or emoji',
      group: 'content',
      templates: ['stat']
    },
    value: {
      type: 'text',
      default: '0',
      description: 'Stat value',
      group: 'content',
      templates: ['stat']
    },
    label: {
      type: 'text',
      default: '',
      description: 'Stat label',
      group: 'content',
      templates: ['stat']
    },
    // Profile template
    avatar: {
      type: 'text',
      default: '',
      description: 'Avatar URL or initials',
      group: 'content',
      templates: ['profile', 'task']
    },
    name: {
      type: 'text',
      default: '',
      description: 'Person name',
      group: 'content',
      templates: ['profile']
    },
    role: {
      type: 'text',
      default: '',
      description: 'Person role/title',
      group: 'content',
      templates: ['profile']
    },
    // Task template
    subtitle: {
      type: 'text',
      default: '',
      description: 'Subtitle text',
      group: 'content',
      templates: ['task']
    },
    progress: {
      type: 'number',
      default: 0,
      description: 'Progress percentage (0-100)',
      group: 'content',
      templates: ['task']
    },
    actions: {
      type: 'json',
      default: [],
      description: 'Action buttons [{label, variant}]',
      group: 'content',
      templates: ['task']
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'minimal', 'soft', 'outlined', 'elevated', 'flat', 'glass'],
      default: 'default',
      description: 'Visual style preset',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Card size',
      group: 'appearance',
      order: 2
    },
    colorScheme: {
      type: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'danger', 'warning', 'info'],
      default: 'default',
      description: 'Color scheme',
      group: 'appearance',
      order: 3
    },
    hoverable: {
      type: 'checkbox',
      default: false,
      description: 'Enable hover lift effect',
      group: 'appearance'
    },
    collapsible: {
      type: 'checkbox',
      default: false,
      description: 'Enable collapse/expand toggle',
      group: 'appearance'
    },
    collapsed: {
      type: 'checkbox',
      default: false,
      description: 'Start in collapsed state',
      group: 'appearance'
    },

    // ===== ADVANCED =====
    radius: {
      type: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl', 'full'],
      default: null,
      description: 'Override corner radius',
      group: 'advanced'
    },
    shadow: {
      type: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      default: null,
      description: 'Override shadow',
      group: 'advanced'
    },
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const card = document.createElement('div');
    card.id = this.id;
    card.setAttribute('data-component-type', this.type);

    // Use resolved settings (template → variant → props)
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';

    // Build class list
    const classes = ['ui-card'];

    // Template class (structural)
    if (template !== 'default') {
      classes.push('ui-card-' + template);
    }

    // Variant class (styling)
    if (variant !== 'default') {
      classes.push('ui-card-variant-' + variant);
    }

    // Behavioral classes
    if (s.hoverable) {
      classes.push('ui-card-hoverable');
    }

    // Color scheme
    if (s.colorScheme && s.colorScheme !== 'default') {
      classes.push('ui-color-' + s.colorScheme);
    }

    // Custom CSS classes
    if (s.css) {
      classes.push(s.css);
    }

    // Edit mode
    if (ui.editMode) {
      classes.push('ui-component');
    }

    card.className = classes.join(' ');

    // Apply theme utility classes (radius, shadow, size, font)
    this._applyThemeClasses(card);

    let html = '';

    // Render based on template
    if (template === 'image') {
      html += '<div class="ui-card-img">';
      if (s.image) {
        html += '<img src="' + s.image + '" alt="">';
      }
      if (s.badge) {
        html += '<span class="ui-card-img-badge">' + s.badge + '</span>';
      }
      html += '</div>';
      html += '<div class="ui-card-body">';
      if (s.title) {
        html += '<h3 class="ui-card-title">' + s.title + '</h3>';
      }
      html += '<p class="ui-card-text">' + (s.content || '') + '</p>';
      html += '</div>';
      if (s.footer) {
        html += '<div class="ui-card-footer">' + s.footer + '</div>';
      }
    } else if (template === 'stat') {
      html += '<div class="ui-card-body">';
      html += '<div class="ui-card-stat-icon">' + (s.icon || '📊') + '</div>';
      html += '<div class="ui-card-stat-value">' + (s.value || '0') + '</div>';
      html += '<div class="ui-card-stat-label">' + (s.label || s.title || '') + '</div>';
      html += '</div>';
    } else if (template === 'profile') {
      html += '<div class="ui-card-body">';
      html += '<div class="ui-card-avatar">';
      if (s.avatar && s.avatar.startsWith('http')) {
        html += '<img src="' + s.avatar + '" alt="">';
      } else {
        html += (s.avatar || s.name?.charAt(0) || '?');
      }
      html += '</div>';
      html += '<h3 class="ui-card-name">' + (s.name || '') + '</h3>';
      html += '<p class="ui-card-role">' + (s.role || '') + '</p>';
      if (s.content) {
        html += '<p class="ui-card-text ui-mt-4">' + s.content + '</p>';
      }
      html += '</div>';
      if (s.footer) {
        html += '<div class="ui-card-footer">' + s.footer + '</div>';
      }
    } else if (template === 'task') {
      // Task template: avatar left-aligned with title/subtitle, body, progress, actions
      html += '<div class="ui-card-body">';
      // Header row with avatar and title/subtitle
      html += '<div class="ui-card-task-header">';
      html += '<div class="ui-card-task-avatar">';
      if (s.avatar && s.avatar.startsWith('http')) {
        html += '<img src="' + s.avatar + '" alt="">';
      } else {
        html += (s.avatar || s.title?.charAt(0) || '?');
      }
      html += '</div>';
      html += '<div class="ui-card-task-info">';
      if (s.title) {
        html += '<h3 class="ui-card-task-title">' + s.title + '</h3>';
      }
      if (s.subtitle) {
        html += '<p class="ui-card-task-subtitle">' + s.subtitle + '</p>';
      }
      html += '</div>';
      html += '</div>';
      // Body content
      if (s.content) {
        html += '<p class="ui-card-task-body">' + s.content + '</p>';
      }
      // Progress bar
      if (s.progress > 0) {
        html += '<div class="ui-card-task-progress">';
        html += '<div class="ui-progress"><div class="ui-progress-bar" style="width: ' + s.progress + '%"></div></div>';
        html += '<span class="ui-card-task-progress-label">' + s.progress + '%</span>';
        html += '</div>';
      }
      html += '</div>';
      // Actions footer (right-aligned)
      if (s.actions && s.actions.length > 0) {
        html += '<div class="ui-card-task-actions">';
        s.actions.forEach((action, i) => {
          html += '<button class="ui-btn ui-btn-' + (action.variant || 'outline') + ' ui-btn-sm" data-action="' + i + '">' + action.label + '</button>';
        });
        html += '</div>';
      }
    } else if (template === 'horizontal') {
      // Horizontal template: side-by-side image and content
      html += '<div class="ui-card-horizontal">';
      if (s.image) {
        html += '<div class="ui-card-horizontal-img">';
        html += '<img src="' + s.image + '" alt="">';
        html += '</div>';
      }
      html += '<div class="ui-card-horizontal-content">';
      if (s.title) {
        html += '<h3 class="ui-card-title">' + s.title + '</h3>';
      }
      html += '<p class="ui-card-text">' + (s.content || '') + '</p>';
      if (s.footer) {
        html += '<div class="ui-card-footer">' + s.footer + '</div>';
      }
      html += '</div>';
      html += '</div>';
    } else {
      // Default template
      if (s.title) {
        html += '<div class="ui-card-header"><h3 class="ui-card-title">' + s.title + '</h3></div>';
      }
      html += '<div class="ui-card-body">' + (s.content || '') + '</div>';
      if (s.footer) {
        html += '<div class="ui-card-footer">' + s.footer + '</div>';
      }
    }

    card.innerHTML = html;

    // Store references to card sections for methods
    this._headerEl = card.querySelector('.ui-card-header');
    this._bodyEl = card.querySelector('.ui-card-body');
    this._footerEl = card.querySelector('.ui-card-footer');
    this._collapsed = s.collapsed || false;
    this._collapsible = s.collapsible || false;

    // Add collapse toggle if collapsible
    if (this._collapsible && this._headerEl) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'ui-card-collapse-btn';
      toggleBtn.textContent = this._collapsed ? '▶' : '▼';
      toggleBtn.onclick = () => this.toggle();
      this._headerEl.appendChild(toggleBtn);

      if (this._collapsed && this._bodyEl) {
        this._bodyEl.style.display = 'none';
      }
    }

    return card;
  }

  // ----------------------------------------
  // BlUiCard-compatible Methods
  // ----------------------------------------

  /**
   * Add a title element to the card body
   */
  addTitle(text) {
    const target = this._bodyEl || this.element;
    const titleEl = document.createElement('h3');
    titleEl.className = 'ui-card-title ui-mb-2';
    titleEl.textContent = text;
    target.insertBefore(titleEl, target.firstChild);
    return titleEl;
  }

  /**
   * Add body content to the card
   */
  addBody(content) {
    const target = this._bodyEl || this.element;
    const bodyEl = document.createElement('p');
    bodyEl.className = 'ui-card-text ui-text-muted';
    bodyEl.textContent = content;
    target.appendChild(bodyEl);
    return bodyEl;
  }

  /**
   * Get or create the footer element
   */
  getFooter() {
    if (!this._footerEl) {
      this._footerEl = document.createElement('div');
      this._footerEl.className = 'ui-card-footer';
      this.element.appendChild(this._footerEl);
    }
    return this._footerEl;
  }

  /**
   * Collapse the card body
   */
  collapse() {
    if (!this._collapsed && this._bodyEl) {
      this._collapsed = true;
      this._bodyEl.style.display = 'none';
      const btn = this.element.querySelector('.ui-card-collapse-btn');
      if (btn) btn.textContent = '▶';
      this.bus.emit('collapse', { collapsed: true });
    }
  }

  /**
   * Expand the card body
   */
  expand() {
    if (this._collapsed && this._bodyEl) {
      this._collapsed = false;
      this._bodyEl.style.display = '';
      const btn = this.element.querySelector('.ui-card-collapse-btn');
      if (btn) btn.textContent = '▼';
      this.bus.emit('expand', { collapsed: false });
    }
  }

  /**
   * Toggle collapsed state
   */
  toggle() {
    if (this._collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  /**
   * Update card content dynamically
   */
  setTitle(text) {
    const titleEl = this.element.querySelector('.ui-card-title');
    if (titleEl) titleEl.textContent = text;
  }

  setContent(text) {
    const textEl = this.element.querySelector('.ui-card-text');
    if (textEl) textEl.textContent = text;
  }

  setValue(val) {
    const valEl = this.element.querySelector('.ui-card-stat-value');
    if (valEl) valEl.textContent = val;
  }

  setProgress(percent) {
    const bar = this.element.querySelector('.ui-progress-bar');
    const label = this.element.querySelector('.ui-card-task-progress-label');
    if (bar) bar.style.width = percent + '%';
    if (label) label.textContent = percent + '%';
  }
}

// ============================================
// INPUT COMPONENT
// ============================================

class uiInput extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: {
      fields: ['placeholder', 'value', 'label'],
      defaults: {}
    },
    'floating-label': {
      fields: ['placeholder', 'value', 'label'],
      defaults: {}
    },
    'inline-label': {
      fields: ['placeholder', 'value', 'label'],
      defaults: {}
    }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'floating-label', 'inline-label'],
      default: 'default',
      description: 'Input layout',
      group: 'structure',
      order: 0
    },
    inputType: {
      type: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      default: 'text',
      description: 'Input type',
      group: 'structure'
    },

    // ===== CONTENT =====
    label: {
      type: 'text',
      default: '',
      description: 'Input label',
      group: 'content',
      templates: ['floating-label', 'inline-label']
    },
    placeholder: {
      type: 'text',
      default: '',
      description: 'Placeholder text',
      group: 'content'
    },
    value: {
      type: 'text',
      default: '',
      description: 'Input value',
      group: 'content'
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'minimal', 'outlined', 'soft'],
      default: 'default',
      description: 'Visual style',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Input size',
      group: 'appearance',
      order: 2
    },
    disabled: {
      type: 'checkbox',
      default: false,
      description: 'Disable input',
      group: 'appearance'
    },
    error: {
      type: 'checkbox',
      default: false,
      description: 'Show error state',
      group: 'appearance'
    },

    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';

    // For templates with labels, wrap in container
    if (template === 'floating-label' || template === 'inline-label') {
      const wrapper = document.createElement('div');
      wrapper.id = this.id;
      wrapper.setAttribute('data-component-type', this.type);

      const wrapperClasses = ['ui-input-wrapper', `ui-input-${template}`];
      if (variant !== 'default') wrapperClasses.push(`ui-input-variant-${variant}`);
      if (s.size && s.size !== 'md') wrapperClasses.push(`ui-input-${s.size}`);
      if (s.error) wrapperClasses.push('ui-input-error');
      if (s.css) wrapperClasses.push(s.css);
      if (ui.editMode) wrapperClasses.push('ui-component');
      wrapper.className = wrapperClasses.join(' ');

      const input = document.createElement('input');
      input.type = s.inputType || 'text';
      input.placeholder = template === 'floating-label' ? ' ' : (s.placeholder || '');
      input.value = s.value || '';
      input.disabled = s.disabled || false;
      input.className = 'ui-input';

      const label = document.createElement('label');
      label.className = 'ui-input-label';
      label.textContent = s.label || s.placeholder || 'Label';

      if (template === 'inline-label') {
        wrapper.appendChild(label);
        wrapper.appendChild(input);
      } else {
        wrapper.appendChild(input);
        wrapper.appendChild(label);
      }

      this._applyThemeClasses(wrapper);
      return wrapper;
    }

    // Default template - simple input
    const input = document.createElement('input');
    input.id = this.id;
    input.type = s.inputType || 'text';
    input.placeholder = s.placeholder || '';
    input.value = s.value || '';
    input.disabled = s.disabled || false;
    input.setAttribute('data-component-type', this.type);

    const classes = ['ui-input'];
    if (variant !== 'default') classes.push(`ui-input-variant-${variant}`);
    if (s.size && s.size !== 'md') classes.push(`ui-input-${s.size}`);
    if (s.error) classes.push('ui-input-error');
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    input.className = classes.join(' ');

    this._applyThemeClasses(input);
    return input;
  }

  _bindEvents() {
    super._bindEvents();

    if (this.el) {
      this.el.addEventListener('input', (e) => {
        this.settings.value = e.target.value;
        this.bus.emit('change', { component: this, value: e.target.value });
      });

      this.el.addEventListener('focus', (e) => {
        this.bus.emit('focus', { component: this, event: e });
      });

      this.el.addEventListener('blur', (e) => {
        this.bus.emit('blur', { component: this, event: e });
      });
    }
  }
}

// ============================================
// BADGE COMPONENT
// ============================================

class uiBadge extends ui {
  // Template configurations for badges
  static templateConfigs = {
    default: {
      fields: ['label', 'color', 'variant', 'size'],
      defaults: {}
    },
    dot: {
      fields: ['label', 'color', 'size'],
      defaults: {}
    },
    icon: {
      fields: ['label', 'icon', 'color', 'variant', 'size'],
      defaults: { icon: '★' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'dot', 'icon'],
      default: 'default',
      description: 'Badge layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    label: {
      type: 'text',
      default: 'Badge',
      description: 'Badge text',
      group: 'content',
      order: 1
    },
    icon: {
      type: 'text',
      default: '★',
      description: 'Icon character or emoji',
      group: 'content',
      order: 2,
      templates: ['icon']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'gray'],
      default: 'primary',
      description: 'Badge color',
      group: 'appearance',
      order: 1
    },
    variant: {
      type: 'select',
      options: ['default', 'solid', 'outline'],
      default: 'default',
      description: 'Badge style (default is light bg, solid is filled, outline is bordered)',
      group: 'appearance',
      order: 2,
      templates: ['default', 'icon']
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Badge size',
      group: 'appearance',
      order: 3
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const color = s.color || 'primary';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const badge = document.createElement('span');
    badge.id = this.id;
    badge.setAttribute('data-component-type', this.type);

    const classes = ['ui-badge', `ui-badge-template-${template}`];
    badge.dataset.color = color;

    // Variant style
    if (variant === 'solid') {
      classes.push('ui-badge-solid');
    } else if (variant === 'outline') {
      classes.push('ui-badge-outline');
    }

    // Size
    if (size !== 'md') {
      classes.push(`ui-badge-${size}`);
    }

    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    badge.className = classes.join(' ');

    // Dot template: small indicator dot + label
    if (template === 'dot') {
      const dot = document.createElement('span');
      dot.className = 'ui-badge-dot';
      badge.appendChild(dot);

      if (s.label) {
        const text = document.createElement('span');
        text.className = 'ui-badge-text';
        text.textContent = s.label;
        badge.appendChild(text);
      }
    }
    // Icon template: icon + label
    else if (template === 'icon') {
      if (s.icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'ui-badge-icon';
        iconEl.textContent = s.icon;
        badge.appendChild(iconEl);
      }

      const text = document.createElement('span');
      text.className = 'ui-badge-text';
      text.textContent = s.label || 'Badge';
      badge.appendChild(text);
    }
    // Default template
    else {
      badge.textContent = s.label || 'Badge';
    }

    this._applyThemeClasses(badge);
    return badge;
  }
}

// ============================================
// ALERT COMPONENT
// ============================================

class uiAlert extends ui {
  // Template configurations for alerts
  static templateConfigs = {
    default: {
      fields: ['title', 'message', 'color', 'dismissible'],
      defaults: {}
    },
    banner: {
      fields: ['title', 'message', 'color', 'dismissible'],
      defaults: {}
    },
    inline: {
      fields: ['message', 'color'],
      defaults: {}
    },
    minimal: {
      fields: ['title', 'message', 'color'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'banner', 'inline', 'minimal'],
      default: 'default',
      description: 'Alert layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    title: {
      type: 'text',
      default: '',
      description: 'Alert title',
      group: 'content',
      order: 1,
      templates: ['default', 'banner', 'minimal']
    },
    message: {
      type: 'textarea',
      default: 'Alert message',
      description: 'Alert message',
      group: 'content',
      order: 2
    },
    dismissible: {
      type: 'checkbox',
      default: false,
      description: 'Show close button',
      group: 'content',
      order: 3,
      templates: ['default', 'banner']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['success', 'danger', 'warning', 'info'],
      default: 'info',
      description: 'Alert color',
      group: 'appearance',
      order: 1
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const color = s.color || 'info';

    const alert = document.createElement('div');
    alert.id = this.id;
    alert.setAttribute('data-component-type', this.type);
    alert.setAttribute('role', 'alert');

    const classes = ['ui-alert', `ui-alert-template-${template}`];
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    alert.className = classes.join(' ');
    alert.dataset.color = color;

    const icons = {
      success: '✓',
      danger: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    // Minimal template: text only, no icon
    if (template === 'minimal') {
      const content = document.createElement('div');
      content.className = 'ui-alert-content';

      if (s.title) {
        const title = document.createElement('p');
        title.className = 'ui-alert-title';
        title.textContent = s.title;
        content.appendChild(title);
      }

      const message = document.createElement('p');
      message.className = 'ui-alert-message';
      message.textContent = s.message || '';
      content.appendChild(message);

      alert.appendChild(content);
    }
    // Inline template: compact, single line
    else if (template === 'inline') {
      const icon = document.createElement('span');
      icon.className = 'ui-alert-icon';
      icon.textContent = icons[color] || 'ℹ';
      alert.appendChild(icon);

      const message = document.createElement('span');
      message.className = 'ui-alert-message';
      message.textContent = s.message || '';
      alert.appendChild(message);
    }
    // Banner template: full-width with centered content
    else if (template === 'banner') {
      const icon = document.createElement('span');
      icon.className = 'ui-alert-icon';
      icon.textContent = icons[color] || 'ℹ';
      alert.appendChild(icon);

      const content = document.createElement('div');
      content.className = 'ui-alert-content';

      if (s.title) {
        const title = document.createElement('strong');
        title.className = 'ui-alert-title';
        title.textContent = s.title + ' ';
        content.appendChild(title);
      }

      const message = document.createElement('span');
      message.className = 'ui-alert-message';
      message.textContent = s.message || '';
      content.appendChild(message);

      alert.appendChild(content);

      if (s.dismissible) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ui-alert-close';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', () => this.dismiss());
        alert.appendChild(closeBtn);
      }
    }
    // Default template
    else {
      const icon = document.createElement('span');
      icon.className = 'ui-alert-icon';
      icon.textContent = icons[color] || 'ℹ';
      alert.appendChild(icon);

      const content = document.createElement('div');
      content.className = 'ui-alert-content';

      if (s.title) {
        const title = document.createElement('p');
        title.className = 'ui-alert-title';
        title.textContent = s.title;
        content.appendChild(title);
      }

      const message = document.createElement('p');
      message.className = 'ui-alert-message';
      message.textContent = s.message || '';
      content.appendChild(message);

      alert.appendChild(content);

      if (s.dismissible) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ui-alert-close';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', () => this.dismiss());
        alert.appendChild(closeBtn);
      }
    }

    this._applyThemeClasses(alert);
    return alert;
  }

  dismiss() {
    if (this.el) {
      this.el.classList.add('ui-alert-dismissing');
      setTimeout(() => {
        this.el.remove();
        this.bus.emit('dismissed', { component: this });
      }, 200);
    }
  }
}

// ============================================
// TABS COMPONENT
// ============================================

class uiTabs extends ui {
  static templateConfigs = {
    default: {
      fields: ['content', 'activeTab', 'size'],
      defaults: {}
    },
    pills: {
      fields: ['content', 'activeTab', 'size', 'color'],
      defaults: { color: 'primary' }
    },
    boxed: {
      fields: ['content', 'activeTab', 'size'],
      defaults: {}
    },
    underline: {
      fields: ['content', 'activeTab', 'size', 'color'],
      defaults: { color: 'primary' }
    },
    vertical: {
      fields: ['content', 'activeTab', 'size', 'tabWidth'],
      defaults: { tabWidth: '200px' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'pills', 'boxed', 'underline', 'vertical'],
      default: 'default',
      description: 'Tab style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    content: {
      type: 'json',
      default: {},
      description: 'Tab definitions {key: {label, icon?, content}}',
      group: 'content'
    },
    activeTab: {
      type: 'text',
      default: '',
      description: 'Active tab key',
      group: 'content'
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['primary', 'secondary', 'success', 'danger'],
      default: 'primary',
      description: 'Active tab color',
      group: 'appearance',
      order: 1,
      templates: ['pills', 'underline']
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Tab size',
      group: 'appearance',
      order: 2
    },
    tabWidth: {
      type: 'text',
      default: '200px',
      description: 'Tab list width (vertical only)',
      group: 'appearance',
      templates: ['vertical']
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const tabs = document.createElement('div');
    tabs.id = this.id;
    tabs.setAttribute('data-component-type', this.type);

    const classes = ['ui-tabs', `ui-tabs-${template}`];
    if (s.size && s.size !== 'md') classes.push(`ui-tabs-${s.size}`);
    if (ui.editMode) classes.push('ui-component');
    tabs.className = classes.join(' ');
    if (s.color && s.color !== 'primary') tabs.dataset.color = s.color;

    const content = s.content || {};
    const keys = Object.keys(content);
    const activeTab = s.activeTab || keys[0] || '';

    // Tab list
    const listStyle = template === 'vertical' && s.tabWidth ? ` style="width: ${s.tabWidth}"` : '';
    let html = `<div class="ui-tabs-list" role="tablist"${listStyle}>`;
    keys.forEach(key => {
      const tab = content[key];
      const isActive = key === activeTab;
      html += `<button class="ui-tabs-tab${isActive ? ' ui-active' : ''}" `;
      html += `role="tab" data-tab="${key}" aria-selected="${isActive}">`;
      if (tab.icon) html += `<span class="ui-tabs-icon">${tab.icon}</span>`;
      html += (tab.label || key);
      html += '</button>';
    });
    html += '</div>';

    // Tab panels wrapper (for vertical layout)
    if (template === 'vertical') {
      html += '<div class="ui-tabs-panels">';
    }

    // Tab panels
    keys.forEach(key => {
      const tab = content[key];
      const isActive = key === activeTab;
      html += `<div class="ui-tabs-panel${isActive ? ' ui-active' : ''}" `;
      html += `role="tabpanel" data-tab="${key}">`;
      html += (tab.content || '');
      html += '</div>';
    });

    if (template === 'vertical') {
      html += '</div>';
    }

    tabs.innerHTML = html;
    this._applyThemeClasses(tabs);
    return tabs;
  }

  _bindEvents() {
    super._bindEvents();

    if (this.el) {
      this.el.querySelectorAll('.ui-tabs-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const key = tab.dataset.tab;
          this._activateTab(key);
          this.bus.emit('tabChange', { component: this, tab: key });
        });
      });
    }
  }

  _activateTab(key) {
    if (!this.el) return;

    // Deactivate all
    this.el.querySelectorAll('.ui-tabs-tab').forEach(t => {
      t.classList.remove('ui-active');
      t.setAttribute('aria-selected', 'false');
    });
    this.el.querySelectorAll('.ui-tabs-panel').forEach(p => {
      p.classList.remove('ui-active');
    });

    // Activate selected
    const tab = this.el.querySelector('.ui-tabs-tab[data-tab="' + key + '"]');
    const panel = this.el.querySelector('.ui-tabs-panel[data-tab="' + key + '"]');
    if (tab) {
      tab.classList.add('ui-active');
      tab.setAttribute('aria-selected', 'true');
    }
    if (panel) {
      panel.classList.add('ui-active');
    }

    this.settings.activeTab = key;
  }
}

// ============================================
// ACCORDION COMPONENT
// ============================================

class uiAccordion extends ui {
  static templateConfigs = {
    default: {
      fields: ['content', 'exclusive', 'showIcons'],
      defaults: { exclusive: true, showIcons: true }
    },
    styled: {
      fields: ['content', 'exclusive', 'showIcons'],
      defaults: { exclusive: true, showIcons: true }
    },
    minimal: {
      fields: ['content', 'exclusive', 'showIcons'],
      defaults: { exclusive: true, showIcons: true }
    },
    bordered: {
      fields: ['content', 'exclusive', 'showIcons'],
      defaults: { exclusive: true, showIcons: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'styled', 'minimal', 'bordered'],
      default: 'default',
      description: 'Accordion template',
      group: 'structure'
    },
    // Content
    content: {
      type: 'json',
      default: {},
      description: 'Accordion sections {key: {label, content}}',
      group: 'content'
    },
    // Appearance
    exclusive: {
      type: 'checkbox',
      default: true,
      description: 'Only one section open at a time',
      group: 'appearance'
    },
    showIcons: {
      type: 'checkbox',
      default: true,
      description: 'Show expand/collapse icons',
      group: 'appearance'
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const accordion = document.createElement('div');
    accordion.id = this.id;
    accordion.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-accordion', `ui-accordion-${template}`];
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    accordion.className = classes.join(' ');
    this._applyThemeClasses(accordion);

    let content = this._resolved.content || {};
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch (e) { content = {}; }
    }

    const showIcons = this._resolved.showIcons !== false;
    let html = '';
    let index = 0;

    for (const [key, section] of Object.entries(content)) {
      const isOpen = section.open || (index === 0);
      html += '<div class="ui-accordion-item' + (isOpen ? ' ui-active' : '') + '" data-key="' + key + '">';
      html += '<button class="ui-accordion-trigger">';
      html += '<span>' + (section.label || key) + '</span>';
      if (showIcons) {
        html += '<span class="ui-accordion-icon">&#9660;</span>';
      }
      html += '</button>';
      html += '<div class="ui-accordion-content">';
      html += (section.content || '');
      html += '</div>';
      html += '</div>';
      index++;
    }

    accordion.innerHTML = html;
    return accordion;
  }

  _bindEvents() {
    super._bindEvents();

    if (this.el) {
      this.el.querySelectorAll('.ui-accordion-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
          const item = trigger.closest('.ui-accordion-item');
          const key = item.dataset.key;
          this._toggleItem(item, key);
        });
      });
    }
  }

  /**
   * Get the content element for a section by key.
   * @param {string} key - The section key used in the content config
   * @returns {HTMLElement|null}
   */
  getPanel(key) {
    return this.el ? this.el.querySelector('[data-key="' + key + '"] .ui-accordion-content') : null;
  }

  /**
   * Static factory: create a standalone collapsible panel (not part of an accordion group).
   * Returns { wrap, content } — append wrap to your container, build into content.
   *
   * @param {HTMLElement} parent - Where to append the panel
   * @param {Object} opts
   * @param {string} opts.icon - FontAwesome icon class (e.g. 'fa-history')
   * @param {string} [opts.iconColor] - CSS color for the icon
   * @param {string} opts.label - Section label text
   * @param {number} [opts.count] - Optional count badge
   * @param {boolean} [opts.defaultOpen=false] - Start open?
   * @returns {{ wrap: HTMLElement, content: HTMLElement }}
   */
  static createPanel(parent, { icon, iconColor, label, count, defaultOpen = false } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'ui-accordion-panel';

    const header = document.createElement('div');
    header.className = 'ui-accordion-panel-header';

    const chevron = document.createElement('i');
    chevron.className = `fas ${defaultOpen ? 'fa-chevron-down' : 'fa-chevron-right'} ui-accordion-panel-chevron`;
    header.appendChild(chevron);

    if (icon) {
      const iconEl = document.createElement('i');
      iconEl.className = `fas ${icon}`;
      if (iconColor) iconEl.style.color = iconColor;
      header.appendChild(iconEl);
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'ui-accordion-panel-label';
    labelEl.textContent = count != null ? `${label} (${count})` : label;
    header.appendChild(labelEl);

    const content = document.createElement('div');
    content.className = 'ui-accordion-panel-content';
    if (!defaultOpen) content.style.display = 'none';

    header.onclick = () => {
      const open = content.style.display !== 'none';
      content.style.display = open ? 'none' : 'block';
      chevron.className = `fas ${open ? 'fa-chevron-right' : 'fa-chevron-down'} ui-accordion-panel-chevron`;
    };

    wrap.appendChild(header);
    wrap.appendChild(content);
    if (parent) parent.appendChild(wrap);

    return { wrap, content };
  }

  _toggleItem(item, key) {
    const isOpen = item.classList.contains('ui-active');

    // In exclusive mode, close all others
    if (this._resolved.exclusive && !isOpen) {
      this.el.querySelectorAll('.ui-accordion-item').forEach(i => {
        i.classList.remove('ui-active');
      });
    }

    // Toggle this item
    item.classList.toggle('ui-active');

    this.bus.emit('toggle', {
      component: this,
      key,
      open: !isOpen
    });
  }
}

// ============================================
// MODAL COMPONENT
// ============================================

class uiModal extends ui {
  static templateConfigs = {
    default: {
      fields: ['title', 'content', 'size', 'showClose'],
      defaults: {}
    },
    centered: {
      fields: ['title', 'content', 'size', 'showClose'],
      defaults: {}
    },
    fullscreen: {
      fields: ['title', 'content', 'showClose'],
      defaults: {}
    },
    sheet: {
      fields: ['title', 'content', 'position', 'showClose'],
      defaults: { position: 'right' }
    },
    confirm: {
      fields: ['title', 'content', 'confirmLabel', 'cancelLabel', 'confirmVariant'],
      defaults: { confirmLabel: 'Confirm', cancelLabel: 'Cancel', confirmVariant: 'primary' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'centered', 'fullscreen', 'sheet', 'confirm'],
      default: 'default',
      description: 'Modal style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    title: {
      type: 'text',
      default: 'Modal Title',
      description: 'Modal title',
      group: 'content'
    },
    content: {
      type: 'textarea',
      default: '',
      description: 'Modal body content',
      group: 'content'
    },
    confirmLabel: {
      type: 'text',
      default: 'Confirm',
      description: 'Confirm button label',
      group: 'content',
      templates: ['confirm']
    },
    cancelLabel: {
      type: 'text',
      default: 'Cancel',
      description: 'Cancel button label',
      group: 'content',
      templates: ['confirm']
    },
    // ===== APPEARANCE =====
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Modal size',
      group: 'appearance',
      order: 1,
      templates: ['default', 'centered']
    },
    position: {
      type: 'select',
      options: ['left', 'right', 'top', 'bottom'],
      default: 'right',
      description: 'Sheet position',
      group: 'appearance',
      templates: ['sheet']
    },
    confirmVariant: {
      type: 'select',
      options: ['primary', 'danger', 'success'],
      default: 'primary',
      description: 'Confirm button style',
      group: 'appearance',
      templates: ['confirm']
    },
    showClose: {
      type: 'checkbox',
      default: true,
      description: 'Show close button',
      group: 'appearance',
      templates: ['default', 'centered', 'fullscreen', 'sheet']
    },
    closeOnBackdrop: {
      type: 'checkbox',
      default: true,
      description: 'Close when clicking backdrop',
      group: 'appearance'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  constructor(settings = {}) {
    super(settings);
    // Modals are overlays — always create DOM elements even without parent,
    // so getBody()/getFooter() work before open() is called
    if (!this.el) {
      this.render();
    }
  }

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const wrapper = document.createElement('div');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);
    wrapper.className = `ui-modal-wrapper ui-modal-template-${template}`;

    if (ui.editMode) {
      wrapper.classList.add('ui-component');
    }

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'ui-modal-backdrop';
    this._backdrop = backdrop;

    // Modal
    const modal = document.createElement('div');
    const modalClasses = ['ui-modal'];

    if (template === 'fullscreen') {
      modalClasses.push('ui-modal-fullscreen');
    } else if (template === 'sheet') {
      modalClasses.push('ui-modal-sheet', `ui-modal-sheet-${s.position || 'right'}`);
    } else if (template === 'centered') {
      modalClasses.push('ui-modal-centered');
    }

    if (s.size && s.size !== 'md' && template !== 'fullscreen' && template !== 'sheet') {
      modalClasses.push(`ui-modal-${s.size}`);
    }
    modal.className = modalClasses.join(' ');

    let html = '';

    // Header
    if (s.title || s.showClose !== false) {
      html += '<div class="ui-modal-header">';
      html += `<h3 class="ui-modal-title">${s.title || ''}</h3>`;
      if (s.showClose !== false && template !== 'confirm') {
        html += '<button class="ui-modal-close" data-modal-close>';
        html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
        html += '<path d="M18 6L6 18M6 6l12 12"/>';
        html += '</svg>';
        html += '</button>';
      }
      html += '</div>';
    }

    // Body
    html += `<div class="ui-modal-body">${s.content || ''}</div>`;

    // Footer
    if (template === 'confirm') {
      html += '<div class="ui-modal-footer ui-modal-footer-actions">';
      html += `<button class="ui-btn ui-btn-ghost" data-modal-cancel>${s.cancelLabel || 'Cancel'}</button>`;
      html += `<button class="ui-btn ui-btn-${s.confirmVariant || 'primary'}" data-color="${s.confirmVariant || 'primary'}" data-modal-confirm>${s.confirmLabel || 'Confirm'}</button>`;
      html += '</div>';
    } else {
      html += '<div class="ui-modal-footer"></div>';
    }

    modal.innerHTML = html;
    this._modal = modal;

    wrapper.appendChild(backdrop);
    wrapper.appendChild(modal);

    this._applyThemeClasses(wrapper);
    return wrapper;
  }

  _bindEvents() {
    super._bindEvents();
    const s = this._resolved;

    // Backdrop click to close (if enabled)
    if (this._backdrop && s.closeOnBackdrop !== false) {
      this._backdrop.addEventListener('click', () => this.close());
    }

    // Close button
    if (this._modal) {
      const closeBtn = this._modal.querySelector('[data-modal-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      // Confirm modal buttons
      const confirmBtn = this._modal.querySelector('[data-modal-confirm]');
      const cancelBtn = this._modal.querySelector('[data-modal-cancel]');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          this.bus.emit('confirm', { component: this });
          this.close();
        });
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.bus.emit('cancel', { component: this });
          this.close();
        });
      }
    }

    // Escape key
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  getBody() {
    return this._modal ? this._modal.querySelector('.ui-modal-body') : null;
  }

  getFooter() {
    return this._modal ? this._modal.querySelector('.ui-modal-footer') : null;
  }

  open() {
    // Auto-append to body if not in DOM (matches uiDrawer pattern)
    if (this.el && !this.el.parentNode) {
      document.body.appendChild(this.el);
    }
    if (this._backdrop) this._backdrop.classList.add('ui-active');
    if (this._modal) this._modal.classList.add('ui-active');
    document.body.classList.add('ui-modal-open');
    this.bus.emit('open', { component: this });
  }

  close() {
    if (this._backdrop) this._backdrop.classList.remove('ui-active');
    if (this._modal) this._modal.classList.remove('ui-active');
    document.body.classList.remove('ui-modal-open');
    this.bus.emit('close', { component: this });
  }

  isOpen() {
    return this._modal && this._modal.classList.contains('ui-active');
  }

  onDestroy() {
    document.removeEventListener('keydown', this._escHandler);
    document.body.classList.remove('ui-modal-open');
  }
}

// ============================================
// DROPDOWN COMPONENT
// ============================================

class uiDropdown extends ui {
  static templateConfigs = {
    default: {
      fields: ['label', 'items', 'variant', 'size', 'align'],
      defaults: { align: 'left' }
    },
    mega: {
      fields: ['label', 'sections', 'variant', 'width'],
      defaults: { width: '400px' }
    },
    split: {
      fields: ['label', 'items', 'variant', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'mega', 'split'],
      default: 'default',
      description: 'Dropdown style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    label: {
      type: 'text',
      default: 'Dropdown',
      description: 'Trigger button label',
      group: 'content'
    },
    items: {
      type: 'json',
      default: [],
      description: 'Menu items [{label, icon?, divider?, disabled?}]',
      group: 'content',
      templates: ['default', 'split']
    },
    sections: {
      type: 'json',
      default: [],
      description: 'Mega menu sections [{title, items: [{label, description?, icon?}]}]',
      group: 'content',
      templates: ['mega']
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost'],
      default: 'outline',
      description: 'Trigger button variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Button size',
      group: 'appearance',
      order: 2,
      templates: ['default', 'split']
    },
    align: {
      type: 'select',
      options: ['left', 'right'],
      default: 'left',
      description: 'Menu alignment',
      group: 'appearance',
      templates: ['default']
    },
    width: {
      type: 'text',
      default: '400px',
      description: 'Mega menu width',
      group: 'appearance',
      templates: ['mega']
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const dropdown = document.createElement('div');
    dropdown.id = this.id;
    dropdown.setAttribute('data-component-type', this.type);

    const classes = ['ui-dropdown', `ui-dropdown-${template}`];
    if (s.align === 'right') classes.push('ui-dropdown-right');
    if (ui.editMode) classes.push('ui-component');
    dropdown.className = classes.join(' ');

    const btnSize = s.size && s.size !== 'md' ? ` ui-btn-${s.size}` : '';
    let html = '';

    if (template === 'split') {
      // Split button: main button + dropdown trigger
      html += `<div class="ui-btn-group">`;
      html += `<button class="ui-btn ui-btn-${s.variant || 'outline'}${btnSize}" data-dropdown-action>${s.label || 'Action'}</button>`;
      html += `<button class="ui-btn ui-btn-${s.variant || 'outline'}${btnSize} ui-dropdown-toggle" data-dropdown-trigger>`;
      html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
      html += '</button>';
      html += '</div>';
    } else {
      // Regular trigger button
      html += `<button class="ui-btn ui-btn-${s.variant || 'outline'}${btnSize}" data-dropdown-trigger>`;
      html += (s.label || 'Dropdown');
      html += ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:0.5rem"><path d="M6 9l6 6 6-6"/></svg>';
      html += '</button>';
    }

    // Menu
    if (template === 'mega') {
      // Mega menu with sections
      html += `<div class="ui-dropdown-menu ui-dropdown-mega" style="width: ${s.width || '400px'}">`;
      const sections = s.sections || [];
      sections.forEach((section, si) => {
        html += '<div class="ui-dropdown-section">';
        if (section.title) {
          html += `<div class="ui-dropdown-section-title">${section.title}</div>`;
        }
        (section.items || []).forEach((item, i) => {
          html += `<button class="ui-dropdown-item" data-section="${si}" data-index="${i}">`;
          if (item.icon) html += `<span class="ui-dropdown-icon">${item.icon}</span>`;
          html += '<div class="ui-dropdown-item-content">';
          html += `<span class="ui-dropdown-item-label">${item.label || ''}</span>`;
          if (item.description) {
            html += `<span class="ui-dropdown-item-desc">${item.description}</span>`;
          }
          html += '</div></button>';
        });
        html += '</div>';
      });
      html += '</div>';
    } else {
      // Standard menu
      html += '<div class="ui-dropdown-menu">';
      const items = s.items || [];
      items.forEach((item, i) => {
        if (item.divider) {
          html += '<div class="ui-dropdown-divider"></div>';
        } else {
          const disabled = item.disabled ? ' disabled' : '';
          html += `<button class="ui-dropdown-item${disabled}" data-index="${i}"${disabled}>`;
          if (item.icon) html += `<span class="ui-dropdown-icon">${item.icon}</span>`;
          html += (item.label || '');
          html += '</button>';
        }
      });
      html += '</div>';
    }

    dropdown.innerHTML = html;
    this._applyThemeClasses(dropdown);
    return dropdown;
  }

  _bindEvents() {
    super._bindEvents();
    const s = this._resolved;

    if (this.el) {
      const trigger = this.el.querySelector('[data-dropdown-trigger]');
      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggle();
        });
      }

      // Split button main action
      const actionBtn = this.el.querySelector('[data-dropdown-action]');
      if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('action', { component: this });
        });
      }

      this.el.querySelectorAll('.ui-dropdown-item:not([disabled])').forEach(item => {
        item.addEventListener('click', (e) => {
          const index = parseInt(item.dataset.index);
          const sectionIndex = item.dataset.section ? parseInt(item.dataset.section) : null;
          let menuItem;
          if (sectionIndex !== null) {
            menuItem = ((s.sections || [])[sectionIndex]?.items || [])[index];
          } else {
            menuItem = (s.items || [])[index];
          }
          this.bus.emit('select', { component: this, item: menuItem, index, sectionIndex });
          this.close();
        });
      });

      // Close on outside click
      this._outsideHandler = (e) => {
        if (!this.el.contains(e.target)) {
          this.close();
        }
      };
      document.addEventListener('click', this._outsideHandler);
    }
  }

  toggle() {
    if (this.el) this.el.classList.toggle('ui-active');
  }

  open() {
    if (this.el) this.el.classList.add('ui-active');
  }

  close() {
    if (this.el) this.el.classList.remove('ui-active');
  }

  onDestroy() {
    document.removeEventListener('click', this._outsideHandler);
  }
}

// ============================================
// TOAST COMPONENT
// ============================================

class uiToast extends ui {
  static container = null;

  // Template configurations for toasts
  static templateConfigs = {
    default: {
      fields: ['title', 'message', 'color', 'duration'],
      defaults: {}
    },
    compact: {
      fields: ['message', 'color', 'duration'],
      defaults: {}
    },
    'with-action': {
      fields: ['title', 'message', 'color', 'actionLabel', 'duration'],
      defaults: { actionLabel: 'Undo' }
    },
    'with-progress': {
      fields: ['title', 'message', 'color', 'duration'],
      defaults: { duration: 5000 }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'with-action', 'with-progress'],
      default: 'default',
      description: 'Toast layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    title: {
      type: 'text',
      default: '',
      description: 'Toast title',
      group: 'content',
      order: 1,
      templates: ['default', 'with-action', 'with-progress']
    },
    message: {
      type: 'text',
      default: 'Toast message',
      description: 'Toast message',
      group: 'content',
      order: 2
    },
    actionLabel: {
      type: 'text',
      default: 'Undo',
      description: 'Action button label',
      group: 'content',
      order: 3,
      templates: ['with-action']
    },
    duration: {
      type: 'number',
      default: 5000,
      min: 0,
      description: 'Auto-dismiss duration (ms), 0 = manual',
      group: 'content',
      order: 4
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['success', 'danger', 'warning', 'info'],
      default: 'info',
      description: 'Toast color',
      group: 'appearance',
      order: 1
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  static ensureContainer() {
    if (!uiToast.container) {
      uiToast.container = document.createElement('div');
      uiToast.container.className = 'ui-toast-container';
      document.body.appendChild(uiToast.container);
    }
    return uiToast.container;
  }

  static show(options) {
    const container = uiToast.ensureContainer();
    const toast = new uiToast({
      ...options,
      parent: container
    });
    return toast;
  }

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const color = s.color || 'info';

    const toast = document.createElement('div');
    toast.id = this.id;
    toast.setAttribute('data-component-type', this.type);

    const classes = ['ui-toast', `ui-toast-template-${template}`];
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    toast.className = classes.join(' ');
    toast.dataset.color = color;

    const icons = {
      success: '✓',
      danger: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    // Compact template: single line, no title
    if (template === 'compact') {
      const icon = document.createElement('span');
      icon.className = 'ui-toast-icon';
      icon.textContent = icons[color] || 'ℹ';
      toast.appendChild(icon);

      const message = document.createElement('span');
      message.className = 'ui-toast-message';
      message.textContent = s.message || '';
      toast.appendChild(message);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ui-toast-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('data-toast-close', '');
      toast.appendChild(closeBtn);
    }
    // With-action template: includes action button
    else if (template === 'with-action') {
      const icon = document.createElement('span');
      icon.className = 'ui-toast-icon';
      icon.textContent = icons[color] || 'ℹ';
      toast.appendChild(icon);

      const content = document.createElement('div');
      content.className = 'ui-toast-content';

      if (s.title) {
        const title = document.createElement('p');
        title.className = 'ui-toast-title';
        title.textContent = s.title;
        content.appendChild(title);
      }

      const message = document.createElement('p');
      message.className = 'ui-toast-message';
      message.textContent = s.message || '';
      content.appendChild(message);

      toast.appendChild(content);

      const actionBtn = document.createElement('button');
      actionBtn.className = 'ui-toast-action';
      actionBtn.textContent = s.actionLabel || 'Undo';
      actionBtn.setAttribute('data-toast-action', '');
      toast.appendChild(actionBtn);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ui-toast-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('data-toast-close', '');
      toast.appendChild(closeBtn);
    }
    // With-progress template: includes progress bar
    else if (template === 'with-progress') {
      const icon = document.createElement('span');
      icon.className = 'ui-toast-icon';
      icon.textContent = icons[color] || 'ℹ';
      toast.appendChild(icon);

      const content = document.createElement('div');
      content.className = 'ui-toast-content';

      if (s.title) {
        const title = document.createElement('p');
        title.className = 'ui-toast-title';
        title.textContent = s.title;
        content.appendChild(title);
      }

      const message = document.createElement('p');
      message.className = 'ui-toast-message';
      message.textContent = s.message || '';
      content.appendChild(message);

      toast.appendChild(content);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ui-toast-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('data-toast-close', '');
      toast.appendChild(closeBtn);

      // Progress bar
      const progressWrap = document.createElement('div');
      progressWrap.className = 'ui-toast-progress-wrap';
      const progressBar = document.createElement('div');
      progressBar.className = 'ui-toast-progress';
      progressBar.style.animationDuration = (s.duration || 5000) + 'ms';
      progressWrap.appendChild(progressBar);
      toast.appendChild(progressWrap);
    }
    // Default template
    else {
      const icon = document.createElement('span');
      icon.className = 'ui-toast-icon';
      icon.textContent = icons[color] || 'ℹ';
      toast.appendChild(icon);

      const content = document.createElement('div');
      content.className = 'ui-toast-content';

      if (s.title) {
        const title = document.createElement('p');
        title.className = 'ui-toast-title';
        title.textContent = s.title;
        content.appendChild(title);
      }

      const message = document.createElement('p');
      message.className = 'ui-toast-message';
      message.textContent = s.message || '';
      content.appendChild(message);

      toast.appendChild(content);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ui-toast-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('data-toast-close', '');
      toast.appendChild(closeBtn);
    }

    this._applyThemeClasses(toast);
    return toast;
  }

  _bindEvents() {
    super._bindEvents();

    if (this.el) {
      const closeBtn = this.el.querySelector('[data-toast-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.dismiss());
      }

      const actionBtn = this.el.querySelector('[data-toast-action]');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          this.bus.emit('action', { component: this });
          this.dismiss();
        });
      }
    }

    // Auto-dismiss
    const duration = this._resolved.duration;
    if (duration > 0) {
      this._timeout = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  }

  dismiss() {
    if (this._timeout) clearTimeout(this._timeout);
    if (this.el) {
      this.el.style.animation = 'none';
      this.el.style.opacity = '0';
      this.el.style.transform = 'translateX(1rem)';
    }
    setTimeout(() => this.destroy(), 200);
  }
}

// ============================================
// SPINNER COMPONENT
// ============================================

class uiSpinner extends ui {
  static templateConfigs = {
    circular: {
      fields: ['color', 'size'],
      defaults: {}
    },
    dots: {
      fields: ['color', 'size', 'dotCount'],
      defaults: { dotCount: 3 }
    },
    bars: {
      fields: ['color', 'size', 'barCount'],
      defaults: { barCount: 4 }
    },
    pulse: {
      fields: ['color', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['circular', 'dots', 'bars', 'pulse'],
      default: 'circular',
      description: 'Spinner style',
      group: 'structure',
      order: 0
    },
    dotCount: {
      type: 'number',
      default: 3,
      min: 2,
      max: 5,
      description: 'Number of dots',
      group: 'structure',
      templates: ['dots']
    },
    barCount: {
      type: 'number',
      default: 4,
      min: 3,
      max: 6,
      description: 'Number of bars',
      group: 'structure',
      templates: ['bars']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['primary', 'secondary', 'gray', 'white'],
      default: 'primary',
      description: 'Spinner color',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Spinner size',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'circular';

    const spinner = document.createElement('div');
    spinner.id = this.id;
    spinner.setAttribute('data-component-type', this.type);
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Loading');

    const classes = ['ui-spinner', `ui-spinner-${template}`];

    if (s.size && s.size !== 'md') {
      classes.push(`ui-spinner-${s.size}`);
    }
    if (ui.editMode) classes.push('ui-component');
    spinner.className = classes.join(' ');
    if (s.color) spinner.dataset.color = s.color;

    // Add inner elements based on template
    if (template === 'dots') {
      const count = s.dotCount || 3;
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('span');
        dot.className = 'ui-spinner-dot';
        spinner.appendChild(dot);
      }
    } else if (template === 'bars') {
      const count = s.barCount || 4;
      for (let i = 0; i < count; i++) {
        const bar = document.createElement('span');
        bar.className = 'ui-spinner-bar';
        spinner.appendChild(bar);
      }
    }

    // Don't apply theme classes to spinner - it needs specific border-radius
    return spinner;
  }
}

// ============================================
// PROGRESS COMPONENT
// ============================================

class uiProgress extends ui {
  static templateConfigs = {
    default: {
      fields: ['value', 'showLabel', 'color', 'size'],
      defaults: { showLabel: false }
    },
    striped: {
      fields: ['value', 'showLabel', 'animated', 'color', 'size'],
      defaults: { showLabel: false, animated: true }
    },
    circular: {
      fields: ['value', 'showLabel', 'color', 'size', 'strokeWidth'],
      defaults: { showLabel: true, strokeWidth: 8 }
    },
    steps: {
      fields: ['currentStep', 'totalSteps', 'stepLabels', 'color'],
      defaults: { currentStep: 1, totalSteps: 4 }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'striped', 'circular', 'steps'],
      default: 'default',
      description: 'Progress style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    value: {
      type: 'slider',
      default: 0,
      min: 0,
      max: 100,
      description: 'Progress value (0-100)',
      group: 'content',
      templates: ['default', 'striped', 'circular']
    },
    showLabel: {
      type: 'checkbox',
      default: false,
      description: 'Show percentage label',
      group: 'content',
      templates: ['default', 'striped', 'circular']
    },
    currentStep: {
      type: 'number',
      default: 1,
      min: 1,
      description: 'Current step number',
      group: 'content',
      templates: ['steps']
    },
    totalSteps: {
      type: 'number',
      default: 4,
      min: 2,
      max: 10,
      description: 'Total number of steps',
      group: 'content',
      templates: ['steps']
    },
    stepLabels: {
      type: 'json',
      default: [],
      description: 'Labels for each step',
      group: 'content',
      templates: ['steps']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['primary', 'success', 'warning', 'danger', 'info'],
      default: 'primary',
      description: 'Progress bar color',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Progress bar size',
      group: 'appearance',
      order: 2,
      templates: ['default', 'striped', 'circular']
    },
    animated: {
      type: 'checkbox',
      default: true,
      description: 'Animate stripes',
      group: 'appearance',
      templates: ['striped']
    },
    strokeWidth: {
      type: 'number',
      default: 8,
      min: 4,
      max: 16,
      description: 'Circle stroke width',
      group: 'appearance',
      templates: ['circular']
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const value = s.value || 0;

    const progress = document.createElement('div');
    progress.id = this.id;
    progress.setAttribute('data-component-type', this.type);

    const classes = ['ui-progress', `ui-progress-template-${template}`];
    if (s.size && s.size !== 'md') {
      classes.push(`ui-progress-${s.size}`);
    }
    if (ui.editMode) classes.push('ui-component');
    progress.className = classes.join(' ');
    if (s.color) progress.dataset.color = s.color;

    if (template === 'circular') {
      // Circular progress
      const size = s.size === 'sm' ? 60 : s.size === 'lg' ? 120 : 80;
      const stroke = s.strokeWidth || 8;
      const radius = (size - stroke) / 2;
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (value / 100) * circumference;

      progress.innerHTML = `
        <svg class="ui-progress-circular" width="${size}" height="${size}">
          <circle class="ui-progress-circle-bg" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${stroke}"/>
          <circle class="ui-progress-circle-bar" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${stroke}"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
        </svg>
        ${s.showLabel ? `<span class="ui-progress-label">${value}%</span>` : ''}
      `;
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-valuenow', value);
    } else if (template === 'steps') {
      // Steps progress
      const total = s.totalSteps || 4;
      const current = Math.min(s.currentStep || 1, total);
      const labels = s.stepLabels || [];

      let stepsHtml = '<div class="ui-progress-steps">';
      for (let i = 1; i <= total; i++) {
        const status = i < current ? 'completed' : i === current ? 'current' : 'pending';
        stepsHtml += `<div class="ui-progress-step ui-progress-step-${status}">
          <div class="ui-progress-step-indicator">${i < current ? '✓' : i}</div>
          ${labels[i-1] ? `<span class="ui-progress-step-label">${labels[i-1]}</span>` : ''}
        </div>`;
        if (i < total) {
          stepsHtml += `<div class="ui-progress-step-connector ${i < current ? 'completed' : ''}"></div>`;
        }
      }
      stepsHtml += '</div>';
      progress.innerHTML = stepsHtml;
    } else {
      // Linear bar (default or striped)
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-valuenow', value);
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');

      const barClasses = ['ui-progress-bar'];
      if (template === 'striped') {
        barClasses.push('ui-progress-bar-striped');
        if (s.animated) barClasses.push('ui-progress-bar-animated');
      }

      progress.innerHTML = `
        <div class="${barClasses.join(' ')}" style="width: ${value}%"></div>
        ${s.showLabel ? `<span class="ui-progress-label">${value}%</span>` : ''}
      `;
    }

    this._applyThemeClasses(progress);
    return progress;
  }

  setValue(value) {
    this.settings.value = Math.max(0, Math.min(100, value));
    const template = this._resolved.template || 'default';

    if (template === 'circular') {
      const circle = this.el ? this.el.querySelector('.ui-progress-circle-bar') : null;
      if (circle) {
        const radius = parseFloat(circle.getAttribute('r'));
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (this.settings.value / 100) * circumference;
        circle.setAttribute('stroke-dashoffset', offset);
      }
    } else {
      const bar = this.el ? this.el.querySelector('.ui-progress-bar') : null;
      if (bar) {
        bar.style.width = this.settings.value + '%';
      }
    }

    const label = this.el ? this.el.querySelector('.ui-progress-label') : null;
    if (label) {
      label.textContent = this.settings.value + '%';
    }

    if (this.el) {
      this.el.setAttribute('aria-valuenow', this.settings.value);
    }
    this.bus.emit('change', { component: this, value: this.settings.value });
  }

  setStep(step) {
    if (this._resolved.template === 'steps') {
      this.settings.currentStep = step;
      this.refresh();
    }
  }
}

// ============================================
// TABLE COMPONENT
// ============================================

class uiTable extends ui {
  static templateConfigs = {
    default: {
      fields: ['columns', 'data', 'paging', 'searching', 'ordering', 'pageLength', 'info', 'responsive', 'buttons'],
      defaults: {}
    },
    compact: {
      fields: ['columns', 'data', 'paging', 'searching', 'ordering', 'pageLength', 'info'],
      defaults: { buttons: false, pageLength: 25 }
    },
    comfortable: {
      fields: ['columns', 'data', 'paging', 'searching', 'ordering', 'pageLength', 'info', 'buttons'],
      defaults: { pageLength: 10 }
    },
    borderless: {
      fields: ['columns', 'data', 'paging', 'searching', 'ordering', 'pageLength'],
      defaults: { buttons: false }
    },
    striped: {
      fields: ['columns', 'data', 'paging', 'searching', 'ordering', 'pageLength', 'info', 'buttons'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'comfortable', 'borderless', 'striped'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Table template style'
    },
    paging: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 1,
      description: 'Enable pagination'
    },
    searching: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 2,
      description: 'Enable search box'
    },
    ordering: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 3,
      description: 'Enable column sorting'
    },
    info: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 4,
      description: 'Show table info'
    },
    // ===== CONTENT =====
    columns: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Column definitions [{key, label, width?, sortable?, searchable?, visible?}]'
    },
    data: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 1,
      description: 'Table data array'
    },
    // ===== APPEARANCE =====
    pageLength: {
      type: 'number',
      default: 10,
      group: 'appearance',
      order: 0,
      description: 'Rows per page'
    },
    responsive: {
      type: 'checkbox',
      default: true,
      group: 'appearance',
      order: 1,
      description: 'Enable responsive mode'
    },
    buttons: {
      type: 'checkbox',
      default: true,
      group: 'appearance',
      order: 2,
      templates: ['default', 'comfortable', 'striped'],
      description: 'Show export buttons'
    },
    colReorder: {
      type: 'checkbox',
      default: true,
      group: 'appearance',
      order: 3,
      description: 'Enable column reordering'
    },
    colVisibility: {
      type: 'checkbox',
      default: true,
      group: 'appearance',
      order: 4,
      description: 'Show column visibility toggle'
    },
    // ===== ADVANCED =====
    stateSave: {
      type: 'checkbox',
      default: false,
      group: 'advanced',
      order: 0,
      description: 'Remember table state'
    },
    scrollX: {
      type: 'checkbox',
      default: false,
      group: 'advanced',
      order: 1,
      description: 'Enable horizontal scrolling'
    },
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 2,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const wrapper = document.createElement('div');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);
    wrapper.className = `ui-table-wrapper ui-table-${template}`;

    if (ui.editMode) {
      wrapper.classList.add('ui-component');
    }

    const table = document.createElement('table');
    table.id = this.id + '-table';
    const classes = ['ui-table', 'display'];
    if (template === 'striped') classes.push('stripe');
    if (template === 'borderless') classes.push('no-border');
    if (s.css) classes.push(...s.css.split(' ').filter(c => c));
    table.className = classes.join(' ');
    table.style.width = '100%';

    const columns = typeof s.columns === 'string' ? JSON.parse(s.columns || '[]') : (s.columns || []);
    const data = typeof s.data === 'string' ? JSON.parse(s.data || '[]') : (s.data || []);

    // Header
    let html = '<thead><tr>';
    columns.forEach(col => {
      html += '<th' + (col.width ? ' style="width:' + col.width + '"' : '') + '>';
      html += (col.label || col.key);
      html += '</th>';
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    data.forEach((row) => {
      html += '<tr>';
      columns.forEach(col => {
        html += '<td>' + (row[col.key] !== undefined ? row[col.key] : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody>';

    table.innerHTML = html;
    wrapper.appendChild(table);

    // Store table ref for DataTables init
    this._table = table;

    return wrapper;
  }

  afterRender() {
    // Initialize DataTables if available
    this._initDataTables();
  }

  _initDataTables() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.DataTable === 'undefined') {
      console.warn('DataTables not loaded. Include jQuery and DataTables scripts.');
      return;
    }

    // Destroy existing instance if re-rendering
    if (this._dtInstance) {
      this._dtInstance.destroy();
    }

    const s = this._resolved;
    const columns = typeof s.columns === 'string' ? JSON.parse(s.columns || '[]') : (s.columns || []);

    // Build DataTables column config
    const dtColumns = columns.map((col, index) => ({
      data: col.key,
      title: col.label || col.key,
      width: col.width || null,
      orderable: col.sortable !== false,
      searchable: col.searchable !== false,
      visible: col.visible !== false,
      render: col.render || null
    }));

    // Build buttons array
    const buttons = [];
    if (s.buttons !== false) {
      buttons.push(
        { extend: 'copy', className: 'ui-btn ui-btn-outline ui-btn-sm', text: '📋 Copy' },
        { extend: 'csv', className: 'ui-btn ui-btn-outline ui-btn-sm', text: '📄 CSV' },
        { extend: 'excel', className: 'ui-btn ui-btn-outline ui-btn-sm', text: '📊 Excel' },
        { extend: 'pdf', className: 'ui-btn ui-btn-outline ui-btn-sm', text: '📑 PDF' },
        { extend: 'print', className: 'ui-btn ui-btn-outline ui-btn-sm', text: '🖨️ Print' }
      );
    }
    if (s.colVisibility !== false) {
      if ($.fn.dataTable.ext.buttons.colvis) {
        buttons.push({
          extend: 'colvis',
          className: 'ui-btn ui-btn-outline ui-btn-sm',
          text: '👁️ Columns',
          columns: ':not(.noVis)'
        });
      } else {
        console.warn('[uiTable] colVisibility enabled but buttons.colVis plugin not loaded — skipping column toggle button');
      }
    }

    // Build DOM string based on settings
    let dom = '<"ui-dt-top"';
    if (buttons.length > 0) {
      dom += '<"ui-dt-buttons"B>';
    }
    dom += '<"ui-dt-controls"<"ui-dt-length"l><"ui-dt-search"f>>>';
    dom += 't';
    dom += '<"ui-dt-footer"<"ui-dt-info"i><"ui-dt-pagination"p>>';

    // DataTables config
    const dtConfig = {
      paging: s.paging !== false,
      searching: s.searching !== false,
      ordering: s.ordering !== false,
      info: s.info !== false,
      pageLength: s.pageLength || 10,
      responsive: s.responsive !== false,
      autoWidth: false,
      scrollX: s.scrollX === true,
      stateSave: s.stateSave === true,
      columns: dtColumns.length > 0 ? dtColumns : undefined,
      language: {
        search: '',
        searchPlaceholder: 'Search...',
        lengthMenu: 'Show _MENU_ entries',
        info: 'Showing _START_ to _END_ of _TOTAL_ entries',
        paginate: {
          first: '«',
          last: '»',
          next: '›',
          previous: '‹'
        },
        buttons: {
          copy: 'Copy',
          csv: 'CSV',
          excel: 'Excel',
          pdf: 'PDF',
          print: 'Print',
          colvis: 'Columns'
        }
      },
      dom: dom
    };

    // Add buttons if any
    if (buttons.length > 0) {
      dtConfig.buttons = buttons;
    }

    // Add colReorder if enabled
    if (s.colReorder !== false && typeof jQuery.fn.DataTable.ColReorder !== 'undefined') {
      dtConfig.colReorder = true;
    }

    // Initialize DataTables
    this._dtInstance = jQuery(this._table).DataTable(dtConfig);

    // Emit events for column reorder
    if (dtConfig.colReorder) {
      this._dtInstance.on('column-reorder', (e, settings, details) => {
        this.bus.emit('columnReorder', { component: this, from: details.from, to: details.to });
      });
    }

    this.bus.emit('datatables:init', { component: this, instance: this._dtInstance });
  }

  // DataTables API methods
  addRow(rowData) {
    if (this._dtInstance) {
      this._dtInstance.row.add(rowData).draw();
      this.bus.emit('rowAdded', { component: this, data: rowData });
    }
  }

  removeRow(index) {
    if (this._dtInstance) {
      this._dtInstance.row(index).remove().draw();
      this.bus.emit('rowRemoved', { component: this, index });
    }
  }

  updateRow(index, rowData) {
    if (this._dtInstance) {
      this._dtInstance.row(index).data(rowData).draw();
      this.bus.emit('rowUpdated', { component: this, index, data: rowData });
    }
  }

  setData(data) {
    if (this._dtInstance) {
      this._dtInstance.clear().rows.add(data).draw();
      this.bus.emit('dataUpdated', { component: this, data });
    }
  }

  search(query) {
    if (this._dtInstance) {
      this._dtInstance.search(query).draw();
    }
  }

  getSelectedRows() {
    if (this._dtInstance) {
      return this._dtInstance.rows({ selected: true }).data().toArray();
    }
    return [];
  }

  getInstance() {
    return this._dtInstance;
  }

  // Column visibility methods
  showColumn(columnIndex) {
    if (this._dtInstance) {
      this._dtInstance.column(columnIndex).visible(true);
      this.bus.emit('columnVisibility', { component: this, column: columnIndex, visible: true });
    }
  }

  hideColumn(columnIndex) {
    if (this._dtInstance) {
      this._dtInstance.column(columnIndex).visible(false);
      this.bus.emit('columnVisibility', { component: this, column: columnIndex, visible: false });
    }
  }

  toggleColumn(columnIndex) {
    if (this._dtInstance) {
      const col = this._dtInstance.column(columnIndex);
      col.visible(!col.visible());
      this.bus.emit('columnVisibility', { component: this, column: columnIndex, visible: col.visible() });
    }
  }

  getColumnVisibility() {
    if (this._dtInstance) {
      const visibility = {};
      this._dtInstance.columns().every(function(index) {
        visibility[index] = this.visible();
      });
      return visibility;
    }
    return {};
  }

  setColumnVisibility(visibilityMap) {
    if (this._dtInstance) {
      for (const [index, visible] of Object.entries(visibilityMap)) {
        this._dtInstance.column(parseInt(index)).visible(visible);
      }
      this.bus.emit('columnVisibilityBatch', { component: this, visibility: visibilityMap });
    }
  }

  // Column order methods
  getColumnOrder() {
    if (this._dtInstance && this._dtInstance.colReorder) {
      return this._dtInstance.colReorder.order();
    }
    return null;
  }

  setColumnOrder(orderArray) {
    if (this._dtInstance && this._dtInstance.colReorder) {
      this._dtInstance.colReorder.order(orderArray);
      this.bus.emit('columnOrderSet', { component: this, order: orderArray });
    }
  }

  resetColumnOrder() {
    if (this._dtInstance && this._dtInstance.colReorder) {
      this._dtInstance.colReorder.reset();
      this.bus.emit('columnOrderReset', { component: this });
    }
  }

  // Get current state (for saving)
  getState() {
    if (this._dtInstance) {
      return {
        columnVisibility: this.getColumnVisibility(),
        columnOrder: this.getColumnOrder(),
        pageLength: this._dtInstance.page.len(),
        search: this._dtInstance.search()
      };
    }
    return null;
  }

  // Restore state
  setState(state) {
    if (this._dtInstance && state) {
      if (state.columnVisibility) {
        this.setColumnVisibility(state.columnVisibility);
      }
      if (state.columnOrder) {
        this.setColumnOrder(state.columnOrder);
      }
      if (state.pageLength) {
        this._dtInstance.page.len(state.pageLength).draw();
      }
      if (state.search) {
        this._dtInstance.search(state.search).draw();
      }
      this.bus.emit('stateRestored', { component: this, state });
    }
  }

  onDestroy() {
    if (this._dtInstance) {
      this._dtInstance.destroy();
      this._dtInstance = null;
    }
  }
}

// ============================================
// FORM COMPONENT
// ============================================

class uiForm extends ui {
  // Template configurations for forms
  static templateConfigs = {
    default: {
      fields: ['fields', 'sections', 'buttons', 'columns', 'variant', 'size'],
      defaults: {}
    },
    inline: {
      fields: ['fields', 'buttons', 'columns', 'variant', 'size'],
      defaults: {}
    },
    horizontal: {
      fields: ['fields', 'sections', 'buttons', 'labelWidth', 'columns', 'variant', 'size'],
      defaults: { labelWidth: '30%' }
    },
    compact: {
      fields: ['fields', 'buttons', 'columns', 'variant', 'size'],
      defaults: { size: 'sm' }
    },
    wizard: {
      fields: ['steps', 'buttons', 'variant', 'size'],
      defaults: {}
    },
    sections: {
      fields: ['sections', 'buttons', 'variant', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'inline', 'horizontal', 'compact', 'wizard', 'sections'],
      default: 'default',
      description: 'Form layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    fields: {
      type: 'json',
      default: {},
      description: 'Form fields {name: {type, label, placeholder?, options?}}',
      group: 'content',
      order: 1,
      templates: ['default', 'inline', 'horizontal', 'compact']
    },
    sections: {
      type: 'json',
      default: [],
      description: 'Form sections [{title, fields}]',
      group: 'content',
      order: 2,
      templates: ['default', 'horizontal', 'sections']
    },
    steps: {
      type: 'json',
      default: [],
      description: 'Wizard steps [{title, fields}]',
      group: 'content',
      order: 3,
      templates: ['wizard']
    },
    buttons: {
      type: 'json',
      default: {},
      description: 'Form buttons {name: {label, variant?, type?}}',
      group: 'content',
      order: 4
    },
    labelWidth: {
      type: 'text',
      default: '30%',
      description: 'Label width for horizontal layout',
      group: 'content',
      order: 5,
      templates: ['horizontal']
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style (inherited by children)',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Form size (inherited by children)',
      group: 'appearance',
      order: 2
    },
    // ===== LAYOUT =====
    columns: {
      type: 'number',
      default: 1,
      description: 'Number of form field columns',
      group: 'structure',
      order: 1
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const form = document.createElement('form');
    form.id = this.id;
    form.setAttribute('data-component-type', this.type);

    const classes = ['ui-form', `ui-form-template-${template}`];
    if (variant !== 'default') classes.push(`ui-form-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-form-${size}`);
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    form.className = classes.join(' ');

    // Store variant/size for child inheritance
    this._childVariant = variant;
    this._childSize = size;

    const fields = s.fields || {};
    const sections = s.sections || [];
    const steps = s.steps || [];
    const buttons = s.buttons || {};

    // Wizard template
    if (template === 'wizard' && steps.length > 0) {
      this._currentStep = 0;
      this._steps = steps;

      // Step indicators
      const stepIndicators = document.createElement('div');
      stepIndicators.className = 'ui-form-steps';
      steps.forEach((step, index) => {
        const indicator = document.createElement('div');
        indicator.className = 'ui-form-step' + (index === 0 ? ' active' : '');
        indicator.innerHTML = `<span class="ui-form-step-num">${index + 1}</span><span class="ui-form-step-title">${step.title || `Step ${index + 1}`}</span>`;
        stepIndicators.appendChild(indicator);
      });
      form.appendChild(stepIndicators);

      // Step content container
      const stepsContainer = document.createElement('div');
      stepsContainer.className = 'ui-form-steps-content';
      steps.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'ui-form-step-content' + (index === 0 ? ' active' : '');
        stepEl.setAttribute('data-step', index);
        this._renderFields(stepEl, step.fields || {}, template);
        stepsContainer.appendChild(stepEl);
      });
      form.appendChild(stepsContainer);
      this._stepsContainer = stepsContainer;
      this._stepIndicators = stepIndicators;
    }
    // Sections template
    else if (template === 'sections' && sections.length > 0) {
      sections.forEach(section => {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'ui-form-section';

        if (section.title) {
          const legend = document.createElement('legend');
          legend.className = 'ui-form-section-title';
          legend.textContent = section.title;
          fieldset.appendChild(legend);
        }

        if (section.description) {
          const desc = document.createElement('p');
          desc.className = 'ui-form-section-description';
          desc.textContent = section.description;
          fieldset.appendChild(desc);
        }

        this._renderFields(fieldset, section.fields || {}, template);
        form.appendChild(fieldset);
      });
    }
    // Inline template
    else if (template === 'inline') {
      const inlineWrap = document.createElement('div');
      inlineWrap.className = 'ui-form-inline';
      this._renderFields(inlineWrap, fields, template);

      // Add buttons inline
      for (const [name, config] of Object.entries(buttons)) {
        const btn = document.createElement('button');
        btn.type = config.type || 'button';
        btn.name = name;
        const btnVariant = config.variant || 'primary';
        btn.className = 'ui-btn ui-btn-' + btnVariant;
        if (['primary','secondary','success','danger','warning'].includes(btnVariant)) btn.dataset.color = btnVariant;
        if (size !== 'md') btn.classList.add(`ui-btn-${size}`);
        btn.textContent = config.label || name;
        inlineWrap.appendChild(btn);
      }

      form.appendChild(inlineWrap);
      return form; // Skip button group for inline
    }
    // Horizontal/Default/Compact templates with optional sections
    else {
      if (sections.length > 0) {
        sections.forEach(section => {
          const fieldset = document.createElement('fieldset');
          fieldset.className = 'ui-form-section';

          if (section.title) {
            const legend = document.createElement('legend');
            legend.className = 'ui-form-section-title';
            legend.textContent = section.title;
            fieldset.appendChild(legend);
          }

          this._renderFields(fieldset, section.fields || {}, template);
          form.appendChild(fieldset);
        });
      } else {
        this._renderFields(form, fields, template);
      }
    }

    // Buttons (except for inline template which handles them differently)
    if (Object.keys(buttons).length > 0) {
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'ui-form-buttons';

      // Wizard has prev/next buttons
      if (template === 'wizard') {
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'ui-btn ui-btn-ghost';
        prevBtn.textContent = 'Previous';
        prevBtn.style.display = 'none';
        prevBtn.setAttribute('data-action', 'prev');
        buttonGroup.appendChild(prevBtn);
        this._prevBtn = prevBtn;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'ui-btn ui-btn-primary';
        nextBtn.dataset.color = 'primary';
        nextBtn.textContent = 'Next';
        nextBtn.setAttribute('data-action', 'next');
        buttonGroup.appendChild(nextBtn);
        this._nextBtn = nextBtn;
      }

      for (const [name, config] of Object.entries(buttons)) {
        const btn = document.createElement('button');
        btn.type = config.type || 'button';
        btn.name = name;
        const btnV = config.variant || 'primary';
        btn.className = 'ui-btn ui-btn-' + btnV;
        if (['primary','secondary','success','danger','warning'].includes(btnV)) btn.dataset.color = btnV;
        if (size !== 'md') btn.classList.add(`ui-btn-${size}`);
        btn.textContent = config.label || name;
        buttonGroup.appendChild(btn);
      }

      form.appendChild(buttonGroup);
    }

    this._applyThemeClasses(form);
    return form;
  }

  _renderFields(container, fields, template) {
    const s = this._resolved;
    const labelWidth = s.labelWidth || '30%';
    const cols = parseInt(s.columns) || 1;

    // Multi-column grid wrapper
    let target = container;
    if (cols > 1) {
      target = document.createElement('div');
      target.style.cssText = `display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 0 var(--ui-space-4, 1rem); align-items: start;`;
      container.appendChild(target);
    }

    for (const [name, config] of Object.entries(fields)) {
      const group = document.createElement('div');
      group.className = 'ui-form-group';
      group.dataset.field = name;

      // Hidden fields: collapse wrapper, skip label
      if (config.type === 'hidden') {
        group.style.display = 'none';
      } else if (template === 'horizontal') {
        group.classList.add('ui-form-group-horizontal');
        group.style.setProperty('--label-width', labelWidth);
      }

      if (config.label && config.type !== 'hidden') {
        const label = document.createElement('label');
        label.className = 'ui-form-label';
        label.textContent = config.label;
        label.setAttribute('for', this.id + '-' + name);
        group.appendChild(label);
      }

      const inputWrap = document.createElement('div');
      inputWrap.className = 'ui-form-input-wrap';

      const input = ui._createFormField(name, config, config.value);
      input.id = this.id + '-' + name;
      input.name = name;

      // Inherit size from form
      if (this._childSize && this._childSize !== 'md') {
        input.classList.add(`ui-input-${this._childSize}`);
      }

      inputWrap.appendChild(input);

      if (config.hint) {
        const hint = document.createElement('p');
        hint.className = 'ui-form-hint';
        hint.textContent = config.hint;
        inputWrap.appendChild(hint);
      }

      group.appendChild(inputWrap);
      target.appendChild(group);
    }
  }

  // Wizard navigation
  goToStep(stepIndex) {
    if (!this._stepsContainer || stepIndex < 0 || stepIndex >= this._steps.length) return;

    this._currentStep = stepIndex;

    // Update step content
    this._stepsContainer.querySelectorAll('.ui-form-step-content').forEach((el, i) => {
      el.classList.toggle('active', i === stepIndex);
    });

    // Update indicators
    this._stepIndicators.querySelectorAll('.ui-form-step').forEach((el, i) => {
      el.classList.toggle('active', i === stepIndex);
      el.classList.toggle('completed', i < stepIndex);
    });

    // Update prev/next buttons
    if (this._prevBtn) {
      this._prevBtn.style.display = stepIndex === 0 ? 'none' : '';
    }
    if (this._nextBtn) {
      this._nextBtn.textContent = stepIndex === this._steps.length - 1 ? 'Submit' : 'Next';
    }

    this.bus.emit('stepChange', { component: this, step: stepIndex });
  }

  nextStep() {
    if (this._currentStep < this._steps.length - 1) {
      this.goToStep(this._currentStep + 1);
    } else {
      // Last step - submit
      this.bus.emit('submit', { component: this, data: this.getData() });
    }
  }

  prevStep() {
    if (this._currentStep > 0) {
      this.goToStep(this._currentStep - 1);
    }
  }

  _bindEvents() {
    super._bindEvents();

    if (this.el) {
      this.el.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = this.getData();
        this.bus.emit('submit', { component: this, data });
      });

      // Wizard navigation buttons
      if (this._prevBtn) {
        this._prevBtn.addEventListener('click', () => this.prevStep());
      }
      if (this._nextBtn) {
        this._nextBtn.addEventListener('click', () => this.nextStep());
      }

      this.el.querySelectorAll('button[type="button"]').forEach(btn => {
        const action = btn.getAttribute('data-action');
        if (action === 'prev' || action === 'next') return; // Skip wizard buttons

        btn.addEventListener('click', () => {
          this.bus.emit('buttonClick', { component: this, button: btn.name });
        });
      });

      // Delegated change listener for field-level reactivity
      this.el.addEventListener('change', (e) => {
        const input = e.target;
        const name = input.name;
        if (!name) return;
        const value = input.type === 'checkbox' ? input.checked : input.value;
        this.bus.emit('fieldChange', { component: this, field: name, value });
      });
    }
  }

  getData() {
    const data = {};
    if (!this.el) return data;

    const formData = new FormData(this.el);
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Handle checkboxes
    this.el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      data[cb.name] = cb.checked;
    });

    return data;
  }

  setData(data) {
    if (!this.el) return;

    for (const [name, value] of Object.entries(data)) {
      const input = this.el.querySelector('[name="' + name + '"]');
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = !!value;
        } else if ((input.type === 'datetime-local' || input.type === 'date') && value) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            const p = n => String(n).padStart(2, '0');
            input.value = input.type === 'datetime-local'
              ? `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
              : `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
          } else {
            input.value = value;
          }
        } else {
          input.value = value;
        }
      }
    }
  }

  setFieldVisibility(fieldName, visible) {
    if (!this.el) return;
    const group = this.el.querySelector(`.ui-form-group[data-field="${fieldName}"]`);
    if (group) group.style.display = visible ? '' : 'none';
  }

  setFieldReadonly(fieldName, readonly) {
    if (!this.el) return;
    const input = this.el.querySelector(`[name="${fieldName}"]`);
    if (!input) return;
    input.disabled = readonly;
    const group = this.el.querySelector(`.ui-form-group[data-field="${fieldName}"]`);
    if (group) group.classList.toggle('ui-form-group-locked', readonly);
  }
}

// ============================================
// FORM MAPPING — Discriminator-Driven Visibility
// ============================================

class uiFormMapping {
  constructor(form, config) {
    this._form = form;
    this._discriminator = config.discriminator;
    this._hidden = config.hidden || [];
    this._locked = config.locked || [];
    this._common = config.common || [];
    this._profiles = config.profiles || {};
    this._activeProfile = null;

    // Collect all profile-specific field names
    this._allProfileFields = new Set();
    for (const profile of Object.values(this._profiles)) {
      for (const f of (profile.fields || [])) this._allProfileFields.add(f);
    }

    // Permanently hide fields that are set programmatically
    for (const name of this._hidden) {
      this._form.setFieldVisibility(name, false);
    }

    // Apply locks on construction
    for (const name of this._locked) {
      this._form.setFieldVisibility(name, true);
      this._form.setFieldReadonly(name, true);
    }

    // Subscribe to discriminator changes
    this._unsub = form.bus.on('fieldChange', (e) => {
      if (e.field === this._discriminator) {
        this.applyProfile(e.value);
      }
    });
  }

  applyProfile(profileName) {
    this._activeProfile = profileName;
    const profile = this._profiles[profileName];
    const activeFields = profile ? (profile.fields || []) : [];

    // Hide all profile-specific fields first
    for (const f of this._allProfileFields) {
      this._form.setFieldVisibility(f, false);
    }

    // Show discriminator
    this._form.setFieldVisibility(this._discriminator, true);

    // Show common fields
    for (const f of this._common) {
      this._form.setFieldVisibility(f, true);
    }

    // Show active profile fields
    for (const f of activeFields) {
      this._form.setFieldVisibility(f, true);
    }

    // Ensure locked fields stay visible and readonly
    for (const f of this._locked) {
      this._form.setFieldVisibility(f, true);
      this._form.setFieldReadonly(f, true);
    }

    // Ensure hidden fields stay hidden
    for (const f of this._hidden) {
      this._form.setFieldVisibility(f, false);
    }
  }

  lockField(name, value) {
    if (this._form.el) {
      const input = this._form.el.querySelector(`[name="${name}"]`);
      if (input) input.value = value;
    }
    this._form.setFieldVisibility(name, true);
    this._form.setFieldReadonly(name, true);
  }

  sync() {
    if (!this._form.el) return;
    const input = this._form.el.querySelector(`[name="${this._discriminator}"]`);
    const value = input ? input.value : '';
    this.applyProfile(value);
  }

  getActiveProfile() {
    return this._activeProfile;
  }

  destroy() {
    if (this._unsub) this._unsub();
    this._unsub = null;
  }
}

// ============================================
// BUTTON GROUP COMPONENT
// ============================================

class uiButtonGroup extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: {
      fields: ['buttons', 'direction'],
      defaults: {}
    },
    compact: {
      fields: ['buttons', 'direction'],
      defaults: { size: 'sm' }
    }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact'],
      default: 'default',
      description: 'Button group layout',
      group: 'structure',
      order: 0
    },

    // ===== CONTENT =====
    buttons: {
      type: 'json',
      default: [],
      description: 'Array of button configs [{label, variant?, onClick?}]',
      group: 'content'
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'minimal', 'outlined'],
      default: 'default',
      description: 'Visual style',
      group: 'appearance',
      order: 1
    },
    direction: {
      type: 'select',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'Button group direction',
      group: 'appearance'
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Button size',
      group: 'appearance'
    },

    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const group = document.createElement('div');
    group.id = this.id;
    group.setAttribute('data-component-type', this.type);
    group.setAttribute('role', 'group');

    // Use resolved settings
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';

    const classes = ['ui-btn-group'];

    // Direction
    if (s.direction === 'vertical') {
      classes.push('ui-btn-group-vertical');
    } else {
      classes.push('ui-btn-group-horizontal');
    }

    // Variant styles
    if (variant !== 'default') {
      classes.push('ui-btn-group-' + variant);
    }

    // Template (compact)
    if (template === 'compact') {
      classes.push('ui-btn-group-compact');
    }

    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    group.className = classes.join(' ');

    // Apply theme classes
    this._applyThemeClasses(group);

    // Build buttons
    const buttons = s.buttons || [];
    const btnSize = template === 'compact' ? 'sm' : (s.size || 'md');

    buttons.forEach((btnConfig, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';

      const bgV = btnConfig.variant || 'primary';
      const btnClasses = ['ui-btn', 'ui-btn-' + bgV];
      if (btnSize !== 'md') btnClasses.push('ui-btn-' + btnSize);
      btn.className = btnClasses.join(' ');
      if (['primary','secondary','success','danger','warning'].includes(bgV)) btn.dataset.color = bgV;

      btn.innerHTML = btnConfig.label || 'Button';
      if (btnConfig.disabled) btn.disabled = true;

      btn.addEventListener('click', () => {
        this.bus.emit('click', { component: this, buttonIndex: index, button: btnConfig });
        if (btnConfig.onClick) btnConfig.onClick();
      });

      group.appendChild(btn);
    });

    return group;
  }
}

// ============================================
// TEXTAREA COMPONENT
// ============================================

class uiTextarea extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: { fields: ['value', 'placeholder', 'rows'], defaults: {} },
    'auto-grow': { fields: ['value', 'placeholder'], defaults: { rows: 2 } },
    code: { fields: ['value', 'placeholder', 'rows'], defaults: { rows: 10 } }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'auto-grow', 'code'],
      default: 'default',
      description: 'Textarea layout',
      group: 'structure',
      order: 0
    },

    // ===== CONTENT =====
    value: {
      type: 'textarea',
      default: '',
      description: 'Textarea content',
      group: 'content'
    },
    placeholder: {
      type: 'text',
      default: '',
      description: 'Placeholder text',
      group: 'content'
    },
    rows: {
      type: 'number',
      default: 4,
      description: 'Number of visible rows',
      group: 'content',
      templates: ['default', 'code']
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'minimal', 'outlined', 'soft'],
      default: 'default',
      description: 'Visual style',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Textarea size',
      group: 'appearance',
      order: 2
    },
    disabled: {
      type: 'checkbox',
      default: false,
      description: 'Disable textarea',
      group: 'appearance'
    },

    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';

    const textarea = document.createElement('textarea');
    textarea.id = this.id;
    textarea.setAttribute('data-component-type', this.type);
    textarea.placeholder = s.placeholder || '';
    textarea.value = s.value || '';
    textarea.rows = s.rows || 4;
    textarea.disabled = s.disabled || false;

    const classes = ['ui-textarea'];
    if (variant !== 'default') classes.push(`ui-textarea-variant-${variant}`);
    if (s.size && s.size !== 'md') classes.push(`ui-textarea-${s.size}`);
    if (template === 'code') classes.push('ui-textarea-code');
    if (template === 'auto-grow') classes.push('ui-textarea-auto-grow');
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    textarea.className = classes.join(' ');

    this._applyThemeClasses(textarea);

    // Auto-grow functionality
    if (template === 'auto-grow') {
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }

    textarea.addEventListener('input', () => {
      this.settings.value = textarea.value;
      this.bus.emit('change', { component: this, value: textarea.value });
    });

    return textarea;
  }

  getValue() {
    return this.el ? this.el.value : this.settings.value;
  }

  setValue(value) {
    this.settings.value = value;
    if (this.el) this.el.value = value;
  }
}

// ============================================
// CHECKBOX COMPONENT
// ============================================

class uiCheckbox extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: { fields: ['label', 'checked'], defaults: {} },
    card: { fields: ['label', 'checked', 'description'], defaults: {} },
    button: { fields: ['label', 'checked'], defaults: {} }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'card', 'button'],
      default: 'default',
      description: 'Checkbox layout',
      group: 'structure',
      order: 0
    },

    // ===== CONTENT =====
    label: {
      type: 'text',
      default: 'Checkbox',
      description: 'Checkbox label',
      group: 'content'
    },
    description: {
      type: 'text',
      default: '',
      description: 'Description text',
      group: 'content',
      templates: ['card']
    },
    checked: {
      type: 'checkbox',
      default: false,
      description: 'Checked state',
      group: 'content'
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'minimal', 'outlined', 'soft'],
      default: 'default',
      description: 'Visual style',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Checkbox size',
      group: 'appearance',
      order: 2
    },
    disabled: {
      type: 'checkbox',
      default: false,
      description: 'Disable checkbox',
      group: 'appearance'
    },

    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';

    const wrapper = document.createElement('label');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);

    const classes = ['ui-checkbox'];
    if (template !== 'default') classes.push(`ui-checkbox-${template}`);
    if (variant !== 'default') classes.push(`ui-checkbox-variant-${variant}`);
    if (s.size && s.size !== 'md') classes.push(`ui-checkbox-${s.size}`);
    if (s.checked) classes.push('ui-checked');
    if (s.disabled) classes.push('ui-disabled');
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    wrapper.className = classes.join(' ');

    this._applyThemeClasses(wrapper);

    const box = document.createElement('span');
    box.className = 'ui-checkbox-box';

    const labelText = document.createElement('span');
    labelText.className = 'ui-checkbox-label';
    labelText.textContent = s.label || 'Checkbox';

    wrapper.appendChild(box);
    wrapper.appendChild(labelText);

    // Card template adds description
    if (template === 'card' && s.description) {
      const desc = document.createElement('span');
      desc.className = 'ui-checkbox-description';
      desc.textContent = s.description;
      wrapper.appendChild(desc);
    }

    if (!s.disabled) {
      wrapper.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    return wrapper;
  }

  toggle() {
    this.settings.checked = !this.settings.checked;
    if (this.el) {
      this.el.classList.toggle('ui-checked', this.settings.checked);
    }
    this.bus.emit('change', { component: this, checked: this.settings.checked });
  }

  isChecked() {
    return this.settings.checked;
  }

  setChecked(value) {
    this.settings.checked = !!value;
    if (this.el) {
      this.el.classList.toggle('ui-checked', this.settings.checked);
    }
  }
}

// ============================================
// RADIO COMPONENT
// ============================================

class uiRadio extends ui {
  // Template configurations for radio groups
  static templateConfigs = {
    default: {
      fields: ['name', 'options', 'value', 'variant', 'size', 'disabled'],
      defaults: {}
    },
    card: {
      fields: ['name', 'options', 'value', 'variant', 'size', 'disabled'],
      defaults: { variant: 'soft' }
    },
    button: {
      fields: ['name', 'options', 'value', 'variant', 'size', 'disabled'],
      defaults: { variant: 'default' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'card', 'button'],
      default: 'default',
      description: 'Radio layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    name: {
      type: 'text',
      default: 'radio-group',
      description: 'Radio group name',
      group: 'content',
      order: 1
    },
    options: {
      type: 'json',
      default: [],
      description: 'Radio options [{value, label}]',
      group: 'content',
      order: 2
    },
    value: {
      type: 'text',
      default: '',
      description: 'Selected value',
      group: 'content',
      order: 3
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Radio size',
      group: 'appearance',
      order: 2
    },
    disabled: {
      type: 'checkbox',
      default: false,
      description: 'Disable all radios',
      group: 'appearance',
      order: 3
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const wrapper = document.createElement('div');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);
    wrapper.setAttribute('role', 'radiogroup');

    const classes = ['ui-radio-group', `ui-radio-template-${template}`];
    if (variant !== 'default') classes.push(`ui-radio-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-radio-${size}`);
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    wrapper.className = classes.join(' ');

    const options = s.options || [];
    options.forEach((opt) => {
      const label = document.createElement('label');
      label.className = 'ui-radio';
      if (opt.value === s.value) label.classList.add('ui-checked');
      if (s.disabled) label.classList.add('ui-disabled');

      // Card template
      if (template === 'card') {
        label.classList.add('ui-radio-card');
        const content = document.createElement('div');
        content.className = 'ui-radio-card-content';

        const box = document.createElement('span');
        box.className = 'ui-radio-box';
        content.appendChild(box);

        const text = document.createElement('span');
        text.className = 'ui-radio-label';
        text.textContent = opt.label || opt.value;
        content.appendChild(text);

        if (opt.description) {
          const desc = document.createElement('span');
          desc.className = 'ui-radio-description';
          desc.textContent = opt.description;
          content.appendChild(desc);
        }

        label.appendChild(content);
      }
      // Button template
      else if (template === 'button') {
        label.classList.add('ui-radio-button');
        const text = document.createElement('span');
        text.className = 'ui-radio-label';
        text.textContent = opt.label || opt.value;
        label.appendChild(text);
      }
      // Default template
      else {
        const box = document.createElement('span');
        box.className = 'ui-radio-box';

        const text = document.createElement('span');
        text.className = 'ui-radio-label';
        text.textContent = opt.label || opt.value;

        label.appendChild(box);
        label.appendChild(text);
      }

      if (!s.disabled) {
        label.addEventListener('click', (e) => {
          e.preventDefault();
          this.setValue(opt.value);
        });
      }

      wrapper.appendChild(label);
    });

    this._applyThemeClasses(wrapper);
    return wrapper;
  }

  getValue() {
    return this.settings.value;
  }

  setValue(value) {
    this.settings.value = value;
    if (this.el) {
      this.el.querySelectorAll('.ui-radio').forEach((radio, index) => {
        const opt = this.settings.options[index];
        radio.classList.toggle('ui-checked', opt && opt.value === value);
      });
    }
    this.bus.emit('change', { component: this, value });
  }
}

// ============================================
// SWITCH / TOGGLE COMPONENT
// ============================================

class uiSwitch extends ui {
  // Template configurations for switches
  static templateConfigs = {
    default: {
      fields: ['label', 'checked', 'variant', 'size', 'disabled'],
      defaults: {}
    },
    labeled: {
      fields: ['label', 'onLabel', 'offLabel', 'checked', 'variant', 'size', 'disabled'],
      defaults: { onLabel: 'On', offLabel: 'Off' }
    },
    icon: {
      fields: ['label', 'onIcon', 'offIcon', 'checked', 'variant', 'size', 'disabled'],
      defaults: { onIcon: '✓', offIcon: '✕' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'labeled', 'icon'],
      default: 'default',
      description: 'Switch layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    label: {
      type: 'text',
      default: '',
      description: 'Switch label',
      group: 'content',
      order: 1
    },
    checked: {
      type: 'checkbox',
      default: false,
      description: 'On/Off state',
      group: 'content',
      order: 2
    },
    onLabel: {
      type: 'text',
      default: 'On',
      description: 'Label when on',
      group: 'content',
      order: 3,
      templates: ['labeled']
    },
    offLabel: {
      type: 'text',
      default: 'Off',
      description: 'Label when off',
      group: 'content',
      order: 4,
      templates: ['labeled']
    },
    onIcon: {
      type: 'text',
      default: '✓',
      description: 'Icon when on',
      group: 'content',
      order: 5,
      templates: ['icon']
    },
    offIcon: {
      type: 'text',
      default: '✕',
      description: 'Icon when off',
      group: 'content',
      order: 6,
      templates: ['icon']
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Switch size',
      group: 'appearance',
      order: 2
    },
    disabled: {
      type: 'checkbox',
      default: false,
      description: 'Disable switch',
      group: 'appearance',
      order: 3
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const wrapper = document.createElement('label');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);

    const classes = ['ui-switch', `ui-switch-template-${template}`];
    if (s.checked) classes.push('ui-checked');
    if (s.disabled) classes.push('ui-disabled');
    if (variant !== 'default') classes.push(`ui-switch-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-switch-${size}`);
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    wrapper.className = classes.join(' ');

    const track = document.createElement('span');
    track.className = 'ui-switch-track';

    const thumb = document.createElement('span');
    thumb.className = 'ui-switch-thumb';

    // Labeled template: add on/off labels inside track
    if (template === 'labeled') {
      const onText = document.createElement('span');
      onText.className = 'ui-switch-on-label';
      onText.textContent = s.onLabel || 'On';
      track.appendChild(onText);

      const offText = document.createElement('span');
      offText.className = 'ui-switch-off-label';
      offText.textContent = s.offLabel || 'Off';
      track.appendChild(offText);
    }
    // Icon template: add icons inside thumb
    else if (template === 'icon') {
      thumb.setAttribute('data-on-icon', s.onIcon || '✓');
      thumb.setAttribute('data-off-icon', s.offIcon || '✕');
      thumb.textContent = s.checked ? (s.onIcon || '✓') : (s.offIcon || '✕');
    }

    track.appendChild(thumb);
    wrapper.appendChild(track);

    if (s.label) {
      const labelText = document.createElement('span');
      labelText.className = 'ui-switch-label';
      labelText.textContent = s.label;
      wrapper.appendChild(labelText);
    }

    if (!s.disabled) {
      wrapper.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    this._applyThemeClasses(wrapper);
    return wrapper;
  }

  toggle() {
    this.settings.checked = !this.settings.checked;
    if (this.el) {
      this.el.classList.toggle('ui-checked', this.settings.checked);
    }
    this.bus.emit('change', { component: this, checked: this.settings.checked });
  }

  isChecked() {
    return this.settings.checked;
  }

  setChecked(value) {
    this.settings.checked = !!value;
    if (this.el) {
      this.el.classList.toggle('ui-checked', this.settings.checked);
    }
  }
}

// ============================================
// SLIDER / RANGE COMPONENT
// ============================================

class uiSlider extends ui {
  // Template configurations for sliders
  static templateConfigs = {
    default: {
      fields: ['value', 'min', 'max', 'step', 'showValue', 'variant', 'disabled'],
      defaults: {}
    },
    range: {
      fields: ['valueMin', 'valueMax', 'min', 'max', 'step', 'showValue', 'variant', 'disabled'],
      defaults: { valueMin: 25, valueMax: 75 }
    },
    'with-input': {
      fields: ['value', 'min', 'max', 'step', 'variant', 'disabled'],
      defaults: { showValue: false }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'range', 'with-input'],
      default: 'default',
      description: 'Slider layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    value: {
      type: 'number',
      default: 50,
      description: 'Current value',
      group: 'content',
      order: 1,
      templates: ['default', 'with-input']
    },
    valueMin: {
      type: 'number',
      default: 25,
      description: 'Minimum range value',
      group: 'content',
      order: 2,
      templates: ['range']
    },
    valueMax: {
      type: 'number',
      default: 75,
      description: 'Maximum range value',
      group: 'content',
      order: 3,
      templates: ['range']
    },
    min: {
      type: 'number',
      default: 0,
      description: 'Minimum value',
      group: 'content',
      order: 4
    },
    max: {
      type: 'number',
      default: 100,
      description: 'Maximum value',
      group: 'content',
      order: 5
    },
    step: {
      type: 'number',
      default: 1,
      description: 'Step increment',
      group: 'content',
      order: 6
    },
    showValue: {
      type: 'checkbox',
      default: true,
      description: 'Show current value',
      group: 'content',
      order: 7,
      templates: ['default', 'range']
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    disabled: {
      type: 'checkbox',
      default: false,
      description: 'Disable slider',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';

    const wrapper = document.createElement('div');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);

    const classes = ['ui-slider', `ui-slider-template-${template}`];
    if (s.disabled) classes.push('ui-disabled');
    if (variant !== 'default') classes.push(`ui-slider-variant-${variant}`);
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    wrapper.className = classes.join(' ');

    // With-input template: slider + number input
    if (template === 'with-input') {
      const sliderWrap = document.createElement('div');
      sliderWrap.className = 'ui-slider-input-wrapper';

      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'ui-slider-track';
      input.min = s.min || 0;
      input.max = s.max || 100;
      input.step = s.step || 1;
      input.value = s.value || 50;
      input.disabled = s.disabled || false;

      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.className = 'ui-slider-number';
      numInput.min = s.min || 0;
      numInput.max = s.max || 100;
      numInput.step = s.step || 1;
      numInput.value = s.value || 50;
      numInput.disabled = s.disabled || false;

      input.addEventListener('input', () => {
        numInput.value = input.value;
        this.settings.value = parseFloat(input.value);
        this.bus.emit('change', { component: this, value: this.settings.value });
      });

      numInput.addEventListener('input', () => {
        input.value = numInput.value;
        this.settings.value = parseFloat(numInput.value);
        this.bus.emit('change', { component: this, value: this.settings.value });
      });

      sliderWrap.appendChild(input);
      sliderWrap.appendChild(numInput);
      wrapper.appendChild(sliderWrap);
      this._input = input;
      this._numInput = numInput;
    }
    // Range template (dual handles - note: uses two inputs for simplicity)
    else if (template === 'range') {
      const rangeWrap = document.createElement('div');
      rangeWrap.className = 'ui-slider-range-wrapper';

      const inputMin = document.createElement('input');
      inputMin.type = 'range';
      inputMin.className = 'ui-slider-track ui-slider-track-min';
      inputMin.min = s.min || 0;
      inputMin.max = s.max || 100;
      inputMin.step = s.step || 1;
      inputMin.value = s.valueMin || 25;
      inputMin.disabled = s.disabled || false;

      const inputMax = document.createElement('input');
      inputMax.type = 'range';
      inputMax.className = 'ui-slider-track ui-slider-track-max';
      inputMax.min = s.min || 0;
      inputMax.max = s.max || 100;
      inputMax.step = s.step || 1;
      inputMax.value = s.valueMax || 75;
      inputMax.disabled = s.disabled || false;

      rangeWrap.appendChild(inputMin);
      rangeWrap.appendChild(inputMax);
      wrapper.appendChild(rangeWrap);

      if (s.showValue !== false) {
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'ui-slider-value';
        valueDisplay.textContent = `${inputMin.value} - ${inputMax.value}`;
        wrapper.appendChild(valueDisplay);
        this._valueDisplay = valueDisplay;
      }

      inputMin.addEventListener('input', () => {
        if (parseFloat(inputMin.value) > parseFloat(inputMax.value)) {
          inputMin.value = inputMax.value;
        }
        this.settings.valueMin = parseFloat(inputMin.value);
        if (this._valueDisplay) {
          this._valueDisplay.textContent = `${inputMin.value} - ${inputMax.value}`;
        }
        this.bus.emit('change', { component: this, valueMin: this.settings.valueMin, valueMax: this.settings.valueMax });
      });

      inputMax.addEventListener('input', () => {
        if (parseFloat(inputMax.value) < parseFloat(inputMin.value)) {
          inputMax.value = inputMin.value;
        }
        this.settings.valueMax = parseFloat(inputMax.value);
        if (this._valueDisplay) {
          this._valueDisplay.textContent = `${inputMin.value} - ${inputMax.value}`;
        }
        this.bus.emit('change', { component: this, valueMin: this.settings.valueMin, valueMax: this.settings.valueMax });
      });

      this._inputMin = inputMin;
      this._inputMax = inputMax;
    }
    // Default template
    else {
      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'ui-slider-track';
      input.min = s.min || 0;
      input.max = s.max || 100;
      input.step = s.step || 1;
      input.value = s.value || 50;
      input.disabled = s.disabled || false;

      wrapper.appendChild(input);

      if (s.showValue !== false) {
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'ui-slider-value';
        valueDisplay.textContent = input.value;
        wrapper.appendChild(valueDisplay);
        this._valueDisplay = valueDisplay;
      }

      input.addEventListener('input', () => {
        this.settings.value = parseFloat(input.value);
        if (this._valueDisplay) {
          this._valueDisplay.textContent = input.value;
        }
        this.bus.emit('change', { component: this, value: this.settings.value });
      });

      this._input = input;
    }

    this._applyThemeClasses(wrapper);
    return wrapper;
  }

  getValue() {
    return this._input ? parseFloat(this._input.value) : this.settings.value;
  }

  setValue(value) {
    this.settings.value = value;
    if (this._input) {
      this._input.value = value;
      if (this._valueDisplay) {
        this._valueDisplay.textContent = value;
      }
    }
  }
}

// ============================================
// BREADCRUMBS COMPONENT
// ============================================

class uiBreadcrumbs extends ui {
  static templateConfigs = {
    default: {
      fields: ['items', 'separator', 'size'],
      defaults: { separator: '/' }
    },
    arrows: {
      fields: ['items', 'size', 'color'],
      defaults: {}
    },
    pills: {
      fields: ['items', 'size', 'color'],
      defaults: { color: 'gray' }
    },
    dots: {
      fields: ['items', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'arrows', 'pills', 'dots'],
      default: 'default',
      description: 'Breadcrumb style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    items: {
      type: 'json',
      default: [],
      description: 'Array of breadcrumb items [{label, href?, icon?}]',
      group: 'content'
    },
    separator: {
      type: 'text',
      default: '/',
      description: 'Separator character',
      group: 'content',
      templates: ['default']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['gray', 'primary', 'secondary'],
      default: 'gray',
      description: 'Breadcrumb color',
      group: 'appearance',
      order: 1,
      templates: ['arrows', 'pills']
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Breadcrumb size',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const nav = document.createElement('nav');
    nav.id = this.id;
    nav.setAttribute('data-component-type', this.type);
    nav.setAttribute('aria-label', 'Breadcrumb');

    const classes = ['ui-breadcrumbs', `ui-breadcrumbs-${template}`];
    if (s.size && s.size !== 'md') classes.push(`ui-breadcrumbs-${s.size}`);
    if (s.color && s.color !== 'gray') classes.push(`ui-breadcrumbs-${s.color}`);
    if (ui.editMode) classes.push('ui-component');
    nav.className = classes.join(' ');

    const items = s.items || [];
    const ol = document.createElement('ol');
    ol.className = 'ui-breadcrumbs-list';

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;

      const li = document.createElement('li');
      li.className = 'ui-breadcrumb-item' + (isLast ? ' active' : '');

      // Icon support
      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'ui-breadcrumb-icon';
        iconSpan.innerHTML = item.icon;
        li.appendChild(iconSpan);
      }

      const textSpan = document.createElement('span');
      textSpan.className = 'ui-breadcrumb-text';
      textSpan.textContent = item.label || item;
      li.appendChild(textSpan);

      if (!isLast && item.href) {
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          this.bus.emit('navigate', { item, index });
        });
      }

      ol.appendChild(li);

      // Add separator (except for arrows template which uses CSS)
      if (!isLast && template !== 'arrows') {
        const sep = document.createElement('li');
        sep.className = 'ui-breadcrumb-separator';
        sep.setAttribute('aria-hidden', 'true');
        if (template === 'dots') {
          sep.innerHTML = '•';
        } else {
          sep.textContent = s.separator || '/';
        }
        ol.appendChild(sep);
      }
    });

    nav.appendChild(ol);
    this._applyThemeClasses(nav);
    return nav;
  }
}

// ============================================
// NAVBAR COMPONENT
// ============================================

class uiNavbar extends ui {
  static templateConfigs = {
    default: {
      fields: ['brand', 'brandLogo', 'items', 'actions', 'color'],
      defaults: {}
    },
    centered: {
      fields: ['brand', 'brandLogo', 'items', 'actions', 'color'],
      defaults: {}
    },
    split: {
      fields: ['brand', 'brandLogo', 'items', 'actions', 'color'],
      defaults: {}
    },
    minimal: {
      fields: ['brand', 'items', 'color'],
      defaults: {}
    },
    transparent: {
      fields: ['brand', 'brandLogo', 'items', 'actions'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'centered', 'split', 'minimal', 'transparent'],
      default: 'default',
      description: 'Navbar layout style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    brand: {
      type: 'text',
      default: 'Brand',
      description: 'Brand name or text',
      group: 'content'
    },
    brandLogo: {
      type: 'text',
      default: '',
      description: 'Brand logo URL or emoji',
      group: 'content',
      templates: ['default', 'centered', 'split', 'transparent']
    },
    items: {
      type: 'json',
      default: [],
      description: 'Nav items [{label, href?, icon?, active?}]',
      group: 'content'
    },
    actions: {
      type: 'json',
      default: [],
      description: 'Action buttons [{label, variant?}]',
      group: 'content',
      templates: ['default', 'centered', 'split', 'transparent']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['light', 'dark', 'primary', 'transparent'],
      default: 'light',
      description: 'Navbar color scheme',
      group: 'appearance',
      order: 1,
      templates: ['default', 'centered', 'split', 'minimal']
    },
    sticky: {
      type: 'checkbox',
      default: false,
      description: 'Stick to top on scroll',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const nav = document.createElement('nav');
    nav.id = this.id;
    nav.setAttribute('data-component-type', this.type);

    const classes = ['ui-navbar', `ui-navbar-${template}`];
    if (s.color && s.color !== 'light') classes.push(`ui-navbar-${s.color}`);
    if (s.sticky) classes.push('ui-navbar-sticky');
    if (ui.editMode) classes.push('ui-component');
    nav.className = classes.join(' ');

    // Container for centered/split layouts
    const container = document.createElement('div');
    container.className = 'ui-navbar-container';

    // Brand
    const brand = document.createElement('a');
    brand.className = 'ui-navbar-brand';
    brand.href = '#';
    if (s.brandLogo) {
      if (s.brandLogo.startsWith('http') || s.brandLogo.startsWith('/')) {
        brand.innerHTML = `<img src="${s.brandLogo}" alt="${s.brand}" class="ui-navbar-logo">`;
      } else {
        brand.innerHTML = `<span class="ui-navbar-logo">${s.brandLogo}</span>`;
      }
    }
    if (s.brand) {
      const brandText = document.createElement('span');
      brandText.className = 'ui-navbar-brand-text';
      brandText.textContent = s.brand;
      brand.appendChild(brandText);
    }
    brand.addEventListener('click', (e) => {
      e.preventDefault();
      this.bus.emit('brand-click', { component: this });
    });
    container.appendChild(brand);

    // Nav items
    const ul = document.createElement('ul');
    ul.className = 'ui-navbar-nav';
    const items = s.items || [];
    items.forEach((item, index) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'ui-nav-link' + (item.active ? ' active' : '');
      link.href = item.href || '#';
      if (item.icon) {
        link.innerHTML = `<span class="ui-nav-icon">${item.icon}</span>${item.label}`;
      } else {
        link.textContent = item.label;
      }
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this._setActive(index);
        this.bus.emit('navigate', { item, index });
      });
      li.appendChild(link);
      ul.appendChild(li);
    });
    container.appendChild(ul);

    // Actions
    if (s.actions && s.actions.length > 0 && template !== 'minimal') {
      const actions = document.createElement('div');
      actions.className = 'ui-navbar-actions';
      s.actions.forEach((action) => {
        const btn = document.createElement('button');
        const navV = action.variant || 'primary';
        btn.className = 'ui-btn ui-btn-' + navV + ' ui-btn-sm';
        if (['primary','secondary','success','danger','warning'].includes(navV)) btn.dataset.color = navV;
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          this.bus.emit('action', { action });
        });
        actions.appendChild(btn);
      });
      container.appendChild(actions);
    }

    nav.appendChild(container);
    this._navLinks = ul.querySelectorAll('.ui-nav-link');
    this._applyThemeClasses(nav);
    return nav;
  }

  _setActive(index) {
    if (this._navLinks) {
      this._navLinks.forEach((link, i) => {
        link.classList.toggle('active', i === index);
      });
    }
  }
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

class uiSidebar extends ui {
  static templateConfigs = {
    default: {
      fields: ['title', 'sections', 'color', 'width'],
      defaults: { width: '250px' }
    },
    compact: {
      fields: ['title', 'sections', 'color', 'width'],
      defaults: { width: '200px' }
    },
    'icons-only': {
      fields: ['sections', 'color', 'width'],
      defaults: { width: '60px' }
    },
    floating: {
      fields: ['title', 'sections', 'color', 'width'],
      defaults: { width: '280px' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'icons-only', 'floating'],
      default: 'default',
      description: 'Sidebar style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    title: {
      type: 'text',
      default: '',
      description: 'Sidebar header title',
      group: 'content',
      templates: ['default', 'compact', 'floating']
    },
    sections: {
      type: 'json',
      default: [],
      description: 'Array of sections [{title?, items: [{label, icon?, badge?, active?}]}]',
      group: 'content'
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['light', 'dark', 'primary'],
      default: 'light',
      description: 'Sidebar color scheme',
      group: 'appearance',
      order: 1
    },
    width: {
      type: 'text',
      default: '250px',
      description: 'Sidebar width',
      group: 'appearance',
      order: 2
    },
    collapsible: {
      type: 'checkbox',
      default: false,
      description: 'Allow collapse/expand',
      group: 'appearance',
      order: 3
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const isIconsOnly = template === 'icons-only';

    const aside = document.createElement('aside');
    aside.id = this.id;
    aside.setAttribute('data-component-type', this.type);

    const classes = ['ui-sidebar', `ui-sidebar-${template}`];
    if (s.color && s.color !== 'light') classes.push(`ui-sidebar-${s.color}`);
    if (s.collapsible) classes.push('ui-sidebar-collapsible');
    if (ui.editMode) classes.push('ui-component');
    aside.className = classes.join(' ');

    if (s.width) {
      aside.style.width = s.width;
    }

    // Header (not for icons-only)
    if (s.title && !isIconsOnly) {
      const header = document.createElement('div');
      header.className = 'ui-sidebar-header';
      const title = document.createElement('h4');
      title.className = 'ui-sidebar-title';
      title.textContent = s.title;
      header.appendChild(title);

      // Collapse toggle
      if (s.collapsible) {
        const toggle = document.createElement('button');
        toggle.className = 'ui-sidebar-toggle';
        toggle.innerHTML = '☰';
        toggle.addEventListener('click', () => this.toggle());
        header.appendChild(toggle);
      }

      aside.appendChild(header);
    }

    // Sections
    const sections = s.sections || [];
    sections.forEach((section, sectionIndex) => {
      // Section title (not for icons-only or compact)
      if (section.title && !isIconsOnly && template !== 'compact') {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ui-sidebar-section';
        sectionTitle.textContent = section.title;
        aside.appendChild(sectionTitle);
      }

      // Menu items
      const ul = document.createElement('ul');
      ul.className = 'ui-sidebar-menu';
      const items = section.items || [];
      items.forEach((item, itemIndex) => {
        const li = document.createElement('li');
        li.className = 'ui-sidebar-item';

        const link = document.createElement('a');
        link.className = 'ui-sidebar-link' + (item.active ? ' active' : '');
        link.href = item.href || '#';
        if (isIconsOnly && item.label) {
          link.title = item.label;
        }

        if (item.icon) {
          const icon = document.createElement('span');
          icon.className = 'ui-sidebar-icon';
          icon.innerHTML = item.icon;
          link.appendChild(icon);
        }

        // Label (hidden in icons-only)
        if (!isIconsOnly) {
          const label = document.createElement('span');
          label.className = 'ui-sidebar-label';
          label.textContent = item.label;
          link.appendChild(label);
        }

        if (item.badge && !isIconsOnly) {
          const badge = document.createElement('span');
          badge.className = 'ui-sidebar-badge';
          badge.textContent = item.badge;
          link.appendChild(badge);
        }

        link.addEventListener('click', (e) => {
          e.preventDefault();
          this._setActive(link);
          this.bus.emit('navigate', { item, sectionIndex, itemIndex });
        });

        li.appendChild(link);
        ul.appendChild(li);
      });
      aside.appendChild(ul);
    });

    this._applyThemeClasses(aside);
    return aside;
  }

  _setActive(activeLink) {
    const allLinks = this.el.querySelectorAll('.ui-sidebar-link');
    allLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
  }

  toggle() {
    if (this.el) {
      this.el.classList.toggle('collapsed');
      this.bus.emit('toggle', { collapsed: this.el.classList.contains('collapsed') });
    }
  }

  collapse() {
    if (this.el) {
      this.el.classList.add('collapsed');
      this.bus.emit('toggle', { collapsed: true });
    }
  }

  expand() {
    if (this.el) {
      this.el.classList.remove('collapsed');
      this.bus.emit('toggle', { collapsed: false });
    }
  }
}

// ============================================
// PAGINATION COMPONENT
// ============================================

class uiPagination extends ui {
  static templateConfigs = {
    default: {
      fields: ['totalPages', 'currentPage', 'showEllipsis', 'size', 'color'],
      defaults: { showEllipsis: true }
    },
    simple: {
      fields: ['totalPages', 'currentPage', 'size', 'color'],
      defaults: {}
    },
    compact: {
      fields: ['totalPages', 'currentPage', 'size'],
      defaults: {}
    },
    'load-more': {
      fields: ['hasMore', 'loadMoreLabel', 'color'],
      defaults: { loadMoreLabel: 'Load more', hasMore: true }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'simple', 'compact', 'load-more'],
      default: 'default',
      description: 'Pagination style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    totalPages: {
      type: 'number',
      default: 10,
      description: 'Total number of pages',
      group: 'content',
      templates: ['default', 'simple', 'compact']
    },
    currentPage: {
      type: 'number',
      default: 1,
      description: 'Current active page',
      group: 'content',
      templates: ['default', 'simple', 'compact']
    },
    showEllipsis: {
      type: 'checkbox',
      default: true,
      description: 'Show ellipsis for large page counts',
      group: 'content',
      templates: ['default']
    },
    hasMore: {
      type: 'checkbox',
      default: true,
      description: 'Has more items to load',
      group: 'content',
      templates: ['load-more']
    },
    loadMoreLabel: {
      type: 'text',
      default: 'Load more',
      description: 'Load more button label',
      group: 'content',
      templates: ['load-more']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['primary', 'secondary', 'gray'],
      default: 'primary',
      description: 'Active/button color',
      group: 'appearance',
      order: 1,
      templates: ['default', 'simple', 'load-more']
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Pagination size',
      group: 'appearance',
      order: 2,
      templates: ['default', 'simple', 'compact']
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const nav = document.createElement('nav');
    nav.id = this.id;
    nav.setAttribute('data-component-type', this.type);
    nav.setAttribute('aria-label', 'Pagination');

    const classes = ['ui-pagination', `ui-pagination-${template}`];
    if (s.size && s.size !== 'md') classes.push(`ui-pagination-${s.size}`);
    if (s.color && s.color !== 'primary') classes.push(`ui-pagination-${s.color}`);
    if (ui.editMode) classes.push('ui-component');
    nav.className = classes.join(' ');

    this._template = template;
    this._renderPages(nav);
    this._applyThemeClasses(nav);
    return nav;
  }

  _renderPages(container) {
    container.innerHTML = '';
    const s = this._resolved;
    const template = this._template || s.template || 'default';
    const total = s.totalPages || 10;
    const current = s.currentPage || 1;

    if (template === 'load-more') {
      // Load more button
      const btn = document.createElement('button');
      btn.type = 'button';
      const lmColor = s.color || 'primary';
      btn.className = 'ui-btn ui-btn-' + lmColor + ' ui-pagination-load-more';
      if (['primary','secondary','success','danger','warning'].includes(lmColor)) btn.dataset.color = lmColor;
      btn.textContent = s.loadMoreLabel || 'Load more';
      btn.disabled = !s.hasMore;
      btn.addEventListener('click', () => {
        this.bus.emit('loadMore', { component: this });
      });
      container.appendChild(btn);
      return;
    }

    if (template === 'compact') {
      // Compact: "Page 1 of 10" with arrows
      const prev = this._createPageItem('‹', current > 1 ? current - 1 : null, current <= 1);
      container.appendChild(prev);

      const info = document.createElement('span');
      info.className = 'ui-pagination-info';
      info.textContent = `${current} / ${total}`;
      container.appendChild(info);

      const next = this._createPageItem('›', current < total ? current + 1 : null, current >= total);
      container.appendChild(next);
      return;
    }

    if (template === 'simple') {
      // Simple: Prev/Next only with current page indicator
      const prev = this._createPageItem('← Previous', current > 1 ? current - 1 : null, current <= 1);
      prev.classList.add('ui-page-prev');
      container.appendChild(prev);

      const info = document.createElement('span');
      info.className = 'ui-pagination-info';
      info.textContent = `Page ${current} of ${total}`;
      container.appendChild(info);

      const next = this._createPageItem('Next →', current < total ? current + 1 : null, current >= total);
      next.classList.add('ui-page-next');
      container.appendChild(next);
      return;
    }

    // Default: Full pagination with page numbers
    const prev = this._createPageItem('‹', current > 1 ? current - 1 : null, current <= 1);
    container.appendChild(prev);

    const pages = this._getPageNumbers(total, current);
    pages.forEach(page => {
      if (page === '...') {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'ui-page-ellipsis';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
      } else {
        const item = this._createPageItem(page, page, false, page === current);
        container.appendChild(item);
      }
    });

    const next = this._createPageItem('›', current < total ? current + 1 : null, current >= total);
    container.appendChild(next);
  }

  _createPageItem(label, page, disabled = false, active = false) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'ui-page-item' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
    item.textContent = label;
    item.disabled = disabled;

    if (!disabled && page !== null) {
      item.addEventListener('click', () => {
        this.setPage(page);
      });
    }

    return item;
  }

  _getPageNumbers(total, current) {
    const showEllipsis = this._resolved.showEllipsis !== false;
    if (total <= 7 || !showEllipsis) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push('...', total);
    }
    return pages;
  }

  setPage(page) {
    const total = this._resolved.totalPages || 10;
    if (page < 1 || page > total) return;
    this.settings.currentPage = page;
    this._renderPages(this.el);
    this.bus.emit('change', { page, component: this });
  }

  getCurrentPage() {
    return this.settings.currentPage || 1;
  }

  setHasMore(hasMore) {
    this.settings.hasMore = hasMore;
    if (this._template === 'load-more') {
      this._renderPages(this.el);
    }
  }
}

// ============================================
// PAGER COMPONENT - Collection container with search & pagination
// ============================================

class uiPager extends ui {
  static templateConfigs = {
    default: {
      fields: ['title', 'showSearch', 'columns', 'gap', 'itemsPerPage'],
      defaults: { columns: 3, gap: 'md', itemsPerPage: 12 }
    },
    compact: {
      fields: ['title', 'showSearch', 'itemsPerPage'],
      defaults: { columns: 1, gap: 'none', itemsPerPage: 10 }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact'],
      default: 'default',
      description: 'Layout mode (compact for mobile)',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    title: {
      type: 'text',
      default: '',
      description: 'Collection title',
      group: 'content',
      order: 1
    },
    showSearch: {
      type: 'checkbox',
      default: true,
      description: 'Show search input',
      group: 'content',
      order: 2
    },
    searchPlaceholder: {
      type: 'text',
      default: 'Search...',
      description: 'Search input placeholder',
      group: 'content',
      order: 3
    },
    totalItems: {
      type: 'number',
      default: 0,
      description: 'Total number of items in collection',
      group: 'content',
      order: 4
    },
    itemsPerPage: {
      type: 'number',
      default: 12,
      description: 'Items to show per page',
      group: 'content',
      order: 5
    },
    currentPage: {
      type: 'number',
      default: 1,
      description: 'Current page number',
      group: 'content',
      order: 6
    },
    // ===== APPEARANCE =====
    columns: {
      type: 'select',
      options: ['1', '2', '3', '4', 'auto'],
      default: '3',
      description: 'Number of grid columns',
      group: 'appearance',
      order: 1,
      templates: ['default']
    },
    gap: {
      type: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Gap between items',
      group: 'appearance',
      order: 2,
      templates: ['default']
    },
    minItemWidth: {
      type: 'number',
      default: 280,
      description: 'Minimum item width in pixels (for auto columns)',
      group: 'appearance',
      order: 3
    },
    maxItemWidth: {
      type: 'number',
      default: 320,
      description: 'Maximum item width in pixels',
      group: 'appearance',
      order: 4
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const isCompact = template === 'compact';

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);

    const classes = ['ui-pager', `ui-pager-${template}`];
    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    container.className = classes.join(' ');

    // Styles - don't force height, let content determine size
    container.style.cssText = 'display: flex; flex-direction: column;';

    // Header with title and search
    if (s.title || s.showSearch) {
      const header = document.createElement('div');
      header.className = 'ui-pager-header';
      header.style.cssText = isCompact
        ? 'display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;'
        : 'display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;';
      container.appendChild(header);

      // Title
      if (s.title) {
        const title = document.createElement('h3');
        title.className = 'ui-pager-title';
        title.style.cssText = isCompact
          ? 'font-size: 1rem; font-weight: 600; color: #1f2937; margin: 0;'
          : 'font-size: 1.125rem; font-weight: 700; color: #111827; margin: 0;';
        title.textContent = s.title;
        header.appendChild(title);
      }

      // Search
      if (s.showSearch) {
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'ui-pager-search';
        searchWrapper.style.cssText = isCompact
          ? 'width: 100%;'
          : 'flex-shrink: 0; width: 240px;';
        header.appendChild(searchWrapper);

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.className = 'ui-input ui-input-sm';
        searchInput.placeholder = s.searchPlaceholder || 'Search...';
        searchInput.style.cssText = 'width: 100%;';
        searchInput.addEventListener('input', (e) => {
          this._searchTerm = e.target.value;
          this.bus.emit('search', { term: e.target.value, component: this });
        });
        searchWrapper.appendChild(searchInput);
        this._searchInput = searchInput;
      }
    }

    // Content area (grid)
    const content = document.createElement('div');
    content.className = 'ui-pager-content';
    this._applyGridStyles(content, s, isCompact);
    container.appendChild(content);
    this._contentEl = content;

    // Footer with pagination
    const footer = document.createElement('div');
    footer.className = 'ui-pager-footer';
    footer.style.cssText = isCompact
      ? 'margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f3f4f6;'
      : 'margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;';
    container.appendChild(footer);
    this._footerEl = footer;

    // Render pagination if we have items
    this._renderPagination();

    this._applyThemeClasses(container);
    return container;
  }

  _applyGridStyles(content, s, isCompact) {
    const gap = s.gap || 'md';
    const gapValues = { none: '0', sm: '0.5rem', md: '1rem', lg: '1.5rem' };
    const gapValue = isCompact ? '0' : gapValues[gap];

    if (isCompact) {
      // Single column, zero gap - items stack with dividers
      content.style.cssText = 'display: flex; flex-direction: column; gap: 0;';
    } else {
      const cols = s.columns || '3';
      const minWidth = s.minItemWidth || 280;
      const maxWidth = s.maxItemWidth || 320;

      if (cols === 'auto') {
        content.style.cssText = `display: grid; grid-template-columns: repeat(auto-fill, minmax(${minWidth}px, 1fr)); gap: ${gapValue}; align-content: start;`;
      } else {
        content.style.cssText = `display: grid; grid-template-columns: repeat(${cols}, minmax(0, ${maxWidth}px)); gap: ${gapValue}; align-content: start;`;
      }
    }
  }

  _renderPagination() {
    if (!this._footerEl) return;
    this._footerEl.innerHTML = '';

    // Use settings for dynamic values, _resolved for static config
    const s = this._resolved;
    const totalItems = this.settings.totalItems || s.totalItems || 0;
    const itemsPerPage = this.settings.itemsPerPage || s.itemsPerPage || 12;
    const currentPage = this.settings.currentPage || s.currentPage || 1;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
      this._footerEl.style.display = 'none';
      return;
    }

    this._footerEl.style.display = 'flex';
    this._footerEl.style.alignItems = 'center';
    this._footerEl.style.justifyContent = 'space-between';

    const isCompact = (s.template || 'default') === 'compact';

    // Item count info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalItems);
    const infoEl = document.createElement('span');
    infoEl.className = 'ui-pager-info';
    infoEl.style.cssText = 'font-size: 0.8rem; color: #6b7280;';
    infoEl.textContent = `${startItem}-${endItem} of ${totalItems}`;
    this._footerEl.appendChild(infoEl);
    this._infoEl = infoEl;

    // Pagination wrapper
    const paginationWrapper = document.createElement('div');
    this._footerEl.appendChild(paginationWrapper);

    this._pagination = new uiPagination({
      parent: paginationWrapper,
      template: 'default',
      totalPages: totalPages,
      currentPage: currentPage,
      showEllipsis: true,
      color: 'primary',
      size: isCompact ? 'sm' : 'md'
    });

    this._pagination.bus.on('change', (e) => {
      this.settings.currentPage = e.page;
      this._updateInfo();
      this.bus.emit('pageChange', { page: e.page, component: this });
    });
  }

  _updateInfo() {
    if (!this._infoEl) return;
    const totalItems = this.settings.totalItems || 0;
    const itemsPerPage = this.settings.itemsPerPage || this._resolved.itemsPerPage || 12;
    const currentPage = this.settings.currentPage || 1;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalItems);
    this._infoEl.textContent = `${startItem}-${endItem} of ${totalItems}`;
  }

  // Public API
  getContentElement() {
    return this._contentEl;
  }

  setItems(totalItems, currentPage = 1) {
    this.settings.totalItems = totalItems;
    this.settings.currentPage = currentPage;
    this._renderPagination();
  }

  setPage(page) {
    this.settings.currentPage = page;
    if (this._pagination) {
      this._pagination.setPage(page);
    }
  }

  getSearchTerm() {
    return this._searchTerm || '';
  }

  clearSearch() {
    if (this._searchInput) {
      this._searchInput.value = '';
      this._searchTerm = '';
    }
  }

  getCurrentPage() {
    return this.settings.currentPage || 1;
  }

  getTotalPages() {
    const totalItems = this.settings.totalItems || 0;
    const itemsPerPage = this.settings.itemsPerPage || 12;
    return Math.ceil(totalItems / itemsPerPage);
  }
}

// ============================================
// EDITOR COMPONENT - Standalone form from schema
// ============================================

class uiEditor extends ui {
  static templateConfigs = {
    form: {
      fields: ['showActions', 'submitLabel', 'cancelLabel'],
      defaults: { showActions: true, submitLabel: 'Save', cancelLabel: 'Cancel' }
    },
    compact: {
      fields: ['showActions'],
      defaults: { showActions: true, submitLabel: 'Save', cancelLabel: 'Cancel' }
    },
    horizontal: {
      fields: ['labelWidth', 'showActions'],
      defaults: { labelWidth: '120px', showActions: true }
    },
    inline: {
      fields: [],
      defaults: { showActions: false }
    }
  };

  static configSchema = {
    template: {
      type: 'select',
      options: ['form', 'compact', 'horizontal', 'inline'],
      default: 'form',
      description: 'Form layout style'
    },
    fields: {
      type: 'object',
      default: {},
      description: 'Field definitions: { fieldName: { label, type, options, required, placeholder } }'
    },
    schema: {
      type: 'object',
      default: null,
      description: 'Publon schema to auto-generate fields from'
    },
    data: {
      type: 'object',
      default: {},
      description: 'Initial form data'
    },
    mode: {
      type: 'select',
      options: ['create', 'edit'],
      default: 'edit',
      description: 'Editor mode'
    },
    showActions: {
      type: 'checkbox',
      default: true,
      description: 'Show save/cancel buttons'
    },
    showDelete: {
      type: 'checkbox',
      default: false,
      description: 'Show delete button (edit mode only)'
    },
    submitLabel: {
      type: 'text',
      default: 'Save',
      description: 'Submit button label'
    },
    cancelLabel: {
      type: 'text',
      default: 'Cancel',
      description: 'Cancel button label'
    },
    deleteLabel: {
      type: 'text',
      default: 'Delete',
      description: 'Delete button label'
    },
    excludeFields: {
      type: 'array',
      default: ['idx', 'id', 'createdAt', 'updatedAt'],
      description: 'Fields to exclude from form'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'form';
    const isCompact = template === 'compact';
    const isHorizontal = template === 'horizontal';
    const isInline = template === 'inline';

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = `ui-editor ui-editor-${template}`;

    // Build fields from schema or field definitions
    const fields = this._buildFields(s);
    this._fields = fields;
    this._inputEls = {};

    // Create form
    const form = document.createElement('form');
    form.className = 'ui-editor-form';
    form.style.cssText = isInline ? 'display: flex; gap: 0.5rem; align-items: center;' : '';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSubmit();
    });
    container.appendChild(form);
    this._formEl = form;

    // Render fields
    fields.forEach(field => {
      const fieldWrapper = this._createField(field, { isCompact, isHorizontal, isInline });
      form.appendChild(fieldWrapper);
    });

    // Action buttons
    if (s.showActions !== false) {
      const actions = document.createElement('div');
      actions.className = 'ui-editor-actions';
      actions.style.cssText = isInline
        ? 'display: flex; gap: 0.5rem;'
        : isHorizontal
          ? `display: flex; gap: 0.5rem; margin-top: 1rem; padding-left: ${s.labelWidth || '120px'};`
          : 'display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end;';
      form.appendChild(actions);

      // Delete button (left side)
      if (s.showDelete && s.mode === 'edit') {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'ui-btn ui-btn-danger ui-btn-outline';
        deleteBtn.dataset.color = 'danger';
        deleteBtn.textContent = s.deleteLabel || 'Delete';
        deleteBtn.style.marginRight = 'auto';
        deleteBtn.addEventListener('click', () => this._handleDelete());
        actions.appendChild(deleteBtn);
      }

      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = isInline ? 'ui-btn ui-btn-sm ui-btn-outline' : 'ui-btn ui-btn-outline';
      cancelBtn.textContent = s.cancelLabel || 'Cancel';
      cancelBtn.addEventListener('click', () => this._handleCancel());
      actions.appendChild(cancelBtn);

      // Submit button
      const submitBtn = document.createElement('button');
      submitBtn.type = 'submit';
      submitBtn.className = isInline ? 'ui-btn ui-btn-sm ui-btn-primary' : 'ui-btn ui-btn-primary';
      submitBtn.dataset.color = 'primary';
      submitBtn.textContent = s.mode === 'create' ? (s.createLabel || 'Create') : (s.submitLabel || 'Save');
      actions.appendChild(submitBtn);
    }

    this._applyThemeClasses(container);
    return container;
  }

  _buildFields(s) {
    const fields = [];
    const excludeFields = s.excludeFields || ['idx', 'id', 'createdAt', 'updatedAt'];
    const data = s.data || {};

    // If explicit fields provided, use them
    if (s.fields && Object.keys(s.fields).length > 0) {
      for (const name in s.fields) {
        if (excludeFields.includes(name)) continue;
        const def = s.fields[name];
        fields.push({
          name,
          label: def.label || name,
          type: def.type || 'text',
          value: data[name] !== undefined ? data[name] : (def.default || ''),
          required: def.required,
          options: def.options,
          placeholder: def.placeholder,
          readonly: def.readonly,
          min: def.min,
          max: def.max,
          step: def.step
        });
      }
    }
    // Otherwise, generate from schema
    else if (s.schema) {
      for (const name in s.schema) {
        if (excludeFields.includes(name)) continue;
        const colDef = s.schema[name];
        if (colDef.autoIncrement) continue;

        const fieldType = this._inferFieldType(colDef);
        fields.push({
          name,
          label: colDef.label || name,
          type: fieldType,
          value: data[name] !== undefined ? data[name] : (colDef.default || ''),
          required: colDef.required || (colDef.storageType && colDef.storageType.includes('NOT NULL')),
          options: colDef.options || colDef.editorOptions,
          placeholder: colDef.placeholder,
          readonly: colDef.readonly,
          min: colDef.min || colDef.editorMin,
          max: colDef.max || colDef.editorMax,
          step: colDef.step || colDef.editorStep
        });
      }
    }

    return fields;
  }

  _inferFieldType(colDef) {
    if (colDef.editorType) return colDef.editorType;
    if (colDef.options || colDef.editorOptions) return 'select';
    if (colDef.refTable) return 'select';

    const type = (colDef.type || '').toLowerCase();
    if (type === 'boolean' || type === 'bool') return 'checkbox';
    if (type === 'number' || type === 'integer' || type === 'int' || type === 'float') return 'number';
    if (type === 'date') return 'date';
    if (type === 'datetime') return 'datetime-local';
    if (type === 'time') return 'time';
    if (type === 'email') return 'email';
    if (type === 'url') return 'url';
    if (type === 'text' || type === 'longtext') return 'textarea';
    if (type === 'password') return 'password';

    return 'text';
  }

  _createField(field, opts = {}) {
    const { isCompact, isHorizontal, isInline } = opts;

    const wrapper = document.createElement('div');
    wrapper.className = 'ui-editor-field';
    wrapper.setAttribute('data-field', field.name);

    if (field.type === 'hidden') {
      wrapper.style.cssText = 'display: none;';
    } else if (isInline) {
      wrapper.style.cssText = 'display: flex; align-items: center;';
    } else if (isHorizontal) {
      wrapper.style.cssText = 'display: flex; align-items: flex-start; margin-bottom: 0.75rem;';
    } else {
      wrapper.style.cssText = 'margin-bottom: ' + (isCompact ? '0.5rem' : '1rem') + ';';
    }

    // Label
    if (!isInline && field.type !== 'hidden') {
      const label = document.createElement('label');
      label.className = 'ui-editor-label';
      label.textContent = field.label + (field.required ? ' *' : '');
      label.htmlFor = `${this.id}-${field.name}`;

      if (isHorizontal) {
        const s = this._resolved;
        label.style.cssText = `width: ${s.labelWidth || '120px'}; flex-shrink: 0; padding-top: 0.5rem; font-size: 0.875rem; color: #374151;`;
      } else {
        label.style.cssText = 'display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #374151;';
      }

      wrapper.appendChild(label);
    }

    // Input container for horizontal layout
    const inputContainer = isHorizontal ? document.createElement('div') : wrapper;
    if (isHorizontal) {
      inputContainer.style.cssText = 'flex: 1;';
      wrapper.appendChild(inputContainer);
    }

    // Create input based on type
    let input;
    const inputClass = isCompact || isInline ? 'ui-input ui-input-sm' : 'ui-input';

    switch (field.type) {
      case 'select':
        input = document.createElement('select');
        input.className = inputClass;
        if (field.options) {
          field.options.forEach(opt => {
            const option = document.createElement('option');
            if (typeof opt === 'object') {
              option.value = opt.value;
              option.textContent = opt.label || opt.value;
            } else {
              option.value = opt;
              option.textContent = opt;
            }
            if (String(opt.value || opt) === String(field.value)) {
              option.selected = true;
            }
            input.appendChild(option);
          });
        }
        break;

      case 'textarea':
        input = document.createElement('textarea');
        input.className = inputClass;
        input.rows = isCompact ? 2 : 3;
        input.value = field.value || '';
        break;

      case 'checkbox':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'ui-checkbox';
        input.checked = !!field.value;
        break;

      case 'hidden':
        input = document.createElement('input');
        input.type = 'hidden';
        input.value = field.value || '';
        break;

      default:
        input = document.createElement('input');
        input.type = field.type || 'text';
        input.className = inputClass;
        input.value = this._formatInputValue(field.value, field.type) || '';
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
        if (field.step !== undefined) input.step = field.step;
        break;
    }

    input.id = `${this.id}-${field.name}`;
    input.name = field.name;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.required) input.required = true;
    if (field.readonly) input.readOnly = true;
    if (field.type !== 'checkbox' && field.type !== 'hidden') {
      input.style.width = '100%';
    }

    // Track field changes
    input.addEventListener('change', () => {
      this.bus.emit('fieldChange', {
        field: field.name,
        value: this._getFieldValue(input, field.type),
        component: this
      });
    });

    inputContainer.appendChild(input);
    this._inputEls[field.name] = input;

    return wrapper;
  }

  _getFieldValue(input, type) {
    if (type === 'checkbox') return input.checked;
    if (type === 'number') return input.value ? parseFloat(input.value) : null;
    return input.value;
  }

  _handleSubmit() {
    const data = this.getData();
    const errors = this.validate();

    if (errors.length > 0) {
      this.bus.emit('validationError', { errors, component: this });
      return;
    }

    this.bus.emit('save', { data, mode: this._resolved.mode, component: this });
  }

  _handleCancel() {
    this.bus.emit('cancel', { component: this });
  }

  _handleDelete() {
    this.bus.emit('delete', { data: this.getData(), component: this });
  }

  // Public API
  getData() {
    const data = {};
    this._fields.forEach(field => {
      const input = this._inputEls[field.name];
      if (input) {
        data[field.name] = this._getFieldValue(input, field.type);
      }
    });
    return data;
  }

  setData(data) {
    this._fields.forEach(field => {
      const input = this._inputEls[field.name];
      if (input && data[field.name] !== undefined) {
        if (field.type === 'checkbox') {
          input.checked = !!data[field.name];
        } else {
          input.value = this._formatInputValue(data[field.name], field.type) ?? data[field.name];
        }
      }
    });
  }

  validate() {
    const errors = [];
    this._fields.forEach(field => {
      const input = this._inputEls[field.name];
      if (field.required && input) {
        const value = this._getFieldValue(input, field.type);
        if (value === '' || value === null || value === undefined) {
          errors.push({ field: field.name, message: `${field.label} is required` });
          input.classList.add('ui-input-error');
        } else {
          input.classList.remove('ui-input-error');
        }
      }
    });
    return errors;
  }

  reset() {
    const s = this._resolved;
    const data = s.data || {};
    this._fields.forEach(field => {
      const input = this._inputEls[field.name];
      if (input) {
        const defaultValue = data[field.name] !== undefined ? data[field.name] : '';
        if (field.type === 'checkbox') {
          input.checked = !!defaultValue;
        } else {
          input.value = this._formatInputValue(defaultValue, field.type) ?? defaultValue;
        }
        input.classList.remove('ui-input-error');
      }
    });
  }

  focus(fieldName) {
    const input = this._inputEls[fieldName || this._fields[0]?.name];
    if (input) input.focus();
  }

  getField(fieldName) {
    return this._inputEls[fieldName];
  }

  /** Convert ISO datetime strings to the format HTML date/datetime inputs expect */
  _formatInputValue(value, type) {
    if (!value) return value;
    if (type === 'datetime-local') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
      }
    }
    if (type === 'date') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
      }
    }
    return value;
  }
}

// ============================================
// EDITOR MODAL - Modal wrapper for uiEditor
// ============================================

class uiEditorModal extends ui {
  static configSchema = {
    title: { type: 'text', default: 'Edit' },
    fields: { type: 'object', default: {} },
    schema: { type: 'object', default: null },
    data: { type: 'object', default: {} },
    mode: { type: 'select', options: ['create', 'edit'], default: 'edit' },
    showDelete: { type: 'checkbox', default: false },
    width: { type: 'text', default: '480px' }
  };

  _createEl() {
    const s = this._resolved;

    // Modal backdrop
    const backdrop = document.createElement('div');
    backdrop.id = this.id;
    backdrop.className = 'ui-editor-modal-backdrop';
    backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    // Modal container
    const modal = document.createElement('div');
    modal.className = 'ui-editor-modal';
    modal.style.cssText = `background: white; border-radius: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); width: ${s.width || '480px'}; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column;`;
    backdrop.appendChild(modal);

    // Header
    const header = document.createElement('div');
    header.className = 'ui-editor-modal-header';
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb;';
    modal.appendChild(header);

    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0; font-size: 1.125rem; font-weight: 600; color: #111827;';
    title.textContent = s.title || (s.mode === 'create' ? 'Create' : 'Edit');
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ui-btn ui-btn-ghost ui-btn-sm';
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'padding: 0.25rem 0.5rem;';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    // Body with editor
    const body = document.createElement('div');
    body.className = 'ui-editor-modal-body';
    body.style.cssText = 'padding: 1.5rem; overflow-y: auto;';
    modal.appendChild(body);

    // Create editor
    this._editor = new uiEditor({
      parent: body,
      template: 'form',
      fields: s.fields,
      schema: s.schema,
      data: s.data,
      mode: s.mode,
      showDelete: s.showDelete,
      showActions: true
    });

    // Wire up editor events
    this._editor.bus.on('save', (e) => {
      this.bus.emit('save', e);
      this.close();
    });

    this._editor.bus.on('cancel', () => {
      this.bus.emit('cancel', { component: this });
      this.close();
    });

    this._editor.bus.on('delete', (e) => {
      this.bus.emit('delete', e);
      this.close();
    });

    // Escape key to close
    this._escHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this._escHandler);

    return backdrop;
  }

  close() {
    document.removeEventListener('keydown', this._escHandler);
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.bus.emit('close', { component: this });
  }

  getData() {
    return this._editor ? this._editor.getData() : {};
  }

  setData(data) {
    if (this._editor) this._editor.setData(data);
  }

  focus(fieldName) {
    if (this._editor) this._editor.focus(fieldName);
  }
}

// ============================================
// SKELETON LOADER COMPONENT
// ============================================

class uiSkeleton extends ui {
  static templateConfigs = {
    text: {
      fields: ['lines'],
      defaults: { lines: 3 }
    },
    avatar: {
      fields: ['size'],
      defaults: { size: 'md' }
    },
    card: {
      fields: ['showImage', 'lines'],
      defaults: { showImage: true, lines: 3 }
    },
    table: {
      fields: ['rows', 'columns'],
      defaults: { rows: 5, columns: 4 }
    },
    list: {
      fields: ['lines'],
      defaults: { lines: 3 }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['text', 'avatar', 'card', 'table', 'list'],
      default: 'text',
      group: 'structure',
      order: 0,
      description: 'Skeleton template type'
    },
    lines: {
      type: 'number',
      default: 3,
      group: 'structure',
      order: 1,
      templates: ['text', 'card', 'list'],
      description: 'Number of lines/rows'
    },
    rows: {
      type: 'number',
      default: 5,
      group: 'structure',
      order: 2,
      templates: ['table'],
      description: 'Number of table rows'
    },
    columns: {
      type: 'number',
      default: 4,
      group: 'structure',
      order: 3,
      templates: ['table'],
      description: 'Number of table columns'
    },
    // ===== APPEARANCE =====
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      group: 'appearance',
      order: 0,
      templates: ['avatar'],
      description: 'Avatar size'
    },
    showImage: {
      type: 'checkbox',
      default: true,
      group: 'appearance',
      order: 1,
      templates: ['card'],
      description: 'Show image placeholder'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'text';

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);

    const classes = [`ui-skeleton-${template}`];
    if (s.css) classes.push(...s.css.split(' ').filter(c => c));
    if (ui.editMode) classes.push('ui-component');

    switch (template) {
      case 'avatar':
        container.className = `ui-skeleton ui-skeleton-avatar ui-skeleton-avatar-${s.size || 'md'} ${classes.join(' ')}`;
        break;
      case 'card':
        container.className = 'ui-skeleton-card ' + classes.join(' ');
        if (s.showImage !== false) {
          const img = document.createElement('div');
          img.className = 'ui-skeleton ui-skeleton-image';
          container.appendChild(img);
        }
        const title = document.createElement('div');
        title.className = 'ui-skeleton ui-skeleton-title';
        container.appendChild(title);
        for (let i = 0; i < (s.lines || 3); i++) {
          const text = document.createElement('div');
          text.className = 'ui-skeleton ui-skeleton-text';
          container.appendChild(text);
        }
        break;
      case 'table':
        container.className = 'ui-skeleton-table ' + classes.join(' ');
        const table = document.createElement('div');
        table.className = 'ui-skeleton-table-inner';
        // Header row
        const header = document.createElement('div');
        header.className = 'ui-skeleton-table-row ui-skeleton-table-header';
        for (let c = 0; c < (s.columns || 4); c++) {
          const cell = document.createElement('div');
          cell.className = 'ui-skeleton ui-skeleton-text';
          header.appendChild(cell);
        }
        table.appendChild(header);
        // Body rows
        for (let r = 0; r < (s.rows || 5); r++) {
          const row = document.createElement('div');
          row.className = 'ui-skeleton-table-row';
          for (let c = 0; c < (s.columns || 4); c++) {
            const cell = document.createElement('div');
            cell.className = 'ui-skeleton ui-skeleton-text';
            row.appendChild(cell);
          }
          table.appendChild(row);
        }
        container.appendChild(table);
        break;
      case 'list':
        container.className = 'ui-skeleton-list ' + classes.join(' ');
        for (let i = 0; i < (s.lines || 3); i++) {
          const row = document.createElement('div');
          row.className = 'ui-skeleton-list-item';
          const avatar = document.createElement('div');
          avatar.className = 'ui-skeleton ui-skeleton-avatar ui-skeleton-avatar-sm';
          row.appendChild(avatar);
          const textWrapper = document.createElement('div');
          textWrapper.className = 'ui-skeleton-list-content';
          const text1 = document.createElement('div');
          text1.className = 'ui-skeleton ui-skeleton-text ui-skeleton-text-title';
          const text2 = document.createElement('div');
          text2.className = 'ui-skeleton ui-skeleton-text ui-skeleton-text-subtitle';
          textWrapper.appendChild(text1);
          textWrapper.appendChild(text2);
          row.appendChild(textWrapper);
          container.appendChild(row);
        }
        break;
      default: // text
        container.className = 'ui-skeleton-text-block ' + classes.join(' ');
        for (let i = 0; i < (s.lines || 3); i++) {
          const text = document.createElement('div');
          text.className = 'ui-skeleton ui-skeleton-text';
          container.appendChild(text);
        }
    }

    this._applyThemeClasses(container);
    return container;
  }
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

class uiEmptyState extends ui {
  static templateConfigs = {
    default: {
      fields: ['icon', 'title', 'description', 'actionLabel', 'actionVariant'],
      defaults: {}
    },
    compact: {
      fields: ['icon', 'title', 'actionLabel', 'actionVariant'],
      defaults: {}
    },
    illustrated: {
      fields: ['image', 'title', 'description', 'actionLabel', 'actionVariant'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'illustrated'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Empty state template'
    },
    // ===== CONTENT =====
    icon: {
      type: 'text',
      default: '📭',
      group: 'content',
      order: 0,
      templates: ['default', 'compact'],
      description: 'Icon or emoji'
    },
    image: {
      type: 'text',
      default: '',
      group: 'content',
      order: 1,
      templates: ['illustrated'],
      description: 'Illustration image URL'
    },
    title: {
      type: 'text',
      default: 'No data',
      group: 'content',
      order: 2,
      description: 'Empty state title'
    },
    description: {
      type: 'textarea',
      default: '',
      group: 'content',
      order: 3,
      templates: ['default', 'illustrated'],
      description: 'Description text'
    },
    actionLabel: {
      type: 'text',
      default: '',
      group: 'content',
      order: 4,
      description: 'Action button label'
    },
    // ===== APPEARANCE =====
    actionVariant: {
      type: 'select',
      options: ['primary', 'secondary', 'outline'],
      default: 'primary',
      group: 'appearance',
      order: 0,
      description: 'Action button variant'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);

    const classes = ['ui-empty-state', `ui-empty-state-${template}`];
    if (s.css) classes.push(...s.css.split(' ').filter(c => c));
    if (ui.editMode) classes.push('ui-component');
    container.className = classes.join(' ');

    // Icon or Image
    if (template === 'illustrated' && s.image) {
      const img = document.createElement('img');
      img.className = 'ui-empty-state-image';
      img.src = s.image;
      img.alt = s.title || '';
      container.appendChild(img);
    } else if (s.icon) {
      const icon = document.createElement('div');
      icon.className = 'ui-empty-state-icon';
      icon.textContent = s.icon;
      container.appendChild(icon);
    }

    // Title
    const title = document.createElement('h3');
    title.className = 'ui-empty-state-title';
    title.textContent = s.title || 'No data';
    container.appendChild(title);

    // Description (not in compact)
    if (template !== 'compact' && s.description) {
      const desc = document.createElement('p');
      desc.className = 'ui-empty-state-desc';
      desc.textContent = s.description;
      container.appendChild(desc);
    }

    // Action button
    if (s.actionLabel) {
      const actionDiv = document.createElement('div');
      actionDiv.className = 'ui-empty-state-action';
      const btn = document.createElement('button');
      const esV = s.actionVariant || 'primary';
      btn.className = `ui-btn ui-btn-${esV}`;
      if (['primary','secondary','success','danger','warning'].includes(esV)) btn.dataset.color = esV;
      btn.textContent = s.actionLabel;
      btn.addEventListener('click', () => {
        this.bus.emit('action', { component: this });
      });
      actionDiv.appendChild(btn);
      container.appendChild(actionDiv);
    }

    this._applyThemeClasses(container);
    return container;
  }
}

// ============================================
// TIMELINE COMPONENT
// ============================================

class uiTimeline extends ui {
  static templateConfigs = {
    default: {
      fields: ['items', 'showTime', 'showDescription'],
      defaults: { showTime: true, showDescription: true }
    },
    compact: {
      fields: ['items', 'showTime'],
      defaults: { showTime: true, showDescription: false }
    },
    detailed: {
      fields: ['items', 'showTime', 'showDescription', 'showIcon'],
      defaults: { showTime: true, showDescription: true, showIcon: true }
    },
    alternating: {
      fields: ['items', 'showTime', 'showDescription'],
      defaults: { showTime: true, showDescription: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'compact', 'detailed', 'alternating'],
      default: 'default',
      description: 'Timeline template',
      group: 'structure'
    },
    // Content
    items: {
      type: 'json',
      default: [],
      description: 'Array of timeline items [{title, time, description, completed?, icon?}]',
      group: 'content'
    },
    // Appearance
    showTime: {
      type: 'boolean',
      default: true,
      description: 'Show time/date for each item',
      group: 'appearance',
      templates: ['default', 'compact', 'detailed', 'alternating']
    },
    showDescription: {
      type: 'boolean',
      default: true,
      description: 'Show description for each item',
      group: 'appearance',
      templates: ['default', 'detailed', 'alternating']
    },
    showIcon: {
      type: 'boolean',
      default: false,
      description: 'Show icon in marker',
      group: 'appearance',
      templates: ['detailed']
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-timeline', `ui-timeline-${template}`];
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    container.className = classes.join(' ');
    this._applyThemeClasses(container);

    let items = this._resolved.items || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) { items = []; }
    }

    items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'ui-timeline-item';

      // Marker
      const marker = document.createElement('div');
      let markerClass = 'ui-timeline-marker';
      if (item.completed) markerClass += ' completed';
      marker.className = markerClass;

      if (item.completed) {
        marker.textContent = '✓';
      } else if (this._resolved.showIcon && item.icon) {
        marker.innerHTML = `<i class="${item.icon}"></i>`;
      }
      itemEl.appendChild(marker);

      // Content
      const content = document.createElement('div');
      content.className = 'ui-timeline-content';

      const title = document.createElement('h4');
      title.className = 'ui-timeline-title';
      title.textContent = item.title || '';
      content.appendChild(title);

      if (this._resolved.showTime && item.time) {
        const time = document.createElement('div');
        time.className = 'ui-timeline-time';
        time.textContent = item.time;
        content.appendChild(time);
      }

      if (this._resolved.showDescription && item.description) {
        const desc = document.createElement('p');
        desc.className = 'ui-timeline-desc';
        desc.textContent = item.description;
        content.appendChild(desc);
      }

      itemEl.appendChild(content);
      container.appendChild(itemEl);
    });

    return container;
  }
}

// ============================================
// STEPPER / WIZARD COMPONENT
// ============================================

class uiStepper extends ui {
  static templateConfigs = {
    default: {
      fields: ['steps', 'currentStep', 'showLabels', 'clickable'],
      defaults: { showLabels: true, clickable: true }
    },
    compact: {
      fields: ['steps', 'currentStep', 'showLabels', 'clickable'],
      defaults: { showLabels: true, clickable: true }
    },
    vertical: {
      fields: ['steps', 'currentStep', 'showLabels', 'showDescriptions', 'clickable'],
      defaults: { showLabels: true, showDescriptions: true, clickable: true }
    },
    dots: {
      fields: ['steps', 'currentStep', 'showLabels', 'clickable'],
      defaults: { showLabels: false, clickable: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'compact', 'vertical', 'dots'],
      default: 'default',
      description: 'Stepper template',
      group: 'structure'
    },
    // Content
    steps: {
      type: 'json',
      default: [],
      description: 'Array of steps [{label, description?}]',
      group: 'content'
    },
    currentStep: {
      type: 'number',
      default: 1,
      description: 'Current active step (1-based)',
      group: 'content'
    },
    // Appearance
    showLabels: {
      type: 'boolean',
      default: true,
      description: 'Show step labels',
      group: 'appearance',
      templates: ['default', 'compact', 'vertical', 'dots']
    },
    showDescriptions: {
      type: 'boolean',
      default: false,
      description: 'Show step descriptions',
      group: 'appearance',
      templates: ['vertical']
    },
    clickable: {
      type: 'boolean',
      default: true,
      description: 'Allow clicking to navigate steps',
      group: 'appearance',
      templates: ['default', 'compact', 'vertical', 'dots']
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-stepper', `ui-stepper-${template}`];
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    container.className = classes.join(' ');
    this._applyThemeClasses(container);

    this._renderSteps(container);
    return container;
  }

  _renderSteps(container) {
    container.innerHTML = '';

    let steps = this._resolved.steps || [];
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps); } catch (e) { steps = []; }
    }

    const current = parseInt(this._resolved.currentStep) || 1;
    const template = this._resolved.template || 'default';

    steps.forEach((step, index) => {
      const stepNum = index + 1;
      const stepEl = document.createElement('div');
      let stepClass = 'ui-step';
      if (stepNum < current) stepClass += ' completed';
      if (stepNum === current) stepClass += ' active';
      stepEl.className = stepClass;

      // Indicator
      const indicator = document.createElement('div');
      indicator.className = 'ui-step-indicator';

      if (template === 'dots') {
        indicator.textContent = ''; // dots template uses CSS
      } else {
        indicator.textContent = stepNum < current ? '✓' : stepNum;
      }
      stepEl.appendChild(indicator);

      // Label container
      if (this._resolved.showLabels) {
        const labelContainer = document.createElement('div');
        labelContainer.className = 'ui-step-label-container';

        const label = document.createElement('div');
        label.className = 'ui-step-label';
        label.textContent = step.label || `Step ${stepNum}`;
        labelContainer.appendChild(label);

        if (this._resolved.showDescriptions && step.description) {
          const desc = document.createElement('div');
          desc.className = 'ui-step-desc';
          desc.textContent = step.description;
          labelContainer.appendChild(desc);
        }

        stepEl.appendChild(labelContainer);
      }

      // Click handler
      if (this._resolved.clickable) {
        stepEl.style.cursor = 'pointer';
        stepEl.addEventListener('click', () => {
          this.bus.emit('step-click', { step: stepNum, label: step.label, component: this });
        });
      }

      container.appendChild(stepEl);
    });
  }

  setStep(stepNum) {
    let steps = this._resolved.steps || [];
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps); } catch (e) { steps = []; }
    }
    if (stepNum < 1 || stepNum > steps.length) return;
    this.settings.currentStep = stepNum;
    this._resolved.currentStep = stepNum;
    this._renderSteps(this.el);
    this.bus.emit('change', { step: stepNum, component: this });
  }

  nextStep() {
    let steps = this._resolved.steps || [];
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps); } catch (e) { steps = []; }
    }
    const current = parseInt(this._resolved.currentStep) || 1;
    if (current < steps.length) {
      this.setStep(current + 1);
    }
  }

  prevStep() {
    const current = parseInt(this._resolved.currentStep) || 1;
    if (current > 1) {
      this.setStep(current - 1);
    }
  }

  getCurrentStep() {
    return parseInt(this._resolved.currentStep) || 1;
  }
}

// ============================================
// TOOLTIP COMPONENT
// ============================================

class uiTooltip extends ui {
  static templateConfigs = {
    default: {
      fields: ['text', 'position'],
      defaults: {}
    },
    rich: {
      fields: ['text', 'title', 'icon', 'position', 'maxWidth'],
      defaults: { maxWidth: '300px' }
    },
    light: {
      fields: ['text', 'position'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'rich', 'light'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Tooltip template style'
    },
    position: {
      type: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      default: 'top',
      group: 'structure',
      order: 1,
      description: 'Tooltip position'
    },
    // ===== CONTENT =====
    text: {
      type: 'text',
      default: 'Tooltip text',
      group: 'content',
      order: 0,
      description: 'Tooltip content'
    },
    title: {
      type: 'text',
      default: '',
      group: 'content',
      order: 1,
      templates: ['rich'],
      description: 'Tooltip title (rich template)'
    },
    icon: {
      type: 'icon',
      default: '',
      group: 'content',
      order: 2,
      templates: ['rich'],
      description: 'Icon for rich tooltip'
    },
    // ===== APPEARANCE =====
    maxWidth: {
      type: 'text',
      default: '200px',
      group: 'appearance',
      order: 0,
      templates: ['rich'],
      description: 'Max width for rich tooltip'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const wrapper = document.createElement('div');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);
    wrapper.className = 'ui-tooltip-wrapper';
    if (ui.editMode) wrapper.classList.add('ui-component');

    // Tooltip element
    const tooltip = document.createElement('div');
    const pos = s.position || 'top';
    tooltip.className = `ui-tooltip ui-tooltip-${template} ui-tooltip-${pos}`;
    if (s.css) tooltip.classList.add(...s.css.split(' ').filter(c => c));

    if (template === 'rich') {
      // Rich tooltip with optional icon and title
      if (s.maxWidth) tooltip.style.maxWidth = s.maxWidth;
      if (s.icon) {
        const iconEl = document.createElement('i');
        iconEl.className = s.icon + ' ui-tooltip-icon';
        tooltip.appendChild(iconEl);
      }
      if (s.title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'ui-tooltip-title';
        titleEl.textContent = s.title;
        tooltip.appendChild(titleEl);
      }
      const textEl = document.createElement('div');
      textEl.className = 'ui-tooltip-text';
      textEl.textContent = s.text || 'Tooltip text';
      tooltip.appendChild(textEl);
    } else {
      // Default and light templates
      tooltip.textContent = s.text || 'Tooltip text';
    }

    wrapper.appendChild(tooltip);

    // Store reference
    this._tooltip = tooltip;

    // Show/hide on hover
    wrapper.addEventListener('mouseenter', () => this.show());
    wrapper.addEventListener('mouseleave', () => this.hide());

    this._applyThemeClasses(wrapper);
    return wrapper;
  }

  show() {
    this._tooltip.classList.add('visible');
    this.bus.emit('show', { component: this });
  }

  hide() {
    this._tooltip.classList.remove('visible');
    this.bus.emit('hide', { component: this });
  }

  // Allow wrapping existing content
  wrap(element) {
    if (element && element.parentNode) {
      element.parentNode.insertBefore(this.el, element);
      this.el.insertBefore(element, this._tooltip);
    }
  }
}

// ============================================
// POPOVER COMPONENT
// ============================================

class uiPopover extends ui {
  static templateConfigs = {
    default: {
      fields: ['title', 'content', 'position', 'trigger'],
      defaults: {}
    },
    menu: {
      fields: ['items', 'position', 'trigger'],
      defaults: { trigger: 'click' }
    },
    confirm: {
      fields: ['title', 'content', 'position', 'confirmText', 'cancelText', 'color'],
      defaults: { trigger: 'click', confirmText: 'Confirm', cancelText: 'Cancel', color: 'danger' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'menu', 'confirm'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Popover template style'
    },
    position: {
      type: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      default: 'bottom',
      group: 'structure',
      order: 1,
      description: 'Popover position'
    },
    trigger: {
      type: 'select',
      options: ['click', 'hover'],
      default: 'click',
      group: 'structure',
      order: 2,
      description: 'How to trigger the popover'
    },
    // ===== CONTENT =====
    title: {
      type: 'text',
      default: '',
      group: 'content',
      order: 0,
      templates: ['default', 'confirm'],
      description: 'Popover title'
    },
    content: {
      type: 'textarea',
      default: '',
      group: 'content',
      order: 1,
      templates: ['default', 'confirm'],
      description: 'Popover content'
    },
    items: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 2,
      templates: ['menu'],
      description: 'Menu items JSON array [{label, icon?, action?}]'
    },
    confirmText: {
      type: 'text',
      default: 'Confirm',
      group: 'content',
      order: 3,
      templates: ['confirm'],
      description: 'Confirm button text'
    },
    cancelText: {
      type: 'text',
      default: 'Cancel',
      group: 'content',
      order: 4,
      templates: ['confirm'],
      description: 'Cancel button text'
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info'],
      default: 'primary',
      group: 'appearance',
      order: 0,
      templates: ['confirm'],
      description: 'Confirm button color'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const wrapper = document.createElement('div');
    wrapper.id = this.id;
    wrapper.setAttribute('data-component-type', this.type);
    wrapper.className = 'ui-popover-wrapper';
    if (ui.editMode) wrapper.classList.add('ui-component');

    // Popover element
    const popover = document.createElement('div');
    const pos = s.position || 'bottom';
    popover.className = `ui-popover ui-popover-${template} ui-popover-${pos}`;
    if (s.css) popover.classList.add(...s.css.split(' ').filter(c => c));

    if (template === 'menu') {
      // Menu template - list of items
      const items = typeof s.items === 'string' ? JSON.parse(s.items || '[]') : (s.items || []);
      const menu = document.createElement('div');
      menu.className = 'ui-popover-menu';
      items.forEach((item, idx) => {
        if (item.divider) {
          const divider = document.createElement('div');
          divider.className = 'ui-popover-divider';
          menu.appendChild(divider);
        } else {
          const menuItem = document.createElement('div');
          menuItem.className = 'ui-popover-menu-item';
          if (item.icon) {
            const icon = document.createElement('i');
            icon.className = item.icon + ' ui-popover-menu-icon';
            menuItem.appendChild(icon);
          }
          const label = document.createElement('span');
          label.textContent = item.label || '';
          menuItem.appendChild(label);
          menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            this.bus.emit('menuSelect', { item, index: idx, component: this });
            this.hide();
          });
          menu.appendChild(menuItem);
        }
      });
      popover.appendChild(menu);
    } else if (template === 'confirm') {
      // Confirm template - confirmation dialog
      if (s.title) {
        const header = document.createElement('div');
        header.className = 'ui-popover-header';
        const title = document.createElement('h4');
        title.className = 'ui-popover-title';
        title.textContent = s.title;
        header.appendChild(title);
        popover.appendChild(header);
      }
      const body = document.createElement('div');
      body.className = 'ui-popover-body';
      body.innerHTML = s.content || 'Are you sure?';
      popover.appendChild(body);

      const footer = document.createElement('div');
      footer.className = 'ui-popover-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'ui-btn ui-btn-sm ui-btn-outline';
      cancelBtn.textContent = s.cancelText || 'Cancel';
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.bus.emit('cancel', { component: this });
        this.hide();
      });
      const confirmBtn = document.createElement('button');
      const cfV = s.color || 'danger';
      confirmBtn.className = `ui-btn ui-btn-sm ui-btn-${cfV}`;
      if (['primary','secondary','success','danger','warning'].includes(cfV)) confirmBtn.dataset.color = cfV;
      confirmBtn.textContent = s.confirmText || 'Confirm';
      confirmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.bus.emit('confirm', { component: this });
        this.hide();
      });
      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);
      popover.appendChild(footer);
    } else {
      // Default template
      if (s.title) {
        const header = document.createElement('div');
        header.className = 'ui-popover-header';
        const title = document.createElement('h4');
        title.className = 'ui-popover-title';
        title.textContent = s.title;
        header.appendChild(title);
        popover.appendChild(header);
      }
      const body = document.createElement('div');
      body.className = 'ui-popover-body';
      body.innerHTML = s.content || '';
      popover.appendChild(body);
    }

    wrapper.appendChild(popover);
    this._popover = popover;
    this._isVisible = false;

    // Setup triggers
    if (s.trigger === 'hover') {
      wrapper.addEventListener('mouseenter', () => this.show());
      wrapper.addEventListener('mouseleave', () => this.hide());
    } else {
      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
      // Close on click outside
      document.addEventListener('click', () => this.hide());
    }

    this._applyThemeClasses(wrapper);
    return wrapper;
  }

  show() {
    this._popover.classList.add('visible');
    this._isVisible = true;
    this.bus.emit('show', { component: this });
  }

  hide() {
    this._popover.classList.remove('visible');
    this._isVisible = false;
    this.bus.emit('hide', { component: this });
  }

  toggle() {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  wrap(element) {
    if (element && element.parentNode) {
      element.parentNode.insertBefore(this.el, element);
      this.el.insertBefore(element, this._popover);
    }
  }
}

// ============================================
// DRAWER COMPONENT
// ============================================

class uiDrawer extends ui {
  static templateConfigs = {
    default: {
      fields: ['title', 'content', 'position', 'size', 'showHeader', 'showFooter', 'overlay'],
      defaults: { showHeader: true, showFooter: true, overlay: true }
    },
    mini: {
      fields: ['title', 'content', 'position', 'size', 'overlay'],
      defaults: { showHeader: true, showFooter: false, overlay: true, size: 'sm' }
    },
    full: {
      fields: ['title', 'content', 'position', 'overlay'],
      defaults: { showHeader: true, showFooter: true, overlay: true, size: 'full' }
    },
    panel: {
      fields: ['title', 'content', 'position', 'size'],
      defaults: { showHeader: true, showFooter: false, overlay: false }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'mini', 'full', 'panel'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Drawer template style'
    },
    position: {
      type: 'select',
      options: ['left', 'right', 'top', 'bottom'],
      default: 'right',
      group: 'structure',
      order: 1,
      description: 'Drawer position'
    },
    showHeader: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 2,
      description: 'Show header with title'
    },
    showFooter: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 3,
      templates: ['default', 'full'],
      description: 'Show footer with buttons'
    },
    overlay: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 4,
      templates: ['default', 'mini', 'full'],
      description: 'Show backdrop overlay'
    },
    // ===== CONTENT =====
    title: {
      type: 'text',
      default: 'Drawer',
      group: 'content',
      order: 0,
      description: 'Drawer title'
    },
    content: {
      type: 'textarea',
      default: '',
      group: 'content',
      order: 1,
      description: 'Drawer body content'
    },
    // ===== APPEARANCE =====
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      default: 'md',
      group: 'appearance',
      order: 0,
      templates: ['default', 'mini', 'panel'],
      description: 'Drawer width/height'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'ui-drawer-backdrop';
    if (!s.overlay) backdrop.classList.add('ui-drawer-backdrop-hidden');
    backdrop.addEventListener('click', () => this.close());
    this._backdrop = backdrop;

    // Create drawer
    const drawer = document.createElement('div');
    drawer.id = this.id;
    drawer.setAttribute('data-component-type', this.type);
    const pos = s.position || 'right';
    const size = s.size || 'md';
    drawer.className = `ui-drawer ui-drawer-${template} ui-drawer-${pos} ui-drawer-${size}`;
    if (s.css) drawer.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) drawer.classList.add('ui-component');

    // Header
    if (s.showHeader !== false) {
      const header = document.createElement('div');
      header.className = 'ui-drawer-header';
      const title = document.createElement('h3');
      title.className = 'ui-drawer-title';
      title.textContent = s.title || 'Drawer';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'ui-drawer-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(title);
      header.appendChild(closeBtn);
      drawer.appendChild(header);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'ui-drawer-body';
    body.innerHTML = s.content || '';
    drawer.appendChild(body);
    this._body = body;

    // Footer
    if (s.showFooter !== false && (template === 'default' || template === 'full')) {
      const footer = document.createElement('div');
      footer.className = 'ui-drawer-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'ui-btn ui-btn-outline';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => this.close());
      const saveBtn = document.createElement('button');
      saveBtn.className = 'ui-btn ui-btn-primary';
      saveBtn.dataset.color = 'primary';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        this.bus.emit('save', { component: this });
        this.close();
      });
      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);
      drawer.appendChild(footer);
    }

    this._applyThemeClasses(drawer);
    this._drawer = drawer;
    return drawer;
  }

  open() {
    // Add backdrop to body if not already there
    if (!this._backdrop.parentNode) {
      document.body.appendChild(this._backdrop);
    }
    // Add drawer to body if not already there
    if (!this._drawer.parentNode || this._drawer.parentNode !== document.body) {
      document.body.appendChild(this._drawer);
    }

    // Trigger reflow then add visible class
    requestAnimationFrame(() => {
      this._backdrop.classList.add('visible');
      this._drawer.classList.add('visible');
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    this.bus.emit('open', { component: this });
  }

  close() {
    this._backdrop.classList.remove('visible');
    this._drawer.classList.remove('visible');
    document.body.style.overflow = '';
    this.bus.emit('close', { component: this });
  }

  setContent(html) {
    this._body.innerHTML = html;
  }
}

// ============================================
// AVATAR COMPONENT
// ============================================

class uiAvatar extends ui {
  static templateConfigs = {
    default: {
      fields: ['src', 'initials', 'name', 'size', 'color'],
      defaults: {}
    },
    square: {
      fields: ['src', 'initials', 'name', 'size', 'color'],
      defaults: {}
    },
    rounded: {
      fields: ['src', 'initials', 'name', 'size', 'color'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'square', 'rounded'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Avatar shape style'
    },
    // ===== CONTENT =====
    src: {
      type: 'text',
      default: '',
      group: 'content',
      order: 0,
      description: 'Image URL (leave empty for initials)'
    },
    initials: {
      type: 'text',
      default: '',
      group: 'content',
      order: 1,
      description: 'Initials to display (if no image)'
    },
    name: {
      type: 'text',
      default: '',
      group: 'content',
      order: 2,
      description: 'Name (used to generate initials)'
    },
    // ===== APPEARANCE =====
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      default: 'md',
      group: 'appearance',
      order: 0,
      description: 'Avatar size'
    },
    color: {
      type: 'select',
      options: ['primary', 'secondary', 'success', 'danger', 'warning', 'gray'],
      default: 'primary',
      group: 'appearance',
      order: 1,
      description: 'Color (for initials)'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const avatar = document.createElement('div');
    avatar.id = this.id;
    avatar.setAttribute('data-component-type', this.type);

    const size = s.size || 'md';
    const color = s.color || 'primary';
    const classes = ['ui-avatar', `ui-avatar-${template}`, `ui-avatar-${size}`];
    if (s.css) classes.push(...s.css.split(' ').filter(c => c));
    if (ui.editMode) classes.push('ui-component');
    avatar.className = classes.join(' ');
    avatar.dataset.color = color;

    if (s.src) {
      const img = document.createElement('img');
      img.src = s.src;
      img.alt = s.name || '';
      avatar.appendChild(img);
    } else {
      // Generate initials
      let initials = s.initials;
      if (!initials && s.name) {
        const parts = s.name.split(' ');
        initials = parts.map(p => p.charAt(0).toUpperCase()).join('').substring(0, 2);
      }
      avatar.textContent = initials || '?';
    }

    this._applyThemeClasses(avatar);
    return avatar;
  }
}

// ============================================
// AVATAR GROUP COMPONENT
// ============================================

class uiAvatarGroup extends ui {
  static templateConfigs = {
    default: {
      fields: ['avatars', 'size', 'max'],
      defaults: {}
    },
    stacked: {
      fields: ['avatars', 'size', 'max'],
      defaults: {}
    },
    grid: {
      fields: ['avatars', 'size', 'columns'],
      defaults: { columns: 4 }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'stacked', 'grid'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Avatar group layout'
    },
    max: {
      type: 'number',
      default: 4,
      group: 'structure',
      order: 1,
      templates: ['default', 'stacked'],
      description: 'Maximum avatars to show'
    },
    columns: {
      type: 'number',
      default: 4,
      group: 'structure',
      order: 2,
      templates: ['grid'],
      description: 'Grid columns'
    },
    // ===== CONTENT =====
    avatars: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Avatars [{src?, initials?, name?, color?}]'
    },
    // ===== APPEARANCE =====
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      default: 'md',
      group: 'appearance',
      order: 0,
      description: 'Avatar size'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const group = document.createElement('div');
    group.id = this.id;
    group.setAttribute('data-component-type', this.type);
    group.className = `ui-avatar-group ui-avatar-group-${template}`;
    if (s.css) group.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) group.classList.add('ui-component');

    const avatars = typeof s.avatars === 'string' ? JSON.parse(s.avatars || '[]') : (s.avatars || []);
    const size = s.size || 'md';

    if (template === 'grid') {
      // Grid layout
      const columns = s.columns || 4;
      group.style.gridTemplateColumns = `repeat(${columns}, auto)`;
      avatars.forEach(avatarConfig => {
        group.appendChild(this._createAvatar(avatarConfig, size));
      });
    } else {
      // Default or stacked layout
      const max = s.max || 4;
      const visibleAvatars = avatars.slice(0, max);
      const remaining = avatars.length - max;

      // Add count badge first (will appear last due to row-reverse)
      if (remaining > 0) {
        const countBadge = document.createElement('div');
        countBadge.className = `ui-avatar-group-count ui-avatar-${size}`;
        countBadge.textContent = '+' + remaining;
        group.appendChild(countBadge);
      }

      // Add avatars (reversed order for stacking)
      visibleAvatars.reverse().forEach(avatarConfig => {
        group.appendChild(this._createAvatar(avatarConfig, size));
      });
    }

    this._applyThemeClasses(group);
    return group;
  }

  _createAvatar(config, size) {
    const avatarEl = document.createElement('div');
    const color = config.color || config.variant || 'primary';
    avatarEl.className = `ui-avatar ui-avatar-${size} ui-avatar-${color}`;

    if (config.src) {
      const img = document.createElement('img');
      img.src = config.src;
      img.alt = config.name || '';
      avatarEl.appendChild(img);
    } else {
      let initials = config.initials;
      if (!initials && config.name) {
        const parts = config.name.split(' ');
        initials = parts.map(p => p.charAt(0).toUpperCase()).join('').substring(0, 2);
      }
      avatarEl.textContent = initials || '?';
    }

    return avatarEl;
  }
}

// ============================================
// TREE VIEW COMPONENT
// ============================================

class uiTreeView extends ui {
  static templateConfigs = {
    default: {
      fields: ['data', 'selectable', 'searchable', 'editable'],
      defaults: {}
    },
    compact: {
      fields: ['data', 'selectable', 'searchable', 'editable'],
      defaults: {}
    },
    files: {
      fields: ['data', 'selectable', 'showFileIcons', 'searchable', 'editable'],
      defaults: { showFileIcons: true }
    },
    checkboxes: {
      fields: ['data', 'selectable', 'multiSelect', 'searchable', 'editable'],
      defaults: { selectable: true, multiSelect: true }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'files', 'checkboxes'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Tree template style'
    },
    selectable: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 1,
      description: 'Allow selecting items'
    },
    multiSelect: {
      type: 'checkbox',
      default: false,
      group: 'structure',
      order: 2,
      templates: ['checkboxes'],
      description: 'Allow multiple selection'
    },
    // ===== CONTENT =====
    data: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Tree data [{label, icon?, iconHtml?, sublabel?, badge?, badgeColor?, children?[], expanded?}]'
    },
    // ===== APPEARANCE =====
    showFileIcons: {
      type: 'checkbox',
      default: true,
      group: 'appearance',
      order: 0,
      templates: ['files'],
      description: 'Show file/folder icons'
    },
    // ===== FEATURES =====
    searchable: {
      type: 'checkbox',
      default: false,
      group: 'features',
      order: 0,
      description: 'Show search/filter input above tree'
    },
    searchPlaceholder: {
      type: 'text',
      default: 'Search...',
      group: 'features',
      order: 1,
      description: 'Placeholder text for search input'
    },
    editable: {
      type: 'checkbox',
      default: false,
      group: 'features',
      order: 2,
      description: 'Show add button and edit/delete actions on hover'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const tree = document.createElement('div');
    tree.id = this.id;
    tree.setAttribute('data-component-type', this.type);
    tree.className = `ui-tree ui-tree-${template}`;
    if (s.css) tree.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) tree.classList.add('ui-component');

    this._selectedNode = null;
    this._selectedNodes = new Set();
    this._searchTerm = '';
    this._data = typeof s.data === 'string' ? JSON.parse(s.data || '[]') : (s.data || []);

    // Drag-and-drop state
    this._dragSrcIdx = null;
    this._dragSrcNode = null;

    // Header (search + add button)
    if (s.searchable || s.editable) {
      const header = document.createElement('div');
      header.className = 'ui-tree-header';

      if (s.searchable) {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'ui-input ui-tree-search-input';
        searchInput.placeholder = s.searchPlaceholder || 'Search...';
        searchInput.addEventListener('input', (e) => {
          this._searchTerm = e.target.value.toLowerCase();
          this._rerenderNodes();
        });
        header.appendChild(searchInput);
      }

      if (s.editable) {
        const addBtn = document.createElement('button');
        addBtn.className = 'ui-btn ui-btn-sm ui-btn-primary';
        addBtn.dataset.color = 'primary';
        addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add';
        addBtn.addEventListener('click', () => {
          this.bus.emit('add', { component: this });
        });
        header.appendChild(addBtn);
      }

      tree.appendChild(header);
    }

    // Node container
    this._nodeContainer = document.createElement('div');
    this._nodeContainer.className = 'ui-tree-nodes';
    this._nodeContainer.style.position = 'relative';
    tree.appendChild(this._nodeContainer);

    // Drop indicator line (only when editable)
    if (s.editable) {
      this._dropIndicator = document.createElement('div');
      this._dropIndicator.className = 'ui-tree-drop-indicator';
      this._dropIndicator.style.display = 'none';
      this._nodeContainer.appendChild(this._dropIndicator);
    }

    this._renderNodes(this._nodeContainer, this._data, 0, s, template);

    this._applyThemeClasses(tree);
    return tree;
  }

  _getFilteredData() {
    if (!this._searchTerm) return this._data;
    const term = this._searchTerm;

    const filterTree = (nodes) => {
      const result = [];
      for (const node of nodes) {
        const selfMatch = (node.label && node.label.toLowerCase().includes(term)) ||
                          (node.sublabel && node.sublabel.toLowerCase().includes(term));
        const filteredChildren = node.children ? filterTree(node.children) : [];

        if (selfMatch || filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren, expanded: true });
        }
      }
      return result;
    };

    return filterTree(this._data);
  }

  _rerenderNodes() {
    const s = this._resolved;
    const template = s.template || 'default';
    this._nodeContainer.innerHTML = '';
    const data = this._getFilteredData();

    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ui-tree-empty';
      empty.textContent = 'No matching items';
      this._nodeContainer.appendChild(empty);
      return;
    }

    this._renderNodes(this._nodeContainer, data, 0, s, template);
  }

  _renderNodes(container, nodes, level, s, template) {
    nodes.forEach((node, index) => {
      const item = document.createElement('div');
      item.className = 'ui-tree-item';
      item.setAttribute('data-path', level + '-' + index);

      const nodeEl = document.createElement('div');
      nodeEl.className = 'ui-tree-node';
      if (node._idx != null) nodeEl.setAttribute('data-idx', node._idx);

      // Checkbox for checkboxes template
      if (template === 'checkboxes') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'ui-tree-checkbox';
        checkbox.checked = node.checked || false;
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          node.checked = checkbox.checked;
          this.bus.emit('check', { node, checked: checkbox.checked, component: this });
        });
        nodeEl.appendChild(checkbox);
      }

      // Toggle icon
      const toggle = document.createElement('span');
      toggle.className = 'ui-tree-toggle';
      if (node.children && node.children.length > 0) {
        toggle.textContent = '▶';
        if (node.expanded) toggle.classList.add('expanded');
      } else {
        toggle.classList.add('empty');
      }
      nodeEl.appendChild(toggle);

      // Icon — supports iconHtml (FA/HTML) or icon (emoji/text)
      if (template === 'files' && s.showFileIcons !== false) {
        const icon = document.createElement('span');
        icon.className = 'ui-tree-icon';
        icon.textContent = node.children && node.children.length > 0 ? '📁' : '📄';
        nodeEl.appendChild(icon);
      } else if (node.iconHtml) {
        const icon = document.createElement('span');
        icon.className = 'ui-tree-icon';
        icon.innerHTML = node.iconHtml;
        nodeEl.appendChild(icon);
      } else if (node.icon) {
        const icon = document.createElement('span');
        icon.className = 'ui-tree-icon';
        if (node.icon.includes('fa-')) {
          const i = document.createElement('i');
          i.className = node.icon;
          icon.appendChild(i);
        } else {
          icon.textContent = node.icon;
        }
        nodeEl.appendChild(icon);
      }

      // Label
      const label = document.createElement('span');
      label.className = 'ui-tree-label';
      label.textContent = node.label;
      nodeEl.appendChild(label);

      // Sublabel (secondary text after label)
      if (node.sublabel) {
        const sub = document.createElement('span');
        sub.className = 'ui-tree-sublabel';
        sub.style.cssText = 'font-size: 0.85em; color: var(--ui-gray-500); margin-left: 0.4em; opacity: 0.8;';
        sub.innerHTML = node.sublabel;
        nodeEl.appendChild(sub);
      }

      // Badge (count indicator)
      if (node.badge != null) {
        const badge = document.createElement('span');
        badge.className = 'ui-tree-badge';
        badge.style.cssText = `background: ${node.badgeColor || 'var(--ui-primary)'}; color: white; font-size: 0.6em; padding: 0.1em 0.4em; border-radius: 8px; font-weight: 600; margin-left: auto;`;
        badge.textContent = node.badge;
        nodeEl.appendChild(badge);
      }

      // Edit/delete actions (when editable)
      if (s.editable) {
        const editActions = document.createElement('div');
        editActions.className = 'ui-tree-node-actions';

        // Add child button
        if (node._idx != null) {
          const addChildBtn = document.createElement('button');
          addChildBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost';
          addChildBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
          addChildBtn.title = 'Add child';
          addChildBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.bus.emit('addChild', { node, component: this });
          });
          editActions.appendChild(addChildBtn);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost';
        editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('edit', { node, component: this });
        });
        editActions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost ui-btn-danger-ghost';
        deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('delete', { node, component: this });
        });
        editActions.appendChild(deleteBtn);

        nodeEl.appendChild(editActions);
      }

      // Drag-and-drop (editable nodes with _idx only, disabled during search)
      if (s.editable && node._idx != null) {
        nodeEl.draggable = true;

        nodeEl.addEventListener('dragstart', (e) => {
          if (this._searchTerm) { e.preventDefault(); return; }
          this._dragSrcIdx = node._idx;
          this._dragSrcNode = node;
          nodeEl.classList.add('ui-tree-node-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(node._idx));
        });

        nodeEl.addEventListener('dragend', () => {
          nodeEl.classList.remove('ui-tree-node-dragging');
          this._hideDropIndicator();
          this._clearAllDropHighlights();
          this._dragSrcIdx = null;
          this._dragSrcNode = null;
        });

        nodeEl.addEventListener('dragover', (e) => {
          if (this._dragSrcIdx == null) return;
          if (node._idx === this._dragSrcIdx) return;
          if (this._isDescendant(this._dragSrcIdx, node._idx)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const rect = nodeEl.getBoundingClientRect();
          const zone = this._getDropZone(e.clientY - rect.top, rect.height);
          this._showDropFeedback(nodeEl, zone);
        });

        nodeEl.addEventListener('dragleave', () => {
          nodeEl.classList.remove('ui-tree-node-drop-into');
          this._hideDropIndicator();
        });

        nodeEl.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this._dragSrcIdx == null || node._idx === this._dragSrcIdx) return;
          if (this._isDescendant(this._dragSrcIdx, node._idx)) return;
          const rect = nodeEl.getBoundingClientRect();
          const zone = this._getDropZone(e.clientY - rect.top, rect.height);
          this._hideDropIndicator();
          this._clearAllDropHighlights();
          this.bus.emit('move', { nodeIdx: this._dragSrcIdx, targetIdx: node._idx, zone, component: this });
        });
      }

      item.appendChild(nodeEl);

      // Click handler
      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();

        // Toggle expand/collapse if has children
        if (node.children && node.children.length > 0) {
          node.expanded = !node.expanded;
          toggle.classList.toggle('expanded', node.expanded);
          const childContainer = item.querySelector('.ui-tree-children');
          if (childContainer) {
            childContainer.classList.toggle('expanded', node.expanded);
          }
          this.bus.emit('toggle', { node, expanded: node.expanded, component: this });
        }

        // Selection
        if (s.selectable) {
          if (this._selectedNode) {
            this._selectedNode.classList.remove('selected');
          }
          nodeEl.classList.add('selected');
          this._selectedNode = nodeEl;
          this.bus.emit('select', { node, component: this });
        }
      });

      // Children
      if (node.children && node.children.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'ui-tree-children';
        if (node.expanded) childContainer.classList.add('expanded');
        this._renderNodes(childContainer, node.children, level + 1, s, template);
        item.appendChild(childContainer);
      }

      container.appendChild(item);
    });
  }

  setSelected(idx) {
    this.clearSelection();
    const nodeEl = this.el.querySelector(`.ui-tree-node[data-idx="${idx}"]`);
    if (nodeEl) {
      nodeEl.classList.add('selected');
      this._selectedNode = nodeEl;
    }
  }

  clearSelection() {
    if (this._selectedNode) {
      this._selectedNode.classList.remove('selected');
      this._selectedNode = null;
    }
  }

  getSelected() {
    return this._selectedNode;
  }

  // --- Drag-and-drop helpers ---

  _isDescendant(draggedIdx, targetIdx) {
    const find = (nodes) => {
      for (const n of nodes) {
        if (n._idx === draggedIdx) return n;
        if (n.children) {
          const found = find(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const draggedNode = find(this._data);
    if (!draggedNode || !draggedNode.children) return false;
    const checkChildren = (children) => {
      for (const c of children) {
        if (c._idx === targetIdx) return true;
        if (c.children && checkChildren(c.children)) return true;
      }
      return false;
    };
    return checkChildren(draggedNode.children);
  }

  _getDropZone(y, height) {
    const third = height / 3;
    if (y < third) return 'before';
    if (y > third * 2) return 'after';
    return 'into';
  }

  _showDropFeedback(nodeEl, zone) {
    this._clearAllDropHighlights();
    if (zone === 'into') {
      nodeEl.classList.add('ui-tree-node-drop-into');
      this._hideDropIndicator();
    } else {
      nodeEl.classList.remove('ui-tree-node-drop-into');
      if (this._dropIndicator) {
        const containerRect = this._nodeContainer.getBoundingClientRect();
        const nodeRect = nodeEl.getBoundingClientRect();
        const left = nodeRect.left - containerRect.left;
        const top = (zone === 'before' ? nodeRect.top : nodeRect.bottom) - containerRect.top;
        this._dropIndicator.style.display = 'block';
        this._dropIndicator.style.left = left + 'px';
        this._dropIndicator.style.top = (top - 1) + 'px';
        this._dropIndicator.style.width = nodeRect.width + 'px';
      }
    }
  }

  _hideDropIndicator() {
    if (this._dropIndicator) this._dropIndicator.style.display = 'none';
  }

  _clearAllDropHighlights() {
    if (!this.el) return;
    this.el.querySelectorAll('.ui-tree-node-drop-into').forEach(el => el.classList.remove('ui-tree-node-drop-into'));
    this.el.querySelectorAll('.ui-tree-children-drop').forEach(el => el.classList.remove('ui-tree-children-drop'));
  }
}

// ============================================
// KANBAN BOARD COMPONENT
// ============================================

class uiKanban extends ui {
  static templateConfigs = {
    default: {
      fields: ['columns', 'items'],
      defaults: {}
    },
    compact: {
      fields: ['columns', 'items'],
      defaults: {}
    }
  };

  static configSchema = {
    template: {
      type: 'select',
      options: ['default', 'compact'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Kanban template style'
    },
    columns: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Column definitions [{id, label, color?}]'
    },
    items: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 1,
      description: 'Card items [{id, title, subtitle?, columnId, color?, badges?}]'
    },
    renderCard: {
      type: 'callback',
      default: null,
      group: 'advanced',
      order: 0,
      description: 'Callback (item, cardEl) => void for custom card content'
    },
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 1,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    this._renderCard = s.renderCard || null;

    const board = document.createElement('div');
    board.id = this.id;
    board.setAttribute('data-component-type', this.type);
    board.className = `ui-kanban ui-kanban-${template}`;
    if (s.css) board.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) board.classList.add('ui-component');

    this._columns = typeof s.columns === 'string' ? JSON.parse(s.columns || '[]') : (s.columns || []);
    this._items = typeof s.items === 'string' ? JSON.parse(s.items || '[]') : (s.items || []);
    this._board = board;

    this._buildBoard();
    this._applyThemeClasses(board);
    return board;
  }

  /** Rebuild all columns inside the existing board element */
  _buildBoard() {
    const board = this._board;
    // Preserve board element but clear children
    while (board.firstChild) board.removeChild(board.firstChild);

    const clearIndicators = () => {
      board.querySelectorAll('.ui-kanban-drop-indicator-visible').forEach(el =>
        el.classList.remove('ui-kanban-drop-indicator-visible')
      );
      board.querySelectorAll('.ui-kanban-list-dragover').forEach(el =>
        el.classList.remove('ui-kanban-list-dragover')
      );
    };

    this._columns.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'ui-kanban-column';
      if (col.color) colEl.style.setProperty('--kanban-col-color', col.color);

      const header = document.createElement('div');
      header.className = 'ui-kanban-column-header';

      const label = document.createElement('span');
      label.className = 'ui-kanban-column-label';
      label.textContent = col.label || col.id;
      header.appendChild(label);

      const colItems = this._items.filter(it => String(it.columnId) === String(col.id));
      const count = document.createElement('span');
      count.className = 'ui-kanban-column-count';
      count.textContent = colItems.length;
      header.appendChild(count);

      colEl.appendChild(header);

      const list = document.createElement('div');
      list.className = 'ui-kanban-list';

      // List-level drop target (fires on empty area or below all cards)
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.classList.add('ui-kanban-list-dragover');
      });
      list.addEventListener('dragleave', (e) => {
        if (!list.contains(e.relatedTarget)) {
          list.classList.remove('ui-kanban-list-dragover');
        }
      });
      list.addEventListener('drop', (e) => {
        e.preventDefault();
        clearIndicators();
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (String(data.fromColumnId) !== String(col.id)) {
            this._applyMove(data.itemId, data.fromColumnId, col.id, colItems.length);
            this.bus.emit('move', {
              item: this._items.find(it => String(it.id) === String(data.itemId)),
              fromColumnId: data.fromColumnId, toColumnId: col.id,
              newIndex: colItems.length, component: this
            });
          }
        } catch (_) {}
      });

      colItems.forEach((item, idx) => {
        const indicator = document.createElement('div');
        indicator.className = 'ui-kanban-drop-indicator';
        list.appendChild(indicator);

        const card = document.createElement('div');
        card.className = 'ui-kanban-card';
        card.draggable = true;
        card.dataset.itemIndex = idx;
        if (item.color) card.style.borderLeftColor = item.color;

        // Drag source — only serialize IDs, not the full item (avoids issues with complex objects)
        card.addEventListener('dragstart', (e) => {
          card.classList.add('ui-kanban-card-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify({
            itemId: item.id, fromColumnId: col.id, fromIndex: idx
          }));
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('ui-kanban-card-dragging');
          clearIndicators();
        });

        // Card-level drag target for precise positioning
        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          clearIndicators();
          const rect = card.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            indicator.classList.add('ui-kanban-drop-indicator-visible');
          } else {
            const nextInd = card.nextElementSibling;
            if (nextInd && nextInd.classList.contains('ui-kanban-drop-indicator')) {
              nextInd.classList.add('ui-kanban-drop-indicator-visible');
            }
          }
        });

        card.addEventListener('dragleave', (e) => {
          if (!card.contains(e.relatedTarget)) {
            clearIndicators();
          }
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          clearIndicators();
          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const rect = card.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            let newIndex = e.clientY < midY ? idx : idx + 1;

            if (String(data.fromColumnId) === String(col.id)) {
              // Intra-column reorder
              if (data.fromIndex === newIndex || data.fromIndex === newIndex - 1) return;
              if (data.fromIndex < newIndex) newIndex--;
              this._applyReorder(col.id, data.fromIndex, newIndex);
              const updatedColItems = this._items.filter(it => String(it.columnId) === String(col.id));
              this.bus.emit('reorder', {
                column: col, item: updatedColItems[newIndex],
                items: updatedColItems, newIndex, component: this
              });
            } else {
              // Cross-column move with position
              this._applyMove(data.itemId, data.fromColumnId, col.id, newIndex);
              this.bus.emit('move', {
                item: this._items.find(it => String(it.id) === String(data.itemId)),
                fromColumnId: data.fromColumnId, toColumnId: col.id,
                newIndex, component: this
              });
            }
          } catch (_) {}
        });

        // Card content: custom renderCard or default
        if (this._renderCard) {
          this._renderCard(item, card);
        } else {
          const title = document.createElement('div');
          title.className = 'ui-kanban-card-title';
          title.textContent = item.title || '';
          card.appendChild(title);

          if (item.subtitle) {
            const sub = document.createElement('div');
            sub.className = 'ui-kanban-card-subtitle';
            sub.textContent = item.subtitle;
            card.appendChild(sub);
          }

          if (item.badges && item.badges.length) {
            const badgeRow = document.createElement('div');
            badgeRow.className = 'ui-kanban-card-badges';
            item.badges.forEach(b => {
              const badge = document.createElement('span');
              badge.className = 'ui-kanban-badge';
              if (b.color) badge.style.background = b.color;
              badge.textContent = b.label || b;
              badgeRow.appendChild(badge);
            });
            card.appendChild(badgeRow);
          }
        }

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('select', { item, column: col, component: this });
        });

        list.appendChild(card);
      });

      // Trailing drop indicator
      const trailIndicator = document.createElement('div');
      trailIndicator.className = 'ui-kanban-drop-indicator';
      list.appendChild(trailIndicator);

      colEl.appendChild(list);
      board.appendChild(colEl);
    });
  }

  /** Move item to a different column and re-render */
  _applyMove(itemId, fromColumnId, toColumnId, newIndex) {
    const item = this._items.find(it => String(it.id) === String(itemId));
    if (!item) return;
    item.columnId = toColumnId;
    this._buildBoard();
  }

  /** Reorder within a column and re-render */
  _applyReorder(columnId, fromIndex, toIndex) {
    const colItems = this._items.filter(it => String(it.columnId) === String(columnId));
    const [moved] = colItems.splice(fromIndex, 1);
    colItems.splice(toIndex, 0, moved);
    // Rebuild _items with reordered column items in place
    const result = [];
    let ci = 0;
    for (const it of this._items) {
      if (String(it.columnId) === String(columnId)) {
        result.push(colItems[ci++]);
      } else {
        result.push(it);
      }
    }
    this._items = result;
    this._buildBoard();
  }
}

// ============================================
// CALENDAR COMPONENT
// ============================================

class uiCalendar extends ui {
  static templateConfigs = {
    default: {
      fields: ['year', 'month', 'events'],
      defaults: {}
    }
  };

  static configSchema = {
    template: {
      type: 'select',
      options: ['default'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Calendar template style'
    },
    year: {
      type: 'number',
      default: new Date().getFullYear(),
      group: 'content',
      order: 0,
      description: 'Year to display'
    },
    month: {
      type: 'number',
      default: new Date().getMonth() + 1,
      group: 'content',
      order: 1,
      description: 'Month to display (1-12)'
    },
    events: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 2,
      description: 'Events [{date, title, color?, time?}]'
    },
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const year = s.year || new Date().getFullYear();
    const month = s.month || (new Date().getMonth() + 1);

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = 'ui-calendar';
    if (s.css) container.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) container.classList.add('ui-component');

    let events = typeof s.events === 'string' ? JSON.parse(s.events || '[]') : (s.events || []);

    // Header with navigation
    const header = document.createElement('div');
    header.className = 'ui-calendar-header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'ui-calendar-nav';
    prevBtn.textContent = '\u25C0';
    prevBtn.addEventListener('click', () => {
      let newMonth = month - 1, newYear = year;
      if (newMonth < 1) { newMonth = 12; newYear--; }
      this.bus.emit('navigate', { year: newYear, month: newMonth, component: this });
    });
    header.appendChild(prevBtn);

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const title = document.createElement('span');
    title.className = 'ui-calendar-title';
    title.textContent = `${monthNames[month - 1]} ${year}`;
    header.appendChild(title);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'ui-calendar-nav';
    nextBtn.textContent = '\u25B6';
    nextBtn.addEventListener('click', () => {
      let newMonth = month + 1, newYear = year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      this.bus.emit('navigate', { year: newYear, month: newMonth, component: this });
    });
    header.appendChild(nextBtn);

    container.appendChild(header);

    // Day headers
    const grid = document.createElement('div');
    grid.className = 'ui-calendar-grid';

    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    dayNames.forEach(d => {
      const dh = document.createElement('div');
      dh.className = 'ui-calendar-dayheader';
      dh.textContent = d;
      grid.appendChild(dh);
    });

    // Calculate grid
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

    // Leading empty cells
    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'ui-calendar-day ui-calendar-day-empty';
      grid.appendChild(empty);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'ui-calendar-day';
      if (isCurrentMonth && d === today.getDate()) dayCell.classList.add('ui-calendar-today');

      const dayNum = document.createElement('div');
      dayNum.className = 'ui-calendar-day-num';
      dayNum.textContent = d;
      dayCell.appendChild(dayNum);

      // Match events for this day
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(ev => {
        const evDate = ev.date || '';
        return evDate === dateStr || evDate.startsWith(dateStr);
      });

      dayEvents.slice(0, 3).forEach(ev => {
        const pill = document.createElement('div');
        pill.className = 'ui-calendar-event';
        if (ev.color) pill.style.background = ev.color;
        pill.textContent = ev.time ? `${ev.time} ${ev.title}` : ev.title;
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('selectEvent', { event: ev, component: this });
        });
        dayCell.appendChild(pill);
      });

      if (dayEvents.length > 3) {
        const more = document.createElement('div');
        more.className = 'ui-calendar-more';
        more.textContent = `+${dayEvents.length - 3} more`;
        dayCell.appendChild(more);
      }

      dayCell.addEventListener('click', () => {
        this.bus.emit('selectDay', { date: dateStr, events: dayEvents, component: this });
      });

      grid.appendChild(dayCell);
    }

    container.appendChild(grid);
    this._applyThemeClasses(container);
    return container;
  }
}

// ============================================
// CHAT COMPONENT
// ============================================

class uiChat extends ui {
  static templateConfigs = {
    default: {
      fields: ['messages', 'showInput'],
      defaults: { showInput: true }
    },
    compact: {
      fields: ['messages', 'showInput'],
      defaults: { showInput: false }
    }
  };

  static configSchema = {
    template: {
      type: 'select',
      options: ['default', 'compact'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Chat template style'
    },
    messages: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Messages [{content, sender, time, isOwn?, isSystem?}]'
    },
    showInput: {
      type: 'checkbox',
      default: true,
      group: 'structure',
      order: 1,
      description: 'Show message input bar'
    },
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = `ui-chat ui-chat-${template}`;
    if (s.css) container.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) container.classList.add('ui-component');

    let messages = typeof s.messages === 'string' ? JSON.parse(s.messages || '[]') : (s.messages || []);

    // Message list
    const list = document.createElement('div');
    list.className = 'ui-chat-list';

    messages.forEach(msg => {
      if (msg.isSystem) {
        const sys = document.createElement('div');
        sys.className = 'ui-chat-system';
        sys.textContent = msg.content;
        list.appendChild(sys);
        return;
      }

      const row = document.createElement('div');
      row.className = 'ui-chat-row' + (msg.isOwn ? ' ui-chat-own' : '');

      const bubble = document.createElement('div');
      bubble.className = 'ui-chat-bubble';

      if (!msg.isOwn && msg.sender) {
        const sender = document.createElement('div');
        sender.className = 'ui-chat-sender';
        sender.textContent = msg.sender;
        bubble.appendChild(sender);
      }

      const content = document.createElement('div');
      content.className = 'ui-chat-content';
      content.textContent = msg.content;
      bubble.appendChild(content);

      if (msg.time) {
        const time = document.createElement('div');
        time.className = 'ui-chat-time';
        time.textContent = msg.time;
        bubble.appendChild(time);
      }

      row.appendChild(bubble);
      list.appendChild(row);
    });

    container.appendChild(list);

    // Scroll to bottom after render
    requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });

    // Input bar
    if (s.showInput) {
      const inputBar = document.createElement('div');
      inputBar.className = 'ui-chat-input-bar';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ui-chat-input';
      input.placeholder = 'Type a message...';

      const sendBtn = document.createElement('button');
      sendBtn.className = 'ui-chat-send';
      sendBtn.textContent = 'Send';

      const doSend = () => {
        const text = input.value.trim();
        if (text) {
          this.bus.emit('send', { content: text, component: this });
          input.value = '';
        }
      };

      sendBtn.addEventListener('click', doSend);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSend();
      });

      inputBar.appendChild(input);
      inputBar.appendChild(sendBtn);
      container.appendChild(inputBar);
    }

    this._applyThemeClasses(container);
    return container;
  }
}

// ============================================
// GRAPH VIEW COMPONENT
// ============================================

class uiGraphView extends ui {
  static templateConfigs = {
    default: {
      fields: ['nodes', 'edges'],
      defaults: {}
    }
  };

  static configSchema = {
    template: {
      type: 'select',
      options: ['default'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Graph template style'
    },
    nodes: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Graph nodes [{id, label, color?, icon?}]'
    },
    edges: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 1,
      description: 'Graph edges [{source, target, label?}]'
    },
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = 'ui-graph';
    if (s.css) container.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) container.classList.add('ui-component');

    let nodes = typeof s.nodes === 'string' ? JSON.parse(s.nodes || '[]') : (s.nodes || []);
    let edges = typeof s.edges === 'string' ? JSON.parse(s.edges || '[]') : (s.edges || []);

    if (!nodes.length) {
      container.textContent = 'No graph data';
      this._applyThemeClasses(container);
      return container;
    }

    const size = 400;
    const cx = size / 2, cy = size / 2;
    const radius = size * 0.35;
    const nodeRadius = 24;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'ui-graph-svg');

    // Arrowhead marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', `arrow-${this.id}`);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    arrowPath.setAttribute('fill', 'var(--ui-gray-400)');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Position nodes in a circle
    const positions = {};
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    // Draw edges
    edges.forEach(edge => {
      const from = positions[edge.source];
      const to = positions[edge.target];
      if (!from || !to) return;

      // Shorten line to stop at node border
      const dx = to.x - from.x, dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      const ux = dx / dist, uy = dy / dist;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x + ux * nodeRadius);
      line.setAttribute('y1', from.y + uy * nodeRadius);
      line.setAttribute('x2', to.x - ux * (nodeRadius + 6));
      line.setAttribute('y2', to.y - uy * (nodeRadius + 6));
      line.setAttribute('class', 'ui-graph-edge');
      line.setAttribute('marker-end', `url(#arrow-${this.id})`);
      svg.appendChild(line);

      if (edge.label) {
        const lx = (from.x + to.x) / 2, ly = (from.y + to.y) / 2;
        const edgeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        edgeLabel.setAttribute('x', lx);
        edgeLabel.setAttribute('y', ly - 6);
        edgeLabel.setAttribute('class', 'ui-graph-edge-label');
        edgeLabel.textContent = edge.label;
        svg.appendChild(edgeLabel);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'ui-graph-node');
      g.style.cursor = 'pointer';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', nodeRadius);
      if (node.color) circle.setAttribute('fill', node.color);
      g.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y + 4);
      text.setAttribute('class', 'ui-graph-label');
      text.textContent = node.label || node.id;
      g.appendChild(text);

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.bus.emit('selectNode', { node, component: this });
      });

      svg.appendChild(g);
    });

    container.appendChild(svg);
    this._applyThemeClasses(container);
    return container;
  }
}

// ============================================
// GANTT CHART COMPONENT
// ============================================

/**
 * uiGantt - Timeline / Gantt chart with task bars, milestones, and today marker
 *
 * Config:
 * - tasks (json): [{id, title, startDate, endDate, color?, progress?, group?, status?}]
 * - milestones (json): [{id, date, title, color?}]
 * - startDate/endDate (text): visible range override (auto-computed if empty)
 * - dayWidth (number, default 28): pixels per day column
 * - template: 'default' | 'compact'
 *
 * Events: selectTask, selectMilestone
 */
class uiGantt extends ui {
  static templateConfigs = {
    default: {
      fields: ['tasks', 'milestones', 'startDate', 'endDate', 'dayWidth'],
      defaults: {}
    },
    compact: {
      fields: ['tasks', 'milestones', 'startDate', 'endDate', 'dayWidth'],
      defaults: {}
    }
  };

  static configSchema = {
    template: {
      type: 'select',
      options: ['default', 'compact'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'Gantt template style'
    },
    tasks: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Task items [{id, title, startDate, endDate, color?, progress?, group?, status?}]'
    },
    milestones: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 1,
      description: 'Milestones [{id, date, title, color?}]'
    },
    startDate: {
      type: 'text',
      default: '',
      group: 'content',
      order: 2,
      description: 'Range start override (YYYY-MM-DD)'
    },
    endDate: {
      type: 'text',
      default: '',
      group: 'content',
      order: 3,
      description: 'Range end override (YYYY-MM-DD)'
    },
    dayWidth: {
      type: 'number',
      default: 28,
      group: 'layout',
      order: 0,
      description: 'Pixels per day column'
    },
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  _computeRange(tasks, milestones, startOverride, endOverride) {
    let earliest = Infinity, latest = -Infinity;
    tasks.forEach(t => {
      if (t.startDate) earliest = Math.min(earliest, new Date(t.startDate).getTime());
      if (t.endDate) latest = Math.max(latest, new Date(t.endDate).getTime());
    });
    milestones.forEach(m => {
      if (m.date) {
        earliest = Math.min(earliest, new Date(m.date).getTime());
        latest = Math.max(latest, new Date(m.date).getTime());
      }
    });
    if (!isFinite(earliest)) { earliest = Date.now(); latest = Date.now(); }
    const rangeStart = startOverride ? new Date(startOverride) : new Date(earliest - 7 * 86400000);
    const rangeEnd = endOverride ? new Date(endOverride) : new Date(latest + 14 * 86400000);
    return { rangeStart, rangeEnd };
  }

  _buildGroups(tasks) {
    const groups = {};
    const ungrouped = [];
    tasks.forEach(t => {
      if (t.group) {
        if (!groups[t.group]) groups[t.group] = [];
        groups[t.group].push(t);
      } else {
        ungrouped.push(t);
      }
    });
    return { groups, ungrouped };
  }

  _buildTimelineHeader(rangeStart, rangeEnd, dayWidth) {
    const header = document.createElement('div');
    header.className = 'ui-gantt-header';

    const monthRow = document.createElement('div');
    monthRow.className = 'ui-gantt-month-row';
    const dayRow = document.createElement('div');
    dayRow.className = 'ui-gantt-day-row';

    const totalDays = this._daysBetween(rangeStart, rangeEnd);
    let currentMonth = -1;
    let monthCell = null;
    let monthDayCount = 0;

    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(rangeStart.getTime() + i * 86400000);
      const month = d.getMonth();
      const dow = d.getDay();

      if (month !== currentMonth) {
        if (monthCell) monthCell.style.width = (monthDayCount * dayWidth) + 'px';
        monthCell = document.createElement('div');
        monthCell.className = 'ui-gantt-month-cell';
        monthCell.textContent = d.toLocaleDateString('en', { month: 'short', year: 'numeric' });
        monthRow.appendChild(monthCell);
        currentMonth = month;
        monthDayCount = 0;
      }
      monthDayCount++;

      const dayCell = document.createElement('div');
      dayCell.className = 'ui-gantt-day-cell';
      if (dow === 0 || dow === 6) dayCell.classList.add('weekend');
      dayCell.style.width = dayWidth + 'px';
      dayCell.style.minWidth = dayWidth + 'px';
      dayCell.textContent = d.getDate();
      dayRow.appendChild(dayCell);
    }
    if (monthCell) monthCell.style.width = (monthDayCount * dayWidth) + 'px';

    header.appendChild(monthRow);
    header.appendChild(dayRow);
    return { header, totalDays };
  }

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const dayWidth = Number(s.dayWidth) || 28;

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = `ui-gantt${template === 'compact' ? ' ui-gantt-compact' : ''}`;
    if (s.css) container.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) container.classList.add('ui-component');

    const tasks = typeof s.tasks === 'string' ? JSON.parse(s.tasks || '[]') : (s.tasks || []);
    const milestones = typeof s.milestones === 'string' ? JSON.parse(s.milestones || '[]') : (s.milestones || []);

    const { rangeStart, rangeEnd } = this._computeRange(tasks, milestones, s.startDate, s.endDate);
    const { groups, ungrouped } = this._buildGroups(tasks);
    const { header, totalDays } = this._buildTimelineHeader(rangeStart, rangeEnd, dayWidth);
    const timelineWidth = (totalDays + 1) * dayWidth;

    // Wrapper: labels + timeline scroll
    const wrapper = document.createElement('div');
    wrapper.className = 'ui-gantt-wrapper';

    // — Left: labels column —
    const labels = document.createElement('div');
    labels.className = 'ui-gantt-labels';

    const labelHeader = document.createElement('div');
    labelHeader.className = 'ui-gantt-label-header';
    labelHeader.textContent = 'Task';
    labels.appendChild(labelHeader);

    // — Right: timeline —
    const scroll = document.createElement('div');
    scroll.className = 'ui-gantt-timeline-scroll';

    const timeline = document.createElement('div');
    timeline.className = 'ui-gantt-timeline';
    timeline.style.width = timelineWidth + 'px';

    timeline.appendChild(header);

    const rows = document.createElement('div');
    rows.className = 'ui-gantt-rows';

    // Helper: add a task row
    const addTaskRow = (task) => {
      // Label
      const lbl = document.createElement('div');
      lbl.className = 'ui-gantt-task-label';
      lbl.textContent = task.title || '';
      lbl.title = task.title || '';
      lbl.addEventListener('click', () => this.bus.emit('selectTask', { task, component: this }));
      labels.appendChild(lbl);

      // Timeline row
      const row = document.createElement('div');
      row.className = 'ui-gantt-row';

      if (task.startDate && task.endDate) {
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        const offsetDays = this._daysBetween(rangeStart, start);
        const duration = Math.max(1, this._daysBetween(start, end));

        const bar = document.createElement('div');
        bar.className = 'ui-gantt-bar';
        bar.style.left = (offsetDays * dayWidth) + 'px';
        bar.style.width = (duration * dayWidth) + 'px';
        bar.style.background = task.color || '#3b82f6';
        bar.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('selectTask', { task, component: this });
        });

        // Progress overlay
        const progress = Number(task.progress) || 0;
        if (progress > 0) {
          const prog = document.createElement('div');
          prog.className = 'ui-gantt-bar-progress';
          prog.style.width = Math.min(100, progress) + '%';
          bar.appendChild(prog);
        }

        const barLabel = document.createElement('span');
        barLabel.className = 'ui-gantt-bar-label';
        barLabel.textContent = task.title || '';
        bar.appendChild(barLabel);

        row.appendChild(bar);
      }

      rows.appendChild(row);
    };

    // Helper: add a group header row
    const addGroupHeader = (groupName, groupTasks) => {
      const grpLabel = document.createElement('div');
      grpLabel.className = 'ui-gantt-group-label';
      grpLabel.innerHTML = `<i class="fas fa-chevron-down"></i>${groupName}`;
      grpLabel.setAttribute('data-group', groupName);
      labels.appendChild(grpLabel);

      const grpRow = document.createElement('div');
      grpRow.className = 'ui-gantt-group-row';
      rows.appendChild(grpRow);

      const taskLabels = [];
      const taskRows = [];

      groupTasks.forEach(task => {
        const prevLabelCount = labels.children.length;
        const prevRowCount = rows.children.length;
        addTaskRow(task);
        taskLabels.push(labels.children[labels.children.length - 1]);
        taskRows.push(rows.children[rows.children.length - 1]);
      });

      // Collapse/expand
      grpLabel.addEventListener('click', () => {
        const collapsed = grpLabel.classList.toggle('collapsed');
        taskLabels.forEach(el => el.style.display = collapsed ? 'none' : '');
        taskRows.forEach(el => el.style.display = collapsed ? 'none' : '');
      });
    };

    // Render groups
    Object.keys(groups).forEach(groupName => {
      addGroupHeader(groupName, groups[groupName]);
    });

    // Render ungrouped tasks
    ungrouped.forEach(task => addTaskRow(task));

    // Milestones — render as rows
    milestones.forEach(ms => {
      if (!ms.date) return;

      const lbl = document.createElement('div');
      lbl.className = 'ui-gantt-task-label';
      lbl.style.fontStyle = 'italic';
      lbl.textContent = '\u25C6 ' + (ms.title || '');
      lbl.title = ms.title || '';
      lbl.addEventListener('click', () => this.bus.emit('selectMilestone', { milestone: ms, component: this }));
      labels.appendChild(lbl);

      const row = document.createElement('div');
      row.className = 'ui-gantt-row';
      const msDate = new Date(ms.date);
      const offsetDays = this._daysBetween(rangeStart, msDate);

      const diamond = document.createElement('div');
      diamond.className = 'ui-gantt-milestone';
      diamond.style.left = (offsetDays * dayWidth - 7) + 'px';
      diamond.style.borderColor = ms.color || '#6366f1';
      diamond.title = (ms.title || '') + ' — ' + msDate.toLocaleDateString();
      diamond.addEventListener('click', (e) => {
        e.stopPropagation();
        this.bus.emit('selectMilestone', { milestone: ms, component: this });
      });
      row.appendChild(diamond);
      rows.appendChild(row);
    });

    timeline.appendChild(rows);

    // Today marker
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOffset = this._daysBetween(rangeStart, today);
    if (todayOffset >= 0 && todayOffset <= totalDays) {
      const todayLine = document.createElement('div');
      todayLine.className = 'ui-gantt-today';
      todayLine.style.left = (todayOffset * dayWidth + dayWidth / 2) + 'px';
      todayLine.style.top = '0';
      timeline.appendChild(todayLine);
    }

    scroll.appendChild(timeline);

    // Sync vertical scroll between labels and timeline
    scroll.addEventListener('scroll', () => { labels.scrollTop = scroll.scrollTop; });
    labels.addEventListener('scroll', () => { scroll.scrollTop = labels.scrollTop; });

    wrapper.appendChild(labels);
    wrapper.appendChild(scroll);
    container.appendChild(wrapper);

    this._applyThemeClasses(container);
    return container;
  }
}

// ============================================
// LIST SELECTOR COMPONENT
// ============================================

/**
 * uiListSelector - Selectable list with avatar, badge, and action support
 *
 * PUBLON uiSpec INTEGRATION:
 * When binding a Publon to this component, the following uiSpec properties are used:
 * - avatar: { type, column/columns } → Renders avatar from row data
 * - badge: { column, variant, variantMap } → Renders right-aligned badge
 * - list.labelColumn → Primary text (or use labeller)
 * - list.subtitleColumn → Secondary text
 * - list.badgeColumn → Column for badge value
 *
 * Item structure: { id, title, subtitle?, avatar?, badge?, action? }
 * - badge can be string ('Active') or object { label: 'Active', variant: 'success' }
 * - avatar can be string (initials/URL) or object { name, variant, src }
 */
class uiListSelector extends ui {
  static templateConfigs = {
    default: {
      fields: ['items', 'multiSelect', 'showCheckbox'],
      defaults: {}
    },
    compact: {
      fields: ['items', 'multiSelect'],
      defaults: { showCheckbox: false }
    },
    detailed: {
      fields: ['items', 'multiSelect', 'showCheckbox', 'showDescription'],
      defaults: { showDescription: true }
    },
    cards: {
      fields: ['items', 'multiSelect'],
      defaults: { showCheckbox: false }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'detailed', 'cards'],
      default: 'default',
      group: 'structure',
      order: 0,
      description: 'List template style'
    },
    multiSelect: {
      type: 'checkbox',
      default: false,
      group: 'structure',
      order: 1,
      description: 'Allow multiple selection'
    },
    showCheckbox: {
      type: 'checkbox',
      default: false,
      group: 'structure',
      order: 2,
      templates: ['default', 'detailed'],
      description: 'Show checkbox indicator (auto-enabled in edit mode)'
    },
    // ===== CONTENT =====
    items: {
      type: 'json',
      default: '[]',
      group: 'content',
      order: 0,
      description: 'Items [{id, title, subtitle?, avatar?, badge?, action?}]. Badge can be string or {label, variant}'
    },
    // ===== FEATURES =====
    searchable: {
      type: 'checkbox',
      default: false,
      group: 'features',
      order: 0,
      description: 'Show search/filter input above list'
    },
    searchPlaceholder: {
      type: 'text',
      default: 'Search...',
      group: 'features',
      order: 1,
      description: 'Placeholder text for search input'
    },
    pagination: {
      type: 'checkbox',
      default: false,
      group: 'features',
      order: 2,
      description: 'Enable pagination with page controls'
    },
    perPage: {
      type: 'number',
      default: 10,
      group: 'features',
      order: 3,
      description: 'Items per page when pagination enabled'
    },
    editable: {
      type: 'checkbox',
      default: false,
      group: 'features',
      order: 4,
      description: 'Show edit/delete buttons for each item'
    },
    // ===== APPEARANCE =====
    showDescription: {
      type: 'checkbox',
      default: false,
      group: 'appearance',
      order: 0,
      templates: ['detailed'],
      description: 'Show item descriptions'
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      group: 'advanced',
      order: 0,
      description: 'Additional CSS classes'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';

    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = `ui-list-selector ui-list-selector-${template}`;
    if (s.css) container.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) container.classList.add('ui-component');

    this._selected = new Set();
    this._searchTerm = '';
    this._currentPage = 1;

    // Header/toolbar area (search + add button)
    if (s.searchable || s.editable) {
      const header = document.createElement('div');
      header.className = 'ui-list-header';

      // Search input
      if (s.searchable) {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'ui-input ui-list-search-input';
        searchInput.placeholder = s.searchPlaceholder || 'Search...';
        searchInput.addEventListener('input', (e) => {
          this._searchTerm = e.target.value.toLowerCase();
          this._currentPage = 1;
          this._renderItems(this._listContainer);
          this._updatePagination();
        });
        header.appendChild(searchInput);
      }

      // Add button (when editable)
      if (s.editable) {
        const addBtn = document.createElement('button');
        addBtn.className = 'ui-btn ui-btn-sm ui-btn-primary';
        addBtn.dataset.color = 'primary';
        addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add';
        addBtn.addEventListener('click', () => {
          this.bus.emit('add', { component: this });
          if (typeof s.onAdd === 'function') s.onAdd(this);
        });
        header.appendChild(addBtn);
      }

      container.appendChild(header);
    }

    // List container
    this._listContainer = document.createElement('div');
    this._listContainer.className = 'ui-list-items';
    container.appendChild(this._listContainer);

    this._renderItems(this._listContainer);

    // Pagination footer using uiPagination component
    if (s.pagination) {
      this._paginationWrapper = document.createElement('div');
      this._paginationWrapper.className = 'ui-list-pagination-wrapper';
      container.appendChild(this._paginationWrapper);
      this._updatePagination();
    }

    this._applyThemeClasses(container);
    return container;
  }

  _getFilteredItems() {
    const s = this._resolved;
    let items = typeof s.items === 'string' ? JSON.parse(s.items || '[]') : (s.items || []);

    // Filter by search term
    if (this._searchTerm) {
      items = items.filter(item => {
        const searchFields = [item.title, item.subtitle, item.description].filter(Boolean);
        return searchFields.some(field => field.toLowerCase().includes(this._searchTerm));
      });
    }

    return items;
  }

  _getPaginatedItems(items) {
    const s = this._resolved;
    if (!s.pagination) return items;

    const perPage = s.perPage || 10;
    const start = (this._currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }

  _updatePagination() {
    if (!this._paginationWrapper) return;

    const s = this._resolved;
    const filteredItems = this._getFilteredItems();
    const perPage = s.perPage || 10;
    const totalPages = Math.ceil(filteredItems.length / perPage);

    this._paginationWrapper.innerHTML = '';

    if (totalPages <= 1) {
      this._paginationWrapper.style.display = 'none';
      return;
    }

    this._paginationWrapper.style.display = 'flex';

    // Info text
    const info = document.createElement('span');
    info.className = 'ui-list-pagination-info';
    const start = (this._currentPage - 1) * perPage + 1;
    const end = Math.min(this._currentPage * perPage, filteredItems.length);
    info.textContent = `${start}-${end} of ${filteredItems.length}`;
    this._paginationWrapper.appendChild(info);

    // Use uiPagination component (default template shows page numbers)
    this._pagination = new uiPagination({
      parent: this._paginationWrapper,
      template: 'default',
      totalPages: totalPages,
      currentPage: this._currentPage,
      size: 'sm'
    });

    this._pagination.bus.on('change', (e) => {
      this._currentPage = e.page;
      this._renderItems(this._listContainer);
      this._updatePagination();
    });
  }

  _renderItems(container) {
    container.innerHTML = '';
    const s = this._resolved;
    const template = s.template || 'default';

    // Get filtered and paginated items
    const filteredItems = this._getFilteredItems();
    const items = this._getPaginatedItems(filteredItems);

    // Show empty state if no items
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ui-list-empty';
      empty.textContent = this._searchTerm ? 'No matching items' : 'No items';
      container.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'ui-list-item';
      itemEl.setAttribute('data-id', item.id || index);

      if (this._selected.has(item.id || index)) {
        itemEl.classList.add('selected');
      }

      // Cards template styling
      if (template === 'cards') {
        itemEl.classList.add('ui-list-item-card');
      }

      // Checkbox - only show when explicitly enabled or in edit mode
      const showCheckbox = (s.showCheckbox || ui.editMode) && template !== 'compact' && template !== 'cards';
      if (showCheckbox) {
        const checkbox = document.createElement('div');
        checkbox.className = 'ui-list-item-checkbox';
        checkbox.innerHTML = this._selected.has(item.id || index) ? '✓' : '';
        itemEl.appendChild(checkbox);
      }

      // Avatar
      if (item.avatar) {
        const avatarEl = document.createElement('div');
        avatarEl.className = 'ui-list-item-avatar';
        const avatar = document.createElement('div');

        // Handle avatar as object { name, variant, src } or string
        let avatarVariant = 'primary';
        let avatarContent = '';
        let avatarSrc = null;

        if (typeof item.avatar === 'object') {
          avatarVariant = item.avatar.variant || 'primary';
          avatarSrc = item.avatar.src || item.avatar.image;
          if (item.avatar.name) {
            // Get initials from name
            avatarContent = item.avatar.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          }
        } else if (typeof item.avatar === 'string') {
          if (item.avatar.startsWith('http') || item.avatar.startsWith('/')) {
            avatarSrc = item.avatar;
          } else {
            avatarContent = item.avatar;
          }
          avatarVariant = item.avatarVariant || 'primary';
        }

        avatar.className = 'ui-avatar ui-avatar-sm ui-avatar-' + avatarVariant;

        if (avatarSrc) {
          const img = document.createElement('img');
          img.src = avatarSrc;
          avatar.appendChild(img);
        } else {
          avatar.textContent = avatarContent;
        }
        avatarEl.appendChild(avatar);
        itemEl.appendChild(avatarEl);
      }

      // Content
      const content = document.createElement('div');
      content.className = 'ui-list-item-content';
      const title = document.createElement('div');
      title.className = 'ui-list-item-title';
      title.textContent = item.title;
      content.appendChild(title);
      if (item.subtitle) {
        const subtitle = document.createElement('div');
        subtitle.className = 'ui-list-item-subtitle';
        subtitle.textContent = item.subtitle;
        content.appendChild(subtitle);
      }
      itemEl.appendChild(content);

      // Badge - right-aligned status/metric indicator
      // Supports: badge: 'Active' or badge: { label: 'Active', variant: 'success' }
      if (item.badge !== undefined && item.badge !== null) {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'ui-list-item-badge';

        let badgeLabel = '';
        let badgeVariant = 'primary';

        if (typeof item.badge === 'object') {
          badgeLabel = item.badge.label || '';
          badgeVariant = item.badge.variant || 'primary';
        } else {
          badgeLabel = String(item.badge);
          badgeVariant = item.badgeVariant || 'primary';
        }

        // Only show if there's a label (or non-zero for numbers)
        if (badgeLabel !== '' && badgeLabel !== '0') {
          const badge = document.createElement('span');
          badge.className = `ui-badge ui-badge-${badgeVariant}`;
          badge.textContent = badgeLabel;
          badgeEl.appendChild(badge);
          itemEl.appendChild(badgeEl);
        }
      }

      // Action
      if (item.action) {
        const actionEl = document.createElement('div');
        actionEl.className = 'ui-list-item-action';
        const btn = document.createElement('button');
        btn.className = 'ui-btn ui-btn-sm ui-btn-' + (item.actionVariant || 'outline');
        btn.textContent = item.action;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('action', { item, component: this });
        });
        actionEl.appendChild(btn);
        itemEl.appendChild(actionEl);
      }

      // Editable buttons (edit/delete)
      if (s.editable) {
        const editActions = document.createElement('div');
        editActions.className = 'ui-list-item-edit-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost';
        editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('edit', { item, component: this });
          if (typeof s.onEdit === 'function') s.onEdit(item, this);
        });
        editActions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'ui-btn ui-btn-sm ui-btn-ghost ui-btn-danger-ghost';
        deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.bus.emit('delete', { item, component: this });
          if (typeof s.onDelete === 'function') s.onDelete(item, this);
        });
        editActions.appendChild(deleteBtn);

        itemEl.appendChild(editActions);
      }

      // Click handler
      itemEl.addEventListener('click', () => {
        const id = item.id || index;

        if (s.multiSelect) {
          if (this._selected.has(id)) {
            this._selected.delete(id);
            itemEl.classList.remove('selected');
          } else {
            this._selected.add(id);
            itemEl.classList.add('selected');
          }
        } else {
          // Single select
          this._selected.clear();
          container.querySelectorAll('.ui-list-item').forEach(el => el.classList.remove('selected'));
          this._selected.add(id);
          itemEl.classList.add('selected');
        }

        // Update checkbox if visible
        const checkbox = itemEl.querySelector('.ui-list-item-checkbox');
        if (checkbox) checkbox.innerHTML = this._selected.has(id) ? '✓' : '';

        // Emit event on component bus
        this.bus.emit('select', { item, selected: Array.from(this._selected), component: this });

        // Call onSelect callback if provided
        if (typeof s.onSelect === 'function') {
          s.onSelect(item, Array.from(this._selected), this);
        }
      });

      container.appendChild(itemEl);
    });
  }

  getSelected() {
    return Array.from(this._selected);
  }

  setSelected(ids) {
    this._selected = new Set(ids);
    this._renderItems(this._listContainer || this.el);
  }

  clearSelection() {
    this._selected.clear();
    this._renderItems(this._listContainer || this.el);
  }
}

// ============================================
// PHASE 6: ADVANCED FORM ELEMENTS
// ============================================

/**
 * uiFileInput - Drag and drop file input
 */
class uiFileInput extends ui {
  // Template configurations for file inputs
  static templateConfigs = {
    default: {
      fields: ['accept', 'multiple', 'maxSize', 'text', 'hint', 'variant'],
      defaults: {}
    },
    compact: {
      fields: ['accept', 'multiple', 'maxSize', 'variant'],
      defaults: { text: 'Browse...' }
    },
    avatar: {
      fields: ['accept', 'maxSize', 'variant'],
      defaults: { accept: 'image/*', multiple: false, text: '' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'avatar'],
      default: 'default',
      description: 'File input layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    accept: {
      type: 'text',
      default: '',
      description: 'Accepted file types (e.g., ".jpg,.png,image/*")',
      group: 'content',
      order: 1
    },
    multiple: {
      type: 'checkbox',
      default: false,
      description: 'Allow multiple files',
      group: 'content',
      order: 2,
      templates: ['default', 'compact']
    },
    maxSize: {
      type: 'number',
      default: 0,
      description: 'Max file size in MB (0 = no limit)',
      group: 'content',
      order: 3
    },
    text: {
      type: 'text',
      default: 'Drop files here or click to browse',
      description: 'Drop zone text',
      group: 'content',
      order: 4,
      templates: ['default']
    },
    hint: {
      type: 'text',
      default: '',
      description: 'Hint text below main text',
      group: 'content',
      order: 5,
      templates: ['default']
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';

    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const classes = ['ui-file-input', `ui-file-input-template-${template}`];
    if (variant !== 'default') classes.push(`ui-file-input-variant-${variant}`);
    if (s.css) classes.push(s.css);
    el.className = classes.join(' ');

    // Avatar template: circular image upload
    if (template === 'avatar') {
      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'ui-file-input-avatar';

      const avatarIcon = document.createElement('div');
      avatarIcon.className = 'ui-file-input-avatar-icon';
      avatarIcon.textContent = '📷';
      avatarWrap.appendChild(avatarIcon);

      el.appendChild(avatarWrap);
    }
    // Compact template: button-like
    else if (template === 'compact') {
      const btn = document.createElement('span');
      btn.className = 'ui-file-input-btn';
      btn.textContent = s.text || 'Browse...';
      el.appendChild(btn);
    }
    // Default template
    else {
      // Icon
      const icon = document.createElement('div');
      icon.className = 'ui-file-input-icon';
      icon.textContent = '📁';
      el.appendChild(icon);

      // Text
      const text = document.createElement('div');
      text.className = 'ui-file-input-text';
      text.textContent = s.text;
      el.appendChild(text);

      // Hint
      if (s.hint) {
        const hint = document.createElement('div');
        hint.className = 'ui-file-input-hint';
        hint.textContent = s.hint;
        el.appendChild(hint);
      }
    }

    // Hidden input
    const input = document.createElement('input');
    input.type = 'file';
    if (s.accept) input.accept = s.accept;
    if (s.multiple) input.multiple = true;
    el.appendChild(input);

    // Files list
    const filesContainer = document.createElement('div');
    filesContainer.className = 'ui-file-input-files';
    el.appendChild(filesContainer);

    this._files = [];
    this._input = input;
    this._filesContainer = filesContainer;

    // Click to open
    el.addEventListener('click', () => input.click());

    // File selection
    input.addEventListener('change', () => this._handleFiles(input.files));

    // Drag and drop
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('dragover');
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('dragover');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('dragover');
      this._handleFiles(e.dataTransfer.files);
    });

    this._applyThemeClasses(el);
    return el;
  }

  _handleFiles(fileList) {
    const maxSize = this.settings.maxSize * 1024 * 1024; // Convert MB to bytes

    Array.from(fileList).forEach(file => {
      if (maxSize > 0 && file.size > maxSize) {
        this.bus.emit('error', { file, message: `File too large: ${file.name}` });
        return;
      }

      if (!this.settings.multiple) {
        this._files = [];
      }
      this._files.push(file);
    });

    this._renderFiles();
    this.bus.emit('change', { files: this._files, component: this });
  }

  _renderFiles() {
    this._filesContainer.innerHTML = '';

    this._files.forEach((file, index) => {
      const fileEl = document.createElement('div');
      fileEl.className = 'ui-file-input-file';

      const name = document.createElement('span');
      name.className = 'ui-file-input-file-name';
      name.textContent = file.name;
      fileEl.appendChild(name);

      const size = document.createElement('span');
      size.className = 'ui-file-input-file-size';
      size.textContent = this._formatSize(file.size);
      fileEl.appendChild(size);

      const remove = document.createElement('span');
      remove.className = 'ui-file-input-file-remove';
      remove.textContent = '✕';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        this._files.splice(index, 1);
        this._renderFiles();
        this.bus.emit('change', { files: this._files, component: this });
      });
      fileEl.appendChild(remove);

      this._filesContainer.appendChild(fileEl);
    });
  }

  _formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFiles() {
    return this._files;
  }

  clear() {
    this._files = [];
    this._input.value = '';
    this._renderFiles();
  }
}

/**
 * uiColorPicker - Color picker with hex display
 */
class uiColorPicker extends ui {
  // Template configurations for color pickers
  static templateConfigs = {
    default: {
      fields: ['value', 'showValue', 'variant', 'size'],
      defaults: {}
    },
    inline: {
      fields: ['value', 'variant', 'size'],
      defaults: { showValue: false }
    },
    'with-label': {
      fields: ['label', 'value', 'showValue', 'variant', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'inline', 'with-label'],
      default: 'default',
      description: 'Color picker layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    label: {
      type: 'text',
      default: '',
      description: 'Color picker label',
      group: 'content',
      order: 1,
      templates: ['with-label']
    },
    value: {
      type: 'text',
      default: '#3b82f6',
      description: 'Initial color value',
      group: 'content',
      order: 2
    },
    showValue: {
      type: 'checkbox',
      default: true,
      description: 'Show hex value',
      group: 'content',
      order: 3,
      templates: ['default', 'with-label']
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Color picker size',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const classes = ['ui-color-picker', `ui-color-picker-template-${template}`];
    if (variant !== 'default') classes.push(`ui-color-picker-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-color-picker-${size}`);
    if (s.css) classes.push(s.css);
    el.className = classes.join(' ');

    // With-label template
    if (template === 'with-label' && s.label) {
      const label = document.createElement('label');
      label.className = 'ui-color-picker-label';
      label.textContent = s.label;
      el.appendChild(label);
    }

    // Swatch
    const swatch = document.createElement('div');
    swatch.className = 'ui-color-picker-swatch';

    const input = document.createElement('input');
    input.type = 'color';
    input.value = s.value;
    swatch.appendChild(input);
    el.appendChild(swatch);

    // Value display
    if (s.showValue !== false && template !== 'inline') {
      const valueEl = document.createElement('div');
      valueEl.className = 'ui-color-picker-value';
      valueEl.textContent = s.value.toUpperCase();
      el.appendChild(valueEl);
      this._valueEl = valueEl;
    }

    this._input = input;

    input.addEventListener('input', () => {
      if (this._valueEl) {
        this._valueEl.textContent = input.value.toUpperCase();
      }
      this.bus.emit('change', { value: input.value, component: this });
    });

    this._applyThemeClasses(el);
    return el;
  }

  getValue() {
    return this._input.value;
  }

  setValue(color) {
    this._input.value = color;
    if (this._valueEl) {
      this._valueEl.textContent = color.toUpperCase();
    }
  }
}

/**
 * uiDatePicker - Styled date input
 */
class uiDatePicker extends ui {
  // Template configurations for date pickers
  static templateConfigs = {
    default: {
      fields: ['value', 'min', 'max', 'placeholder', 'variant', 'size'],
      defaults: {}
    },
    datetime: {
      fields: ['value', 'min', 'max', 'variant', 'size'],
      defaults: {}
    },
    range: {
      fields: ['valueStart', 'valueEnd', 'min', 'max', 'variant', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'datetime', 'range'],
      default: 'default',
      description: 'Date picker layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    value: {
      type: 'text',
      default: '',
      description: 'Initial date value (YYYY-MM-DD)',
      group: 'content',
      order: 1,
      templates: ['default', 'datetime']
    },
    valueStart: {
      type: 'text',
      default: '',
      description: 'Range start date',
      group: 'content',
      order: 2,
      templates: ['range']
    },
    valueEnd: {
      type: 'text',
      default: '',
      description: 'Range end date',
      group: 'content',
      order: 3,
      templates: ['range']
    },
    min: {
      type: 'text',
      default: '',
      description: 'Minimum date',
      group: 'content',
      order: 4
    },
    max: {
      type: 'text',
      default: '',
      description: 'Maximum date',
      group: 'content',
      order: 5
    },
    placeholder: {
      type: 'text',
      default: 'Select date',
      description: 'Placeholder text',
      group: 'content',
      order: 6,
      templates: ['default']
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Date picker size',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const classes = ['ui-date-picker', `ui-date-picker-template-${template}`];
    if (variant !== 'default') classes.push(`ui-date-picker-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-date-picker-${size}`);
    if (s.css) classes.push(s.css);
    el.className = classes.join(' ');

    // Range template: two date inputs
    if (template === 'range') {
      const rangeWrap = document.createElement('div');
      rangeWrap.className = 'ui-date-picker-range';

      const inputStart = document.createElement('input');
      inputStart.type = 'date';
      if (s.valueStart) inputStart.value = s.valueStart;
      if (s.min) inputStart.min = s.min;
      if (s.max) inputStart.max = s.max;

      const separator = document.createElement('span');
      separator.className = 'ui-date-picker-separator';
      separator.textContent = 'to';

      const inputEnd = document.createElement('input');
      inputEnd.type = 'date';
      if (s.valueEnd) inputEnd.value = s.valueEnd;
      if (s.min) inputEnd.min = s.min;
      if (s.max) inputEnd.max = s.max;

      rangeWrap.appendChild(inputStart);
      rangeWrap.appendChild(separator);
      rangeWrap.appendChild(inputEnd);
      el.appendChild(rangeWrap);

      this._inputStart = inputStart;
      this._inputEnd = inputEnd;

      inputStart.addEventListener('change', () => {
        this.bus.emit('change', { valueStart: inputStart.value, valueEnd: inputEnd.value, component: this });
      });
      inputEnd.addEventListener('change', () => {
        this.bus.emit('change', { valueStart: inputStart.value, valueEnd: inputEnd.value, component: this });
      });
    }
    // Datetime template
    else if (template === 'datetime') {
      const input = document.createElement('input');
      input.type = 'datetime-local';
      if (s.value) input.value = s.value;
      if (s.min) input.min = s.min;
      if (s.max) input.max = s.max;
      el.appendChild(input);

      this._input = input;

      input.addEventListener('change', () => {
        this.bus.emit('change', { value: input.value, component: this });
      });
    }
    // Default template
    else {
      const input = document.createElement('input');
      input.type = 'date';
      if (s.value) input.value = s.value;
      if (s.min) input.min = s.min;
      if (s.max) input.max = s.max;
      el.appendChild(input);

      this._input = input;

      input.addEventListener('change', () => {
        this.bus.emit('change', { value: input.value, component: this });
      });
    }

    this._applyThemeClasses(el);
    return el;
  }

  getValue() {
    return this._input.value;
  }

  setValue(date) {
    this._input.value = date;
  }
}

/**
 * uiNumberStepper - Number input with increment/decrement buttons
 */
class uiNumberStepper extends ui {
  // Template configurations for number steppers
  static templateConfigs = {
    default: {
      fields: ['value', 'min', 'max', 'step', 'variant', 'size'],
      defaults: {}
    },
    compact: {
      fields: ['value', 'min', 'max', 'step', 'variant', 'size'],
      defaults: {}
    },
    vertical: {
      fields: ['value', 'min', 'max', 'step', 'variant', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'vertical'],
      default: 'default',
      description: 'Number stepper layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    value: {
      type: 'number',
      default: 0,
      description: 'Initial value',
      group: 'content',
      order: 1
    },
    min: {
      type: 'number',
      default: null,
      description: 'Minimum value',
      group: 'content',
      order: 2
    },
    max: {
      type: 'number',
      default: null,
      description: 'Maximum value',
      group: 'content',
      order: 3
    },
    step: {
      type: 'number',
      default: 1,
      description: 'Step increment',
      group: 'content',
      order: 4
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Stepper size',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const classes = ['ui-number-stepper', `ui-number-stepper-template-${template}`];
    if (variant !== 'default') classes.push(`ui-number-stepper-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-number-stepper-${size}`);
    if (s.css) classes.push(s.css);
    el.className = classes.join(' ');

    // Compact template: smaller, inline style
    if (template === 'compact') {
      // Decrement button
      const decBtn = document.createElement('button');
      decBtn.className = 'ui-number-stepper-btn ui-number-stepper-btn-sm';
      decBtn.textContent = '−';
      decBtn.type = 'button';
      el.appendChild(decBtn);

      // Value display (no input)
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'ui-number-stepper-value';
      valueDisplay.textContent = s.value;
      el.appendChild(valueDisplay);

      // Increment button
      const incBtn = document.createElement('button');
      incBtn.className = 'ui-number-stepper-btn ui-number-stepper-btn-sm';
      incBtn.textContent = '+';
      incBtn.type = 'button';
      el.appendChild(incBtn);

      this._valueDisplay = valueDisplay;
      this._decBtn = decBtn;
      this._incBtn = incBtn;
      this._value = s.value;

      const updateButtons = () => {
        decBtn.disabled = s.min !== null && this._value <= s.min;
        incBtn.disabled = s.max !== null && this._value >= s.max;
      };

      decBtn.addEventListener('click', () => {
        const newVal = this._value - s.step;
        if (s.min === null || newVal >= s.min) {
          this._value = newVal;
          valueDisplay.textContent = newVal;
          updateButtons();
          this.bus.emit('change', { value: newVal, component: this });
        }
      });

      incBtn.addEventListener('click', () => {
        const newVal = this._value + s.step;
        if (s.max === null || newVal <= s.max) {
          this._value = newVal;
          valueDisplay.textContent = newVal;
          updateButtons();
          this.bus.emit('change', { value: newVal, component: this });
        }
      });

      updateButtons();
    }
    // Vertical template: buttons stacked
    else if (template === 'vertical') {
      const wrapper = document.createElement('div');
      wrapper.className = 'ui-number-stepper-vertical';

      // Increment button (top)
      const incBtn = document.createElement('button');
      incBtn.className = 'ui-number-stepper-btn';
      incBtn.textContent = '▲';
      incBtn.type = 'button';
      wrapper.appendChild(incBtn);

      // Input
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'ui-number-stepper-input';
      input.value = s.value;
      if (s.min !== null) input.min = s.min;
      if (s.max !== null) input.max = s.max;
      input.step = s.step;
      wrapper.appendChild(input);

      // Decrement button (bottom)
      const decBtn = document.createElement('button');
      decBtn.className = 'ui-number-stepper-btn';
      decBtn.textContent = '▼';
      decBtn.type = 'button';
      wrapper.appendChild(decBtn);

      el.appendChild(wrapper);

      this._input = input;
      this._decBtn = decBtn;
      this._incBtn = incBtn;

      const updateButtons = () => {
        const val = parseFloat(input.value) || 0;
        decBtn.disabled = s.min !== null && val <= s.min;
        incBtn.disabled = s.max !== null && val >= s.max;
      };

      decBtn.addEventListener('click', () => {
        const newVal = (parseFloat(input.value) || 0) - s.step;
        if (s.min === null || newVal >= s.min) {
          input.value = newVal;
          updateButtons();
          this.bus.emit('change', { value: newVal, component: this });
        }
      });

      incBtn.addEventListener('click', () => {
        const newVal = (parseFloat(input.value) || 0) + s.step;
        if (s.max === null || newVal <= s.max) {
          input.value = newVal;
          updateButtons();
          this.bus.emit('change', { value: newVal, component: this });
        }
      });

      input.addEventListener('change', () => {
        let val = parseFloat(input.value) || 0;
        if (s.min !== null && val < s.min) val = s.min;
        if (s.max !== null && val > s.max) val = s.max;
        input.value = val;
        updateButtons();
        this.bus.emit('change', { value: val, component: this });
      });

      updateButtons();
    }
    // Default template
    else {
      // Decrement button
      const decBtn = document.createElement('button');
      decBtn.className = 'ui-number-stepper-btn';
      decBtn.textContent = '−';
      decBtn.type = 'button';
      el.appendChild(decBtn);

      // Input
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'ui-number-stepper-input';
      input.value = s.value;
      if (s.min !== null) input.min = s.min;
      if (s.max !== null) input.max = s.max;
      input.step = s.step;
      el.appendChild(input);

      // Increment button
      const incBtn = document.createElement('button');
      incBtn.className = 'ui-number-stepper-btn';
      incBtn.textContent = '+';
      incBtn.type = 'button';
      el.appendChild(incBtn);

      this._input = input;
      this._decBtn = decBtn;
      this._incBtn = incBtn;

      const updateButtons = () => {
        const val = parseFloat(input.value) || 0;
        decBtn.disabled = s.min !== null && val <= s.min;
        incBtn.disabled = s.max !== null && val >= s.max;
      };

      decBtn.addEventListener('click', () => {
        const newVal = (parseFloat(input.value) || 0) - s.step;
        if (s.min === null || newVal >= s.min) {
          input.value = newVal;
          updateButtons();
          this.bus.emit('change', { value: newVal, component: this });
        }
      });

      incBtn.addEventListener('click', () => {
        const newVal = (parseFloat(input.value) || 0) + s.step;
        if (s.max === null || newVal <= s.max) {
          input.value = newVal;
          updateButtons();
          this.bus.emit('change', { value: newVal, component: this });
        }
      });

      input.addEventListener('change', () => {
        let val = parseFloat(input.value) || 0;
        if (s.min !== null && val < s.min) val = s.min;
        if (s.max !== null && val > s.max) val = s.max;
        input.value = val;
        updateButtons();
        this.bus.emit('change', { value: val, component: this });
      });

      updateButtons();
    }

    this._applyThemeClasses(el);
    return el;
  }

  getValue() {
    return parseFloat(this._input.value) || 0;
  }

  setValue(value) {
    this._input.value = value;
    this._input.dispatchEvent(new Event('change'));
  }
}

/**
 * uiTagsInput - Tag entry input
 */
class uiTagsInput extends ui {
  // Template configurations for tags input
  static templateConfigs = {
    default: {
      fields: ['tags', 'placeholder', 'maxTags', 'variant', 'size'],
      defaults: {}
    },
    pill: {
      fields: ['tags', 'placeholder', 'maxTags', 'variant', 'size'],
      defaults: { variant: 'soft' }
    },
    inline: {
      fields: ['tags', 'placeholder', 'maxTags', 'variant', 'size'],
      defaults: {}
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'pill', 'inline'],
      default: 'default',
      description: 'Tags input layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    tags: {
      type: 'json',
      default: [],
      description: 'Initial tags array',
      group: 'content',
      order: 1
    },
    placeholder: {
      type: 'text',
      default: 'Add tag...',
      description: 'Input placeholder',
      group: 'content',
      order: 2
    },
    maxTags: {
      type: 'number',
      default: 0,
      description: 'Maximum tags (0 = unlimited)',
      group: 'content',
      order: 3
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Tags input size',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const classes = ['ui-tags-input', `ui-tags-input-template-${template}`];
    if (variant !== 'default') classes.push(`ui-tags-input-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-tags-input-${size}`);
    if (s.css) classes.push(s.css);
    el.className = classes.join(' ');

    this._tags = [...(s.tags || [])];
    this._tagsContainer = el;

    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ui-tags-input-field';
    input.placeholder = s.placeholder;
    this._input = input;

    this._renderTags();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        this._addTag(input.value.trim());
      } else if (e.key === 'Backspace' && !input.value && this._tags.length > 0) {
        this._removeTag(this._tags.length - 1);
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        this._addTag(input.value.trim());
      }
    });

    el.addEventListener('click', () => input.focus());

    this._applyThemeClasses(el);
    return el;
  }

  _addTag(tag) {
    if (!tag) return;
    if (this._tags.includes(tag)) return;
    if (this.settings.maxTags > 0 && this._tags.length >= this.settings.maxTags) return;

    this._tags.push(tag);
    this._input.value = '';
    this._renderTags();
    this.bus.emit('change', { tags: this._tags, component: this });
  }

  _removeTag(index) {
    this._tags.splice(index, 1);
    this._renderTags();
    this.bus.emit('change', { tags: this._tags, component: this });
  }

  _renderTags() {
    // Clear existing tags (but keep the input)
    const input = this._input;
    this._tagsContainer.innerHTML = '';

    this._tags.forEach((tag, index) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'ui-tags-input-tag';
      tagEl.textContent = tag;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'ui-tags-input-tag-remove';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeTag(index);
      });
      tagEl.appendChild(removeBtn);

      this._tagsContainer.appendChild(tagEl);
    });

    this._tagsContainer.appendChild(input);
  }

  getTags() {
    return [...this._tags];
  }

  setTags(tags) {
    this._tags = [...tags];
    this._renderTags();
  }

  clear() {
    this._tags = [];
    this._renderTags();
  }
}

/**
 * uiSearchInput - Search input with icon and clear button
 */
class uiSearchInput extends ui {
  // Template configurations for search inputs
  static templateConfigs = {
    default: {
      fields: ['value', 'placeholder', 'variant', 'size'],
      defaults: {}
    },
    expandable: {
      fields: ['value', 'placeholder', 'variant', 'size'],
      defaults: {}
    },
    rounded: {
      fields: ['value', 'placeholder', 'variant', 'size'],
      defaults: { variant: 'soft' }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'expandable', 'rounded'],
      default: 'default',
      description: 'Search input layout template',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    value: {
      type: 'text',
      default: '',
      description: 'Initial value',
      group: 'content',
      order: 1
    },
    placeholder: {
      type: 'text',
      default: 'Search...',
      description: 'Placeholder text',
      group: 'content',
      order: 2
    },
    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'soft', 'outlined'],
      default: 'default',
      description: 'Visual style variant',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Search input size',
      group: 'appearance',
      order: 2
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced',
      order: 0
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = s.size || 'md';

    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const classes = ['ui-search-input', `ui-search-input-template-${template}`];
    if (variant !== 'default') classes.push(`ui-search-input-variant-${variant}`);
    if (size !== 'md') classes.push(`ui-search-input-${size}`);
    if (s.css) classes.push(s.css);
    el.className = classes.join(' ');

    // Search icon
    const icon = document.createElement('span');
    icon.className = 'ui-search-input-icon';
    icon.textContent = '🔍';
    el.appendChild(icon);

    // Input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = s.placeholder;
    if (s.value) {
      input.value = s.value;
      el.classList.add('has-value');
    }
    el.appendChild(input);

    // Clear button
    const clear = document.createElement('span');
    clear.className = 'ui-search-input-clear';
    clear.textContent = '✕';
    el.appendChild(clear);

    this._input = input;

    input.addEventListener('input', () => {
      if (input.value) {
        el.classList.add('has-value');
      } else {
        el.classList.remove('has-value');
      }
      this.bus.emit('input', { value: input.value, component: this });
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.bus.emit('search', { value: input.value, component: this });
      }
    });

    // Expandable template: focus/blur behavior
    if (template === 'expandable') {
      input.addEventListener('focus', () => {
        el.classList.add('expanded');
      });
      input.addEventListener('blur', () => {
        if (!input.value) {
          el.classList.remove('expanded');
        }
      });
    }

    clear.addEventListener('click', () => {
      input.value = '';
      el.classList.remove('has-value');
      input.focus();
      this.bus.emit('clear', { component: this });
      this.bus.emit('input', { value: '', component: this });
    });

    this._applyThemeClasses(el);
    return el;
  }

  getValue() {
    return this._input.value;
  }

  setValue(value) {
    this._input.value = value;
    if (value) {
      this.el.classList.add('has-value');
    } else {
      this.el.classList.remove('has-value');
    }
  }

  focus() {
    this._input.focus();
  }
}

/**
 * uiRating - Star rating component with multiple templates
 */
class uiRating extends ui {
  static templateConfigs = {
    stars: {
      fields: ['value', 'max', 'readonly', 'color', 'size', 'allowHalf'],
      defaults: { max: 5 }
    },
    hearts: {
      fields: ['value', 'max', 'readonly', 'color', 'size'],
      defaults: { max: 5, color: 'danger' }
    },
    thumbs: {
      fields: ['value', 'readonly', 'showCount', 'color'],
      defaults: { showCount: false }
    },
    numeric: {
      fields: ['value', 'max', 'readonly', 'color', 'size'],
      defaults: { max: 10 }
    }
  };

  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['stars', 'hearts', 'thumbs', 'numeric'],
      default: 'stars',
      description: 'Rating style',
      group: 'structure',
      order: 0
    },
    // ===== CONTENT =====
    value: {
      type: 'number',
      default: 0,
      description: 'Current rating value',
      group: 'content'
    },
    max: {
      type: 'number',
      default: 5,
      min: 1,
      max: 10,
      description: 'Maximum rating value',
      group: 'content',
      templates: ['stars', 'hearts', 'numeric']
    },
    readonly: {
      type: 'checkbox',
      default: false,
      description: 'Read-only mode',
      group: 'content'
    },
    allowHalf: {
      type: 'checkbox',
      default: false,
      description: 'Allow half-star ratings',
      group: 'content',
      templates: ['stars']
    },
    showCount: {
      type: 'checkbox',
      default: false,
      description: 'Show like/dislike counts',
      group: 'content',
      templates: ['thumbs']
    },
    // ===== APPEARANCE =====
    color: {
      type: 'select',
      options: ['primary', 'warning', 'danger', 'success'],
      default: 'warning',
      description: 'Rating color',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Rating size',
      group: 'appearance',
      order: 2,
      templates: ['stars', 'hearts', 'numeric']
    },
    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const s = this._resolved;
    const template = s.template || 'stars';

    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const classes = ['ui-rating', `ui-rating-template-${template}`];
    if (s.readonly) classes.push('readonly');
    if (s.size && s.size !== 'md') classes.push(`ui-rating-${s.size}`);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    el.dataset.color = s.color || 'warning';

    this._value = s.value || 0;
    this._items = [];

    if (template === 'thumbs') {
      // Thumbs up/down
      const thumbUp = document.createElement('button');
      thumbUp.className = 'ui-rating-thumb ui-rating-thumb-up' + (this._value > 0 ? ' active' : '');
      thumbUp.innerHTML = '👍';
      thumbUp.type = 'button';
      if (s.showCount) {
        const countUp = document.createElement('span');
        countUp.className = 'ui-rating-count';
        countUp.textContent = this._value > 0 ? this._value : '';
        thumbUp.appendChild(countUp);
      }

      const thumbDown = document.createElement('button');
      thumbDown.className = 'ui-rating-thumb ui-rating-thumb-down' + (this._value < 0 ? ' active' : '');
      thumbDown.innerHTML = '👎';
      thumbDown.type = 'button';

      if (!s.readonly) {
        thumbUp.addEventListener('click', () => {
          this._value = this._value > 0 ? 0 : 1;
          this._updateThumbs(thumbUp, thumbDown);
          this.bus.emit('change', { value: this._value, component: this });
        });
        thumbDown.addEventListener('click', () => {
          this._value = this._value < 0 ? 0 : -1;
          this._updateThumbs(thumbUp, thumbDown);
          this.bus.emit('change', { value: this._value, component: this });
        });
      }

      el.appendChild(thumbUp);
      el.appendChild(thumbDown);
      this._thumbUp = thumbUp;
      this._thumbDown = thumbDown;
    } else if (template === 'numeric') {
      // Numeric rating (1-10 scale)
      const max = s.max || 10;
      for (let i = 1; i <= max; i++) {
        const num = document.createElement('button');
        num.className = 'ui-rating-num' + (i <= this._value ? ' filled' : '');
        num.textContent = i;
        num.type = 'button';
        num.dataset.value = i;

        if (!s.readonly) {
          num.addEventListener('click', () => {
            this._value = i;
            this._updateItems();
            this.bus.emit('change', { value: this._value, component: this });
          });
          num.addEventListener('mouseenter', () => this._highlightItems(i));
        }

        this._items.push(num);
        el.appendChild(num);
      }
      if (!s.readonly) {
        el.addEventListener('mouseleave', () => this._updateItems());
      }
    } else {
      // Stars or Hearts
      const symbol = template === 'hearts' ? '♥' : '★';
      const max = s.max || 5;

      for (let i = 1; i <= max; i++) {
        const item = document.createElement('span');
        item.className = `ui-rating-item ui-rating-${template === 'hearts' ? 'heart' : 'star'}`;
        item.textContent = symbol;
        item.dataset.value = i;

        if (i <= this._value) {
          item.classList.add('filled');
        } else if (s.allowHalf && i - 0.5 <= this._value) {
          item.classList.add('half-filled');
        }

        if (!s.readonly) {
          item.addEventListener('click', (e) => {
            if (s.allowHalf) {
              const rect = item.getBoundingClientRect();
              const isLeftHalf = e.clientX < rect.left + rect.width / 2;
              this._value = isLeftHalf ? i - 0.5 : i;
            } else {
              this._value = i;
            }
            this._updateItems();
            this.bus.emit('change', { value: this._value, component: this });
          });

          item.addEventListener('mouseenter', () => {
            this._highlightItems(i);
          });
        }

        this._items.push(item);
        el.appendChild(item);
      }

      if (!s.readonly) {
        el.addEventListener('mouseleave', () => {
          this._updateItems();
        });
      }
    }

    this._applyThemeClasses(el);
    return el;
  }

  _highlightItems(upTo) {
    this._items.forEach((item, index) => {
      if (index < upTo) {
        item.classList.add('filled');
        item.classList.remove('half-filled');
      } else {
        item.classList.remove('filled', 'half-filled');
      }
    });
  }

  _updateItems() {
    const allowHalf = this._resolved.allowHalf;
    this._items.forEach((item, index) => {
      const itemValue = index + 1;
      if (itemValue <= this._value) {
        item.classList.add('filled');
        item.classList.remove('half-filled');
      } else if (allowHalf && itemValue - 0.5 <= this._value) {
        item.classList.remove('filled');
        item.classList.add('half-filled');
      } else {
        item.classList.remove('filled', 'half-filled');
      }
    });
  }

  _updateThumbs(up, down) {
    up.classList.toggle('active', this._value > 0);
    down.classList.toggle('active', this._value < 0);
  }

  getValue() {
    return this._value;
  }

  setValue(value) {
    const max = this._resolved.max || 5;
    this._value = Math.max(this._resolved.template === 'thumbs' ? -1 : 0, Math.min(max, value));
    if (this._resolved.template === 'thumbs') {
      this._updateThumbs(this._thumbUp, this._thumbDown);
    } else {
      this._updateItems();
    }
  }
}

// ============================================
// PHASE 7: LAYOUT COMPONENTS
// ============================================

/**
 * uiDivider - Horizontal or vertical divider with optional text
 */
class uiDivider extends ui {
  static templateConfigs = {
    default: {
      fields: ['text', 'vertical'],
      defaults: { vertical: false }
    },
    accent: {
      fields: ['text', 'vertical'],
      defaults: { vertical: false }
    },
    dashed: {
      fields: ['text', 'vertical'],
      defaults: { vertical: false }
    },
    dotted: {
      fields: ['text', 'vertical'],
      defaults: { vertical: false }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'accent', 'dashed', 'dotted'],
      default: 'default',
      description: 'Divider template',
      group: 'structure'
    },
    vertical: {
      type: 'checkbox',
      default: false,
      description: 'Vertical orientation',
      group: 'structure'
    },
    // Content
    text: {
      type: 'text',
      default: '',
      description: 'Text to display in divider',
      group: 'content'
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-divider', `ui-divider-${template}`];
    if (this._resolved.vertical) classes.push('ui-divider-vertical');
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    this._applyThemeClasses(el);

    // First line
    const line1 = document.createElement('div');
    line1.className = 'ui-divider-line';
    el.appendChild(line1);

    // Text (if provided)
    if (this._resolved.text) {
      const textEl = document.createElement('span');
      textEl.className = 'ui-divider-text';
      textEl.textContent = this._resolved.text;
      el.appendChild(textEl);

      // Second line
      const line2 = document.createElement('div');
      line2.className = 'ui-divider-line';
      el.appendChild(line2);
    }

    return el;
  }
}

/**
 * uiControlStage - Control panel + stage layout
 */
class uiControlStage extends ui {
  static templateConfigs = {
    default: {
      fields: ['controlTitle', 'stageTitle', 'controlSize', 'reversed'],
      defaults: { controlSize: 'md', reversed: false }
    },
    unified: {
      fields: ['controlTitle', 'stageTitle', 'controlSize', 'reversed'],
      defaults: { controlSize: 'md', reversed: false }
    },
    stacked: {
      fields: ['controlTitle', 'stageTitle', 'controlSize'],
      defaults: { controlSize: 'md' }
    },
    minimal: {
      fields: ['controlSize', 'reversed'],
      defaults: { controlSize: 'md', reversed: false }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'unified', 'stacked', 'minimal'],
      default: 'default',
      description: 'Layout template',
      group: 'structure'
    },
    controlSize: {
      type: 'select',
      options: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Control panel width',
      group: 'structure'
    },
    reversed: {
      type: 'checkbox',
      default: false,
      description: 'Stage on left, controls on right',
      group: 'structure',
      templates: ['default', 'minimal']
    },
    // Content
    controlTitle: {
      type: 'text',
      default: 'Controls',
      description: 'Control panel title',
      group: 'content',
      templates: ['default', 'stacked']
    },
    stageTitle: {
      type: 'text',
      default: '',
      description: 'Stage area title',
      group: 'content',
      templates: ['default', 'stacked']
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-control-stage', `ui-control-stage-${template}`];
    if (this._resolved.reversed) classes.push('ui-control-stage-reversed');
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    this._applyThemeClasses(el);

    // Control panel
    const control = document.createElement('div');
    const controlSize = this._resolved.controlSize || 'md';
    control.className = `ui-control-stage-control ui-control-stage-control-${controlSize}`;

    if (this._resolved.controlTitle && template !== 'minimal') {
      const controlHeader = document.createElement('div');
      controlHeader.className = 'ui-control-stage-header';
      controlHeader.textContent = this._resolved.controlTitle;
      control.appendChild(controlHeader);
    }

    const controlContent = document.createElement('div');
    controlContent.className = 'ui-control-stage-control-content';
    control.appendChild(controlContent);
    this._controlContent = controlContent;

    // Stage area
    const stage = document.createElement('div');
    stage.className = 'ui-control-stage-stage';

    if (this._resolved.stageTitle && template !== 'minimal') {
      const stageHeader = document.createElement('div');
      stageHeader.className = 'ui-control-stage-header';
      stageHeader.textContent = this._resolved.stageTitle;
      stage.appendChild(stageHeader);
    }

    const stageContent = document.createElement('div');
    stageContent.className = 'ui-control-stage-stage-content';
    stage.appendChild(stageContent);
    this._stageContent = stageContent;

    el.appendChild(control);
    el.appendChild(stage);

    this._control = control;
    this._stage = stage;

    return el;
  }

  getControlPanel() {
    return this._controlContent;
  }

  getStage() {
    return this._stageContent;
  }

  addToControl(component) {
    if (component.el) {
      this._controlContent.appendChild(component.el);
    }
  }

  addToStage(component) {
    if (component.el) {
      this._stageContent.appendChild(component.el);
    }
  }
}

/**
 * uiGrid - Responsive grid layout
 */
class uiGrid extends ui {
  static templateConfigs = {
    default: {
      fields: ['cols', 'gap', 'responsive'],
      defaults: { cols: 3, gap: 'md', responsive: true }
    },
    masonry: {
      fields: ['cols', 'gap', 'responsive'],
      defaults: { cols: 3, gap: 'md', responsive: true }
    },
    auto: {
      fields: ['minWidth', 'gap', 'responsive'],
      defaults: { minWidth: 200, gap: 'md', responsive: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'masonry', 'auto'],
      default: 'default',
      description: 'Grid template',
      group: 'structure'
    },
    cols: {
      type: 'number',
      default: 3,
      description: 'Number of columns (1-6)',
      group: 'structure',
      templates: ['default', 'masonry']
    },
    minWidth: {
      type: 'number',
      default: 200,
      description: 'Minimum item width (px)',
      group: 'structure',
      templates: ['auto']
    },
    // Appearance
    gap: {
      type: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Gap between items',
      group: 'appearance'
    },
    responsive: {
      type: 'checkbox',
      default: true,
      description: 'Responsive column collapse',
      group: 'appearance'
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-grid', `ui-grid-${template}`];

    if (template === 'auto') {
      const minWidth = this._resolved.minWidth || 200;
      el.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}px, 1fr))`;
    } else {
      const cols = Math.max(1, Math.min(6, parseInt(this._resolved.cols) || 3));
      classes.push(`ui-grid-cols-${cols}`);
    }

    const gap = this._resolved.gap || 'md';
    if (gap !== 'none') classes.push(`ui-grid-gap-${gap}`);

    if (this._resolved.responsive) {
      classes.push('ui-grid-responsive');
    }

    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    this._applyThemeClasses(el);

    return el;
  }

  addItem(content) {
    const item = document.createElement('div');
    item.className = 'ui-grid-item';

    if (typeof content === 'string') {
      item.innerHTML = content;
    } else if (content.el) {
      item.appendChild(content.el);
    } else if (content instanceof HTMLElement) {
      item.appendChild(content);
    } else if (content && typeof content.render === 'function') {
      // Component hasn't been rendered yet - render it now
      content.render();
      if (content.el) {
        item.appendChild(content.el);
      }
    }

    this.el.appendChild(item);
    return item;
  }

  clear() {
    this.el.innerHTML = '';
  }
}

// ============================================
// PHASE 8: MEDIA & CONTENT COMPONENTS
// ============================================

class uiCarousel extends ui {
  static templateConfigs = {
    default: {
      fields: ['slides', 'autoplay', 'interval', 'showNav', 'showDots'],
      defaults: { autoplay: false, showNav: true, showDots: true }
    },
    minimal: {
      fields: ['slides', 'autoplay', 'interval'],
      defaults: { autoplay: false, showNav: false, showDots: false }
    },
    thumbnails: {
      fields: ['slides', 'autoplay', 'interval', 'showNav'],
      defaults: { autoplay: false, showNav: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'minimal', 'thumbnails'],
      default: 'default',
      description: 'Carousel template',
      group: 'structure'
    },
    // Content
    slides: {
      type: 'array',
      default: [],
      description: 'Array of slide content (HTML strings or image URLs)',
      group: 'content'
    },
    // Appearance
    showNav: {
      type: 'checkbox',
      default: true,
      description: 'Show navigation arrows',
      group: 'appearance',
      templates: ['default', 'thumbnails']
    },
    showDots: {
      type: 'checkbox',
      default: true,
      description: 'Show dot indicators',
      group: 'appearance',
      templates: ['default']
    },
    autoplay: {
      type: 'checkbox',
      default: false,
      description: 'Auto-advance slides',
      group: 'appearance'
    },
    interval: {
      type: 'number',
      default: 5000,
      description: 'Autoplay interval in ms',
      group: 'appearance'
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-carousel', `ui-carousel-${template}`];
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    this._applyThemeClasses(el);

    this._currentSlide = 0;
    let slides = this._resolved.slides || [];
    if (typeof slides === 'string') {
      try { slides = JSON.parse(slides); } catch (e) { slides = []; }
    }
    this._slides = slides;

    // Track container
    const track = document.createElement('div');
    track.className = 'ui-carousel-track';
    this._track = track;

    // Add slides
    this._slides.forEach((content, index) => {
      const slide = document.createElement('div');
      slide.className = 'ui-carousel-slide';
      if (index === 0) slide.classList.add('ui-carousel-slide-active');

      if (typeof content === 'string' && (content.startsWith('http') || content.startsWith('/'))) {
        slide.innerHTML = `<img src="${content}" alt="Slide ${index + 1}">`;
      } else {
        slide.innerHTML = content;
      }
      track.appendChild(slide);
    });

    el.appendChild(track);

    // Navigation arrows
    if (this._resolved.showNav && this._slides.length > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'ui-carousel-nav ui-carousel-nav-prev';
      prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
      prevBtn.addEventListener('click', () => this.prev());

      const nextBtn = document.createElement('button');
      nextBtn.className = 'ui-carousel-nav ui-carousel-nav-next';
      nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>';
      nextBtn.addEventListener('click', () => this.next());

      el.appendChild(prevBtn);
      el.appendChild(nextBtn);
    }

    // Dot indicators
    if (this._resolved.showDots && this._slides.length > 1) {
      const dots = document.createElement('div');
      dots.className = 'ui-carousel-dots';
      this._dots = dots;

      this._slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'ui-carousel-dot';
        if (index === 0) dot.classList.add('ui-carousel-dot-active');
        dot.addEventListener('click', () => this.goTo(index));
        dots.appendChild(dot);
      });

      el.appendChild(dots);
    }

    // Thumbnails (for thumbnails template)
    if (template === 'thumbnails' && this._slides.length > 1) {
      const thumbs = document.createElement('div');
      thumbs.className = 'ui-carousel-thumbnails';
      this._slides.forEach((content, index) => {
        const thumb = document.createElement('button');
        thumb.className = 'ui-carousel-thumb';
        if (index === 0) thumb.classList.add('ui-carousel-thumb-active');
        if (typeof content === 'string' && (content.startsWith('http') || content.startsWith('/'))) {
          thumb.innerHTML = `<img src="${content}" alt="Thumbnail ${index + 1}">`;
        }
        thumb.addEventListener('click', () => this.goTo(index));
        thumbs.appendChild(thumb);
      });
      el.appendChild(thumbs);
      this._thumbs = thumbs;
    }

    // Autoplay
    if (this._resolved.autoplay) {
      this._startAutoplay();
    }

    return el;
  }

  goTo(index) {
    if (index < 0 || index >= this._slides.length) return;

    this._currentSlide = index;
    this._track.style.transform = `translateX(-${index * 100}%)`;

    // Update active classes
    const slides = this._track.querySelectorAll('.ui-carousel-slide');
    slides.forEach((s, i) => s.classList.toggle('ui-carousel-slide-active', i === index));

    if (this._dots) {
      const dots = this._dots.querySelectorAll('.ui-carousel-dot');
      dots.forEach((d, i) => d.classList.toggle('ui-carousel-dot-active', i === index));
    }

    if (this._thumbs) {
      const thumbs = this._thumbs.querySelectorAll('.ui-carousel-thumb');
      thumbs.forEach((t, i) => t.classList.toggle('ui-carousel-thumb-active', i === index));
    }

    this.bus.emit('change', { index });
  }

  next() {
    const nextIndex = (this._currentSlide + 1) % this._slides.length;
    this.goTo(nextIndex);
  }

  prev() {
    const prevIndex = (this._currentSlide - 1 + this._slides.length) % this._slides.length;
    this.goTo(prevIndex);
  }

  _startAutoplay() {
    const interval = parseInt(this._resolved.interval) || 5000;
    this._autoplayInterval = setInterval(() => this.next(), interval);
  }

  destroy() {
    if (this._autoplayInterval) clearInterval(this._autoplayInterval);
    super.destroy();
  }
}

class uiGallery extends ui {
  static templateConfigs = {
    default: {
      fields: ['images', 'cols', 'gap', 'lightbox'],
      defaults: { cols: 3, gap: 'md', lightbox: true }
    },
    masonry: {
      fields: ['images', 'cols', 'gap', 'lightbox'],
      defaults: { cols: 3, gap: 'md', lightbox: true }
    },
    justified: {
      fields: ['images', 'rowHeight', 'gap', 'lightbox'],
      defaults: { rowHeight: 200, gap: 'md', lightbox: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'masonry', 'justified'],
      default: 'default',
      description: 'Gallery template',
      group: 'structure'
    },
    cols: {
      type: 'number',
      default: 3,
      description: 'Number of columns (1-6)',
      group: 'structure',
      templates: ['default', 'masonry']
    },
    rowHeight: {
      type: 'number',
      default: 200,
      description: 'Row height in pixels',
      group: 'structure',
      templates: ['justified']
    },
    // Content
    images: {
      type: 'array',
      default: [],
      description: 'Array of image objects with src, alt, and optional caption',
      group: 'content'
    },
    // Appearance
    gap: {
      type: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Gap between images',
      group: 'appearance'
    },
    lightbox: {
      type: 'checkbox',
      default: true,
      description: 'Enable lightbox on click',
      group: 'appearance'
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-gallery', `ui-gallery-${template}`];

    const cols = Math.max(1, Math.min(6, parseInt(this._resolved.cols) || 3));
    classes.push(`ui-gallery-cols-${cols}`);

    const gap = this._resolved.gap || 'md';
    if (gap !== 'none') classes.push(`ui-gallery-gap-${gap}`);

    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    this._applyThemeClasses(el);

    let images = this._resolved.images || [];
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch (e) { images = []; }
    }
    this._images = images;

    this._images.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'ui-gallery-item';

      const imgEl = document.createElement('img');
      imgEl.src = typeof img === 'string' ? img : img.src;
      imgEl.alt = typeof img === 'string' ? `Image ${index + 1}` : (img.alt || `Image ${index + 1}`);

      item.appendChild(imgEl);

      if (this._resolved.lightbox) {
        item.addEventListener('click', () => this._openLightbox(index));
      }

      el.appendChild(item);
    });

    return el;
  }

  _openLightbox(index) {
    const lightbox = document.createElement('div');
    lightbox.className = 'ui-lightbox';

    const img = this._images[index];
    const imgSrc = typeof img === 'string' ? img : img.src;
    const imgAlt = typeof img === 'string' ? '' : (img.alt || '');
    const caption = typeof img === 'object' ? img.caption : null;

    lightbox.innerHTML = `
      <button class="ui-lightbox-close">&times;</button>
      <button class="ui-lightbox-nav ui-lightbox-nav-prev"><svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
      <div class="ui-lightbox-content">
        <img src="${imgSrc}" alt="${imgAlt}">
        ${caption ? `<div class="ui-lightbox-caption">${caption}</div>` : ''}
      </div>
      <button class="ui-lightbox-nav ui-lightbox-nav-next"><svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg></button>
    `;

    this._currentLightboxIndex = index;
    this._lightbox = lightbox;

    lightbox.querySelector('.ui-lightbox-close').addEventListener('click', () => this._closeLightbox());
    lightbox.querySelector('.ui-lightbox-nav-prev').addEventListener('click', () => this._lightboxNav(-1));
    lightbox.querySelector('.ui-lightbox-nav-next').addEventListener('click', () => this._lightboxNav(1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) this._closeLightbox();
    });

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';
  }

  _closeLightbox() {
    if (this._lightbox) {
      this._lightbox.remove();
      this._lightbox = null;
      document.body.style.overflow = '';
    }
  }

  _lightboxNav(direction) {
    const newIndex = (this._currentLightboxIndex + direction + this._images.length) % this._images.length;
    this._closeLightbox();
    this._openLightbox(newIndex);
  }
}

class uiCodeBlock extends ui {
  static templateConfigs = {
    default: {
      fields: ['code', 'language', 'filename', 'lineNumbers', 'showCopy'],
      defaults: { lineNumbers: true, showCopy: true }
    },
    minimal: {
      fields: ['code', 'language', 'showCopy'],
      defaults: { lineNumbers: false, showCopy: true }
    },
    terminal: {
      fields: ['code', 'showCopy'],
      defaults: { lineNumbers: false, showCopy: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'minimal', 'terminal'],
      default: 'default',
      description: 'Code block template',
      group: 'structure'
    },
    // Content
    code: {
      type: 'textarea',
      default: '',
      description: 'Code content',
      group: 'content'
    },
    language: {
      type: 'text',
      default: 'javascript',
      description: 'Language for display',
      group: 'content',
      templates: ['default', 'minimal']
    },
    filename: {
      type: 'text',
      default: '',
      description: 'Optional filename to display',
      group: 'content',
      templates: ['default']
    },
    // Appearance
    lineNumbers: {
      type: 'checkbox',
      default: true,
      description: 'Show line numbers',
      group: 'appearance',
      templates: ['default']
    },
    showCopy: {
      type: 'checkbox',
      default: true,
      description: 'Show copy button',
      group: 'appearance'
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    const classes = ['ui-code-block', `ui-code-block-${template}`];
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    this._applyThemeClasses(el);

    const code = this._resolved.code || '';
    const lines = code.split('\n');

    // Header
    const header = document.createElement('div');
    header.className = 'ui-code-block-header';

    if (template === 'terminal') {
      // Terminal dots
      const dots = document.createElement('div');
      dots.className = 'ui-code-block-terminal-dots';
      dots.innerHTML = '<span></span><span></span><span></span>';
      header.appendChild(dots);
    }

    const lang = document.createElement('span');
    lang.className = 'ui-code-block-lang';
    lang.textContent = this._resolved.filename || this._resolved.language || '';
    header.appendChild(lang);

    if (this._resolved.showCopy) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'ui-code-block-copy';
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
      copyBtn.addEventListener('click', () => this._copyCode());
      header.appendChild(copyBtn);
    }

    el.appendChild(header);

    // Body with line numbers and code
    const body = document.createElement('div');
    body.className = 'ui-code-block-body';

    if (this._resolved.lineNumbers && template === 'default') {
      const lineNums = document.createElement('div');
      lineNums.className = 'ui-code-block-line-numbers';
      lines.forEach((_, i) => {
        const num = document.createElement('span');
        num.textContent = i + 1;
        lineNums.appendChild(num);
      });
      body.appendChild(lineNums);
    }

    const pre = document.createElement('pre');
    pre.className = 'ui-code-block-content';
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    body.appendChild(pre);

    el.appendChild(body);

    this._code = code;
    return el;
  }

  _copyCode() {
    navigator.clipboard.writeText(this._code).then(() => {
      this.bus.emit('copy');
      // Visual feedback
      const btn = this.el.querySelector('.ui-code-block-copy');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      setTimeout(() => {
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
      }, 2000);
    });
  }
}

class uiCallout extends ui {
  static templateConfigs = {
    default: {
      fields: ['title', 'content', 'color', 'icon', 'dismissible'],
      defaults: { color: 'info', dismissible: false }
    },
    compact: {
      fields: ['content', 'color', 'dismissible'],
      defaults: { color: 'info', dismissible: false }
    },
    banner: {
      fields: ['title', 'content', 'color', 'dismissible'],
      defaults: { color: 'info', dismissible: true }
    }
  };

  static configSchema = {
    // Structure
    template: {
      type: 'select',
      options: ['default', 'compact', 'banner'],
      default: 'default',
      description: 'Callout template',
      group: 'structure'
    },
    // Content
    title: {
      type: 'text',
      default: '',
      description: 'Optional title',
      group: 'content',
      templates: ['default', 'banner']
    },
    content: {
      type: 'textarea',
      default: '',
      description: 'Callout content',
      group: 'content'
    },
    icon: {
      type: 'text',
      default: '',
      description: 'Custom icon (HTML)',
      group: 'content',
      templates: ['default']
    },
    // Appearance
    color: {
      type: 'select',
      options: ['info', 'warning', 'success', 'danger', 'tip'],
      default: 'info',
      description: 'Callout color scheme',
      group: 'appearance'
    },
    dismissible: {
      type: 'checkbox',
      default: false,
      description: 'Can be dismissed',
      group: 'appearance'
    },
    // Advanced
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _getDefaultIcon(color) {
    const icons = {
      info: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
      warning: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
      success: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
      danger: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
      tip: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>'
    };
    return icons[color] || icons.info;
  }

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    const template = this._resolved.template || 'default';
    // Support both 'color' and 'variant' for backward compatibility
    // Check if variant is a valid callout color (info, warning, success, danger, tip)
    const validColors = ['info', 'warning', 'success', 'danger', 'tip'];
    let color = this._resolved.color;
    // If variant is a valid color and color is just the default, use variant instead
    if (validColors.includes(this._resolved.variant) && color === 'info') {
      color = this._resolved.variant;
    }
    color = color || 'info';
    const colorMap = { info: 'primary', tip: 'secondary' };
    const classes = ['ui-callout', `ui-callout-${template}`];
    if (this._resolved.css) classes.push(this._resolved.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');
    el.dataset.color = colorMap[color] || color;
    this._applyThemeClasses(el);

    // Icon (for default template)
    if (template === 'default') {
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'ui-callout-icon';
      iconWrapper.innerHTML = this._resolved.icon || this._getDefaultIcon(color);
      el.appendChild(iconWrapper);
    }

    // Content area
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'ui-callout-content';

    if (this._resolved.title && template !== 'compact') {
      const title = document.createElement('div');
      title.className = 'ui-callout-title';
      title.textContent = this._resolved.title;
      contentWrapper.appendChild(title);
    }

    const text = document.createElement('div');
    text.className = 'ui-callout-text';
    text.innerHTML = this._resolved.content || '';
    contentWrapper.appendChild(text);

    el.appendChild(contentWrapper);

    // Dismiss button
    if (this._resolved.dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'ui-callout-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        el.style.display = 'none';
        this.bus.emit('dismiss');
      });
      el.appendChild(closeBtn);
    }

    return el;
  }
}

// ============================================
// PHASE 9: INTERACTIVE CONTROLS
// ============================================

class uiSegmentedControl extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: {
      fields: ['options', 'value'],
      defaults: {}
    },
    compact: {
      fields: ['options', 'value'],
      defaults: { size: 'sm' }
    },
    'icon-only': {
      fields: ['options', 'value'],
      defaults: {}
    }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'compact', 'icon-only'],
      default: 'default',
      description: 'Control layout',
      group: 'structure',
      order: 0
    },

    // ===== CONTENT =====
    options: {
      type: 'array',
      default: [],
      description: 'Array of option objects with label and optional value, icon',
      group: 'content'
    },
    value: {
      type: 'text',
      default: '',
      description: 'Currently selected value',
      group: 'content'
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['default', 'minimal', 'soft', 'dark'],
      default: 'default',
      description: 'Visual style',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Size of the control',
      group: 'appearance',
      order: 2
    },
    block: {
      type: 'checkbox',
      default: false,
      description: 'Full width mode',
      group: 'appearance'
    },

    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    // Use resolved settings
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'default';
    const size = template === 'compact' ? 'sm' : (s.size || 'md');

    const classes = ['ui-segmented-control'];

    // Size
    if (size !== 'md') {
      classes.push(`ui-segmented-control-${size}`);
    }

    // Variant
    if (variant !== 'default') {
      classes.push(`ui-segmented-control-${variant}`);
    }

    // Template
    if (template === 'icon-only') {
      classes.push('ui-segmented-control-icon-only');
    }

    // Block
    if (s.block) {
      classes.push('ui-segmented-control-block');
    }

    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');

    // Apply theme classes
    this._applyThemeClasses(el);

    this._options = s.options || [];
    this._value = s.value || (this._options[0]?.value || this._options[0]?.label || '');

    this._options.forEach((opt, index) => {
      const optValue = opt.value || opt.label || opt;
      const optLabel = opt.label || opt;
      const optIcon = opt.icon || '';

      const button = document.createElement('button');
      button.className = 'ui-segmented-control-option';
      button.setAttribute('data-value', optValue);

      if (optValue === this._value) {
        button.classList.add('ui-segmented-control-option-active');
      }

      if (optIcon) {
        button.innerHTML = optIcon + ' ';
      }

      // For icon-only template, only show icon (hide label)
      if (template !== 'icon-only') {
        const labelSpan = document.createElement('span');
        labelSpan.textContent = optLabel;
        button.appendChild(labelSpan);
      }

      button.addEventListener('click', () => this._selectOption(optValue, button));

      el.appendChild(button);
    });

    return el;
  }

  _selectOption(value, button) {
    if (value === this._value) return;

    this._value = value;

    // Update active state
    this.el.querySelectorAll('.ui-segmented-control-option').forEach(opt => {
      opt.classList.remove('ui-segmented-control-option-active');
    });
    button.classList.add('ui-segmented-control-option-active');

    this.bus.emit('change', { value });
  }

  getValue() {
    return this._value;
  }

  setValue(value) {
    const button = this.el.querySelector(`[data-value="${value}"]`);
    if (button) {
      this._selectOption(value, button);
    }
  }
}

class uiSplitButton extends ui {
  // ----------------------------------------
  // Template Configurations
  // ----------------------------------------
  static templateConfigs = {
    default: {
      fields: ['label', 'icon', 'items'],
      defaults: {}
    },
    icon: {
      fields: ['icon', 'items'],
      defaults: {}
    }
  };

  // ----------------------------------------
  // Config Schema with Groups
  // ----------------------------------------
  static configSchema = {
    // ===== STRUCTURE =====
    template: {
      type: 'select',
      options: ['default', 'icon'],
      default: 'default',
      description: 'Button layout',
      group: 'structure',
      order: 0
    },

    // ===== CONTENT =====
    label: {
      type: 'text',
      default: 'Action',
      description: 'Main button label',
      group: 'content',
      templates: ['default']
    },
    icon: {
      type: 'text',
      default: '',
      description: 'Optional icon for main button',
      group: 'content'
    },
    items: {
      type: 'array',
      default: [],
      description: 'Dropdown menu items with label, icon, and optional divider',
      group: 'content'
    },

    // ===== APPEARANCE =====
    variant: {
      type: 'select',
      options: ['primary', 'secondary', 'success', 'danger', 'outline'],
      default: 'primary',
      description: 'Button color',
      group: 'appearance',
      order: 1
    },
    size: {
      type: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Button size',
      group: 'appearance',
      order: 2
    },

    // ===== ADVANCED =====
    css: {
      type: 'text',
      default: '',
      description: 'Additional CSS classes',
      group: 'advanced'
    }
  };

  _createEl() {
    const el = document.createElement('div');
    el.id = this.id;
    el.setAttribute('data-component-type', this.type);

    // Use resolved settings
    const s = this._resolved;
    const template = s.template || 'default';
    const variant = s.variant || 'primary';

    const colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning'];
    const classes = ['ui-split-button'];
    if (colorVariants.includes(variant)) {
      el.dataset.color = variant;
    } else {
      classes.push(`ui-split-button-${variant}`);
    }

    if (s.size !== 'md') {
      classes.push(`ui-split-button-${s.size}`);
    }

    // Template (icon-only)
    if (template === 'icon') {
      classes.push('ui-split-button-icon');
    }

    if (s.css) classes.push(s.css);
    if (ui.editMode) classes.push('ui-component');
    el.className = classes.join(' ');

    // Apply theme classes
    this._applyThemeClasses(el);

    // Main button
    const mainBtn = document.createElement('button');
    mainBtn.className = 'ui-split-button-main';

    if (s.icon) {
      mainBtn.innerHTML = s.icon + ' ';
    }

    // For icon template, only show icon
    if (template !== 'icon') {
      mainBtn.appendChild(document.createTextNode(s.label || 'Action'));
    }

    mainBtn.addEventListener('click', () => {
      this.bus.emit('click');
    });

    el.appendChild(mainBtn);

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'ui-split-button-toggle';
    toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleDropdown();
    });

    this._toggleBtn = toggleBtn;
    el.appendChild(toggleBtn);

    // Dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'ui-split-button-dropdown';
    this._dropdown = dropdown;

    const items = s.items || [];
    items.forEach(item => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'ui-split-button-dropdown-divider';
        dropdown.appendChild(divider);
      } else {
        const menuItem = document.createElement('button');
        menuItem.className = 'ui-split-button-dropdown-item';

        if (item.icon) {
          menuItem.innerHTML = item.icon + ' ';
        }
        menuItem.appendChild(document.createTextNode(item.label || item));

        menuItem.addEventListener('click', () => {
          this._closeDropdown();
          this.bus.emit('select', { item: item.value || item.label || item });
        });

        dropdown.appendChild(menuItem);
      }
    });

    el.appendChild(dropdown);

    // Close on outside click
    this._outsideClickHandler = (e) => {
      if (!el.contains(e.target)) {
        this._closeDropdown();
      }
    };

    return el;
  }

  _toggleDropdown() {
    const isOpen = this._dropdown.classList.contains('ui-split-button-dropdown-open');
    if (isOpen) {
      this._closeDropdown();
    } else {
      this._openDropdown();
    }
  }

  _openDropdown() {
    this._dropdown.classList.add('ui-split-button-dropdown-open');
    this._toggleBtn.classList.add('ui-split-button-open');
    document.addEventListener('click', this._outsideClickHandler);
    this.bus.emit('open');
  }

  _closeDropdown() {
    this._dropdown.classList.remove('ui-split-button-dropdown-open');
    this._toggleBtn.classList.remove('ui-split-button-open');
    document.removeEventListener('click', this._outsideClickHandler);
    this.bus.emit('close');
  }

  destroy() {
    document.removeEventListener('click', this._outsideClickHandler);
    super.destroy();
  }
}

// ============================================
// REGISTER ALL COMPONENTS
// ============================================

ui.register('ui', ui);
ui.register('uiButton', uiButton);
ui.register('uiButtonGroup', uiButtonGroup);
ui.register('uiCard', uiCard);
ui.register('uiInput', uiInput);
ui.register('uiTextarea', uiTextarea);
ui.register('uiCheckbox', uiCheckbox);
ui.register('uiRadio', uiRadio);
ui.register('uiSwitch', uiSwitch);
ui.register('uiSlider', uiSlider);
ui.register('uiBadge', uiBadge);
ui.register('uiAlert', uiAlert);
ui.register('uiTabs', uiTabs);
ui.register('uiAccordion', uiAccordion);
ui.register('uiModal', uiModal);
ui.register('uiDropdown', uiDropdown);
ui.register('uiToast', uiToast);
ui.register('uiSpinner', uiSpinner);
ui.register('uiProgress', uiProgress);
ui.register('uiTable', uiTable);
ui.register('uiForm', uiForm);
ui.register('uiBreadcrumbs', uiBreadcrumbs);
ui.register('uiNavbar', uiNavbar);
ui.register('uiSidebar', uiSidebar);
ui.register('uiPagination', uiPagination);
ui.register('uiPager', uiPager);
ui.register('uiEditor', uiEditor);
ui.register('uiEditorModal', uiEditorModal);
ui.register('uiSkeleton', uiSkeleton);
ui.register('uiEmptyState', uiEmptyState);
ui.register('uiTimeline', uiTimeline);
ui.register('uiStepper', uiStepper);
ui.register('uiTooltip', uiTooltip);
ui.register('uiPopover', uiPopover);
ui.register('uiDrawer', uiDrawer);
ui.register('uiAvatar', uiAvatar);
ui.register('uiAvatarGroup', uiAvatarGroup);
ui.register('uiTreeView', uiTreeView);
ui.register('uiListSelector', uiListSelector);
ui.register('uiFileInput', uiFileInput);
ui.register('uiColorPicker', uiColorPicker);
ui.register('uiDatePicker', uiDatePicker);
ui.register('uiNumberStepper', uiNumberStepper);
ui.register('uiTagsInput', uiTagsInput);
ui.register('uiSearchInput', uiSearchInput);
ui.register('uiRating', uiRating);
ui.register('uiDivider', uiDivider);
ui.register('uiControlStage', uiControlStage);
ui.register('uiGrid', uiGrid);
ui.register('uiCarousel', uiCarousel);
ui.register('uiGallery', uiGallery);
ui.register('uiCodeBlock', uiCodeBlock);
ui.register('uiCallout', uiCallout);
ui.register('uiSegmentedControl', uiSegmentedControl);
ui.register('uiSplitButton', uiSplitButton);
ui.register('uiKanban', uiKanban);
ui.register('uiCalendar', uiCalendar);
ui.register('uiChat', uiChat);
ui.register('uiGraphView', uiGraphView);
ui.register('uiGantt', uiGantt);

// ============================================
// EXPORTS
// ============================================

// For module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ui, EventBus,
    uiButton, uiButtonGroup, uiCard, uiInput, uiTextarea,
    uiCheckbox, uiRadio, uiSwitch, uiSlider,
    uiBadge, uiAlert, uiTabs, uiAccordion, uiModal, uiDropdown,
    uiToast, uiSpinner, uiProgress, uiTable, uiForm,
    uiBreadcrumbs, uiNavbar, uiSidebar, uiPagination,
    uiPager, uiEditor, uiEditorModal,
    uiSkeleton, uiEmptyState, uiTimeline, uiStepper,
    uiTooltip, uiPopover, uiDrawer,
    uiAvatar, uiAvatarGroup, uiTreeView, uiListSelector,
    uiFileInput, uiColorPicker, uiDatePicker, uiNumberStepper,
    uiTagsInput, uiSearchInput, uiRating,
    uiDivider, uiControlStage, uiGrid,
    uiCarousel, uiGallery, uiCodeBlock, uiCallout,
    uiSegmentedControl, uiSplitButton,
    uiKanban, uiCalendar, uiChat, uiGraphView, uiGantt
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// uiControlChart — Shewhart control chart (SVG)
// ─────────────────────────────────────────────────────────────────────────────
class uiControlChart extends ui {
  static templateConfigs = {
    default: {
      fields: ['points', 'limits', 'title'],
      defaults: {}
    }
  };

  static configSchema = {
    template: { type: 'select', options: ['default'], default: 'default', group: 'structure', order: 0, description: 'Chart template' },
    points: { type: 'json', default: '[]', group: 'content', order: 0, description: 'Data points [{value, timestamp?, outcome?}]' },
    limits: { type: 'json', default: 'null', group: 'content', order: 1, description: 'Control limits {mean, stdDev, warningUpper, warningLower, actionUpper, actionLower}' },
    title: { type: 'text', default: '', group: 'content', order: 2, description: 'Chart title' },
    height: { type: 'number', default: 280, group: 'layout', order: 0, description: 'Chart height in px' },
    showLegend: { type: 'boolean', default: true, group: 'layout', order: 1, description: 'Show legend' },
    css: { type: 'text', default: '', group: 'advanced', order: 0, description: 'Additional CSS classes' }
  };

  _createEl() {
    const s = this._resolved;
    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = 'ui-control-chart';
    if (s.css) container.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) container.classList.add('ui-component');

    let points = typeof s.points === 'string' ? JSON.parse(s.points || '[]') : (s.points || []);
    let limits = typeof s.limits === 'string' ? JSON.parse(s.limits || 'null') : (s.limits || null);
    const height = s.height || 280;

    if (s.title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'ui-cc-title';
      titleEl.textContent = s.title;
      container.appendChild(titleEl);
    }

    if (!points.length) {
      const empty = document.createElement('div');
      empty.className = 'ui-cc-empty';
      empty.textContent = 'No data points';
      container.appendChild(empty);
      this._applyThemeClasses(container);
      return container;
    }

    // Calculate dimensions
    const margin = { top: 20, right: 20, bottom: 30, left: 55 };
    const width = 600;
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    // Value range
    const values = points.map(p => p.value);
    let yMin = Math.min(...values);
    let yMax = Math.max(...values);
    if (limits) {
      yMin = Math.min(yMin, limits.actionLower || yMin);
      yMax = Math.max(yMax, limits.actionUpper || yMax);
    }
    const yPad = (yMax - yMin) * 0.1 || 1;
    yMin -= yPad;
    yMax += yPad;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'ui-cc-svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const scaleX = (i) => margin.left + (i / (points.length - 1 || 1)) * chartW;
    const scaleY = (v) => margin.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

    // Draw limit bands and lines
    if (limits) {
      // Action band (light red)
      if (limits.actionUpper != null && limits.actionLower != null) {
        this._svgRect(svg, margin.left, scaleY(limits.actionUpper), chartW,
          scaleY(limits.actionLower) - scaleY(limits.actionUpper), 'ui-cc-band-action');
      }
      // Warning band (light yellow)
      if (limits.warningUpper != null && limits.warningLower != null) {
        this._svgRect(svg, margin.left, scaleY(limits.warningUpper), chartW,
          scaleY(limits.warningLower) - scaleY(limits.warningUpper), 'ui-cc-band-warning');
      }
      // Mean line
      if (limits.mean != null) {
        this._svgLine(svg, margin.left, scaleY(limits.mean), margin.left + chartW, scaleY(limits.mean), 'ui-cc-line-mean');
        this._svgText(svg, margin.left - 4, scaleY(limits.mean), limits.mean.toFixed(2), 'ui-cc-label-y end');
      }
      // Warning lines
      if (limits.warningUpper != null) {
        this._svgLine(svg, margin.left, scaleY(limits.warningUpper), margin.left + chartW, scaleY(limits.warningUpper), 'ui-cc-line-warning');
        this._svgText(svg, margin.left - 4, scaleY(limits.warningUpper), '+2s', 'ui-cc-label-y end');
      }
      if (limits.warningLower != null) {
        this._svgLine(svg, margin.left, scaleY(limits.warningLower), margin.left + chartW, scaleY(limits.warningLower), 'ui-cc-line-warning');
        this._svgText(svg, margin.left - 4, scaleY(limits.warningLower), '-2s', 'ui-cc-label-y end');
      }
      // Action lines
      if (limits.actionUpper != null) {
        this._svgLine(svg, margin.left, scaleY(limits.actionUpper), margin.left + chartW, scaleY(limits.actionUpper), 'ui-cc-line-action');
        this._svgText(svg, margin.left - 4, scaleY(limits.actionUpper), '+3s', 'ui-cc-label-y end');
      }
      if (limits.actionLower != null) {
        this._svgLine(svg, margin.left, scaleY(limits.actionLower), margin.left + chartW, scaleY(limits.actionLower), 'ui-cc-line-action');
        this._svgText(svg, margin.left - 4, scaleY(limits.actionLower), '-3s', 'ui-cc-label-y end');
      }
    }

    // Data line
    if (points.length > 1) {
      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.value)}`).join(' ');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('class', 'ui-cc-data-line');
      svg.appendChild(path);
    }

    // Data points
    const self = this;
    points.forEach((p, i) => {
      const cx = scaleX(i);
      const cy = scaleY(p.value);
      const outcome = p.outcome || 'pass';
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', 4);
      circle.setAttribute('class', `ui-cc-point ui-cc-point-${outcome}`);
      circle.addEventListener('click', () => self.bus.emit('selectPoint', { point: p, index: i }));
      svg.appendChild(circle);
    });

    // X-axis labels (first, middle, last)
    const labelIndices = [0, Math.floor(points.length / 2), points.length - 1];
    labelIndices.forEach(i => {
      if (i >= points.length) return;
      const p = points[i];
      const label = p.timestamp ? new Date(p.timestamp).toLocaleDateString() : `#${i + 1}`;
      this._svgText(svg, scaleX(i), height - 5, label, 'ui-cc-label-x');
    });

    container.appendChild(svg);

    // Legend
    if (s.showLegend && limits) {
      const legend = document.createElement('div');
      legend.className = 'ui-cc-legend';
      legend.innerHTML = [
        '<span class="ui-cc-legend-item"><span class="ui-cc-dot ui-cc-dot-pass"></span>Pass</span>',
        '<span class="ui-cc-legend-item"><span class="ui-cc-dot ui-cc-dot-warning"></span>Warning</span>',
        '<span class="ui-cc-legend-item"><span class="ui-cc-dot ui-cc-dot-fail"></span>Fail</span>',
        `<span class="ui-cc-legend-item">Mean: ${limits.mean?.toFixed(2) || '-'}</span>`,
        `<span class="ui-cc-legend-item">SD: ${limits.stdDev?.toFixed(4) || '-'}</span>`
      ].join('');
      container.appendChild(legend);
    }

    this._applyThemeClasses(container);
    return container;
  }

  _svgRect(svg, x, y, w, h, cls) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', Math.max(0, h));
    rect.setAttribute('class', cls);
    svg.appendChild(rect);
  }

  _svgLine(svg, x1, y1, x2, y2, cls) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('class', cls);
    svg.appendChild(line);
  }

  _svgText(svg, x, y, text, cls) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('x', x); el.setAttribute('y', y);
    el.setAttribute('class', cls);
    el.textContent = text;
    svg.appendChild(el);
  }

  /** Update chart data */
  setData(points, limits) {
    this._resolved.points = points;
    this._resolved.limits = limits;
    this.refresh();
  }
}

// ============================================
// QR CODE COMPONENT (#57)
// ============================================

/**
 * uiQRCode - QR code display component
 * Wraps QRCodeStyling CDN library with graceful fallback.
 * Options: data, size (default 120), color (default '#1565C0')
 */
class uiQRCode extends ui {
  static templateConfigs = {
    default: {
      fields: ['data', 'size', 'color'],
      defaults: {}
    }
  };

  static configSchema = {
    template: { type: 'select', options: ['default'], default: 'default', group: 'structure', order: 0, description: 'QR template' },
    data: { type: 'text', default: '', group: 'content', order: 0, description: 'Data to encode in QR code' },
    size: { type: 'number', default: 120, group: 'layout', order: 0, description: 'QR code size in px' },
    color: { type: 'text', default: '#1565C0', group: 'appearance', order: 0, description: 'QR code dot color' },
    css: { type: 'text', default: '', group: 'advanced', order: 0, description: 'Additional CSS classes' }
  };

  _createEl() {
    const s = this._resolved;
    const container = document.createElement('div');
    container.id = this.id;
    container.setAttribute('data-component-type', this.type);
    container.className = 'ui-qrcode';
    if (s.css) container.classList.add(...s.css.split(' ').filter(c => c));
    if (ui.editMode) container.classList.add('ui-component');

    const data = s.data || '';
    const size = s.size || 120;
    const color = s.color || '#1565C0';

    if (!data) {
      container.textContent = 'No QR data';
      container.classList.add('ui-qrcode-empty');
      this._applyThemeClasses(container);
      return container;
    }

    const qrTarget = document.createElement('div');
    qrTarget.className = 'ui-qrcode-canvas';
    container.appendChild(qrTarget);

    // Use QRCodeStyling if available, otherwise show fallback
    if (typeof QRCodeStyling !== 'undefined') {
      try {
        const qrCode = new QRCodeStyling({
          width: size,
          height: size,
          data: data,
          dotsOptions: { color: color, type: 'rounded' },
          backgroundOptions: { color: '#ffffff' },
          cornersSquareOptions: { color: color, type: 'extra-rounded' }
        });
        qrCode.append(qrTarget);
      } catch (e) {
        console.warn('[uiQRCode] QRCodeStyling error:', e);
        this._renderFallback(qrTarget, data, size);
      }
    } else {
      this._renderFallback(qrTarget, data, size);
    }

    this._applyThemeClasses(container);
    return container;
  }

  _renderFallback(target, data, size) {
    target.style.cssText = `width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--ui-gray-300); border-radius: 8px; font-size: 0.6rem; color: var(--ui-gray-500); text-align: center; word-break: break-all; padding: 0.5rem;`;
    target.textContent = data;
  }

  /** Update QR data */
  setData(data) {
    this._resolved.data = data;
    this.refresh();
  }
}

// For browser global
if (typeof window !== 'undefined') {
  window.ui = ui;
  window.EventBus = EventBus;
  window.uiButton = uiButton;
  window.uiButtonGroup = uiButtonGroup;
  window.uiCard = uiCard;
  window.uiInput = uiInput;
  window.uiTextarea = uiTextarea;
  window.uiCheckbox = uiCheckbox;
  window.uiRadio = uiRadio;
  window.uiSwitch = uiSwitch;
  window.uiSlider = uiSlider;
  window.uiBadge = uiBadge;
  window.uiAlert = uiAlert;
  window.uiTabs = uiTabs;
  window.uiAccordion = uiAccordion;
  window.uiModal = uiModal;
  window.uiDropdown = uiDropdown;
  window.uiToast = uiToast;
  window.uiSpinner = uiSpinner;
  window.uiProgress = uiProgress;
  window.uiTable = uiTable;
  window.uiForm = uiForm;
  window.uiFormMapping = uiFormMapping;
  window.uiBreadcrumbs = uiBreadcrumbs;
  window.uiNavbar = uiNavbar;
  window.uiSidebar = uiSidebar;
  window.uiPagination = uiPagination;
  window.uiPager = uiPager;
  window.uiEditor = uiEditor;
  window.uiEditorModal = uiEditorModal;
  window.uiSkeleton = uiSkeleton;
  window.uiEmptyState = uiEmptyState;
  window.uiTimeline = uiTimeline;
  window.uiStepper = uiStepper;
  window.uiTooltip = uiTooltip;
  window.uiPopover = uiPopover;
  window.uiDrawer = uiDrawer;
  window.uiAvatar = uiAvatar;
  window.uiAvatarGroup = uiAvatarGroup;
  window.uiTreeView = uiTreeView;
  window.uiListSelector = uiListSelector;
  window.uiFileInput = uiFileInput;
  window.uiColorPicker = uiColorPicker;
  window.uiDatePicker = uiDatePicker;
  window.uiNumberStepper = uiNumberStepper;
  window.uiTagsInput = uiTagsInput;
  window.uiSearchInput = uiSearchInput;
  window.uiRating = uiRating;
  window.uiDivider = uiDivider;
  window.uiControlStage = uiControlStage;
  window.uiGrid = uiGrid;
  window.uiCarousel = uiCarousel;
  window.uiGallery = uiGallery;
  window.uiCodeBlock = uiCodeBlock;
  window.uiCallout = uiCallout;
  window.uiSegmentedControl = uiSegmentedControl;
  window.uiSplitButton = uiSplitButton;
  window.uiKanban = uiKanban;
  window.uiCalendar = uiCalendar;
  window.uiChat = uiChat;
  window.uiGraphView = uiGraphView;
  window.uiGantt = uiGantt;
  window.uiControlChart = uiControlChart;
  window.uiQRCode = uiQRCode;
}
