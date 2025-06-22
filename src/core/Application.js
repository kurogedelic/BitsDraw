/**
 * Refactored BitsDraw Application
 * Clean, modular architecture using composition and dependency injection
 */
class Application {
    constructor(config = {}) {
        this.config = {
            canvas: {
                selector: '#bitmap-canvas',
                defaultWidth: 128,
                defaultHeight: 64,
                defaultZoom: 4
            },
            preview: {
                selector: '#preview-canvas'
            },
            ...config
        };

        // Core systems
        this.eventBus = new EventBus();
        this.stateManager = new StateManager(this.eventBus);
        this.commandSystem = new CommandSystem(this.eventBus, this.stateManager);
        
        // Editor and tools
        this.editor = null;
        this.toolSystem = new ToolSystem(this.eventBus, this.stateManager, this.commandSystem);
        
        // UI systems
        this.canvasManager = null;
        this.uiManager = null;
        this.dialogManager = null;
        this.themeManager = null;
        
        // State
        this.isInitialized = false;
        this.cleanupFunctions = [];

        // Initialize
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('Initializing BitsDraw Application...');

            // Initialize core systems
            await this.initializeCore();
            
            // Initialize UI systems
            await this.initializeUI();
            
            // Initialize tools and canvas
            await this.initializeCanvas();
            
            // Setup event bindings
            this.setupEventBindings();
            
            // Initialize default state
            this.initializeDefaultState();
            
            this.isInitialized = true;
            this.eventBus.emit('app:initialized');
            
            console.log('BitsDraw Application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize BitsDraw Application:', error);
            this.eventBus.emit('app:error', { error });
        }
    }

    /**
     * Initialize core systems
     */
    async initializeCore() {
        // Initialize bitmap editor
        const canvas = document.querySelector(this.config.canvas.selector);
        if (!canvas) {
            throw new Error(`Canvas not found: ${this.config.canvas.selector}`);
        }

        this.editor = new OptimizedBitmapEditor(
            canvas,
            this.config.canvas.defaultWidth,
            this.config.canvas.defaultHeight
        );

        // Set tool system context
        this.toolSystem.setContext({
            canvas,
            editor: this.editor
        });

        console.log('Core systems initialized');
    }

    /**
     * Initialize UI systems
     */
    async initializeUI() {
        // Initialize UI managers (these would be created separately)
        this.canvasManager = new CanvasManager(this.eventBus, this.stateManager, this.editor);
        this.uiManager = new UIManager(this.eventBus, this.stateManager);
        this.dialogManager = new DialogManager(this.eventBus, this.stateManager);
        this.themeManager = new ThemeManager(this.eventBus, this.stateManager);

        console.log('UI systems initialized');
    }

    /**
     * Initialize canvas and drawing systems
     */
    async initializeCanvas() {
        // Setup preview canvas
        const previewCanvas = document.querySelector(this.config.preview.selector);
        if (previewCanvas) {
            this.previewManager = new PreviewManager(this.eventBus, this.stateManager, previewCanvas);
        }

        // Initialize layers
        this.layerManager = new LayerManager(this.eventBus, this.stateManager, this.editor);

        console.log('Canvas systems initialized');
    }

    /**
     * Setup event bindings between systems
     */
    setupEventBindings() {
        // Canvas event forwarding
        this.setupCanvasEventForwarding();
        
        // Keyboard event forwarding
        this.setupKeyboardEventForwarding();
        
        // State synchronization
        this.setupStateSynchronization();
        
        // Auto-save setup
        this.setupAutoSave();

        console.log('Event bindings established');
    }

    /**
     * Setup canvas event forwarding to tool system
     */
    setupCanvasEventForwarding() {
        const canvas = document.querySelector(this.config.canvas.selector);
        
        // Mouse events
        const mouseDown = (e) => {
            const coords = this.getCanvasCoordinates(e);
            this.eventBus.emit('canvas:mousedown', { coords, event: e });
        };

        const mouseMove = (e) => {
            const coords = this.getCanvasCoordinates(e);
            this.eventBus.emit('canvas:mousemove', { coords, event: e });
        };

        const mouseUp = (e) => {
            const coords = this.getCanvasCoordinates(e);
            this.eventBus.emit('canvas:mouseup', { coords, event: e });
        };

        const mouseLeave = () => {
            this.eventBus.emit('canvas:mouseleave');
        };

        const mouseEnter = () => {
            this.eventBus.emit('canvas:mouseenter');
        };

        // Add event listeners
        canvas.addEventListener('mousedown', mouseDown);
        canvas.addEventListener('mousemove', mouseMove);
        canvas.addEventListener('mouseup', mouseUp);
        canvas.addEventListener('mouseleave', mouseLeave);
        canvas.addEventListener('mouseenter', mouseEnter);

        // Store cleanup functions
        this.cleanupFunctions.push(() => {
            canvas.removeEventListener('mousedown', mouseDown);
            canvas.removeEventListener('mousemove', mouseMove);
            canvas.removeEventListener('mouseup', mouseUp);
            canvas.removeEventListener('mouseleave', mouseLeave);
            canvas.removeEventListener('mouseenter', mouseEnter);
        });

        // Global mouse events for continuous drawing
        const globalMouseMove = (e) => {
            const canvas = document.querySelector(this.config.canvas.selector);
            const rect = canvas.getBoundingClientRect();
            
            // Check if mouse is back inside canvas
            if (e.clientX >= rect.left && e.clientX <= rect.right && 
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const coords = this.getCanvasCoordinates(e);
                this.eventBus.emit('canvas:mousemove', { coords, event: e });
            }
        };

        const globalMouseUp = () => {
            this.eventBus.emit('canvas:mouseup', { coords: null, event: null });
        };

        document.addEventListener('mousemove', globalMouseMove);
        document.addEventListener('mouseup', globalMouseUp);

        this.cleanupFunctions.push(() => {
            document.removeEventListener('mousemove', globalMouseMove);
            document.removeEventListener('mouseup', globalMouseUp);
        });
    }

    /**
     * Setup keyboard event forwarding
     */
    setupKeyboardEventForwarding() {
        const keyDown = (e) => {
            // Skip if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            this.eventBus.emit('keyboard:keydown', { key: e.key, event: e });
            
            // Handle shortcuts
            if (this.isShortcut(e)) {
                this.eventBus.emit('keyboard:shortcut', { key: e.key, event: e });
            }
        };

        document.addEventListener('keydown', keyDown);
        
        this.cleanupFunctions.push(() => {
            document.removeEventListener('keydown', keyDown);
        });
    }

    /**
     * Setup state synchronization between systems
     */
    setupStateSynchronization() {
        // Tool changes
        this.eventBus.on('tool:changed', ({ current }) => {
            this.stateManager.setState('tools.current', current);
        });

        // Canvas changes
        this.eventBus.on('canvas:resized', ({ width, height }) => {
            this.stateManager.batchUpdate([
                { path: 'canvas.width', value: width },
                { path: 'canvas.height', value: height }
            ]);
        });

        // Layer changes
        this.eventBus.on('layer:changed', (layerData) => {
            this.stateManager.setState('layers', layerData);
        });
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        let autoSaveTimeout;
        
        this.eventBus.on('command:executed', () => {
            // Mark project as modified
            this.stateManager.setState('project.modified', true);
            
            // Clear previous timeout
            if (autoSaveTimeout) {
                clearTimeout(autoSaveTimeout);
            }
            
            // Auto-save after 30 seconds of inactivity
            autoSaveTimeout = setTimeout(() => {
                this.eventBus.emit('project:autosave');
            }, 30000);
        });

        this.cleanupFunctions.push(() => {
            if (autoSaveTimeout) {
                clearTimeout(autoSaveTimeout);
            }
        });
    }

    /**
     * Initialize default application state
     */
    initializeDefaultState() {
        // Set initial tool
        this.stateManager.setState('tools.current', 'pencil');
        
        // Set initial canvas state
        this.stateManager.batchUpdate([
            { path: 'canvas.width', value: this.editor.width },
            { path: 'canvas.height', value: this.editor.height },
            { path: 'canvas.zoom', value: this.editor.zoom }
        ]);

        console.log('Default state initialized');
    }

    /**
     * Get canvas coordinates from mouse event
     */
    getCanvasCoordinates(event) {
        return this.editor.getCanvasCoordinates(event.clientX, event.clientY);
    }

    /**
     * Check if keyboard event is a shortcut
     */
    isShortcut(event) {
        return event.ctrlKey || event.metaKey || 
               (!event.ctrlKey && !event.metaKey && event.key.length === 1);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        this.eventBus.emit('notification:show', { message, type });
    }

    /**
     * Get application state
     */
    getState() {
        return this.stateManager.getState();
    }

    /**
     * Execute a command
     */
    async executeCommand(command, context = {}) {
        return this.commandSystem.execute(command, {
            editor: this.editor,
            ...context
        });
    }

    /**
     * Undo last action
     */
    async undo() {
        return this.commandSystem.undo();
    }

    /**
     * Redo last undone action
     */
    async redo() {
        return this.commandSystem.redo();
    }

    /**
     * Get tool system
     */
    getToolSystem() {
        return this.toolSystem;
    }

    /**
     * Get editor instance
     */
    getEditor() {
        return this.editor;
    }

    /**
     * Cleanup application resources
     */
    destroy() {
        console.log('Destroying BitsDraw Application...');

        // Run cleanup functions
        this.cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        });

        // Clear event bus
        this.eventBus.clear();

        // Clear command history
        this.commandSystem.clearHistory();

        // Reset state
        this.stateManager.reset();

        this.isInitialized = false;
        console.log('BitsDraw Application destroyed');
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            state: this.stateManager.getDebugInfo(),
            events: this.eventBus.getDebugInfo(),
            commands: this.commandSystem.getHistoryInfo(),
            tools: this.toolSystem.getAvailableTools(),
            cleanup: this.cleanupFunctions.length
        };
    }
}

