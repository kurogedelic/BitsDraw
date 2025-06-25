/**
 * Custom Font Manager - Manages user-uploaded bitmap fonts
 * Part of Advanced Text Tool System Phase 3
 */
class CustomFontManager {
    constructor(textRenderer) {
        this.textRenderer = textRenderer;
        this.customFonts = new Map(); // ID -> Custom Font
        this.nextFontId = 1;
        this.storageKey = 'bitsdraw-custom-fonts';
        
        // Supported font formats
        this.supportedFormats = {
            // BitsDraw JSON format (recommended)
            'bitsdraw-json': {
                name: 'BitsDraw JSON Font',
                extension: '.json',
                description: 'BitsDraw native bitmap font format',
                mimeType: 'application/json'
            },
            // BMF format support
            'bmf-json': {
                name: 'BMF JSON Font',
                extension: '.json',
                description: 'BMF bitmap font format with JSON configuration',
                mimeType: 'application/json'
            },
            // Simple bitmap array format
            'simple-bitmap': {
                name: 'Simple Bitmap Array',
                extension: '.json',
                description: 'Simple character array format',
                mimeType: 'application/json'
            }
        };
        
        this.loadCustomFonts();
    }
    
    /**
     * Show font upload dialog
     */
    showFontUploadDialog() {
        const dialog = this.createFontUploadDialog();
        document.body.appendChild(dialog);
        dialog.style.display = 'flex';
    }
    
    /**
     * Create font upload dialog
     */
    createFontUploadDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'font-upload-dialog';
        dialog.className = 'modal-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Upload Custom Font</h3>
                    <button class="modal-close" id="font-upload-close">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="font-upload-section">
                        <div class="upload-area" id="font-upload-area">
                            <div class="upload-icon">
                                <i class="ph ph-upload-simple"></i>
                            </div>
                            <div class="upload-text">
                                <h4>Drop font file here or click to browse</h4>
                                <p>Supported formats: JSON (.json)</p>
                            </div>
                            <input type="file" id="font-file-input" accept=".json" style="display: none;">
                        </div>
                    </div>
                    
                    <div class="font-info-section" id="font-info-section" style="display: none;">
                        <h4>Font Information</h4>
                        <div class="font-preview" id="font-preview">
                            <canvas id="font-preview-canvas" width="400" height="100"></canvas>
                        </div>
                        <div class="font-details" id="font-details">
                            <!-- Font details will be populated here -->
                        </div>
                        <div class="input-section">
                            <label for="font-name-input">Font Name:</label>
                            <input type="text" id="font-name-input" placeholder="My Custom Font" maxlength="50">
                        </div>
                    </div>
                    
