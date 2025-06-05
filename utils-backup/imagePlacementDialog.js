class ImagePlacementDialog {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.dialog = null;
        this.canvas = null;
        this.ctx = null;
        this.imageData = null;
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.threshold = 128;
        this.alphaHandling = 'blend';
        this.isResizing = false;
        this.resizeHandle = null;
        this.startResize = null;
        this.processedBitmap = null;
        
        this.setupDialog();
    }

    setupDialog() {
        this.dialog = document.getElementById('image-placement-dialog');
        this.canvas = document.getElementById('placement-preview-canvas');
        
        if (!this.dialog || !this.canvas) {
            console.log('Image placement dialog elements not found, disabling image placement functionality');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close dialog
        const closeBtn = document.getElementById('image-placement-close-btn');
        const cancelBtn = document.getElementById('image-placement-cancel-btn');
        const applyBtn = document.getElementById('image-placement-apply-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyImage();
            });
        }

        // Size buttons
        const originalBtn = document.getElementById('original-size-btn');
        const fitBtn = document.getElementById('fit-canvas-btn');
        
        if (originalBtn) {
            originalBtn.addEventListener('click', () => {
                this.setSizeMode('original');
            });
        }

        if (fitBtn) {
            fitBtn.addEventListener('click', () => {
                this.setSizeMode('stretch');
            });
        }

        // Threshold slider
        const thresholdSlider = document.getElementById('threshold-slider');
        const thresholdValue = document.getElementById('threshold-value');
        
        if (thresholdSlider && thresholdValue) {
            thresholdSlider.addEventListener('input', (e) => {
                this.threshold = parseInt(e.target.value);
                thresholdValue.textContent = this.threshold;
                this.updatePreview();
            });
        }

        // Alpha handling select
        const alphaSelect = document.getElementById('alpha-handling-select');
        if (alphaSelect) {
            alphaSelect.addEventListener('change', (e) => {
                this.alphaHandling = e.target.value;
                this.updatePreview();
            });
        }

        // Resize handles
        this.setupResizeHandles();

        // Close on overlay click
        if (this.dialog) {
            this.dialog.addEventListener('click', (e) => {
                if (e.target === this.dialog) {
                    this.hide();
                }
            });
        }
    }

    setupResizeHandles() {
        const handles = document.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startResize = {
                    x: e.clientX,
                    y: e.clientY,
                    width: this.currentWidth,
                    height: this.currentHeight
                };
                this.resizeHandle = handle.dataset.direction;
                this.isResizing = true;
                
                document.addEventListener('mousemove', this.handleResize);
                document.addEventListener('mouseup', this.handleResizeEnd);
            });
        });
    }

    handleResize = (e) => {
        if (!this.isResizing || !this.startResize) return;
        
        const deltaX = e.clientX - this.startResize.x;
        const deltaY = e.clientY - this.startResize.y;
        
        let newWidth = this.startResize.width;
        let newHeight = this.startResize.height;
        
        const aspectRatio = this.originalWidth / this.originalHeight;
        
        // Calculate new dimensions based on resize handle
        switch (this.resizeHandle) {
            case 'se':
                newWidth = Math.max(10, this.startResize.width + deltaX);
                newHeight = Math.max(10, this.startResize.height + deltaY);
                break;
            case 'sw':
                newWidth = Math.max(10, this.startResize.width - deltaX);
                newHeight = Math.max(10, this.startResize.height + deltaY);
                break;
            case 'ne':
                newWidth = Math.max(10, this.startResize.width + deltaX);
                newHeight = Math.max(10, this.startResize.height - deltaY);
                break;
            case 'nw':
                newWidth = Math.max(10, this.startResize.width - deltaX);
                newHeight = Math.max(10, this.startResize.height - deltaY);
                break;
            case 'e':
                newWidth = Math.max(10, this.startResize.width + deltaX);
                newHeight = newWidth / aspectRatio;
                break;
            case 'w':
                newWidth = Math.max(10, this.startResize.width - deltaX);
                newHeight = newWidth / aspectRatio;
                break;
            case 'n':
                newHeight = Math.max(10, this.startResize.height - deltaY);
                newWidth = newHeight * aspectRatio;
                break;
            case 's':
                newHeight = Math.max(10, this.startResize.height + deltaY);
                newWidth = newHeight * aspectRatio;
                break;
        }
        
        // Maintain aspect ratio for corner handles by default
        if (['se', 'sw', 'ne', 'nw'].includes(this.resizeHandle)) {
            const widthRatio = newWidth / this.startResize.width;
            const heightRatio = newHeight / this.startResize.height;
            const ratio = Math.min(widthRatio, heightRatio);
            
            newWidth = this.startResize.width * ratio;
            newHeight = this.startResize.height * ratio;
        }
        
        this.currentWidth = Math.round(newWidth);
        this.currentHeight = Math.round(newHeight);
        
        this.updateCanvas();
        this.updateDimensionInfo();
        this.updatePreview();
    };

    handleResizeEnd = () => {
        this.isResizing = false;
        this.resizeHandle = null;
        this.startResize = null;
        
        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.handleResizeEnd);
        
        // Update button states
        this.updateSizeButtonStates();
    };

    async show(imageData) {
        if (!this.dialog) {
            console.warn('Image placement dialog not available');
            return;
        }
        
        this.imageData = imageData;
        this.originalWidth = imageData.width;
        this.originalHeight = imageData.height;
        this.canvasWidth = this.app.editor.width;
        this.canvasHeight = this.app.editor.height;
        
        // Start with original size
        this.setSizeMode('original');
        
        // Update dimension info
        this.updateDimensionInfo();
        
        // Reset UI controls
        const thresholdSlider = document.getElementById('threshold-slider');
        const thresholdValue = document.getElementById('threshold-value');
        const alphaSelect = document.getElementById('alpha-handling-select');
        
        if (thresholdSlider && thresholdValue) {
            thresholdSlider.value = this.threshold;
            thresholdValue.textContent = this.threshold;
        }
        
        if (alphaSelect) {
            alphaSelect.value = this.alphaHandling;
        }
        
        // Show dialog
        this.dialog.style.display = 'flex';
        
        // Update preview
        await this.updatePreview();
    }

    hide() {
        if (this.dialog) {
            this.dialog.style.display = 'none';
        }
        this.imageData = null;
        this.processedBitmap = null;
    }

    setSizeMode(mode) {
        if (mode === 'original') {
            this.currentWidth = this.originalWidth;
            this.currentHeight = this.originalHeight;
        } else if (mode === 'stretch') {
            this.currentWidth = this.canvasWidth;
            this.currentHeight = this.canvasHeight;
        }
        
        this.updateCanvas();
        this.updateDimensionInfo();
        this.updateSizeButtonStates();
        this.updatePreview();
    }

    updateSizeButtonStates() {
        const originalBtn = document.getElementById('original-size-btn');
        const stretchBtn = document.getElementById('fit-canvas-btn');
        
        if (originalBtn) {
            originalBtn.classList.remove('active');
            // Check if current size matches original
            if (this.currentWidth === this.originalWidth && this.currentHeight === this.originalHeight) {
                originalBtn.classList.add('active');
            }
        }
        
        if (stretchBtn) {
            stretchBtn.classList.remove('active');
            // Check if current size matches canvas
            if (this.currentWidth === this.canvasWidth && this.currentHeight === this.canvasHeight) {
                stretchBtn.classList.add('active');
            }
        }
        // If neither, no button is active (custom size)
    }

    updateCanvas() {
        // Set canvas size to show the image preview
        const maxDisplayWidth = 400;
        const maxDisplayHeight = 300;
        
        const scale = Math.min(
            maxDisplayWidth / this.currentWidth,
            maxDisplayHeight / this.currentHeight,
            1
        );
        
        this.canvas.width = this.currentWidth * scale;
        this.canvas.height = this.currentHeight * scale;
        
        // Position resize handles
        this.positionResizeHandles();
    }

    positionResizeHandles() {
        const handles = document.getElementById('resize-handles');
        if (!handles || !this.canvas) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvas.parentElement.getBoundingClientRect();
        
        const left = canvasRect.left - containerRect.left;
        const top = canvasRect.top - containerRect.top;
        const width = canvasRect.width;
        const height = canvasRect.height;
        
        handles.style.left = left + 'px';
        handles.style.top = top + 'px';
        handles.style.width = width + 'px';
        handles.style.height = height + 'px';
        handles.style.display = 'block';
    }

    async updatePreview() {
        if (!this.imageData) return;
        
        try {
            // Process image at current size with current threshold and alpha handling
            this.processedBitmap = await ImageImporter.processImageAtSize(
                this.imageData, 
                this.currentWidth, 
                this.currentHeight, 
                this.threshold,
                this.alphaHandling
            );
            
            // Clear canvas
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw processed bitmap
            const scaleX = this.canvas.width / this.currentWidth;
            const scaleY = this.canvas.height / this.currentHeight;
            
            this.ctx.fillStyle = '#000000';
            for (let y = 0; y < this.currentHeight; y++) {
                for (let x = 0; x < this.currentWidth; x++) {
                    if (this.processedBitmap.pixels[y][x] === 1) {
                        this.ctx.fillRect(
                            x * scaleX,
                            y * scaleY,
                            scaleX,
                            scaleY
                        );
                    }
                }
            }
            
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }

    updateDimensionInfo() {
        const originalDims = document.getElementById('original-dimensions');
        const currentDims = document.getElementById('current-dimensions');
        const canvasDims = document.getElementById('canvas-dimensions');
        
        if (originalDims) {
            originalDims.textContent = `Original: ${this.originalWidth} × ${this.originalHeight}`;
        }
        if (currentDims) {
            currentDims.textContent = `Current: ${this.currentWidth} × ${this.currentHeight}`;
        }
        if (canvasDims) {
            canvasDims.textContent = `Canvas: ${this.canvasWidth} × ${this.canvasHeight}`;
        }
    }

    async applyImage() {
        if (!this.processedBitmap) {
            this.app.showNotification('No image data to apply', 'error');
            return;
        }
        
        try {
            // Create a new layer for the imported image
            const layerName = `Imported Image ${this.currentWidth}×${this.currentHeight}`;
            const newLayer = this.app.editor.addLayer(layerName);
            
            // Load the bitmap data into the new layer
            for (let y = 0; y < Math.min(this.processedBitmap.height, this.app.editor.height); y++) {
                for (let x = 0; x < Math.min(this.processedBitmap.width, this.app.editor.width); x++) {
                    if (this.processedBitmap.pixels[y] && this.processedBitmap.pixels[y][x] !== undefined) {
                        const index = this.app.editor.getPixelIndex(x, y);
                        newLayer.pixels[index] = this.processedBitmap.pixels[y][x];
                    }
                }
            }
            
            // Mark composite as dirty and update display
            this.app.editor.markCompositeDirty();
            this.app.editor.scheduleRender();
            this.app.updateLayersList();
            this.app.updateOutput();
            
            this.app.showNotification(`Image applied to new layer: "${layerName}"`, 'success');
            this.hide();
            
        } catch (error) {
            console.error('Error applying image:', error);
            this.app.showNotification('Failed to apply image: ' + error.message, 'error');
        }
    }
}