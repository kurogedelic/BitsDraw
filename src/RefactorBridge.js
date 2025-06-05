/**
 * Refactor Bridge - Transitional layer between old and new architecture
 * Allows gradual migration from monolithic main.js to modular architecture
 */
class RefactorBridge {
    constructor(legacyApp) {
        this.legacy = legacyApp;
        this.newApp = null;
        this.migrationState = {
            coreSystemsMigrated: false,
            toolSystemMigrated: false,
            uiSystemMigrated: false,
            eventSystemMigrated: false
        };
        
        this.initialize();
    }

    /**
     * Initialize the bridge and new architecture
     */
    async initialize() {
        try {
            console.log('Initializing refactor bridge...');
            
            // Create new application instance
            this.newApp = new Application({
                canvas: {
                    selector: '#bitmap-canvas',
                    defaultWidth: this.legacy.editor.width,
                    defaultHeight: this.legacy.editor.height,
                    defaultZoom: this.legacy.editor.zoom
                }
            });

            // Start progressive migration
            await this.migrateCoreSystems();
            await this.migrateEventSystem();
            await this.migrateToolSystem();
            
            console.log('Refactor bridge initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize refactor bridge:', error);
        }
    }

    /**
     * Migrate core systems (state, commands, events)
     */
    async migrateCoreSystems() {
        console.log('Migrating core systems...');
        
        // Sync initial state from legacy app
        this.syncLegacyState();
        
        // Setup state synchronization
        this.setupStateSynchronization();
        
        // Migrate command system
        this.migrateCommandSystem();
        
        this.migrationState.coreSystemsMigrated = true;
        console.log('Core systems migrated');
    }

    /**
     * Sync legacy application state to new state manager
     */
    syncLegacyState() {
        const newState = {
            canvas: {
                width: this.legacy.editor.width,
                height: this.legacy.editor.height,
                zoom: this.legacy.editor.zoom,
                showGrid: this.legacy.showGrid,
                displayMode: this.legacy.currentDisplayMode
            },
            tools: {
                current: this.legacy.currentTool,
                brushSize: this.legacy.brushSize,
                sprayRadius: this.legacy.sprayRadius,
                sprayDensity: this.legacy.sprayDensity,
                pattern: this.legacy.currentPattern,
                drawBorder: this.legacy.drawBorder,
                drawFill: this.legacy.drawFill
            },
            drawing: {
                isDrawing: this.legacy.isDrawing,
                selection: this.legacy.selection,
                clipboard: this.legacy.selectionClipboard,
                inverted: this.legacy.editor.inverted
            }
        };

        // Apply state in batches
        Object.keys(newState).forEach(section => {
            Object.keys(newState[section]).forEach(key => {
                const path = `${section}.${key}`;
                this.newApp.stateManager.setState(path, newState[section][key], { silent: true });
            });
        });
    }

    /**
     * Setup bidirectional state synchronization
     */
    setupStateSynchronization() {
        // New -> Legacy synchronization
        this.newApp.stateManager.subscribe('tools.current', ({ value }) => {
            if (this.legacy.currentTool !== value) {
                this.legacy.setTool(value);
            }
        });

        this.newApp.stateManager.subscribe('canvas.zoom', ({ value }) => {
            if (this.legacy.editor.zoom !== value) {
                this.legacy.setZoom(value);
            }
        });

        this.newApp.stateManager.subscribe('canvas.showGrid', ({ value }) => {
            if (this.legacy.showGrid !== value) {
                this.legacy.showGrid = value;
                this.legacy.updateGridDisplay();
            }
        });

        // Legacy -> New synchronization (monkey patch legacy methods)
        this.patchLegacyMethods();
    }

    /**
     * Patch legacy methods to sync with new state
     */
    patchLegacyMethods() {
        // Patch setTool method
        const originalSetTool = this.legacy.setTool.bind(this.legacy);
        this.legacy.setTool = (tool) => {
            originalSetTool(tool);
            this.newApp.stateManager.setState('tools.current', tool, { silent: true });
        };

        // Patch setZoom method
        const originalSetZoom = this.legacy.setZoom.bind(this.legacy);
        this.legacy.setZoom = (zoom) => {
            originalSetZoom(zoom);
            this.newApp.stateManager.setState('canvas.zoom', zoom, { silent: true });
        };

        // Patch other critical methods as needed...
    }

    /**
     * Migrate command system for undo/redo
     */
    migrateCommandSystem() {
        // Replace legacy undo/redo with new command system
        this.legacy.undo = () => this.newApp.undo();
        this.legacy.redo = () => this.newApp.redo();
        
        // Patch editor saveState to use command system
        const originalSaveState = this.legacy.editor.saveState.bind(this.legacy.editor);
        this.legacy.editor.saveState = () => {
            // For now, still use legacy system but could be migrated
            originalSaveState();
        };
    }

    /**
     * Migrate event system
     */
    async migrateEventSystem() {
        console.log('Migrating event system...');
        
        // Setup event forwarding from new to legacy
        this.setupEventForwarding();
        
        // Gradually replace legacy event handlers
        this.migrateCanvasEvents();
        
        this.migrationState.eventSystemMigrated = true;
        console.log('Event system migrated');
    }

