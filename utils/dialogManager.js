/**
 * Dialog Manager - Handles all modal dialogs and their interactions
 */
class DialogManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.globalListeners = []; // Track global listeners for cleanup
        this.setupAllDialogs();
    }

    setupAllDialogs() {
        this.setupNewCanvasDialog();
        this.setupCanvasResizeDialog();
        this.setupCppExportDialog();
        this.setupCppImportDialog();
        this.setupImagePlacementDialog();
        this.setupAboutDialog();
    }

    // Generic method to show any dialog
    showDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.style.display = 'flex';
        }
    }

    // ==== NEW CANVAS DIALOG ====
    setupNewCanvasDialog() {
        const dialog = document.getElementById('new-canvas-dialog');
        const closeBtn = document.getElementById('new-canvas-close-btn');
        const cancelBtn = document.getElementById('new-canvas-cancel-btn');
        const createBtn = document.getElementById('new-canvas-create-btn');
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');
        const presetSelect = document.getElementById('preset-select');
        const swapBtn = document.getElementById('swap-dimensions-btn');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        presetSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                const [width, height] = value.split(',').map(n => parseInt(n));
                widthInput.value = width;
                heightInput.value = height;
            }
        });

        const updatePresetSelection = () => {
            const width = widthInput.value;
            const height = heightInput.value;
            const presetValue = `${width},${height}`;
            
            let foundPreset = false;
            for (let option of presetSelect.options) {
                if (option.value === presetValue) {
                    presetSelect.value = presetValue;
                    foundPreset = true;
                    break;
                }
            }
            
            if (!foundPreset) {
                presetSelect.value = '';
            }
        };

        widthInput.addEventListener('input', updatePresetSelection);
        heightInput.addEventListener('input', updatePresetSelection);

        swapBtn.addEventListener('click', () => {
            const width = widthInput.value;
            const height = heightInput.value;
            widthInput.value = height;
            heightInput.value = width;
            updatePresetSelection();
        });

        createBtn.addEventListener('click', () => {
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            const backgroundColor = document.getElementById('background-color').value;
            
            if (width > 0 && height > 0 && width <= 2048 && height <= 2048) {
                this.app.createNewCanvas(width, height, backgroundColor);
                closeDialog();
            } else {
                this.app.showNotification('Invalid canvas size (1-2048 pixels)', 'error');
            }
        });

        [widthInput, heightInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    createBtn.click();
                }
            });
        });
    }

    showNewCanvasDialog() {
        const dialog = document.getElementById('new-canvas-dialog');
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');
        const presetSelect = document.getElementById('preset-select');
        
        widthInput.value = this.app.editor.width;
        heightInput.value = this.app.editor.height;
        
        const presetValue = `${this.app.editor.width},${this.app.editor.height}`;
        let foundPreset = false;
        for (let option of presetSelect.options) {
            if (option.value === presetValue) {
                presetSelect.value = presetValue;
                foundPreset = true;
                break;
            }
        }
        
        if (!foundPreset) {
            presetSelect.value = '';
        }
        
        dialog.style.display = 'flex';
        widthInput.focus();
    }

    // ==== CANVAS RESIZE DIALOG ====
    setupCanvasResizeDialog() {
        const dialog = document.getElementById('canvas-resize-dialog');
        const closeBtn = document.getElementById('canvas-resize-close-btn');
        const cancelBtn = document.getElementById('canvas-resize-cancel-btn');
        const applyBtn = document.getElementById('canvas-resize-apply-btn');
        const widthInput = document.getElementById('resize-width');
        const heightInput = document.getElementById('resize-height');
        const aspectRatioCheckbox = document.getElementById('maintain-aspect-ratio');
        const presetButtons = document.querySelectorAll('.preset-btn');
        const fillColorSelect = document.getElementById('fill-color');
        const resizeOptions = document.querySelectorAll('input[name="resize-anchor"]');
        const warningSection = document.getElementById('resize-warning');
        const warningText = document.getElementById('resize-warning-text');

        let originalAspectRatio = 1;

        const closeDialog = () => {
            dialog.style.display = 'none';
            warningSection.style.display = 'none';
        };

        const updateWarning = () => {
            const newWidth = parseInt(widthInput.value) || 0;
            const newHeight = parseInt(heightInput.value) || 0;
            const currentWidth = this.app.editor.width;
            const currentHeight = this.app.editor.height;

            if (newWidth <= 0 || newHeight <= 0) {
                warningSection.style.display = 'block';
                warningText.textContent = 'Width and height must be greater than 0';
                return false;
            }

            if (newWidth > 4096 || newHeight > 4096) {
                warningSection.style.display = 'block';
                warningText.textContent = 'Warning: Large canvas sizes may impact performance';
                return true;
            }

            if ((newWidth < currentWidth || newHeight < currentHeight)) {
                warningSection.style.display = 'block';
                warningText.textContent = 'Warning: Reducing canvas size may result in data loss';
                return true;
            }

            warningSection.style.display = 'none';
            return true;
        };

        const updateCurrentSize = () => {
            document.getElementById('current-canvas-width').textContent = this.app.editor.width;
            document.getElementById('current-canvas-height').textContent = this.app.editor.height;
            originalAspectRatio = this.app.editor.width / this.app.editor.height;
        };

        const maintainAspectRatio = (changedInput) => {
            if (!aspectRatioCheckbox.checked) return;

            if (changedInput === widthInput) {
                const newWidth = parseInt(widthInput.value) || 0;
                const newHeight = Math.round(newWidth / originalAspectRatio);
                heightInput.value = newHeight;
            } else {
                const newHeight = parseInt(heightInput.value) || 0;
                const newWidth = Math.round(newHeight * originalAspectRatio);
                widthInput.value = newWidth;
            }
        };

        // Event listeners
        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // Width/height input changes
        widthInput.addEventListener('input', () => {
            maintainAspectRatio(widthInput);
            updateWarning();
        });

        heightInput.addEventListener('input', () => {
            maintainAspectRatio(heightInput);
            updateWarning();
        });

        // Preset buttons
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const [width, height] = btn.dataset.size.split(',').map(n => parseInt(n));
                widthInput.value = width;
                heightInput.value = height;
                updateWarning();

                // Update visual state
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Apply resize
        applyBtn.addEventListener('click', () => {
            if (!updateWarning()) {
                return; // Don't proceed if there are validation errors
            }

            const newWidth = parseInt(widthInput.value);
            const newHeight = parseInt(heightInput.value);
            const fillColor = fillColorSelect.value;
            const resizeAnchor = document.querySelector('input[name="resize-anchor"]:checked').value;

            try {
                this.resizeCanvas(newWidth, newHeight, fillColor, resizeAnchor);
                this.app.showNotification(`Canvas resized to ${newWidth}×${newHeight}`, 'success');
                closeDialog();
            } catch (error) {
                this.app.errorHandler.handleCanvasError(error, 'resize');
            }
        });

        // Enter key support
        [widthInput, heightInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    applyBtn.click();
                }
            });
        });
    }

    showCanvasResizeDialog() {
        const dialog = document.getElementById('canvas-resize-dialog');
        const widthInput = document.getElementById('resize-width');
        const heightInput = document.getElementById('resize-height');
        const aspectRatioCheckbox = document.getElementById('maintain-aspect-ratio');
        const warningSection = document.getElementById('resize-warning');

        // Update current size display
        document.getElementById('current-canvas-width').textContent = this.app.editor.width;
        document.getElementById('current-canvas-height').textContent = this.app.editor.height;

        // Set current values in inputs
        widthInput.value = this.app.editor.width;
        heightInput.value = this.app.editor.height;

        // Reset UI state
        aspectRatioCheckbox.checked = true;
        warningSection.style.display = 'none';

        // Clear preset selection
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));

        dialog.style.display = 'flex';
        widthInput.focus();
    }

    resizeCanvas(newWidth, newHeight, fillColor, resizeAnchor) {
        const oldWidth = this.app.editor.width;
        const oldHeight = this.app.editor.height;

        // If size hasn't changed, just return
        if (newWidth === oldWidth && newHeight === oldHeight) {
            return;
        }

        // Get current bitmap data before resize
        const currentBitmapData = this.app.editor.getBitmapData();

        // Perform the basic resize
        this.app.editor.resize(newWidth, newHeight);

        // Handle advanced resize options (anchor point and fill)
        if (resizeAnchor !== 'top-left' || fillColor !== 'transparent') {
            this.applyAdvancedResizeOptions(currentBitmapData, oldWidth, oldHeight, newWidth, newHeight, fillColor, resizeAnchor);
        }

        // Update UI
        this.app.updateOutput();
        this.app.editor.redraw();

        // Mark as needing auto-save
        if (this.app.markAutoSaveNeeded) {
            this.app.markAutoSaveNeeded();
        }
    }

    applyAdvancedResizeOptions(originalData, oldWidth, oldHeight, newWidth, newHeight, fillColor, resizeAnchor) {
        // Calculate offset for different anchor points
        let offsetX = 0;
        let offsetY = 0;

        switch (resizeAnchor) {
            case 'center':
                offsetX = Math.floor((newWidth - oldWidth) / 2);
                offsetY = Math.floor((newHeight - oldHeight) / 2);
                break;
            case 'bottom-right':
                offsetX = newWidth - oldWidth;
                offsetY = newHeight - oldHeight;
                break;
            // 'top-left' is default (no offset)
        }

        // Clear the canvas with fill color if needed
        if (fillColor !== 'transparent') {
            const fillValue = fillColor === 'black' ? 1 : 0;
            this.app.editor.clear();
            
            if (fillColor === 'black') {
                // Fill with black
                for (let y = 0; y < newHeight; y++) {
                    for (let x = 0; x < newWidth; x++) {
                        this.app.editor.setPixel(x, y, 1);
                    }
                }
            }
            // White fill is already handled by clear()
        }

        // Copy original data to new position
        if (originalData && originalData.pixels) {
            const sourceWidth = Math.min(oldWidth, newWidth - Math.max(0, offsetX));
            const sourceHeight = Math.min(oldHeight, newHeight - Math.max(0, offsetY));
            const sourceStartX = Math.max(0, -offsetX);
            const sourceStartY = Math.max(0, -offsetY);
            const destStartX = Math.max(0, offsetX);
            const destStartY = Math.max(0, offsetY);

            for (let y = 0; y < sourceHeight; y++) {
                for (let x = 0; x < sourceWidth; x++) {
                    const sourceX = sourceStartX + x;
                    const sourceY = sourceStartY + y;
                    const destX = destStartX + x;
                    const destY = destStartY + y;

                    if (sourceX < oldWidth && sourceY < oldHeight && 
                        destX < newWidth && destY < newHeight) {
                        const pixelValue = originalData.pixels[sourceY] ? originalData.pixels[sourceY][sourceX] : 0;
                        this.app.editor.setPixel(destX, destY, pixelValue);
                    }
                }
            }
        }
    }

    // ==== CPP EXPORT DIALOG ====
    setupCppExportDialog() {
        const dialog = document.getElementById('cpp-export-dialog');
        const closeBtn = document.getElementById('cpp-export-close-btn');
        const cancelBtn = document.getElementById('cpp-export-cancel-btn');
        const copyBtn = document.getElementById('cpp-export-copy-btn');
        const arrayNameInput = document.getElementById('array-name-input');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        arrayNameInput.addEventListener('input', () => {
            this.generateCppCode();
        });

        copyBtn.addEventListener('click', async () => {
            const codeTextarea = document.getElementById('cpp-export-code');
            try {
                await navigator.clipboard.writeText(codeTextarea.value);
                this.app.showNotification('Code copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                this.app.showNotification('Failed to copy to clipboard. Please copy manually.', 'error');
            }
        });
    }

    showCppExportDialog() {
        const dialog = document.getElementById('cpp-export-dialog');
        dialog.style.display = 'flex';
        
        this.generateCppCode();
        
        document.getElementById('array-name-input').focus();
    }

    generateCppCode() {
        const arrayName = document.getElementById('array-name-input').value || 'my_bitmap';
        const codeTextarea = document.getElementById('cpp-export-code');
        
        const bitmapData = this.app.editor.getBitmapData();
        const code = BitmapExporter.generateHFile(bitmapData, arrayName);
        
        codeTextarea.value = code;
    }

    // ==== CPP IMPORT DIALOG ====
    setupCppImportDialog() {
        const dialog = document.getElementById('cpp-import-dialog');
        const closeBtn = document.getElementById('cpp-import-close-btn');
        const cancelBtn = document.getElementById('cpp-import-cancel-btn');
        const importBtn = document.getElementById('cpp-import-load-btn');
        const fileInput = document.getElementById('cpp-import-file');
        const codeTextarea = document.getElementById('cpp-import-code');

        const closeDialog = () => {
            dialog.style.display = 'none';
            fileInput.value = '';
            codeTextarea.value = '';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    codeTextarea.value = e.target.result;
                };
                reader.readAsText(file);
            }
        });

        importBtn.addEventListener('click', () => {
            const code = codeTextarea.value.trim();
            if (!code) {
                this.app.showNotification('Please select a file or paste code to import', 'error');
                return;
            }

            try {
                const bitmapData = BitmapExporter.parseHFile(code);
                this.app.editor.loadBitmapData(bitmapData);
                this.app.updateOutput();
                this.app.showNotification('CPP header imported successfully!', 'success');
                closeDialog();
            } catch (error) {
                this.app.errorHandler.handleFileImportError(error);
            }
        });
    }

    showCppImportDialog() {
        const dialog = document.getElementById('cpp-import-dialog');
        dialog.style.display = 'flex';
        
        document.getElementById('cpp-import-file').value = '';
        document.getElementById('cpp-import-code').value = '';
    }

    // ==== IMAGE PLACEMENT DIALOG ====
    setupImagePlacementDialog() {
        const dialog = document.getElementById('image-placement-dialog');
        const closeBtn = document.getElementById('image-placement-close-btn');
        const cancelBtn = document.getElementById('image-placement-cancel-btn');
        const applyBtn = document.getElementById('image-placement-apply-btn');
        const originalSizeBtn = document.getElementById('original-size-btn');
        const fitCanvasBtn = document.getElementById('fit-canvas-btn');
        const thresholdSlider = document.getElementById('threshold-slider');
        const thresholdValue = document.getElementById('threshold-value');
        const previewCanvas = document.getElementById('placement-preview-canvas');

        // Store state for the dialog
        this.imagePlacementState = {
            file: null,
            imageData: null,
            currentWidth: 0,
            currentHeight: 0,
            threshold: 128,
            isResizing: false,
            resizeStartX: 0,
            resizeStartY: 0,
            resizeStartWidth: 0,
            resizeStartHeight: 0,
            resizeDirection: null
        };

        const closeDialog = () => {
            dialog.style.display = 'none';
            this.cleanupImagePlacement();
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // Size option buttons
        originalSizeBtn.addEventListener('click', () => {
            this.setImageToOriginalSize();
            this.updateSizeButtonStates();
        });

        fitCanvasBtn.addEventListener('click', () => {
            this.setImageToFitCanvas();
            this.updateSizeButtonStates();
        });

        // Threshold slider
        thresholdSlider.addEventListener('input', (e) => {
            this.imagePlacementState.threshold = parseInt(e.target.value);
            thresholdValue.textContent = this.imagePlacementState.threshold;
            this.updatePreview();
        });

        // Apply button
        applyBtn.addEventListener('click', () => {
            this.applyImagePlacement();
            closeDialog();
        });

        // Setup resize functionality
        this.setupResizeHandles();
    }

    setupResizeHandles() {
        const handles = document.querySelectorAll('.resize-handle');
        const previewCanvas = document.getElementById('placement-preview-canvas');

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startResize(e, handle.dataset.direction);
            });
        });

        const mouseMoveHandler = (e) => {
            if (this.imagePlacementState.isResizing) {
                this.updateResize(e);
            }
        };

        const mouseUpHandler = () => {
            if (this.imagePlacementState.isResizing) {
                this.endResize();
            }
        };

        // Track listeners for cleanup
        this.addGlobalListener(document, 'mousemove', mouseMoveHandler);
        this.addGlobalListener(document, 'mouseup', mouseUpHandler);
    }

    startResize(e, direction) {
        this.imagePlacementState.isResizing = true;
        this.imagePlacementState.resizeDirection = direction;
        this.imagePlacementState.resizeStartX = e.clientX;
        this.imagePlacementState.resizeStartY = e.clientY;
        this.imagePlacementState.resizeStartWidth = this.imagePlacementState.currentWidth;
        this.imagePlacementState.resizeStartHeight = this.imagePlacementState.currentHeight;
    }

    updateResize(e) {
        if (!this.imagePlacementState.isResizing) return;

        const deltaX = e.clientX - this.imagePlacementState.resizeStartX;
        const deltaY = e.clientY - this.imagePlacementState.resizeStartY;
        const direction = this.imagePlacementState.resizeDirection;

        let newWidth = this.imagePlacementState.resizeStartWidth;
        let newHeight = this.imagePlacementState.resizeStartHeight;

        // Calculate new dimensions based on resize direction
        if (direction.includes('e')) newWidth += deltaX;
        if (direction.includes('w')) newWidth -= deltaX;
        if (direction.includes('s')) newHeight += deltaY;
        if (direction.includes('n')) newHeight -= deltaY;

        // Constrain to minimum size
        newWidth = Math.max(10, newWidth);
        newHeight = Math.max(10, newHeight);

        // Constrain to maximum reasonable size
        newWidth = Math.min(2048, newWidth);
        newHeight = Math.min(2048, newHeight);

        this.imagePlacementState.currentWidth = newWidth;
        this.imagePlacementState.currentHeight = newHeight;

        this.updatePreview();
        this.updateDimensionInfo();
        this.updateSizeButtonStates();
    }

    endResize() {
        this.imagePlacementState.isResizing = false;
        this.imagePlacementState.resizeDirection = null;
    }

    showImagePlacementDialog(file, imageData) {
        const dialog = document.getElementById('image-placement-dialog');
        
        // Store image data
        this.imagePlacementState.file = file;
        this.imagePlacementState.imageData = imageData;
        
        // Set initial size to original dimensions
        this.imagePlacementState.currentWidth = imageData.originalWidth;
        this.imagePlacementState.currentHeight = imageData.originalHeight;
        this.imagePlacementState.threshold = 128;
        
        // Update UI
        this.updateDimensionInfo();
        this.updatePreview();
        this.updateSizeButtonStates();
        
        // Reset threshold slider
        document.getElementById('threshold-slider').value = 128;
        document.getElementById('threshold-value').textContent = '128';
        
        dialog.style.display = 'flex';
    }

    setImageToOriginalSize() {
        const state = this.imagePlacementState;
        state.currentWidth = state.imageData.originalWidth;
        state.currentHeight = state.imageData.originalHeight;
        this.updatePreview();
        this.updateDimensionInfo();
    }

    setImageToFitCanvas() {
        const state = this.imagePlacementState;
        state.currentWidth = this.app.editor.width;
        state.currentHeight = this.app.editor.height;
        this.updatePreview();
        this.updateDimensionInfo();
    }

    updateSizeButtonStates() {
        const state = this.imagePlacementState;
        const originalBtn = document.getElementById('original-size-btn');
        const fitBtn = document.getElementById('fit-canvas-btn');
        
        // Remove active class from both buttons
        originalBtn.classList.remove('active');
        fitBtn.classList.remove('active');
        
        // Add active class based on current size
        if (state.currentWidth === state.imageData.originalWidth && 
            state.currentHeight === state.imageData.originalHeight) {
            originalBtn.classList.add('active');
        } else if (state.currentWidth === this.app.editor.width && 
                   state.currentHeight === this.app.editor.height) {
            fitBtn.classList.add('active');
        }
    }

    updateDimensionInfo() {
        const state = this.imagePlacementState;
        
        document.getElementById('original-dimensions').textContent = 
            `Original: ${state.imageData.originalWidth}×${state.imageData.originalHeight}`;
        document.getElementById('current-dimensions').textContent = 
            `Current: ${state.currentWidth}×${state.currentHeight}`;
        document.getElementById('canvas-dimensions').textContent = 
            `Canvas: ${this.app.editor.width}×${this.app.editor.height}`;
    }

    async updatePreview() {
        const state = this.imagePlacementState;
        const previewCanvas = document.getElementById('placement-preview-canvas');
        const resizeHandles = document.getElementById('resize-handles');
        
        if (!state.imageData || !state.imageData.image) return;

        try {
            // Process the image at current dimensions
            const bitmapData = await ImageImporter.processImageAtSize(
                state.imageData.image,
                state.currentWidth,
                state.currentHeight,
                state.threshold,
                null // No progress callback
            );

            // Set canvas size and draw the processed image
            previewCanvas.width = state.currentWidth;
            previewCanvas.height = state.currentHeight;
            
            const ctx = previewCanvas.getContext('2d');
            const imageData = ctx.createImageData(state.currentWidth, state.currentHeight);
            
            // Convert bitmap to image data
            for (let y = 0; y < state.currentHeight; y++) {
                for (let x = 0; x < state.currentWidth; x++) {
                    const pixelIndex = (y * state.currentWidth + x) * 4;
                    const bitmapValue = bitmapData.pixels[y][x];
                    const color = bitmapValue ? 0 : 255; // 1 = black, 0 = white
                    
                    imageData.data[pixelIndex] = color;     // R
                    imageData.data[pixelIndex + 1] = color; // G
                    imageData.data[pixelIndex + 2] = color; // B
                    imageData.data[pixelIndex + 3] = 255;   // A
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Show resize handles
            resizeHandles.style.display = 'block';
            
        } catch (error) {
            console.error('Preview update error:', error);
        }
    }

    async applyImagePlacement() {
        const state = this.imagePlacementState;
        
        try {
            // Process the image at final dimensions
            const bitmapData = await ImageImporter.processImageAtSize(
                state.imageData.image,
                state.currentWidth,
                state.currentHeight,
                state.threshold,
                null // No progress callback
            );
            
            // Create a new layer for the imported image
            const layerName = `Imported: ${state.file.name.replace(/\.[^/.]+$/, "")}`;
            const newLayer = this.app.editor.addLayer(layerName);
            
            // Load the bitmap data into the new layer
            if (bitmapData.pixels) {
                const maxY = Math.min(bitmapData.height, this.app.editor.height);
                const maxX = Math.min(bitmapData.width, this.app.editor.width);
                const totalPixels = maxY * maxX;
                let processedPixels = 0;
                
                for (let y = 0; y < maxY; y++) {
                    for (let x = 0; x < maxX; x++) {
                        if (bitmapData.pixels[y] && bitmapData.pixels[y][x] !== undefined) {
                            const index = this.app.editor.getPixelIndex(x, y);
                            newLayer.pixels[index] = bitmapData.pixels[y][x];
                        }
                        processedPixels++;
                        
                        // Progress update removed
                    }
                }
            }
            
            // Mark composite as dirty and update display
            this.app.editor.markCompositeDirty();
            this.app.editor.scheduleRender();
            this.app.updateLayersList();
            this.app.updateOutput();
            
            this.app.showNotification(`Image imported to new layer: "${layerName}"`, 'success');
            
        } catch (error) {
            this.app.errorHandler.handleFileImportError(error, this.imagePlacementState.file);
        }
    }

    cleanupImagePlacement() {
        if (this.imagePlacementState.imageData && this.imagePlacementState.imageData.image) {
            URL.revokeObjectURL(this.imagePlacementState.imageData.image.src);
        }
        
        this.imagePlacementState = {
            file: null,
            imageData: null,
            currentWidth: 0,
            currentHeight: 0,
            threshold: 128,
            isResizing: false,
            resizeStartX: 0,
            resizeStartY: 0,
            resizeStartWidth: 0,
            resizeStartHeight: 0,
            resizeDirection: null
        };
    }

    // ==== ABOUT DIALOG ====
    setupAboutDialog() {
        const dialog = document.getElementById('about-dialog');
        const closeBtn = document.getElementById('about-close-btn');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });
    }

    /**
     * Add global event listener and track for cleanup
     */
    addGlobalListener(target, event, handler) {
        target.addEventListener(event, handler);
        this.globalListeners.push({ target, event, handler });
    }

    /**
     * Dispose of all global listeners and cleanup resources
     */
    dispose() {
        this.globalListeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.globalListeners = [];
        this.app = null;
    }
}