/**
 * Canvas Manager - Handles canvas-specific operations and viewport management
 */
class CanvasManager {
    constructor(eventBus, stateManager, editor) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.editor = editor;
        
        this.viewport = {
            offsetX: 0,
            offsetY: 0,
            zoom: 1
        };
        
        this.setupEventListeners();
        this.initializeViewport();
    }

    setupEventListeners() {
        // Canvas resize events
        this.eventBus.on('canvas:resize', this.handleCanvasResize, this);
        
        // Zoom events
        this.eventBus.on('canvas:zoom', this.handleZoom, this);
        this.eventBus.on('canvas:pan', this.handlePan, this);
        
        // State synchronization
        this.stateManager.subscribe('canvas', this.handleCanvasStateChange, this);
    }

    initializeViewport() {
        const canvasElement = document.getElementById('bitmap-canvas');
        if (canvasElement) {
            // Center canvas in viewport
            this.centerCanvas();
            
            // Setup mouse wheel zoom
            this.setupMouseWheelZoom(canvasElement);
        }
    }

    handleCanvasResize({ width, height }) {
        this.editor.resize(width, height);
        this.updateViewportBounds();
        this.eventBus.emit('canvas:viewport-updated', this.viewport);
    }

    handleZoom({ factor, centerX = null, centerY = null }) {
        const oldZoom = this.viewport.zoom;
        this.viewport.zoom = Math.max(0.1, Math.min(32, this.viewport.zoom * factor));
        
        // Adjust offset to zoom toward center point
        if (centerX !== null && centerY !== null) {
            this.viewport.offsetX += (centerX - this.viewport.offsetX) * (1 - factor);
            this.viewport.offsetY += (centerY - this.viewport.offsetY) * (1 - factor);
        }
        
        this.applyViewportTransform();
        this.stateManager.setState('canvas.zoom', this.viewport.zoom);
        this.eventBus.emit('canvas:zoom-changed', { 
            oldZoom, 
            newZoom: this.viewport.zoom,
            viewport: this.viewport 
        });
    }

    handlePan({ deltaX, deltaY }) {
        this.viewport.offsetX += deltaX;
        this.viewport.offsetY += deltaY;
        this.applyViewportTransform();
        this.eventBus.emit('canvas:viewport-updated', this.viewport);
    }

    setupMouseWheelZoom(canvas) {
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = canvas.getBoundingClientRect();
            const centerX = e.clientX - rect.left;
            const centerY = e.clientY - rect.top;
            
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.handleZoom({ factor, centerX, centerY });
        });
    }

    centerCanvas() {
        const container = document.getElementById('canvas-window');
        if (container && this.editor) {
            const containerRect = container.getBoundingClientRect();
            const canvasWidth = this.editor.width * this.viewport.zoom;
            const canvasHeight = this.editor.height * this.viewport.zoom;
            
            this.viewport.offsetX = (containerRect.width - canvasWidth) / 2;
            this.viewport.offsetY = (containerRect.height - canvasHeight) / 2;
            this.applyViewportTransform();
        }
    }

    applyViewportTransform() {
        const canvas = document.getElementById('bitmap-canvas');
        if (canvas) {
            canvas.style.transform = `translate(${this.viewport.offsetX}px, ${this.viewport.offsetY}px) scale(${this.viewport.zoom})`;
        }
    }

    updateViewportBounds() {
        // Update viewport bounds based on canvas size
        this.centerCanvas();
    }

    handleCanvasStateChange({ value, path }) {
        if (path === 'canvas.zoom' && value !== this.viewport.zoom) {
            this.viewport.zoom = value;
            this.applyViewportTransform();
        }
    }

    getViewportInfo() {
        return { ...this.viewport };
    }

    fitToWindow() {
        const container = document.getElementById('canvas-window');
        if (!container || !this.editor) return;
        
        const containerRect = container.getBoundingClientRect();
        const scaleX = containerRect.width / this.editor.width;
        const scaleY = containerRect.height / this.editor.height;
        const newZoom = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding
        
        this.viewport.zoom = Math.max(0.1, Math.min(32, newZoom));
        this.centerCanvas();
        this.stateManager.setState('canvas.zoom', this.viewport.zoom);
    }
}