    /**
     * Setup event forwarding between systems
     */
    setupEventForwarding() {
        // Forward notifications
        this.newApp.eventBus.on('notification:show', ({ message, type }) => {
            this.legacy.showNotification(message, type);
        });

        // Forward brush cursor events
        this.newApp.eventBus.on('brush-cursor:show', () => {
            this.legacy.showBrushCursor();
        });

        this.newApp.eventBus.on('brush-cursor:hide', () => {
            this.legacy.hideBrushCursor();
        });

        this.newApp.eventBus.on('brush-cursor:update', (coords) => {
            // Convert coords to client coordinates and update
            const rect = this.legacy.canvas.getBoundingClientRect();
            const clientX = rect.left + coords.x * this.legacy.editor.zoom;
            const clientY = rect.top + coords.y * this.legacy.editor.zoom;
            this.legacy.updateBrushCursor(clientX, clientY);
        });
    }

    /**
     * Migrate canvas events to new system
     */
    migrateCanvasEvents() {
        // Remove some legacy event listeners and route through new system
        // This is a gradual process to avoid breaking existing functionality
        
        // For now, keep legacy events but add new system hooks
        const originalHandleCanvasClick = this.legacy.handleCanvasClick.bind(this.legacy);
        this.legacy.handleCanvasClick = (e) => {
            // Let new tool system handle if it's migrated
            if (this.migrationState.toolSystemMigrated) {
                // New system will handle it
                return;
            } else {
                // Fall back to legacy
                originalHandleCanvasClick(e);
            }
        };
    }

    /**
     * Migrate tool system
     */
    async migrateToolSystem() {
        console.log('Migrating tool system...');
        
        // Setup tool integration
        this.setupToolIntegration();
        
        // Migrate specific tools gradually
        await this.migratePencilTool();
        await this.migrateBucketTool();
        
        this.migrationState.toolSystemMigrated = true;
        console.log('Tool system migrated');
    }

    /**
     * Setup tool integration between old and new systems
     */
    setupToolIntegration() {
        // Override legacy tool handling for migrated tools
        const originalHandleCanvasClick = this.legacy.handleCanvasClick.bind(this.legacy);
        
        this.legacy.handleCanvasClick = (e) => {
            const coords = this.legacy.editor.getCanvasCoordinates(e.clientX, e.clientY);
            
            // Check if current tool is migrated
            const currentTool = this.newApp.toolSystem.getCurrentTool();
            if (currentTool && this.isToolMigrated(currentTool.name)) {
                // Route to new tool system
                this.newApp.eventBus.emit('canvas:mousedown', { coords, event: e });
            } else {
                // Use legacy system
                originalHandleCanvasClick(e);
            }
        };
    }

    /**
     * Check if a tool has been migrated
     */
    isToolMigrated(toolName) {
        const migratedTools = ['pencil', 'bucket'];
        return migratedTools.includes(toolName);
    }

    /**
     * Migrate pencil tool
     */
    async migratePencilTool() {
        // Pencil tool is already implemented in new system
        // Just need to ensure state synchronization
        this.newApp.stateManager.subscribe('tools.brushSize', ({ value }) => {
            this.legacy.brushSize = value;
            this.legacy.updateBrushCursorSize();
        });
    }

    /**
     * Migrate bucket tool
     */
    async migrateBucketTool() {
        // Bucket tool is already implemented in new system
        // State synchronization handled in core migration
    }

    /**
     * Check migration progress
     */
    getMigrationStatus() {
        const completed = Object.values(this.migrationState).filter(Boolean).length;
        const total = Object.keys(this.migrationState).length;
        
        return {
            progress: completed / total,
            completed,
            total,
            details: { ...this.migrationState }
        };
    }

    /**
     * Get both legacy and new application instances
     */
    getApplications() {
        return {
            legacy: this.legacy,
            new: this.newApp,
            migration: this.getMigrationStatus()
        };
    }

    /**
     * Complete migration (replace legacy with new)
     */
    async completeMigration() {
        console.log('Completing migration...');
        
        // Validate all systems are migrated
        const status = this.getMigrationStatus();
        if (status.progress < 1) {
            throw new Error(`Migration incomplete: ${status.completed}/${status.total} systems migrated`);
        }

        // Transfer final state
        this.syncLegacyState();
        
        // Cleanup legacy event listeners
        this.cleanupLegacyEventListeners();
        
        console.log('Migration completed successfully');
        return this.newApp;
    }

    /**
     * Cleanup legacy event listeners
     */
    cleanupLegacyEventListeners() {
        // This would remove legacy event listeners that are now handled by new system
        // Implementation depends on how legacy events are tracked
    }

    /**
     * Rollback to legacy system
     */
    rollbackMigration() {
        console.log('Rolling back migration...');
        
        // Restore legacy methods
        // This would need to restore original methods from backups
        
        // Cleanup new system
        if (this.newApp) {
            this.newApp.destroy();
            this.newApp = null;
        }
        
        console.log('Migration rolled back');
    }
}

// Auto-initialize bridge when legacy app is ready
if (typeof window !== 'undefined') {
    window.RefactorBridge = RefactorBridge;
    
    // Hook into legacy app initialization
    const originalDOMContentLoaded = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
        if (type === 'DOMContentLoaded') {
            const wrappedListener = function(event) {
                // Call original listener
                listener(event);
                
                // Initialize bridge after legacy app is ready
                setTimeout(() => {
                    if (window.bitsDraw && typeof RefactorBridge !== 'undefined') {
                        window.refactorBridge = new RefactorBridge(window.bitsDraw);
                        console.log('Refactor bridge auto-initialized');
                    }
                }, 100);
            };
            
            return originalDOMContentLoaded.call(this, type, wrappedListener, options);
        } else {
            return originalDOMContentLoaded.call(this, type, listener, options);
        }
    };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefactorBridge;
}