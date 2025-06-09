/**
 * ProjectManager - Unified project file management for BitsDraw
 * 
 * Handles .bdp (BitsDraw Project) files containing complete project state
 * including CanvasUnits, metadata, view settings, and application configuration
 */
class ProjectManager {
    constructor(unitManager, legacyAdapter) {
        this.unitManager = unitManager;
        this.legacyAdapter = legacyAdapter;
        this.currentProject = null;
        this.projectHistory = [];
        this.maxHistory = 10;
        
        // Project file format version
        this.version = '2.0.0';
        
        // Initialize recent projects from localStorage
        this.loadRecentProjects();
    }

    /**
     * Create a new project
     * @param {object} config Project configuration
     * @returns {object} New project data
     */
    createNewProject(config = {}) {
        const {
            name = 'Untitled Project',
            description = '',
            canvasWidth = 128,
            canvasHeight = 64,
            template = null
        } = config;

        const project = {
            // Project metadata
            meta: {
                name,
                description,
                version: this.version,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                author: '',
                tags: [],
                template: template
            },

            // Canvas configuration
            canvas: {
                width: canvasWidth,
                height: canvasHeight,
                defaultZoom: 4,
                showGrid: false,
                showGuides: true,
                displayMode: 'white'
            },

            // View settings
            views: {
                current: 'canvas',
                canvas: {
                    zoom: 4,
                    panX: 0,
                    panY: 0
                }
            },

            // Tool settings
            tools: {
                currentTool: 'brush',
                brushSize: 2,
                currentPattern: 'solid-black',
                sprayRadius: 5,
                sprayDensity: 0.3,
                moveLoop: true,
                smoothDrawing: true
            },

            // Guides system
            guides: [],

            // Layer management
            layers: {
                active: 0,
                visible: [true],
                locked: [false],
                names: ['Layer 1']
            },

            // CanvasUnit data (the core content)
            units: {},

            // Export settings
            export: {
                format: 'u8g2',
                arrayName: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                lastExportPath: null
            },

            // Application state
            ui: {
                windowPositions: {},
                windowVisibility: {},
                menuState: {}
            }
        };

        // Apply template if specified
        if (template) {
            this.applyTemplate(project, template);
        }

        this.currentProject = project;
        this.saveToHistory(project);
        
        return project;
    }

    /**
     * Apply a project template
     * @param {object} project Project to modify
     * @param {string} template Template name
     */
    applyTemplate(project, template) {
        const templates = this.getProjectTemplates();
        const templateData = templates[template];
        
        if (!templateData) {
            console.warn(`Template "${template}" not found`);
            return;
        }

        // Apply template settings
        Object.assign(project.canvas, templateData.canvas || {});
        Object.assign(project.views, templateData.views || {});
        Object.assign(project.tools, templateData.tools || {});

        // Apply template content if available
        if (templateData.units) {
            project.units = { ...templateData.units };
        }

        if (templateData.guides) {
            project.guides = [...templateData.guides];
        }

        console.log(`Applied template: ${template}`);
    }

    /**
     * Get available project templates
     * @returns {object} Template definitions
     */
    getProjectTemplates() {
        return {
            'oled-128x64': {
                meta: { name: 'OLED Display 128×64' },
                canvas: { width: 128, height: 64 }
            },
            'oled-128x32': {
                meta: { name: 'OLED Display 128×32' },
                canvas: { width: 128, height: 32 }
            },
            'playdate-400x240': {
                meta: { name: 'Playdate Console 400×240' },
                canvas: { width: 400, height: 240 }
            },
            'gameboy-160x144': {
                meta: { name: 'Game Boy 160×144' },
                canvas: { width: 160, height: 144 }
            },
            'animation': {
                meta: { name: 'Animation Template' },
                canvas: { width: 64, height: 64 }
            }
        };
    }

