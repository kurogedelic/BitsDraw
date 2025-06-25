/**
 * Text Object Manager - Manages text objects with post-placement editing capabilities
 * Part of Advanced Text Tool System
 */
class TextObjectManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.textObjects = new Map(); // ID -> TextObject
        this.nextId = 1;
        this.selectedObject = null;
        this.isEditMode = false;
        this.dragState = null;
        this.clipboardObject = null; // For copy/paste operations
        
        this.setupEventListeners();
        this.setupUI();
    }
    
    /**
     * Create a new text object
     */
    createTextObject(text, x, y, options = {}) {
        const id = `text_${this.nextId++}`;
        const textObject = {
            id: id,
            text: text,
            x: x,
            y: y,
            font: options.font || TextRenderer.getCurrentFont(),
            size: options.size || TextRenderer.getCurrentSize(),
            pattern: options.pattern || null,
            layer: options.layer || this.app.editor.getActiveLayerIndex(),
            visible: true,
            locked: false,
            created: Date.now(),
            modified: Date.now(),
            // Bounds for hit testing
            bounds: this.calculateBounds(text, x, y, options.font, options.size)
        };
        
        this.textObjects.set(id, textObject);
        this.renderTextObject(textObject);
        this.updateTextObjectsList();
        
        return textObject;
    }
    
    /**
     * Calculate text bounds for hit testing
     */
    calculateBounds(text, x, y, font, size) {
        const width = TextRenderer.getTextWidth(text, font, size);
        const height = TextRenderer.getTextHeight(font, size);
        
        return {
            x: x,
            y: y,
            width: width,
            height: height,
            right: x + width,
            bottom: y + height
        };
    }
    
    /**
     * Render text object to the canvas
     */
    renderTextObject(textObject) {
        if (!textObject.visible) return;
        
        // Clear the area first if this is an edit
        this.clearTextObjectArea(textObject);
        
        // Render the text
        TextRenderer.renderText(
            textObject.text,
            textObject.x,
            textObject.y,
            this.app.editor,
            textObject.pattern,
            textObject.font,
            textObject.size
        );
        
        // Update bounds
        textObject.bounds = this.calculateBounds(
            textObject.text,
            textObject.x,
            textObject.y,
            textObject.font,
            textObject.size
        );
        
        textObject.modified = Date.now();
    }
    
    /**
     * Clear the area where text object was rendered
     */
    clearTextObjectArea(textObject) {
        const bounds = textObject.bounds;
        if (!bounds) return;
        
        // Clear the rectangular area
        for (let y = bounds.y; y < bounds.bottom; y++) {
            for (let x = bounds.x; x < bounds.right; x++) {
                if (x >= 0 && x < this.app.editor.width && 
                    y >= 0 && y < this.app.editor.height) {
                    this.app.editor.setPixel(x, y, 0); // Clear to white
                }
            }
        }
    }
    
    /**
     * Find text object at coordinates
     */
    getTextObjectAt(x, y) {
        for (const textObject of this.textObjects.values()) {
            if (!textObject.visible) continue;
            
            const bounds = textObject.bounds;
            if (x >= bounds.x && x < bounds.right &&
                y >= bounds.y && y < bounds.bottom) {
                return textObject;
            }
        }
        return null;
    }
    
    /**
     * Select a text object
     */
    selectTextObject(id) {
        this.selectedObject = id;
        this.updateTextObjectsList();
        this.app.editor.redraw();
    }
    
    /**
     * Deselect current text object
     */
    deselectTextObject() {
        this.selectedObject = null;
        this.updateTextObjectsList();
        this.app.editor.redraw();
    }
    
    /**
     * Edit selected text object
     */
    editSelectedTextObject() {
        if (!this.selectedObject) return;
        
        const textObject = this.textObjects.get(this.selectedObject);
        if (!textObject) return;
        
        this.showTextEditDialog(textObject);
    }
    
    /**
     * Show text edit dialog (reuse main app's text creation dialog)
     */
    showTextEditDialog(textObject) {
        // Use the main app's text creation dialog for editing
        if (!document.getElementById('text-creation-dialog')) {
            this.app.createTextCreationDialog();
        }
        
        const dialog = document.getElementById('text-creation-dialog');
        const textInput = document.getElementById('text-creation-input');
        const fontSelect = document.getElementById('text-creation-font');
        const sizeSelect = document.getElementById('text-creation-size');
        const titleElement = dialog.querySelector('.modal-header h3');
        const createBtn = document.getElementById('text-creation-create');
        
        // Change dialog title and button text for editing
        titleElement.textContent = 'Edit Text Object';
        createBtn.textContent = 'Save Changes';
        
        // Populate current values
        textInput.value = textObject.text;
        fontSelect.value = textObject.font;
        sizeSelect.value = textObject.size;
        
        // Show dialog
        dialog.style.display = 'flex';
        textInput.focus();
        textInput.select();
        
        // Store reference for save operation
        this.editingObject = textObject;
        this.isEditMode = true;
        
        // Update preview
        this.app.updateTextCreationPreview();
    }
    
    /**
     * Save text object changes
     */
    saveTextObjectChanges() {
        if (!this.editingObject) return;
        
        const textInput = document.getElementById('text-creation-input');
        const fontSelect = document.getElementById('text-creation-font');
        const sizeSelect = document.getElementById('text-creation-size');
        
        // Update text object
        this.editingObject.text = textInput.value;
        this.editingObject.font = fontSelect.value;
        this.editingObject.size = parseInt(sizeSelect.value);
        
        // Re-render
        this.renderTextObject(this.editingObject);
        this.app.editor.redraw();
        this.updateTextObjectsList();
        
        // Close dialog
        this.closeTextEditDialog();
        
        this.app.showNotification('Text object updated', 'success');
    }
    
    /**
     * Close text edit dialog
     */
    closeTextEditDialog() {
        const dialog = document.getElementById('text-creation-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            
            // Reset dialog for creation mode
            const titleElement = dialog.querySelector('.modal-header h3');
            const createBtn = document.getElementById('text-creation-create');
            titleElement.textContent = 'Create Text';
            createBtn.textContent = 'Create Text';
        }
        
        this.editingObject = null;
        this.isEditMode = false;
    }
    
    /**
     * Delete text object
     */
    deleteTextObject(id) {
        const textObject = this.textObjects.get(id);
        if (!textObject) return;
        
        if (confirm(`Delete text object "${textObject.text}"?`)) {
            // Clear from canvas
            this.clearTextObjectArea(textObject);
            
            // Remove from collection
            this.textObjects.delete(id);
            
            // Deselect if this was selected
            if (this.selectedObject === id) {
                this.selectedObject = null;
            }
            
            this.updateTextObjectsList();
            this.app.editor.redraw();
            this.app.showNotification('Text object deleted', 'success');
        }
    }
    
    /**
     * Move text object
     */
    moveTextObject(id, newX, newY) {
        const textObject = this.textObjects.get(id);
        if (!textObject || textObject.locked) return;
        
        // Clear old position
        this.clearTextObjectArea(textObject);
        
        // Update position
        textObject.x = newX;
        textObject.y = newY;
        
        // Re-render at new position
        this.renderTextObject(textObject);
        this.app.editor.redraw();
    }
    
    /**
     * Start dragging text object
     */
    startDrag(textObject, startX, startY) {
        this.dragState = {
            object: textObject,
            startX: startX,
            startY: startY,
            offsetX: startX - textObject.x,
            offsetY: startY - textObject.y
        };
    }
    
    /**
     * Update drag position
     */
    updateDrag(currentX, currentY) {
        if (!this.dragState) return;
        
        const newX = currentX - this.dragState.offsetX;
        const newY = currentY - this.dragState.offsetY;
        
        // Constrain to canvas bounds
        const bounds = this.dragState.object.bounds;
        const constrainedX = Math.max(0, Math.min(newX, this.app.editor.width - bounds.width));
        const constrainedY = Math.max(0, Math.min(newY, this.app.editor.height - bounds.height));
        
        this.moveTextObject(this.dragState.object.id, constrainedX, constrainedY);
    }
    
    /**
     * End dragging
     */
    endDrag() {
        this.dragState = null;
    }
    
    /**
     * Toggle text object visibility
     */
    toggleVisibility(id) {
        const textObject = this.textObjects.get(id);
        if (!textObject) return;
        
        textObject.visible = !textObject.visible;
        
        if (textObject.visible) {
            this.renderTextObject(textObject);
        } else {
            this.clearTextObjectArea(textObject);
        }
        
        this.app.editor.redraw();
        this.updateTextObjectsList();
    }
    
    /**
     * Toggle text object lock
     */
    toggleLock(id) {
        const textObject = this.textObjects.get(id);
        if (!textObject) return;
        
        textObject.locked = !textObject.locked;
        this.updateTextObjectsList();
    }
    
    /**
     * Get all text objects
     */
    getAllTextObjects() {
        return Array.from(this.textObjects.values());
    }
    
    /**
     * Clear all text objects
     */
    clearAllTextObjects() {
        if (this.textObjects.size === 0) return;
        
        if (confirm(`Delete all ${this.textObjects.size} text objects?`)) {
            // Clear from canvas
            for (const textObject of this.textObjects.values()) {
                this.clearTextObjectArea(textObject);
            }
            
            // Clear collection
            this.textObjects.clear();
            this.selectedObject = null;
            
            this.updateTextObjectsList();
            this.app.editor.redraw();
            this.app.showNotification('All text objects cleared', 'success');
        }
    }
    
    /**
     * Setup event listeners using main app's event management system
     */
    setupEventListeners() {
        // Canvas click handling for text object selection
        const clickHandler = (e) => {
            if (this.app.currentTool !== 'text') return;
            
            const rect = this.app.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.app.editor.zoom);
            const y = Math.floor((e.clientY - rect.top) / this.app.editor.zoom);
            
            const textObject = this.getTextObjectAt(x, y);
            if (textObject) {
                e.preventDefault();
                e.stopPropagation();
                this.selectTextObject(textObject.id);
            } else {
                this.deselectTextObject();
            }
        };
        this.app.addGlobalEventListener(this.app.canvas, 'click', clickHandler);
        
        // Mouse down for drag start
        const mouseDownHandler = (e) => {
            if (this.app.currentTool !== 'text' || e.button !== 0) return;
            
            const rect = this.app.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.app.editor.zoom);
            const y = Math.floor((e.clientY - rect.top) / this.app.editor.zoom);
            
            const textObject = this.getTextObjectAt(x, y);
            if (textObject && !textObject.locked) {
                e.preventDefault();
                e.stopPropagation();
                this.selectTextObject(textObject.id);
                this.startDrag(textObject, x, y);
                this.app.canvas.style.cursor = 'grabbing';
            }
        };
        this.app.addGlobalEventListener(this.app.canvas, 'mousedown', mouseDownHandler);
        
        // Mouse move for drag update
        const mouseMoveHandler = (e) => {
            if (this.app.currentTool !== 'text') return;
            
            const rect = this.app.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.app.editor.zoom);
            const y = Math.floor((e.clientY - rect.top) / this.app.editor.zoom);
            
            if (this.dragState) {
                // Update drag position
                this.updateDrag(x, y);
            } else {
                // Update cursor based on hover
                const textObject = this.getTextObjectAt(x, y);
                if (textObject && !textObject.locked) {
                    this.app.canvas.style.cursor = 'grab';
                } else if (this.app.currentTool === 'text') {
                    this.app.canvas.style.cursor = 'crosshair';
                }
            }
        };
        this.app.addGlobalEventListener(this.app.canvas, 'mousemove', mouseMoveHandler);
        
        // Mouse up for drag end
        const mouseUpHandler = (e) => {
            if (this.dragState) {
                this.endDrag();
                this.app.canvas.style.cursor = 'crosshair';
            }
        };
        this.app.addGlobalEventListener(this.app.canvas, 'mouseup', mouseUpHandler);
        
        // Right-click context menu
        const contextMenuHandler = (e) => {
            if (this.app.currentTool !== 'text') return;
            
            const rect = this.app.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.app.editor.zoom);
            const y = Math.floor((e.clientY - rect.top) / this.app.editor.zoom);
            
            const textObject = this.getTextObjectAt(x, y);
            if (textObject) {
                e.preventDefault();
                e.stopPropagation();
                this.selectTextObject(textObject.id);
                this.showContextMenu(e.clientX, e.clientY, textObject);
            }
        };
        this.app.addGlobalEventListener(this.app.canvas, 'contextmenu', contextMenuHandler);
        
        // Double-click to edit
        const dblClickHandler = (e) => {
            if (this.app.currentTool !== 'text') return;
            
            const rect = this.app.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.app.editor.zoom);
            const y = Math.floor((e.clientY - rect.top) / this.app.editor.zoom);
            
            const textObject = this.getTextObjectAt(x, y);
            if (textObject) {
                e.preventDefault();
                e.stopPropagation();
                this.selectTextObject(textObject.id);
                this.editSelectedTextObject();
            }
        };
        this.app.addGlobalEventListener(this.app.canvas, 'dblclick', dblClickHandler);
        
        // Keyboard shortcuts
        const keyDownHandler = (e) => {
            if (this.app.currentTool !== 'text' || !this.selectedObject) return;
            
            switch (e.key) {
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    this.deleteTextObject(this.selectedObject);
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.editSelectedTextObject();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.deselectTextObject();
                    break;
                case 'c':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.copySelectedTextObject();
                    }
                    break;
                case 'v':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.pasteTextObject();
                    }
                    break;
            }
        };
        this.app.addGlobalEventListener(document, 'keydown', keyDownHandler);
        
        // Click outside to hide context menu
        const documentClickHandler = () => {
            this.hideContextMenu();
        };
        this.app.addGlobalEventListener(document, 'click', documentClickHandler);
    }
    
    /**
     * Setup UI components
     */
    setupUI() {
        this.createTextObjectsPanel();
        // Text edit dialog now uses shared creation dialog
    }
    
    /**
     * Create text objects management panel
     */
    createTextObjectsPanel() {
        // This will be integrated into the existing layers panel or a new panel
        // For now, we'll add it to the options window
        const optionsContent = document.querySelector('#options-window .window-content');
        if (!optionsContent) return;
        
        const textObjectsSection = document.createElement('div');
        textObjectsSection.className = 'text-objects-section';
        textObjectsSection.innerHTML = `
            <div class="section-header">
                <h3>Text Objects</h3>
                <div class="section-controls">
                    <button id="import-text-objects-btn" title="Import Text Objects">
                        <i class="ph ph-upload"></i>
                    </button>
                    <button id="export-text-objects-btn" title="Export Text Objects">
                        <i class="ph ph-download"></i>
                    </button>
                    <button id="clear-all-text-btn" title="Clear All Text Objects">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
            <div class="text-objects-stats" id="text-objects-stats">
                <span id="text-objects-count">0 objects</span>
            </div>
            <div class="text-objects-list" id="text-objects-list">
                <div class="empty-state">No text objects</div>
            </div>
        `;
        
        optionsContent.appendChild(textObjectsSection);
        
        // Setup controls
        document.getElementById('import-text-objects-btn').addEventListener('click', () => {
            this.showImportDialog();
        });
        
        document.getElementById('export-text-objects-btn').addEventListener('click', () => {
            this.exportTextObjectsToFile();
        });
        
        document.getElementById('clear-all-text-btn').addEventListener('click', () => {
            this.clearAllTextObjects();
        });
        
        // Add Custom Fonts section
        this.createCustomFontsPanel(optionsContent);
    }
    
    /**
     * Create custom fonts management panel
     */
    createCustomFontsPanel(parentElement) {
        const customFontsSection = document.createElement('div');
        customFontsSection.className = 'custom-fonts-section';
        customFontsSection.innerHTML = `
            <div class="section-header">
                <h3>Custom Fonts</h3>
                <div class="custom-fonts-controls">
                    <button id="upload-custom-font-btn" title="Upload Custom Font">
                        <i class="ph ph-upload-simple"></i>
                    </button>
                    <button id="export-custom-fonts-btn" title="Export Custom Fonts">
                        <i class="ph ph-download"></i>
                    </button>
                    <button id="import-custom-fonts-btn" title="Import Custom Fonts">
                        <i class="ph ph-upload"></i>
                    </button>
                </div>
            </div>
            <div class="custom-fonts-list" id="custom-fonts-list">
                <div class="empty-state">No custom fonts</div>
            </div>
        `;
        
        parentElement.appendChild(customFontsSection);
        
        // Setup custom fonts controls
        document.getElementById('upload-custom-font-btn').addEventListener('click', () => {
            this.app.customFontManager.showFontUploadDialog();
        });
        
        document.getElementById('export-custom-fonts-btn').addEventListener('click', () => {
            this.app.customFontManager.exportCustomFonts();
        });
        
        document.getElementById('import-custom-fonts-btn').addEventListener('click', () => {
            this.showCustomFontsImportDialog();
        });
        
        // Update the custom fonts list
        this.updateCustomFontsList();
        
        // Listen for font manager updates
        if (this.app.customFontManager) {
            this.app.customFontManager.onUpdate = () => {
                this.updateCustomFontsList();
            };
        }
    }
    
    /**
     * Update custom fonts list
     */
    updateCustomFontsList() {
        const listElement = document.getElementById('custom-fonts-list');
        if (!listElement || !this.app.customFontManager) return;
        
        const customFonts = this.app.customFontManager.getAllCustomFonts();
        
        if (customFonts.length === 0) {
            listElement.innerHTML = '<div class="empty-state">No custom fonts</div>';
            return;
        }
        
        listElement.innerHTML = customFonts.map(font => `
            <div class="custom-font-item" data-font-id="${font.id}">
                <div class="custom-font-content">
                    <div class="custom-font-name">${this.escapeHtml(font.name)}</div>
                    <div class="custom-font-info">
                        ${font.data.metadata.width}×${font.data.metadata.height}px • 
                        ${Object.keys(font.data.characters).length} chars
                    </div>
                </div>
                <div class="custom-font-controls">
                    <button class="custom-font-btn" data-action="preview" title="Preview Font">
                        <i class="ph ph-eye"></i>
                    </button>
                    <button class="custom-font-btn" data-action="export" title="Export Font">
                        <i class="ph ph-download"></i>
                    </button>
                    <button class="custom-font-btn delete-btn" data-action="delete" title="Delete Font">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Setup event listeners for custom font items
        listElement.querySelectorAll('.custom-font-item').forEach(item => {
            const fontId = item.dataset.fontId;
            
            // Control buttons
            item.querySelectorAll('.custom-font-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    
                    switch (action) {
                        case 'preview':
                            this.previewCustomFont(fontId);
                            break;
                        case 'export':
                            this.exportCustomFont(fontId);
                            break;
                        case 'delete':
                            this.app.customFontManager.deleteCustomFont(fontId);
                            break;
                    }
                });
            });
        });
    }
    
    /**
     * Preview custom font
     */
    previewCustomFont(fontId) {
        const customFont = this.app.customFontManager.customFonts.get(fontId);
        if (!customFont) return;
        
        // Create preview dialog
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Font Preview: ${this.escapeHtml(customFont.name)}</h3>
                    <button class="modal-close">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="font-preview">
                        <canvas id="custom-font-preview-canvas" width="500" height="150"></canvas>
                    </div>
                    <div class="font-details">
                        <div class="font-detail-item">
                            <strong>Dimensions:</strong> ${customFont.data.metadata.width}×${customFont.data.metadata.height} pixels
                        </div>
                        <div class="font-detail-item">
                            <strong>Characters:</strong> ${Object.keys(customFont.data.characters).length} defined
                        </div>
                        <div class="font-detail-item">
                            <strong>Created:</strong> ${new Date(customFont.created).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.style.display = 'flex';
        
        // Render preview
        const canvas = dialog.querySelector('#custom-font-preview-canvas');
        this.app.customFontManager.renderFontPreview(customFont.data, canvas);
        
        // Setup close handlers
        const closeHandlers = [
            dialog.querySelector('.modal-close'),
            dialog.querySelector('.btn-primary')
        ];
        
        closeHandlers.forEach(btn => {
            btn.addEventListener('click', () => {
                dialog.style.display = 'none';
                document.body.removeChild(dialog);
            });
        });
        
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.style.display = 'none';
                document.body.removeChild(dialog);
            }
        });
    }
    
    /**
     * Export single custom font
     */
    exportCustomFont(fontId) {
        const customFont = this.app.customFontManager.customFonts.get(fontId);
        if (!customFont) return;
        
        const exportData = {
            format: 'bitsdraw-bitmap',
            version: '1.0',
            exported: Date.now(),
            metadata: customFont.data.metadata,
            characters: customFont.data.characters
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${customFont.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.app.showNotification(`Font "${customFont.name}" exported`, 'success');
    }
    
    /**
     * Show custom fonts import dialog
     */
    showCustomFontsImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (data.format === 'bitsdraw-font-collection' && data.fonts) {
                        // Import multiple fonts
                        this.importCustomFontsCollection(data);
                    } else if (data.format === 'bitsdraw-bitmap' || data.characters) {
                        // Import single font
                        this.app.customFontManager.processFontFile(file, null);
                    } else {
                        throw new Error('Unsupported font collection format');
                    }
                } catch (error) {
                    this.app.showNotification(`Failed to import fonts: ${error.message}`, 'error');
                }
            };
            reader.readAsText(file);
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
    
    /**
     * Import custom fonts collection
     */
    importCustomFontsCollection(data) {
        if (!data.fonts || !Array.isArray(data.fonts)) {
            throw new Error('Invalid font collection format');
        }
        
        let importedCount = 0;
        
        for (const fontData of data.fonts) {
            try {
                // Create unique font ID
                const fontId = `custom-${this.app.customFontManager.nextFontId++}`;
                
                const customFont = {
                    id: fontId,
                    name: fontData.name + ' (Imported)',
                    data: fontData.data,
                    originalFile: 'imported',
                    format: fontData.format,
                    created: Date.now(),
                    modified: Date.now()
                };
                
                this.app.customFontManager.customFonts.set(fontId, customFont);
                this.app.customFontManager.registerCustomFont(customFont);
                importedCount++;
                
            } catch (error) {
                console.warn(`Failed to import font "${fontData.name}":`, error);
            }
        }
        
        if (importedCount > 0) {
            this.app.customFontManager.saveCustomFonts();
            this.app.customFontManager.updateFontSelectionUI();
            this.updateCustomFontsList();
            this.app.showNotification(`Imported ${importedCount} custom fonts`, 'success');
        } else {
            this.app.showNotification('No fonts could be imported', 'error');
        }
    }
    
    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Text edit dialog creation removed - now uses shared text creation dialog
    
    /**
     * Update text objects list UI
     */
    updateTextObjectsList() {
        const listElement = document.getElementById('text-objects-list');
        if (!listElement) return;
        
        const textObjects = Array.from(this.textObjects.values())
            .sort((a, b) => b.created - a.created); // Newest first
        
        // Update stats
        const statsElement = document.getElementById('text-objects-count');
        if (statsElement) {
            statsElement.textContent = textObjects.length === 0 ? '0 objects' : 
                textObjects.length === 1 ? '1 object' : `${textObjects.length} objects`;
        }
        
        if (textObjects.length === 0) {
            listElement.innerHTML = '<div class="empty-state">No text objects</div>';
            return;
        }
        
        listElement.innerHTML = textObjects.map(obj => `
            <div class="text-object-item ${obj.id === this.selectedObject ? 'selected' : ''}" 
                 data-id="${obj.id}">
                <div class="text-object-content">
                    <div class="text-object-text">"${this.truncateText(obj.text, 20)}"</div>
                    <div class="text-object-info">
                        ${obj.font.replace('bitmap-', '')} @ ${obj.size}× 
                        (${obj.x}, ${obj.y})
                    </div>
                </div>
                <div class="text-object-controls">
                    <button class="text-object-btn" data-action="edit" title="Edit">
                        <i class="ph ph-pencil"></i>
                    </button>
                    <button class="text-object-btn ${obj.visible ? '' : 'inactive'}" 
                            data-action="visibility" title="Toggle Visibility">
                        <i class="ph ${obj.visible ? 'ph-eye' : 'ph-eye-slash'}"></i>
                    </button>
                    <button class="text-object-btn ${obj.locked ? 'active' : ''}" 
                            data-action="lock" title="Toggle Lock">
                        <i class="ph ${obj.locked ? 'ph-lock' : 'ph-lock-open'}"></i>
                    </button>
                    <button class="text-object-btn delete-btn" data-action="delete" title="Delete">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Setup event listeners for text object items
        listElement.querySelectorAll('.text-object-item').forEach(item => {
            const id = item.dataset.id;
            
            // Click to select
            item.addEventListener('click', (e) => {
                if (e.target.closest('.text-object-btn')) return; // Don't select if clicking button
                this.selectTextObject(id);
            });
            
            // Control buttons
            item.querySelectorAll('.text-object-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    
                    switch (action) {
                        case 'edit':
                            this.selectTextObject(id);
                            this.editSelectedTextObject();
                            break;
                        case 'visibility':
                            this.toggleVisibility(id);
                            break;
                        case 'lock':
                            this.toggleLock(id);
                            break;
                        case 'delete':
                            this.deleteTextObject(id);
                            break;
                    }
                });
            });
        });
    }
    
    /**
     * Truncate text for display
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Export text objects data
     */
    exportTextObjects() {
        const data = {
            version: '1.0',
            timestamp: Date.now(),
            textObjects: Array.from(this.textObjects.values())
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Show import dialog
     */
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                this.importTextObjects(event.target.result);
            };
            reader.readAsText(file);
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
    
    /**
     * Export text objects to file
     */
    exportTextObjectsToFile() {
        if (this.textObjects.size === 0) {
            this.app.showNotification('No text objects to export', 'warning');
            return;
        }
        
        const data = this.exportTextObjects();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `text-objects-${Date.now()}.json`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.app.showNotification(`Exported ${this.textObjects.size} text objects`, 'success');
    }
    
    /**
     * Import text objects data
     */
    importTextObjects(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.textObjects || !Array.isArray(data.textObjects)) {
                throw new Error('Invalid text objects data format');
            }
            
            // Ask user whether to replace or merge
            const shouldReplace = this.textObjects.size === 0 || 
                confirm(`You have ${this.textObjects.size} existing text objects. Do you want to replace them? (Cancel to merge)`);
            
            if (shouldReplace) {
                // Clear existing objects
                this.textObjects.clear();
                this.selectedObject = null;
            }
            
            let importedCount = 0;
            
            // Import objects
            for (const obj of data.textObjects) {
                // Validate object structure
                if (!obj.id || !obj.text || typeof obj.x !== 'number' || typeof obj.y !== 'number') {
                    continue;
                }
                
                // Ensure unique ID if merging
                let finalId = obj.id;
                if (!shouldReplace && this.textObjects.has(obj.id)) {
                    finalId = `text_${this.nextId++}`;
                }
                
                const importedObject = {
                    ...obj,
                    id: finalId,
                    created: obj.created || Date.now(),
                    modified: Date.now()
                };
                
                this.textObjects.set(finalId, importedObject);
                this.renderTextObject(importedObject);
                importedCount++;
            }
            
            // Update next ID counter
            const maxId = Math.max(
                this.nextId - 1,
                ...Array.from(this.textObjects.keys())
                    .filter(id => id.startsWith('text_'))
                    .map(id => parseInt(id.replace('text_', '')) || 0)
            );
            this.nextId = maxId + 1;
            
            this.updateTextObjectsList();
            this.app.editor.redraw();
            
            const action = shouldReplace ? 'Imported' : 'Merged';
            this.app.showNotification(`${action} ${importedCount} text objects`, 'success');
            
        } catch (error) {
            this.app.showNotification('Failed to import text objects: ' + error.message, 'error');
        }
    }
    
    /**
     * Show context menu for text object
     */
    showContextMenu(x, y, textObject) {
        this.hideContextMenu(); // Hide any existing menu
        
        const menu = document.createElement('div');
        menu.id = 'text-object-context-menu';
        menu.className = 'context-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="edit">
                <i class="ph ph-pencil"></i> Edit Text
            </div>
            <div class="context-menu-item" data-action="duplicate">
                <i class="ph ph-copy"></i> Duplicate
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="bring-to-front">
                <i class="ph ph-arrow-up"></i> Bring to Front
            </div>
            <div class="context-menu-item" data-action="send-to-back">
                <i class="ph ph-arrow-down"></i> Send to Back
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item ${textObject.locked ? 'checked' : ''}" data-action="lock">
                <i class="ph ${textObject.locked ? 'ph-lock' : 'ph-lock-open'}"></i> 
                ${textObject.locked ? 'Unlock' : 'Lock'}
            </div>
            <div class="context-menu-item ${textObject.visible ? 'checked' : ''}" data-action="visibility">
                <i class="ph ${textObject.visible ? 'ph-eye' : 'ph-eye-slash'}"></i> 
                ${textObject.visible ? 'Hide' : 'Show'}
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item delete" data-action="delete">
                <i class="ph ph-trash"></i> Delete
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Setup event handlers
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (!action) return;
            
            this.handleContextMenuAction(action, textObject);
            this.hideContextMenu();
        });
        
        // Position adjustment if menu goes off-screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (y - rect.height) + 'px';
        }
    }
    
    /**
     * Hide context menu
     */
    hideContextMenu() {
        const menu = document.getElementById('text-object-context-menu');
        if (menu) {
            menu.remove();
        }
    }
    
    /**
     * Handle context menu actions
     */
    handleContextMenuAction(action, textObject) {
        switch (action) {
            case 'edit':
                this.editSelectedTextObject();
                break;
            case 'duplicate':
                this.duplicateTextObject(textObject.id);
                break;
            case 'bring-to-front':
                this.bringToFront(textObject.id);
                break;
            case 'send-to-back':
                this.sendToBack(textObject.id);
                break;
            case 'lock':
                this.toggleLock(textObject.id);
                break;
            case 'visibility':
                this.toggleVisibility(textObject.id);
                break;
            case 'delete':
                this.deleteTextObject(textObject.id);
                break;
        }
    }
    
    /**
     * Duplicate text object
     */
    duplicateTextObject(id) {
        const original = this.textObjects.get(id);
        if (!original) return;
        
        const duplicate = {
            ...original,
            id: `text_${this.nextId++}`,
            x: original.x + 10,
            y: original.y + 10,
            created: Date.now(),
            modified: Date.now()
        };
        
        this.textObjects.set(duplicate.id, duplicate);
        this.renderTextObject(duplicate);
        this.selectTextObject(duplicate.id);
        this.updateTextObjectsList();
        
        this.app.showNotification('Text object duplicated', 'success');
    }
    
    /**
     * Bring text object to front
     */
    bringToFront(id) {
        const textObject = this.textObjects.get(id);
        if (!textObject) return;
        
        // Re-render all text objects in order, with this one last (on top)
        this.rerenderAllTextObjects();
        this.renderTextObject(textObject);
        
        this.app.showNotification('Text object brought to front', 'success');
    }
    
    /**
     * Send text object to back
     */
    sendToBack(id) {
        const textObject = this.textObjects.get(id);
        if (!textObject) return;
        
        // Clear all text objects and re-render with this one first
        this.clearAllTextObjectAreas();
        this.renderTextObject(textObject);
        
        // Render all others on top
        for (const obj of this.textObjects.values()) {
            if (obj.id !== id && obj.visible) {
                this.renderTextObject(obj);
            }
        }
        
        this.app.editor.redraw();
        this.app.showNotification('Text object sent to back', 'success');
    }
    
    /**
     * Re-render all text objects
     */
    rerenderAllTextObjects() {
        this.clearAllTextObjectAreas();
        for (const textObject of this.textObjects.values()) {
            if (textObject.visible) {
                this.renderTextObject(textObject);
            }
        }
        this.app.editor.redraw();
    }
    
    /**
     * Clear all text object areas
     */
    clearAllTextObjectAreas() {
        for (const textObject of this.textObjects.values()) {
            this.clearTextObjectArea(textObject);
        }
    }
    
    /**
     * Copy selected text object to clipboard
     */
    copySelectedTextObject() {
        if (!this.selectedObject) return;
        
        const textObject = this.textObjects.get(this.selectedObject);
        if (!textObject) return;
        
        this.clipboardObject = { ...textObject };
        this.app.showNotification('Text object copied', 'success');
    }
    
    /**
     * Paste text object from clipboard
     */
    pasteTextObject() {
        if (!this.clipboardObject) return;
        
        const pastedObject = {
            ...this.clipboardObject,
            id: `text_${this.nextId++}`,
            x: this.clipboardObject.x + 10,
            y: this.clipboardObject.y + 10,
            created: Date.now(),
            modified: Date.now()
        };
        
        this.textObjects.set(pastedObject.id, pastedObject);
        this.renderTextObject(pastedObject);
        this.selectTextObject(pastedObject.id);
        this.updateTextObjectsList();
        
        this.app.showNotification('Text object pasted', 'success');
    }
    
    /**
     * Cleanup - remove all event listeners
     */
    dispose() {
        this.hideContextMenu();
        
        // Event listeners are automatically cleaned up by main app's cleanup system
        // No need to manually remove them as they use addGlobalEventListener
        
        this.textObjects.clear();
        this.selectedObject = null;
        this.dragState = null;
        this.clipboardObject = null;
    }
}