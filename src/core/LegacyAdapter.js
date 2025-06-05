/**
 * LegacyAdapter - Bridges existing BitsDraw layer system with CanvasUnit architecture
 * 
 * Provides backward compatibility for Canvas view functionality
 * Wraps OptimizedBitmapEditor with CanvasUnitManager interface
 */
class LegacyAdapter {
    constructor(bitsDrawApp) {
        this.app = bitsDrawApp;
        
        // Check if CanvasUnitManager is available
        if (typeof CanvasUnitManager === 'undefined') {
            console.error('CanvasUnitManager is not available. Make sure scripts are loaded in correct order.');
            return;
        }
        
        this.unitManager = new CanvasUnitManager();
        
        // Initialize with current canvas size
        this.unitManager.defaultSize = {
            width: this.app.editor.width,
            height: this.app.editor.height
        };
        
        // Mirror existing layers as CanvasUnits [0, 0, layer]
        this.syncLegacyLayers();
        
        // Create some sample data for testing views
        this.createSampleData();
        
        // Set up event listeners for legacy system changes
        this.setupLegacySync();
        
        // Initialize conversion tools (Phase 4)
        this.conversionManager = null;
        this.conversionDialog = null;
        this.initializeConversionTools();
        
        // Initialize animation exporter (Phase 5)
        this.animationExporter = null;
        this.animationExportDialog = null;
        this.initializeAnimationExporter();
        
        // Initialize project manager (Phase 6)
        this.projectManager = null;
        this.projectDialog = null;
        this.initializeProjectManager();
    }

    /**
     * Sync existing layers to CanvasUnit system
     */
    syncLegacyLayers() {
        if (!this.unitManager) {
            console.warn('UnitManager not initialized, skipping layer sync');
            return;
        }
        
        // For now, treat the current canvas as layer 0
        // In future, this could sync multiple layers if implemented
        const unit = this.unitManager.createUnit(0, 0, this.app.editor.width, this.app.editor.height);
        
        // Copy pixel data from current editor's active layer
        if (unit && unit.pixels) {
            const activeLayer = this.app.editor.getActiveLayer();
            if (activeLayer && activeLayer.pixels) {
                unit.pixels.set(activeLayer.pixels);
                unit.updateMeta({
                    name: 'Main Canvas',
                    visible: true,
                    locked: false
                });
            }
        }
    }

    /**
     * Set up synchronization between legacy and new systems
     */
    setupLegacySync() {
        if (!this.unitManager) {
            console.warn('UnitManager not available, skipping sync setup');
            return;
        }
        
        // Override editor methods to sync with CanvasUnit system
        const originalSetPixel = this.app.editor.setPixel.bind(this.app.editor);
        const originalRedraw = this.app.editor.redraw.bind(this.app.editor);
        const originalSaveState = this.app.editor.saveState.bind(this.app.editor);

        // Intercept setPixel calls
        this.app.editor.setPixel = (x, y, value, pattern = null) => {
            // Call original method
            originalSetPixel(x, y, value, pattern);
            
            // Sync to CanvasUnit
            if (this.unitManager) {
                const unit = this.unitManager.getUnit(0, 0);
                if (unit) {
                    unit.setPixel(x, y, value);
                }
            }
        };

        // Intercept saveState calls for history
        this.app.editor.saveState = () => {
            originalSaveState();
            if (this.unitManager) {
                this.unitManager.saveState();
            }
        };

        // Sync redraw operations
        this.app.editor.redraw = () => {
            originalRedraw();
            this.dispatchUnitUpdate();
        };
    }

    /**
     * Dispatch unit update event
     */
    dispatchUnitUpdate() {
        if (this.unitManager) {
            const unit = this.unitManager.getUnit(0, 0);
            if (unit) {
                this.unitManager.dispatchEvent(new CustomEvent('unit:updated', {
                    detail: { unit, frame: 0, layer: 0 }
                }));
            }
        }
    }

    /**
     * Get the CanvasUnitManager instance
     * @returns {CanvasUnitManager|null} The unit manager or null if not initialized
     */
    getUnitManager() {
        return this.unitManager || null;
    }

    /**
     * Switch to canvas view mode (maintains current functionality)
     */
    switchToCanvasView() {
        this.unitManager.setViewMode('canvas');
        // Show existing BitsDraw interface
        this.showLegacyInterface();
    }



    /**
     * Show legacy BitsDraw interface (restore to normal size)
     */
    showLegacyInterface() {
        // Restore canvas window to original size and position
        const canvasWindow = document.getElementById('canvas-window');
        if (canvasWindow) {
            canvasWindow.style.width = '600px';
            canvasWindow.style.height = '400px';
            canvasWindow.style.left = '20px';
            canvasWindow.style.top = '80px';
            canvasWindow.style.right = 'auto';
            canvasWindow.style.bottom = 'auto';
        }

        // Ensure all main windows are visible
        const mainElements = [
            'canvas-window',
            'tools-window', 
            'colors-window',
            'options-window',
            'layers-window',
            'preview-window',
            'guides-window'
        ];

        mainElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
        
    }

















