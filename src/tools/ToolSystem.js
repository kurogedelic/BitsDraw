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
        const brushSize = state.tools.brushSize;
        const pattern = state.tools.pattern;

        // Calculate brush area
        const radius = Math.floor(brushSize / 2);
        const pixels = [];

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const px = x + dx;
                const py = y + dy;

                if (px >= 0 && px < state.canvas.width && py >= 0 && py < state.canvas.height) {
                    // Check if pixel is within brush shape
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

        // Add to current stroke
        this.currentStroke.push(...pixels);

        // Apply pixels immediately for visual feedback
        pixels.forEach(({ x, y, newValue }) => {
            context.editor.setPixel(x, y, newValue);
        });
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
        // More tools will be added here...
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
    module.exports = { Tool, PencilTool, BucketTool, ToolSystem };
} else {
    window.Tool = Tool;
    window.PencilTool = PencilTool;
    window.BucketTool = BucketTool;
    window.ToolSystem = ToolSystem;
}