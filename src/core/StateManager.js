/**
 * Centralized State Management System
 * Implements immutable state updates with event notifications
 */
class StateManager {
    constructor(eventBus, initialState = {}) {
        this.eventBus = eventBus;
        this._state = this.deepFreeze({
            // Canvas state
            canvas: {
                width: 128,
                height: 64,
                zoom: 4,
                showGrid: false,
                displayMode: 'white'
            },
            
            // Tool state
            tools: {
                current: 'pencil',
                brushSize: 1,
                sprayRadius: 5,
                sprayDensity: 0.3,
                pattern: 'solid-black',
                drawBorder: true,
                drawFill: false
            },
            
            // UI state
            ui: {
                theme: 'auto',
                windows: new Map(),
                dialogs: new Map(),
                notifications: []
            },
            
            // Drawing state
            drawing: {
                isDrawing: false,
                selection: null,
                clipboard: null,
                inverted: false
            },
            
            // Layer state
            layers: {
                activeIndex: 0,
                items: []
            },
            
            // Project state
            project: {
                name: 'my_bitmap',
                modified: false,
                history: {
                    index: -1,
                    states: []
                }
            },
            
            ...initialState
        });

        this.validators = new Map();
        this.setupValidators();
    }

    /**
     * Get current state (immutable)
     */
    getState() {
        return this._state;
    }

    /**
     * Get specific state slice
     */
    getSlice(path) {
        return this.getValueByPath(this._state, path);
    }

    /**
     * Update state with validation and notifications
     */
    setState(path, value, options = {}) {
        const { silent = false, validate = true } = options;

        // Validate if validator exists
        if (validate && this.validators.has(path)) {
            const validator = this.validators.get(path);
            const validationResult = validator(value, this._state);
            if (!validationResult.valid) {
                throw new Error(`State validation failed for '${path}': ${validationResult.error}`);
            }
        }

        // Create new immutable state
        const newState = this.setValueByPath(this._state, path, value);
        const oldValue = this.getValueByPath(this._state, path);
        
        // Update state
        this._state = this.deepFreeze(newState);

        // Emit events if not silent
        if (!silent) {
            this.eventBus.emit('state:changed', {
                path,
                value,
                oldValue,
                state: this._state
            });

            this.eventBus.emit(`state:${path}:changed`, {
                value,
                oldValue,
                state: this._state
            });
        }

        return this._state;
    }

    /**
     * Batch multiple state updates
     */
    batchUpdate(updates, options = {}) {
        const { silent = false } = options;
        
        let newState = { ...this._state };
        const changes = [];

        // Apply all updates
        for (const { path, value } of updates) {
            const oldValue = this.getValueByPath(newState, path);
            newState = this.setValueByPath(newState, path, value);
            changes.push({ path, value, oldValue });
        }

        this._state = this.deepFreeze(newState);

        // Emit batch change event
        if (!silent) {
            this.eventBus.emit('state:batch:changed', {
                changes,
                state: this._state
            });

            // Emit individual change events
            changes.forEach(({ path, value, oldValue }) => {
                this.eventBus.emit(`state:${path}:changed`, {
                    value,
                    oldValue,
                    state: this._state
                });
            });
        }

        return this._state;
    }

    /**
     * Subscribe to state changes
     */
    subscribe(path, handler, immediate = false) {
        const unsubscribe = this.eventBus.on(`state:${path}:changed`, handler);
        
        // Call immediately with current value if requested
        if (immediate) {
            const currentValue = this.getSlice(path);
            handler({ value: currentValue, oldValue: undefined, state: this._state });
        }

        return unsubscribe;
    }

    /**
     * Add state validator
     */
    addValidator(path, validator) {
        this.validators.set(path, validator);
    }

    /**
     * Set up built-in validators
     */
    setupValidators() {
        this.addValidator('canvas.width', (value) => ({
            valid: Number.isInteger(value) && value > 0 && value <= 2048,
            error: 'Width must be an integer between 1 and 2048'
        }));

        this.addValidator('canvas.height', (value) => ({
            valid: Number.isInteger(value) && value > 0 && value <= 2048,
            error: 'Height must be an integer between 1 and 2048'
        }));

        this.addValidator('canvas.zoom', (value) => ({
            valid: [1, 2, 4, 8, 16, 32].includes(value),
            error: 'Zoom must be one of: 1, 2, 4, 8, 16, 32'
        }));

        this.addValidator('tools.current', (value) => ({
            valid: typeof value === 'string' && value.length > 0,
            error: 'Tool must be a non-empty string'
        }));

        this.addValidator('tools.brushSize', (value) => ({
            valid: Number.isInteger(value) && value >= 1 && value <= 10,
            error: 'Brush size must be between 1 and 10'
        }));
    }

    /**
     * Helper: Get value by dot-notation path
     */
    getValueByPath(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Helper: Set value by dot-notation path (immutable)
     */
    setValueByPath(obj, path, value) {
        const keys = path.split('.');
        const newObj = this.deepClone(obj);
        
        let current = newObj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === undefined) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        return newObj;
    }

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [k, this.deepClone(v)]));
        if (obj instanceof Set) return new Set([...obj].map(item => this.deepClone(item)));
        
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = this.deepClone(obj[key]);
        });
        return cloned;
    }

    /**
     * Deep freeze object for immutability
     */
    deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        
        // Freeze the object itself
        Object.freeze(obj);
        
        // Recursively freeze all properties
        Object.values(obj).forEach(value => {
            if (typeof value === 'object' && value !== null) {
                this.deepFreeze(value);
            }
        });
        
        return obj;
    }

    /**
     * Reset state to initial values
     */
    reset() {
        const initialState = new StateManager(this.eventBus).getState();
        this._state = this.deepFreeze(initialState);
        this.eventBus.emit('state:reset', { state: this._state });
    }

    /**
     * Get state debugging information
     */
    getDebugInfo() {
        return {
            stateKeys: Object.keys(this._state),
            validators: Array.from(this.validators.keys()),
            stateSize: JSON.stringify(this._state).length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
} else {
    window.StateManager = StateManager;
}