    /**
     * Initialize conversion tools (Phase 4)
     */
    initializeConversionTools() {
        if (!this.unitManager) {
            console.warn('UnitManager not available, skipping conversion tools initialization');
            return;
        }

        try {
            if (typeof ConversionManager !== 'undefined') {
                this.conversionManager = new ConversionManager(this.unitManager, this);
                console.log('ConversionManager initialized');
            }
            
            if (typeof ConversionDialog !== 'undefined' && this.conversionManager) {
                this.conversionDialog = new ConversionDialog(this.conversionManager);
                console.log('ConversionDialog initialized');
            }
        } catch (error) {
            console.error('Failed to initialize conversion tools:', error);
        }
    }

    /**
     * Show smart conversion dialog
     * @param {string} sourceMode Source view mode
     */
    showConversionDialog(sourceMode = null) {
        if (!this.conversionDialog) {
            console.warn('Conversion dialog not available');
            return;
        }

        const currentMode = sourceMode || this.unitManager.viewMode || 'canvas';
        this.conversionDialog.show(currentMode);
    }

    /**
     * Get conversion manager instance
     * @returns {ConversionManager|null} Conversion manager
     */
    getConversionManager() {
        return this.conversionManager;
    }

    /**
     * Initialize animation exporter (Phase 5)
     */
    initializeAnimationExporter() {
        if (!this.unitManager) {
            console.warn('UnitManager not available, skipping animation exporter initialization');
            return;
        }

        try {
            if (typeof AnimationExporter !== 'undefined') {
                this.animationExporter = new AnimationExporter(this.unitManager);
                console.log('AnimationExporter initialized');
                
                if (typeof AnimationExportDialog !== 'undefined') {
                    this.animationExportDialog = new AnimationExportDialog(this.animationExporter);
                    console.log('AnimationExportDialog initialized');
                }
            }
        } catch (error) {
            console.error('Failed to initialize animation exporter:', error);
        }
    }

    /**
     * Show animation export dialog for GIF
     */
    exportAnimationGIF() {
        if (!this.animationExportDialog) {
            alert('Animation export not available. Please ensure you have animation frames.');
            return;
        }
        this.animationExportDialog.show('gif');
    }

    /**
     * Show animation export dialog for APNG
     */
    exportAnimationAPNG() {
        if (!this.animationExportDialog) {
            alert('Animation export not available. Please ensure you have animation frames.');
            return;
        }
        this.animationExportDialog.show('apng');
    }

    /**
     * Show animation export dialog for sprite sheet
     */
    exportSpriteSheet() {
        if (!this.animationExportDialog) {
            alert('Animation export not available. Please ensure you have animation frames.');
            return;
        }
        this.animationExportDialog.show('spritesheet');
    }

    /**
     * Get animation exporter instance
     * @returns {AnimationExporter|null} Animation exporter
     */
    getAnimationExporter() {
        return this.animationExporter;
    }

    /**
     * Initialize project manager (Phase 6)
     */
    initializeProjectManager() {
        if (!this.unitManager) {
            console.warn('UnitManager not available, skipping project manager initialization');
            return;
        }

        try {
            if (typeof ProjectManager !== 'undefined') {
                this.projectManager = new ProjectManager(this.unitManager, this);
                console.log('ProjectManager initialized');
                
                if (typeof ProjectDialog !== 'undefined') {
                    this.projectDialog = new ProjectDialog(this.projectManager);
                    console.log('ProjectDialog initialized');
                }
                
                // Set up auto-save
                this.setupAutoSave();
            }
        } catch (error) {
            console.error('Failed to initialize project manager:', error);
        }
    }

    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        if (!this.projectManager) return;

        // Auto-save every 5 minutes
        setInterval(() => {
            this.projectManager.autoSave();
        }, 5 * 60 * 1000);