    /**
     * Save current application state to project
     * @returns {object} Updated project data
     */
    saveCurrentState() {
        if (!this.currentProject) return null;

        // Update metadata
        this.currentProject.meta.modified = new Date().toISOString();

        // Save canvas state
        if (this.legacyAdapter && this.legacyAdapter.app) {
            const app = this.legacyAdapter.app;
            
            // Canvas settings
            this.currentProject.canvas.width = app.editor.width;
            this.currentProject.canvas.height = app.editor.height;
            this.currentProject.canvas.showGrid = app.showGrid;
            this.currentProject.canvas.showGuides = app.showGuides;
            this.currentProject.canvas.displayMode = app.currentDisplayMode;

            // Tool settings
            this.currentProject.tools.currentTool = app.currentTool;
            this.currentProject.tools.brushSize = app.brushSize;
            this.currentProject.tools.currentPattern = app.currentPattern;
            this.currentProject.tools.sprayRadius = app.sprayRadius;
            this.currentProject.tools.sprayDensity = app.sprayDensity;
            this.currentProject.tools.moveLoop = app.moveLoop;

            // Guides
            this.currentProject.guides = [...(app.guides || [])];

            // Project name from UI
            const projectNameElement = document.getElementById('project-name');
            if (projectNameElement) {
                this.currentProject.meta.name = projectNameElement.value || 'Untitled Project';
                this.currentProject.export.arrayName = projectNameElement.value?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'untitled';
            }
        }

        // Save view states
        if (this.unitManager) {
            this.currentProject.views.current = this.unitManager.viewMode || 'canvas';
        }

        // Save CanvasUnit data
        if (this.unitManager) {
            this.currentProject.units = this.unitManager.toJSON().units || {};
        }

        // Save UI state
        this.saveUIState();

        return this.currentProject;
    }

    /**
     * Save current UI state (window positions, visibility, etc.)
     */
    saveUIState() {
        const windows = document.querySelectorAll('.window');
        const windowPositions = {};
        const windowVisibility = {};

        windows.forEach(window => {
            const id = window.id;
            if (id) {
                // Save position
                windowPositions[id] = {
                    left: window.style.left,
                    top: window.style.top,
                    width: window.style.width,
                    height: window.style.height
                };

                // Save visibility
                windowVisibility[id] = !window.classList.contains('hidden') && 
                                     window.style.display !== 'none';
            }
        });

        this.currentProject.ui.windowPositions = windowPositions;
        this.currentProject.ui.windowVisibility = windowVisibility;
    }

    /**
     * Load project from data
     * @param {object} projectData Project data to load
     * @returns {boolean} Success status
     */
    loadProject(projectData) {
        try {
            // Validate project data
            if (!this.validateProject(projectData)) {
                throw new Error('Invalid project data format');
            }

            // Migrate old versions if needed
            const migratedData = this.migrateProject(projectData);
            
            this.currentProject = migratedData;

            // Apply to application
            this.applyProjectToApp(migratedData);
            
            // Save to history
            this.saveToHistory(migratedData);

            console.log(`Loaded project: ${migratedData.meta.name}`);
            return true;

        } catch (error) {
            console.error('Failed to load project:', error);
            return false;
        }
    }

    /**
     * Apply project data to application
     * @param {object} project Project data
     * @param {boolean} isNewProject Whether this is a new project (should clear canvas)
     */
    applyProjectToApp(project, isNewProject = false) {
        if (!this.legacyAdapter || !this.legacyAdapter.app) return;

        const app = this.legacyAdapter.app;

        // Apply canvas settings
        if (project.canvas.width !== app.editor.width || 
            project.canvas.height !== app.editor.height) {
            app.editor.resize(project.canvas.width, project.canvas.height);
        }

        // Clear canvas and fill Background layer with white for new projects
        if (isNewProject) {
            app.editor.clear();
            app.editor.fillBackgroundWithWhite();
        }

        // Apply view settings
        app.showGrid = project.canvas.showGrid;
        app.showGuides = project.canvas.showGuides;
        app.currentDisplayMode = project.canvas.displayMode;

        // Apply tool settings
        app.currentTool = project.tools.currentTool;
        app.brushSize = project.tools.brushSize;
        app.currentPattern = project.tools.currentPattern;
        app.sprayRadius = project.tools.sprayRadius;
        app.sprayDensity = project.tools.sprayDensity;
        app.moveLoop = project.tools.moveLoop;

        // Apply guides
        app.guides = [...(project.guides || [])];

        // Apply project name to UI
        const projectNameElement = document.getElementById('project-name');
        if (projectNameElement) {
            projectNameElement.value = project.meta.name;
        }

        // Load CanvasUnit data
        if (this.unitManager && project.units) {
            this.unitManager.fromJSON({ units: project.units });
        }

        // Apply view mode
        if (project.views.current && this.legacyAdapter) {
            switch (project.views.current) {
                case 'canvas':
                    this.legacyAdapter.switchToCanvasView();
                    break;
            }
        }

        // Apply UI state
        this.applyUIState(project.ui);

        // Update display
        app.updateGridDisplay();
        app.renderGuides();
        app.editor.redraw();
        app.updateOutput();
    }