/**
 * UI Manager - Handles UI state, window management, and user interactions
 */
class UIManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        
        this.windows = new Map();
        this.activeWindow = null;
        this.dialogStack = [];
        
        this.setupEventListeners();
        this.initializeWindows();
        this.setupKeyboardShortcuts();
    }

    setupEventListeners() {
        // Window management events
        this.eventBus.on('window:show', this.showWindow, this);
        this.eventBus.on('window:hide', this.hideWindow, this);
        this.eventBus.on('window:focus', this.focusWindow, this);
        
        // Dialog events
        this.eventBus.on('dialog:show', this.showDialog, this);
        this.eventBus.on('dialog:hide', this.hideDialog, this);
        
        // Tool events
        this.eventBus.on('tool:changed', this.handleToolChange, this);
        
        // State synchronization
        this.stateManager.subscribe('ui', this.handleUIStateChange, this);
    }

    initializeWindows() {
        // Register all UI windows
        const windowIds = [
            'canvas-window',
            'tools-window',
            'colors-window', 
            'options-window',
            'layers-window',
            'preview-window',
            'guides-window'
        ];
        
        windowIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.registerWindow(id, element);
            }
        });
    }

    registerWindow(id, element) {
        const windowData = {
            id,
            element,
            visible: !element.style.display || element.style.display !== 'none',
            position: this.getElementPosition(element),
            size: this.getElementSize(element)
        };
        
        this.windows.set(id, windowData);
        this.setupWindowEvents(windowData);
    }

    setupWindowEvents(windowData) {
        const { element } = windowData;
        
        // Window dragging
        const titleBar = element.querySelector('.window-title-bar') || 
                        element.querySelector('.window-header');
        
        if (titleBar) {
            this.setupWindowDragging(windowData, titleBar);
        }
        
        // Window focus
        element.addEventListener('mousedown', () => {
            this.focusWindow(windowData.id);
        });
    }

    setupWindowDragging(windowData, titleBar) {
        let isDragging = false;
        let dragStart = null;
        let windowStart = null;
        
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return; // Skip buttons
            
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            windowStart = this.getElementPosition(windowData.element);
            
            titleBar.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            
            const newX = windowStart.x + deltaX;
            const newY = windowStart.y + deltaY;
            
            this.setWindowPosition(windowData.id, newX, newY);
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                titleBar.style.cursor = '';
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Handle UI shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'h':
                        e.preventDefault();
                        this.toggleWindow('tools-window');
                        break;
                    case 'l':
                        e.preventDefault();
                        this.toggleWindow('layers-window');
                        break;
                }
            }
            
            // ESC to close dialogs
            if (e.key === 'Escape') {
                if (this.dialogStack.length > 0) {
                    this.hideDialog();
                }
            }
        });
    }

    showWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (windowData) {
            windowData.element.style.display = 'block';
            windowData.visible = true;
            this.focusWindow(windowId);
            this.eventBus.emit('window:shown', { windowId });
        }
    }

    hideWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (windowData) {
            windowData.element.style.display = 'none';
            windowData.visible = false;
            this.eventBus.emit('window:hidden', { windowId });
        }
    }

    toggleWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (windowData) {
            if (windowData.visible) {
                this.hideWindow(windowId);
            } else {
                this.showWindow(windowId);
            }
        }
    }

    focusWindow(windowId) {
        // Bring window to front
        const windowData = this.windows.get(windowId);
        if (windowData) {
            const maxZ = Math.max(...Array.from(this.windows.values())
                .map(w => parseInt(w.element.style.zIndex) || 1));
            windowData.element.style.zIndex = maxZ + 1;
            this.activeWindow = windowId;
            this.eventBus.emit('window:focused', { windowId });
        }
    }

    setWindowPosition(windowId, x, y) {
        const windowData = this.windows.get(windowId);
        if (windowData) {
            windowData.element.style.left = `${x}px`;
            windowData.element.style.top = `${y}px`;
            windowData.position = { x, y };
        }
    }

    showDialog(config) {
        const { type, content, position, onConfirm, onCancel } = config;
        
        // Create dialog element
        const dialog = this.createDialog(type, content, position);
        
        // Setup event handlers
        this.setupDialogEvents(dialog, onConfirm, onCancel);
        
        // Add to DOM and stack
        document.body.appendChild(dialog);
        this.dialogStack.push(dialog);
        
        // Show with animation
        requestAnimationFrame(() => {
            dialog.classList.add('visible');
        });
        
        this.eventBus.emit('dialog:shown', { type, dialog });
    }

    hideDialog() {
        if (this.dialogStack.length === 0) return;
        
        const dialog = this.dialogStack.pop();
        dialog.classList.remove('visible');
        
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        }, 200); // Match CSS transition
        
        this.eventBus.emit('dialog:hidden');
    }

    createDialog(type, content, position) {
        const dialog = document.createElement('div');
        dialog.className = `dialog ${type}-dialog`;
        
        if (position) {
            dialog.style.left = `${position.x}px`;
            dialog.style.top = `${position.y}px`;
        }
        
        dialog.innerHTML = content;
        return dialog;
    }

    setupDialogEvents(dialog, onConfirm, onCancel) {
        // Confirm button
        const confirmBtn = dialog.querySelector('.confirm-btn');
        if (confirmBtn && onConfirm) {
            confirmBtn.addEventListener('click', () => {
                onConfirm();
                this.hideDialog();
            });
        }
        
        // Cancel button
        const cancelBtn = dialog.querySelector('.cancel-btn');
        if (cancelBtn && onCancel) {
            cancelBtn.addEventListener('click', () => {
                onCancel();
                this.hideDialog();
            });
        }
        
        // Close button
        const closeBtn = dialog.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideDialog();
            });
        }
    }

    handleToolChange({ current }) {
        // Update tool UI state
        const toolButtons = document.querySelectorAll('.tool-button');
        toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === current);
        });
        
        // Update cursor
        this.updateCanvasCursor(current);
    }

    updateCanvasCursor(tool) {
        const canvas = document.getElementById('bitmap-canvas');
        if (canvas) {
            canvas.className = `tool-${tool}`;
        }
    }

    handleUIStateChange({ value, path }) {
        // Handle UI state changes
        if (path.startsWith('windows.')) {
            const windowId = path.split('.')[1];
            this.syncWindowState(windowId, value);
        }
    }

    syncWindowState(windowId, state) {
        if (state.visible !== undefined) {
            if (state.visible) {
                this.showWindow(windowId);
            } else {
                this.hideWindow(windowId);
            }
        }
        
        if (state.position) {
            this.setWindowPosition(windowId, state.position.x, state.position.y);
        }
    }

    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    getElementSize(element) {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }

    getWindowState() {
        const state = {};
        this.windows.forEach((data, id) => {
            state[id] = {
                visible: data.visible,
                position: data.position,
                size: data.size
            };
        });
        return state;
    }
}

