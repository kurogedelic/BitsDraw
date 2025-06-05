class BitmapEditor {
    constructor(canvas, width = 128, height = 64) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.zoom = 4;
        this.inverted = false;
        this.showGrid = true;
        
        // Layer system
        this.layers = [];
        this.activeLayerIndex = 0;
        this.layerIdCounter = 1;
        this.compositePixels = this.createEmptyBitmap();
        
        // Create initial layer
        this.addLayer('Background');
        
        // Legacy pixels reference for compatibility
        this.pixels = this.layers[0].pixels;
        
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        this.setupCanvas();
        this.saveState();
    }

    createEmptyBitmap() {
        const bitmap = [];
        for (let y = 0; y < this.height; y++) {
            bitmap[y] = new Array(this.width).fill(0);
        }
        return bitmap;
    }

    setupCanvas() {
        this.canvas.width = this.width * this.zoom;
        this.canvas.height = this.height * this.zoom;
        this.ctx.imageSmoothingEnabled = false;
        this.redraw();
    }

    setZoom(zoom) {
        this.zoom = zoom;
        this.setupCanvas();
    }

    setInverted(inverted) {
        this.inverted = inverted;
        this.redraw();
    }

    setShowGrid(showGrid) {
        this.showGrid = showGrid;
        this.redraw();
    }

    resize(newWidth, newHeight) {
        const oldPixels = this.pixels;
        this.width = newWidth;
        this.height = newHeight;
        this.pixels = this.createEmptyBitmap();
        
        const copyWidth = Math.min(oldPixels[0]?.length || 0, newWidth);
        const copyHeight = Math.min(oldPixels.length, newHeight);
        
        for (let y = 0; y < copyHeight; y++) {
            for (let x = 0; x < copyWidth; x++) {
                this.pixels[y][x] = oldPixels[y][x];
            }
        }
        
        this.setupCanvas();
    }

    clear() {
        this.pixels = this.createEmptyBitmap();
        this.redraw();
    }

    setPixel(x, y, value, pattern = null) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            if (pattern && typeof DitherPatterns !== 'undefined') {
                this.pixels[y][x] = DitherPatterns.applyPattern(pattern, x, y);
            } else {
                this.pixels[y][x] = value;
            }
            this.compositeAllLayers();
        }
    }

    getPixel(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.pixels[y][x];
        }
        return 0;
    }

    togglePixel(x, y) {
        const currentValue = this.getPixel(x, y);
        this.setPixel(x, y, currentValue ? 0 : 1);
    }

    drawPixel(x, y) {
        const pixelValue = this.pixels[y][x];
        const displayValue = this.inverted ? (1 - pixelValue) : pixelValue;
        
        this.ctx.fillStyle = displayValue ? '#000000' : '#ffffff';
        this.ctx.fillRect(x * this.zoom, y * this.zoom, this.zoom, this.zoom);
        
        // Draw grid lines only if showGrid is enabled
        if (this.showGrid) {
            this.ctx.strokeStyle = '#cccccc';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x * this.zoom, y * this.zoom, this.zoom, this.zoom);
        }
    }

    redraw() {
        this.ctx.fillStyle = this.inverted ? '#000000' : '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw composite pixels instead of active layer only
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.drawCompositePixel(x, y);
            }
        }
    }

    drawCompositePixel(x, y) {
        const pixelValue = this.compositePixels[y][x];
        const displayValue = this.inverted ? (1 - pixelValue) : pixelValue;
        
        this.ctx.fillStyle = displayValue ? '#000000' : '#ffffff';
        this.ctx.fillRect(x * this.zoom, y * this.zoom, this.zoom, this.zoom);
        
        // Draw grid lines only if showGrid is enabled
        if (this.showGrid) {
            this.ctx.strokeStyle = '#cccccc';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x * this.zoom, y * this.zoom, this.zoom, this.zoom);
        }
    }

    getCanvasCoordinates(mouseX, mouseY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((mouseX - rect.left) / this.zoom);
        const y = Math.floor((mouseY - rect.top) / this.zoom);
        return { x, y };
    }

    bucketFill(x, y, newValue, pattern = null) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        
        const originalValue = this.pixels[y][x];
        if (originalValue === newValue) {
            return;
        }
        
        const stack = [{x, y}];
        const visited = new Set();
        
        while (stack.length > 0) {
            const {x: currentX, y: currentY} = stack.pop();
            const key = `${currentX},${currentY}`;
            
            if (visited.has(key) || 
                currentX < 0 || currentX >= this.width || 
                currentY < 0 || currentY >= this.height ||
                this.pixels[currentY][currentX] !== originalValue) {
                continue;
            }
            
            visited.add(key);
            
            if (pattern && typeof DitherPatterns !== 'undefined') {
                this.pixels[currentY][currentX] = DitherPatterns.applyPattern(pattern, currentX, currentY);
            } else {
                this.pixels[currentY][currentX] = newValue;
            }
            
            stack.push({x: currentX + 1, y: currentY});
            stack.push({x: currentX - 1, y: currentY});
            stack.push({x: currentX, y: currentY + 1});
            stack.push({x: currentX, y: currentY - 1});
        }
        
        this.redraw();
    }

    getBitmapData() {
        return {
            width: this.width,
            height: this.height,
            pixels: this.pixels.map(row => [...row])
        };
    }

    saveState() {
        const state = this.pixels.map(row => [...row]);
        
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.pixels = this.history[this.historyIndex].map(row => [...row]);
            this.redraw();
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.pixels = this.history[this.historyIndex].map(row => [...row]);
            this.redraw();
            return true;
        }
        return false;
    }

    drawRect(x1, y1, x2, y2, filled = false, borderOnly = false, pattern = null) {
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        const endX = Math.max(x1, x2);
        const endY = Math.max(y1, y2);
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const isBorder = (x === startX || x === endX || y === startY || y === endY);
                    
                    if ((filled && !borderOnly) || (isBorder && !borderOnly) || (isBorder && borderOnly)) {
                        if (pattern && typeof DitherPatterns !== 'undefined') {
                            this.pixels[y][x] = DitherPatterns.applyPattern(pattern, x, y);
                        } else {
                            this.pixels[y][x] = 1;
                        }
                    }
                }
            }
        }
        this.compositeAllLayers();
    }

    drawCircle(centerX, centerY, radius, filled = false, borderOnly = false, pattern = null) {
        const radiusSquared = radius * radius;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const distanceSquared = dx * dx + dy * dy;
                    
                    if (filled && !borderOnly) {
                        if (distanceSquared <= radiusSquared) {
                            if (pattern && typeof DitherPatterns !== 'undefined') {
                                this.pixels[y][x] = DitherPatterns.applyPattern(pattern, x, y);
                            } else {
                                this.pixels[y][x] = 1;
                            }
                        }
                    } else if (borderOnly || !filled) {
                        const outerRadius = radius + 0.5;
                        const innerRadius = radius - 0.5;
                        if (distanceSquared <= outerRadius * outerRadius && 
                            distanceSquared >= innerRadius * innerRadius) {
                            if (pattern && typeof DitherPatterns !== 'undefined') {
                                this.pixels[y][x] = DitherPatterns.applyPattern(pattern, x, y);
                            } else {
                                this.pixels[y][x] = 1;
                            }
                        }
                    }
                }
            }
        }
        this.compositeAllLayers();
    }

    drawLine(x1, y1, x2, y2, pattern = null) {
        // Bresenham's line algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (true) {
            if (pattern && typeof DitherPatterns !== 'undefined') {
                this.setPixel(x, y, 1, pattern);
            } else {
                this.setPixel(x, y, 1);
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
    }

    spray(centerX, centerY, radius = 5, density = 0.3, pattern = null) {
        const radiusSquared = radius * radius;
        let pixelsChanged = false;
        
        for (let i = 0; i < 20; i++) { // 20 random points per spray
            if (Math.random() > density) continue;
            
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * radius;
            const x = Math.round(centerX + Math.cos(angle) * distance);
            const y = Math.round(centerY + Math.sin(angle) * distance);
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                if (pattern && typeof DitherPatterns !== 'undefined') {
                    this.pixels[y][x] = DitherPatterns.applyPattern(pattern, x, y);
                } else {
                    this.pixels[y][x] = 1;
                }
                pixelsChanged = true;
            }
        }
        
        if (pixelsChanged) {
            this.compositeAllLayers();
        }
    }

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

    // Layer Management Methods
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
        this.updatePixelsReference();
        this.compositeAllLayers();
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
        this.updatePixelsReference();
        this.compositeAllLayers();
        return true;
    }

    setActiveLayer(index) {
        if (index >= 0 && index < this.layers.length) {
            this.activeLayerIndex = index;
            this.updatePixelsReference();
            return true;
        }
        return false;
    }

    moveLayer(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.layers.length || 
            toIndex < 0 || toIndex >= this.layers.length) return false;
        
        const layer = this.layers.splice(fromIndex, 1)[0];
        this.layers.splice(toIndex, 0, layer);
        
        if (this.activeLayerIndex === fromIndex) {
            this.activeLayerIndex = toIndex;
        } else if (this.activeLayerIndex > fromIndex && this.activeLayerIndex <= toIndex) {
            this.activeLayerIndex--;
        } else if (this.activeLayerIndex < fromIndex && this.activeLayerIndex >= toIndex) {
            this.activeLayerIndex++;
        }
        
        this.updatePixelsReference();
        this.compositeAllLayers();
        return true;
    }

    toggleLayerVisibility(index) {
        if (index >= 0 && index < this.layers.length) {
            this.layers[index].visible = !this.layers[index].visible;
            this.compositeAllLayers();
            return true;
        }
        return false;
    }


    updatePixelsReference() {
        if (this.layers.length > 0) {
            this.pixels = this.layers[this.activeLayerIndex].pixels;
        }
    }

    compositeAllLayers() {
        // Clear composite
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.compositePixels[y][x] = 0;
            }
        }

        // Composite all visible layers
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            if (!layer.visible) continue;

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const layerPixel = layer.pixels[y][x];
                    if (layerPixel > 0) {
                        // Simple blend for monochrome - OR operation
                        this.compositePixels[y][x] = 1;
                    }
                }
            }
        }
        this.redraw();
    }

    getActiveLayer() {
        return this.layers[this.activeLayerIndex];
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

    invertBitmap() {
        const activeLayer = this.getActiveLayer();
        if (activeLayer) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    activeLayer.pixels[y][x] = activeLayer.pixels[y][x] ? 0 : 1;
                }
            }
            this.compositeAllLayers();
            this.saveState();
        }
    }

    loadBitmapData(data) {
        this.width = data.width;
        this.height = data.height;
        this.pixels = data.pixels.map(row => [...row]);
        this.setupCanvas();
        this.saveState();
    }
}