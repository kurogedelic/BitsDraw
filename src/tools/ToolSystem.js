/**
 * Tool System - Manages drawing tools using Strategy Pattern
 * Replaces scattered tool handling in main class
 */

/**
 * Base Tool Class - Strategy Interface
 */
class Tool {
    constructor(name, config = {}) {
        this.name = name;
        this.config = {
            cursor: 'crosshair',
            showBrushCursor: false,
            allowContinuousDrawing: false,
            ...config
        };
        this.isActive = false;
    }

    /**
     * Called when tool is activated
     */
    onActivate(context) {
        this.isActive = true;
        this.updateCursor(context);
    }

    /**
     * Called when tool is deactivated
     */
    onDeactivate(context) {
        this.isActive = false;
        this.cleanup(context);
    }

    /**
     * Handle mouse down event
     */
    onMouseDown(coords, event, context) {
        // Override in subclasses
    }

    /**
     * Handle mouse move event
     */
    onMouseMove(coords, event, context) {
        // Override in subclasses
    }

    /**
     * Handle mouse up event
     */
    onMouseUp(coords, event, context) {
        // Override in subclasses
    }

    /**
     * Handle mouse leave canvas event
     */
    onMouseLeave(context) {
        // Override in subclasses
    }

    /**
     * Handle mouse enter canvas event
     */
    onMouseEnter(context) {
        // Override in subclasses
    }

    /**
     * Handle keyboard shortcut
     */
    onKeyboard(key, event, context) {
        // Override in subclasses
    }

    /**
     * Update cursor appearance
     */
    updateCursor(context) {
        const canvas = context.canvas;
        if (canvas) {
            canvas.className = '';
            if (this.config.cursor) {
                canvas.style.cursor = this.config.cursor;
            }
        }
    }

    /**
     * Cleanup tool state
     */
    cleanup(context) {
        // Override in subclasses if needed
    }

    /**
     * Get tool options UI configuration
     */
    getOptionsConfig() {
        return null; // Override in subclasses
    }
}

/**
 * Pencil Tool Implementation
 */
class PencilTool extends Tool {
    constructor() {
        super('pencil', {
            cursor: 'crosshair',
            showBrushCursor: true,
            allowContinuousDrawing: true
        });
        this.isDrawing = false;
        this.currentStroke = [];
    }

    onActivate(context) {
        super.onActivate(context);
        context.eventBus.emit('brush-cursor:show');
    }

    onDeactivate(context) {
        super.onDeactivate(context);
        context.eventBus.emit('brush-cursor:hide');
        this.finishStroke(context);
    }

    onMouseDown(coords, event, context) {
        this.isDrawing = true;
        this.currentStroke = [];
        this.addPixelToStroke(coords, context);
        context.eventBus.emit('brush-cursor:hide');
    }

    onMouseMove(coords, event, context) {
        if (this.isDrawing) {
            this.addPixelToStroke(coords, context);
        } else {
            context.eventBus.emit('brush-cursor:update', coords);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.isDrawing) {
            this.finishStroke(context);
        }
        context.eventBus.emit('brush-cursor:show');
    }

    onMouseLeave(context) {
        context.eventBus.emit('brush-cursor:hide');
        // Don't stop drawing - allow continuous strokes
    }

    onMouseEnter(context) {
        if (!this.isDrawing) {
            context.eventBus.emit('brush-cursor:show');
        }
    }

    addPixelToStroke(coords, context) {
        const { x, y } = coords;
        const state = context.stateManager.getState();
        const brushSize = state.tools.brushSize || 2;
        const pattern = state.tools.pattern;
        const smooth = state.tools.smoothDrawing !== false; // Default to true

        if (smooth) {
            // Use enhanced smooth drawing
            this.addSmoothStrokePoint(x, y, context);
            this.processSmoothStroke(context);
        } else {
            // Direct pixel drawing
            this.drawDirectPixels(x, y, brushSize, pattern, context);
        }
    }

    addSmoothStrokePoint(x, y, context) {
        const timestamp = Date.now();
        const newPoint = { x, y, timestamp };
        
        if (!this.smoothPoints) {
            this.smoothPoints = [];
        }
        
        // Intelligent point filtering for stronger smoothing
        if (this.smoothPoints.length > 0) {
            const lastPoint = this.smoothPoints[this.smoothPoints.length - 1];
            const distance = Math.sqrt(
                Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2)
            );
            const timeDelta = timestamp - lastPoint.timestamp;
            const velocity = timeDelta > 0 ? distance / timeDelta : 0;
            
            // Adaptive distance threshold for stronger smoothing
            const minDistance = velocity > 0.3 ? 2.0 : 0.8;
            if (distance < minDistance && this.smoothPoints.length > 2) {
                this.smoothPoints[this.smoothPoints.length - 1] = newPoint;
                return;
            }
        }
        
        this.smoothPoints.push(newPoint);
        
