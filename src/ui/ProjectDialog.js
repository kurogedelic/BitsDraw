/**
 * ProjectDialog - UI for project management (new, open, recent projects)
 * 
 * Provides interface for creating new projects with templates,
 * opening existing projects, and managing recent project history
 */
class ProjectDialog {
    constructor(projectManager) {
        this.projectManager = projectManager;
        this.createDialog();
        this.setupEventListeners();
    }

    /**
     * Create the project dialog HTML structure
     */
    createDialog() {
        // Remove existing dialog if present
        const existing = document.getElementById('project-dialog');
        if (existing) {
            existing.remove();
        }

        const dialogHTML = `
            <div class="dialog-overlay" id="project-dialog" style="display: none;">
                <div class="dialog large-dialog">
                    <div class="dialog-header">
                        <h3 id="project-dialog-title">New Project</h3>
                        <button class="dialog-close" id="project-dialog-close-btn">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>
                    <div class="dialog-content">
                        <!-- Tab Navigation -->
                        <div class="project-tabs">
                            <button class="project-tab active" data-tab="new">New Project</button>
                            <button class="project-tab" data-tab="recent">Recent Projects</button>
                            <button class="project-tab" data-tab="import">Import Project</button>
                        </div>

                        <!-- New Project Tab -->
                        <div class="project-tab-content" id="new-project-tab">
                            <div class="project-form">
                                <div class="form-section">
                                    <h4>Project Details</h4>
                                    <div class="form-grid">
                                        <div class="form-group">
                                            <label>Project Name:</label>
                                            <input type="text" id="project-name-input" value="Untitled Project" placeholder="Enter project name">
                                        </div>
                                        <div class="form-group">
                                            <label>Description:</label>
                                            <textarea id="project-description-input" placeholder="Optional description" rows="2"></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-section">
                                    <h4>Template</h4>
                                    <div class="template-grid" id="template-grid">
                                        <!-- Templates will be populated here -->
                                    </div>
                                </div>

                                <div class="form-section">
                                    <h4>Canvas Size</h4>
                                    <div class="size-controls">
                                        <div class="size-preset">
                                            <label>Preset:</label>
                                            <select id="size-preset-select">
                                                <option value="">Custom</option>
                                                <option value="128,64" selected>OLED 128×64</option>
                                                <option value="128,32">OLED 128×32</option>
                                                <option value="400,240">Playdate 400×240</option>
                                                <option value="160,144">Game Boy 160×144</option>
                                                <option value="64,64">Sprite 64×64</option>
                                                <option value="32,32">Icon 32×32</option>
                                            </select>
                                        </div>
                                        <div class="size-inputs">
                                            <div class="size-input-group">
                                                <label>Width:</label>
                                                <input type="number" id="canvas-width-input" min="1" max="2048" value="128">
                                            </div>
                                            <div class="size-input-group">
                                                <label>Height:</label>
                                                <input type="number" id="canvas-height-input" min="1" max="2048" value="64">
                                            </div>
                                            <button type="button" id="swap-size-btn" title="Swap Width/Height">
                                                <i class="ph ph-swap"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Projects Tab -->
                        <div class="project-tab-content hidden" id="recent-project-tab">
                            <div class="recent-projects-section">
                                <div class="recent-projects-header">
                                    <h4>Recent Projects</h4>
                                    <button id="clear-recent-btn" class="text-button">Clear All</button>
                                </div>
                                <div class="recent-projects-list" id="recent-projects-list">
                                    <!-- Recent projects will be populated here -->
                                </div>
                                <div class="auto-save-section">
                                    <h4>Auto-Save Recovery</h4>
                                    <div class="auto-save-controls" id="auto-save-controls">
                                        <!-- Auto-save options will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Import Project Tab -->
                        <div class="project-tab-content hidden" id="import-project-tab">
                            <div class="import-section">
                                <h4>Import BitsDraw Project</h4>
                                <div class="file-drop-area" id="project-file-drop">
                                    <div class="file-drop-content">
                                        <i class="ph ph-file-arrow-up"></i>
                                        <p>Drop .bdp file here or click to browse</p>
                                        <button type="button" id="browse-project-file">Browse Files</button>
                                    </div>
                                    <input type="file" id="project-file-input" accept=".bdp,.json" style="display: none;">
                                </div>
                                <div class="import-info" id="import-info" style="display: none;">
                                    <h5>File Information</h5>
                                    <div class="import-details">
                                        <span id="import-filename"></span>
                                        <span id="import-size"></span>
                                        <span id="import-modified"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <button class="dialog-btn dialog-btn-cancel" id="project-dialog-cancel-btn">Cancel</button>
                        <button class="dialog-btn dialog-btn-primary" id="project-dialog-action-btn">Create Project</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
    }

    /**
     * Set up event listeners for dialog controls
     */
    setupEventListeners() {
        const dialog = document.getElementById('project-dialog');
        const closeBtn = document.getElementById('project-dialog-close-btn');
        const cancelBtn = document.getElementById('project-dialog-cancel-btn');
        const actionBtn = document.getElementById('project-dialog-action-btn');
        const tabs = document.querySelectorAll('.project-tab');
        const sizePresetSelect = document.getElementById('size-preset-select');
        const swapSizeBtn = document.getElementById('swap-size-btn');
        const clearRecentBtn = document.getElementById('clear-recent-btn');
        const browseFileBtn = document.getElementById('browse-project-file');
        const fileInput = document.getElementById('project-file-input');
        const fileDropArea = document.getElementById('project-file-drop');

        // Close dialog events
        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) this.hide();
        });

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Size preset changes
        sizePresetSelect.addEventListener('change', () => this.updateSizeFromPreset());

        // Swap size button
        swapSizeBtn.addEventListener('click', () => this.swapSize());

        // Clear recent projects
        clearRecentBtn.addEventListener('click', () => this.clearRecentProjects());

        // File import
        browseFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        // File drag and drop
        fileDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropArea.classList.add('drag-over');
        });

        fileDropArea.addEventListener('dragleave', () => {
            fileDropArea.classList.remove('drag-over');
        });

        fileDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileSelect(file);
        });

        // Action button
        actionBtn.addEventListener('click', () => this.performAction());

        // Template selection
        this.setupTemplateSelection();
    }

    /**
     * Set up template selection
     */
    setupTemplateSelection() {
        const templateGrid = document.getElementById('template-grid');
        const templates = this.projectManager.getProjectTemplates();

        // Add "Blank" template first
        const blankTemplate = this.createTemplateCard('blank', {
            meta: { name: 'Blank Project' },
            description: 'Start with an empty canvas'
        });
        templateGrid.appendChild(blankTemplate);

        // Add other templates
        Object.entries(templates).forEach(([key, template]) => {
            const card = this.createTemplateCard(key, template);
            templateGrid.appendChild(card);
        });

        // Select blank template by default
        blankTemplate.classList.add('selected');
    }

    /**
     * Create a template selection card
     * @param {string} key Template key
     * @param {object} template Template data
     * @returns {HTMLElement} Template card element
     */
    createTemplateCard(key, template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.template = key;

        const size = template.canvas ? `${template.canvas.width}×${template.canvas.height}` : 'Custom';
        const description = template.description || `Optimized for ${template.meta.name}`;

        card.innerHTML = `
            <div class="template-icon">
                <i class="ph ph-rectangle"></i>
            </div>
            <div class="template-info">
                <h5>${template.meta.name}</h5>
                <span class="template-size">${size}</span>
                <p class="template-description">${description}</p>
            </div>
        `;

        card.addEventListener('click', () => this.selectTemplate(card, key));

        return card;
    }

    /**
     * Select a template
     * @param {HTMLElement} card Template card element
     * @param {string} key Template key
     */
    selectTemplate(card, key) {
        // Remove previous selection
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        
        // Select new template
        card.classList.add('selected');

        // Update canvas size if template has specific size
        if (key !== 'blank') {
            const templates = this.projectManager.getProjectTemplates();
            const template = templates[key];
            if (template && template.canvas) {
                document.getElementById('canvas-width-input').value = template.canvas.width;
                document.getElementById('canvas-height-input').value = template.canvas.height;
                
                // Update preset select
                const presetValue = `${template.canvas.width},${template.canvas.height}`;
                const presetSelect = document.getElementById('size-preset-select');
                presetSelect.value = presetValue;
            }
        }
    }

    /**
     * Switch between tabs
     * @param {string} tabName Tab to switch to
     */
    switchTab(tabName) {
        const tabs = document.querySelectorAll('.project-tab');
        const contents = document.querySelectorAll('.project-tab-content');
        const title = document.getElementById('project-dialog-title');
        const actionBtn = document.getElementById('project-dialog-action-btn');

        // Update tab buttons
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        contents.forEach(content => {
            content.classList.toggle('hidden', !content.id.includes(tabName));
        });

        // Update dialog title and action button
        switch (tabName) {
            case 'new':
                title.textContent = 'New Project';
                actionBtn.textContent = 'Create Project';
                actionBtn.disabled = false;
                break;
            case 'recent':
                title.textContent = 'Recent Projects';
                actionBtn.textContent = 'Open Project';
                actionBtn.disabled = true; // Enabled when project selected
                this.populateRecentProjects();
                break;
            case 'import':
                title.textContent = 'Import Project';
                actionBtn.textContent = 'Import Project';
                actionBtn.disabled = true; // Enabled when file selected
                this.checkAutoSave();
                break;
        }
    }

    /**
     * Populate recent projects list
     */
    populateRecentProjects() {
        const list = document.getElementById('recent-projects-list');
        const recentProjects = this.projectManager.getRecentProjects();

        list.innerHTML = '';

        if (recentProjects.length === 0) {
            list.innerHTML = '<div class="no-recent">No recent projects</div>';
            return;
        }

        recentProjects.forEach((project, index) => {
            const item = document.createElement('div');
            item.className = 'recent-project-item';
            item.dataset.index = index;

            const modified = new Date(project.modified).toLocaleDateString();
            
            item.innerHTML = `
                <div class="recent-project-icon">
                    <i class="ph ph-file"></i>
                </div>
                <div class="recent-project-info">
                    <h5>${project.name}</h5>
                    <span class="recent-project-date">Modified ${modified}</span>
                </div>
                <div class="recent-project-actions">
                    <button class="icon-button" title="Remove from recent">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
            `;

            // Add click handler for opening
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.recent-project-actions')) {
                    this.selectRecentProject(item, index);
                }
            });

            // Add remove handler
            const removeBtn = item.querySelector('.icon-button');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeRecentProject(index);
            });

            list.appendChild(item);
        });
    }

    /**
     * Select a recent project
     * @param {HTMLElement} item Project item element
     * @param {number} index Project index
     */
    selectRecentProject(item, index) {
        // Remove previous selection
        document.querySelectorAll('.recent-project-item').forEach(i => i.classList.remove('selected'));
        
        // Select new item
        item.classList.add('selected');
        
        // Enable action button
        document.getElementById('project-dialog-action-btn').disabled = false;
        
        // Store selected index
        this.selectedRecentIndex = index;
    }

    /**
     * Remove a recent project from history
     * @param {number} index Project index to remove
     */
    removeRecentProject(index) {
        const recentProjects = this.projectManager.getRecentProjects();
        const projectToRemove = recentProjects[index];
        
        if (projectToRemove) {
            // Remove from localStorage as well
            this.projectManager.removeProjectFromStorage(projectToRemove.name);
            
            // Remove from history
            recentProjects.splice(index, 1);
            this.projectManager.projectHistory = recentProjects;
            this.projectManager.saveRecentProjects();
            this.populateRecentProjects();
            
            this.showNotification(`Removed "${projectToRemove.name}" from recent projects`, 'info');
        }
    }

    /**
     * Clear all recent projects
     */
    clearRecentProjects() {
        if (confirm('Clear all recent projects and their stored data?')) {
            const recentProjects = this.projectManager.getRecentProjects();
            
            // Remove all stored projects from localStorage
            recentProjects.forEach(project => {
                this.projectManager.removeProjectFromStorage(project.name);
            });
            
            this.projectManager.clearRecentProjects();
            this.populateRecentProjects();
            this.showNotification('All recent projects cleared', 'info');
        }
    }

    /**
     * Check for auto-save and update UI
     */
    checkAutoSave() {
        const autoSaveControls = document.getElementById('auto-save-controls');
        const hasAutoSave = this.projectManager.hasAutoSave();

        if (hasAutoSave) {
            autoSaveControls.innerHTML = `
                <div class="auto-save-item">
                    <div class="auto-save-info">
                        <i class="ph ph-clock"></i>
                        <span>Auto-saved project found</span>
                    </div>
                    <button id="load-auto-save-btn" class="dialog-btn dialog-btn-primary">
                        Recover Auto-Save
                    </button>
                </div>
            `;

            document.getElementById('load-auto-save-btn').addEventListener('click', () => {
                this.loadAutoSave();
            });
        } else {
            autoSaveControls.innerHTML = '<div class="no-auto-save">No auto-save available</div>';
        }
    }

    /**
     * Load auto-saved project
     */
    async loadAutoSave() {
        try {
            const success = this.projectManager.loadAutoSave();
            if (success) {
                this.hide();
                alert('Auto-saved project recovered successfully!');
            } else {
                alert('Failed to recover auto-saved project.');
            }
        } catch (error) {
            console.error('Auto-save recovery failed:', error);
            alert('Failed to recover auto-saved project.');
        }
    }

    /**
     * Update canvas size from preset selection
     */
    updateSizeFromPreset() {
        const preset = document.getElementById('size-preset-select').value;
        if (preset) {
            const [width, height] = preset.split(',').map(Number);
            document.getElementById('canvas-width-input').value = width;
            document.getElementById('canvas-height-input').value = height;
        }
    }

    /**
     * Swap width and height values
     */
    swapSize() {
        const widthInput = document.getElementById('canvas-width-input');
        const heightInput = document.getElementById('canvas-height-input');
        
        const width = widthInput.value;
        widthInput.value = heightInput.value;
        heightInput.value = width;
    }

    /**
     * Handle file selection for import
     * @param {File} file Selected file
     */
    handleFileSelect(file) {
        if (!file) return;

        const importInfo = document.getElementById('import-info');
        const filename = document.getElementById('import-filename');
        const size = document.getElementById('import-size');
        const modified = document.getElementById('import-modified');
        const actionBtn = document.getElementById('project-dialog-action-btn');

        // Show file info
        filename.textContent = file.name;
        size.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        modified.textContent = new Date(file.lastModified).toLocaleDateString();
        
        importInfo.style.display = 'block';
        actionBtn.disabled = false;

        // Store file for import
        this.selectedFile = file;
    }

    /**
     * Perform the current tab action
     */
    async performAction() {
        const activeTab = document.querySelector('.project-tab.active').dataset.tab;

        switch (activeTab) {
            case 'new':
                await this.createNewProject();
                break;
            case 'recent':
                await this.openRecentProject();
                break;
            case 'import':
                await this.importProject();
                break;
        }
    }

    /**
     * Create a new project
     */
    async createNewProject() {
        try {
            const name = document.getElementById('project-name-input').value.trim() || 'Untitled Project';
            const description = document.getElementById('project-description-input').value.trim();
            const width = parseInt(document.getElementById('canvas-width-input').value) || 128;
            const height = parseInt(document.getElementById('canvas-height-input').value) || 64;
            
            const selectedTemplate = document.querySelector('.template-card.selected');
            const template = selectedTemplate ? selectedTemplate.dataset.template : 'blank';

            const config = {
                name,
                description,
                canvasWidth: width,
                canvasHeight: height,
                template: template !== 'blank' ? template : null
            };

            const project = this.projectManager.createNewProject(config);
            this.projectManager.applyProjectToApp(project, true); // true = isNewProject

            this.hide();
            console.log(`Created new project: ${name}`);

        } catch (error) {
            console.error('Failed to create project:', error);
            alert('Failed to create new project.');
        }
    }

    /**
     * Open a recent project
     */
    async openRecentProject() {
        if (this.selectedRecentIndex === undefined) return;

        try {
            const recentProjects = this.projectManager.getRecentProjects();
            const recentProject = recentProjects[this.selectedRecentIndex];
            
            // Check if we have the project file path stored
            if (recentProject.path) {
                // Try to load from stored path (future file system integration)
                console.log(`Would load project from: ${recentProject.path}`);
                alert(`Project file loading from disk not yet implemented.\nProject: ${recentProject.name}\nPath: ${recentProject.path}`);
            } else {
                // Check if project is stored in localStorage
                const storedProjectKey = `bitsdraw_project_${recentProject.name.replace(/[^a-z0-9]/gi, '_')}`;
                const storedProject = localStorage.getItem(storedProjectKey);
                
                if (storedProject) {
                    try {
                        const projectData = JSON.parse(storedProject);
                        const success = this.projectManager.loadProject(projectData);
                        
                        if (success) {
                            this.hide();
                            this.showNotification(`Opened recent project: ${recentProject.name}`, 'success');
                        } else {
                            alert('Failed to load recent project data.');
                        }
                    } catch (parseError) {
                        console.error('Failed to parse stored project:', parseError);
                        alert('Stored project data is corrupted.');
                    }
                } else {
                    // Project data not found
                    const shouldRemove = confirm(
                        `Project "${recentProject.name}" is no longer available.\n\nWould you like to remove it from recent projects?`
                    );
                    
                    if (shouldRemove) {
                        this.removeRecentProject(this.selectedRecentIndex);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to open recent project:', error);
            alert('Failed to open recent project.');
        }
    }

    /**
     * Show notification (delegate to app)
     */
    showNotification(message, type = 'info') {
        if (this.projectManager.legacyAdapter && this.projectManager.legacyAdapter.app) {
            this.projectManager.legacyAdapter.app.showNotification(message, type);
        } else {
            console.log(`Notification [${type}]: ${message}`);
        }
    }

    /**
     * Import a project file
     */
    async importProject() {
        if (!this.selectedFile) return;

        try {
            const success = await this.projectManager.importProject(this.selectedFile);
            if (success) {
                this.hide();
                alert('Project imported successfully!');
            } else {
                alert('Failed to import project file.');
            }

        } catch (error) {
            console.error('Failed to import project:', error);
            alert('Failed to import project file.');
        }
    }

    /**
     * Show the project dialog
     * @param {string} tab Default tab to show
     */
    show(tab = 'new') {
        const dialog = document.getElementById('project-dialog');
        this.switchTab(tab);
        dialog.style.display = 'flex';
    }

    /**
     * Hide the project dialog
     */
    hide() {
        const dialog = document.getElementById('project-dialog');
        dialog.style.display = 'none';
        
        // Reset state
        this.selectedRecentIndex = undefined;
        this.selectedFile = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectDialog;
}