/**
 * Theme Manager - Handles theme switching and UI appearance
 */
class ThemeManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        
        this.themes = new Map();
        this.currentTheme = 'default';
        
        this.initializeThemes();
        this.setupEventListeners();
        this.loadStoredTheme();
    }

    setupEventListeners() {
        this.eventBus.on('theme:change', this.changeTheme, this);
        this.eventBus.on('theme:toggle-dark', this.toggleDarkMode, this);
        this.stateManager.subscribe('theme', this.handleThemeStateChange, this);
    }

    initializeThemes() {
        // Default theme
        this.registerTheme('default', {
            name: 'Default',
            colors: {
                background: '#f0f0f0',
                windowBg: '#ffffff',
                border: '#cccccc',
                text: '#333333',
                accent: '#0066cc',
                canvas: '#ffffff',
                grid: '#e0e0e0'
            }
        });
        
        // Dark theme
        this.registerTheme('dark', {
            name: 'Dark',
            colors: {
                background: '#2d2d2d',
                windowBg: '#3c3c3c',
                border: '#555555',
                text: '#ffffff',
                accent: '#4da6ff',
                canvas: '#404040',
                grid: '#555555'
            }
        });
        
        // High contrast theme
        this.registerTheme('high-contrast', {
            name: 'High Contrast',
            colors: {
                background: '#000000',
                windowBg: '#000000',
                border: '#ffffff',
                text: '#ffffff',
                accent: '#ffff00',
                canvas: '#000000',
                grid: '#808080'
            }
        });
    }

    registerTheme(id, theme) {
        this.themes.set(id, theme);
    }

    changeTheme(themeId) {
        if (!this.themes.has(themeId)) {
            console.warn(`Theme '${themeId}' not found`);
            return false;
        }
        
        const theme = this.themes.get(themeId);
        this.currentTheme = themeId;
        
        // Apply theme colors as CSS custom properties
        this.applyCSSVariables(theme.colors);
        
        // Update body class
        document.body.className = document.body.className
            .replace(/theme-\w+/g, '') + ` theme-${themeId}`;
        
        // Store preference
        localStorage.setItem('bitsdraw-theme', themeId);
        
        // Update state
        this.stateManager.setState('theme.current', themeId);
        
        // Emit event
        this.eventBus.emit('theme:changed', { 
            themeId, 
            theme,
            previous: this.currentTheme 
        });
        
        return true;
    }

    toggleDarkMode() {
        const newTheme = this.currentTheme === 'dark' ? 'default' : 'dark';
        this.changeTheme(newTheme);
    }

    applyCSSVariables(colors) {
        const root = document.documentElement;
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
    }

    loadStoredTheme() {
        const stored = localStorage.getItem('bitsdraw-theme');
        if (stored && this.themes.has(stored)) {
            this.changeTheme(stored);
        }
    }

    handleThemeStateChange({ value, path }) {
        if (path === 'theme.current' && value !== this.currentTheme) {
            this.changeTheme(value);
        }
    }

    getAvailableThemes() {
        return Array.from(this.themes.entries()).map(([id, theme]) => ({
            id,
            name: theme.name
        }));
    }

    getCurrentTheme() {
        return {
            id: this.currentTheme,
            theme: this.themes.get(this.currentTheme)
        };
    }
}

