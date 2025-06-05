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

// Placeholder classes for systems that need to be created
class CanvasManager {
    constructor(eventBus, stateManager, editor) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.editor = editor;
        // Implementation would handle canvas-specific operations
    }
}

class UIManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        // Implementation would handle UI state and updates
    }
}


class ThemeManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        // Implementation would handle theme switching
    }
}

class PreviewManager {
    constructor(eventBus, stateManager, canvas) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.canvas = canvas;
        // Implementation would handle preview updates
    }
}

class LayerManager {
    constructor(eventBus, stateManager, editor) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.editor = editor;
        // Implementation would handle layer operations
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Application;
} else {
    window.Application = Application;
}