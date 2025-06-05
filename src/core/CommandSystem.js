/**
 * Command Pattern Implementation for Undo/Redo functionality
 * All user actions are encapsulated as commands
 */
class Command {
    constructor(name) {
        this.name = name;
        this.timestamp = Date.now();
    }

    /**
     * Execute the command
     * @param {Object} context - Execution context (state, editor, etc.)
     */
    execute(context) {
        throw new Error('Command.execute() must be implemented');
    }

    /**
     * Undo the command
     * @param {Object} context - Execution context
     */
    undo(context) {
        throw new Error('Command.undo() must be implemented');
    }

    /**
     * Check if command can be merged with another
     * @param {Command} other - Other command to merge with
     */
    canMergeWith(other) {
        return false;
    }

    /**
     * Merge with another command
     * @param {Command} other - Other command to merge with
     */
    mergeWith(other) {
        throw new Error('Command.mergeWith() must be implemented');
    }
}

/**
 * Command System Manager
 */
class CommandSystem {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50;
        this.isExecuting = false;
        
        // Register for state updates
        this.eventBus.on('command:execute', this.handleCommandExecution, this);
        this.eventBus.on('command:undo', this.undo, this);
        this.eventBus.on('command:redo', this.redo, this);
    }

    /**
     * Execute a command
     */
    async execute(command, context = {}) {
        if (this.isExecuting) {
            console.warn('Command execution already in progress');
            return false;
        }

        try {
            this.isExecuting = true;

            // Create execution context
            const executionContext = {
                state: this.stateManager.getState(),
                stateManager: this.stateManager,
                eventBus: this.eventBus,
                ...context
            };

            // Execute command
            await command.execute(executionContext);

            // Add to history (remove any redo history)
            this.addToHistory(command);

            // Emit success event
            this.eventBus.emit('command:executed', {
                command: command.name,
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });

            return true;

        } catch (error) {
            console.error(`Command execution failed: ${command.name}`, error);
            this.eventBus.emit('command:error', {
                command: command.name,
                error: error.message
            });
            return false;

        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Undo last command
     */
    async undo() {
        if (!this.canUndo() || this.isExecuting) {
            return false;
        }

        try {
            this.isExecuting = true;

            const command = this.history[this.currentIndex];
            
            // Create undo context
            const undoContext = {
                state: this.stateManager.getState(),
                stateManager: this.stateManager,
                eventBus: this.eventBus
            };

            // Undo command
            await command.undo(undoContext);

            // Move index backward
            this.currentIndex--;

            // Emit event
            this.eventBus.emit('command:undone', {
                command: command.name,
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });

            return true;

        } catch (error) {
            console.error('Undo failed:', error);
            this.eventBus.emit('command:error', {
                command: 'undo',
                error: error.message
            });
            return false;

        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Redo next command
     */
    async redo() {
        if (!this.canRedo() || this.isExecuting) {
            return false;
        }

        try {
            this.isExecuting = true;

            this.currentIndex++;
            const command = this.history[this.currentIndex];
            
            // Create redo context
            const redoContext = {
                state: this.stateManager.getState(),
                stateManager: this.stateManager,
                eventBus: this.eventBus
            };

            // Execute command again
            await command.execute(redoContext);

            // Emit event
            this.eventBus.emit('command:redone', {
                command: command.name,
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });

            return true;

        } catch (error) {
            console.error('Redo failed:', error);
            this.eventBus.emit('command:error', {
                command: 'redo',
                error: error.message
            });
            return false;

        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Add command to history
     */
    addToHistory(command) {
        // Try to merge with last command if possible
        if (this.currentIndex >= 0) {
            const lastCommand = this.history[this.currentIndex];
            if (lastCommand.canMergeWith(command)) {
                lastCommand.mergeWith(command);
                return;
            }
        }

        // Remove any redo history
        this.history = this.history.slice(0, this.currentIndex + 1);

        // Add new command
        this.history.push(command);
        this.currentIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }
    }

    /**
     * Check if undo is possible
     */
    canUndo() {
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Handle command execution events
     */
    handleCommandExecution(data) {
        if (data.command && data.context) {
            this.execute(data.command, data.context);
        }
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        this.currentIndex = -1;
        
        this.eventBus.emit('command:history:cleared', {
            canUndo: false,
            canRedo: false
        });
    }

    /**
     * Get history information
     */
    getHistoryInfo() {
        return {
            length: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            commands: this.history.map(cmd => ({
                name: cmd.name,
                timestamp: cmd.timestamp
            }))
        };
    }
}

/**
 * Base drawing command for bitmap operations
 */
class DrawingCommand extends Command {
    constructor(name, layerIndex, affectedPixels = []) {
        super(name);
        this.layerIndex = layerIndex;
        this.affectedPixels = affectedPixels; // Array of {x, y, oldValue, newValue}
    }

    execute(context) {
        const { stateManager } = context;
        const editor = context.editor || context.bitmapEditor;
        
        if (!editor) {
            throw new Error('Editor not available in command context');
        }

        // Apply new pixel values
        this.affectedPixels.forEach(({ x, y, newValue }) => {
            editor.setPixel(x, y, newValue);
        });

        return Promise.resolve();
    }

    undo(context) {
        const { stateManager } = context;
        const editor = context.editor || context.bitmapEditor;
        
        if (!editor) {
            throw new Error('Editor not available in command context');
        }

        // Restore old pixel values
        this.affectedPixels.forEach(({ x, y, oldValue }) => {
            editor.setPixel(x, y, oldValue);
        });

        return Promise.resolve();
    }

    canMergeWith(other) {
        // Merge drawing commands of the same type within 100ms
        return other instanceof DrawingCommand &&
               other.name === this.name &&
               other.layerIndex === this.layerIndex &&
               Math.abs(other.timestamp - this.timestamp) < 100;
    }

    mergeWith(other) {
        if (!this.canMergeWith(other)) {
            throw new Error('Cannot merge commands');
        }

        // Merge pixel changes
        const pixelMap = new Map();
        
        // Add current pixels
        this.affectedPixels.forEach(pixel => {
            const key = `${pixel.x},${pixel.y}`;
            pixelMap.set(key, pixel);
        });

        // Add other pixels (overwrites if same position)
        other.affectedPixels.forEach(pixel => {
            const key = `${pixel.x},${pixel.y}`;
            const existing = pixelMap.get(key);
            if (existing) {
                // Keep original oldValue, use new newValue
                pixel.oldValue = existing.oldValue;
            }
            pixelMap.set(key, pixel);
        });

        this.affectedPixels = Array.from(pixelMap.values());
        this.timestamp = other.timestamp; // Use latest timestamp
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Command, CommandSystem, DrawingCommand };
} else {
    window.Command = Command;
    window.CommandSystem = CommandSystem;
    window.DrawingCommand = DrawingCommand;
}