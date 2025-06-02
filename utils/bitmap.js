class BitmapEditor {
    constructor(canvas, width = 128, height = 64) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.zoom = 4;
        this.inverted = false;
        this.showGrid = true;
        
        this.pixels = this.createEmptyBitmap();
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
            this.drawPixel(x, y);
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
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.drawPixel(x, y);
            }
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
        this.redraw();
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
        this.redraw();
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
            }
        }
        this.redraw();
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

    loadBitmapData(data) {
        this.width = data.width;
        this.height = data.height;
        this.pixels = data.pixels.map(row => [...row]);
        this.setupCanvas();
        this.saveState();
    }
}