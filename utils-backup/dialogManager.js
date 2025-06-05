/**
 * Dialog Manager - Handles all modal dialogs and their interactions
 */
class DialogManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.setupAllDialogs();
    }

    setupAllDialogs() {
        this.setupNewCanvasDialog();
        this.setupCppExportDialog();
        this.setupCppImportDialog();
        this.setupImagePlacementDialog();
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
            
            if (width > 0 && height > 0 && width <= 2048 && height <= 2048) {
                this.app.createNewCanvas(width, height);
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
        const code = U8G2Exporter.generateHFile(bitmapData, arrayName);
        
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
                const bitmapData = U8G2Exporter.parseHFile(code);
                this.app.editor.loadBitmapData(bitmapData);
                this.app.updateOutput();
                this.app.showNotification('CPP header imported successfully!', 'success');
                closeDialog();
            } catch (error) {
                console.error('Import error:', error);
                this.app.showNotification('Failed to import code: ' + error.message, 'error');
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

        document.addEventListener('mousemove', (e) => {
            if (this.imagePlacementState.isResizing) {
                this.updateResize(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.imagePlacementState.isResizing) {
                this.endResize();
            }
        });
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
                state.threshold
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
            this.app.showNotification('Processing image...', 'info');
            
            // Process the image at final dimensions
            const bitmapData = await ImageImporter.processImageAtSize(
                state.imageData.image,
                state.currentWidth,
                state.currentHeight,
                state.threshold
            );
            
            // Create a new layer for the imported image
            const layerName = `Imported: ${state.file.name.replace(/\.[^/.]+$/, "")}`;
            const newLayer = this.app.editor.addLayer(layerName);
            
            // Load the bitmap data into the new layer
            if (bitmapData.pixels) {
                for (let y = 0; y < Math.min(bitmapData.height, this.app.editor.height); y++) {
                    for (let x = 0; x < Math.min(bitmapData.width, this.app.editor.width); x++) {
                        if (bitmapData.pixels[y] && bitmapData.pixels[y][x] !== undefined) {
                            const index = this.app.editor.getPixelIndex(x, y);
                            newLayer.pixels[index] = bitmapData.pixels[y][x];
                        }
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
            console.error('Image placement error:', error);
            this.app.showNotification('Failed to place image: ' + error.message, 'error');
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
}