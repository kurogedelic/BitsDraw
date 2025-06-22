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
        this.zoom = 1;
        this.inverted = false;
        this.showGrid = false;
        this.showCheckerboard = true; // Default to showing checkerboard
        this.drawColor = '#000000';
        this.backgroundColor = '#FFFFFF';
        
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
        
        // Create initial background layer and setup
        this.addLayer('Background');
        this.fillBackgroundWithWhite(); // Fill background layer with white pixels
        this.addLayer('Layer 1');
        this.setActiveLayer(1); // Make Layer 1 active (index 1, Background is index 0)
        this.setupCanvas();
        this.saveState();
    }

    // ===== CORE DATA LAYER =====
    
    fillBackgroundWithWhite() {
        // Fill the Background layer (index 0) with white pixels
        if (this.layers.length > 0) {
            const backgroundLayer = this.layers[0];
            // Fill with white pixels (1=white in BitsDraw) and full alpha
            backgroundLayer.pixels.fill(1); // 1 = white
            backgroundLayer.alpha.fill(1);  // 1 = fully opaque
            this.markCompositeDirty();
        }
    }
    
    createEmptyBitmap() {
        // Use Uint8Array for better performance than nested arrays
        return new Uint8Array(this.width * this.height);
    }

    createEmptyAlpha() {
        // Create alpha channel - default to fully transparent (0)
        const alpha = new Uint8Array(this.width * this.height);
        alpha.fill(0);
        return alpha;
    }

    getPixelIndex(x, y) {
        return y * this.width + x;
    }

    addLayer(name = 'Layer') {
        this.saveState();  // Save state before adding layer
        const layer = {
            id: this.layerIdCounter++,
            name: name,
            visible: true,
            blendMode: 'normal',
            pixels: this.createEmptyBitmap(),
            alpha: this.createEmptyAlpha()
        };
        this.layers.push(layer);
        this.activeLayerIndex = this.layers.length - 1;
        this.markCompositeDirty();
        this.scheduleRender();
        return layer;
    }

    deleteLayer(index) {
        if (this.layers.length <= 1 || index < 0 || index >= this.layers.length) return false;
        
        this.saveState();  // Save state before deleting layer
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
            this.saveState();  // Save state before toggling visibility
            this.layers[index].visible = !this.layers[index].visible;
            this.markCompositeDirty();
            this.scheduleRender();
            return true;
        }
        return false;
    }

    swapLayers(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.layers.length || 
            toIndex < 0 || toIndex >= this.layers.length || 
            fromIndex === toIndex) {
            return false;
        }

        this.saveState();  // Save state before swapping layers
        
        // Swap the layers in the array
        const temp = this.layers[fromIndex];
        this.layers[fromIndex] = this.layers[toIndex];
        this.layers[toIndex] = temp;

        // Update active layer index if needed
        if (this.activeLayerIndex === fromIndex) {
            this.activeLayerIndex = toIndex;
        } else if (this.activeLayerIndex === toIndex) {
            this.activeLayerIndex = fromIndex;
        }

        this.markCompositeDirty();
        this.scheduleRender();
        return true;
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
            operation(activeLayer);
        }
        
        this.batchOperations = [];
        this.markCompositeDirty();
    }

    // ===== PIXEL OPERATIONS =====
    
    setPixel(x, y, value, pattern = null) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const operation = (layer) => {
            const index = this.getPixelIndex(x, y);
            if (pattern) {
                let patternValue;
                if (typeof pattern === 'object' && pattern.getValue) {
                    // Color pattern object
                    patternValue = pattern.getValue(x, y);
                    layer.alpha[index] = patternValue.alpha;
                    if (patternValue.alpha === 1) {
                        layer.pixels[index] = patternValue.draw;
                    }
                } else if (typeof Patterns !== 'undefined') {
                    // String pattern name - use proper primary/secondary color mapping
                    const primary = value !== null ? value : 0; // Use as-is: 0=black, 1=white
                    const secondary = value !== null ? (1 - value) : 1; // Invert: 0→1, 1→0
                    patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                    layer.alpha[index] = patternValue.alpha;
                    layer.pixels[index] = patternValue.draw;
                }
            } else {
                layer.pixels[index] = value;
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(x, y);
    }

    setPixelWithAlpha(x, y, drawValue, alphaValue, pattern = null) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const operation = (layer) => {
            const index = this.getPixelIndex(x, y);
            layer.alpha[index] = alphaValue;
            if (alphaValue === 1) {
                if (pattern) {
                    let patternValue;
                    if (typeof pattern === 'object' && pattern.getValue) {
                        // Color pattern object
                        patternValue = pattern.getValue(x, y);
                        layer.pixels[index] = patternValue.draw;
                        layer.alpha[index] = patternValue.alpha;
                    } else if (typeof Patterns !== 'undefined') {
                        // String pattern name - use drawValue as primary color for patterns
                        // Left click (drawValue=0) → primary=0 (black), Right click (drawValue=1) → primary=1 (white) 
                        const primary = drawValue; // Use as-is: 0=black, 1=white
                        const secondary = 1 - drawValue; // Invert: 0→1, 1→0
                        patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                        layer.pixels[index] = patternValue.draw;
                        layer.alpha[index] = patternValue.alpha;
                    }
                } else {
                    layer.pixels[index] = drawValue;
                }
            } else {
                layer.pixels[index] = drawValue; // Set draw value regardless of alpha
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(x, y);
    }

    setAlpha(x, y, alphaValue) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const operation = (layer) => {
            const index = this.getPixelIndex(x, y);
            layer.alpha[index] = alphaValue;
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

    getAlpha(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return 0;
        
        const index = this.getPixelIndex(x, y);
        return activeLayer.alpha[index];
    }

    getPixelWithAlpha(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return { draw: 0, alpha: 0 };
        
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return { draw: 0, alpha: 0 };
        
        const index = this.getPixelIndex(x, y);
        return {
            draw: activeLayer.pixels[index],
            alpha: activeLayer.alpha[index]
        };
    }

    // ===== EFFICIENT FLOOD FILL =====
    
    floodFill(startX, startY, newValue, pattern = null, drawValue = null) {
        // Use the new alpha-aware flood fill with alpha=1
        this.floodFillWithAlpha(startX, startY, newValue, 1, pattern, drawValue);
    }

    floodFillWithAlpha(startX, startY, newDrawValue, newAlphaValue, pattern = null, drawValue = null) {
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return;
        
        // Bounds checking
        if (startX < 0 || startX >= this.width || startY < 0 || startY >= this.height) return;
        
        const startIndex = this.getPixelIndex(startX, startY);
        const originalDrawValue = activeLayer.pixels[startIndex];
        const originalAlphaValue = activeLayer.alpha[startIndex];
        
        // Early exit if trying to fill with the same values
        if (pattern) {
            let patternValue;
            if (typeof pattern === 'object' && pattern.getValue) {
                // Color pattern object
                patternValue = pattern.getValue(startX, startY);
            } else if (typeof Patterns !== 'undefined') {
                // String pattern name - use drawValue for primary/secondary mapping
                const primary = drawValue !== null ? drawValue : 0; // Use as-is: 0=black, 1=white
                const secondary = drawValue !== null ? (1 - drawValue) : 1; // Invert: 0→1, 1→0
                patternValue = Patterns.applyPattern(pattern, startX, startY, primary, secondary);
            }
            if (patternValue && originalDrawValue === patternValue.draw && originalAlphaValue === patternValue.alpha) return;
        } else if (originalDrawValue === newDrawValue && originalAlphaValue === newAlphaValue) {
            return;
        }
        
        // Direct flood fill algorithm without batch operations
        const stack = [{ x: startX, y: startY }];
        const visited = new Array(this.width * this.height).fill(false);
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        let pixelsChanged = 0;
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            
            // Bounds check
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
            
            const index = this.getPixelIndex(x, y);
            
            // Skip if already visited or not matching original values
            if (visited[index] || 
                activeLayer.pixels[index] !== originalDrawValue ||
                activeLayer.alpha[index] !== originalAlphaValue) continue;
            
            // Mark as visited and fill pixel
            visited[index] = true;
            pixelsChanged++;
            
            // Update bounding box
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            // Set alpha first
            activeLayer.alpha[index] = newAlphaValue;
            
            // Apply pattern or solid color for draw channel
            if (newAlphaValue === 1) {
                if (pattern) {
                    let patternValue;
                    if (typeof pattern === 'object' && pattern.getValue) {
                        // Color pattern object
                        patternValue = pattern.getValue(x, y);
                        activeLayer.pixels[index] = patternValue.draw;
                    } else if (typeof Patterns !== 'undefined') {
                        // String pattern name - use drawValue as color guide
                        const primary = drawValue !== null ? drawValue : 0; // Use as-is: 0=black, 1=white
                        const secondary = drawValue !== null ? (1 - drawValue) : 1; // Invert: 0→1, 1→0
                        patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                        activeLayer.pixels[index] = patternValue.draw;
                        activeLayer.alpha[index] = patternValue.alpha;
                    }
                } else if (drawValue !== null) {
                    // Use explicit drawValue (no pattern)
                    activeLayer.pixels[index] = drawValue;
                } else {
                    activeLayer.pixels[index] = newDrawValue;
                }
            } else {
                // For transparent pixels, still set draw value
                activeLayer.pixels[index] = drawValue !== null ? drawValue : newDrawValue;
            }
            
            // Add adjacent pixels to stack
            stack.push({ x: x + 1, y: y });     // Right
            stack.push({ x: x - 1, y: y });     // Left
            stack.push({ x: x, y: y + 1 });     // Down
            stack.push({ x: x, y: y - 1 });     // Up
        }
        
        // Only update if pixels were actually changed
        if (pixelsChanged > 0) {
            // Mark composite cache as dirty
            this.markCompositeDirty();
            // Update dirty rect to only affected area
            this.addDirtyRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
            // Force immediate render
            this.scheduleRender();
        }
    }

    // ===== OPTIMIZED SHAPE DRAWING =====
    
    drawRect(x1, y1, x2, y2, filled = false, borderOnly = false, pattern = null, drawValue = null) {
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        const endX = Math.max(x1, x2);
        const endY = Math.max(y1, y2);
        
        const operation = (layer) => {
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        const isBorder = (x === startX || x === endX || y === startY || y === endY);
                        
                        if ((filled) || (!filled && isBorder)) {
                            const index = this.getPixelIndex(x, y);
                            // Set alpha=1 and draw value
                            layer.alpha[index] = 1;
                            if (pattern) {
                                let patternValue;
                                if (typeof pattern === 'object' && pattern.getValue) {
                                    // Color pattern object
                                    patternValue = pattern.getValue(x, y);
                                    layer.pixels[index] = patternValue.draw;
                                    layer.alpha[index] = patternValue.alpha;
                                } else if (typeof Patterns !== 'undefined') {
                                    // String pattern name - use drawValue for primary/secondary color mapping
                                    const primary = drawValue !== null ? drawValue : 0; // Use as-is: 0=black, 1=white
                                    const secondary = drawValue !== null ? (1 - drawValue) : 1; // Invert: 0→1, 1→0
                                    patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                                    layer.pixels[index] = patternValue.draw;
                                    layer.alpha[index] = patternValue.alpha;
                                }
                            } else if (drawValue !== null) {
                                // Use explicit drawValue (no pattern)
                                layer.pixels[index] = drawValue;
                            } else {
                                layer.pixels[index] = 1;
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
        
        const operation = (layer) => {
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
                        // Set alpha=1 and draw value
                        layer.alpha[index] = 1;
                        if (pattern) {
                            let patternValue;
                            if (typeof pattern === 'object' && pattern.getValue) {
                                // Color pattern object
                                patternValue = pattern.getValue(x, y);
                                layer.pixels[index] = patternValue.draw;
                                layer.alpha[index] = patternValue.alpha;
                            } else if (typeof Patterns !== 'undefined') {
                                // String pattern name - use proper primary/secondary color mapping
                                const primary = 0; // Default to black for circle (no drawValue parameter)
                                const secondary = 1; // Default to white for circle
                                patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                                layer.pixels[index] = patternValue.draw;
                                layer.alpha[index] = patternValue.alpha;
                            }
                        } else {
                            layer.pixels[index] = 1;
                        }
                    }
                }
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    drawEllipse(centerX, centerY, radiusX, radiusY, filled = false, borderOnly = false, pattern = null, drawValue = null) {
        // Use Bresenham-style algorithms for better circle/ellipse drawing
        const pixels = [];
        
        if (Math.abs(radiusX - radiusY) < 0.5) {
            // Perfect circle - use Bresenham circle algorithm
            const radius = Math.round((radiusX + radiusY) / 2);
            this.drawBresenhamCircle(centerX, centerY, radius, filled, pattern, drawValue, pixels);
        } else {
            // Ellipse - use improved ellipse algorithm
            this.drawBresenhamEllipse(centerX, centerY, radiusX, radiusY, filled, pattern, drawValue, pixels);
        }
        
        // Apply pixels to the active layer
        const operation = (layer) => {
            pixels.forEach(({x, y, value, alpha}) => {
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const index = this.getPixelIndex(x, y);
                    layer.pixels[index] = value;
                    layer.alpha[index] = alpha;
                }
            });
        };
        
        this.batchPixelOperation(operation);
        
        // Calculate dirty rectangle bounds
        if (pixels.length > 0) {
            const minX = Math.min(...pixels.map(p => p.x));
            const maxX = Math.max(...pixels.map(p => p.x));
            const minY = Math.min(...pixels.map(p => p.y));
            const maxY = Math.max(...pixels.map(p => p.y));
            this.addDirtyRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
        }
        
        return pixels; // Return for undo system
    }

    drawBresenhamCircle(centerX, centerY, radius, filled, pattern, drawValue, pixels) {
        const cx = Math.round(centerX);
        const cy = Math.round(centerY);
        const r = Math.round(radius);
        
        if (filled) {
            // Filled circle using scanline approach
            this.drawFilledCircle(cx, cy, r, pattern, drawValue, pixels);
        } else {
            // Circle outline using Bresenham algorithm
            this.drawCircleOutline(cx, cy, r, pattern, drawValue, pixels);
        }
    }

    drawCircleOutline(cx, cy, radius, pattern, drawValue, pixels) {
        let x = 0;
        let y = radius;
        let d = 3 - 2 * radius;
        
        // Add initial points
        this.addCirclePoints(cx, cy, x, y, pattern, drawValue, pixels);
        
        while (y >= x) {
            x++;
            
            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
            
            this.addCirclePoints(cx, cy, x, y, pattern, drawValue, pixels);
        }
        
        // Arc completion - fill any gaps by checking adjacent pixels
        this.completeCircleArcs(cx, cy, radius, pixels, pattern, drawValue);
    }

    addCirclePoints(cx, cy, x, y, pattern, drawValue, pixels) {
        const points = [
            {x: cx + x, y: cy + y},
            {x: cx - x, y: cy + y},
            {x: cx + x, y: cy - y},
            {x: cx - x, y: cy - y},
            {x: cx + y, y: cy + x},
            {x: cx - y, y: cy + x},
            {x: cx + y, y: cy - x},
            {x: cx - y, y: cy - x}
        ];
        
        // Remove duplicates for axes points
        const uniquePoints = [];
        const seen = new Set();
        
        for (const point of points) {
            const key = `${point.x},${point.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniquePoints.push(point);
            }
        }
        
        uniquePoints.forEach(point => {
            const pixelData = this.getPixelData(point.x, point.y, pattern, drawValue);
            pixels.push({
                x: point.x,
                y: point.y,
                value: pixelData.value,
                alpha: pixelData.alpha
            });
        });
    }

    drawFilledCircle(cx, cy, radius, pattern, drawValue, pixels) {
        // Use scanline approach for filled circles
        for (let y = -radius; y <= radius; y++) {
            const width = Math.floor(Math.sqrt(radius * radius - y * y));
            for (let x = -width; x <= width; x++) {
                const pixelData = this.getPixelData(cx + x, cy + y, pattern, drawValue);
                pixels.push({
                    x: cx + x,
                    y: cy + y,
                    value: pixelData.value,
                    alpha: pixelData.alpha
                });
            }
        }
    }

    drawBresenhamEllipse(centerX, centerY, radiusX, radiusY, filled, pattern, drawValue, pixels) {
        const cx = Math.round(centerX);
        const cy = Math.round(centerY);
        const rx = Math.round(radiusX);
        const ry = Math.round(radiusY);
        
        if (filled) {
            this.drawFilledEllipse(cx, cy, rx, ry, pattern, drawValue, pixels);
        } else {
            this.drawEllipseOutline(cx, cy, rx, ry, pattern, drawValue, pixels);
        }
    }

    drawEllipseOutline(cx, cy, rx, ry, pattern, drawValue, pixels) {
        let x = 0;
        let y = ry;
        let rx2 = rx * rx;
        let ry2 = ry * ry;
        let twoRx2 = 2 * rx2;
        let twoRy2 = 2 * ry2;
        let p;
        let px = 0;
        let py = twoRx2 * y;
        
        // Add initial points
        this.addEllipsePoints(cx, cy, x, y, pattern, drawValue, pixels);
        
        // Region 1
        p = Math.round(ry2 - (rx2 * ry) + (0.25 * rx2));
        while (px < py) {
            x++;
            px += twoRy2;
            if (p < 0) {
                p += ry2 + px;
            } else {
                y--;
                py -= twoRx2;
                p += ry2 + px - py;
            }
            this.addEllipsePoints(cx, cy, x, y, pattern, drawValue, pixels);
        }
        
        // Region 2
        p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
        while (y > 0) {
            y--;
            py -= twoRx2;
            if (p > 0) {
                p += rx2 - py;
            } else {
                x++;
                px += twoRy2;
                p += rx2 - py + px;
            }
            this.addEllipsePoints(cx, cy, x, y, pattern, drawValue, pixels);
        }
        
        // Complete any gaps in the ellipse
        this.completeEllipseArcs(cx, cy, rx, ry, pixels, pattern, drawValue);
    }

    addEllipsePoints(cx, cy, x, y, pattern, drawValue, pixels) {
        const points = [
            {x: cx + x, y: cy + y},
            {x: cx - x, y: cy + y},
            {x: cx + x, y: cy - y},
            {x: cx - x, y: cy - y}
        ];
        
        // Remove duplicates
        const uniquePoints = [];
        const seen = new Set();
        
        for (const point of points) {
            const key = `${point.x},${point.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniquePoints.push(point);
            }
        }
        
        uniquePoints.forEach(point => {
            const pixelData = this.getPixelData(point.x, point.y, pattern, drawValue);
            pixels.push({
                x: point.x,
                y: point.y,
                value: pixelData.value,
                alpha: pixelData.alpha
            });
        });
    }

    drawFilledEllipse(cx, cy, rx, ry, pattern, drawValue, pixels) {
        for (let y = -ry; y <= ry; y++) {
            const width = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
            for (let x = -width; x <= width; x++) {
                const pixelData = this.getPixelData(cx + x, cy + y, pattern, drawValue);
                pixels.push({
                    x: cx + x,
                    y: cy + y,
                    value: pixelData.value,
                    alpha: pixelData.alpha
                });
            }
        }
    }

    completeCircleArcs(cx, cy, radius, pixels, pattern = null, drawValue = 0) {
        // Find and fill gaps in circle arcs
        const pixelMap = new Set();
        pixels.forEach(p => pixelMap.add(`${p.x},${p.y}`));
        
        // Check for missing pixels by following the expected circle path
        const completionPixels = [];
        const angleStep = Math.PI / (8 * radius); // Higher resolution for gap detection
        
        for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
            const x = Math.round(cx + radius * Math.cos(angle));
            const y = Math.round(cy + radius * Math.sin(angle));
            const key = `${x},${y}`;
            
            if (!pixelMap.has(key)) {
                // Check if this is a legitimate gap (has neighbors)
                if (this.hasCircleNeighbors(x, y, cx, cy, radius, pixelMap)) {
                    const pixelData = this.getPixelData(x, y, pattern, drawValue); // Use correct drawValue
                    completionPixels.push({
                        x: x,
                        y: y,
                        value: pixelData.value,
                        alpha: pixelData.alpha
                    });
                    pixelMap.add(key);
                }
            }
        }
        
        // Add completion pixels to the main array
        pixels.push(...completionPixels);
    }

    completeEllipseArcs(cx, cy, rx, ry, pixels, pattern = null, drawValue = 0) {
        // Similar to circle completion but for ellipses
        const pixelMap = new Set();
        pixels.forEach(p => pixelMap.add(`${p.x},${p.y}`));
        
        const completionPixels = [];
        const angleStep = Math.PI / (4 * Math.max(rx, ry));
        
        for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
            const x = Math.round(cx + rx * Math.cos(angle));
            const y = Math.round(cy + ry * Math.sin(angle));
            const key = `${x},${y}`;
            
            if (!pixelMap.has(key)) {
                if (this.hasEllipseNeighbors(x, y, cx, cy, rx, ry, pixelMap)) {
                    const pixelData = this.getPixelData(x, y, pattern, drawValue);
                    completionPixels.push({
                        x: x,
                        y: y,
                        value: pixelData.value,
                        alpha: pixelData.alpha
                    });
                    pixelMap.add(key);
                }
            }
        }
        
        pixels.push(...completionPixels);
    }

    hasCircleNeighbors(x, y, cx, cy, radius, pixelMap) {
        // Check if this pixel has neighbors on the circle arc
        const neighbors = [
            {x: x-1, y: y}, {x: x+1, y: y},
            {x: x, y: y-1}, {x: x, y: y+1},
            {x: x-1, y: y-1}, {x: x+1, y: y-1},
            {x: x-1, y: y+1}, {x: x+1, y: y+1}
        ];
        
        let neighborCount = 0;
        for (const neighbor of neighbors) {
            if (pixelMap.has(`${neighbor.x},${neighbor.y}`)) {
                neighborCount++;
            }
        }
        
        return neighborCount >= 2; // At least 2 neighbors for a valid gap
    }

    hasEllipseNeighbors(x, y, cx, cy, rx, ry, pixelMap) {
        // Similar neighbor check for ellipses
        const neighbors = [
            {x: x-1, y: y}, {x: x+1, y: y},
            {x: x, y: y-1}, {x: x, y: y+1},
            {x: x-1, y: y-1}, {x: x+1, y: y-1},
            {x: x-1, y: y+1}, {x: x+1, y: y+1}
        ];
        
        let neighborCount = 0;
        for (const neighbor of neighbors) {
            if (pixelMap.has(`${neighbor.x},${neighbor.y}`)) {
                neighborCount++;
            }
        }
        
        return neighborCount >= 2;
    }

    getPixelData(x, y, pattern, drawValue) {
        let value = drawValue !== null ? drawValue : 0;
        let alpha = 1;
        
        if (pattern) {
            if (typeof pattern === 'object' && pattern.getValue) {
                const patternValue = pattern.getValue(x, y);
                value = patternValue.draw;
                alpha = patternValue.alpha;
            } else if (typeof Patterns !== 'undefined') {
                const primary = drawValue !== null ? drawValue : 0;
                const secondary = drawValue !== null ? (1 - drawValue) : 1;
                const patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                value = patternValue.draw;
                alpha = patternValue.alpha;
            }
        }
        
        return { value, alpha };
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
            this.compositeCache = {
                pixels: new Uint8Array(this.width * this.height),
                alpha: new Uint8Array(this.width * this.height)
            };
        }
        
        // Clear composite
        this.compositeCache.pixels.fill(0);
        this.compositeCache.alpha.fill(0);
        
        // Composite all visible layers from bottom to top
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            if (!layer.visible) continue;
            
            for (let j = 0; j < this.compositeCache.pixels.length; j++) {
                const layerAlpha = layer.alpha[j];
                const layerPixel = layer.pixels[j];
                
                if (layerAlpha > 0) {
                    // Simple alpha blending for 1-bit alpha
                    const currentAlpha = this.compositeCache.alpha[j];
                    if (currentAlpha === 0) {
                        // No previous alpha, just copy
                        this.compositeCache.pixels[j] = layerPixel;
                        this.compositeCache.alpha[j] = layerAlpha;
                    } else {
                        // Blend with existing pixel - upper layer takes priority
                        this.compositeCache.pixels[j] = layerPixel;
                    }
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
        this.ctx.fillStyle = this.backgroundColor;
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
        
        this.ctx.fillStyle = this.backgroundColor;
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
                const alphaValue = composite.alpha[index];
                const pixelValue = composite.pixels[index];
                
                const canvasX = pixelX * this.zoom;
                const canvasY = pixelY * this.zoom;
                
                if (alphaValue === 0) {
                    // Transparent pixel
                    if (this.showCheckerboard) {
                        // Render checkerboard pattern
                        this.renderCheckerboard(canvasX, canvasY, this.zoom, this.zoom);
                    } else {
                        // Render solid background color (bit=0 color)
                        this.ctx.fillStyle = this.backgroundColor;
                        this.ctx.fillRect(canvasX, canvasY, this.zoom, this.zoom);
                    }
                } else {
                    // Opaque - render pixel
                    const displayValue = this.inverted ? (1 - pixelValue) : pixelValue;
                    this.ctx.fillStyle = displayValue ? this.drawColor : this.backgroundColor;
                    this.ctx.fillRect(canvasX, canvasY, this.zoom, this.zoom);
                }
            }
        }
    }

    renderCheckerboard(x, y, width, height) {
        const checkerSize = 8; // Fixed 8x8px checkerboard regardless of zoom
        
        for (let cy = 0; cy < height; cy += checkerSize) {
            for (let cx = 0; cx < width; cx += checkerSize) {
                const checkX = Math.floor((x + cx) / checkerSize);
                const checkY = Math.floor((y + cy) / checkerSize);
                const isLight = (checkX + checkY) % 2 === 0;
                
                this.ctx.fillStyle = isLight ? '#f0f0f0' : '#d0d0d0';
                const drawWidth = Math.min(checkerSize, width - cx);
                const drawHeight = Math.min(checkerSize, height - cy);
                this.ctx.fillRect(x + cx, y + cy, drawWidth, drawHeight);
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

    setShowCheckerboard(showCheckerboard) {
        this.showCheckerboard = showCheckerboard;
        this.scheduleRender();
    }

    setDisplayColors(drawColor, backgroundColor) {
        this.drawColor = drawColor;
        this.backgroundColor = backgroundColor;
        this.scheduleRender();
    }

    clear() {
        const activeLayer = this.getActiveLayer();
        if (activeLayer) {
            this.saveState();  // Save state before clearing
            activeLayer.pixels.fill(0);
            this.markCompositeDirty();
            this.addDirtyRect(0, 0, this.width, this.height);
            this.scheduleRender();
        }
    }

    resize(newWidth, newHeight) {
        const oldWidth = this.width;
        const oldHeight = this.height;
        
        // Update dimensions
        this.width = newWidth;
        this.height = newHeight;
        
        // Resize all layers
        this.layers.forEach(layer => {
            const oldPixels = layer.pixels;
            const oldAlpha = layer.alpha;
            layer.pixels = new Uint8Array(newWidth * newHeight);
            layer.alpha = new Uint8Array(newWidth * newHeight);
            
            // Copy existing pixels and alpha to new arrays
            const minWidth = Math.min(oldWidth, newWidth);
            const minHeight = Math.min(oldHeight, newHeight);
            
            for (let y = 0; y < minHeight; y++) {
                for (let x = 0; x < minWidth; x++) {
                    const oldIndex = y * oldWidth + x;
                    const newIndex = y * newWidth + x;
                    layer.pixels[newIndex] = oldPixels[oldIndex];
                    layer.alpha[newIndex] = oldAlpha[oldIndex];
                }
            }
        });
        
        // Update canvas size
        this.setupCanvas();
        
        // Mark everything as dirty and redraw
        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        
        // Save state for undo
        this.saveState();
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
        const alpha = [];
        
        for (let y = 0; y < this.height; y++) {
            pixels[y] = [];
            alpha[y] = [];
            for (let x = 0; x < this.width; x++) {
                const index = this.getPixelIndex(x, y);
                pixels[y][x] = composite.pixels[index];
                alpha[y][x] = composite.alpha[index];
            }
        }
        
        return {
            width: this.width,
            height: this.height,
            pixels: pixels,
            alpha: alpha
        };
    }

    // ===== HISTORY MANAGEMENT =====
    
    saveState() {
        const state = {
            layers: this.layers.map(layer => ({
                ...layer,
                pixels: new Uint8Array(layer.pixels),
                alpha: new Uint8Array(layer.alpha)
            })),
            activeLayerIndex: this.activeLayerIndex  // Include active layer index
        };
        
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
        // Handle both old format (array) and new format (object with layers + activeLayerIndex)
        if (Array.isArray(state)) {
            // Legacy format - state is just the layers array
            this.layers = state.map(layer => ({
                ...layer,
                pixels: new Uint8Array(layer.pixels),
                alpha: new Uint8Array(layer.alpha || this.createEmptyAlpha())
            }));
        } else {
            // New format - state contains layers and activeLayerIndex
            this.layers = state.layers.map(layer => ({
                ...layer,
                pixels: new Uint8Array(layer.pixels),
                alpha: new Uint8Array(layer.alpha || this.createEmptyAlpha())
            }));
            this.activeLayerIndex = state.activeLayerIndex;
        }
        
        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
    }

    // Compatibility method for legacy code
    redraw() {
        this.renderFull();
    }

    // Spray tool implementation
    spray(centerX, centerY, radius = 5, density = 0.3, pattern = null, drawValue = null) {
        const radiusSquared = radius * radius;
        
        // Adaptive point count based on radius - fewer points for larger canvases
        const pointCount = Math.min(20, Math.max(5, Math.round(radius * 1.5)));
        
        const operation = (layer) => {
            for (let i = 0; i < pointCount; i++) {
                if (Math.random() > density) continue;
                
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.random() * radius;
                const x = Math.round(centerX + Math.cos(angle) * distance);
                const y = Math.round(centerY + Math.sin(angle) * distance);
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const index = this.getPixelIndex(x, y);
                    // Set alpha=1 and draw value
                    layer.alpha[index] = 1;
                    if (pattern) {
                        let patternValue;
                        if (typeof pattern === 'object' && pattern.getValue) {
                            // Color pattern object
                            patternValue = pattern.getValue(x, y);
                            layer.pixels[index] = patternValue.draw;
                            layer.alpha[index] = patternValue.alpha;
                        } else if (typeof Patterns !== 'undefined') {
                            // String pattern name - use drawValue as color guide
                            const primary = drawValue !== null ? drawValue : 0; // Use as-is: 0=black, 1=white
                            const secondary = drawValue !== null ? (1 - drawValue) : 1; // Invert: 0→1, 1→0
                            patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                            layer.pixels[index] = patternValue.draw;
                            layer.alpha[index] = patternValue.alpha;
                        }
                    } else if (drawValue !== null) {
                        // Use explicit drawValue (no pattern)
                        layer.pixels[index] = drawValue;
                    } else {
                        layer.pixels[index] = 1;
                    }
                }
            }
        };
        
        this.batchPixelOperation(operation);
        this.addDirtyRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    }

    // Line drawing using Bresenham's algorithm with width support
    drawLine(x1, y1, x2, y2, pattern = null, drawValue = null, width = 1) {
        if (width <= 1) {
            // Single pixel line using Bresenham's algorithm
            this.drawSinglePixelLine(x1, y1, x2, y2, pattern, drawValue);
        } else {
            // Thick line using brush approach
            this.drawThickLine(x1, y1, x2, y2, pattern, drawValue, width);
        }
    }

    drawSinglePixelLine(x1, y1, x2, y2, pattern = null, drawValue = null) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        const operation = (layer) => {
            while (true) {
                const index = this.getPixelIndex(x, y);
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    // Set alpha=1 and draw value
                    layer.alpha[index] = 1;
                    if (pattern) {
                        let patternValue;
                        if (typeof pattern === 'object' && pattern.getValue) {
                            // Color pattern object
                            patternValue = pattern.getValue(x, y);
                            layer.pixels[index] = patternValue.draw;
                            layer.alpha[index] = patternValue.alpha;
                        } else if (typeof Patterns !== 'undefined') {
                            // String pattern name - use drawValue as color guide
                            const primary = drawValue !== null ? drawValue : 0; // Use as-is: 0=black, 1=white
                            const secondary = drawValue !== null ? (1 - drawValue) : 1; // Invert: 0→1, 1→0
                            patternValue = Patterns.applyPattern(pattern, x, y, primary, secondary);
                            layer.pixels[index] = patternValue.draw;
                            layer.alpha[index] = patternValue.alpha;
                        }
                    } else if (drawValue !== null) {
                        // Use explicit drawValue (no pattern)
                        layer.pixels[index] = drawValue;
                    } else {
                        layer.pixels[index] = 1;
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

    drawThickLine(x1, y1, x2, y2, pattern = null, drawValue = null, width = 2) {
        // Get all points on the line using Bresenham
        const linePoints = this.getLinePoints(x1, y1, x2, y2);
        
        const operation = (layer) => {
            // Draw a circle at each point along the line
            for (const point of linePoints) {
                const radius = Math.floor(width / 2);
                
                // Draw filled circle at this point
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= radius) {
                            const px = point.x + dx;
                            const py = point.y + dy;
                            
                            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                                const index = this.getPixelIndex(px, py);
                                layer.alpha[index] = 1;
                                
                                if (pattern) {
                                    let patternValue;
                                    if (typeof pattern === 'object' && pattern.getValue) {
                                        patternValue = pattern.getValue(px, py);
                                        layer.pixels[index] = patternValue.draw;
                                        layer.alpha[index] = patternValue.alpha;
                                    } else if (typeof Patterns !== 'undefined') {
                                        const primary = drawValue !== null ? drawValue : 0;
                                        const secondary = drawValue !== null ? (1 - drawValue) : 1;
                                        patternValue = Patterns.applyPattern(pattern, px, py, primary, secondary);
                                        layer.pixels[index] = patternValue.draw;
                                        layer.alpha[index] = patternValue.alpha;
                                    }
                                } else if (drawValue !== null) {
                                    layer.pixels[index] = drawValue;
                                } else {
                                    layer.pixels[index] = 1;
                                }
                            }
                        }
                    }
                }
            }
        };
        
        this.batchPixelOperation(operation);
        
        // Calculate dirty rect for thick line
        const radius = Math.floor(width / 2);
        this.addDirtyRect(
            Math.min(x1, x2) - radius, 
            Math.min(y1, y2) - radius, 
            Math.abs(x2 - x1) + radius * 2 + 1, 
            Math.abs(y2 - y1) + radius * 2 + 1
        );
    }

    getLinePoints(x1, y1, x2, y2) {
        const points = [];
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (true) {
            points.push({ x, y });
            
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
        
        return points;
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

    createCircleSelection(centerX, centerY, radius) {
        const selection = {
            x1: centerX - radius,
            y1: centerY - radius,
            x2: centerX + radius,
            y2: centerY + radius,
            type: 'circle',
            centerX: centerX,
            centerY: centerY,
            radius: radius,
            active: true
        };
        
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

    invertBitmap() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const currentValue = this.getPixel(x, y);
                this.setPixel(x, y, currentValue ? 0 : 1);
            }
        }
        this.addDirtyRect(0, 0, this.width, this.height);
    }

    loadBitmapData(data) {
        // Update canvas dimensions if they changed
        if (data.width !== this.width || data.height !== this.height) {
            this.width = data.width;
            this.height = data.height;
            this.setupCanvas();
        }

        // Load data using setPixel method
        if (data.pixels) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (data.pixels[y] && data.pixels[y][x] !== undefined) {
                        this.setPixel(x, y, data.pixels[y][x]);
                    }
                }
            }
            this.addDirtyRect(0, 0, this.width, this.height);
        }
    }

    // ===== LAYER TRANSFORMATIONS =====

    rotateLayer90() {
        if (this.layers.length === 0) return false;

        const oldWidth = this.width;
        const oldHeight = this.height;
        const newWidth = oldHeight;
        const newHeight = oldWidth;

        // Transform all layers
        this.layers.forEach(layer => {
            const oldPixels = new Uint8Array(layer.pixels);
            const oldAlpha = new Uint8Array(layer.alpha);

            // Create new arrays with swapped dimensions
            layer.pixels = new Uint8Array(newWidth * newHeight);
            layer.alpha = new Uint8Array(newWidth * newHeight);

            // Rotate 90°: (x, y) -> (height - 1 - y, x)
            for (let y = 0; y < oldHeight; y++) {
                for (let x = 0; x < oldWidth; x++) {
                    const oldIndex = y * oldWidth + x;
                    const newX = oldHeight - 1 - y;
                    const newY = x;
                    const newIndex = newY * newWidth + newX;
                    
                    layer.pixels[newIndex] = oldPixels[oldIndex];
                    layer.alpha[newIndex] = oldAlpha[oldIndex];
                }
            }
        });

        // Update canvas dimensions
        this.width = newWidth;
        this.height = newHeight;
        this.setupCanvas();

        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    rotateLayer180() {
        if (this.layers.length === 0) return false;

        // Transform all layers
        this.layers.forEach(layer => {
            const oldPixels = new Uint8Array(layer.pixels);
            const oldAlpha = new Uint8Array(layer.alpha);

            // Rotate 180°: (x, y) -> (width - 1 - x, height - 1 - y)
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const oldIndex = y * this.width + x;
                    const newX = this.width - 1 - x;
                    const newY = this.height - 1 - y;
                    const newIndex = newY * this.width + newX;
                    
                    layer.pixels[newIndex] = oldPixels[oldIndex];
                    layer.alpha[newIndex] = oldAlpha[oldIndex];
                }
            }
        });

        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    rotateLayer270() {
        if (this.layers.length === 0) return false;

        const oldWidth = this.width;
        const oldHeight = this.height;
        const newWidth = oldHeight;
        const newHeight = oldWidth;

        // Transform all layers
        this.layers.forEach(layer => {
            const oldPixels = new Uint8Array(layer.pixels);
            const oldAlpha = new Uint8Array(layer.alpha);

            // Create new arrays with swapped dimensions
            layer.pixels = new Uint8Array(newWidth * newHeight);
            layer.alpha = new Uint8Array(newWidth * newHeight);

            // Rotate 270°: (x, y) -> (y, width - 1 - x)
            for (let y = 0; y < oldHeight; y++) {
                for (let x = 0; x < oldWidth; x++) {
                    const oldIndex = y * oldWidth + x;
                    const newX = y;
                    const newY = oldWidth - 1 - x;
                    const newIndex = newY * newWidth + newX;
                    
                    layer.pixels[newIndex] = oldPixels[oldIndex];
                    layer.alpha[newIndex] = oldAlpha[oldIndex];
                }
            }
        });

        // Update canvas dimensions
        this.width = newWidth;
        this.height = newHeight;
        this.setupCanvas();

        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    flipLayerHorizontal() {
        if (this.layers.length === 0) return false;

        // Transform all layers
        this.layers.forEach(layer => {
            const oldPixels = new Uint8Array(layer.pixels);
            const oldAlpha = new Uint8Array(layer.alpha);

            // Flip horizontally: (x, y) -> (width - 1 - x, y)
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const oldIndex = y * this.width + x;
                    const newX = this.width - 1 - x;
                    const newIndex = y * this.width + newX;
                    
                    layer.pixels[newIndex] = oldPixels[oldIndex];
                    layer.alpha[newIndex] = oldAlpha[oldIndex];
                }
            }
        });

        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    flipLayerVertical() {
        if (this.layers.length === 0) return false;

        // Transform all layers
        this.layers.forEach(layer => {
            const oldPixels = new Uint8Array(layer.pixels);
            const oldAlpha = new Uint8Array(layer.alpha);

            // Flip vertically: (x, y) -> (x, height - 1 - y)
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const oldIndex = y * this.width + x;
                    const newY = this.height - 1 - y;
                    const newIndex = newY * this.width + x;
                    
                    layer.pixels[newIndex] = oldPixels[oldIndex];
                    layer.alpha[newIndex] = oldAlpha[oldIndex];
                }
            }
        });

        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    // ===== LAYER BATCH OPERATIONS =====

    deleteLayers(layerIndices) {
        if (!Array.isArray(layerIndices) || layerIndices.length === 0) return false;
        
        // Sort indices in descending order to delete from top to bottom
        const sortedIndices = [...layerIndices].sort((a, b) => b - a);
        
        // Prevent deletion if it would leave no layers
        if (sortedIndices.length >= this.layers.length) return false;
        
        // Delete layers from highest index to lowest
        for (const index of sortedIndices) {
            if (index >= 0 && index < this.layers.length) {
                this.layers.splice(index, 1);
            }
        }
        
        // Adjust active layer index
        const minDeletedIndex = Math.min(...sortedIndices);
        if (this.activeLayerIndex >= this.layers.length) {
            this.activeLayerIndex = this.layers.length - 1;
        } else if (this.activeLayerIndex >= minDeletedIndex) {
            // Count how many layers were deleted below/at the active index
            const deletedBelowActive = sortedIndices.filter(i => i <= this.activeLayerIndex).length;
            this.activeLayerIndex = Math.max(0, this.activeLayerIndex - deletedBelowActive);
        }
        
        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    combineLayers(layerIndices, combinedName = 'Combined Layer') {
        if (!Array.isArray(layerIndices) || layerIndices.length < 2) return false;
        
        // Sort indices to combine from bottom to top
        const sortedIndices = [...layerIndices].sort((a, b) => a - b);
        
        // Validate all indices
        for (const index of sortedIndices) {
            if (index < 0 || index >= this.layers.length) return false;
        }
        
        // Create new combined layer
        const combinedLayer = {
            id: this.layerIdCounter++,
            name: combinedName,
            visible: true,
            blendMode: 'normal',
            pixels: this.createEmptyBitmap(),
            alpha: this.createEmptyAlpha()
        };
        
        // Composite selected layers into the combined layer
        for (const index of sortedIndices) {
            const layer = this.layers[index];
            if (!layer.visible) continue;
            
            for (let i = 0; i < combinedLayer.pixels.length; i++) {
                const layerAlpha = layer.alpha[i];
                const layerPixel = layer.pixels[i];
                
                if (layerAlpha > 0) {
                    const currentAlpha = combinedLayer.alpha[i];
                    if (currentAlpha === 0) {
                        // No previous alpha, just copy
                        combinedLayer.pixels[i] = layerPixel;
                        combinedLayer.alpha[i] = layerAlpha;
                    } else {
                        // Blend with existing pixel - upper layer takes priority
                        combinedLayer.pixels[i] = layerPixel;
                    }
                }
            }
        }
        
        // Insert combined layer at the position of the lowest index
        const insertIndex = sortedIndices[0];
        this.layers.splice(insertIndex, 0, combinedLayer);
        
        // Remove original layers (adjust indices due to insertion)
        for (let i = sortedIndices.length - 1; i >= 0; i--) {
            const adjustedIndex = sortedIndices[i] + 1; // +1 because we inserted the combined layer
            this.layers.splice(adjustedIndex, 1);
        }
        
        // Set the combined layer as active
        this.activeLayerIndex = insertIndex;
        
        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    duplicateLayers(layerIndices) {
        if (!Array.isArray(layerIndices) || layerIndices.length === 0) return false;
        
        const duplicatedLayers = [];
        
        for (const index of layerIndices) {
            if (index < 0 || index >= this.layers.length) continue;
            
            const originalLayer = this.layers[index];
            const duplicatedLayer = {
                id: this.layerIdCounter++,
                name: `${originalLayer.name} Copy`,
                visible: originalLayer.visible,
                blendMode: originalLayer.blendMode,
                pixels: new Uint8Array(originalLayer.pixels),
                alpha: new Uint8Array(originalLayer.alpha)
            };
            
            duplicatedLayers.push(duplicatedLayer);
        }
        
        // Insert all duplicated layers after the highest selected index
        const maxIndex = Math.max(...layerIndices);
        for (let i = duplicatedLayers.length - 1; i >= 0; i--) {
            this.layers.splice(maxIndex + 1, 0, duplicatedLayers[i]);
        }
        
        this.markCompositeDirty();
        this.addDirtyRect(0, 0, this.width, this.height);
        this.scheduleRender();
        this.saveState();
        return true;
    }

    toggleLayersVisibility(layerIndices) {
        if (!Array.isArray(layerIndices) || layerIndices.length === 0) return false;
        
        // Determine new visibility state based on first layer
        const firstLayer = this.layers[layerIndices[0]];
        if (!firstLayer) return false;
        
        const newVisibility = !firstLayer.visible;
        
        // Apply to all selected layers
        for (const index of layerIndices) {
            if (index >= 0 && index < this.layers.length) {
                this.layers[index].visible = newVisibility;
            }
        }
        
        this.markCompositeDirty();
        this.scheduleRender();
        return true;
    }
}