    /**
     * Apply UI state to application
     * @param {object} uiState UI state data
     */
    applyUIState(uiState) {
        if (!uiState) return;

        // Apply window positions
        if (uiState.windowPositions) {
            Object.entries(uiState.windowPositions).forEach(([windowId, position]) => {
                const window = document.getElementById(windowId);
                if (window && position) {
                    if (position.left) window.style.left = position.left;
                    if (position.top) window.style.top = position.top;
                    if (position.width) window.style.width = position.width;
                    if (position.height) window.style.height = position.height;
                }
            });
        }

        // Apply window visibility
        if (uiState.windowVisibility) {
            Object.entries(uiState.windowVisibility).forEach(([windowId, visible]) => {
                const window = document.getElementById(windowId);
                if (window) {
                    if (visible) {
                        window.classList.remove('hidden');
                        window.style.display = 'block';
                    } else {
                        window.classList.add('hidden');
                        window.style.display = 'none';
                    }
                }
            });
        }
    }

    /**
     * Validate project data structure
     * @param {object} data Project data to validate
     * @returns {boolean} Is valid
     */
    validateProject(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Check required top-level properties
        const required = ['meta', 'canvas', 'views', 'tools'];
        for (const prop of required) {
            if (!data[prop]) return false;
        }

        // Check meta properties
        if (!data.meta.name || !data.meta.version) return false;

        // Check canvas properties
        if (!data.canvas.width || !data.canvas.height) return false;

        return true;
    }

    /**
     * Migrate project from older versions
     * @param {object} data Project data
     * @returns {object} Migrated project data
     */
    migrateProject(data) {
        let migrated = { ...data };

        // Migrate from version 1.x to 2.x
        if (!migrated.meta.version || migrated.meta.version.startsWith('1.')) {
            console.log('Migrating project from v1.x to v2.x');
            
            // Add missing v2 properties
            migrated.meta.version = this.version;
            migrated.views = migrated.views || {
                current: 'canvas',
                canvas: { zoom: 4, panX: 0, panY: 0 }
            };
            
            migrated.tools = migrated.tools || {
                currentTool: 'brush',
                brushSize: 2,
                currentPattern: 'solid-black'
            };

            migrated.ui = migrated.ui || {
                windowPositions: {},
                windowVisibility: {},
                menuState: {}
            };
        }

        return migrated;
    }

