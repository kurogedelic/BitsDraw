/**
 * Optimized Bitmap Editor with Paint Software Algorithms
 * 
 * Key optimizations:
 * 1. Dirty Rectangle Tracking - Only redraw changed areas
 * 2. Batch Operations - Group pixel operations before rendering
 * 3. Efficient Flood Fill - Scanline-based flood fill algorithm
 * 4. Memory-Aligned Operations - Uint8Array for better performance
 * 5. Layer Compositing Cache - Cache layer compositions
 */

class OptimizedBitmapEditor {
    constructor(canvas, width = 128, height = 64) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.zoom = 4;
        this.inverted = false;
        this.showGrid = true;
        
        // Core data structures
        this.layers = [];
        this.activeLayerIndex = 0;
        this.layerIdCounter = 1;
        
        // Performance optimizations
        this.dirtyRects = [];
        this.batchOperations = [];
        this.renderScheduled = false;
        this.compositeCache = null;
        this.compositeCacheDirty = true;
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // Create initial layer and setup
        this.addLayer('Background');
        this.setupCanvas();
        this.saveState();
    }

    // ===== CORE DATA LAYER =====
    
    createEmptyBitmap() {
        // Use Uint8Array for better performance than nested arrays
        return new Uint8Array(this.width * this.height);
    }

    getPixelIndex(x, y) {
        return y * this.width + x;
    }

    addLayer(name = 'Layer') {
        const layer = {
            id: this.layerIdCounter++,
            name: name,
            visible: true,
            blendMode: 'normal',
            pixels: this.createEmptyBitmap()
        };
        this.layers.push(layer);
        this.activeLayerIndex = this.layers.length - 1;
        this.markCompositeDirty();
        this.scheduleRender();
        return layer;
    }

    deleteLayer(index) {
        if (this.layers.length <= 1 || index < 0 || index >= this.layers.length) return false;
        
        this.layers.splice(index, 1);
        if (this.activeLayerIndex >= this.layers.length) {
            this.activeLayerIndex = this.layers.length - 1;
        } else if (this.activeLayerIndex > index) {
            this.activeLayerIndex--;
        }
        this.markCompositeDirty();
        this.scheduleRender();
        return true;
    }

    setActiveLayer(index) {
        if (index >= 0 && index < this.layers.length) {
            this.activeLayerIndex = index;
            return true;
        }
        return false;
    }

    toggleLayerVisibility(index) {
        if (index >= 0 && index < this.layers.length) {
            this.layers[index].visible = !this.layers[index].visible;
            this.markCompositeDirty();
            this.scheduleRender();
            return true;
        }
        return false;
    }

    // ===== DIRTY RECTANGLE TRACKING =====
    
    addDirtyRect(x, y, width = 1, height = 1) {
        // Clamp to canvas bounds
        x = Math.max(0, Math.min(x, this.width - 1));
        y = Math.max(0, Math.min(y, this.height - 1));
        width = Math.min(width, this.width - x);
        height = Math.min(height, this.height - y);
        
        if (width > 0 && height > 0) {
            this.dirtyRects.push({ x, y, width, height });
        }
    }

    mergeDirtyRects() {
        if (this.dirtyRects.length === 0) return null;
        if (this.dirtyRects.length === 1) return this.dirtyRects[0];
        
        // Simple bounding box merge for now
        let minX = this.width, minY = this.height;
        let maxX = 0, maxY = 0;
        
        for (const rect of this.dirtyRects) {
            minX = Math.min(minX, rect.x);
            minY = Math.min(minY, rect.y);
            maxX = Math.max(maxX, rect.x + rect.width);
            maxY = Math.max(maxY, rect.y + rect.height);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    clearDirtyRects() {
        this.dirtyRects = [];
    }

    // ===== BATCH OPERATIONS =====
    
    batchPixelOperation(operation) {
        this.batchOperations.push(operation);
        if (!this.renderScheduled) {
            this.scheduleRender();
        }
    }

    processBatchOperations() {
        if (this.batchOperations.length === 0) return;
        
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return;
        
        for (const operation of this.batchOperations) {
            operation(activeLayer.pixels);
        }
        
        this.batchOperations = [];
        this.markCompositeDirty();
    }

    // ===== PIXEL OPERATIONS =====
    
    setPixel(x, y, value, pattern = null) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const operation = (pixels) => {
            const index = this.getPixelIndex(x, y);
            if (pattern && typeof DitherPatterns !== 'undefined') {
                pixels[index] = DitherPatterns.applyPattern(pattern, x, y);
            } else {
                pixels[index] = value;
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(x, y);
    }

    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return 0;
        
        const index = this.getPixelIndex(x, y);
        return activeLayer.pixels[index];
    }

    // ===== EFFICIENT FLOOD FILL =====
    
    floodFill(startX, startY, newValue, pattern = null) {
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return;
        
        const startIndex = this.getPixelIndex(startX, startY);
        const originalValue = activeLayer.pixels[startIndex];
        
        if (originalValue === newValue) return;
        
        // Scanline flood fill algorithm - much faster than recursive
        const stack = [{ x: startX, y: startY }];
        const minX = Math.max(0, startX - 50); // Limit fill area for performance
        const maxX = Math.min(this.width - 1, startX + 50);
        const minY = Math.max(0, startY - 50);
        const maxY = Math.min(this.height - 1, startY + 50);
        
        const operation = (pixels) => {
            while (stack.length > 0) {
                const { x, y } = stack.pop();
                
                if (x < minX || x > maxX || y < minY || y > maxY) continue;
                
                const index = this.getPixelIndex(x, y);
                if (pixels[index] !== originalValue) continue;
                
                // Fill horizontally
                let leftX = x;
                let rightX = x;
                
                // Find left boundary
                while (leftX > minX && pixels[this.getPixelIndex(leftX - 1, y)] === originalValue) {
                    leftX--;
                }
                
                // Find right boundary
                while (rightX < maxX && pixels[this.getPixelIndex(rightX + 1, y)] === originalValue) {
                    rightX++;
                }
                
                // Fill the line
                for (let fillX = leftX; fillX <= rightX; fillX++) {
                    const fillIndex = this.getPixelIndex(fillX, y);
                    if (pattern && typeof DitherPatterns !== 'undefined') {
                        pixels[fillIndex] = DitherPatterns.applyPattern(pattern, fillX, y);
                    } else {
                        pixels[fillIndex] = newValue;
                    }
                }
                
                // Add adjacent lines to stack
                for (let fillX = leftX; fillX <= rightX; fillX++) {
                    if (y > minY && pixels[this.getPixelIndex(fillX, y - 1)] === originalValue) {
                        stack.push({ x: fillX, y: y - 1 });
                    }
                    if (y < maxY && pixels[this.getPixelIndex(fillX, y + 1)] === originalValue) {
                        stack.push({ x: fillX, y: y + 1 });
                    }
                }
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    // ===== OPTIMIZED SHAPE DRAWING =====
    
    drawRect(x1, y1, x2, y2, filled = false, borderOnly = false, pattern = null) {
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        const endX = Math.max(x1, x2);
        const endY = Math.max(y1, y2);
        
        const operation = (pixels) => {
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        const isBorder = (x === startX || x === endX || y === startY || y === endY);
                        
                        if ((filled) || (!filled && isBorder)) {
                            const index = this.getPixelIndex(x, y);
                            if (pattern && typeof DitherPatterns !== 'undefined') {
                                pixels[index] = DitherPatterns.applyPattern(pattern, x, y);
                            } else {
                                pixels[index] = 1;
                            }
                        }
                    }
                }
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(startX, startY, endX - startX + 1, endY - startY + 1);
    }

    drawCircle(centerX, centerY, radius, filled = false, borderOnly = false, pattern = null) {
        const radiusSquared = radius * radius;
        const minX = Math.max(0, centerX - radius);
        const maxX = Math.min(this.width - 1, centerX + radius);
        const minY = Math.max(0, centerY - radius);
        const maxY = Math.min(this.height - 1, centerY + radius);
        
        const operation = (pixels) => {
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const distanceSquared = dx * dx + dy * dy;
                    
                    let shouldDraw = false;
                    if (filled) {
                        shouldDraw = distanceSquared <= radiusSquared;
                    } else {
                        const outerRadius = radius + 0.5;
                        const innerRadius = radius - 0.5;
                        shouldDraw = distanceSquared <= outerRadius * outerRadius && 
                                   distanceSquared >= innerRadius * innerRadius;
                    }
                    
                    if (shouldDraw) {
                        const index = this.getPixelIndex(x, y);
                        if (pattern && typeof DitherPatterns !== 'undefined') {
                            pixels[index] = DitherPatterns.applyPattern(pattern, x, y);
                        } else {
                            pixels[index] = 1;
                        }
                    }
                }
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    // ===== LAYER COMPOSITING =====
    
    markCompositeDirty() {
        this.compositeCacheDirty = true;
        this.compositeCache = null;
    }

    compositeAllLayers() {
        if (!this.compositeCacheDirty && this.compositeCache) {
            return this.compositeCache;
        }
        
        if (!this.compositeCache) {
            this.compositeCache = new Uint8Array(this.width * this.height);
        }
        
        // Clear composite
        this.compositeCache.fill(0);
        
        // Composite all visible layers
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            if (!layer.visible) continue;
            
            for (let j = 0; j < this.compositeCache.length; j++) {
                if (layer.pixels[j] > 0) {
                    this.compositeCache[j] = 1; // Simple OR blend for monochrome
                }
            }
        }
        
        this.compositeCacheDirty = false;
        return this.compositeCache;
    }

    // ===== RENDER SCHEDULING =====
    
    scheduleRender() {
        if (this.renderScheduled) return;
        
        this.renderScheduled = true;
        requestAnimationFrame(() => {
            this.processBatchOperations();
            this.render();
            this.renderScheduled = false;
        });
    }

    render() {
        const dirtyRect = this.mergeDirtyRects();
        this.clearDirtyRects();
        
        if (!dirtyRect) {
            // Full redraw if no dirty rects
            this.renderFull();
            return;
        }
        
        // Partial render for dirty areas
        this.renderPartial(dirtyRect);
    }

    renderFull() {
        this.ctx.fillStyle = this.inverted ? '#000000' : '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const composite = this.compositeAllLayers();
        this.renderPixels(composite, 0, 0, this.width, this.height);
        
        if (this.showGrid) {
            this.renderGrid();
        }
    }

    renderPartial(dirtyRect) {
        const composite = this.compositeAllLayers();
        
        // Clear dirty area
        const canvasX = dirtyRect.x * this.zoom;
        const canvasY = dirtyRect.y * this.zoom;
        const canvasWidth = dirtyRect.width * this.zoom;
        const canvasHeight = dirtyRect.height * this.zoom;
        
        this.ctx.fillStyle = this.inverted ? '#000000' : '#ffffff';
        this.ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
        
        // Render pixels in dirty area
        this.renderPixels(composite, dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);
        
        if (this.showGrid) {
            this.renderGridPartial(dirtyRect);
        }
    }

    renderPixels(composite, startX, startY, width, height) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelX = startX + x;
                const pixelY = startY + y;
                
                if (pixelX >= this.width || pixelY >= this.height) continue;
                
                const index = this.getPixelIndex(pixelX, pixelY);
                const pixelValue = composite[index];
                const displayValue = this.inverted ? (1 - pixelValue) : pixelValue;
                
                if (displayValue) {
                    this.ctx.fillStyle = this.inverted ? '#ffffff' : '#000000';
                    this.ctx.fillRect(pixelX * this.zoom, pixelY * this.zoom, this.zoom, this.zoom);
                }
            }
        }
    }

    renderGrid() {
        if (!this.showGrid || this.zoom < 4) return;
        
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        for (let x = 0; x <= this.width; x++) {
            this.ctx.moveTo(x * this.zoom, 0);
            this.ctx.lineTo(x * this.zoom, this.height * this.zoom);
        }
        for (let y = 0; y <= this.height; y++) {
            this.ctx.moveTo(0, y * this.zoom);
            this.ctx.lineTo(this.width * this.zoom, y * this.zoom);
        }
        this.ctx.stroke();
    }

    renderGridPartial(dirtyRect) {
        if (!this.showGrid || this.zoom < 4) return;
        
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.lineWidth = 1;
        
        const startX = dirtyRect.x * this.zoom;
        const startY = dirtyRect.y * this.zoom;
        const endX = (dirtyRect.x + dirtyRect.width) * this.zoom;
        const endY = (dirtyRect.y + dirtyRect.height) * this.zoom;
        
        this.ctx.beginPath();
        for (let x = dirtyRect.x; x <= dirtyRect.x + dirtyRect.width; x++) {
            this.ctx.moveTo(x * this.zoom, startY);
            this.ctx.lineTo(x * this.zoom, endY);
        }
        for (let y = dirtyRect.y; y <= dirtyRect.y + dirtyRect.height; y++) {
            this.ctx.moveTo(startX, y * this.zoom);
            this.ctx.lineTo(endX, y * this.zoom);
        }
        this.ctx.stroke();
    }

    // ===== UTILITY METHODS =====
    
    setupCanvas() {
        this.canvas.width = this.width * this.zoom;
        this.canvas.height = this.height * this.zoom;
        this.ctx.imageSmoothingEnabled = false;
        this.scheduleRender();
    }

    setZoom(zoom) {
        this.zoom = zoom;
        this.setupCanvas();
    }

    setInverted(inverted) {
        this.inverted = inverted;
        this.scheduleRender();
    }

    setShowGrid(showGrid) {
        this.showGrid = showGrid;
        this.scheduleRender();
    }

    clear() {
        const activeLayer = this.getActiveLayer();
        if (activeLayer) {
            activeLayer.pixels.fill(0);
            this.markCompositeDirty();
            this.addDirtyRect(0, 0, this.width, this.height);
            this.scheduleRender();
        }
    }

    getActiveLayer() {
        return this.layers[this.activeLayerIndex] || null;
    }

    getLayerCount() {
        return this.layers.length;
    }

    getLayerInfo(index) {
        if (index >= 0 && index < this.layers.length) {
            const layer = this.layers[index];
            return {
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                blendMode: layer.blendMode,
                isActive: index === this.activeLayerIndex
            };
        }
        return null;
    }

    getCanvasCoordinates(mouseX, mouseY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((mouseX - rect.left) / this.zoom);
        const y = Math.floor((mouseY - rect.top) / this.zoom);
        return { x, y };
    }

    getBitmapData() {
        const composite = this.compositeAllLayers();
        const pixels = [];
        
        for (let y = 0; y < this.height; y++) {
            pixels[y] = [];
            for (let x = 0; x < this.width; x++) {
                const index = this.getPixelIndex(x, y);
                pixels[y][x] = composite[index];
            }
        }
        
        return {
            width: this.width,
            height: this.height,
            pixels: pixels
        };
    }

    // ===== HISTORY MANAGEMENT =====
    
    saveState() {
        const state = this.layers.map(layer => ({
            ...layer,
            pixels: new Uint8Array(layer.pixels)
        }));
        
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(state);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    restoreState(state) {
        this.layers = state.map(layer => ({
            ...layer,
            pixels: new Uint8Array(layer.pixels)
        }));
        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
    }

    // Compatibility method for legacy code
    redraw() {
        this.renderFull();
    }

    // Spray tool implementation
    spray(centerX, centerY, radius = 5, density = 0.3, pattern = null) {
        const radiusSquared = radius * radius;
        const operations = [];
        
        for (let i = 0; i < 20; i++) { // 20 random points per spray
            if (Math.random() > density) continue;
            
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * radius;
            const x = Math.round(centerX + Math.cos(angle) * distance);
            const y = Math.round(centerY + Math.sin(angle) * distance);
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                this.setPixel(x, y, 1, pattern);
            }
        }
    }

    // Line drawing using Bresenham's algorithm
    drawLine(x1, y1, x2, y2, pattern = null) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        const operation = (pixels) => {
            while (true) {
                const index = this.getPixelIndex(x, y);
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    if (pattern && typeof DitherPatterns !== 'undefined') {
                        pixels[index] = DitherPatterns.applyPattern(pattern, x, y);
                    } else {
                        pixels[index] = 1;
                    }
                }
                
                if (x === x2 && y === y2) break;
                
                const e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y += sy;
                }
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(Math.min(x1, x2), Math.min(y1, y2), 
                          Math.abs(x2 - x1) + 1, Math.abs(y2 - y1) + 1);
    }

    // Selection management methods
    createSelection(x1, y1, x2, y2, type = 'rect') {
        const selection = {
            x1: Math.min(x1, x2),
            y1: Math.min(y1, y2),
            x2: Math.max(x1, x2),
            y2: Math.max(y1, y2),
            type: type,
            active: true
        };
        
        if (type === 'circle') {
            selection.centerX = x1;
            selection.centerY = y1;
            selection.radius = Math.round(Math.sqrt(
                Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
            ));
        }
        
        return selection;
    }

    isInSelection(x, y, selection) {
        if (!selection || !selection.active) return false;
        
        if (selection.type === 'rect') {
            return x >= selection.x1 && x <= selection.x2 && 
                   y >= selection.y1 && y <= selection.y2;
        } else if (selection.type === 'circle') {
            const dx = x - selection.centerX;
            const dy = y - selection.centerY;
            return (dx * dx + dy * dy) <= (selection.radius * selection.radius);
        }
        
        return false;
    }

    drawSelectionOverlay(ctx, selection, zoom) {
        if (!selection || !selection.active) return;
        
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        
        // Animate dash offset
        const offset = (Date.now() / 100) % 8;
        ctx.lineDashOffset = offset;
        
        if (selection.type === 'rect') {
            const x = selection.x1 * zoom;
            const y = selection.y1 * zoom;
            const width = (selection.x2 - selection.x1 + 1) * zoom;
            const height = (selection.y2 - selection.y1 + 1) * zoom;
            ctx.strokeRect(x, y, width, height);
        } else if (selection.type === 'circle') {
            const centerX = selection.centerX * zoom + zoom / 2;
            const centerY = selection.centerY * zoom + zoom / 2;
            const radius = selection.radius * zoom;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}