/**
 * Preview Manager - Handles preview canvas updates and viewport synchronization
 */
class PreviewManager {
    constructor(eventBus, stateManager, canvas) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.canvas = canvas;
        
        this.ctx = canvas.getContext('2d');
        this.updateThrottle = null;
        
        this.setupEventListeners();
        this.initializePreview();
    }

    setupEventListeners() {
        // Canvas update events
        this.eventBus.on('canvas:updated', this.scheduleUpdate, this);
        this.eventBus.on('canvas:resized', this.handleCanvasResize, this);
        this.eventBus.on('canvas:zoom-changed', this.updateViewportFrame, this);
        this.eventBus.on('canvas:viewport-updated', this.updateViewportFrame, this);
        
        // Editor events
        this.eventBus.on('editor:pixel-changed', this.scheduleUpdate, this);
        this.eventBus.on('editor:redraw', this.scheduleUpdate, this);
        
        // Preview canvas interaction
        this.setupPreviewInteraction();
    }

    initializePreview() {
        this.ctx.imageSmoothingEnabled = false;
        this.updatePreview();
    }

    scheduleUpdate() {
        // Throttle updates for performance
        if (this.updateThrottle) {
            clearTimeout(this.updateThrottle);
        }
        
        this.updateThrottle = setTimeout(() => {
            this.updatePreview();
            this.updateThrottle = null;
        }, 16); // ~60 FPS
    }

    updatePreview() {
        const editor = this.getEditor();
        if (!editor) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate scale to fit canvas in preview
        const scaleX = this.canvas.width / editor.width;
        const scaleY = this.canvas.height / editor.height;
        const scale = Math.min(scaleX, scaleY);
        
        // Center the preview
        const offsetX = (this.canvas.width - editor.width * scale) / 2;
        const offsetY = (this.canvas.height - editor.height * scale) / 2;
        
        // Draw pixels
        this.ctx.fillStyle = '#000000';
        for (let y = 0; y < editor.height; y++) {
            for (let x = 0; x < editor.width; x++) {
                const pixelValue = editor.getPixel(x, y);
                if (pixelValue === 0) { // Black pixel
                    this.ctx.fillRect(
                        offsetX + x * scale,
                        offsetY + y * scale,
                        scale,
                        scale
                    );
                }
            }
        }
        
        // Store scale for viewport frame
        this.previewScale = scale;
        this.previewOffset = { x: offsetX, y: offsetY };
        
        this.updateViewportFrame();
    }

    updateViewportFrame(viewportData = null) {
        if (!this.previewScale) return;
        
        const canvasManager = this.getCanvasManager();
        const viewport = viewportData?.viewport || canvasManager?.getViewportInfo();
        
        if (!viewport) return;
        
        // Clear previous frame
        this.redrawPreview();
        
        // Draw viewport frame
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 1;
        
        const frameX = this.previewOffset.x;
        const frameY = this.previewOffset.y;
        const frameWidth = viewport.zoom * this.previewScale;
        const frameHeight = viewport.zoom * this.previewScale;
        
        this.ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
    }

    setupPreviewInteraction() {
        let isDragging = false;
        
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.handlePreviewClick(e);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.handlePreviewDrag(e);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });
    }

    handlePreviewClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to canvas coordinates
        const canvasX = (x - this.previewOffset.x) / this.previewScale;
        const canvasY = (y - this.previewOffset.y) / this.previewScale;
        
        // Pan main canvas to this position
        this.panToPosition(canvasX, canvasY);
    }

    handlePreviewDrag(e) {
        this.handlePreviewClick(e);
    }

    panToPosition(canvasX, canvasY) {
        this.eventBus.emit('canvas:pan-to', { x: canvasX, y: canvasY });
    }

    handleCanvasResize({ width, height }) {
        this.updatePreview();
    }

    redrawPreview() {
        this.updatePreview();
    }

    getEditor() {
        // Get editor from application context
        return window.bitsDrawApp?.editor || null;
    }

    getCanvasManager() {
        // Get canvas manager from application context
        return window.bitsDrawApp?.canvasManager || null;
    }
}