    /**
     * Export project as .bdp file
     * @param {string} filename Optional filename
     * @returns {boolean} Success status
     */
    async exportProject(filename = null) {
        try {
            // Save current state
            const projectData = this.saveCurrentState();
            if (!projectData) {
                throw new Error('No project data to export');
            }

            // Generate filename
            const exportFilename = filename || `${projectData.meta.name.replace(/[^a-z0-9]/gi, '_')}.bdp`;

            // Convert to JSON
            const jsonData = JSON.stringify(projectData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });

            // Download file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`Project exported as: ${exportFilename}`);
            return true;

        } catch (error) {
            console.error('Failed to export project:', error);
            return false;
        }
    }

    /**
     * Import project from .bdp file
     * @param {File} file File object to import
     * @returns {Promise<boolean>} Success status
     */
    async importProject(file) {
        try {
            if (!file.name.endsWith('.bdp')) {
                throw new Error('Invalid file format. Expected .bdp file.');
            }

            const text = await file.text();
            const projectData = JSON.parse(text);

            const success = this.loadProject(projectData);
            if (success) {
                console.log(`Project imported: ${projectData.meta.name}`);
            }

            return success;

        } catch (error) {
            console.error('Failed to import project:', error);
            return false;
        }
    }

    /**
     * Save project to recent projects list
     * @param {object} project Project data
     */
    saveToHistory(project) {
        const historyItem = {
            name: project.meta.name,
            path: null, // For future file system integration
            modified: project.meta.modified,
            thumbnail: null // For future thumbnail generation
        };

        // Remove existing entry with same name
        this.projectHistory = this.projectHistory.filter(item => item.name !== historyItem.name);
        
        // Add to beginning
        this.projectHistory.unshift(historyItem);
        
        // Limit history size
        if (this.projectHistory.length > this.maxHistory) {
            this.projectHistory = this.projectHistory.slice(0, this.maxHistory);
        }

        // Save to localStorage
        this.saveRecentProjects();
    }

    /**
     * Load recent projects from localStorage
     */
    loadRecentProjects() {
        try {
            const stored = localStorage.getItem('bitsdraw_recent_projects');
            if (stored) {
                this.projectHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load recent projects:', error);
            this.projectHistory = [];
        }
    }

    /**
     * Save recent projects to localStorage
     */
    saveRecentProjects() {
        try {
            localStorage.setItem('bitsdraw_recent_projects', JSON.stringify(this.projectHistory));
        } catch (error) {
            console.warn('Failed to save recent projects:', error);
        }
    }

    /**
     * Get recent projects list
     * @returns {Array} Recent projects
     */
    getRecentProjects() {
        return [...this.projectHistory];
    }

    /**
     * Clear recent projects history
     */
    clearRecentProjects() {
        this.projectHistory = [];
        this.saveRecentProjects();
    }

    /**
     * Get current project
     * @returns {object|null} Current project data
     */
    getCurrentProject() {
        return this.currentProject;
    }

    /**
     * Auto-save project to localStorage
     * @param {string} key Storage key
     */
    autoSave(key = 'bitsdraw_autosave') {
        try {
            const projectData = this.saveCurrentState();
            if (projectData) {
                localStorage.setItem(key, JSON.stringify(projectData));
                console.log('Project auto-saved');
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Load auto-saved project
     * @param {string} key Storage key
     * @returns {boolean} Success status
     */
    loadAutoSave(key = 'bitsdraw_autosave') {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const projectData = JSON.parse(stored);
                return this.loadProject(projectData);
            }
            return false;
        } catch (error) {
            console.warn('Failed to load auto-save:', error);
            return false;
        }
    }

    /**
     * Check if auto-save exists
     * @param {string} key Storage key
     * @returns {boolean} Auto-save exists
     */
    hasAutoSave(key = 'bitsdraw_autosave') {
        return localStorage.getItem(key) !== null;
    }

    /**
     * Generate project statistics
     * @returns {object} Project statistics
     */
    getProjectStats() {
        if (!this.currentProject) return null;

        const stats = {
            name: this.currentProject.meta.name,
            created: this.currentProject.meta.created,
            modified: this.currentProject.meta.modified,
            canvas: {
                size: `${this.currentProject.canvas.width}×${this.currentProject.canvas.height}`,
                pixels: this.currentProject.canvas.width * this.currentProject.canvas.height
            },
            content: {
                canvasUnits: 0,
                animationFrames: 0,
                guides: this.currentProject.guides?.length || 0
            }
        };

        // Count CanvasUnits by type
        if (this.currentProject.units) {
            Object.values(this.currentProject.units).forEach(unit => {
                if (unit.id) {
                    const [frame, layer] = [unit.id.frame, unit.id.layer];
                    if (frame > 0) {
                        stats.content.animationFrames++;
                    } else {
                        stats.content.canvasUnits++;
                    }
                }
            });
        }

        return stats;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectManager;
}