                    <div class="format-help-section">
                        <h4>Supported Font Formats</h4>
                        <div class="format-list">
                            <div class="format-item">
                                <strong>BitsDraw JSON Format</strong>
                                <p>Native format with character bitmap arrays</p>
                                <button class="btn-link" id="show-bitsdraw-example">View Example</button>
                            </div>
                            <div class="format-item">
                                <strong>Simple Bitmap Array</strong>
                                <p>Basic character-to-bitmap mapping</p>
                                <button class="btn-link" id="show-simple-example">View Example</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="font-upload-cancel" class="btn-secondary">Cancel</button>
                    <button id="font-upload-create" class="btn-primary" disabled>Add Font</button>
                </div>
            </div>
        `;
        
        // Setup event handlers
        this.setupFontUploadEvents(dialog);
        
        return dialog;
    }
    
    /**
     * Setup font upload dialog events
     */
    setupFontUploadEvents(dialog) {
        const uploadArea = dialog.querySelector('#font-upload-area');
        const fileInput = dialog.querySelector('#font-file-input');
        const closeBtn = dialog.querySelector('#font-upload-close');
        const cancelBtn = dialog.querySelector('#font-upload-cancel');
        const createBtn = dialog.querySelector('#font-upload-create');
        
        // File input handling
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processFontFile(file, dialog);
            }
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                this.processFontFile(file, dialog);
            }
        });
        
        // Dialog controls
        closeBtn.addEventListener('click', () => this.closeFontUploadDialog(dialog));
        cancelBtn.addEventListener('click', () => this.closeFontUploadDialog(dialog));
        createBtn.addEventListener('click', () => this.createCustomFont(dialog));
        
        // Example buttons
        dialog.querySelector('#show-bitsdraw-example').addEventListener('click', () => {
            this.showFormatExample('bitsdraw');
        });
        
        dialog.querySelector('#show-simple-example').addEventListener('click', () => {
            this.showFormatExample('simple');
        });
        
        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.closeFontUploadDialog(dialog);
            }
        });
    }
    
    /**
     * Process uploaded font file
     */
    async processFontFile(file, dialog) {
        try {
            const text = await file.text();
            const fontData = JSON.parse(text);
            
            // Validate font format
            const format = this.detectFontFormat(fontData);
            if (!format) {
                throw new Error('Unsupported font format. Please check the format requirements.');
            }
            
            // Convert to standard format
            const standardFont = this.convertToStandardFormat(fontData, format);
            
            // Validate font data
            this.validateFontData(standardFont);
            
            // Show font information
            this.showFontInfo(standardFont, dialog);
            
            // Store for creation
            this.pendingFont = {
                data: standardFont,
                originalFile: file.name,
                format: format
            };
            
            // Enable create button
            dialog.querySelector('#font-upload-create').disabled = false;
            
        } catch (error) {
            this.showError(`Failed to process font file: ${error.message}`);
        }
    }
    
    /**
     * Detect font format from data
     */
    detectFontFormat(data) {
        // BitsDraw JSON format
        if (data.format === 'bitsdraw-bitmap' && data.metadata && data.characters) {
            return 'bitsdraw-json';
        }
        
        // Simple bitmap array format
        if (data.characters && typeof data.characters === 'object') {
            const firstChar = Object.values(data.characters)[0];
            if (Array.isArray(firstChar) && Array.isArray(firstChar[0])) {
                return 'simple-bitmap';
            }
        }
        
        // BMF format detection
        if (data.font && data.glyphs) {
            return 'bmf-json';
        }
        
        return null;
    }
    
    /**
     * Convert font data to standard BitsDraw format
     */
    convertToStandardFormat(data, format) {
        switch (format) {
            case 'bitsdraw-json':
                return data; // Already in standard format
                
            case 'simple-bitmap':
                return {
                    format: 'bitsdraw-bitmap',
                    version: '1.0',
                    metadata: {
                        name: data.name || 'Custom Font',
                        width: this.calculateFontWidth(data.characters),
                        height: this.calculateFontHeight(data.characters),
                        spacing: data.spacing || 1,
                        description: data.description || 'Imported custom font'
                    },
                    characters: data.characters
                };
                
            case 'bmf-json':
                return this.convertBMFToStandard(data);
                
            default:
                throw new Error('Unknown font format');
        }
    }
    
    /**
     * Calculate font width from character data
     */
    calculateFontWidth(characters) {
        let maxWidth = 0;
        for (const char of Object.values(characters)) {
            if (Array.isArray(char) && char.length > 0) {
                maxWidth = Math.max(maxWidth, char[0].length);
            }
        }
        return maxWidth;
    }
    
    /**
     * Calculate font height from character data
     */
    calculateFontHeight(characters) {
        let maxHeight = 0;
        for (const char of Object.values(characters)) {
            if (Array.isArray(char)) {
                maxHeight = Math.max(maxHeight, char.length);
            }
        }
        return maxHeight;
    }
    
    /**
     * Validate font data structure
     */
    validateFontData(fontData) {
        if (!fontData.characters || typeof fontData.characters !== 'object') {
            throw new Error('Font must contain character definitions');
        }
        
        if (Object.keys(fontData.characters).length === 0) {
            throw new Error('Font must contain at least one character');
        }
        
        // Validate character data
        for (const [char, bitmap] of Object.entries(fontData.characters)) {
            if (!Array.isArray(bitmap)) {
                throw new Error(`Character '${char}' must have bitmap array`);
            }
            
            if (bitmap.length === 0) {
                throw new Error(`Character '${char}' bitmap cannot be empty`);
            }
            
            // Check that all rows have same width
            const width = bitmap[0].length;
            for (let i = 1; i < bitmap.length; i++) {
                if (!Array.isArray(bitmap[i]) || bitmap[i].length !== width) {
                    throw new Error(`Character '${char}' has inconsistent row width`);
                }
            }
            
            // Validate pixel values (0 or 1)
            for (const row of bitmap) {
                for (const pixel of row) {
                    if (pixel !== 0 && pixel !== 1) {
                        throw new Error(`Character '${char}' contains invalid pixel value: ${pixel}`);
                    }
                }
            }
        }
        
        // Check font dimensions
        const metadata = fontData.metadata;
        if (metadata.width > 32 || metadata.height > 32) {
            throw new Error('Font dimensions cannot exceed 32x32 pixels per character');
        }
        
        if (metadata.width < 1 || metadata.height < 1) {
            throw new Error('Font dimensions must be at least 1x1 pixel');
        }
    }
    
    /**
     * Show font information in dialog
     */
    showFontInfo(fontData, dialog) {
        const infoSection = dialog.querySelector('#font-info-section');
        const detailsDiv = dialog.querySelector('#font-details');
        const nameInput = dialog.querySelector('#font-name-input');
        
        // Populate font details
        const metadata = fontData.metadata;
        const charCount = Object.keys(fontData.characters).length;
        
        detailsDiv.innerHTML = `
            <div class="font-detail-item">
                <strong>Dimensions:</strong> ${metadata.width}×${metadata.height} pixels
            </div>
            <div class="font-detail-item">
                <strong>Characters:</strong> ${charCount} defined
            </div>
            <div class="font-detail-item">
                <strong>Spacing:</strong> ${metadata.spacing} pixel(s)
            </div>
            <div class="font-detail-item">
                <strong>Sample Characters:</strong> ${Object.keys(fontData.characters).slice(0, 10).join(', ')}
            </div>
        `;
        
        // Set default name
        nameInput.value = metadata.name || 'Custom Font';
        
        // Render font preview
        this.renderFontPreview(fontData, dialog.querySelector('#font-preview-canvas'));
        
        infoSection.style.display = 'block';
    }
    
    /**
     * Render font preview on canvas
     */
    renderFontPreview(fontData, canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up preview parameters
        const scale = 3; // Preview scale
        const sampleText = 'ABCabc123!@#';
        let x = 10;
        const y = 30;
        
        // Render sample characters
        for (const char of sampleText) {
            const bitmap = fontData.characters[char];
            if (bitmap) {
                this.renderCharacterPreview(ctx, bitmap, x, y, scale);
                x += (fontData.metadata.width + fontData.metadata.spacing) * scale;
                
                // Break if too wide
                if (x > canvas.width - 50) break;
            }
        }
        
        // Add preview text label
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.fillText(`Preview: ${fontData.metadata.name}`, 10, canvas.height - 10);
    }
    
    /**
     * Render single character preview
     */
    renderCharacterPreview(ctx, bitmap, x, y, scale) {
        ctx.fillStyle = '#000';
        
        for (let row = 0; row < bitmap.length; row++) {
            for (let col = 0; col < bitmap[row].length; col++) {
                if (bitmap[row][col] === 1) {
                    ctx.fillRect(
                        x + col * scale,
                        y + row * scale,
                        scale,
                        scale
                    );
                }
            }
        }
    }
    
    /**
     * Create custom font from dialog data
     */
    createCustomFont(dialog) {
        try {
            const nameInput = dialog.querySelector('#font-name-input');
            const fontName = nameInput.value.trim();
            
            if (!fontName) {
                throw new Error('Font name is required');
            }
            
            if (!this.pendingFont) {
                throw new Error('No font data to create');
            }
            
            // Create font ID
            const fontId = `custom-${this.nextFontId++}`;
            
            // Create custom font object
            const customFont = {
                id: fontId,
                name: fontName,
                data: this.pendingFont.data,
                originalFile: this.pendingFont.originalFile,
                format: this.pendingFont.format,
                created: Date.now(),
                modified: Date.now()
            };
            
            // Add to collection
            this.customFonts.set(fontId, customFont);
            
            // Register with TextRenderer
            this.registerCustomFont(customFont);
            
            // Save to storage
            this.saveCustomFonts();
            
            // Close dialog
            this.closeFontUploadDialog(dialog);
            
            // Show success message
            this.textRenderer.app.showNotification(`Custom font "${fontName}" added successfully!`, 'success');
            
            // Update font selection UI
            this.updateFontSelectionUI();
            
            // Trigger update callback
            if (this.onUpdate) {
                this.onUpdate();
            }
            
        } catch (error) {
            this.showError(`Failed to create font: ${error.message}`);
        }
    }
    
    /**
     * Register custom font with TextRenderer
     */
    registerCustomFont(customFont) {
        const fontData = customFont.data;
        const fontId = customFont.id;
        
        // Add to TextRenderer fonts collection
        this.textRenderer.constructor.fonts[fontId] = {
            name: customFont.name,
            width: fontData.metadata.width,
            height: fontData.metadata.height,
            spacing: fontData.metadata.spacing,
            data: fontData.characters,
            custom: true // Mark as custom font
        };
    }
    
    /**
     * Update font selection UI
     */
    updateFontSelectionUI() {
        // Update all font selection dropdowns
        const fontSelects = document.querySelectorAll('select[id*="font"]');
        
        fontSelects.forEach(select => {
            // Remove existing custom options
            const existingCustomOptions = select.querySelectorAll('option[data-custom="true"]');
            existingCustomOptions.forEach(option => option.remove());
            
            // Add custom fonts
            for (const [fontId, customFont] of this.customFonts) {
                const option = document.createElement('option');
                option.value = fontId;
                option.textContent = customFont.name;
                option.setAttribute('data-custom', 'true');
                select.appendChild(option);
            }
        });
    }
    
    /**
     * Save custom fonts to localStorage
     */
    saveCustomFonts() {
        try {
            const fontsData = {};
            for (const [id, font] of this.customFonts) {
                fontsData[id] = font;
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(fontsData));
        } catch (error) {
            console.warn('Failed to save custom fonts:', error);
        }
    }
    
    /**
     * Load custom fonts from localStorage
     */
    loadCustomFonts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const fontsData = JSON.parse(stored);
                
                for (const [id, font] of Object.entries(fontsData)) {
                    this.customFonts.set(id, font);
                    this.registerCustomFont(font);
                    
                    // Update next ID counter
                    const idNum = parseInt(id.replace('custom-', '')) || 0;
                    this.nextFontId = Math.max(this.nextFontId, idNum + 1);
                }
                
                // Update UI if fonts were loaded
                if (this.customFonts.size > 0) {
                    setTimeout(() => this.updateFontSelectionUI(), 100);
                }
            }
        } catch (error) {
            console.warn('Failed to load custom fonts:', error);
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.textRenderer.app.showNotification(message, 'error');
    }
    
    /**
     * Close font upload dialog
     */
    closeFontUploadDialog(dialog) {
        dialog.style.display = 'none';
        document.body.removeChild(dialog);
        this.pendingFont = null;
    }
    
    /**
     * Show font format example
     */
    showFormatExample(format) {
        // This will open a separate dialog with format examples
        // Implementation to be added based on user needs
        console.log(`Show ${format} format example`);
    }
    
    /**
     * Delete custom font
     */
    deleteCustomFont(fontId) {
        const customFont = this.customFonts.get(fontId);
        if (!customFont) return;
        
        if (confirm(`Delete custom font "${customFont.name}"?`)) {
            // Remove from collection
            this.customFonts.delete(fontId);
            
            // Remove from TextRenderer
            delete this.textRenderer.constructor.fonts[fontId];
            
            // Save to storage
            this.saveCustomFonts();
            
            // Update UI
            this.updateFontSelectionUI();
            
            // Trigger update callback
            if (this.onUpdate) {
                this.onUpdate();
            }
            
            this.textRenderer.app.showNotification(`Font "${customFont.name}" deleted`, 'success');
        }
    }
    
    /**
     * Get all custom fonts
     */
    getAllCustomFonts() {
        return Array.from(this.customFonts.values());
    }
    
    /**
     * Export custom fonts
     */
    exportCustomFonts() {
        if (this.customFonts.size === 0) {
            this.showError('No custom fonts to export');
            return;
        }
        
        const exportData = {
            format: 'bitsdraw-font-collection',
            version: '1.0',
            exported: Date.now(),
            fonts: Array.from(this.customFonts.values())
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom-fonts-${Date.now()}.json`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.textRenderer.app.showNotification(`Exported ${this.customFonts.size} custom fonts`, 'success');
    }
}