        // Auto-save on page unload
        window.addEventListener('beforeunload', () => {
            this.projectManager.autoSave();
        });
    }

    /**
     * Show new project dialog
     */
    showNewProjectDialog() {
        if (!this.projectDialog) {
            alert('Project management not available.');
            return;
        }
        this.projectDialog.show('new');
    }

    /**
     * Show open project dialog
     */
    showOpenProjectDialog() {
        if (!this.projectDialog) {
            alert('Project management not available.');
            return;
        }
        this.projectDialog.show('import');
    }

    /**
     * Show recent projects dialog
     */
    showRecentProjectsDialog() {
        if (!this.projectDialog) {
            alert('Project management not available.');
            return;
        }
        this.projectDialog.show('recent');
    }

    /**
     * Save current project
     */
    saveProject() {
        if (!this.projectManager) {
            alert('Project management not available.');
            return;
        }

        try {
            this.projectManager.saveCurrentState();
            alert('Project saved successfully!');
        } catch (error) {
            console.error('Failed to save project:', error);
            alert('Failed to save project.');
        }
    }

    /**
     * Save project as new file
     */
    async saveProjectAs() {
        if (!this.projectManager) {
            alert('Project management not available.');
            return;
        }

        try {
            const success = await this.projectManager.exportProject();
            if (success) {
                alert('Project exported successfully!');
            } else {
                alert('Failed to export project.');
            }
        } catch (error) {
            console.error('Failed to export project:', error);
            alert('Failed to export project.');
        }
    }

    /**
     * Export project as .bdp file
     */
    async exportProject() {
        if (!this.projectManager) {
            alert('Project management not available.');
            return;
        }

        try {
            const success = await this.projectManager.exportProject();
            if (success) {
                alert('Project exported successfully!');
            } else {
                alert('Failed to export project.');
            }
        } catch (error) {
            console.error('Failed to export project:', error);
            alert('Failed to export project.');
        }
    }

    /**
     * Get project manager instance
     * @returns {ProjectManager|null} Project manager
     */
    getProjectManager() {
        return this.projectManager;
    }

    /**
     * Get current project statistics
     * @returns {object|null} Project statistics
     */
    getProjectStats() {
        if (!this.projectManager) return null;
        return this.projectManager.getProjectStats();
    }

    /**
     * Execute quick conversions (for menu actions)
     */
    quickConversions = {


    }

    /**
     * Migrate current project to CanvasUnit format
     * @returns {object} Project data in new format
     */
    exportToNewFormat() {
        // Sync current state
        this.syncLegacyLayers();
        
        return {
            version: '2.0',
            legacy: false,
            ...this.unitManager.toJSON()
        };
    }

    /**
     * Import project from new format
     * @param {object} projectData Project data
     */
    importFromNewFormat(projectData) {
        if (projectData.legacy !== false) {
            throw new Error('Project format not compatible');
        }

        this.unitManager.fromJSON(projectData);
        
        // Sync back to legacy system (canvas view only)
        const unit = this.unitManager.getUnit(0, 0);
        if (unit) {
            // Update canvas size if needed
            if (unit.width !== this.app.editor.width || unit.height !== this.app.editor.height) {
                this.app.editor.resize(unit.width, unit.height);
            }
            
            // Copy pixels back to legacy editor
            this.app.editor.pixels.set(unit.pixels);
            this.app.editor.redraw();
        }
    }

    /**
     * Check if new features are available
     * @returns {object} Feature availability
     */
    getFeatureAvailability() {
        return {
            canvasView: true,
            patternOperations: true
        };
    }


    /**
     * Create animation frame from current canvas
     * @param {number} frameIndex Frame index to create
     * @returns {CanvasUnit} The new frame unit
     */
    createFrameFromCanvas(frameIndex = 1) {
        const sourceUnit = this.unitManager.getUnit(0, 0);
        if (!sourceUnit) return null;

        const frameUnit = this.unitManager.createUnit(frameIndex, 0, sourceUnit.width, sourceUnit.height);
        frameUnit.copyFrom(sourceUnit);
        frameUnit.updateMeta({
            name: `Frame ${frameIndex}`,
            tags: ['animation', 'converted']
        });

        return frameUnit;
    }

    /**
     * Get conversion utilities for users
     * @returns {object} Conversion methods
     */
    getConversionTools() {
        return {
            canvasToFrame: this.createFrameFromCanvas.bind(this),
            exportProject: this.exportToNewFormat.bind(this),
            importProject: this.importFromNewFormat.bind(this)
        };
    }

    /**
     * Create sample data for testing views
     */
    createSampleData() {
        if (!this.unitManager) return;

        try {
            // Create some sample animation frames [frameIndex, layer]
            for (let frame = 0; frame < 8; frame++) {
                const frameUnit = this.unitManager.createUnit(frame, 0, 64, 64);
                
                // Draw an animated circle
                const centerX = 32;
                const centerY = 32;
                const radius = 10 + ((frame + 1) * 2);
                
                for (let y = 0; y < 64; y++) {
                    for (let x = 0; x < 64; x++) {
                        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                        if (Math.abs(distance - radius) < 1.5) {
                            frameUnit.setPixel(x, y, 1);
                        }
                    }
                }
                
                frameUnit.updateMeta({
                    name: `Frame ${frame + 1}`,
                    tags: ['animation', 'circle']
                });
            }

            console.log('Sample data created: 8 animation frames');
        } catch (error) {
            console.warn('Failed to create sample data:', error);
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegacyAdapter;
}