/**
 * Layer Manager - Handles layer operations and UI synchronization
 */
class LayerManager {
    constructor(eventBus, stateManager, editor) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.editor = editor;
        
        this.layers = [];
        this.activeLayerIndex = 0;
        
        this.setupEventListeners();
        this.initializeLayers();
    }

    setupEventListeners() {
        // Layer events
        this.eventBus.on('layer:create', this.createLayer, this);
        this.eventBus.on('layer:delete', this.deleteLayer, this);
        this.eventBus.on('layer:duplicate', this.duplicateLayer, this);
        this.eventBus.on('layer:merge', this.mergeLayers, this);
        
        // Layer properties
        this.eventBus.on('layer:set-visible', this.setLayerVisibility, this);
        this.eventBus.on('layer:set-opacity', this.setLayerOpacity, this);
        this.eventBus.on('layer:set-name', this.setLayerName, this);
        
        // Layer order
        this.eventBus.on('layer:move-up', this.moveLayerUp, this);
        this.eventBus.on('layer:move-down', this.moveLayerDown, this);
        
        // Active layer
        this.eventBus.on('layer:set-active', this.setActiveLayer, this);
        
        // State synchronization
        this.stateManager.subscribe('layers', this.handleLayerStateChange, this);
    }

    initializeLayers() {
        // Create initial layer if none exist
        if (this.layers.length === 0) {
            this.createLayer({
                name: 'Layer 1',
                visible: true,
                opacity: 1.0
            });
        }
        
        this.updateLayerUI();
    }

    createLayer(options = {}) {
        const layer = {
            id: `layer-${Date.now()}`,
            name: options.name || `Layer ${this.layers.length + 1}`,
            visible: options.visible !== false,
            opacity: options.opacity || 1.0,
            locked: options.locked || false,
            pixels: new Uint8Array(this.editor.width * this.editor.height).fill(1), // White
            alpha: new Uint8Array(this.editor.width * this.editor.height).fill(0)   // Transparent
        };
        
        const insertIndex = options.index !== undefined ? options.index : this.layers.length;
        this.layers.splice(insertIndex, 0, layer);
        
        // Set as active if it's the first layer or requested
        if (this.layers.length === 1 || options.setActive) {
            this.activeLayerIndex = insertIndex;
        }
        
        this.updateLayerState();
        this.updateLayerUI();
        this.eventBus.emit('layer:created', { layer, index: insertIndex });
        
        return layer;
    }

    deleteLayer(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index === -1 || this.layers.length === 1) {
            return false; // Can't delete last layer
        }
        
        const layer = this.layers[index];
        this.layers.splice(index, 1);
        
        // Adjust active layer index
        if (this.activeLayerIndex >= index) {
            this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
        }
        
        this.updateLayerState();
        this.updateLayerUI();
        this.eventBus.emit('layer:deleted', { layer, index });
        
        return true;
    }

    duplicateLayer(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index === -1) return null;
        
        const sourceLayer = this.layers[index];
        const newLayer = {
            ...sourceLayer,
            id: `layer-${Date.now()}`,
            name: `${sourceLayer.name} Copy`,
            pixels: new Uint8Array(sourceLayer.pixels),
            alpha: new Uint8Array(sourceLayer.alpha)
        };
        
        this.layers.splice(index + 1, 0, newLayer);
        this.activeLayerIndex = index + 1;
        
        this.updateLayerState();
        this.updateLayerUI();
        this.eventBus.emit('layer:duplicated', { sourceLayer, newLayer });
        
        return newLayer;
    }

    mergeLayers(sourceId, targetId) {
        const sourceIndex = this.layers.findIndex(l => l.id === sourceId);
        const targetIndex = this.layers.findIndex(l => l.id === targetId);
        
        if (sourceIndex === -1 || targetIndex === -1) return false;
        
        const sourceLayer = this.layers[sourceIndex];
        const targetLayer = this.layers[targetIndex];
        
        // Merge pixels (source over target)
        for (let i = 0; i < targetLayer.pixels.length; i++) {
            if (sourceLayer.alpha[i] > 0) {
                targetLayer.pixels[i] = sourceLayer.pixels[i];
                targetLayer.alpha[i] = Math.max(targetLayer.alpha[i], sourceLayer.alpha[i]);
            }
        }
        
        // Remove source layer
        this.deleteLayer(sourceId);
        
        this.eventBus.emit('layer:merged', { sourceLayer, targetLayer });
        return true;
    }

    setLayerVisibility(layerId, visible) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.visible = visible;
            this.updateLayerState();
            this.updateLayerUI();
            this.eventBus.emit('layer:visibility-changed', { layer, visible });
        }
    }

    setLayerOpacity(layerId, opacity) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            this.updateLayerState();
            this.updateLayerUI();
            this.eventBus.emit('layer:opacity-changed', { layer, opacity });
        }
    }

    setLayerName(layerId, name) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.name = name;
            this.updateLayerState();
            this.updateLayerUI();
            this.eventBus.emit('layer:name-changed', { layer, name });
        }
    }

    moveLayerUp(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index > 0) {
            [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
            
            if (this.activeLayerIndex === index) {
                this.activeLayerIndex--;
            } else if (this.activeLayerIndex === index - 1) {
                this.activeLayerIndex++;
            }
            
            this.updateLayerState();
            this.updateLayerUI();
            this.eventBus.emit('layer:moved', { layerId, direction: 'up' });
        }
    }

    moveLayerDown(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index < this.layers.length - 1) {
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
            
            if (this.activeLayerIndex === index) {
                this.activeLayerIndex++;
            } else if (this.activeLayerIndex === index + 1) {
                this.activeLayerIndex--;
            }
            
            this.updateLayerState();
            this.updateLayerUI();
            this.eventBus.emit('layer:moved', { layerId, direction: 'down' });
        }
    }

    setActiveLayer(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index !== -1) {
            this.activeLayerIndex = index;
            this.updateLayerState();
            this.updateLayerUI();
            this.eventBus.emit('layer:active-changed', { 
                layer: this.layers[index], 
                index 
            });
        }
    }

    getActiveLayer() {
        return this.layers[this.activeLayerIndex] || null;
    }

    getAllLayers() {
        return [...this.layers];
    }

    updateLayerState() {
        this.stateManager.setState('layers', {
            list: this.layers.map(layer => ({
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                opacity: layer.opacity,
                locked: layer.locked
            })),
            activeIndex: this.activeLayerIndex
        });
    }

    updateLayerUI() {
        // Update layers panel UI
        const layersPanel = document.getElementById('layers-list');
        if (layersPanel) {
            this.renderLayersPanel(layersPanel);
        }
    }

    renderLayersPanel(container) {
        container.innerHTML = '';
        
        // Render layers in reverse order (top to bottom)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            const layerElement = this.createLayerElement(layer, i);
            container.appendChild(layerElement);
        }
    }

    createLayerElement(layer, index) {
        const element = document.createElement('div');
        element.className = `layer-item ${index === this.activeLayerIndex ? 'active' : ''}`;
        element.dataset.layerId = layer.id;
        
        element.innerHTML = `
            <div class="layer-visibility">
                <input type="checkbox" ${layer.visible ? 'checked' : ''} 
                       onchange="window.bitsDrawApp.layerManager.setLayerVisibility('${layer.id}', this.checked)">
            </div>
            <div class="layer-thumbnail">
                <canvas width="32" height="16"></canvas>
            </div>
            <div class="layer-info">
                <div class="layer-name" contenteditable="true">${layer.name}</div>
                <div class="layer-opacity">
                    <input type="range" min="0" max="100" value="${layer.opacity * 100}"
                           onchange="window.bitsDrawApp.layerManager.setLayerOpacity('${layer.id}', this.value / 100)">
                </div>
            </div>
        `;
        
        // Setup events
        element.addEventListener('click', () => {
            this.setActiveLayer(layer.id);
        });
        
        // Render thumbnail
        this.renderLayerThumbnail(element.querySelector('canvas'), layer);
        
        return element;
    }

    renderLayerThumbnail(canvas, layer) {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 32, 16);
        
        // Scale factors
        const scaleX = 32 / this.editor.width;
        const scaleY = 16 / this.editor.height;
        
        // Render layer pixels
        ctx.fillStyle = '#000000';
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                const index = y * this.editor.width + x;
                if (layer.alpha[index] > 0 && layer.pixels[index] === 0) {
                    ctx.fillRect(
                        Math.floor(x * scaleX),
                        Math.floor(y * scaleY),
                        Math.ceil(scaleX),
                        Math.ceil(scaleY)
                    );
                }
            }
        }
    }

    handleLayerStateChange({ value, path }) {
        // Handle external layer state changes
        if (path === 'layers.activeIndex' && value !== this.activeLayerIndex) {
            this.activeLayerIndex = value;
            this.updateLayerUI();
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Application;
} else {
    window.Application = Application;
}