        // Keep more points for better smoothing
        if (this.smoothPoints.length > 120) {
            this.smoothPoints.shift();
        }
    }

    processSmoothStroke(context) {
        if (!this.smoothPoints || this.smoothPoints.length < 4) {
            return;
        }

        const points = this.smoothPoints;
        const len = points.length;
        const state = context.stateManager.getState();
        const brushSize = state.tools.brushSize || 2;
        const pattern = state.tools.pattern;

        // Use advanced smoothing with more points when available
        if (len >= 6) {
            this.drawAdvancedSmoothSegment(points, len, brushSize, pattern, context);
        } else {
            this.drawStandardSmoothSegment(points, len, brushSize, pattern, context);
        }
    }

    drawAdvancedSmoothSegment(points, len, brushSize, pattern, context) {
        // Multi-point weighted smoothing
        const p0 = points[len - 6];
        const p1 = points[len - 5]; 
        const p2 = points[len - 4];
        const p3 = points[len - 3];
        const p4 = points[len - 2];
        const p5 = points[len - 1];

        // Create smoothed control points
        const smoothP1 = this.weightedAverage([p0, p1, p2], [0.1, 0.8, 0.1]);
        const smoothP2 = this.weightedAverage([p1, p2, p3], [0.15, 0.7, 0.15]);
        const smoothP3 = this.weightedAverage([p2, p3, p4], [0.15, 0.7, 0.15]);
        const smoothP4 = this.weightedAverage([p3, p4, p5], [0.1, 0.8, 0.1]);

        const distance = Math.sqrt(
            Math.pow(smoothP3.x - smoothP2.x, 2) + Math.pow(smoothP3.y - smoothP2.y, 2)
        );

        // High-density interpolation for maximum smoothness
        const steps = Math.max(3, Math.min(60, Math.ceil(distance * 2.5)));
        
        if (distance < 0.2) return;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point = this.catmullRomInterpolate(smoothP1, smoothP2, smoothP3, smoothP4, t);
            this.drawDirectPixels(Math.round(point.x), Math.round(point.y), brushSize, pattern, context);
        }
    }

    drawStandardSmoothSegment(points, len, brushSize, pattern, context) {
        const p0 = points[len - 4];
        const p1 = points[len - 3];
        const p2 = points[len - 2];
        const p3 = points[len - 1];

        // Apply local smoothing to control points
        const smoothP0 = this.applyLocalSmoothing(p0, points, len - 4);
        const smoothP1 = this.applyLocalSmoothing(p1, points, len - 3);
        const smoothP2 = this.applyLocalSmoothing(p2, points, len - 2);
        const smoothP3 = this.applyLocalSmoothing(p3, points, len - 1);

        const distance = Math.sqrt(
            Math.pow(smoothP2.x - smoothP1.x, 2) + Math.pow(smoothP2.y - smoothP1.y, 2)
        );

        const steps = Math.max(2, Math.min(45, Math.ceil(distance * 2)));
        
        if (distance < 0.2) return;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point = this.catmullRomInterpolate(smoothP0, smoothP1, smoothP2, smoothP3, t);
            this.drawDirectPixels(Math.round(point.x), Math.round(point.y), brushSize, pattern, context);
        }
    }

    drawDirectPixels(x, y, brushSize, pattern, context) {
        const state = context.stateManager.getState();
        const radius = Math.floor(brushSize / 2);
        const pixels = [];

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const px = x + dx;
                const py = y + dy;

                if (px >= 0 && px < state.canvas.width && py >= 0 && py < state.canvas.height) {
                    if (brushSize === 1 || Math.sqrt(dx * dx + dy * dy) <= radius) {
                        const oldValue = context.editor.getPixel(px, py);
                        const newValue = this.getPixelValue(px, py, pattern);
                        
                        if (oldValue !== newValue) {
                            pixels.push({ x: px, y: py, oldValue, newValue });
                        }
                    }
                }
            }
        }

        this.currentStroke.push(...pixels);

        pixels.forEach(({ x, y, newValue }) => {
            context.editor.setPixel(x, y, newValue);
        });
    }

    weightedAverage(points, weights) {
        let totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let x = 0, y = 0;
        
        for (let i = 0; i < points.length; i++) {
            const weight = weights[i] / totalWeight;
            x += points[i].x * weight;
            y += points[i].y * weight;
        }
        
        return { x, y };
    }

    applyLocalSmoothing(point, allPoints, index) {
        const neighbors = [];
        const weights = [];
        
        for (let offset = -2; offset <= 2; offset++) {
            const neighborIndex = index + offset;
            if (neighborIndex >= 0 && neighborIndex < allPoints.length) {
                neighbors.push(allPoints[neighborIndex]);
                const weight = Math.exp(-0.5 * offset * offset);
                weights.push(weight);
            }
        }
        
        if (neighbors.length < 2) return point;
        return this.weightedAverage(neighbors, weights);
    }

    catmullRomInterpolate(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        
        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );
        
        return { x, y };
    }

    getPixelValue(x, y, pattern) {
        // Apply pattern if available
        if (typeof Patterns !== 'undefined' && pattern !== 'solid-black') {
            return Patterns.applyPattern(pattern, x, y);
        }
        return 1; // Default black
    }

    finishStroke(context) {
        if (this.currentStroke.length > 0) {
            // Create command for undo/redo
            const command = new DrawingCommand('pencil-stroke', 0, [...this.currentStroke]);
            context.commandSystem.execute(command, { editor: context.editor });
            
            this.currentStroke = [];
        }
        
        // Clean up smooth stroke data
        if (this.smoothPoints) {
            this.smoothPoints = [];
        }
        
        this.isDrawing = false;
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Brush',
                    controls: [
                        {
                            type: 'range',
                            id: 'brush-size',
                            label: 'Size',
                            min: 1,
                            max: 10,
                            statePath: 'tools.brushSize'
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Bucket Fill Tool Implementation
 */
class BucketTool extends Tool {
    constructor() {
        super('bucket', {
            cursor: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 16 16\\"><path fill=\\"black\\" d=\\"M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z\\"/><path fill=\\"black\\" d=\\"M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54A1.5 1.5 0 0 1 1.5 3h13z\\"/></svg>") 8 8, auto'
        });
    }

    onMouseDown(coords, event, context) {
        const { x, y } = coords;
        const state = context.stateManager.getState();
        const pattern = state.tools.pattern;
        
        // Determine fill value
        const fillValue = event.button === 0 ? 1 : 0; // Left = fill, Right = clear
        
        // Perform flood fill
        this.floodFill(x, y, fillValue, pattern, context);
    }

    floodFill(startX, startY, newValue, pattern, context) {
        const state = context.stateManager.getState();
        const originalValue = context.editor.getPixel(startX, startY);
        
        // Early exit if already the target value
        const targetValue = pattern && pattern !== 'solid-black' && typeof Patterns !== 'undefined' ?
            Patterns.applyPattern(pattern, startX, startY) : newValue;
            
        if (originalValue === targetValue) {
            return;
        }

        // Flood fill algorithm
        const stack = [{ x: startX, y: startY }];
        const visited = new Set();
        const changedPixels = [];
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key) || 
                x < 0 || x >= state.canvas.width || 
                y < 0 || y >= state.canvas.height ||
                context.editor.getPixel(x, y) !== originalValue) {
                continue;
            }
            
            visited.add(key);
            
            // Calculate new pixel value
            const pixelValue = pattern && pattern !== 'solid-black' && typeof Patterns !== 'undefined' ?
                Patterns.applyPattern(pattern, x, y) : newValue;
            
            changedPixels.push({
                x, y,
                oldValue: originalValue,
                newValue: pixelValue
            });
            
            // Add adjacent pixels to stack
            stack.push({ x: x + 1, y: y });
            stack.push({ x: x - 1, y: y });
            stack.push({ x: x, y: y + 1 });
            stack.push({ x: x, y: y - 1 });
        }

        // Apply changes and create command
        if (changedPixels.length > 0) {
            // Apply pixels immediately
            changedPixels.forEach(({ x, y, newValue }) => {
                context.editor.setPixel(x, y, newValue);
            });

            // Create command for undo/redo
            const command = new DrawingCommand('bucket-fill', 0, changedPixels);
            context.commandSystem.execute(command, { editor: context.editor });
        }
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Fill',
                    controls: [
                        {
                            type: 'checkbox',
                            id: 'fill-contiguous',
                            label: 'Contiguous',
                            statePath: 'tools.fillContiguous',
                            defaultValue: true
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Circle Tool Implementation
 */
class CircleTool extends Tool {
    constructor() {
        super('circle', {
            cursor: 'crosshair',
            allowContinuousDrawing: false
        });
        this.startPos = null;
        this.previewOverlay = null;
    }

    onMouseDown(coords, event, context) {
        this.startPos = coords;
        context.editor.saveState();
    }

    onMouseMove(coords, event, context) {
        if (this.startPos) {
            this.drawCirclePreview(this.startPos, coords, event, context);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.startPos) {
            this.clearPreview(context);
            this.drawCircle(this.startPos, coords, event, context);
            this.startPos = null;
        }
    }

    onKeyboard(key, event, context) {
        // Handle modifier keys for perfect circles and center mode
        if (key === 'Shift' || key === 'Alt') {
            if (this.startPos) {
                const coords = context.stateManager.getState().mouse?.coords;
                if (coords) {
                    this.drawCirclePreview(this.startPos, coords, event, context);
                }
            }
        }
    }

    drawCirclePreview(start, end, event, context) {
        this.clearPreview(context);
        
        const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
            start, end, event.shiftKey, event.altKey
        );
        
        const state = context.stateManager.getState();
        const drawBorder = state.tools.circleBorder !== false;
        const drawFill = state.tools.circleFill === true;
        
        // Create preview overlay
        this.previewOverlay = context.editor.createPreviewOverlay();
        this.previewOverlay.drawEllipse(centerX, centerY, radiusX, radiusY, drawFill, drawBorder);
        context.editor.showPreviewOverlay(this.previewOverlay);
    }

    drawCircle(start, end, event, context) {
        const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
            start, end, event.shiftKey, event.altKey
        );
        
        const state = context.stateManager.getState();
        const pattern = state.tools.pattern;
        const drawValue = event.button === 0 ? 1 : 0;
        const drawBorder = state.tools.circleBorder !== false;
        const drawFill = state.tools.circleFill === true;
        
        // Draw the actual circle
        const pixels = context.editor.drawEllipse(
            centerX, centerY, radiusX, radiusY, 
            drawFill, drawBorder, pattern, drawValue
        );
        
        // Create command for undo/redo
        if (pixels && pixels.length > 0) {
            const command = new DrawingCommand('circle', 0, pixels);
            context.commandSystem.execute(command, { editor: context.editor });
        }
    }

    calculateEllipseParams(start, end, shiftKey, altKey) {
        let centerX, centerY, radiusX, radiusY;
        
        if (altKey) {
            // Draw from center
            centerX = start.x;
            centerY = start.y;
            radiusX = Math.abs(end.x - start.x);
            radiusY = Math.abs(end.y - start.y);
        } else {
            // Draw from corner
            centerX = (start.x + end.x) / 2;
            centerY = (start.y + end.y) / 2;
            radiusX = Math.abs(end.x - start.x) / 2;
            radiusY = Math.abs(end.y - start.y) / 2;
        }
        
        if (shiftKey) {
            // Perfect circle - use smaller radius for both
            const radius = Math.min(radiusX, radiusY);
            radiusX = radiusY = radius;
        }
        
        return { centerX, centerY, radiusX, radiusY };
    }

    clearPreview(context) {
        if (this.previewOverlay) {
            context.editor.hidePreviewOverlay();
            this.previewOverlay = null;
        }
    }

    onDeactivate(context) {
        super.onDeactivate(context);
        this.clearPreview(context);
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Circle',
                    controls: [
                        {
                            type: 'checkbox',
                            id: 'circle-border',
                            label: 'Border',
                            statePath: 'tools.circleBorder',
                            defaultValue: true
                        },
                        {
                            type: 'checkbox',
                            id: 'circle-fill',
                            label: 'Fill',
                            statePath: 'tools.circleFill',
                            defaultValue: false
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Rectangle Tool Implementation
 */
class RectangleTool extends Tool {
    constructor() {
        super('rectangle', {
            cursor: 'crosshair',
            allowContinuousDrawing: false
        });
        this.startPos = null;
        this.previewOverlay = null;
    }

    onMouseDown(coords, event, context) {
        this.startPos = coords;
        context.editor.saveState();
    }

    onMouseMove(coords, event, context) {
        if (this.startPos) {
            this.drawRectPreview(this.startPos, coords, event, context);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.startPos) {
            this.clearPreview(context);
            this.drawRect(this.startPos, coords, event, context);
            this.startPos = null;
        }
    }

    drawRectPreview(start, end, event, context) {
        this.clearPreview(context);
        
        const state = context.stateManager.getState();
        const drawBorder = state.tools.rectBorder !== false;
        const drawFill = state.tools.rectFill === true;
        
        // Create preview overlay
        this.previewOverlay = context.editor.createPreviewOverlay();
        this.previewOverlay.drawRect(start.x, start.y, end.x, end.y, drawFill, drawBorder);
        context.editor.showPreviewOverlay(this.previewOverlay);
    }

    drawRect(start, end, event, context) {
        const state = context.stateManager.getState();
        const pattern = state.tools.pattern;
        const drawValue = event.button === 0 ? 1 : 0;
        const drawBorder = state.tools.rectBorder !== false;
        const drawFill = state.tools.rectFill === true;
        
        // Draw the actual rectangle
        const pixels = context.editor.drawRect(
            start.x, start.y, end.x, end.y, 
            drawFill, drawBorder, pattern, drawValue
        );
        
        // Create command for undo/redo
        if (pixels && pixels.length > 0) {
            const command = new DrawingCommand('rectangle', 0, pixels);
            context.commandSystem.execute(command, { editor: context.editor });
        }
    }

    clearPreview(context) {
        if (this.previewOverlay) {
            context.editor.hidePreviewOverlay();
            this.previewOverlay = null;
        }
    }

    onDeactivate(context) {
        super.onDeactivate(context);
        this.clearPreview(context);
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Rectangle',
                    controls: [
                        {
                            type: 'checkbox',
                            id: 'rect-border',
                            label: 'Border',
                            statePath: 'tools.rectBorder',
                            defaultValue: true
                        },
                        {
                            type: 'checkbox',
                            id: 'rect-fill',
                            label: 'Fill',
                            statePath: 'tools.rectFill',
                            defaultValue: false
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Line Tool Implementation
 */
class LineTool extends Tool {
    constructor() {
        super('line', {
            cursor: 'crosshair',
            allowContinuousDrawing: false
        });
        this.startPos = null;
        this.previewOverlay = null;
    }

    onMouseDown(coords, event, context) {
        this.startPos = coords;
        context.editor.saveState();
    }

    onMouseMove(coords, event, context) {
        if (this.startPos) {
            this.drawLinePreview(this.startPos, coords, context);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.startPos) {
            this.clearPreview(context);
            this.drawLine(this.startPos, coords, event, context);
            this.startPos = null;
        }
    }

    drawLinePreview(start, end, context) {
        this.clearPreview(context);
        
        // Create preview overlay
        this.previewOverlay = context.editor.createPreviewOverlay();
        this.previewOverlay.drawLine(start.x, start.y, end.x, end.y);
        context.editor.showPreviewOverlay(this.previewOverlay);
    }

    drawLine(start, end, event, context) {
        const state = context.stateManager.getState();
        const pattern = state.tools.pattern;
        const drawValue = event.button === 0 ? 1 : 0;
        const lineWidth = state.tools.lineWidth || 1;
        
        // Draw the actual line
        const pixels = context.editor.drawLine(
            start.x, start.y, end.x, end.y, 
            lineWidth, pattern, drawValue
        );
        
        // Create command for undo/redo
        if (pixels && pixels.length > 0) {
            const command = new DrawingCommand('line', 0, pixels);
            context.commandSystem.execute(command, { editor: context.editor });
        }
    }

    clearPreview(context) {
        if (this.previewOverlay) {
            context.editor.hidePreviewOverlay();
            this.previewOverlay = null;
        }
    }

    onDeactivate(context) {
        super.onDeactivate(context);
        this.clearPreview(context);
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Line',
                    controls: [
                        {
                            type: 'range',
                            id: 'line-width',
                            label: 'Width',
                            min: 1,
                            max: 10,
                            statePath: 'tools.lineWidth',
                            defaultValue: 1
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Selection Tool Implementation
 */
class SelectionTool extends Tool {
    constructor(shape = 'rectangle') {
        super(`select-${shape}`, {
            cursor: 'crosshair',
            allowContinuousDrawing: false
        });
        this.shape = shape;
        this.startPos = null;
        this.isSelecting = false;
    }

    onMouseDown(coords, event, context) {
        // Check if clicking inside existing selection
        const currentSelection = context.stateManager.getState().selection;
        if (currentSelection && this.isInsideSelection(coords, currentSelection)) {
            // Start dragging selection
            this.startDragSelection(coords, event, context);
            return;
        }
        
        // Start new selection
        this.startPos = coords;
        this.isSelecting = true;
        context.editor.clearSelection();
    }

    onMouseMove(coords, event, context) {
        if (this.isSelecting && this.startPos) {
            this.updateSelectionPreview(this.startPos, coords, context);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.isSelecting && this.startPos) {
            this.createSelection(this.startPos, coords, context);
            this.isSelecting = false;
            this.startPos = null;
        }
    }

    updateSelectionPreview(start, end, context) {
        const selection = this.shape === 'rectangle' ? 
            this.createRectSelection(start, end) :
            this.createCircleSelection(start, end);
        
        context.editor.showSelectionPreview(selection);
    }

    createSelection(start, end, context) {
        const selection = this.shape === 'rectangle' ? 
            this.createRectSelection(start, end) :
            this.createCircleSelection(start, end);
        
        context.editor.setSelection(selection);
        context.stateManager.setState('selection', selection);
    }

    createRectSelection(start, end) {
        return {
            type: 'rectangle',
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y)
        };
    }

    createCircleSelection(start, end) {
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        ) / 2;
        
        return {
            type: 'circle',
            centerX,
            centerY,
            radius
        };
    }

    isInsideSelection(coords, selection) {
        if (selection.type === 'rectangle') {
            return coords.x >= selection.x && 
                   coords.x <= selection.x + selection.width &&
                   coords.y >= selection.y && 
                   coords.y <= selection.y + selection.height;
        } else if (selection.type === 'circle') {
            const distance = Math.sqrt(
                Math.pow(coords.x - selection.centerX, 2) + 
                Math.pow(coords.y - selection.centerY, 2)
            );
            return distance <= selection.radius;
        }
        return false;
    }

    startDragSelection(coords, event, context) {
        // Implementation for dragging existing selection
        // This would involve moving the selection bounds
    }

    onKeyboard(key, event, context) {
        // Handle selection shortcuts (Ctrl+C, Ctrl+V, Delete, etc.)
        if (event.ctrlKey || event.metaKey) {
            switch (key.toLowerCase()) {
                case 'c':
                    this.copySelection(context);
                    break;
                case 'v':
                    this.pasteSelection(context);
                    break;
                case 'x':
                    this.cutSelection(context);
                    break;
            }
        } else if (key === 'Delete' || key === 'Backspace') {
            this.deleteSelection(context);
        }
    }

    copySelection(context) {
        const selection = context.stateManager.getState().selection;
        if (selection) {
            const pixels = context.editor.copySelectionPixels(selection);
            context.stateManager.setState('clipboard', { selection, pixels });
        }
    }

    pasteSelection(context) {
        const clipboard = context.stateManager.getState().clipboard;
        if (clipboard) {
            context.editor.pastePixels(clipboard.pixels, clipboard.selection);
            context.editor.saveState();
        }
    }

    cutSelection(context) {
        this.copySelection(context);
        this.deleteSelection(context);
    }

    deleteSelection(context) {
        const selection = context.stateManager.getState().selection;
        if (selection) {
            const pixels = context.editor.clearSelectionArea(selection);
            const command = new DrawingCommand('delete-selection', 0, pixels);
            context.commandSystem.execute(command, { editor: context.editor });
        }
    }
}

/**
 * Text Tool Implementation
 */
class TextTool extends Tool {
    constructor() {
        super('text', {
            cursor: 'text',
            allowContinuousDrawing: false
        });
    }

    onMouseDown(coords, event, context) {
        this.showTextDialog(coords, context);
    }

    showTextDialog(coords, context) {
        const state = context.stateManager.getState();
        const font = state.tools.textFont || '5x7';
        const size = state.tools.textSize || 1;
        const pattern = state.tools.pattern;
        
        // Show text input dialog
        context.eventBus.emit('dialog:show', {
            type: 'text-input',
            position: coords,
            config: {
                font,
                size,
                pattern,
                onConfirm: (text, options) => {
                    this.renderText(coords, text, options, context);
                }
            }
        });
    }

    renderText(coords, text, options, context) {
        if (!text || typeof TextRenderer === 'undefined') return;
        
        // Render text using TextRenderer
        const pixels = TextRenderer.renderText(
            text, 
            coords.x, 
            coords.y, 
            options.font, 
            options.size,
            options.pattern
        );
        
        if (pixels && pixels.length > 0) {
            // Apply pixels to canvas
            pixels.forEach(({ x, y, value }) => {
                context.editor.setPixel(x, y, value);
            });
            
            // Create command for undo/redo
            const command = new DrawingCommand('text', 0, pixels);
            context.commandSystem.execute(command, { editor: context.editor });
        }
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Text',
                    controls: [
                        {
                            type: 'select',
                            id: 'text-font',
                            label: 'Font',
                            options: [
                                { value: '5x7', label: '5×7 Standard' },
                                { value: '3x5', label: '3×5 Small' },
                                { value: '7x9', label: '7×9 Large' }
                            ],
                            statePath: 'tools.textFont',
                            defaultValue: '5x7'
                        },
                        {
                            type: 'range',
                            id: 'text-size',
                            label: 'Size',
                            min: 1,
                            max: 4,
                            statePath: 'tools.textSize',
                            defaultValue: 1
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Spray Tool Implementation
 */
class SprayTool extends Tool {
    constructor() {
        super('spray', {
            cursor: 'crosshair',
            showBrushCursor: true,
            allowContinuousDrawing: true
        });
        this.isDrawing = false;
        this.sprayTimer = null;
        this.currentStroke = [];
    }

    onMouseDown(coords, event, context) {
        this.isDrawing = true;
        this.currentStroke = [];
        this.startSpraying(coords, context);
    }

    onMouseMove(coords, event, context) {
        if (this.isDrawing) {
            this.continueSpraying(coords, context);
        } else {
            context.eventBus.emit('brush-cursor:update', coords);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.isDrawing) {
            this.stopSpraying(context);
        }
    }

    startSpraying(coords, context) {
        this.applySpraying(coords, context);
        
        // Continue spraying while mouse is down
        this.sprayTimer = setInterval(() => {
            if (this.isDrawing) {
                this.applySpraying(coords, context);
            }
        }, 50); // 20 FPS spray rate
    }

    continueSpraying(coords, context) {
        // Update spray position for timer
        this.currentCoords = coords;
    }

    applySpraying(coords, context) {
        const state = context.stateManager.getState();
        const radius = state.tools.sprayRadius || 8;
        const density = state.tools.sprayDensity || 0.6;
        const pattern = state.tools.pattern;
        
        const pixels = [];
        const numPixels = Math.floor(Math.PI * radius * radius * density);
        
        for (let i = 0; i < numPixels; i++) {
            // Random position within circle
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = Math.round(coords.x + Math.cos(angle) * distance);
            const y = Math.round(coords.y + Math.sin(angle) * distance);
            
            if (x >= 0 && x < state.canvas.width && y >= 0 && y < state.canvas.height) {
                const oldValue = context.editor.getPixel(x, y);
                const newValue = this.getPixelValue(x, y, pattern);
                
                if (oldValue !== newValue) {
                    pixels.push({ x, y, oldValue, newValue });
                    context.editor.setPixel(x, y, newValue);
                }
            }
        }
        
        this.currentStroke.push(...pixels);
    }

    stopSpraying(context) {
        this.isDrawing = false;
        
        if (this.sprayTimer) {
            clearInterval(this.sprayTimer);
            this.sprayTimer = null;
        }
        
        if (this.currentStroke.length > 0) {
            const command = new DrawingCommand('spray', 0, [...this.currentStroke]);
            context.commandSystem.execute(command, { editor: context.editor });
            this.currentStroke = [];
        }
    }

    getPixelValue(x, y, pattern) {
        if (typeof Patterns !== 'undefined' && pattern !== 'solid-black') {
            return Patterns.applyPattern(pattern, x, y);
        }
        return 1;
    }

    onDeactivate(context) {
        super.onDeactivate(context);
        this.stopSpraying(context);
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Spray',
                    controls: [
                        {
                            type: 'range',
                            id: 'spray-radius',
                            label: 'Radius',
                            min: 2,
                            max: 20,
                            statePath: 'tools.sprayRadius',
                            defaultValue: 8
                        },
                        {
                            type: 'range',
                            id: 'spray-density',
                            label: 'Density',
                            min: 0.1,
                            max: 1.0,
                            step: 0.1,
                            statePath: 'tools.sprayDensity',
                            defaultValue: 0.6
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Move Tool Implementation
 */
class MoveTool extends Tool {
    constructor() {
        super('move', {
            cursor: 'move',
            allowContinuousDrawing: false
        });
        this.isMoving = false;
        this.startPos = null;
        this.originalPixels = null;
    }

    onMouseDown(coords, event, context) {
        this.startPos = coords;
        this.isMoving = true;
        
        // Save current canvas state
        const state = context.stateManager.getState();
        this.originalPixels = new Uint8Array(context.editor.pixels);
        context.editor.saveState();
    }

    onMouseMove(coords, event, context) {
        if (this.isMoving && this.startPos) {
            const deltaX = coords.x - this.startPos.x;
            const deltaY = coords.y - this.startPos.y;
            
            this.previewMove(deltaX, deltaY, context);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.isMoving && this.startPos) {
            const deltaX = coords.x - this.startPos.x;
            const deltaY = coords.y - this.startPos.y;
            
            this.finalizeMove(deltaX, deltaY, context);
            this.isMoving = false;
            this.startPos = null;
            this.originalPixels = null;
        }
    }

    previewMove(deltaX, deltaY, context) {
        if (!this.originalPixels) return;
        
        const state = context.stateManager.getState();
        const width = state.canvas.width;
        const height = state.canvas.height;
        const loopMode = state.tools.moveLoop !== false;
        
        // Clear current canvas
        context.editor.pixels.fill(1); // Fill with white
        
        // Apply moved pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const sourceIndex = y * width + x;
                const sourcePixel = this.originalPixels[sourceIndex];
                
                if (sourcePixel === 0) { // Black pixel to move
                    let newX = x + deltaX;
                    let newY = y + deltaY;
                    
                    if (loopMode) {
                        // Wrap around edges
                        newX = ((newX % width) + width) % width;
                        newY = ((newY % height) + height) % height;
                    }
                    
                    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                        const targetIndex = newY * width + newX;
                        context.editor.pixels[targetIndex] = 0;
                    }
                }
            }
        }
        
        context.editor.redraw();
    }

    finalizeMove(deltaX, deltaY, context) {
        // Move is already applied, just create command for undo
        const pixels = [];
        
        // Record all pixel changes
        for (let i = 0; i < this.originalPixels.length; i++) {
            const oldValue = this.originalPixels[i];
            const newValue = context.editor.pixels[i];
            
            if (oldValue !== newValue) {
                const x = i % context.editor.width;
                const y = Math.floor(i / context.editor.width);
                pixels.push({ x, y, oldValue, newValue });
            }
        }
        
        if (pixels.length > 0) {
            const command = new DrawingCommand('move', 0, pixels);
            context.commandSystem.execute(command, { editor: context.editor });
        }
    }

    getOptionsConfig() {
        return {
            sections: [
                {
                    title: 'Move',
                    controls: [
                        {
                            type: 'checkbox',
                            id: 'move-loop',
                            label: 'Loop edges',
                            statePath: 'tools.moveLoop',
                            defaultValue: true
                        }
                    ]
                }
            ]
        };
    }
}

/**
 * Guide Tool Implementation
 */
class GuideTool extends Tool {
    constructor() {
        super('guide', {
            cursor: 'crosshair',
            allowContinuousDrawing: false
        });
        this.isCreatingGuide = false;
        this.startPos = null;
    }

    onMouseDown(coords, event, context) {
        this.startPos = coords;
        this.isCreatingGuide = true;
    }

    onMouseMove(coords, event, context) {
        if (this.isCreatingGuide && this.startPos) {
            this.previewGuide(this.startPos, coords, context);
        }
    }

    onMouseUp(coords, event, context) {
        if (this.isCreatingGuide && this.startPos) {
            this.createGuide(this.startPos, coords, context);
            this.isCreatingGuide = false;
            this.startPos = null;
        }
    }

    previewGuide(start, end, context) {
        const guide = this.calculateGuide(start, end);
        context.eventBus.emit('guide:preview', guide);
    }

    createGuide(start, end, context) {
        const guide = this.calculateGuide(start, end);
        
        // Add guide to guides system
        context.eventBus.emit('guide:create', guide);
        
        // Update state
        const currentGuides = context.stateManager.getState().guides || [];
        currentGuides.push(guide);
        context.stateManager.setState('guides', currentGuides);
    }

    calculateGuide(start, end) {
        return {
            id: `guide-${Date.now()}`,
            name: `Guide ${Date.now()}`,
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
            color: '#ff0000',
            visible: true
        };
    }

    onKeyboard(key, event, context) {
        // Handle guide management shortcuts
        if (key === 'Delete' || key === 'Backspace') {
            context.eventBus.emit('guide:delete-selected');
        }
    }
}

/**
 * Tool System Manager
 */
class ToolSystem {
    constructor(eventBus, stateManager, commandSystem) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.commandSystem = commandSystem;
        
        this.tools = new Map();
        this.currentTool = null;
        this.context = null;

        this.setupTools();
        this.setupEventListeners();
    }

    /**
     * Initialize built-in tools
     */
    setupTools() {
        this.registerTool(new PencilTool());
        this.registerTool(new BucketTool());
        this.registerTool(new CircleTool());
        this.registerTool(new RectangleTool());
        this.registerTool(new LineTool());
        this.registerTool(new SelectionTool('rectangle'));
        this.registerTool(new SelectionTool('circle'));
        this.registerTool(new TextTool());
        this.registerTool(new SprayTool());
        this.registerTool(new MoveTool());
        this.registerTool(new GuideTool());
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tool change events
        this.stateManager.subscribe('tools.current', ({ value }) => {
            this.setActiveTool(value);
        });

        // Canvas events
        this.eventBus.on('canvas:mousedown', this.handleMouseDown, this);
        this.eventBus.on('canvas:mousemove', this.handleMouseMove, this);
        this.eventBus.on('canvas:mouseup', this.handleMouseUp, this);
        this.eventBus.on('canvas:mouseleave', this.handleMouseLeave, this);
        this.eventBus.on('canvas:mouseenter', this.handleMouseEnter, this);
        
        // Keyboard events
        this.eventBus.on('keyboard:shortcut', this.handleKeyboard, this);
    }

    /**
     * Register a new tool
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
        this.eventBus.emit('tool:registered', { name: tool.name, tool });
    }

    /**
     * Set execution context for tools
     */
    setContext(context) {
        this.context = {
            eventBus: this.eventBus,
            stateManager: this.stateManager,
            commandSystem: this.commandSystem,
            ...context
        };
    }

    /**
     * Set active tool
     */
    setActiveTool(toolName) {
        if (!this.tools.has(toolName)) {
            console.warn(`Tool '${toolName}' not found`);
            return false;
        }

        // Deactivate current tool
        if (this.currentTool) {
            this.currentTool.onDeactivate(this.context);
        }

        // Activate new tool
        this.currentTool = this.tools.get(toolName);
        this.currentTool.onActivate(this.context);

        this.eventBus.emit('tool:changed', {
            previous: this.currentTool?.name,
            current: toolName,
            tool: this.currentTool
        });

        return true;
    }

    /**
     * Get current tool
     */
    getCurrentTool() {
        return this.currentTool;
    }

    /**
     * Get all available tools
     */
    getAvailableTools() {
        return Array.from(this.tools.keys());
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown({ coords, event }) {
        if (this.currentTool && this.context) {
            this.currentTool.onMouseDown(coords, event, this.context);
        }
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove({ coords, event }) {
        if (this.currentTool && this.context) {
            this.currentTool.onMouseMove(coords, event, this.context);
        }
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp({ coords, event }) {
        if (this.currentTool && this.context) {
            this.currentTool.onMouseUp(coords, event, this.context);
        }
    }

    /**
     * Handle mouse leave event
     */
    handleMouseLeave() {
        if (this.currentTool && this.context) {
            this.currentTool.onMouseLeave(this.context);
        }
    }

    /**
     * Handle mouse enter event
     */
    handleMouseEnter() {
        if (this.currentTool && this.context) {
            this.currentTool.onMouseEnter(this.context);
        }
    }

    /**
     * Handle keyboard event
     */
    handleKeyboard({ key, event }) {
        if (this.currentTool && this.context) {
            this.currentTool.onKeyboard(key, event, this.context);
        }
    }

    /**
     * Get tool options configuration
     */
    getToolOptions(toolName = null) {
        const tool = toolName ? this.tools.get(toolName) : this.currentTool;
        return tool ? tool.getOptionsConfig() : null;
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        Tool, 
        PencilTool, 
        BucketTool, 
        CircleTool,
        RectangleTool,
        LineTool,
        SelectionTool,
        TextTool,
        SprayTool,
        MoveTool,
        GuideTool,
        ToolSystem 
    };
} else {
    window.Tool = Tool;
    window.PencilTool = PencilTool;
    window.BucketTool = BucketTool;
    window.CircleTool = CircleTool;
    window.RectangleTool = RectangleTool;
    window.LineTool = LineTool;
    window.SelectionTool = SelectionTool;
    window.TextTool = TextTool;
    window.SprayTool = SprayTool;
    window.MoveTool = MoveTool;
    window.GuideTool = GuideTool;
    window.ToolSystem = ToolSystem;
}